/**
 * AccessModals — 투자자 인증 / NDA / LOI 모달 (DR-24 · 2026-04-26)
 *
 * 세 가지 게이트 단계 모달을 한 파일에 통합:
 *   1. InvestorVerifyModal — 사업자등록증/명함 제출 현황 + 관리자 승인 상태 (전역, 1회)
 *   2. NdaModal              — 채권별 NDA 제출 현황 + 매각사 승인 상태 (per-listing)
 *   3. LoiModal              — 채권별 LOI 제출 현황 + 매각사 승인 상태 (per-listing)
 *
 * 공통 패턴:
 *   - 좌측: 제출/승인 현황 타임라인
 *   - 우측: 제출 폼
 *   - 이미 승인된 회원이면 부모 컴포넌트에서 모달 자체를 호출하지 않는다
 *     (이 모달은 'pending/rejected/none' 상태에서만 노출)
 *
 * 트래킹:
 *   - 매도자 대시보드: /my/agreements (NDA/LOI 양측 트랙)
 *   - 관리자 화면: /admin/agreements (전체)
 *   - 투자자 인증: /admin/users (KYC 승인)
 */

"use client"

import { useState, useEffect } from "react"
import { SignaturePad } from "@/components/agreements/signature-pad"
import {
  X, Shield, FileSignature, FileCheck, CheckCircle2, Clock, AlertCircle,
  Upload, Briefcase, FileText, Building2, ExternalLink,
} from "lucide-react"
import Link from "next/link"

/* ═══════════════════════════════════════════════════════════════════════════
   공통 — Status / Stepper / Shell
   ═══════════════════════════════════════════════════════════════════════════ */

export type ApprovalStatus = "none" | "submitted" | "pending" | "approved" | "rejected"

export interface SubmittedDoc {
  /** 문서 라벨 (예: "사업자등록증", "명함") */
  label: string
  /** 제출 여부 */
  submitted: boolean
  /** 파일명 또는 메모 (제출됨일 때 표시) */
  filename?: string
  /** 제출 일시 (YYYY-MM-DD) */
  submittedAt?: string
}

const C = {
  ink: "#0A1628",
  inkDeep: "#051C2C",
  paper: "#FFFFFF",
  paperTint: "#FAFBFC",
  /** 맥킨지 시그니처 cobalt → electric blue 로 통일 */
  cobalt: "#2251FF",
  cobaltDark: "#1A47CC",
  cobaltLight: "#A8CDE8",
  border: "rgba(10, 22, 40, 0.10)",
  borderStrong: "rgba(10, 22, 40, 0.18)",
  textSub: "#4A5568",
  textMuted: "#718096",
  positive: "#0F766E",
  positiveBg: "rgba(15, 118, 110, 0.10)",
  warn: "#92400E",
  warnBg: "rgba(146, 64, 14, 0.10)",
  danger: "#B91C1C",
  dangerBg: "rgba(185, 28, 28, 0.10)",
} as const

/** 작은 상태 칩 — submitted/pending/approved/rejected */
function StatusChip({ status }: { status: ApprovalStatus }) {
  const map: Record<ApprovalStatus, { label: string; bg: string; fg: string; icon: React.ReactNode }> = {
    none:      { label: "미제출",   bg: "rgba(148, 163, 184, 0.18)", fg: "#475569", icon: <AlertCircle size={11} /> },
    submitted: { label: "제출 완료", bg: C.positiveBg,                fg: C.positive, icon: <CheckCircle2 size={11} /> },
    pending:   { label: "검토 중",   bg: C.warnBg,                    fg: C.warn,    icon: <Clock size={11} /> },
    approved:  { label: "승인 완료", bg: C.positiveBg,                fg: C.positive, icon: <CheckCircle2 size={11} /> },
    rejected:  { label: "반려됨",    bg: C.dangerBg,                  fg: C.danger,  icon: <AlertCircle size={11} /> },
  }
  const m = map[status]
  return (
    <span
      className="inline-flex items-center gap-1"
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        padding: "3px 7px",
        background: m.bg,
        color: m.fg,
        border: `1px solid ${m.fg === "#475569" ? "rgba(71, 85, 105, 0.35)" : m.fg}`,
        borderRadius: 0,
      }}
    >
      {m.icon}
      {m.label}
    </span>
  )
}

