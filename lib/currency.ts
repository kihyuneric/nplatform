export type Currency = 'KRW' | 'JPY' | 'USD' | 'EUR'

const EXCHANGE_RATES: Record<Currency, number> = {
  KRW: 1,
  JPY: 0.11, // 1 KRW ≈ 0.11 JPY
  USD: 0.00075, // 1 KRW ≈ 0.00075 USD
  EUR: 0.00069,
}

export function convertCurrency(amountKRW: number, to: Currency): number {
  return Math.round(amountKRW * EXCHANGE_RATES[to])
}

export function formatCurrency(amount: number, currency: Currency = 'KRW'): string {
  const formatters: Record<Currency, Intl.NumberFormat> = {
    KRW: new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }),
    JPY: new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }),
    USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
    EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
  }
  return formatters[currency].format(amount)
}

export function formatKRWCompact(amount: number | null | undefined): string {
  if (amount == null || amount === 0) return '-'
  if (amount >= 100000000) return `${(amount / 100000000).toFixed(1)}억원`
  if (amount >= 10000) return `${(amount / 10000).toFixed(0)}만원`
  return `${amount.toLocaleString()}원`
}

export function getCurrencyFromLocale(locale: string): Currency {
  if (locale === 'ja') return 'JPY'
  if (locale === 'en') return 'USD'
  return 'KRW'
}
