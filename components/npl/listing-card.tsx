"use client"

// ─── ListingCard ────────────────────────────────────────────
// 거래소 매물 카드 (그리드 뷰). 리스트 뷰는 ListingRow를 사용.
//
// L0(공개) 정보만 표시 — 매물 ID, 담보 유형, 지역, 채권잔액, 매각희망가,
// 할인율, AI 등급, 마감일. 매도 기관/소재지 상세는 L1+에서만 노출.

import Link from "next/link"
import { MapPin, Sparkles, Eye } from "lucide-react"
import { CollateralBadge, type CollateralType } from "./collateral-badge"
import { RiskGradeBadge, type RiskGrade } from "./risk-badge"
import { DDayBadge } from "./dday-badge"
import { PriceDisplay } from "./price-display"

interface ListingCardProps {
  id: string
  /** 매물 코드 (예: "NPL-2026-00342") */
  code: string
  collateralType: CollateralType
  /** 광역시도/구·군 (시·구 단위까지만 — 동·번지는 L1+) */
  region: string
  /** 채권 잔액 (원 단위) */
  outstandingAmount: number
  /** 매각희망가 (원 단위) */
  askingPrice: number
  /** 할인율 (%) — 채권잔액 대비 매각희망가 */
  discountRate: number
  riskGrade: RiskGrade
  /** AI 분석 완성도 (0~100) */
  aiCompleteness?: number
  /** 입찰 마감일 ISO 문자열 */
  deadline: string
  /** 조회수 */
  viewCount?: number
  /** Exclusive Deal 여부 */
  isExclusive?: boolean
  className?: string
}

export function ListingCard({
  id,
  code,
  collateralType,
  region,
  outstandingAmount,
  askingPrice,
  discountRate,
  riskGrade,
  aiCompleteness,
  deadline,
  viewCount,
  isExclusive,
  className = "",
}: ListingCardProps) {
  return (
    <Link
      href={`/exchange/${id}`}
      className={`group relative block bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden ${className}`}
    >
      {isExclusive && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[0.625rem] font-extrabold px-2.5 py-1 rounded-bl-lg uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Exclusive
          </div>
        </div>
      )}

      <div className="p-5">
        {/* 헤더: 코드 + 등급 */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-[0.6875rem] font-bold text-[var(--color-text-tertiary)] tabular-nums tracking-wider">
            {code}
          </span>
          <RiskGradeBadge grade={riskGrade} size="sm" />
        </div>

        {/* 담보 + 지역 */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <CollateralBadge type={collateralType} size="sm" />
          <span className="inline-flex items-center gap-1 text-[0.75rem] text-[var(--color-text-secondary)]">
            <MapPin className="w-3 h-3" />
            {region}
          </span>
        </div>

        {/* 가격 */}
        <div className="space-y-2 mb-4">
          <PriceDisplay
            label="채권 잔액"
            amount={outstandingAmount}
            mode="compact"
            tone="default"
          />
          <PriceDisplay
            label="매각 희망가"
            amount={askingPrice}
            mode="hero"
            tone="brand"
          />
        </div>

        {/* 메트릭 행 */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)]">
          <div className="flex flex-col">
            <span className="text-[0.625rem] font-bold uppercase text-[var(--color-text-muted)]">할인율</span>
            <span className="text-[0.875rem] font-bold text-[var(--color-positive)] tabular-nums">
              {discountRate.toFixed(1)}%
            </span>
          </div>
          {typeof aiCompleteness === "number" && (
            <div className="flex flex-col items-center">
              <span className="text-[0.625rem] font-bold uppercase text-[var(--color-text-muted)]">AI 완성도</span>
              <span className="text-[0.875rem] font-bold text-[var(--color-brand-mid)] tabular-nums">
                {aiCompleteness}%
              </span>
            </div>
          )}
          <DDayBadge deadline={deadline} size="sm" />
        </div>

        {viewCount !== undefined && (
          <div className="flex items-center gap-1 mt-3 text-[0.6875rem] text-[var(--color-text-muted)]">
            <Eye className="w-3 h-3" />
            <span className="tabular-nums">{viewCount.toLocaleString("ko-KR")} 조회</span>
          </div>
        )}
      </div>
    </Link>
  )
}
