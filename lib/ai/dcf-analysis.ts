// ─── DCF(할인현금흐름) 분석 엔진 ─────────────────────────────
// NPL 투자의 재무 타당성 분석을 위한 DCF 모델.
// 임대수익, 관리비, 공실률, 할인율, 잔존가치 → NPV/IRR 산출.

export interface DCFInput {
  purchasePrice: number       // 매입가
  monthlyRent: number         // 월 임대수입
  monthlyExpenses: number     // 월 관리비·운영비
  vacancyRate: number         // 공실률 (0~1)
  holdingPeriodYears: number  // 보유 기간 (년)
  discountRate: number        // 할인율 (0~1, e.g. 0.10)
  rentGrowthRate: number      // 임대료 상승률 (0~1, e.g. 0.02)
  expenseGrowthRate: number   // 비용 상승률 (0~1, e.g. 0.03)
  terminalCapRate: number     // 잔존가치 산정 환원율 (0~1, e.g. 0.07)
  acquisitionCosts: number    // 취득 부대비용 (취득세, 법무사 비용 등)
  dispositionCosts: number    // 처분 비용률 (0~1, e.g. 0.03)
  debtAmount?: number         // 대출금
  debtRate?: number           // 대출 금리 (0~1)
  debtTermYears?: number      // 대출 기간
}

export interface DCFResult {
  // 기본 지표
  npv: number                 // 순현재가치
  irr: number                 // 내부수익률 (%)
  equityMultiple: number      // 자기자본 배수
  totalReturn: number         // 총 수익률 (%)
  annualizedReturn: number    // 연환산 수익률 (%)

  // 현금흐름 테이블
  yearlyFlows: YearlyCashFlow[]
  totalNOI: number
  totalCashFlow: number

  // 민감도 분석
  sensitivityMatrix: {
    discountRates: number[]
    capRates: number[]
    npvGrid: number[][]       // [discountRate][capRate]
  }

  // 추가 지표
  capRate: number
  cashOnCash: number          // 현금수익률
  dscr: number                // Debt Service Coverage Ratio
  breakEvenOccupancy: number  // 손익분기 입주율 (%)
  paybackYears: number        // 투자금 회수 기간 (년)
}

export interface YearlyCashFlow {
  year: number
  grossRent: number
  vacancyLoss: number
  effectiveGrossIncome: number
  operatingExpenses: number
  noi: number                 // Net Operating Income
  debtService: number
  cashFlowBeforeTax: number
  presentValue: number
  cumulativeCashFlow: number
}

// ─── DCF 계산 엔진 ──────────────────────────────────────────

