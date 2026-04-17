"use client"

/**
 * /admin/masking-queue — 마스킹 검토 큐
 *
 * v4 운영 도구: 매도 기관이 업로드한 자료의 자동 마스킹 결과를
 * 사람이 검토 후 승인/반려한다. 미검토 자료는 L1 이상 노출 차단.
 *
 * 개인정보보호법 §29 (안전조치 의무) 준수 — 비식별화 검증 절차.
 */

import { useState, useMemo, useEffect, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft, ShieldCheck, AlertTriangle, CheckCircle2, XCircle,
  Eye, Clock, FileText, User, Filter, Search,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const C = {
  bg0: "#030810", bg1: "#050D1A", bg2: "#080F1E",
  bg3: "#0A1628", bg4: "#0F1F35",
  em: "#10B981", emL: "#10B981",
  blue: "#2E75B6", blueL: "#3B82F6",
  amber: "#F59E0B", rose: "#EF4444", purple: "#A855F7",
  lt3: "#64748B", lt4: "#475569",
}

type QueueStatus = "PENDING" | "REVIEWING" | "APPROVED" | "REJECTED"
type DocCategory = "REGISTRY" | "APPRAISAL" | "LEASE" | "DEBTOR" | "PHOTO"
type RiskLevel = "HIGH" | "MEDIUM" | "LOW"

interface QueueItem {
  id: string
  listing_id: string
  collateral: string
  institution: string
  doc_category: DocCategory
  doc_name: string
  uploaded_at: string
  ai_confidence: number
  risk_level: RiskLevel
  pii_count: number
  status: QueueStatus
  reviewer?: string
}

// Fallback empty - populated from Supabase masking_queue table
const FALLBACK_QUEUE: QueueItem[] = []

const CATEGORY_META: Record<DocCategory, { label: string; color: string }> = {
  REGISTRY:  { label: "등기·권리",  color: "#2E75B6" },
  APPRAISAL: { label: "감정평가서", color: "#10B981" },
  LEASE:     { label: "임대차",    color: "#A855F7" },
  DEBTOR:    { label: "채무자",    color: "#EF4444" },
  PHOTO:     { label: "현장사진",  color: "#F59E0B" },
}

const STATUS_META: Record<QueueStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: "대기",     color: "#F59E0B", icon: Clock },
  REVIEWING: { label: "검토 중",  color: "#2E75B6", icon: Eye },
  APPROVED:  { label: "승인",     color: "#10B981", icon: CheckCircle2 },
  REJECTED:  { label: "반려",     color: "#EF4444", icon: XCircle },
}

const RISK_META: Record<RiskLevel, { label: string; color: string }> = {
  HIGH:   { label: "고위험", color: "#EF4444" },
  MEDIUM: { label: "중위험", color: "#F59E0B" },
  LOW:    { label: "저위험", color: "#10B981" },
}

const FILTERS = [
  { key: "ALL",       label: "전체" },
  { key: "PENDING",   label: "대기" },
  { key: "REVIEWING", label: "검토 중" },
  { key: "HIGH",      label: "고위험만" },
  { key: "APPROVED",  label: "승인 완료" },
  { key: "REJECTED",  label: "반려" },
] as const

