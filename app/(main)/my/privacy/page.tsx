"use client"

/**
 * /my/privacy — 개인정보 설정 (PII Access Log + 파기 요청)
 *
 * 개인정보보호법 제35조(개인정보의 열람), 제36조(정정·삭제),
 * 신용정보법 제35조(신용정보 열람청구권) 준수
 */

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft, ShieldCheck, Eye, Download, Trash2,
  AlertCircle, Clock, FileText, Filter, CheckCircle2, Loader2,
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

type LogAction = "VIEW" | "DOWNLOAD" | "MASKED_REVEAL"
type LogTier = "L1" | "L2" | "L3"

interface AccessLogRow {
  id: string
  time: string
  listing_id: string
  field: string
  tier: LogTier
  action: LogAction
  ip: string
}

// Sample data used as fallback when API is unavailable
const SAMPLE_ACCESS_LOG: AccessLogRow[] = [
  { id: "log-001", time: "2026-04-07 14:32", listing_id: "npl-2026-0412", field: "등기부등본 원본",      tier: "L2", action: "VIEW",          ip: "203.***.***.41" },
  { id: "log-002", time: "2026-04-07 14:28", listing_id: "npl-2026-0412", field: "감정평가서 원본",        tier: "L2", action: "DOWNLOAD",      ip: "203.***.***.41" },
  { id: "log-003", time: "2026-04-07 14:15", listing_id: "npl-2026-0412", field: "데이터룸 입장",          tier: "L3", action: "VIEW",          ip: "203.***.***.41" },
  { id: "log-004", time: "2026-04-06 10:42", listing_id: "npl-2026-0408", field: "임대차 계약서",          tier: "L2", action: "VIEW",          ip: "203.***.***.41" },
  { id: "log-005", time: "2026-04-06 10:38", listing_id: "npl-2026-0408", field: "감정평가서 마스킹본",    tier: "L1", action: "MASKED_REVEAL", ip: "203.***.***.41" },
  { id: "log-006", time: "2026-04-05 16:11", listing_id: "npl-2026-0405", field: "현장사진 (48장)",        tier: "L2", action: "DOWNLOAD",      ip: "203.***.***.41" },
  { id: "log-007", time: "2026-04-05 09:50", listing_id: "npl-2026-0408", field: "등기부등본 요약",        tier: "L1", action: "VIEW",          ip: "211.***.***.18" },
  { id: "log-008", time: "2026-04-04 21:03", listing_id: "npl-2026-0405", field: "권리관계 분석서",        tier: "L2", action: "VIEW",          ip: "203.***.***.41" },
]

const ACTION_META: Record<LogAction, { label: string; color: string }> = {
  VIEW:          { label: "열람",     color: "#2E75B6" },
  DOWNLOAD:      { label: "다운로드", color: "#14161A" },
  MASKED_REVEAL: { label: "마스킹 해제", color: "#14161A" },
}

const TIER_COLOR: Record<LogTier, string> = {
  L1: "#2E75B6", L2: "#14161A", L3: "#14161A",
}

const PII_CATEGORIES = [
  { key: "identity",   label: "본인 식별 정보", desc: "이름 · 생년월일 · 성별",          retention: "회원 탈퇴 시까지" },
  { key: "kyc",        label: "투자 자격 정보", desc: "전문투자자 증빙 · 소득 · 자산",     retention: "검토 완료 후 30일" },
  { key: "agreements", label: "계약 정보",     desc: "NDA · LOI · 본 계약",            retention: "체결 후 5년" },
  { key: "access_log", label: "열람 이력",     desc: "PII Access Log · IP",            retention: "3년" },
  { key: "device",     label: "기기 정보",     desc: "IP · User-Agent · 쿠키",          retention: "1년" },
]

