"use client"

/**
 * SpecialConditionsSection — 특수조건 V2 (18항목 × 3-버킷) 입력 섹션.
 *
 * Phase G2 (NPLatform_Refactor_Dev_Plan_2026Q2.md):
 *   · 25항목 → 18항목 축소
 *   · 🔴 소유권 / 🟠 비용 / 🟡 유동성 3-탭 분할
 *   · 입력 단계에서 점수(감점)는 숨김 — 리포트에서만 공개
 *   · 체크된 항목 수 뱃지 실시간 업데이트
 *
 * Props
 *   value:     선택된 V2 key 배열 (SPECIAL_CONDITIONS_V2 의 key)
 *   onChange:  선택 변경 콜백 (새 배열 반환)
 *   otherNote / onOtherNoteChange: 기타 특이사항 자유 메모 (선택)
 */

import * as React from "react"
import { AlertTriangle, Info } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  SPECIAL_CONDITIONS_V2,
  SPECIAL_CONDITION_BUCKET_LABEL,
  type SpecialConditionBucket,
  type SpecialConditionDefV2,
  getConditionsByBucket,
} from "@/lib/npl/unified-report/types"

const BUCKET_ORDER: SpecialConditionBucket[] = ["OWNERSHIP", "COST", "LIQUIDITY"]

const BUCKET_EMOJI: Record<SpecialConditionBucket, string> = {
  OWNERSHIP: "🔴",
  COST:      "🟠",
  LIQUIDITY: "🟡",
}

const BUCKET_ACCENT: Record<SpecialConditionBucket, { border: string; bg: string; ring: string; text: string }> = {
  OWNERSHIP: {
    border: "border-stone-300/40",
    bg:     "bg-stone-100/10",
    ring:   "focus-visible:ring-red-500",
    text:   "text-stone-900 dark:text-stone-900",
  },
  COST: {
    border: "border-stone-300/40",
    bg:     "bg-stone-100/10",
    ring:   "focus-visible:ring-orange-500",
    text:   "text-stone-900 dark:text-stone-900",
  },
  LIQUIDITY: {
    border: "border-stone-300/40",
    bg:     "bg-stone-100/10",
    ring:   "focus-visible:ring-yellow-500",
    text:   "text-stone-900 dark:text-stone-900",
  },
}

