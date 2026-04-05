import { CaseRight, CaseAssumptions, DistributionResult, DistributionItem, ReturnAnalysis, SensitivityMatrix, RiskCheckItem, CaseTenant, FundingStructure, ExitValuation } from './types';

// ===== Module 3: Distribution Waterfall =====

export function calculateDistribution(
  salePrice: number,
  rights: CaseRight[],
  assumptions: CaseAssumptions
): DistributionResult {
  const auctionCost = Math.round(salePrice * assumptions.auction_cost_rate);
  const propertyTax = assumptions.property_tax;
  const smallTenantPriority = assumptions.small_tenant_amount;
  const wageClaim = assumptions.wage_claim;

  const distributableAmount = salePrice - auctionCost - propertyTax - smallTenantPriority - wageClaim;

  // Sort rights by priority_rank (배당순서 엄격 적용)
  const sortedRights = [...rights]
    .filter(r => r.classification !== '가압류·압류')
    .sort((a, b) => a.priority_rank - b.priority_rank);

  let remaining = Math.max(0, distributableAmount);
  const distributionDetail: DistributionItem[] = [];
  const recoveryRates: Record<string, number> = {};

  for (const right of sortedRights) {
    // 채권잔액 계산 (이자 반영) — 배당한도액 = min(원금+이자, 최고액)
    let distributionLimit = right.max_claim_amount || right.claim_amount;
    if (right.interest_rate > 0 && right.interest_start_date && assumptions.distribution_date) {
      const bondBalance = calculateBondBalance(
        right.principal,
        right.interest_rate,
        new Date(right.interest_start_date),
        new Date(assumptions.distribution_date),
        right.max_claim_amount || right.claim_amount
      );
      distributionLimit = bondBalance.distributionLimit;
    }

    const distribution = Math.min(Math.max(remaining, 0), distributionLimit);
    // 회수율 = 배당액 / 배당한도액 (이자 포함)
    const recoveryRate = distributionLimit > 0 ? distribution / distributionLimit : 0;

    distributionDetail.push({
      seq: right.seq,
      right_holder: right.right_holder,
      classification: right.classification,
      claim_amount: distributionLimit,
      distribution_amount: distribution,
      recovery_rate: recoveryRate,
      shortfall: Math.max(0, distributionLimit - distribution),
    });

    recoveryRates[right.right_holder] = recoveryRate;
    remaining -= distribution;
  }

  return {
    case_id: '',
    scenario_name: '',
    sale_price: salePrice,
    auction_cost: auctionCost,
    property_tax: propertyTax,
    small_tenant_priority: smallTenantPriority,
    wage_claim: wageClaim,
    distributable_amount: Math.max(0, distributableAmount),
    distribution_detail: distributionDetail,
    recovery_rates: recoveryRates,
    owner_surplus: Math.max(0, remaining),
  };
}

// Generate multiple distribution scenarios
export function generateDistributionScenarios(
  appraisalValue: number,
  minimumPrice: number,
  rights: CaseRight[],
  assumptions: CaseAssumptions,
  customPrices?: number[]
): DistributionResult[] {
  const scenarios: { name: string; price: number }[] = [
    { name: '최저가(현재)', price: minimumPrice },
    { name: '감정가 50%', price: Math.round(appraisalValue * 0.5) },
    { name: '감정가 55%', price: Math.round(appraisalValue * 0.55) },
    { name: '감정가 60%', price: Math.round(appraisalValue * 0.6) },
    { name: '감정가 65%', price: Math.round(appraisalValue * 0.65) },
    { name: '감정가 70%', price: Math.round(appraisalValue * 0.7) },
    { name: '감정가 80%', price: Math.round(appraisalValue * 0.8) },
  ];

  if (customPrices) {
    customPrices.forEach((price, i) => {
      scenarios.push({ name: `사용자 시나리오 ${i + 1}`, price });
    });
  }

  return scenarios.map(s => {
    const result = calculateDistribution(s.price, rights, assumptions);
    result.scenario_name = s.name;
    return result;
  });
}

// ===== Module 4: NPL Bond Purchase Return =====

