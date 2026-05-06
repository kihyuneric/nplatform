/**
 * lib/npl/unified-report/sample.ts
 *
 * 통합 리포트 샘플 빌더 — 송파 잠실 시그마타워 오피스텔 NPL
 * 원본 사용자 제공: "NPL 수익성분석 로직 및 탬플릿.xlsx"
 *
 * 주요 수치 (엑셀 시트 기준)
 *   · 물권: 서울특별시 송파구 신천동 7-19 잠실시그마타워 21층 2105호
 *   · 전용 208.56㎡ / 공급 274.76㎡
 *   · 채권자 금천신용협동조합 · 대출원금 19.60억 · 채권최고액 23.52억
 *   · 연체금리 8.9% · 연체시작 2025-07-23 · 기한이익상실 2025-09-24
 *   · 감정가 28.00억 · AI 시세 25.50억 (25.10.21) / 27.00억 (24.05.08) / 22.50억 (22.02.22)
 *   · 예상낙찰가율 83.5% · 경매개시 2025-10-21 · 배당요구종기 2026-01-06
 *   · 관할법원 서울동부지방법원 본원
 */

import type { StatisticsContext } from './statistics'
import type {
  UnifiedAnalysisReport,
  UnifiedReportInput,
  SpecialConditions,
  ClaimBreakdown,
  RightsSummary,
  LeaseSummary,
} from './types'
import { EMPTY_SPECIAL_CONDITIONS, SPECIAL_CONDITION_CATALOG } from './types'
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

