/**
 * 경매 수익률 분석기 v27 — 계산 엔진 포트
 *
 * 원본: auction-simulator-v27-source (vanilla jsx) 의 핵심 세율표·계산 로직을 그대로 이식.
 * 단위: 모든 금액은 **천원(千원)** 기준. (원 기준으로 바꾸지 않음 — 원본 UX 유지)
 *
 * 모드:
 *  - 개인       → 양도소득세 (단기 중과 / 기본 누진세)
 *  - 매매사업자 → 종합소득세 (누진세, 보유이자/기타비용 필요경비 처리)
 *
 * © 2026 TransFarmer Inc.
 */

// ── 세율·요율 테이블 ──────────────────────────────────────────────────

/** 종합/양도(기본) 누진세 구간 (단위: 천원) */
export const TAX_BRACKETS = [
  { upper: 14_000, rate: 0.06, deduction: 0 },
  { upper: 50_000, rate: 0.15, deduction: 1_260 },
  { upper: 88_000, rate: 0.24, deduction: 5_760 },
  { upper: 150_000, rate: 0.35, deduction: 15_440 },
  { upper: 300_000, rate: 0.38, deduction: 19_440 },
  { upper: 500_000, rate: 0.40, deduction: 25_940 },
  { upper: 1_000_000, rate: 0.42, deduction: 35_940 },
  { upper: Infinity, rate: 0.45, deduction: 65_940 },
] as const

/** 중개보수 요율 — 주택 (2021-10 개정) */
export const BROKER_RATE_TABLE_HOUSING = [
  { upper: 50_000, rate: 0.006, cap: 250 },
  { upper: 200_000, rate: 0.005, cap: 800 },
  { upper: 900_000, rate: 0.004 },
  { upper: 1_200_000, rate: 0.005 },
  { upper: 1_500_000, rate: 0.006 },
  { upper: Infinity, rate: 0.007 },
] as const

/** 중개보수 요율 — 비주택 (토지/상가/오피스텔 업무용 등) */
export const BROKER_RATE_TABLE_OTHER = [{ upper: Infinity, rate: 0.009 }] as const

/** 법무사 수수료율 (낙찰가 구간별, 대법원 규칙 보수적 추정) */
export const LEGAL_FEE_TABLE = [
  { upper: 50_000, rate: 0.0060 },
  { upper: 100_000, rate: 0.0050 },
  { upper: 200_000, rate: 0.0035 },
  { upper: 300_000, rate: 0.0030 },
  { upper: 500_000, rate: 0.0025 },
  { upper: 1_000_000, rate: 0.0020 },
  { upper: Infinity, rate: 0.0015 },
] as const

/** 취득세 등 (취득세+지방교육세+농특세) — 법무사비·등기비 제외 */
export const TRANSFER_COST_TABLE = [
  { category: "주택", upper: 600_000, areaType: "<=85", rate: 0.011 },
  { category: "주택", upper: 600_000, areaType: ">85", rate: 0.013 },
  { category: "주택", upper: 900_000, areaType: "<=85", rate: 0.033 },
  { category: "주택", upper: 900_000, areaType: ">85", rate: 0.035 },
  { category: "주택", upper: Infinity, areaType: "<=85", rate: 0.033 },
  { category: "주택", upper: Infinity, areaType: ">85", rate: 0.035 },
  { category: "토지건물", upper: Infinity, areaType: "ALL", rate: 0.046 },
  { category: "농지", upper: Infinity, areaType: "ALL", rate: 0.046 },
] as const

/** 등기비 (국민주택채권 매입비 포함 보수적 추정) */
export const REGISTRATION_FEE_RATE = 0.002

/** 민감도 분석 축 */
export const SENS_LOAN = [20, 30, 40, 50, 60, 70, 80, 90] as const
export const SENS_HOLD = [6, 12, 18, 24, 36, 48, 60] as const

/** 비용 구조 파이 차트 팔레트 */
export const PIE_COLORS = ["#00c896", "#4fc3f7", "#ffb74d", "#ab47bc", "#ff7043", "#78909c", "#ef5350"]

/** 목표 수익률 역산 대상 리스트 */
export const ROI_TARGETS = [10, 15, 20, 25, 30, 35, 40] as const

/** 시나리오 저장 키 / 최대 개수 */
export const V27_SCENARIO_KEY = "npl_auction_v27_scenarios"
export const V27_MAX_SCENARIOS = 10

// ── 물건 유형 · 카테고리 ──────────────────────────────────────────────

export type V27Category = "주택" | "토지건물" | "농지"
export type V27Mode = "개인" | "매매사업자"

