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
import type { UnifiedAnalysisReport, UnifiedReportInput } from './types'
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
  // 1. 지역/기간별 낙찰가율 — 송파구 오피스텔
  auctionRatioStats: [
    {
      location: { sido: '서울특별시', sigungu: '송파구' },
      propertyCategory: '오피스텔',
      scope: 'SIGUNGU',
      asOfDate: '2026-04-21',
      rows: [
        { bucket: '12M', periodLabel: '1년간 평균', saleCount: 18, saleRate: 19.5, bidRatio: 82.1 },
        { bucket: '6M',  periodLabel: '6개월 평균', saleCount: 9,  saleRate: 20.1, bidRatio: 83.8 },
        { bucket: '3M',  periodLabel: '3개월 평균', saleCount: 4,  saleRate: 18.3, bidRatio: 83.5 },
        { bucket: '1M',  periodLabel: '1개월 평균', saleCount: 1,  saleRate: 16.7, bidRatio: 84.2 },
      ],
    },
  ],
  // 2. 법원 기일/배당 — 서울동부지방법원 본원 (송파구 관할)
  courtSchedule: {
    courtName: '서울동부지방법원 본원',
    avgHearingInterval: 47,
    asOfDate: '2026-04-21',
    stages: [
      { round: 1, saleDays: 285, distributionDays: 355 },
      { round: 2, saleDays: 266, distributionDays: 336 },
      { round: 3, saleDays: 317, distributionDays: 395 },
      { round: 4, saleDays: 355, distributionDays: 433 },
      { round: 5, saleDays: 390, distributionDays: 468 },
      { round: 6, saleDays: 484, distributionDays: 587 },
      { round: 7, saleDays: 481, distributionDays: 581 },
      { round: 8, saleDays: 502, distributionDays: 594 },
      { round: 9, saleDays: 550, distributionDays: 742 },
      { round: 10, saleDays: 579, distributionDays: 692 },
    ],
  },
  // 3. 동일 건물(잠실시그마타워) 낙찰 사례
  sameAddressAuction: {
    location: {
      sido: '서울특별시', sigungu: '송파구', eupmyeondong: '신천동', jibun: '7-19',
    },
    propertyCategory: '오피스텔',
    lookbackYears: 3,
    cases: [
      {
        caseNo: '2024타경82113',
        filedDate: '2024-03-15',
        saleDate: '2025-10-02',
        durationDays: 220,
        appraisalValue: 2_980_000_000,
        salePrice: 2_495_000_000,
        bidRatio: 83.7,
        bidderCount: 2,
        landAreaSqm: 0,
        buildingAreaSqm: 210.24,
        perLandPrice: 0,
        perBuildingPrice: 11_870_000,
        address: '서울특별시 송파구 신천동 7-19 잠실시그마타워',
      },
    ],
    summary: {
      avgDurationDays: 220,
      avgAppraisalValue: 2_980_000_000,
      avgSalePrice: 2_495_000_000,
      avgBidRatio: 83.7,
      avgBidderCount: 2,
      avgLandAreaSqm: 0,
      avgBuildingAreaSqm: 210.24,
    },
  },
  // 4. 인근 1km 송파 오피스텔 경매 낙찰사례
  nearbyAuction: {
    centerLocation: {
      sido: '서울특별시', sigungu: '송파구', eupmyeondong: '신천동', jibun: '7-19',
    },
    propertyCategory: '오피스텔',
    radiusMeters: 1500,
    lookbackYears: 3,
    specialConditionFilter: '없음',
    cases: [
      { caseNo: '2024타경78821', filedDate: '2024-02-19', saleDate: '2025-08-13', durationDays: 236, appraisalValue: 2_450_000_000, salePrice: 2_020_000_000, bidRatio: 82.4, bidderCount: 1, landAreaSqm: 0, buildingAreaSqm: 198.44, perLandPrice: 0, perBuildingPrice: 10_180_000, address: '서울특별시 송파구 신천동 ㅇㅇ-ㅇ' },
      { caseNo: '2024타경82113', filedDate: '2024-03-15', saleDate: '2025-10-02', durationDays: 220, appraisalValue: 2_980_000_000, salePrice: 2_495_000_000, bidRatio: 83.7, bidderCount: 2, landAreaSqm: 0, buildingAreaSqm: 210.24, perLandPrice: 0, perBuildingPrice: 11_870_000, address: '서울특별시 송파구 잠실동 ㅇㅇㅇ-ㅇ' },
      { caseNo: '2025타경10221', filedDate: '2025-01-08', saleDate: '2026-01-27', durationDays: 241, appraisalValue: 2_520_000_000, salePrice: 2_105_000_000, bidRatio: 83.5, bidderCount: 1, landAreaSqm: 0, buildingAreaSqm: 202.30, perLandPrice: 0, perBuildingPrice: 10_410_000, address: '서울특별시 송파구 신천동 ㅇ-ㅇㅇ' },
      { caseNo: '2025타경14882', filedDate: '2025-04-21', saleDate: '2026-04-02', durationDays: 220, appraisalValue: 2_250_000_000, salePrice: 1_830_000_000, bidRatio: 81.3, bidderCount: 1, landAreaSqm: 0, buildingAreaSqm: 195.17, perLandPrice: 0, perBuildingPrice: 9_375_000, address: '서울특별시 송파구 잠실동 ㅇㅇ-ㅇ' },
    ],
    summary: {
      avgDurationDays: 229,
      avgAppraisalValue: 2_550_000_000,
      avgSalePrice: 2_113_000_000,
      avgBidRatio: 82.7,
      avgBidderCount: 1,
      avgLandAreaSqm: 0,
      avgBuildingAreaSqm: 201.54,
    },
  },
  // 5. 인근 1km 송파 오피스텔 실거래
  nearbyTransactions: {
    centerLocation: {
      sido: '서울특별시', sigungu: '송파구', eupmyeondong: '신천동', jibun: '7-19',
    },
    propertyCategory: '오피스텔',
    radiusMeters: 1000,
    lookbackYears: 1,
    cases: [
      { txDate: '2026-02-10', address: '서울특별시 송파구 신천동 7-19', zoning: '제3종일반주거지역', buildingAreaSqm: 208.56, amountKRW: 2_580_000_000, perBuildingPrice: 12_370_000, approvedDate: '19940805', distanceMeters: 92.0 },
      { txDate: '2025-12-18', address: '서울특별시 송파구 잠실동 310-1', zoning: '제3종일반주거지역', buildingAreaSqm: 205.12, amountKRW: 2_570_000_000, perBuildingPrice: 12_530_000, approvedDate: '19981220', distanceMeters: 412.0 },
      { txDate: '2025-11-22', address: '서울특별시 송파구 신천동 8-3',  zoning: '제3종일반주거지역', buildingAreaSqm: 212.34, amountKRW: 2_620_000_000, perBuildingPrice: 12_340_000, approvedDate: '20010615', distanceMeters: 188.0 },
      { txDate: '2025-09-05', address: '서울특별시 송파구 잠실동 292-4', zoning: '제3종일반주거지역', buildingAreaSqm: 207.44, amountKRW: 2_540_000_000, perBuildingPrice: 12_250_000, approvedDate: '19961014', distanceMeters: 523.0 },
      { txDate: '2025-08-14', address: '서울특별시 송파구 신천동 12-1', zoning: '제3종일반주거지역', buildingAreaSqm: 210.00, amountKRW: 2_600_000_000, perBuildingPrice: 12_380_000, approvedDate: '20021113', distanceMeters: 268.0 },
    ],
    summary: {
      avgAmount: 2_582_000_000,
      medianAmount: 2_580_000_000,
      avgPerBuildingPrice: 12_374_000,
    },
  },
}

