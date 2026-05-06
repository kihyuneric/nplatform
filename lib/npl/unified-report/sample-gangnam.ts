/**
 * lib/npl/unified-report/sample-gangnam.ts
 *
 * 강남구 신사동 상가 NPL 가상 사례 — 풀 분석 보고서 (XRF Vehicle 분석용)
 *
 * 사용자 요청 (2026-05-05):
 *   "기존 Jongno 양식처럼 가상의 매입 일정·잔금일 등 모든 내용을 가상으로 작성 ·
 *    NPL Valuation / XRF Valuation 풀 구조 ·
 *    AI 총평은 NPL 모드 / XRF 모드 별도"
 *
 * XRF_Simulator_v7.xlsx Case 3 기반 → BUY tier 보장 가상 시나리오 (2026-05-05 v3 정합):
 *   · 매입가 28억 (대출원금 35억 × 80% · 할인 20% · creditor 부실 매각 가정)
 *   · 감정가 65억 (LTV 54% · loanPrincipal/appraisal) · AI 시세 63억
 *   · 1순위 우리은행 채권최고액 26억 (LTV 우대 진입)
 *   · 강남 핵심 상권 낙찰가율 86% (프리미엄)
 *   · pledge LTV 90% (법인 차주 우대)
 *   · 운용기간 12개월 (2026-05-15 ~ 2027-06-15)
 *
 * 가상 시나리오 (cosmetic):
 *   · 강남구 신사동 핵심 상권 1층 상가 (가상)
 *   · 차주: 법인 — 강남 신사동 상가 운영사 (가상)
 *   · 채권자 (가상): ◆◆◆◆◆ Capital (외국계 PE)
 *
 * 파일 본구조: sample-jongno.ts 패턴 미러 — buildNplProfitability /
 *   buildRegistryAnalysis 직접 호출 + 가상 schedule 명시.
 *
 * AI 총평:
 *   · NPL Valuation 모드 → executiveSummary (자체 수익성 narrative)
 *   · XRF Valuation 모드 → buildXrfSummary 가 별도로 5단락 자동 생성
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

export const GANGNAM_RETAIL_LISTING_ID = 'lst-gangnam-retail'

const 억 = 100_000_000

// ─── 가상 데이터 (Gangnam 신사동 상가 · IR 시뮬레이션 용 · BUY tier) ─────
//   사용자 정책 (2026-05-05): 강남 상가 사례는 BUY 등급 이상 보장 — IR pitch 용.
//   매력적 deal 재무 구조:
//     · 매입 할인 20% (creditor 부실 매각 가정 — discount 20%)
//     · 1순위 우리은행 26억 (LTV 우대)
//     · 강남 핵심 상권 낙찰가율 86% (프리미엄)
//     · 감정가 65억 (LTV 54% = 대출원금 35억 / 감정가 65억 · 안전 buffer)
const GANGNAM_LOAN_PRINCIPAL = 35 * 억       // 대출원금 35억 (= 청구권 face value)
const GANGNAM_PURCHASE = 28 * 억              // 매입가 28억 (대출원금 80% · 할인 20%)
const GANGNAM_OVERDUE_INTEREST = 1.4 * 억    // 가상 연체이자 1.4억
const GANGNAM_TOTAL_BOND = GANGNAM_LOAN_PRINCIPAL + GANGNAM_OVERDUE_INTEREST  // 채권잔액 36.4억
const GANGNAM_APPRAISAL = 65 * 억            // 감정가 65억 (LTV 54% — loanPrincipal/appraisal)
const GANGNAM_AI_MARKET = 63 * 억            // AI 시세 63억
const GANGNAM_LAND_AREA = 280                // m² (1층 상가)
const GANGNAM_BUILDING_AREA = 230            // m²

const GANGNAM_SENIOR_CHAEMAX = 26 * 억       // 1순위 우리은행 채권최고액 26억 (LTV 우대)
const GANGNAM_SENIOR_PRINCIPAL = 21.6 * 억   // 1순위 원금 가정 (= 26 / 1.2)

// 가상 schedule (12개월 운용 — 사용자 요청 정합)
const GANGNAM_AS_OF = '2026-05-01'
const GANGNAM_PURCHASE_DATE = '2026-05-15'    // 채권 매입 계약일
const GANGNAM_BALANCE_DATE = '2026-06-15'      // 잔금일 (= 매입일 + 31일)
// (legacy) GANGNAM_FIRST_SALE_DATE / GANGNAM_DISTRIBUTION_DATE 상수 제거 —
// 2026-05-06 v2: courtSchedule.stages[0].saleDays(304일) 통계 기반 자동 산출.
const GANGNAM_DEFAULT_DATE = '2025-12-01'      // 연체 시작일

// 강남구 상가 낙찰가율 (가상)
const GANGNAM_AUCTION_STATS = [
  // 사용자 정책 v3.5 (2026-05-06): 강남구 상가 낙찰가율 55% 보수 시나리오
  { bucket: '12M' as const, periodLabel: '1년 평균',   saleCount: 56, saleRate: 19.8, bidRatio: 55.0 },
  { bucket: '6M'  as const, periodLabel: '6개월 평균', saleCount: 32, saleRate: 21.5, bidRatio: 54.5 },
  { bucket: '3M'  as const, periodLabel: '3개월 평균', saleCount: 17, saleRate: 22.8, bidRatio: 55.0 },
  { bucket: '1M'  as const, periodLabel: '1개월 평균', saleCount: 6,  saleRate: 24.1, bidRatio: 56.0 },
]

// 인근 실거래 (가상)
const GANGNAM_COMPARABLES_AVG_PER_M2 = 42_000_000  // m²당 4,200만원 (가상)

// ─── 통계 컨텍스트 (가상) ─────────────────────────────────────
const GANGNAM_STATISTICS: StatisticsContext = {
  asOfDate: GANGNAM_AS_OF,
  target: {
    location: {
      sido: '서울특별시',
      sigungu: '강남구',
      eupmyeondong: '신사동',
      jibun: '000-00',
      bjdCode: '1168010100',
    },
    propertyCategory: '상가',
    appraisalValue: GANGNAM_APPRAISAL,
    landAreaSqm: GANGNAM_LAND_AREA,
    buildingAreaSqm: GANGNAM_BUILDING_AREA,
  },
  auctionRatioStats: [
    {
      location: { sido: '서울특별시', sigungu: '강남구' },
      propertyCategory: '상가',
      scope: 'SIGUNGU',
      asOfDate: GANGNAM_AS_OF,
      rows: GANGNAM_AUCTION_STATS,
    },
  ],
  courtSchedule: {
    courtName: '서울중앙지방법원 본원',
    avgHearingInterval: 35,
    asOfDate: GANGNAM_AS_OF,
    stages: [
      { round: 1, saleDays: 304, distributionDays: 60 },
      { round: 2, saleDays: 350, distributionDays: 60 },
      { round: 3, saleDays: 392, distributionDays: 60 },
    ],
  },
  sameAddressAuction: undefined,
  nearbyAuction: {
    centerLocation: { sido: '서울특별시', sigungu: '강남구', eupmyeondong: '신사동' },
    propertyCategory: '상가',
    radiusMeters: 1000,
    lookbackYears: 3,
    summary: {
      avgDurationDays: 383,
      avgAppraisalValue: 4_667_000_000,
      avgSalePrice: 4_003_000_000,
      avgBidRatio: 55.5,
      avgBidderCount: 4.5,
    },
    cases: [
      // 강남 상가 평균 낙찰가율 55% 시나리오 — 보수 가정 (2026-05-06 v3.5)
      { caseNo: '2025타경45612', filedDate: '2024-09-08', saleDate: '2025-09-21', durationDays: 380, appraisalValue: 42 * 억, salePrice: 23.1 * 억, bidRatio: 55.0, bidderCount: 5 },
      { caseNo: '2025타경50321', filedDate: '2024-09-20', saleDate: '2025-11-04', durationDays: 410, appraisalValue: 38 * 억, salePrice: 20.7 * 억, bidRatio: 54.5, bidderCount: 4 },
      { caseNo: '2026타경10024', filedDate: '2025-02-21', saleDate: '2026-02-14', durationDays: 358, appraisalValue: 60 * 억, salePrice: 33.6 * 억, bidRatio: 56.0, bidderCount: 5 },
    ],
  },
  nearbyTransactions: undefined,
}

// ─── Builder ──────────────────────────────────────────────────
export function buildGangnamSampleReport(opts?: { firstSaleDateOverride?: string }): UnifiedAnalysisReport {
  // ── 입력 ──
  const input: UnifiedReportInput = {
    assetTitle: '강남 신사동 상가 NPL · XRF Case',
    region: '서울특별시 강남구 신사동 (가상)',
    propertyType: '상가',
    propertyCategory: '상가',
    appraisalValue: GANGNAM_APPRAISAL,
    appraisalDate: GANGNAM_AS_OF,
    totalBondAmount: GANGNAM_TOTAL_BOND,
    minBidPrice: estimateMinBid(GANGNAM_APPRAISAL, 0),
    currentMarketValue: GANGNAM_AI_MARKET,
    marketPriceNote: '강남 신사동 핵심 상권 1층 상가 m²당 4,200만원 기준 AI 추정 (가상 사례)',
    claimBreakdown: {
      principal: GANGNAM_LOAN_PRINCIPAL,
      unpaidInterest: 0,
      overdueInterest: GANGNAM_OVERDUE_INTEREST,
      delinquencyStartDate: GANGNAM_DEFAULT_DATE,
      normalRate: 0.0625,
      overdueRate: 0.150,
    },
    rightsSummary: {
      seniorTotal: GANGNAM_SENIOR_CHAEMAX,
      juniorTotal: 0,
    },
    debtorType: 'CORPORATE',
    debtorOwnerSame: true,
    auctionStartDate: '2026-09-01',
    auctionEstimatedStart: '2026-09-01',
    auctionEstimatedMonths: 7,
    desiredSaleDiscount: 0.20,                    // 대출원금 80% 매각 (할인 20%)
    specialConditions: { ...EMPTY_SPECIAL_CONDITIONS },
    statistics: GANGNAM_STATISTICS,
    acquisitionBaseLabel: '대출원금',
    // 사용자 정책 v3.7 (2026-05-06): live recompute 정합 — engine 이 사용하는 base = LOAN_PRINCIPAL (35억)
    //   매입가 = 35억 × (1 − 0.20) = 28억 (할인 20% 표시 정합)
    acquisitionBaseAmount: GANGNAM_LOAN_PRINCIPAL,
    // 사용자 정책 (2026-05-05): 현재 버전은 실 사진 등록 미지원 → sitePhotos 비활성.
    //   PropertyPhotosExhibit 컴포넌트는 유지 (향후 실 사진 등록 시 자동 활성화).
    //   실 매물 deploy 시 storage URL 배열 주입 → 자동으로 EXHIBIT 노출.
    // sitePhotos: undefined → 컴포넌트 자동 hidden (현재 양식 그대로)
  }

  // ── 회수율 3-팩터 ──
  const ltv = computeLtvFactor({
    totalBondAmount: GANGNAM_SENIOR_CHAEMAX + GANGNAM_PURCHASE,  // 권리관계 합계 = 1순위 + 본 채권
    appraisalValue: GANGNAM_APPRAISAL,
    source: 'APPRAISAL',
  })
  const region = computeRegionTrendFactor({
    regionLabel: '서울특별시 강남구 신사동',
    ctx: GANGNAM_STATISTICS,
    externalVolumeChange: 5.2,       // 가상 강남 상가 거래량
    externalPriceIndexChange: 4.8,    // 가상 가격지수
  })
  const auction = computeAuctionRatioFactor({
    regionLabel: '서울특별시 강남구',
    category: '상가',
    ctx: GANGNAM_STATISTICS,
    specialConditions: input.specialConditions,
  })
  const recovery = buildRecoveryPrediction({ ltv, region, auction })

  // ── 예상낙찰가 ──
  const expectedBid = computeExpectedBid({
    appraisalValue: GANGNAM_APPRAISAL,
    minBidPrice: input.minBidPrice ?? 0,
    currentMarketValue: GANGNAM_AI_MARKET,
    auction,
    ctx: GANGNAM_STATISTICS,
  })
  const recommendedBidPrice = expectedBid.recommendedBidPrice

  // ── 등기부 분석 ──
  const registryAnalysis = buildRegistryAnalysis({
    claimAmount: GANGNAM_TOTAL_BOND,
    bidPrice: Math.round(GANGNAM_APPRAISAL * 0.55),  // 강남 상가 55% 낙찰가율 (v3.5 보수)
    interestedPartyCount: 2,            // 채권자 + 채무자
    parcelCount: 1,
    failedBidCount: 0,
    claims: [
      { rank: 1, right: '근저당권설정', creditor: '우리은행',           claimAmount: GANGNAM_SENIOR_CHAEMAX },
      { rank: 2, right: '근저당권설정', creditor: '◆◆◆◆◆ Capital (가상)', claimAmount: GANGNAM_PURCHASE },
    ],
  })

  // ── 리스크 4-팩터 ──
  const collateralFactor = computeCollateralFactor({
    claimBalance: GANGNAM_TOTAL_BOND,
    appraisalValue: GANGNAM_APPRAISAL,
    marketValue: GANGNAM_AI_MARKET,
  })
  const rightsFactor = computeRightsFactor({
    specialConditionsV2: [],
    subordinateClaimCount: 0,
  })
  const marketFactor = computeMarketFactor({ region, auction })
  const liquidityFactor = computeLiquidityFactor({
    auction,
    averageBidderCount: GANGNAM_STATISTICS.nearbyAuction?.summary.avgBidderCount ?? 4.5,
    courtSaleDaysByRound: GANGNAM_STATISTICS.courtSchedule?.stages.map(s => s.saleDays) ?? [],
    courtDistributionDaysByRound: GANGNAM_STATISTICS.courtSchedule?.stages.map(s => s.distributionDays) ?? [],
    oneYearSaleRatePct: GANGNAM_AUCTION_STATS.find(s => s.bucket === '12M')?.saleRate ?? 19.8,
    oneYearSaleCount: GANGNAM_AUCTION_STATS.find(s => s.bucket === '12M')?.saleCount ?? 56,
  })
  const riskFactorResults = [collateralFactor, rightsFactor, marketFactor, liquidityFactor]
  const { score: riskScore } = composeRiskScore(riskFactorResults)
  const riskGrade = scoreToGrade(riskScore)

  // ── 수익성 분석 (NPL 자체) — 가상 schedule 명시 ──
  const profitability = buildNplProfitability({
    property: {
      address: '서울특별시 강남구 신사동 (가상)',
      exclusiveAreaM2: GANGNAM_BUILDING_AREA,
      supplyAreaM2: GANGNAM_BUILDING_AREA,
      creditor: '◆◆◆◆◆ Capital (가상)',
      debtor: '강남 신사동 상가 운영사 (가상)',
      owner: '강남 신사동 상가 운영사 (가상)',
      tenant: '없음',                          // clean deal
    },
    loanPrincipal: GANGNAM_LOAN_PRINCIPAL,         // 35억 (대출원금)
    initialPrincipal: GANGNAM_LOAN_PRINCIPAL,
    acquisitionBaseAmount: GANGNAM_LOAN_PRINCIPAL, // 매입 base = 35억 → discount 20% 적용
    acquisitionBaseLabel: '대출원금',
    delinquencyRate: 0.150,
    delinquencyStartDate: GANGNAM_DEFAULT_DATE,
    accelerationDate: GANGNAM_DEFAULT_DATE,
    appraisalValue: GANGNAM_APPRAISAL,
    aiMarketValueLatest: GANGNAM_AI_MARKET,
    priceHistory: [
      { price: GANGNAM_APPRAISAL, reportedAt: GANGNAM_AS_OF, source: 'APPRAISAL', label: '감정가 (가상)' },
      { price: GANGNAM_AI_MARKET,  reportedAt: GANGNAM_AS_OF, source: 'AI_LATEST', label: 'AI 시세' },
    ],
    expectedBidRatio: 0.55,                // 사용자 정책 v3.5 (2026-05-06): 55% (was 86%)
    expectedBidRatioPeriod: '강남구 상가 평균 (보수)',
    // 사용자 정책 v3.2: 선순위 채권 제거 (우리은행 1순위 근저당 — 본 가상 사례에서 미존재)
    seniorClaimAmount: 0,
    seniorCreditorLabel: undefined,
    auctionStartDate: '2026-09-01',
    courtName: '서울중앙지방법원 본원',
    // 가상 일정 lock — 12개월 운용
    // 2026-05-06 v2: 핵심 공식 적용 (예상 매각기일 = 경매개시 + 315 + 유찰 × 28).
    //   서울중앙지법 강남 상가 1회차 매각 평균 = courtSchedule.stages[0].saleDays = 304일
    //   firstSaleDateOverride 제거 → engine 자동 산출 (304일 cumulative)
    purchaseDateOverride: GANGNAM_PURCHASE_DATE,
    balancePaymentDateOverride: GANGNAM_BALANCE_DATE,
    courtFirstRoundSaleDays: GANGNAM_STATISTICS.courtSchedule?.stages[0]?.saleDays ?? 315,
    ...(opts?.firstSaleDateOverride ? { firstSaleDateOverride: opts.firstSaleDateOverride } : {}),
    discountRate: 0.20,                     // 사용자 정책 v3.5 (2026-05-06): 대출원금 35억 → 매입가 28억 = 20% 할인
    pledgeLoanRatio: 0.90,                  // 법인 차주 90%
    pledgeInterestRate: 0.065,              // 6.5%
    executionCost: 12_000_000,              // 경매비용 1,200만원
    maxBondMultiplier: 1.20,                // 채권최고액 = 원금 × 1.2
    registrationTransferRate: 0.0048,
    brokerageFeeRate: 0.015,                // 1.5%
    contractDepositRate: 0.10,
    asOfDate: GANGNAM_AS_OF,
    mcSeed: 20260501,
    mcTrials: 10_000,
    sensitivityPurchaseRateAxis: [1.00, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70],
    sensitivityBidRatioAxis: [0.40, 0.48, 0.52, 0.55, 0.62, 0.70, 0.80],
    evidence: {
      bidRatioStats: {
        selectedLabel: '강남구 상가 · 보수 55%',
        items: [
          { scope: 'SIGUNGU', region: '강남구', periodMonths: 12, ratioPercent: 55.0, sampleSize: 56 },
          { scope: 'SIGUNGU', region: '강남구', periodMonths: 6,  ratioPercent: 54.5, sampleSize: 32 },
          { scope: 'SIGUNGU', region: '강남구', periodMonths: 3,  ratioPercent: 55.0, sampleSize: 17 },
          { scope: 'SIGUNGU', region: '강남구', periodMonths: 1,  ratioPercent: 56.0, sampleSize: 6 },
        ],
        narrative:
          '강남구 상가 낙찰가율 평균 55% (보수 시나리오 · 2026-05-06 v3.5). ' +
          '적용: 감정가 65억 대비 55% → 예상낙찰가 35.75억.',
      },
      // 2026-05-06 v2: 라벨 의미 정합 (1회차 매각결정기일 평균 / 배당기일 평균 / 기일 간격 28일)
      courtSchedule: {
        courtName: '서울중앙지방법원 본원',
        avgSaleDays: 304,                  // 1회차 매각결정기일 평균 (강남 상가)
        avgDistributionDays: 60,           // 배당기일 평균
        avgHearingInterval: 28,            // 회차 간격 28일 (사용자 정책)
        sampleSize: 56,
      },
      auctionCases: {
        averageDurationDays: 383,
        averageAppraisalValue: 4_667_000_000,
        averageSalePrice: 4_003_000_000,
        averageBidRatio: 55.5,
        sameAddress: [],
        nearbyWithin1Km: (GANGNAM_STATISTICS.nearbyAuction?.cases ?? []).map((c, i) => ({
          caseNo: c.caseNo,
          address: ['서울특별시 강남구 신사동 ㅇㅇㅇ', '서울특별시 강남구 신사동 ㅇㅇㅇ', '서울특별시 강남구 청담동 ㅇㅇㅇ'][i] ?? '서울특별시 강남구 신사동',
          distanceKm: [0.3, 0.5, 0.8][i] ?? 0.5,
          propertyCategory: '상가',
          appraisalValue: c.appraisalValue,
          salePrice: c.salePrice,
          bidRatio: c.bidRatio,
          durationDays: c.durationDays,
          saleDate: c.saleDate,
        })),
      },
      nearbyTransactions: {
        averageLandAreaM2: 245,
        averageAmount: 47.5 * 억,
        averagePricePerM2: GANGNAM_COMPARABLES_AVG_PER_M2,
        averagePricePerPy: GANGNAM_COMPARABLES_AVG_PER_M2 * 3.3058,
        samples: [
          { txDate: '2026-03-12', address: '서울특별시 강남구 신사동 ㅇㅇㅇ', distanceMeters: 250, landAreaM2: 280, amountKRW: 53 * 억, pricePerM2: 47_000_000, zoning: '일반상업지역' },
          { txDate: '2026-01-08', address: '서울특별시 강남구 신사동 ㅇㅇㅇ', distanceMeters: 410, landAreaM2: 220, amountKRW: 41 * 억, pricePerM2: 42_500_000, zoning: '일반상업지역' },
          { txDate: '2025-11-22', address: '서울특별시 강남구 청담동 ㅇㅇㅇ', distanceMeters: 720, landAreaM2: 260, amountKRW: 49 * 억, pricePerM2: 41_800_000, zoning: '일반상업지역' },
        ],
      },
    },
  })

  const bankSalePrice = profitability.acquisition.purchasePrice
  const recommendedRoi = profitability.strategies.recommended.roi
  const investmentRoi = profitability.investment.roi

  // 사용자 정책 v3.4 (2026-05-06): investmentRoi (투입자금 ROI) 기준
  const verdictResultRaw = computeInvestmentVerdict({
    predictedRecoveryRate: recovery.predictedRecoveryRate,
    riskScore,
    investmentRoi,
    bankSalePrice,
    claimBalance: GANGNAM_TOTAL_BOND,
  })

  // 사용자 정책 v3 (2026-05-06): verdict 재설계 (BUY 임계 65점) → 자연 도달 가능.
  //   재무 inputs (할인 20%, 1순위 26억, 낙찰가율 90%, 감정가 65억) 으로 자연 BUY 도달.
  //   override 제거 — 새 계산식으로 정상 산출.
  const verdict: 'BUY' | 'HOLD' | 'AVOID' = verdictResultRaw.verdict
  const verdictScore = verdictResultRaw.totalScore
  const verdictResult = verdictResultRaw

  // ─── NPL Valuation 전용 executiveSummary ──────────────────────
  // (XRF Vehicle 내용은 buildXrfSummary 가 별도로 5단락 생성 — toggle 시 swap)
  // 사용자 정책 v3.5 (2026-05-06):
  //   · 강남 상가 낙찰가율 55% (보수 시나리오 — was 86%)
  //   · 매입 대출원금 35억 × (1 − 20% 할인) = 28억 (= GANGNAM_PURCHASE)
  //   · 선순위 채권 없음 (cascade 단순)
  //   · 예상낙찰가 = 65 × 0.55 = 35.75억
  const executiveSummary =
    `[가상 사례 · 강남 신사동 상가 NPL] ` +
    `법인 차주 · 채권자 ◆◆◆◆◆ Capital · 대출원금 35억 · 매입가 28억 (= 대출원금 × 80% · 할인 20%) · ` +
    `감정가 ${(GANGNAM_APPRAISAL / 억).toFixed(0)}억 (LTV ${(ltv.ltvPercent).toFixed(2)}%). ` +
    `종합 분석 결과 ${riskGrade}등급, 예측 회수율 ${recovery.predictedRecoveryRate.toFixed(1)}% (신뢰도 ${Math.round(recovery.confidence * 100)}%). ` +
    `매입가 ${Math.round(bankSalePrice / 억 * 10) / 10}억 (= 대출원금 80% · 할인 20%) 기준 ` +
    `보수적/권고/공격적 시나리오 ROI ${(profitability.strategies.conservative.roi * 100).toFixed(1)}% / ${(profitability.strategies.recommended.roi * 100).toFixed(1)}% / ${(profitability.strategies.aggressive.roi * 100).toFixed(1)}% · ` +
    `투입자금 ROI ${(investmentRoi * 100).toFixed(2)}% (12개월 운용). ` +
    `강남구 상가 보수 낙찰가율 55% 적용 시 예상낙찰가 ${(GANGNAM_APPRAISAL * 0.55 / 억).toFixed(2)}억 → ` +
    `경매비용 차감 → 선순위 채권 없음 → NPL 측 배당 → 1·2질권자 분배. ` +
    `2순위 권리자 부재로 권리 깨끗 · 임차인 없음 · 강남 핵심 상권 1층 상가 시너지 + ` +
    `인근 1km 실거래 m²당 ${Math.round(GANGNAM_COMPARABLES_AVG_PER_M2 / 10000)}만원 단가 견고. ` +
    `법인 차주 pledge LTV 90% 활용 → LP 자기자본 효율 우수. ` +
    `AI 투자 의견 종합 ${verdictScore}점 → ${verdict}.`

  const ltvNumerator = GANGNAM_SENIOR_CHAEMAX + GANGNAM_PURCHASE

  return {
    id: 'sample-gangnam-' + Date.now().toString(36),
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
        `NPL 매각가 ${Math.round(bankSalePrice / 억 * 10) / 10}억 · ` +
        `ROI ${(investmentRoi * 100).toFixed(2)}% · 예측회수율 ${recovery.predictedRecoveryRate}%`,
    },
    recovery,
    risk: {
      grade: riskGrade,
      score: riskScore,
      level: riskScore >= 70 ? 'LOW' : riskScore >= 55 ? 'MEDIUM' : riskScore >= 40 ? 'HIGH' : 'CRITICAL',
      narrative:
        `리스크 수준 ${riskScore >= 70 ? '낮음' : riskScore >= 55 ? '보통' : '높음'} (${riskScore}점 · 등급 ${riskGrade}). ` +
        `LTV ${ltv.ltvPercent.toFixed(1)}% (권리관계 합계 ${(ltvNumerator / 억).toFixed(1)}억 / 감정가 ${(GANGNAM_APPRAISAL / 억).toFixed(0)}억) · ` +
        `법인 차주 90% pledge LTV → 채권 회수 안정성 ↑. ` +
        `2순위 권리자 부재 + 강남 핵심 상권 입지 → 4팩터 모두 LOW/MEDIUM, 구조적 안정성 확보.`,
      factors: riskFactorResults.map(f => ({
        category: f.category,
        severity: f.severity,
        score: f.score,
        explanation: f.explanation,
        mitigation: f.mitigation,
      })),
      specialConditionAdjustments: [],
      promptMeta: {
        model: 'NPLATFORM 리스크 분석 모델 (가상 사례)',
        generatedAt: new Date().toISOString(),
        inputHash: 'nplatform-risk-gangnam-v1',
      },
    },
    anomaly: {
      overallRisk: 'LOW',
      overallScore: 12,
      findings: [
        {
          id: 'GN-001',
          category: 'PRICE',
          severity: 'INFO',
          title: `감정가 ${(GANGNAM_APPRAISAL / 억).toFixed(0)}억 vs AI 시세 ${(GANGNAM_AI_MARKET / 억).toFixed(0)}억 — 3.6% 하향`,
          description:
            '감정가는 보수적 평가로, AI 시세는 인근 1km 실거래(평균 m²당 4,200만원) 반영 결과 ' +
            '소폭 하향. 본 사례에서는 감정가 기준 84% 낙찰가율 적용으로 회수액 산출.',
          evidence: `감정가 ${GANGNAM_APPRAISAL.toLocaleString()} / AI 시세 ${GANGNAM_AI_MARKET.toLocaleString()}`,
          confidence: 90,
        },
        {
          id: 'GN-002',
          category: 'RIGHTS',
          severity: 'INFO',
          title: '우리은행 1순위 단독 — 권리 깨끗',
          description:
            '근저당 채권최고액 33.6억 (우리은행 단독 1순위 · 28억 × 1.2 = 33.6억) · 후순위 권리자 없음. ' +
            '예상낙찰가 46.2억 기준 1순위 변제 후 잔여 12.6억 → NPL 매수자 회수 충분.',
          evidence: '등기부 분석 — 1순위 우리은행, 후순위 0건',
          confidence: 96,
        },
        {
          id: 'GN-003',
          category: 'PRICE',
          severity: 'INFO',
          title: '강남구 상가 낙찰가율 84%대 안정 흐름',
          description:
            '1년 84.0% → 6개월 84.5% → 3개월 86.0% → 1개월 85.5%로 84-86% 일관. ' +
            '강남 핵심 상권 입지 프리미엄 반영 — 회수 시나리오 신뢰도 높음.',
          evidence: '강남구 상가 1년 56건 / 6개월 32건 / 3개월 17건 / 1개월 6건',
          confidence: 85,
        },
        {
          id: 'GN-004',
          category: 'BEHAVIOR',
          severity: 'INFO',
          title: '법인 차주 + pledge LTV 90% — XRF Vehicle 시그너처',
          description:
            '법인 차주 deal 은 90% pledge LTV 적용 가능 → LP 자기자본 효율 ↑. ' +
            '12개월 짧은 cycle + 강남 핵심 상권 → XRF Vehicle Case 3 모범 사례.',
          evidence: 'XRF Simulator v7 Case 3 reference: NPL Self-ROI 134%',
          confidence: 88,
        },
      ],
      recommendations: [
        '인근 1km 실거래 m²당 4,200만원 단가 ↔ 본 매물 단가 비교 (감정가 검증)',
        '우리은행 1순위 33.6억 변제 시점 / 배당 절차 점검 (낙찰 후 ~60일)',
        '법인 차주 신용도 점검 (재무제표 · 영업현황 · 변제 가능성)',
        '강남 신사동 상권 임대료 시세 점검 (낙찰 후 임대 운영 시 추가 회수)',
      ],
    },
    expectedBid,
    bidRecommendation: {
      aiPredictedBidRatio: auction.blendedBidRatio,
      breakEvenBidRatio: Math.max(50, auction.blendedBidRatio - 15),
      // 사용자 정책 v3.5 (2026-05-06): 강남 상가 보수 시나리오 — 평균 55% 기준 ±5%p
      conservative: {
        policy: 'CONSERVATIVE',
        label: '보수적 입찰가 (감정가 대비 50%)',
        bidPrice: Math.round(GANGNAM_APPRAISAL * 0.50),
        bidRatioPercent: 50,
        expectedNetProfit: Math.round(GANGNAM_APPRAISAL * 0.50 - GANGNAM_TOTAL_BOND),
        expectedRoi: Math.round((GANGNAM_APPRAISAL * 0.50 - GANGNAM_TOTAL_BOND) / GANGNAM_TOTAL_BOND * 100 * 10) / 10,
        expectedIrr: 10.5,
        winProbability: 0.30,
        rationale: '강남구 상가 평균 하단 50% — 낙찰 가능성 낮으나 매입 마진 극대화',
      },
      base: {
        policy: 'BASE',
        label: 'AI 권고 입찰가 (감정가 대비 55%)',
        bidPrice: Math.round(GANGNAM_APPRAISAL * 0.55),
        bidRatioPercent: 55,
        expectedNetProfit: Math.round(GANGNAM_APPRAISAL * 0.55 - GANGNAM_TOTAL_BOND),
        expectedRoi: Math.round((GANGNAM_APPRAISAL * 0.55 - GANGNAM_TOTAL_BOND) / GANGNAM_TOTAL_BOND * 100 * 10) / 10,
        expectedIrr: 15.5,
        winProbability: 0.55,
        rationale: '강남구 상가 평균 55% — 보수 시나리오 (사용자 정책 v3.5)',
      },
      aggressive: {
        policy: 'AGGRESSIVE',
        label: '공격적 입찰가 (감정가 대비 62%)',
        bidPrice: Math.round(GANGNAM_APPRAISAL * 0.62),
        bidRatioPercent: 62,
        expectedNetProfit: Math.round(GANGNAM_APPRAISAL * 0.62 - GANGNAM_TOTAL_BOND),
        expectedRoi: Math.round((GANGNAM_APPRAISAL * 0.62 - GANGNAM_TOTAL_BOND) / GANGNAM_TOTAL_BOND * 100 * 10) / 10,
        expectedIrr: 20.5,
        winProbability: 0.78,
        rationale: '평균 대비 +7%p — 낙찰 확실성 ↑',
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
        '강남구 상가 낙찰가율 1년 84.0% → 6개월 84.5% → 3개월 86.0% 안정 흐름. ' +
        `인근 1km 실거래 평균 단가 ${Math.round(GANGNAM_COMPARABLES_AVG_PER_M2 / 10000).toLocaleString()}만원/㎡로 견고. ` +
        '강남 핵심 상권 1층 상가 — 임대료 안정 + 매매가 견조. 일반상업지역 건축 한도 내에서 운영 잠재력.',
      indicators: [
        { label: '지역 6개월 낙찰가율', value: `${region.auctionMomentum > 0 ? '+' : ''}${region.auctionMomentum}%p vs 1년`, trend: region.auctionMomentum > 0 ? 'UP' : region.auctionMomentum < 0 ? 'DOWN' : 'FLAT', commentary: '강남구 상가 낙찰가율 안정' },
        { label: '인근 1km 실거래', value: `${GANGNAM_STATISTICS.nearbyAuction?.cases.length ?? 3}건/3년`, trend: 'UP', commentary: '신사동·청담동 권역 거래 활발' },
        { label: '법원 1회차 매각 기간', value: `${GANGNAM_STATISTICS.courtSchedule?.stages[0]?.saleDays ?? 304}일`, trend: 'FLAT', commentary: '서울중앙지방법원 본원 강남구 상가 평균 (가상)' },
      ],
    },
    registryAnalysis,
    profitability,
    executiveSummary,
  }
}
