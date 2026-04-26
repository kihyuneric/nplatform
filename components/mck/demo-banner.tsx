"use client"

import Link from "next/link"
import { Sparkles, ArrowRight } from "lucide-react"
import { MCK } from "@/lib/mck-design"

/**
 * MckDemoBanner — "체험 모드" / "샘플 데이터" 표시 배너.
 *
 * API 실패 fallback / 비로그인 상태 / 데모 모드일 때 페이지 상단에 노출.
 * brass top accent + ink 배경 + 흰 글씨로 McKinsey 톤 유지.
 */
export function MckDemoBanner({
  message = "체험 모드 — 샘플 데이터를 표시 중입니다. 로그인 후 실제 데이터로 전환됩니다.",
  ctaLabel = "로그인하기",
  ctaHref = "/login",
  sticky = true,
}: {
  message?: string
  ctaLabel?: string
  ctaHref?: string
  sticky?: boolean
}) {
  return (
    <div
      style={{
        position: sticky ? "sticky" : "relative",
        top: 0,
        zIndex: 30,
        background: MCK.ink,
        borderTop: `2px solid ${MCK.brass}`,
        borderBottom: `1px solid rgba(184, 146, 75, 0.35)`,
      }}
    >
      <div
        className="max-w-[1280px] mx-auto"
        style={{
          padding: "10px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, flex: "1 1 auto", minWidth: 0 }}>
          <Sparkles size={14} style={{ color: MCK.brassLight, flexShrink: 0 }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: MCK.paper,
              letterSpacing: "0.01em",
            }}
          >
            {message}
          </span>
        </div>
        <Link
          href={ctaHref}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            background: MCK.brass,
            color: MCK.ink,
            fontSize: 11,
            fontWeight: 800,
            textDecoration: "none",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            flexShrink: 0,
          }}
        >
          {ctaLabel}
          <ArrowRight size={12} style={{ color: MCK.ink }} />
        </Link>
      </div>
    </div>
  )
}
