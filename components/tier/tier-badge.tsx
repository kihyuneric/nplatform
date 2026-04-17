/**
 * components/tier/tier-badge.tsx
 *
 * L0~L3 접근 티어 뱃지.
 * 매물 카드·상세·네비게이션·사용자 프로필 등 전 영역에서 재사용.
 */

'use client'

import type { AccessTier } from '@/lib/access-tier'
import { TIER_META } from '@/lib/access-tier'

interface TierBadgeProps {
  tier: AccessTier
  variant?: 'solid' | 'outline' | 'soft'
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean      // true면 "L1 본인인증" / false면 "L1"
  className?: string
}

export function TierBadge({
  tier,
  variant = 'soft',
  size = 'sm',
  showLabel = false,
  className = '',
}: TierBadgeProps) {
  const meta = TIER_META[tier]
  const text = showLabel ? meta.label : meta.shortLabel

  // 크기
  const paddings = {
    xs: '2px 6px',
    sm: '3px 8px',
    md: '5px 12px',
  }
  const fontSizes = {
    xs: 10,
    sm: 11,
    md: 13,
  }

  // 스타일 배리언트
  let bg: string, color: string, border: string
  if (variant === 'solid') {
    bg = meta.color
    color = '#FFFFFF'
    border = meta.color
  } else if (variant === 'outline') {
    bg = 'transparent'
    color = meta.color
    border = meta.color
  } else {
    // soft
    bg = `${meta.color}1A`        // 10% opacity
    color = meta.color
    border = `${meta.color}33`    // 20%
  }

  return (
    <span
      className={className}
      title={meta.description}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: paddings[size],
        fontSize: fontSizes[size],
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '0.02em',
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        borderRadius: 4,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: meta.color,
          boxShadow: variant === 'solid' ? '0 0 0 1px rgba(255,255,255,0.4)' : 'none',
        }}
      />
      {text}
    </span>
  )
}
