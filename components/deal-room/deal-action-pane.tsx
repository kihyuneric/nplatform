/**
 * DealActionPane — 중앙 "지금 할 일" 영역 (DR-2b, 2026-04-21)
 *
 * 계획서 §4.3 티어별 Primary CTA 매핑:
 * L0 "관심 표시하기" → L1 "NDA 서명" → L2 "LOI 제출" → L3 "실사·계약" → L4 "전자서명·에스크로" → L5 "정산 확인"
 *
 * 중앙에 단 하나의 큰 Primary CTA + 최근 오퍼 + 부가 액션 (실사 자료 요청 · 추가 질문)
 */

"use client"

import { ReactNode } from "react"
import { ArrowRight, FileSignature, FileCheck, PenLine, Wallet, CheckCircle2, Heart } from "lucide-react"
import type { TierLevel } from "./deal-summary-pane"
import { formatKRW } from "@/lib/design-system"

export interface RecentOffer {
  label: string              // 예: "1차 오퍼"
  amount: number
  status: string             // 예: "48h 응답 대기"
  date?: string
}

export interface DealActionPaneProps {
  /** 현재 티어 (Primary CTA 결정) */
  tier: TierLevel
  /** CTA 클릭 핸들러 */
  onPrimaryAction: () => void
  /** 최근 오퍼 (선택) */
  recentOffer?: RecentOffer
  /** 부가 액션 리스트 */
  secondaryActions?: Array<{ label: string; onClick: () => void; icon?: ReactNode }>
}

interface CtaConfig {
  label: string
  icon: ReactNode
  description: string
  variant: "primary" | "accent" | "gold"
}

const CTA_BY_TIER: Record<TierLevel, CtaConfig> = {
  L0: {
    label: "관심 표시하기",
    icon: <Heart className="w-5 h-5" />,
    description: "무료 · 즉시 딜룸 생성",
    variant: "primary",
  },
  L1: {
    label: "NDA 서명하고 상세 열람",
    icon: <FileSignature className="w-5 h-5" />,
    description: "비밀유지계약 체결로 L2 공개 정보 열람",
    variant: "accent",
  },
  L2: {
    label: "LOI 제출",
    icon: <FileCheck className="w-5 h-5" />,
    description: "매수의향서 작성 → 매도자 승인 대기",
    variant: "accent",
  },
  L3: {
    label: "실사 · 계약 초안 검토",
    icon: <FileCheck className="w-5 h-5" />,
    description: "원본 자료 검토 후 계약 조건 합의",
    variant: "accent",
  },
  L4: {
    label: "전자서명 · 에스크로 입금",
    icon: <PenLine className="w-5 h-5" />,
    description: "계약서 서명 + 에스크로 계좌 입금",
    variant: "gold",
  },
  L5: {
    label: "정산 확인 · 영수증 다운로드",
    icon: <CheckCircle2 className="w-5 h-5" />,
    description: "거래 완료 · 최종 정산 내역 확인",
    variant: "primary",
  },
}

export function DealActionPane({ tier, onPrimaryAction, recentOffer, secondaryActions }: DealActionPaneProps) {
  const cta = CTA_BY_TIER[tier]

  const ctaBg =
    cta.variant === "primary"
      ? "bg-gradient-to-br from-[var(--color-brand-mid)] to-[var(--color-brand-dark)] text-white"
      : cta.variant === "accent"
      ? "bg-gradient-to-br from-[var(--color-accent-default)] to-[var(--color-accent-dark)] text-white"
      : "bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950"

  return (
    <div className="space-y-4">
      {/* Primary CTA — 크게 */}
      <button
        onClick={onPrimaryAction}
        className={`${ctaBg} w-full rounded-2xl p-6 text-left transition-transform hover:scale-[1.01] active:scale-[0.99] shadow-lg`}
        aria-label={cta.label}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 opacity-90">
            {cta.icon}
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider">지금 할 일</span>
          </div>
          <ArrowRight className="w-5 h-5 opacity-75" />
        </div>
        <div className="mt-3 text-[1.375rem] sm:text-[1.625rem] font-bold leading-tight tracking-tight">
          {cta.label}
        </div>
        <div className="mt-1.5 text-[0.8125rem] opacity-85 tracking-normal">{cta.description}</div>
      </button>

      {/* 최근 오퍼 */}
      {recentOffer && (
        <section className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-4">
          <h3 className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">
            최근 오퍼
          </h3>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[0.75rem] text-[var(--color-text-muted)] tracking-normal">{recentOffer.label}</div>
              <div className="text-[1.1875rem] font-bold text-[var(--color-text-primary)] tabular-nums mt-0.5">
                {formatKRW(recentOffer.amount)}
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-default)] text-[0.6875rem] font-bold tracking-normal">
                {recentOffer.status}
              </div>
              {recentOffer.date && (
                <div className="text-[0.6875rem] text-[var(--color-text-muted)] mt-1 tracking-normal">
                  {recentOffer.date}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 부가 액션 */}
      {secondaryActions && secondaryActions.length > 0 && (
        <section className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl p-4">
          <h3 className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] mb-2">
            부가 액션
          </h3>
          <div className="space-y-1.5">
            {secondaryActions.map((a, i) => (
              <button
                key={i}
                onClick={a.onClick}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--color-surface-overlay)] transition-colors flex items-center gap-2 text-[0.8125rem] text-[var(--color-text-secondary)] tracking-normal"
              >
                {a.icon}
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
