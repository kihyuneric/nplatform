/**
 * lib/npl/unified-report/registry-analysis.ts
 *
 * 등기부등본 분석 3-블록:
 *   1. 권리분석 체크리스트 (송달내역 컬럼 제외)
 *   2. 예상 배당표 (전경매보증금 항목 제외)
 *   3. 경매집행비용 계산
 *
 * 사용자 로직 그대로 이식 — 실제 운영 시 API 연동 데이터로 대체됨.
 * 모든 입력(청구금액·입찰예상가·이해관계인수·유찰횟수·필지수 등)은
 * 등기부 파싱/매물 등록 폼을 통해 주입됨.
 */

import type {
  ExecutionCostBreakdown,
  ExecutionCostLineItem,
  DistributionTable,
  DistributionRow,
  RightsAnalysis,
  RightsChecklistItem,
  RegistryAnalysisBlock,
} from './types'

// ─── 권리분석 체크리스트 ─────────────────────────────────────

/**
 * 법정 기본 10행 템플릿 (등기부 미분석 시 디폴트 "없음")
 * API 연동 시 각 row의 `registryEvidence`·`presence`를 덮어쓰기만 하면 됨.
 */
const BASE_CHECKLIST_ROWS: Omit<RightsChecklistItem, 'registryEvidence' | 'presence'>[] = [
  { rank: '1순위', rankOrder: 1, kind: '경매집행비용' },
  { rank: '2순위', rankOrder: 2, kind: '필요비·유익비 상환청구채권' },
  { rank: '3순위', rankOrder: 3, kind: '소액임차인 최우선변제금' },
  { rank: '3순위', rankOrder: 3, kind: '최종 3개월 임금·3년 퇴직금' },
  { rank: '3순위', rankOrder: 3, kind: '재해보상금 채권' },
  { rank: '4순위', rankOrder: 4, kind: '당해세(국세·지방세)' },
  { rank: '5순위', rankOrder: 5, kind: '조세(당해세 제외) 및 법정기일 빠른 4대보험' },
  { rank: '5순위', rankOrder: 5, kind: '우선변제권 있는 임차인' },
  { rank: '6순위', rankOrder: 6, kind: '일반우선채권(근저당·전세권 등)' },
  { rank: '7순위', rankOrder: 7, kind: '일반임금채권' },
  { rank: '8순위', rankOrder: 8, kind: '법정기일 늦은 4대보험' },
  { rank: '9순위', rankOrder: 9, kind: '일반채권(가압류 등)' },
  { rank: '9순위', rankOrder: 9, kind: '우선변제권 없는 임차인' },
]

/**
 * 등기부 분석 결과를 체크리스트 형식으로 빌드.
 * 키는 `kind` 문자열 일치 기준.
 */
export function buildRightsAnalysis(
  overrides: Record<string, Pick<RightsChecklistItem, 'registryEvidence' | 'presence'>> = {},
  topRisks: string[] = [],
): RightsAnalysis {
  const items: RightsChecklistItem[] = BASE_CHECKLIST_ROWS.map(base => {
    const ov = overrides[base.kind]
    return {
      ...base,
      registryEvidence: ov?.registryEvidence ?? '-',
      presence: ov?.presence ?? 'ABSENT',
    }
  })
  return { items, topRisks }
}

// ─── 경매집행비용 계산 ───────────────────────────────────────

export interface ExecutionCostInput {
  /** 청구금액 (원) */
  claimAmount: number
  /** 이해관계인 수 (송달료 계산용, 기본 3) */
  interestedPartyCount?: number
  /** 필지 수 (등기신청수수료·신문공고료 계산용, 기본 1) */
  parcelCount?: number
  /** 유찰 횟수 (기본 1) */
  failedBidCount?: number
  /** 감정평가수수료 override (없으면 청구금액 대역별 룩업) */
  appraisalFeeOverride?: number
  /** 감정평가 실비 override */
  appraisalExpenseOverride?: number
  /** 현황조사수수료 (기본 70,000) */
  onSiteInspectionFee?: number
  /** 매각수수료 override (없으면 낙찰가액별 룩업) */
  saleFeeOverride?: number
  /** 낙찰가 (매각수수료 누진 구간 참조, 기본 claimAmount × 2.6) */
  estimatedSalePrice?: number
}

/**
 * 감정평가수수료 — 금액대별 누진표 (간이 모형)
 *   2억~5억 구간: 약 500,000원
 *   5억~10억:    약 800,000원
 *   10억~:        약 1,200,000원
 */
