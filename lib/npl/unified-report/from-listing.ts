/**
 * lib/npl/unified-report/from-listing.ts
 *
 * Listing-Driven Generic Report Builder (Phase G7+ · 2026-04-29)
 *
 * 목적:
 *   ListingDetail (npl_listings 행) 만 가지고 UnifiedAnalysisReport 를 생성한다.
 *   - 사용자 정책: 매물 등록/수정 → 보고서/딜룸 자동 갱신, 하드코딩 금지.
 *   - 기존 sample-jongno.ts / sample.ts 는 SAMPLE 하드코딩 (특정 매물용).
 *   - 본 모듈은 ANY listing 의 실제 필드값을 읽어 동일 compute 파이프라인을 실행.
 *
 * 흐름:
 *   listing → buildInput(listing) → 기존 compute 함수들 → UnifiedAnalysisReport
 *
 * 통계 컨텍스트:
 *   listing 의 region 으로 default StatisticsContext 생성.
 *   실 통계 데이터가 있으면 별도 인자로 주입 (statisticsOverride).
 *
 * 사용처:
 *   - app/(main)/analysis/report/page.tsx — non-Jongno listings
 *   - lib/hooks/use-analysis-report.ts — derived → real listing-driven 으로 승격
 *   - app/(main)/deals/dealroom/page.tsx — KPI 계산 시 reportSnapshot 생성
 */

import type { StatisticsContext, PropertyCategory } from './statistics'
import type {
  UnifiedAnalysisReport,
  UnifiedReportInput,
} from './types'
import { EMPTY_SPECIAL_CONDITIONS } from './types'
import {
  computeLtvFactor,
  computeRegionTrendFactor,
  computeAuctionRatioFactor,
  buildRecoveryPrediction,
  scoreToGrade,
} from './recovery-3factor'
import { computeExpectedBid, estimateMinBid } from './expected-bid'
import { buildRegistryAnalysis } from './registry-analysis'
import { buildNplProfitability } from './profitability'
import {
  computeCollateralFactor,
  computeRightsFactor,
  computeMarketFactor,
  computeLiquidityFactor,
  composeRiskScore,
  computeInvestmentVerdict,
} from './risk-factors'
import { migrateV1ToV2Keys } from './special-conditions-migration'

import {
  type ListingDetail,
  getListingPrincipal,
  getListingAppraisal,
  getListingAskingPrice,
  getListingRegion,
  getListingTitle,
  getListingLtvNumerator,
  getListingInstitution,
} from '@/lib/hooks/use-listing'

// ─── 헬퍼 ──────────────────────────────────────────────────────────

const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : fallback

const str = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.length > 0 ? v : fallback

/** listing.collateral_type / property_type → 보고서 PropertyCategory 정규화 */
function pickPropertyCategory(l: ListingDetail): PropertyCategory {
  const raw = (l.collateral_type ?? l.property_type ?? '') as string
  const norm = raw.toLowerCase()
  if (norm.includes('아파트') || norm === 'apartment') return '아파트'
  if (norm.includes('오피스텔')) return '오피스텔'
  if (norm.includes('빌라') || norm.includes('다세대')) return '다세대(빌라)'
  if (norm.includes('단독')) return '단독주택'
  if (norm.includes('상가')) return '상가'
  if (norm.includes('오피스') || norm.includes('사무')) return '사무실'
  if (norm.includes('공장')) return '공장'
  if (norm.includes('창고')) return '창고'
  if (norm.includes('토지') || norm.includes('대지') || norm === 'land') return '대지'
  if (norm === '전') return '전'
  if (norm === '답') return '답'
  if (norm.includes('임야')) return '임야'
  return '기타'
}

/** 채권잔액 (claim balance) — listing 에서 추정. principal + 미수/연체이자 가능 시 합산 */
function pickTotalBond(l: ListingDetail): number {
  const claimAmount = num(l.claim_amount)
  if (claimAmount > 0) return claimAmount
  const principal = num(l.loan_principal_only) || num(l.loan_principal) || getListingPrincipal(l)
  const overdue = num(l.interest_overdue) || num(l.overdue_interest)
  const unpaid = num(l.unpaid_interest)
  return principal + overdue + unpaid
}

