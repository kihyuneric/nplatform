"use client"

/**
 * /exchange/[id]/escrow — 에스크로 결제 페이지 (v4, 2026-04-07)
 *
 * 역할: 거래 확정 · 자금 보호
 *   - 거래 요약 (매각가 · 매수자 수수료 · 에스크로 수수료)
 *   - 지정 에스크로 계좌 안내 (가상계좌 방식)
 *   - 입금 대기 → 입금 확인 → 소유권 이전 후 정산
 */

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  ChevronLeft, ShieldCheck, Copy, CheckCircle2, AlertCircle,
  Building2, Lock, Clock,
} from "lucide-react"
import { calculateEscrowFee } from "@/lib/fee-calculator"
import { calculateFee, BASE_RATES, PNR_RATE } from "@/lib/settlement/fee-engine"

const C = {
  bg0: "var(--color-bg-deepest, #030810)", bg1: "var(--color-bg-deep, #050D1A)", bg2: "var(--color-bg-base, #080F1E)",
  bg3: "var(--color-bg-base, #0A1628)", bg4: "var(--color-bg-elevated, #0F1F35)",
  em: "var(--color-positive)", emL: "var(--color-positive)",
  blue: "var(--color-brand-dark)", blueL: "var(--color-brand-bright)",
  amber: "var(--color-warning)", rose: "var(--color-danger)", purple: "#A855F7",
  lt3: "var(--color-text-muted)", lt4: "var(--color-text-muted)",
}

const ASKING_PRICE = 850_000_000

