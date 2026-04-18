"use client"

/**
 * /exchange/[id]/dataroom — L3 데이터룸 (v4, 2026-04-07)
 *
 * 접근: L3 승인자 전용 (LOI 승인 후)
 *   - 최상위 자료 열람
 *   - 모든 조회 PII Access Log 기록
 *   - 워터마킹 안내
 */

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  ChevronLeft, FileText, Download, Eye, ShieldCheck,
  AlertTriangle, Scale, Briefcase, Building2, Gavel,
  FileSignature, Users, Clock,
} from "lucide-react"
import { TierBadge } from "@/components/tier/tier-badge"
import { TierGate } from "@/components/tier/tier-gate"
import type { AccessTier } from "@/lib/access-tier"

const C = {
  bg0: "var(--color-bg-deepest, #030810)", bg1: "var(--color-bg-deep, #050D1A)", bg2: "var(--color-bg-base, #080F1E)",
  bg3: "var(--color-bg-base, #0A1628)", bg4: "var(--color-bg-elevated, #0F1F35)",
  em: "var(--color-positive)", emL: "var(--color-positive)",
  blue: "var(--color-brand-dark)", blueL: "var(--color-brand-bright)",
  rose: "var(--color-danger)", amber: "var(--color-warning)", purple: "#A855F7",
  lt3: "var(--color-text-muted)", lt4: "var(--color-text-muted)",
}

function fmt(n: number | null | undefined): string {
  if (!n) return "—"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString("ko-KR") + "원"
}

// Mock credit ledger data (실제로는 LOI 승인 후 API로 가져옴)
const CREDIT_LEDGER = {
  debtor_name_masked: "김●●",
  court_case_full: "서울중앙지법 2025타경12345",
  loan_type: "주택담보대출",
  original_principal: 1_150_000_000,
  principal_remaining: 1_020_000_000,
  interest_accrued: 162_000_000,
  fee_accrued: 18_000_000,
  total_claim: 1_200_000_000,
  normal_interest_rate: 4.85,
  overdue_interest_rate: 15.0,
  loan_date: "2021-08-●●",
  acceleration_date: "2025-●●-15",
  last_payment_date: "2025-●●-10",
  overdue_days: 287,
  contract_no_masked: "WR-2021-●●●●-8821",
  guarantor_masked: "김●●(배우자)",
  rights: [
    { rank: 1, type: "근저당권", amount: 780_000_000, holder_masked: "우●●행", date: "2021-08-●●" },
    { rank: 2, type: "근저당권", amount: 140_000_000, holder_masked: "○○캐피탈", date: "2023-03-●●" },
    { rank: 3, type: "전세권", amount: 60_000_000, holder_masked: "김●●", date: "2024-01-●●" },
    { rank: 4, type: "가압류", amount: 22_000_000, holder_masked: "이●●", date: "2025-02-●●" },
  ],
}

const DATAROOM_DOCS = [
  {
    category: "등기 · 권리",
    items: [
      { name: "등기부등본 원본 (전체)", size: "1.2 MB", type: "PDF", downloadable: true, icon: FileText },
      { name: "권리관계 상세 분석서", size: "340 KB", type: "PDF", downloadable: true, icon: Scale },
      { name: "가압류 · 가처분 내역", size: "180 KB", type: "PDF", downloadable: true, icon: Gavel },
    ],
  },
  {
    category: "감정 · 평가",
    items: [
      { name: "감정평가서 원본 (마스킹 해제)", size: "2.4 MB", type: "PDF", downloadable: true, icon: FileText },
      { name: "부동산 시세 분석 리포트", size: "560 KB", type: "PDF", downloadable: true, icon: FileText },
      { name: "현장 사진 원본 (48장)", size: "22 MB", type: "ZIP", downloadable: true, icon: FileText },
    ],
  },
  {
    category: "재무 · 임대차",
    items: [
      { name: "임대차 계약서 전체", size: "890 KB", type: "PDF", downloadable: true, icon: FileSignature },
      { name: "월별 임대료 수금 내역 (2년)", size: "124 KB", type: "XLSX", downloadable: true, icon: FileText },
      { name: "관리비 · 공과금 내역", size: "96 KB", type: "XLSX", downloadable: true, icon: FileText },
    ],
  },
  {
    category: "채무자 · 경매 (L3 최상위)",
    items: [
      { name: "채무자 신용정보 요약", size: "220 KB", type: "PDF", downloadable: false, icon: Users },
      { name: "경매 원장 · 배당표", size: "410 KB", type: "PDF", downloadable: false, icon: Gavel },
      { name: "법원 송달 · 배당 기록", size: "180 KB", type: "PDF", downloadable: false, icon: Building2 },
    ],
  },
]

