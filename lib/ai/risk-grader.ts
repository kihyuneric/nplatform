/**
 * lib/ai/risk-grader.ts
 *
 * NPL 리스크 등급 — Claude AI 프롬프트 로직
 * — 기존 가중치 합산식(담보가치 0.3 / 권리관계 0.25 …) 대신 LLM 추론으로 등급 산출
 * — 특수조건(유치권·법정지상권·지분경매 등)은 프롬프트에 주입되어 등급·해설에 반영
 * — 통계 컨텍스트(지역·인근 낙찰·실거래)를 함께 제공해 데이터 기반 판단 유도
 */

import { getAIService } from "./core/llm-service"
import type {
  AiRiskGrade,
  RiskGrade,
  RiskLevel,
  SpecialConditions,
} from "@/lib/npl/unified-report/types"
import { SPECIAL_CONDITION_LABEL, SPECIAL_CONDITION_PENALTY } from "@/lib/npl/unified-report/types"
import type { StatisticsContext } from "@/lib/npl/unified-report/statistics"
import {
  pickPreferredBidRatio,
  medianNearbyBidRatio,
  estimateSaleDays,
} from "@/lib/npl/unified-report/statistics"

// ─── 입력 ────────────────────────────────────────────────────
export interface RiskGradeRequest {
  assetTitle: string
  region: string
  propertyCategory: string
  appraisalValue: number
  totalBondAmount: number
  ltvPercent: number
  specialConditions: SpecialConditions
  statistics: StatisticsContext
  /** 추가 자유서술 — 권리관계, 임차인, 기타 특이사항 */
  extraNotes?: string
}

// ─── 프롬프트 빌더 ───────────────────────────────────────────
export function buildRiskPrompt(req: RiskGradeRequest): string {
  const sc = req.specialConditions
  const activeConditions = (Object.keys(SPECIAL_CONDITION_LABEL) as (keyof typeof SPECIAL_CONDITION_LABEL)[])
    .filter(k => sc[k])
    .map(k => `- ${SPECIAL_CONDITION_LABEL[k]} (낙찰가율 예상 감점 ${SPECIAL_CONDITION_PENALTY[k]}%p)`)
    .join("\n") || "- 없음"

  const pref = pickPreferredBidRatio(req.statistics.auctionRatioStats, "6M")
  const regionStat = pref
    ? `지역(${pref.scope}) 6개월 낙찰가율 중앙값 ${pref.value.toFixed(1)}% · 표본 ${pref.sampleSize}건`
    : `지역 낙찰가율 통계 미확보 (AI 추정 필요)`

  const nearbyMedian = medianNearbyBidRatio(req.statistics.nearbyAuction)
  const nearbyStat = nearbyMedian != null
    ? `인근 경매 중앙값 낙찰가율 ${nearbyMedian.toFixed(1)}% · ${req.statistics.nearbyAuction?.cases.length ?? 0}건`
    : `인근 경매 표본 없음`

  const courtDays = estimateSaleDays(req.statistics.courtSchedule, 0)
  const courtStat = req.statistics.courtSchedule
    ? `관할 ${req.statistics.courtSchedule.courtName} · 1회차 매각 평균 ${courtDays ?? "—"}일`
    : `관할법원 데이터 없음`

  const sameAddr = req.statistics.sameAddressAuction
  const sameAddrStat = sameAddr && sameAddr.cases.length > 0
    ? `동일 주소 이전 낙찰 ${sameAddr.cases.length}건 · 평균 낙찰가율 ${sameAddr.summary.avgBidRatio.toFixed(1)}% · 평균 소요일 ${sameAddr.summary.avgDurationDays}일`
    : `동일 주소 낙찰 이력 없음`

  return `다음 NPL 투자 건에 대해 리스크 등급(A~E)과 세부 근거를 JSON으로 출력하세요.

## 대상 매물
- 명칭: ${req.assetTitle}
- 지역: ${req.region}
- 용도: ${req.propertyCategory}
- 감정가: ${(req.appraisalValue / 1e8).toFixed(2)}억원
- 총채권액: ${(req.totalBondAmount / 1e8).toFixed(2)}억원
- LTV: ${req.ltvPercent.toFixed(1)}%

## 특수조건 (매물등록 시 체크)
${activeConditions}

## 통계 컨텍스트
- ${regionStat}
- ${nearbyStat}
- ${sameAddrStat}
- ${courtStat}

${req.extraNotes ? `## 추가 메모\n${req.extraNotes}\n` : ""}

## 평가 기준 (가중치 참고용 · 확정값 아님)
- 담보가치 리스크 (30%): LTV, 감정 시점, 시세 변동
- 권리관계 리스크 (25%): 근저당 순위, 임차인, 특수조건
- 시장 리스크 (20%): 지역 낙찰가율 모멘텀, 거래량, 금리
- 유동성 리스크 (15%): 매각 소요기간, 입찰자 수
- 법적 리스크 (10%): 유치권/법정지상권/분묘/농지 등

## 출력 형식 (반드시 JSON 한 덩어리로)
{
  "grade": "A" | "B" | "C" | "D" | "E",
  "score": 0-100 정수,
  "level": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "narrative": "3-5 문장 요약 해설 (한국어)",
  "factors": [
    {
      "category": "담보가치" | "권리관계" | "시장" | "유동성" | "법적",
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "score": 0-100,
      "explanation": "근거 2-3 문장",
      "mitigation": "완화 방안 1-2 문장"
    }
  ],
  "specialConditionAdjustments": [
    { "condition": "유치권", "impact": "낙찰가율 -15%p · 회수 불확실성 HIGH" }
  ]
}`
}

// ─── 호출 ────────────────────────────────────────────────────
interface ParsedRiskOutput {
  grade: RiskGrade
  score: number
  level: RiskLevel
  narrative: string
  factors: {
    category: string
    severity: "LOW" | "MEDIUM" | "HIGH"
    score: number
    explanation: string
    mitigation: string
  }[]
  specialConditionAdjustments: { condition: string; impact: string }[]
}

function extractJson(text: string): ParsedRiskOutput | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as ParsedRiskOutput
  } catch {
    return null
  }
}

function hashInput(req: RiskGradeRequest): string {
  const payload = JSON.stringify({
    t: req.assetTitle, r: req.region, p: req.propertyCategory,
    a: req.appraisalValue, b: req.totalBondAmount,
    sc: req.specialConditions,
  })
  let h = 0
  for (let i = 0; i < payload.length; i++) {
    h = ((h << 5) - h + payload.charCodeAt(i)) | 0
  }
  return `rg-${Math.abs(h).toString(36)}`
}

export async function gradeRiskWithAI(req: RiskGradeRequest): Promise<AiRiskGrade> {
  const ai = getAIService()
  const prompt = buildRiskPrompt(req)

  const response = await ai.chat({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 1500,
    temperature: 0.3,
  })

  const parsed = extractJson(response.text)
  if (!parsed) {
    throw new Error("RISK_GRADE_PARSE_FAIL: " + response.text.slice(0, 200))
  }

  return {
    grade: parsed.grade,
    score: parsed.score,
    level: parsed.level,
    narrative: parsed.narrative,
    factors: parsed.factors,
    specialConditionAdjustments: parsed.specialConditionAdjustments ?? [],
    promptMeta: {
      model: response.model,
      generatedAt: new Date().toISOString(),
      inputHash: hashInput(req),
    },
  }
}