/** 매입 base 결정 (사용자 정책: discount_basis = 'CLAIM_BALANCE' OR 'PRINCIPAL') */
function pickAcquisitionBase(l: ListingDetail): {
  label: '대출원금' | '채권잔액'
  amount: number
  discountRate: number
} {
  const discountBasis = (l.discount_basis as string | undefined) ?? 'PRINCIPAL'
  const claimBalance = pickTotalBond(l)
  const principal = num(l.loan_principal_only) || num(l.loan_principal) || getListingPrincipal(l)
  const isBalance = discountBasis === 'CLAIM_BALANCE' || discountBasis.includes('잔액')
  const amount = isBalance ? claimBalance : principal
  const rateField =
    (l.sale_discount_rate as number | undefined) ??
    (l.discount_rate as number | undefined) ??
    0
  // discount_rate 가 0~1 또는 0~100 양쪽 허용 — 1 초과면 % 로 간주
  const normalizedRate = rateField > 1 ? rateField / 100 : rateField
  return {
    label: isBalance ? '채권잔액' : '대출원금',
    amount,
    discountRate: Math.max(0, Math.min(0.95, normalizedRate)),
  }
}

/** 기본 통계 컨텍스트 — 보수적 전국 평균 (실 통계 미연동 시 fallback) */
function buildDefaultStatistics(
  l: ListingDetail,
  category: PropertyCategory,
): StatisticsContext {
  const sido = str(l.sido) || str(l.location_city) || '서울특별시'
  const sigungu = str(l.sigungu) || str(l.location_district) || ''
  const asOfDate = new Date().toISOString().slice(0, 10)
  const appraisal = getListingAppraisal(l)

  return {
    asOfDate,
    target: {
      location: { sido, sigungu },
      propertyCategory: category,
      appraisalValue: appraisal,
      landAreaSqm: num(l.land_area) || 0,
      buildingAreaSqm: num(l.exclusive_area) || num(l.building_area) || 0,
    },
    // 보수적 전국 평균 — 실 데이터 없을 때 placeholder
    auctionRatioStats: [
      {
        location: { sido, sigungu },
        propertyCategory: category,
        scope: 'SIGUNGU',
        asOfDate,
        rows: [
          { bucket: '12M', periodLabel: '1년 평균 (참고치)', saleCount: 0, saleRate: 17.0, bidRatio: 70.0 },
          { bucket: '6M',  periodLabel: '6개월 평균 (참고치)', saleCount: 0, saleRate: 17.5, bidRatio: 70.5 },
          { bucket: '3M',  periodLabel: '3개월 평균 (참고치)', saleCount: 0, saleRate: 18.0, bidRatio: 71.0 },
          { bucket: '1M',  periodLabel: '1개월 평균 (참고치)', saleCount: 0, saleRate: 18.5, bidRatio: 71.5 },
        ],
      },
    ],
    courtSchedule: {
      courtName: '관할 법원 (자동 추정)',
      avgHearingInterval: 45,
      asOfDate,
      // 1~10 회차 보수적 추정 (실측 없을 때 placeholder)
      stages: [
        { round: 1,  saleDays: 300, distributionDays: 360 },
        { round: 2,  saleDays: 380, distributionDays: 440 },
        { round: 3,  saleDays: 460, distributionDays: 520 },
        { round: 4,  saleDays: 540, distributionDays: 600 },
        { round: 5,  saleDays: 0,   distributionDays: 0 },
        { round: 6,  saleDays: 0,   distributionDays: 0 },
        { round: 7,  saleDays: 0,   distributionDays: 0 },
        { round: 8,  saleDays: 0,   distributionDays: 0 },
        { round: 9,  saleDays: 0,   distributionDays: 0 },
        { round: 10, saleDays: 0,   distributionDays: 0 },
      ],
    },
  }
}

