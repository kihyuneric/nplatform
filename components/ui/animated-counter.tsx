'use client'

import * as React from 'react'
import { useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  formatFn?: (value: number) => string
  startOnMount?: boolean
  easing?: 'linear' | 'ease-out' | 'ease-in-out' | 'spring'
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

export function AnimatedCounter({
  value,
  duration = 1200,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
  formatFn,
  startOnMount = false,
  easing = 'ease-out',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = React.useState(0)
  const [hasAnimated, setHasAnimated] = React.useState(false)
  const ref = React.useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '0px 0px -50px 0px' })
  const rafRef = React.useRef<number | undefined>(undefined)
  const startTimeRef = React.useRef<number | undefined>(undefined)
  const startValueRef = React.useRef(0)

  const animate = React.useCallback(
    (targetValue: number, fromValue = 0) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
      startTimeRef.current = undefined
      startValueRef.current = fromValue

      const step = (timestamp: number) => {
        if (startTimeRef.current === undefined) {
          startTimeRef.current = timestamp
        }

        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)

        let easedProgress: number
        switch (easing) {
          case 'linear':
            easedProgress = progress
            break
          case 'ease-in-out':
            easedProgress = easeInOut(progress)
            break
          case 'spring':
            // Spring-like with overshoot
            easedProgress = progress < 0.5
              ? 2 * progress * progress
              : 1 - Math.pow(-2 * progress + 2, 3) / 2
            break
          default:
            easedProgress = easeOutExpo(progress)
        }

        const current = fromValue + (targetValue - fromValue) * easedProgress
        setDisplayValue(current)

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(step)
        } else {
          setDisplayValue(targetValue)
        }
      }

      rafRef.current = requestAnimationFrame(step)
    },
    [duration, easing]
  )

  // Trigger on inView or mount
  React.useEffect(() => {
    const shouldStart = startOnMount || isInView
    if (shouldStart && !hasAnimated) {
      setHasAnimated(true)
      animate(value)
    }
  }, [isInView, startOnMount, value, hasAnimated, animate])

  // Re-animate when value changes after first animation
  const prevValueRef = React.useRef(value)
  React.useEffect(() => {
    if (hasAnimated && prevValueRef.current !== value) {
      animate(value, displayValue)
      prevValueRef.current = value
    }
  }, [value, hasAnimated, animate])

  React.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  const formatted = React.useMemo(() => {
    if (formatFn) return formatFn(displayValue)
    return displayValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }, [displayValue, decimals, formatFn])

  return (
    <span
      ref={ref}
      className={cn('tabular-nums', className)}
      aria-label={`${prefix}${value.toFixed(decimals)}${suffix}`}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}

// ─── Preset: KRW Counter ──────────────────────────────────────────────────

export function KrwCounter({
  amount,
  className,
  ...props
}: Omit<AnimatedCounterProps, 'value' | 'formatFn'> & { amount: number }) {
  const formatKrw = (v: number) => {
    if (v >= 100_000_000) {
      const eok = (v / 100_000_000).toFixed(1)
      return `${eok}억원`
    }
    if (v >= 10_000) {
      return `${Math.round(v / 10_000).toLocaleString()}만원`
    }
    return `${Math.round(v).toLocaleString()}원`
  }

  return (
    <AnimatedCounter
      value={amount}
      formatFn={formatKrw}
      className={className}
      {...props}
    />
  )
}

// ─── Preset: Percentage Counter ───────────────────────────────────────────

export function PercentCounter({
  value,
  className,
  ...props
}: Omit<AnimatedCounterProps, 'suffix'> & { value: number }) {
  return (
    <AnimatedCounter
      value={value}
      suffix="%"
      decimals={1}
      className={className}
      {...props}
    />
  )
}
