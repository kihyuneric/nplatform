"use client"

/**
 * components/esign/sign-modal.tsx
 *
 * 전자계약 서명 모달 — 서명 패드 + 문서 미리보기 + 진행 상태
 *
 * 사용 예:
 *   <SignModal
 *     open={showSign}
 *     onClose={() => setShowSign(false)}
 *     document={{ id: 'NDA-001', title: 'NDA 계약서', body: '...' }}
 *     signerName="홍길동"
 *     signerId="signer-001"
 *     onComplete={(sig) => handleSigned(sig)}
 *   />
 */

import { useState } from "react"
import { X, FileText, ShieldCheck, CheckCircle2, Users, Clock, AlertTriangle } from "lucide-react"
import { SignaturePad } from "./signature-pad"

interface SignerInfo {
  id: string
  name: string
  role: "SELLER" | "BUYER" | "AGENT" | "WITNESS"
  status: "PENDING" | "SIGNED" | "INVITED"
}

interface SignDocument {
  id: string
  title: string
  body: string           // 계약서 본문
  documentHash?: string  // SHA-256 hash (서버에서 생성)
}

interface SignModalProps {
  open: boolean
  onClose: () => void
  document: SignDocument
  signerName: string
  signerId: string
  signers?: SignerInfo[]       // 전체 서명자 목록 (진행 상황 표시용)
  onComplete?: (signatureDataUrl: string) => void
  disabled?: boolean
}

const ROLE_LABEL: Record<string, string> = {
  SELLER: "매도자", BUYER: "매수자", AGENT: "대리인", WITNESS: "입회인",
}

const ROLE_COLOR: Record<string, string> = {
  SELLER: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  BUYER: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  AGENT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  WITNESS: "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border-[var(--color-border-subtle)]",
}

