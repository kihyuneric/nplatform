"use client"

/**
 * /my/agreements — 계약 관리 (NDA · LOI 이력)
 *
 * - NDA(비밀유지계약) 체결 이력
 * - LOI(매수의향서) 제출 이력
 * - 상태별 필터: 진행 중 / 승인 / 거절 / 만료
 */

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft, FileSignature, FileText, ExternalLink,
  CheckCircle2, Clock, XCircle, AlertCircle, Filter, Loader2,
} from "lucide-react"

const C = {
  bg0: "var(--color-bg-deepest, #030810)",
  bg1: "var(--color-bg-deep, #050D1A)",
  bg2: "var(--color-bg-base, #080F1E)",
  bg3: "var(--color-bg-base, #0A1628)",
  bg4: "var(--color-bg-elevated, #0F1F35)",
  em:     "var(--color-positive)",
  emL:    "var(--color-positive)",
  blue:   "var(--color-brand-dark)",
  blueL:  "var(--color-brand-bright)",
  amber:  "var(--color-warning)",
  rose:   "var(--color-danger)",
  purple: "#14161A",
  lt3:    "var(--color-text-muted)",
  lt4:    "var(--color-text-muted)",
}

type DocType = "NDA" | "LOI"
type DocStatus = "PENDING" | "APPROVED" | "SIGNED" | "REJECTED" | "EXPIRED"

interface AgreementRow {
  id: string
  type: DocType
  listing_id: string
  counterparty: string
  collateral: string
  amount?: number
  signed_at: string
  expires_at?: string
  status: DocStatus
}

// Sample data used as fallback when API is unavailable
const SAMPLE_AGREEMENTS: AgreementRow[] = [
  {
    id: "nda-2026-0412-001",
    type: "NDA",
    listing_id: "npl-2026-0412",
    counterparty: "우리은행 여신관리팀",
    collateral: "강남 오피스빌딩",
    signed_at: "2026-04-07 13:24",
    expires_at: "2027-04-07",
    status: "SIGNED",
  },
  {
    id: "loi-2026-0412-001",
    type: "LOI",
    listing_id: "npl-2026-0412",
    counterparty: "우리은행 여신관리팀",
    collateral: "강남 오피스빌딩",
    amount: 820_000_000,
    signed_at: "2026-04-07 13:52",
    status: "APPROVED",
  },
  {
    id: "nda-2026-0408-002",
    type: "NDA",
    listing_id: "npl-2026-0408",
    counterparty: "신한자산관리(주)",
    collateral: "분당 상가건물",
    signed_at: "2026-04-05 10:11",
    expires_at: "2027-04-05",
    status: "SIGNED",
  },
  {
    id: "loi-2026-0408-002",
    type: "LOI",
    listing_id: "npl-2026-0408",
    counterparty: "신한자산관리(주)",
    collateral: "분당 상가건물",
    amount: 1_240_000_000,
    signed_at: "2026-04-06 09:00",
    status: "PENDING",
  },
  {
    id: "nda-2026-0405-003",
    type: "NDA",
    listing_id: "npl-2026-0405",
    counterparty: "KB국민은행 NPL팀",
    collateral: "수원 공장부지",
    signed_at: "2026-04-02 16:34",
    expires_at: "2027-04-02",
    status: "SIGNED",
  },
  {
    id: "loi-2026-0405-003",
    type: "LOI",
    listing_id: "npl-2026-0405",
    counterparty: "KB국민은행 NPL팀",
    collateral: "수원 공장부지",
    amount: 2_100_000_000,
    signed_at: "2026-04-03 14:20",
    status: "REJECTED",
  },
  {
    id: "nda-2026-0331-004",
    type: "NDA",
    listing_id: "npl-2026-0331",
    counterparty: "유암코",
    collateral: "부산 호텔",
    signed_at: "2025-09-15 11:00",
    expires_at: "2026-09-15",
    status: "EXPIRED",
  },
]

