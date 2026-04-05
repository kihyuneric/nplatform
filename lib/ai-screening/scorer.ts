// ============================================================
// lib/ai-screening/scorer.ts
// NPL AI 스크리닝 — ROI / 리스크 / 낙찰확률 계산
// LightGBM 모델 연동 전 규칙 기반 스코어링 엔진
// ============================================================

import type { CourtAuctionListing, AiVerdict } from '@/lib/court-auction/types'

// ─── 스코어링 입력 ────────────────────────────────────────

export interface ScreeningInput {
  appraised_value:      number
  min_bid_price:        number
  total_claim:          number | null
  senior_claim:         number | null
  total_tenant_deposit: number | null
  has_opposing_force:   boolean
  tenant_count:         number
  lien_count:           number
  seizure_count:        number
  auction_count:        number          // 입찰 회차 (유찰 횟수)
  property_type:        string
  sido:                 string | null
  area_m2:              number | null
  build_year:           number | null
  creditor_type:        string | null
  auction_date:         string | null   // YYYY-MM-DD
}

export interface ScreeningResult {
  roi_estimate:   number        // 예상 ROI (%)
  risk_score:     number        // 위험 점수 (0~100, 낮을수록 좋음)
  bid_prob:       number        // 낙찰 가능성 (0~1)
  verdict:        AiVerdict
  reasoning:      string
  factors:        ScoringFactor[]
  model_version:  string
}

export interface ScoringFactor {
  name:    string
  impact:  'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  weight:  number        // -100 ~ +100
  detail:  string
}

// ─── 지역별 기준 낙찰가율 ─────────────────────────────────

const REGION_BASE_BID_RATES: Record<string, number> = {
  '서울특별시': 0.88,
  '경기도':     0.82,
  '인천광역시': 0.80,
  '부산광역시': 0.79,
  '대구광역시': 0.77,
  '광주광역시': 0.76,
  '대전광역시': 0.76,
  '울산광역시': 0.75,
  '세종특별자치시': 0.78,
  DEFAULT:      0.74,
}

function getRegionBidRate(sido: string | null): number {
  if (!sido) return REGION_BASE_BID_RATES['DEFAULT']!
  return REGION_BASE_BID_RATES[sido] ?? REGION_BASE_BID_RATES['DEFAULT']!
}

// ─── 유찰 회차별 낙찰가율 보정 ───────────────────────────
// 1회차 0%, 2회차 -20%, 3회차 -36%, 4회차 -49%
function getAuctionCountMultiplier(count: number): number {
  return Math.pow(0.8, count - 1)
}

// ─── 리스크 점수 계산 ─────────────────────────────────────

function calcRiskScore(input: ScreeningInput, factors: ScoringFactor[]): number {
  let risk = 30  // 기본 위험도

  // 대항력 임차인 (가장 큰 리스크)
  if (input.has_opposing_force && (input.total_tenant_deposit ?? 0) > 0) {
    const tenantRisk = Math.min(40, Math.round(((input.total_tenant_deposit ?? 0) / input.appraised_value) * 100))
    risk += tenantRisk
    factors.push({
      name: '대항력 임차인',
      impact: 'NEGATIVE',
      weight: -tenantRisk,
      detail: `대항력 임차인 존재, 보증금 합계 ${((input.total_tenant_deposit ?? 0) / 100000000).toFixed(1)}억원`,
    })
  }

  // 유찰 횟수 (많을수록 리스크 높음)
  if (input.auction_count > 1) {
    const unsoldRisk = Math.min(20, (input.auction_count - 1) * 7)
    risk += unsoldRisk
    factors.push({
      name: `유찰 ${input.auction_count - 1}회`,
      impact: 'NEGATIVE',
      weight: -unsoldRisk,
      detail: `${input.auction_count}회차 경매, 유찰 이력 있음`,
    })
  }

  // 압류/가압류 다수
  const encumbranceCount = input.lien_count + input.seizure_count
  if (encumbranceCount > 3) {
    risk += Math.min(15, encumbranceCount * 2)
    factors.push({
      name: '다수 선순위 담보',
      impact: 'NEGATIVE',
      weight: -Math.min(15, encumbranceCount * 2),
      detail: `근저당 ${input.lien_count}건, 압류 ${input.seizure_count}건`,
    })
  }

  // 노후 건물
  if (input.build_year && input.build_year < 1990) {
    const ageRisk = Math.min(10, Math.round((1990 - input.build_year) / 5))
    risk += ageRisk
    factors.push({
      name: '노후 건물',
      impact: 'NEGATIVE',
      weight: -ageRisk,
      detail: `${input.build_year}년 준공 (${new Date().getFullYear() - input.build_year}년 경과)`,
    })
  }

  // 채권 과다 (LTV > 100%)
  if (input.total_claim && input.total_claim > input.appraised_value) {
    risk += 15
    factors.push({
      name: '채권 초과',
      impact: 'NEGATIVE',
      weight: -15,
      detail: `채권액(${(input.total_claim / 100000000).toFixed(1)}억)이 감정가(${(input.appraised_value / 100000000).toFixed(1)}억) 초과`,
    })
  }

  // 서울/수도권 + 아파트 = 리스크 감소
  if (input.property_type === '아파트' && (input.sido === '서울특별시' || input.sido === '경기도')) {
    risk -= 10
    factors.push({
      name: '서울/경기 아파트',
      impact: 'POSITIVE',
      weight: 10,
      detail: '환금성 높은 서울/경기 아파트',
    })
  }

  return Math.max(0, Math.min(100, Math.round(risk)))
}

