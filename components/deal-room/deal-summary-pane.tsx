/**
 * DealSummaryPane — 좌측 "딜의 사실" 영역 (DR-2b, 2026-04-21)
 *
 * 움직이지 않는 정보만 노출. 티어별 점진 공개 (L0→L5).
 * 계획서 §4.1 참조: 채권·담보 요약 / 담보 / 등급·IRR
 */

"use client"

import { Lock } from "lucide-react"
import { formatKRW } from "@/lib/design-system"

export type TierLevel = "L0" | "L1" | "L2" | "L3" | "L4" | "L5"

export interface DealSummaryData {
  /** 채권잔액 (원) */
  principal: number
  /** 희망 매각가 (원) — L1+ */
  askingPrice?: number
  /** 감정가 (원) — L0 부터 공개 */
  appraisalValue?: number
  /** 담보 정보 */
  collateral: {
    type: string          // 예: "아파트"
    region: string        // 예: "서울 강남"
    areaSqm?: number      // 전용면적 ㎡
    priorityLien?: string // 예: "근저당 1순위"
  }
  /** 등급 · 예상 IRR — L2+ */
  grade?: string
  estIrr?: string
}

export interface DealSummaryPaneProps {
  tier: TierLevel
  data: DealSummaryData
}

export function DealSummaryPane({ tier, data }: DealSummaryPaneProps) {
  const canSeeAskingPrice = ["L1", "L2", "L3", "L4", "L5"].includes(tier)
  const canSeeGrade = ["L2", "L3", "L4", "L5"].includes(tier)
  const discount =
    data.askingPrice && data.appraisalValue
      ? Math.round((1 - data.askingPrice / data.appraisalValue) * 1000) / 10
      : null

  return (
    <div className="space-y-4">
      {/* 채권 섹션 */}
      <section className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-4">
        <h3 className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
          채권 정보
        </h3>
        <dl className="space-y-2.5">
          <Row label="채권잔액" value={formatKRW(data.principal)} />
          {canSeeAskingPrice && data.askingPrice && (
            <Row label="희망 매각가" value={formatKRW(data.askingPrice)} strong />
          )}
          {!canSeeAskingPrice && (
            <Row label="희망 매각가" value="🔒 본인인증 후 공개" muted />
          )}
          {canSeeAskingPrice && discount !== null && (
            <Row label="할인율" value={`${discount}%`} accent />
          )}
          {data.appraisalValue && <Row label="감정가" value={formatKRW(data.appraisalValue)} />}
        </dl>
      </section>

      {/* 담보 섹션 */}
      <section className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-4">
        <h3 className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
          담보
        </h3>
        <dl className="space-y-2.5">
          <Row label="유형" value={data.collateral.type} />
          <Row label="소재지" value={data.collateral.region} />
          {data.collateral.areaSqm && <Row label="전용면적" value={`${data.collateral.areaSqm}㎡`} />}
          {data.collateral.priorityLien && <Row label="선순위" value={data.collateral.priorityLien} />}
        </dl>
      </section>

      {/* 등급 섹션 */}
      {canSeeGrade ? (
        <section className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-4">
          <h3 className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-3">
            분석 (L2 이상)
          </h3>
          <dl className="space-y-2.5">
            {data.grade && <Row label="등급" value={data.grade} strong />}
            {data.estIrr && <Row label="예상 IRR" value={data.estIrr} accent />}
          </dl>
        </section>
      ) : (
        <section className="bg-[var(--color-surface-overlay)] border border-dashed border-[var(--color-border-subtle)] rounded-2xl p-4 text-center">
          <Lock className="w-5 h-5 mx-auto mb-2 text-[var(--color-text-muted)]" />
          <p className="text-[0.75rem] text-[var(--color-text-muted)] tracking-normal">
            등급 · 예상 IRR 은 NDA 체결 후 공개됩니다
          </p>
        </section>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  strong,
  muted,
  accent,
}: {
  label: string
  value: string
  strong?: boolean
  muted?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-[0.75rem] text-[var(--color-text-tertiary)] tracking-normal">{label}</dt>
      <dd
        className={[
          "text-[0.8125rem] tabular-nums tracking-normal",
          strong && "font-bold text-[var(--color-text-primary)]",
          muted && "text-[var(--color-text-muted)]",
          accent && "font-bold text-[var(--color-accent-default)]",
          !strong && !muted && !accent && "font-semibold text-[var(--color-text-primary)]",
        ].filter(Boolean).join(" ")}
      >
        {value}
      </dd>
    </div>
  )
}
