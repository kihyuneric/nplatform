"use client"

/**
 * InstitutionSection — 기관·매각주체 공용 섹션.
 *
 * 3모드(SELL/AUCTION/ANALYSIS) 모두 동일 UI 사용.
 *   · name            — 기관명 (자유 입력)
 *   · type            — SellerInstitution (은행/저축은행/AMC/…)
 *   · listingCategory — NPL / GENERAL
 *
 * Phase G5:
 *   · 전속 계약(`exclusive`) 토글 UI 는 FeeSection 상단으로 이동.
 *   · 데이터 모델(`InstitutionState.exclusive`)은 그대로 유지.
 *   · 하위 호환: `showExclusiveToggle` prop 은 수신만 하고 무시(no-op).
 */

import { Building2 } from "lucide-react"
import {
  SELLER_INSTITUTIONS,
  type SellerInstitution,
} from "@/lib/taxonomy"
import type { InstitutionState } from "../types"

const INSTITUTION_ENTRIES = Object.entries(SELLER_INSTITUTIONS) as [
  SellerInstitution,
  string,
][]

export function InstitutionSection({
  value,
  onChange,
  disabled,
}: {
  value: InstitutionState
  onChange: (patch: Partial<InstitutionState>) => void
  /**
   * @deprecated Phase G5 · 전속 토글은 FeeSection 으로 이동. 더 이상 사용되지 않음.
   * (하위 호환용으로 시그니처는 유지하지만 값은 무시)
   */
  showExclusiveToggle?: boolean
  disabled?: boolean
}) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
      <div className="flex items-start gap-2 mb-3">
        <Building2 className="w-4 h-4 mt-0.5 text-stone-900 shrink-0" />
        <div>
          <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
            기관 · 매각주체
          </h4>
          <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
            채권 보유 기관 및 매물 분류
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
            기관명 <span className="text-stone-900 ml-1">*</span>
          </label>
          <input
            type="text"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="예: 우리은행 서울지점"
            disabled={disabled}
            className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-stone-300/60 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
            기관 유형 <span className="text-stone-900 ml-1">*</span>
          </label>
          <select
            value={value.type}
            onChange={(e) =>
              onChange({ type: e.target.value as SellerInstitution | "" })
            }
            disabled={disabled}
            className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] focus:border-stone-300/60 focus:outline-none disabled:opacity-50"
          >
            <option value="">선택하세요</option>
            {INSTITUTION_ENTRIES.map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
            매물 분류
          </label>
          <div className="flex gap-2">
            {(
              [
                { v: "NPL", label: "NPL 채권" },
                { v: "GENERAL", label: "일반 부동산" },
              ] as const
            ).map((opt) => {
              const active = value.listingCategory === opt.v
              return (
                <button
                  key={opt.v}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ listingCategory: opt.v })}
                  className={`flex-1 rounded-lg border px-2 py-2 text-[0.75rem] font-semibold transition-colors ${
                    active
                      ? "bg-stone-100/10 border-stone-300/40 text-stone-900 dark:text-stone-900"
                      : "bg-[var(--color-surface-base)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
                  } disabled:opacity-50`}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
