"use client"

/**
 * /exchange/[id]/loi — 인수의향서 (LOI) 제출 (v4, 2026-04-07)
 *
 * 목적: L2 → L3 승격 (데이터룸 개방 요청)
 *   - 제안 가격
 *   - 자금 조달 계획
 *   - 실사 일정
 *   - 매도자 승인 대기 상태 전환
 */

import { useState, useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import {
  ChevronLeft, Send, Briefcase, Calendar,
  CheckCircle2, ShieldCheck, Clock, AlertCircle, PenLine,
} from "lucide-react"
import { TierBadge } from "@/components/tier/tier-badge"
import { SignModal } from "@/components/esign/sign-modal"

const C = {
  bg0: "var(--color-bg-deepest, #030810)", bg1: "var(--color-bg-deep, #050D1A)", bg2: "var(--color-bg-base, #080F1E)",
  bg3: "var(--color-bg-base, #0A1628)", bg4: "var(--color-bg-elevated, #0F1F35)",
  em: "var(--color-positive)", emL: "var(--color-positive)",
  blue: "var(--color-brand-dark)", blueL: "var(--color-brand-bright)",
  rose: "var(--color-danger)", amber: "var(--color-warning)", purple: "#A855F7",
  lt3: "var(--color-text-muted)", lt4: "var(--color-text-muted)",
}

const ASKING_PRICE = 850_000_000 // mock

export default function LoiPage() {
  const params = useParams()
  const id = (params?.id as string) ?? "npl-2026-0412"

  const [offeredPrice, setOfferedPrice] = useState(820_000_000)
  const [funding, setFunding] = useState<"CASH" | "LEVERAGED" | "FUND" | "">("")
  const [duration, setDuration] = useState("30")
  const [entity, setEntity] = useState("")
  const [notes, setNotes] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [showSignModal, setShowSignModal] = useState(false)
  const [loiSignature, setLoiSignature] = useState<string | null>(null)

  const premiumPct = useMemo(() => {
    return ((offeredPrice - ASKING_PRICE) / ASKING_PRICE) * 100
  }, [offeredPrice])

  const canSubmit = offeredPrice > 0 && !!funding && !!entity && duration.length > 0

  if (submitted) {
    return (
      <main
        style={{
          backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 40,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          style={{
            maxWidth: 560, width: "100%",
            padding: 48, borderRadius: 20,
            backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 72, height: 72, borderRadius: "50%",
              backgroundColor: "rgba(168, 85, 247, 0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <Clock size={36} color={C.purple} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 10 }}>
            LOI 제출 완료 — 매도자 승인 대기
          </h2>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, marginBottom: 24 }}>
            제출하신 인수의향서는 매도자({'\u0020'}
            <strong style={{ color: "#fff" }}>우리은행 · 여신관리팀</strong>
            )에게 전달되었습니다.
            평균 <strong style={{ color: "#fff" }}>24~48시간</strong> 내 승인 여부가 결정되며,
            승인 시 L3 데이터룸이 자동 개방됩니다.
          </p>
          <div
            style={{
              display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                padding: 14, borderRadius: 10,
                backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
              }}
            >
              <div style={{ fontSize: 10, color: C.lt4, marginBottom: 4 }}>제안 가격</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                {formatKRW(offeredPrice)}
              </div>
            </div>
            <div
              style={{
                padding: 14, borderRadius: 10,
                backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
              }}
            >
              <div style={{ fontSize: 10, color: C.lt4, marginBottom: 4 }}>실사 기간</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{duration}일</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Link
              href={`/exchange/${id}`}
              style={{
                padding: "11px 20px", borderRadius: 10,
                backgroundColor: C.bg3, color: "#fff",
                fontSize: 12, fontWeight: 700, textDecoration: "none",
                border: `1px solid ${C.bg4}`,
              }}
            >
              매물 상세로
            </Link>
            <Link
              href="/my/agreements"
              style={{
                padding: "11px 20px", borderRadius: 10,
                backgroundColor: C.em, color: "#041915",
                fontSize: 12, fontWeight: 800, textDecoration: "none",
              }}
            >
              내 계약 관리
            </Link>
          </div>
        </motion.div>
      </main>
    )
  }

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      <section style={{ borderBottom: `1px solid ${C.bg4}`, backgroundColor: C.bg1 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 20px" }}>
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

      <section style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TierBadge tier="L3" variant="soft" size="sm" />
            <span style={{ fontSize: 11, color: C.lt4 }}>L2 → L3 승격 (데이터룸 개방)</span>
          </div>
          <h1
            style={{
              fontSize: 30, fontWeight: 900, color: "#fff",
              letterSpacing: "-0.02em", marginBottom: 8,
            }}
          >
            인수의향서 (LOI)
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 640 }}>
            LOI는 매도자에게 본건 NPL 인수에 대한 진지한 의향을 전달하는 문서입니다.
            매도자 승인 후 <strong style={{ color: "#fff" }}>L3 데이터룸</strong>이 개방되며,
            채무자 식별정보 · 세부 권리자 · 경매 원장 등 최상위 자료가 공개됩니다.
          </p>
          <div style={{ fontSize: 11, color: C.lt4, marginTop: 8, fontFamily: "monospace" }}>
            대상 매물: {id} · 매각희망가: {formatKRW(ASKING_PRICE)}
          </div>
        </motion.div>

        {/* Offer price */}
        <SectionCard title="제안 가격" icon={<Briefcase size={14} />}>
          <div style={{ marginBottom: 10, fontSize: 11, color: C.lt4 }}>
            매각희망가 {formatKRW(ASKING_PRICE)} 기준
          </div>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              inputMode="numeric"
              value={offeredPrice ? offeredPrice.toLocaleString('ko-KR') : ""}
              onChange={e => setOfferedPrice(Number(e.target.value.replace(/[^0-9]/g, '')) || 0)}
              placeholder="예: 820,000,000"
              style={{
                width: "100%", padding: "14px 60px 14px 16px", borderRadius: 10,
                backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                color: "#fff", fontSize: 18, fontWeight: 700, outline: "none",
              }}
            />
            <span
              style={{
                position: "absolute", right: 18, top: "50%", transform: "translateY(-50%)",
                fontSize: 12, color: C.lt4, fontWeight: 600,
              }}
            >
              원
            </span>
          </div>
          {offeredPrice > 0 && (
            <div
              style={{
                marginTop: 10, fontSize: 11,
                color: premiumPct >= 0 ? C.emL : C.amber,
                fontWeight: 700,
              }}
            >
              매각희망가 대비 {premiumPct >= 0 ? "+" : ""}
              {premiumPct.toFixed(1)}%
            </div>
          )}
        </SectionCard>

        {/* Funding */}
        <SectionCard title="자금 조달 계획" icon={<Briefcase size={14} />}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[
              { value: "CASH", label: "자기 자본 100%", desc: "승인 확률 높음" },
              { value: "LEVERAGED", label: "금융 차입 병행", desc: "LTV 50~70%" },
              { value: "FUND", label: "펀드 출자", desc: "LP 확약서 첨부" },
            ].map(op => {
              const active = op.value === funding
              return (
                <button
                  key={op.value}
                  onClick={() => setFunding(op.value as any)}
                  style={{
                    padding: "16px 14px", borderRadius: 10, textAlign: "left",
                    backgroundColor: active ? "var(--color-positive-bg)" : C.bg3,
                    border: `1px solid ${active ? C.em : C.bg4}`,
                    color: "#fff", cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>{op.label}</div>
                  <div style={{ fontSize: 10, color: C.lt4 }}>{op.desc}</div>
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* Duration */}
        <SectionCard title="실사 · 계약 체결 기간" icon={<Calendar size={14} />}>
          <div style={{ display: "flex", gap: 8 }}>
            {["14", "30", "45", "60"].map(d => {
              const active = d === duration
              return (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  style={{
                    padding: "11px 18px", borderRadius: 10,
                    backgroundColor: active ? "var(--color-positive-bg)" : C.bg3,
                    color: active ? C.emL : C.lt3,
                    border: `1px solid ${active ? C.em : C.bg4}`,
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {d}일
                </button>
              )
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: C.lt4 }}>
            짧은 기간일수록 매도자 승인 가능성이 높아집니다.
          </div>
        </SectionCard>

        {/* Entity */}
        <SectionCard title="인수 주체" icon={<Briefcase size={14} />}>
          <input
            value={entity}
            onChange={e => setEntity(e.target.value)}
            placeholder="예: ○○자산운용 NPL 1호 펀드"
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
              color: "#fff", fontSize: 13, outline: "none",
            }}
          />
        </SectionCard>

        {/* Notes */}
        <SectionCard title="매도자에게 전달할 메시지" icon={<Briefcase size={14} />}>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
            placeholder="인수 배경 · 추가 조건 · 실사 요구사항 등을 자유롭게 기재해주세요."
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
              color: "#fff", fontSize: 13, outline: "none", resize: "vertical",
              fontFamily: "inherit",
            }}
          />
        </SectionCard>

        {/* Warning */}
        <div
          style={{
            padding: "14px 16px", borderRadius: 12,
            backgroundColor: "rgba(45, 116, 182, 0.04)", border: "1px solid rgba(45, 116, 182, 0.2)",
            display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 24,
          }}
        >
          <AlertCircle size={16} color={C.blueL} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
            LOI는 법적 구속력이 없는 의향서이지만, 매도자가 승인한 후 본 계약 협상 단계로 진입하면
            에스크로 입금 및 계약금 몰취 조건이 적용될 수 있습니다.
          </div>
        </div>

        {/* 전자서명 CTA */}
        {loiSignature ? (
          <div
            style={{
              padding: "12px 16px", borderRadius: 12, marginBottom: 16,
              backgroundColor: `${C.em}15`, border: "1px solid rgba(16, 185, 129, 0.33)",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <ShieldCheck size={15} color={C.em} />
            <span style={{ fontSize: 12, color: C.em, fontWeight: 600 }}>
              전자서명 완료 — LOI에 서명이 첨부됩니다
            </span>
          </div>
        ) : (
          <button
            onClick={() => canSubmit && setShowSignModal(true)}
            disabled={!canSubmit}
            style={{
              width: "100%", padding: "13px 20px", borderRadius: 12, marginBottom: 12,
              backgroundColor: canSubmit ? `${C.blue}22` : C.bg3,
              color: canSubmit ? C.blueL : C.lt4,
              fontSize: 12, fontWeight: 700, border: `1px solid ${canSubmit ? "rgba(45, 116, 182, 0.27)" : C.bg4}`,
              cursor: canSubmit ? "pointer" : "not-allowed",
              display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8,
            }}
          >
            <PenLine size={14} /> 전자서명 첨부 (선택)
          </button>
        )}

        <button
          onClick={() => canSubmit && setSubmitted(true)}
          disabled={!canSubmit}
          style={{
            width: "100%", padding: "14px 20px", borderRadius: 12,
            backgroundColor: canSubmit ? C.em : C.bg3,
            color: canSubmit ? "#041915" : C.lt4,
            fontSize: 13, fontWeight: 800, border: "none",
            cursor: canSubmit ? "pointer" : "not-allowed",
            display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8,
          }}
        >
          <Send size={15} /> LOI 제출하고 매도자 승인 요청
        </button>
      </section>

      {/* ── 전자서명 모달 ─────────────────────────────────── */}
      <SignModal
        open={showSignModal}
        onClose={() => setShowSignModal(false)}
        document={{
          id: `LOI-${id}-${Date.now()}`,
          title: "인수의향서 (LOI)",
          body: `인수의향서 (Letter of Intent)\n\n제안 금액: ${formatKRW(offeredPrice)}\n자금 조달: ${funding}\n실사 기간: ${duration}일\n제안 주체: ${entity}\n\n특이 사항:\n${notes || "없음"}`,
        }}
        signerName={entity || "매수인"}
        signerId="buyer"
        signers={[
          { id: "buyer-1", name: entity || "매수인", role: "BUYER" as const, status: "PENDING" as const },
        ]}
        onComplete={(sig) => {
          setLoiSignature(sig)
          setShowSignModal(false)
        }}
      />
    </main>
  )
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      style={{
        backgroundColor: C.bg2,
        border: `1px solid ${C.bg4}`,
        borderRadius: 14,
        padding: 24,
        marginBottom: 18,
      }}
    >
      <header
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          fontSize: 13, fontWeight: 800, color: "#fff", marginBottom: 14,
        }}
      >
        <span style={{ color: C.emL }}>{icon}</span>
        {title}
      </header>
      {children}
    </section>
  )
}

function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억원`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만원`
  return `${n.toLocaleString("ko-KR")}원`
}
