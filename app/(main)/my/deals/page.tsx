"use client"

/**
 * /my/deals — 사용자의 딜룸 참여 이력
 *
 * - 진행 중 / 완료 / 취소된 딜
 * - 딜룸 상세 진입 + 매도자/매수자 본인 만 편집 가능
 * - 관리자/매도자 본인은 삭제 진입점 (실 삭제 X — 상태만 ARCHIVED)
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Handshake, ArrowRight, Trash2, Edit, FileSignature, Wallet,
  Search,
} from "lucide-react"
import {
  MckPageShell, MckPageHeader, MckBadge, MckEmptyState, MckDemoBanner,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from "@/lib/mck-design"
import { useAuth } from "@/components/auth/auth-provider"

interface DealRow {
  id: string                 // listing_id (1:1)
  title: string
  status: "OPEN" | "IN_PROGRESS" | "CLOSING" | "CLOSED" | "CANCELLED"
  stage: string              // "NDA" / "LOI" / "ESCROW" 등
  counterparty: string
  region: string
  asking_price: number
  updated_at: string
  role: "BUYER" | "SELLER"
  seller_id?: string | null
  buyer_id?: string | null
}

const STATUS_META: Record<string, { label: string; tone: "ink" | "blue" | "neutral" | "brass" }> = {
  OPEN:        { label: "진행 중", tone: "blue" },
  IN_PROGRESS: { label: "협상 중", tone: "blue" },
  CLOSING:     { label: "체결 임박", tone: "brass" },
  CLOSED:      { label: "완료",     tone: "ink" },
  CANCELLED:   { label: "취소",     tone: "neutral" },
}

const SAMPLE: DealRow[] = [
  {
    id: "f9547bf9-f299-4977-b2d7-7165ccc4447a",
    title: "노원구 상계동 아파트",
    status: "IN_PROGRESS",
    stage: "LOI 검토 중",
    counterparty: "KB국민은행",
    region: "서울 노원구",
    asking_price: 470_000_000,
    updated_at: "2026-04-25T09:00:00Z",
    role: "BUYER",
  },
  {
    id: "ff6894df-a2df-4ca6-a1f1-0c7b070d7683",
    title: "부산 사하구 공장",
    status: "OPEN",
    stage: "NDA 체결 후 검증 중",
    counterparty: "부산저축은행",
    region: "부산 사하구",
    asking_price: 1_200_000_000,
    updated_at: "2026-04-22T14:30:00Z",
    role: "BUYER",
  },
]

export default function MyDealsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<DealRow[]>(SAMPLE)
  const [loading, setLoading] = useState(true)
  const [isSample, setIsSample] = useState(true)
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "CLOSED">("ALL")

  const userRole = String(user?.role ?? "")
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN"

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 매수자: agreements 테이블 → listing_id 별 그룹화
        const r = await fetch("/api/v1/agreements", { credentials: "include" })
        if (r.ok) {
          const j = await r.json()
          if (!cancelled && Array.isArray(j?.data) && j.data.length > 0) {
            // listing_id 별로 1건씩 (가장 최근 agreement)
            const byListing = new Map<string, DealRow>()
            for (const a of j.data as Array<Record<string, unknown>>) {
              const lid = String(a.listing_id)
              if (!byListing.has(lid)) {
                byListing.set(lid, {
                  id: lid,
                  title: "매물",
                  status: a.status === "APPROVED" ? "IN_PROGRESS" : "OPEN",
                  stage: `${a.type} ${a.status}`,
                  counterparty: "매도자",
                  region: "—",
                  asking_price: typeof a.loi_amount === "number" ? (a.loi_amount as number) : 0,
                  updated_at: String(a.signed_at ?? a.created_at ?? ""),
                  role: "BUYER",
                  buyer_id: String(a.buyer_id ?? ""),
                  seller_id: String(a.seller_id ?? ""),
                })
              }
            }
            setRows(Array.from(byListing.values()))
            setIsSample(false)
          }
        }
      } catch { /* keep sample */ } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = rows.filter((r) => {
    if (filter === "ACTIVE") return r.status === "OPEN" || r.status === "IN_PROGRESS" || r.status === "CLOSING"
    if (filter === "CLOSED") return r.status === "CLOSED" || r.status === "CANCELLED"
    return true
  })

  return (
    <MckPageShell variant="tint">
      {isSample && (
        <MckDemoBanner
          message="체험 모드 — 샘플 딜 2건을 표시 중입니다. NDA/LOI 체결 시 자동으로 실 데이터로 전환됩니다."
          ctaLabel="거래소 둘러보기"
          ctaHref="/exchange"
        />
      )}

      <MckPageHeader
        breadcrumbs={[{ label: "마이", href: "/my" }, { label: "내 딜룸" }]}
        eyebrow="MY · DEAL ROOMS"
        title="내 딜룸"
        subtitle="진행 중인 모든 딜을 한 화면에서 관리합니다. NDA/LOI/ESCROW 단계별 진척도와 매도자 응답을 확인하세요."
        actions={
          <Link href="/exchange" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 16px", fontSize: 12, fontWeight: 700,
            background: MCK.paper, color: MCK.ink,
            border: `1px solid ${MCK.ink}`,
            textDecoration: "none",
          }}>
            <Search size={14} /> 신규 매물 탐색
          </Link>
        }
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 80px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Filters */}
        <div className="flex items-center gap-2">
          {[
            { v: "ALL" as const, label: `전체 (${rows.length})` },
            { v: "ACTIVE" as const, label: `진행 중 (${rows.filter((r) => r.status === "OPEN" || r.status === "IN_PROGRESS" || r.status === "CLOSING").length})` },
            { v: "CLOSED" as const, label: `완료/취소 (${rows.filter((r) => r.status === "CLOSED" || r.status === "CANCELLED").length})` },
          ].map((f) => {
            const active = filter === f.v
            return (
              <button
                key={f.v}
                onClick={() => setFilter(f.v)}
                style={{
                  padding: "7px 14px",
                  fontSize: 11, fontWeight: 800,
                  background: active ? MCK.ink : MCK.paper,
                  color: active ? MCK.paper : MCK.ink,
                  border: `1px solid ${active ? MCK.ink : MCK.border}`,
                  borderTop: active ? `2px solid ${MCK.electric}` : `1px solid ${MCK.border}`,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", fontSize: 12, color: MCK.textMuted }}>딜 이력 불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <MckEmptyState
            icon={Handshake}
            title="진행 중인 딜이 없습니다"
            description="매물에 NDA/LOI 를 체결하면 자동으로 이 화면에 표시됩니다."
            actionLabel="거래소 둘러보기"
            actionHref="/exchange"
          />
        ) : (
          <section style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}` }}>
            {filtered.map((row, i) => {
              const meta = STATUS_META[row.status] ?? STATUS_META.OPEN
              const canEdit = isAdmin || (row.role === "SELLER")
              return (
                <article
                  key={row.id}
                  style={{
                    padding: "18px 22px",
                    borderBottom: i < filtered.length - 1 ? `1px solid ${MCK.border}` : "none",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                      <MckBadge tone={meta.tone} size="sm">{meta.label}</MckBadge>
                      <MckBadge tone="blue" size="sm">{row.role === "BUYER" ? "매수자" : "매도자"}</MckBadge>
                    </div>
                    <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 15, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em" }}>
                      {row.title}
                    </h3>
                    <div style={{ fontSize: 11, color: MCK.textMuted, marginTop: 4 }}>
                      {row.counterparty} · {row.region} · {row.stage} · {row.asking_price > 0 ? formatKRW(row.asking_price) : "—"}
                    </div>
                    <div style={{ fontSize: 10, color: MCK.textMuted, marginTop: 2 }}>
                      최종 갱신 · {String(row.updated_at).slice(0, 10)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* 편집 — 매도자 본인 또는 admin 만 (매물 정보 편집 = listing 편집) */}
                    {canEdit && (
                      <Link
                        href={isAdmin ? `/admin/listings/${row.id}/edit` : `/exchange/edit/${row.id}`}
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
                    )}
                    {/* 삭제/취소 — admin 만 */}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => alert("취소(상태 변경)는 관리자 검토를 통해 진행됩니다.")}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "7px 12px",
                          fontSize: 11, fontWeight: 800,
                          background: MCK.paper, color: "#991B1B",
                          border: "1px solid rgba(220, 38, 38, 0.40)",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={11} /> 취소
                      </button>
                    )}
                    <Link
                      href={`/deals/dealroom?listingId=${encodeURIComponent(row.id)}`}
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
                      <span style={{ color: MCK.paper }}>딜룸 ↗</span>
                      <ArrowRight size={11} style={{ color: MCK.paper }} />
                    </Link>
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </MckPageShell>
  )
}