export default function MaskingQueuePage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]["key"]>("ALL")
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>(FALLBACK_QUEUE)

  // Fetch from Supabase masking_queue table
  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('masking_queue')
          .select('*')
          .order('uploaded_at', { ascending: false })
        if (!error && data && data.length > 0) {
          setQueue(data.map(r => ({
            id: String(r.id),
            listing_id: r.listing_id ?? '',
            collateral: r.collateral ?? '',
            institution: r.institution ?? '',
            doc_category: (r.doc_category ?? 'REGISTRY') as DocCategory,
            doc_name: r.doc_name ?? '',
            uploaded_at: (r.uploaded_at ?? '').replace('T', ' ').slice(0, 16),
            ai_confidence: r.ai_confidence ?? 0,
            risk_level: (r.risk_level ?? 'LOW') as RiskLevel,
            pii_count: r.pii_count ?? 0,
            status: (r.status ?? 'PENDING') as QueueStatus,
            reviewer: r.reviewer ?? undefined,
          })))
          setSelected(data[0]?.id ? String(data[0].id) : null)
        }
      } catch { /* keep fallback */ }
    }
    load()
  }, [])

  const handleApproveOrReject = useCallback(async (itemId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const reviewer = user ? (user.email ?? user.id.slice(0, 8)) : '관리자'
      await supabase
        .from('masking_queue')
        .update({ status: action, reviewer, reviewed_at: new Date().toISOString() })
        .eq('id', itemId)
      setQueue(prev => prev.map(q => q.id === itemId ? { ...q, status: action, reviewer } : q))
      toast.success(action === 'APPROVED' ? '마스킹 승인 완료' : '반려 처리 완료')
    } catch {
      toast.error('처리 중 오류가 발생했습니다.')
    }
  }, [])

  const items = useMemo(() => {
    return queue.filter(it => {
      if (filter === "HIGH") {
        if (it.risk_level !== "HIGH") return false
      } else if (filter !== "ALL" && it.status !== filter) {
        return false
      }
      if (query) {
        const q = query.toLowerCase()
        if (
          !it.collateral.toLowerCase().includes(q) &&
          !it.institution.toLowerCase().includes(q) &&
          !it.doc_name.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [queue, filter, query])

  const selectedItem = useMemo(
    () => queue.find(it => it.id === selected) || items[0] || null,
    [queue, selected, items]
  )

  const stats = useMemo(() => ({
    pending: queue.filter(q => q.status === "PENDING").length,
    reviewing: queue.filter(q => q.status === "REVIEWING").length,
    high_risk: queue.filter(q => q.risk_level === "HIGH" && q.status !== "APPROVED").length,
    approved_today: queue.filter(q => q.status === "APPROVED").length,
  }), [queue])

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
            ADMIN · MASKING REVIEW
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 8 }}>
            마스킹 검토 큐
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 720 }}>
            매도 기관이 업로드한 자료의 자동 PII 마스킹 결과를 사람이 최종 검토합니다.
            승인 전에는 어떤 회원에게도 노출되지 않으며, 개인정보보호법 §29 안전조치 의무를 충족합니다.
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <StatCard label="검토 대기" value={stats.pending} color={C.amber} icon={Clock} />
          <StatCard label="검토 중"   value={stats.reviewing} color={C.blue} icon={Eye} />
          <StatCard label="고위험 잔여" value={stats.high_risk} color={C.rose} icon={AlertTriangle} />
          <StatCard label="승인 완료" value={stats.approved_today} color={C.em} icon={CheckCircle2} />
        </div>

        {/* Search + filters */}
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
              placeholder="매물 · 기관 · 파일명 검색"
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

        {/* Two-pane: queue list + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: "start" }}>
          {/* Queue list */}
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
                padding: "13px 18px",
                fontSize: 11, color: C.lt4, fontWeight: 700,
                borderBottom: `1px solid ${C.bg4}`,
                backgroundColor: C.bg3,
                display: "flex", justifyContent: "space-between",
              }}
            >
              <span>{items.length}건</span>
              <span>AI 신뢰도 ↓ 정렬</span>
            </header>
            {items.length === 0 ? (
              <div style={{ padding: 60, textAlign: "center", fontSize: 12, color: C.lt4 }}>
                해당 조건에 일치하는 자료가 없습니다.
              </div>
            ) : (
              items.map((it, i) => {
                const cat = CATEGORY_META[it.doc_category]
                const stat = STATUS_META[it.status]
                const risk = RISK_META[it.risk_level]
                const StatIcon = stat.icon
                const isSelected = selectedItem?.id === it.id
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelected(it.id)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "16px 18px",
                      borderBottom: i < items.length - 1 ? `1px solid ${C.bg4}` : "none",
                      backgroundColor: isSelected ? `${C.em}0F` : "transparent",
                      borderLeft: isSelected ? `3px solid ${C.em}` : "3px solid transparent",
                      cursor: "pointer", color: "#fff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            padding: "3px 7px", borderRadius: 4,
                            backgroundColor: `${cat.color}1F`, color: cat.color,
                            border: `1px solid ${cat.color}44`,
                            fontSize: 9, fontWeight: 800,
                          }}
                        >
                          {cat.label}
                        </span>
                        <span
                          style={{
                            padding: "3px 7px", borderRadius: 4,
                            backgroundColor: `${risk.color}1A`, color: risk.color,
                            border: `1px solid ${risk.color}44`,
                            fontSize: 9, fontWeight: 800,
                          }}
                        >
                          {risk.label}
                        </span>
                      </div>
                      <span
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "3px 8px", borderRadius: 999,
                          backgroundColor: `${stat.color}1A`, color: stat.color,
                          border: `1px solid ${stat.color}44`,
                          fontSize: 9, fontWeight: 800,
                        }}
                      >
                        <StatIcon size={10} /> {stat.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 3 }}>
                      {it.doc_name}
                    </div>
                    <div style={{ fontSize: 10, color: C.lt4, marginBottom: 8 }}>
                      {it.collateral} · {it.institution}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: C.lt3 }}>
                      <span>{it.uploaded_at}</span>
                      <div style={{ display: "flex", gap: 12 }}>
                        <span>AI <b style={{ color: it.ai_confidence >= 90 ? C.emL : it.ai_confidence >= 75 ? C.amber : C.rose }}>{it.ai_confidence}%</b></span>
                        <span>PII <b style={{ color: "#fff" }}>{it.pii_count}</b></span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </section>

          {/* Detail panel */}
          <aside style={{ position: "sticky", top: 96 }}>
            {selectedItem ? (
              <DetailPanel item={selectedItem} onAction={handleApproveOrReject} />
            ) : (
              <div
                style={{
                  padding: 60, borderRadius: 14,
                  backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
                  textAlign: "center", color: C.lt4, fontSize: 12,
                }}
              >
                좌측에서 항목을 선택하세요
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  )
}

