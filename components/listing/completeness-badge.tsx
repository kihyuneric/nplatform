/**
 * components/listing/completeness-badge.tsx
 *
 * 매물 자료 완성도 뱃지 (0~10점).
 * 매물 카드·상세·관리자 목록에서 공통 사용.
 */

'use client'

import { getCompletenessBadge, getProvidedFieldsList } from '@/lib/data-completeness'
import type { DealListingRecord } from '@/lib/db-types'

// ─── 단일 뱃지 ────────────────────────────────────────────
interface CompletenessBadgeProps {
  score: number
  size?: 'sm' | 'md'
  className?: string
}

export function CompletenessBadge({
  score,
  size = 'sm',
  className = '',
}: CompletenessBadgeProps) {
  const s = getCompletenessBadge(score)

  const paddings = size === 'md' ? '5px 12px' : '3px 9px'
  const fontSize = size === 'md' ? 12 : 11

  return (
    <span
      className={className}
      title={s.hint}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: paddings,
        fontSize,
        fontWeight: 700,
        lineHeight: 1,
        backgroundColor: s.bgColor,
        color: s.color,
        border: `1px solid ${s.borderColor}`,
        borderRadius: 4,
        whiteSpace: 'nowrap',
      }}
    >
      <CheckIcon color={s.color} />
      {s.label}
    </span>
  )
}

// ─── 제공/미제공 항목 체크리스트 ──────────────────────────
interface ProvidedFieldsProps {
  listing: DealListingRecord
  layout?: 'row' | 'grid'
  size?: 'xs' | 'sm'
}

export function ProvidedFields({
  listing,
  layout = 'row',
  size = 'xs',
}: ProvidedFieldsProps) {
  const items = getProvidedFieldsList(listing)

  const fontSize = size === 'sm' ? 11 : 10
  const containerStyle: React.CSSProperties = layout === 'grid'
    ? { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }
    : { display: 'flex', flexWrap: 'wrap', gap: 6 }

  // McKinsey mono editorial — 색상 차별화 X. 위계는 typography weight + brass dot 으로.
  return (
    <div style={containerStyle}>
      {items.map(item => (
        <span
          key={item.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 7px',
            fontSize,
            fontWeight: item.provided ? 600 : 400,
            lineHeight: 1.3,
            borderRadius: 3,
            backgroundColor: 'transparent',
            color: item.provided ? '#051C2C' : 'rgba(5, 28, 44, 0.40)',
            border: `1px solid ${item.provided ? 'rgba(5, 28, 44, 0.25)' : 'rgba(5, 28, 44, 0.10)'}`,
            whiteSpace: 'nowrap',
            textDecoration: item.provided ? 'none' : 'line-through',
            textDecorationColor: 'rgba(5, 28, 44, 0.30)',
          }}
        >
          <span aria-hidden style={{ fontSize: fontSize + 1, color: item.provided ? 'var(--color-editorial-gold, #2251FF)' : 'rgba(5, 28, 44, 0.30)' }}>
            {item.provided ? '✓' : '·'}
          </span>
          {item.label}
        </span>
      ))}
    </div>
  )
}

// ─── 아이콘 ───────────────────────────────────────────────
function CheckIcon({ color }: { color: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
      <path d="M5 12l4 4L19 7" stroke={color} strokeWidth="3"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
