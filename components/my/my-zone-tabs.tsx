'use client'

/**
 * MyZoneTabs — Zone macro 안의 sub-tab 네비게이션.
 *
 * 사용:
 *   <MyZoneTabs zone="deals" />   → 딜룸·계약·매수수요 탭
 *   <MyZoneTabs zone="assets" />  → 내 매물·관심매물 탭
 *
 * 활성 탭은 pathname 으로 자동 판단.
 * 역할 필터링은 destination 페이지에서 처리 (단순화).
 *
 * Phase G7+ 2026-04-29 (My_Page_Restructure_Plan v2).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DEALS_ZONE_TABS, ASSETS_ZONE_TABS, type ZoneTabItem } from '@/lib/my-nav'
import { MCK } from '@/lib/mck-design'

export function MyZoneTabs({
  zone,
  tabs,
}: {
  zone?: 'deals' | 'assets'
  tabs?: readonly ZoneTabItem[] | ZoneTabItem[]
}) {
  const pathname = usePathname() ?? ''

  const items: readonly ZoneTabItem[] | ZoneTabItem[] =
    tabs ??
    (zone === 'deals' ? DEALS_ZONE_TABS : zone === 'assets' ? ASSETS_ZONE_TABS : [])

  if (!items || items.length === 0) return null

  return (
    <div
      style={{
        background: MCK.paper,
        borderBottom: `1px solid ${MCK.border}`,
      }}
    >
      <div
        className="max-w-[1280px] mx-auto"
        style={{ padding: '12px 24px', display: 'flex', gap: 8, overflowX: 'auto' }}
      >
        {items.map((t) => {
          const isActive = pathname === t.href || pathname.startsWith(t.href + '/')
          return (
            <Link
              key={t.key}
              href={t.href}
              style={{
                whiteSpace: 'nowrap',
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 4,
                color: isActive ? MCK.paper : MCK.textSub,
                background: isActive ? MCK.electric : 'transparent',
                textDecoration: 'none',
                border: `1px solid ${isActive ? MCK.electric : MCK.border}`,
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
