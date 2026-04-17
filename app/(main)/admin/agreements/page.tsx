"use client"

/**
 * /admin/agreements — NDA / LOI 운영 대시보드 (관리자용)
 *
 * 플랫폼 전체에서 체결된 NDA·LOI를 모니터링하고,
 * 비우회(non-circumvention) 위반 의심 패턴을 자동 플래그한다.
 *
 * 위반 사례 예시:
 *   - NDA 체결 후 매물 외부 채널 직접 거래 흔적
 *   - 동일 IP에서 매도자/매수자 양측 NDA 체결 시도
 *   - LOI 승인 직후 거래 취소 + 외부 계약 체결
 */

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft, FileSignature, FileText, AlertTriangle,
  CheckCircle2, Clock, XCircle, Search, Filter, Flag,
  TrendingUp, ShieldAlert, Eye, Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const C = {
  bg0: "#030810", bg1: "#050D1A", bg2: "#080F1E",
  bg3: "#0A1628", bg4: "#0F1F35",
  em: "#10B981", emL: "#10B981",
  blue: "#2E75B6", blueL: "#3B82F6",
  amber: "#F59E0B", rose: "#EF4444", purple: "#A855F7",
  lt3: "#64748B", lt4: "#475569",
}

type DocType = "NDA" | "LOI"
type DocStatus = "PENDING" | "APPROVED" | "SIGNED" | "REJECTED" | "EXPIRED" | "WITHDRAWN"
type FlagSeverity = "NONE" | "WATCH" | "SUSPECT" | "VIOLATION"

interface AdminAgreementRow {
  id: string
  type: DocType
  listing_id: string
  collateral: string
  buyer: string
  buyer_tier: "L1" | "L2" | "L3"
  seller: string
  amount?: number
  signed_at: string
  status: DocStatus
  flag: FlagSeverity
  flag_reason?: string
}

const FALLBACK_ROWS: AdminAgreementRow[] = []

const TYPE_META: Record<DocType, { color: string }> = {
  NDA: { color: "#2E75B6" },
  LOI: { color: "#A855F7" },
}

const STATUS_META: Record<DocStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: "검토 중",  color: "#F59E0B", icon: Clock },
  APPROVED:  { label: "승인",    color: "#10B981", icon: CheckCircle2 },
  SIGNED:    { label: "체결",    color: "#2E75B6", icon: CheckCircle2 },
  REJECTED:  { label: "거절",    color: "#EF4444", icon: XCircle },
  EXPIRED:   { label: "만료",    color: "#64748B", icon: XCircle },
  WITHDRAWN: { label: "철회",    color: "#475569", icon: XCircle },
}

const FLAG_META: Record<FlagSeverity, { label: string; color: string }> = {
  NONE:      { label: "정상",   color: "#10B981" },
  WATCH:     { label: "관찰",   color: "#F59E0B" },
  SUSPECT:   { label: "의심",   color: "#F97316" },
  VIOLATION: { label: "위반",   color: "#EF4444" },
}

const FILTERS = [
  { key: "ALL",       label: "전체" },
  { key: "NDA",       label: "NDA" },
  { key: "LOI",       label: "LOI" },
  { key: "WATCH",     label: "관찰+" },
  { key: "VIOLATION", label: "위반만" },
] as const

