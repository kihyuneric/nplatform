'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useNavConfig } from '@/components/providers/nav-config-provider'
import { DEFAULT_NAV_CONFIG } from '@/lib/nav-config'
import { createClient } from '@/lib/supabase/client'

interface Props {
  pageKey: string
}

/**
 * 현재 로그인 유저가 ADMIN 또는 SUPER_ADMIN 인지 확인.
 * profiles 테이블의 active_role 조회. 실패 시 false fallback.
 */
async function fetchIsAdmin(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_role')
      .eq('id', user.id)
      .single()
    return ['ADMIN', 'SUPER_ADMIN'].includes(profile?.active_role ?? '')
  } catch {
    return false
  }
}

export function DynamicSubNav({ pageKey }: Props) {
  const pathname = usePathname() ?? ''
  const { getPageSubNav } = useNavConfig()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchIsAdmin().then(setIsAdmin)
  }, [])

  // Get active items from config, fallback to defaults
  let items = getPageSubNav(pageKey)
  if (items.length === 0) {
    items = (DEFAULT_NAV_CONFIG.pageSubNavs?.[pageKey] ?? [])
      .filter(i => i.active)
      .sort((a, b) => a.order - b.order)
  }

  // adminOnly 항목은 ADMIN / SUPER_ADMIN 만 노출
  const visibleItems = items.filter(i => !i.adminOnly || isAdmin)

  if (visibleItems.length === 0) return null

  return (
    <div className="border-b bg-[var(--color-surface-elevated)] sticky top-16 z-30 no-print">
      <div className="container mx-auto px-4">
        <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" aria-label="서브 메뉴">
          {visibleItems.map((item, idx) => {
            const isActive = pathname === item.href ||
              (idx !== 0 && pathname.startsWith(item.href))
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`relative whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1B3A5C] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]'
                } ${item.adminOnly ? 'ml-auto opacity-70' : ''}`}
              >
                {item.label}
                {item.adminOnly && (
                  <span className="ml-1 text-[0.6rem] bg-amber-500 text-white px-1 rounded">ADM</span>
                )}
                {isActive && (
                  <motion.span
                    layoutId={`subnav-${pageKey}`}
                    className="absolute inset-0 rounded-full bg-[#1B3A5C] -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
