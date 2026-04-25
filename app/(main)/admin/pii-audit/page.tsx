"use client"

/**
 * /admin/pii-audit — PII Access Log 감사 (관리자용)
 *
 * 모든 회원의 L1~L3 자료 열람·다운로드 행위를 감사한다.
 * 비정상 패턴(단시간 다량 다운로드, 다중 매물 스캔 등) 자동 탐지 후 알림.
 *
 * 신용정보법 §35 (열람청구권) 및 §40 (위탁기관 점검 의무) 준수.
 */

import { useState, useMemo, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft, Eye, Download, AlertTriangle, ShieldCheck,
  Filter, Search, TrendingUp, Activity, User as UserIcon, RefreshCw,
  FileDown, Calendar,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type Range = "today" | "7d" | "30d" | "all"
const RANGE_LABEL: Record<Range, string> = {
  today: "오늘", "7d": "7일", "30d": "30일", all: "전체",
}

interface Anomaly {
  severity: "LOW" | "MEDIUM" | "HIGH"
  userId: string
  reason: string
  evidence: string[]
  detectedAt: string
}

const C = {
  bg0: "#030810", bg1: "#050D1A", bg2: "#080F1E",
  bg3: "#0A1628", bg4: "#0F1F35",
  em: "#14161A", emL: "#14161A",
  blue: "#2E75B6", blueL: "#14161A",
  amber: "#14161A", rose: "#1B1B1F", purple: "#14161A",
  lt3: "#64748B", lt4: "#475569",
}

type AuditAction = "VIEW" | "DOWNLOAD" | "MASKED_REVEAL" | "DATAROOM_ENTER"
type AuditTier = "L1" | "L2" | "L3"
type Severity = "NORMAL" | "WATCH" | "ALERT"

interface AuditRow {
  id: string
  time: string
  user: string
  user_tier: AuditTier
  listing_id: string
  field: string
  field_tier: AuditTier
  action: AuditAction
  ip: string
  ua: string
  severity: Severity
}

// Fallback empty — populated from Supabase pii_audit_logs or audit_logs table
const FALLBACK_AUDIT: AuditRow[] = []

const SEV_META: Record<Severity, { label: string; color: string; bg: string }> = {
  NORMAL: { label: "정상",  color: "#14161A", bg: "#10B9811A" },
  WATCH:  { label: "관찰",  color: "#14161A", bg: "#F59E0B1A" },
  ALERT:  { label: "경보",  color: "#1B1B1F", bg: "#F43F5E1A" },
}

const TIER_COLOR: Record<AuditTier, string> = {
  L1: "#2E75B6", L2: "#14161A", L3: "#14161A",
}

const ACTION_META: Record<AuditAction, { label: string; color: string }> = {
  VIEW:           { label: "열람",         color: "#2E75B6" },
  DOWNLOAD:       { label: "다운로드",     color: "#14161A" },
  MASKED_REVEAL:  { label: "마스킹 해제",  color: "#14161A" },
  DATAROOM_ENTER: { label: "데이터룸 입장", color: "#14161A" },
}

const FILTERS = [
  { key: "ALL",    label: "전체" },
  { key: "ALERT",  label: "경보만" },
  { key: "WATCH",  label: "관찰" },
  { key: "L3",     label: "L3 자료" },
  { key: "DOWNLOAD", label: "다운로드" },
] as const

export default function PiiAuditPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("ALL")
  const [query, setQuery] = useState("")
  const [range, setRange] = useState<Range>("7d")
  const [audit, setAudit] = useState<AuditRow[]>(FALLBACK_AUDIT)
  const [loadingAudit, setLoadingAudit] = useState(true)
  const [anomalies, setAnomalies] = useState<Anomaly[]>([])
  const [exporting, setExporting] = useState(false)

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/v1/admin/audit?range=${range}&format=csv&limit=5000`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit-log-${range}-${Date.now()}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  // Fetch from server-side audit API (auto-fallback to pii_audit_logs / audit_logs)
  const loadAudit = async () => {
    setLoadingAudit(true)
    try {
      const apiRes = await fetch(`/api/v1/admin/audit?range=${range}&limit=500`, {
        credentials: "include",
      })
      if (apiRes.ok) {
        const json = await apiRes.json()
        setAnomalies(json?.data?.anomalies ?? [])
      }
    } catch {
      /* fall through to direct supabase */
    }
    try {
      const supabase = createClient()
      // Try pii_audit_logs first, fall back to audit_logs with pii-relevant actions
      const { data, error } = await supabase
        .from('pii_audit_logs')
        .select('*')
        .order('time', { ascending: false })
        .limit(200)

      if (!error && data && data.length > 0) {
        setAudit(data.map(r => ({
          id: String(r.id),
          time: (r.time ?? r.created_at ?? '').replace('T', ' ').slice(0, 19),
          user: r.user ?? r.user_id ?? 'unknown',
          user_tier: (r.user_tier ?? 'L1') as AuditTier,
          listing_id: r.listing_id ?? '',
          field: r.field ?? '',
          field_tier: (r.field_tier ?? 'L1') as AuditTier,
          action: (r.action ?? 'VIEW') as AuditAction,
          ip: r.ip ?? r.ip_address ?? '',
          ua: r.ua ?? r.user_agent ?? '',
          severity: (r.severity ?? 'NORMAL') as Severity,
        })))
      } else {
        // Fall back to audit_logs table with relevant actions
        const { data: auditData } = await supabase
          .from('audit_logs')
          .select('id, user_id, action, entity_id, detail, ip_address, user_agent, created_at')
          .in('action', ['DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD', 'MASKED_REVEAL', 'DATAROOM_ENTER'])
          .order('created_at', { ascending: false })
          .limit(100)
        if (auditData && auditData.length > 0) {
          setAudit(auditData.map(r => {
            const detail = r.detail as Record<string, unknown> | null
            return {
              id: String(r.id),
              time: (r.created_at ?? '').replace('T', ' ').slice(0, 19),
              user: r.user_id ?? 'unknown',
              user_tier: ((detail?.user_tier as string) ?? 'L1') as AuditTier,
              listing_id: (detail?.listing_id as string) ?? r.entity_id ?? '',
              field: (detail?.field as string) ?? r.action,
              field_tier: ((detail?.field_tier as string) ?? 'L1') as AuditTier,
              action: (r.action.includes('DOWNLOAD') ? 'DOWNLOAD' : r.action.includes('VIEW') ? 'VIEW' : r.action) as AuditAction,
              ip: r.ip_address ?? '',
              ua: r.user_agent ?? '',
              severity: 'NORMAL' as Severity,
            }
          }))
        }
      }
    } catch { /* keep fallback */ }
    setLoadingAudit(false)
  }

  useEffect(() => { loadAudit() }, [range])

  const rows = useMemo(() => {
    return audit.filter(row => {
      if (filter === "ALERT" && row.severity !== "ALERT") return false
      if (filter === "WATCH" && row.severity === "NORMAL") return false
      if (filter === "L3" && row.field_tier !== "L3") return false
      if (filter === "DOWNLOAD" && row.action !== "DOWNLOAD") return false
      if (query) {
        const q = query.toLowerCase()
        if (
          !row.user.toLowerCase().includes(q) &&
          !row.listing_id.toLowerCase().includes(q) &&
          !row.field.toLowerCase().includes(q) &&
          !row.ip.includes(q)
        ) return false
      }
      return true
    })
  }, [audit, filter, query])

  const stats = useMemo(() => ({
    total: audit.length,
    alerts: audit.filter(a => a.severity === "ALERT").length,
    downloads: audit.filter(a => a.action === "DOWNLOAD").length,
    unique_users: new Set(audit.map(a => a.user)).size,
  }), [audit])

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
            ADMIN · PII AUDIT
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
            PII Access Log 감사
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 720 }}>
            모든 회원의 L1~L3 자료 열람·다운로드 이력을 추적하고, 비정상 패턴(스크래핑·다량 다운로드)을 자동 탐지합니다.
            신용정보법 §35·§40 위탁기관 점검 의무 충족용 감사 도구입니다.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <StatCard label="오늘 총 행위" value={stats.total} color={C.blue} icon={Activity} />
          <StatCard label="경보 발생"   value={stats.alerts}   color={C.rose}  icon={AlertTriangle} />
          <StatCard label="다운로드"     value={stats.downloads} color={C.em}   icon={Download} />
          <StatCard label="활동 사용자"  value={stats.unique_users} color={C.purple} icon={UserIcon} />
        </div>

        {/* Anomaly panel — all detected anomalies */}
        {anomalies.length > 0 && (
          <div
            style={{
              padding: "14px 18px", borderRadius: 12,
              backgroundColor: `${C.amber}0A`, border: `1px solid ${C.amber}55`,
              marginBottom: 14,
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
              fontSize: 12, fontWeight: 800, color: C.amber,
            }}>
              <AlertTriangle size={14} /> 자동 이상 탐지 — {anomalies.length}건
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {anomalies.slice(0, 6).map((a, i) => {
                const sevColor = a.severity === "HIGH" ? C.rose : a.severity === "MEDIUM" ? C.amber : C.blue
                return (
                  <div key={i} style={{
                    display: "flex", gap: 10, alignItems: "center", fontSize: 11,
                    padding: "6px 10px", borderRadius: 6,
                    backgroundColor: `${sevColor}08`,
                  }}>
                    <span style={{
                      padding: "2px 6px", borderRadius: 3,
                      backgroundColor: `${sevColor}1F`, color: sevColor,
                      border: `1px solid ${sevColor}44`,
                      fontSize: 9, fontWeight: 900,
                    }}>
                      {a.severity}
                    </span>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: C.lt4 }}>{a.userId}</span>
                    <span style={{ color: "#fff", flex: 1 }}>{a.reason}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Anomaly alert banner — show first ALERT row */}
        {stats.alerts > 0 && (() => {
          const firstAlert = audit.find(a => a.severity === "ALERT")
          if (!firstAlert) return null
          return (
            <div
              style={{
                padding: "14px 18px", borderRadius: 12,
                backgroundColor: `${C.rose}0F`, border: `1px solid ${C.rose}55`,
                marginBottom: 18,
                display: "flex", gap: 12, alignItems: "center",
              }}
            >
              <AlertTriangle size={18} color={C.rose} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 2 }}>
                  이상 행위 탐지: {firstAlert.user} ({firstAlert.ip})
                </div>
                <div style={{ fontSize: 11, color: C.lt4 }}>
                  {firstAlert.field} 접근 감지 · {firstAlert.time} · UA: {firstAlert.ua}
                </div>
              </div>
              <button
                onClick={loadAudit}
                style={{
                  padding: "8px 14px", borderRadius: 8,
                  backgroundColor: `${C.rose}1F`, color: C.rose,
                  border: `1px solid ${C.rose}66`,
                  fontSize: 11, fontWeight: 800, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 5,
                }}
              >
                <RefreshCw size={11} /> 새로고침
              </button>
            </div>
          )
        })()}

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
              placeholder="사용자 · 매물 · 필드 · IP 검색"
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#fff", fontSize: 12,
              }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Calendar size={13} color={C.lt4} />
            {(["today", "7d", "30d", "all"] as Range[]).map((r) => {
              const active = range === r
              return (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  style={{
                    padding: "6px 10px", borderRadius: 8,
                    fontSize: 11, fontWeight: 700,
                    backgroundColor: active ? `${C.blue}1F` : C.bg2,
                    color: active ? C.blueL : C.lt4,
                    border: `1px solid ${active ? C.blue : C.bg4}`,
                    cursor: "pointer",
                  }}
                >
                  {RANGE_LABEL[r]}
                </button>
              )
            })}
          </div>
          <button
            onClick={handleExportCsv}
            disabled={exporting || rows.length === 0}
            style={{
              padding: "7px 12px", borderRadius: 8,
              fontSize: 11, fontWeight: 800,
              backgroundColor: `${C.em}1F`, color: C.emL,
              border: `1px solid ${C.em}55`,
              cursor: exporting || rows.length === 0 ? "not-allowed" : "pointer",
              opacity: exporting || rows.length === 0 ? 0.6 : 1,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}
          >
            <FileDown size={12} /> {exporting ? "내보내는 중..." : "CSV 내보내기"}
          </button>
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

        {/* Audit table */}
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
              gridTemplateColumns: "150px 140px 1fr 80px 130px 140px 80px",
              padding: "12px 18px",
              fontSize: 10, color: C.lt4, fontWeight: 700,
              borderBottom: `1px solid ${C.bg4}`,
              backgroundColor: C.bg3,
            }}
          >
            <span>일시</span>
            <span>사용자</span>
            <span>매물 · 자료</span>
            <span>티어</span>
            <span>행위</span>
            <span>IP / UA</span>
            <span>상태</span>
          </header>
          {loadingAudit ? (
            <div style={{ padding: 60, textAlign: "center", fontSize: 12, color: C.lt4 }}>
              감사 로그 로딩 중...
            </div>
          ) : rows.length === 0 ? (
            <div style={{ padding: 60, textAlign: "center", fontSize: 12, color: C.lt4 }}>
              해당 조건의 감사 이벤트가 없습니다.
            </div>
          ) : (
            rows.map((row, i) => {
              const sev = SEV_META[row.severity]
              const act = ACTION_META[row.action]
              return (
                <div
                  key={row.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "150px 140px 1fr 80px 130px 140px 80px",
                    padding: "13px 18px",
                    borderBottom: i < rows.length - 1 ? `1px solid ${C.bg4}` : "none",
                    fontSize: 11, color: "#fff",
                    alignItems: "center",
                    backgroundColor: row.severity === "ALERT" ? `${C.rose}08` : "transparent",
                  }}
                >
                  <span style={{ fontSize: 10, color: C.lt4, fontFamily: "monospace" }}>{row.time}</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{row.user}</div>
                    <span
                      style={{
                        display: "inline-block", marginTop: 2,
                        padding: "1px 5px", borderRadius: 3,
                        backgroundColor: `${TIER_COLOR[row.user_tier]}1F`,
                        color: TIER_COLOR[row.user_tier],
                        border: `1px solid ${TIER_COLOR[row.user_tier]}44`,
                        fontSize: 8, fontWeight: 800,
                      }}
                    >
                      {row.user_tier}
                    </span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>{row.field}</div>
                    <div style={{ fontSize: 9, color: C.lt4, fontFamily: "monospace" }}>{row.listing_id}</div>
                  </div>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "3px 7px", borderRadius: 4,
                      backgroundColor: `${TIER_COLOR[row.field_tier]}1F`,
                      color: TIER_COLOR[row.field_tier],
                      border: `1px solid ${TIER_COLOR[row.field_tier]}44`,
                      fontSize: 9, fontWeight: 800,
                      width: "fit-content",
                    }}
                  >
                    {row.field_tier}
                  </span>
                  <span
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      padding: "4px 8px", borderRadius: 999,
                      backgroundColor: `${act.color}1A`,
                      color: act.color,
                      border: `1px solid ${act.color}44`,
                      fontSize: 9, fontWeight: 800,
                      width: "fit-content",
                    }}
                  >
                    {act.label}
                  </span>
                  <div style={{ fontSize: 9, color: C.lt4, fontFamily: "monospace" }}>
                    {row.ip}
                    <div style={{ marginTop: 1, color: C.lt3 }}>{row.ua}</div>
                  </div>
                  <span
                    style={{
                      padding: "3px 8px", borderRadius: 999,
                      backgroundColor: sev.bg, color: sev.color,
                      border: `1px solid ${sev.color}44`,
                      fontSize: 9, fontWeight: 800,
                      width: "fit-content",
                    }}
                  >
                    {sev.label}
                  </span>
                </div>
              )
            })
          )}
        </section>
        </div>

        {/* Notice */}
        <div
          style={{
            marginTop: 20, padding: "14px 16px", borderRadius: 12,
            backgroundColor: `${C.blue}0A`, border: `1px solid ${C.blue}33`,
            display: "flex", gap: 10, alignItems: "flex-start",
          }}
        >
          <ShieldCheck size={16} color={C.blueL} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
            모든 감사 로그는 변조 방지(append-only)로 5년간 보관되며, 신용정보업감독규정 §43에 따라 금융감독원 검사 시 즉시 제출 가능합니다.
            관리자가 본 페이지를 조회한 사실 또한 별도 감사 로그에 기록됩니다.
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
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>{value.toLocaleString()}</div>
      </div>
    </div>
  )
}