function lookupAppraisalFee(claim: number): number {
  if (claim < 200_000_000) return 350_000
  if (claim < 500_000_000) return 504_960      // 사용자 샘플값
  if (claim < 1_000_000_000) return 800_000
  if (claim < 3_000_000_000) return 1_200_000
  return 1_800_000
}
function lookupAppraisalExpense(claim: number): number {
  if (claim < 200_000_000) return 60_000
  if (claim < 500_000_000) return 88_000       // 사용자 샘플값
  if (claim < 1_000_000_000) return 120_000
  return 180_000
}

/**
 * 매각수수료 — 낙찰가액 대역별
 *   3억 이하       : 낙찰가 × 0.7%
 *   3억~5억        : 2,100,000 + (낙찰가−3억) × 0.6%
 *   5억~10억       : 3,300,000 + (낙찰가−5억) × 0.5%
 *   10억 초과      : 5,800,000 + (낙찰가−10억) × 0.4%
 */
function computeSaleFee(salePrice: number): number {
  if (salePrice <= 300_000_000) return Math.round(salePrice * 0.007)
  if (salePrice <= 500_000_000) return 2_100_000 + Math.round((salePrice - 300_000_000) * 0.006)
  if (salePrice <= 1_000_000_000) return 3_300_000 + Math.round((salePrice - 500_000_000) * 0.005)
  return 5_800_000 + Math.round((salePrice - 1_000_000_000) * 0.004)
}

export function computeExecutionCost(input: ExecutionCostInput): ExecutionCostBreakdown {
  const {
    claimAmount,
    interestedPartyCount = 3,
    parcelCount = 1,
    failedBidCount = 1,
    appraisalFeeOverride,
    appraisalExpenseOverride,
    onSiteInspectionFee = 70_000,
    saleFeeOverride,
    estimatedSalePrice = Math.round(claimAmount * 2.6),
  } = input

  // ── 경매신청비용
  const registrationTax = Math.round(claimAmount * 0.002)                      // 등록면허세
  const localEducationTax = Math.round(registrationTax * 0.2)                  // 지방교육세
  const deliveryFee = (interestedPartyCount + 3) * 10 * 5_200                  // 송달료
  const registryFilingFee = 3_000 * parcelCount                                // 등기신청수수료

  const filingItems: ExecutionCostLineItem[] = [
    { kind: '등록면허세',       amount: registrationTax,   formula: '청구금액 × 0.2%' },
    { kind: '지방교육세',       amount: localEducationTax, formula: '등록면허세 × 20%' },
    { kind: '송달료',           amount: deliveryFee,       formula: `(이해관계인수 ${interestedPartyCount} + 3) × 10회 × 5,200원` },
    { kind: '등기신청수수료',   amount: registryFilingFee, formula: `1필지당 3,000원 × ${parcelCount}` },
  ]
  const filingSubtotal = filingItems.reduce((s, i) => s + i.amount, 0)

  // ── 예납금
  const appraisalFee = appraisalFeeOverride ?? lookupAppraisalFee(claimAmount)
  const appraisalExpense = appraisalExpenseOverride ?? lookupAppraisalExpense(claimAmount)
  const failedBidFee = failedBidCount * 6_000                                   // 유찰수수료
  const newspaperFee = 220_000 + Math.max(0, parcelCount - 2) * 110_000         // 신문공고료
  const saleFee = saleFeeOverride ?? computeSaleFee(estimatedSalePrice)

  const depositItems: ExecutionCostLineItem[] = [
    { kind: '감정평가수수료', amount: appraisalFee,        formula: `청구금액 대역별 (${(claimAmount / 1e8).toFixed(1)}억 구간)` },
    { kind: '감정평가 실비',  amount: appraisalExpense,    formula: '감정평가 실비' },
    { kind: '유찰수수료',     amount: failedBidFee,        formula: `유찰 1회당 6,000원 × ${failedBidCount}` },
    { kind: '현황조사수수료', amount: onSiteInspectionFee, formula: '기본 70,000원' },
    { kind: '신문공고료',     amount: newspaperFee,        formula: `기본 220,000원 + 2필지 초과 필지당 110,000원` },
    { kind: '매각수수료',     amount: saleFee,             formula: `낙찰가액 ${(estimatedSalePrice / 1e8).toFixed(1)}억 누진` },
  ]
  const depositSubtotal = depositItems.reduce((s, i) => s + i.amount, 0)

  return {
    claimAmount,
    filingItems,
    filingSubtotal,
    depositItems,
    depositSubtotal,
    total: filingSubtotal + depositSubtotal,
  }
}

// ─── 예상 배당표 ─────────────────────────────────────────────

