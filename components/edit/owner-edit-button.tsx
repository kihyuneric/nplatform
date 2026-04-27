'use client'

/**
 * OwnerEditButton — 권한 기반 편집 진입 버튼
 *
 *  · 매물 편집 (resourceType="listing") · 매수 수요 편집 (resourceType="demand")
 *  · 딜룸 편집 (resourceType="dealroom") 모두 지원
 *
 * 표시 규칙
 *  · ADMIN / SUPER_ADMIN: 항상 표시 → /admin/{...}/edit 로 이동
 *  · SELLER · BUYER_INST · BUYER_INDV · PARTNER 가 ownerId 일치 → 본인용 편집 페이지
 *  · 그 외: null 렌더링
 *
 * McKinsey 톤(electric blue · sharp · 일렉트릭 보더)으로 통일.
 */
import Link from 'next/link'
import { Pencil, Shield } from 'lucide-react'
import { useAuth } from '@/components/auth/auth-provider'

type ResourceType = 'listing' | 'demand' | 'dealroom'

interface OwnerEditButtonProps {
  /** 자원 종류 */
  resourceType: ResourceType
  /** 편집할 자원 ID */
  resourceId: string
  /** 자원 소유자(매도자/매수자) ID. 미전달 시 본인 권한 매칭 비활성 (관리자만 노출) */
  ownerId?: string | null
  /** 컴팩트 모드 — 아이콘만 */
  compact?: boolean
  /** 추가 스타일 */
  className?: string
  /** 라벨 오버라이드 */
  label?: string
}

const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN'])
const OWNER_ROLES = new Set(['SELLER', 'BUYER_INST', 'BUYER_INDV', 'PARTNER'])

function getEditHref(
  resourceType: ResourceType,
  resourceId: string,
  isAdmin: boolean,
): string {
  // 딜룸은 매물 1:1 wrapper 이므로, 모든 편집은 매물 편집 페이지로 위임.
  // (resourceId 는 dealroom 인 경우에도 underlying listing.id 를 전달하면 됩니다)
  if (resourceType === 'dealroom') {
    return isAdmin
      ? `/admin/listings/${resourceId}/edit`
      : `/exchange/edit/${resourceId}`
  }
  if (isAdmin) {
    switch (resourceType) {
      case 'listing': return `/admin/listings/${resourceId}/edit`
      // 매수 수요는 admin / owner 모두 동일 페이지 사용 (페이지에서 role 분기)
      case 'demand':  return `/exchange/demands/${resourceId}/edit?as=admin`
    }
  }
  // 본인 편집 경로
  switch (resourceType) {
    case 'listing': return `/exchange/edit/${resourceId}`
    case 'demand':  return `/exchange/demands/${resourceId}/edit`
  }
  return '/'
}

export function OwnerEditButton({
  resourceType,
  resourceId,
  ownerId,
  compact = false,
  className,
  label,
}: OwnerEditButtonProps) {
  const { user } = useAuth()

  if (!user) return null

  const isAdmin = ADMIN_ROLES.has(user.role)
  const isOwner =
    OWNER_ROLES.has(user.role) &&
    !!ownerId &&
    String(user.id) === String(ownerId)

  if (!isAdmin && !isOwner) return null

  const href = getEditHref(resourceType, resourceId, isAdmin)
  const computedLabel =
    label ?? (isAdmin ? '관리자 편집' : '편집하기')
  const Icon = isAdmin ? Shield : Pencil

  // 톤: 관리자 → ink dark, 소유자 → electric blue outline
  const tone = isAdmin
    ? {
        background: '#0A1628',
        color: '#FFFFFF',
        border: '1px solid #0A1628',
        borderTop: '2px solid #2251FF',
      }
    : {
        background: '#FFFFFF',
        color: '#0A1628',
        border: '1px solid #2251FF',
        borderTop: '2px solid #2251FF',
      }

  return (
    <Link
      href={href}
      title={computedLabel}
      aria-label={computedLabel}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: compact ? '6px 10px' : '9px 14px',
        fontSize: compact ? 11 : 12,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        textDecoration: 'none',
        cursor: 'pointer',
        transition: 'box-shadow 120ms ease, transform 120ms ease',
        ...tone,
      }}
    >
      <Icon size={compact ? 12 : 14} />
      {!compact && <span>{computedLabel}</span>}
    </Link>
  )
}

export default OwnerEditButton
