/**
 * PrimaryActionCard — 단일 티어 인지 CTA (DR-7 · 2026-04-26)
 *
 * 글로벌 핀테크 패턴 (Robinhood "Buy" · Stripe "Pay"):
 *   이 페이지의 유일한 Primary action. 티어에 따라 자동 전환.
 *
 * 톤: McKinsey 단색계
 *   - L0/L1/L2 (검토 단계)  : paper bg + ink 검정 글씨 + 2px electric top  ← user 요청
 *   - L3       (오퍼/협상)    : paper bg + ink 검정 글씨 + 2px electric top
 *   - L4       (계약·결제)    : ink bg + paper text + 2px electric top  (Dominant CTA)
 *   - L5       (완료)         : paperTint bg + textMuted text  (Passive)
 *
 * 데스크톱: 우측 카드 (sticky within hero)
 * 모바일: 하단 sticky bar
 */

"use client"

import { ArrowRight, FileSignature, FileCheck, PenLine, Wallet, CheckCircle2, LogIn } from "lucide-react"
import type { ReactNode } from "react"
import type { AssetTier } from "@/hooks/use-asset-tier"

export interface PrimaryActionCardProps {
  tier: AssetTier
  /** 클릭 핸들러 */
  onAction: () => void
  /** 로딩 (액션 진행 중) */
  loading?: boolean
  /** 표시 variant — desktop=카드, mobile=sticky bar */
  variant?: "desktop" | "mobile-sticky"
}

// ─── McKinsey 팔레트 (deal-flow-view 와 동일) ────────────────────────────
const M = {
  ink:          "#0A1628",
  paper:        "#FFFFFF",
  paperTint:    "#FAFBFC",
  electric:     "#2251FF",
  border:       "rgba(10, 22, 40, 0.10)",
  borderStrong: "rgba(10, 22, 40, 0.18)",
  textSub:      "#4A5568",
  textMuted:    "#718096",
} as const

interface Cta {
  label: string
  subtitle: string
  hint?: string
  icon: ReactNode
  /** "light" = paper bg + ink text, "dark" = ink bg + paper text, "muted" = passive */
  variant: "light" | "dark" | "muted"
}

const CTA: Record<AssetTier, Cta> = {
  L0: {
    label: "투자자 인증하고 관심 표시",
    subtitle: "10초 · 투자자 인증",
    hint: "등기부 · 임대차 정보 등 L1 자료 열람 가능",
    icon: <LogIn className="w-5 h-5" />,
    variant: "light",
  },
  L1: {
    label: "NDA 체결",
    subtitle: "10초 · 비밀유지계약서",
    hint: "감정평가서 · 현장 사진 · 채권 정보",
    icon: <FileSignature className="w-5 h-5" />,
    variant: "light",
  },
  L2: {
    label: "LOI 제출하기",
    subtitle: "10초 · 매수의향서",
    hint: "채팅 · 실사 · 가격 오퍼",
    icon: <FileCheck className="w-5 h-5" />,
    variant: "light",
  },
  L3: {
    label: "에스크로 결제 · 계약",
    subtitle: "10% 보증금 + 수수료",
    hint: "매도자 승인 및 현장 계약 진행",
    icon: <Wallet className="w-5 h-5" />,
    variant: "light",
  },
  L4: {
    label: "전자서명 · 에스크로",
    subtitle: "계약 + 입금",
    hint: "법적 효력 즉시 발생",
    icon: <PenLine className="w-5 h-5" />,
    variant: "dark",
  },
  L5: {
    label: "영수증 · 정산 내역",
    subtitle: "거래 완료",
    hint: "최종 내역 다운로드",
    icon: <CheckCircle2 className="w-5 h-5" />,
    variant: "muted",
  },
}

// ─── Variant style helpers ───────────────────────────────────────────────
function buttonStyle(variant: Cta["variant"]): React.CSSProperties {
  if (variant === "dark") {
    return {
      background: M.ink,
      color: M.paper,
      border: `1px solid ${M.ink}`,
      borderTop: `2px solid ${M.electric}`,
    }
  }
  if (variant === "muted") {
    return {
      background: M.paperTint,
      color: M.textSub,
      border: `1px solid ${M.border}`,
      borderTop: `2px solid ${M.textMuted}`,
    }
  }
  // light (default)
  return {
    background: M.paper,
    color: M.ink,
    border: `1px solid ${M.borderStrong}`,
    borderTop: `2px solid ${M.electric}`,
  }
}

function textColor(variant: Cta["variant"]): string {
  if (variant === "dark") return M.paper
  if (variant === "muted") return M.textSub
  return M.ink
}

function subColor(variant: Cta["variant"]): string {
  if (variant === "dark") return "rgba(255, 255, 255, 0.72)"
  if (variant === "muted") return M.textMuted
  return M.textSub
}

export function PrimaryActionCard({
  tier,
  onAction,
  loading = false,
  variant = "desktop",
}: PrimaryActionCardProps) {
  const cta = CTA[tier]
  const btnStyle = buttonStyle(cta.variant)
  const fg = textColor(cta.variant)
  const sub = subColor(cta.variant)

  if (variant === "mobile-sticky") {
    return (
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-40"
        style={{
          background: M.paper,
          borderTop: `1px solid ${M.borderStrong}`,
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={onAction}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
          style={{
            ...btnStyle,
            padding: "13px 18px",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: fg }} className="inline-flex items-center">
            {cta.icon}
          </span>
          <span style={{ color: fg }}>{loading ? "처리 중..." : cta.label}</span>
          <ArrowRight className="w-4 h-4" style={{ color: fg }} />
        </button>
        <div
          className="text-center mt-1.5"
          style={{
            fontSize: 11,
            color: M.textMuted,
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {cta.subtitle}
        </div>
      </div>
    )
  }

  // Desktop card
  return (
    <div
      className="p-5"
      style={{
        background: M.paper,
        border: `1px solid ${M.border}`,
        borderTop: `2px solid ${M.electric}`,
      }}
    >
      <div
        className="uppercase"
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.08em",
          color: M.textMuted,
          marginBottom: 10,
        }}
      >
        다음 단계
      </div>
      <button
        type="button"
        onClick={onAction}
        disabled={loading}
        className="w-full inline-flex items-center justify-between gap-3 transition-opacity hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          ...btnStyle,
          padding: "16px 18px",
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: "-0.005em",
        }}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <span style={{ color: fg }} className="inline-flex items-center flex-shrink-0">
            {cta.icon}
          </span>
          <span className="text-left min-w-0">
            <span
              className="block leading-tight truncate"
              style={{ color: fg, fontSize: 14, fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {loading ? "처리 중..." : cta.label}
            </span>
            <span
              className="block mt-0.5 truncate"
              style={{
                color: sub,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              {cta.subtitle}
            </span>
          </span>
        </span>
        <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: fg }} />
      </button>
      {cta.hint && (
        <p
          className="mt-3 leading-relaxed"
          style={{ fontSize: 11, color: M.textMuted, letterSpacing: "-0.005em" }}
        >
          {cta.hint}
        </p>
      )}
    </div>
  )
}