export interface DistributionInput {
  /** 입찰예상가 */
  bidPrice: number
  /** 경매집행비용 (computeExecutionCost 결과) */
  executionCost: number
  /** 원시 채권 리스트 (순위 오름차순) */
  claims: {
    rank: number
    right: string
    creditor: string
    claimAmount: number
    /** 매수인 인수 여부 (선순위 임차인 보증금 등) */
    buyerAssume?: boolean
  }[]
}

/**
 * 배당 폭포수 (waterfall):
 *   배당가능액 = bidPrice − executionCost
 *   순위 순으로 채권액 만큼 배당, 소진 시 이후 채권은 미배당
 *   buyerAssume=true 인 채권은 배당과 별개로 매수인 인수금액 컬럼에 기록
 */
export function computeDistributionTable(input: DistributionInput): DistributionTable {
  const distributable = Math.max(0, input.bidPrice - input.executionCost)
  let remaining = distributable

  const rows: DistributionRow[] = []

  // 1행은 항상 경매집행비용 (전액 우선 변제)
  rows.push({
    rank: 1,
    right: '경매집행비용',
    creditor: '경매집행비용',
    claimAmount: input.executionCost,
    distributedAmount: input.executionCost,
    distributedRatio: 1,
    unpaidAmount: 0,
    buyerAssumeAmount: 0,
    extinguished: '소멸',
  })

  // 이후 채권 순위대로 배당
  const sorted = [...input.claims].sort((a, b) => a.rank - b.rank)
  sorted.forEach((c, idx) => {
    const alloc = Math.min(c.claimAmount, remaining)
    remaining -= alloc
    const ratio = c.claimAmount > 0 ? alloc / c.claimAmount : 0
    rows.push({
      rank: idx + 2,
      right: c.right,
      creditor: c.creditor,
      claimAmount: c.claimAmount,
      distributedAmount: alloc,
      distributedRatio: ratio,
      unpaidAmount: c.claimAmount - alloc,
      buyerAssumeAmount: c.buyerAssume ? c.claimAmount - alloc : 0,
      extinguished: c.buyerAssume && alloc < c.claimAmount ? '인수' : '소멸',
    })
  })

  const totalClaim = rows.reduce((s, r) => s + r.claimAmount, 0)
  const totalDistributed = rows.reduce((s, r) => s + r.distributedAmount, 0)
  const totalUnpaid = rows.reduce((s, r) => s + r.unpaidAmount, 0)

  const topUnpaid = rows.find(r => r.unpaidAmount > 0)
  const narrative = topUnpaid
    ? `입찰예상가 ${(input.bidPrice / 1e8).toFixed(2)}억에서 경매집행비용 ${(input.executionCost / 1e4).toFixed(0)}만원 차감 후 배당가능액 ${(distributable / 1e8).toFixed(2)}억. ` +
      `${topUnpaid.creditor}(${topUnpaid.right})부터 미배당 ${(topUnpaid.unpaidAmount / 1e8).toFixed(2)}억 발생 — 후순위 채권은 전액 무배당. ` +
      (rows.some(r => r.extinguished === '인수') ? '매수인 인수 항목 존재, 실투자금 가산 필요.' : '매수인 인수 없음, 전 채권 소멸.')
    : `배당가능액 ${(distributable / 1e8).toFixed(2)}억으로 전 채권 전액 배당 완료 · 모든 권리 소멸.`

  return {
    premise: {
      bidPrice: input.bidPrice,
      executionCost: input.executionCost,
      distributableAmount: distributable,
    },
    rows,
    totalClaim,
    totalDistributed,
    totalUnpaid,
    narrative,
  }
}

// ─── 종합 빌더 ────────────────────────────────────────────────

export interface RegistryAnalysisInput {
  claimAmount: number
  bidPrice: number
  interestedPartyCount?: number
  parcelCount?: number
  failedBidCount?: number
  claims: DistributionInput['claims']
  rightsOverrides?: Parameters<typeof buildRightsAnalysis>[0]
  topRisks?: string[]
}

export function buildRegistryAnalysis(input: RegistryAnalysisInput): RegistryAnalysisBlock {
  const executionCost = computeExecutionCost({
    claimAmount: input.claimAmount,
    interestedPartyCount: input.interestedPartyCount,
    parcelCount: input.parcelCount,
    failedBidCount: input.failedBidCount,
    estimatedSalePrice: input.bidPrice,
  })
  const distribution = computeDistributionTable({
    bidPrice: input.bidPrice,
    executionCost: executionCost.total,
    claims: input.claims,
  })
  const rights = buildRightsAnalysis(input.rightsOverrides, input.topRisks)
  return { rights, distribution, executionCost }
}
