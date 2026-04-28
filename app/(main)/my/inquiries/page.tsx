"use client"

/**
 * /my/inquiries — 사용자가 제출한 고객센터 문의 이력
 *
 * - 진행 상태 (대기 / 답변 완료 / 종료)
 * - 신규 문의 등록 + 카테고리 분류
 * - 답변 본문 inline 펼치기
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { MessageCircle, Plus, ChevronDown, ChevronUp, CheckCircle2, Clock } from "lucide-react"
import {
  MckPageShell, MckPageHeader, MckBadge, MckEmptyState, MckDemoBanner,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

interface InquiryRow {
  id: string
  category: "ACCOUNT" | "PAYMENT" | "DEAL" | "TECHNICAL" | "OTHER"
  title: string
  body: string
  status: "OPEN" | "ANSWERED" | "CLOSED"
  created_at: string
  answered_at?: string
  answer_body?: string
}

const CATEGORY_META: Record<string, string> = {
  ACCOUNT:   "계정",
  PAYMENT:   "결제",
  DEAL:      "거래",
  TECHNICAL: "기술",
  OTHER:     "기타",
}
const STATUS_META: Record<string, { label: string; tone: "ink" | "blue" | "neutral" | "brass" }> = {
  OPEN:     { label: "답변 대기",   tone: "brass" },
  ANSWERED: { label: "답변 완료",   tone: "ink" },
  CLOSED:   { label: "문의 종료",   tone: "neutral" },
}

const SAMPLE: InquiryRow[] = [
  {
    id: "i-1",
    category: "DEAL",
    title: "ESCROW 결제 후 잔금 처리 절차 문의",
    body: "보증금 입금 완료 후 잔금 90% 는 어떻게 진행되나요? 일정과 필요 서류 안내 부탁드립니다.",
    status: "ANSWERED",
    created_at: "2026-04-23T10:30:00Z",
    answered_at: "2026-04-23T15:42:00Z",
    answer_body: "보증금 ESCROW 입금 완료 → 매도자 승인 → 현장 계약(D+1~3) → 잔금 입금(D+5 이내) → 채권 양도 + 정산 순서로 진행됩니다. 계약 시 신분증·인감·법인등기부등본이 필요합니다.",
  },
  {
    id: "i-2",
    category: "TECHNICAL",
    title: "OCR 채권소개서 일부 필드 인식 안 됨",
    body: "감정평가서 PDF 업로드 시 면적 필드만 추출되지 않습니다.",
    status: "OPEN",
    created_at: "2026-04-26T09:15:00Z",
  },
]

export default function MyInquiriesPage() {
  const [rows, setRows] = useState<InquiryRow[]>(SAMPLE)
  const [loading, setLoading] = useState(true)
  const [isSample, setIsSample] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch("/api/v1/support?mine=1", { credentials: "include" })
        if (r.ok) {
          const j = await r.json()
          if (!cancelled && Array.isArray(j?.data) && j.data.length > 0) {
            setRows(j.data as InquiryRow[])
            setIsSample(false)
          }
        }
      } catch { /* keep sample */ } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const toggle = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpanded(next)
  }

  const stats = {
    total: rows.length,
    open: rows.filter((r) => r.status === "OPEN").length,
    answered: rows.filter((r) => r.status === "ANSWERED").length,
  }

  return (
    <MckPageShell variant="tint">
      {isSample && (
        <MckDemoBanner
          message="체험 모드 — 샘플 문의 2건을 표시 중입니다. 신규 문의 등록 시 실 데이터로 전환됩니다."
          ctaLabel="문의 등록"
          ctaHref="/support"
        />
      )}

      <MckPageHeader
        breadcrumbs={[{ label: "마이", href: "/my" }, { label: "내 문의 내역" }]}
        eyebrow="MY · SUPPORT"
        title="내 문의 내역"
        subtitle={`총 ${stats.total}건 · 답변 대기 ${stats.open}건 · 답변 완료 ${stats.answered}건. 평균 응답 시간 4시간 이내.`}
        actions={
          <Link
            href="/support"
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
            <span style={{ color: MCK.paper }}>신규 문의 등록</span>
          </Link>
        }
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px 80px", display: "flex", flexDirection: "column", gap: 16 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", fontSize: 12, color: MCK.textMuted }}>문의 이력 불러오는 중...</div>
        ) : rows.length === 0 ? (
          <MckEmptyState
            icon={MessageCircle}
            title="등록된 문의가 없습니다"
            description="고객센터에 문의를 등록하면 평균 4시간 이내 답변드립니다."
            actionLabel="신규 문의 등록"
            actionHref="/support"
          />
        ) : (
          <section style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}` }}>
            {rows.map((row, i) => {
              const meta = STATUS_META[row.status] ?? STATUS_META.OPEN
              const isExpanded = expanded.has(row.id)
              return (
                <article
                  key={row.id}
                  style={{
                    padding: "18px 22px",
                    borderBottom: i < rows.length - 1 ? `1px solid ${MCK.border}` : "none",
                    display: "flex", flexDirection: "column", gap: 10,
                  }}
                >
                  <header
                    onClick={() => toggle(row.id)}
                    style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, cursor: "pointer" }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                        <MckBadge tone={meta.tone} size="sm">{meta.label}</MckBadge>
                        <MckBadge tone="neutral" size="sm">{CATEGORY_META[row.category] ?? row.category}</MckBadge>
                        <span style={{ fontSize: 10, color: MCK.textMuted, fontVariantNumeric: "tabular-nums" }}>
                          {String(row.created_at).slice(0, 10)}
                        </span>
                      </div>
                      <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.005em" }}>
                        {row.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4, color: MCK.textMuted }}
                      aria-label={isExpanded ? "접기" : "펼치기"}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </header>

                  {isExpanded && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginLeft: 4 }}>
                      <div style={{
                        background: MCK.paperTint, border: `1px solid ${MCK.border}`,
                        padding: "10px 14px",
                        fontSize: 12, color: MCK.ink, lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                      }}>
                        <div style={{ ...MCK_TYPE.eyebrow, color: MCK.textMuted, marginBottom: 4 }}>
                          내 문의
                        </div>
                        {row.body}
                      </div>

                      {row.answer_body ? (
                        <div style={{
                          background: "rgba(34, 81, 255, 0.04)",
                          border: "1px solid rgba(34, 81, 255, 0.20)",
                          borderLeft: `3px solid ${MCK.electric}`,
                          padding: "10px 14px",
                          fontSize: 12, color: MCK.ink, lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                        }}>
                          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                            <CheckCircle2 size={11} style={{ color: MCK.electric }} />
                            <span style={{ ...MCK_TYPE.eyebrow, color: MCK.electricDark }}>
                              NPLatform 답변 · {row.answered_at ? String(row.answered_at).slice(0, 10) : ""}
                            </span>
                          </div>
                          {row.answer_body}
                        </div>
                      ) : (
                        <div style={{
                          display: "inline-flex", alignItems: "center", gap: 6,
                          padding: "8px 12px",
                          background: "rgba(255, 140, 0, 0.06)",
                          border: "1px solid rgba(255, 140, 0, 0.30)",
                          borderLeft: "3px solid #FF8C00",
                          fontSize: 11, color: "#A53F00", fontWeight: 700,
                        }}>
                          <Clock size={11} /> 답변 대기 중 — 평균 응답 시간 4시간 이내
                        </div>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </section>
        )}
      </div>
    </MckPageShell>
  )
}
