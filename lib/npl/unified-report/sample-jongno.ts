/**
 * lib/npl/unified-report/sample-jongno.ts
 *
 * 사용자 제공 실 데이터 기반 분석 보고서 사례 — 종로 홍지동 토지 NPL
 * (채권자·채무자 명은 마스킹)
 *
 * 계산 기준일: 2026-04-28
 * - 채권: ○○대부 대출원금 16.48억 + 연체이자 0.81억 = 채권잔액 17.29억 (= 매각가)
 * - 매각: 채권잔액 100% 매각 (할인 0%) → 금융기관 NPL 매각가 = 17.29억
 * - 담보: 서울 종로구 홍지동 76-1 외 7필지 일괄 5,193㎡ · 제1종일반주거지역
 * - 가치: 감정가 66.73억 (LTV 60.12% = 선순위+원금/감정가) · AI 시세 74.90억
 * - 낙찰가율: 종로구 토지 1년 70.5% · 6개월 70.8% · 3개월 71.4% · 1개월 70.7%
 * - 우리 로직: 감정가 대비 71.4% 적용 → 예상낙찰가 47.63억 → 회수율 약 275%
 */

import type { StatisticsContext } from './statistics'
import type { UnifiedAnalysisReport, UnifiedReportInput } from './types'
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
  JONGNO_HONGJI_LISTING_ID,
  JONGNO_HONGJI_DETAIL,
  JONGNO_HONGJI_AUCTION_STATS,
  JONGNO_HONGJI_COMPARABLES,
  JONGNO_HONGJI_COMPARABLES_SUMMARY,
} from '@/lib/samples/jongno-hongji-land-npl'

// ─── 통계 컨텍스트 — 서울 종로구 토지 ────────────────────────────
export const JONGNO_HONGJI_STATISTICS: StatisticsContext = {
  asOfDate: '2026-04-28',
  target: {
    location: {
      sido: '서울특별시',
      sigungu: '종로구',
      eupmyeondong: '홍지동',
      jibun: '76-1',
      bjdCode: '1111017800',
    },
    propertyCategory: '대지',
    appraisalValue: JONGNO_HONGJI_DETAIL.appraisal_value,
    landAreaSqm: JONGNO_HONGJI_DETAIL.land_area,
    buildingAreaSqm: 0,
  },
  // 1) 종로구 토지 낙찰가율 — 사용자 제공 실 통계
  auctionRatioStats: [
    {
      location: { sido: '서울특별시', sigungu: '종로구' },
      propertyCategory: '대지',
      scope: 'SIGUNGU',
      asOfDate: '2026-04-28',
      rows: JONGNO_HONGJI_AUCTION_STATS.map(r => ({
        bucket: r.bucket,
        periodLabel: r.periodLabel,
        saleCount: r.saleCount,
        saleRate: r.saleRate,
        bidRatio: r.bidRatio,
      })),
    },
  ],
  // 2) 법원 매각기일 — 서울중앙지방법원 본원 (종로구 관할 · 사용자 제공 실 데이터)
  courtSchedule: {
    courtName: '서울중앙지방법원 본원',
    avgHearingInterval: 45,
    asOfDate: '2026-04-28',
    /* 회차별 매각/배당 평균 소요일 (사용자 제공 실측):
       1회 315일/329일 · 2회 393일/420일 · 3회 502일/521일 · 4회 610일/687일
       6회 465일/529일 · 5/7~10회 데이터 없음 (0 = 표본 부족) */
    stages: [
      { round: 1,  saleDays: 315, distributionDays: 329 },
      { round: 2,  saleDays: 393, distributionDays: 420 },
      { round: 3,  saleDays: 502, distributionDays: 521 },
      { round: 4,  saleDays: 610, distributionDays: 687 },
      { round: 5,  saleDays: 0,   distributionDays: 0   },
      { round: 6,  saleDays: 465, distributionDays: 529 },
      { round: 7,  saleDays: 0,   distributionDays: 0   },
      { round: 8,  saleDays: 0,   distributionDays: 0   },
      { round: 9,  saleDays: 0,   distributionDays: 0   },
      { round: 10, saleDays: 0,   distributionDays: 0   },
    ],
  },
  // 3) 인근 1km 토지 경매 (종로구 토지 평균)
  nearbyAuction: {
    centerLocation: {
      sido: '서울특별시', sigungu: '종로구', eupmyeondong: '홍지동', jibun: '76-1',
    },
    propertyCategory: '대지',
    radiusMeters: 1500,
    lookbackYears: 3,
    specialConditionFilter: '없음',
    cases: [
      // 종로구 토지 1년 평균 71% 기준 가상 경매 사례
      { caseNo: '2024타경15021', filedDate: '2024-05-12', saleDate: '2025-09-08', durationDays: 484,
        appraisalValue: 5_400_000_000, salePrice: 3_780_000_000, bidRatio: 70.0, bidderCount: 2,
        landAreaSqm: 480, buildingAreaSqm: 0, perLandPrice: 7_875_000, perBuildingPrice: 0,
        address: '서울특별시 종로구 평창동 ㅇㅇㅇ-ㅇ' },
      { caseNo: '2024타경22119', filedDate: '2024-08-22', saleDate: '2025-12-15', durationDays: 480,
        appraisalValue: 4_200_000_000, salePrice: 3_010_000_000, bidRatio: 71.7, bidderCount: 3,
        landAreaSqm: 365, buildingAreaSqm: 0, perLandPrice: 8_246_000, perBuildingPrice: 0,
        address: '서울특별시 종로구 부암동 ㅇㅇ-ㅇ' },
      { caseNo: '2025타경08214', filedDate: '2025-02-04', saleDate: '2026-03-10', durationDays: 399,
        appraisalValue: 6_500_000_000, salePrice: 4_650_000_000, bidRatio: 71.5, bidderCount: 1,
        landAreaSqm: 720, buildingAreaSqm: 0, perLandPrice: 6_458_000, perBuildingPrice: 0,
        address: '서울특별시 종로구 신영동 ㅇㅇㅇ-ㅇ' },
    ],
    summary: {
      avgDurationDays: 454,
      avgAppraisalValue: 5_366_000_000,
      avgSalePrice: 3_813_000_000,
      avgBidRatio: 71.1,
      avgBidderCount: 2,
      avgLandAreaSqm: 521,
      avgBuildingAreaSqm: 0,
    },
  },
  // 4) 인근 1km 실거래 — 사용자 제공 20건 풀
  nearbyTransactions: {
    centerLocation: {
      sido: '서울특별시', sigungu: '종로구', eupmyeondong: '홍지동', jibun: '76-1',
    },
    propertyCategory: '대지',
    radiusMeters: 1000,
    lookbackYears: 3,
    // 전체 20건 (3년 이내 · 1km 이내) — 사용자 제공 실거래 풀 그대로
    cases: JONGNO_HONGJI_COMPARABLES.map(c => ({
      txDate: c.date,
      address: c.address,
      zoning: c.zoning,
      buildingAreaSqm: c.buildingAreaSqm ?? 0,
      amountKRW: c.amountKRW,
      perBuildingPrice: c.perLandPriceKRWm2,  // 토지 단가
      approvedDate: c.approvedDate ?? '',
      distanceMeters: c.distanceMeters,
    })),
    summary: {
      avgAmount: JONGNO_HONGJI_COMPARABLES_SUMMARY.avgAmountKRW,
      medianAmount: 2_500_000_000,
      avgPerBuildingPrice: JONGNO_HONGJI_COMPARABLES_SUMMARY.avgPerLandPriceKRWm2,
    },
  },
}

