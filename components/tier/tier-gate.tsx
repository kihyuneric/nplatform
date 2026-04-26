/**
 * components/tier/tier-gate.tsx
 *
 * ?묎렐 ?쒖뼱 ?섑띁.
 * ?꾩옱 ?ъ슜???곗뼱媛 required 誘몃쭔?대㈃ ?먯떇???④린怨??좉툑 ?ㅻ쾭?덉씠 + ?낃렇?덉씠??CTA ?쒖떆.
 *
 * ?ъ슜 ??
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
  listingId?: string                  // L3 ?낃렇?덉씠????LOI ?섏씠吏 寃쎈줈 ?앹꽦??  children: React.ReactNode
  /** true硫??좉꼈?????먯떇???먮━寃??ㅼ뿉 ?뚮뜑 */
  blurContent?: boolean
  /** ?좉릿 ?곹깭?먯꽌 蹂댁뿬以?而ㅼ뒪? 硫붿떆吏 */
  customMessage?: string
  /** ?좉툑 諛뺤뒪 理쒖냼 ?믪씠 */
  minHeight?: number
  /** ?쒓났 ??href ???onClick 踰꾪듉?쇰줈 ?낃렇?덉씠??CTA ?뚮뜑 */
  onUpgradeClick?: () => void
  /**
   * true硫??먯떇??洹몃?濡??뚮뜑?섎릺 blur 泥섎━ + ?곗긽???묒? ?먮Ъ??諭껋?留??쒖떆.
   * ? ?ㅻ쾭?덉씠瑜??꾩슦吏 ?딆쓬 (Deal Flow 紐⑤뱶??.
   */
  softBlur?: boolean
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
  softBlur = false,
}: TierGateProps) {
  const unlocked = tierGte(current, required)

  if (unlocked) {
    return <>{children}</>
  }

  const meta = TIER_META[required]
  const upgrade = getUpgradeAction(current, required, listingId)

  // ??? softBlur 紐⑤뱶: 肄섑뀗痢좊? ?먮━寃?洹몃?濡?蹂댁뿬二쇨퀬 ?묒? ?좉툑 諭껋?留???
  if (softBlur) {
    return (
      <div style={{ position: 'relative' }}>
        <div
          aria-hidden
          style={{
            filter: 'blur(7px)',
            opacity: 0.55,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {children}
        </div>

        {/* ?곗긽???먮Ъ??諭껋? */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 10px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: 0,
            boxShadow: '0 4px 12px rgba(10, 22, 40, 0.08)',
            zIndex: 5,
          }}
        >
          <LockIcon color="#1A47CC" />
          <span style={{ color: '#0A1628', fontSize: 11, fontWeight: 700, letterSpacing: '0.02em' }}>
            {meta.requirement}
          </span>
        </div>

        {/* 以묒븰 CTA 踰꾪듉 (?좏깮) */}
        {(upgrade || onUpgradeClick) && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 6,
            }}
          >
            {onUpgradeClick ? (
              <button
                type="button"
                onClick={onUpgradeClick}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  backgroundColor: '#0A1628',
                  borderRadius: 0,
                  border: 'none',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  boxShadow: '0 8px 24px rgba(10, 22, 40, 0.25)',
                }}
              >
                {upgrade?.label ?? meta.requirement}
                <span aria-hidden style={{ fontSize: 14 }}>??/span>
              </button>
            ) : upgrade ? (
              <a
                href={upgrade.href}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  backgroundColor: '#0A1628',
                  borderRadius: 0,
                  textDecoration: 'none',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  boxShadow: '0 8px 24px rgba(10, 22, 40, 0.25)',
                }}
              >
                {upgrade.label}
                <span aria-hidden style={{ fontSize: 14 }}>??/span>
              </a>
            ) : null}
          </div>
        )}
      </div>
    )
  }

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
        {/* ?먮Ъ???꾩씠肄?*/}
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
          {customMessage ?? `${meta.requirement} ???대엺 媛?ν빀?덈떎`}
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
              <span aria-hidden style={{ fontSize: 14 }}>??/span>
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
              <span aria-hidden style={{ fontSize: 14 }}>??/span>
            </a>
          ) : null
        )}
      </div>
    </div>
  )
}

// ??? ?낃렇?덉씠???≪뀡 寃곗젙 ?????????????????????????????????
function getUpgradeAction(
  current: AccessTier,
  required: AccessTier,
  listingId?: string
): { label: string; href: string } | null {
  // ???④퀎???щ젮媛?꾨줉 next step ?쒖슜
  const next = getNextUpgradeStep(current)
  if (!next) return null

  // L2 ??L3 ?낃렇?덉씠?쒕뒗 留ㅻЪ蹂?LOI ?꾩슂
  if (required === 'L3') {
    return {
      label: 'LOI ?쒖텧?붾㈃ ?닿린',
      href: listingId ? `/deals/${listingId}?action=loi` : '/my/agreements',
    }
  }
  if (required === 'L2') {
    if (listingId) {
      return { label: 'NDA 泥닿껐?붾㈃ ?닿린', href: `/deals/${listingId}?action=nda` }
    }
    return { label: 'NDA 泥닿껐?붾㈃ ?닿린', href: '/my/kyc' }
  }
  if (required === 'L1') {
    return { label: '?ъ옄???몄쬆?섍퀬 ?대엺', href: '/my/verify' }
  }
  return null
}

// ??? ?먮Ъ???꾩씠肄?(?몃씪??SVG) ??????????????????????????
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