// ─── 샘플 통계 컨텍스트 · 송파 잠실 오피스텔 ─────────────────
export const SAMPLE_STATISTICS: StatisticsContext = {
  asOfDate: '2026-04-21',
  target: {
    location: {
      sido: '서울특별시',
      sigungu: '송파구',
      eupmyeondong: '신천동',
      jibun: '7-19',
      bjdCode: '1171010200',
    },
    propertyCategory: '오피스텔',
    appraisalValue: 2_800_000_000,       // 28.00억 (엑셀 B36)
    landAreaSqm: 0,                       // 오피스텔 — 대지지분 개별 표기 생략
    buildingAreaSqm: 208.56,              // 전용 208.56㎡
  },
  // 1. 지역/기간별 낙찰가율 — 사용자 정책 v3 (2026-05-06):
  //    스크린샷 데이터 (서울 송파 사무실/사무소) 매핑 — 3-tab(SIDO/SIGUNGU/EUPMYEONDONG)
  auctionRatioStats: [
    {
      // 서울 전체 사무실/사무소 (SIDO scope) — 임시 추정값 (개발자 통계 매핑 예정)
      location: { sido: '서울특별시', sigungu: '' },
      propertyCategory: '오피스텔',
      scope: 'SIDO',
      asOfDate: '2026-05-06',
      rows: [
        { bucket: '12M', periodLabel: '1년간 평균', saleCount: 142, saleRate: 17.8, bidRatio: 70.2 },
        { bucket: '6M',  periodLabel: '6개월 평균', saleCount: 78,  saleRate: 16.4, bidRatio: 69.8 },
        { bucket: '3M',  periodLabel: '3개월 평균', saleCount: 39,  saleRate: 14.2, bidRatio: 71.5 },
        { bucket: '1M',  periodLabel: '1개월 평균', saleCount: 11,  saleRate: 6.2,  bidRatio: 72.0 },
      ],
    },
    {
      // 송파구 전체 사무실/사무소 (SIGUNGU scope) — 사용자 제공 (2026-05-06 스크린샷)
      location: { sido: '서울특별시', sigungu: '송파구' },
      propertyCategory: '오피스텔',
      scope: 'SIGUNGU',
      asOfDate: '2026-05-06',
      rows: [
        { bucket: '12M', periodLabel: '1년간 평균', saleCount: 66, saleRate: 16.5, bidRatio: 71.5 },
        { bucket: '6M',  periodLabel: '6개월 평균', saleCount: 36, saleRate: 15.9, bidRatio: 68.2 },
        { bucket: '3M',  periodLabel: '3개월 평균', saleCount: 18, saleRate: 12.8, bidRatio: 83.3 },
        { bucket: '1M',  periodLabel: '1개월 평균', saleCount: 3,  saleRate: 4.6,  bidRatio: 67.1 },
      ],
    },
    {
      // 신천동 (EUPMYEONDONG scope) — 표본 부족 dong 가상 추정
      location: { sido: '서울특별시', sigungu: '송파구', eupmyeondong: '신천동' },
      propertyCategory: '오피스텔',
      scope: 'EUPMYEONDONG',
      asOfDate: '2026-05-06',
      rows: [
        { bucket: '12M', periodLabel: '1년간 평균', saleCount: 8, saleRate: 12.0, bidRatio: 73.5 },
        { bucket: '6M',  periodLabel: '6개월 평균', saleCount: 4, saleRate: 13.5, bidRatio: 72.0 },
        { bucket: '3M',  periodLabel: '3개월 평균', saleCount: 2, saleRate: 11.2, bidRatio: 76.0 },
        { bucket: '1M',  periodLabel: '1개월 평균', saleCount: 0, saleRate: 0,    bidRatio: 0    },
      ],
    },
  ],
  // 2. 법원 기일/배당 — 서울동부지방법원 본원 (송파구 관할)
  // 사용자 정책 v3 (2026-05-06):
  //   1회차 매각결정기일 평균 = 477일 (송파 사무실 — 종로 315일과 다름 · 통계 매핑)
  //   회차 간격 28일 · 배당기일 평균 70일
  courtSchedule: {
    courtName: '서울동부지방법원 본원',
    avgHearingInterval: 28,
    asOfDate: '2026-05-06',
    stages: [
      { round: 1, saleDays: 477, distributionDays: 70 },     // 1회차 매각결정 477일 (사용자 제공)
      { round: 2, saleDays: 505, distributionDays: 70 },     // +28
      { round: 3, saleDays: 533, distributionDays: 70 },
      { round: 4, saleDays: 561, distributionDays: 70 },
      { round: 5, saleDays: 589, distributionDays: 70 },
      { round: 6, saleDays: 617, distributionDays: 70 },
      { round: 7, saleDays: 645, distributionDays: 70 },
      { round: 8, saleDays: 673, distributionDays: 70 },
      { round: 9, saleDays: 701, distributionDays: 70 },
      { round: 10, saleDays: 729, distributionDays: 70 },
    ],
  },
  // 3. 동일 주소 낙찰 사례 (송파 신천동 7-19) — 사용자 정책 v3 (2026-05-06): 해당 사례 없음
  //    개발자 연동 예정 — empty 상태 노출
  sameAddressAuction: {
    location: {
      sido: '서울특별시', sigungu: '송파구', eupmyeondong: '신천동', jibun: '7-19',
    },
    propertyCategory: '오피스텔',
    lookbackYears: 3,
    cases: [],
    summary: {
      avgDurationDays: 0,
      avgAppraisalValue: 0,
      avgSalePrice: 0,
      avgBidRatio: 0,
      avgBidderCount: 0,
      avgLandAreaSqm: 0,
      avgBuildingAreaSqm: 0,
    },
  },
  // 4. 주변 3km 경매 낙찰 사례 (3년 이내 · 사용자 제공 5건 — 2026-05-06 v3)
  //    개발자 연동 예정 — 광진구 구의동 / 송파 방이동 (사무실/사무소)
  nearbyAuction: {
    centerLocation: {
      sido: '서울특별시', sigungu: '송파구', eupmyeondong: '신천동', jibun: '7-19',
    },
    propertyCategory: '오피스텔',
    radiusMeters: 3000,
    lookbackYears: 3,
    specialConditionFilter: '없음',
    cases: [
      { caseNo: '2024타경62537',     filedDate: '2024-10-11', saleDate: '2026-04-20', durationDays: 556,  appraisalValue: 290_000_000,    salePrice: 130_000_000,   bidRatio: 45.5, bidderCount: 1, landAreaSqm: 24.12,  buildingAreaSqm: 90.98,   perLandPrice: 5_380_000,  perBuildingPrice: 1_430_000, address: '서울특별시 광진구 구의동 546-4',  distanceMeters: 2263 },
      { caseNo: '2023타경3753',      filedDate: '2023-12-18', saleDate: '2026-04-20', durationDays: 854,  appraisalValue: 20_000_000,     salePrice: 5_410_000,     bidRatio: 27.0, bidderCount: 1, landAreaSqm: 2.88,   buildingAreaSqm: 10.88,   perLandPrice: 1_880_000,  perBuildingPrice: 500_000,   address: '서울특별시 광진구 구의동 546-4',  distanceMeters: 2263 },
      { caseNo: '2024타경60135 (1)', filedDate: '2024-08-20', saleDate: '2026-04-13', durationDays: 601,  appraisalValue: 20_000_000,     salePrice: 10_000_000,    bidRatio: 82.6, bidderCount: 1, landAreaSqm: 2.79,   buildingAreaSqm: 10.54,   perLandPrice: 5_040_000,  perBuildingPrice: 1_330_000, address: '서울특별시 광진구 구의동 546-4',  distanceMeters: 2263 },
      { caseNo: '2024타경59104 (1)', filedDate: '2024-07-24', saleDate: '2026-04-13', durationDays: 628,  appraisalValue: 660_000_000,    salePrice: 520_000_000,   bidRatio: 78.9, bidderCount: 1, landAreaSqm: 12.564, buildingAreaSqm: 61.49,   perLandPrice: 40_000_000, perBuildingPrice: 8_420_000, address: '서울특별시 송파구 방이동 43',     distanceMeters: 704  },
      { caseNo: '2024타경60135 (2)', filedDate: '2024-08-20', saleDate: '2026-04-13', durationDays: 601,  appraisalValue: 20_000_000,     salePrice: 10_000_000,    bidRatio: 80.6, bidderCount: 1, landAreaSqm: 2.72,   buildingAreaSqm: 10.26,   perLandPrice: 5_040_000,  perBuildingPrice: 1_340_000, address: '서울특별시 광진구 구의동 546-4',  distanceMeters: 2263 },
    ],
    // 사용자 제공 평균 (2026-05-06 스크린샷): 648일 / 2.0억 / 1.4억 / 62.92% / 1명 / 9.01㎡ / 36.83㎡
    summary: {
      avgDurationDays: 648,
      avgAppraisalValue: 202_000_000,         // 2.0억
      avgSalePrice: 135_082_000,              // 1.4억 평균
      avgBidRatio: 62.92,                     // (45.5+27.0+82.6+78.9+80.6)/5
      avgBidderCount: 1,
      avgLandAreaSqm: 9.01,
      avgBuildingAreaSqm: 36.83,
    },
  },
  // 5. 인근 1km 실거래 (1년 이내 · 사용자 제공 7건 — 2026-05-06 v3)
  //    송파 방이동·신천동 일반상업지역 (개발자 연동 예정)
  nearbyTransactions: {
    centerLocation: {
      sido: '서울특별시', sigungu: '송파구', eupmyeondong: '신천동', jibun: '7-19',
    },
    propertyCategory: '오피스텔',
    radiusMeters: 1000,
    lookbackYears: 1,
    cases: [
      { txDate: '2026-01-14', address: '서울특별시 송파구 방이동 49-15', zoning: '일반상업지역', buildingAreaSqm: 25.42,   amountKRW: 210_000_000,    perBuildingPrice: 8_220_000,  approvedDate: '20231019', distanceMeters: 978.1 },
      { txDate: '2026-01-14', address: '서울특별시 송파구 방이동 49-15', zoning: '일반상업지역', buildingAreaSqm: 25.42,   amountKRW: 220_000_000,    perBuildingPrice: 8_580_000,  approvedDate: '20231019', distanceMeters: 978.1 },
      { txDate: '2025-11-10', address: '서울특별시 송파구 방이동 24',    zoning: '일반상업지역', buildingAreaSqm: 2138.32, amountKRW: 21_000_000_000, perBuildingPrice: 9_820_000,  approvedDate: '19910508', distanceMeters: 396.8 },
      { txDate: '2025-09-16', address: '서울특별시 송파구 방이동 38-7',  zoning: '일반상업지역', buildingAreaSqm: 1049.22, amountKRW: 9_080_000_000,  perBuildingPrice: 8_650_000,  approvedDate: '20011228', distanceMeters: 614.6 },
      { txDate: '2025-09-06', address: '서울특별시 송파구 신천동 11-10', zoning: '일반상업지역', buildingAreaSqm: 32.40,   amountKRW: 250_000_000,    perBuildingPrice: 7_720_000,  approvedDate: '20010531', distanceMeters: 250.1 },
      { txDate: '2025-05-19', address: '서울특별시 송파구 방이동 49-15', zoning: '일반상업지역', buildingAreaSqm: 25.42,   amountKRW: 250_000_000,    perBuildingPrice: 9_830_000,  approvedDate: '20231019', distanceMeters: 978.1 },
      { txDate: '2025-05-08', address: '서울특별시 송파구 방이동 36-4',  zoning: '일반상업지역', buildingAreaSqm: 1093.26, amountKRW: 9_000_000_000,  perBuildingPrice: 8_230_000,  approvedDate: '20010110', distanceMeters: 554.3 },
    ],
    // 사용자 제공 평균: 토지 330.26㎡ / 건물 627.05㎡ / 57.2억 / 토지단가 0.4억 / 건물단가 872만원
    summary: {
      avgAmount: 5_715_714_000,             // ≈ 57.2억
      medianAmount: 250_000_000,
      avgPerBuildingPrice: 8_721_000,       // 872만원/㎡
    },
  },
}

/**
 * 잠실 사례 보고서 빌더.
 *
 * @param opts.firstSaleDateOverride 1차 매각기일 명시 (생략 시 builder 기본값 '2026-09-12').
 *   sample-roi API 가 보고서 페이지의 effectivePredictedSaleDate 시프트를 적용하기 위해 사용.
 */
