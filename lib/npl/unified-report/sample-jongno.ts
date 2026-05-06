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
 *           서울 전체 토지 3개월 평균 68.2% (특별시도 범위)
 * - 우리 로직 (v3 2026-05-06): 서울 토지 3개월 평균 68.2% 적용
 *   → 예상낙찰가 45.51억 → 회수율 약 263%
 *   → 회차당 유찰 할인율 20%p (default · 통계 매핑 가능) · 68.2% → 3회차 예상
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
  JONGNO_HONGJI_AUCTION_STATS_SIDO,
  JONGNO_HONGJI_AUCTION_STATS_DONG,
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
  // 1) 낙찰가율 — 3-scope (시·도 / 시·군·구 / 읍·면·동) 스크린샷 포맷 정합
  //    근거 데이터 ② 경매 낙찰가율 탭이 scope 별 tab 으로 분기 노출
  auctionRatioStats: [
    {
      // 특별시도 범위 — sigungu 는 LocationKey 필수 → 빈 문자열로 설정 (전체 집계 의미)
      location: { sido: '서울특별시', sigungu: '' },
      propertyCategory: '대지',
      scope: 'SIDO',
      asOfDate: '2026-04-28',
      rows: JONGNO_HONGJI_AUCTION_STATS_SIDO.map(r => ({
        bucket: r.bucket, periodLabel: r.periodLabel,
        saleCount: r.saleCount, saleRate: r.saleRate, bidRatio: r.bidRatio,
      })),
    },
    {
      // 종로구 대지 category 전용 통계 없음 (JONGNO_HONGJI_AUCTION_STATS = 전체 카테고리 합산).
      // saleCount=0 로 표시 → engine(pickRegionMedian12M) 이 SIDO fallback.
      // 3-tab 패널에는 표시되지만 낙찰가율 0% · 건수 0건 으로 노출.
      location: { sido: '서울특별시', sigungu: '종로구' },
      propertyCategory: '대지',
      scope: 'SIGUNGU',
      asOfDate: '2026-04-28',
      rows: JONGNO_HONGJI_AUCTION_STATS.map(r => ({
        bucket: r.bucket, periodLabel: r.periodLabel,
        saleCount: 0,      // 대지 category 데이터 없음 — engine SIDO fallback
        saleRate: r.saleRate, bidRatio: 0,
      })),
    },
    {
      location: { sido: '서울특별시', sigungu: '종로구', eupmyeondong: '홍지동' },
      propertyCategory: '대지',
      scope: 'EUPMYEONDONG',
      asOfDate: '2026-04-28',
      rows: JONGNO_HONGJI_AUCTION_STATS_DONG.map(r => ({
        bucket: r.bucket, periodLabel: r.periodLabel,
        saleCount: r.saleCount, saleRate: r.saleRate, bidRatio: r.bidRatio,
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
  // 3) 주변 3km 토지 경매 (3년 이내 · 사용자 제공 통계 — 2026-05-06 v3)
  //    개발자 연동 예정 — 매물 지번 좌표 기준 반경 3km 내 토지 경매 낙찰사례
  nearbyAuction: {
    centerLocation: {
      sido: '서울특별시', sigungu: '종로구', eupmyeondong: '홍지동', jibun: '76-1',
    },
    propertyCategory: '대지',
    radiusMeters: 3000,
    lookbackYears: 3,
    specialConditionFilter: '없음',
    cases: [
      { caseNo: '2021타경2807', filedDate: '2021-07-13', saleDate: '2024-10-31', durationDays: 1206,
        appraisalValue: 2_570_000_000, salePrice: 720_000_000, bidRatio: 28.0, bidderCount: 2,
        landAreaSqm: 5_416, buildingAreaSqm: 0, perLandPrice: 132_939, perBuildingPrice: 0,
        address: '서울특별시 종로구 구기동 76-2', distanceMeters: 832 },
      { caseNo: '2022타경107853', filedDate: '2022-08-10', saleDate: '2023-11-07', durationDays: 454,
        appraisalValue: 2_050_000_000, salePrice: 790_000_000, bidRatio: 38.5, bidderCount: 2,
        landAreaSqm: 14_248, buildingAreaSqm: 0, perLandPrice: 55_446, perBuildingPrice: 0,
        address: '서울특별시 종로구 구기동 249', distanceMeters: 833 },
    ],
    summary: {
      avgDurationDays: 830,
      avgAppraisalValue: 2_310_000_000,        // (25.7 + 20.5) / 2 ≈ 23.1억
      avgSalePrice: 755_000_000,                // (7.2 + 7.9) / 2 ≈ 7.5억
      avgBidRatio: 33.25,                       // (28 + 38.5) / 2
      avgBidderCount: 2,
      avgLandAreaSqm: 9_832,                    // (5416 + 14248) / 2
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

/**
 * 종로 홍지동 사례 보고서 빌더.
 *
 * @param opts.firstSaleDateOverride 1차 매각기일 명시 (생략 시 builder 기본값 '2027-10-03').
 *   sample-roi API 가 보고서 페이지의 effectivePredictedSaleDate 시프트를 적용하기 위해 사용.
 */
// ─── 분석 보고서 빌더 ────────────────────────────────────────────
export function buildJongnoSampleReport(opts?: { firstSaleDateOverride?: string }): UnifiedAnalysisReport {
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

  // ── 매각 기준 (사용자 정책) — 채권잔액 vs 대출원금
  const discountBasis = JONGNO_HONGJI_DETAIL.discount_basis      // 'CLAIM_BALANCE'
  const saleDiscountRate = JONGNO_HONGJI_DETAIL.sale_discount_rate / 100  // 0
  const acquisitionBase = discountBasis === 'CLAIM_BALANCE' ? totalBond : loanPrincipal

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
    /* 매각 기준 (사용자 정책 2026-04-28):
       종로 사례 = 채권잔액 100% 매각 → label='채권잔액', amount=totalBond */
    acquisitionBaseLabel: discountBasis === 'CLAIM_BALANCE' ? '채권잔액' : '대출원금',
    acquisitionBaseAmount: acquisitionBase,
    claimBreakdown: {
      initialPrincipal: JONGNO_HONGJI_DETAIL.initial_principal,  // 최초 대출원금 17억
      principal: loanPrincipal,                                   // 현재 대출원금 16.48억
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
  // 사용자 정책 v4 (2026-05-06): 하드코딩 외부 지표 제거 — nearbyTransactions 자동 산출.
  //   거래량 변동·가격지수 변동은 computeVolumeAndPriceSignals 가 4건 실거래에서 계산.
  const region = computeRegionTrendFactor({
    regionLabel: input.region,
    ctx: JONGNO_HONGJI_STATISTICS,
    // externalVolumeChange / externalPriceIndexChange 미제공 → 내부 자동 산출
  })
  // 사용자 정책 v4 (2026-05-06): regionMedianOverride 제거.
  //   auctionRatioStats SIGUNGU saleCount=0 → pickRegionMedian12M 이 SIDO 12M 66.9% 자동 선택.
  const auction = computeAuctionRatioFactor({
    regionLabel: input.region,
    category: input.propertyCategory,
    ctx: JONGNO_HONGJI_STATISTICS,
    specialConditions: input.specialConditions,
    // regionMedianOverride 미제공 → SIDO 12M 66.9% 자동 선택
  })

  const recovery = buildRecoveryPrediction({ ltv, region, auction })

  // 사용자 정책 v3 (2026-05-06): 서울 토지 3개월 평균 68.2% 적용 (특별시도 범위)
  //   감정가 대비 68.2%       → 4,550,996,912 원   ← 선택 (대지 기준 로직)
  //   최저입찰가 대비 113.7%  → minBid 4,003,809,600 (3차 60%) × 1.137 ≈ 같은 expected
  //   AI 시세 대비 60.8%      → 7,490,203,000 × 0.608 ≈ 4,553,963,424
  const computedExpectedBid = computeExpectedBid({
    appraisalValue: appraisal,
    minBidPrice: input.minBidPrice,
    currentMarketValue: input.currentMarketValue,
    auction,
    ctx: JONGNO_HONGJI_STATISTICS,
  })
  const JONGNO_PRIMARY_BID_RATIO = 0.682                              // 서울 전체 토지 3개월 평균
  const JONGNO_PRIMARY_BID_PRICE = Math.round(appraisal * JONGNO_PRIMARY_BID_RATIO) // 4,550,996,912
  const expectedBid = {
    ...computedExpectedBid,
    appraisal: {
      ...computedExpectedBid.appraisal,
      ratioPercent: 68.2,
      expectedBidPrice: JONGNO_PRIMARY_BID_PRICE,
      note: '대지 기준 예상 낙찰가 산정 로직 · 서울 전체 토지 3개월 평균 68.2% · 추천값',
    },
    minBid: {
      ...computedExpectedBid.minBid,
      // 3회차 시작가 = 감정가 × 0.6 (회차당 −20%p × 2회 유찰)
      //   종로: 6,673,016,000 × 0.60 = 4,003,809,600 원
      //   bid / minBid = 4,550,996,912 / 4,003,809,600 ≈ 113.7%
      baselineAmount: Math.round(appraisal * 0.60),
      ratioPercent: Math.round((JONGNO_PRIMARY_BID_PRICE / Math.round(appraisal * 0.60)) * 1000) / 10,
      expectedBidPrice: JONGNO_PRIMARY_BID_PRICE,
      note: '최저입찰가(3회차 시작가 = 감정가 60%) 대비 약 113.7% — 2회 유찰 후 회복 시나리오',
    },
    market: {
      ...computedExpectedBid.market,
      baselineAmount: aiMarket,
      ratioPercent: Math.round((JONGNO_PRIMARY_BID_PRICE / aiMarket) * 1000) / 10,
      expectedBidPrice: JONGNO_PRIMARY_BID_PRICE,
      note: `AI 시세 ${(aiMarket / 100_000_000).toFixed(2)}억 대비 약 60.8% — 인근 1km 실거래 ${JONGNO_HONGJI_COMPARABLES.length}건 기반 (감정가 대비 안정)`,
    },
    recommendedBidPrice: JONGNO_PRIMARY_BID_PRICE,
    narrative:
      `대지 기준 예상 낙찰가 산정 로직 적용 결과, '감정가 대비 낙찰가율 68.2%' 기반 ` +
      `예상낙찰가 ${JONGNO_PRIMARY_BID_PRICE.toLocaleString('ko-KR')}원을 추천합니다. ` +
      `최저입찰가(3회차 60%) 대비 약 113.7%, ` +
      `AI 시세(${aiMarket.toLocaleString('ko-KR')}원) 대비 약 60.8% 수준입니다.`,
  }
  const recommendedBidPrice = expectedBid.recommendedBidPrice

  // 등기부 분석 — 1순위 농협 23.64억, 후순위 없음
  const registryAnalysis = buildRegistryAnalysis({
    claimAmount: totalBond,
    bidPrice: JONGNO_PRIMARY_BID_PRICE,          // 감정가 × 68.2% = 45.51억 (사용자 정책 v3)
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

  // 수익성 분석 — 매각 기준에 따라 매입가 base 결정 (사용자 정책).
  //   discountBasis / acquisitionBase / saleDiscountRate 는 위에서 이미 선언됨.
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
    /* 채권 정보 분리 (사용자 정책 2026-04-28):
       · loanPrincipal           = 실 대출원금 (16.48억) — 카드/표시용
       · initialPrincipal        = 최초 대출원금 (17억) — 수익권 base
       · acquisitionBaseAmount   = 매입 base (잔액 매각이면 채권잔액 17.29억)
       · acquisitionBaseLabel    = '채권잔액' or '대출원금'
       매입가  = acquisitionBaseAmount × (1 − discountRate)
       채권최고액 = initialPrincipal × maxBondMultiplier (= 17 × 1.4 = 23.8억) */
    loanPrincipal,                                         // 실 대출원금 16.48억
    initialPrincipal: JONGNO_HONGJI_DETAIL.initial_principal,  // 최초 대출원금 17억
    acquisitionBaseAmount: acquisitionBase,                 // 매입가 base = 17.29억 (잔액)
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
    expectedBidRatio: 0.682,    // 사용자 정책 v3: 서울 전체 토지 3개월 평균 68.2% (특별시도 범위)
    expectedBidRatioPeriod: '서울 전체 토지 3개월 평균 (특별시도 범위)',
    // 회차당 유찰 할인율 (default 20%p) — 통계 매핑 가능 (지역/법원별)
    auctionFailureDiscountPct: 20,
    // 선순위 채권 우선변제 — 1순위 농협 근저당 채권최고액 23.64억
    seniorClaimAmount: seniorClaim,                // 2,364,000,000
    seniorCreditorLabel: '농협은행 1순위 근저당',
    // 사용자 정책 v3.8 (2026-05-06): 3단계 전략은 매입가(할인율 반영) ±5% 대칭
    //   종로: discount 0% → 매입가 = 채권잔액 17.29억 (= totalBond) = bankSalePrice
    //   보수적 16.43억 (×0.95) / 권고 17.29억 (×1.0) / 공격적 18.16억 (×1.05)
    bankSalePrice: acquisitionBase,
    auctionStartDate: '2026-08-15',  // 매각 후 미수회수 시 경매 시작 가정
    courtName: '서울중앙지방법원 본원',
    // 일정 lock (2026-05-03 / v2 2026-05-06 — 핵심 공식 기반):
    //   예상 매각기일 = 경매개시 + 315일 + 유찰 × 28일 (사용자 정책)
    //   1회차 매각 통계: 서울중앙지법 본원 종로구 토지 = 315일 (courtSchedule.stages[0].saleDays)
    //   firstSaleDateOverride 제거 → engine 자동 산출 (315일 cumulative)
    //   sample-roi API 는 computeEffectiveFirstSaleDate 가 (round-1)×28 시프트 적용
    purchaseDateOverride: '2026-05-15',         // asOfDate(2026-04-28) + 17일
    balancePaymentDateOverride: '2026-06-15',   // 매입일 + 31일
    courtFirstRoundSaleDays: JONGNO_HONGJI_STATISTICS.courtSchedule?.stages[0]?.saleDays ?? 315,
    ...(opts?.firstSaleDateOverride ? { firstSaleDateOverride: opts.firstSaleDateOverride } : {}),
    discountRate: saleDiscountRate,           // 0 (= 100% 매입)
    pledgeLoanRatio: 0.75,         // 개인 채무자 75% (법인 70%)
    pledgeInterestRate: 0.065,     // 6.5%
    executionCost: 10_000_000,     // 경매비용 1,000만원 기준 (사용자 정책)
    /* 수익권금액 = 23.8억 (사용자 제공 실측).
       사용자 정책: 수익권 base = 최초 대출원금 (17억) → 23.8 / 17.0 = 1.40 (140%) */
    maxBondMultiplier: JONGNO_HONGJI_DETAIL.beneficial_amount / JONGNO_HONGJI_DETAIL.initial_principal,
    registrationTransferRate: 0.0048,
    // 사용자 정책 (2026-05-03): NPL 거래수수료 1.5% (엔진 기본값과 동일).
    //   ※ 보고서 페이지 ProfitabilitySections 의 LIVE recompute 가 EditableInputs
    //     에 brokerageFeeRate 를 보관하지 않아 엔진 기본값(0.015)을 사용 →
    //     builder 가 0.012 를 주입하면 sample-roi API ↔ 보고서 페이지 값이
    //     1.5억 매입가 × 0.3%p 차이 = 약 5M 만큼 totalEquity 가 다르게 산출됨.
    //     양쪽 정합을 위해 builder 도 0.015 로 통일.
    brokerageFeeRate: 0.015,
    contractDepositRate: 0.10,
    asOfDate: '2026-04-28',
    mcSeed: 20260423,
    mcTrials: 10_000,
    sensitivityPurchaseRateAxis: [1.00, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70],
    sensitivityBidRatioAxis:     [0.55, 0.60, 0.65, 0.682, 0.72, 0.78, 0.85],
    evidence: {
      bidRatioStats: {
        // 사용자 정책 v3 (2026-05-06): 서울 전체 토지 3개월 평균 68.2% 적용 (특별시도 범위)
        //   회차당 유찰 할인율 20%p (default · 통계 매핑 가능) → 68.2% < 80% < 100% → 3회차 예상
        selectedLabel: '서울 전체 토지 · 3개월',
        items: [
          { scope: 'SIDO',    region: '서울',     periodMonths: 12, ratioPercent: 66.9, sampleSize: 12 },
          { scope: 'SIDO',    region: '서울',     periodMonths: 6,  ratioPercent: 59.3, sampleSize: 7  },
          { scope: 'SIDO',    region: '서울',     periodMonths: 3,  ratioPercent: 68.2, sampleSize: 2  },
          { scope: 'SIGUNGU', region: '종로구',   periodMonths: 12, ratioPercent: 70.5, sampleSize: 98 },
          { scope: 'SIGUNGU', region: '종로구',   periodMonths: 6,  ratioPercent: 70.8, sampleSize: 63 },
          { scope: 'SIGUNGU', region: '종로구',   periodMonths: 3,  ratioPercent: 71.4, sampleSize: 33 },
          { scope: 'SIGUNGU', region: '종로구',   periodMonths: 1,  ratioPercent: 70.7, sampleSize: 14 },
        ],
        narrative:
          '서울 전체 토지 3개월 평균 68.2% (특별시도 범위) 적용. 종로구 시·군·구 통계 (1년 70.5% → 6개월 70.8% → 3개월 71.4%) ' +
          '대비 보수적 기준선. 회차당 유찰 할인율 20%p (default) → 68.2% < 80%(2차) → 3회차 예상 매각. ' +
          '예상낙찰가 = 감정가 66.73억 × 68.2% = 45.51억 → 채권잔액 17.29억 대비 회수율 약 263%.',
      },
      // 사용자 정책 (2026-05-06 v2):
      //   avgSaleDays = 1회차 매각결정기일 평균 (법원/주소지별 통계 매핑 예정)
      //   avgDistributionDays = 배당기일 평균 (잔금 후 배당까지 소요)
      //   avgHearingInterval = 28일 (회차당 평균 유찰 + 매각기일 간격)
      courtSchedule: {
        courtName: '서울중앙지방법원 본원',
        avgSaleDays: 315,                  // 1회차 매각결정기일 평균 (개발자 연동 예정)
        avgDistributionDays: 70,           // 배당기일 평균 (잔금 +30 + α)
        avgHearingInterval: 28,            // 회차 간격 28일
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

  // 사용자 정책 v3.4 (2026-05-06): investmentRoi (투입자금 ROI) 기준
  const verdictResult = computeInvestmentVerdict({
    predictedRecoveryRate: recovery.predictedRecoveryRate,
    riskScore,
    investmentRoi,
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
        `ROI ${(investmentRoi * 100).toFixed(2)}% · 예측회수율 ${recovery.predictedRecoveryRate}%`,
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
            '12.2% 상향. 본 사례에서는 서울 전체 토지 3개월 평균 68.2% 낙찰가율(특별시도 범위) 적용으로 보수적 회수액 산출.',
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
            '예상낙찰가 45.51억 기준 1순위 변제 후 잔여 21.87억 → NPL 매수자 회수 충분.',
          evidence: '등기부 분석 — 1순위 농협, 후순위 0건',
          confidence: 98,
        },
        {
          id: 'JN-004',
          category: 'PRICE',
          severity: 'INFO',
          title: '서울/종로구 토지 낙찰가율 60-70%대 안정 흐름',
          description:
            '서울 전체 토지 3개월 평균 68.2% (적용 기준선, 특별시도 범위) · 종로구 시·군·구 1년 70.5% → 3개월 71.4% → 1개월 70.7% ' +
            '70%대 초반 안정. 회차당 −20%p 기준 → 68.2% < 80% < 100% → 3회차 예상 매각.',
          evidence: '서울 토지 3개월 2건 / 종로구 1년 98건 / 6개월 63건 / 3개월 33건 / 1개월 14건',
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
        label: 'AI 권고 입찰가 (감정가 대비 68.2%)',
        bidPrice: JONGNO_PRIMARY_BID_PRICE,
        bidRatioPercent: 68.2,
        expectedNetProfit: JONGNO_PRIMARY_BID_PRICE - totalBond,
        expectedRoi: Math.round((JONGNO_PRIMARY_BID_PRICE - totalBond) / totalBond * 100 * 10) / 10,
        expectedIrr: 32.8,
        winProbability: 0.62,
        rationale: '서울 전체 토지 3개월 평균 68.2% (특별시도 범위 · 회차당 −20%p → 3회차 예상). 회수율 263%',
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
        '서울 전체 토지 3개월 평균 68.2% (특별시도 범위 · 적용 기준선) · 종로구 시·군·구 1년 70.5% → 3개월 71.4% 안정. ' +
        `인근 1km 실거래 (1년 이내 4건) 평균 단가 ${Math.round(JONGNO_HONGJI_COMPARABLES_SUMMARY.avgPerLandPriceKRWm2 / 10000).toLocaleString()}만원/㎡ — 28.83억 평균 거래액으로 견고. ` +
        '북악산·인왕산 자락 자연환경 + 도심 접근성 양호 → 단독·다세대 / 카페·사옥 부지 수요 견조. ' +
        '제1종일반주거지역 건축 한도 내에서 개발 잠재력 보유. ' +
        '단 인근 3km 경매 사례 (구기동 28%·38.5% 평균 33.25%)는 변두리 대형 토지로 본 매물(홍지동 1.7억 채권잔액 NPL)과 입지·규모 차이가 커 직접 비교는 신중 권고.',
      indicators: [
        { label: '지역 6개월 낙찰가율',
          value: `${region.auctionMomentum > 0 ? '+' : ''}${region.auctionMomentum}%p vs 1년`,
          trend: region.auctionMomentum > 0 ? 'UP' : region.auctionMomentum < 0 ? 'DOWN' : 'FLAT',
          commentary: '종로구 토지 낙찰가율 안정' },
        { label: '인근 1km 실거래',
          value: `${JONGNO_HONGJI_COMPARABLES.length}건/1년`,
          trend: 'UP',
          commentary: '홍지동·부암동 권역 (사용자 제공 통계)' },
        { label: '법원 1회차 매각결정기일',
          value: `${JONGNO_HONGJI_STATISTICS.courtSchedule?.stages[0]?.saleDays ?? auction.expectedSaleDays ?? '—'}일`,
          trend: 'FLAT',
          commentary: '서울중앙지방법원 본원 종로구 토지 평균 (사용자 제공)' },
      ],
    },
    registryAnalysis,
    profitability,
    // AI 총평 v3 (사용자 정책 2026-05-06 통계 reflow):
    //   · 낙찰가율 68.2% (서울 토지 3개월 SIDO) · 회차당 −20%p · 3회차 예상 매각
    //   · 1회차 매각결정기일 평균 315일 (서울중앙지법 종로 토지 통계)
    //   · 인근 1km 실거래 (1년 이내 4건) 평균 28.83억 / 624만원/㎡
    //   · 인근 3km 경매 사례 (3년 이내 2건 — 구기동) 평균 33.25%
    //   · 동일주소 사례 없음 (해당 기간/범위)
    //   · 배당 cascade: 낙찰가 45.51억 → 경매비용 0.10억 → 농협 23.64억 → NPL 21.77억 → 1질권 12.97억 / 2질권 8.80억
    executiveSummary:
      `종로구 홍지동 토지 8필지 일괄매각 NPL (○○대부 대출원금 16.48억 · 채권잔액 17.29억 · ` +
      `1순위 농협 채권최고액 23.64억 · 권리관계 합계(원금+선순위) 40.12억 · 감정가 66.73억) ` +
      `종합 분석 결과 ${riskGrade}등급, LTV ${(ltvNumerator / appraisal * 100).toFixed(2)}% ` +
      `(채권최고액+대출원금 합산 기준), ` +
      `예측 회수율 ${recovery.predictedRecoveryRate}% (신뢰도 ${Math.round(recovery.confidence * 100)}%). ` +
      `매입가 ${Math.round(bankSalePrice / 100_000_000 * 10) / 10}억 (= 채권잔액 100% 매각) 기준 ` +
      `보수적/권고/공격적 시나리오 ROI ${(profitability.strategies.conservative.roi * 100).toFixed(1)}% / ${(profitability.strategies.recommended.roi * 100).toFixed(1)}% / ${(profitability.strategies.aggressive.roi * 100).toFixed(1)}%. ` +
      `서울 전체 토지 3개월 평균 낙찰가율 68.2% (특별시도 범위 · 회차당 −20%p 기준 3회차 예상) ` +
      `적용 시 예상낙찰가 ${Math.round(JONGNO_PRIMARY_BID_PRICE / 100_000_000 * 100) / 100}억 → ` +
      `경매비용 0.1억 차감 → 1순위 농협 23.64억 우선 변제 → NPL 측 ${Math.round((JONGNO_PRIMARY_BID_PRICE - 2_364_000_000 - 10_000_000) / 100_000_000 * 100) / 100}억 ` +
      `(NPL 채권잔액 대비 ${((JONGNO_PRIMARY_BID_PRICE - 2_364_000_000 - 10_000_000) / totalBond * 100).toFixed(1)}%) → ` +
      `1질권자(질권대출기관) 약 12.97억 변제 후 2질권자(투자자 회수) 약 ${Math.round((JONGNO_PRIMARY_BID_PRICE - 2_364_000_000 - 10_000_000 - 1_296_989_594) / 100_000_000 * 100) / 100}억. ` +
      `2순위 권리자 부재로 권리 깨끗, 8필지 일괄매각 시너지 + 인근 1km 실거래 (1년 이내 4건) 평균 m²당 ` +
      `${Math.round(JONGNO_HONGJI_COMPARABLES_SUMMARY.avgPerLandPriceKRWm2 / 10000)}만원 / 28.83억 거래액 견고. ` +
      `인근 3km 경매 사례 (3년 이내 2건, 구기동 평균 33.25%)는 변두리 대형 토지로 본 매물과 입지 차이 — 직접 비교 신중. ` +
      `AI 투자 의견 종합 ${verdictScore}점 → ${verdict}.`,
  }

  return report
}