const ACCESS_LOG = [
  { time: "2026-04-07 14:32", user: "본인", action: "등기부등본 원본 열람", ip: "203.***.***.41" },
  { time: "2026-04-07 14:28", user: "본인", action: "감정평가서 원본 다운로드", ip: "203.***.***.41" },
  { time: "2026-04-07 14:15", user: "본인", action: "데이터룸 입장", ip: "203.***.***.41" },
  { time: "2026-04-07 13:52", user: "우리은행 여신관리팀", action: "LOI 승인", ip: "—" },
]

export default function DataroomPage() {
  const params = useParams()
  const id = (params?.id as string) ?? "npl-2026-0412"
  const [tier, setTier] = useState<AccessTier>("L3")

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      <section style={{ borderBottom: `1px solid ${C.bg4}`, backgroundColor: C.bg1 }}>
        <div
          style={{
            maxWidth: 1280, margin: "0 auto", padding: "16px 24px",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
          }}
        >
          <Link
            href={`/exchange/${id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: C.lt4, fontWeight: 600, textDecoration: "none",
            }}
          >
            <ChevronLeft size={14} /> 매물 상세로
          </Link>

          {/* Demo tier switcher */}
          <div
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 10px", borderRadius: 8,
              backgroundColor: C.bg2, border: `1px dashed ${C.bg4}`,
            }}
          >
            <span style={{ fontSize: 10, color: C.lt4, fontWeight: 600 }}>데모 티어</span>
            {(["L0", "L1", "L2", "L3"] as AccessTier[]).map(t => (
              <button
                key={t}
                onClick={() => setTier(t)}
                style={{
                  padding: "3px 8px", borderRadius: 4,
                  fontSize: 10, fontWeight: 800,
                  backgroundColor: tier === t ? C.purple : "transparent",
                  color: tier === t ? "#fff" : C.lt3,
                  border: `1px solid ${tier === t ? C.purple : C.bg4}`,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px 80px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TierBadge tier="L3" variant="solid" size="sm" />
            <span style={{ fontSize: 11, color: C.lt4 }}>최상위 자료 — LOI 승인 전용</span>
          </div>
          <h1
            style={{
              fontSize: 30, fontWeight: 900, color: "#fff",
              letterSpacing: "-0.02em", marginBottom: 8,
            }}
          >
            L3 데이터룸
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 680 }}>
            본 데이터룸의 모든 자료는 <strong style={{ color: "#fff" }}>워터마크</strong>가 삽입되며,
            열람 · 다운로드 행위는 전부 PII Access Log에 실시간 기록됩니다.
            비정상 패턴 감지 시 DPO 조사 대상으로 자동 통보됩니다.
          </p>
          <div style={{ fontSize: 11, color: C.lt4, marginTop: 8, fontFamily: "monospace" }}>
            대상 매물: {id}
          </div>
        </motion.div>

        <TierGate required="L3" current={tier} listingId={id} minHeight={320}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 320px",
              gap: 24, alignItems: "start",
            }}
          >
            {/* LEFT — Credit Ledger + Document list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Watermark notice */}
              <div
                style={{
                  padding: "14px 16px", borderRadius: 12,
                  backgroundColor: `${C.purple}0A`,
                  border: "1px solid rgba(168, 85, 247, 0.27)",
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}
              >
                <ShieldCheck size={16} color={C.purple} style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
                  모든 PDF · 이미지 파일에는 <strong style={{ color: "#fff" }}>열람자 ID · 타임스탬프</strong>가
                  포함된 워터마크가 삽입됩니다. 유출 시 추적이 가능합니다.
                </div>
              </div>

              {/* ── 채권 원장 (Credit Ledger) ── */}
              <section
                style={{
                  backgroundColor: C.bg2,
                  border: "1px solid rgba(245, 158, 11, 0.27)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                <header
                  style={{
                    padding: "14px 18px",
                    borderBottom: `1px solid ${C.bg4}`,
                    display: "flex", alignItems: "center", gap: 8,
                    background: "linear-gradient(90deg, rgba(245, 158, 11, 0.1) 0%, transparent 100%)",
                  }}
                >
                  <Gavel size={14} color={C.amber} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>채권 원장 (Credit Ledger)</span>
                  <span
                    style={{
                      marginLeft: "auto", fontSize: 9, padding: "2px 7px", borderRadius: 4,
                      backgroundColor: "rgba(239, 68, 68, 0.1)", color: C.rose, fontWeight: 800, border: "1px solid rgba(239, 68, 68, 0.4)",
                    }}
                  >
                    L3 전용 · PII 마스킹 적용
                  </span>
                </header>
                <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* 채권 잔액 요약 */}
                  <div
                    style={{
                      display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
                      padding: 14, borderRadius: 10,
                      backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                    }}
                  >
                    {[
                      { label: "원금 잔액", value: fmt(CREDIT_LEDGER.principal_remaining), color: "#fff" },
                      { label: "연체이자 누적", value: fmt(CREDIT_LEDGER.interest_accrued), color: C.amber },
                      { label: "연체 수수료", value: fmt(CREDIT_LEDGER.fee_accrued), color: C.amber },
                      { label: "채권 총액", value: fmt(CREDIT_LEDGER.total_claim), color: C.emL },
                    ].map(cell => (
                      <div key={cell.label} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 9, color: C.lt4, fontWeight: 700, marginBottom: 4 }}>{cell.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: cell.color }}>{cell.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* 채권 상세 */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                    {[
                      ["대출 상품", CREDIT_LEDGER.loan_type],
                      ["원금", fmt(CREDIT_LEDGER.original_principal)],
                      ["정상 이자율", `${CREDIT_LEDGER.normal_interest_rate.toFixed(2)}%`],
                      ["연체 이자율", `${CREDIT_LEDGER.overdue_interest_rate}%`],
                      ["대출 실행일", CREDIT_LEDGER.loan_date],
                      ["기한이익상실일", CREDIT_LEDGER.acceleration_date],
                      ["최종 상환일", CREDIT_LEDGER.last_payment_date],
                      ["연체 일수", `${CREDIT_LEDGER.overdue_days}일`],
                      ["여신번호", CREDIT_LEDGER.contract_no_masked],
                      ["연대보증인", CREDIT_LEDGER.guarantor_masked],
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ padding: "8px 10px", borderRadius: 6, backgroundColor: C.bg3, border: `1px solid ${C.bg4}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, color: C.lt4, fontWeight: 600 }}>{lbl}</span>
                        <span style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* 채무자 / 경매사건 */}
                  <div
                    style={{
                      padding: "10px 14px", borderRadius: 8,
                      backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)",
                      fontSize: 11, color: C.lt3, lineHeight: 1.7,
                    }}
                  >
                    <span style={{ color: C.rose, fontWeight: 700 }}>채무자(마스킹):</span>{" "}
                    <strong style={{ color: "#fff" }}>{CREDIT_LEDGER.debtor_name_masked}</strong>
                    {"  ·  "}
                    <span style={{ color: C.rose, fontWeight: 700 }}>경매사건:</span>{" "}
                    <strong style={{ color: "#fff" }}>{CREDIT_LEDGER.court_case_full}</strong>
                  </div>

                  {/* 권리 순위 테이블 */}
                  <div>
                    <div style={{ fontSize: 10, color: C.lt4, fontWeight: 700, marginBottom: 8 }}>
                      권리 순위 (등기 기준)
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {CREDIT_LEDGER.rights.map(r => (
                        <div
                          key={r.rank}
                          style={{
                            padding: "9px 12px", borderRadius: 7,
                            backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                            display: "flex", alignItems: "center", gap: 10, fontSize: 11,
                          }}
                        >
                          <span
                            style={{
                              width: 20, height: 20, borderRadius: "50%",
                              backgroundColor: r.rank === 1 ? C.emL + "22" : C.bg4,
                              border: `1px solid ${r.rank === 1 ? C.emL : C.bg4}`,
                              color: r.rank === 1 ? C.emL : C.lt4,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 9, fontWeight: 900, flexShrink: 0,
                            }}
                          >
                            {r.rank}
                          </span>
                          <span style={{ color: C.lt3, fontWeight: 600, minWidth: 60 }}>{r.type}</span>
                          <span style={{ color: "#fff", fontWeight: 700, flex: 1 }}>{fmt(r.amount)}</span>
                          <span style={{ color: C.lt4 }}>{r.holder_masked}</span>
                          <span style={{ color: C.lt4, fontSize: 9 }}>{r.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              {/* ── 문서 목록 ── */}
              {DATAROOM_DOCS.map((category, ci) => (
                <section
                  key={ci}
                  style={{
                    backgroundColor: C.bg2,
                    border: `1px solid ${C.bg4}`,
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  <header
                    style={{
                      padding: "12px 18px",
                      borderBottom: `1px solid ${C.bg4}`,
                      fontSize: 12, fontWeight: 800, color: "#fff",
                    }}
                  >
                    {category.category}
                  </header>
                  <div>
                    {category.items.map((doc, di) => {
                      const Icon = doc.icon
                      return (
                        <div
                          key={di}
                          style={{
                            padding: "14px 18px",
                            borderBottom: di < category.items.length - 1 ? `1px solid ${C.bg4}` : "none",
                            display: "flex", alignItems: "center", gap: 14,
                          }}
                        >
                          <div
                            style={{
                              width: 36, height: 36, borderRadius: 8,
                              backgroundColor: C.bg3,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={16} color={C.emL} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                              {doc.name}
                            </div>
                            <div style={{ fontSize: 10, color: C.lt4 }}>
                              {doc.type} · {doc.size}
                            </div>
                          </div>
                          <button
                            style={{
                              padding: "6px 12px", borderRadius: 6,
                              backgroundColor: C.bg3, color: "#fff",
                              fontSize: 10, fontWeight: 700, cursor: "pointer",
                              border: `1px solid ${C.bg4}`,
                              display: "inline-flex", alignItems: "center", gap: 4,
                            }}
                          >
                            <Eye size={11} /> 열람
                          </button>
                          {doc.downloadable && (
                            <button
                              style={{
                                padding: "6px 12px", borderRadius: 6,
                                backgroundColor: `${C.em}14`,
                                color: C.emL,
                                border: "1px solid rgba(16, 185, 129, 0.33)",
                                fontSize: 10, fontWeight: 700, cursor: "pointer",
                                display: "inline-flex", alignItems: "center", gap: 4,
                              }}
                            >
                              <Download size={11} /> 다운로드
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              ))}
            </div>

            {/* RIGHT — Access log + action */}
            <aside style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 96 }}>
              <div
                style={{
                  padding: 20, borderRadius: 14,
                  backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
                }}
              >
                <div style={{ fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 12 }}>다음 단계</div>
                <Link
                  href={`/exchange/${id}/escrow`}
                  style={{
                    padding: "12px 14px", borderRadius: 10,
                    backgroundColor: C.em, color: "#041915",
                    fontSize: 12, fontWeight: 800, textAlign: "center",
                    textDecoration: "none",
                    display: "block",
                  }}
                >
                  에스크로 입금하고 거래 확정
                </Link>
              </div>

              {/* Access log */}
              <div
                style={{
                  padding: 20, borderRadius: 14,
                  backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
                }}
              >
                <div
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    fontSize: 11, color: C.lt4, fontWeight: 700, marginBottom: 12,
                  }}
                >
                  <Clock size={13} /> 최근 열람 이력
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {ACCESS_LOG.map((log, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px", borderRadius: 8,
                        backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                      }}
                    >
                      <div style={{ fontSize: 10, color: C.lt4, marginBottom: 2 }}>{log.time}</div>
                      <div style={{ fontSize: 11, color: "#fff", fontWeight: 700, marginBottom: 1 }}>
                        {log.action}
                      </div>
                      <div style={{ fontSize: 9, color: C.lt4 }}>
                        {log.user} · {log.ip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div
                style={{
                  padding: "14px 16px", borderRadius: 12,
                  backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)",
                  display: "flex", gap: 10, alignItems: "flex-start",
                }}
              >
                <AlertTriangle size={16} color={C.rose} style={{ marginTop: 1, flexShrink: 0 }} />
                <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
                  L3 자료는 인수 검토 목적에만 사용해주세요. 무단 복제 · 외부 유출은
                  개인정보보호법 · 신용정보법 위반으로 형사 처벌 대상입니다.
                </div>
              </div>
            </aside>
          </div>
        </TierGate>
      </section>
    </main>
  )
}