export function runDCF(input: DCFInput): DCFResult {
  const {
    purchasePrice, monthlyRent, monthlyExpenses, vacancyRate,
    holdingPeriodYears: n, discountRate: r, rentGrowthRate, expenseGrowthRate,
    terminalCapRate, acquisitionCosts, dispositionCosts,
    debtAmount = 0, debtRate = 0, debtTermYears = n,
  } = input

  const totalInvestment = purchasePrice + acquisitionCosts
  const equity = totalInvestment - debtAmount
  const annualDebtService = debtAmount > 0 ? calculateAnnualDebtService(debtAmount, debtRate, debtTermYears) : 0

  const yearlyFlows: YearlyCashFlow[] = []
  let totalNOI = 0
  let totalCashFlow = 0
  let totalPV = 0
  let cumulativeCF = -equity

  for (let y = 1; y <= n; y++) {
    const grossRent = monthlyRent * 12 * Math.pow(1 + rentGrowthRate, y - 1)
    const vacancyLoss = grossRent * vacancyRate
    const egi = grossRent - vacancyLoss
    const opex = monthlyExpenses * 12 * Math.pow(1 + expenseGrowthRate, y - 1)
    const noi = egi - opex
    const cfbt = noi - annualDebtService
    const pv = cfbt / Math.pow(1 + r, y)

    totalNOI += noi
    totalCashFlow += cfbt
    totalPV += pv
    cumulativeCF += cfbt

    yearlyFlows.push({
      year: y,
      grossRent: Math.round(grossRent),
      vacancyLoss: Math.round(vacancyLoss),
      effectiveGrossIncome: Math.round(egi),
      operatingExpenses: Math.round(opex),
      noi: Math.round(noi),
      debtService: Math.round(annualDebtService),
      cashFlowBeforeTax: Math.round(cfbt),
      presentValue: Math.round(pv),
      cumulativeCashFlow: Math.round(cumulativeCF),
    })
  }

  // Terminal Value (잔존가치)
  const lastNOI = yearlyFlows[n - 1]?.noi ?? 0
  const grossTerminalValue = lastNOI * (1 + rentGrowthRate) / terminalCapRate
  const netTerminalValue = grossTerminalValue * (1 - dispositionCosts) - Math.max(0, debtAmount)
  const terminalPV = netTerminalValue / Math.pow(1 + r, n)
  totalPV += terminalPV
  totalCashFlow += netTerminalValue

  const npv = totalPV - equity
  const irr = calculateIRR(equity, yearlyFlows.map(f => f.cashFlowBeforeTax), netTerminalValue)
  const equityMultiple = (totalCashFlow + equity) / equity
  const totalReturn = (equityMultiple - 1) * 100
  const annualizedReturn = (Math.pow(equityMultiple, 1 / n) - 1) * 100

  // 추가 지표
  const year1NOI = yearlyFlows[0]?.noi ?? 0
  const capRate = totalInvestment > 0 ? (year1NOI / totalInvestment) * 100 : 0
  const cashOnCash = equity > 0 ? ((yearlyFlows[0]?.cashFlowBeforeTax ?? 0) / equity) * 100 : 0
  const dscr = annualDebtService > 0 ? year1NOI / annualDebtService : Infinity
  const breakEvenOccupancy = monthlyRent * 12 > 0
    ? ((monthlyExpenses * 12 + annualDebtService) / (monthlyRent * 12)) * 100
    : 0
  const paybackYears = yearlyFlows.findIndex(f => f.cumulativeCashFlow >= 0)
  const payback = paybackYears >= 0 ? paybackYears + 1 : n + 1

  // 민감도 분석
  const discountRates = [0.06, 0.08, 0.10, 0.12, 0.14, 0.16]
  const capRates = [0.05, 0.06, 0.07, 0.08, 0.09, 0.10]
  const npvGrid: number[][] = discountRates.map(dr =>
    capRates.map(cr => {
      const tv = lastNOI * (1 + rentGrowthRate) / cr
      const netTV = tv * (1 - dispositionCosts) - debtAmount
      let pv = 0
      for (let y = 1; y <= n; y++) {
        pv += yearlyFlows[y - 1].cashFlowBeforeTax / Math.pow(1 + dr, y)
      }
      pv += netTV / Math.pow(1 + dr, n)
      return Math.round(pv - equity)
    })
  )

  return {
    npv: Math.round(npv),
    irr: Math.round(irr * 100) / 100,
    equityMultiple: Math.round(equityMultiple * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    annualizedReturn: Math.round(annualizedReturn * 100) / 100,
    yearlyFlows,
    totalNOI: Math.round(totalNOI),
    totalCashFlow: Math.round(totalCashFlow),
    sensitivityMatrix: { discountRates, capRates, npvGrid },
    capRate: Math.round(capRate * 100) / 100,
    cashOnCash: Math.round(cashOnCash * 100) / 100,
    dscr: Math.round(dscr * 100) / 100,
    breakEvenOccupancy: Math.round(breakEvenOccupancy * 100) / 100,
    paybackYears: payback,
  }
}

// ─── 내부 헬퍼 ──────────────────────────────────────────────

function calculateAnnualDebtService(principal: number, rate: number, years: number): number {
  if (rate === 0) return principal / years
  const monthlyRate = rate / 12
  const payments = years * 12
  const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1)
  return monthlyPayment * 12
}

function calculateIRR(investment: number, cashFlows: number[], terminalValue: number): number {
  const flows = [-investment, ...cashFlows]
  flows[flows.length - 1] += terminalValue

  // Newton-Raphson method
  let rate = 0.10
  for (let iter = 0; iter < 100; iter++) {
    let npv = 0
    let derivative = 0
    for (let t = 0; t < flows.length; t++) {
      npv += flows[t] / Math.pow(1 + rate, t)
      derivative -= t * flows[t] / Math.pow(1 + rate, t + 1)
    }
    if (Math.abs(npv) < 0.01) break
    if (derivative === 0) break
    rate -= npv / derivative
    if (rate < -0.99) rate = -0.5
    if (rate > 10) rate = 5
  }
  return rate * 100
}
