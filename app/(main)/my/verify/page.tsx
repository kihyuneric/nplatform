"use client"

/**
 * /my/verify — 본인인증 (L0 → L1)
 *
 * 4가지 인증 옵션: NICE PASS · 공동인증서 · 금융인증서 · 간편인증
 * 인증 완료 시 L1 필드 (등기 요약 · 임대차 요약 · 감정평가서 마스킹본) 열람 권한
 */

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft, ShieldCheck, Smartphone, FileText, Key,
  CheckCircle2, Lock, UserCheck, FlaskConical,
} from "lucide-react"
import { TierBadge } from "@/components/tier/tier-badge"
import { createClient } from "@/lib/supabase/client"

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
  lt3:    "var(--color-text-muted)",
  lt4:    "var(--color-text-muted)",
}

const METHODS = [
  { id: "pass", label: "NICE 패스", desc: "통신사 인증 (3초 이내)", icon: Smartphone, popular: true },
  { id: "joint", label: "공동인증서", desc: "구 공인인증서", icon: Key },
  { id: "finance", label: "금융인증서", desc: "은행·증권사 연동", icon: FileText },
  { id: "simple", label: "간편인증", desc: "카카오·네이버·토스", icon: Smartphone },
]

export default function VerifyPage() {
  const [step, setStep] = useState<"select" | "processing" | "done">("select")
  const [method, setMethod] = useState("")

  async function start(id: string) {
    setMethod(id)
    setStep("processing")
    // Simulate external auth provider round-trip
    await new Promise(r => setTimeout(r, 1600))
    // Update identity_verified in Supabase so L0→L1 upgrade takes effect
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from("users")
          .update({ identity_verified: true, updated_at: new Date().toISOString() })
          .eq("id", user.id)
      }
    } catch {
      // Verification UI completes regardless of DB update
    }
    setStep("done")
  }

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      <section style={{ borderBottom: `1px solid ${C.bg4}`, backgroundColor: C.bg1 }}>
        <div style={{ maxWidth: 880, margin: "0 auto", padding: "24px 24px 20px" }}>
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

      <section style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px 80px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 32 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <TierBadge tier="L1" variant="soft" size="sm" />
            <span style={{ fontSize: 11, color: C.lt4 }}>L0 → L1 승격</span>
            {/* 시뮬레이션 모드 배지 */}
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 9, fontWeight: 800, letterSpacing: "0.04em",
                padding: "3px 8px", borderRadius: 4,
                backgroundColor: "#F59E0B1A", color: "#F59E0B",
                border: "1px solid #F59E0B44",
              }}
            >
              <FlaskConical size={9} /> 데모 모드
            </span>
          </div>
          <h1
            style={{
              fontSize: 30, fontWeight: 900, color: "#fff",
              letterSpacing: "-0.02em", marginBottom: 8,
            }}
          >
            본인인증
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 600 }}>
            본인인증을 완료하면 <strong style={{ color: "#fff" }}>등기부등본 요약 · 임대차 요약 · 감정평가서 마스킹본</strong> 등
            L1 자료 열람이 가능합니다. 인증 정보는 NPLatform에 저장되지 않으며,
            인증기관에서만 처리됩니다.
          </p>
        </motion.div>

        {step === "select" && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
              {METHODS.map(m => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => start(m.id)}
                    style={{
                      padding: "20px 22px", borderRadius: 14, textAlign: "left",
                      backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
                      color: "#fff", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 16,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: 10,
                        backgroundColor: "rgba(45, 116, 182, 0.12)", border: "1px solid rgba(45, 116, 182, 0.27)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={20} color={C.blueL} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: C.lt4 }}>{m.desc}</div>
                    </div>
                    {m.popular && (
                      <span
                        style={{
                          position: "absolute", top: 12, right: 14,
                          fontSize: 9, fontWeight: 800,
                          padding: "3px 7px", borderRadius: 4,
                          backgroundColor: "var(--color-positive-bg)", color: C.emL,
                          border: "1px solid var(--color-positive-border)",
                        }}
                      >
                        추천
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div
              style={{
                marginTop: 24, padding: "14px 16px", borderRadius: 12,
                backgroundColor: "rgba(45, 116, 182, 0.04)", border: "1px solid rgba(45, 116, 182, 0.2)",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <ShieldCheck size={16} color={C.blueL} style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
                NPLatform은 개인정보보호법 제22조에 따라 필요 최소한의 정보(이름 · 생년월일 · 성별)만 수집하며,
                주민등록번호 · 휴대폰 번호는 저장하지 않습니다. 인증 처리는 NICE평가정보를 통해 이뤄집니다.
              </div>
            </div>
          </>
        )}

        {step === "processing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              padding: 60, borderRadius: 16,
              backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 64, height: 64, borderRadius: "50%",
                backgroundColor: "rgba(45, 116, 182, 0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              <Lock size={28} color={C.blueL} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              {METHODS.find(m => m.id === method)?.label} 인증 처리 중...
            </div>
            <div style={{ fontSize: 12, color: C.lt4 }}>잠시만 기다려주세요</div>
            {/* 시뮬레이션 안내 */}
            <div
              style={{
                marginTop: 20, padding: "10px 14px", borderRadius: 8,
                backgroundColor: "#F59E0B0A", border: "1px solid #F59E0B33",
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: 11, color: "#F59E0B",
              }}
            >
              <FlaskConical size={12} />
              데모 모드 — 실제 NICE / 카카오 / 토스 연동 전 시뮬레이션입니다
            </div>
          </motion.div>
        )}

        {step === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              padding: 48, borderRadius: 16,
              backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 72, height: 72, borderRadius: "50%",
                backgroundColor: "var(--color-positive-bg)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}
            >
              <CheckCircle2 size={36} color={C.em} />
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 10 }}>
              본인인증 완료
            </h2>
            <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, marginBottom: 16 }}>
              L1 티어로 승격되었습니다. 이제 등기부등본 요약 · 임대차 요약 · 감정평가서 마스킹본을 열람할 수 있습니다.
            </p>
            {/* 시뮬레이션 완료 안내 */}
            <div
              style={{
                marginBottom: 20, padding: "10px 14px", borderRadius: 8,
                backgroundColor: "#F59E0B0A", border: "1px solid #F59E0B33",
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: 11, color: "#F59E0B",
              }}
            >
              <FlaskConical size={12} />
              데모 완료 — 실서비스에서는 NICE / 카카오 / 토스 실명 인증이 적용됩니다
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Link
                href="/exchange"
                style={{
                  padding: "11px 20px", borderRadius: 10,
                  backgroundColor: C.em, color: "#041915",
                  fontSize: 12, fontWeight: 800, textDecoration: "none",
                }}
              >
                매물 탐색
              </Link>
              <Link
                href="/my/kyc"
                style={{
                  padding: "11px 20px", borderRadius: 10,
                  backgroundColor: C.bg3, color: "#fff",
                  fontSize: 12, fontWeight: 700, textDecoration: "none",
                  border: `1px solid ${C.bg4}`,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <UserCheck size={14} /> 전문투자자 KYC로 계속
              </Link>
            </div>
          </motion.div>
        )}
      </section>
    </main>
  )
}