export function SignModal({
  open,
  onClose,
  document,
  signerName,
  signerId,
  signers = [],
  onComplete,
  disabled = false,
}: SignModalProps) {
  const [step, setStep] = useState<"preview" | "sign" | "done">("preview")
  const [agreed, setAgreed] = useState(false)
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null)

  if (!open) return null

  const handleSign = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl)
  }

  const handleSubmit = async () => {
    if (!signatureDataUrl) return
    setStep("done")
    onComplete?.(signatureDataUrl)
  }

  const signedCount = signers.filter(s => s.status === "SIGNED").length
  const totalSigners = signers.length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(3, 8, 16, 0.85)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl"
        style={{ backgroundColor: "#080F1E", border: "1px solid #0F1F35" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: "#0F1F35" }}
        >
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-emerald-400" />
            <span className="text-white font-bold text-[0.9375rem]">전자계약 서명</span>
            <span className="text-xs text-[var(--color-text-muted)] font-mono ml-1">{document.id}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Progress indicator */}
        {totalSigners > 0 && (
          <div
            className="flex items-center gap-3 px-6 py-3 border-b"
            style={{ borderColor: "#0F1F35", backgroundColor: "#050D1A" }}
          >
            <Users size={13} className="text-[var(--color-text-muted)] shrink-0" />
            <span className="text-xs text-[var(--color-text-muted)] font-semibold">서명 진행:</span>
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {signers.map(s => (
                <div key={s.id} className="flex items-center gap-1.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      s.status === "SIGNED" ? "bg-emerald-400" :
                      s.status === "INVITED" ? "bg-amber-400 animate-pulse" :
                      "bg-slate-600"
                    }`}
                  />
                  <span className={`text-[0.6875rem] font-medium ${
                    s.status === "SIGNED" ? "text-emerald-400" : "text-[var(--color-text-muted)]"
                  }`}>
                    {s.name}
                  </span>
                  <span className={`text-[0.625rem] px-1.5 py-0.5 rounded border font-bold ${ROLE_COLOR[s.role] || ROLE_COLOR.WITNESS}`}>
                    {ROLE_LABEL[s.role] || s.role}
                  </span>
                </div>
              ))}
            </div>
            <span className="text-xs text-[var(--color-text-muted)] shrink-0">
              {signedCount}/{totalSigners}
            </span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {step === "preview" && (
            <>
              {/* Document preview */}
              <div>
                <h3 className="text-white font-bold text-sm mb-3">{document.title}</h3>
                <div
                  className="rounded-xl p-4 text-xs text-slate-300 leading-relaxed max-h-48 overflow-y-auto font-mono whitespace-pre-wrap"
                  style={{ backgroundColor: "#0A1628", border: "1px solid #0F1F35" }}
                >
                  {document.body}
                </div>
                {document.documentHash && (
                  <div className="flex items-center gap-2 mt-2">
                    <ShieldCheck size={11} className="text-emerald-400 shrink-0" />
                    <span className="text-[0.625rem] text-[var(--color-text-muted)] font-mono break-all">
                      SHA-256: {document.documentHash}
                    </span>
                  </div>
                )}
              </div>

              {/* Agreement checkbox */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-500"
                />
                <span className="text-xs text-slate-300 leading-relaxed">
                  본인은 위 계약서의 내용을 충분히 검토하였으며, 전자서명이 자필서명과 동일한 법적 효력을 가짐에 동의합니다.
                  (전자서명법 제3조)
                </span>
              </label>

              <button
                onClick={() => setStep("sign")}
                disabled={!agreed}
                className="w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: agreed ? "#10B981" : "#0F1F35",
                  color: agreed ? "#041915" : "#64748B",
                }}
              >
                서명하기
              </button>
            </>
          )}

          {step === "sign" && (
            <>
              <div>
                <p className="text-sm text-slate-300 mb-1 font-semibold">서명자: {signerName}</p>
                <p className="text-xs text-[var(--color-text-muted)] mb-4">
                  아래 서명 패드에 서명하세요. 터치 또는 마우스로 입력 가능합니다.
                </p>
                <SignaturePad
                  onSign={handleSign}
                  onClear={() => setSignatureDataUrl(null)}
                  width={540}
                  height={160}
                  disabled={disabled}
                />
              </div>

              {/* Legal notice */}
              <div
                className="flex gap-3 p-3 rounded-xl"
                style={{ backgroundColor: "#0A1628", border: "1px solid #F59E0B22" }}
              >
                <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
                  서명 확인 후 제출 시 서명 이미지와 타임스탬프가 SHA-256 해시 체인에 기록됩니다.
                  서명은 취소할 수 없으며 법적 효력이 발생합니다.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("preview")}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--color-text-muted)] hover:text-white transition-colors"
                  style={{ border: "1px solid #0F1F35" }}
                >
                  이전
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!signatureDataUrl || disabled}
                  className="flex-2 flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: signatureDataUrl ? "#10B981" : "#0F1F35",
                    color: signatureDataUrl ? "#041915" : "#64748B",
                  }}
                >
                  서명 제출
                </button>
              </div>
            </>
          )}

          {step === "done" && (
            <div className="text-center py-6 space-y-4">
              <div
                className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                style={{ backgroundColor: "#10B98122", border: "1px solid #10B98144" }}
              >
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-2">서명이 완료되었습니다</h3>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {signerName}님의 전자서명이 해시 체인에 기록되었습니다.
                </p>
              </div>
              {signatureDataUrl && (
                <div
                  className="rounded-xl p-4 inline-block"
                  style={{ backgroundColor: "#0A1628", border: "1px solid #0F1F35" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={signatureDataUrl} alt="서명" className="max-w-xs h-auto" />
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
                <Clock size={11} />
                {new Date().toLocaleString("ko-KR")}
              </div>
              {totalSigners > 0 && signedCount < totalSigners && (
                <p className="text-xs text-amber-400">
                  나머지 {totalSigners - signedCount}명의 서명을 기다리는 중입니다.
                </p>
              )}
              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ backgroundColor: "#0F1F35", border: "1px solid #1E3A5F" }}
              >
                닫기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