// ─── ROI 추정 ─────────────────────────────────────────────

function calcRoiEstimate(input: ScreeningInput, factors: ScoringFactor[]): number {
  const regionRate = getRegionBidRate(input.sido)
  const countMul   = getAuctionCountMultiplier(input.auction_count)
  const estimatedBid = input.appraised_value * regionRate * countMul

  // 예상 처분 가격 (감정가 대비 90% 가정)
  const estimatedDisposal = input.appraised_value * 0.9

  // 실질 투자액 = 낙찰가 + 대항력 임차보증금 인수 + 부대비용(2%)
  const tenantBurden = input.has_opposing_force ? (input.total_tenant_deposit ?? 0) : 0
  const sideCosts = estimatedBid * 0.02
  const totalInvestment = estimatedBid + tenantBurden + sideCosts

  // 회수 예상액 = 처분가 - 선순위 채권
  const seniorDeduction = input.senior_claim
    ? Math.max(0, input.senior_claim - estimatedBid * 0.1)  // 부분 상쇄
    : 0
  const netRecovery = estimatedDisposal - seniorDeduction

  if (totalInvestment <= 0) return 0

  const roi = ((netRecovery - totalInvestment) / totalInvestment) * 100

  // 낙찰가 할인율 요인
  const discountRate = (input.appraised_value - estimatedBid) / input.appraised_value
  if (discountRate > 0.3) {
    factors.push({
      name: '높은 낙찰 할인율',
      impact: 'POSITIVE',
      weight: Math.round(discountRate * 30),
      detail: `감정가 대비 ${Math.round(discountRate * 100)}% 할인 예상`,
    })
  }

  return Math.round(roi * 100) / 100
}

// ─── 낙찰 가능성 계산 ────────────────────────────────────

function calcBidProbability(input: ScreeningInput): number {
  let prob = getRegionBidRate(input.sido) - 0.15  // 기준 낙찰확률

  // 유찰 이력은 다음 번 낙찰 확률 감소
  prob -= (input.auction_count - 1) * 0.08

  // 입지 보정
  if (input.property_type === '아파트') prob += 0.08
  if (input.sido === '서울특별시')       prob += 0.10
  if (input.has_opposing_force)          prob -= 0.12

  // 최소/최대 0.05 ~ 0.95
  return Math.max(0.05, Math.min(0.95, Math.round(prob * 100) / 100))
}

// ─── 버딕트 결정 ─────────────────────────────────────────

function determineVerdict(roi: number, risk: number, bidProb: number): AiVerdict {
  // 고위험 즉시 STOP
  if (risk >= 70) return 'STOP'
  if (roi < -5)   return 'STOP'

  // 낙찰 가능성 너무 낮으면 CAUTION
  if (bidProb < 0.15) return 'CAUTION'

  if (roi >= 20 && risk < 35 && bidProb >= 0.5) return 'STRONG_BUY'
  if (roi >= 12 && risk < 50 && bidProb >= 0.35) return 'BUY'
  if (roi >= 5  && risk < 60) return 'CONSIDER'
  if (roi >= 0  && risk < 70) return 'CAUTION'
  return 'STOP'
}

