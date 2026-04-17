// ─── NPL 이상 탐지 엔진 v2 ─────────────────────────────────────
// 비정상 가격, 조건, 사기 패턴 탐지.
// v1: 규칙 기반 (if문)
// v2: 규칙 기반 + Claude LLM 패턴 인식 앙상블
//   - detectAnomalies(): 기존 규칙 기반 (빠른 응답)
//   - detectAnomaliesWithAI(): 규칙 + Claude 패턴 분석 (권장)

import { getAIService } from "./core/llm-service"

export interface AnomalyInput {
  listingId: string
  // 가격 관련
  askingPrice: number
  appraisalValue: number
  regionAvgPrice: number       // 지역 평균 (㎡당)
  area: number                 // ㎡
  // 거래 관련
  sellerName: string
  sellerAccountAge: number     // 계정 생성 후 일수
  sellerListingCount: number
  sellerCompletedDeals: number
  // 매물 관련
  propertyType: string
  region: string
  daysOnMarket: number         // 등록 후 일수
  viewCount: number
  inquiryCount: number
  // 행동 관련
  priceChangeCount: number     // 가격 변경 횟수
  lastPriceChange?: number     // 최근 가격 변경 시간 (시간 전)
  hasDocuments: boolean
  documentCount: number
  // 과거 이력 (해당 매도자)
  previousFlagCount: number
  previousReportCount: number
}

export interface AnomalyResult {
  overallRisk: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  overallScore: number         // 0~100 (높을수록 위험)
  alerts: AnomalyAlert[]
  recommendations: string[]
  detailedScores: {
    category: string
    score: number
    maxScore: number
    alerts: string[]
  }[]
}

export interface AnomalyAlert {
  id: string
  category: "PRICE" | "SELLER" | "LISTING" | "BEHAVIOR" | "PATTERN"
  severity: "INFO" | "WARNING" | "DANGER" | "CRITICAL"
  title: string
  description: string
  evidence: string
  confidence: number           // 0~100
}

// ─── 이상 탐지 규칙 엔진 ────────────────────────────────────

