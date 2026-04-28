"use client"

/**
 * /my/notices — 사용자가 받은 / 읽지 않은 공지 목록
 *
 * - 시스템/정책/거래/이벤트 카테고리별 분류
 * - 읽음 표시 (sessionStorage 캐시)
 * - 원본 공지 페이지로 이동 가능 (/notices/[id])
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, ChevronRight, AlertCircle, Megaphone } from "lucide-react"
import {
  MckPageShell, MckPageHeader, MckBadge, MckEmptyState, MckDemoBanner,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

interface NoticeRow {
  id: string
  title: string
  category: "SYSTEM" | "POLICY" | "TRADE" | "EVENT"
  is_important: boolean
  published_at: string
  preview?: string
}

const CATEGORY_META: Record<string, { label: string; tone: "ink" | "blue" | "neutral" | "brass" }> = {
  SYSTEM: { label: "시스템",   tone: "blue" },
  POLICY: { label: "정책",     tone: "ink" },
  TRADE:  { label: "거래",     tone: "brass" },
  EVENT:  { label: "이벤트",   tone: "neutral" },
}

const SAMPLE: NoticeRow[] = [
  { id: "n-1", title: "2026년 4월 거래 수수료 정책 변경 안내",                category: "POLICY",  is_important: true,  published_at: "2026-04-25T09:00:00Z", preview: "기관 매도자 0.6%, 일반 매도자 0.9% (8월 1일 시행)" },
  { id: "n-2", title: "이니시스 결제 통합 — ESCROW 결제 기능 출시",          category: "SYSTEM",  is_important: false, published_at: "2026-04-22T09:00:00Z", preview: "딜룸의 보증금 결제를 KG이니시스 결제창으로 진행할 수 있습니다." },
  { id: "n-3", title: "자체 전자서명 NDA/LOI 시스템 출시",                   category: "SYSTEM",  is_important: false, published_at: "2026-04-20T09:00:00Z", preview: "5년 보관, 위변조 방지 SHA256 해시, 감사로그 자동 기록." },
  { id: "n-4", title: "2026 신년 특별 이벤트 — 첫 거래 수수료 50% 할인",     category: "EVENT",   is_important: false, published_at: "2026-04-10T09:00:00Z" },
]

export default function MyNoticesPage() {
  const [rows, setRows] = useState<NoticeRow[]>(SAMPLE)
  const [loading, setLoading] = useState(true)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "IMPORTANT">("ALL")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch("/api/v1/notices", { credentials: "include" })
        if (r.ok) {
          const j = await r.json()
          if (!cancelled && Array.isArray(j?.data) && j.data.length > 0) {
            setRows(j.data as NoticeRow[])
          }
        }
        // 읽음 표시 캐시
        try {
          const raw = sessionStorage.getItem("notices-read")
          if (raw) {
            const ids = JSON.parse(raw) as string[]
            if (!cancelled) setReadIds(new Set(ids))
          }
        } catch { /* ignore */ }
      } catch { /* keep sample */ } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const markAsRead = (id: string) => {
    const next = new Set(readIds)
    next.add(id)
    setReadIds(next)
    try { sessionStorage.setItem("notices-read", JSON.stringify(Array.from(next))) } catch { /* ignore */ }
  }

  const filtered = rows.filter((r) => {
    if (filter === "UNREAD") return !readIds.has(r.id)
    if (filter === "IMPORTANT") return r.is_important
    return true
  })

  const unreadCount = rows.filter((r) => !readIds.has(r.id)).length

  return (
    <MckPageShell variant="tint">
      {loading && (
        <MckDemoBanner message="공지사항 불러오는 중..." />
      )}

      <MckPageHeader
        breadcrumbs={[{ label: "마이", href: "/my" }, { label: "공지사항" }]}
        eyebrow="MY · NOTICES"
        title="공지사항"
        subtitle={`최근 등록된 공지 ${rows.length}건 · 읽지 않은 공지 ${unreadCount}건. 시스템/정책/거래/이벤트 카테고리로 분류됩니다.`}
        actions={
          <Link href="/notices" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 16px", fontSize: 12, fontWeight: 700,
            background: MCK.paper, color: MCK.ink,
            border: `1px solid ${MCK.ink}`,
            textDecoration: "none",
          }}>
            <Megaphone size={14} /> 전체 공지 페이지
          </Link>
        }
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="flex items-center gap-2">
          {[
            { v: "ALL" as const, label: `전체 (${rows.length})` },
            { v: "UNREAD" as const, label: `안 읽음 (${unreadCount})` },
            { v: "IMPORTANT" as const, label: `중요 (${rows.filter((r) => r.is_important).length})` },
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

        {filtered.length === 0 ? (
          <MckEmptyState icon={Bell} title="공지사항이 없습니다" description="새 공지가 등록되면 자동으로 여기 표시됩니다." />
        ) : (
          <section style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}` }}>
            {filtered.map((row, i) => {
              const meta = CATEGORY_META[row.category] ?? CATEGORY_META.SYSTEM
              const isRead = readIds.has(row.id)
              return (
                <Link
                  key={row.id}
                  href={`/notices/${row.id}`}
                  onClick={() => markAsRead(row.id)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 14,
                    padding: "16px 22px",
                    borderBottom: i < filtered.length - 1 ? `1px solid ${MCK.border}` : "none",
                    textDecoration: "none",
                    background: isRead ? MCK.paper : "rgba(34, 81, 255, 0.02)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 90 }}>
                    <MckBadge tone={meta.tone} size="sm">{meta.label}</MckBadge>
                    {row.is_important && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 9, fontWeight: 800, color: "#A53F00" }}>
                        <AlertCircle size={10} /> 중요
                      </span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800,
                      color: MCK.ink, letterSpacing: "-0.005em", marginBottom: 4,
                    }}>
                      {!isRead && <span style={{ color: MCK.electric, marginRight: 6 }}>●</span>}
                      {row.title}
                    </div>
                    {row.preview && (
                      <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.5 }}>
                        {row.preview}
                      </p>
                    )}
                    <div style={{ fontSize: 10, color: MCK.textMuted, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                      {String(row.published_at).slice(0, 10)}
                    </div>
                  </div>
                  <ChevronRight size={14} color={MCK.textMuted} style={{ flexShrink: 0, marginTop: 4 }} />
                </Link>
              )
            })}
          </section>
        )}
      </div>
    </MckPageShell>
  )
}