export default function AdminAgreementsPage() {
  const supabase = createClient()
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("ALL")
  const [query, setQuery] = useState("")
  const [allRows, setAllRows] = useState<AdminAgreementRow[]>(FALLBACK_ROWS)
  const [loading, setLoading] = useState(false)

  const loadAgreements = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from("agreements")
        .select("id, doc_type, listing_id, collateral_desc, buyer_id, buyer_tier, seller_name, amount, signed_at, status, flag_severity, flag_reason")
        .order("signed_at", { ascending: false })
        .limit(50)
      if (data && data.length > 0) {
        setAllRows(data.map(r => ({
          id: String(r.id),
          type: (r.doc_type ?? "NDA") as DocType,
          listing_id: r.listing_id ?? "",
          collateral: r.collateral_desc ?? "",
          buyer: r.buyer_id ?? "",
          buyer_tier: (r.buyer_tier ?? "L1") as AdminAgreementRow["buyer_tier"],
          seller: r.seller_name ?? "",
          amount: r.amount ?? undefined,
          signed_at: (r.signed_at ?? "").slice(0, 16).replace("T", " "),
          status: (r.status ?? "PENDING") as DocStatus,
          flag: (r.flag_severity ?? "NONE") as FlagSeverity,
          flag_reason: r.flag_reason ?? undefined,
        })))
      }
    } catch { /* keep fallback */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadAgreements() }, [loadAgreements])

  const rows = useMemo(() => {
    return allRows.filter(r => {
      if (filter === "NDA" || filter === "LOI") {
        if (r.type !== filter) return false
      } else if (filter === "WATCH") {
        if (r.flag === "NONE") return false
      } else if (filter === "VIOLATION") {
        if (r.flag !== "VIOLATION") return false
      }
      if (query) {
        const q = query.toLowerCase()
        if (
          !r.collateral.toLowerCase().includes(q) &&
          !r.buyer.toLowerCase().includes(q) &&
          !r.seller.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [allRows, filter, query])

  const stats = useMemo(() => ({
    total: allRows.length,
    nda: allRows.filter(r => r.type === "NDA").length,
    loi: allRows.filter(r => r.type === "LOI").length,
    flagged: allRows.filter(r => r.flag !== "NONE").length,
    violations: allRows.filter(r => r.flag === "VIOLATION").length,
  }), [allRows])

  const firstViolation = useMemo(() => allRows.find(r => r.flag === "VIOLATION"), [allRows])

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      <section style={{ borderBottom: `1px solid ${C.bg4}`, backgroundColor: C.bg1 }}>
        <div style={{ maxWidth: 1480, margin: "0 auto", padding: "24px 24px 20px" }}>
          <Link
            href="/admin"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: C.lt4, fontWeight: 600, textDecoration: "none",
            }}
          >
            <ChevronLeft size={14} /> 관리자
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 1480, margin: "0 auto", padding: "32px 24px 80px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ fontSize: 11, color: C.emL, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8 }}>
            ADMIN · CONTRACTS
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
            NDA · LOI 모니터링
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 720 }}>
            플랫폼 전체에서 체결된 비밀유지계약 및 매수의향서 현황을 모니터링하고,
            비우회(non-circumvention) 조항 위반 의심 패턴을 실시간으로 탐지합니다.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
          <StatCard label="총 계약" value={stats.total} color={C.blue} icon={FileSignature} />
          <StatCard label="NDA" value={stats.nda} color={C.blueL} icon={FileSignature} />
          <StatCard label="LOI" value={stats.loi} color={C.purple} icon={FileText} />
          <StatCard label="플래그" value={stats.flagged} color={C.amber} icon={Flag} />
          <StatCard label="위반 확정" value={stats.violations} color={C.rose} icon={ShieldAlert} />
        </div>

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.lt4, fontSize: 11 }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            계약 데이터를 불러오는 중...
          </div>
        )}

        {/* Violation banner — dynamic from DB */}
        {firstViolation && (
          <div
            style={{
              padding: "14px 18px", borderRadius: 12,
              backgroundColor: `${C.rose}0F`, border: `1px solid ${C.rose}55`,
              marginBottom: 18,
              display: "flex", gap: 12, alignItems: "center",
            }}
          >
            <ShieldAlert size={18} color={C.rose} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 2 }}>
                비우회 조항 위반 확정: {firstViolation.buyer}
              </div>
              <div style={{ fontSize: 11, color: C.lt4 }}>
                {firstViolation.listing_id} ({firstViolation.collateral}) — {firstViolation.flag_reason ?? "위반 확정"}. 위약금 청구 + 영구 정지 조치 필요.
              </div>
            </div>
            <button
              style={{
                padding: "8px 14px", borderRadius: 8,
                backgroundColor: `${C.rose}1F`, color: C.rose,
                border: `1px solid ${C.rose}66`,
                fontSize: 11, fontWeight: 800, cursor: "pointer",
              }}
            >
              법무팀 에스컬레이션
            </button>
          </div>
        )}

        {/* Search + filter */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 8, flex: "1 1 280px",
              padding: "9px 13px", borderRadius: 10,
              backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
            }}
          >
            <Search size={14} color={C.lt4} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="매물 · 매수자 · 매도자 검색"
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#fff", fontSize: 12,
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Filter size={13} color={C.lt4} />
            {FILTERS.map(f => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  style={{
                    padding: "6px 12px", borderRadius: 999,
                    fontSize: 11, fontWeight: 700,
                    backgroundColor: active ? `${C.em}1F` : C.bg2,
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
        <section
          style={{
            backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
            borderRadius: 14, overflow: "hidden", minWidth: 760,
          }}
        >
          <header
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr 130px 130px 130px 100px 100px",
              padding: "13px 18px",
              fontSize: 10, color: C.lt4, fontWeight: 700,
              borderBottom: `1px solid ${C.bg4}`,
              backgroundColor: C.bg3,
            }}
          >
            <span>유형</span>
            <span>매물 / 양 당사자</span>
            <span>금액</span>
            <span>일시</span>
            <span>상태</span>
            <span>플래그</span>
            <span>작업</span>
          </header>
          {rows.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", fontSize: 12, color: C.lt4 }}>
              {loading ? "계약 데이터를 불러오는 중입니다..." : allRows.length === 0 ? "체결된 계약이 없습니다." : "해당 조건의 계약이 없습니다."}
            </div>
          ) : (
            rows.map((row, i) => {
              const stat = STATUS_META[row.status]
              const StatIcon = stat.icon
              const flag = FLAG_META[row.flag]
              return (
                <div
                  key={row.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 130px 130px 130px 100px 100px",
                    padding: "16px 18px",
                    borderBottom: i < rows.length - 1 ? `1px solid ${C.bg4}` : "none",
                    fontSize: 11, color: "#fff",
                    alignItems: "center",
                    backgroundColor: row.flag === "VIOLATION" ? `${C.rose}08` :
                                     row.flag === "SUSPECT" ? `${C.amber}08` :
                                     "transparent",
                  }}
                >
                  <span
                    style={{
                      padding: "3px 7px", borderRadius: 4,
                      backgroundColor: `${TYPE_META[row.type].color}1F`,
                      color: TYPE_META[row.type].color,
                      border: `1px solid ${TYPE_META[row.type].color}44`,
                      fontSize: 9, fontWeight: 800,
                      width: "fit-content",
                    }}
                  >
                    {row.type}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, marginBottom: 3 }}>{row.collateral}</div>
                    <div style={{ fontSize: 9, color: C.lt4 }}>
                      <b style={{ color: "#cbd5e1" }}>{row.buyer}</b> ({row.buyer_tier}) → {row.seller}
                    </div>
                    {row.flag_reason && (
                      <div style={{ fontSize: 9, color: flag.color, marginTop: 4, fontWeight: 700 }}>
                        ⚠ {row.flag_reason}
                      </div>
                    )}
                  </div>
                  <div style={{ fontWeight: 800, color: row.amount ? C.emL : C.lt4 }}>
                    {row.amount ? formatKRW(row.amount) : "—"}
                  </div>
                  <div style={{ fontSize: 10, color: C.lt4 }}>{row.signed_at}</div>
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 9px", borderRadius: 999,
                      backgroundColor: `${stat.color}1A`, color: stat.color,
                      border: `1px solid ${stat.color}44`,
                      fontSize: 9, fontWeight: 800,
                      width: "fit-content",
                    }}
                  >
                    <StatIcon size={10} /> {stat.label}
                  </span>
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 9px", borderRadius: 999,
                      backgroundColor: `${flag.color}1A`, color: flag.color,
                      border: `1px solid ${flag.color}44`,
                      fontSize: 9, fontWeight: 800,
                      width: "fit-content",
                    }}
                  >
                    <Flag size={10} /> {flag.label}
                  </span>
                  <button
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "5px 10px", borderRadius: 6,
                      backgroundColor: C.bg3, color: C.lt4,
                      border: `1px solid ${C.bg4}`,
                      fontSize: 10, fontWeight: 700, cursor: "pointer",
                      width: "fit-content",
                    }}
                  >
                    <Eye size={11} /> 상세
                  </button>
                </div>
              )
            })
          )}
        </section>
        </div>

        <div
          style={{
            marginTop: 20, padding: "14px 16px", borderRadius: 12,
            backgroundColor: `${C.blue}0A`, border: `1px solid ${C.blue}33`,
            display: "flex", gap: 10, alignItems: "flex-start",
          }}
        >
          <ShieldAlert size={16} color={C.blueL} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
            비우회(non-circumvention) 위반 탐지는 ① 동일 IP/디바이스 다중 NDA, ② LOI 승인 후 즉시 철회 + 외부 거래 흔적,
            ③ 매도·매수 양측 동일 사업자 등록번호 등을 자동 분석합니다. 위반 확정 시 NDA 약관에 따른 위약금(거래액의 30%) 청구가 가능합니다.
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