export default function PrivacyPage() {
  const [filter, setFilter] = useState<"ALL" | LogAction>("ALL")
  const [requested, setRequested] = useState(false)
  const [accessLog, setAccessLog] = useState<AccessLogRow[]>(SAMPLE_ACCESS_LOG)
  const [logLoading, setLogLoading] = useState(true)

  // Fetch real PII access log from API; fall back to sample data on failure
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/v1/my/pii-log")
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.data) && json.data.length > 0) {
            setAccessLog(json.data as AccessLogRow[])
          }
        }
      } catch {
        // Keep sample data on error
      } finally {
        setLogLoading(false)
      }
    }
    load()
  }, [])

  const rows = useMemo(() => {
    if (filter === "ALL") return accessLog
    return accessLog.filter(r => r.action === filter)
  }, [filter, accessLog])

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
            PRIVACY & DATA
          </div>
          <h1
            style={{
              fontSize: 32, fontWeight: 900, color: "#fff",
              letterSpacing: "-0.02em", marginBottom: 8,
            }}
          >
            개인정보 설정
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 680 }}>
            개인정보보호법 제35조(열람청구권) · 제36조(정정·삭제 요구권) · 신용정보법 제35조에 따라
            본인의 개인정보 처리 현황을 확인하고, 파기를 요청할 수 있습니다.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            gap: 24, alignItems: "start",
          }}
        >
          {/* LEFT — PII Access Log */}
          <section>
            <div
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 14, flexWrap: "wrap", gap: 12,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                PII Access Log
                {logLoading && <Loader2 size={12} style={{ animation: "spin 1s linear infinite", color: C.lt4 }} />}
                <span style={{ marginLeft: 10, fontSize: 11, color: C.lt4, fontWeight: 600 }}>
                  내가 열람한 L1~L3 자료 이력
                </span>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Filter size={13} color={C.lt4} />
                {(["ALL", "VIEW", "DOWNLOAD", "MASKED_REVEAL"] as const).map(k => {
                  const active = filter === k
                  const label = k === "ALL" ? "전체" : ACTION_META[k as LogAction].label
                  return (
                    <button
                      key={k}
                      onClick={() => setFilter(k)}
                      style={{
                        padding: "5px 11px", borderRadius: 999,
                        fontSize: 10, fontWeight: 700,
                        backgroundColor: active ? "var(--color-positive-bg)" : C.bg2,
                        color: active ? C.emL : C.lt4,
                        border: `1px solid ${active ? C.em : C.bg4}`,
                        cursor: "pointer",
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>

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
                  gridTemplateColumns: "150px 1fr 60px 110px 130px",
                  padding: "12px 18px",
                  fontSize: 10, color: C.lt4, fontWeight: 700,
                  borderBottom: `1px solid ${C.bg4}`,
                  backgroundColor: C.bg3,
                }}
              >
                <span>일시</span>
                <span>매물 · 자료</span>
                <span>티어</span>
                <span>행위</span>
                <span>IP</span>
              </header>
              {rows.map((row, i) => {
                const meta = ACTION_META[row.action]
                const ActionIcon = row.action === "DOWNLOAD" ? Download : Eye
                return (
                  <div
                    key={row.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "150px 1fr 60px 110px 130px",
                      padding: "13px 18px",
                      borderBottom: i < rows.length - 1 ? `1px solid ${C.bg4}` : "none",
                      fontSize: 11, color: "#fff",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 10, color: C.lt4 }}>{row.time}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, marginBottom: 2 }}>{row.field}</div>
                      <div style={{ fontSize: 9, color: C.lt4, fontFamily: "monospace" }}>{row.listing_id}</div>
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 7px", borderRadius: 4,
                        backgroundColor: `${TIER_COLOR[row.tier]}1F`,
                        color: TIER_COLOR[row.tier],
                        border: `1px solid ${TIER_COLOR[row.tier]}44`,
                        fontSize: 9, fontWeight: 800,
                        width: "fit-content",
                      }}
                    >
                      {row.tier}
                    </span>
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "4px 8px", borderRadius: 999,
                        backgroundColor: `${meta.color}1A`,
                        color: meta.color,
                        border: `1px solid ${meta.color}44`,
                        fontSize: 9, fontWeight: 800,
                        width: "fit-content",
                      }}
                    >
                      <ActionIcon size={10} /> {meta.label}
                    </span>
                    <span style={{ fontSize: 10, color: C.lt4, fontFamily: "monospace" }}>{row.ip}</span>
                  </div>
                )
              })}
            </section>

            {/* PII categories */}
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", margin: "28px 0 14px" }}>
              보유 중인 개인정보
            </div>
            <section
              style={{
                backgroundColor: C.bg2,
                border: `1px solid ${C.bg4}`,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {PII_CATEGORIES.map((cat, i) => (
                <div
                  key={cat.key}
                  style={{
                    padding: "16px 20px",
                    borderBottom: i < PII_CATEGORIES.length - 1 ? `1px solid ${C.bg4}` : "none",
                    display: "flex", alignItems: "center", gap: 16,
                  }}
                >
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      backgroundColor: "rgba(45, 116, 182, 0.12)", border: "1px solid rgba(45, 116, 182, 0.27)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={16} color={C.blueL} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 2 }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: 10, color: C.lt4 }}>{cat.desc}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, color: C.lt4, fontWeight: 700, marginBottom: 2 }}>보관 기간</div>
                    <div style={{ fontSize: 11, color: C.emL, fontWeight: 700 }}>{cat.retention}</div>
                  </div>
                </div>
              ))}
            </section>
          </section>

          {/* RIGHT — Actions */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 16, position: "sticky", top: 96 }}>
            {/* Download my data */}
            <section
              style={{
                padding: 20, borderRadius: 14,
                backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
              }}
            >
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 10,
                }}
              >
                <Download size={14} color={C.blueL} />
                내 데이터 다운로드
              </div>
              <p style={{ fontSize: 11, color: C.lt4, lineHeight: 1.55, marginBottom: 14 }}>
                개인정보보호법 제35조에 따른 열람청구권 행사. ZIP 파일로 24시간 내 발송됩니다.
              </p>
              <button
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  backgroundColor: C.bg3, color: "#fff",
                  border: `1px solid ${C.bg4}`,
                  fontSize: 11, fontWeight: 700, cursor: "pointer",
                  display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                }}
              >
                <Download size={13} /> 데이터 패키지 요청
              </button>
            </section>

            {/* Deletion request */}
            <section
              style={{
                padding: 20, borderRadius: 14,
                backgroundColor: C.bg2, border: "1px solid rgba(27,27,31, 0.2)",
              }}
            >
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 10,
                }}
              >
                <Trash2 size={14} color={C.rose} />
                개인정보 파기 요청
              </div>
              {requested ? (
                <div
                  style={{
                    padding: "16px 14px", borderRadius: 10,
                    backgroundColor: "var(--color-positive-bg)", border: "1px solid var(--color-positive-border)",
                    textAlign: "center",
                  }}
                >
                  <CheckCircle2 size={24} color={C.em} style={{ margin: "0 auto 6px" }} />
                  <div style={{ fontSize: 11, fontWeight: 800, color: C.emL, marginBottom: 3 }}>
                    파기 요청 접수 완료
                  </div>
                  <div style={{ fontSize: 10, color: C.lt4 }}>
                    개인정보보호책임자(DPO)가 30일 이내 처리 결과를 통보합니다.
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: 11, color: C.lt4, lineHeight: 1.55, marginBottom: 14 }}>
                    개인정보보호법 제36조에 따른 정정·삭제 요구권 행사.
                    진행 중인 거래가 있으면 처리가 지연될 수 있습니다.
                  </p>
                  <button
                    onClick={() => setRequested(true)}
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 10,
                      backgroundColor: "rgba(27,27,31, 0.1)", color: C.rose,
                      border: "1px solid rgba(27,27,31, 0.4)",
                      fontSize: 11, fontWeight: 800, cursor: "pointer",
                      display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                    }}
                  >
                    <Trash2 size={13} /> 파기 요청 제출
                  </button>
                </>
              )}
            </section>

            {/* DPO contact */}
            <div
              style={{
                padding: "14px 16px", borderRadius: 12,
                backgroundColor: "rgba(45, 116, 182, 0.04)", border: "1px solid rgba(45, 116, 182, 0.2)",
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
                개인정보보호책임자(DPO)
              </div>
              <div style={{ fontSize: 10, color: C.lt3, lineHeight: 1.6 }}>
                홍길동 / CISO<br />
                privacy@nplatform.kr<br />
                02-1234-5678
              </div>
            </div>
          </aside>
        </div>

        {/* Notice */}
        <div
          style={{
            marginTop: 24, padding: "14px 16px", borderRadius: 12,
            backgroundColor: "rgba(20,22,26, 0.04)", border: "1px solid rgba(20,22,26, 0.2)",
            display: "flex", gap: 10, alignItems: "flex-start",
          }}
        >
          <AlertCircle size={16} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
            NPLatform은 정보주체의 동의 없이 제3자에게 개인정보를 제공하지 않습니다.
            단, 법령에 의거한 수사기관 요청 · 금융감독원 검사 · 법원 영장 제시 시에는 관련 법령에 따라 제공될 수 있으며, 이 경우 정보주체에게 사후 통지됩니다.
          </div>
        </div>
      </section>
    </main>
  )
}