export const PROPERTY_TYPE_OPTIONS = [
  "아파트",
  "빌라",
  "오피스텔(주거용)",
  "단독주택",
  "다가구",
  "상가주택(주복)",
  "도시형생활주택",
  "근린상가",
  "오피스텔(업무용)",
  "사무실/사무소",
  "지식산업센터",
  "기타 건물",
  "토지",
  "농지",
  "직접 입력",
] as const

export const PROPERTY_TYPE_CATEGORY: Record<string, V27Category> = {
  아파트: "주택",
  빌라: "주택",
  "오피스텔(주거용)": "주택",
  단독주택: "주택",
  다가구: "주택",
  "상가주택(주복)": "주택",
  도시형생활주택: "주택",
  근린상가: "토지건물",
  "오피스텔(업무용)": "토지건물",
  "사무실/사무소": "토지건물",
  지식산업센터: "토지건물",
  "기타 건물": "토지건물",
  토지: "토지건물",
  농지: "농지",
}

export const COMMERCIAL_VAT_TYPES = ["오피스텔(업무용)", "근린상가", "사무실/사무소", "지식산업센터"]
export const RENT_PROPERTY_TYPES = ["근린상가", "사무실/사무소"]

export const MODES: readonly V27Mode[] = ["개인", "매매사업자"]

// ── 타입 ────────────────────────────────────────────────────────────

export interface V27Input {
  propertyType: string
  category: V27Category
  area: number
  salePrice: number // 예상 매도가 (천원)
  rows: number
  minBidCalc: number // 산정 시작 입찰가 (천원)
  bidStep: number // 스텝 (천원)
  rentEnabled: boolean
  monthlyRent: number // 천원
  rentStartMonth: number
  legalFeeMode: "rate" | "amount"
  legalFeeAmount: number // 천원, mode=amount 때만
  // 모드별 비용
  otherCost: number // 천원
  evictionCost: number // 천원
  loanRatio: number // %
  annualRate: number // %
  prepayPenaltyRate: number // %
  holdingMonths: number
}

export interface V27RowResult {
  bidPrice: number
  transferCost: number
  acqTax: number
  legalFee: number
  regFee: number
  acqTaxRate: number
  legalRate: number
  brokerRate: number
  misc: number
  eviction: number
  monthlyInterest: number
  holdingInterest: number
  loan: number
  rentIncome: number
  rentMonths: number
  realInvest: number
  salePrice: number
  brokerFee: number
  prepayPenalty: number
  gain: number
  taxBase: number
  tax: number
  taxRate: number
  netProfit: number
  roi: number
  verdict: V27Verdict
}

export interface V27Verdict {
  label: "입찰 추천" | "입찰" | "입찰 검토" | "수익률 위험" | "스톱"
  color: string
  bg: string
  dot: string
}

// ── 유틸 ────────────────────────────────────────────────────────────

export function getTransferCostRate(category: V27Category, bidPrice: number, area: number): number {
  const areaType = area <= 85 ? "<=85" : ">85"
  for (const row of TRANSFER_COST_TABLE) {
    if (row.category === category && bidPrice <= row.upper && (row.areaType === "ALL" || row.areaType === areaType)) {
      return row.rate
    }
  }
  return 0.016
}

export function getBrokerRate(salePrice: number, category: V27Category): number {
  const table = category === "주택" ? BROKER_RATE_TABLE_HOUSING : BROKER_RATE_TABLE_OTHER
  for (const r of table) {
    if (salePrice <= r.upper) {
      // 한도액 초과 시 실효 요율
      if ("cap" in r && r.cap && salePrice * r.rate > r.cap) return r.cap / salePrice
      return r.rate
    }
  }
  return category === "주택" ? 0.007 : 0.009
}

export function getLegalFeeRate(bidPrice: number): number {
  for (const r of LEGAL_FEE_TABLE) if (bidPrice <= r.upper) return r.rate
  return 0.0015
}

export function getAcqTaxBreakdown(category: V27Category, bidPrice: number, area: number) {
  let acq: number
  if (category === "주택") {
    acq = bidPrice <= 600_000 ? 0.01 : 0.03
  } else {
    acq = 0.04
  }
  const edu = parseFloat((acq * 0.1).toFixed(4))
  const sp = category !== "주택" || area > 85 ? 0.002 : 0
  return { acq, edu, sp }
}

export function getBasicIncomeTax(taxBase: number): number {
  if (taxBase <= 0) return 0
  for (const b of TAX_BRACKETS) if (taxBase <= b.upper) return taxBase * b.rate - b.deduction
  return 0
}

