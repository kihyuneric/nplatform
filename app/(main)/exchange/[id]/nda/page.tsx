"use client"

/**
 * /exchange/[id]/nda — NDA 체결 페이지 (v4, 2026-04-07)
 *
 * 목적: L1 → L2 승격
 *   - 전문투자자 확인
 *   - NDA 조항 열람 및 동의
 *   - 서명 (텍스트 기반 모의 서명)
 *   - 체결 완료 → 상세 페이지 L2 접근 허용
 */

import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ChevronLeft, FileSignature, ShieldCheck, AlertTriangle,
  CheckCircle2, Lock, Eye,
} from "lucide-react"
import { TierBadge } from "@/components/tier/tier-badge"

const C = {
  bg0: "#030810", bg1: "#050D1A", bg2: "#080F1E",
  bg3: "#0A1628", bg4: "#0F1F35",
  em: "#10B981", emL: "#10B981",
  blue: "#2E75B6", blueL: "#3B82F6",
  rose: "#EF4444", amber: "#F59E0B",
  lt3: "#64748B", lt4: "#475569",
}

const NDA_CLAUSES = [
  {
    title: "1조 (비밀정보의 정의)",
    body:
      "본 NDA 체결 후 열람 가능한 매물 상세 정보(등기부등본 원본, 임대차 계약 상세, 현장사진, 재무제표, 채무자 관련 정보 일체)는 비밀정보로 규정한다.",
  },
  {
    title: "2조 (비밀 유지 의무)",
    body:
      "수령자는 비밀정보를 NPL 투자 검토 목적으로만 사용하며, 제3자에게 누설·복제·배포하지 않는다. 단, 투자 자문 법인·법무법인 등 법적 보호 관계에 있는 전문가는 예외로 한다.",
  },
  {
    title: "3조 (개인정보 보호)",
    body:
      "열람한 정보 중 개인정보보호법 · 신용정보법에 따라 보호되는 정보는 수령자의 책임 하에 안전하게 관리하며, 검토 종료 후 즉시 파기한다.",
  },
  {
    title: "4조 (열람 이력 로깅)",
    body:
      "모든 열람 행위는 PII Access Log에 기록되며, 비정상 접근 패턴(대량 다운로드, 반복 조회 등)은 DPO에게 자동 통보되어 조사 대상이 된다.",
  },
  {
    title: "5조 (위반 시 책임)",
    body:
      "본 NDA 위반 시 NPLatform 및 매도자에게 발생한 모든 손해를 배상하며, 개인정보보호법 · 신용정보법 위반 시 관련 법령에 따른 형사 · 민사 책임을 진다.",
  },
  {
    title: "6조 (유효 기간)",
    body:
      "본 NDA는 체결일로부터 3년간 유효하며, 이후에도 비밀정보에 대한 비밀 유지 의무는 계속 유지된다.",
  },
]

