"use client"

import type { ComponentType, CSSProperties } from "react"
import { MCK, MCK_FONTS } from "@/lib/mck-design"
import { MckCta } from "./cta"

/**
 * MckEmptyState — 화이트 페이퍼 빈 상태/오류 카드.
 *
 * 사용처: 데이터 0건, 오류 발생, 권한 없음 등.
 * actionLabel 가 주어지면 우측 정렬 CTA 자동 표시.
 */
export function MckEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onActionClick,
  variant = "info",
}: {
  icon?: ComponentType<{ size?: number; style?: CSSProperties }>
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onActionClick?: () => void
  variant?: "info" | "error" | "demo"
}) {
  const accent = variant === "error" ? MCK.danger : variant === "demo" ? MCK.brass : MCK.ink
  return (
    <div
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        borderTop: `2px solid ${accent}`,
        padding: "48px 32px",
        textAlign: "center",
      }}
    >
      {Icon && (
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: `${accent}1A`,
            border: `1px solid ${accent}55`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
          }}
        >
          <Icon size={24} style={{ color: accent }} />
        </div>
      )}
      <h3
        style={{
          color: MCK.ink,
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          marginBottom: description ? 8 : 18,
          fontFamily: MCK_FONTS.serif,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            color: MCK.textSub,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.55,
            maxWidth: 480,
            margin: "0 auto 24px",
          }}
        >
          {description}
        </p>
      )}
      {actionLabel && (onActionClick || actionHref) && (
        <MckCta
          label={actionLabel}
          href={actionHref}
          onClick={onActionClick}
          variant="primary"
          size="md"
        />
      )}
    </div>
  )
}