export function getCapitalGainsTax(taxBase: number, holdingMonths: number, category: V27Category): number {
  if (taxBase <= 0) return 0
  const isHousing = category === "주택"
  if (holdingMonths < 12) return taxBase * (isHousing ? 0.70 : 0.50)
  if (holdingMonths < 24) return taxBase * (isHousing ? 0.60 : 0.40)
  return getBasicIncomeTax(taxBase)
}

export function getEffectiveTaxRate(
  taxBase: number,
  holdingMonths: number,
  mode: V27Mode,
  category: V27Category,
): number {
  if (taxBase <= 0) return 0
  if (mode === "개인") {
    const isHousing = category === "주택"
    if (holdingMonths < 12) return isHousing ? 0.70 : 0.50
    if (holdingMonths < 24) return isHousing ? 0.60 : 0.40
  }
  const bracket = TAX_BRACKETS.find((b) => taxBase <= b.upper) || TAX_BRACKETS[TAX_BRACKETS.length - 1]
  return bracket.rate
}

export function getAiVerdict(roi: number): V27Verdict {
  if (roi >= 0.35) return { label: "입찰 추천", color: "#1a9e7a", bg: "rgba(26,158,122,0.10)", dot: "#1a9e7a" }
  if (roi >= 0.30) return { label: "입찰", color: "#2f81f7", bg: "rgba(47,129,247,0.10)", dot: "#2f81f7" }
  if (roi >= 0.20) return { label: "입찰 검토", color: "#c08000", bg: "rgba(192,128,0,0.10)", dot: "#c08000" }
  if (roi >= 0.15) return { label: "수익률 위험", color: "#d44e00", bg: "rgba(212,78,0,0.10)", dot: "#d44e00" }
  return { label: "스톱", color: "#d42626", bg: "rgba(212,38,38,0.10)", dot: "#d42626" }
}

// ── 메인 계산 함수 ─────────────────────────────────────────────────

/**
 * 한 입찰가에 대한 모든 비용/세금/수익률 계산.
 * 원본 calcRow 와 1:1 일치하도록 포팅.
 */
export function calcRow(bidPrice: number, inputs: V27Input, mode: V27Mode): V27RowResult {
  const {
    category, area, salePrice, loanRatio, annualRate, prepayPenaltyRate, holdingMonths,
    otherCost, evictionCost, rentEnabled, monthlyRent, rentStartMonth,
    legalFeeMode, legalFeeAmount,
  } = inputs
  const loanR = loanRatio / 100
  const annualR = annualRate / 100
  const prepayR = prepayPenaltyRate / 100

  const acqTaxRate = getTransferCostRate(category, bidPrice, area)
  const legalRate =
    legalFeeMode === "amount"
      ? legalFeeAmount > 0 && bidPrice > 0
        ? legalFeeAmount / bidPrice
        : 0
      : getLegalFeeRate(bidPrice)
  const acqTax = bidPrice * acqTaxRate
  const legalFee = legalFeeMode === "amount" ? legalFeeAmount || 0 : bidPrice * legalRate
  const regFee = bidPrice * REGISTRATION_FEE_RATE
  const transferCost = acqTax + legalFee + regFee

  const misc = otherCost
  const eviction = evictionCost

  const monthlyInterest = bidPrice * loanR * (annualR / 12)
  const holdingInterest = monthlyInterest * holdingMonths
  const loan = bidPrice * loanR

  // 월세 수익
  const rentMonths = rentEnabled && holdingMonths > rentStartMonth ? holdingMonths - rentStartMonth : 0
  const rentIncome = rentEnabled ? monthlyRent * rentMonths : 0

  const realInvest = bidPrice + transferCost + misc + eviction + holdingInterest - rentIncome - loan
  const brokerFee = salePrice * getBrokerRate(salePrice, category)
  const prepayPenalty = loan * prepayR

  // 양도차익 / 과세표준
  const gain = salePrice - bidPrice
  let taxBase: number
  if (mode === "개인") {
    const deduction = transferCost + brokerFee + 2500 // + 기본공제 250만원(=2,500천원)
    taxBase = Math.max(0, gain - deduction)
  } else {
    const deduction = transferCost + brokerFee + misc + eviction + holdingInterest - rentIncome
    taxBase = Math.max(0, gain - deduction)
  }

  const rawTax =
    mode === "개인" ? getCapitalGainsTax(taxBase, holdingMonths, category) : getBasicIncomeTax(taxBase)
  const tax = rawTax * 1.1 // 지방소득세 10%
  const netProfit = salePrice - loan - realInvest - brokerFee - prepayPenalty - tax
  const roi = realInvest > 0 ? netProfit / realInvest : 0

  const taxRate = getEffectiveTaxRate(taxBase, holdingMonths, mode, category)
  const brokerRate = salePrice > 0 ? brokerFee / salePrice : 0

  return {
    bidPrice,
    transferCost,
    acqTax,
    legalFee,
    regFee,
    acqTaxRate,
    legalRate,
    brokerRate,
    misc,
    eviction,
    monthlyInterest,
    holdingInterest,
    loan,
    rentIncome,
    rentMonths,
    realInvest,
    salePrice,
    brokerFee,
    prepayPenalty,
    gain,
    taxBase,
    tax,
    taxRate,
    netProfit,
    roi,
    verdict: getAiVerdict(roi),
  }
}