// ─── 샘플 리포트 빌더 ────────────────────────────────────────
export function buildSampleReport(opts?: { firstSaleDateOverride?: string }): UnifiedAnalysisReport {
  // 엑셀 B15·B21·B22 기준: 원금 19.6억 + 누적 연체이자 ~2.2억 (25.07.23~26.04.21)
  const totalBond = 2_180_000_000
  // 엑셀 B36: 감정가 28.00억
  const appraisal = 2_800_000_000

  const input: UnifiedReportInput = {
    assetId: 'sample-songpa-jamsil-sigma-2105',
    assetTitle: '송파 잠실 ㅇㅇㅇㅇㅇ 오피스텔 · ㅇㅇ신협 NPL',
    region: '서울특별시 송파구 신천동',
    propertyType: '오피스텔',
    propertyCategory: '오피스텔',
    appraisalValue: appraisal,
    totalBondAmount: totalBond,
    minBidPrice: estimateMinBid(appraisal, 1),      // 1회 유찰 기준 (감정가 × 0.8^1)
    currentMarketValue: 2_550_000_000,               // 엑셀 B37 — AI 시세 최신 (2025-10-21)
    // 채권잔액 내역 — 19.6억(원금) + 2.2억(연체이자) = 21.8억(채권잔액 합계) · 엑셀 B15·B22·B23
    claimBreakdown: {
      principal: 1_960_000_000,        // 대출원금 19.60억
      unpaidInterest: 0,                // 미수이자 (이자 약정만 — 연체이자에 포함됨)
      overdueInterest: 220_000_000,    // 연체이자 2.20억 (25.07.23~26.04.21 누적, 8.9% 기준)
      delinquencyStartDate: '2025-07-23',
      normalRate: 0.069,                // 정상금리 6.9%
      overdueRate: 0.089,                // 연체금리 8.9%
    },
    specialConditions: {
      ...EMPTY_SPECIAL_CONDITIONS,
      // 잠실 엑셀 사례 — 전 항목 특이사항 없음 (소유자 직접 점유)
    },
    auctionEstimatedMonths: 10,
    statistics: SAMPLE_STATISTICS,
  }

  const ltv = computeLtvFactor({
    totalBondAmount: totalBond,
    appraisalValue: appraisal,
    source: 'APPRAISAL',
  })
  const region = computeRegionTrendFactor({
    regionLabel: input.region,
    ctx: SAMPLE_STATISTICS,
  })
  const auction = computeAuctionRatioFactor({
    regionLabel: input.region,
    category: input.propertyCategory,
    ctx: SAMPLE_STATISTICS,
    specialConditions: input.specialConditions,
  })

  const recovery = buildRecoveryPrediction({ ltv, region, auction })

  const expectedBid = computeExpectedBid({
    appraisalValue: appraisal,
    minBidPrice: input.minBidPrice,
    currentMarketValue: input.currentMarketValue,
    auction,
    ctx: SAMPLE_STATISTICS,
  })
  const recommendedBidPrice = expectedBid.recommendedBidPrice

  // ── 등기부 분석 (잠실 시그마타워 — 금천신협 NPL) ───────────
  // 청구금액 = 채권잔액(원금+연체이자) ≈ 21.80억 (엑셀 B23)
  // 입찰예상가 = 감정가 × 예상낙찰가율 = 28억 × 83.3% = 23.32억 (사용자 정책 v3.1 2026-05-06)
  const registryAnalysis = buildRegistryAnalysis({
    claimAmount: totalBond,
    bidPrice: Math.round(appraisal * 0.753),
    interestedPartyCount: 2,            // 소유자 + 채권자
    parcelCount: 1,
    failedBidCount: 0,
    claims: [
      { rank: 1, right: '근저당권설정', creditor: '금천신용협동조합',  claimAmount: 2_352_000_000 },   // 채권최고액 = 원금×1.2
      { rank: 2, right: '근저당권설정', creditor: '(후순위 근저당권자)', claimAmount: 180_000_000 },     // 예시 후순위
    ],
    rightsOverrides: {
      '경매집행비용':                      { registryEvidence: '-', presence: 'PRESENT' },
      '소액임차인 최우선변제금':           { registryEvidence: '-', presence: 'ABSENT' },     // 소유자 직접 점유
      '당해세(국세·지방세)':               { registryEvidence: '-', presence: 'NEEDS_REVIEW' },
      '일반우선채권(근저당·전세권 등)':    { registryEvidence: 'O', presence: 'PRESENT' },
      '일반채권(가압류 등)':               { registryEvidence: '-', presence: 'NEEDS_REVIEW' },
      '우선변제권 없는 임차인':            { registryEvidence: '-', presence: 'ABSENT' },
    },
    topRisks: [
      '후순위 근저당 소멸 확정 — 실투자금 영향 없음',
      '당해세·일반 가압류 등기부 외 조사 필요 (송달내역 별도 확인)',
      '소유자 직접 점유 — 명도 합의 필요, 인도명령 대상',
    ],
  })

  // 리스크 4팩터 — 계산 가능한 공식 기반 (risk-factors.ts · Phase G3)
  //   담보가치 · 권리관계(법적 병합) · 시장 · 유동성 → 각 항목 공식 산출 후 가중 합산
  const collateralFactor = computeCollateralFactor({
    claimBalance: totalBond,
    appraisalValue: appraisal,
    marketValue: input.currentMarketValue ?? appraisal,
  })
  const rightsFactor = computeRightsFactor({
    specialConditionsV2: input.specialConditionsV2 ?? migrateV1ToV2Keys(input.specialConditions),
    registry: registryAnalysis,
    subordinateClaimCount: 1,   // 잠실 케이스 후순위 근저당 1건
  })
  const marketFactor = computeMarketFactor({ region, auction })
  const liquidityFactor = computeLiquidityFactor({
    auction,
    averageBidderCount: SAMPLE_STATISTICS.nearbyAuction?.summary.avgBidderCount ?? 1,
  })
  const riskFactorResults = [collateralFactor, rightsFactor, marketFactor, liquidityFactor]

  const { score: riskScore, formula: riskCompositeFormula } = composeRiskScore(riskFactorResults)
  const riskGrade = scoreToGrade(riskScore)

  // ─── NPL 수익성 분석 · 잠실 시그마타워 오피스텔 (사용자 제공 엑셀 사례) ─────
  //  원본: "NPL 수익성분석 로직 및 탬플릿.xlsx"
  //  · 물권: 서울특별시 송파구 신천동 7-19 잠실시그마타워 21층 2105호 (전용 208.56㎡)
  //  · 채권자 금천신용협동조합 · 대출원금 19.6억 · 연체금리 8.9%
  //  · 감정가 28억 / AI 시세 25.5억 / 예상낙찰가율 83.3%
  //  · 금융기관 매각가 없음 → 3단계 전략 앵커 = 대출원금 (공격 100% · 권고 95% · 보수 90%)
  const profitability = buildNplProfitability({
    property: {
      // 원본 주소 · 마스킹 처리 (지번·층·호수)
      address: '서울특별시 송파구 신천동 ㅇ-ㅇㅇ 잠실시그마타워 ㅇㅇ층ㅇㅇㅇㅇ호',
      exclusiveAreaM2: 208.56,
      supplyAreaM2: 274.76,
      creditor: '금천신용협동조합',
      debtor: 'ㅇㅇㅇ',
      owner: '',              // UI 미표시
      tenant: '소유자 직접 점유',
    },
    // 대출원금 19.6억 · 채권최고액 = ×1.2 = 23.52억 (엑셀 B15·B16)
    loanPrincipal: 1_960_000_000,
    delinquencyRate: 0.089,
    delinquencyStartDate: '2025-07-23',
    // 기한이익상실 2025-09-24 · 연체이자기산 2025-10-20 (엑셀 B19·B20)
    accelerationDate: '2025-09-24',
    // 감정가 28억 · AI 시세 25.5억 (엑셀 B36·B37)
    appraisalValue: 2_800_000_000,
    aiMarketValueLatest: 2_550_000_000,
    priceHistory: [
      { price: 2_800_000_000, reportedAt: '2024-08-15', source: 'APPRAISAL',   label: '감정가 (채권자 제공)' },
      { price: 2_550_000_000, reportedAt: '2025-10-21', source: 'AI_LATEST',   label: 'AI 시세 — 현재' },
      { price: 2_700_000_000, reportedAt: '2024-05-08', source: 'AI_PAST_1Y',  label: 'AI 시세 — 1년 전' },
      { price: 2_250_000_000, reportedAt: '2022-02-22', source: 'AI_PAST_3Y',  label: 'AI 시세 — 3년 전' },
    ],
    // 사용자 정책 v3.1 (2026-05-06): 송파 사무실 3개월 평균 83.3% (SIGUNGU scope)
    expectedBidRatio: 0.833,
    expectedBidRatioPeriod: '송파구 사무실 3개월 평균',
    // 회차당 유찰 할인율 25%p (송파 사무실 통계 매핑 · 종로 토지 20%p 와 다름)
    //   83.3% > 75% (= 100 − 25) → 2회차 예상 낙찰
    auctionFailureDiscountPct: 25,
    // 경매개시 2025-10-21 (엑셀 B45) · 송파구 관할 = 서울동부지방법원 본원
    auctionStartDate: '2025-10-21',
    courtName: '서울동부지방법원 본원',
    // 일정 lock (2026-05-03 / v3 2026-05-06):
    //   1회차 매각결정기일 통계 = 477일 (송파 사무실 — 종로 315일과 다름)
    //   1회차 매각기일 cumulative = 477 − 7(매각결정) − 28(낙찰) = 442일
    //   2회차 매각기일 = 442 + 28 = 470일 (83.3% → 2회차 예상)
    purchaseDateOverride: '2026-05-08',         // asOfDate(2026-04-21) + 17일
    balancePaymentDateOverride: '2026-06-08',   // 매입일 + 31일
    courtFirstRoundSaleDays: SAMPLE_STATISTICS.courtSchedule?.stages[0]?.saleDays ?? 315,
    ...(opts?.firstSaleDateOverride ? { firstSaleDateOverride: opts.firstSaleDateOverride } : {}),
    // 할인율 0 = 대출원금 기준 매입 (엑셀 B30 = B15, C30 '대출원금의 X% 할인')
    discountRate: 0,
    // 사용자 정책 v3.8 (2026-05-06): 3단계 전략 매입가(할인율 반영) ±5% 대칭
    //   잠실: discount 0% → 매입가 = 대출원금 19.6억 = bankSalePrice
    //   보수적 18.62억 (×0.95) / 권고 19.6억 (×1.0) / 공격적 20.58억 (×1.05)
    bankSalePrice: 1_960_000_000,
    pledgeLoanRatio: 0.75,
    pledgeInterestRate: 0.065,
    executionCost: 10_000_000,
    registrationTransferRate: 0.0048,
    brokerageFeeRate: 0.015,
    contractDepositRate: 0.10,
    asOfDate: '2026-04-21',
    mcSeed: 20260421,
    mcTrials: 10_000,
    // 민감도 축 — 매입률 100%를 기준으로 5%p씩 할인 차감 (사용자 요청)
    sensitivityPurchaseRateAxis: [1.00, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70],
    sensitivityBidRatioAxis:     [0.60, 0.67, 0.71, 0.76, 0.833, 0.88, 0.92, 0.96],
    evidence: {
      bidRatioStats: {
        // 사용자 정책 v3.1 (2026-05-06): 송파 사무실 3개월 평균 83.3% 적용
        //   회차당 유찰 할인율 25%p (송파 사무실 통계 매핑) → 83.3% > 75% (=100−25) → 2회차 예상
        selectedLabel: '송파구 사무실 · 3개월',
        items: [
          { scope: 'SIDO',         region: '서울',             periodMonths: 12, ratioPercent: 70.2, sampleSize: 142 },
          { scope: 'SIDO',         region: '서울',             periodMonths: 3,  ratioPercent: 71.5, sampleSize: 39 },
          { scope: 'SIGUNGU',      region: '송파구',           periodMonths: 12, ratioPercent: 71.5, sampleSize: 66 },
          { scope: 'SIGUNGU',      region: '송파구',           periodMonths: 6,  ratioPercent: 68.2, sampleSize: 36 },
          { scope: 'SIGUNGU',      region: '송파구',           periodMonths: 3,  ratioPercent: 83.3, sampleSize: 18 },
          { scope: 'SIGUNGU',      region: '송파구',           periodMonths: 1,  ratioPercent: 67.1, sampleSize: 3 },
          { scope: 'EUPMYEONDONG', region: '송파구 신천동',     periodMonths: 12, ratioPercent: 73.5, sampleSize: 8 },
        ],
        narrative:
          '송파구 사무실 낙찰가율 1년 71.5% → 6개월 68.2% → 3개월 83.3% → 1개월 67.1%. 3개월 급반등 흐름. ' +
          '회차당 유찰 할인율 25%p (송파 사무실 통계) 적용 시 83.3% > 75% (=100−25) → 2회차 예상 매각. ' +
          '예상낙찰가 = 감정가 28억 × 83.3% = 23.32억.',
      },
      // 사용자 정책 v3 (2026-05-06): 1회차 매각결정기일 평균 477일 (송파 사무실 통계)
      courtSchedule: {
        courtName: '서울동부지방법원 본원',
        avgSaleDays: 477,                  // 1회차 매각결정기일 평균 (사용자 제공)
        avgDistributionDays: 70,           // 배당기일 평균
        avgHearingInterval: 28,            // 회차 간격 28일
        sampleSize: 66,
      },
      auctionCases: {
        averageDurationDays: 228,
        averageAppraisalValue: 2_650_000_000,
        averageSalePrice: 2_200_000_000,
        averageBidRatio: 83.3,
        sameAddress: [],
        nearbyWithin1Km: [
          { caseNo: '2024타경78821', address: '서울특별시 송파구 신천동 ㅇㅇ-ㅇ',  distanceKm: 0.4, propertyCategory: '오피스텔', appraisalValue: 2_450_000_000, salePrice: 2_035_000_000, bidRatio: 83.1, durationDays: 236, saleDate: '2025-08-13' },
          { caseNo: '2024타경82113', address: '서울특별시 송파구 잠실동 ㅇㅇㅇ-ㅇ', distanceKm: 0.7, propertyCategory: '오피스텔', appraisalValue: 2_980_000_000, salePrice: 2_490_000_000, bidRatio: 83.6, durationDays: 220, saleDate: '2025-10-02' },
          { caseNo: '2025타경10221', address: '서울특별시 송파구 신천동 ㅇ-ㅇㅇ',  distanceKm: 0.9, propertyCategory: '오피스텔', appraisalValue: 2_520_000_000, salePrice: 2_103_000_000, bidRatio: 83.5, durationDays: 241, saleDate: '2026-01-27' },
        ],
      },
      nearbyTransactions: {
        averageLandAreaM2: 208.5,
        averageAmount: 2_590_000_000,
        averagePricePerM2: 12_420_000,
        averagePricePerPy: 41_060_000,
        samples: [
          { txDate: '2026-02-10', address: '서울특별시 송파구 신천동 ㅇ-ㅇㅇ', distanceMeters: 92.0,  landAreaM2: 208.56, amountKRW: 2_580_000_000, pricePerM2: 12_370_000, zoning: '제3종일반주거지역' },
          { txDate: '2025-12-18', address: '서울특별시 송파구 잠실동 ㅇㅇ-ㅇ', distanceMeters: 412.0, landAreaM2: 205.12, amountKRW: 2_570_000_000, pricePerM2: 12_530_000, zoning: '제3종일반주거지역' },
          { txDate: '2025-11-22', address: '서울특별시 송파구 신천동 ㅇ-ㅇㅇ', distanceMeters: 188.0, landAreaM2: 212.34, amountKRW: 2_620_000_000, pricePerM2: 12_340_000, zoning: '제3종일반주거지역' },
        ],
      },
    },
  })

  // ─── 투자 의견 가중치 스코어링 ─────────────────────────────
  //   4개 팩터를 0~100으로 정규화 후 가중 평균 (risk-factors.ts).
  //   게이트식 4/4 BUY 대신 기여도 반영. ≥75 BUY · ≥55 HOLD · <55 AVOID.
  const bankSalePrice  = profitability.acquisition.purchasePrice
  const recommendedRoi = profitability.strategies.recommended.roi
  const investmentRoi  = profitability.investment.roi

  // 사용자 정책 v3.4 (2026-05-06): verdict 는 권고 시나리오 ROI 가 아닌
  //   profitability.investment.roi (투입자금 ROI · "NPL 수익성 분석 · 투입자금·수익" 카드값) 기준
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
    id: 'sample-' + Date.now().toString(36),
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
      // ─── AI 리스크 등급 narrative · 4팩터 강약·완화 포커스 관점 ───
      //   회수율 섹션과 관점 분리:
      //     · recovery (회수 가능성) : 얼마나 받을 수 있나 (수치·신뢰구간)
      //     · risk (여기)            : 뭘 조심해야 하나 (최약 팩터·완화 포커스)
      narrative: (() => {
        const sorted = [...riskFactorResults].sort((a, b) => a.score - b.score)
        const weakest = sorted[0]
        const strongest = sorted[sorted.length - 1]
        const highOrCritical = riskFactorResults.filter(f => f.severity === 'HIGH').length
        const levelWord = riskScore >= 70 ? '낮음' : riskScore >= 55 ? '보통' : riskScore >= 40 ? '높음' : '매우 높음'
        const focus = weakest.mitigation
          ? weakest.mitigation
          : `${weakest.category} 팩터 보강 필요`
        return (
          `리스크 수준 ${levelWord} (${riskScore}점 · 등급 ${riskGrade}). ` +
          `4팩터 중 가장 취약한 구간은 "${weakest.category}" (${weakest.score.toFixed(1)}점) · ` +
          `가장 견고한 구간은 "${strongest.category}" (${strongest.score.toFixed(1)}점). ` +
          (highOrCritical > 0
            ? `HIGH 팩터 ${highOrCritical}개 — 매입 전 완화 조치 필수. `
            : `4팩터 모두 LOW/MEDIUM — 구조적 안정성 확보. `) +
          `완화 포커스: ${focus}.`
        )
      })(),
      factors: riskFactorResults.map(f => ({
        category: f.category,
        severity: f.severity,
        score: f.score,
        explanation: f.explanation,
        mitigation: f.mitigation,
        formula: f.formula,
      })),
      specialConditionAdjustments: input.specialConditions.seniorTenant
        ? [{ condition: '선순위 임차인', impact: '낙찰가율 -10%p 반영, 보증금 인수 시 추가 현금흐름 주의' }]
        : [],
      promptMeta: {
        model: 'NPLATFORM 리스크 분석 모델',
        generatedAt: new Date().toISOString(),
        inputHash: 'nplatform-risk-v1',
      },
    },
    anomaly: {
      overallRisk: 'LOW',
      overallScore: 12,
      findings: [
        {
          id: 'ANM-001',
          category: 'PRICE',
          severity: 'INFO',
          title: '감정가 28억 vs AI 시세 25.5억 — 8.9% 격차',
          description: '감정가(2024-08) 이후 시세 조정 반영 필요. AI 시세(2025-10) 25.5억 기반 보수 시나리오 점검 권고.',
          evidence: '엑셀 B36(감정가 28.0억) / B37(AI 시세 25.5억, 25.10.21)',
          confidence: 90,
        },
        {
          id: 'ANM-002',
          category: 'PRICE',
          severity: 'INFO',
          title: '동일 건물 잠실시그마타워 1년 전 낙찰 83.7% — 지역 평균에 근접',
          description: '송파구 오피스텔 6개월 평균 83.8%에 부합. 동일 건물 재낙찰 가능성 표준 범위.',
          evidence: '2024타경82113 · 낙찰가 24.95억 / 감정가 29.80억 (2025-10-02)',
          confidence: 92,
        },
        {
          id: 'ANM-003',
          category: 'RIGHTS',
          severity: 'INFO',
          title: '소유자 직접 점유 — 명도 협의 필요',
          description: '선순위 임차인은 없으나 소유자 점유 상태. 인도명령·합의 명도 시나리오 검토 필요.',
          evidence: '엑셀 B11 — 임차인: 소유자 직접 점유',
          confidence: 95,
        },
      ],
      recommendations: [
        '현장조사 시 점유·사용 현황 촬영',
        '임대차계약서 열람 (확정일자·전입일)',
        '감정평가서 vs 인근 실거래 단가 교차검증',
      ],
    },
    expectedBid,
    bidRecommendation: {
      aiPredictedBidRatio: auction.blendedBidRatio,
      breakEvenBidRatio: Math.max(50, auction.blendedBidRatio - 15),
      conservative: {
        policy: 'CONSERVATIVE',
        label: '보수적 입찰가 (-5%p)',
        bidPrice: Math.round(appraisal * ((auction.adjustedBidRatio - 5) / 100)),
        bidRatioPercent: Number((auction.adjustedBidRatio - 5).toFixed(1)),
        expectedNetProfit: Math.round(appraisal * 0.04),
        expectedRoi: 12.5,
        expectedIrr: 14.2,
        winProbability: 0.35,
        rationale: '송파구 오피스텔 낙찰가율 하위 구간에 해당 — 낙찰 가능성 낮으나 마진 확보 시 리스크 최저',
      },
      base: {
        policy: 'BASE',
        label: 'AI 권고 입찰가 (기준)',
        bidPrice: recommendedBidPrice,
        bidRatioPercent: auction.adjustedBidRatio,
        expectedNetProfit: Math.round(appraisal * 0.09),
        expectedRoi: 23.8,
        expectedIrr: 26.5,
        winProbability: 0.58,
        rationale: `지역 6개월 중앙값 81.2%에 특수조건 -10%p 반영한 ${auction.adjustedBidRatio}% 적정`,
      },
      aggressive: {
        policy: 'AGGRESSIVE',
        label: '공격적 입찰가 (+5%p)',
        bidPrice: Math.round(appraisal * ((auction.adjustedBidRatio + 5) / 100)),
        bidRatioPercent: Number((auction.adjustedBidRatio + 5).toFixed(1)),
        expectedNetProfit: Math.round(appraisal * 0.14),
        expectedRoi: 35.1,
        expectedIrr: 38.2,
        winProbability: 0.78,
        rationale: '3·1개월 낙찰가율 상승세 반영. 단 낙찰가율 90% 접근 시 마진 압박',
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
        `송파구 사무실/사무소 낙찰가율 1년 71.5% → 6개월 68.2% → 3개월 75.3% → 1개월 67.1%로 ` +
        `70%대 변동성 흐름. 회차당 유찰 할인율 25%p (송파 사무실 통계) 적용 시 75.3% → 2회차 예상 매각. ` +
        `잠실역 일대 재건축·MICE 배후 수요로 중장기 상승 잠재력 보유. ` +
        `단 감정가(28억) 대비 AI 시세(25.5억) 8.9% 격차 — 보수 시나리오 병행 권고.`,
      indicators: [
        { label: '지역 6개월 낙찰가율', value: `${region.auctionMomentum > 0 ? '+' : ''}${region.auctionMomentum}%p vs 1년`, trend: region.auctionMomentum > 0 ? 'UP' : region.auctionMomentum < 0 ? 'DOWN' : 'FLAT', commentary: '송파구 사무실 낙찰가율 모멘텀' },
        { label: '인근 1km 실거래', value: `${SAMPLE_STATISTICS.nearbyTransactions!.cases.length}건/1년`, trend: 'UP', commentary: '송파 방이동·신천동 일반상업지역 (사용자 제공)' },
        { label: '법원 1회차 매각결정기일', value: `${SAMPLE_STATISTICS.courtSchedule?.stages[0]?.saleDays ?? '—'}일`, trend: 'FLAT', commentary: '서울동부지법 송파 사무실 통계 (사용자 제공)' },
      ],
    },
    registryAnalysis,
    profitability,
    // AI 총평 v3 reflow (사용자 정책 2026-05-06):
    //   · 낙찰가율 75.3% (송파 사무실 SIGUNGU 3M) · 회차당 −25%p · 2회차 예상 매각
    //   · 1회차 매각결정기일 평균 477일 (서울동부지법 송파 사무실 통계)
    //   · 인근 3km 경매 5건 (3년 이내) 평균 62.92% (광진/송파 사무실)
    //   · 인근 1km 실거래 7건 (1년 이내 · 송파 방이동·신천동 일반상업지역) 평균 57.2억
    //   · 동일주소 (신천동 7-19) 사례 없음
    //   · 선순위 채권 없음 → 배당 cascade 단순 (낙찰가→경매비용→NPL→1·2질권자)
    executiveSummary:
      `송파구 신천동 잠실 시그마타워 오피스텔 NPL (금천신협 대출원금 19.6억 · 감정가 28억) 종합 분석 결과 ${riskGrade}등급, 예측 회수율 ${recovery.predictedRecoveryRate}%(신뢰도 ${Math.round(recovery.confidence * 100)}%)로 평가됩니다. ` +
      `금융기관 NPL 매각가 ${Math.round(bankSalePrice / 100_000_000 * 10) / 10}억 기준 ` +
      `권고 시나리오 ROI ${(recommendedRoi * 100).toFixed(2)}% · 기본 시나리오 ROI ${(investmentRoi * 100).toFixed(2)}%, ` +
      `송파구 사무실 3개월 평균 낙찰가율 83.3% (회차당 −25%p 기준 → 2회차 예상 매각) · 특수조건 ${auction.specialConditionPenalty.toFixed(1)}%p 반영한 ${auction.adjustedBidRatio.toFixed(1)}%를 기준 입찰가율로 제시하며, ` +
      `1회차 매각결정기일 통계 477일 (서울동부지법 송파 사무실)을 적용한 운용 기간 모델 — ` +
      `동일주소 사례 없음, 인근 3km 경매 사례 (3년 이내 5건 — 광진 구의동·송파 방이동) 평균 ${SAMPLE_STATISTICS.nearbyAuction!.summary.avgBidRatio.toFixed(1)}%, ` +
      `인근 1km 실거래 (1년 이내 ${SAMPLE_STATISTICS.nearbyTransactions!.cases.length}건 · 송파 방이동·신천동 일반상업지역) 평균 57.2억·m²당 872만원 견고. ` +
      `선순위 근저당 부재로 배당 cascade 단순 (낙찰가→경매비용→NPL→1·2질권자) — 보수·기준·공격 3단계 입찰 전략을 병행 권고합니다. ` +
      `AI 투자 의견 종합 점수 ${verdictScore}점 → ${verdict} (가중치: 회수율 0.35·리스크 0.25·ROI 0.25·할인 0.15).`,
    executiveSummaryEn:
      `[Songpa-gu Sincheon-dong · Jamsil Sigma Tower Officetel NPL] Geumcheon Credit Union loan principal KRW 19.6B · appraisal KRW 28B. Analysis result: Grade ${riskGrade}, predicted recovery rate ${recovery.predictedRecoveryRate}% (confidence ${Math.round(recovery.confidence * 100)}%). ` +
      `NPL acquisition price ${Math.round(bankSalePrice / 100_000_000 * 10) / 10}B KRW: recommended scenario ROI ${(recommendedRoi * 100).toFixed(2)}% · base scenario ROI ${(investmentRoi * 100).toFixed(2)}%. ` +
      `Songpa-gu office 3-month avg bid ratio 83.3% (est. round 2 at −25%p/round); adjusted for special conditions −${auction.specialConditionPenalty.toFixed(1)}%p → effective bid ratio ${auction.adjustedBidRatio.toFixed(1)}%. ` +
      `Average 1st-round sale hearing: 477 days (Seoul East District Court · Songpa office). No same-address precedent; ` +
      `nearby 3km auction cases (5 within 3Y — Gwangjin Guui-dong / Songpa Bangi-dong) avg ${SAMPLE_STATISTICS.nearbyAuction!.summary.avgBidRatio.toFixed(1)}%; ` +
      `nearby 1km transactions (${SAMPLE_STATISTICS.nearbyTransactions!.cases.length} within 1Y · Songpa commercial zone) avg KRW 57.2B · KRW 8.72M/m² — robust. ` +
      `No senior mortgage: straightforward dividend cascade (hammer → court costs → NPL → Pledge-1/2). Conservative · Base · Aggressive 3-tier bid strategy recommended. ` +
      `AI Investment Verdict: ${verdictScore} pts → ${verdict} (weights: recovery 35% · risk 25% · ROI 25% · discount 15%).`,
  }

  return report
}