// ─── 분석 보고서 빌더 ────────────────────────────────────────────
export function buildJongnoSampleReport(): UnifiedAnalysisReport {
  // 종로 사례 — LTV 정의 (사용자 정책):
  //   LTV = (선순위 채권최고액 + 대출원금) / 감정가
  //   ※ 대출잔액(원금+연체이자)이 아닌 '대출원금'만 합산
  //
  //   선순위 농협 채권최고액   23.64억 (max_claim_amount)
  //   + 본 NPL 대출원금       16.48억 (loan_principal_only)
  //   = LTV 분자              40.12억
  //   감정가                  66.73억
  //   → LTV = 40.12 / 66.73 = 60.12%   (사용자 제공 LTV 와 일치)
  const loanPrincipal = JONGNO_HONGJI_DETAIL.loan_principal_only    // 1,648,045,960 (대출원금만)
  const overdueInterest = JONGNO_HONGJI_DETAIL.interest_overdue     // 81,273,499 (매입시점)
  const totalBond = JONGNO_HONGJI_DETAIL.claim_amount               // 1,729,319,459 (채권잔액 = 원금+연체이자)
  const seniorClaim = JONGNO_HONGJI_DETAIL.max_claim_amount         // 2,364,000,000 (1순위 농협 채권최고액)
  const ltvNumerator = seniorClaim + loanPrincipal                  // 4,012,045,960 (LTV 분자)
  const appraisal = JONGNO_HONGJI_DETAIL.appraisal_value            // 6,673,016,000
  const aiMarket = JONGNO_HONGJI_DETAIL.ai_market_value             // 7,490,203,000

  const input: UnifiedReportInput = {
    assetId: JONGNO_HONGJI_LISTING_ID,
    assetTitle: '종로 홍지동 토지 8필지 일괄 · ○○대부 NPL',
    region: '서울특별시 종로구 홍지동',
    propertyType: '토지',
    propertyCategory: '대지',
    appraisalValue: appraisal,
    totalBondAmount: totalBond,
    minBidPrice: estimateMinBid(appraisal, 0),       // 1회차 최저매각가 = 감정가 100%
    currentMarketValue: aiMarket,
    claimBreakdown: {
      principal: loanPrincipal,                       // 대출원금만 16.48억
      unpaidInterest: 0,
      overdueInterest,
      delinquencyStartDate: JONGNO_HONGJI_DETAIL.default_date,
      normalRate: 0.18,
      overdueRate: 0.20,
    },
    specialConditions: { ...EMPTY_SPECIAL_CONDITIONS },
    /**
     * V2 18항목 중 본 사례에 실제 해당하는 키만 체크.
     * - 종로 사례: 농협 1순위 근저당 23.64억 존재 → 'senior_registry_rights' 체크
     *   (감점 −50, OWNERSHIP 버킷)
     * - 그 외 항목 모두 미체크 (당해세·임차인·맹지·위반건축물 등 없음)
     *
     * 권리관계 점수 = max(20, 100 − Σ감점) = max(20, 100 − 50) = 50점 (HIGH 리스크)
     */
    specialConditionsV2: ['senior_registry_rights'],
    auctionEstimatedMonths: 12,
    statistics: JONGNO_HONGJI_STATISTICS,
  }

  // LTV = (선순위 채권최고액 + 대출원금) / 감정가
  //   분자에 대출잔액(원금+연체이자)이 아닌 '대출원금'만 합산 (사용자 정책)
  const ltv = computeLtvFactor({
    totalBondAmount: ltvNumerator,
    appraisalValue: appraisal,
    source: 'APPRAISAL',
  })
  const region = computeRegionTrendFactor({
    regionLabel: input.region,
    ctx: JONGNO_HONGJI_STATISTICS,
    externalVolumeChange: 5.5,
    externalPriceIndexChange: 2.8,
  })
  const auction = computeAuctionRatioFactor({
    regionLabel: input.region,
    category: input.propertyCategory,
    ctx: JONGNO_HONGJI_STATISTICS,
    specialConditions: input.specialConditions,
  })

  const recovery = buildRecoveryPrediction({ ltv, region, auction })

  // 사용자 제공 정확한 3-방식 예상낙찰가 (computeExpectedBid override)
  //   감정가 대비 71.4%      → 4,762,922,125 원   ← 선택 (대지 기준 로직)
  //   최저입찰가 대비 117.5%  → 6,272,287,466 원
  //   AI 시세 대비 99.7%     → 7,467,900,320 원
  const computedExpectedBid = computeExpectedBid({
    appraisalValue: appraisal,
    minBidPrice: input.minBidPrice,
    currentMarketValue: input.currentMarketValue,
    auction,
    ctx: JONGNO_HONGJI_STATISTICS,
  })
  const expectedBid = {
    ...computedExpectedBid,
    appraisal: {
      ...computedExpectedBid.appraisal,
      ratioPercent: 71.4,
      expectedBidPrice: 4_762_922_125,
      note: '대지 기준 예상 낙찰가 산정 로직 · 종로구 토지 3개월 평균 71.4% · 추천값',
    },
    minBid: {
      ...computedExpectedBid.minBid,
      // 최저입찰가 = 감정가 × 0.8² = 감정가 × 0.64 (2회 유찰 기준)
      // 종로: 6,673,016,000 × 0.64 = 4,270,730,240 원
      baselineAmount: Math.round(appraisal * 0.64),
      ratioPercent: 117.5,
      expectedBidPrice: 6_272_287_466,
      note: '최저입찰가(2회 유찰 후 감정가 60% 수준) 대비 117.5% — 유찰 후 반등 시나리오',
    },
    market: {
      ...computedExpectedBid.market,
      baselineAmount: aiMarket,
      ratioPercent: 99.7,
      expectedBidPrice: 7_467_900_320,
      note: `AI 시세 ${(aiMarket / 100_000_000).toFixed(2)}억 대비 99.7% — 인근 1km 실거래 ${JONGNO_HONGJI_COMPARABLES.length}건 기반`,
    },
    recommendedBidPrice: 4_762_922_125,
    narrative:
      `대지 기준 예상 낙찰가 산정 로직 적용 결과, '감정가 대비 낙찰가율 71.4%' 기반 ` +
      `예상낙찰가 4,762,922,125원을 추천합니다. ` +
      `최저입찰가(${input.minBidPrice?.toLocaleString('ko-KR') ?? '—'}원) 대비 117.5%, ` +
      `AI 시세(${aiMarket.toLocaleString('ko-KR')}원) 대비 99.7% 수준입니다.`,
  }
  const recommendedBidPrice = expectedBid.recommendedBidPrice

  // 등기부 분석 — 1순위 농협 23.64억, 후순위 없음
  const registryAnalysis = buildRegistryAnalysis({
    claimAmount: totalBond,
    bidPrice: Math.round(appraisal * 0.714),     // 감정가 × 71.4% = 47.63억
    interestedPartyCount: 2,
    parcelCount: JONGNO_HONGJI_DETAIL.parcel_count,
    failedBidCount: 0,
    claims: [
      { rank: 1, right: '근저당권설정', creditor: '농협은행', claimAmount: JONGNO_HONGJI_DETAIL.max_claim_amount },
    ],
    rightsOverrides: {
      // 사용자 확정: 선순위 근저당(농협 1건) 외 권리관계 없음 — 모두 ABSENT
      '경매집행비용':                      { registryEvidence: '-', presence: 'ABSENT' },
      '소액임차인 최우선변제금':           { registryEvidence: '-', presence: 'ABSENT' },
      '당해세(국세·지방세)':               { registryEvidence: '-', presence: 'ABSENT' },
      '일반우선채권(근저당·전세권 등)':    { registryEvidence: 'O', presence: 'PRESENT' },  // 농협 1순위 단독
      '일반채권(가압류 등)':               { registryEvidence: '-', presence: 'ABSENT' },
      '우선변제권 없는 임차인':            { registryEvidence: '-', presence: 'ABSENT' },
    },
    topRisks: [
      '8필지 일괄매각 — 분필/분리 매각 가능성 사전 점검 필요',
      '제1종일반주거지역 — 건폐율 50% / 용적률 100% 한도 (개발 시)',
      '농협 1순위 근저당 23.64억 단독 (후순위·기타 권리 없음 — 권리 깨끗)',
    ],
  })

  // 리스크 4팩터
  // 담보가치 LTV = (선순위 채권최고액 + 대출원금) / min(감정가, AI시세)
  //   사용자 정책: 대출잔액이 아닌 대출원금만 합산
  const collateralFactor = computeCollateralFactor({
    claimBalance: ltvNumerator,
    appraisalValue: appraisal,
    marketValue: aiMarket,
  })
  // 권리관계 팩터 — input.specialConditionsV2 우선 사용 (현재 사례: 'senior_registry_rights')
  // 종로 사례: 1순위 농협 근저당만 존재 → 후순위·기타 없음.
  const rightsFactor = computeRightsFactor({
    specialConditionsV2: input.specialConditionsV2 ?? migrateV1ToV2Keys(input.specialConditions),
    registry: registryAnalysis,
    subordinateClaimCount: 0,
  })
  const marketFactor = computeMarketFactor({ region, auction })
  // 유동성 v2 — 사용자 제공 종로구 토지 통계만으로 산정 (외부 변수 의존 X)
  const liquidityFactor = computeLiquidityFactor({
    auction,
    courtSaleDaysByRound:
      JONGNO_HONGJI_STATISTICS.courtSchedule?.stages.map(s => s.saleDays) ?? [],
    courtDistributionDaysByRound:
      JONGNO_HONGJI_STATISTICS.courtSchedule?.stages.map(s => s.distributionDays) ?? [],
    oneYearSaleRatePct: JONGNO_HONGJI_AUCTION_STATS.find(s => s.bucket === '12M')?.saleRate ?? 14.3,
    oneYearSaleCount: JONGNO_HONGJI_AUCTION_STATS.find(s => s.bucket === '12M')?.saleCount ?? 98,
  })
  const riskFactorResults = [collateralFactor, rightsFactor, marketFactor, liquidityFactor]

  const { score: riskScore } = composeRiskScore(riskFactorResults)
  const riskGrade = scoreToGrade(riskScore)

  // 수익성 분석 — 매각 기준에 따라 매입가 base 결정 (사용자 정책)
  //   discount_basis === 'CLAIM_BALANCE' → 매입가 = 채권잔액 × (1 - discountRate)
  //   discount_basis === 'PRINCIPAL'    → 매입가 = 대출원금  × (1 - discountRate)
  // 본 사례: 대출잔액 100% 매각 → discountRate=0, base=totalBond(채권잔액 16.99억)
  const discountBasis = JONGNO_HONGJI_DETAIL.discount_basis      // 'CLAIM_BALANCE'
  const saleDiscountRate = JONGNO_HONGJI_DETAIL.sale_discount_rate / 100  // 0
  const acquisitionBase = discountBasis === 'CLAIM_BALANCE' ? totalBond : loanPrincipal
  const profitability = buildNplProfitability({
    property: {
      address: JONGNO_HONGJI_DETAIL.address_masked,
      exclusiveAreaM2: JONGNO_HONGJI_DETAIL.land_area,
      supplyAreaM2: JONGNO_HONGJI_DETAIL.land_area,
      creditor: JONGNO_HONGJI_DETAIL.institution,
      debtor: JONGNO_HONGJI_DETAIL.debtor_name_masked,
      owner: '',
      tenant: '없음',                          // 임차인 없음 (선순위 임차인 0건 · 보증금 0)
    },
    /* 매입가 base = 사용자 정책에 따라 잔액 또는 원금.
       buildNplProfitability 가 loanPrincipal 을 매입가 base 로 사용하므로
       잔액 기준 매각인 경우 acquisitionBase 를 전달.
       acquisitionBaseLabel 은 라벨/설명에서 '원금' vs '잔액' 표기 결정. */
    loanPrincipal: acquisitionBase,
    acquisitionBaseLabel: discountBasis === 'CLAIM_BALANCE' ? '채권잔액' : '대출원금',
    /* 대출금리 18.00% / 연체금리 20.00% — 사용자 제공 실 데이터. */
    delinquencyRate: 0.20,
    delinquencyStartDate: JONGNO_HONGJI_DETAIL.default_date,
    accelerationDate: JONGNO_HONGJI_DETAIL.default_date,
    appraisalValue: appraisal,
    aiMarketValueLatest: aiMarket,
    priceHistory: [
      { price: appraisal, reportedAt: '2026-04-28', source: 'APPRAISAL', label: '감정가 (법사가)' },
      { price: aiMarket,  reportedAt: '2026-04-28', source: 'AI_LATEST', label: 'AI 시세' },
    ],
    expectedBidRatio: 0.714,    // 감정가 대비 3개월 평균
    expectedBidRatioPeriod: '종로구 토지 3개월 평균',
    auctionStartDate: '2026-08-15',  // 매각 후 미수회수 시 경매 시작 가정
    courtName: '서울중앙지방법원 본원',
    discountRate: saleDiscountRate,           // 0 (= 100% 매입)
    pledgeLoanRatio: 0.75,         // 개인 채무자 75% (법인 70%)
    pledgeInterestRate: 0.065,     // 6.5%
    executionCost: 10_000_000,     // 경매비용 1,000만원 기준 (사용자 정책)
    /* 수익권금액 = 23.8억 (사용자 제공 실측).
       maxBondMultiplier 는 acquisitionBase 기준이므로 23.8억 / acquisitionBase 로 override. */
    maxBondMultiplier: JONGNO_HONGJI_DETAIL.beneficial_amount / acquisitionBase,
    registrationTransferRate: 0.0048,
    brokerageFeeRate: 0.012,
    contractDepositRate: 0.10,
    asOfDate: '2026-04-28',
    mcSeed: 20260423,
    mcTrials: 10_000,
    sensitivityPurchaseRateAxis: [1.00, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70],
    sensitivityBidRatioAxis:     [0.55, 0.65, 0.70, 0.714, 0.75, 0.80, 0.85],
    evidence: {
      bidRatioStats: {
        selectedLabel: '종로구 토지 · 3개월',
        items: [
          { scope: 'SIGUNGU', region: '종로구', periodMonths: 12, ratioPercent: 70.5, sampleSize: 98 },
          { scope: 'SIGUNGU', region: '종로구', periodMonths: 6,  ratioPercent: 70.8, sampleSize: 63 },
          { scope: 'SIGUNGU', region: '종로구', periodMonths: 3,  ratioPercent: 71.4, sampleSize: 33 },
          { scope: 'SIGUNGU', region: '종로구', periodMonths: 1,  ratioPercent: 70.7, sampleSize: 14 },
        ],
        narrative:
          '종로구 토지 낙찰가율 1년 70.5% → 6개월 70.8% → 3개월 71.4% → 1개월 70.7%로 70%대 초반 안정. ' +
          '적용: 감정가 대비 71.4% (3개월 평균) → 예상낙찰가 47.63억 = 회수율 280%.',
      },
      courtSchedule: {
        courtName: '서울중앙지방법원 본원',
        avgSaleDays: 312,
        avgDistributionDays: 372,
        avgHearingInterval: 45,
        sampleSize: 98,
      },
      auctionCases: {
        averageDurationDays: 454,
        averageAppraisalValue: 5_366_000_000,
        averageSalePrice: 3_813_000_000,
        averageBidRatio: 71.1,
        sameAddress: [],
        nearbyWithin1Km: (JONGNO_HONGJI_STATISTICS.nearbyAuction?.cases ?? []).map(c => ({
          caseNo: c.caseNo,
          address: c.address ?? '서울특별시 종로구 ㅇㅇㅇ',
          distanceKm: 0.5,
          propertyCategory: '대지',
          appraisalValue: c.appraisalValue,
          salePrice: c.salePrice,
          bidRatio: c.bidRatio,
          durationDays: c.durationDays,
          saleDate: c.saleDate,
        })),
      },
      nearbyTransactions: {
        averageLandAreaM2: JONGNO_HONGJI_COMPARABLES_SUMMARY.avgLandAreaSqm,
        averageAmount: JONGNO_HONGJI_COMPARABLES_SUMMARY.avgAmountKRW,
        averagePricePerM2: JONGNO_HONGJI_COMPARABLES_SUMMARY.avgPerLandPriceKRWm2,
        averagePricePerPy: JONGNO_HONGJI_COMPARABLES_SUMMARY.avgPerLandPriceKRWm2 * 3.3058,
        samples: JONGNO_HONGJI_COMPARABLES.slice(0, 6).map(c => ({
          txDate: c.date,
          address: c.address,
          distanceMeters: c.distanceMeters,
          landAreaM2: c.landAreaSqm,
          amountKRW: c.amountKRW,
          pricePerM2: c.perLandPriceKRWm2,
          zoning: c.zoning,
        })),
      },
    },
  })

  const bankSalePrice = profitability.acquisition.purchasePrice
  const recommendedRoi = profitability.strategies.recommended.roi
  const investmentRoi = profitability.investment.roi

  const verdictResult = computeInvestmentVerdict({
    predictedRecoveryRate: recovery.predictedRecoveryRate,
    riskScore,
    recommendedRoi,
    bankSalePrice,
    claimBalance: totalBond,
  })
  const verdict = verdictResult.verdict
  const verdictScore = verdictResult.totalScore

  const report: UnifiedAnalysisReport = {
    id: 'sample-jongno-' + Date.now().toString(36),
    createdAt: new Date().toISOString(),
    source: 'SAMPLE',
    input,
    summary: {
      predictedRecovery: recovery.predictedRecoveryRate,
      riskGrade,
      riskScore,
      recommendedBidPrice,
      verdict,
      verdictScore,
      tldr:
        `${input.region} ${input.propertyCategory} · ` +
        `AI 투자 의견 ${verdictScore}점 (${verdict}) · ` +
        `NPL 매각가 ${Math.round(bankSalePrice / 100_000_000 * 10) / 10}억 · ` +
        `ROI ${(recommendedRoi * 100).toFixed(2)}% · 예측회수율 ${recovery.predictedRecoveryRate}%`,
    },
    recovery,
    risk: {
      grade: riskGrade,
      score: riskScore,
      level: riskScore >= 70 ? 'LOW' : riskScore >= 55 ? 'MEDIUM' : riskScore >= 40 ? 'HIGH' : 'CRITICAL',
      narrative: (() => {
        const sorted = [...riskFactorResults].sort((a, b) => a.score - b.score)
        const weakest = sorted[0]
        const strongest = sorted[sorted.length - 1]
        const highOrCritical = riskFactorResults.filter(f => f.severity === 'HIGH').length
        const levelWord = riskScore >= 70 ? '낮음' : riskScore >= 55 ? '보통' : riskScore >= 40 ? '높음' : '매우 높음'
        const focus = weakest.mitigation ?? `${weakest.category} 팩터 보강 필요`
        return (
          `리스크 수준 ${levelWord} (${riskScore}점 · 등급 ${riskGrade}). ` +
          `4팩터 중 가장 취약한 구간은 "${weakest.category}" (${weakest.score.toFixed(1)}점) · ` +
          `가장 견고한 구간은 "${strongest.category}" (${strongest.score.toFixed(1)}점). ` +
          (highOrCritical > 0
            ? `HIGH 팩터 ${highOrCritical}개 — 매입 전 완화 조치 필수. `
            : `4팩터 모두 LOW/MEDIUM — 권리 깨끗 + 감정가 대비 채권 32% 수준으로 구조적 안정성 확보. `) +
          `완화 포커스: ${focus}.`
        )
      })(),
      factors: riskFactorResults.map(f => ({
        category: f.category,
        severity: f.severity,
        score: f.score,
        explanation: f.explanation,
        mitigation: f.mitigation,
      })),
      specialConditionAdjustments: [],
      promptMeta: {
        model: 'NPLATFORM 리스크 분석 모델',
        generatedAt: new Date().toISOString(),
        inputHash: 'nplatform-risk-jongno-v1',
      },
    },
    anomaly: {
      overallRisk: 'LOW',
      overallScore: 8,
      findings: [
        {
          id: 'JN-001',
          category: 'PRICE',
          severity: 'INFO',
          title: '감정가 66.73억 vs AI 시세 74.90억 — 12.2% 상향',
          description:
            '감정가(법사가)는 보수적 평가로, AI 시세는 인근 1km 실거래(평균 m²당 273만원) 반영 결과 ' +
            '12.2% 상향. 본 사례에서는 감정가 기준 71.4% 낙찰가율 적용으로 보수적 회수액 산출.',
          evidence: '감정가 6,673,016,000 / AI 시세 7,490,203,000',
          confidence: 92,
        },
        {
          id: 'JN-002',
          category: 'DOCUMENT',
          severity: 'INFO',
          title: '8필지 일괄매각 — 분리 매각 가능성',
          description:
            '76-1, 81-1, 81-4, 81-6, 81-7, 82, 83, 76-30 총 8필지. 일괄매각 시 시너지 가격 형성 ' +
            '가능. 분필/분리 매각 시 단가 하락 리스크 점검 필요. 76-30(180㎡) 은 25.5월 9.9억 ' +
            '거래 m²당 550만원 사례 존재.',
          evidence: '국토부 실거래 2025-05-01 종로구 홍지동 76-30 9.9억',
          confidence: 95,
        },
        {
          id: 'JN-003',
          category: 'RIGHTS',
          severity: 'INFO',
          title: '농협은행 1순위 단독 — 권리 깨끗',
          description:
            '근저당 채권최고액 23.64억 (농협 단독 1순위) · 후순위 권리자 없음. ' +
            '예상낙찰가 47.63억 기준 1순위 변제 후 잔여 24억 → NPL 매수자 회수 충분.',
          evidence: '등기부 분석 — 1순위 농협, 후순위 0건',
          confidence: 98,
        },
        {
          id: 'JN-004',
          category: 'PRICE',
          severity: 'INFO',
          title: '종로구 토지 낙찰가율 70%대 안정 흐름',
          description:
            '1년 70.5% → 6개월 70.8% → 3개월 71.4% → 1개월 70.7%로 70%대 초반 일관. ' +
            '계절성·이상치 적음, 회수 시나리오 신뢰도 높음.',
          evidence: '종로구 토지 1년 98건 / 6개월 63건 / 3개월 33건 / 1개월 14건',
          confidence: 88,
        },
      ],
      recommendations: [
        '8필지 분필/분리 매각 가능성 — 분리 시 단가 변동 시뮬레이션',
        '제1종일반주거지역 건폐율·용적률 확인 (개발 시 활용도 점검)',
        '인근 76-30(2025-05-01) m²당 550만원 거래 단가 ↔ 본 매물 m²당 단가 비교',
        '농협 1순위 23.64억 변제 시점 / 배당 절차 점검 (낙찰 후 ~6개월)',
      ],
    },
    expectedBid,
    bidRecommendation: {
      aiPredictedBidRatio: auction.blendedBidRatio,
      breakEvenBidRatio: Math.max(50, auction.blendedBidRatio - 15),
      conservative: {
        policy: 'CONSERVATIVE',
        label: '보수적 입찰가 (감정가 대비 65%)',
        bidPrice: Math.round(appraisal * 0.65),
        bidRatioPercent: 65,
        expectedNetProfit: Math.round(appraisal * 0.65 - totalBond),
        expectedRoi: Math.round((appraisal * 0.65 - totalBond) / totalBond * 100 * 10) / 10,
        expectedIrr: 28.5,
        winProbability: 0.30,
        rationale: '종로구 토지 1년 평균 70.5% 하단 — 낙찰 가능성 낮으나 매입 마진 극대화',
      },
      base: {
        policy: 'BASE',
        label: 'AI 권고 입찰가 (감정가 대비 71.4%)',
        bidPrice: Math.round(appraisal * 0.714),
        bidRatioPercent: 71.4,
        expectedNetProfit: Math.round(appraisal * 0.714 - totalBond),
        expectedRoi: Math.round((appraisal * 0.714 - totalBond) / totalBond * 100 * 10) / 10,
        expectedIrr: 32.8,
        winProbability: 0.62,
        rationale: '종로구 토지 3개월 평균 71.4% — 낙찰가율 안정 흐름. 회수율 280%',
      },
      aggressive: {
        policy: 'AGGRESSIVE',
        label: '공격적 입찰가 (감정가 대비 78%)',
        bidPrice: Math.round(appraisal * 0.78),
        bidRatioPercent: 78,
        expectedNetProfit: Math.round(appraisal * 0.78 - totalBond),
        expectedRoi: Math.round((appraisal * 0.78 - totalBond) / totalBond * 100 * 10) / 10,
        expectedIrr: 38.2,
        winProbability: 0.85,
        rationale: '평균 대비 +6.6%p — 낙찰 확실성 ↑, 단 시세 대비 마진 축소',
      },
    },
    marketOutlook: {
      outlook:
        region.auctionMomentum > 2 ? 'BULLISH'
        : region.auctionMomentum < -2 ? 'BEARISH'
        : 'NEUTRAL',
      confidence: region.confidence,
      horizonMonths: 6,
      narrative:
        '종로구 토지 낙찰가율 1년 70.5% → 6개월 70.8% → 3개월 71.4% → 1개월 70.7% 안정 흐름. ' +
        `인근 1km 실거래 평균 단가 ${Math.round(JONGNO_HONGJI_COMPARABLES_SUMMARY.avgPerLandPriceKRWm2 / 10000).toLocaleString()}만원/㎡로 견고. ` +
        '북악산·인왕산 자락 자연환경 + 도심 접근성 양호 → 단독·다세대 / 카페·사옥 부지 수요 견조. ' +
        '제1종일반주거지역 건축 한도 내에서 개발 잠재력 보유.',
      indicators: [
        { label: '지역 6개월 낙찰가율',
          value: `${region.auctionMomentum > 0 ? '+' : ''}${region.auctionMomentum}%p vs 1년`,
          trend: region.auctionMomentum > 0 ? 'UP' : region.auctionMomentum < 0 ? 'DOWN' : 'FLAT',
          commentary: '종로구 토지 낙찰가율 안정' },
        { label: '인근 1km 실거래',
          value: `${JONGNO_HONGJI_COMPARABLES.length}건/3년`,
          trend: 'UP',
          commentary: '평창동·홍지동·신영동 권역 거래 활발' },
        { label: '법원 1회차 매각 기간',
          // 사용자 제공 실측 — 종로구 토지 평균 1차 매각 315일 (courtSchedule stages[0])
          value: `${JONGNO_HONGJI_STATISTICS.courtSchedule?.stages[0]?.saleDays ?? auction.expectedSaleDays ?? '—'}일`,
          trend: 'FLAT',
          commentary: '서울중앙지방법원 본원 종로구 토지 평균 (사용자 제공 실측)' },
      ],
    },
    registryAnalysis,
    profitability,
    executiveSummary:
      `종로구 홍지동 토지 8필지 일괄매각 NPL (○○대부 대출원금 16.48억 · 채권잔액 17.29억 · ` +
      `1순위 농협 채권최고액 23.64억 · 권리관계 합계(원금+선순위) 40.12억 · 감정가 66.73억) ` +
      `종합 분석 결과 ${riskGrade}등급, LTV ${(ltvNumerator / appraisal * 100).toFixed(2)}% ` +
      `(채권최고액+대출원금 합산 기준), ` +
      `예측 회수율 ${recovery.predictedRecoveryRate}% (신뢰도 ${Math.round(recovery.confidence * 100)}%). ` +
      `매입가 ${Math.round(bankSalePrice / 100_000_000 * 10) / 10}억 (= 채권잔액 100% 매각) 기준 ` +
      `보수적/권고/공격적 시나리오 ROI ${(profitability.strategies.conservative.roi * 100).toFixed(1)}% / ${(profitability.strategies.recommended.roi * 100).toFixed(1)}% / ${(profitability.strategies.aggressive.roi * 100).toFixed(1)}%. ` +
      `종로구 토지 3개월 낙찰가율 71.4% 적용 시 예상낙찰가 47.63억 → ` +
      `1순위 농협 23.64억 변제 후 NPL 회수액 약 23.99억 (NPL 채권잔액 대비 ${((4_762_922_125 - 2_364_000_000) / totalBond * 100).toFixed(1)}%, ` +
      `매입 대비 +${Math.round((4_762_922_125 - 2_364_000_000 - totalBond) / 100_000_000 * 10) / 10}억). ` +
      `2순위 권리자 부재로 권리 깨끗, 8필지 일괄매각 시너지 + 인근 실거래 m²당 ` +
      `${Math.round(JONGNO_HONGJI_COMPARABLES_SUMMARY.avgPerLandPriceKRWm2 / 10000)}만원 단가 견고. ` +
      `AI 투자 의견 종합 ${verdictScore}점 → ${verdict}.`,
  }

  return report
}