export function calculateBondBalance(
  principal: number,
  interestRate: number,
  interestStartDate: Date,
  targetDate: Date,
  maxClaimAmount: number
): { balance: number; accruedInterest: number; distributionLimit: number } {
  const daysElapsed = Math.max(0, Math.floor((targetDate.getTime() - interestStartDate.getTime()) / (1000 * 60 * 60 * 24)));
  const accruedInterest = principal * interestRate * daysElapsed / 365;
  const balance = principal + accruedInterest;
  const distributionLimit = Math.min(balance, maxClaimAmount);

  return { balance, accruedInterest, distributionLimit };
}

export function calculateNplReturn(
  bondPrincipal: number,
  discountRate: number,
  expectedDistribution: number,
  investmentMonths: number,
  assumptions: CaseAssumptions,
  rights: CaseRight[] = [],
  appraisalValue: number = 0
): ReturnAnalysis {
  const bondPurchasePrice = Math.round(bondPrincipal * (1 - discountRate));

  // Funding structure (npl_통합모델 ④수익분석 기준)
  const contractDeposit = Math.round(bondPurchasePrice * (assumptions.contract_deposit_rate || 0.1));
  const balance = bondPurchasePrice - contractDeposit;
  const pledgeLoan = Math.round(bondPurchasePrice * assumptions.pledge_loan_ltv);
  const investmentDays = investmentMonths * 30;
  const pledgeInterest = Math.round(pledgeLoan * assumptions.pledge_loan_rate * investmentDays / 365);
  const transferCost = Math.round(bondPurchasePrice * assumptions.transfer_cost_rate);
  const vehicleFee = Math.round(bondPurchasePrice * assumptions.vehicle_fee_rate);

  // 에쿼티 = 매입가 - 질권대출 + 이전비용 + 비히클사용료 + 질권이자
  const equity = bondPurchasePrice - pledgeLoan + transferCost + vehicleFee + pledgeInterest;

  // 수익 계산 (수정됨: npl_통합모델 기준)
  // 총비용 = 매입가 + 이전비용 + 비히클사용료 + 질권이자
  const totalCost = bondPurchasePrice + transferCost + vehicleFee + pledgeInterest;
  // 수익금 = 배당회수금 - 총비용
  const netProfit = expectedDistribution - totalCost;
  // 기간수익률 = 수익금 / 에쿼티
  const absoluteReturn = equity > 0 ? netProfit / equity : 0;
  // 연환산수익률 = 기간수익률 × 365 / 회수기간일수
  const annualizedIrr = investmentDays > 0 ? absoluteReturn * 365 / investmentDays : 0;
  // MOIC = 배당회수금 / (에쿼티 + 질권대출)  → 총투입 대비 회수
  const moic = equity > 0 ? (expectedDistribution - pledgeLoan) / equity : 0;

  // 손실방어 분석 (실제 선순위 채권 합계)
  const seniorBondTotal = rights
    .filter(r => r.classification === '선순위')
    .reduce((sum, r) => sum + r.claim_amount, 0);
  const auctionCostForBreakEven = Math.round(appraisalValue * assumptions.auction_cost_rate);
  const breakEvenPrice = equity + seniorBondTotal + auctionCostForBreakEven + assumptions.property_tax + assumptions.small_tenant_amount + assumptions.wage_claim;
  const breakEvenRate = appraisalValue > 0 ? breakEvenPrice / appraisalValue : 0;

  // 자금조달 구조체
  const fundingStructure: FundingStructure = {
    contractDeposit,
    balance,
    pledgeLoan,
    pledgeInterest,
    transferCost,
    vehicleFee,
    equity,
    totalInvestment: totalCost,
  };

  return {
    case_id: '',
    strategy_type: 'NPL',
    scenario_name: `할인율 ${(discountRate * 100).toFixed(0)}%`,
    investment_amount: bondPurchasePrice,
    bond_purchase_price: bondPurchasePrice,
    equity_amount: equity,
    pledge_loan_amount: pledgeLoan,
    expected_return: expectedDistribution,
    net_profit: netProfit,
    absolute_return_rate: absoluteReturn,
    annualized_irr: annualizedIrr,
    moic: moic,
    break_even_price: breakEvenPrice,
    break_even_rate: breakEvenRate,
    funding_structure: fundingStructure,
  };
}

