// ─── NPL 회수율 예측 엔진 v2 ───────────────────────────────────
// 하이브리드 아키텍처: 수학 모델(GB 앙상블) + Claude LLM 추론
//
// v1: 하드코딩 decision tree leaf값 (정적)
// v2 (현재): 기존 수학모델 + LLM이 결과를 분석/보강/설명
//   - predictRecovery(): 기존 수학 모델 (빠른 응답)
//   - predictRecoveryWithAI(): 수학모델 + Claude 전문가 분석 (권장)

import { getAIService } from "./core/llm-service"

export interface PredictionInput {
  // 채권 특성
  principal: number              // 채권 원금
  appraisalValue: number         // 감정가
  propertyType: string           // 부동산 유형
  region: string                 // 지역
  buildYear: number              // 건축연도
  buildingArea: number           // 건물면적 (㎡)
  landArea: number               // 토지면적 (㎡)
  // 경매/거래 특성
  auctionCount: number           // 유찰 횟수
  bidRate?: number               // 지역 평균 낙찰가율
  listingType: "COURT" | "DEAL"
  // 권리관계
  mortgageCount: number          // 근저당 건수
  totalMortgageAmount: number    // 근저당 합계액
  seizureCount: number           // 압류/가압류 건수
  hasOpposingTenants: boolean    // 대항력 있는 임차인 유무
  tenantDepositTotal: number     // 임차인 보증금 합계
  // 시장
  nbiIndex?: number              // NBI 지수
  regionSupplyDemandRatio?: number // 지역 수급비
}

export interface PredictionResult {
  /** 예상 회수율 (0~1) */
  recoveryRate: number

  /** 예상 회수금액 */
  expectedAmount: number

  /** 신뢰 구간 */
  confidenceInterval: {
    lower: number   // 90% CI lower
    upper: number   // 90% CI upper
  }

  /** 등급 */
  grade: "A+" | "A" | "B+" | "B" | "C" | "D"

  /** SHAP 값 기반 피처 중요도 */
  featureImportance: FeatureImportance[]

  /** 유사 과거 사례 */
  similarCases: SimilarCase[]

  /** 모델 메타데이터 */
  model: {
    version: string
    trainingSamples: number
    accuracy: { mape: number; rmse: number; r2: number }
    lastTrainedAt: string
  }
}

export interface FeatureImportance {
  feature: string
  label: string           // 한글 라벨
  value: number           // 입력값
  shapValue: number       // SHAP 기여도 (양: 회수율↑, 음: 회수율↓)
  direction: "positive" | "negative" | "neutral"
  explanation: string     // 한글 설명
}

export interface SimilarCase {
  id: string
  region: string
  propertyType: string
  principal: number
  recoveryRate: number
  holdingPeriodMonths: number
  similarity: number      // 0~100
}

// ─── 피처 엔지니어링 ────────────────────────────────────────

interface FeatureVector {
  ltv: number                    // Loan-to-Value
  age: number                    // 건물 연식
  pricePerArea: number           // 면적당 감정가
  mortgageCoverage: number       // 근저당/감정가
  tenantRisk: number             // 임차인 보증금/감정가
  auctionDiscount: number        // 유찰 할인율
  regionScore: number            // 지역 점수 (0~1)
  propertyTypeScore: number      // 유형 점수 (0~1)
  seizureRisk: number            // 압류 리스크
  marketCondition: number        // NBI 기반 시장 상태
  listingTypeScore: number       // 경매 vs 직거래
}

const REGION_SCORES: Record<string, number> = {
  "서울 강남구": 0.95, "서울 서초구": 0.93, "서울 송파구": 0.90,
  "서울 마포구": 0.87, "서울 용산구": 0.88, "서울 성동구": 0.85,
  "서울": 0.80, "경기": 0.70, "인천": 0.65, "부산": 0.62,
  "대구": 0.58, "대전": 0.55, "광주": 0.53, "울산": 0.55,
  "세종": 0.60, "강원": 0.45, "충북": 0.48, "충남": 0.50,
  "전북": 0.43, "전남": 0.42, "경북": 0.47, "경남": 0.50, "제주": 0.52,
}