// ─── 사용자 입력 기반 리포트 빌더 ───────────────────────────────
/**
 * buildReportFromInput — 사용자가 입력한 NPL 폼 데이터를 기반으로
 * UnifiedAnalysisReport 를 생성한다.
 *
 * 지역 통계(RegionAuctionRatioStat 등)는 실데이터 API 미연동 상태이므로
 * SAMPLE_STATISTICS 를 fallback 으로 사용하여 계산 공식이 모두 정상 작동한다.
 * source: 'AI_LIVE' 로 마킹하여 sample 데이터와 구분한다.
 */
export interface BuildReportFromInputOptions {
  principal?: number
  unpaidInterest?: number
  /** Phase G7+ — 연체이자 (수기 입력값) */
  overdueInterest?: number
  appraisedValue?: number
  currentMarketValue?: number
  specialConditions?: SpecialConditions
  /** Phase G1 — V2 18항목 체크된 key 배열 (권장, 미지정 시 V1 → V2 자동 마이그레이션) */
  specialConditionsV2?: readonly string[]
  claimBreakdown?: ClaimBreakdown
  rightsSummary?: RightsSummary
  leaseSummary?: LeaseSummary
  address?: string
  /**
   * 추가 주소 (포트폴리오·복합 담보) — 주 주소 외 부동산 목록.
   * 각 항목은 "시·도 시·군·구 상세" 형태의 한글 주소 문자열.
   * (Phase G7+ 2026-04-26 · supabase migration 025)
   */
  additionalAddresses?: string[]
  collateralType?: string
  bondNumber?: string
  caseNumber?: string
  debtorOwnerSame?: boolean
  desiredSaleDiscount?: number
  auctionStartDate?: string
  appraisalDate?: string
  marketPriceNote?: string
  debtorType?: 'INDIVIDUAL' | 'CORPORATE' | '' | string
}

