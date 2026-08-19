'use client'

/**
 * /my 공통 레이아웃 — 좌측 메뉴 + 우측 콘텐츠 (2026-08-18 사용자 정책)
 *
 * 모든 마이페이지가 동일 구성: 왼쪽 고정 메뉴, 오른쪽 대시보드·리스트·내용.
 * 디폴트(/my)는 대시보드. 기존 상단 가로 탭(MyZoneTabs)은 비활성화됨.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Building2, ShoppingCart, FileSignature,
  Heart, Bell, Settings, User, Search,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getMemberRoles } from '@/lib/member-roles'

type MenuItem = { href: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }

const COMMON_TOP: MenuItem[] = [
  { href: '/my', label: '대시보드', icon: LayoutDashboard, exact: true },
]
const SELLER_MENU: MenuItem[] = [
  { href: '/my/seller', label: '내 매물', icon: Building2 },
]
const BUYER_MENU: MenuItem[] = [
  // 자동매칭 = 매입 회원 핵심 화면 (조건에 맞는 매물 전체) — 2026-08-19 신설
  { href: '/my/matches',    label: '자동매칭',   icon: Search },
  { href: '/my/demands',    label: '매입 조건',  icon: ShoppingCart },
  { href: '/my/portfolio',  label: '관심매물',   icon: Heart },
]
const COMMON_BOTTOM: MenuItem[] = [
  // /my/notifications 는 /my/inbox 로 리다이렉트 — 활성 하이라이트를 위해 inbox 직접 링크
  { href: '/my/inbox',    label: '알림센터', icon: Bell },
  { href: '/my/settings', label: '설정 (회원정보 수정)', icon: Settings },
]
// 파트너(자문사) — 운영관리자와 동일 화면 열람 전용 링크
const PARTNER_MENU: MenuItem[] = [
  { href: '/admin',              label: '운영 대시보드 (열람)', icon: LayoutDashboard },
  { href: '/admin/listings',     label: '매각의뢰 현황 (열람)', icon: Building2 },
  { href: '/admin/demands',      label: '매입조건 현황 (열람)', icon: ShoppingCart },
  { href: '/admin/agreements',   label: 'NDA · 딜 진행 (열람)', icon: FileSignature },
  { href: '/admin/npl-analysis', label: 'NPL 수익률 분석 (열람)', icon: Heart },
]

/**
 * 역할별 메뉴 (D1 복수 역할 · 2026-08-18)
 * - 메뉴 = 보유 역할의 **합집합** — 매각+매입 겸용이면 내 매물 + 매입 조건 + 관심매물 모두 노출
 * - 매각: 내 매물 / 매입·일반: 매입 조건 · 관심매물 / 파트너: 운영 화면 열람 전용
 */
function menuForRoles(roles: string[]): MenuItem[] {
  if (roles.includes('PARTNER') && !roles.includes('SELLER') && !roles.includes('BUYER')) {
    return [...COMMON_TOP, ...PARTNER_MENU, ...COMMON_BOTTOM]
  }
  const hasSeller = roles.includes('SELLER')
  const hasBuyer = roles.includes('BUYER') || roles.includes('VIEWER')
  if (!hasSeller && !hasBuyer) return [...COMMON_TOP, ...SELLER_MENU, ...BUYER_MENU, ...COMMON_BOTTOM]  // 관리자 등 — 전체
  return [
    ...COMMON_TOP,
    ...(hasSeller ? SELLER_MENU : []),
    ...(hasBuyer ? BUYER_MENU : []),
    ...COMMON_BOTTOM,
  ]
}

export default function MyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''

  // 보유 역할 확인 (복수 가능) — 역할 전환 쿠키 우선, 없으면 metadata.roles 합집합
  const [roles, setRoles] = useState<string[]>([])
  useEffect(() => {
    const cookieRole = document.cookie.match(/(?:^|; )active_role=([^;]*)/)?.[1]
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        // 세션 없음(개발 우회 등) — 쿠키 역할 폴백
        if (!user) {
          if (cookieRole) setRoles(getMemberRoles({ role: decodeURIComponent(cookieRole) }))
          return
        }
        // DB(users.roles)가 SSoT — 관리자의 역할 겸용 저장이 즉시 반영되도록 (metadata 는 폴백)
        let source: Record<string, unknown> | undefined = user.user_metadata as Record<string, unknown> | undefined
        try {
          const { data: profile } = await supabase.from('users').select('roles, role').eq('id', user.id).maybeSingle()
          if (Array.isArray(profile?.roles) && profile.roles.length > 0) source = profile as Record<string, unknown>
        } catch { /* metadata 폴백 */ }
        setRoles(getMemberRoles(source))
      } catch { /* ignore */ }
    })()
  }, [])
  const MENU = menuForRoles(roles)

  return (
    <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6">
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 items-start">
        {/* ── 좌측 메뉴 ── */}
        <aside
          className="md:sticky md:top-16 bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)]"
          style={{ borderTop: '3px solid #2251FF' }}
        >
          <div className="px-3 py-2.5 border-b border-[var(--color-border-subtle)] flex items-center gap-2">
            <User size={13} className="text-[#2251FF]" />
            <span className="text-[12px] font-black text-[var(--color-text-primary)]">마이페이지</span>
          </div>
          <nav className="p-2 flex md:flex-col gap-1 overflow-x-auto">
            {MENU.map(m => {
              const active = m.exact ? pathname === m.href : (pathname === m.href || pathname.startsWith(m.href + '/'))
              const Icon = m.icon
              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors"
                  style={{
                    background: active ? '#0A1628' : 'transparent',
                    color: active ? '#FFFFFF' : 'var(--color-text-secondary)',
                    borderLeft: active ? '3px solid #2251FF' : '3px solid transparent',
                    textDecoration: 'none',
                  }}
                >
                  <Icon size={14} className="shrink-0" />
                  {m.label}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* ── 우측 콘텐츠 — 대시보드 · 리스트 · 내용 ── */}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  )
}