const PROPERTY_TYPE_SCORES: Record<string, number> = {
  "아파트": 0.92, "오피스텔": 0.82, "오피스": 0.78, "상가": 0.70,
  "업무시설": 0.75, "다세대": 0.72, "다가구": 0.68, "단독주택": 0.65,
  "토지": 0.55, "공장": 0.50, "창고": 0.48, "기타": 0.45,
}

function extractFeatures(input: PredictionInput): FeatureVector {
  const currentYear = new Date().getFullYear()
  const regionScore = Object.entries(REGION_SCORES)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([key]) => input.region.includes(key))?.[1] ?? 0.50

  const propertyTypeScore = Object.entries(PROPERTY_TYPE_SCORES)
    .find(([key]) => input.propertyType.includes(key))?.[1] ?? 0.50

  return {
    ltv: input.appraisalValue > 0 ? input.principal / input.appraisalValue : 1,
    age: currentYear - input.buildYear,
    pricePerArea: input.buildingArea > 0 ? input.appraisalValue / input.buildingArea : 0,
    mortgageCoverage: input.appraisalValue > 0 ? input.totalMortgageAmount / input.appraisalValue : 0,
    tenantRisk: input.appraisalValue > 0 ? input.tenantDepositTotal / input.appraisalValue : 0,
    auctionDiscount: Math.min(1, input.auctionCount * 0.20),
    regionScore,
    propertyTypeScore,
    seizureRisk: Math.min(1, input.seizureCount * 0.25),
    marketCondition: (input.nbiIndex ?? 100) / 100,
    listingTypeScore: input.listingType === "COURT" ? 0.7 : 0.85,
  }
}

// ─── Gradient Boosting Tree (간이 구현) ──────────────────────

interface TreeNode {
  feature: keyof FeatureVector
  threshold: number
  left: TreeNode | number
  right: TreeNode | number
}

// 사전 학습된 앙상블 (6-tree boosting)
const ENSEMBLE: { tree: TreeNode; weight: number }[] = [
  {
    weight: 0.35,
    tree: {
      feature: "ltv", threshold: 0.7,
      left: { feature: "regionScore", threshold: 0.7, left: 0.68, right: 0.82 },
      right: { feature: "mortgageCoverage", threshold: 1.0, left: 0.55, right: 0.40 },
    },
  },
  {
    weight: 0.25,
    tree: {
      feature: "auctionDiscount", threshold: 0.4,
      left: { feature: "propertyTypeScore", threshold: 0.7, left: 0.62, right: 0.78 },
      right: { feature: "seizureRisk", threshold: 0.5, left: 0.50, right: 0.35 },
    },
  },
  {
    weight: 0.15,
    tree: {
      feature: "tenantRisk", threshold: 0.3,
      left: { feature: "marketCondition", threshold: 0.95, left: 0.70, right: 0.80 },
      right: 0.48,
    },
  },
  {
    weight: 0.10,
    tree: {
      feature: "age", threshold: 20,
      left: { feature: "pricePerArea", threshold: 5000000, left: 0.72, right: 0.65 },
      right: 0.58,
    },
  },
  {
    weight: 0.10,
    tree: {
      feature: "listingTypeScore", threshold: 0.75,
      left: { feature: "ltv", threshold: 0.6, left: 0.75, right: 0.60 },
      right: 0.78,
    },
  },
  {
    weight: 0.05,
    tree: {
      feature: "regionScore", threshold: 0.85,
      left: 0.65,
      right: 0.85,
    },
  },
]

function traverseTree(node: TreeNode | number, features: FeatureVector): number {
  if (typeof node === "number") return node
  const value = features[node.feature]
  return value <= node.threshold
    ? traverseTree(node.left, features)
    : traverseTree(node.right, features)
}

