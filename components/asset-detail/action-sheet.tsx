/**
 * ActionSheet — 티어별 세부 액션 모달 (DR-4-demo · 2026-04-21)
 *
 * Primary CTA 클릭 시 열리는 중앙 모달 (모바일은 하단 시트).
 * 각 티어별로 다음 콘텐츠를 노출합니다:
 *   L0  로그인 폼 (이메일/비밀번호 · Mock)
 *   L1  본인인증 (휴대폰 번호 + 6자리 인증번호 · Mock)
 *   L2  NDA 약관 + 체크박스 + 서명란
 *   L3  LOI 제출 폼 (희망가 + 조건)
 *   L4  계약 전자서명 + 에스크로 확인
 *   L5  정산 영수증 · 세금계산서 안내
 *
 * "승인" 버튼을 누르면 onConfirm() 이 호출되어 부모가 티어를 승급시킵니다.
 */

"use client"

import { useMemo, useState, useEffect, type ReactNode } from "react"
import {
  X, LogIn, Shield, FileSignature, FileCheck, PenLine, CheckCircle2,
  AlertTriangle, AlertCircle, ShieldCheck, Briefcase, Calendar,
} from "lucide-react"
import type { AssetTier } from "@/hooks/use-asset-tier"

export interface ActionSheetProps {
  open: boolean
  tier: AssetTier
  assetTitle: string
  askingPrice: number
  onClose: () => void
  /** 사용자가 "승인/서명/제출" 버튼을 눌렀을 때 호출 */
  onConfirm: () => void
}

interface StepMeta {
  title: string
  subtitle: string
  icon: ReactNode
  confirmLabel: string
  accent: string
}

const META: Record<AssetTier, StepMeta> = {
  L0: {
    title: "전문투자자 본인인증",
    subtitle: "10초 인증으로 등기부 · 임대차 정보 등 L1 자료를 즉시 열람할 수 있습니다.",
    icon: <Shield size={18} />,
    confirmLabel: "본인인증 완료",
    accent: "var(--color-brand-dark)",
  },
  L1: {
    title: "비밀유지계약서 (NDA)",
    subtitle:
      "10초 서명으로 NDA 체결 후 감정평가서 · 현장 사진 · 채권 정보를 열람할 수 있습니다. 모든 열람 이력은 PII Access Log 에 기록됩니다.",
    icon: <FileSignature size={18} />,
    confirmLabel: "NDA 체결하고 L2 자료 열람하기",
    accent: "var(--color-brand-bright)",
  },
  L2: {
    title: "매수의향서 (LOI) 제출",
    subtitle:
      "10초 제출로 채팅 · 실사 · 가격 오퍼가 열립니다. LOI 는 법적 구속력이 없는 의향서이며, 매도자 승인 후 협상 단계로 진입합니다.",
    icon: <FileCheck size={18} />,
    confirmLabel: "LOI 제출하기",
    accent: "var(--color-positive)",
  },
  L3: {
    title: "에스크로 결제 · 계약",
    subtitle:
      "계약 초안 확인 후 서명하면 에스크로 입금 안내가 발송됩니다. 매도자 승인 및 현장 계약으로 이어집니다.",
    icon: <PenLine size={18} />,
    confirmLabel: "전자서명 · 에스크로 진행",
    accent: "#051C2C",
  },
  L4: {
    title: "전자계약 · 에스크로 입금",
    subtitle: "계약 초안 확인 후 서명하면 에스크로 입금 안내가 발송됩니다.",
    icon: <PenLine size={18} />,
    confirmLabel: "전자서명 · 진행",
    accent: "#051C2C",
  },
  L5: {
    title: "정산 내역 · 영수증",
    subtitle: "거래가 종결되었습니다. 세금계산서와 영수증을 확인하세요.",
    icon: <CheckCircle2 size={18} />,
    confirmLabel: "확인",
    accent: "var(--color-positive)",
  },
}

