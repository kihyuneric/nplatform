'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────

type Currency = 'KRW'
type Format = 'short' | 'full' | 'compact' | 'raw'

interface AmountDisplayProps {
  amount: number | null | undefined
  currency?: Currency
  format?: Format
  className?: string
  positiveColor?: boolean
  negativeColor?: boolean
  showSign?: boolean
  /** Show original full amount as tooltip/secondary */
  showFull?: boolean
  /** Size variant */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  /** Weight variant */
  weight?: 'normal' | 'medium' | 'semibold' | 'bold'
  /** Prefix text */
  prefix?: string
  /** Suffix text */
  suffix?: string
  /** Used as secondary (smaller, muted) */
  secondary?: boolean
}

// ─── Format Functions ─────────────────────────────────────────────────────

function formatKrwShort(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''

  if (abs >= 1_000_000_000_000) {
    // 조
    const cho = abs / 1_000_000_000_000
    return `${sign}${cho.toFixed(cho >= 10 ? 0 : 1)}조`
  }
  if (abs >= 100_000_000) {
    // 억
    const eok = abs / 100_000_000
    const man = Math.round((abs % 100_000_000) / 10_000)
    if (man === 0) return `${sign}${eok >= 10 ? Math.round(eok) : eok.toFixed(1)}억`
    if (eok >= 10) return `${sign}${Math.floor(eok)}억 ${man.toLocaleString()}만`
    return `${sign}${Math.floor(eok)}억 ${man.toLocaleString()}만`
  }
  if (abs >= 10_000) {
    // 만
    const man = abs / 10_000
    return `${sign}${man >= 100 ? Math.round(man).toLocaleString() : man.toFixed(man >= 10 ? 0 : 1)}만`
  }
  return `${sign}${abs.toLocaleString()}원`
}

function formatKrwFull(amount: number): string {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  return `${sign}${abs.toLocaleString()}원`
}

function formatKrwCompact(amount: number): string {
  // Like short but always shows unit suffix
  const short = formatKrwShort(amount)
  if (!short.endsWith('억') && !short.endsWith('만') && !short.endsWith('조') && !short.endsWith('원')) {
    return short + '원'
  }
  return short
}

export function formatAmount(
  amount: number | null | undefined,
  format: Format = 'short',
  currency: Currency = 'KRW'
): string {
  if (amount == null || isNaN(amount)) return '-'

  if (currency === 'KRW') {
    switch (format) {
      case 'short':
        return formatKrwShort(amount)
      case 'full':
        return formatKrwFull(amount)
      case 'compact':
        return formatKrwCompact(amount)
      case 'raw':
        return amount.toLocaleString()
    }
  }

  return amount.toLocaleString()
}

// ─── Size Classes ─────────────────────────────────────────────────────────

const sizeClasses: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
}

const weightClasses: Record<string, string> = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

// ─── Main Component ───────────────────────────────────────────────────────

export function AmountDisplay({
  amount,
  currency = 'KRW',
  format = 'short',
  className,
  positiveColor = false,
  negativeColor = false,
  showSign = false,
  showFull = false,
  size = 'md',
  weight = 'semibold',
  prefix,
  suffix,
  secondary = false,
}: AmountDisplayProps) {
  if (amount == null || isNaN(amount)) {
    return (
      <span
        className={cn(
          sizeClasses[size],
          weightClasses[weight],
          'text-muted-foreground',
          secondary && 'text-xs font-normal',
          className
        )}
      >
        -
      </span>
    )
  }

  const isPositive = amount > 0
  const isNegative = amount < 0
  const formatted = formatAmount(amount, format, currency)
  const fullAmount = formatAmount(amount, 'full', currency)

  const colorClass = cn(
    positiveColor && isPositive && 'text-emerald-400',
    negativeColor && isNegative && 'text-red-400',
    !positiveColor && !negativeColor && '',
  )

  const signPrefix = showSign && isPositive ? '+' : showSign && isNegative ? '' : ''

  return (
    <span
      className={cn(
        'tabular-nums',
        sizeClasses[size],
        weightClasses[weight],
        secondary && 'text-xs font-normal text-muted-foreground',
        colorClass,
        className
      )}
      title={showFull ? fullAmount : undefined}
    >
      {prefix && <span className="mr-0.5 opacity-70">{prefix}</span>}
      {signPrefix}
      {formatted}
      {suffix && <span className="ml-0.5 opacity-70">{suffix}</span>}
    </span>
  )
}

// ─── Amount Range ─────────────────────────────────────────────────────────

export function AmountRange({
  min,
  max,
  currency = 'KRW',
  format = 'short',
  className,
  separator = '~',
}: {
  min?: number | null
  max?: number | null
  currency?: Currency
  format?: Format
  className?: string
  separator?: string
}) {
  if (!min && !max) return <span className={cn('text-muted-foreground', className)}>-</span>

  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', className)}>
      {min != null && (
        <AmountDisplay amount={min} currency={currency} format={format} />
      )}
      {min != null && max != null && (
        <span className="text-muted-foreground text-sm">{separator}</span>
      )}
      {max != null && (
        <AmountDisplay amount={max} currency={currency} format={format} />
      )}
    </span>
  )
}

// ─── Discount Rate Badge ──────────────────────────────────────────────────

export function DiscountBadge({
  rate,
  className,
}: {
  rate: number | null | undefined
  className?: string
}) {
  if (rate == null) return null

  const color = rate >= 30
    ? 'bg-red-500/10 text-red-400'
    : rate >= 20
    ? 'bg-orange-500/10 text-orange-400'
    : 'bg-emerald-500/10 text-emerald-400'

  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold',
        color,
        className
      )}
    >
      -{rate.toFixed(1)}%
    </span>
  )
}

// ─── Price Change Indicator ───────────────────────────────────────────────

export function PriceChange({
  change,
  changePct,
  format = 'short',
  className,
}: {
  change?: number | null
  changePct?: number | null
  format?: Format
  className?: string
}) {
  const value = changePct ?? change
  if (value == null) return null

  const isPositive = value > 0
  const isNegative = value < 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-sm font-medium tabular-nums',
        isPositive && 'text-red-500', // Korean convention: red = up
        isNegative && 'text-blue-500', // blue = down
        !isPositive && !isNegative && 'text-muted-foreground',
        className
      )}
    >
      {isPositive && '▲'}
      {isNegative && '▼'}
      {changePct != null
        ? `${Math.abs(changePct).toFixed(2)}%`
        : formatAmount(Math.abs(change!), format)}
    </span>
  )
}
