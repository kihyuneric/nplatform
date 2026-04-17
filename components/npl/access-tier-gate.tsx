"use client"

// ─── AccessTierGate ─────────────────────────────────────────
// L0~L3 권한 단계에 따라 콘텐츠를 가림 / 노출 제어.
// 가려진 영역에는 "다음 단계로 진행" CTA를 노출 — 이것이 lock-in funnel의
// 시각적 트리거. 사용자가 매 페이지에서 "한 단계만 더 가면 보인다"는
// 인지를 받게 만들어야 함.

import * as React from "react"
import Link from "next/link"
import { Lock, ShieldCheck, ArrowRight } from "lucide-react"
import type { AccessTier } from "@/lib/types"

const TIER_RANK: Record<AccessTier, number> = { L0: 0, L1: 1, L2: 2, L3: 3 }

const TIER_REQUIREMENT: Record<AccessTier, { label: string; how: string; href: string }> = {
  L0: {
    label: "공개 정보",
    how: "누구나 열람 가능",
    href: "/exchange",
  },
  L1: {
    label: "PASS 본인인증 필요",
    how: "PASS 본인인증으로 1단계 권한 획득",
    href: "/my/settings?tab=identity",
  },
  L2: {
    label: "기관 인증(KYB) 필요",
    how: "사업자 등록증 + 보증금으로 2단계 권한 획득",
    href: "/my/settings?tab=kyb",
  },
  L3: {
    label: "LOI 체결 후 열람",
    how: "딜룸 입장 + LOI 제출 후 실사 자료 공개",
    href: "/exchange",
  },
}

interface AccessTierGateProps {
  /** 콘텐츠를 보기 위해 필요한 최소 티어 */
  required: AccessTier
  /** 현재 사용자의 티어 */
  userTier: AccessTier
  /** 가려졌을 때 미리보기 (블러 처리) */
  preview?: React.ReactNode
  /** 가려졌을 때 표시할 안내 메시지 (기본값 자동 매핑) */
  message?: string
  children: React.ReactNode
  className?: string
}

export function AccessTierGate({
  required,
  userTier,
  preview,
  message,
  children,
  className = "",
}: AccessTierGateProps) {
  const allowed = TIER_RANK[userTier] >= TIER_RANK[required]
  const req = TIER_REQUIREMENT[required]

  if (allowed) {
    return <>{children}</>
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-[var(--color-border-subtle)] ${className}`}>
      {/* 블러 처리된 미리보기 (있으면) */}
      {preview && (
        <div
          className="select-none pointer-events-none"
          style={{ filter: "blur(8px)", opacity: 0.55 }}
          aria-hidden="true"
        >
          {preview}
        </div>
      )}

      {/* Lock 오버레이 */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
        <div className="text-center px-6 py-8 max-w-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-brand-mid)]/10 mb-3">
            <Lock className="w-5 h-5 text-[var(--color-brand-mid)]" />
          </div>
          <p className="text-[0.6875rem] font-bold text-[var(--color-brand-mid)] uppercase tracking-wider mb-1">
            {required} · {req.label}
          </p>
          <p className="text-[0.875rem] text-[var(--color-text-secondary)] mb-4 leading-relaxed">
            {message ?? req.how}
          </p>
          <Link
            href={req.href}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-brand-dark)] text-white text-[0.8125rem] font-semibold rounded-lg hover:bg-[var(--color-brand-mid)] transition-colors"
          >
            <ShieldCheck className="w-4 h-4" />
            권한 획득
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
