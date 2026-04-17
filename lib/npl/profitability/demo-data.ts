/**
 * lib/npl/profitability/demo-data.ts
 *
 * 데모 체험용 사전 계산된 NPL 수익성 분석 결과
 * 서울 강남구 아파트 NPL — 하나저축은행 론세일 딜
 * 이 데이터는 실제 분석 엔진이 생성하는 것과 동일한 구조를 가짐
 */

import type { ProfitabilityResult } from './types'

export const DEMO_RESULT: ProfitabilityResult = {
  createdAt: new Date().toISOString(),

  input: {
    dealStructure: 'LOAN_SALE',
    analysisDate: new Date().toISOString().slice(0, 10),
    bond: {
      institutionName: '하나저축은행',
      debtorName: '김**',
      debtorType: 'INDIVIDUAL',
      loanType: '주택담보대출',
      originalPrincipal: 900_000_000,
      remainingPrincipal: 850_000_000,
      interestRate: 5.5,
      penaltyRate: 15.0,
      defaultStartDate: '2023-06-15',
      auctionCaseNo: '2024타경38291',
    },
    collateral: {
      region: '서울특별시',
      address: '서울특별시 강남구 역삼동 123-45 OO아파트 12층 1201호',
      propertyType: '아파트',
      propertyTypeMajor: 'RESIDENTIAL',
      area: 84.9,
      appraisalValue: 1_200_000_000,
      appraisalDate: '2024-01-10',
      currentMarketValue: 1_150_000_000,
      buildYear: 2008,
    },
    rights: {
      mortgageRank: 1,
      mortgageAmount: 900_000_000,
      seniorClaims: [
        { rank: 1, type: '근저당', holder: '하나저축은행', amount: 900_000_000, date: '2019-03-22' },
      ],
      tenants: [
        {
          name: '이**',
          deposit: 150_000_000,
          monthlyRent: 0,
          moveInDate: '2022-07-01',
          hasConfirmationDate: true,
          priority: 'JUNIOR',
        },
      ],
      otherEncumbrances: [],
    },
    loanSaleTerms: {
      purchaseRatio: 78,
      pledgeRatio: 70,
      pledgeInterestRate: 6.5,
    },
    auctionScenario: {
      expectedBidRatio: 82,
      auctionRound: 0,
      estimatedMonths: 8,
      bidReductionRate: 20,
    },
  },

  bondCalculation: {
    principal: 850_000_000,
    accruedInterest: 46_750_000,
    penaltyInterest: 127_500_000,
    totalBondAmount: 1_024_250_000,
    calculationDate: new Date().toISOString().slice(0, 10),
    daysOverdue: 300,
  },

  fundingStructure: {
    purchasePrice: 663_000_000,   // 850M × 78%
    ownCapital:    198_900_000,   // 30%
    borrowedCapital: 464_100_000, // 70% 질권
    borrowingCost:   30_166_500,  // 6.5% × 8개월
    totalInvestment: 229_066_500,
  },

  costs: {
    acquisitionTax:   37_440_000,  // 낙찰가 980M × 3.4% + 증지
    registrationTax:   9_840_000,
    legalFee:          4_900_000,
    brokerageFee:      4_900_000,  // 최고 요율 적용
    transferCost:      2_940_000,
    miscFee:           3_000_000,
    interestCost:     30_166_500,
    totalCosts:       93_186_500,
  },

  scenarios: [
    {
      type: 'BULL',
      label: '강세 (낙찰가율 92%)',
      bidRatio: 92,
      bidPrice: 1_104_000_000,
      recovery: {
        bidPrice: 1_104_000_000,
        executionCost: 22_080_000,
        distributableAmount: 1_081_920_000,
        distributionTable: [
          { rank: 1, holder: '당해세/집행비용', type: '세금', claimAmount: 22_080_000, distributionAmount: 22_080_000, shortfall: 0, recoveryRate: 1.0, isTarget: false },
          { rank: 2, holder: '하나저축은행(당사)', type: '근저당', claimAmount: 1_024_250_000, distributionAmount: 909_840_000, shortfall: 114_410_000, recoveryRate: 0.888, isTarget: true },
          { rank: 3, holder: '이** (임차인)', type: '임차보증', claimAmount: 150_000_000, distributionAmount: 150_000_000, shortfall: 0, recoveryRate: 1.0, isTarget: false },
        ],
        targetRecovery: 909_840_000,
        excessAmount: 0,
      },
      metrics: {
        grossProfit: 246_840_000,
        netProfit: 153_653_500,
        roi: 77.3,
        irr: 81.2,
        moic: 1.773,
        paybackMonths: 8,
        breakEvenBidRatio: 63.4,
      },
    },
    {
      type: 'BASE',
      label: '기준 (낙찰가율 82%)',
      bidRatio: 82,
      bidPrice: 984_000_000,
      recovery: {
        bidPrice: 984_000_000,
        executionCost: 19_680_000,
        distributableAmount: 964_320_000,
        distributionTable: [
          { rank: 1, holder: '당해세/집행비용', type: '세금', claimAmount: 19_680_000, distributionAmount: 19_680_000, shortfall: 0, recoveryRate: 1.0, isTarget: false },
          { rank: 2, holder: '하나저축은행(당사)', type: '근저당', claimAmount: 1_024_250_000, distributionAmount: 814_320_000, shortfall: 209_930_000, recoveryRate: 0.795, isTarget: true },
          { rank: 3, holder: '이** (임차인)', type: '임차보증', claimAmount: 150_000_000, distributionAmount: 130_000_000, shortfall: 20_000_000, recoveryRate: 0.867, isTarget: false },
        ],
        targetRecovery: 814_320_000,
        excessAmount: 0,
      },
      metrics: {
        grossProfit: 151_320_000,
        netProfit: 58_133_500,
        roi: 29.2,
        irr: 31.8,
        moic: 1.292,
        paybackMonths: 8,
        breakEvenBidRatio: 63.4,
      },
    },
    {
      type: 'BEAR',
      label: '약세 (낙찰가율 72%)',
      bidRatio: 72,
      bidPrice: 864_000_000,
      recovery: {
        bidPrice: 864_000_000,
        executionCost: 17_280_000,
        distributableAmount: 846_720_000,
        distributionTable: [
          { rank: 1, holder: '당해세/집행비용', type: '세금', claimAmount: 17_280_000, distributionAmount: 17_280_000, shortfall: 0, recoveryRate: 1.0, isTarget: false },
          { rank: 2, holder: '하나저축은행(당사)', type: '근저당', claimAmount: 1_024_250_000, distributionAmount: 696_720_000, shortfall: 327_530_000, recoveryRate: 0.680, isTarget: true },
          { rank: 3, holder: '이** (임차인)', type: '임차보증', claimAmount: 150_000_000, distributionAmount: 0, shortfall: 150_000_000, recoveryRate: 0, isTarget: false },
        ],
        targetRecovery: 696_720_000,
        excessAmount: 0,
      },
      metrics: {
        grossProfit: 33_720_000,
        netProfit: -59_466_500,
        roi: -29.9,
        irr: -33.1,
        moic: 0.701,
        paybackMonths: 0,
        breakEvenBidRatio: 63.4,
      },
    },
  ],

  baseScenario: {
    type: 'BASE',
    label: '기준 (낙찰가율 82%)',
    bidRatio: 82,
    bidPrice: 984_000_000,
    recovery: {
      bidPrice: 984_000_000,
      executionCost: 19_680_000,
      distributableAmount: 964_320_000,
      distributionTable: [
        { rank: 1, holder: '당해세/집행비용', type: '세금', claimAmount: 19_680_000, distributionAmount: 19_680_000, shortfall: 0, recoveryRate: 1.0, isTarget: false },
        { rank: 2, holder: '하나저축은행(당사)', type: '근저당', claimAmount: 1_024_250_000, distributionAmount: 814_320_000, shortfall: 209_930_000, recoveryRate: 0.795, isTarget: true },
        { rank: 3, holder: '이** (임차인)', type: '임차보증', claimAmount: 150_000_000, distributionAmount: 130_000_000, shortfall: 20_000_000, recoveryRate: 0.867, isTarget: false },
      ],
      targetRecovery: 814_320_000,
      excessAmount: 0,
    },
    metrics: {
      grossProfit: 151_320_000,
      netProfit: 58_133_500,
      roi: 29.2,
      irr: 31.8,
      moic: 1.292,
      paybackMonths: 8,
      breakEvenBidRatio: 63.4,
    },
  },

  aiPredictions: {
    bidRatio: {
      predicted: 83.2,
      confidence: 0.74,
      lowerBound: 71.0,
      upperBound: 94.5,
      factors: [
        { name: '강남구 아파트 평균 낙찰가율', impact: 0.38 },
        { name: '유찰 이력 없음 (1회차)', impact: 0.22 },
        { name: '임차인 후순위 (리스크 완화)', impact: 0.18 },
        { name: '감정가 대비 시세 95.8%', impact: 0.14 },
        { name: '채무자 개인 (기업 대비 낮음)', impact: 0.08 },
      ],
    },
    riskGrade: {
      grade: 'B',
      score: 68,
      factors: [
        { name: '담보가치', score: 78, weight: 0.30, detail: '강남구 아파트, 시세 1.15억 확인' },
        { name: '권리관계', score: 72, weight: 0.25, detail: '1순위 근저당, 후순위 임차인 1명' },
        { name: '시장리스크', score: 65, weight: 0.20, detail: '금리 인상기 서울 아파트 수요 양호' },
        { name: '유동성', score: 58, weight: 0.15, detail: '경매 8개월 소요 예상' },
        { name: '법적리스크', score: 70, weight: 0.10, detail: '유치권·법정지상권 해당 없음' },
      ],
    },
    monteCarlo: {
      iterations: 10_000,
      p10: -12.4,
      p25: 8.7,
      p50: 28.3,
      p75: 47.9,
      p90: 68.2,
      mean: 29.2,
      stdDev: 28.8,
      lossProb: 18.3,
      distribution: [],
    },
    sensitivity: {
      axis1Label: '매입률(%)',
      axis2Label: '낙찰가율(%)',
      axis1Values: [72, 75, 78, 81, 84],
      axis2Values: [70, 75, 80, 85, 90, 95],
      cells: [
        [52.1, 44.3, 36.8, 29.2, 21.8, 14.3],
        [46.8, 38.7, 30.9, 23.1, 15.4, 7.8],
        [40.9, 32.7, 24.7, 17.0, 9.2, 1.8],
        [34.5, 26.2, 18.1, 10.3, 2.6, -4.9],
        [27.6, 19.0, 10.8, 3.0, -4.7, -12.3],
      ],
    },
  },

  aiNarrative: {
    investmentOpinion: {
      verdict: 'BUY',
      confidence: 0.72,
      reasoning: '강남구 역삼동 아파트는 서울 핵심 입지로 경매 수요가 안정적이며, 1순위 근저당으로 권리관계가 단순합니다. 예상 낙찰가율 82%에서 ROI 29.2% 실현 가능하고, AI 예측 낙찰가율 83.2%는 기준 시나리오와 부합합니다. 후순위 임차인 보증금 1.5억은 배당 시 미회수 가능성이 있으나 투자 수익에는 제한적 영향입니다.',
      keyFactors: [
        '강남구 핵심 입지 — 경매 수요 지속',
        '1순위 근저당으로 배당 안전성 확보',
        '손익분기 낙찰가율 63.4% (현재 대비 18.6%p 여유)',
        'Monte Carlo 손실 확률 18.3%로 수용 가능',
      ],
    },
    riskSummary: {
      overallLevel: 'MEDIUM',
      items: [
        {
          category: '담보가치 리스크',
          severity: 'LOW',
          description: '감정가 대비 시세 95.8%. 강남구 아파트 가격 조정 가능성 낮음',
          mitigation: '손익분기 낙찰가율(63.4%)이 충분한 하방 버퍼 제공',
        },
        {
          category: '임차인 리스크',
          severity: 'MEDIUM',
          description: '후순위 이** 보증금 1.5억. 약세 시나리오에서 배당 불가능',
          mitigation: '임차인 대항력 확인 필수. 필요 시 인수조건 협의',
        },
        {
          category: '경매 소요기간',
          severity: 'LOW',
          description: '예상 8개월. 유찰 없음 가정. 유찰 시 최대 14개월 연장',
          mitigation: '질권 이자비용 증가 고려, 최대 유찰 2회 시나리오 사전 검토 필요',
        },
        {
          category: '금리/유동성 리스크',
          severity: 'LOW',
          description: '질권 금리 6.5%. 기간 연장 시 이자비용 증가',
          mitigation: '강남구 아파트 특성상 단기 유동화 가능',
        },
      ],
    },
    scenarioAnalysis: {
      bull: '낙찰가율 92% 실현 시 순이익 약 1.5억원, ROI 77.3% 달성. 강남구 프리미엄과 경쟁 입찰로 현실적인 시나리오. 임차인 보증금도 전액 배당 가능.',
      base: '낙찰가율 82%(AI 예측 83.2%와 근접) 기준 순이익 5,813만원, ROI 29.2% 실현. 현재 강남구 아파트 낙찰가율 추이와 일치하는 가장 현실적인 시나리오.',
      bear: '낙찰가율 72%로 하락 시 순손실 5,947만원. 유찰 1~2회 발생하거나 시장 급냉 시 발생 가능. 손익분기(63.4%)와 거리가 있어 실질 손실 위험은 제한적.',
      overall: '3개 시나리오 기대값 ROI +25.5%. 강세/기준 시나리오 실현 확률이 Monte Carlo 기준 81.7%로 높아 투자 적합 판단. 임차인 리스크 사전 확인 권장.',
    },
    executiveSummary: '서울 강남구 역삼동 OO아파트(전용 84.9㎡) NPL 론세일 딜에 대한 종합 분석 결과, B등급(양호) 투자로 평가됩니다. 하나저축은행 1순위 근저당 보유로 권리관계가 단순하며, AI 예측 낙찰가율 83.2% 기준 ROI 29.2%, IRR 31.8%의 수익을 기대할 수 있습니다. 손익분기 낙찰가율 63.4%는 현재 입찰 경쟁 수준 대비 18.6%p의 안전 마진을 제공합니다. 후순위 임차인 보증금 1.5억원에 대한 리스크 관리가 필요하나 투자 결정에 결정적인 장애 요인은 아닙니다. 경매 기간 8개월, 자기자본 수익률 77.3%(강세 시나리오) ~ -29.9%(약세) 범위에서 기준 시나리오 투자 권고(BUY) 등급을 부여합니다.',
  },
}
