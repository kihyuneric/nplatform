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
            fontWeight: 600,
            lineHeight: 1.3,
            borderRadius: 3,
            backgroundColor: item.provided ? 'rgba(16, 185, 129, 0.08)' : 'rgba(148, 163, 184, 0.08)',
            color: item.provided ? '#10B981' : '#94A3B8',
            border: `1px solid ${item.provided ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.18)'}`,
            whiteSpace: 'nowrap',
          }}
        >
          <span aria-hidden style={{ fontSize: fontSize + 1 }}>
            {item.provided ? '✓' : '✗'}
          </span>
          {item.label}
          {!item.provided && <span style={{ opacity: 0.6, marginLeft: 2 }}>미제공</span>}
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
