"use client"

/**
 * CollateralSection — 담보·주소·채무자 유형 공용 섹션.
 *
 * 3모드 공통.
 *   · collateral           — CollateralType (19종) + 대분류 그룹
 *   · address.sido         — 17개 광역시·도 (REGIONS) — 주 주소
 *   · address.sigungu      — 시/군/구 (자유 입력)
 *   · address.detail       — 상세 주소
 *   · additionalAddresses  — Phase G7+ 추가 주소 배열 (포트폴리오/복합 담보)
 *   · debtorType           — INDIVIDUAL / CORPORATE
 */

import { MapPin, Plus, Trash2 } from "lucide-react"
import {
  COLLATERAL_CATEGORIES,
  REGIONS,
  type CollateralType,
} from "@/lib/taxonomy"
import type { AddressState, UnifiedFormState } from "../types"

export function CollateralSection({
  collateral,
  address,
  additionalAddresses,
  debtorType,
  onCollateral,
  onAddress,
  onAddAddress,
  onRemoveAddressAt,
  onUpdateAddressAt,
  onDebtorType,
  disabled,
}: {
  collateral: UnifiedFormState["collateral"]
  address: AddressState
  additionalAddresses?: AddressState[]
  debtorType: UnifiedFormState["debtorType"]
  onCollateral: (v: CollateralType | "") => void
  onAddress: (patch: Partial<AddressState>) => void
  onAddAddress?: () => void
  onRemoveAddressAt?: (index: number) => void
  onUpdateAddressAt?: (index: number, patch: Partial<AddressState>) => void
  onDebtorType: (v: UnifiedFormState["debtorType"]) => void
  disabled?: boolean
}) {
  const extras = additionalAddresses ?? []
  const multiEnabled = !!(onAddAddress && onRemoveAddressAt && onUpdateAddressAt)

  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4 space-y-4">
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 mt-0.5 text-stone-900 shrink-0" />
        <div className="flex-1">
          <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
            담보 · 주소
          </h4>
          <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
            담보 유형(19종) · 지역 · 상세 주소 · 채무자 구분
            {multiEnabled && extras.length > 0 && (
              <span className="ml-1 font-semibold text-[var(--color-text-secondary)]">
                · 총 {extras.length + 1}건 (주 1건 + 추가 {extras.length}건)
              </span>
            )}
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

      {/* 주 주소 */}
      <div className="space-y-2">
        {multiEnabled && (
          <div className="flex items-center justify-between">
            <span className="text-[0.6875rem] font-bold text-[var(--color-text-primary)]">
              주 주소
            </span>
            <span className="text-[0.625rem] text-[var(--color-text-tertiary)]">
              대표 소재지 (필수)
            </span>
          </div>
        )}
        <AddressRow
          address={address}
          disabled={disabled}
          onChange={(patch) => onAddress(patch)}
        />
      </div>

      {/* 추가 주소 (Phase G7+) */}
      {multiEnabled && extras.length > 0 && (
        <div className="space-y-3 pt-1 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center justify-between pt-2">
            <span className="text-[0.6875rem] font-bold text-[var(--color-text-primary)]">
              추가 주소 ({extras.length})
            </span>
            <span className="text-[0.625rem] text-[var(--color-text-tertiary)]">
              포트폴리오·복합 담보용
            </span>
          </div>
          {extras.map((addr, i) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] p-2.5 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[0.625rem] font-semibold text-[var(--color-text-secondary)]">
                  #{i + 2}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onRemoveAddressAt!(i)}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[0.625rem] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                  aria-label={`추가 주소 ${i + 2} 삭제`}
                >
                  <Trash2 className="w-3 h-3" />
                  삭제
                </button>
              </div>
              <AddressRow
                address={addr}
                disabled={disabled}
                onChange={(patch) => onUpdateAddressAt!(i, patch)}
              />
            </div>
          ))}
        </div>
      )}

      {/* + 주소 추가 버튼 */}
      {multiEnabled && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAddAddress!()}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-[#0A1628]/30 bg-white px-3 py-2 text-[0.75rem] font-semibold text-[#0A1628] hover:bg-[#0A1628]/5 disabled:opacity-50 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          주소 추가 (포트폴리오·복합 담보)
        </button>
      )}

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

// ─── 단일 주소 입력 한 줄 (시/도 · 시/군/구 · 상세) ─────────────
function AddressRow({
  address,
  disabled,
  onChange,
}: {
  address: AddressState
  disabled?: boolean
  onChange: (patch: Partial<AddressState>) => void
}) {
  return (
    <div className="grid grid-cols-12 gap-3">
      <div className="col-span-4">
        <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
          시/도 <span className="text-stone-900 ml-1">*</span>
        </label>
        <select
          value={address.sido}
          onChange={(e) => onChange({ sido: e.target.value })}
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
          onChange={(e) => onChange({ sigungu: e.target.value })}
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
          onChange={(e) => onChange({ detail: e.target.value })}
          placeholder="예: 역삼동 123-45"
          disabled={disabled}
          className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-stone-300/60 focus:outline-none disabled:opacity-50"
        />
      </div>
    </div>
  )
}
