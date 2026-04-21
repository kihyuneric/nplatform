/**
 * TierNav — 자산 상세 페이지 L0~L5 섹션 네비게이션 (DR-10 · 2026-04-21)
 *
 * 16개 항목을 티어별로 그룹핑하여 2-줄 그리드로 표시.
 * 각 항목 클릭 시 해당 섹션으로 스크롤.
 *
 * 공개 레벨:
 *   L0 : AI 분석 리포트, 권리관계 요약, 등기부등본 요약, 임차인
 *   L1 : (본인인증) — 위 4개 이용 가능
 *   L2 : (NDA) 감정평가서, 등기부등본 원본, 현장사진, 채권정보, 채팅
 *   L2 : (NDA 액션) NDA
 *   L3 : (LOI) 채권 오퍼, LOI, 실사 체크리스트
 *   L4 : 계약서 초안, 에스크로
 *   L5 : 완료(정산)
 */

"use client"

import type { AssetTier } from "@/hooks/use-asset-tier"
import {
  Brain, Scale, FileText, Users2, FileBarChart, BookOpen, Image as ImageIcon,
  Coins, FileSignature, MessageSquare, HandCoins, FileCheck,
  FileEdit, Wallet, Trophy, Lock, Gavel, Landmark, ClipboardList,
} from "lucide-react"
import type { ReactNode } from "react"

/** tier 비교: a ≥ b */
function tierGte(a: AssetTier, b: AssetTier): boolean {
  const order: AssetTier[] = ["L0", "L1", "L2", "L3", "L4", "L5"]
  return order.indexOf(a) >= order.indexOf(b)
}

export interface TierNavItem {
  key: string
  label: string
  sub?: string
  requiredTier: AssetTier
  icon: ReactNode
  /** 클릭 시 스크롤할 DOM id (해당 id 를 가진 섹션이 있어야 함) */
  anchor?: string
}

const ITEMS: TierNavItem[] = [
  // ──────── L0 · 공개 (로그인 불필요) ────────
  { key: "ai",           label: "AI 분석",     sub: "리포트",       requiredTier: "L0", icon: <Brain className="w-4 h-4" />,          anchor: "ai-report" },
  { key: "rights",       label: "권리관계",    sub: "요약",         requiredTier: "L0", icon: <Scale className="w-4 h-4" />,          anchor: "rights" },

  // ──────── L1 · 본인인증 후 ────────
  { key: "deed-summary", label: "등기부등본",  sub: "요약",         requiredTier: "L1", icon: <FileText className="w-4 h-4" />,       anchor: "deed-summary" },
  { key: "lease",        label: "임대차 현황", sub: "",             requiredTier: "L1", icon: <Users2 className="w-4 h-4" />,         anchor: "tenants" },
  { key: "appraisal",    label: "감정평가서",  sub: "",             requiredTier: "L1", icon: <FileBarChart className="w-4 h-4" />,   anchor: "appraisal" },
  { key: "auction-info", label: "경매 정보",   sub: "",             requiredTier: "L1", icon: <Gavel className="w-4 h-4" />,          anchor: "auction-info" },
  { key: "public-sale",  label: "공매 정보",   sub: "",             requiredTier: "L1", icon: <Landmark className="w-4 h-4" />,       anchor: "public-sale" },

  // ──────── L2 · NDA 체결 후 ────────
  { key: "deed-full",    label: "등기부등본",  sub: "원본",         requiredTier: "L2", icon: <BookOpen className="w-4 h-4" />,       anchor: "deed-full" },
  { key: "site-photos",  label: "현장사진",    sub: "",             requiredTier: "L2", icon: <ImageIcon className="w-4 h-4" />,      anchor: "site-photos" },
  { key: "debt",         label: "채권정보",    sub: "",             requiredTier: "L2", icon: <Coins className="w-4 h-4" />,          anchor: "debt-info" },
  { key: "nda",          label: "NDA",         sub: "",             requiredTier: "L2", icon: <FileSignature className="w-4 h-4" />,  anchor: "nda" },
  { key: "chat",         label: "채팅",        sub: "",             requiredTier: "L2", icon: <MessageSquare className="w-4 h-4" />,  anchor: "chat" },
  { key: "offer",        label: "가격 오퍼",   sub: "",             requiredTier: "L2", icon: <HandCoins className="w-4 h-4" />,      anchor: "offer" },
  { key: "due-diligence",label: "실사",        sub: "",             requiredTier: "L2", icon: <ClipboardList className="w-4 h-4" />,  anchor: "due-diligence" },

  // ──────── L3 · LOI ────────
  { key: "loi",          label: "LOI",         sub: "",             requiredTier: "L3", icon: <FileCheck className="w-4 h-4" />,      anchor: "loi" },
  { key: "contract",     label: "계약서",      sub: "초안",         requiredTier: "L3", icon: <FileEdit className="w-4 h-4" />,       anchor: "loi" },

  // ──────── L4 · 에스크로 결제 ────────
  { key: "escrow",       label: "에스크로",    sub: "결제",         requiredTier: "L4", icon: <Wallet className="w-4 h-4" />,         anchor: "escrow" },

  // ──────── L5 · 현장 계약 ────────
  { key: "contract-final", label: "계약",      sub: "(현장계약)",   requiredTier: "L5", icon: <Trophy className="w-4 h-4" />,         anchor: "contract-final" },
]

