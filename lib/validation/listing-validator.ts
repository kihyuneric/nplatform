// ─── 매각 공고 자동 검증 (STEP 9-2 검수 4단계 중 1단계) ─

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  score: number // 정보 완성도 점수 (0~100)
}

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
}

interface ListingInput {
  debt_principal?: number
  debt_delinquency_months?: number
  debt_origin_date?: string
  debt_default_date?: string
  collateral_type?: string
  collateral_region?: string
  collateral_district?: string
  collateral_appraisal_value?: number
  collateral_ltv?: number
  ask_min?: number
  ask_max?: number
  documents?: { name: string; url: string }[]
}

const VALID_COLLATERAL_TYPES = [
  "아파트", "오피스텔", "다세대", "단독주택", "상가", "오피스",
  "토지", "공장", "호텔", "기타",
]

const VALID_REGIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
]

/**
 * 매각 공고 자동 검증
 */
export function validateListing(input: ListingInput): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []
  let scorePoints = 0
  const maxPoints = 100

  // ─── 필수 필드 검증 ────────────

  if (!input.debt_principal || input.debt_principal <= 0) {
    errors.push({ field: "debt_principal", message: "채권원금은 필수입니다.", code: "REQUIRED" })
  } else {
    scorePoints += 15
    if (input.debt_principal < 10000000) { // 1000만원 미만
      warnings.push({ field: "debt_principal", message: "채권원금이 1,000만원 미만입니다. 확인해주세요.", code: "LOW_VALUE" })
    }
    if (input.debt_principal > 1000000000000) { // 1조원 초과
      warnings.push({ field: "debt_principal", message: "채권원금이 1조원을 초과합니다. 확인해주세요.", code: "HIGH_VALUE" })
    }
  }

  if (!input.collateral_type) {
    errors.push({ field: "collateral_type", message: "담보물 유형은 필수입니다.", code: "REQUIRED" })
  } else if (!VALID_COLLATERAL_TYPES.includes(input.collateral_type)) {
    errors.push({ field: "collateral_type", message: `유효하지 않은 담보유형: ${input.collateral_type}`, code: "INVALID" })
  } else {
    scorePoints += 10
  }

  if (!input.collateral_region) {
    errors.push({ field: "collateral_region", message: "소재지(시/도)는 필수입니다.", code: "REQUIRED" })
  } else if (!VALID_REGIONS.includes(input.collateral_region)) {
    warnings.push({ field: "collateral_region", message: `확인 필요: ${input.collateral_region}`, code: "CHECK" })
  } else {
    scorePoints += 10
  }

  // ─── 선택 필드 (완성도 가산) ────

  if (input.collateral_district) scorePoints += 5
  if (input.debt_delinquency_months != null) {
    scorePoints += 5
    if (input.debt_delinquency_months > 120) {
      warnings.push({ field: "debt_delinquency_months", message: "연체기간이 10년을 초과합니다.", code: "LONG_DELINQUENCY" })
    }
  }
  if (input.debt_origin_date) scorePoints += 5
  if (input.debt_default_date) scorePoints += 5

  if (input.collateral_appraisal_value) {
    scorePoints += 10
    // LTV 정합성 검증
    if (input.collateral_ltv && input.debt_principal) {
      const computedLTV = (input.debt_principal / input.collateral_appraisal_value) * 100
      const diff = Math.abs(computedLTV - input.collateral_ltv)
      if (diff > 5) {
        warnings.push({
          field: "collateral_ltv",
          message: `LTV 불일치: 입력값 ${input.collateral_ltv}% vs 계산값 ${computedLTV.toFixed(1)}%`,
          code: "LTV_MISMATCH",
        })
      }
    }
  }

  if (input.collateral_ltv != null) scorePoints += 5

  if (input.ask_min && input.ask_max) {
    scorePoints += 10
    if (input.ask_min > input.ask_max) {
      errors.push({ field: "ask_min", message: "최소 희망가가 최대 희망가보다 높습니다.", code: "RANGE_INVALID" })
    }
    if (input.debt_principal && input.ask_min > input.debt_principal * 1.5) {
      warnings.push({ field: "ask_min", message: "최소 희망가가 채권원금의 150%를 초과합니다.", code: "HIGH_ASK" })
    }
  } else if (input.ask_min || input.ask_max) {
    scorePoints += 5
  }

  if (input.documents && input.documents.length > 0) {
    scorePoints += Math.min(20, input.documents.length * 5)
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    score: Math.min(maxPoints, scorePoints),
  }
}

/**
 * 중복 체크 (같은 채권이 이미 등록되었는지)
 */
export function isDuplicate(
  input: ListingInput,
  existingListings: { debt_principal: number; collateral_region: string; collateral_type: string }[]
): boolean {
  return existingListings.some(
    (l) =>
      l.debt_principal === input.debt_principal &&
      l.collateral_region === input.collateral_region &&
      l.collateral_type === input.collateral_type
  )
}
