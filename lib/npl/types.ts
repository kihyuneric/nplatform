// Types for NPL Investment Analysis Platform

export interface NplCase {
  id?: string;
  user_id?: string;
  case_number: string;
  court_name: string;
  case_type: string;
  property_type: string;
  address: string;
  detailed_address?: string;
  regulation_zone?: string;
  appraisal_value: number;
  minimum_price: number;
  ai_estimated_value?: number;
  total_claim_amount?: number;
  land_area: number;
  building_area: number;
  building_extra_area?: number;
  auction_count: number;
  next_auction_date?: string;
  property_composition: '단독' | '복수-동일담보' | '복수-개별담보';
  debtor_name?: string;
  owner_name?: string;
  main_creditor?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuctionHistory {
  id?: string;
  case_id: string;
  round: number;
  auction_date?: string;
  minimum_price: number;
  result: string;
  sale_price?: number;
  bidder_count?: number;
}

export interface CaseProperty {
  id?: string;
  case_id: string;
  property_no: number;
  lot_number?: string;
  building_name?: string;
  unit_no?: string;
  usage_type: string;
  land_area: number;
  building_area: number;
  appraisal_value: number;
  minimum_price: number;
  sale_rate_assumption: number;
  estimated_sale_price: number;
  senior_bond_amount: number;
}

export interface CaseRight {
  id?: string;
  case_id: string;
  seq: number;
  registration_date?: string;
  right_type: string;
  right_holder: string;
  claim_amount: number;
  principal: number;
  max_claim_amount: number;
  interest_rate: number;
  interest_start_date?: string;
  priority_rank: number;
  classification: '선순위' | '매입채권(NPL)' | '후순위' | '가압류·압류';
  extinguish_yn: boolean;
  is_cancellation_basis: boolean;
  notes?: string;
}

export interface CaseTenant {
  id?: string;
  case_id: string;
  tenant_name: string;
  move_in_date?: string;
  fixed_date?: string;
  deposit: number;
  monthly_rent: number;
  has_opposition_right: boolean;
  priority_repayment: number;
  risk_level: '높음' | '주의' | '양호';
  notes?: string;
}

export interface CaseAssumptions {
  id?: string;
  case_id: string;
  auction_cost_rate: number;
  property_tax: number;
  small_tenant_amount: number;
  wage_claim: number;
  investment_period_months: number;
  target_bond_rank: number;
  target_bond_id?: string;
  bond_discount_rate_conservative: number;
  bond_discount_rate_base: number;
  bond_discount_rate_aggressive: number;
  pledge_loan_ltv: number;
  pledge_loan_rate: number;
  transfer_cost_rate: number;
  vehicle_fee_rate: number;
  holding_period_years: number;
  acquisition_tax_rate: number;
  other_cost_rate: number;
  eviction_cost: number;
  repair_cost: number;
  rent_unit_price: number;
  vacancy_rate: number;
  opex_rate: number;
  annual_appreciation_rate: number;
  exit_cap_rate: number;
  pbr_multiple: number;
  purchase_date?: string;
  settlement_date?: string;
  distribution_date?: string;
  overdue_interest_rate: number;
  overdue_interest_start_date?: string;
  contract_deposit_rate?: number;
}

export interface DistributionResult {
  id?: string;
  case_id: string;
  scenario_name: string;
  sale_price: number;
  auction_cost: number;
  property_tax: number;
  small_tenant_priority: number;
  wage_claim: number;
  distributable_amount: number;
  distribution_detail: DistributionItem[];
  recovery_rates: Record<string, number>;
  owner_surplus?: number;
}

export interface DistributionItem {
  seq: number;
  right_holder: string;
  classification: string;
  claim_amount: number;
  distribution_amount: number;
  recovery_rate: number;
  shortfall: number;
}

export interface ReturnAnalysis {
  id?: string;
  case_id: string;
  strategy_type: 'NPL' | '직접낙찰';
  scenario_name: string;
  investment_amount: number;
  bond_purchase_price?: number;
  equity_amount: number;
  pledge_loan_amount?: number;
  expected_return: number;
  net_profit: number;
  absolute_return_rate: number;
  annualized_irr: number;
  moic: number;
  npv?: number;
  cash_yield?: number;
  break_even_price: number;
  break_even_rate: number;
  annual_cashflows?: number[];
  total_acquisition_cost?: number;
  annual_noi?: number;
  exit_value?: number;
  funding_structure?: FundingStructure;
  exit_valuation?: ExitValuation;
}

export interface FundingStructure {
  contractDeposit: number;
  balance: number;
  pledgeLoan: number;
  pledgeInterest: number;
  transferCost: number;
  vehicleFee: number;
  equity: number;
  totalInvestment: number;
}

export interface ExitValuation {
  methodA_capRate: number;
  methodB_appreciation: number;
  methodC_ai: number;
  applied: number;
}

export interface SensitivityMatrix {
  id?: string;
  case_id: string;
  matrix_type: string;
  x_axis_label: string;
  y_axis_label: string;
  x_values: number[];
  y_values: number[];
  matrix_data: number[][];
}

export interface RiskCheckItem {
  category: string;
  description: string;
  level: '높음' | '주의' | '양호';
  detail: string;
}

export interface AnalysisReport {
  case_info: NplCase;
  properties: CaseProperty[];
  rights: CaseRight[];
  tenants: CaseTenant[];
  assumptions: CaseAssumptions;
  auction_history: AuctionHistory[];
  distributions: DistributionResult[];
  npl_returns: ReturnAnalysis[];
  direct_returns: ReturnAnalysis[];
  sensitivity: SensitivityMatrix[];
  risks: RiskCheckItem[];
}

// Default assumptions
export const DEFAULT_ASSUMPTIONS: Omit<CaseAssumptions, 'id' | 'case_id'> = {
  auction_cost_rate: 0.005,
  property_tax: 0,
  small_tenant_amount: 0,
  wage_claim: 0,
  investment_period_months: 12,
  target_bond_rank: 1,
  bond_discount_rate_conservative: 0.20,
  bond_discount_rate_base: 0.15,
  bond_discount_rate_aggressive: 0.10,
  pledge_loan_ltv: 0.75,
  pledge_loan_rate: 0.065,
  transfer_cost_rate: 0.0048,
  vehicle_fee_rate: 0.01,
  holding_period_years: 5,
  acquisition_tax_rate: 0.046,
  other_cost_rate: 0.005,
  eviction_cost: 30000000,
  repair_cost: 50000000,
  rent_unit_price: 6000,
  vacancy_rate: 0.20,
  opex_rate: 0.15,
  annual_appreciation_rate: 0.02,
  exit_cap_rate: 0.05,
  pbr_multiple: 1.13,
  overdue_interest_rate: 0.15,
  contract_deposit_rate: 0.1,
};
