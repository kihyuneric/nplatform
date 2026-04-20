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

import { useState, useEffect, type ReactNode } from "react"
import { X, LogIn, Shield, FileSignature, FileCheck, PenLine, CheckCircle2 } from "lucide-react"
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
    title: "로그인 후 관심 표시",
    subtitle: "30초 안에 가입/로그인하고 이 자산을 관심 목록에 저장하세요.",
    icon: <LogIn size={18} />,
    confirmLabel: "로그인 완료",
    accent: "var(--color-brand-dark)",
  },
  L1: {
    title: "전문투자자 본인인증",
    subtitle: "휴대폰 인증으로 등기부 · 임대차 정보 등 L1 자료를 열람할 수 있습니다.",
    icon: <Shield size={18} />,
    confirmLabel: "인증 완료",
    accent: "var(--color-brand-bright)",
  },
  L2: {
    title: "NDA(비밀유지계약) 체결",
    subtitle: "매도자 정보·원본 자료 보호를 위한 전자 NDA 입니다. 서명 후 데이터룸이 열립니다.",
    icon: <FileSignature size={18} />,
    confirmLabel: "NDA 서명 · 체결",
    accent: "var(--color-brand-bright)",
  },
  L3: {
    title: "LOI(매수의향서) 제출",
    subtitle: "희망 매입가와 조건을 적어 매도자에게 전달합니다. 승인 시 실사 자료가 공개됩니다.",
    icon: <FileCheck size={18} />,
    confirmLabel: "LOI 제출",
    accent: "var(--color-positive)",
  },
  L4: {
    title: "전자계약 · 에스크로 입금",
    subtitle: "계약 초안 확인 후 서명하면 에스크로 입금 안내가 발송됩니다.",
    icon: <PenLine size={18} />,
    confirmLabel: "전자서명 · 진행",
    accent: "#F59E0B",
  },
  L5: {
    title: "정산 내역 · 영수증",
    subtitle: "거래가 종결되었습니다. 세금계산서와 영수증을 확인하세요.",
    icon: <CheckCircle2 size={18} />,
    confirmLabel: "확인",
    accent: "var(--color-positive)",
  },
}

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
  const [ndaAgreed, setNdaAgreed] = useState(false)
  const [ndaName, setNdaName] = useState("")
  const [loiPrice, setLoiPrice] = useState<number>(0)
  const [loiMemo, setLoiMemo] = useState("")
  const [contractSigned, setContractSigned] = useState(false)

  // Reset state each time modal opens with different tier
  useEffect(() => {
    if (!open) return
    setLoginPw("")
    setPhone("")
    setCode("")
    setCodeSent(false)
    setNdaAgreed(false)
    setNdaName("")
    setLoiPrice(Math.round(askingPrice * 0.95)) // 5% 할인 기본값
    setLoiMemo("")
    setContractSigned(false)
  }, [open, tier, askingPrice])

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
      case "L1": return codeSent && code.length === 6
      case "L2": return ndaAgreed && ndaName.trim().length >= 2
      case "L3": return loiPrice > 0 && loiMemo.trim().length >= 5
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
        className="w-full sm:max-w-[520px] sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col"
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
            <L1Form
              phone={phone}
              code={code}
              codeSent={codeSent}
              onPhoneChange={setPhone}
              onCodeChange={setCode}
              onSendCode={() => setCodeSent(true)}
            />
          )}
          {tier === "L2" && (
            <L2Form
              agreed={ndaAgreed}
              name={ndaName}
              onToggleAgree={setNdaAgreed}
              onNameChange={setNdaName}
            />
          )}
          {tier === "L3" && (
            <L3Form
              price={loiPrice}
              memo={loiMemo}
              askingPrice={askingPrice}
              onPriceChange={setLoiPrice}
              onMemoChange={setLoiMemo}
            />
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

function L2Form({
  agreed, name, onToggleAgree, onNameChange,
}: {
  agreed: boolean
  name: string
  onToggleAgree: (v: boolean) => void
  onNameChange: (v: string) => void
}) {
  return (
    <div className="space-y-4">
      {/* NDA 약관 */}
      <div
        className="rounded-lg p-4 overflow-y-auto"
        style={{
          maxHeight: 200,
          backgroundColor: "var(--layer-2-bg)",
          border: "1px solid var(--layer-border-strong)",
          fontSize: 11,
          color: "var(--fg-default)",
          lineHeight: 1.6,
        }}
      >
        <div className="font-black mb-2" style={{ fontSize: 12, color: "var(--fg-strong)" }}>
          비밀유지계약서 (NDA) 요약
        </div>
        <p><strong>1조 (목적)</strong> 본 계약은 NPLatform 을 통해 제공되는 매각 자료의 비밀 유지를 목적으로 합니다.</p>
        <p className="mt-2"><strong>2조 (비밀정보의 범위)</strong> 매도자 정보·채권잔액·담보 상세·등기원본·현장사진 등 본 매물과 관련된 모든 원본 자료.</p>
        <p className="mt-2"><strong>3조 (의무)</strong> 수령인은 비밀정보를 제3자에게 공개·유출할 수 없으며, 본 거래 목적 외의 용도로 사용할 수 없습니다.</p>
        <p className="mt-2"><strong>4조 (유효기간)</strong> 본 계약의 효력은 서명일로부터 2년간 유지됩니다.</p>
        <p className="mt-2"><strong>5조 (위반)</strong> 위반 시 실손해 배상 및 위약금 1억원을 청구할 수 있습니다.</p>
      </div>

      <label
        className="flex items-start gap-2 cursor-pointer select-none"
        style={{ fontSize: 12, color: "var(--fg-default)" }}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onToggleAgree(e.target.checked)}
          className="mt-0.5"
        />
        <span>위 NDA 조항을 읽고 이에 동의합니다.</span>
      </label>

      <Field label="전자서명 (본인 성명)">
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="홍길동"
          style={{ ...INPUT_STYLE, fontFamily: "serif", fontStyle: "italic", fontSize: 16 }}
        />
      </Field>
    </div>
  )
}

function L3Form({
  price, memo, askingPrice, onPriceChange, onMemoChange,
}: {
  price: number
  memo: string
  askingPrice: number
  onPriceChange: (n: number) => void
  onMemoChange: (v: string) => void
}) {
  const discount = askingPrice > 0 ? (((askingPrice - price) / askingPrice) * 100).toFixed(1) : "0.0"
  return (
    <div className="space-y-4">
      <Field
        label="희망 매입가 (원)"
        hint={`희망가 ${formatKRW(askingPrice)} 대비 ${discount}% ${Number(discount) >= 0 ? "↓" : "↑"}`}
      >
        <input
          type="number"
          value={price}
          onChange={(e) => onPriceChange(Number(e.target.value))}
          placeholder="850000000"
          style={{ ...INPUT_STYLE, fontFamily: "monospace", fontSize: 15 }}
        />
        <div className="mt-2 font-bold tabular-nums" style={{ fontSize: 13, color: "var(--color-positive)" }}>
          ≈ {formatKRW(price)}
        </div>
      </Field>
      <Field label="제안 메모" hint="매도자에게 전달될 메시지 · 5자 이상">
        <textarea
          value={memo}
          onChange={(e) => onMemoChange(e.target.value)}
          placeholder="현금 일시불, 실사 2주 이내 완료 후 즉시 계약 가능합니다."
          rows={4}
          style={{ ...INPUT_STYLE, resize: "vertical", minHeight: 90 }}
        />
      </Field>
      <div
        className="rounded-lg px-3 py-2.5 space-y-1"
        style={{
          fontSize: 11,
          backgroundColor: "var(--color-positive-bg)",
          color: "var(--color-positive)",
        }}
      >
        <div>✓ 제출 즉시 매도자에게 알림이 전송됩니다</div>
        <div>✓ 매도자 승인 시 데이터룸과 실사 자료가 공개됩니다</div>
      </div>
    </div>
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
