/**
 * lib/analysis-models-schema.ts
 *
 * NPL 분석 엔진 — 각 모델의 입력 데이터 스키마 정의.
 * 이 스키마를 기반으로:
 *   1. 자동 분석 엔진이 어떤 모델을 실행할지 결정
 *   2. 관리자 패널이 모델별 필요 데이터를 표시
 *   3. API 문서 자동 생성
 */

// ─── Field Definition ──────────────────────────────────
export interface ModelField {
  key: string
  label: string
  type: 'number' | 'string' | 'enum' | 'boolean' | 'date'
  required: boolean
  description: string
  unit?: string
  enum?: string[]
  min?: number
  max?: number
  example?: string | number | boolean
}

// ─── Model Definition ──────────────────────────────────
export interface AnalysisModelDef {
  id: string
  name: string
  nameEn: string
  description: string
  category: 'price' | 'risk' | 'roi' | 'liquidity' | 'legal' | 'market'
  fields: ModelField[]
  outputFields: string[]
  accuracy?: number       // 모델 정확도 (%)
  version: string
  minRequiredFields: number  // 최소 필수 필드 수 (이 이상 충족 시 실행)
  icon: string
  color: string
}

// ─── Model Definitions ─────────────────────────────────

export const ANALYSIS_MODELS: AnalysisModelDef[] = [
  // ── 1. 가격 추정 모델 ────────────────────────────────
  {
    id: 'price_estimation',
    name: '가격 추정',
    nameEn: 'Price Estimation',
    description: '담보 물건의 시장가치와 NPL 낙찰 예상가를 AI가 추정합니다.',
    category: 'price',
    icon: '💰',
    color: '#00c896',
    version: '2.1',
    accuracy: 78,
    minRequiredFields: 3,
    fields: [
      { key: 'collateral_type', label: '담보물 유형', type: 'enum', required: true,
        description: '담보 부동산 종류',
        enum: ['아파트', '오피스텔', '다세대', '단독주택', '상가', '오피스', '토지', '공장', '호텔'],
        example: '아파트' },
      { key: 'region', label: '소재지 (시/도)', type: 'enum', required: true,
        description: '담보물 소재 광역시도',
        enum: ['서울', '경기', '부산', '인천', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'],
        example: '서울' },
      { key: 'appraised_value', label: '감정가', type: 'number', required: true,
        description: '법원 감정가 (만원)', unit: '만원', min: 0, example: 50000 },
      { key: 'ltv_ratio', label: 'LTV', type: 'number', required: false,
        description: '담보인정비율 (%)', unit: '%', min: 0, max: 150, example: 70 },
      { key: 'delinquency_months', label: '연체기간', type: 'number', required: false,
        description: '채무 연체 기간 (개월)', unit: '개월', min: 0, example: 12 },
      { key: 'area_sqm', label: '전용면적', type: 'number', required: false,
        description: '전용면적 (㎡)', unit: '㎡', min: 0, example: 84 },
      { key: 'floor', label: '층수', type: 'number', required: false,
        description: '해당 층수', min: -5, max: 100, example: 15 },
      { key: 'year_built', label: '건축연도', type: 'number', required: false,
        description: '건물 준공연도', min: 1960, max: 2025, example: 2005 },
    ],
    outputFields: ['price_low', 'price_mid', 'price_high', 'confidence', 'discount_rate'],
  },

  // ── 2. 리스크 등급 모델 ──────────────────────────────
  {
    id: 'risk_scoring',
    name: '리스크 등급',
    nameEn: 'Risk Scoring',
    description: '투자 리스크를 A~D등급으로 평가하고 주요 위험 요인을 분석합니다.',
    category: 'risk',
    icon: '🛡️',
    color: '#4fc3f7',
    version: '2.0',
    accuracy: 84,
    minRequiredFields: 4,
    fields: [
      { key: 'collateral_type', label: '담보물 유형', type: 'enum', required: true,
        enum: ['아파트', '오피스텔', '다세대', '단독주택', '상가', '오피스', '토지', '공장', '호텔'],
        description: '담보 부동산 종류', example: '아파트' },
      { key: 'ltv_ratio', label: 'LTV', type: 'number', required: true,
        description: '담보인정비율 (%)', unit: '%', min: 0, max: 150, example: 70 },
      { key: 'delinquency_months', label: '연체기간', type: 'number', required: true,
        description: '채무 연체 기간 (개월)', unit: '개월', min: 0, example: 12 },
      { key: 'principal_amount', label: '채권원금', type: 'number', required: true,
        description: '채권 원금 (만원)', unit: '만원', min: 0, example: 30000 },
      { key: 'senior_claims', label: '선순위 채권액', type: 'number', required: false,
        description: '선순위 근저당 등 채권 총액 (만원)', unit: '만원', min: 0, example: 5000 },
      { key: 'tenant_exists', label: '임차인 여부', type: 'boolean', required: false,
        description: '대항력 있는 임차인 존재 여부', example: true },
      { key: 'tenant_deposit', label: '임차보증금', type: 'number', required: false,
        description: '임차인 보증금 (만원)', unit: '만원', min: 0, example: 3000 },
      { key: 'seizure_count', label: '가압류·가처분 건수', type: 'number', required: false,
        description: '등기된 가압류·가처분 건수', min: 0, example: 0 },
      { key: 'region', label: '소재지', type: 'enum', required: false,
        enum: ['서울', '경기', '부산', '인천', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'],
        description: '담보물 소재 광역시도', example: '서울' },
    ],
    outputFields: ['grade', 'score', 'risk_factors', 'recovery_probability'],
  },

  // ── 3. 수익률 시뮬레이션 ────────────────────────────
  {
    id: 'roi_simulation',
    name: '수익률 시뮬레이션',
    nameEn: 'ROI Simulation',
    description: '낙찰가 구간별 투자수익률과 최적 입찰가를 산출합니다.',
    category: 'roi',
    icon: '📈',
    color: '#ffb74d',
    version: '3.0',
    accuracy: 91,
    minRequiredFields: 5,
    fields: [
      { key: 'appraised_value', label: '감정가', type: 'number', required: true,
        description: '법원 감정가 (만원)', unit: '만원', min: 0, example: 50000 },
      { key: 'min_bid', label: '최저입찰가', type: 'number', required: true,
        description: '경매 최저입찰가 (만원)', unit: '만원', min: 0, example: 35000 },
      { key: 'expected_sale_price', label: '예상 매도가', type: 'number', required: true,
        description: '낙찰 후 예상 매도가 (만원)', unit: '만원', min: 0, example: 48000 },
      { key: 'collateral_type', label: '담보물 유형', type: 'enum', required: true,
        enum: ['아파트', '오피스텔', '빌라', '토지', '상가'],
        description: '담보 부동산 종류', example: '아파트' },
      { key: 'area_sqm', label: '전용면적', type: 'number', required: true,
        description: '전용면적 (㎡)', unit: '㎡', min: 0, example: 84 },
      { key: 'loan_ratio', label: '대출비율', type: 'number', required: false,
        description: '낙찰가 대비 대출 비율 (%)', unit: '%', min: 0, max: 100, example: 60 },
      { key: 'loan_rate', label: '대출금리', type: 'number', required: false,
        description: '연 이자율 (%)', unit: '%', min: 0, max: 30, example: 4.0 },
      { key: 'holding_months', label: '보유기간', type: 'number', required: false,
        description: '매도까지 예상 보유 기간 (개월)', unit: '개월', min: 1, max: 120, example: 6 },
      { key: 'mode', label: '세금 모드', type: 'enum', required: false,
        enum: ['개인', '매매사업자'],
        description: '양도소득세 vs 사업소득세 선택', example: '개인' },
      { key: 'eviction_cost', label: '명도비용', type: 'number', required: false,
        description: '임차인 명도 예상 비용 (만원)', unit: '만원', min: 0, example: 300 },
    ],
    outputFields: ['optimal_bid', 'expected_roi', 'breakeven_price', 'sensitivity_table'],
  },

  // ── 4. 유동성 평가 모델 ─────────────────────────────
  {
    id: 'liquidity_assessment',
    name: '유동성 평가',
    nameEn: 'Liquidity Assessment',
    description: '낙찰 후 매도 용이성과 예상 매도 기간을 평가합니다.',
    category: 'liquidity',
    icon: '💧',
    color: '#ab47bc',
    version: '1.5',
    accuracy: 69,
    minRequiredFields: 3,
    fields: [
      { key: 'collateral_type', label: '담보물 유형', type: 'enum', required: true,
        enum: ['아파트', '오피스텔', '다세대', '단독주택', '상가', '오피스', '토지', '공장', '호텔'],
        description: '담보 부동산 종류', example: '아파트' },
      { key: 'region', label: '소재지', type: 'enum', required: true,
        enum: ['서울', '경기', '부산', '인천', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'],
        description: '담보물 소재 광역시도', example: '서울' },
      { key: 'appraised_value', label: '감정가', type: 'number', required: true,
        description: '법원 감정가 (만원)', unit: '만원', min: 0, example: 50000 },
      { key: 'area_sqm', label: '전용면적', type: 'number', required: false,
        description: '전용면적 (㎡)', unit: '㎡', min: 0, example: 84 },
      { key: 'year_built', label: '건축연도', type: 'number', required: false,
        description: '건물 준공연도', min: 1960, max: 2025, example: 2005 },
    ],
    outputFields: ['liquidity_score', 'expected_sale_months', 'demand_level'],
  },

  // ── 5. 법률 리스크 분석 ─────────────────────────────
  {
    id: 'legal_risk',
    name: '법률 리스크',
    nameEn: 'Legal Risk Analysis',
    description: '선순위 권리관계, 임차권, 가압류 등 법률적 리스크를 분석합니다.',
    category: 'legal',
    icon: '⚖️',
    color: '#ef5350',
    version: '1.8',
    accuracy: 88,
    minRequiredFields: 2,
    fields: [
      { key: 'senior_mortgage', label: '선순위 근저당 (만원)', type: 'number', required: true,
        description: '선순위 근저당 설정액 합계 (만원)', unit: '만원', min: 0, example: 10000 },
      { key: 'appraised_value', label: '감정가', type: 'number', required: true,
        description: '법원 감정가 (만원)', unit: '만원', min: 0, example: 50000 },
      { key: 'tenant_type', label: '임차권 유형', type: 'enum', required: false,
        enum: ['없음', '전세', '월세', '무상임차'],
        description: '임차인 유형', example: '없음' },
      { key: 'tenant_deposit', label: '임차보증금 (만원)', type: 'number', required: false,
        description: '최우선변제권 임차보증금 합계', unit: '만원', min: 0, example: 3000 },
      { key: 'tenant_priority', label: '소액임차 대항력', type: 'boolean', required: false,
        description: '소액임차인 최우선변제 해당 여부', example: false },
      { key: 'seizure_count', label: '가압류·가처분 건수', type: 'number', required: false,
        description: '등기된 가압류·가처분 건수', min: 0, example: 0 },
      { key: 'seizure_amount', label: '가압류 금액 (만원)', type: 'number', required: false,
        description: '가압류 채권 합계 (만원)', unit: '만원', min: 0, example: 0 },
      { key: 'unpaid_taxes', label: '체납 세금 (만원)', type: 'number', required: false,
        description: '국세·지방세 체납액 (만원)', unit: '만원', min: 0, example: 0 },
    ],
    outputFields: ['legal_risk_grade', 'recovery_deductions', 'net_recovery', 'issues'],
  },

  // ── 6. 시장 비교 모델 ───────────────────────────────
  {
    id: 'market_comparison',
    name: '시장 비교',
    nameEn: 'Market Comparison',
    description: '유사 물건 낙찰 사례와 현재 시세를 비교 분석합니다.',
    category: 'market',
    icon: '📊',
    color: '#78909c',
    version: '1.2',
    accuracy: 74,
    minRequiredFields: 3,
    fields: [
      { key: 'collateral_type', label: '담보물 유형', type: 'enum', required: true,
        enum: ['아파트', '오피스텔', '다세대', '단독주택', '상가', '오피스', '토지', '공장', '호텔'],
        description: '담보 부동산 종류', example: '아파트' },
      { key: 'region', label: '소재지', type: 'enum', required: true,
        enum: ['서울', '경기', '부산', '인천', '대구', '대전', '광주', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'],
        description: '담보물 소재 광역시도', example: '서울' },
      { key: 'appraised_value', label: '감정가', type: 'number', required: true,
        description: '법원 감정가 (만원)', unit: '만원', min: 0, example: 50000 },
      { key: 'area_sqm', label: '전용면적', type: 'number', required: false,
        description: '전용면적 (㎡)', unit: '㎡', min: 0, example: 84 },
    ],
    outputFields: ['avg_bid_ratio', 'comparable_cases', 'market_trend'],
  },
]

// ─── Helper: 입력 데이터로 실행 가능한 모델 필터링 ────
export function getExecutableModels(input: Record<string, unknown>): AnalysisModelDef[] {
  return ANALYSIS_MODELS.filter((model) => {
    const providedRequired = model.fields
      .filter((f) => f.required)
      .filter((f) => input[f.key] !== undefined && input[f.key] !== null && input[f.key] !== '')
      .length

    const totalRequired = model.fields.filter((f) => f.required).length
    return providedRequired >= Math.min(model.minRequiredFields, totalRequired)
  })
}

// ─── Helper: 모델 실행에 부족한 필드 파악 ────────────
export function getMissingFields(
  modelId: string,
  input: Record<string, unknown>
): ModelField[] {
  const model = ANALYSIS_MODELS.find((m) => m.id === modelId)
  if (!model) return []
  return model.fields.filter(
    (f) => f.required && (input[f.key] === undefined || input[f.key] === null || input[f.key] === '')
  )
}

// ─── Data completeness score (0~100) ──────────────────
export function dataCompletenessScore(input: Record<string, unknown>): number {
  const allFields = ANALYSIS_MODELS.flatMap((m) => m.fields)
  const uniqueKeys = [...new Set(allFields.map((f) => f.key))]
  const filled = uniqueKeys.filter((k) => input[k] !== undefined && input[k] !== null && input[k] !== '').length
  return Math.round((filled / uniqueKeys.length) * 100)
}