const STATUS_META: Record<DocStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING:  { label: "검토 중",   color: "#14161A", bg: "#F59E0B1F", icon: Clock },
  APPROVED: { label: "승인",     color: "#14161A", bg: "#10B9811F", icon: CheckCircle2 },
  SIGNED:   { label: "체결 완료", color: "#2E75B6", bg: "#3B82F61F", icon: CheckCircle2 },
  REJECTED: { label: "거절",     color: "#1B1B1F", bg: "#F43F5E1F", icon: XCircle },
  EXPIRED:  { label: "만료",     color: "#64748B", bg: "#64748B1F", icon: AlertCircle },
}

const FILTERS = [
  { key: "ALL", label: "전체" },
  { key: "NDA", label: "NDA" },
  { key: "LOI", label: "LOI" },
  { key: "PENDING", label: "진행 중" },
  { key: "SIGNED", label: "체결 완료" },
  { key: "REJECTED", label: "거절/만료" },
] as const

export default function AgreementsPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("ALL")
  const [agreements, setAgreements] = useState<AgreementRow[]>(SAMPLE_AGREEMENTS)
  const [loadingData, setLoadingData] = useState(true)

  // Fetch real agreements from API; fall back to sample data on failure
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/my/agreements")
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.data) && json.data.length > 0) {
            setAgreements(json.data as AgreementRow[])
          }
        }
      } catch {
        // Keep sample data on error
      } finally {
        setLoadingData(false)
      }
    }
    load()
  }, [])

  const rows = useMemo(() => {
    if (filter === "ALL") return agreements
    if (filter === "NDA" || filter === "LOI") return agreements.filter(a => a.type === filter)
    if (filter === "REJECTED") return agreements.filter(a => a.status === "REJECTED" || a.status === "EXPIRED")
    return agreements.filter(a => a.status === filter)
  }, [filter, agreements])

  const stats = useMemo(() => ({
    nda: agreements.filter(a => a.type === "NDA").length,
    loi: agreements.filter(a => a.type === "LOI").length,
    pending: agreements.filter(a => a.status === "PENDING").length,
    signed: agreements.filter(a => a.status === "SIGNED" || a.status === "APPROVED").length,
  }), [agreements])

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      <section style={{ borderBottom: `1px solid ${C.bg4}`, backgroundColor: C.bg1 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "24px 24px 20px" }}>
          <Link
            href="/my"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: C.lt4, fontWeight: 600, textDecoration: "none",
            }}
          >
            <ChevronLeft size={14} /> 내 정보
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 80px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ fontSize: 11, color: C.emL, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8 }}>
            CONTRACTS
          </div>
          <h1
            style={{
              fontSize: 32, fontWeight: 900, color: "#fff",
              letterSpacing: "-0.02em", marginBottom: 8,
            }}
          >
            계약 관리
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 640 }}>
            체결한 NDA(비밀유지계약) 및 제출한 LOI(매수의향서) 이력을 한 곳에서 확인합니다.
            모든 계약은 전자서명법에 따라 5년간 보관됩니다.
          </p>
        </motion.div>

        {/* Loading indicator */}
        {loadingData && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontSize: 11, color: C.lt4 }}>
            <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
            계약 이력 불러오는 중...
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Stat cards */}
        <div
          style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14, marginBottom: 24,
          }}
        >
          <StatCard label="NDA 체결" value={stats.nda} color={C.blue} icon={FileSignature} />
          <StatCard label="LOI 제출" value={stats.loi} color={C.purple} icon={FileText} />
          <StatCard label="진행 중" value={stats.pending} color={C.amber} icon={Clock} />
          <StatCard label="체결 완료" value={stats.signed} color={C.em} icon={CheckCircle2} />
        </div>

        {/* Filters */}
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 16, flexWrap: "wrap",
          }}
        >
          <Filter size={14} color={C.lt4} />
          {FILTERS.map(f => {
            const active = filter === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: "7px 13px", borderRadius: 999,
                  fontSize: 11, fontWeight: 700,
                  backgroundColor: active ? "var(--color-positive-bg)" : C.bg2,
                  color: active ? C.emL : C.lt4,
                  border: `1px solid ${active ? C.em : C.bg4}`,
                  cursor: "pointer",
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Table */}
        <section
          style={{
            backgroundColor: C.bg2,
            border: `1px solid ${C.bg4}`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <header
            style={{
              display: "grid",
              gridTemplateColumns: "80px 1fr 200px 140px 130px 110px",
              padding: "14px 20px",
              fontSize: 11, color: C.lt4, fontWeight: 700,
              borderBottom: `1px solid ${C.bg4}`,
              backgroundColor: C.bg3,
              letterSpacing: "0.02em",
            }}
          >
            <span>유형</span>
            <span>매물 · 거래 상대</span>
            <span>계약 ID</span>
            <span>금액</span>
            <span>일시</span>
            <span>상태</span>
          </header>

          {rows.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", fontSize: 12, color: C.lt4 }}>
              해당 조건의 계약 이력이 없습니다.
            </div>
          ) : (
            rows.map((row, i) => {
              const meta = STATUS_META[row.status]
              const Icon = meta.icon
              return (
                <Link
                  key={row.id}
                  href={`/exchange/${row.listing_id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 200px 140px 130px 110px",
                    padding: "16px 20px",
                    borderBottom: i < rows.length - 1 ? `1px solid ${C.bg4}` : "none",
                    fontSize: 12, color: "#fff",
                    textDecoration: "none",
                    alignItems: "center",
                    transition: "background 0.15s",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 8px", borderRadius: 4,
                      backgroundColor: row.type === "NDA" ? "rgba(45, 116, 182, 0.12)" : "rgba(20,22,26, 0.1)",
                      color: row.type === "NDA" ? C.blueL : "#C084FC",
                      fontSize: 10, fontWeight: 800, width: "fit-content",
                      border: `1px solid ${row.type === "NDA" ? "rgba(45, 116, 182, 0.27)" : "rgba(20,22,26, 0.27)"}`,
                    }}
                  >
                    {row.type}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{row.collateral}</div>
                    <div style={{ fontSize: 10, color: C.lt4 }}>{row.counterparty}</div>
                  </div>
                  <div style={{ fontSize: 10, color: C.lt4, fontFamily: "monospace" }}>
                    {row.id}
                  </div>
                  <div style={{ fontWeight: 700, color: row.amount ? C.emL : C.lt4 }}>
                    {row.amount ? formatKRW(row.amount) : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: C.lt4 }}>
                    {row.signed_at}
                    {row.expires_at && (
                      <div style={{ fontSize: 9, marginTop: 2 }}>~ {row.expires_at}</div>
                    )}
                  </div>
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "5px 9px", borderRadius: 999,
                      backgroundColor: meta.bg, color: meta.color,
                      border: `1px solid ${meta.color}44`,
                      fontSize: 10, fontWeight: 800,
                      width: "fit-content",
                    }}
                  >
                    <Icon size={11} /> {meta.label}
                  </span>
                </Link>
              )
            })
          )}
        </section>

        {/* Notice */}
        <div
          style={{
            marginTop: 20, padding: "14px 16px", borderRadius: 12,
            backgroundColor: "rgba(45, 116, 182, 0.04)", border: "1px solid rgba(45, 116, 182, 0.2)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}
        >
          <AlertCircle size={16} color={C.blueL} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
            전자서명법 제5조에 따라 전자서명이 포함된 계약서는 종이 계약서와 동일한 법적 효력을 가집니다.
            계약 원본은 NPLatform 보안 저장소에 5년간 보관되며, 다운로드 시 PII Access Log에 기록됩니다.
          </div>
        </div>
      </section>
    </main>
  )
}

function StatCard({
  label, value, color, icon: Icon,
}: { label: string; value: number; color: string; icon: React.ElementType }) {
  return (
    <div
      style={{
        padding: 18, borderRadius: 12,
        backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
        display: "flex", alignItems: "center", gap: 14,
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 10,
          backgroundColor: `${color}1F`, border: `1px solid ${color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{value}</div>
      </div>
    </div>
  )
}

function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString("ko-KR")}원`
}
