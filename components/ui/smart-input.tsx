'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Currency Input ───────────────────────────────────────────────────────

interface CurrencyInputProps {
  value?: number | null
  onChange?: (value: number | null) => void
  placeholder?: string
  className?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  label?: string
  error?: string
  hint?: string
  id?: string
  showConversion?: boolean
}

function formatWithCommas(n: number): string {
  return n.toLocaleString('ko-KR')
}

function parseRaw(s: string): number | null {
  const cleaned = s.replace(/[^0-9]/g, '')
  if (!cleaned) return null
  const n = parseInt(cleaned, 10)
  return isNaN(n) ? null : n
}

function toKorean(amount: number): string {
  if (amount <= 0) return ''
  const cho = Math.floor(amount / 1_000_000_000_000)
  const eok = Math.floor((amount % 1_000_000_000_000) / 100_000_000)
  const man = Math.floor((amount % 100_000_000) / 10_000)
  const won = amount % 10_000

  const parts: string[] = []
  if (cho > 0) parts.push(`${cho.toLocaleString()}조`)
  if (eok > 0) parts.push(`${eok.toLocaleString()}억`)
  if (man > 0) parts.push(`${man.toLocaleString()}만`)
  if (won > 0) parts.push(`${won.toLocaleString()}`)
  return parts.join(' ') + '원'
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  className,
  min,
  max,
  disabled = false,
  label,
  error,
  hint,
  id,
  showConversion = true,
}: CurrencyInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const [rawInput, setRawInput] = React.useState('')
  const [focused, setFocused] = React.useState(false)

  // Sync from external value
  React.useEffect(() => {
    if (!focused) {
      setRawInput(value != null ? formatWithCommas(value) : '')
    }
  }, [value, focused])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    // Allow only digits and commas
    const digitsOnly = raw.replace(/[^0-9]/g, '')
    const parsed = digitsOnly ? parseInt(digitsOnly, 10) : null

    if (parsed != null && max != null && parsed > max) return
    if (parsed != null && min != null && parsed < min) {
      // Allow typing below min, just display
    }

    setRawInput(digitsOnly ? formatWithCommas(parseInt(digitsOnly, 10)) : '')
    onChange?.(parsed)
  }

  const handleFocus = () => {
    setFocused(true)
    // Remove commas for editing
    if (value != null) {
      setRawInput(String(value))
    }
  }

  const handleBlur = () => {
    setFocused(false)
    if (value != null) {
      setRawInput(formatWithCommas(value))
    }
  }

  const koreanAmount = value != null && value > 0 ? toKorean(value) : ''

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={rawInput}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={hint ? `${inputId}-hint` : undefined}
          aria-invalid={!!error}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3A5C] focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'tabular-nums pr-10 text-right',
            error && 'border-red-500 focus-visible:ring-red-500',
            className
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
          원
        </span>
      </div>

      {/* Korean conversion */}
      <AnimatePresence>
        {showConversion && koreanAmount && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="text-xs text-[#10B981] font-medium overflow-hidden"
          >
            = {koreanAmount}
          </motion.p>
        )}
      </AnimatePresence>

      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}

// ─── Percentage Input with Slider ─────────────────────────────────────────

interface PercentageInputProps {
  value?: number | null
  onChange?: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  label?: string
  className?: string
  error?: string
  hint?: string
  id?: string
  accentColor?: string
}

export function PercentageInput({
  value = 0,
  onChange,
  min = 0,
  max = 100,
  step = 0.1,
  label,
  className,
  error,
  hint,
  id,
  accentColor = '#10B981',
}: PercentageInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId
  const [inputText, setInputText] = React.useState(value != null ? String(value) : '')

  React.useEffect(() => {
    setInputText(value != null ? String(value) : '')
  }, [value])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value
    setInputText(text)
    const parsed = parseFloat(text)
    if (!isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange?.(parsed)
    } else if (text === '' || text === '-') {
      onChange?.(null)
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setInputText(String(v))
    onChange?.(v)
  }

  const safeValue = value ?? 0
  const progress = ((safeValue - min) / (max - min)) * 100

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}

      <div className="flex items-center gap-3">
        {/* Slider */}
        <div className="flex-1 relative">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: accentColor }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={safeValue}
            onChange={handleSliderChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={label}
          />
        </div>

        {/* Number Input */}
        <div className="relative w-20">
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            value={inputText}
            onChange={handleTextChange}
            className={cn(
              'h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm text-right',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
              'tabular-nums pr-6',
              error && 'border-red-500',
            )}
            style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            %
          </span>
        </div>
      </div>

      {/* Tick marks */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
        <span>{min}%</span>
        <span>{Math.round((max - min) / 2 + min)}%</span>
        <span>{max}%</span>
      </div>

      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Phone Number Input ───────────────────────────────────────────────────

interface PhoneInputProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  label?: string
  error?: string
  id?: string
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.startsWith('02')) {
    // Seoul landline
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`
  }
  // Mobile / other
  if (digits.length <= 3) return digits
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`
}

export function PhoneInput({
  value = '',
  onChange,
  placeholder = '010-0000-0000',
  className,
  label,
  error,
  id,
}: PhoneInputProps) {
  const generatedId = React.useId()
  const inputId = id ?? generatedId

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    onChange?.(formatted)
  }

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type="tel"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        maxLength={14}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'ring-offset-background placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3A5C] focus-visible:ring-offset-2',
          'tabular-nums',
          error && 'border-red-500',
          className
        )}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Smart Input (auto-detects type) ─────────────────────────────────────

interface SmartInputProps {
  type: 'currency' | 'percentage' | 'phone'
  value?: number | string | null
  onChange?: (v: any) => void
  label?: string
  placeholder?: string
  error?: string
  hint?: string
  className?: string
  min?: number
  max?: number
  id?: string
}

export function SmartInput({ type, ...props }: SmartInputProps) {
  if (type === 'currency') {
    return (
      <CurrencyInput
        value={props.value as number | null}
        onChange={props.onChange}
        label={props.label}
        placeholder={props.placeholder}
        error={props.error}
        hint={props.hint}
        className={props.className}
        min={props.min}
        max={props.max}
        id={props.id}
      />
    )
  }
  if (type === 'percentage') {
    return (
      <PercentageInput
        value={props.value as number | null}
        onChange={props.onChange}
        label={props.label}
        error={props.error}
        hint={props.hint}
        className={props.className}
        min={props.min}
        max={props.max}
        id={props.id}
      />
    )
  }
  if (type === 'phone') {
    return (
      <PhoneInput
        value={props.value as string}
        onChange={props.onChange}
        label={props.label}
        placeholder={props.placeholder}
        error={props.error}
        className={props.className}
        id={props.id}
      />
    )
  }
  return null
}
