'use client'

/**
 * NumberInput — 1,000자리 콤마 자동 포맷 입력
 * ────────────────────────────────────────────
 * - 사용자가 `100000000` 입력 → `100,000,000`으로 표시
 * - value는 항상 number (null 가능) — 콤마 없이 저장
 * - suffix (단위 표시: "원", "%", "만원" 등) 지원
 * - allowDecimal: 소수점 허용 여부
 */

import { forwardRef, useEffect, useState } from 'react'
import { fmt } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number | null | undefined
  onChange: (value: number | null) => void
  allowNegative?: boolean
  allowDecimal?: boolean
  /** 숫자 오른쪽에 붙는 단위 (예: "원", "%") */
  suffix?: string
  /** 접미사 스타일 클래스 (옵션) */
  suffixClassName?: string
  /** 최대 소수점 자릿수 (allowDecimal=true일 때) */
  maxDecimals?: number
}

function formatDisplay(
  raw: string,
  allowNegative: boolean,
  allowDecimal: boolean,
  maxDecimals: number
): { display: string; value: number | null } {
  // 허용 문자: 숫자, '-', '.', ','
  let cleaned = raw.replace(/,/g, '')
  // 앞부분만 - 허용
  if (allowNegative) {
    const hasMinus = cleaned.startsWith('-')
    cleaned = cleaned.replace(/-/g, '')
    if (hasMinus) cleaned = '-' + cleaned
  } else {
    cleaned = cleaned.replace(/-/g, '')
  }
  if (!allowDecimal) {
    cleaned = cleaned.replace(/\./g, '')
  } else {
    // 소수점 한 개만
    const dotIdx = cleaned.indexOf('.')
    if (dotIdx !== -1) {
      cleaned = cleaned.slice(0, dotIdx + 1) + cleaned.slice(dotIdx + 1).replace(/\./g, '')
      // maxDecimals 제한
      const [intPart, decPart = ''] = cleaned.split('.')
      cleaned = intPart + '.' + decPart.slice(0, maxDecimals)
    }
  }

  // 숫자가 아닌 문자 제거 (위의 필터 통과된 것만 남음)
  const onlyValid = cleaned.match(/^-?\d*(\.\d*)?$/)
  if (!onlyValid) return { display: raw, value: null }

  if (cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
    return { display: cleaned, value: null }
  }

  const num = Number(cleaned)
  if (isNaN(num)) return { display: raw, value: null }

  // 콤마 포맷
  const [intPart, decPart] = cleaned.split('.')
  const sign = intPart.startsWith('-') ? '-' : ''
  const absInt = intPart.replace('-', '')
  const formattedInt = absInt === '' ? '' : Number(absInt).toLocaleString('ko-KR')
  const display =
    sign +
    formattedInt +
    (decPart !== undefined ? '.' + decPart : cleaned.endsWith('.') ? '.' : '')

  return { display, value: num }
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  {
    value,
    onChange,
    allowNegative = false,
    allowDecimal = false,
    maxDecimals = 2,
    suffix,
    suffixClassName,
    className,
    onBlur,
    onFocus,
    ...rest
  },
  ref
) {
  const [display, setDisplay] = useState<string>(() =>
    value == null || isNaN(value) ? '' : fmt.num(value)
  )
  const [focused, setFocused] = useState(false)

  // 외부 value 변경 시 display 동기화 (사용자가 편집 중이 아닐 때만)
  useEffect(() => {
    if (focused) return
    const next = value == null || isNaN(value) ? '' : fmt.num(value)
    setDisplay(next)
  }, [value, focused])

  const baseInput = (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={display}
      onFocus={e => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={e => {
        setFocused(false)
        // 트레일링 '.' 제거 + 재포맷
        if (value != null && !isNaN(value)) {
          setDisplay(fmt.num(value))
        } else {
          setDisplay('')
        }
        onBlur?.(e)
      }}
      onChange={e => {
        const { display: nextDisplay, value: nextValue } = formatDisplay(
          e.target.value,
          allowNegative,
          allowDecimal,
          maxDecimals
        )
        setDisplay(nextDisplay)
        onChange(nextValue)
      }}
      className={cn(
        'w-full px-4 py-2.5 bg-white border border-[var(--color-border-default)] rounded-lg',
        'text-[0.9375rem] !text-slate-900 placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-bright)] focus:border-transparent',
        'transition-all tabular-nums',
        suffix ? 'pr-12' : '',
        className
      )}
    />
  )

  if (!suffix) return baseInput

  return (
    <div className="relative">
      {baseInput}
      <span
        className={cn(
          'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 select-none',
          suffixClassName
        )}
      >
        {suffix}
      </span>
    </div>
  )
})

export default NumberInput
