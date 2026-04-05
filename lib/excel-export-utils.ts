/**
 * Generate CSV data for download (simple Excel-compatible export)
 * Full Excel requires xlsx library which is already installed
 */

export function generateCSV(headers: string[], rows: (string | number)[][]): string {
  const BOM = '\uFEFF' // UTF-8 BOM for Korean support in Excel
  const headerLine = headers.join(',')
  const dataLines = rows.map(row =>
    row.map(cell => {
      const str = String(cell)
      // Escape quotes and wrap in quotes if contains comma/newline
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  )
  return BOM + [headerLine, ...dataLines].join('\n')
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csv = generateCSV(headers, rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Pre-built export functions for common data types
export function exportListingsToCSV(listings: any[]) {
  const headers = ['ID', '매물명', '채권원금', '담보유형', '소재지', '리스크등급', '상태', '등록일']
  const rows = listings.map(l => [
    l.id,
    l.title || l.name || '',
    l.debt_principal || l.original_amount || 0,
    l.collateral_type || '',
    l.collateral_region || '',
    l.risk_grade || '',
    l.status || '',
    l.created_at || '',
  ])
  downloadCSV('nplatform_listings', headers, rows)
}

export function exportDealsToCSV(deals: any[]) {
  const headers = ['ID', '매물명', '거래금액', '현재단계', '매수자', '매도자', '시작일', '완료일']
  const rows = deals.map(d => [
    d.id,
    d.listing_title || '',
    d.agreed_price || 0,
    d.current_stage || '',
    d.buyer_name || '',
    d.seller_name || '',
    d.created_at || '',
    d.completed_at || '',
  ])
  downloadCSV('nplatform_deals', headers, rows)
}

export function exportEarningsToCSV(earnings: any[]) {
  const headers = ['날짜', '유형', '총액', '수수료', '순수익', '상태']
  const rows = earnings.map(e => [
    e.created_at || '',
    e.event_type || '',
    e.gross_amount || e.amount || 0,
    e.platform_fee || 0,
    e.net_amount || 0,
    e.status || '',
  ])
  downloadCSV('nplatform_earnings', headers, rows)
}
