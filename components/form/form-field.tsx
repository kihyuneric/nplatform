"use client"

/**
 * components/form/form-field.tsx · Phase H4
 *
 * NPLatform Form Primitive — Label + Input + HelpText + ErrorText 합성.
 *
 * 페이지·모달·딜룸 어디서나 동일한 폼 UX 를 보장하기 위한 단일 컴포넌트.
 * 외부 폼 라이브러리(react-hook-form 등) 와 무관하게 작동.
 *
 * 사용:
 *   <FormField label="기관명" required>
 *     <input type="text" className="npl-input" ... />
 *   </FormField>
 *
 *   <FormField label="이메일" hint="알림 수신용" error="이메일 형식이 올바르지 않습니다">
 *     <Input type="email" ... />
 *   </FormField>
 *
 *   <FormField label="비밀번호" hint="8자 이상">
 *     <input className="npl-input" type="password" />
 *   </FormField>
 *
 * 디자인 토큰:
 *   · 라벨: tiny (11/500) · text-[var(--color-text-secondary)]
 *   · 힌트: tiny · text-[var(--color-text-tertiary)]
 *   · 에러: tiny · text-[var(--color-danger)]
 *   · 필수 표시: 라벨 옆 빨간 별
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"

export interface FormFieldProps {
  /** 라벨 텍스트 */
  label?: string
  /** 필수 입력 (라벨 옆 빨간 *) */
  required?: boolean
  /** 도움말 (입력 안내 · 형식 등) · error 가 없을 때만 표시 */
  hint?: string
  /** 에러 메시지 · 표시되면 hint 는 가려짐 */
  error?: string
  /** Input 의 id (있으면 라벨 htmlFor 자동 연결) */
  htmlFor?: string
  /** 라벨 우측 보조 영역 (예: "비밀번호 잊으셨나요?" 링크) */
  rightAccessory?: React.ReactNode
  /** 추가 클래스 */
  className?: string
  /** 자식 (Input/Select/Textarea 등) */
  children: React.ReactNode
}

export function FormField({
  label,
  required,
  hint,
  error,
  htmlFor,
  rightAccessory,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {(label || rightAccessory) && (
        <div className="flex items-baseline justify-between gap-2">
          {label && (
            <label
              htmlFor={htmlFor}
              className="block text-[0.6875rem] font-semibold tracking-[0.01em] text-[var(--color-text-secondary)]"
            >
              {label}
              {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
            </label>
          )}
          {rightAccessory && (
            <div className="text-[0.6875rem] text-[var(--color-text-tertiary)]">
              {rightAccessory}
            </div>
          )}
        </div>
      )}
      {children}
      {error ? (
        <p className="flex items-start gap-1 text-[0.6875rem] leading-[1.5] text-[var(--color-danger)]">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-[0.6875rem] leading-[1.5] text-[var(--color-text-tertiary)]">{hint}</p>
      ) : null}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────
 * 표준 Input 클래스 — globals.css 또는 인라인으로 사용 가능.
 * 페이지 전반의 모든 Input 이 동일한 높이·테두리·포커스 링 유지.
 * height: 44px · padding: 12px 14px · border 1px · radius 10px
 * focus: 2px brand-bright outline (3px shadow ring)
 * ────────────────────────────────────────────────────────── */
export const NPL_INPUT_CLASS =
  "h-11 w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] " +
  "px-3.5 py-2.5 text-[0.9375rem] text-[var(--color-text-primary)] " +
  "placeholder:text-[var(--color-text-tertiary)] " +
  "transition-[border-color,box-shadow] duration-150 " +
  "hover:border-[var(--color-border-default)] " +
  "focus:border-[var(--color-brand-bright)] focus:outline-none " +
  "focus:shadow-[0_0_0_3px_rgba(20,22,26,0.18)] " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "tabular-nums [font-variant-numeric:tabular-nums]"

/**
 * NplInput — Phase H3 표준 Input 프리미티브.
 *   기본 height 44px · NPLatform 토큰 기반 · 모든 폼에서 동일 사용 권장.
 *   기존 shadcn/ui <Input> 도 호환 (점진적 마이그레이션 가능).
 */
export const NplInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type ?? "text"}
      ref={ref}
      className={cn(NPL_INPUT_CLASS, className)}
      {...props}
    />
  ),
)
NplInput.displayName = "NplInput"

/**
 * NplTextarea — Phase H3 표준 Textarea 프리미티브.
 */
export const NplTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 3, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        // height 자유 · 나머지 토큰 동일
        NPL_INPUT_CLASS.replace("h-11", "min-h-[88px] py-3"),
        "resize-y leading-[1.5]",
        className,
      )}
      {...props}
    />
  ),
)
NplTextarea.displayName = "NplTextarea"

/**
 * NplSelect — 표준 select 엘리먼트 (네이티브). 커스텀 드롭다운은 별도 Radix 사용.
 */
export const NplSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(NPL_INPUT_CLASS, "appearance-none pr-10 cursor-pointer", className)}
      {...props}
    >
      {children}
    </select>
  ),
)
NplSelect.displayName = "NplSelect"