export function SpecialConditionsSection({
  value,
  onChange,
  otherNote,
  onOtherNoteChange,
  disabled,
}: {
  value: readonly string[]
  onChange: (keys: string[]) => void
  otherNote?: string
  onOtherNoteChange?: (note: string) => void
  disabled?: boolean
}) {
  const checkedSet = React.useMemo(() => new Set(value), [value])

  const toggle = React.useCallback(
    (key: string) => {
      if (disabled) return
      const next = new Set(checkedSet)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      onChange(Array.from(next))
    },
    [checkedSet, disabled, onChange],
  )

  const countByBucket = React.useMemo(() => {
    const acc: Record<SpecialConditionBucket, number> = { OWNERSHIP: 0, COST: 0, LIQUIDITY: 0 }
    for (const key of value) {
      const def = SPECIAL_CONDITIONS_V2.find(c => c.key === key)
      if (def) acc[def.bucket] += 1
    }
    return acc
  }, [value])

  const totalChecked = value.length

  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4 space-y-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-stone-900 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
            특수조건 점검 (18항목 · 3-카테고리)
          </h4>
          <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
            해당하는 항목을 체크하세요. 분석 보고서의 권리관계 점수·AI 리스크 등급에 자동 반영됩니다.
          </p>
        </div>
        {totalChecked > 0 && (
          <span className="text-[0.6875rem] font-semibold text-stone-900 dark:text-stone-900 shrink-0">
            {totalChecked}개 선택
          </span>
        )}
      </div>

      <Tabs defaultValue="OWNERSHIP" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          {BUCKET_ORDER.map(bucket => {
            const count = countByBucket[bucket]
            const total = getConditionsByBucket(bucket).length
            return (
              <TabsTrigger
                key={bucket}
                value={bucket}
                className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-2 text-[0.75rem] sm:text-[0.8125rem]"
              >
                <span className="flex items-center gap-1">
                  <span aria-hidden>{BUCKET_EMOJI[bucket]}</span>
                  <span className="font-semibold">
                    {SPECIAL_CONDITION_BUCKET_LABEL[bucket]}
                  </span>
                </span>
                <span
                  className={`text-[0.625rem] font-bold tabular-nums rounded-full px-1.5 py-0.5 ${
                    count > 0
                      ? BUCKET_ACCENT[bucket].bg + " " + BUCKET_ACCENT[bucket].text
                      : "bg-[var(--color-surface-base)] text-[var(--color-text-tertiary)]"
                  }`}
                >
                  {count}/{total}
                </span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        {BUCKET_ORDER.map(bucket => (
          <TabsContent key={bucket} value={bucket} className="mt-4">
            <BucketGrid
              bucket={bucket}
              items={getConditionsByBucket(bucket)}
              checkedSet={checkedSet}
              toggle={toggle}
              disabled={disabled}
            />
          </TabsContent>
        ))}
      </Tabs>

      {onOtherNoteChange && (
        <section className="pt-3 border-t border-[var(--color-border-subtle)]">
          <h5 className="text-[0.75rem] font-bold text-[var(--color-text-primary)] uppercase tracking-wide mb-2">
            기타 특이사항
          </h5>
          <textarea
            value={otherNote ?? ""}
            onChange={(e) => onOtherNoteChange(e.target.value)}
            disabled={disabled}
            rows={2}
            placeholder="위 18항목 외 현장조사·등기부 특이사항 (자유 기재, 선택)"
            className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-stone-300/60 focus:outline-none resize-y disabled:opacity-50"
          />
        </section>
      )}

      <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center gap-1.5 text-[0.6875rem] text-[var(--color-text-secondary)]">
        <Info className="w-3 h-3 text-[var(--color-text-tertiary)]" />
        점수는 분석 보고서의 권리관계 팩터에서 계산됩니다: <b className="text-[var(--color-text-primary)]">100 − Σ(감점)</b>, 하한 20점.
      </div>
    </div>
  )
}

function BucketGrid({
  bucket,
  items,
  checkedSet,
  toggle,
  disabled,
}: {
  bucket: SpecialConditionBucket
  items: SpecialConditionDefV2[]
  checkedSet: Set<string>
  toggle: (key: string) => void
  disabled?: boolean
}) {
  const accent = BUCKET_ACCENT[bucket]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {items.map(it => {
        const checked = checkedSet.has(it.key)
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => toggle(it.key)}
            disabled={disabled}
            className={`text-left rounded-lg px-3 py-2.5 border transition-colors focus-visible:outline-none focus-visible:ring-2 ${
              accent.ring
            } ${
              checked
                ? `${accent.bg} ${accent.border}`
                : "bg-[var(--color-surface-base)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            aria-pressed={checked}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex w-4 h-4 shrink-0 items-center justify-center rounded border ${
                  checked
                    ? `${accent.bg.replace("/10", "")} border-transparent text-white`
                    : "bg-transparent border-[var(--color-border-strong)]"
                }`}
                style={checked ? { backgroundColor: "currentColor" } : undefined}
              >
                {checked && (
                  <svg className={`w-3 h-3 ${accent.text}`} viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0z"
                    />
                  </svg>
                )}
              </span>
              <span className="text-[0.8125rem] font-semibold text-[var(--color-text-primary)] truncate">
                {it.label}
              </span>
            </div>
            {it.helper && (
              <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] leading-relaxed mt-1 pl-6">
                {it.helper}
              </p>
            )}
          </button>
        )
      })}
    </div>
  )
}
