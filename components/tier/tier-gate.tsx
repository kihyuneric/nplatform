/**
 * components/tier/tier-gate.tsx
 *
 * 접근 제어 래퍼.
 * 현재 사용자 티어가 required 미만이면 자식을 숨기고 잠금 오버레이 + 업그레이드 CTA 표시.
 *
 * 사용 예:
 *   <TierGate required="L2" current={userTier} listingId={id}>
 *     <RegistryFullViewer url={listing.registry_full_url} />
 *   </TierGate>
 */

'use client'

import type { AccessTier } from '@/lib/access-tier'
import { TIER_META, tierGte, getNextUpgradeStep } from '@/lib/access-tier'
import { TierBadge } from './tier-badge'

interface TierGateProps {
  required: AccessTier
  current: AccessTier
  listingId?: string                  // L3 업그레이드 시 LOI 페이지 경로 생성용
  children: React.ReactNode
  /** true면 잠겼을 때 자식을 흐리게 뒤에 렌더 */
  blurContent?: boolean
  /** 잠긴 상태에서 보여줄 커스텀 메시지 */
  customMessage?: string
  /** 잠금 박스 최소 높이 */
  minHeight?: number
  /** 제공 시 href 대신 onClick 버튼으로 업그레이드 CTA 렌더 */
  onUpgradeClick?: () => void
}

export function TierGate({
  required,
  current,
  listingId,
  children,
  blurContent = true,
  customMessage,
  minHeight = 160,
  onUpgradeClick,
}: TierGateProps) {
  const unlocked = tierGte(current, required)

  if (unlocked) {
    return <>{children}</>
  }

  const meta = TIER_META[required]
  const upgrade = getUpgradeAction(current, required, listingId)

  return (
    <div
      style={{
        position: 'relative',
        minHeight,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: '#0A1628',
        border: '1px solid rgba(148, 163, 184, 0.15)',
      }}
    >
      {blurContent && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            filter: 'blur(12px)',
            opacity: 0.25,
            pointerEvents: 'none',
          }}
        >
          {children}
        </div>
      )}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: '32px 24px',
          minHeight,
          textAlign: 'center',
          backgroundColor: 'rgba(3, 8, 16, 0.72)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* 자물쇠 아이콘 */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${meta.color}1A`,
            border: `1px solid ${meta.color}55`,
          }}
        >
          <LockIcon color={meta.color} />
        </div>

        <TierBadge tier={required} size="md" showLabel />

        <div style={{ color: '#E2E8F0', fontSize: 13, fontWeight: 600 }}>
          {customMessage ?? `${meta.requirement} 후 열람 가능합니다`}
        </div>
        <div style={{ color: '#94A3B8', fontSize: 11, maxWidth: 360 }}>
          {meta.description}
        </div>

        {(upgrade || onUpgradeClick) && (
          onUpgradeClick ? (
            <button
              type="button"
              onClick={onUpgradeClick}
              style={{
                marginTop: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                fontSize: 12,
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: meta.color,
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.02em',
              }}
            >
              {upgrade?.label ?? meta.requirement}
              <span aria-hidden style={{ fontSize: 14 }}>→</span>
            </button>
          ) : upgrade ? (
            <a
              href={upgrade.href}
              style={{
                marginTop: 4,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 18px',
                fontSize: 12,
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: meta.color,
                borderRadius: 6,
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              {upgrade.label}
              <span aria-hidden style={{ fontSize: 14 }}>→</span>
            </a>
          ) : null
        )}
      </div>
    </div>
  )
}

// ─── 업그레이드 액션 결정 ─────────────────────────────────
function getUpgradeAction(
  current: AccessTier,
  required: AccessTier,
  listingId?: string
): { label: string; href: string } | null {
  // 한 단계씩 올려가도록 next step 활용
  const next = getNextUpgradeStep(current)
  if (!next) return null

  // L2 → L3 업그레이드는 매물별 LOI 필요
  if (required === 'L3') {
    return {
      label: 'LOI 제출하고 데이터룸 열기',
      href: listingId ? `/deals/${listingId}?action=loi` : '/my/agreements',
    }
  }
  if (required === 'L2') {
    if (listingId) {
      return { label: 'NDA 체결화면 열기', href: `/deals/${listingId}?action=nda` }
    }
    return { label: 'NDA 체결화면 열기', href: '/my/kyc' }
  }
  if (required === 'L1') {
    return { label: '본인인증하고 열람', href: '/my/verify' }
  }
  return null
}

// ─── 자물쇠 아이콘 (인라인 SVG) ──────────────────────────
function LockIcon({ color }: { color: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="10" width="16" height="11" rx="2"
        stroke={color} strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="15.5" r="1.4" fill={color} />
    </svg>
  )
}
