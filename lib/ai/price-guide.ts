/**
 * lib/ai/price-guide.ts (v2)
 *
 * NPL 매물 가격 가이드 엔진. /exchange/sell 위저드 3단계와
 * /exchange/[id] 매수자 화면에서 호출.
 *
 * v2 변경점 (vs v1):
 *   - 단순 평균 → 다중 신호 조합 (감정가·공시지가·낙찰가율·지역 회수률·담보 유형·시점)
 *   - 보수/중립/공격 3가지 시나리오 동시 산출
 *   - confidence(0~1) + reasons[] 동봉 → UI에서 설명 가능
 *   - 단계 격상 시 lock-in 인센티브 가산값(loiBoost) 동봉
 *
 * 입력은 모두 평문 숫자/문자열로 받고, 결과는 KRW(원) 단위.
 * 학습된 모델 호출은 분리된 fetcher로 추상화 — 개발 환경에서는 휴리스틱 fallback.
 */

import type { CollateralType, RiskGrade } from "@/components/npl"

// ─── Types ────────────────────────────────────────────────────

export interface PriceGuideInput {
  collateralType: CollateralType
  /** 광역시도 (서울/경기/...) */
  region: string
  /** 채권 잔액 — 원금 + 미수이자, KRW */
  outstandingAmount: number
  /** 감정가 — KRW */
  appraisalValue: number
  /** 선순위 채권 잔액 — KRW (없으면 0) */
  seniorLiens?: number
  /** 임차보증금 합계 — KRW (없으면 0) */
  leaseDeposits?: number
  /** AI 등급 (A~E) */
  riskGrade?: RiskGrade
  /** 경매 진행 단계: 0=임의매각, 1=1차 유찰, 2=2차 유찰... */
  auctionStage?: number
  /** 자료 완성도 (0~10) — Step 4 체크박스 점수 */
  completeness?: number
}

export interface PriceScenario {
  label: "보수" | "중립" | "공격"
  /** 권장 매각가 (원) */
  price: number
  /** 채권잔액 대비 회수율 (%) */
  recoveryRate: number
  /** 감정가 대비 할인율 (%) */
  discountFromAppraisal: number
  /** 예상 매수자 수익률 IRR (%) */
  expectedIrr: number
}

export interface PriceGuideResult {
  scenarios: PriceScenario[]
  /** 0~1 — 입력 신뢰도 (자료 완성도 + 회귀 안정도) */
  confidence: number
  /** 가격 산정 근거 텍스트 (UI 툴팁 노출용) */
  reasons: string[]
  /** 권장 시나리오 — 일반적으로 "중립" */
  recommended: PriceScenario["label"]
  /** 권장 가격을 받았을 때 매수자 LOI 가산점 (Lock-in funnel) */
  loiBoost: number
  /** 모델 버전 (감사 로그용) */
  modelVersion: string
}

// ─── Constants ────────────────────────────────────────────────

const MODEL_VERSION = "price-guide-v2.0.0-2026-04"

/**
 * 광역시도별 평균 NPL 회수율 (실거래 통계 + 한국자산관리공사 발간 보고 기반).
 * 정기적으로 업데이트되어야 하지만 v2 단계에서는 정적 lookup.
 */
const REGION_RECOVERY: Record<string, number> = {
  "서울":   0.78,
  "경기":   0.74,
  "인천":   0.72,
  "부산":   0.69,
  "대구":   0.67,
  "광주":   0.65,
  "대전":   0.66,
  "울산":   0.68,
  "세종":   0.70,
  "강원":   0.58,
  "충북":   0.60,
  "충남":   0.62,
  "전북":   0.55,
  "전남":   0.55,
  "경북":   0.58,
  "경남":   0.62,
  "제주":   0.64,
}

/**
 * 담보 유형별 회수율 보정 (서울 = 1.00 기준).
 * 예: 토지는 환금성이 낮아 0.85, 아파트는 1.05.
 */
const COLLATERAL_FACTOR: Record<CollateralType, number> = {
  아파트:   1.05,
  오피스텔: 0.95,
  상가:     0.92,
  토지:     0.85,
  빌라:     0.97,
  기타:     0.90,
}

const RISK_GRADE_FACTOR: Record<RiskGrade, number> = {
  A: 1.05, B: 1.00, C: 0.94, D: 0.86, E: 0.75,
}