export interface TierNavProps {
  /** 현재 사용자 effective tier */
  tier: AssetTier
  /** 클릭 시 스크롤 외 추가 핸들러 (예: analytics) */
  onItemClick?: (item: TierNavItem) => void
}

export function TierNav({ tier, onItemClick }: TierNavProps) {
  return (
    <nav
      aria-label="자산 섹션 네비게이션"
      className="max-w-[1280px] mx-auto"
      style={{ padding: "4px 24px 16px" }}
    >
      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
        }}
      >
        {ITEMS.map((item) => {
          const unlocked = tierGte(tier, item.requiredTier)
          const href = item.anchor ? `#${item.anchor}` : undefined
          const commonCls =
            "group inline-flex flex-col items-start justify-between gap-1 rounded-xl text-left transition-all px-3 py-2.5 border"
          const unlockedCls =
            "bg-[var(--layer-1-bg)] border-[var(--layer-border-strong)] hover:border-[var(--color-brand-bright)] hover:bg-[var(--color-brand-bright-bg,rgba(46,117,182,0.08))] cursor-pointer"
          const lockedCls =
            "bg-transparent border-[var(--layer-border-strong)] opacity-55 cursor-not-allowed"

          const content = (
            <>
              <div className="flex items-center justify-between w-full">
                <span
                  className="inline-flex items-center gap-1.5"
                  style={{ color: unlocked ? "var(--color-brand-bright)" : "var(--fg-subtle)" }}
                >
                  {item.icon}
                </span>
                {!unlocked ? (
                  <Lock className="w-3 h-3" style={{ color: "var(--fg-subtle)" }} />
                ) : (
                  <span
                    className="text-[9px] font-black px-1 rounded"
                    style={{
                      letterSpacing: "0.04em",
                      backgroundColor: "var(--layer-2-bg)",
                      color: "var(--fg-muted)",
                    }}
                  >
                    {item.requiredTier}
                  </span>
                )}
              </div>
              <div className="w-full">
                <div
                  className="font-black leading-tight"
                  style={{
                    fontSize: 12,
                    color: unlocked ? "var(--color-text-primary)" : "var(--fg-subtle)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.label}
                </div>
                {item.sub && (
                  <div
                    className="font-semibold leading-tight mt-0.5"
                    style={{
                      fontSize: 10,
                      color: unlocked ? "var(--fg-muted)" : "var(--fg-subtle)",
                    }}
                  >
                    {item.sub}
                  </div>
                )}
              </div>
            </>
          )

          if (unlocked && href) {
            return (
              <a
                key={item.key}
                href={href}
                onClick={() => onItemClick?.(item)}
                className={`${commonCls} ${unlockedCls}`}
                title={`${item.label} ${item.sub ?? ""}`.trim()}
              >
                {content}
              </a>
            )
          }
          return (
            <div
              key={item.key}
              className={`${commonCls} ${lockedCls}`}
              aria-disabled
              title={`${item.requiredTier} 이상 필요`}
            >
              {content}
            </div>
          )
        })}
      </div>
    </nav>
  )
}
