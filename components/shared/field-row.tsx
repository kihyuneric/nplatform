/**
 * components/shared/field-row.tsx
 *
 * 라벨/값 표시용 공통 행.
 * 상태: 제공됨 / 미제공 / 마스킹 / 잠금(티어 미달)
 *
 * 매물 상세의 모든 단일 필드 표시에 사용.
 */

'use client'

import type { AccessTier } from '@/lib/access-tier'
import { canAccess, TIER_META } from '@/lib/access-tier'

export type FieldStatus = 'provided' | 'missing' | 'masked' | 'locked'

interface FieldRowProps {
  label: string
  value?: React.ReactNode
  /** 필드 이름 (티어 판정용, 선택) */
  fieldName?: string
  /** 현재 사용자 티어 (필드 이름과 함께 쓰면 자동 잠금 판정) */
  currentTier?: AccessTier
  /** 명시적 상태 지정 (fieldName/currentTier보다 우선) */
  status?: FieldStatus
  /** 보조 설명 (값 아래 작은 글씨) */
  hint?: string
  /** 값 옆 우측에 표시할 작은 뱃지 */
  rightBadge?: React.ReactNode
  /** 다크 배경에 사용될지 */
  theme?: 'light' | 'dark'
}

export function FieldRow({
  label,
  value,
  fieldName,
  currentTier,
  status,
  hint,
  rightBadge,
  theme = 'light',
}: FieldRowProps) {
  // 상태 자동 판정
  const resolvedStatus: FieldStatus =
    status ??
    (value == null || value === ''
      ? 'missing'
      : fieldName && currentTier && !canAccess(fieldName, currentTier)
      ? 'locked'
      : 'provided')

  const isDark = theme === 'dark'
  const labelColor = isDark ? '#94A3B8' : '#64748B'
  const valueColor = isDark ? '#E2E8F0' : '#0F172A'
  const missingColor = isDark ? '#64748B' : '#94A3B8'
  const borderColor = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.2)'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 0',
        borderBottom: `1px solid ${borderColor}`,
      }}
    >
      <div
        style={{
          flex: '0 0 130px',
          fontSize: 12,
          fontWeight: 600,
          color: labelColor,
          paddingTop: 2,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {resolvedStatus === 'provided' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: valueColor }}>
              {value}
            </div>
            {rightBadge}
          </div>
        )}
        {resolvedStatus === 'missing' && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 600,
              color: missingColor,
              backgroundColor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.1)',
              border: `1px dashed ${isDark ? 'rgba(148,163,184,0.3)' : 'rgba(148,163,184,0.4)'}`,
              borderRadius: 4,
            }}
          >
            자료 미제공
          </span>
        )}
        {resolvedStatus === 'masked' && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 13,
              fontWeight: 700,
              color: '#475569',
              letterSpacing: '0.1em',
            }}
          >
            ●●●●●
            <span style={{ fontSize: 10, fontWeight: 600, color: labelColor, marginLeft: 4 }}>
              개인정보 마스킹
            </span>
          </span>
        )}
        {resolvedStatus === 'locked' && fieldName && (
          <LockedValue fieldName={fieldName} />
        )}
        {hint && (
          <div style={{ marginTop: 4, fontSize: 11, color: labelColor, lineHeight: 1.4 }}>
            {hint}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 잠금 상태 표시 ─────────────────────────────────
function LockedValue({ fieldName }: { fieldName: string }) {
  // 필드 이름에서 필요 티어를 역추적 (간단 버전)
  // canAccess가 false였으므로 L1~L3 중 하나 — 정확 산출은 FIELD_TIER_MAP 직접 조회
  const { FIELD_TIER_MAP } = require('@/lib/access-tier') as typeof import('@/lib/access-tier')
  const required = FIELD_TIER_MAP[fieldName] ?? 'L1'
  const meta = TIER_META[required]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        fontSize: 11,
        fontWeight: 700,
        color: meta.color,
        backgroundColor: `${meta.color}14`,
        border: `1px solid ${meta.color}40`,
        borderRadius: 4,
      }}
    >
      🔒 {meta.requirement} 필요
    </span>
  )
}
