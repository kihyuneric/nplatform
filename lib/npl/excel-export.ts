import * as XLSX from 'xlsx';
import type {
  NplCase, CaseRight, CaseTenant, CaseAssumptions,
  DistributionResult, ReturnAnalysis, SensitivityMatrix, RiskCheckItem,
} from './types';

function fmt(v: number): string {
  if (!v) return '-';
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(2)}억`;
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}만`;
  return v.toLocaleString();
}

function fmtP(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

interface ExportData {
  case_info: NplCase;
  rights: CaseRight[];
  tenants: CaseTenant[];
  assumptions: CaseAssumptions;
  distributions: DistributionResult[];
  returns: ReturnAnalysis[];
  sensitivity: SensitivityMatrix[];
  risks: RiskCheckItem[];
}

export function generateExcelReport(data: ExportData): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const c = data.case_info;

  // Sheet 1: 기본정보
  const sheet1Data = [
    ['NPL 투자분석 리포트'],
    [],
    ['사건 기본정보'],
    ['사건번호', c.case_number],
    ['관할법원', c.court_name],
    ['용도', c.property_type],
    ['소재지', c.address],
    ['물건구성', c.property_composition],
    ['토지면적', c.land_area ? `${c.land_area}m²` : '-'],
    ['건물면적', c.building_area ? `${c.building_area}m²` : '-'],
    [],
    ['가치 정보'],
    ['감정가', c.appraisal_value],
    ['최저매각가', c.minimum_price],
    ['최저가율', c.appraisal_value > 0 ? fmtP(c.minimum_price / c.appraisal_value) : '-'],
    ['AI 추정시세', c.ai_estimated_value || '-'],
    ['유찰횟수', `${c.auction_count}회`],
    [],
    ['분석 가정값'],
    ['경매비용률', fmtP(data.assumptions?.auction_cost_rate || 0.005)],
    ['투자기간', `${data.assumptions?.investment_period_months || 12}개월`],
    ['할인율(기본)', fmtP(data.assumptions?.bond_discount_rate_base || 0.15)],
    ['질권LTV', fmtP(data.assumptions?.pledge_loan_ltv || 0.75)],
    ['질권이자율', fmtP(data.assumptions?.pledge_loan_rate || 0.065)],
    ['이전비용률', fmtP(data.assumptions?.transfer_cost_rate || 0.0048)],
    ['비히클사용료율', fmtP(data.assumptions?.vehicle_fee_rate || 0.01)],
    ['보유기간', `${data.assumptions?.holding_period_years || 5}년`],
    ['임대단가', `${(data.assumptions?.rent_unit_price || 6000).toLocaleString()}원/m²/월`],
    ['공실률', fmtP(data.assumptions?.vacancy_rate || 0.2)],
    ['운영비율', fmtP(data.assumptions?.opex_rate || 0.15)],
    ['연간상승률', fmtP(data.assumptions?.annual_appreciation_rate || 0.02)],
    ['Exit Cap Rate', fmtP(data.assumptions?.exit_cap_rate || 0.05)],
    ['취득세율', fmtP(data.assumptions?.acquisition_tax_rate || 0.046)],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [{ wch: 18 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws1, '①기본정보');

  // Sheet 2: 권리분석
  const sheet2Data = [
    ['등기부 권리현황'],
    [],
    ['순위', '권리종류', '권리자', '분류', '채권최고액', '채권원금', '이자율'],
    ...data.rights.map(r => [
      r.priority_rank, r.right_type, r.right_holder, r.classification,
      r.max_claim_amount || r.claim_amount, r.principal,
      fmtP(r.interest_rate),
    ]),
    [],
    ['임차인 현황'],
    [],
    ['임차인명', '전입일', '보증금', '월세', '대항력'],
    ...data.tenants.map(t => [
      t.tenant_name, t.move_in_date || '-',
      t.deposit, t.monthly_rent,
      t.has_opposition_right ? '있음' : '없음',
    ]),
    [],
    ['리스크 평가'],
    [],
    ['항목', '수준', '상세'],
    ...data.risks.map(r => [r.category, r.level, r.detail]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws2, '②권리분석');

  // Sheet 3: 배당시뮬레이션
  const sheet3Data: (string | number)[][] = [['배당 시뮬레이션'], []];
  for (const dist of data.distributions) {
    sheet3Data.push([dist.scenario_name]);
    sheet3Data.push(['낙찰가', dist.sale_price]);
    sheet3Data.push(['경매비용', dist.auction_cost]);
    sheet3Data.push(['당해세', dist.property_tax]);
    sheet3Data.push(['소액임차인', dist.small_tenant_priority]);
    sheet3Data.push(['임금채권', dist.wage_claim]);
    sheet3Data.push(['배당가능액', dist.distributable_amount]);
    sheet3Data.push([]);
    sheet3Data.push(['채권자', '분류', '채권액', '배당액', '회수율', '부족액']);
    for (const d of (dist.distribution_detail || [])) {
      sheet3Data.push([
        d.right_holder, d.classification,
        d.claim_amount, d.distribution_amount,
        fmtP(d.recovery_rate), d.shortfall,
      ]);
    }
    if (dist.owner_surplus && dist.owner_surplus > 0) {
      sheet3Data.push(['잉여금 (소유자)', '', '', dist.owner_surplus, '', '']);
    }
    sheet3Data.push([]);
  }
  const ws3 = XLSX.utils.aoa_to_sheet(sheet3Data);
  ws3['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws3, '③배당시뮬');

  // Sheet 4: NPL 수익분석
  const nplReturns = data.returns.filter(r => r.strategy_type === 'NPL');
  const sheet4Data: (string | number)[][] = [
    ['NPL 채권매입 수익분석'],
    [],
    ['항목', ...nplReturns.map(r => r.scenario_name)],
    ['매입가', ...nplReturns.map(r => r.bond_purchase_price || 0)],
    ['에쿼티', ...nplReturns.map(r => r.equity_amount)],
    ['질권대출', ...nplReturns.map(r => r.pledge_loan_amount || 0)],
    ['예상배당', ...nplReturns.map(r => r.expected_return)],
    ['순이익', ...nplReturns.map(r => r.net_profit)],
    ['연환산 IRR', ...nplReturns.map(r => fmtP(r.annualized_irr))],
    ['MOIC', ...nplReturns.map(r => r.moic?.toFixed(2) + 'x')],
    ['손실방어가', ...nplReturns.map(r => r.break_even_price)],
    ['손실방어율', ...nplReturns.map(r => fmtP(r.break_even_rate))],
  ];

  // Add funding structure if available
  const baseNpl = nplReturns.find(r => r.scenario_name === '기본') || nplReturns[0];
  if (baseNpl?.funding_structure) {
    const fs = baseNpl.funding_structure;
    sheet4Data.push([]);
    sheet4Data.push(['자금조달 구조 (기본 시나리오)']);
    sheet4Data.push(['계약금', fs.contractDeposit]);
    sheet4Data.push(['잔금', fs.balance]);
    sheet4Data.push(['질권대출', fs.pledgeLoan]);
    sheet4Data.push(['질권이자', fs.pledgeInterest]);
    sheet4Data.push(['이전비용', fs.transferCost]);
    sheet4Data.push(['비히클사용료', fs.vehicleFee]);
    sheet4Data.push(['에쿼티', fs.equity]);
    sheet4Data.push(['총투입금', fs.totalInvestment]);
  }

  const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);
  ws4['!cols'] = [{ wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws4, '④NPL수익');

  // Sheet 5: 직접낙찰
  const directReturns = data.returns.filter(r => r.strategy_type === '직접낙찰');
  const sheet5Data: (string | number)[][] = [
    ['직접낙찰 수익분석'],
    [],
    ['항목', ...directReturns.map(r => r.scenario_name)],
    ['총취득원가', ...directReturns.map(r => r.total_acquisition_cost || r.investment_amount)],
    ['연간 NOI', ...directReturns.map(r => r.annual_noi || 0)],
    ['현금수익률', ...directReturns.map(r => r.cash_yield ? fmtP(r.cash_yield) : '-')],
    ['연환산 IRR', ...directReturns.map(r => fmtP(r.annualized_irr))],
    ['MOIC', ...directReturns.map(r => r.moic?.toFixed(2) + 'x')],
    ['NPV (10%)', ...directReturns.map(r => r.npv || 0)],
  ];

  // Exit valuation for each scenario
  for (const r of directReturns) {
    if (r.exit_valuation) {
      sheet5Data.push([]);
      sheet5Data.push([`Exit 가치 - ${r.scenario_name}`]);
      sheet5Data.push(['A. Cap Rate 방식', r.exit_valuation.methodA_capRate]);
      sheet5Data.push(['B. 감정가 상승 방식', r.exit_valuation.methodB_appreciation]);
      sheet5Data.push(['C. AI 추정 방식', r.exit_valuation.methodC_ai]);
      sheet5Data.push(['적용값 (B+C 평균)', r.exit_valuation.applied]);
    }
  }

  // Annual cashflows
  const baseDir = directReturns[1] || directReturns[0];
  if (baseDir?.annual_cashflows) {
    sheet5Data.push([]);
    sheet5Data.push(['연간 현금흐름 (기본 시나리오)']);
    sheet5Data.push(['연도', '현금흐름']);
    baseDir.annual_cashflows.forEach((cf, i) => {
      sheet5Data.push([i === 0 ? 'Year 0 (투자)' : `Year ${i}`, cf]);
    });
  }

  const ws5 = XLSX.utils.aoa_to_sheet(sheet5Data);
  ws5['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, ws5, '⑤직접낙찰');

  // Sheet 6: 전략비교 & 민감도
  const sheet6Data: (string | number)[][] = [
    ['NPL vs 직접낙찰 전략비교'],
    [],
    ['항목', 'NPL 채권매입', '직접 낙찰'],
  ];

  if (baseNpl && baseDir) {
    sheet6Data.push(['투자금액', baseNpl.equity_amount, baseDir.total_acquisition_cost || baseDir.investment_amount]);
    sheet6Data.push(['연환산 IRR', fmtP(baseNpl.annualized_irr), fmtP(baseDir.annualized_irr)]);
    sheet6Data.push(['MOIC', baseNpl.moic?.toFixed(2) + 'x', baseDir.moic?.toFixed(2) + 'x']);
    sheet6Data.push(['순이익', baseNpl.net_profit, baseDir.net_profit]);
  }

  // Add sensitivity matrices
  for (const s of data.sensitivity) {
    sheet6Data.push([]);
    sheet6Data.push([`민감도 분석: ${s.matrix_type}`]);
    sheet6Data.push([`${s.y_axis_label} \\ ${s.x_axis_label}`, ...s.x_values]);
    for (let row = 0; row < s.y_values.length; row++) {
      sheet6Data.push([s.y_values[row], ...(s.matrix_data[row] || []).map(v => fmtP(v))]);
    }
  }

  const ws6 = XLSX.utils.aoa_to_sheet(sheet6Data);
  ws6['!cols'] = [{ wch: 22 }, ...Array(10).fill({ wch: 14 })];
  XLSX.utils.book_append_sheet(wb, ws6, '⑥전략비교');

  return wb;
}