export default function EscrowPage() {
  const params = useParams()
  const id = (params?.id as string) ?? "npl-2026-0412"

  // v2 수수료 모델: NPL 매수자 1.5% + 우선협상권(PNR) 0.3% · 부동산 매수자 0.9%
  const buyerFee = calculateFee({
    dealType: "npl-buyer",
    transactionAmount: ASKING_PRICE,
    withPNR: true,
  })
  const escrowFee = calculateEscrowFee(ASKING_PRICE)
  const total = ASKING_PRICE + buyerFee.totalFee + escrowFee
  const BUYER_RATE_LABEL = `NPL ${(BASE_RATES["npl-buyer"] * 100).toFixed(1)}% + PNR ${(PNR_RATE * 100).toFixed(1)}% · 부동산 ${(BASE_RATES["re-buyer"] * 100).toFixed(1)}%`

  // Mock virtual account
  const virtualAccount = {
    bank: "하나은행",
    number: "398-910234-56789",
    holder: "(주)NPLatform 에스크로",
    reference: `NPL-${id.slice(-4)}-${Date.now().toString().slice(-6)}`,
  }

  const [copied, setCopied] = useState<string>("")

  function copyField(key: string, value: string) {
    navigator.clipboard?.writeText(value).catch(() => {})
    setCopied(key)
    setTimeout(() => setCopied(""), 1200)
  }

  const steps = [
    { id: 1, label: "계약 확정", status: "done" as const, time: "2026-04-07 14:32" },
    { id: 2, label: "에스크로 입금", status: "current" as const, time: "대기 중" },
    { id: 3, label: "매도자 확인", status: "pending" as const, time: "—" },
    { id: 4, label: "소유권 이전", status: "pending" as const, time: "—" },
    { id: 5, label: "자금 정산", status: "pending" as const, time: "—" },
  ]

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      <section style={{ borderBottom: `1px solid ${C.bg4}`, backgroundColor: C.bg1 }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "24px 24px 20px" }}>
          <Link
            href={`/exchange/${id}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: C.lt4, fontWeight: 600, textDecoration: "none",
            }}
          >
            <ChevronLeft size={14} /> 매물 상세로
          </Link>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "32px 24px 80px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 999,
                backgroundColor: `${C.blue}14`, border: "1px solid rgba(45, 116, 182, 0.2)",
                fontSize: 11, fontWeight: 700, color: C.blueL,
              }}
            >
              <ShieldCheck size={12} /> 에스크로 자금 보호
            </span>
          </div>
          <h1
            style={{
              fontSize: 30, fontWeight: 900, color: "#fff",
              letterSpacing: "-0.02em", marginBottom: 8,
            }}
          >
            에스크로 입금
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 640 }}>
            매수자가 입금한 자금은 <strong style={{ color: "#fff" }}>NPLatform 에스크로 가상계좌</strong>에
            보관되며, 소유권 이전이 확인된 후에만 매도자에게 지급됩니다.
            중도 해지 · 매도자 불이행 시 자동 반환됩니다.
          </p>
          <div style={{ fontSize: 11, color: C.lt4, marginTop: 8, fontFamily: "monospace" }}>
            대상 매물: {id}
          </div>
        </motion.div>

        {/* Progress timeline */}
        <section
          style={{
            backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
            borderRadius: 14, padding: 24, marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 16 }}>거래 진행 단계</div>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            {steps.map((s, i) => {
              const color =
                s.status === "done" ? C.em : s.status === "current" ? C.blue : C.bg4
              const textColor =
                s.status === "done" ? C.emL : s.status === "current" ? C.blueL : C.lt4
              return (
                <div key={s.id} style={{ flex: 1, position: "relative", textAlign: "center" }}>
                  {i < steps.length - 1 && (
                    <div
                      style={{
                        position: "absolute", top: 15,
                        left: "55%", width: "90%", height: 2,
                        backgroundColor: C.bg4,
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "relative",
                      width: 32, height: 32, borderRadius: "50%",
                      backgroundColor: s.status === "pending" ? C.bg3 : color,
                      border: `2px solid ${color}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 8px",
                      zIndex: 1,
                    }}
                  >
                    {s.status === "done" ? (
                      <CheckCircle2 size={16} color="#fff" />
                    ) : s.status === "current" ? (
                      <Clock size={14} color="#fff" />
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 800, color: C.lt4 }}>{s.id}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: textColor, marginBottom: 2 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 9, color: C.lt4 }}>{s.time}</div>
                </div>
              )
            })}
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            gap: 20, alignItems: "start",
          }}
        >
          {/* LEFT — Virtual account */}
          <section
            style={{
              backgroundColor: C.bg2,
              border: `1px solid ${C.bg4}`,
              borderRadius: 14,
              padding: 28,
            }}
          >
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 18,
              }}
            >
              <Building2 size={14} color={C.emL} />
              가상 에스크로 계좌 정보
            </div>

            <div
              style={{
                padding: "24px 24px", borderRadius: 14,
                background: `linear-gradient(135deg, ${C.bg3} 0%, ${C.bg1} 100%)`,
                border: "1px solid rgba(16, 185, 129, 0.33)",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 10, color: C.lt4, fontWeight: 700, marginBottom: 4 }}>입금 은행</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 14 }}>
                {virtualAccount.bank}
              </div>

              <div style={{ fontSize: 10, color: C.lt4, fontWeight: 700, marginBottom: 4 }}>계좌번호</div>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 900, color: C.emL, letterSpacing: "0.02em", fontFamily: "monospace" }}>
                  {virtualAccount.number}
                </div>
                <button
                  onClick={() => copyField("account", virtualAccount.number)}
                  style={{
                    padding: "6px 10px", borderRadius: 6,
                    backgroundColor: C.bg4, color: "#fff",
                    fontSize: 10, fontWeight: 700, cursor: "pointer",
                    border: "none",
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}
                >
                  {copied === "account" ? (
                    <>
                      <CheckCircle2 size={11} color={C.emL} /> 복사됨
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> 복사
                    </>
                  )}
                </button>
              </div>

              <div style={{ fontSize: 10, color: C.lt4, fontWeight: 700, marginBottom: 4 }}>예금주</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 14 }}>
                {virtualAccount.holder}
              </div>

              <div style={{ fontSize: 10, color: C.lt4, fontWeight: 700, marginBottom: 4 }}>거래 참조번호</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>
                {virtualAccount.reference}
              </div>
            </div>

            <div
              style={{
                padding: "14px 16px", borderRadius: 10,
                backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.27)",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <AlertCircle size={16} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
                위 가상계좌는 본 거래 전용입니다. 다른 매물 대금을 잘못 입금하면 처리 지연이 발생할 수 있으니
                입금 전 참조번호를 반드시 확인해주세요.
              </div>
            </div>
          </section>

          {/* RIGHT — Payment summary */}
          <aside style={{ position: "sticky", top: 96, display: "flex", flexDirection: "column", gap: 16 }}>
            <section
              style={{
                backgroundColor: C.bg2,
                border: `1px solid ${C.bg4}`,
                borderRadius: 14,
                padding: 20,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 14 }}>
                결제 요약
              </div>
              <LineRow label="매각가" value={formatKRW(ASKING_PRICE)} />
              <LineRow label={`매수자 수수료 (${BUYER_RATE_LABEL})`} value={formatKRW(buyerFee.totalFee)} />
              <LineRow label="에스크로 수수료 (0.3%)" value={formatKRW(escrowFee)} />
              <div
                style={{
                  marginTop: 14, paddingTop: 14,
                  borderTop: `1px solid ${C.bg4}`,
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>총 입금 금액</span>
                <span style={{ fontSize: 20, color: C.emL, fontWeight: 900, letterSpacing: "-0.01em" }}>
                  {formatKRW(total)}
                </span>
              </div>
            </section>

            <div
              style={{
                padding: "14px 16px", borderRadius: 14,
                backgroundColor: "var(--color-positive-bg)", border: `1px solid ${C.em}33`,
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <Lock size={16} color={C.emL} style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
                전자금융거래법에 따른 금융기관 제휴 에스크로 서비스입니다.
                입금된 자금은 NPLatform 운영자금과 분리 보관됩니다.
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  )
}

function LineRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex", justifyContent: "space-between",
        padding: "8px 0", fontSize: 12, color: C.lt3,
      }}
    >
      <span>{label}</span>
      <span style={{ color: "#fff", fontWeight: 700 }}>{value}</span>
    </div>
  )
}

function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString("ko-KR")}원`
}
