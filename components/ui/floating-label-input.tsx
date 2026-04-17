'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { duration } from '@/lib/design-tokens'

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
}

export const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, error, helperText, className, id, required, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue)
    const inputId = id || `field-${label.replace(/\s/g, '-')}`
    const isFloating = isFocused || hasValue

    return (
      <div className="relative">
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'peer w-full rounded-lg border px-3 pt-5 pb-2 text-[0.9375rem] transition-colors',
              'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]',
              'border-[var(--color-border-default)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-bright)] focus:border-transparent',
              error && 'border-[var(--color-danger)] focus:ring-[var(--color-danger)]',
              className
            )}
            onFocus={(e) => { setIsFocused(true); props.onFocus?.(e) }}
            onBlur={(e) => { setIsFocused(false); setHasValue(!!e.target.value); props.onBlur?.(e) }}
            onChange={(e) => { setHasValue(!!e.target.value); props.onChange?.(e) }}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          <motion.label
            htmlFor={inputId}
            className={cn(
              'absolute left-3 pointer-events-none origin-top-left',
              error ? 'text-[var(--color-danger)]' : isFocused ? 'text-[var(--color-brand-mid)]' : 'text-[var(--color-text-muted)]'
            )}
            animate={{
              y: isFloating ? 6 : 14,
              scale: isFloating ? 0.75 : 1,
            }}
            transition={{ duration: duration.fast, ease: [0.16, 1, 0.3, 1] }}
          >
            {label}
            {required && <span className="text-[var(--color-danger)] ml-0.5">*</span>}
          </motion.label>
        </div>
        {error && (
          <motion.p
            id={`${inputId}-error`}
            className="mt-1 text-[0.8125rem] text-[var(--color-danger)]"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
            aria-live="polite"
          >
            {error}
          </motion.p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="mt-1 text-[0.75rem] text-[var(--color-text-muted)]">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

FloatingLabelInput.displayName = 'FloatingLabelInput'