// ===== Module 5: Direct Auction IRR =====

export function calculateDirectAuctionIRR(
  bidPrice: number,
  assumptions: CaseAssumptions,
  appraisalValue: number,
  aiEstimatedValue: number | undefined,
  rentableArea: number
): ReturnAnalysis {
  // Total acquisition cost
  const acquisitionTax = Math.round(bidPrice * assumptions.acquisition_tax_rate);
  const otherCosts = Math.round(bidPrice * assumptions.other_cost_rate);
  const totalAcquisitionCost = bidPrice + acquisitionTax + otherCosts + assumptions.eviction_cost + assumptions.repair_cost;

  // Annual NOI
  const annualRent = rentableArea * assumptions.rent_unit_price * 12;
  const adjustedRent = annualRent * (1 - assumptions.vacancy_rate);
  const noi = Math.round(adjustedRent * (1 - assumptions.opex_rate));
  const cashYield = totalAcquisitionCost > 0 ? noi / totalAcquisitionCost : 0;

  // Exit valuation — 3가지 방법
  const holdingYears = assumptions.holding_period_years;
  // 방법A: Cap Rate (참고용)
  const methodA = assumptions.exit_cap_rate > 0 ? Math.round(noi / assumptions.exit_cap_rate) : 0;
  // 방법B: 감정가 상승
  const methodB = Math.round(appraisalValue * Math.pow(1 + assumptions.annual_appreciation_rate, holdingYears));
  // 방법C: AI시세 상승
  const aiBase = aiEstimatedValue || appraisalValue;
  const methodC = Math.round(aiBase * Math.pow(1 + assumptions.annual_appreciation_rate, holdingYears));
  // 최종 Exit = (B + C) / 2 (기존 모델과 동일, A는 참고용)
  const exitValue = Math.round((methodB + methodC) / 2);

  const exitValuation: ExitValuation = {
    methodA_capRate: methodA,
    methodB_appreciation: methodB,
    methodC_ai: methodC,
    applied: exitValue,
  };

  // Annual cashflows
  const cashflows: number[] = [-totalAcquisitionCost];
  for (let year = 1; year <= holdingYears; year++) {
    if (year < holdingYears) {
      cashflows.push(noi);
    } else {
      cashflows.push(noi + exitValue);
    }
  }

  const irr = calculateIRR(cashflows);
  const npv = calculateNPV(cashflows, 0.10);
  const totalReturn = cashflows.slice(1).reduce((sum, cf) => sum + cf, 0);
  const moic = totalAcquisitionCost > 0 ? totalReturn / totalAcquisitionCost : 0;

  return {
    case_id: '',
    strategy_type: '직접낙찰',
    scenario_name: `입찰가 ${formatKoreanBillion(bidPrice)}`,
    investment_amount: totalAcquisitionCost,
    equity_amount: totalAcquisitionCost,
    expected_return: totalReturn,
    net_profit: totalReturn - totalAcquisitionCost,
    absolute_return_rate: totalAcquisitionCost > 0 ? (totalReturn - totalAcquisitionCost) / totalAcquisitionCost : 0,
    annualized_irr: irr,
    moic: moic,
    npv: npv,
    cash_yield: cashYield,
    break_even_price: totalAcquisitionCost,
    break_even_rate: appraisalValue > 0 ? totalAcquisitionCost / appraisalValue : 0,
    annual_cashflows: cashflows,
    total_acquisition_cost: totalAcquisitionCost,
    annual_noi: noi,
    exit_value: exitValue,
    exit_valuation: exitValuation,
  };
}

// ===== IRR Calculation (Newton-Raphson) =====

export function calculateIRR(cashflows: number[], guess: number = 0.1, maxIterations: number = 1000, tolerance: number = 1e-7): number {
  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (let j = 0; j < cashflows.length; j++) {
      const factor = Math.pow(1 + rate, j);
      npv += cashflows[j] / factor;
      if (j > 0) {
        dnpv -= j * cashflows[j] / Math.pow(1 + rate, j + 1);
      }
    }

    if (Math.abs(npv) < tolerance) return rate;
    if (Math.abs(dnpv) < tolerance) break;

    rate -= npv / dnpv;

    if (rate < -0.99) rate = -0.99;
    if (rate > 10) rate = 10;
  }

  // Bisection fallback
  return calculateIRRBisection(cashflows);
}