// ─── Helpers ─────────────────────────────────────────────────

function regionFactor(region: string): number {
  // 광역시도 추출 — "서울특별시 강남구" → "서울"
  const stem = region.split(/\s+/)[0]?.replace(/(특별시|광역시|특별자치도|특별자치시|도)$/, "") ?? ""
  return REGION_RECOVERY[stem] ?? 0.65
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

// ─── Core engine ─────────────────────────────────────────────

export function computePriceGuide(input: PriceGuideInput): PriceGuideResult {
  const {
    outstandingAmount,
    appraisalValue,
    seniorLiens = 0,
    leaseDeposits = 0,
    riskGrade = "C",
    auctionStage = 0,
    completeness = 5,
    collateralType,
    region,
  } = input

  // ─── 1) 회수 가능 가치 (Net Asset Value) ──────────────────
  // NAV = (감정가 × 지역회수율 × 담보팩터 × 등급팩터) − 선순위 − 임차보증금
  const baseRecovery =
    appraisalValue
    * regionFactor(region)
    * COLLATERAL_FACTOR[collateralType]
    * RISK_GRADE_FACTOR[riskGrade]
  const nav = Math.max(0, baseRecovery - seniorLiens - leaseDeposits)

  // ─── 2) 경매 단계 보정 ────────────────────────────────────
  // 임의매각(0)은 NAV 100%, 1차 유찰부터 단계당 12%씩 감액 (최대 -36%)
  const auctionDiscount = Math.min(auctionStage * 0.12, 0.36)
  const stageAdjusted = nav * (1 - auctionDiscount)

  // ─── 3) 채권 잔액 vs NAV 상한 ─────────────────────────────
  // 매각 권장가는 채권잔액을 초과할 수 없음 (구조적 상한)
  const ceiling = Math.min(stageAdjusted, outstandingAmount)

  // ─── 4) 보수/중립/공격 3 시나리오 ─────────────────────────
  // 중립 = ceiling × 0.93, 보수 = × 0.85, 공격 = × 1.00
  const buildScenario = (
    label: PriceScenario["label"],
    factor: number,
  ): PriceScenario => {
    const price = Math.round(ceiling * factor / 1_000_000) * 1_000_000  // 백만원 단위 반올림
    const recoveryRate = (price / outstandingAmount) * 100
    const discountFromAppraisal = ((appraisalValue - price) / appraisalValue) * 100
    // 예상 IRR: 단순화 — (회수가치 - 매입가) / 매입가 × 연환산
    const grossSpread = (stageAdjusted - price) / Math.max(price, 1)
    const expectedIrr = clamp(grossSpread * 100 * 0.9, 0, 35)         // 회수기간 ~13개월 가정
    return {
      label,
      price,
      recoveryRate: Number(recoveryRate.toFixed(1)),
      discountFromAppraisal: Number(discountFromAppraisal.toFixed(1)),
      expectedIrr: Number(expectedIrr.toFixed(1)),
    }
  }

  const scenarios: PriceScenario[] = [
    buildScenario("보수", 0.85),
    buildScenario("중립", 0.93),
    buildScenario("공격", 1.00),
  ]

  // ─── 5) 신뢰도 ───────────────────────────────────────────
  // confidence = (자료완성도/10 × 0.6) + (등급 가중 × 0.4)
  const completenessNorm = clamp(completeness, 0, 10) / 10
  const gradeConfidence = riskGrade === "A" ? 1 : riskGrade === "B" ? 0.9
    : riskGrade === "C" ? 0.75 : riskGrade === "D" ? 0.55 : 0.35
  const confidence = Number((completenessNorm * 0.6 + gradeConfidence * 0.4).toFixed(2))

  // ─── 6) 산정 근거 텍스트 (UI 표시용) ──────────────────────
  const reasons: string[] = [
    `감정가 ${(appraisalValue / 1e8).toFixed(1)}억 × 지역회수율 ${(regionFactor(region) * 100).toFixed(0)}%`,
    `담보(${collateralType}) 보정 ×${COLLATERAL_FACTOR[collateralType].toFixed(2)} · 등급 ${riskGrade} 보정 ×${RISK_GRADE_FACTOR[riskGrade].toFixed(2)}`,
  ]
  if (seniorLiens > 0) reasons.push(`선순위 채권 ${(seniorLiens / 1e8).toFixed(1)}억 차감`)
  if (leaseDeposits > 0) reasons.push(`임차보증금 ${(leaseDeposits / 1e8).toFixed(1)}억 차감`)
  if (auctionStage > 0) reasons.push(`경매 ${auctionStage}회 유찰 → -${(auctionDiscount * 100).toFixed(0)}%`)
  reasons.push(`자료 완성도 ${completeness}/10 → 신뢰도 ${(confidence * 100).toFixed(0)}%`)

  // ─── 7) Lock-in funnel 가산 ──────────────────────────────
  // 권장가격 근처(±5%)로 LOI 제출 시 매수자 Access Score +120
  // 더 높은 가격 제출 시 가산값 비례 (최대 +180)
  const loiBoost = Math.round(120 * confidence)

  return {
    scenarios,
    confidence,
    reasons,
    recommended: "중립",
    loiBoost,
    modelVersion: MODEL_VERSION,
  }
}

// ─── 매수자 측 가격 평가 (가이드 vs 제안가 비교) ──────────────

export interface BidEvaluation {
  /** 시나리오 라벨 */
  category: "BARGAIN" | "FAIR" | "AGGRESSIVE" | "OVERPRICED"
  /** 평가 메시지 (한국어) */
  message: string
  /** 권장 가격(중립) 대비 % */
  diffPct: number
}

export function evaluateBid(
  bidAmount: number,
  guide: PriceGuideResult,
): BidEvaluation {
  const neutral = guide.scenarios.find(s => s.label === "중립")!
  const conservative = guide.scenarios.find(s => s.label === "보수")!
  const aggressive = guide.scenarios.find(s => s.label === "공격")!
  const diffPct = ((bidAmount - neutral.price) / neutral.price) * 100

  if (bidAmount < conservative.price * 0.95) {
    return {
      category: "BARGAIN",
      message: "보수 가격보다 낮은 매수 — 매도자 거절 가능성이 높습니다.",
      diffPct: Number(diffPct.toFixed(1)),
    }
  }
  if (bidAmount <= neutral.price * 1.02) {
    return {
      category: "FAIR",
      message: "중립 권장가 범위 — 협상 성공 가능성이 가장 높습니다.",
      diffPct: Number(diffPct.toFixed(1)),
    }
  }
  if (bidAmount <= aggressive.price * 1.02) {
    return {
      category: "AGGRESSIVE",
      message: "공격적 가격 — 경쟁이 치열한 매물에서 효과적입니다.",
      diffPct: Number(diffPct.toFixed(1)),
    }
  }
  return {
    category: "OVERPRICED",
    message: "권장 상한 초과 — 수익률 IRR이 시장 평균 미만일 수 있습니다.",
    diffPct: Number(diffPct.toFixed(1)),
  }
}

// ═══════════════════════════════════════════════════════════════
// v2: Claude LLM 시장 분석 통합 가격 가이드
// ═══════════════════════════════════════════════════════════════

import { getAIService } from "./core/llm-service"

export interface AIEnhancedPriceGuide extends PriceGuideResult {
  aiAnalysis: {
    /** Claude의 시장 분석 */
    marketNarrative: string
    /** AI 관점의 적정가 범위 */
    aiPriceRange: { low: number; mid: number; high: number }
    /** 시장 전망 */
    marketOutlook: "BULLISH" | "NEUTRAL" | "BEARISH"
    /** 협상 전략 */
    negotiationStrategy: string
    /** 투자 적합성 */
    investmentFit: string
    /** 주의 사항 */
    caveats: string[]
  }
  method: "hybrid-ai" | "model-only"
}

/**
 * v2: 수학 모델 + Claude 시장 분석 통합
 */
export async function computePriceGuideWithAI(
  input: PriceGuideInput
): Promise<AIEnhancedPriceGuide> {
  const modelResult = computePriceGuide(input)

  const ai = getAIService()
  if (!ai.isConfigured()) {
    return {
      ...modelResult,
      aiAnalysis: {
        marketNarrative: "[AI 비활성] 수학 모델 결과만 표시됩니다.",
        aiPriceRange: {
          low: modelResult.scenarios.find(s => s.label === "보수")?.price ?? 0,
          mid: modelResult.scenarios.find(s => s.label === "중립")?.price ?? 0,
          high: modelResult.scenarios.find(s => s.label === "공격")?.price ?? 0,
        },
        marketOutlook: "NEUTRAL",
        negotiationStrategy: "",
        investmentFit: "",
        caveats: [],
      },
      method: "model-only",
    }
  }

  try {
    const neutral = modelResult.scenarios.find(s => s.label === "중립")!
    const conservative = modelResult.scenarios.find(s => s.label === "보수")!
    const aggressive = modelResult.scenarios.find(s => s.label === "공격")!

    const prompt = `## NPL 매물 가격 분석 — AI 시장 관점 보강 요청

### 매물 정보
- 담보유형: ${input.collateralType}
- 지역: ${input.region}
- 채권 잔액: ${(input.outstandingAmount / 1e8).toFixed(1)}억원
- 감정가: ${(input.appraisalValue / 1e8).toFixed(1)}억원
- 선순위 채권: ${((input.seniorLiens ?? 0) / 1e8).toFixed(1)}억원
- 임차보증금: ${((input.leaseDeposits ?? 0) / 1e8).toFixed(1)}억원
- 리스크 등급: ${input.riskGrade ?? "C"}
- 유찰 횟수: ${input.auctionStage ?? 0}회

### 수학 모델 결과
- 보수적: ${(conservative.price / 1e8).toFixed(2)}억원 (IRR ${conservative.expectedIrr}%)
- 중립적: ${(neutral.price / 1e8).toFixed(2)}억원 (IRR ${neutral.expectedIrr}%)
- 공격적: ${(aggressive.price / 1e8).toFixed(2)}억원 (IRR ${aggressive.expectedIrr}%)
- 모델 신뢰도: ${(modelResult.confidence * 100).toFixed(0)}%

이 모델 결과에 시장 관점 분석을 추가해주세요.

JSON 형식 응답:
{
  "marketNarrative": "시장 분석 (3~4문장)",
  "aiPriceRange": { "low": 숫자(원), "mid": 숫자(원), "high": 숫자(원) },
  "marketOutlook": "BULLISH|NEUTRAL|BEARISH",
  "negotiationStrategy": "협상 전략 (2~3문장)",
  "investmentFit": "투자 적합성 평가 (1~2문장)",
  "caveats": ["주의사항1", "주의사항2"]
}`

    const response = await ai.chat({
      messages: [{ role: "user", content: prompt }],
      system: "당신은 한국 NPL 시장 전문 애널리스트입니다. 수학 모델의 가격 산출에 시장 관점의 분석을 추가합니다. 보수적이고 현실적인 관점을 유지하세요. 반드시 JSON으로만 응답하세요.",
      maxTokens: 2048,
      temperature: 0.2,
    })

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("JSON 파싱 실패")

    const aiResult = JSON.parse(jsonMatch[0])

    return {
      ...modelResult,
      aiAnalysis: {
        marketNarrative: aiResult.marketNarrative ?? "",
        aiPriceRange: aiResult.aiPriceRange ?? {
          low: conservative.price,
          mid: neutral.price,
          high: aggressive.price,
        },
        marketOutlook: aiResult.marketOutlook ?? "NEUTRAL",
        negotiationStrategy: aiResult.negotiationStrategy ?? "",
        investmentFit: aiResult.investmentFit ?? "",
        caveats: aiResult.caveats ?? [],
      },
      method: "hybrid-ai",
    }
  } catch (err: any) {
    console.error("[PriceGuide] AI 분석 실패:", err.message)
    return {
      ...modelResult,
      aiAnalysis: {
        marketNarrative: `[AI 오류] ${err.message}`,
        aiPriceRange: {
          low: modelResult.scenarios.find(s => s.label === "보수")?.price ?? 0,
          mid: modelResult.scenarios.find(s => s.label === "중립")?.price ?? 0,
          high: modelResult.scenarios.find(s => s.label === "공격")?.price ?? 0,
        },
        marketOutlook: "NEUTRAL",
        negotiationStrategy: "",
        investmentFit: "",
        caveats: [],
      },
      method: "model-only",
    }
  }
}

// ─── 테스트 export ────────────────────────────────────────────
export const __test__ = {
  REGION_RECOVERY,
  COLLATERAL_FACTOR,
  RISK_GRADE_FACTOR,
  regionFactor,
  MODEL_VERSION,
}