/** 단계 타임라인 — 제출 → 검토 → 승인 */
function ApprovalTimeline({
  steps,
}: {
  steps: { label: string; status: ApprovalStatus; meta?: string }[]
}) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const done = s.status === "submitted" || s.status === "approved"
        const active = s.status === "pending"
        const failed = s.status === "rejected"
        const dotBg = done ? C.positive : active ? C.warn : failed ? C.danger : "#CBD5E1"
        return (
          <li key={i} className="flex items-start gap-3">
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: dotBg,
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                marginTop: 2,
              }}
            >
              {done ? "✓" : failed ? "!" : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span style={{ fontSize: 12.5, fontWeight: 700, color: C.ink }}>{s.label}</span>
                <StatusChip status={s.status} />
              </div>
              {s.meta && (
                <p style={{ fontSize: 11, fontWeight: 500, color: C.textMuted, marginTop: 2 }}>
                  {s.meta}
                </p>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

interface ModalShellProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle: string
  icon: React.ReactNode
  children: React.ReactNode
  /** 푸터 — 제출 버튼 등 */
  footer: React.ReactNode
  /** 우상단 안내 링크 (예: 마이 페이지로 이동) */
  trackingHref?: string
  trackingLabel?: string
}

function ModalShell({
  open, onClose, title, subtitle, icon, children, footer, trackingHref, trackingLabel,
}: ModalShellProps) {
  // ESC close
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 90,
        background: "rgba(5, 28, 44, 0.55)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: C.paper,
          borderTop: `3px solid ${C.cobalt}`,
          width: "100%",
          maxWidth: 720,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          boxShadow: "0 24px 60px rgba(5, 28, 44, 0.30)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4"
          style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${C.border}` }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 36, height: 36,
                background: C.inkDeep, color: C.cobaltLight,
              }}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <h2
                style={{
                  fontSize: 16, fontWeight: 800,
                  color: C.ink, letterSpacing: "-0.01em",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  marginBottom: 4,
                }}
              >
                {title}
              </h2>
              <p style={{ fontSize: 12, fontWeight: 500, color: C.textSub, lineHeight: 1.45 }}>
                {subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{
              flexShrink: 0,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: C.textMuted,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 24px 8px" }}>{children}</div>

        {/* Tracking link */}
        {trackingHref && trackingLabel && (
          <div
            style={{
              padding: "10px 24px",
              background: C.paperTint,
              borderTop: `1px solid ${C.border}`,
            }}
          >
            <Link
              href={trackingHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11.5,
                fontWeight: 700,
                color: C.cobalt,
                textDecoration: "none",
              }}
            >
              <ExternalLink size={12} />
              {trackingLabel}
            </Link>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px 20px",
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          {footer}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. InvestorVerifyModal — 사업자등록증/명함 (전역, 1회)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface InvestorVerifyState {
  /** 전반 승인 상태 */
  status: ApprovalStatus
  /** 회원가입 시 제출한 사업자등록증 */
  businessLicense: SubmittedDoc
  /** 회원가입 시 제출한 명함 */
  businessCard: SubmittedDoc
  /** 검토 메모 (반려 사유 등) */
  reviewNote?: string
  /** 마지막 갱신 시각 */
  updatedAt?: string
}

export interface InvestorVerifyModalProps {
  open: boolean
  onClose: () => void
  state: InvestorVerifyState
  /** 추가 자료 제출 (반려/미제출 시) */
  onSubmit?: () => void
}

export function InvestorVerifyModal({ open, onClose, state, onSubmit }: InvestorVerifyModalProps) {
  const canSubmit = state.status === "none" || state.status === "rejected"
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="투자자 인증"
      subtitle="회원가입 시 제출한 사업자등록증 · 명함을 관리자가 검토 중입니다. 승인 완료 시 모든 매물의 L1 자료가 즉시 열립니다."
      icon={<Shield size={18} />}
      trackingHref="/my/kyc"
      trackingLabel="마이 페이지에서 인증 진행 상황 확인"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              fontSize: 12,
              fontWeight: 700,
              color: C.ink,
              background: C.paper,
              border: `1px solid ${C.borderStrong}`,
              cursor: "pointer",
            }}
          >
            닫기
          </button>
          {canSubmit && onSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              style={{
                padding: "10px 18px",
                fontSize: 12,
                fontWeight: 800,
                color: C.paper,
                background: C.cobalt,
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Upload size={12} style={{ color: C.paper }} />
              <span style={{ color: C.paper }}>
                {state.status === "rejected" ? "재제출" : "추가 자료 제출"}
              </span>
            </button>
          )}
        </>
      }
    >
      {/* 제출 자료 현황 */}
      <section style={{ marginBottom: 18 }}>
        <h3
          style={{
            fontSize: 11.5, fontWeight: 800, color: C.ink,
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10,
          }}
        >
          제출 자료
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <DocCard label="사업자등록증" doc={state.businessLicense} icon={<Building2 size={14} />} />
          <DocCard label="명함" doc={state.businessCard} icon={<Briefcase size={14} />} />
        </div>
      </section>

      {/* 승인 진행 */}
      <section style={{ marginBottom: 18 }}>
        <h3
          style={{
            fontSize: 11.5, fontWeight: 800, color: C.ink,
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10,
          }}
        >
          관리자 검토
        </h3>
        <ApprovalTimeline
          steps={[
            {
              label: "자료 제출",
              status:
                state.businessLicense.submitted && state.businessCard.submitted
                  ? "submitted" : "none",
              meta: state.updatedAt ? `최근 업데이트 ${state.updatedAt}` : undefined,
            },
            {
              label: "관리자 검토",
              status:
                state.status === "approved" ? "approved" :
                state.status === "rejected" ? "rejected" :
                state.status === "pending" || state.status === "submitted" ? "pending" : "none",
              meta: state.reviewNote,
            },
            {
              label: "투자자 인증 완료",
              status: state.status === "approved" ? "approved" : "none",
              meta: state.status === "approved" ? "전 매물 L1 자료 열람 가능" : "승인 후 자동 활성화",
            },
          ]}
        />
      </section>
    </ModalShell>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   2. NdaModal — 채권별 NDA (per-listing)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface NdaState {
  /** 본 매물에 대한 NDA 승인 상태 */
  status: ApprovalStatus
  /** NDA 전자서명 제출 일시 */
  submittedAt?: string
  /** 매각사 승인/반려 일시 */
  reviewedAt?: string
  /** 매각사명 (마스킹 적용된 표시용) */
  sellerName?: string
  /** 검토 메모 */
  reviewNote?: string
}

export interface NdaModalProps {
  open: boolean
  onClose: () => void
  listingTitle: string
  listingId: string
  state: NdaState
  /** NDA 전자서명 — 서명자명 + 서명 이미지 dataURL + 동의여부 포함 */
  onSubmit?: (payload: { signerName: string; signatureDataUrl: string; clausesAccepted: boolean }) => void | Promise<void>
}

export function NdaModal({ open, onClose, listingTitle, listingId, state, onSubmit }: NdaModalProps) {
  const canSubmit = state.status === "none" || state.status === "rejected"
  const [agreed, setAgreed] = useState(false)
  const [signerName, setSignerName] = useState("")
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // 모달 열릴 때마다 reset
  useEffect(() => {
    if (open) {
      setAgreed(false)
      setSignerName("")
      setSignatureDataUrl(null)
      setSubmitError(null)
    }
  }, [open])

  const formValid = agreed && signerName.trim().length >= 2 && !!signatureDataUrl

  async function handleClick() {
    if (!onSubmit || !formValid) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit({ signerName: signerName.trim(), signatureDataUrl: signatureDataUrl!, clausesAccepted: agreed })
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : '제출 실패')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="NDA 체결"
      subtitle={`본 채권 “${listingTitle}” 에 대한 비밀유지계약(NDA)을 전자서명합니다. NDA 는 채권마다 매각사 승인이 필요합니다.`}
      icon={<FileSignature size={18} />}
      trackingHref="/my/agreements"
      trackingLabel="마이 페이지에서 NDA 진행 현황 확인"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              fontSize: 12,
              fontWeight: 700,
              color: C.ink,
              background: C.paper,
              border: `1px solid ${C.borderStrong}`,
              cursor: "pointer",
            }}
          >
            닫기
          </button>
          {canSubmit && onSubmit && (
            <button
              type="button"
              onClick={handleClick}
              disabled={!formValid || submitting}
              style={{
                padding: "10px 18px",
                fontSize: 12,
                fontWeight: 800,
                color: C.paper,
                background: C.cobalt,
                border: "none",
                borderTop: `2px solid ${C.paper}`,
                cursor: (!formValid || submitting) ? "not-allowed" : "pointer",
                opacity: (!formValid || submitting) ? 0.45 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FileSignature size={12} style={{ color: C.paper }} />
              <span style={{ color: C.paper }}>
                {submitting
                  ? "제출 중..."
                  : state.status === "rejected"
                    ? "재서명 · 재제출"
                    : "전자서명 · NDA 제출"}
              </span>
            </button>
          )}
        </>
      }
    >
      {/* 채권 정보 */}
      <section style={{ marginBottom: 16 }}>
        <div
          style={{
            background: C.paperTint,
            border: `1px solid ${C.border}`,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            대상 채권
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, marginBottom: 2 }}>{listingTitle}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: C.textMuted }}>딜 ID · {listingId}</div>
        </div>
      </section>

      {/* NDA 핵심 조항 요약 */}
      <section style={{ marginBottom: 16 }}>
        <h3
          style={{
            fontSize: 11.5, fontWeight: 800, color: C.ink,
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10,
          }}
        >
          NDA 핵심 조항
        </h3>
        <ul className="space-y-1.5" style={{ fontSize: 11.5, color: C.textSub, lineHeight: 1.5 }}>
          <li>• 비밀정보(등기부 원본·임대차 상세·현장사진·재무제표·채무자 정보)는 NPL 투자 검토 목적으로만 사용</li>
          <li>• 모든 열람 행위는 PII Access Log 기록, 비정상 접근 시 DPO 자동 통보</li>
          <li>• NDA 위반 시 손해 배상 + 개인정보보호법·신용정보법 책임</li>
          <li>• 본 NDA 유효기간 3년, 비밀유지 의무는 그 후에도 지속</li>
        </ul>
      </section>

      {/* NDA 6조항 전문 (스크롤 박스) */}
      <section style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 11.5, fontWeight: 800, color: C.ink, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
          NDA 조항 (전문)
        </h3>
        <div style={{
          background: C.paperTint,
          border: `1px solid ${C.border}`,
          borderTop: `2px solid ${C.cobalt}`,
          padding: "14px 16px",
          maxHeight: 220,
          overflowY: "auto",
        }}>
          <dl style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 11.5, color: C.textSub, lineHeight: 1.55 }}>
            {[
              ["1조 (비밀정보의 정의)", "본 NDA 체결 후 열람 가능한 매물 상세 정보(등기부등본 원본, 임대차 계약 상세, 현장사진, 재무제표, 채무자 관련 정보 일체)는 비밀정보로 규정한다."],
              ["2조 (비밀 유지 의무)", "수령자는 비밀정보를 NPL 투자 검토 목적으로만 사용하며, 제3자에게 누설·복제·배포하지 않는다. 단, 투자 자문 법인·법무법인 등 법적 보호 관계에 있는 전문가는 예외로 한다."],
              ["3조 (개인정보 보호)", "열람한 정보 중 개인정보보호법 · 신용정보법에 따라 보호되는 정보는 수령자의 책임 하에 안전하게 관리하며, 검토 종료 후 즉시 파기한다."],
              ["4조 (열람 이력 로깅)", "모든 열람 행위는 PII Access Log에 기록되며, 비정상 접근 패턴(대량 다운로드, 반복 조회 등)은 DPO에게 자동 통보되어 조사 대상이 된다."],
              ["5조 (위반 시 책임)", "본 NDA 위반 시 NPLatform 및 매도자에게 발생한 모든 손해를 배상하며, 개인정보보호법 · 신용정보법 위반 시 관련 법령에 따른 형사 · 민사 책임을 진다."],
              ["6조 (유효 기간)", "본 NDA는 체결일로부터 3년간 유효하며, 이후에도 비밀정보에 대한 비밀 유지 의무는 계속 유지된다."],
            ].map(([title, body]) => (
              <div key={title}>
                <dt style={{ fontWeight: 800, color: C.ink, marginBottom: 3 }}>{title}</dt>
                <dd>{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 동의 체크 + 서명자명 + 전자서명 캔버스 (Phase 2.5) */}
      <section style={{ marginBottom: 18 }}>
        <label className="flex items-start gap-2 mb-3" style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: 3, accentColor: C.cobalt }}
          />
          <span style={{ fontSize: 12, color: C.ink, fontWeight: 700, lineHeight: 1.5 }}>
            위 NDA 조항을 모두 읽고 동의합니다
          </span>
        </label>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 10, fontWeight: 800, color: C.cobalt, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>
            서명자 성명 <span style={{ color: C.cobalt }}>*</span>
          </label>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="본인의 성명을 정확히 입력하세요"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 13,
              background: C.paper,
              color: C.ink,
              border: `1px solid ${C.borderStrong}`,
              borderTop: `2px solid ${C.cobalt}`,
              outline: "none",
            }}
          />
        </div>
        <SignaturePad
          width={520}
          height={160}
          disabled={submitting}
          onChange={(d) => setSignatureDataUrl(d)}
        />
        <p style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5, marginTop: 8 }}>
          NPLatform 자체 전자서명 — 본 서명은 PDF 본문에 임베드되어 5년간 보관됩니다.
          IP·기기 정보가 함께 기록되어 위변조를 방지합니다.
        </p>
        {submitError && (
          <div style={{
            marginTop: 10, padding: "8px 12px",
            background: "rgba(220, 38, 38, 0.06)",
            border: "1px solid rgba(220, 38, 38, 0.30)",
            borderLeft: "3px solid #DC2626",
            fontSize: 11, color: "#991B1B",
          }}>
            {submitError}
          </div>
        )}
      </section>

      {/* 매각사 승인 진행 */}
      <section style={{ marginBottom: 18 }}>
        <h3
          style={{
            fontSize: 11.5, fontWeight: 800, color: C.ink,
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10,
          }}
        >
          진행 상황 — 매각사 검토
        </h3>
        <ApprovalTimeline
          steps={[
            {
              label: "NDA 전자서명",
              status:
                state.status === "none" ? "none" :
                state.status === "rejected" ? "submitted" : "submitted",
              meta: state.submittedAt ? `제출 ${state.submittedAt}` : "전자서명 후 매각사로 즉시 전송",
            },
            {
              label: `매각사 검토 (${state.sellerName ?? "매각사"})`,
              status:
                state.status === "approved" ? "approved" :
                state.status === "rejected" ? "rejected" :
                state.status === "submitted" || state.status === "pending" ? "pending" : "none",
              meta: state.reviewedAt
                ? `검토 ${state.reviewedAt}${state.reviewNote ? ` — ${state.reviewNote}` : ""}`
                : state.reviewNote,
            },
            {
              label: "NDA 승인 완료",
              status: state.status === "approved" ? "approved" : "none",
              meta: state.status === "approved"
                ? "L2 자료 열람 권한 부여 — 감정평가서 · 현장사진 · 채권 정보"
                : "승인 후 L2 자료 열람 가능",
            },
          ]}
        />
      </section>
    </ModalShell>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. LoiModal — 채권별 LOI (per-listing)
   ═══════════════════════════════════════════════════════════════════════════ */

export interface LoiState {
  /** 본 매물에 대한 LOI 승인 상태 */
  status: ApprovalStatus
  /** LOI 제출 일시 */
  submittedAt?: string
  /** 매각사 승인/반려 일시 */
  reviewedAt?: string
  /** 매각사명 */
  sellerName?: string
  /** 검토 메모 */
  reviewNote?: string
  /** 제출한 희망가 (원) */
  proposedPrice?: number
}

export interface LoiSubmitPayload {
  proposedPrice: number
  signerName: string
  signatureDataUrl: string
  fundingPlan: 'CASH' | 'LEVERAGED' | 'FUND'
  durationDays: number
  acquisitionEntity: string
  sellerMessage: string
}
export interface LoiModalProps {
  open: boolean
  onClose: () => void
  listingTitle: string
  listingId: string
  askingPrice: number
  state: LoiState
  /** LOI 제출 (제출 후 매각사 승인 대기) — full payload */
  onSubmit?: (payload: LoiSubmitPayload) => void | Promise<void>
}

function formatKRW(n: number | undefined): string {
  if (!n) return "—"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString("ko-KR")
}

const LOI_DURATION_OPTIONS: { label: string; days: number }[] = [
  { label: '14일', days: 14 },
  { label: '30일', days: 30 },
  { label: '45일', days: 45 },
  { label: '60일', days: 60 },
]

export function LoiModal({
  open, onClose, listingTitle, listingId, askingPrice, state, onSubmit,
}: LoiModalProps) {
  const canSubmit = state.status === "none" || state.status === "rejected"
  const [price, setPrice] = useState<number>(state.proposedPrice ?? Math.round(askingPrice * 0.95))
  const [fundingPlan, setFundingPlan] = useState<'CASH' | 'LEVERAGED' | 'FUND'>('CASH')
  const [durationDays, setDurationDays] = useState<number>(30)
  const [acquisitionEntity, setAcquisitionEntity] = useState('')
  const [sellerMessage, setSellerMessage] = useState('')
  const [signerName, setSignerName] = useState('')
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPrice(state.proposedPrice ?? Math.round(askingPrice * 0.95))
      setFundingPlan('CASH')
      setDurationDays(30)
      setAcquisitionEntity('')
      setSellerMessage('')
      setSignerName('')
      setSignatureDataUrl(null)
      setSubmitError(null)
    }
  }, [open, state.proposedPrice, askingPrice])

  const formValid =
    price > 0 &&
    signerName.trim().length >= 2 &&
    !!signatureDataUrl &&
    acquisitionEntity.trim().length >= 2

  async function handleClick() {
    if (!onSubmit || !formValid) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await onSubmit({
        proposedPrice: price,
        signerName: signerName.trim(),
        signatureDataUrl: signatureDataUrl!,
        fundingPlan,
        durationDays,
        acquisitionEntity: acquisitionEntity.trim(),
        sellerMessage: sellerMessage.trim(),
      })
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : '제출 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="LOI 제출"
      subtitle={`본 채권 “${listingTitle}” 에 대한 매수의향서(LOI)를 제출합니다. LOI 는 채권마다 매각사 승인이 필요합니다.`}
      icon={<FileCheck size={18} />}
      trackingHref="/my/agreements"
      trackingLabel="마이 페이지에서 LOI 진행 현황 확인"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 18px",
              fontSize: 12,
              fontWeight: 700,
              color: C.ink,
              background: C.paper,
              border: `1px solid ${C.borderStrong}`,
              cursor: "pointer",
            }}
          >
            닫기
          </button>
          {canSubmit && onSubmit && (
            <button
              type="button"
              onClick={handleClick}
              disabled={!formValid || submitting}
              style={{
                padding: "10px 18px",
                fontSize: 12,
                fontWeight: 800,
                color: C.paper,
                background: C.cobalt,
                border: "none",
                borderTop: `2px solid ${C.paper}`,
                cursor: (!formValid || submitting) ? "not-allowed" : "pointer",
                opacity: (!formValid || submitting) ? 0.45 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FileCheck size={12} style={{ color: C.paper }} />
              <span style={{ color: C.paper }}>
                {submitting ? "제출 중..." : state.status === "rejected" ? "재제출" : "전자서명 · LOI 제출"}
              </span>
            </button>
          )}
        </>
      }
    >
      {/* 채권 정보 */}
      <section style={{ marginBottom: 16 }}>
        <div
          style={{
            background: C.paperTint,
            border: `1px solid ${C.border}`,
            padding: "12px 14px",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
            대상 채권
          </div>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.ink, marginBottom: 2 }}>{listingTitle}</div>
          <div style={{ fontSize: 11, fontWeight: 500, color: C.textMuted }}>
            딜 ID · {listingId} · 매도자 희망가 {formatKRW(askingPrice)}
          </div>
        </div>
      </section>

      {/* 매수 희망가 입력 + 풀 신청 폼 (자금 조달 / 실사 기간 / 인수 주체 / 메시지) */}
      {canSubmit && (
        <section style={{ marginBottom: 18 }}>
          <h3
            style={{
              fontSize: 11.5, fontWeight: 800, color: C.ink,
              letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8,
            }}
          >
            제안 가격
          </h3>
          <div className="flex items-center gap-2 mb-1">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min={0}
              step={1_000_000}
              style={{
                flex: 1,
                padding: "10px 12px",
                fontSize: 13,
                fontWeight: 700,
                color: C.ink,
                background: C.paper,
                border: `1px solid ${C.borderStrong}`,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontVariantNumeric: "tabular-nums",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>원</span>
          </div>
          <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
            <span style={{ fontSize: 10.5, color: C.textMuted, fontWeight: 600 }}>
              매각희망가 {formatKRW(askingPrice)}원 기준
            </span>
            <span style={{
              fontSize: 11, fontWeight: 800, fontVariantNumeric: "tabular-nums",
              color: price < askingPrice ? "#1A47CC" : C.textMuted,
            }}>
              매각희망가 대비 {askingPrice > 0 ? (((price - askingPrice) / askingPrice) * 100).toFixed(1) : "0.0"}%
            </span>
          </div>

          {/* 자금 조달 계획 */}
          <h4 style={{ fontSize: 11.5, fontWeight: 800, color: C.ink, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 18, marginBottom: 10 }}>
            자금 조달 계획
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { v: "CASH" as const,      label: "자기 자본 100%",  desc: "승인 확률 높음" },
              { v: "LEVERAGED" as const, label: "금융 차입 병행",   desc: "LTV 50~70%" },
              { v: "FUND" as const,      label: "펀드 출자",       desc: "LP 확약서 첨부" },
            ].map(o => {
              const active = fundingPlan === o.v
              return (
                <label key={o.v} className="cursor-pointer" style={{
                  padding: "10px 12px",
                  background: active ? "rgba(34, 81, 255, 0.08)" : C.paper,
                  border: `1px solid ${active ? C.cobalt : C.borderStrong}`,
                  borderTop: `2px solid ${C.cobalt}`,
                  display: "flex", flexDirection: "column", gap: 3,
                }}>
                  <input
                    type="radio"
                    name="loi-funding"
                    value={o.v}
                    checked={active}
                    onChange={() => setFundingPlan(o.v)}
                    style={{ display: "none" }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.ink, letterSpacing: "-0.005em" }}>{o.label}</span>
                  <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 600 }}>{o.desc}</span>
                </label>
              )
            })}
          </div>

          {/* 실사 · 계약 체결 기간 */}
          <h4 style={{ fontSize: 11.5, fontWeight: 800, color: C.ink, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 18, marginBottom: 8 }}>
            실사 · 계약 체결 기간
          </h4>
          <div className="grid grid-cols-4 gap-2 mb-1">
            {LOI_DURATION_OPTIONS.map(d => {
              const active = durationDays === d.days
              return (
                <label key={d.days} className="cursor-pointer" style={{
                  padding: "10px 12px",
                  background: active ? C.cobalt : C.paper,
                  border: `1px solid ${active ? C.cobalt : C.borderStrong}`,
                  fontSize: 12, fontWeight: 800, color: active ? C.paper : C.ink,
                  textAlign: "center",
                  letterSpacing: "-0.005em",
                }}>
                  <input
                    type="radio"
                    name="loi-duration"
                    checked={active}
                    onChange={() => setDurationDays(d.days)}
                    style={{ display: "none" }}
                  />
                  <span style={{ color: active ? C.paper : C.ink }}>{d.label}</span>
                </label>
              )
            })}
          </div>
          <p style={{ fontSize: 10, color: C.textMuted, fontWeight: 500 }}>
            짧은 기간일수록 매도자 승인 가능성이 높아집니다.
          </p>

          {/* 인수 주체 */}
          <h4 style={{ fontSize: 11.5, fontWeight: 800, color: C.ink, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 18, marginBottom: 8 }}>
            인수 주체 <span style={{ color: C.cobalt }}>*</span>
          </h4>
          <input
            type="text"
            value={acquisitionEntity}
            onChange={(e) => setAcquisitionEntity(e.target.value)}
            placeholder="예: ○○자산운용 NPL 1호 펀드"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 12.5,
              color: C.ink, background: C.paper,
              border: `1px solid ${C.borderStrong}`,
              outline: "none",
            }}
          />

          {/* 매도자에게 전달할 메시지 */}
          <h4 style={{ fontSize: 11.5, fontWeight: 800, color: C.ink, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 18, marginBottom: 8 }}>
            매도자에게 전달할 메시지
          </h4>
          <textarea
            value={sellerMessage}
            onChange={(e) => setSellerMessage(e.target.value)}
            rows={3}
            placeholder="인수 배경 · 추가 조건 · 실사 요구사항 등을 자유롭게 기재해주세요."
            disabled={submitting}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 12.5,
              color: C.ink, background: C.paper,
              border: `1px solid ${C.borderStrong}`,
              outline: "none", resize: "none",
              fontFamily: "inherit",
            }}
          />

          {/* 서명자명 + 전자서명 */}
          <h4 style={{ fontSize: 11.5, fontWeight: 800, color: C.ink, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 18, marginBottom: 8 }}>
            서명자 성명 <span style={{ color: C.cobalt }}>*</span>
          </h4>
          <input
            type="text"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="본인의 성명을 정확히 입력하세요"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 13,
              color: C.ink, background: C.paper,
              border: `1px solid ${C.borderStrong}`,
              borderTop: `2px solid ${C.cobalt}`,
              outline: "none",
            }}
          />
          <div style={{ marginTop: 14 }}>
            <SignaturePad
              width={520}
              height={150}
              disabled={submitting}
              onChange={(d) => setSignatureDataUrl(d)}
            />
          </div>

          {submitError && (
            <div style={{
              marginTop: 10, padding: "8px 12px",
              background: "rgba(220, 38, 38, 0.06)",
              border: "1px solid rgba(220, 38, 38, 0.30)",
              borderLeft: "3px solid #DC2626",
              fontSize: 11, color: "#991B1B",
            }}>
              {submitError}
            </div>
          )}

          <p style={{ fontSize: 10.5, fontWeight: 500, color: C.textMuted, marginTop: 12, lineHeight: 1.55 }}>
            LOI 는 법적 구속력이 없는 의향서이지만, 매도자가 승인한 후 본 계약 협상 단계로 진입하면
            에스크로 입금 및 계약금 몰취 조건이 적용될 수 있습니다.
            본 LOI 는 NPLatform 자체 전자서명으로 PDF 화되어 5년간 보관됩니다.
          </p>
        </section>
      )}

      {/* 매각사 승인 진행 */}
      <section style={{ marginBottom: 18 }}>
        <h3
          style={{
            fontSize: 11.5, fontWeight: 800, color: C.ink,
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10,
          }}
        >
          진행 상황 — 매각사 검토
        </h3>
        <ApprovalTimeline
          steps={[
            {
              label: "LOI 제출",
              status:
                state.status === "none" ? "none" :
                state.status === "rejected" ? "submitted" : "submitted",
              meta: state.submittedAt
                ? `제출 ${state.submittedAt}${state.proposedPrice ? ` · ${formatKRW(state.proposedPrice)}원` : ""}`
                : "제출 즉시 매각사에 전달",
            },
            {
              label: `매각사 검토 (${state.sellerName ?? "매각사"})`,
              status:
                state.status === "approved" ? "approved" :
                state.status === "rejected" ? "rejected" :
                state.status === "submitted" || state.status === "pending" ? "pending" : "none",
              meta: state.reviewedAt
                ? `검토 ${state.reviewedAt}${state.reviewNote ? ` — ${state.reviewNote}` : ""}`
                : state.reviewNote,
            },
            {
              label: "LOI 승인 — 협상 시작",
              status: state.status === "approved" ? "approved" : "none",
              meta: state.status === "approved"
                ? "데이터룸 전체 자료 열람 + 채팅·실사·가격 협상 활성화"
                : "승인 후 L3 권한 부여 (데이터룸·채팅·협상)",
            },
          ]}
        />
      </section>
    </ModalShell>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   DocCard — 단일 문서 제출 카드
   ═══════════════════════════════════════════════════════════════════════════ */
function DocCard({ label, doc, icon }: { label: string; doc: SubmittedDoc; icon: React.ReactNode }) {
  return (
    <div
      style={{
        background: doc.submitted ? C.positiveBg : C.paperTint,
        border: `1px solid ${doc.submitted ? "rgba(15, 118, 110, 0.30)" : C.border}`,
        padding: "12px 14px",
      }}
    >
      <div className="flex items-start justify-between mb-1.5">
        <div className="inline-flex items-center gap-1.5">
          <span style={{ color: doc.submitted ? C.positive : C.textMuted }}>{icon}</span>
          <span style={{ fontSize: 11.5, fontWeight: 800, color: C.ink }}>{label}</span>
        </div>
        <StatusChip status={doc.submitted ? "submitted" : "none"} />
      </div>
      <p style={{ fontSize: 10.5, fontWeight: 600, color: C.textMuted, lineHeight: 1.5 }}>
        {doc.submitted
          ? `${doc.filename ?? "파일 업로드 완료"}${doc.submittedAt ? ` · ${doc.submittedAt}` : ""}`
          : "회원가입 시 미제출 — 마이 페이지에서 제출"}
      </p>
    </div>
  )
}