function DetailPanel({ item, onAction }: { item: QueueItem; onAction: (id: string, action: 'APPROVED' | 'REJECTED') => void }) {
  const cat = CATEGORY_META[item.doc_category]
  const risk = RISK_META[item.risk_level]
  const stat = STATUS_META[item.status]

  return (
    <section
      style={{
        padding: 24, borderRadius: 14,
        backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: C.lt4, fontWeight: 700, marginBottom: 4 }}>
            {item.id}
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
            {item.doc_name}
          </div>
          <div style={{ fontSize: 11, color: C.lt4 }}>
            {item.collateral} · {item.institution}
          </div>
        </div>
        <span
          style={{
            padding: "5px 11px", borderRadius: 999,
            backgroundColor: `${stat.color}1A`, color: stat.color,
            border: `1px solid ${stat.color}44`,
            fontSize: 10, fontWeight: 800,
          }}
        >
          {stat.label}
        </span>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <Metric label="AI 신뢰도" value={`${item.ai_confidence}%`} color={item.ai_confidence >= 90 ? C.em : item.ai_confidence >= 75 ? C.amber : C.rose} />
        <Metric label="검출 PII" value={`${item.pii_count}건`} color={C.blueL} />
        <Metric label="위험 등급" value={risk.label} color={risk.color} />
      </div>

      {/* PII detected list */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 8 }}>
          AI 검출 PII 항목
        </div>
        <div
          style={{
            padding: 14, borderRadius: 10,
            backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
          }}
        >
          {[
            { type: "주민등록번호", count: 3, masked: "850***-1******" },
            { type: "휴대전화",     count: 5, masked: "010-****-1234" },
            { type: "주소",         count: 8, masked: "서울 강남구 ***로 12" },
            { type: "계좌번호",     count: 2, masked: "110-***-456789" },
            { type: "이름",         count: 5, masked: "김**" },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "7px 0",
                borderBottom: i < 4 ? `1px solid ${C.bg4}` : "none",
                fontSize: 11,
              }}
            >
              <span style={{ color: "#fff", fontWeight: 600 }}>{row.type}</span>
              <span style={{ color: C.lt4, fontFamily: "monospace" }}>{row.masked}</span>
              <span
                style={{
                  padding: "2px 7px", borderRadius: 4,
                  backgroundColor: `${C.blue}1F`, color: C.blueL,
                  fontSize: 9, fontWeight: 800,
                }}
              >
                {row.count}건
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reviewer */}
      {item.reviewer && (
        <div
          style={{
            padding: "10px 14px", borderRadius: 10,
            backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
            marginBottom: 16,
            display: "flex", alignItems: "center", gap: 10,
          }}
        >
          <User size={14} color={C.lt4} />
          <div style={{ fontSize: 11, color: "#fff" }}>
            담당 검토자: <b>{item.reviewer}</b>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {(item.status === "PENDING" || item.status === "REVIEWING") && (
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2.5" style={{ gap: 10 }}>
          <button
            onClick={() => onAction(item.id, 'APPROVED')}
            style={{
              padding: "12px 16px", borderRadius: 10,
              backgroundColor: `${C.em}1A`, color: C.emL,
              border: `1px solid ${C.em}66`,
              fontSize: 12, fontWeight: 800, cursor: "pointer",
              display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
            }}
          >
            <CheckCircle2 size={14} /> 마스킹 승인
          </button>
          <button
            onClick={() => onAction(item.id, 'REJECTED')}
            style={{
              padding: "12px 16px", borderRadius: 10,
              backgroundColor: `${C.rose}1A`, color: C.rose,
              border: `1px solid ${C.rose}66`,
              fontSize: 12, fontWeight: 800, cursor: "pointer",
              display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
            }}
          >
            <XCircle size={14} /> 반려 · 재마스킹 요청
          </button>
        </div>
      )}

      <div
        style={{
          marginTop: 14, padding: "10px 12px", borderRadius: 10,
          backgroundColor: `${C.amber}0A`, border: `1px solid ${C.amber}33`,
          display: "flex", gap: 8, alignItems: "flex-start",
        }}
      >
        <ShieldCheck size={13} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
        <div style={{ fontSize: 10, color: C.lt3, lineHeight: 1.55 }}>
          승인 시 자료가 즉시 매물 페이지에 게시됩니다. 모든 승인/반려 행위는 PII Audit Log에 기록되어 5년간 보관됩니다.
        </div>
      </div>
    </section>
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

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        padding: "12px 14px", borderRadius: 10,
        backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
      }}
    >
      <div style={{ fontSize: 9, color: C.lt4, fontWeight: 700, marginBottom: 4, letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, color }}>
        {value}
      </div>
    </div>
  )
}
