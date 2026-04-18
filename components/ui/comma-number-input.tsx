"use client"

/**
 * CommaNumberInput — 1,000 단위 콤마 자동 포맷
 * ────────────────────────────────────────────
 * 가볍고 최소 API로 기존 <input> 스타일을 그대로 유지하면서 콤마만 입혀주는 래퍼.
 *
 * - `value`는 string | number | null | undefined 모두 수용 → raw 숫자 문자열로 변환
 * - 화면 표시 값은 `toLocaleString('ko-KR')`
 * - `onChange(value)`에서 `value`는 **콤마를 제거한 숫자 문자열**. 사용처에서 `Number(v)` 또는 `parseInt(v)`로 필요 시 변환
 *
 * 예시
 *   <CommaNumberInput value={amount} onChange={setAmount} className={DS.input.base} />
 *   <CommaNumberInput value={form.price} onChange={v => setForm(p => ({...p, price: Number(v)||0}))} />
 */

import { forwardRef } from "react"

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
> & {
  value: string | number | null | undefined
  onChange: (value: string) => void
}

function toDisplay(v: Props["value"]): string {
  if (v === null || v === undefined || v === "") return ""
  const raw = typeof v === "number" ? String(v) : v
  const digits = raw.replace(/[^0-9]/g, "")
  if (!digits) return ""
  return Number(digits).toLocaleString("ko-KR")
}

export const CommaNumberInput = forwardRef<HTMLInputElement, Props>(
  function CommaNumberInput({ value, onChange, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={toDisplay(value)}
        onChange={e => onChange(e.target.value.replace(/[^0-9]/g, ""))}
        {...rest}
      />
    )
  }
)

export default CommaNumberInput