/** NDA 6개 조항 (원본 /exchange/[id]/nda 페이지에서 이식) */
const NDA_CLAUSES: { title: string; body: string }[] = [
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

function formatKRW(n: number): string {
  if (!n) return "—"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString("ko-KR")
}

export function ActionSheet({
  open,
  tier,
  assetTitle,
  askingPrice,
  onClose,
  onConfirm,
}: ActionSheetProps) {
  const meta = META[tier]

  // ── Tier-specific form state ──
  const [loginEmail, setLoginEmail] = useState("demo@nplatform.co.kr")
  const [loginPw, setLoginPw] = useState("")
  const [phone, setPhone] = useState("")
  const [code, setCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  // L2 NDA
  const [ndaQualified, setNdaQualified] = useState(false)
  const [ndaAgreed, setNdaAgreed] = useState(false)
  const [ndaName, setNdaName] = useState("")
  // L3 LOI — 원본 /exchange/[id]/loi 페이지 이식
  const [loiPrice, setLoiPrice] = useState<number>(0)
  const [loiFunding, setLoiFunding] = useState<"" | "CASH" | "LEVERAGED" | "FUND">("")
  const [loiDuration, setLoiDuration] = useState<string>("30")
  const [loiEntity, setLoiEntity] = useState("")
  const [loiMemo, setLoiMemo] = useState("")
  // L4
  const [contractSigned, setContractSigned] = useState(false)

  // Reset state each time modal opens with different tier
  useEffect(() => {
    if (!open) return
    setLoginPw("")
    setPhone("")
    setCode("")
    setCodeSent(false)
    setNdaQualified(false)
    setNdaAgreed(false)
    setNdaName("")
    setLoiPrice(Math.round(askingPrice * 0.965)) // -3.5% 기본값 (원본 820M/850M)
    setLoiFunding("")
    setLoiDuration("30")
    setLoiEntity("")
    setLoiMemo("")
    setContractSigned(false)
  }, [open, tier, askingPrice])

  // LOI premium %
  const loiPremiumPct = useMemo(() => {
    if (askingPrice <= 0) return 0
    return ((loiPrice - askingPrice) / askingPrice) * 100
  }, [loiPrice, askingPrice])

  // ESC 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  // ── 승인 가능 여부 검증 ──
  const canConfirm: boolean = (() => {
    switch (tier) {
      case "L0": return loginEmail.includes("@") && loginPw.length >= 4
      case "L1": return ndaQualified && ndaAgreed && ndaName.trim().length >= 2
      case "L2":
        return (
          loiPrice > 0 &&
          loiFunding !== "" &&
          loiEntity.trim().length >= 2 &&
          loiDuration.length > 0
        )
      case "L3": return contractSigned
      case "L4": return contractSigned
      case "L5": return true
      default: return false
    }
  })()

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(8, 18, 32, 0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full ${
          tier === "L2" || tier === "L3" ? "sm:max-w-[720px]" : "sm:max-w-[520px]"
        } sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col`}
        style={{
          backgroundColor: "var(--layer-1-bg)",
          border: "1px solid var(--layer-border-strong)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.25)",
          maxHeight: "92vh",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-3 px-5 py-4 border-b"
          style={{ borderColor: "var(--layer-border-strong)" }}
        >
          <div className="flex items-start gap-3 min-w-0">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: "var(--color-positive-bg)",
                color: meta.accent,
              }}
            >
              {meta.icon}
            </div>
            <div className="min-w-0">
              <h2 className="font-black leading-tight" style={{ fontSize: 16, color: "var(--color-text-primary)" }}>
                {meta.title}
              </h2>
              <p className="mt-1 leading-snug" style={{ fontSize: 11, color: "var(--fg-muted)" }}>
                {meta.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-1.5 rounded-lg flex-shrink-0"
            style={{ color: "var(--fg-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Asset summary chip */}
        <div
          className="px-5 py-3 border-b flex items-center gap-2 flex-wrap"
          style={{
            borderColor: "var(--layer-border-strong)",
            backgroundColor: "var(--layer-2-bg)",
          }}
        >
          <span
            className="font-bold uppercase tracking-wide"
            style={{ fontSize: 10, color: "var(--fg-subtle)" }}
          >
            대상 자산
          </span>
          <span className="font-bold truncate" style={{ fontSize: 12, color: "var(--fg-strong)" }}>
            {assetTitle}
          </span>
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>·</span>
          <span className="font-bold tabular-nums" style={{ fontSize: 12, color: "var(--color-positive)" }}>
            희망가 {formatKRW(askingPrice)}
          </span>
        </div>

        {/* Body (scroll) */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tier === "L0" && (
            <L0Form
              email={loginEmail}
              password={loginPw}
              onEmailChange={setLoginEmail}
              onPasswordChange={setLoginPw}
            />
          )}
          {tier === "L1" && (
            <L2NdaForm
              qualified={ndaQualified}
              agreed={ndaAgreed}
              name={ndaName}
              onToggleQualified={setNdaQualified}
              onToggleAgreed={setNdaAgreed}
              onNameChange={setNdaName}
            />
          )}
          {tier === "L2" && (
            <L3LoiForm
              askingPrice={askingPrice}
              price={loiPrice}
              funding={loiFunding}
              duration={loiDuration}
              entity={loiEntity}
              notes={loiMemo}
              premiumPct={loiPremiumPct}
              onPriceChange={setLoiPrice}
              onFundingChange={setLoiFunding}
              onDurationChange={setLoiDuration}
              onEntityChange={setLoiEntity}
              onNotesChange={setLoiMemo}
            />
          )}
          {tier === "L3" && (
            <L4Form signed={contractSigned} onToggleSign={setContractSigned} />
          )}
          {tier === "L4" && (
            <L4Form signed={contractSigned} onToggleSign={setContractSigned} />
          )}
          {tier === "L5" && <L5Content askingPrice={askingPrice} />}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-4 border-t flex items-center justify-between gap-3"
          style={{ borderColor: "var(--layer-border-strong)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-bold"
            style={{
              fontSize: 13,
              backgroundColor: "transparent",
              color: "var(--fg-muted)",
              border: "1px solid var(--layer-border-strong)",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              fontSize: 14,
              backgroundColor: meta.accent,
              color: meta.accent === "var(--color-positive)" ? "#041915" : "var(--fg-on-brand)",
            }}
          >
            {meta.icon}
            {meta.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
   STEP FORMS
═════════════════════════════════════════════════════════════ */

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block font-bold mb-1.5" style={{ fontSize: 12, color: "var(--fg-strong)" }}>
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
          {hint}
        </p>
      )}
    </div>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: "var(--layer-2-bg)",
  border: "1px solid var(--layer-border-strong)",
  color: "var(--color-text-primary)",
  padding: "10px 12px",
  borderRadius: 10,
  fontSize: 13,
  width: "100%",
}

function L0Form({
  email, password, onEmailChange, onPasswordChange,
}: {
  email: string
  password: string
  onEmailChange: (v: string) => void
  onPasswordChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="이메일">
        <input
          type="email"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="name@company.com"
          style={INPUT_STYLE}
          autoFocus
        />
      </Field>
      <Field label="비밀번호" hint="데모용 · 4자리 이상 아무 값이나 입력하면 통과">
        <input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="••••••••"
          style={INPUT_STYLE}
        />
      </Field>
      <div
        className="rounded-lg px-3 py-2.5 text-center font-semibold"
        style={{
          fontSize: 11,
          backgroundColor: "var(--color-positive-bg)",
          color: "var(--color-positive)",
        }}
      >
        ✓ 로그인 후 자동으로 관심 매물에 저장됩니다
      </div>
    </div>
  )
}

function L1Form({
  phone, code, codeSent, onPhoneChange, onCodeChange, onSendCode,
}: {
  phone: string
  code: string
  codeSent: boolean
  onPhoneChange: (v: string) => void
  onCodeChange: (v: string) => void
  onSendCode: () => void
}) {
  return (
    <div className="space-y-4">
      <Field label="휴대폰 번호">
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="010-1234-5678"
            style={INPUT_STYLE}
            autoFocus
          />
          <button
            type="button"
            onClick={onSendCode}
            disabled={phone.length < 10}
            className="flex-shrink-0 px-3 py-2 rounded-lg font-bold transition-opacity disabled:opacity-40"
            style={{
              fontSize: 12,
              backgroundColor: "var(--color-brand-bright)",
              color: "var(--fg-on-brand)",
            }}
          >
            {codeSent ? "재전송" : "인증번호 요청"}
          </button>
        </div>
      </Field>
      {codeSent && (
        <Field label="인증번호 (6자리)" hint="데모용 · 아무 6자리나 입력하면 통과 (예: 123456)">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            style={{ ...INPUT_STYLE, letterSpacing: "0.3em", textAlign: "center", fontFamily: "monospace" }}
          />
        </Field>
      )}
      <ul
        className="rounded-lg px-3 py-2.5 space-y-1"
        style={{
          fontSize: 11,
          backgroundColor: "var(--layer-2-bg)",
          color: "var(--fg-muted)",
        }}
      >
        <li>✓ 본인인증 완료 시 등기원본 · 임대차 · 선순위 권리 열람 가능</li>
        <li>✓ NDA/LOI 진행 시 실명 표기에 활용됩니다</li>
      </ul>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
   L2 NDA FORM — 원본 /exchange/[id]/nda 페이지 이식 (DR-7)
═════════════════════════════════════════════════════════════ */
function L2NdaForm({
  qualified, agreed, name,
  onToggleQualified, onToggleAgreed, onNameChange,
}: {
  qualified: boolean
  agreed: boolean
  name: string
  onToggleQualified: (v: boolean) => void
  onToggleAgreed: (v: boolean) => void
  onNameChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      {/* 전문투자자 확인 */}
      <FormCard title="전문투자자 확인" icon={<ShieldCheck size={14} />}>
        <p
          className="mb-3 leading-relaxed"
          style={{ fontSize: 12, color: "var(--fg-muted)" }}
        >
          자본시장법 시행령 제10조에 따른 전문투자자 요건을 충족하는지 확인해주세요.
          (금융기관 · 연기금 · 금융위 등록 투자자문업자 · 순자산 100억 이상 법인 등)
        </p>
        <ToggleRow
          value={qualified}
          onChange={onToggleQualified}
          label="전문투자자 요건을 충족하며, 관련 증빙서류 제출에 동의합니다"
        />
      </FormCard>

      {/* NDA 조항 */}
      <FormCard title="NDA 조항" icon={<FileSignature size={14} />}>
        <div
          className="rounded-lg overflow-y-auto"
          style={{
            maxHeight: 240,
            padding: "14px 16px",
            backgroundColor: "var(--layer-2-bg)",
            border: "1px solid var(--layer-border-strong)",
            fontSize: 12,
            color: "var(--fg-default)",
            lineHeight: 1.7,
          }}
        >
          {NDA_CLAUSES.map((clause, i) => (
            <div key={i} className={i > 0 ? "mt-3" : ""}>
              <div
                className="font-black mb-1"
                style={{ color: "var(--fg-strong)", fontSize: 12 }}
              >
                {clause.title}
              </div>
              <div>{clause.body}</div>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <ToggleRow
            value={agreed}
            onChange={onToggleAgreed}
            label="위 NDA 조항을 모두 읽고 동의합니다"
          />
        </div>
      </FormCard>

      {/* 전자 서명 */}
      <FormCard title="전자 서명" icon={<FileSignature size={14} />}>
        <label
          className="block font-bold mb-1.5"
          style={{ fontSize: 11, color: "var(--fg-muted)" }}
        >
          서명자 성명 <span style={{ color: "var(--color-positive)" }}>*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="본인의 성명을 정확히 입력하세요"
          style={{
            ...INPUT_STYLE,
            fontFamily: "serif",
            fontStyle: "italic",
            fontSize: 15,
          }}
        />
        <p
          className="mt-2 leading-relaxed"
          style={{ fontSize: 10, color: "var(--fg-subtle)" }}
        >
          전자서명법에 따른 공인인증서 기반 서명이 아닌 간이 서명입니다.
          실계약 시 별도의 공인 전자서명이 요구됩니다.
        </p>
      </FormCard>

      {/* 경고 */}
      <div
        className="rounded-xl flex items-start gap-2.5"
        style={{
          padding: "12px 14px",
          backgroundColor: "rgba(5, 28, 44, 0.10)",
          border: "1px solid rgba(5, 28, 44, 0.33)",
        }}
      >
        <AlertTriangle
          size={15}
          color="#051C2C"
          className="flex-shrink-0 mt-0.5"
        />
        <p className="leading-relaxed" style={{ fontSize: 11, color: "var(--fg-default)" }}>
          NDA 체결 후 열람 행위는 PII Access Log 에 기록되며, 비정상 패턴 감지 시 계정이
          일시 정지될 수 있습니다. 비밀정보의 부정 사용은 개인정보보호법 · 신용정보법
          위반에 해당합니다.
        </p>
      </div>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════
   L3 LOI FORM — 원본 /exchange/[id]/loi 페이지 이식 (DR-7)
═════════════════════════════════════════════════════════════ */
type LoiFunding = "" | "CASH" | "LEVERAGED" | "FUND"

function L3LoiForm({
  askingPrice,
  price, funding, duration, entity, notes, premiumPct,
  onPriceChange, onFundingChange, onDurationChange, onEntityChange, onNotesChange,
}: {
  askingPrice: number
  price: number
  funding: LoiFunding
  duration: string
  entity: string
  notes: string
  premiumPct: number
  onPriceChange: (n: number) => void
  onFundingChange: (v: LoiFunding) => void
  onDurationChange: (v: string) => void
  onEntityChange: (v: string) => void
  onNotesChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      {/* 제안 가격 */}
      <FormCard title="제안 가격" icon={<Briefcase size={14} />}>
        <div
          className="mb-2 font-semibold"
          style={{ fontSize: 11, color: "var(--fg-muted)" }}
        >
          매각희망가 {formatKRW(askingPrice)}원 기준
        </div>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={price ? price.toLocaleString("ko-KR") : ""}
            onChange={(e) =>
              onPriceChange(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)
            }
            placeholder="예: 820,000,000"
            style={{
              ...INPUT_STYLE,
              padding: "14px 60px 14px 16px",
              fontSize: 18,
              fontWeight: 700,
              fontFamily: "monospace",
            }}
          />
          <span
            className="absolute font-bold"
            style={{
              right: 18,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 12,
              color: "var(--fg-muted)",
            }}
          >
            원
          </span>
        </div>
        {price > 0 && (
          <div
            className="mt-2 font-bold tabular-nums"
            style={{
              fontSize: 11,
              color: premiumPct >= 0 ? "var(--color-positive)" : "#051C2C",
            }}
          >
            매각희망가 대비 {premiumPct >= 0 ? "+" : ""}
            {premiumPct.toFixed(1)}%
          </div>
        )}
      </FormCard>

      {/* 자금 조달 계획 */}
      <FormCard title="자금 조달 계획" icon={<Briefcase size={14} />}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { value: "CASH",      label: "자기 자본 100%", desc: "승인 확률 높음" },
            { value: "LEVERAGED", label: "금융 차입 병행", desc: "LTV 50~70%" },
            { value: "FUND",      label: "펀드 출자",      desc: "LP 확약서 첨부" },
          ].map((op) => {
            const active = op.value === funding
            return (
              <button
                key={op.value}
                type="button"
                onClick={() => onFundingChange(op.value as LoiFunding)}
                className="text-left rounded-lg transition-colors"
                style={{
                  padding: "14px 12px",
                  backgroundColor: active ? "var(--color-positive-bg)" : "var(--layer-2-bg)",
                  border: `1px solid ${
                    active ? "var(--color-positive)" : "var(--layer-border-strong)"
                  }`,
                  color: "var(--fg-default)",
                }}
              >
                <div
                  className="font-black mb-1"
                  style={{ fontSize: 12, color: "var(--fg-strong)" }}
                >
                  {op.label}
                </div>
                <div style={{ fontSize: 10, color: "var(--fg-muted)" }}>
                  {op.desc}
                </div>
              </button>
            )
          })}
        </div>
      </FormCard>

      {/* 실사 · 계약 체결 기간 */}
      <FormCard title="실사 · 계약 체결 기간" icon={<Calendar size={14} />}>
        <div className="flex gap-2 flex-wrap">
          {["14", "30", "45", "60"].map((d) => {
            const active = d === duration
            return (
              <button
                key={d}
                type="button"
                onClick={() => onDurationChange(d)}
                className="font-bold rounded-lg transition-colors"
                style={{
                  padding: "10px 16px",
                  fontSize: 12,
                  backgroundColor: active
                    ? "var(--color-positive-bg)"
                    : "var(--layer-2-bg)",
                  color: active ? "var(--color-positive)" : "var(--fg-muted)",
                  border: `1px solid ${
                    active ? "var(--color-positive)" : "var(--layer-border-strong)"
                  }`,
                }}
              >
                {d}일
              </button>
            )
          })}
        </div>
        <p className="mt-2" style={{ fontSize: 10, color: "var(--fg-subtle)" }}>
          짧은 기간일수록 매도자 승인 가능성이 높아집니다.
        </p>
      </FormCard>

      {/* 인수 주체 */}
      <FormCard title="인수 주체" icon={<Briefcase size={14} />}>
        <input
          type="text"
          value={entity}
          onChange={(e) => onEntityChange(e.target.value)}
          placeholder="예: ○○자산운용 NPL 1호 펀드"
          style={{ ...INPUT_STYLE, fontSize: 13 }}
        />
      </FormCard>

      {/* 매도자에게 전달할 메시지 */}
      <FormCard title="매도자에게 전달할 메시지" icon={<Briefcase size={14} />}>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
          placeholder="인수 배경 · 추가 조건 · 실사 요구사항 등을 자유롭게 기재해주세요."
          style={{
            ...INPUT_STYLE,
            fontSize: 13,
            resize: "vertical",
            fontFamily: "inherit",
            minHeight: 90,
          }}
        />
      </FormCard>

      {/* 경고 */}
      <div
        className="rounded-xl flex items-start gap-2.5"
        style={{
          padding: "12px 14px",
          backgroundColor: "rgba(46, 117, 182, 0.06)",
          border: "1px solid rgba(46, 117, 182, 0.24)",
        }}
      >
        <AlertCircle
          size={15}
          color="var(--color-brand-bright)"
          className="flex-shrink-0 mt-0.5"
        />
        <p className="leading-relaxed" style={{ fontSize: 11, color: "var(--fg-default)" }}>
          LOI 는 법적 구속력이 없는 의향서이지만, 매도자가 승인한 후 본 계약 협상 단계로
          진입하면 에스크로 입금 및 계약금 몰취 조건이 적용될 수 있습니다.
        </p>
      </div>
    </div>
  )
}

/* ─── 공통: FormCard / ToggleRow ─── */
function FormCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section
      className="rounded-xl"
      style={{
        padding: "18px 20px",
        backgroundColor: "var(--layer-1-bg)",
        border: "1px solid var(--layer-border-strong)",
      }}
    >
      <header
        className="inline-flex items-center gap-2 font-black mb-3"
        style={{ fontSize: 13, color: "var(--fg-strong)" }}
      >
        <span style={{ color: "var(--color-positive)" }}>{icon}</span>
        {title}
      </header>
      {children}
    </section>
  )
}

function ToggleRow({
  value,
  onChange,
  label,
}: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="w-full text-left inline-flex items-center gap-3 font-semibold rounded-lg transition-colors"
      style={{
        padding: "11px 13px",
        fontSize: 12,
        color: "var(--fg-default)",
        backgroundColor: value ? "var(--color-positive-bg)" : "var(--layer-2-bg)",
        border: `1px solid ${
          value ? "var(--color-positive)" : "var(--layer-border-strong)"
        }`,
      }}
    >
      <div
        className="flex items-center justify-center rounded flex-shrink-0"
        style={{
          width: 20,
          height: 20,
          backgroundColor: value ? "var(--color-positive)" : "transparent",
          border: `1px solid ${
            value ? "var(--color-positive)" : "var(--layer-border-strong)"
          }`,
        }}
      >
        {value && <CheckCircle2 size={14} color="#041915" />}
      </div>
      <span className="flex-1">{label}</span>
    </button>
  )
}

function L4Form({
  signed, onToggleSign,
}: {
  signed: boolean
  onToggleSign: (v: boolean) => void
}) {
  return (
    <div className="space-y-4">
      <div
        className="rounded-lg p-4 space-y-2"
        style={{
          backgroundColor: "var(--layer-2-bg)",
          border: "1px solid var(--layer-border-strong)",
          fontSize: 12,
          color: "var(--fg-default)",
        }}
      >
        <div className="font-black" style={{ fontSize: 13, color: "var(--fg-strong)" }}>
          전자계약 요약
        </div>
        <ul className="space-y-1.5 mt-2">
          <li>· 계약금 10% · 잔금 90% (에스크로 납입)</li>
          <li>· 에스크로 은행: KB국민은행 (가상계좌 자동 발급)</li>
          <li>· 실사·보완 기간: 서명일 ~ 14일</li>
          <li>· 소유권 이전: 잔금 확인 후 즉시</li>
        </ul>
      </div>
      <label
        className="flex items-start gap-2 cursor-pointer select-none"
        style={{ fontSize: 13, color: "var(--fg-default)" }}
      >
        <input
          type="checkbox"
          checked={signed}
          onChange={(e) => onToggleSign(e.target.checked)}
          className="mt-0.5"
        />
        <span>위 계약 조항을 확인했으며, 전자서명에 동의합니다.</span>
      </label>
    </div>
  )
}

function L5Content({ askingPrice }: { askingPrice: number }) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-lg p-4 space-y-2"
        style={{
          backgroundColor: "var(--color-positive-bg)",
          border: "1px solid var(--color-positive)",
        }}
      >
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>거래 상태</span>
          <span className="font-black" style={{ fontSize: 12, color: "var(--color-positive)" }}>✓ 정산 완료</span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>거래 금액</span>
          <span className="font-black tabular-nums" style={{ fontSize: 15, color: "var(--color-positive)" }}>
            {formatKRW(askingPrice)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span style={{ fontSize: 12, color: "var(--fg-muted)" }}>정산일</span>
          <span className="font-bold tabular-nums" style={{ fontSize: 12, color: "var(--fg-strong)" }}>
            {new Date().toLocaleDateString("ko-KR")}
          </span>
        </div>
      </div>
      <ul
        className="space-y-1.5 rounded-lg px-3 py-2.5"
        style={{ fontSize: 11, color: "var(--fg-default)", backgroundColor: "var(--layer-2-bg)" }}
      >
        <li>✓ 세금계산서가 등록 이메일로 발송됩니다</li>
        <li>✓ 영수증은 마이페이지 &gt; 거래내역에서 다운로드 가능합니다</li>
        <li>✓ 등기이전이 3영업일 내에 자동 처리됩니다</li>
      </ul>
    </div>
  )
}