/** 주어진 목표 ROI를 달성하는 최대 입찰가(천원) 역산. 불가면 null. */
export function findTargetBid(inputs: V27Input, mode: V27Mode, targetRoiPct: number): number | null {
  if (!inputs || targetRoiPct == null) return null
  const target = targetRoiPct / 100
  const lo0 = inputs.minBidCalc
  const hi0 = inputs.minBidCalc + inputs.bidStep * Math.max(inputs.rows - 1, 0)
  if (calcRow(lo0, inputs, mode).roi < target) return null
  let lo = lo0
  let hi = hi0
  let result = lo0
  for (let i = 0; i < 64; i++) {
    const mid = Math.round((lo + hi) / 2)
    if (calcRow(mid, inputs, mode).roi >= target) {
      result = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return result
}

// ── 샘플 프리셋 ─────────────────────────────────────────────────────

export interface V27PresetInputs {
  propertyType: string
  category: V27Category
  area: number
  appraised: number
  minBid: number
  salePrice: number
  note: string
  minBidCalc: number
  bidStep: number
  otherCost: number
  extraCostBusiness: number
  evictionCost: number
  loanRatio: number
  annualRate: number
  prepayPenaltyRate: number
  holdingMonths: number
  rows: number
}

export const V27_PRESETS: Record<string, V27PresetInputs> = {
  "🏢 오피스텔": {
    propertyType: "오피스텔(주거용)", category: "주택", area: 30.4,
    appraised: 200_000, minBid: 140_000, salePrice: 198_000, note: "역세권 오피스텔 (샘플)",
    minBidCalc: 135_000, bidStep: 3_000, otherCost: 800, extraCostBusiness: 2_500,
    evictionCost: 800, loanRatio: 70, annualRate: 5, prepayPenaltyRate: 3, holdingMonths: 18, rows: 20,
  },
  "🏠 아파트": {
    propertyType: "아파트", category: "주택", area: 84.7,
    appraised: 550_000, minBid: 385_000, salePrice: 540_000, note: "2호선 역세권 아파트 (샘플)",
    minBidCalc: 375_000, bidStep: 10_000, otherCost: 2_000, extraCostBusiness: 5_000,
    evictionCost: 2_000, loanRatio: 60, annualRate: 5, prepayPenaltyRate: 3, holdingMonths: 24, rows: 20,
  },
  "🏡 빌라·다세대": {
    propertyType: "빌라", category: "주택", area: 49.5,
    appraised: 130_000, minBid: 91_000, salePrice: 128_000, note: "재개발 구역 인근 빌라 (샘플)",
    minBidCalc: 88_000, bidStep: 2_000, otherCost: 500, extraCostBusiness: 1_500,
    evictionCost: 1_000, loanRatio: 65, annualRate: 5.5, prepayPenaltyRate: 2, holdingMonths: 36, rows: 20,
  },
  "🌱 토지·임야": {
    propertyType: "토지", category: "토지건물", area: 330,
    appraised: 80_000, minBid: 56_000, salePrice: 79_000, note: "개발제한구역 인근 토지 (샘플)",
    minBidCalc: 54_000, bidStep: 2_000, otherCost: 500, extraCostBusiness: 1_000,
    evictionCost: 0, loanRatio: 50, annualRate: 5, prepayPenaltyRate: 2, holdingMonths: 24, rows: 15,
  },
}

// ── 포맷 헬퍼 (천원 단위) ──────────────────────────────────────────

export function v27Fmt(v: number | null | undefined, d = 0): string {
  if (v == null || Number.isNaN(v)) return "-"
  return v.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d })
}

export function v27FmtPct(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "-"
  return (v * 100).toFixed(1) + "%"
}
