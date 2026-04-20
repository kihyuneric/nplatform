'use client'

/**
 * DateField — NPLatform 표준 날짜 입력 컴포넌트 (Sprint 3 · D4a)
 *
 * 기존 `<input type="date">`의 문제:
 *   1) 브라우저별 UI 편차 심함 (Safari/모바일 Safari 토큰 스타일링 불가)
 *   2) 한국어 라벨·마스킹 커스터마이즈 제약
 *   3) iOS에서 placeholder/빈값 표시 어색
 *   4) 접근성/키보드 탭 포커스 순서 불일치
 *
 * 해결: react-day-picker 기반 팝오버 캘린더 + 시맨틱 토큰 연동.
 *  - value: ISO 날짜 문자열 'YYYY-MM-DD' (DB/API 호환)
 *  - onChange: (iso: string) => void
 *  - 날짜 포맷: 'ko-KR' 장식 (예: "2026. 04. 20.")
 *  - min/max 제한, disabled, 에러 상태 지원
 *  - NPLatform 라이트/다크 양쪽 시맨틱 토큰으로 통일된 컨트라스트
 */

import * as React from 'react'
import { CalendarIcon, XIcon } from 'lucide-react'
import { ko } from 'date-fns/locale'
import { format, parseISO, isValid } from 'date-fns'

import { cn } from '@/lib/utils'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return isValid(value) ? value : undefined
  const d = parseISO(value)
  return isValid(d) ? d : undefined
}

function toIso(date: Date | undefined): string {
  if (!date) return ''
  return format(date, 'yyyy-MM-dd')
}

function formatDisplay(date: Date | undefined): string {
  if (!date) return ''
  return format(date, 'yyyy. MM. dd.', { locale: ko })
}

// ─────────────────────────────────────────────────────────────────────────────
// DateField
// ─────────────────────────────────────────────────────────────────────────────

export interface DateFieldProps {
  /** ISO 'YYYY-MM-DD' 또는 Date. 빈 값은 ''. */
  value?: string | Date | null
  /** ISO 'YYYY-MM-DD' 반환. 비우면 ''. */
  onChange?: (iso: string) => void
  /** 이름 — Form submit 시 hidden input으로 전송됨 */
  name?: string
  /** Placeholder (미선택 상태 텍스트) */
  placeholder?: string
  /** 최소 선택 가능 날짜 (ISO 또는 Date). 예: '2020-01-01' */
  min?: string | Date
  /** 최대 선택 가능 날짜 */
  max?: string | Date
  /** 필수 여부 — form validation 활용 */
  required?: boolean
  /** 비활성 */
  disabled?: boolean
  /** 에러 상태 — 테두리 danger */
  error?: boolean
  /** 사이즈 */
  size?: 'sm' | 'md' | 'lg'
  /** 추가 className (트리거 버튼) */
  className?: string
  /** 날짜 지우기 버튼 표시 */
  clearable?: boolean
  /** 접근성 id */
  id?: string
  /** 접근성 aria-label */
  'aria-label'?: string
  /** 접근성 aria-describedby */
  'aria-describedby'?: string
}

export function DateField({
  value,
  onChange,
  name,
  placeholder = '날짜를 선택하세요',
  min,
  max,
  required,
  disabled,
  error,
  size = 'md',
  className,
  clearable = true,
  id,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false)
  const selected = React.useMemo(() => toDate(value), [value])
  const fromDate = React.useMemo(() => toDate(min), [min])
  const toDateLimit = React.useMemo(() => toDate(max), [max])

  const handleSelect = (date: Date | undefined) => {
    onChange?.(toIso(date))
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange?.('')
  }

  const sizeClass =
    size === 'sm'
      ? 'h-9 text-[0.8125rem] px-3'
      : size === 'lg'
      ? 'h-12 text-[0.9375rem] px-4'
      : 'h-10 text-[0.875rem] px-3.5'

  return (
    <>
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            id={id}
            aria-label={ariaLabel ?? placeholder}
            aria-describedby={ariaDescribedBy}
            aria-invalid={error ? 'true' : undefined}
            aria-required={required ? 'true' : undefined}
            disabled={disabled}
            className={cn(
              // Base
              'relative w-full inline-flex items-center justify-between gap-2 rounded-lg border transition-colors',
              'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]',
              // Border 상태
              error
                ? 'border-[var(--color-danger)] focus:ring-2 focus:ring-[var(--color-danger)]/25'
                : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)] focus:ring-2 focus:ring-[var(--color-brand-bright)]/35',
              'focus:outline-none focus:border-[var(--color-brand-mid)]',
              // Size
              sizeClass,
              // Disabled
              disabled && 'opacity-50 cursor-not-allowed bg-[var(--color-surface-sunken)]',
              // Font
              'font-medium tracking-[-0.005em] tabular-nums',
              className
            )}
          >
            <span className={cn('flex-1 text-left', !selected && 'text-[var(--color-text-muted)] font-normal')}>
              {selected ? formatDisplay(selected) : placeholder}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              {clearable && selected && !disabled && (
                <span
                  role="button"
                  tabIndex={-1}
                  aria-label="날짜 지우기"
                  onClick={handleClear}
                  className="p-0.5 rounded hover:bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                >
                  <XIcon className="w-3.5 h-3.5" />
                </span>
              )}
              <CalendarIcon className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-auto p-0 border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-lg)]"
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={ko}
            disabled={(date) => {
              if (fromDate && date < fromDate) return true
              if (toDateLimit && date > toDateLimit) return true
              return false
            }}
            captionLayout="dropdown"
            startMonth={fromDate ?? new Date(1990, 0, 1)}
            endMonth={toDateLimit ?? new Date(new Date().getFullYear() + 5, 11, 31)}
            className="p-3"
          />
        </PopoverContent>
      </Popover>

      {/* Form integration — name 지정 시 hidden input 동기화 */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={selected ? toIso(selected) : ''}
          required={required}
        />
      )}
    </>
  )
}

DateField.displayName = 'DateField'