export function detectAnomalies(input: AnomalyInput): AnomalyResult {
  const alerts: AnomalyAlert[] = []
  let alertIdx = 1

  function addAlert(
    category: AnomalyAlert["category"],
    severity: AnomalyAlert["severity"],
    title: string,
    description: string,
    evidence: string,
    confidence: number,
  ) {
    alerts.push({
      id: `ANM-${String(alertIdx++).padStart(3, "0")}`,
      category, severity, title, description, evidence, confidence,
    })
  }

  // ── 1. 가격 이상 탐지 ──────────────────────────────
  const expectedPrice = input.regionAvgPrice * input.area
  const priceRatio = input.askingPrice / (expectedPrice || 1)
  const appraisalRatio = input.askingPrice / (input.appraisalValue || 1)

  if (priceRatio < 0.3) {
    addAlert("PRICE", "CRITICAL", "비정상 저가 매물",
      "지역 평균 대비 70% 이상 저렴한 매물. 사기 또는 심각한 하자 가능성.",
      `매물가 / 지역평균 = ${(priceRatio * 100).toFixed(0)}%`, 90)
  } else if (priceRatio < 0.5) {
    addAlert("PRICE", "WARNING", "과도한 할인 매물",
      "지역 평균 대비 50% 이상 저렴. 사유 확인 필요.",
      `매물가 / 지역평균 = ${(priceRatio * 100).toFixed(0)}%`, 70)
  }

  if (priceRatio > 1.5) {
    addAlert("PRICE", "WARNING", "과대평가 매물",
      "지역 평균 대비 50% 이상 비싼 매물. 가격 적정성 확인 필요.",
      `매물가 / 지역평균 = ${(priceRatio * 100).toFixed(0)}%`, 60)
  }

  if (appraisalRatio > 1.2) {
    addAlert("PRICE", "DANGER", "감정가 초과 매물",
      "감정가 대비 20% 이상 높은 가격. 과대평가 또는 가격 조작 가능성.",
      `매물가 / 감정가 = ${(appraisalRatio * 100).toFixed(0)}%`, 75)
  }

  // ── 2. 매도자 신뢰도 ──────────────────────────────
  if (input.sellerAccountAge < 7) {
    addAlert("SELLER", "DANGER", "신규 계정 매도자",
      "계정 생성 7일 이내의 매도자. 사기 계정 가능성.",
      `계정 생성 ${input.sellerAccountAge}일 전`, 80)
  } else if (input.sellerAccountAge < 30) {
    addAlert("SELLER", "WARNING", "신규 매도자",
      "계정 생성 30일 이내. 거래 이력 미확인.",
      `계정 생성 ${input.sellerAccountAge}일 전`, 50)
  }

  if (input.sellerListingCount > 20 && input.sellerCompletedDeals === 0) {
    addAlert("SELLER", "DANGER", "대량 등록 무거래 매도자",
      "다수 매물 등록했으나 거래 완료 이력 없음. 미끼 매물 가능성.",
      `등록 ${input.sellerListingCount}건, 거래완료 0건`, 85)
  }

  if (input.previousFlagCount >= 3) {
    addAlert("SELLER", "CRITICAL", "반복 신고 매도자",
      "과거 3회 이상 신고 이력. 고위험 매도자.",
      `신고 ${input.previousFlagCount}회`, 95)
  }

  if (input.previousReportCount >= 1) {
    addAlert("SELLER", "WARNING", "신고 이력 매도자",
      "과거 신고 이력 존재. 주의 필요.",
      `신고 ${input.previousReportCount}회`, 60)
  }

  // ── 3. 매물 이상 ──────────────────────────────────
  if (!input.hasDocuments || input.documentCount === 0) {
    addAlert("LISTING", "WARNING", "증빙 서류 미첨부",
      "등기부등본, 감정평가서 등 증빙 서류가 없음. 매물 실존 미확인.",
      `첨부 서류 ${input.documentCount}건`, 55)
  }

  if (input.daysOnMarket > 180 && input.viewCount < 10) {
    addAlert("LISTING", "INFO", "장기 미관심 매물",
      "6개월 이상 등록 후 관심도 매우 낮음. 가격 또는 조건 재검토 필요.",
      `등록 ${input.daysOnMarket}일, 조회 ${input.viewCount}회`, 30)
  }

  if (input.daysOnMarket < 1 && input.inquiryCount > 50) {
    addAlert("LISTING", "WARNING", "비정상 관심 집중",
      "등록 1일 이내 50건 이상 문의. 자작 또는 봇 가능성.",
      `등록 ${input.daysOnMarket}일, 문의 ${input.inquiryCount}건`, 65)
  }

  // ── 4. 행동 이상 ──────────────────────────────────
  if (input.priceChangeCount > 5) {
    addAlert("BEHAVIOR", "WARNING", "잦은 가격 변경",
      "5회 이상 가격 변경. 불안정한 매물 또는 호객 행위.",
      `가격 변경 ${input.priceChangeCount}회`, 55)
  }

  if (input.lastPriceChange !== undefined && input.lastPriceChange < 1) {
    addAlert("BEHAVIOR", "INFO", "최근 가격 변경",
      "1시간 이내 가격 변경 발생.",
      `${input.lastPriceChange}시간 전 변경`, 25)
  }

  // ── 5. 패턴 매칭 (사기 유형) ───────────────────────
  // 유형 A: 미끼 매물 (과도한 저가 + 서류 없음 + 신규 계정)
  if (priceRatio < 0.5 && !input.hasDocuments && input.sellerAccountAge < 30) {
    addAlert("PATTERN", "CRITICAL", "미끼 매물 패턴 감지",
      "[저가 + 서류미비 + 신규계정] 미끼 매물 3중 패턴. 사기 가능성 매우 높음.",
      "패턴: LOW_PRICE + NO_DOCS + NEW_ACCOUNT", 95)
  }

  // 유형 B: 급매 사기 (최근 가격 급락 + 급한 거래 촉구)
  if (input.priceChangeCount > 3 && priceRatio < 0.6) {
    addAlert("PATTERN", "DANGER", "급매 사기 패턴 의심",
      "[잦은 가격 인하 + 저가] 급매 사칭 패턴. 실제 급매 여부 확인 필요.",
      "패턴: FREQUENT_PRICE_DROP + LOW_PRICE", 70)
  }

  // ── 점수 산정 ──────────────────────────────────────
  const severityScore: Record<AnomalyAlert["severity"], number> = {
    INFO: 5, WARNING: 15, DANGER: 30, CRITICAL: 50,
  }

  const overallScore = Math.min(100, alerts.reduce((s, a) => s + severityScore[a.severity] * (a.confidence / 100), 0))

  const overallRisk: AnomalyResult["overallRisk"] =
    overallScore >= 80 ? "CRITICAL" :
    overallScore >= 60 ? "HIGH" :
    overallScore >= 35 ? "MEDIUM" :
    overallScore >= 10 ? "LOW" : "SAFE"

  // 카테고리별 점수
  const categories: AnomalyAlert["category"][] = ["PRICE", "SELLER", "LISTING", "BEHAVIOR", "PATTERN"]
  const detailedScores = categories.map(cat => {
    const catAlerts = alerts.filter(a => a.category === cat)
    const catScore = catAlerts.reduce((s, a) => s + severityScore[a.severity] * (a.confidence / 100), 0)
    return {
      category: cat,
      score: Math.round(catScore),
      maxScore: cat === "PATTERN" ? 50 : 30,
      alerts: catAlerts.map(a => a.title),
    }
  })

  // 권고사항
  const recommendations: string[] = []
  if (overallScore >= 60) recommendations.push("이 매물에 대한 투자를 즉시 중단하고 추가 검증을 수행하세요.")
  if (alerts.some(a => a.category === "SELLER" && a.severity === "CRITICAL")) recommendations.push("매도자 신원을 KYC/KYB 절차로 재확인하세요.")
  if (alerts.some(a => a.category === "PRICE")) recommendations.push("감정평가서 원본을 직접 확인하고, 독립 감정을 의뢰하세요.")
  if (!input.hasDocuments) recommendations.push("증빙 서류(등기부등본, 감정평가서) 제출을 요청하세요.")
  if (recommendations.length === 0) recommendations.push("현재 특별한 이상 징후가 감지되지 않았습니다.")

  return {
    overallRisk,
    overallScore: Math.round(overallScore),
    alerts: alerts.sort((a, b) => severityScore[b.severity] - severityScore[a.severity]),
    recommendations,
    detailedScores,
  }
}