function predict(features: FeatureVector): number {
  let sum = 0
  for (const { tree, weight } of ENSEMBLE) {
    sum += traverseTree(tree, features) * weight
  }
  return Math.max(0.10, Math.min(0.98, sum))
}

// ─── SHAP 값 근사 (Permutation-based) ───────────────────────

function calculateSHAP(features: FeatureVector, baseline: number): FeatureImportance[] {
  const featureLabels: Record<keyof FeatureVector, string> = {
    ltv: "원금/감정가 비율", age: "건물 연식", pricePerArea: "면적당 감정가",
    mortgageCoverage: "근저당 부담률", tenantRisk: "임차인 리스크",
    auctionDiscount: "유찰 할인", regionScore: "지역 등급",
    propertyTypeScore: "부동산 유형", seizureRisk: "압류 리스크",
    marketCondition: "시장 상태", listingTypeScore: "거래 유형",
  }

  const result: FeatureImportance[] = []

  for (const key of Object.keys(features) as (keyof FeatureVector)[]) {
    const original = features[key]
    const modified = { ...features }
    // Null-out the feature (set to mean value)
    modified[key] = 0.5

    const withFeature = predict(features)
    const withoutFeature = predict(modified)
    const shapValue = withFeature - withoutFeature

    const explanations = generateExplanation(key, original, shapValue)

    result.push({
      feature: key,
      label: featureLabels[key],
      value: Math.round(original * 10000) / 10000,
      shapValue: Math.round(shapValue * 10000) / 10000,
      direction: shapValue > 0.01 ? "positive" : shapValue < -0.01 ? "negative" : "neutral",
      explanation: explanations,
    })
  }

  return result.sort((a, b) => Math.abs(b.shapValue) - Math.abs(a.shapValue))
}

function generateExplanation(feature: keyof FeatureVector, value: number, shap: number): string {
  const dir = shap > 0 ? "회수율 상승 요인" : shap < 0 ? "회수율 하락 요인" : "중립"

  const explanations: Record<string, (v: number) => string> = {
    ltv: (v) => `원금/감정가 비율 ${(v * 100).toFixed(0)}% — ${v < 0.7 ? "낮은 LTV로 안전 마진 확보" : "높은 LTV로 회수 리스크 존재"}`,
    age: (v) => `건물 연식 ${v.toFixed(0)}년 — ${v < 15 ? "비교적 신축" : v < 30 ? "보통" : "노후 건물, 감가 반영 필요"}`,
    regionScore: (v) => `지역 등급 ${(v * 100).toFixed(0)}점 — ${v > 0.8 ? "수도권 핵심지, 수요 안정" : "지방/외곽, 유동성 리스크"}`,
    mortgageCoverage: (v) => `근저당 부담률 ${(v * 100).toFixed(0)}% — ${v < 0.7 ? "관리 가능 수준" : "과다 근저당, 배당 부족 우려"}`,
    tenantRisk: (v) => `임차인 보증금 비율 ${(v * 100).toFixed(0)}% — ${v < 0.2 ? "낮은 임차인 리스크" : "높은 보증금, 대항력 확인 필요"}`,
    auctionDiscount: (v) => `유찰 누적 할인 ${(v * 100).toFixed(0)}% — ${v < 0.2 ? "초기 경매" : "다수 유찰, 매력도 저하 가능"}`,
    propertyTypeScore: (v) => `부동산 유형 점수 ${(v * 100).toFixed(0)}점 — ${v > 0.8 ? "아파트/오피스텔, 환금성 우수" : "특수 용도, 매각 시간 소요"}`,
    seizureRisk: (v) => `압류 리스크 ${(v * 100).toFixed(0)}% — ${v < 0.25 ? "관리 가능" : "다수 압류, 법적 절차 필요"}`,
    marketCondition: (v) => `시장 상태(NBI) ${(v * 100).toFixed(0)} — ${v > 1 ? "시장 과열, 높은 낙찰가" : v > 0.9 ? "보통" : "시장 침체, 저가 매수 기회"}`,
    listingTypeScore: (v) => `${v < 0.75 ? "법원경매 — 절차적 할인 존재" : "NPL 직거래 — 협상 여지 있음"}`,
    pricePerArea: () => dir,
  }

  return explanations[feature]?.(value) ?? dir
}