// ─── Listing → UnifiedReportInput 매핑 ─────────────────────────────

function buildInputFromListing(
  listing: ListingDetail,
  statisticsOverride?: StatisticsContext,
): UnifiedReportInput {
  const region = getListingRegion(listing)
  const propertyCategory = pickPropertyCategory(listing)
  const appraisal = getListingAppraisal(listing)
  const totalBond = pickTotalBond(listing)
  const aiMarket =
    num(listing.ai_market_value) ||
    num(listing.current_market_value) ||
    appraisal
  const acquisition = pickAcquisitionBase(listing)
  const statistics = statisticsOverride ?? buildDefaultStatistics(listing, propertyCategory)

  // 특수조건 V2 — listing.special_conditions_v2 가 string[] 이면 그대로 사용
  const specialConditionsV2 = Array.isArray(listing.special_conditions_v2)
    ? (listing.special_conditions_v2 as string[]).filter(s => typeof s === 'string')
    : undefined

  const principal =
    num(listing.loan_principal_only) ||
    num(listing.loan_principal) ||
    getListingPrincipal(listing)
  const overdue = num(listing.interest_overdue) || num(listing.overdue_interest)
  const initialPrincipal = num(listing.initial_principal) || principal

  return {
    assetId: String(listing.id),
    assetTitle: getListingTitle(listing),
    region,
    propertyType: str(listing.property_type) || str(listing.collateral_type) || '부동산',
    propertyCategory,
    appraisalValue: appraisal,
    appraisalDate: str(listing.appraisal_date) || undefined,
    totalBondAmount: totalBond,
    minBidPrice: estimateMinBid(appraisal, 0),
    currentMarketValue: aiMarket,
    marketPriceNote: str(listing.market_price_note) || undefined,
    acquisitionBaseLabel: acquisition.label,
    acquisitionBaseAmount: acquisition.amount,
    desiredSaleDiscount: acquisition.discountRate,
    claimBreakdown: {
      initialPrincipal,
      principal,
      unpaidInterest: num(listing.unpaid_interest),
      overdueInterest: overdue,
      delinquencyStartDate: str(listing.default_date) || str(listing.delinquency_start_date) || '',
      normalRate: num(listing.normal_rate) || 0.045,
      overdueRate: num(listing.overdue_rate) || 0.18,
    },
    specialConditions: { ...EMPTY_SPECIAL_CONDITIONS },
    specialConditionsV2,
    debtorType: (listing.debtor_type as 'INDIVIDUAL' | 'CORPORATE' | undefined) ?? '',
    auctionStartDate: str(listing.auction_start_date) || undefined,
    auctionEstimatedMonths: 12,
    statistics,
  }
}

// ─── 메인 빌더 ──────────────────────────────────────────────────────

/**
 * Listing 한 행만으로 UnifiedAnalysisReport 를 생성 (실 listing 기반).
 *
 * @param listing  npl_listings 행 (Supabase 또는 sample)
 * @param opts.statistics  실 통계 데이터 주입 (없으면 default)
 * @returns 매물 필드를 그대로 반영한 UnifiedAnalysisReport
 *
 * 정책:
 *   - 모든 수치는 listing 필드에서 derive (하드코딩 X)
 *   - 통계는 default fallback (실 데이터 미연동 시) — UI 에서 "참고치" 표기
 *   - report.id 는 매번 새로 생성 (cache 충돌 방지) · createdAt 도 갱신
 *   - listing 변경 → React Query 무효화 → 본 함수 재실행 → UI 자동 갱신
 */
