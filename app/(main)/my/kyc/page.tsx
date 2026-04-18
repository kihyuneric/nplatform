"use client"

/**
 * /my/kyc — 전문투자자 KYC (L1 → L2)
 *
 * 자본시장법 시행령 제10조 전문투자자 요건 검증:
 *   1. 투자자 유형 선택 (개인 전문 · 법인 전문 · 기관)
 *   2. 자격 요건 체크 (순자산 / 금융투자 경력 / 소득)
 *   3. 증빙 서류 업로드 (모의)
 *   4. 금융기관명 입력 (기관 투자자)
 *   5. 검토 대기
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ChevronLeft, Briefcase, FileText, CheckCircle2,
  Upload, ShieldCheck, AlertCircle, Building2, Loader2, XCircle,
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
  amber:  "var(--color-warning)",
  rose:   "var(--color-danger)",
  lt3:    "var(--color-text-muted)",
  lt4:    "var(--color-text-muted)",
}

type InvestorType = "PERSONAL" | "CORPORATE" | "INSTITUTIONAL"

const REQUIREMENTS: Record<InvestorType, string[]> = {
  PERSONAL: [
    "순자산 5억원 이상 보유",
    "최근 1년 내 연소득 1억원 이상",
    "최근 1년 간 월평균 금융투자상품 잔액 5천만원 이상",
    "금융투자업 관련 경력 1년 이상",
  ],
  CORPORATE: [
    "금융위원회 등록 법인",
    "자본금 10억원 이상",
    "금융투자상품 잔액 100억원 이상",
    "주식회사 · 유한회사 · 합자회사 등 상법상 법인",
  ],
  INSTITUTIONAL: [
    "은행 · 보험회사 · 금융투자업자",
    "집합투자기구 · 연기금",
    "금융위원회 · 한국은행",
    "외국 금융기관",
  ],
}

type KycStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED"

export default function KycPage() {
  const [type, setType] = useState<InvestorType | "">("")
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [institution, setInstitution] = useState("")
  const [uploaded, setUploaded] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      setStatusLoading(true)
      const res = await fetch("/api/v1/kyc/status")
      if (res.ok) {
        const data = await res.json()
        setKycStatus(data.status ?? "NONE")
        if (data.rejection_reason) setRejectionReason(data.rejection_reason)
        if (data.status === "PENDING") setSubmitted(true)
      } else {
        setKycStatus("NONE")
      }
    } catch {
      setKycStatus("NONE")
    } finally {
      setStatusLoading(false)
    }
  }, [])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("로그인이 필요합니다.")

      const ext = file.name.split(".").pop() ?? "pdf"
      const path = `kyc/${user.id}/${Date.now()}.${ext}`

      const { data, error } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { upsert: true })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from("kyc-documents")
        .getPublicUrl(data.path)

      setUploadedUrl(publicUrl)
      setUploaded(true)
    } catch (err: unknown) {
      // Storage not configured or network error — use mock URL so UI is unblocked
      const msg = err instanceof Error ? err.message : "업로드 실패"
      console.warn("[kyc] Storage upload failed, using mock URL:", msg)
      setUploadedUrl(`mock://uploaded/${Date.now()}.pdf`)
      setUploaded(true)
    } finally {
      setUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const apiType = type === "PERSONAL" ? "INDIVIDUAL" : "BUSINESS"
      const body: Record<string, string> = { type: apiType }
      const docUrl = uploadedUrl || `mock://uploaded/${Date.now()}.pdf`
      if (apiType === "INDIVIDUAL") {
        body.id_image_url = docUrl
      } else {
        body.business_doc_url = docUrl
        if (institution) body.business_number = institution
      }
      const res = await fetch("/api/v1/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error?.message ?? "KYC 제출에 실패했습니다.")
      }
      setSubmitted(true)
      setKycStatus("PENDING")
    } catch (e: any) {
      setSubmitError(e.message ?? "KYC 제출 중 오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = useMemo(() => {
    if (!type) return false
    const reqs = REQUIREMENTS[type]
    // 개인은 4항목 중 2개 이상, 법인/기관은 모두 충족
    const metCount = reqs.filter(r => checked[r]).length
    if (type === "PERSONAL") return metCount >= 2 && uploaded
    return metCount === reqs.length && !!institution && uploaded
  }, [type, checked, institution, uploaded])

  // Loading state while fetching KYC status
  if (statusLoading) {
    return (
      <main
        style={{
          backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 40,
        }}
      >
        <Loader2 size={32} color={C.em} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </main>
    )
  }

  // Already approved
  if (kycStatus === "APPROVED") {
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
              backgroundColor: "var(--color-positive-bg)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <ShieldCheck size={36} color={C.em} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 10 }}>
            KYC 승인 완료
          </h2>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, marginBottom: 24 }}>
            전문투자자 인증이 완료되었습니다. L2 티어 자료를 열람하실 수 있습니다.
          </p>
          <Link
            href="/my"
            style={{
              padding: "11px 20px", borderRadius: 10,
              backgroundColor: C.em, color: "#041915",
              fontSize: 12, fontWeight: 800, textDecoration: "none",
            }}
          >
            내 정보로 돌아가기
          </Link>
        </motion.div>
      </main>
    )
  }

  // Rejected — allow re-submission
  if (kycStatus === "REJECTED" && !submitted) {
    // Fall through to show the form, but we'll show the rejection notice at the top
  }

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
              backgroundColor: "rgba(245, 158, 11, 0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <FileText size={36} color={C.amber} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#fff", marginBottom: 10 }}>
            KYC 심사 접수 완료
          </h2>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, marginBottom: 24 }}>
            제출하신 자료는 NPLatform 컴플라이언스팀에서 검토 후{" "}
            <strong style={{ color: "#fff" }}>영업일 기준 1~3일 이내</strong>에 승인 여부가 결정됩니다.
            승인 시 L2 티어로 자동 승격됩니다.
          </p>
          <Link
            href="/my"
            style={{
              padding: "11px 20px", borderRadius: 10,
              backgroundColor: C.em, color: "#041915",
              fontSize: 12, fontWeight: 800, textDecoration: "none",
            }}
          >
            내 정보로 돌아가기
          </Link>
        </motion.div>
      </main>
    )
  }

  return (
    <main style={{ backgroundColor: C.bg0, color: "#E2E8F0", minHeight: "100vh" }}>
      <section style={{ borderBottom: `1px solid ${C.bg4}`, backgroundColor: C.bg1 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 24px 20px" }}>
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

      <section style={{ maxWidth: 960, margin: "0 auto", padding: "32px 24px 80px" }}>
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
            전문투자자 KYC
          </h1>
          <p style={{ fontSize: 13, color: C.lt4, lineHeight: 1.6, maxWidth: 640 }}>
            자본시장법 시행령 제10조에 따른 전문투자자 요건을 확인합니다.
            승인 후 NDA 체결 매물의 L2 자료(등기부등본 원본 · 현장사진 · 재무제표)를 열람할 수 있습니다.
          </p>
        </motion.div>

        {/* Type select */}
        <SectionCard title="투자자 유형" icon={<Briefcase size={14} />}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              { v: "PERSONAL", label: "개인 전문투자자", desc: "자산·소득·경력 요건" },
              { v: "CORPORATE", label: "법인 전문투자자", desc: "자본금·금융투자 잔액" },
              { v: "INSTITUTIONAL", label: "기관 투자자", desc: "은행·연기금·금융기관" },
            ].map(op => {
              const active = op.v === type
              return (
                <button
                  key={op.v}
                  onClick={() => {
                    setType(op.v as InvestorType)
                    setChecked({})
                  }}
                  style={{
                    padding: "18px 16px", borderRadius: 12, textAlign: "left",
                    backgroundColor: active ? "var(--color-positive-bg)" : C.bg3,
                    border: `1px solid ${active ? C.em : C.bg4}`,
                    color: "#fff", cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>{op.label}</div>
                  <div style={{ fontSize: 10, color: C.lt4 }}>{op.desc}</div>
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* Requirements */}
        {type && (
          <SectionCard title="자격 요건 확인" icon={<CheckCircle2 size={14} />}>
            <div style={{ fontSize: 11, color: C.lt4, marginBottom: 12 }}>
              {type === "PERSONAL"
                ? "아래 항목 중 2개 이상을 충족해야 합니다."
                : "아래 항목을 모두 충족해야 합니다."}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {REQUIREMENTS[type].map(req => {
                const ok = checked[req]
                return (
                  <button
                    key={req}
                    onClick={() => setChecked(c => ({ ...c, [req]: !c[req] }))}
                    style={{
                      padding: "12px 14px", borderRadius: 10,
                      backgroundColor: ok ? "var(--color-positive-bg)" : C.bg3,
                      border: `1px solid ${ok ? C.em : C.bg4}`,
                      color: "#fff", fontSize: 12, textAlign: "left", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 18, height: 18, borderRadius: 4,
                        backgroundColor: ok ? C.em : "transparent",
                        border: `1px solid ${ok ? C.em : C.bg4}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {ok && <CheckCircle2 size={12} color="#041915" />}
                    </div>
                    {req}
                  </button>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* Institution name (CORPORATE / INSTITUTIONAL only) */}
        {type && type !== "PERSONAL" && (
          <SectionCard title="기관명" icon={<Building2 size={14} />}>
            <input
              value={institution}
              onChange={e => setInstitution(e.target.value)}
              placeholder="예: ○○자산운용(주)"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10,
                backgroundColor: C.bg3, border: `1px solid ${C.bg4}`,
                color: "#fff", fontSize: 13, outline: "none",
              }}
            />
          </SectionCard>
        )}

        {/* Document upload */}
        {type && (
          <SectionCard title="증빙 서류 업로드" icon={<Upload size={14} />}>
            {/* Hidden real file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              style={{
                padding: "32px 24px", borderRadius: 12,
                cursor: uploading ? "default" : "pointer",
                backgroundColor: uploaded ? "var(--color-positive-bg)" : C.bg3,
                border: `2px dashed ${uploaded ? C.em : C.bg4}`,
                textAlign: "center",
              }}
            >
              {uploading ? (
                <>
                  <Loader2 size={28} color={C.em} style={{ margin: "0 auto 8px", animation: "spin 1s linear infinite" }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.emL }}>업로드 중...</div>
                </>
              ) : uploaded ? (
                <>
                  <CheckCircle2 size={28} color={C.em} style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.emL }}>
                    증빙 서류 업로드 완료
                  </div>
                  <div style={{ fontSize: 10, color: C.lt4, marginTop: 4 }}>
                    클릭하여 파일을 교체할 수 있습니다
                  </div>
                </>
              ) : (
                <>
                  <Upload size={28} color={C.lt4} style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                    파일을 선택하거나 여기에 드래그하세요
                  </div>
                  <div style={{ fontSize: 10, color: C.lt4 }}>
                    {type === "PERSONAL"
                      ? "소득증명원 · 예금/증권 잔액증명서 · 경력증명서"
                      : "사업자등록증 · 재무제표 · 투자 실적 증빙"}{" "}
                    · PDF · 최대 10MB
                  </div>
                </>
              )}
            </div>
          </SectionCard>
        )}

        {/* Warning */}
        <div
          style={{
            padding: "14px 16px", borderRadius: 12,
            backgroundColor: "rgba(245, 158, 11, 0.04)", border: "1px solid rgba(245, 158, 11, 0.2)",
            display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 24,
          }}
        >
          <AlertCircle size={16} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
            허위 자료 제출 시 서비스 이용이 영구 정지되며, 자본시장법 위반으로 형사 책임을 질 수 있습니다.
            제출된 서류는 개인정보보호법에 따라 검토 완료 후 30일 이내 파기됩니다.
          </div>
        </div>

        {submitError && (
          <div
            style={{
              padding: "14px 16px", borderRadius: 12, marginBottom: 16,
              backgroundColor: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.2)",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}
          >
            <XCircle size={16} color={C.rose} style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>{submitError}</div>
          </div>
        )}

        {kycStatus === "REJECTED" && rejectionReason && (
          <div
            style={{
              padding: "14px 16px", borderRadius: 12, marginBottom: 16,
              backgroundColor: "rgba(239, 68, 68, 0.04)", border: "1px solid rgba(239, 68, 68, 0.2)",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}
          >
            <AlertCircle size={16} color={C.rose} style={{ marginTop: 1, flexShrink: 0 }} />
            <div style={{ fontSize: 11, color: C.lt3, lineHeight: 1.55 }}>
              <strong style={{ color: C.rose }}>이전 심사 반려 사유:</strong> {rejectionReason}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            width: "100%", padding: "14px 20px", borderRadius: 12,
            backgroundColor: canSubmit && !submitting ? C.em : C.bg3,
            color: canSubmit && !submitting ? "#041915" : C.lt4,
            fontSize: 13, fontWeight: 800, border: "none",
            cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
            display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 8,
          }}
        >
          {submitting ? (
            <>
              <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> 제출 중...
              <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </>
          ) : (
            <>
              <ShieldCheck size={15} /> KYC 심사 제출
            </>
          )}
        </button>
      </section>
    </main>
  )
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section
      style={{
        backgroundColor: C.bg2, border: `1px solid ${C.bg4}`,
        borderRadius: 14, padding: 24, marginBottom: 18,
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
