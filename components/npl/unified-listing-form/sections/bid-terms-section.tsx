"use client"

/**
 * BidTermsSection — 자발적 경매(AUCTION) 모드 전용 입찰조건.
 * SELL 모드에서도 "선택" 섹션으로 재사용 가능.
 *
 * Phase L · P1 (Tier S) — FormField + NplInput 으로 폼 필드 마이그레이션 완료.
 *   · 라벨/필수표시/힌트 표준화 (FormField)
 *   · 입력 5종 모두 NplInput (h-11 · 표준 focus ring · 디자인 토큰)
 *   · amber 톤 외곽 wrapper 는 자발적 경매 강조 컬러로 유지
 */

import { Gavel } from "lucide-react"
import type { BidTermsState } from "../types"
import { FormField, NplInput } from "@/components/form/form-field"

const fmt = (n: number) => (n > 0 ? n.toLocaleString("ko-KR") : "")
const parse = (s: string) => {
  const d = s.replace(/[^0-9]/g, "")
  return d ? Number(d) : 0
}

export function BidTermsSection({
  value,
  onChange,
  optional = false,
}: {
  value: BidTermsState
  onChange: (patch: Partial<BidTermsState>) => void
  optional?: boolean
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
      <div className="flex items-start gap-2">
        <Gavel className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
        <div>
          <h4 className="text-[0.875rem] font-bold text-[var(--color-text-primary)]">
            입찰 조건 {optional && <span className="text-[0.6875rem] font-normal text-[var(--color-text-tertiary)]">· 선택</span>}
          </h4>
          <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
            자발적 경매의 최저입찰가·종료일·상승폭·보증금율을 지정합니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="최저 입찰가" required>
          <div className="relative">
            <NplInput
              inputMode="numeric"
              value={fmt(value.minimumBidPrice)}
              onChange={(e) => onChange({ minimumBidPrice: parse(e.target.value) })}
              placeholder="예: 800,000,000"
              className="pr-10"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.6875rem] text-[var(--color-text-tertiary)]">원</span>
          </div>
        </FormField>

        <FormField label="입찰 종료일" required>
          <NplInput
            type="date"
            value={value.bidEndDate}
            onChange={(e) => onChange({ bidEndDate: e.target.value })}
            className="[color-scheme:light] dark:[color-scheme:dark]"
          />
        </FormField>

        <FormField label="최소 호가 상승폭">
          <div className="relative">
            <NplInput
              inputMode="numeric"
              value={fmt(value.bidMinIncrement)}
              onChange={(e) => onChange({ bidMinIncrement: parse(e.target.value) })}
              placeholder="10,000,000"
              className="pr-10"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.6875rem] text-[var(--color-text-tertiary)]">원</span>
          </div>
        </FormField>

        <FormField label="입찰 보증금율">
          <div className="relative">
            <NplInput
              inputMode="decimal"
              value={value.bidDepositRate > 0 ? (value.bidDepositRate * 100).toFixed(1).replace(/\.0$/, "") : ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "")
                const pct = raw === "" ? 0 : parseFloat(raw)
                if (!Number.isNaN(pct)) onChange({ bidDepositRate: pct / 100 })
              }}
              placeholder="10"
              className="pr-10"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.6875rem] text-[var(--color-text-tertiary)]">%</span>
          </div>
        </FormField>

        <FormField label="유보 가격" hint="비공개 내부 하한 (선택)">
          <div className="relative">
            <NplInput
              inputMode="numeric"
              value={fmt(value.reservePrice)}
              onChange={(e) => onChange({ reservePrice: parse(e.target.value) })}
              placeholder="내부 하한선 (선택)"
              className="pr-10"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.6875rem] text-[var(--color-text-tertiary)]">원</span>
          </div>
        </FormField>

        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={value.allowProxyBid}
              onChange={(e) => onChange({ allowProxyBid: e.target.checked })}
              className="w-4 h-4 accent-amber-500"
            />
            <span className="text-[0.8125rem] text-[var(--color-text-secondary)]">대리 입찰 허용</span>
          </label>
        </div>
      </div>
    </div>
  )
}
