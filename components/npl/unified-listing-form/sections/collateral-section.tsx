"use client"

/**
 * CollateralSection — 담보·주소·채무자 유형 공용 섹션.
 *
 * 3모드 공통.
 *   · collateral       — CollateralType (19종) + 대분류 그룹
 *   · address.sido     — 17개 광역시·도 (REGIONS)
 *   · address.sigungu  — 시/군/구 (자유 입력)
 *   · address.detail   — 상세 주소
 *   · debtorType       — INDIVIDUAL / CORPORATE
 */

import { MapPin } from "lucide-react"
import {
  COLLATERAL_CATEGORIES,
  REGIONS,
  type CollateralType,
} from "@/lib/taxonomy"
import type { AddressState, UnifiedFormState } from "../types"

export function CollateralSection({
  collateral,
  address,
  debtorType,
  onCollateral,
  onAddress,
  onDebtorType,
  disabled,
}: {
  collateral: UnifiedFormState["collateral"]
  address: AddressState
  debtorType: UnifiedFormState["debtorType"]
  onCollateral: (v: CollateralType | "") => void
  onAddress: (patch: Partial<AddressState>) => void
  onDebtorType: (v: UnifiedFormState["debtorType"]) => void
  disabled?: boolean
}) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4 space-y-4">
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 mt-0.5 text-stone-900 shrink-0" />
        <div>
          <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
            담보 · 주소
          </h4>
          <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
            담보 유형(19종) · 지역 · 상세 주소 · 채무자 구분
          </p>
        </div>
      </div>

      {/* 담보 유형 */}
      <div>
        <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
          담보 유형 <span className="text-stone-900 ml-1">*</span>
        </label>
        <select
          value={collateral}
          onChange={(e) => onCollateral(e.target.value as CollateralType | "")}
          disabled={disabled}
          className={`w-full rounded-lg px-3 py-2 text-[0.8125rem] focus:outline-none disabled:opacity-50 transition-colors`}
          style={
            collateral
              ? { backgroundColor: "#0A1628", color: "#FFFFFF", border: "2px solid #0A1628", fontWeight: 700 }
              : { backgroundColor: "#FFFFFF", color: "#94A3B8", border: "1px solid rgba(10,22,40,0.15)", fontWeight: 400 }
          }
        >
          <option value="" style={{ color: "#94A3B8", backgroundColor: "#FFFFFF" }}>선택하세요</option>
          {COLLATERAL_CATEGORIES.map((cat) => (
            <optgroup key={cat.value} label={cat.label}>
              {cat.items.map((item) => (
                <option key={item.value} value={item.value} style={{ color: "#0A1628", backgroundColor: "#FFFFFF" }}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* 주소 */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4">
          <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
            시/도 <span className="text-stone-900 ml-1">*</span>
          </label>
          <select
            value={address.sido}
            onChange={(e) => onAddress({ sido: e.target.value })}
            disabled={disabled}
            className="w-full rounded-lg px-3 py-2 text-[0.8125rem] focus:outline-none disabled:opacity-50 transition-colors"
            style={
              address.sido
                ? { backgroundColor: "#0A1628", color: "#FFFFFF", border: "2px solid #0A1628", fontWeight: 700 }
                : { backgroundColor: "#FFFFFF", color: "#94A3B8", border: "1px solid rgba(10,22,40,0.15)", fontWeight: 400 }
            }
          >
            <option value="" style={{ color: "#94A3B8", backgroundColor: "#FFFFFF" }}>선택</option>
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value} style={{ color: "#0A1628", backgroundColor: "#FFFFFF" }}>
                {r.short}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-4">
          <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
            시/군/구
          </label>
          <input
            type="text"
            value={address.sigungu}
            onChange={(e) => onAddress({ sigungu: e.target.value })}
            placeholder="예: 강남구"
            disabled={disabled}
            className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-stone-300/60 focus:outline-none disabled:opacity-50"
          />
        </div>

        <div className="col-span-4">
          <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
            상세 주소
          </label>
          <input
            type="text"
            value={address.detail ?? ""}
            onChange={(e) => onAddress({ detail: e.target.value })}
            placeholder="예: 역삼동 123-45"
            disabled={disabled}
            className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-stone-300/60 focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {/* 채무자 유형 */}
      <div>
        <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
          채무자 유형
        </label>
        <div className="flex gap-2">
          {(
            [
              { v: "INDIVIDUAL", label: "개인" },
              { v: "CORPORATE", label: "법인" },
            ] as const
          ).map((opt) => {
            const active = debtorType === opt.v
            return (
              <button
                key={opt.v}
                type="button"
                disabled={disabled}
                onClick={() => onDebtorType(opt.v)}
                aria-pressed={active}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-[0.8125rem] font-bold transition-colors ${
                  active
                    ? "shadow-sm"
                    : "hover:border-[#0A1628]/40"
                } disabled:opacity-50`}
                style={
                  active
                    ? { backgroundColor: "#0A1628", borderColor: "#0A1628", color: "#FFFFFF" }
                    : { backgroundColor: "#FFFFFF", borderColor: "rgba(10,22,40,0.15)", color: "#0A1628" }
                }
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
