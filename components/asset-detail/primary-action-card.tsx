/**
 * PrimaryActionCard — 단일 티어 인지 CTA (DR-4 · 2026-04-21)
 *
 * 글로벌 핀테크 패턴 (Robinhood "Buy" · Stripe "Pay"):
 *   이 페이지의 유일한 Primary action. 티어에 따라 자동 전환.
 *
 * 데스크톱: 우측 카드 (sticky within hero)
 * 모바일: 하단 sticky bar
 */

"use client"

import { ArrowRight, FileSignature, FileCheck, PenLine, Wallet, CheckCircle2, Heart, LogIn, Shield } from "lucide-react"
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

interface Cta {
  label: string
  subtitle: string
  hint?: string
  icon: ReactNode
  bg: string
  fg: string
}

const CTA: Record<AssetTier, Cta> = {
  L0: {
    label: "로그인하고 관심 표시",
    subtitle: "30초 · 무료 가입",
    hint: "로그인 후 본인인증 시 L1 공개 정보 열람",
    icon: <LogIn className="w-5 h-5" />,
    bg: "var(--color-brand-dark)",
    fg: "var(--fg-on-brand)",
  },
  L1: {
    label: "전문투자자 인증 → NDA",
    subtitle: "5분 · KYC + NDA 자동",
    hint: "NDA 체결 시 등기원본 · 임대차 · 사진 열람",
    icon: <Shield className="w-5 h-5" />,
    bg: "var(--color-brand-bright)",
    fg: "var(--fg-on-brand)",
  },
  L2: {
    label: "LOI 제출하기",
    subtitle: "매수의향서 · 3분",
    hint: "매도자 승인 시 실사 자료 · 직접 협상",
    icon: <FileCheck className="w-5 h-5" />,
    bg: "var(--color-positive)",
    fg: "#041915",
  },
  L3: {
    label: "실사 · 계약 초안",
    subtitle: "데이터룸 · 협상 진행",
    hint: "원본 자료 검토 + 계약 조건 합의",
    icon: <FileSignature className="w-5 h-5" />,
    bg: "var(--color-positive)",
    fg: "#041915",
  },
  L4: {
    label: "전자서명 · 에스크로",
    subtitle: "계약 + 입금",
    hint: "법적 효력 즉시 발생",
    icon: <PenLine className="w-5 h-5" />,
    bg: "#F59E0B",
    fg: "#1F1300",
  },
  L5: {
    label: "영수증 · 정산 내역",
    subtitle: "거래 완료",
    hint: "최종 내역 다운로드",
    icon: <CheckCircle2 className="w-5 h-5" />,
    bg: "var(--fg-muted)",
    fg: "var(--fg-on-brand)",
  },
}

export function PrimaryActionCard({
  tier,
  onAction,
  loading = false,
  variant = "desktop",
}: PrimaryActionCardProps) {
  const cta = CTA[tier]

  if (variant === "mobile-sticky") {
    return (
      <div
        className="md:hidden fixed left-0 right-0 bottom-0 z-40 border-t backdrop-blur"
        style={{
          backgroundColor: "var(--layer-1-bg)",
          borderColor: "var(--layer-border-strong)",
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={onAction}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-black transition-opacity disabled:opacity-60"
          style={{
            padding: "14px 18px",
            fontSize: 15,
            backgroundColor: cta.bg,
            color: cta.fg,
          }}
        >
          {cta.icon}
          {loading ? "처리 중..." : cta.label}
          <ArrowRight className="w-4 h-4" />
        </button>
        <div
          className="text-center mt-1.5 font-semibold"
          style={{ fontSize: 11, color: "var(--fg-muted)" }}
        >
          {cta.subtitle}
        </div>
      </div>
    )
  }

  // Desktop card
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        backgroundColor: "var(--layer-1-bg)",
        border: "1px solid var(--layer-border-strong)",
        boxShadow: "0 4px 16px rgba(27, 58, 92, 0.08)",
      }}
    >
      <div
        className="font-bold uppercase"
        style={{
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "var(--fg-muted)",
          marginBottom: 10,
        }}
      >
        다음 단계
      </div>
      <button
        type="button"
        onClick={onAction}
        disabled={loading}
        className="w-full inline-flex items-center justify-between gap-3 rounded-xl font-black transition-all hover:scale-[1.015] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          padding: "16px 18px",
          fontSize: 15,
          backgroundColor: cta.bg,
          color: cta.fg,
        }}
      >
        <span className="flex items-center gap-2">
          {cta.icon}
          <span className="text-left">
            <span className="block leading-tight">{loading ? "처리 중..." : cta.label}</span>
            <span
              className="block font-semibold opacity-80 mt-0.5"
              style={{ fontSize: 11 }}
            >
              {cta.subtitle}
            </span>
          </span>
        </span>
        <ArrowRight className="w-5 h-5 flex-shrink-0" />
      </button>
      {cta.hint && (
        <p
          className="mt-3 leading-relaxed"
          style={{ fontSize: 11, color: "var(--fg-muted)" }}
        >
          {cta.hint}
        </p>
      )}
    </div>
  )
}
