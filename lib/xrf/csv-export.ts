/**
 * XRF Valuation CSV 내보내기
 *
 * LP 커뮤니케이션 / DD 자료 첨부용 CSV 다운로드.
 * 한글 인코딩: BOM (UTF-8) 추가하여 Excel 한글 호환.
 */
import type { XrfValuationResult } from './valuation'
import type { FundMetrics, ProfitAllocation } from './metrics'

interface XrfCsvInput {
  result: XrfValuationResult
  metrics: FundMetrics
  allocation: ProfitAllocation
  assetTitle?: string
}

/** CSV 텍스트 생성 */
export function buildXrfCsv({ result, metrics, allocation, assetTitle }: XrfCsvInput): string {
  const lines: string[] = []
  const push = (s: string) => lines.push(s)
  const sep = (label: string) => push(`\n## ${label}`)
  const fmt = (v: number, digits = 0) => v.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })
  const pct = (v: number) => (v * 100).toFixed(2) + '%'

  push(`# XRF Vehicle Valuation Report (CSV)`)
  push(`# 생성: ${new Date().toISOString().slice(0, 19).replace('T', ' ')} KST`)
  if (assetTitle) push(`# Asset: ${assetTitle}`)
  push(`# Tier: ${result.tier}`)
  push(`# AUTO 판정: ${result.autoTierResult.selectedReason}`)

  sep('NPL Inputs')
  push(`항목,KRW,USD`)
  push(`NPL 매입가,${fmt(result.nplPurchaseUSD * result.exchangeRateKRWPerUSD)},${fmt(result.nplPurchaseUSD)}`)
  push(`NPL totalEquity,${fmt(result.nplTotalEquityUSD * result.exchangeRateKRWPerUSD)},${fmt(result.nplTotalEquityUSD)}`)
  push(`NPL 순수익,${fmt(result.nplNetProfitUSD * result.exchangeRateKRWPerUSD)},${fmt(result.nplNetProfitUSD)}`)
  push(`운용 일수,${result.durationYr * 365},${result.durationYr.toFixed(3) + ' yr'}`)
  push(`환율,${fmt(result.exchangeRateKRWPerUSD)},KRW/USD`)

  sep('POOL 구조')
  push(`항목,USD,비중`)
  push(`Pool 총액,${fmt(result.poolUSD)},100.00%`)
  push(`LP capital,${fmt(result.lpCapitalUSD)},${pct(result.lpCapitalUSD / result.poolUSD)}`)
  push(`LP 1인당 capital call (${result.numLPs}명),${fmt(result.lpCapitalPerLpUSD)},`)

  sep('Vehicle Fee')
  push(`구분,항목,USD,NPL profit 대비 %`)
  push(`XRF,관리보수 (%/yr · 365일 cap),${fmt(result.fees.xrfMgmtUSD)},${pct(result.fees.xrfMgmtUSD / result.nplNetProfitUSD)}`)
  push(`XRF,SPV Setup (1회),${fmt(result.fees.xrfSetupUSD)},${pct(result.fees.xrfSetupUSD / result.nplNetProfitUSD)}`)
  push(`XRF,Carry (8% Hurdle 초과분),${fmt(result.fees.xrfCarryUSD)},${pct(result.fees.xrfCarryUSD / result.nplNetProfitUSD)}`)
  push(`XRF,합계,${fmt(result.fees.xrfTotalUSD)},${pct(result.fees.xrfTotalUSD / result.nplNetProfitUSD)}`)
  push(`KOF,AI Valuation & PM (통합),${fmt(result.fees.platformAiUSD)},${pct(result.fees.platformAiUSD / result.nplNetProfitUSD)}`)
  push(`KOF,Pipeline Sourcing,${fmt(result.fees.platformSourcingUSD)},${pct(result.fees.platformSourcingUSD / result.nplNetProfitUSD)}`)
  push(`KOF,KR Margin (TP defense fixed),${fmt(result.fees.platformMarginUSD)},${pct(result.fees.platformMarginUSD / result.nplNetProfitUSD)}`)
  push(`KOF,합계,${fmt(result.fees.platformTotalUSD)},${pct(result.fees.platformTotalUSD / result.nplNetProfitUSD)}`)
  push(`대부업체,Servicing,${fmt(result.fees.servicingUSD)},${pct(result.fees.servicingUSD / result.nplNetProfitUSD)}`)

  sep('Profit Allocation (NPL Net Profit 분배)')
  push(`항목,USD,NPL profit 대비 %`)
  for (const item of allocation.items) {
    push(`${item.label},${fmt(item.amountUSD)},${pct(item.pctOfNplProfit)}`)
  }
  push(`합계,${fmt(allocation.items.reduce((s, i) => s + i.amountUSD, 0))},100.00%`)

  sep('LP 결과')
  push(`항목,USD,비고`)
  push(`LP 출자 총액,${fmt(result.lpCapitalUSD)},${result.numLPs}명`)
  push(`LP 1인당 출자,${fmt(result.lpCapitalPerLpUSD)},`)
  push(`LP 순수익 총액,${fmt(result.lpNetProfitUSD)},`)
  push(`LP 1인당 순수익,${fmt(result.lpNetProfitPerLpUSD)},`)
  push(`LP ROI (절대),${pct(result.lpRoi)},`)
  push(`LP IRR (단순 연환산),${pct(result.lpIrrYr)},/yr`)
  push(`Hurdle (8%/yr · LP capital × 운용기간),${fmt(result.hurdleUSD)},LP 우선 수익률`)

  sep('Fund Metrics (PE/VC 산업 표준)')
  push(`지표,값,설명`)
  push(`DPI,${metrics.dpi.toFixed(3)}x,Distributions to Paid-In`)
  push(`TVPI,${metrics.tvpi.toFixed(3)}x,Total Value to Paid-In`)
  push(`MoM,${metrics.mom.toFixed(3)}x,Multiple of Money`)
  push(`Equity Multiple,${metrics.equityMultiple.toFixed(3)}x,LP 분배 / LP 출자`)
  push(`XIRR,${pct(metrics.xirr)},Newton's method 복리 IRR`)

  return lines.join('\n')
}

/** 브라우저에서 CSV 파일 다운로드 트리거 */
export function downloadXrfCsv(input: XrfCsvInput, filename = 'xrf-valuation') {
  const csv = buildXrfCsv(input)
  // UTF-8 BOM (Excel 한글 호환)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
