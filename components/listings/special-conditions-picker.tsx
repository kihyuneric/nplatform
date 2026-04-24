"use client"

/**
 * 특수조건 25항목 Picker — V1 legacy.
 *
 * @deprecated Phase G2 (2026Q2)
 *   · 입력 폼 전 경로는 `components/npl/unified-listing-form/sections/special-conditions-section.tsx`
 *     (V2 18항목 × 3-버킷) 을 사용합니다.
 *   · 이 picker 는 V1 25항목 API/리포트 호환용으로만 남겨둡니다.
 *   · 현재 런타임 참조 없음 (NplUnifiedForm 으로 전환 완료 후 orphan).
 *   · 리포트 사이드에서 V1 로우를 표시할 필요가 있을 때 참고용 컴포넌트로만 유지.
 *
 * 모든 데이터는 lib/npl/unified-report/types.ts `SPECIAL_CONDITION_CATALOG` (V1) 에서 파생.
 *
 * Features (V1)
 *   · 7개 카테고리 섹션 그룹핑 (A~G)
 *   · per-item severity 뱃지 + 감점(%p) 표시
 *   · 낙찰가율 감점 합계 실시간 표기
 *   · 기타 특이사항 자유 메모 입력
 */

import { AlertTriangle, Info } from "lucide-react"
import type { SeverityLevel, SpecialConditionCategory, SpecialConditions } from "@/lib/npl/unified-report/types"
import {
  EMPTY_SPECIAL_CONDITIONS as _EMPTY,
  SPECIAL_CONDITION_CATALOG,
  SPECIAL_CONDITION_CATEGORY_LABEL,
} from "@/lib/npl/unified-report/types"

/** 기존 import 경로 호환용 re-export */
export const EMPTY_SPECIAL_CONDITIONS: SpecialConditions = _EMPTY

const SEVERITY_STYLE: Record<SeverityLevel, { badge: string; label: string }> = {
  OK:       { badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",  label: "안전" },
  INFO:     { badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",                   label: "참고" },
  WARNING:  { badge: "bg-amber-500/10 text-amber-700 dark:text-amber-200 border-amber-500/30",           label: "주의" },
  DANGER:   { badge: "bg-orange-500/10 text-orange-700 dark:text-orange-200 border-orange-500/30",       label: "위험" },
  CRITICAL: { badge: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",                   label: "치명" },
}

const CATEGORY_ORDER: SpecialConditionCategory[] = [
  "PROPERTY_RIGHT",
  "SENIOR_ENCUMBRANCE",
  "RIGHT_INFRINGEMENT",
  "TAX_PRIORITY",
  "TENANT",
  "BUILDING",
  "OTHER",
]

interface Props {
  value: SpecialConditions
  onChange: (v: SpecialConditions) => void
  disabled?: boolean
  /** 헤더 숨김 (래퍼에서 별도 헤더 사용 시) */
  hideHeader?: boolean
}

export default function SpecialConditionsPicker({ value, onChange, disabled, hideHeader }: Props) {
  const selected = SPECIAL_CONDITION_CATALOG.filter(it => value[it.key])
  const totalBidPenalty = selected.reduce((s, it) => s + it.penalty, 0)
  const totalLegalPenalty = selected.reduce((s, it) => s + it.legalPenalty, 0)

  function toggle(key: SpecialConditions extends Record<infer _K, unknown> ? keyof SpecialConditions : never) {
    if (disabled) return
    if (key === 'otherNote') return
    onChange({ ...value, [key]: !value[key as keyof SpecialConditions] })
  }

  function setOtherNote(note: string) {
    if (disabled) return
    onChange({ ...value, otherNote: note })
  }

  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4 space-y-4">
      {!hideHeader && (
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
              경매 특수조건 (25항목)
            </h4>
            <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
              해당 항목을 체크하세요. AI 리스크 등급·낙찰가율 예측에 자동 반영됩니다. · OCR 자동 입력 지원
            </p>
          </div>
        </div>
      )}

      {CATEGORY_ORDER.map(cat => {
        const items = SPECIAL_CONDITION_CATALOG.filter(it => it.category === cat)
        if (items.length === 0) return null
        const hitCount = items.filter(it => value[it.key]).length
        return (
          <section key={cat}>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-[0.75rem] font-bold text-[var(--color-text-primary)] uppercase tracking-wide">
                {SPECIAL_CONDITION_CATEGORY_LABEL[cat]}
              </h5>
              {hitCount > 0 && (
                <span className="text-[0.625rem] font-semibold text-amber-700 dark:text-amber-200">
                  {hitCount}/{items.length} 선택
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map(it => {
                const checked = Boolean(value[it.key])
                const sev = SEVERITY_STYLE[it.severity]
                return (
                  <button
                    key={it.key}
                    type="button"
                    onClick={() => toggle(it.key as never)}
                    disabled={disabled}
                    className={`text-left rounded-lg px-3 py-2.5 border transition-colors ${
                      checked
                        ? "bg-amber-500/10 border-amber-500/40"
                        : "bg-[var(--color-surface-base)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`inline-flex w-4 h-4 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? "bg-amber-500 border-amber-500 text-white"
                              : "bg-transparent border-[var(--color-border-strong)]"
                          }`}
                        >
                          {checked && (
                            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
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
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <span className={`text-[0.5625rem] font-bold px-1.5 py-0.5 rounded border ${sev.badge}`}>
                          {sev.label}
                        </span>
                        <span className={`text-[0.625rem] font-bold tabular-nums ${checked ? "text-amber-700 dark:text-amber-200" : "text-[var(--color-text-tertiary)]"}`}>
                          {it.penalty}%p
                        </span>
                      </span>
                    </div>
                    <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] leading-relaxed pl-5.5">
                      {it.helper}
                    </p>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}

      {/* 기타 특이사항 자유 메모 */}
      <section>
        <h5 className="text-[0.75rem] font-bold text-[var(--color-text-primary)] uppercase tracking-wide mb-2">
          기타 특이사항
        </h5>
        <textarea
          value={value.otherNote ?? ""}
          onChange={(e) => setOtherNote(e.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="위 항목 외 현장조사·등기부 특이사항 (자유 기재, 선택)"
          className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-amber-500/60 focus:outline-none resize-y disabled:opacity-50"
        />
      </section>

      {/* 요약 바 */}
      <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between flex-wrap gap-2">
        <div className="text-[0.6875rem] text-[var(--color-text-secondary)] flex items-center gap-1.5">
          <Info className="w-3 h-3 text-[var(--color-text-tertiary)]" />
          선택된 특수조건: <b className="text-[var(--color-text-primary)]">{selected.length}개 / 25</b>
        </div>
        <div className="flex items-center gap-4 text-[0.6875rem]">
          <span>
            낙찰가율 감점: <span className="font-bold tabular-nums text-amber-700 dark:text-amber-200">{totalBidPenalty}%p</span>
          </span>
          <span>
            법적 리스크: <span className="font-bold tabular-nums text-red-600 dark:text-red-300">{totalLegalPenalty}점</span>
          </span>
        </div>
      </div>
    </div>
  )
}