function calculateIRRBisection(cashflows: number[], low: number = -0.5, high: number = 5, tolerance: number = 1e-7): number {
  for (let i = 0; i < 1000; i++) {
    const mid = (low + high) / 2;
    const npvMid = calculateNPV(cashflows, mid);

    if (Math.abs(npvMid) < tolerance || (high - low) / 2 < tolerance) {
      return mid;
    }

    const npvLow = calculateNPV(cashflows, low);
    if (npvLow * npvMid < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }
  return (low + high) / 2;
}

export function calculateNPV(cashflows: number[], rate: number): number {
  return cashflows.reduce((npv, cf, i) => npv + cf / Math.pow(1 + rate, i), 0);
}

// ===== Sensitivity Analysis =====

export function generateNplSensitivityMatrix(
  bondPrincipal: number,
  saleScenarios: number[],
  discountRates: number[],
  rights: CaseRight[],
  assumptions: CaseAssumptions,
  appraisalValue: number = 0
): SensitivityMatrix {
  const matrix: number[][] = [];

  for (const salePrice of saleScenarios) {
    const row: number[] = [];
    const distribution = calculateDistribution(salePrice, rights, assumptions);
    const nplBond = distribution.distribution_detail.find(
      d => d.classification === '매입채권(NPL)'
    );
    const expectedDist = nplBond?.distribution_amount || 0;

    for (const discountRate of discountRates) {
      const result = calculateNplReturn(bondPrincipal, discountRate, expectedDist, assumptions.investment_period_months, assumptions, rights, appraisalValue);
      row.push(result.annualized_irr);
    }
    matrix.push(row);
  }

  return {
    case_id: '',
    matrix_type: 'NPL_수익률',
    x_axis_label: '채권 할인율',
    y_axis_label: '낙찰가',
    x_values: discountRates.map(r => r * 100),
    y_values: saleScenarios,
    matrix_data: matrix,
  };
}

export function generateDirectSensitivityMatrix(
  bidPrices: number[],
  holdingPeriods: number[],
  assumptions: CaseAssumptions,
  appraisalValue: number,
  aiEstimatedValue: number | undefined,
  rentableArea: number
): SensitivityMatrix {
  const matrix: number[][] = [];

  for (const bidPrice of bidPrices) {
    const row: number[] = [];
    for (const period of holdingPeriods) {
      const modAssumptions = { ...assumptions, holding_period_years: period };
      const result = calculateDirectAuctionIRR(bidPrice, modAssumptions, appraisalValue, aiEstimatedValue, rentableArea);
      row.push(result.annualized_irr);
    }
    matrix.push(row);
  }

  return {
    case_id: '',
    matrix_type: '직접낙찰_IRR',
    x_axis_label: '보유기간(년)',
    y_axis_label: '입찰가',
    x_values: holdingPeriods,
    y_values: bidPrices,
    matrix_data: matrix,
  };
}

export function generateRentSensitivityMatrix(
  bidPrices: number[],
  rentPrices: number[],
  assumptions: CaseAssumptions,
  rentableArea: number
): SensitivityMatrix {
  const matrix: number[][] = [];

  for (const bidPrice of bidPrices) {
    const row: number[] = [];
    for (const rentPrice of rentPrices) {
      const acquisitionTax = Math.round(bidPrice * assumptions.acquisition_tax_rate);
      const otherCosts = Math.round(bidPrice * assumptions.other_cost_rate);
      const totalCost = bidPrice + acquisitionTax + otherCosts + assumptions.eviction_cost + assumptions.repair_cost;

      const annualRent = rentableArea * rentPrice * 12;
      const adjustedRent = annualRent * (1 - assumptions.vacancy_rate);
      const noi = adjustedRent * (1 - assumptions.opex_rate);
      const cashYield = totalCost > 0 ? noi / totalCost : 0;

      row.push(cashYield);
    }
    matrix.push(row);
  }

  return {
    case_id: '',
    matrix_type: '현금수익률',
    x_axis_label: '임대단가(원/㎡/월)',
    y_axis_label: '입찰가',
    x_values: rentPrices,
    y_values: bidPrices,
    matrix_data: matrix,
  };
}

// ===== Risk Assessment =====

export function assessRisks(
  caseInfo: { appraisal_value: number; minimum_price: number; ai_estimated_value?: number; auction_count: number; regulation_zone?: string },
  rights: CaseRight[],
  tenants: CaseTenant[],
  distributions: DistributionResult[]
): RiskCheckItem[] {
  const risks: RiskCheckItem[] = [];

  // 1. Opposition-right tenants
  const oppositionTenants = tenants.filter(t => t.has_opposition_right);
  risks.push({
    category: '대항력 임차인',
    description: '대항력 있는 임차인 존재 여부',
    level: oppositionTenants.length > 0 ? '높음' : '양호',
    detail: oppositionTenants.length > 0
      ? `대항력 있는 임차인 ${oppositionTenants.length}명 (보증금 합계: ${formatKoreanBillion(oppositionTenants.reduce((s, t) => s + t.deposit, 0))})`
      : '대항력 있는 임차인 없음',
  });

  // 2. Recovery rate risk
  const baseDistribution = distributions.find(d => d.scenario_name.includes('최저가'));
  const nplBond = baseDistribution?.distribution_detail.find(d => d.classification === '매입채권(NPL)');
  const recoveryRate = nplBond?.recovery_rate || 0;
  risks.push({
    category: '채권 회수율',
    description: '최저가 기준 NPL 채권 회수율',
    level: recoveryRate >= 1 ? '양호' : recoveryRate >= 0.7 ? '주의' : '높음',
    detail: `최저가 기준 회수율: ${(recoveryRate * 100).toFixed(1)}%`,
  });

  // 3. Bid deposit burden
  const minPriceRatio = caseInfo.appraisal_value > 0 ? caseInfo.minimum_price / caseInfo.appraisal_value : 0;
  risks.push({
    category: '입찰보증금',
    description: '입찰보증금 부담 수준',
    level: minPriceRatio > 0.5 ? '양호' : minPriceRatio > 0.3 ? '주의' : '높음',
    detail: `최저가율 ${(minPriceRatio * 100).toFixed(1)}% (입찰보증금: ${formatKoreanBillion(Math.round(caseInfo.minimum_price * 0.1))})`,
  });

  // 4. Regulation zone
  risks.push({
    category: '규제지역',
    description: '개발 제한 및 규제 여부',
    level: caseInfo.regulation_zone && caseInfo.regulation_zone !== '없음' ? '주의' : '양호',
    detail: caseInfo.regulation_zone || '규제지역 해당없음',
  });

  // 5. AI vs Appraisal gap
  if (caseInfo.ai_estimated_value) {
    const gap = (caseInfo.ai_estimated_value - caseInfo.appraisal_value) / caseInfo.appraisal_value;
    risks.push({
      category: 'AI시세 괴리',
      description: 'AI추정시세 vs 감정가 차이',
      level: Math.abs(gap) < 0.1 ? '양호' : Math.abs(gap) < 0.3 ? '주의' : '높음',
      detail: `AI시세 ${gap > 0 ? '+' : ''}${(gap * 100).toFixed(1)}% (${formatKoreanBillion(caseInfo.ai_estimated_value)})`,
    });
  }

  // 6. Auction count (stagnation risk)
  risks.push({
    category: '유찰횟수',
    description: '경매 진행 장기화 위험',
    level: caseInfo.auction_count <= 1 ? '양호' : caseInfo.auction_count <= 3 ? '주의' : '높음',
    detail: `${caseInfo.auction_count}회 유찰`,
  });

  return risks;
}

// ===== Formatting Helpers =====

export function formatKoreanBillion(value: number): string {
  if (Math.abs(value) >= 100000000) {
    const billions = value / 100000000;
    return `${billions.toFixed(1)}억`;
  } else if (Math.abs(value) >= 10000) {
    const manWon = value / 10000;
    return `${manWon.toFixed(0)}만`;
  }
  return `${value.toLocaleString()}원`;
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}