// ─── 버딕트 한국어 설명 ───────────────────────────────────

function buildReasoning(
  verdict: AiVerdict,
  roi: number,
  risk: number,
  bidProb: number,
  factors: ScoringFactor[]
): string {
  const verdictLabel: Record<AiVerdict, string> = {
    STRONG_BUY: '적극 매수 추천',
    BUY:        '매수 추천',
    CONSIDER:   '조건부 검토',
    CAUTION:    '주의 필요',
    STOP:       '매수 비추천',
  }

  const topNegative = factors.filter(f => f.impact === 'NEGATIVE').sort((a, b) => a.weight - b.weight).slice(0, 2)
  const topPositive = factors.filter(f => f.impact === 'POSITIVE').sort((a, b) => b.weight - a.weight).slice(0, 2)

  const parts = [
    `[${verdictLabel[verdict]}] 예상 ROI ${roi.toFixed(1)}%, 위험점수 ${risk}/100, 낙찰확률 ${Math.round(bidProb * 100)}%.`,
  ]

  if (topPositive.length > 0) {
    parts.push(`긍정 요인: ${topPositive.map(f => f.detail).join('; ')}.`)
  }
  if (topNegative.length > 0) {
    parts.push(`주의 요인: ${topNegative.map(f => f.detail).join('; ')}.`)
  }

  return parts.join(' ')
}

// ─── 메인 스크리닝 함수 ───────────────────────────────────

export function screenNplListing(input: ScreeningInput): ScreeningResult {
  const factors: ScoringFactor[] = []

  const roiEstimate = calcRoiEstimate(input, factors)
  const riskScore   = calcRiskScore(input, factors)
  const bidProb     = calcBidProbability(input)
  const verdict     = determineVerdict(roiEstimate, riskScore, bidProb)
  const reasoning   = buildReasoning(verdict, roiEstimate, riskScore, bidProb, factors)

  return {
    roi_estimate:  roiEstimate,
    risk_score:    riskScore,
    bid_prob:      bidProb,
    verdict,
    reasoning,
    factors,
    model_version: 'rules-v1',
  }
}

// ─── CourtAuctionListing → ScreeningInput 변환 ──────────

export function listingToScreeningInput(listing: CourtAuctionListing): ScreeningInput {
  return {
    appraised_value:      listing.appraised_value,
    min_bid_price:        listing.min_bid_price,
    total_claim:          listing.total_claim ?? null,
    senior_claim:         listing.senior_claim ?? null,
    total_tenant_deposit: listing.total_tenant_deposit ?? null,
    has_opposing_force:   listing.has_opposing_force,
    tenant_count:         listing.tenant_count,
    lien_count:           listing.lien_count,
    seizure_count:        listing.seizure_count,
    auction_count:        listing.auction_count,
    property_type:        listing.property_type,
    sido:                 listing.sido ?? null,
    area_m2:              listing.area_m2 ?? null,
    build_year:           listing.build_year ?? null,
    creditor_type:        listing.creditor_type ?? null,
    auction_date:         listing.auction_date ?? null,
  }
}

// ─── 버딕트 색상/레이블 헬퍼 ─────────────────────────────

export const VERDICT_CONFIG: Record<AiVerdict, { label: string; color: string; bg: string; border: string }> = {
  STRONG_BUY: { label: '적극 추천',  color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30' },
  BUY:        { label: '추천',       color: 'text-blue-400',    bg: 'bg-blue-500/15',    border: 'border-blue-500/30'    },
  CONSIDER:   { label: '검토',       color: 'text-yellow-400',  bg: 'bg-yellow-500/15',  border: 'border-yellow-500/30'  },
  CAUTION:    { label: '주의',       color: 'text-orange-400',  bg: 'bg-orange-500/15',  border: 'border-orange-500/30'  },
  STOP:       { label: '비추천',     color: 'text-red-400',     bg: 'bg-red-500/15',     border: 'border-red-500/30'     },
}
