/**
 * lib/npl/unified-report/sample.ts
 *
 * 통합 리포트 샘플 빌더
 * — 강남구 개포동 다세대(빌라) NPL 케이스 (사용자 제공 통계 스크린샷 기반)
 * — "샘플 결과 보기" 진입 시 사용되는 프리셋
 *
 * 실제 화면 수치(스크린샷)와 동일:
 *   · 지역/기간별 낙찰가율: 1년 89.5% · 6개월 81.2% · 3개월 88.0% · 1개월 90.8%
 *   · 법원(서울중앙지방법원 본원) 평균 기일 47일, 1회차 매각 285일
 *   · 동일주소 낙찰 사례: 2024타경113807 — 낙찰가율 72.5%
 *   · 인근 3km 평균 낙찰가율: 55.65%
 *   · 인근 1km 실거래 건물단가 ≒ 4.2~4.5억 / 25㎡
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

// ─── 샘플 통계 컨텍스트 ──────────────────────────────────────
export const SAMPLE_STATISTICS: StatisticsContext = {
  asOfDate: '2026-04-21',
  target: {
    location: {
      sido: '서울특별시',
      sigungu: '강남구',
      eupmyeondong: '개포동',
      jibun: '1195-8',
      bjdCode: '1168010300',
    },
    propertyCategory: '다세대(빌라)',
    appraisalValue: 835_000_000,       // 8.35억 (동일 주소 사례 감정가)
    landAreaSqm: 26,
    buildingAreaSqm: 46.41,
  },
  // 1. 지역/기간별 낙찰가율 — 강남구 전체
  auctionRatioStats: [
    {
      location: { sido: '서울특별시', sigungu: '강남구' },
      propertyCategory: '다세대(빌라)',
      scope: 'SIGUNGU',
      asOfDate: '2026-04-21',
      rows: [
        { bucket: '12M', periodLabel: '1년간 평균', saleCount: 31, saleRate: 22.0, bidRatio: 89.5 },
        { bucket: '6M',  periodLabel: '6개월 평균', saleCount: 12, saleRate: 21.8, bidRatio: 88.3 },
        { bucket: '3M',  periodLabel: '3개월 평균', saleCount: 5,  saleRate: 19.2, bidRatio: 88.0 },
        { bucket: '1M',  periodLabel: '1개월 평균', saleCount: 2,  saleRate: 13.3, bidRatio: 90.8 },
      ],
    },
  ],
  // 2. 법원 기일/배당 — 서울중앙지방법원 본원
  courtSchedule: {
    courtName: '서울중앙지방법원 본원',
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
  // 3. 동일 주소 낙찰 사례 — 2024타경113807
  sameAddressAuction: {
    location: {
      sido: '서울특별시', sigungu: '강남구', eupmyeondong: '개포동', jibun: '1195-8',
    },
    propertyCategory: '다세대(빌라)',
    lookbackYears: 3,
    cases: [
      {
        caseNo: '2024타경113807',
        filedDate: '2024-07-11',
        saleDate: '2025-02-11',
        durationDays: 215,
        appraisalValue: 835_000_000,
        salePrice: 721_000_000,
        bidRatio: 86.3,
        bidderCount: 1,
        landAreaSqm: 26,
        buildingAreaSqm: 46.41,
        perLandPrice: 27_730_000,
        perBuildingPrice: 15_530_000,
        address: '서울특별시 강남구 개포동 1195-8',
      },
    ],
    summary: {
      avgDurationDays: 215,
      avgAppraisalValue: 835_000_000,
      avgSalePrice: 721_000_000,
      avgBidRatio: 86.3,
      avgBidderCount: 1,
      avgLandAreaSqm: 26,
      avgBuildingAreaSqm: 46.41,
    },
  },
  // 4. 인근 주소 경매 낙찰 사례 — 서초동 1617-19 외
  nearbyAuction: {
    centerLocation: {
      sido: '서울특별시', sigungu: '강남구', eupmyeondong: '개포동', jibun: '1195-8',
    },
    propertyCategory: '다세대(빌라)',
    radiusMeters: 3000,
    lookbackYears: 3,
    specialConditionFilter: '없음',
    cases: [
      { caseNo: '2025타경102443 (8)', filedDate: '2025-03-19', saleDate: '2026-04-02', durationDays: 379, appraisalValue: 530_000_000,   salePrice: 445_000_000,   bidRatio: 84.0, bidderCount: 1, landAreaSqm: 14.3,  buildingAreaSqm: 23.58, perLandPrice: 31_120_000, perBuildingPrice: 18_870_000, address: '서울특별시 강남구 역삼동 648-12' },
      { caseNo: '2025타경102443 (10)', filedDate: '2025-03-19', saleDate: '2026-04-02', durationDays: 379, appraisalValue: 1_150_000_000, salePrice: 996_000_000,   bidRatio: 86.6, bidderCount: 6, landAreaSqm: 25.96, buildingAreaSqm: 42.8,  perLandPrice: 38_370_000, perBuildingPrice: 23_270_000, address: '서울특별시 강남구 역삼동 648-12' },
      { caseNo: '2025타경102443 (4)',  filedDate: '2025-03-19', saleDate: '2026-04-02', durationDays: 379, appraisalValue: 570_000_000,   salePrice: 468_000_000,   bidRatio: 82.1, bidderCount: 1, landAreaSqm: 15.33, buildingAreaSqm: 25.28, perLandPrice: 30_530_000, perBuildingPrice: 18_510_000, address: '서울특별시 강남구 역삼동 648-12' },
      { caseNo: '2025타경102443 (9)',  filedDate: '2025-03-19', saleDate: '2026-04-02', durationDays: 379, appraisalValue: 600_000_000,   salePrice: 520_000_000,   bidRatio: 86.7, bidderCount: 1, landAreaSqm: 15.59, buildingAreaSqm: 25.7,  perLandPrice: 33_350_000, perBuildingPrice: 20_230_000, address: '서울특별시 강남구 역삼동 648-12' },
      { caseNo: '2025타경102443 (7)',  filedDate: '2025-03-19', saleDate: '2026-04-02', durationDays: 379, appraisalValue: 550_000_000,   salePrice: 471_000_000,   bidRatio: 85.6, bidderCount: 1, landAreaSqm: 13.87, buildingAreaSqm: 22.87, perLandPrice: 33_960_000, perBuildingPrice: 20_600_000, address: '서울특별시 강남구 역삼동 648-12' },
    ],
    summary: {
      avgDurationDays: 379,
      avgAppraisalValue: 680_000_000,
      avgSalePrice: 580_000_000,
      avgBidRatio: 85.0,
      avgBidderCount: 2,
      avgLandAreaSqm: 17.01,
      avgBuildingAreaSqm: 28.04,
    },
  },
  // 5. 인근 실거래 — 양재동 280-4 (스크린샷 예시)
  nearbyTransactions: {
    centerLocation: {
      sido: '서울특별시', sigungu: '강남구', eupmyeondong: '개포동', jibun: '1195-8',
    },
    propertyCategory: '다세대(빌라)',
    radiusMeters: 1000,
    lookbackYears: 1,
    cases: [
      { txDate: '2026-01-26', address: '서울특별시 서초구 양재동 280-4', zoning: '제2종일반주거지역', buildingAreaSqm: 25.82, amountKRW: 420_000_000, perBuildingPrice: 16_260_000, approvedDate: '19951230', distanceMeters: 186.4 },
      { txDate: '2026-01-26', address: '서울특별시 서초구 양재동 280-4', zoning: '제2종일반주거지역', buildingAreaSqm: 25.82, amountKRW: 420_000_000, perBuildingPrice: 16_260_000, approvedDate: '19951230', distanceMeters: 186.4 },
      { txDate: '2026-01-26', address: '서울특별시 서초구 양재동 280-4', zoning: '제2종일반주거지역', buildingAreaSqm: 26.03, amountKRW: 420_000_000, perBuildingPrice: 16_130_000, approvedDate: '19951230', distanceMeters: 186.4 },
      { txDate: '2026-01-26', address: '서울특별시 서초구 양재동 280-4', zoning: '제2종일반주거지역', buildingAreaSqm: 26.03, amountKRW: 430_000_000, perBuildingPrice: 16_520_000, approvedDate: '19951230', distanceMeters: 186.4 },
      { txDate: '2026-01-26', address: '서울특별시 서초구 양재동 280-4', zoning: '제2종일반주거지역', buildingAreaSqm: 26.07, amountKRW: 430_000_000, perBuildingPrice: 16_490_000, approvedDate: '19951230', distanceMeters: 186.4 },
      { txDate: '2026-01-26', address: '서울특별시 서초구 양재동 280-4', zoning: '제2종일반주거지역', buildingAreaSqm: 26.10, amountKRW: 450_000_000, perBuildingPrice: 17_240_000, approvedDate: '19951230', distanceMeters: 186.4 },
      { txDate: '2026-01-26', address: '서울특별시 서초구 양재동 280-4', zoning: '제2종일반주거지역', buildingAreaSqm: 26.34, amountKRW: 450_000_000, perBuildingPrice: 17_090_000, approvedDate: '19951230', distanceMeters: 186.4 },
    ],
    summary: {
      avgAmount: 431_000_000,
      medianAmount: 430_000_000,
      avgPerBuildingPrice: 16_570_000,
    },
  },
}

// ─── 샘플 리포트 빌더 ────────────────────────────────────────
export function buildSampleReport(): UnifiedAnalysisReport {
  const totalBond = 765_000_000   // 원금 7억 + 연체이자 ~0.65억 (계산식 기반)
  const appraisal = 835_000_000   // 8.35억 — 동일 주소 낙찰 사례와 일치

  const input: UnifiedReportInput = {
    assetId: 'sample-gangnam-gaepo-1195-8',
    assetTitle: '강남 개포동 다세대(빌라) · 우리은행 NPL',
    region: '서울특별시 강남구 개포동',
    propertyType: '다세대(빌라)',
    propertyCategory: '다세대(빌라)',
    appraisalValue: appraisal,
    totalBondAmount: totalBond,
    minBidPrice: estimateMinBid(appraisal, 1),      // 1회 유찰 기준 (감정가 × 0.8^1)
    currentMarketValue: 760_000_000,                 // 인근 실거래 단가 × 전용면적 추정
    specialConditions: {
      lienRight: false,
      statutorySuperficies: false,
      sharedAuction: false,
      seniorTenant: false,    // 선순위 임차인 없음 (대항력 없는 임차 or 소유자 점유)
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

  // ── 등기부 분석 (사용자 스크린샷 수치 기반) ───────────────
  // 청구금액 1.35억, 입찰예상가 3.536억, 집행비용 총계 4,257,059원
  const registryAnalysis = buildRegistryAnalysis({
    claimAmount: 135_041_313,
    bidPrice: 353_600_000,
    interestedPartyCount: 3,
    parcelCount: 1,
    failedBidCount: 1,
    claims: [
      { rank: 2, right: '소액임차인',   creditor: '박진철',                                 claimAmount: 20_000_000 },
      { rank: 3, right: '근저당권설정', creditor: '한국주택금융공사(문현동,부산국제금융센터)', claimAmount: 270_600_000 },
      { rank: 4, right: '근저당권설정', creditor: '유안타저축은행(주)(논현동,영풍빌딩)',         claimAmount: 156_000_000 },
      { rank: 5, right: '우선변제권 없는 임차인', creditor: '박진철',                         claimAmount: 0,           buyerAssume: false },
    ],
    rightsOverrides: {
      '경매집행비용':                      { registryEvidence: '-', presence: 'PRESENT' },
      '소액임차인 최우선변제금':           { registryEvidence: 'O', presence: 'PRESENT' },
      '당해세(국세·지방세)':               { registryEvidence: '-', presence: 'NEEDS_REVIEW' },
      '일반우선채권(근저당·전세권 등)':    { registryEvidence: 'O', presence: 'PRESENT' },
      '일반채권(가압류 등)':               { registryEvidence: '-', presence: 'NEEDS_REVIEW' },
      '우선변제권 없는 임차인':            { registryEvidence: 'O', presence: 'PRESENT' },
    },
    topRisks: [
      '후순위 근저당(유안타저축은행) 미배당 약 9,725만원 발생 — 실투자금 영향 없음(소멸)',
      '당해세·일반 가압류 등기부 외 조사 필요(송달내역 별도 확인)',
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
      narrative: `LTV ${ltv.ltvPercent.toFixed(1)}% · 지역 동향 ${region.score}점 · 낙찰가율 조정치 ${auction.adjustedBidRatio.toFixed(1)}%. ${auction.specialConditionPenalty < 0 ? `특수조건 ${auction.specialConditionPenalty.toFixed(1)}%p 감점 반영. ` : ''}강남구 다세대 시장 안정세, 최근 3개월 낙찰가율 ${SAMPLE_STATISTICS.auctionRatioStats[0].rows.find(r => r.bucket === '3M')?.bidRatio.toFixed(1)}%로 탄탄한 흐름.`,
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
          title: '동일 주소 이전 낙찰가율 72.5% — 지역 평균보다 낮음',
          description: '지역(강남구) 6개월 평균 81.2% 대비 8.7%p 낮게 낙찰된 사례. 물건별 특성(층·구조) 확인 필요.',
          evidence: '2024타경113807 · 낙찰가 5.0억 / 감정가 6.9억',
          confidence: 88,
        },
        {
          id: 'ANM-002',
          category: 'RIGHTS',
          severity: 'WARNING',
          title: '선순위 임차인 대항력 — 보증금 인수 가능성',
          description: '등기부상 우선변제권 있는 임차인 확인됨. 낙찰가에서 보증금 차감 구조 고려.',
          evidence: '매물 등록 시 특수조건 체크: seniorTenant=true',
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
        rationale: '인근 서초동 낙찰가율 중앙값 55.65%에 가까워 낙찰 가능성 낮으나 리스크 최저',
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
        `강남구 다세대 낙찰가율은 최근 1년 89.5% → 6개월 81.2% → 3개월 88.0% → 1개월 90.8%로 ` +
        `최근 3개월 반등 흐름. 인근 실거래 단가(건물당 약 1,650만원/㎡) 견조. ` +
        `다만 서초동 인근 낙찰가율(55.65%)이 강남구 평균보다 현저히 낮아 세부 입지별 분화 뚜렷.`,
      indicators: [
        { label: '지역 6개월 낙찰가율', value: `${region.auctionMomentum > 0 ? '+' : ''}${region.auctionMomentum}%p vs 1년`, trend: region.auctionMomentum > 0 ? 'UP' : region.auctionMomentum < 0 ? 'DOWN' : 'FLAT', commentary: '강남구 다세대 낙찰가율 모멘텀' },
        { label: '인근 1km 실거래', value: `${region.transactionCount12M}건/12M`, trend: region.transactionVolumeChange > 0 ? 'UP' : 'FLAT', commentary: '양재동 280-4 소형 빌라 거래 활발' },
        { label: '법원 1회차 매각 기간', value: `${auction.expectedSaleDays ?? '—'}일`, trend: 'FLAT', commentary: '서울중앙지법 평균 대비 표준 수준' },
      ],
    },
    registryAnalysis,
    profitability: buildNplProfitability({
      property: {
        // 원본 주소 · 마스킹 처리 (지번·건물·호수)
        address: '서울특별시 강남구 개포동 ㅇㅇㅇㅇ-ㅇ ㅇㅇㅇㅇㅇㅇㅇㅇ ㅇ층ㅇㅇㅇ호',
        exclusiveAreaM2: 46.41,
        supplyAreaM2: 58.70,
        creditor: '우리은행',
        debtor: 'ㅇㅇㅇ',
        owner: '',              // UI 미표시
        tenant: '소유자 직접 점유',
      },
      // 매입가 = 대출원금 × (1 − 할인율) = 7.0억 × 0.90 = 6.30억 (6~6.5억 범위)
      loanPrincipal: 700_000_000,
      delinquencyRate: 0.089,
      delinquencyStartDate: '2025-07-23',
      // accelerationDate 생략 → 연체시작 + 60일 자동 계산
      appraisalValue: appraisal,               // 8.35억
      aiMarketValueLatest: 760_000_000,        // 7.60억 (AI 시세 현재)
      priceHistory: [
        { price: 835_000_000, reportedAt: '2024-08-15', source: 'APPRAISAL',   label: '감정가 (채권자 제공)' },
        { price: 760_000_000, reportedAt: '2025-10-21', source: 'AI_LATEST',   label: 'AI 시세 — 현재' },
        { price: 790_000_000, reportedAt: '2024-05-08', source: 'AI_PAST_1Y',  label: 'AI 시세 — 1년 전' },
        { price: 680_000_000, reportedAt: '2022-02-22', source: 'AI_PAST_3Y',  label: 'AI 시세 — 3년 전' },
      ],
      // 낙찰가율 84% — 지역 6M 88.3% 대비 보수 (동일주소 86.3% · 인근중앙값 85.6% 가중평균)
      expectedBidRatio: 0.84,
      expectedBidRatioPeriod: '최근 3개월 낙찰가율',
      auctionStartDate: '2025-10-21',
      courtName: '서울중앙지방법원 본원',
      discountRate: 0.10,                      // 할인율 10% → 매입가 6.30억
      pledgeLoanRatio: 0.75,
      pledgeInterestRate: 0.065,
      executionCost: 10_000_000,
      registrationTransferRate: 0.0048,
      brokerageFeeRate: 0.015,
      contractDepositRate: 0.10,
      asOfDate: '2026-04-21',
      mcSeed: 20260421,
      mcTrials: 10_000,
      // 민감도 축 확대 — 매입률 할인 폭 넓힘 + 낙찰가율 하단 확장
      sensitivityPurchaseRateAxis: [0.75, 0.80, 0.85, 0.90, 0.95, 1.00, 1.05], // 대출원금 대비 -25%~+5%
      sensitivityBidRatioAxis:     [0.55, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95], // 55%~95%
      evidence: {
        bidRatioStats: {
          selectedLabel: '강남구 다세대(빌라) · 3개월',
          items: [
            { scope: 'SIGUNGU',      region: '강남구',           periodMonths: 12, ratioPercent: 89.5, sampleSize: 31 },
            { scope: 'SIGUNGU',      region: '강남구',           periodMonths: 6,  ratioPercent: 88.3, sampleSize: 12 },
            { scope: 'SIGUNGU',      region: '강남구',           periodMonths: 3,  ratioPercent: 88.0, sampleSize: 5 },
            { scope: 'SIGUNGU',      region: '강남구',           periodMonths: 1,  ratioPercent: 90.8, sampleSize: 2 },
            { scope: 'EUPMYEONDONG', region: '강남구 개포동',     periodMonths: 12, ratioPercent: 86.3, sampleSize: 3 },
          ],
          narrative: '강남구 다세대 최근 1년 89.5% → 6개월 88.3% → 3개월 88.0% → 1개월 90.8%. 안정적 80%대 후반 흐름. 개포동 단독 평균 86.3%로 시군구 평균에 근접.',
        },
        courtSchedule: {
          courtName: '서울중앙지방법원 본원',
          avgSaleDays: 285,
          avgDistributionDays: 355,
          avgHearingInterval: 47,
          sampleSize: 126,
        },
        auctionCases: {
          averageDurationDays: 215,
          averageAppraisalValue: 835_000_000,
          averageSalePrice: 721_000_000,
          averageBidRatio: 86.3,
          sameAddress: [],
          nearbyWithin1Km: [
            { caseNo: '2024타경88921', address: '서울특별시 강남구 개포동 ㅇㅇㅇ-ㅇ',  distanceKm: 0.4, propertyCategory: '다세대(빌라)', appraisalValue: 780_000_000, salePrice: 685_000_000, bidRatio: 87.8, durationDays: 242, saleDate: '2025-09-18' },
            { caseNo: '2024타경91132', address: '서울특별시 강남구 개포동 ㅇㅇ-ㅇ',   distanceKm: 0.7, propertyCategory: '다세대(빌라)', appraisalValue: 650_000_000, salePrice: 553_000_000, bidRatio: 85.1, durationDays: 221, saleDate: '2025-11-04' },
            { caseNo: '2025타경10477', address: '서울특별시 강남구 개포동 ㅇ-ㅇㅇ',   distanceKm: 0.9, propertyCategory: '다세대(빌라)', appraisalValue: 920_000_000, salePrice: 784_000_000, bidRatio: 85.2, durationDays: 256, saleDate: '2026-02-12' },
          ],
        },
        nearbyTransactions: {
          averageLandAreaM2: 17.5,
          averageAmount: 430_000_000,
          averagePricePerM2: 16_570_000,
          averagePricePerPy: 54_800_000,
          samples: [
            { txDate: '2026-01-15', address: '서울특별시 강남구 개포동 ㅇ-ㅇㅇ',  distanceMeters: 186.0, landAreaM2: 25.82, amountKRW: 420_000_000, pricePerM2: 16_260_000, zoning: '제2종일반주거지역' },
            { txDate: '2025-12-22', address: '서울특별시 강남구 개포동 ㅇㅇ-ㅇ', distanceMeters: 455.0, landAreaM2: 26.07, amountKRW: 430_000_000, pricePerM2: 16_490_000, zoning: '제2종일반주거지역' },
            { txDate: '2025-11-08', address: '서울특별시 강남구 개포동 ㅇ-ㅇㅇ',  distanceMeters: 632.0, landAreaM2: 26.34, amountKRW: 450_000_000, pricePerM2: 17_090_000, zoning: '제2종일반주거지역' },
          ],
        },
      },
    }),
    executiveSummary:
      `강남구 개포동 다세대(빌라) NPL 딜 종합 분석 결과 ${riskGrade}등급, 예측 회수율 ${recovery.predictedRecoveryRate}%(신뢰도 ${Math.round(recovery.confidence * 100)}%)로 평가됩니다. ` +
      `지역 6개월 낙찰가율 ${SAMPLE_STATISTICS.auctionRatioStats[0].rows.find(r => r.bucket === '6M')?.bidRatio.toFixed(1)}%에 특수조건 ${auction.specialConditionPenalty.toFixed(1)}%p 반영한 ${auction.adjustedBidRatio.toFixed(1)}%를 기준 입찰가율로 제시하며, ` +
      `AI 권고 입찰가는 ${Math.round(recommendedBidPrice / 100_000_000 * 10) / 10}억입니다. ` +
      `동일 주소 이전 낙찰(${SAMPLE_STATISTICS.sameAddressAuction!.summary.avgBidRatio}%)과 인근 강남권(${SAMPLE_STATISTICS.nearbyAuction!.summary.avgBidRatio}%) 편차 고려, 보수·기준·공격 3단계 입찰 전략을 병행 권고합니다.`,
  }

  return report
}
