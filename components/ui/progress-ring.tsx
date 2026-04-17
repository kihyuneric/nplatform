'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────

interface ProgressRingProps {
  value: number // 0 - 100
  max?: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  label?: React.ReactNode
  sublabel?: React.ReactNode
  showValue?: boolean
  valueFormat?: (value: number) => string
  animate?: boolean
  className?: string
  variant?: 'default' | 'gradient' | 'dashed'
  /** Gradient colors [from, to] */
  gradientColors?: [string, string]
  /** Threshold coloring */
  thresholds?: { value: number; color: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getThresholdColor(
  value: number,
  thresholds?: { value: number; color: string }[],
  defaultColor = '#10B981'
): string {
  if (!thresholds) return defaultColor
  const sorted = [...thresholds].sort((a, b) => b.value - a.value)
  for (const t of sorted) {
    if (value >= t.value) return t.color
  }
  return sorted[sorted.length - 1]?.color ?? defaultColor
}

// ─── Main Component ───────────────────────────────────────────────────────

export function ProgressRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color,
  trackColor,
  label,
  sublabel,
  showValue = true,
  valueFormat,
  animate = true,
  className,
  variant = 'default',
  gradientColors = ['#1B3A5C', '#10B981'],
  thresholds,
}: ProgressRingProps) {
  const normalizedValue = Math.max(0, Math.min(max, value))
  const percentage = (normalizedValue / max) * 100

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const gradientId = React.useId().replace(/:/g, '')
  const resolvedColor = color ?? getThresholdColor(percentage, thresholds)
  const resolvedTrackColor = trackColor ?? 'currentColor'

  const formattedValue = valueFormat
    ? valueFormat(normalizedValue)
    : `${Math.round(percentage)}%`

  return (
    <div
      className={cn('relative inline-flex flex-col items-center', className)}
      role="progressbar"
      aria-valuenow={normalizedValue}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`진행률: ${formattedValue}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Gradient definition */}
        {variant === 'gradient' && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors[0]} />
              <stop offset="100%" stopColor={gradientColors[1]} />
            </linearGradient>
          </defs>
        )}

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={resolvedTrackColor}
          strokeWidth={strokeWidth}
          className="opacity-10 text-foreground"
        />

        {/* Progress */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={variant === 'gradient' ? `url(#${gradientId})` : resolvedColor}
          strokeWidth={strokeWidth}
          strokeLinecap={variant === 'dashed' ? 'butt' : 'round'}
          strokeDasharray={
            variant === 'dashed'
              ? `${circumference / 12} ${circumference / 24}`
              : circumference
          }
          initial={animate ? { strokeDashoffset: circumference } : undefined}
          animate={{ strokeDashoffset }}
          transition={animate ? { duration: 1.2, ease: [0.4, 0, 0.2, 1], delay: 0.1 } : undefined}
          style={variant !== 'dashed' ? { strokeDasharray: circumference } : undefined}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {showValue && !label && (
          <motion.span
            className="text-sm font-bold tabular-nums leading-none"
            style={{ color: resolvedColor }}
            initial={animate ? { opacity: 0 } : undefined}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.3 }}
          >
            {formattedValue}
          </motion.span>
        )}
        {label && (
          <div className="flex flex-col items-center gap-0.5">
            {label}
          </div>
        )}
        {sublabel && (
          <span className="text-[10px] text-muted-foreground mt-0.5">{sublabel}</span>
        )}
      </div>
    </div>
  )
}

// ─── Preset: Profile Completeness ────────────────────────────────────────

export function ProfileCompletenessRing({
  percentage,
  size = 72,
  className,
}: {
  percentage: number
  size?: number
  className?: string
}) {
  const color = percentage >= 80
    ? '#10B981'
    : percentage >= 50
    ? '#F59E0B'
    : '#EF4444'

  return (
    <ProgressRing
      value={percentage}
      size={size}
      strokeWidth={6}
      color={color}
      className={className}
      sublabel="완성도"
      valueFormat={(v) => `${Math.round(v)}%`}
    />
  )
}

// ─── Preset: Match Score ──────────────────────────────────────────────────

export function MatchScoreRing({
  score,
  size = 64,
  className,
}: {
  score: number // 0-100
  size?: number
  className?: string
}) {
  return (
    <ProgressRing
      value={score}
      size={size}
      strokeWidth={6}
      variant="gradient"
      gradientColors={['#1B3A5C', '#10B981']}
      className={className}
      sublabel="매칭"
      thresholds={[
        { value: 80, color: '#10B981' },
        { value: 60, color: '#2E75B6' },
        { value: 0, color: '#F59E0B' },
      ]}
    />
  )
}

// ─── Preset: Due Diligence Progress ──────────────────────────────────────

export function DueDiligenceRing({
  completed,
  total,
  size = 80,
  className,
}: {
  completed: number
  total: number
  size?: number
  className?: string
}) {
  const percentage = total > 0 ? (completed / total) * 100 : 0

  return (
    <ProgressRing
      value={percentage}
      size={size}
      strokeWidth={7}
      color="#2E75B6"
      className={className}
      label={
        <span className="text-xs font-bold text-[var(--color-text-primary)]">
          {completed}/{total}
        </span>
      }
      sublabel="실사"
      showValue={false}
    />
  )
}

// ─── Row of Multiple Rings ────────────────────────────────────────────────

interface MultiRingProps {
  items: {
    label: string
    value: number
    color?: string
  }[]
  size?: number
  className?: string
}

export function MultiProgressRing({ items, size = 56, className }: MultiRingProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      {items.map((item, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <ProgressRing
            value={item.value}
            size={size}
            strokeWidth={5}
            color={item.color}
            thresholds={[
              { value: 80, color: '#10B981' },
              { value: 50, color: '#F59E0B' },
              { value: 0, color: '#EF4444' },
            ]}
          />
          <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[60px]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}