// ═══════════════════════════════════════════════════════════════
// v2: Claude LLM 이상 탐지 앙상블
// ═══════════════════════════════════════════════════════════════

export interface AIAnomalyResult extends AnomalyResult {
  aiInsights: {
    /** Claude의 패턴 분석 */
    narrative: string
    /** 규칙 기반으로 잡지 못한 추가 이상 징후 */
    additionalPatterns: Array<{
      pattern: string
      severity: "WARNING" | "DANGER" | "CRITICAL"
      explanation: string
    }>
    /** AI의 종합 판단 */
    verdict: "SAFE" | "SUSPICIOUS" | "LIKELY_FRAUD"
    /** 조사 우선순위 */
    investigationPriority: string[]
  }
  method: "hybrid-ai" | "rules-only"
}

/**
 * v2 하이브리드: 규칙 기반 + Claude 패턴 인식
 */
export async function detectAnomaliesWithAI(
  input: AnomalyInput
): Promise<AIAnomalyResult> {
  const ruleResult = detectAnomalies(input)

  const ai = getAIService()
  if (!ai.isConfigured()) {
    return {
      ...ruleResult,
      aiInsights: {
        narrative: "[AI 비활성] 규칙 기반 분석 결과만 표시됩니다.",
        additionalPatterns: [],
        verdict: ruleResult.overallRisk === "CRITICAL" ? "LIKELY_FRAUD" : ruleResult.overallRisk === "HIGH" ? "SUSPICIOUS" : "SAFE",
        investigationPriority: ruleResult.recommendations,
      },
      method: "rules-only",
    }
  }

  try {
    const prompt = `## NPL 매물 이상 탐지 — AI 패턴 분석 요청

### 매물 정보
- 매물 ID: ${input.listingId}
- 호가: ${(input.askingPrice / 1e8).toFixed(1)}억원
- 감정가: ${(input.appraisalValue / 1e8).toFixed(1)}억원
- 호가/감정가 비율: ${((input.askingPrice / input.appraisalValue) * 100).toFixed(1)}%
- 지역 평균 ㎡당가: ${(input.regionAvgPrice / 1e4).toFixed(0)}만원/㎡
- 면적: ${input.area}㎡
- 담보유형: ${input.propertyType}, 지역: ${input.region}

### 매도자 정보
- 매도자: ${input.sellerName}
- 계정 생성: ${input.sellerAccountAge}일 전
- 등록 매물 수: ${input.sellerListingCount}건
- 완료 거래 수: ${input.sellerCompletedDeals}건
- 과거 신고: ${input.previousFlagCount}건
- 과거 접수: ${input.previousReportCount}건

### 매물 행동 패턴
- 등록 후 경과일: ${input.daysOnMarket}일
- 조회수: ${input.viewCount}
- 문의수: ${input.inquiryCount}
- 가격 변경 횟수: ${input.priceChangeCount}
- 증빙 서류: ${input.hasDocuments ? `있음 (${input.documentCount}건)` : "없음"}

### 규칙 기반 분석 결과
- 전체 리스크: ${ruleResult.overallRisk} (${ruleResult.overallScore}/100)
- 발견된 이상 징후: ${ruleResult.alerts.length}건
${ruleResult.alerts.map(a => `  - [${a.severity}] ${a.title}: ${a.description}`).join("\n")}

규칙 기반 분석에서 놓칠 수 있는 추가 패턴을 분석해주세요. 특히:
1. 복합 패턴 (여러 요소의 조합에서 나타나는 이상)
2. 시장 맥락 기반 이상 (지역/유형 특성 고려)
3. 사기 수법 패턴 매칭

반드시 JSON 형식으로 응답:
{
  "narrative": "패턴 분석 서술 (2~4문장)",
  "additionalPatterns": [{"pattern": "패턴명", "severity": "WARNING|DANGER|CRITICAL", "explanation": "설명"}],
  "verdict": "SAFE|SUSPICIOUS|LIKELY_FRAUD",
  "investigationPriority": ["우선 조사 사항1", "사항2"]
}`

    const response = await ai.chat({
      messages: [{ role: "user", content: prompt }],
      system: "당신은 금융 사기 탐지 전문가입니다. NPL(부실채권) 매물의 이상 패턴을 분석합니다. 보수적으로 판단하되, 실제 위험 신호를 놓치지 마세요. 반드시 JSON으로만 응답하세요.",
      maxTokens: 2048,
      temperature: 0.1,
    })

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("JSON 파싱 실패")

    const aiResult = JSON.parse(jsonMatch[0])

    return {
      ...ruleResult,
      aiInsights: {
        narrative: aiResult.narrative ?? "",
        additionalPatterns: aiResult.additionalPatterns ?? [],
        verdict: aiResult.verdict ?? "SAFE",
        investigationPriority: aiResult.investigationPriority ?? [],
      },
      method: "hybrid-ai",
    }
  } catch (err: any) {
    console.error("[AnomalyDetector] AI 분석 실패:", err.message)
    return {
      ...ruleResult,
      aiInsights: {
        narrative: `[AI 오류] ${err.message}`,
        additionalPatterns: [],
        verdict: ruleResult.overallRisk === "CRITICAL" ? "LIKELY_FRAUD" : "SAFE",
        investigationPriority: ruleResult.recommendations,
      },
      method: "rules-only",
    }
  }
}