export function buildListingReport(
  listing: ListingDetail,
  opts?: { statistics?: StatisticsContext },
): UnifiedAnalysisReport {
  const input = buildInputFromListing(listing, opts?.statistics)

  const appraisal = input.appraisalValue
  const aiMarket = input.currentMarketValue ?? appraisal
  const totalBond = input.totalBondAmount
  const ltvNumerator = getListingLtvNumerator(listing) || totalBond
  const principal =
    num(listing.loan_principal_only) ||
    num(listing.loan_principal) ||
    getListingPrincipal(listing)
  const initialPrincipal = num(listing.initial_principal) || principal
  const acquisitionAmount = input.acquisitionBaseAmount ?? totalBond

  // ── 1. 회수율 3팩터 ────────────────────────────────────────
  const ltv = computeLtvFactor({
    totalBondAmount: ltvNumerator,
    appraisalValue: appraisal,
    source: 'APPRAISAL',
  })
  const regionFactor = computeRegionTrendFactor({
    regionLabel: input.region,
    ctx: input.statistics,
  })
  const auction = computeAuctionRatioFactor({
    regionLabel: input.region,
    category: input.propertyCategory,
    ctx: input.statistics,
    specialConditions: input.specialConditions,
  })
  const recovery = buildRecoveryPrediction({ ltv, region: regionFactor, auction })

  // ── 2. 예상 낙찰가 ──────────────────────────────────────────
  const expectedBid = computeExpectedBid({
    appraisalValue: appraisal,
    minBidPrice: input.minBidPrice,
    currentMarketValue: aiMarket,
    auction,
    ctx: input.statistics,
  })
  const recommendedBidPrice = expectedBid.recommendedBidPrice

  // ── 3. 등기부 분석 (선순위만 알려진 경우) ───────────────────
  const seniorClaim = num(listing.max_claim_amount) || num(listing.senior_claim_max)
  const seniorCreditor = str(listing.rights_priority_1) || str(listing.senior_creditor)
  const claims =
    seniorClaim > 0
      ? [{
          rank: 1,
          right: '근저당권설정',
          creditor: seniorCreditor || '선순위 권리자',
          claimAmount: seniorClaim,
        }]
      : []
  const registryAnalysis = buildRegistryAnalysis({
    claimAmount: totalBond,
    bidPrice: recommendedBidPrice,
    interestedPartyCount: claims.length + 1,
    parcelCount: num(listing.parcel_count) || 1,
    failedBidCount: 0,
    claims,
  })

  // ── 4. 리스크 4팩터 ────────────────────────────────────────
  const collateralFactor = computeCollateralFactor({
    claimBalance: ltvNumerator,
    appraisalValue: appraisal,
    marketValue: aiMarket,
  })
  const rightsFactor = computeRightsFactor({
    specialConditionsV2: input.specialConditionsV2 ?? migrateV1ToV2Keys(input.specialConditions),
    registry: registryAnalysis,
    subordinateClaimCount: num(listing.subordinate_count),
  })
  const marketFactor = computeMarketFactor({ region: regionFactor, auction })
  const liquidityFactor = computeLiquidityFactor({
    auction,
    courtSaleDaysByRound: input.statistics.courtSchedule?.stages.map(s => s.saleDays) ?? [],
    courtDistributionDaysByRound:
      input.statistics.courtSchedule?.stages.map(s => s.distributionDays) ?? [],
    oneYearSaleRatePct:
      input.statistics.auctionRatioStats?.[0]?.rows.find(r => r.bucket === '12M')?.saleRate ?? 15,
    oneYearSaleCount:
      input.statistics.auctionRatioStats?.[0]?.rows.find(r => r.bucket === '12M')?.saleCount ?? 0,
  })
  const riskFactorResults = [collateralFactor, rightsFactor, marketFactor, liquidityFactor]
  const { score: riskScore } = composeRiskScore(riskFactorResults)
  const riskGrade = scoreToGrade(riskScore)

  // ── 5. 수익권 비율 (사용자 입력) ────────────────────────────
  // 수익권금액 = listing.beneficial_amount (직접 입력) OR 최초원금 × beneficial_ratio%
  const ratio = num(listing.beneficial_ratio) || 140
  const beneficialAmountAuto = Math.round(initialPrincipal * (ratio / 100))
  const beneficialAmount = num(listing.beneficial_amount) || beneficialAmountAuto
  const maxBondMultiplier = initialPrincipal > 0 ? beneficialAmount / initialPrincipal : 1.4

  // ── 6. 수익성 분석 ──────────────────────────────────────────
  const profitability = buildNplProfitability({
    property: {
      address: str(listing.address_masked) || str(listing.address) || input.region,
      exclusiveAreaM2: num(listing.exclusive_area) || num(listing.land_area),
      supplyAreaM2: num(listing.supply_area) || num(listing.exclusive_area) || num(listing.land_area),
      creditor: getListingInstitution(listing),
      debtor: str(listing.debtor_name_masked) || '',
      owner: '',
      tenant: num(listing.tenant_count) > 0 ? '있음' : '없음',
    },
    loanPrincipal: principal,
    initialPrincipal,
    acquisitionBaseAmount: acquisitionAmount,
    acquisitionBaseLabel: input.acquisitionBaseLabel,
    delinquencyRate: num(listing.overdue_rate) || 0.18,
    delinquencyStartDate: str(listing.default_date) || '',
    accelerationDate: str(listing.acceleration_date) || str(listing.default_date) || '',
    appraisalValue: appraisal,
    aiMarketValueLatest: aiMarket,
    priceHistory: [
      { price: appraisal, reportedAt: input.appraisalDate ?? input.statistics.asOfDate, source: 'APPRAISAL', label: '감정가' },
      ...(aiMarket !== appraisal
        ? [{ price: aiMarket, reportedAt: input.statistics.asOfDate, source: 'AI_LATEST' as const, label: 'AI 시세' }]
        : []),
    ],
    expectedBidRatio: (auction.blendedBidRatio ?? 70) / 100,
    expectedBidRatioPeriod: '3개월 평균 (참고치)',
    auctionStartDate: str(listing.auction_start_date) || str(listing.default_date) || '',
    courtName: input.statistics.courtSchedule?.courtName ?? '관할 법원',
    discountRate: input.desiredSaleDiscount ?? 0,
    pledgeLoanRatio: input.debtorType === 'CORPORATE' ? 0.90 : 0.75,
    pledgeInterestRate: 0.065,
    executionCost: 10_000_000,
    maxBondMultiplier,
    registrationTransferRate: 0.0048,
    brokerageFeeRate: 0.012,
    contractDepositRate: 0.10,
    asOfDate: input.statistics.asOfDate,
    mcSeed: 20260423,
    mcTrials: 5_000,
    sensitivityPurchaseRateAxis: [1.00, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70],
    sensitivityBidRatioAxis: [0.55, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90],
  })

  const bankSalePrice = profitability.acquisition.purchasePrice
  const recommendedRoi = profitability.strategies.recommended.roi
  const aggressiveRoi = profitability.strategies.aggressive.roi

  // ── 7. AI 투자 의견 (사용자 정책 v3.4: investmentRoi 기준) ────────
  const verdictResult = computeInvestmentVerdict({
    predictedRecoveryRate: recovery.predictedRecoveryRate,
    riskScore,
    investmentRoi: profitability.investment.roi,
    bankSalePrice,
    claimBalance: totalBond,
  })

  // ── 8. 보고서 조립 ──────────────────────────────────────────
  return {
    id: `listing-driven-${listing.id}-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    source: 'AI_LIVE',
    input,
    summary: {
      predictedRecovery: recovery.predictedRecoveryRate,
      riskGrade,
      riskScore,
      recommendedBidPrice,
      verdict: verdictResult.verdict,
      verdictScore: verdictResult.totalScore,
      tldr:
        `${input.region} ${input.propertyCategory} · ` +
        `AI 투자 의견 ${verdictResult.totalScore}점 (${verdictResult.verdict}) · ` +
        `매입가 ${(bankSalePrice / 100_000_000).toFixed(1)}억 · ` +
        `ROI ${(recommendedRoi * 100).toFixed(2)}% · 예측회수율 ${recovery.predictedRecoveryRate}%`,
    },
    recovery,
    risk: {
      grade: riskGrade,
      score: riskScore,
      level: riskScore >= 70 ? 'LOW' : riskScore >= 55 ? 'MEDIUM' : riskScore >= 40 ? 'HIGH' : 'CRITICAL',
      narrative:
        `리스크 점수 ${riskScore}점 (${riskGrade}). 4팩터(담보/권리/시장/유동성) 가중합산. ` +
        `매물 raw 데이터 기반 자동 산정 — 통계 컨텍스트는 ${
          opts?.statistics ? '실 통계 주입' : '전국 평균 참고치'
        }.`,
      factors: riskFactorResults.map(f => ({
        category: f.category,
        severity: f.severity,
        score: f.score,
        explanation: f.explanation,
        mitigation: f.mitigation,
      })),
      specialConditionAdjustments: [],
      promptMeta: {
        model: 'NPLATFORM 리스크 분석 모델 (listing-driven)',
        generatedAt: new Date().toISOString(),
        inputHash: `nplatform-listing-${listing.id}`,
      },
    },
    expectedBid,
    marketOutlook: {
      outlook:
        regionFactor.auctionMomentum > 2 ? 'BULLISH'
        : regionFactor.auctionMomentum < -2 ? 'BEARISH'
        : 'NEUTRAL',
      confidence: regionFactor.confidence,
      horizonMonths: 6,
      narrative:
        `${input.region} ${input.propertyCategory} 시장 — ` +
        `예상 낙찰가율 ${(auction.blendedBidRatio ?? 70).toFixed(1)}% · ` +
        `ROI 권고 ${(recommendedRoi * 100).toFixed(1)}% / 보수적 ${(aggressiveRoi * 100).toFixed(1)}%. ` +
        (opts?.statistics
          ? '실 통계 데이터 기반.'
          : '전국 평균 참고치 적용 — 실 매물 등록 시 region 통계 자동 연동 예정.'),
      indicators: [
        {
          label: '매입 base',
          value: `${input.acquisitionBaseLabel ?? '대출원금'} ${(acquisitionAmount / 100_000_000).toFixed(1)}억`,
          trend: 'FLAT',
          commentary: input.desiredSaleDiscount
            ? `할인율 ${(input.desiredSaleDiscount * 100).toFixed(1)}% 적용`
            : '할인 없음 (100% 매각)',
        },
        {
          label: 'LTV',
          value: `${((ltvNumerator / appraisal) * 100).toFixed(1)}%`,
          trend: 'FLAT',
          commentary: '(선순위+대출원금) / 감정가',
        },
      ],
    },
    registryAnalysis,
    profitability,
    executiveSummary:
      `${input.region} ${input.propertyCategory} (${getListingTitle(listing)}) 종합 분석. ` +
      `대출원금 ${(principal / 100_000_000).toFixed(2)}억 · 채권잔액 ${(totalBond / 100_000_000).toFixed(2)}억 · ` +
      `감정가 ${(appraisal / 100_000_000).toFixed(2)}억 · LTV ${((ltvNumerator / appraisal) * 100).toFixed(2)}%. ` +
      `${riskGrade}등급 (리스크 ${riskScore}점), 예측 회수율 ${recovery.predictedRecoveryRate}%. ` +
      `매입가 ${(bankSalePrice / 100_000_000).toFixed(1)}억 (${input.acquisitionBaseLabel ?? '대출원금'} 기준) → ` +
      `ROI 권고 ${(recommendedRoi * 100).toFixed(1)}% / 공격적 ${(aggressiveRoi * 100).toFixed(1)}%. ` +
      `AI 투자 의견 ${verdictResult.totalScore}점 → ${verdictResult.verdict}. ` +
      (opts?.statistics
        ? '(실 통계 컨텍스트 적용)'
        : '(전국 평균 통계 기반 — 실 region 통계 연동 시 정밀도 향상)'),
  }
}