export default function NdaPage() {
  const params = useParams()
  const router = useRouter()
  const id = (params?.id as string) ?? "npl-2026-0412"

  const [qualified, setQualified] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState("")
  const [signed, setSigned] = useState(false)

  const canSign = qualified && agreed && signature.trim().length >= 2

  function handleSign() {
    if (!canSign) return
    setSigned(true)
  }

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      {/* ── Top ───────────────────────────────── */}
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
        {signed ? (
          <SignedScreen id={id} />
        ) : (
          <>
            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              style={{ marginBottom: 32 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <TierBadge tier="L2" variant="soft" size="sm" />
                <span style={{ fontSize: 11, color: C.lt4 }}>L1 → L2 승격</span>
              </div>
              <h1
                style={{
                  fontSize: 30, fontWeight: 900, color: "#fff",
                  letterSpacing: "-0.02em", marginBottom: 8,
                }}
              >
                비밀유지계약서 (NDA)
              </h1>
              <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 640 }}>
                본 NDA 체결 후 <strong style={{ color: "#fff" }}>등기부등본 원본 · 현장사진 · 임대차 상세 · 재무제표</strong>
                등 L2 자료 열람이 가능합니다. 모든 열람 이력은 PII Access Log에 기록됩니다.
              </p>
              <div style={{ fontSize: 11, color: C.lt4, marginTop: 8, fontFamily: "monospace" }}>
                대상 매물: {id}
              </div>
            </motion.div>

            {/* Qualified investor check */}
            <SectionCard title="전문투자자 확인" icon={<ShieldCheck size={14} />}>
              <div style={{ fontSize: 12, color: C.lt3, lineHeight: 1.6, marginBottom: 14 }}>
                자본시장법 시행령 제10조에 따른 전문투자자 요건을 충족하는지 확인해주세요.
                (금융기관 · 연기금 · 금융위 등록 투자자문업자 · 순자산 100억 이상 법인 등)
              </div>
              <Toggle
                value={qualified}
                onChange={setQualified}
                label="전문투자자 요건을 충족하며, 관련 증빙서류 제출에 동의합니다"
              />
            </SectionCard>

            {/* NDA clauses */}
            <SectionCard title="NDA 조항" icon={<FileSignature size={14} />}>
              <div
                style={{
                  maxHeight: 320, overflowY: "auto",
                  padding: "16px 18px", borderRadius: 10,
                  backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                  fontSize: 12, color: C.lt3, lineHeight: 1.7,
                }}
              >
                {NDA_CLAUSES.map((clause, i) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ color: "#fff", fontWeight: 800, marginBottom: 4 }}>{clause.title}</div>
                    <div>{clause.body}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                <Toggle
                  value={agreed}
                  onChange={setAgreed}
                  label="위 NDA 조항을 모두 읽고 동의합니다"
                />
              </div>
            </SectionCard>

            {/* Signature */}
            <SectionCard title="전자 서명" icon={<FileSignature size={14} />}>
              <div style={{ fontSize: 11, color: C.lt4, marginBottom: 8, fontWeight: 600 }}>
                서명자 성명 *
              </div>
              <input
                value={signature}
                onChange={e => setSignature(e.target.value)}
                placeholder="본인의 성명을 정확히 입력하세요"
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                  color: "#fff", fontSize: 14, outline: "none", fontFamily: "serif",
                  fontStyle: "italic",
                }}
              />
              <div style={{ marginTop: 8, fontSize: 10, color: C.lt4, lineHeight: 1.5 }}>
                전자서명법에 따른 공인인증서 기반 서명이 아닌 간이 서명입니다.
                실계약 시 별도의 공인 전자서명이 요구됩니다.
              </div>
            </SectionCard>

            {/* Warning */}
            <div
              style={{
                padding: "14px 16px", borderRadius: 12,
                backgroundColor: `${C.amber}0A`, border: `1px solid ${C.amber}33`,
                display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 24,
              }}
            >
              <AlertTriangle size={16} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
                NDA 체결 후 열람 행위는 PII Access Log에 기록되며, 비정상 패턴 감지 시 계정이 일시 정지될 수 있습니다.
                비밀정보의 부정 사용은 개인정보보호법 · 신용정보법 위반에 해당합니다.
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSign}
              disabled={!canSign}
              style={{
                width: "100%", padding: "14px 20px", borderRadius: 12,
                backgroundColor: canSign ? C.em : C.bg3,
                color: canSign ? "#041915" : C.lt4,
                fontSize: 13, fontWeight: 800, border: "none",
                cursor: canSign ? "pointer" : "not-allowed",
                display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8,
              }}
            >
              <FileSignature size={15} />
              NDA 체결하고 L2 자료 열람하기
            </button>
          </>
        )}
      </section>
    </main>
  )
}

function SignedScreen({ id }: { id: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        padding: 48, borderRadius: 20,
        backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 72, height: 72, borderRadius: "50%",
          backgroundColor: `${C.em}1F`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}
      >
        <CheckCircle2 size={36} color={C.em} />
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 10 }}>
        NDA 체결 완료
      </h2>
      <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, marginBottom: 24 }}>
        귀하의 티어가 <strong style={{ color: C.emL }}>L2</strong>로 승격되었습니다.
        이제 등기부등본 원본 · 현장사진 · 임대차 상세 등 L2 자료를 열람할 수 있습니다.
      </p>
      <div
        style={{
          padding: 16, borderRadius: 12,
          backgroundColor: `${C.em}0A`, border: `1px solid ${C.em}33`,
          marginBottom: 24,
        }}
      >
        <div style={{ fontSize: 11, color: C.lt4, marginBottom: 6 }}>체결 일시</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
          {new Date().toLocaleString("ko-KR")}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <Link
          href={`/exchange/${id}`}
          style={{
            padding: "11px 20px", borderRadius: 10,
            backgroundColor: C.em, color: "#041915",
            fontSize: 12, fontWeight: 800, textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <Eye size={14} /> L2 자료 열람
        </Link>
        <Link
          href={`/exchange/${id}/loi`}
          style={{
            padding: "11px 20px", borderRadius: 10,
            backgroundColor: C.bg3, color: "#fff",
            fontSize: 12, fontWeight: 700, textDecoration: "none",
            border: `1px solid ${C.bg4}`,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <Lock size={14} /> LOI 제출하고 L3 데이터룸
        </Link>
      </div>
    </motion.div>
  )
}

function SectionCard({
  title, icon, children,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
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

function Toggle({
  value, onChange, label,
}: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 14px", borderRadius: 10,
        backgroundColor: value ? `${C.em}0E` : C.bg3,
        border: `1px solid ${value ? C.em : C.bg4}`,
        color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 20, height: 20, borderRadius: 4,
          backgroundColor: value ? C.em : "transparent",
          border: `1px solid ${value ? C.em : C.bg4}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {value && <CheckCircle2 size={14} color="#041915" />}
      </div>
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  )
}