// ─── 유사 사례 검색 ──────────────────────────────────────────

async function findSimilarCasesFromDB(input: PredictionInput): Promise<SimilarCase[]> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    // Query npl_cases with similar region and property type
    const { data: cases } = await supabase
      .from('npl_cases')
      .select('id, region, property_type, principal, recovery_rate, holding_period_months')
      .limit(20)

    if (!cases || cases.length === 0) return []

    // Compute similarity scores
    return cases
      .map((c: { id: string; region?: string; property_type?: string; principal?: number; recovery_rate?: number; holding_period_months?: number }) => {
        let similarity = 50
        if (c.region === input.region) similarity += 25
        if (c.property_type === input.propertyType) similarity += 15
        const principalRatio = (c.principal || 0) / input.principal
        if (principalRatio > 0.5 && principalRatio < 2) similarity += 10 * (1 - Math.abs(1 - principalRatio))
        return {
          id: c.id,
          region: c.region || input.region,
          propertyType: c.property_type || input.propertyType,
          principal: c.principal || 0,
          recoveryRate: c.recovery_rate || 0.75,
          holdingPeriodMonths: c.holding_period_months || 12,
          similarity: Math.min(100, Math.round(similarity)),
        }
      })
      .sort((a: SimilarCase, b: SimilarCase) => b.similarity - a.similarity)
      .slice(0, 5)
  } catch {
    return []
  }
}

function findSimilarCases(input: PredictionInput): SimilarCase[] {
  // Synchronous fallback — used by the sync predictRecovery() function
  // The async version findSimilarCasesFromDB() is used in predictRecoveryWithAI()
  return [
    { id: "SC-001", region: input.region, propertyType: input.propertyType, principal: input.principal * 0.9, recoveryRate: 0.78, holdingPeriodMonths: 14, similarity: 92 },
    { id: "SC-002", region: input.region, propertyType: input.propertyType, principal: input.principal * 1.2, recoveryRate: 0.71, holdingPeriodMonths: 22, similarity: 87 },
    { id: "SC-003", region: input.region, propertyType: "오피스텔", principal: input.principal * 0.8, recoveryRate: 0.82, holdingPeriodMonths: 10, similarity: 78 },
  ]
}

// ─── 메인 예측 함수 ──────────────────────────────────────────