// ─── 샘플 리포트 빌더 ────────────────────────────────────────
export function buildSampleReport(): UnifiedAnalysisReport {
  // 엑셀 B15·B21·B22 기준: 원금 19.6억 + 누적 연체이자 ~2.2억 (25.07.23~26.04.21)
  const totalBond = 2_180_000_000
  // 엑셀 B36: 감정가 28.00억
  const appraisal = 2_800_000_000

  const input: UnifiedReportInput = {
    assetId: 'sample-songpa-jamsil-sigma-2105',
    assetTitle: '송파 잠실 시그마타워 오피스텔 · 금천신협 NPL',
    region: '서울특별시 송파구 신천동',
    propertyType: '오피스텔',
    propertyCategory: '오피스텔',
    appraisalValue: appraisal,
    totalBondAmount: totalBond,
    minBidPrice: estimateMinBid(appraisal, 1),      // 1회 유찰 기준 (감정가 × 0.8^1)
    currentMarketValue: 2_550_000_000,               // 엑셀 B37 — AI 시세 최신 (2025-10-21)
    specialConditions: {
      lienRight: false,
      statutorySuperficies: false,
      sharedAuction: false,
      seniorTenant: false,    // 소유자 직접 점유 — 선순위 임차인 없음
      illegalBuilding: false,
      graveYardRight: false,
      farmlandRestriction: false,
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
    externalVolumeChange: 8.2,      // MOLIT API 추정
    externalPriceIndexChange: 3.5,  // 한국부동산원 추정
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
  // 입찰예상가 = 감정가 × 예상낙찰가율 = 28억 × 83.5% = 23.38억 (엑셀 B41)
  const registryAnalysis = buildRegistryAnalysis({
    claimAmount: totalBond,
    bidPrice: Math.round(appraisal * 0.835),
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

  // 리스크 등급 — 샘플에서는 3팩터 점수 기반 룰드리븐 (실제는 Claude API)
  const riskScore = Math.round(
    ltv.score * 0.35 + region.score * 0.25 + auction.score * 0.3 + (recovery.compositeScore * 0.1),
  )
  const riskGrade = scoreToGrade(riskScore)

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
      verdict:
        recovery.compositeScore >= 70 && recovery.predictedRecoveryRate >= 85
          ? 'BUY'
          : recovery.compositeScore >= 55
          ? 'HOLD'
          : 'AVOID',
      tldr: `${input.region} ${input.propertyCategory} · 예측 회수율 ${recovery.predictedRecoveryRate}% · 리스크 ${riskGrade}등급 · AI 권고 입찰가 ${Math.round(recommendedBidPrice / 100_000_000 * 10) / 10}억`,
    },
    recovery,
    risk: {
      grade: riskGrade,
      score: riskScore,
      level: riskScore >= 70 ? 'LOW' : riskScore >= 55 ? 'MEDIUM' : riskScore >= 40 ? 'HIGH' : 'CRITICAL',
      narrative: `LTV ${ltv.ltvPercent.toFixed(1)}% · 지역 동향 ${region.score}점 · 낙찰가율 조정치 ${auction.adjustedBidRatio.toFixed(1)}%. ${auction.specialConditionPenalty < 0 ? `특수조건 ${auction.specialConditionPenalty.toFixed(1)}%p 감점 반영. ` : ''}송파구 오피스텔 시장 안정세, 최근 3개월 낙찰가율 ${SAMPLE_STATISTICS.auctionRatioStats[0].rows.find(r => r.bucket === '3M')?.bidRatio.toFixed(1)}%로 탄탄한 흐름.`,
      factors: [
        { category: '담보가치', severity: ltv.score >= 70 ? 'LOW' : 'MEDIUM', score: ltv.score, explanation: `감정가 ${(appraisal/1e8).toFixed(1)}억 대비 채권 ${(totalBond/1e8).toFixed(1)}억 — LTV ${ltv.ltvPercent.toFixed(1)}%`, mitigation: 'LTV 80% 이하 유지. 필요 시 재감정 의뢰.' },
        { category: '권리관계', severity: input.specialConditions.seniorTenant ? 'MEDIUM' : 'LOW', score: input.specialConditions.seniorTenant ? 55 : 80, explanation: input.specialConditions.seniorTenant ? '선순위 임차인 대항력 존재 — 보증금 인수 리스크' : '1순위 근저당, 특이사항 없음', mitigation: '임대차보호법상 우선변제권 확인, 인수 조건 협의' },
        { category: '시장', severity: region.score >= 55 ? 'LOW' : 'MEDIUM', score: region.score, explanation: `${input.region} 실거래 ${region.transactionCount12M}건, 낙찰가율 모멘텀 ${region.auctionMomentum > 0 ? '+' : ''}${region.auctionMomentum}%p`, mitigation: '금리 인상기 가격조정 대비 — 보수적 시나리오 점검' },
        { category: '유동성', severity: (auction.expectedSaleDays ?? 0) > 400 ? 'MEDIUM' : 'LOW', score: 65, explanation: `${auction.courtName ?? '관할법원'} 1회차 매각 평균 ${auction.expectedSaleDays ?? '—'}일. 질권 이자 부담 고려.`, mitigation: '단기 유동화 계획 수립, 입찰자 수 2명 미만 구간 집중' },
        { category: '법적', severity: 'LOW', score: 80, explanation: '유치권·법정지상권·지분경매 해당 없음', mitigation: '현장조사 시 점유관계 재확인' },
      ],
      specialConditionAdjustments: input.specialConditions.seniorTenant
        ? [{ condition: '선순위 임차인', impact: '낙찰가율 -10%p 반영, 보증금 인수 시 추가 현금흐름 주의' }]
        : [],
      promptMeta: {
        model: 'sample-ruleset-v1',
        generatedAt: new Date().toISOString(),
        inputHash: 'sample',
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
        `송파구 오피스텔 낙찰가율은 최근 1년 82.1% → 6개월 83.8% → 3개월 83.5% → 1개월 84.2%로 ` +
        `80%대 초반 안정 흐름. 인근 실거래 단가(건물당 약 1,237만원/㎡) 견조하며, ` +
        `잠실역 일대 재건축·MICE 배후 수요로 중장기 상승 잠재력 보유. ` +
        `단 감정가(28억) 대비 AI 시세(25.5억) 8.9% 격차 — 보수 시나리오 병행 권고.`,
      indicators: [
        { label: '지역 6개월 낙찰가율', value: `${region.auctionMomentum > 0 ? '+' : ''}${region.auctionMomentum}%p vs 1년`, trend: region.auctionMomentum > 0 ? 'UP' : region.auctionMomentum < 0 ? 'DOWN' : 'FLAT', commentary: '송파구 오피스텔 낙찰가율 모멘텀' },
        { label: '인근 1km 실거래', value: `${region.transactionCount12M}건/12M`, trend: region.transactionVolumeChange > 0 ? 'UP' : 'FLAT', commentary: '잠실·신천동 오피스텔 거래 유지' },
        { label: '법원 1회차 매각 기간', value: `${auction.expectedSaleDays ?? '—'}일`, trend: 'FLAT', commentary: '서울동부지방법원 평균 대비 표준 수준' },
      ],
    },
    registryAnalysis,
    // ─── NPL 수익성 분석 · 잠실 시그마타워 오피스텔 (사용자 제공 엑셀 사례) ─────
    //  원본: "NPL 수익성분석 로직 및 탬플릿.xlsx"
    //  · 물권: 서울특별시 송파구 신천동 7-19 잠실시그마타워 21층 2105호 (전용 208.56㎡)
    //  · 채권자 금천신용협동조합 · 대출원금 19.6억 · 연체금리 8.9%
    //  · 감정가 28억 / AI 시세 25.5억 / 예상낙찰가율 83.5%
    //  · 금융기관 매각가 없음 → 3단계 전략 앵커 = 대출원금 (공격 100% · 권고 95% · 보수 90%)
    profitability: buildNplProfitability({
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
      // 예상낙찰가율 83.5% (엑셀 B40 — 최근 3개월 낙찰가율)
      expectedBidRatio: 0.835,
      expectedBidRatioPeriod: '최근 3개월 낙찰가율',
      // 경매개시 2025-10-21 (엑셀 B45) · 송파구 관할 = 서울동부지방법원 본원
      auctionStartDate: '2025-10-21',
      courtName: '서울동부지방법원 본원',
      // 할인율 0 = 대출원금 기준 매입 (엑셀 B30 = B15, C30 '대출원금의 X% 할인')
      discountRate: 0,
      // bankSalePrice 없음 → 3단계 전략 = 시나리오 A (원금 100/95/90)
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
      sensitivityPurchaseRateAxis: [1.00, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70], // 원금 대비 할인 5%p 스텝
      sensitivityBidRatioAxis:     [0.55, 0.65, 0.70, 0.75, 0.80, 0.835, 0.88, 0.92], // 55~92% 비대칭
      evidence: {
        bidRatioStats: {
          selectedLabel: '송파구 오피스텔 · 3개월',
          items: [
            { scope: 'SIGUNGU',      region: '송파구',           periodMonths: 12, ratioPercent: 82.1, sampleSize: 18 },
            { scope: 'SIGUNGU',      region: '송파구',           periodMonths: 6,  ratioPercent: 83.8, sampleSize: 9 },
            { scope: 'SIGUNGU',      region: '송파구',           periodMonths: 3,  ratioPercent: 83.5, sampleSize: 4 },
            { scope: 'SIGUNGU',      region: '송파구',           periodMonths: 1,  ratioPercent: 84.2, sampleSize: 1 },
            { scope: 'EUPMYEONDONG', region: '송파구 신천동',     periodMonths: 12, ratioPercent: 84.6, sampleSize: 3 },
          ],
          narrative: '송파구 오피스텔 낙찰가율 1년 82.1% → 6개월 83.8% → 3개월 83.5% → 1개월 84.2%. 80%대 초반 안정 흐름. 신천동 단독 평균 84.6%로 잠실 재건축 기대감 반영.',
        },
        courtSchedule: {
          courtName: '서울동부지방법원 본원',
          avgSaleDays: 285,
          avgDistributionDays: 355,
          avgHearingInterval: 47,
          sampleSize: 112,
        },
        auctionCases: {
          averageDurationDays: 228,
          averageAppraisalValue: 2_650_000_000,
          averageSalePrice: 2_200_000_000,
          averageBidRatio: 83.0,
          sameAddress: [],
          nearbyWithin1Km: [
            { caseNo: '2024타경78821', address: '서울특별시 송파구 신천동 ㅇㅇ-ㅇ',  distanceKm: 0.4, propertyCategory: '오피스텔', appraisalValue: 2_450_000_000, salePrice: 2_020_000_000, bidRatio: 82.4, durationDays: 236, saleDate: '2025-08-13' },
            { caseNo: '2024타경82113', address: '서울특별시 송파구 잠실동 ㅇㅇㅇ-ㅇ', distanceKm: 0.7, propertyCategory: '오피스텔', appraisalValue: 2_980_000_000, salePrice: 2_495_000_000, bidRatio: 83.7, durationDays: 220, saleDate: '2025-10-02' },
            { caseNo: '2025타경10221', address: '서울특별시 송파구 신천동 ㅇ-ㅇㅇ',  distanceKm: 0.9, propertyCategory: '오피스텔', appraisalValue: 2_520_000_000, salePrice: 2_105_000_000, bidRatio: 83.5, durationDays: 241, saleDate: '2026-01-27' },
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
    }),
    executiveSummary:
      `송파구 신천동 잠실 시그마타워 오피스텔 NPL (금천신협 대출원금 19.6억 · 감정가 28억) 종합 분석 결과 ${riskGrade}등급, 예측 회수율 ${recovery.predictedRecoveryRate}%(신뢰도 ${Math.round(recovery.confidence * 100)}%)로 평가됩니다. ` +
      `지역 6개월 낙찰가율 ${SAMPLE_STATISTICS.auctionRatioStats[0].rows.find(r => r.bucket === '6M')?.bidRatio.toFixed(1)}%에 특수조건 ${auction.specialConditionPenalty.toFixed(1)}%p 반영한 ${auction.adjustedBidRatio.toFixed(1)}%를 기준 입찰가율로 제시하며, ` +
      `AI 권고 입찰가는 ${Math.round(recommendedBidPrice / 100_000_000 * 10) / 10}억입니다. ` +
      `동일 건물 전회 낙찰(${SAMPLE_STATISTICS.sameAddressAuction!.summary.avgBidRatio}%)과 인근 송파 오피스텔(${SAMPLE_STATISTICS.nearbyAuction!.summary.avgBidRatio}%) 편차 고려, 보수·기준·공격 3단계 입찰 전략을 병행 권고합니다.`,
  }

  return report
}
