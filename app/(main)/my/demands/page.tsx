"use client"

/**
 * /my/demands — 매수자 본인의 매수 수요 관리
 *
 * - 등록된 수요 목록 (활성 / 일시중지 / 종료)
 * - 신규 등록, 편집, 종료 진입점
 * - 각 수요별 매칭 매물 수 표시 (Phase 5 endpoint 연계)
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Plus, Edit, Target, Building2, MapPin, TrendingUp, Clock,
  ArrowRight, AlertCircle,
} from "lucide-react"
import {
  MckPageShell, MckPageHeader, MckCard, MckBadge, MckEmptyState, MckDemoBanner,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from "@/lib/mck-design"

interface DemandRow {
  id: string
  collateral_types: string[]
  regions: string[]
  min_amount: number
  max_amount: number
  target_discount_rate: number
  urgency: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  status: "ACTIVE" | "PAUSED" | "CLOSED"
  proposal_count?: number
  created_at: string
  description?: string
}

const URGENCY_META: Record<string, { label: string; tone: "neutral" | "blue" | "ink" | "brass" }> = {
  LOW:    { label: "여유",    tone: "neutral" },
  MEDIUM: { label: "보통",    tone: "blue" },
  HIGH:   { label: "급함",    tone: "brass" },
  URGENT: { label: "매우급함", tone: "ink" },
}
const STATUS_META: Record<string, { label: string; tone: "ink" | "blue" | "neutral" | "brass" }> = {
  ACTIVE: { label: "활성",     tone: "ink" },
  PAUSED: { label: "일시중지", tone: "neutral" },
  CLOSED: { label: "종료",     tone: "neutral" },
}

const SAMPLE: DemandRow[] = [
  {
    id: "sample-d-001",
    collateral_types: ["아파트", "오피스텔"],
    regions: ["서울", "경기"],
    min_amount: 500_000_000,
    max_amount: 2_000_000_000,
    target_discount_rate: 35,
    urgency: "HIGH",
    status: "ACTIVE",
    proposal_count: 5,
    created_at: "2026-04-18T09:00:00Z",
    description: "서울/경기 아파트 NPL 35% 할인 매물 우선 검토.",
  },
  {
    id: "sample-d-002",
    collateral_types: ["근린시설/상가"],
    regions: ["부산"],
    min_amount: 800_000_000,
    max_amount: 3_000_000_000,
    target_discount_rate: 30,
    urgency: "MEDIUM",
    status: "PAUSED",
    proposal_count: 2,
    created_at: "2026-04-10T09:00:00Z",
  },
]

export default function MyDemandsPage() {
  const [rows, setRows] = useState<DemandRow[]>(SAMPLE)
  const [loading, setLoading] = useState(true)
  const [isSample, setIsSample] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch("/api/v1/exchange/demands?mine=1", { credentials: "include" })
        if (r.ok) {
          const j = await r.json()
          if (!cancelled && Array.isArray(j?.data) && j.data.length > 0) {
            setRows(j.data as DemandRow[])
            setIsSample(false)
          }
        }
      } catch { /* keep sample */ } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const stats = {
    total: rows.length,
    active: rows.filter((r) => r.status === "ACTIVE").length,
    paused: rows.filter((r) => r.status === "PAUSED").length,
    proposals: rows.reduce((s, r) => s + (r.proposal_count ?? 0), 0),
  }

  return (
    <MckPageShell variant="tint">
      {isSample && (
        <MckDemoBanner
          message="체험 모드 — 샘플 매수 수요 2건을 표시 중입니다. 신규 등록 시 실제 데이터로 전환됩니다."
          ctaLabel="신규 등록"
          ctaHref="/exchange/demands/new"
        />
      )}

      <MckPageHeader
        breadcrumbs={[
          { label: "마이", href: "/my" },
          { label: "매수 수요" },
        ]}
        eyebrow="MY · BUY DEMANDS"
        title="내 매수 수요"
        subtitle="등록한 매수 수요를 관리하고 매도자가 보낸 제안을 확인합니다. 수요별로 편집·일시중지·종료가 가능합니다."
        actions={
          <Link
            href="/exchange/demands/new"
            className="mck-cta-dark"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px",
              fontSize: 12, fontWeight: 800,
              background: MCK.ink, color: MCK.paper,
              borderTop: `2px solid ${MCK.electric}`,
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(10, 22, 40, 0.18)",
            }}
          >
            <Plus size={14} style={{ color: MCK.paper }} />
            <span style={{ color: MCK.paper }}>신규 매수 수요 등록</span>
          </Link>
        }
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 80px", display: "flex", flexDirection: "column", gap: 24 }}>
        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12 }}>
          {[
            { l: "총 등록", v: stats.total, sub: "수요 건수" },
            { l: "활성", v: stats.active, sub: "공개 중" },
            { l: "일시중지", v: stats.paused, sub: "검토 중" },
            { l: "받은 제안", v: stats.proposals, sub: "매도자 응답" },
          ].map((k) => (
            <div key={k.l} style={{
              background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`,
              padding: 16,
            }}>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 26, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {k.v}
              </div>
              <div style={{ fontSize: 11, color: MCK.textMuted, marginTop: 2 }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", fontSize: 12, color: MCK.textMuted }}>매수 수요 불러오는 중...</div>
        ) : rows.length === 0 ? (
          <MckEmptyState
            icon={Target}
            title="등록된 매수 수요가 없습니다"
            description="매수 수요를 등록하면 매도자가 적합한 매물을 직접 제안합니다."
            actionLabel="신규 등록"
            actionHref="/exchange/demands/new"
          />
        ) : (
          <section style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}` }}>
            {rows.map((row, i) => {
              const urgency = URGENCY_META[row.urgency] ?? URGENCY_META.MEDIUM
              const status = STATUS_META[row.status] ?? STATUS_META.ACTIVE
              return (
                <article
                  key={row.id}
                  style={{
                    padding: "18px 22px",
                    borderBottom: i < rows.length - 1 ? `1px solid ${MCK.border}` : "none",
                    display: "flex", flexDirection: "column", gap: 12,
                  }}
                >
                  <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                        <MckBadge tone={status.tone} size="sm">{status.label}</MckBadge>
                        <MckBadge tone={urgency.tone} size="sm">{urgency.label}</MckBadge>
                      </div>
                      <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em" }}>
                        {row.collateral_types.slice(0, 2).join(" · ")}
                        {row.collateral_types.length > 2 && ` 외 ${row.collateral_types.length - 2}종`}
                      </h3>
                      <div style={{ fontSize: 11, color: MCK.textMuted, marginTop: 2 }}>
                        ID · {row.id.slice(0, 8).toUpperCase()} · 등록 {String(row.created_at).slice(0, 10)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* 편집 — 매수자 본인용 edit 페이지 */}
                      <Link
                        href={`/exchange/demands/${row.id}/edit`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "7px 12px",
                          fontSize: 11, fontWeight: 800,
                          background: MCK.paper, color: MCK.ink,
                          border: `1px solid ${MCK.borderStrong}`,
                          borderTop: `2px solid ${MCK.electric}`,
                          textDecoration: "none",
                        }}
                      >
                        <Edit size={11} /> 편집
                      </Link>
                      {/* 상세 */}
                      <Link
                        href={`/exchange/demands/${row.id}`}
                        className="mck-cta-dark"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "7px 12px",
                          fontSize: 11, fontWeight: 800,
                          background: MCK.ink, color: MCK.paper,
                          border: "none",
                          borderTop: `2px solid ${MCK.electric}`,
                          textDecoration: "none",
                        }}
                      >
                        <span style={{ color: MCK.paper }}>상세 ↗</span>
                      </Link>
                    </div>
                  </header>

                  {/* Conditions */}
                  <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12, fontSize: 11 }}>
                    <Field icon={<Building2 size={11} />} label="담보" value={row.collateral_types.join(", ")} />
                    <Field icon={<MapPin size={11} />} label="지역" value={row.regions.join(", ")} />
                    <Field icon={<TrendingUp size={11} />} label="금액" value={`${formatKRW(row.min_amount)} ~ ${formatKRW(row.max_amount)}`} />
                    <Field icon={<Clock size={11} />} label="목표 할인율" value={`${row.target_discount_rate}%↑`} />
                  </div>

                  {row.description && (
                    <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.55 }}>
                      {row.description}
                    </p>
                  )}

                  <footer className="flex items-center justify-between" style={{ paddingTop: 8, borderTop: `1px solid ${MCK.border}` }}>
                    <span style={{ fontSize: 11, color: MCK.textMuted, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {row.proposal_count != null ? (
                        <>
                          <AlertCircle size={11} style={{ color: MCK.electric }} />
                          매도자 제안 <strong style={{ color: MCK.ink, fontWeight: 800 }}>{row.proposal_count}건</strong>
                        </>
                      ) : "—"}
                    </span>
                    <Link
                      href={`/exchange/demands/${row.id}#proposals`}
                      style={{ fontSize: 11, fontWeight: 700, color: MCK.electricDark, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      받은 제안 보기 <ArrowRight size={11} />
                    </Link>
                  </footer>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </MckPageShell>
  )
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800, color: MCK.electric, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  )
}
