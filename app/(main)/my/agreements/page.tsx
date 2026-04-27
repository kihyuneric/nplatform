"use client"

/**
 * /my/agreements — 계약 관리 (NDA · LOI 이력) · McKinsey editorial
 *
 * - NDA(비밀유지계약) 체결 이력
 * - LOI(매수의향서) 제출 이력
 * - 상태별 필터: 진행 중 / 승인 / 거절 / 만료
 *
 * 디자인: White paper + ink black + electric blue accent (sharp corners)
 */

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  FileSignature, FileText, CheckCircle2, Clock, XCircle, AlertCircle,
  Filter, Loader2,
} from "lucide-react"
import { MckPageShell, MckPageHeader } from "@/components/mck"
import { MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

const INK = "#0A1628"
const PAPER = "#FFFFFF"
const PAPER_TINT = "#F8FAFC"
const ELECTRIC = "#2251FF"
const ELECTRIC_DARK = "#1A47CC"
const INK_MID = "rgba(5, 28, 44, 0.65)"
const INK_MUTED = "rgba(5, 28, 44, 0.45)"
const BORDER = "rgba(5, 28, 44, 0.10)"
const BORDER_STRONG = "rgba(5, 28, 44, 0.20)"

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

const SAMPLE_AGREEMENTS: AgreementRow[] = [
  { id: "nda-2026-0412-001", type: "NDA", listing_id: "npl-2026-0412", counterparty: "우리은행 여신관리팀", collateral: "강남 오피스빌딩",  signed_at: "2026-04-07 13:24", expires_at: "2027-04-07", status: "SIGNED" },
  { id: "loi-2026-0412-001", type: "LOI", listing_id: "npl-2026-0412", counterparty: "우리은행 여신관리팀", collateral: "강남 오피스빌딩",  amount: 820_000_000,   signed_at: "2026-04-07 13:52", status: "APPROVED" },
  { id: "nda-2026-0408-002", type: "NDA", listing_id: "npl-2026-0408", counterparty: "신한자산관리(주)",   collateral: "분당 상가건물",   signed_at: "2026-04-05 10:11", expires_at: "2027-04-05", status: "SIGNED" },
  { id: "loi-2026-0408-002", type: "LOI", listing_id: "npl-2026-0408", counterparty: "신한자산관리(주)",   collateral: "분당 상가건물",   amount: 1_240_000_000, signed_at: "2026-04-06 09:00", status: "PENDING" },
  { id: "nda-2026-0405-003", type: "NDA", listing_id: "npl-2026-0405", counterparty: "KB국민은행 NPL팀",   collateral: "수원 공장부지",   signed_at: "2026-04-02 16:34", expires_at: "2027-04-02", status: "SIGNED" },
  { id: "loi-2026-0405-003", type: "LOI", listing_id: "npl-2026-0405", counterparty: "KB국민은행 NPL팀",   collateral: "수원 공장부지",   amount: 2_100_000_000, signed_at: "2026-04-03 14:20", status: "REJECTED" },
  { id: "nda-2026-0331-004", type: "NDA", listing_id: "npl-2026-0331", counterparty: "유암코",            collateral: "부산 호텔",       signed_at: "2025-09-15 11:00", expires_at: "2026-09-15", status: "EXPIRED" },
]

const STATUS_META: Record<DocStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  PENDING:  { label: "검토 중",   color: "#A53F00", bg: "rgba(255, 140, 0, 0.10)", border: "rgba(255, 140, 0, 0.35)", icon: Clock },
  APPROVED: { label: "승인",     color: "#047857", bg: "rgba(16, 185, 129, 0.10)", border: "rgba(16, 185, 129, 0.35)", icon: CheckCircle2 },
  SIGNED:   { label: "체결 완료", color: ELECTRIC_DARK, bg: "rgba(34, 81, 255, 0.10)", border: "rgba(34, 81, 255, 0.30)", icon: CheckCircle2 },
  REJECTED: { label: "거절",     color: "#9F1239", bg: "rgba(225, 29, 72, 0.10)", border: "rgba(225, 29, 72, 0.35)", icon: XCircle },
  EXPIRED:  { label: "만료",     color: INK_MUTED, bg: "rgba(5, 28, 44, 0.06)", border: BORDER_STRONG, icon: AlertCircle },
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
        // keep sample
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
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[
          { label: "마이페이지", href: "/my" },
          { label: "계약 관리" },
        ]}
        eyebrow="MY · CONTRACTS"
        title="계약 관리"
        subtitle="체결한 NDA(비밀유지계약) 및 제출한 LOI(매수의향서) 이력을 한 곳에서 확인합니다. 모든 계약은 전자서명법에 따라 5년간 보관됩니다."
      />

      <section style={{ padding: "32px 24px 80px" }}>
        <div className="max-w-[1280px] mx-auto">
          {/* Loading */}
          {loadingData && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 11, color: INK_MID }}>
              <Loader2 size={13} style={{ animation: "spin 1s linear infinite", color: ELECTRIC }} />
              계약 이력 불러오는 중...
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* KPI cards (4-col) */}
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12, marginBottom: 22 }}>
            <StatCard label="NDA 체결" value={stats.nda} icon={FileSignature} />
            <StatCard label="LOI 제출" value={stats.loi} icon={FileText} />
            <StatCard label="진행 중" value={stats.pending} icon={Clock} />
            <StatCard label="체결 완료" value={stats.signed} icon={CheckCircle2} highlight />
          </div>

          {/* Filters */}
          <div className="flex items-center flex-wrap" style={{ gap: 6, marginBottom: 16 }}>
            <Filter size={14} style={{ color: ELECTRIC, marginRight: 4 }} />
            {FILTERS.map(f => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={active ? "mck-cta-dark" : ""}
                  style={{
                    padding: "7px 14px",
                    fontSize: 11, fontWeight: active ? 800 : 700,
                    background: active ? INK : PAPER,
                    color: active ? PAPER : INK,
                    border: active ? `1px solid ${INK}` : `1px solid ${BORDER_STRONG}`,
                    borderTop: active ? `2px solid ${ELECTRIC}` : `1px solid ${BORDER_STRONG}`,
                    cursor: "pointer", letterSpacing: "-0.005em",
                  }}
                >
                  <span style={{ color: active ? PAPER : INK }}>{f.label}</span>
                </button>
              )
            })}
          </div>

          {/* Table */}
          <section
            className="mck-paper"
            style={{
              background: PAPER,
              border: `1px solid ${BORDER}`,
              borderTop: `2px solid ${ELECTRIC}`,
              borderRadius: 0,
              overflow: "hidden",
              boxShadow: "0 8px 18px -6px rgba(5, 28, 44, 0.08)",
            }}
          >
            <header
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr 200px 140px 140px 110px",
                gap: 12,
                padding: "12px 20px",
                fontSize: 9, color: INK_MID, fontWeight: 800,
                background: PAPER_TINT,
                borderBottom: `1px solid ${BORDER}`,
                letterSpacing: "0.10em", textTransform: "uppercase",
              }}
            >
              <span>유형</span>
              <span>매물 · 거래 상대</span>
              <span>계약 ID</span>
              <span style={{ textAlign: "right" }}>금액</span>
              <span>일시</span>
              <span>상태</span>
            </header>

            {rows.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", fontSize: 12, color: INK_MUTED }}>
                해당 조건의 계약 이력이 없습니다.
              </div>
            ) : (
              rows.map((row, i) => {
                const meta = STATUS_META[row.status]
                const Icon = meta.icon
                return (
                  <Link
                    key={row.id}
                    /* SoT — 매물 상세는 항상 딜룸 (?listingId 쿼리) */
                    href={`/deals/dealroom?listingId=${encodeURIComponent(row.listing_id)}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr 200px 140px 140px 110px",
                      gap: 12,
                      padding: "16px 20px",
                      borderBottom: i < rows.length - 1 ? `1px solid ${BORDER}` : "none",
                      fontSize: 12, color: INK,
                      textDecoration: "none",
                      alignItems: "center",
                      transition: "background 0.15s",
                    }}
                  >
                    {/* type chip */}
                    <span style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      padding: "4px 10px",
                      background: row.type === "NDA" ? "rgba(34, 81, 255, 0.08)" : "rgba(0, 169, 244, 0.10)",
                      color: row.type === "NDA" ? ELECTRIC_DARK : "#0075B0",
                      fontSize: 10, fontWeight: 800,
                      width: "fit-content",
                      border: `1px solid ${row.type === "NDA" ? "rgba(34, 81, 255, 0.30)" : "rgba(0, 169, 244, 0.35)"}`,
                      letterSpacing: "0.04em",
                    }}>
                      {row.type}
                    </span>
                    {/* listing + counterparty */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800,
                        color: INK, letterSpacing: "-0.01em", marginBottom: 2,
                      }}>
                        {row.collateral}
                      </div>
                      <div style={{ fontSize: 11, color: INK_MID, fontWeight: 500 }}>
                        {row.counterparty}
                      </div>
                    </div>
                    {/* contract id */}
                    <div style={{ fontSize: 10, color: INK_MUTED, fontFamily: "monospace", fontVariantNumeric: "tabular-nums" }}>
                      {row.id}
                    </div>
                    {/* amount */}
                    <div style={{
                      textAlign: "right",
                      fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800,
                      color: row.amount ? INK : INK_MUTED,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.01em",
                    }}>
                      {row.amount ? formatKRW(row.amount) : "—"}
                    </div>
                    {/* date */}
                    <div style={{ fontSize: 11, color: INK_MID, fontVariantNumeric: "tabular-nums" }}>
                      <div>{row.signed_at}</div>
                      {row.expires_at && (
                        <div style={{ fontSize: 9, marginTop: 2, color: INK_MUTED }}>~ {row.expires_at}</div>
                      )}
                    </div>
                    {/* status chip */}
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 9px",
                      background: meta.bg, color: meta.color,
                      border: `1px solid ${meta.border}`,
                      fontSize: 10, fontWeight: 800,
                      width: "fit-content",
                      letterSpacing: "0.04em",
                    }}>
                      <Icon size={11} style={{ color: meta.color }} /> {meta.label}
                    </span>
                  </Link>
                )
              })
            )}
          </section>

          {/* Notice */}
          <div
            style={{
              marginTop: 18,
              padding: "14px 18px",
              background: "rgba(34, 81, 255, 0.04)",
              border: `1px solid ${BORDER}`,
              borderLeft: `3px solid ${ELECTRIC}`,
              display: "flex", gap: 10, alignItems: "flex-start",
            }}
          >
            <AlertCircle size={16} style={{ color: ELECTRIC, marginTop: 2, flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: INK_MID, lineHeight: 1.6, fontWeight: 500 }}>
              <strong style={{ color: INK, fontWeight: 800 }}>전자서명법 제5조</strong>에 따라 전자서명이 포함된 계약서는 종이 계약서와 동일한 법적 효력을 가집니다.
              계약 원본은 NPLatform 보안 저장소에 5년간 보관되며, 다운로드 시 PII Access Log에 기록됩니다.
            </div>
          </div>
        </div>
      </section>
    </MckPageShell>
  )
}

function StatCard({
  label, value, icon: Icon, highlight,
}: { label: string; value: number; icon: React.ElementType; highlight?: boolean }) {
  return (
    <motion.article
      className="mck-paper"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: PAPER,
        border: `1px solid ${BORDER}`,
        borderTop: `2px solid ${ELECTRIC}`,
        borderRadius: 0,
        padding: "18px 20px",
        boxShadow: "0 8px 18px -6px rgba(5, 28, 44, 0.08)",
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <div style={{ ...MCK_TYPE.label, color: INK_MID }}>{label}</div>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 30, height: 30,
          background: "rgba(34, 81, 255, 0.08)",
          border: "1px solid rgba(34, 81, 255, 0.20)",
        }}>
          <Icon size={14} style={{ color: ELECTRIC }} />
        </span>
      </div>
      <div style={{
        fontFamily: MCK_FONTS.serif,
        fontSize: 28, fontWeight: 800,
        color: highlight ? ELECTRIC : INK,
        letterSpacing: "-0.02em",
        lineHeight: 1.05,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
    </motion.article>
  )
}

function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return `${n.toLocaleString("ko-KR")}원`
}