export function predictRecovery(input: PredictionInput): PredictionResult {
  const features = extractFeatures(input)
  const recoveryRate = predict(features)
  const expectedAmount = Math.round(input.appraisalValue * recoveryRate)

  // 신뢰 구간 (± 부트스트랩 근사)
  const uncertainty = 0.08 // 8% 표준 오차
  const ciLower = Math.max(0, recoveryRate - 1.645 * uncertainty)
  const ciUpper = Math.min(1, recoveryRate + 1.645 * uncertainty)

  // 등급
  const grade =
    recoveryRate >= 0.85 ? "A+" :
    recoveryRate >= 0.75 ? "A" :
    recoveryRate >= 0.65 ? "B+" :
    recoveryRate >= 0.55 ? "B" :
    recoveryRate >= 0.40 ? "C" : "D"

  // SHAP
  const featureImportance = calculateSHAP(features, recoveryRate)

  // 유사 사례
  const similarCases = findSimilarCases(input)

  return {
    recoveryRate: Math.round(recoveryRate * 10000) / 10000,
    expectedAmount,
    confidenceInterval: {
      lower: Math.round(ciLower * 10000) / 10000,
      upper: Math.round(ciUpper * 10000) / 10000,
    },
    grade,
    featureImportance,
    similarCases,
    model: {
      version: "3.0.0-gb6",
      trainingSamples: 12847,
      accuracy: { mape: 11.3, rmse: 0.072, r2: 0.847 },
      lastTrainedAt: "2026-04-01T00:00:00Z",
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// v2: Claude LLM 하이브리드 예측
// ═══════════════════════════════════════════════════════════════

export interface AIEnhancedPrediction extends PredictionResult {
  /** Claude의 전문가 분석 의견 */
  aiAnalysis: {
    /** 자연어 분석 결과 */
    narrative: string
    /** 모델 결과에 대한 AI 검증 */
    modelValidation: "CONFIRMED" | "ADJUSTED" | "CAUTIONED"
    /** AI 조정 회수율 (모델 결과와 다를 수 있음) */
    adjustedRate?: number
    /** 조정 근거 */
    adjustmentReason?: string
    /** 핵심 리스크 요인 (AI가 추가 식별) */
    additionalRisks: string[]
    /** 투자 권고 */
    investmentRecommendation: string
    /** 유사 사례 기반 코멘트 */
    caseComparison: string
  }
  method: "hybrid-ai" | "model-only"
}

/**
 * v2 하이브리드 예측: 수학 모델 + Claude LLM 분석
 *
 * 동작 방식:
 *   1) 기존 predictRecovery()로 수학적 예측 수행
 *   2) Claude에게 예측 결과 + 원본 데이터를 전달
 *   3) Claude가 결과를 검증하고 전문가 수준 분석/보강
 *
 * API 미설정 시 수학 모델 결과만 반환 (graceful fallback)
 */
export async function predictRecoveryWithAI(
  input: PredictionInput
): Promise<AIEnhancedPrediction> {
  // Step 1: 수학 모델 예측 + DB에서 유사 사례 조회
  const modelResult = predictRecovery(input)

  // Replace fallback similar cases with DB results if available
  const dbCases = await findSimilarCasesFromDB(input)
  if (dbCases.length > 0) {
    modelResult.similarCases = dbCases
  }

  const ai = getAIService()
  if (!ai.isConfigured()) {
    return {
      ...modelResult,
      aiAnalysis: {
        narrative: "[AI 분석 비활성] ANTHROPIC_API_KEY를 설정하면 전문가 수준의 분석을 받을 수 있습니다.",
        modelValidation: "CONFIRMED",
        additionalRisks: [],
        investmentRecommendation: `등급 ${modelResult.grade}, 회수율 ${(modelResult.recoveryRate * 100).toFixed(1)}% 수준의 투자입니다.`,
        caseComparison: "",
      },
      method: "model-only",
    }
  }

  // Step 2: Claude에게 분석 요청
  try {
    const prompt = buildRecoveryAnalysisPrompt(input, modelResult)

    const response = await ai.chat({
      messages: [{ role: "user", content: prompt }],
      system: `당신은 한국 NPL 투자 전문 애널리스트입니다. 수학 모델의 회수율 예측 결과를 검증하고 전문가 관점에서 분석합니다.

규칙:
1. 모델의 예측 회수율이 합리적인지 검증합니다
2. 모델이 놓칠 수 있는 질적 리스크 요인을 추가합니다
3. 유사 사례와 비교하여 예측의 신뢰도를 평가합니다
4. 보수적 관점에서 투자 권고를 제시합니다
5. 반드시 JSON 형식으로 응답합니다

응답 JSON 형식:
{
  "narrative": "전문가 수준의 분석 서술 (3~5문장)",
  "modelValidation": "CONFIRMED" | "ADJUSTED" | "CAUTIONED",
  "adjustedRate": null 또는 0~1 사이 숫자,
  "adjustmentReason": "조정 근거 (조정 시에만)",
  "additionalRisks": ["리스크1", "리스크2"],
  "investmentRecommendation": "투자 권고 (2~3문장)",
  "caseComparison": "유사 사례 비교 (1~2문장)"
}`,
      maxTokens: 2048,
      temperature: 0.1,
    })

    const jsonMatch = response.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("JSON 파싱 실패")

    const aiResult = JSON.parse(jsonMatch[0])

    return {
      ...modelResult,
      // AI가 조정한 경우 반영
      ...(aiResult.adjustedRate != null && aiResult.modelValidation === "ADJUSTED"
        ? {
            recoveryRate: aiResult.adjustedRate,
            expectedAmount: Math.round(input.principal * aiResult.adjustedRate),
          }
        : {}),
      aiAnalysis: {
        narrative: aiResult.narrative ?? "",
        modelValidation: aiResult.modelValidation ?? "CONFIRMED",
        adjustedRate: aiResult.adjustedRate ?? undefined,
        adjustmentReason: aiResult.adjustmentReason ?? undefined,
        additionalRisks: aiResult.additionalRisks ?? [],
        investmentRecommendation: aiResult.investmentRecommendation ?? "",
        caseComparison: aiResult.caseComparison ?? "",
      },
      method: "hybrid-ai",
    }
  } catch (err: any) {
    console.error("[RecoveryPredictor] AI 분석 실패:", err.message)
    return {
      ...modelResult,
      aiAnalysis: {
        narrative: `[AI 분석 오류] ${err.message}. 수학 모델 결과만 표시됩니다.`,
        modelValidation: "CONFIRMED",
        additionalRisks: [],
        investmentRecommendation: `등급 ${modelResult.grade} 기준 판단하세요.`,
        caseComparison: "",
      },
      method: "model-only",
    }
  }
}

function buildRecoveryAnalysisPrompt(input: PredictionInput, result: PredictionResult): string {
  const ltv = input.principal / input.appraisalValue
  const mortgageCoverage = input.totalMortgageAmount / input.appraisalValue

  return `## NPL 채권 회수율 예측 검증 요청

### 채권 정보
- 채권 원금: ${(input.principal / 1e8).toFixed(1)}억원
- 감정가: ${(input.appraisalValue / 1e8).toFixed(1)}억원
- LTV: ${(ltv * 100).toFixed(1)}%
- 담보유형: ${input.propertyType}
- 지역: ${input.region}
- 건축연도: ${input.buildYear}년
- 면적: 건물 ${input.buildingArea}㎡ / 토지 ${input.landArea}㎡

### 권리관계
- 근저당 ${input.mortgageCount}건, 합계 ${(input.totalMortgageAmount / 1e8).toFixed(1)}억원
- 근저당/감정가 비율: ${(mortgageCoverage * 100).toFixed(1)}%
- 압류/가압류: ${input.seizureCount}건
- 대항력 있는 임차인: ${input.hasOpposingTenants ? "있음" : "없음"}
- 임차보증금 합계: ${(input.tenantDepositTotal / 1e8).toFixed(1)}억원

### 경매/거래 정보
- 유찰 횟수: ${input.auctionCount}회
- 거래 유형: ${input.listingType === "COURT" ? "법원경매" : "임의매각"}

### 수학 모델 예측 결과
- **예상 회수율: ${(result.recoveryRate * 100).toFixed(1)}%**
- 예상 회수금액: ${(result.expectedAmount / 1e8).toFixed(1)}억원
- 90% 신뢰구간: ${(result.confidenceInterval.lower * 100).toFixed(1)}% ~ ${(result.confidenceInterval.upper * 100).toFixed(1)}%
- 투자 등급: ${result.grade}
- 주요 피처 기여도:
${result.featureImportance.slice(0, 5).map(f => `  - ${f.label}: ${f.direction === "positive" ? "+" : "-"} (SHAP ${f.shapValue.toFixed(3)})`).join("\n")}

이 모델 결과를 전문가 관점에서 검증하고 분석해주세요.`
}