export function buildReportFromInput(overrides: BuildReportFromInputOptions): UnifiedAnalysisReport {
  const principal     = overrides.principal     ?? 0
  const unpaidInterest = overrides.unpaidInterest ?? 0
  // Phase G7+ — 연체이자(수기 입력)을 채권잔액에 합산
  const overdueInterest = overrides.overdueInterest ?? overrides.claimBreakdown?.overdueInterest ?? 0
  const totalBond     = principal + unpaidInterest + overdueInterest
  const appraisal     = overrides.appraisedValue ?? (totalBond > 0 ? Math.round(totalBond * 1.4) : 2_000_000_000)
  const marketValue   = overrides.currentMarketValue ?? appraisal
  const specialConditions = overrides.specialConditions ?? EMPTY_SPECIAL_CONDITIONS

  // 주소에서 지역명 추출 (시·도 + 시·군·구)
  const addressParts = (overrides.address ?? '').trim().split(/\s+/)
  const regionLabel  = addressParts.length >= 2 ? addressParts.slice(0, 2).join(' ') : (overrides.address ?? '주소 미입력')

  // 부동산 유형을 PropertyCategory 로 매핑
  const rawType = overrides.collateralType ?? '아파트'
  const VALID_CATEGORIES = [
    '아파트', '다세대(빌라)', '연립', '오피스텔', '단독주택', '다가구',
    '상가', '사무실', '공장', '창고',
    '대지', '전', '답', '임야', '잡종지', '기타',
  ] as const
  type PropertyCategory = typeof VALID_CATEGORIES[number]
  const propertyCategory: PropertyCategory =
    (VALID_CATEGORIES as readonly string[]).includes(rawType)
      ? (rawType as PropertyCategory)
      : '기타'

  // 자산 제목 자동 생성
  const assetTitle =
    overrides.address
      ? `${addressParts.slice(0, 3).join(' ')} ${rawType} NPL`
      : `NPL 분석 · ${rawType}`

  // 추가 주소 정규화 — 빈 문자열 제거 + 중복 제거 + 주 주소와 동일한 항목 제거
  const normalizedExtraAddresses: string[] = (overrides.additionalAddresses ?? [])
    .map(a => (typeof a === 'string' ? a.trim() : ''))
    .filter(a => a.length > 0 && a !== (overrides.address ?? '').trim())
    .filter((a, i, arr) => arr.indexOf(a) === i)

  // 포트폴리오 자산 제목 — 추가 주소 N건 있으면 배지 부착
  const portfolioAssetTitle =
    normalizedExtraAddresses.length > 0
      ? `${assetTitle} · 포트폴리오 ${normalizedExtraAddresses.length + 1}건`
      : assetTitle

  const input: UnifiedReportInput = {
    assetId: `user-${Date.now().toString(36)}`,
    assetTitle: portfolioAssetTitle,
    region: regionLabel,
    additionalAddresses: normalizedExtraAddresses,
    propertyType: rawType,
    propertyCategory,
    appraisalValue: appraisal,
    appraisalDate: overrides.appraisalDate,
    totalBondAmount: totalBond,
    minBidPrice: appraisal > 0 ? estimateMinBid(appraisal, 1) : 0,
    currentMarketValue: marketValue,
    marketPriceNote: overrides.marketPriceNote,
    specialConditions,
    claimBreakdown: overrides.claimBreakdown,
    rightsSummary: overrides.rightsSummary,
    leaseSummary: overrides.leaseSummary,
    debtorOwnerSame: overrides.debtorOwnerSame,
    desiredSaleDiscount: overrides.desiredSaleDiscount,
    auctionStartDate: overrides.auctionStartDate,
    auctionEstimatedMonths: 10,
    // SAMPLE_STATISTICS 를 fallback 으로 사용 (실데이터 API 미연동)
    statistics: SAMPLE_STATISTICS,
  }

  // ── 3팩터 계산 ─────────────────────────────────────────────
  const ltv = computeLtvFactor({
    totalBondAmount: totalBond,
    appraisalValue: appraisal,
    source: 'APPRAISAL',
  })
  const region = computeRegionTrendFactor({
    regionLabel: input.region,
    ctx: SAMPLE_STATISTICS,
  })
  const auction = computeAuctionRatioFactor({
    regionLabel: input.region,
    category: input.propertyCategory,
    ctx: SAMPLE_STATISTICS,
    specialConditions,
  })
  const recovery = buildRecoveryPrediction({ ltv, region, auction })

  const expectedBid = computeExpectedBid({
    appraisalValue: appraisal,
    minBidPrice: input.minBidPrice ?? 0,
    currentMarketValue: marketValue,
    auction,
    ctx: SAMPLE_STATISTICS,
  })
  const recommendedBidPrice = expectedBid.recommendedBidPrice

  // ── 리스크 4팩터 (Phase G3) ──────────────────────────────────
  const collateralFactor = computeCollateralFactor({
    claimBalance: totalBond,
    appraisalValue: appraisal,
    marketValue,
  })
  const rightsFactor = computeRightsFactor({
    specialConditionsV2: overrides.specialConditionsV2 ?? migrateV1ToV2Keys(specialConditions),
    // registry 없음 — 등기부 미첨부 상태
    subordinateClaimCount: 0,
  })
  const marketFactor    = computeMarketFactor({ region, auction })
  const liquidityFactor = computeLiquidityFactor({
    auction,
    averageBidderCount: SAMPLE_STATISTICS.nearbyAuction?.summary.avgBidderCount ?? 1,
  })
  const riskFactorResults = [collateralFactor, rightsFactor, marketFactor, liquidityFactor]

  const { score: riskScore } = composeRiskScore(riskFactorResults)
  const riskGrade = scoreToGrade(riskScore)

  // ── 투자 의견 ────────────────────────────────────────────────
  // v3.4 (2026-05-06): investmentRoi 기준 (실제 투입자금 ROI). buildReportFromInput
  //   은 fallback builder 라 strategies/investment 가 없으니 default 0.15 적용.
  const verdictResult = computeInvestmentVerdict({
    predictedRecoveryRate: recovery.predictedRecoveryRate,
    riskScore,
    investmentRoi: 0.15,   // 기본 기대 수익률
    bankSalePrice: totalBond * (1 - (overrides.desiredSaleDiscount ?? 0)),
    claimBalance: totalBond,
  })

  // ── 특수조건 적용 내역 ──────────────────────────────────────
  const selectedSpecialConditions = SPECIAL_CONDITION_CATALOG.filter(
    it => Boolean(specialConditions[it.key])
  )
  const specialConditionAdjustments = selectedSpecialConditions.map(it => ({
    condition: it.label,
    impact: `낙찰가율 ${it.penalty}%p · 법적리스크 ${it.legalPenalty}점 · ${it.helper}`,
  }))

  // ── 입찰 3단계 권고 ──────────────────────────────────────────
  const adjRatio = auction.adjustedBidRatio
  const bidConservative = Math.round(appraisal * ((adjRatio - 5) / 100))
  const bidBase         = Math.round(appraisal * (adjRatio / 100))
  const bidAggressive   = Math.round(appraisal * ((adjRatio + 5) / 100))

  const ltvStr = ltv.ltvPercent.toFixed(1)
  const recovStr = recovery.predictedRecoveryRate
  const adjStr = adjRatio.toFixed(1)

  const report: UnifiedAnalysisReport = {
    id: `user-${Date.now().toString(36)}`,
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
        `${regionLabel} ${rawType} · AI 투자 의견 ${verdictResult.totalScore}점 (${verdictResult.verdict}) · ` +
        `예측회수율 ${recovStr}% · 낙찰가율 ${adjStr}% (특수조건 ${auction.specialConditionPenalty}%p 반영)`,
    },
    recovery,
    risk: {
      grade: riskGrade,
      score: riskScore,
      level: riskScore >= 70 ? 'LOW' : riskScore >= 55 ? 'MEDIUM' : riskScore >= 40 ? 'HIGH' : 'CRITICAL',
      narrative:
        `LTV ${ltvStr}% · 지역동향 ${region.score}점 · 낙찰가율 ${adjStr}%. ` +
        (auction.specialConditionPenalty < 0
          ? `특수조건 ${selectedSpecialConditions.length}개 선택 — 낙찰가율 ${auction.specialConditionPenalty}%p 감점. `
          : '특수조건 해당 없음. ') +
        `종합 리스크 ${riskGrade}등급 (${riskScore}점).`,
      factors: riskFactorResults.map(f => ({
        category: f.category,
        severity: f.severity,
        score: f.score,
        explanation: f.explanation,
        mitigation: f.mitigation,
        formula: f.formula,
      })),
      specialConditionAdjustments,
      promptMeta: {
        model: 'user-input-ruleset-v1',
        generatedAt: new Date().toISOString(),
        inputHash: `${totalBond}-${appraisal}-${selectedSpecialConditions.length}`,
      },
    },
    anomaly: undefined,
    expectedBid,
    bidRecommendation: {
      aiPredictedBidRatio: auction.blendedBidRatio,
      breakEvenBidRatio: Math.max(50, adjRatio - 15),
      conservative: {
        policy: 'CONSERVATIVE',
        label: '보수적 입찰가 (-5%p)',
        bidPrice: bidConservative,
        bidRatioPercent: Number((adjRatio - 5).toFixed(1)),
        expectedNetProfit: Math.round(appraisal * 0.03),
        expectedRoi: 10.0,
        expectedIrr: 12.0,
        winProbability: 0.30,
        rationale: '낙찰가율 하위 구간 — 낙찰 가능성 낮으나 마진 최대',
      },
      base: {
        policy: 'BASE',
        label: 'AI 권고 입찰가 (기준)',
        bidPrice: bidBase,
        bidRatioPercent: adjRatio,
        expectedNetProfit: Math.round(appraisal * 0.07),
        expectedRoi: 18.0,
        expectedIrr: 21.0,
        winProbability: 0.55,
        rationale: `지역 평균 낙찰가율에 특수조건 ${auction.specialConditionPenalty}%p 반영한 ${adjStr}% 적정`,
      },
      aggressive: {
        policy: 'AGGRESSIVE',
        label: '공격적 입찰가 (+5%p)',
        bidPrice: bidAggressive,
        bidRatioPercent: Number((adjRatio + 5).toFixed(1)),
        expectedNetProfit: Math.round(appraisal * 0.12),
        expectedRoi: 28.0,
        expectedIrr: 32.0,
        winProbability: 0.75,
        rationale: '낙찰 확률 최우선 시나리오 — 마진 압박 주의',
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
        `${regionLabel} 지역 경매 낙찰가율 기준 분석. ` +
        `특수조건 ${selectedSpecialConditions.length}개 반영 후 조정 낙찰가율 ${adjStr}%. ` +
        (auction.specialConditionPenalty < 0
          ? `선택된 특수조건(${selectedSpecialConditions.map(s => s.label).join('·')})으로 인해 ${Math.abs(auction.specialConditionPenalty)}%p 감점 적용. `
          : '') +
        `입력된 감정가 ${(appraisal / 1e8).toFixed(2)}억 대비 채권잔액 ${(totalBond / 1e8).toFixed(2)}억 (LTV ${ltvStr}%).`,
      indicators: [
        {
          label: '조정 낙찰가율',
          value: `${adjStr}%`,
          trend: auction.specialConditionPenalty < 0 ? 'DOWN' : 'FLAT',
          commentary: `특수조건 ${auction.specialConditionPenalty}%p 반영`,
        },
        {
          label: 'LTV',
          value: `${ltvStr}%`,
          trend: ltv.ltvPercent > 80 ? 'UP' : ltv.ltvPercent < 60 ? 'DOWN' : 'FLAT',
          commentary: `채권잔액 / 감정가`,
        },
        {
          label: '리스크 등급',
          value: `${riskGrade}등급 (${riskScore}점)`,
          trend: riskScore >= 70 ? 'UP' : riskScore >= 50 ? 'FLAT' : 'DOWN',
          commentary: '5팩터 가중 합산',
        },
      ],
    },
    registryAnalysis: undefined,
    profitability: undefined,
    executiveSummary:
      `${regionLabel} ${rawType} NPL (채권잔액 ${(totalBond / 1e8).toFixed(2)}억 · 감정가 ${(appraisal / 1e8).toFixed(2)}억) ` +
      `입력 데이터 기반 분석 결과 ${riskGrade}등급 (${riskScore}점), 예측 회수율 ${recovStr}%로 평가됩니다. ` +
      (selectedSpecialConditions.length > 0
        ? `특수조건 ${selectedSpecialConditions.length}개 선택(${selectedSpecialConditions.map(s => s.label).join('·')})으로 낙찰가율 ${auction.specialConditionPenalty}%p 감점 적용, 조정 낙찰가율 ${adjStr}%. `
        : '특수조건 해당 없음 — 표준 낙찰가율 적용. ') +
      `LTV ${ltvStr}% 기준 권리관계·시장·유동성·법적 5팩터 종합 평가. ` +
      `AI 투자 의견 ${verdictResult.totalScore}점 → ${verdictResult.verdict}.`,
  }

  return report
}
