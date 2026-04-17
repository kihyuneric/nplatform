'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useNavConfig } from '@/components/providers/nav-config-provider'
import { DEFAULT_NAV_CONFIG } from '@/lib/nav-config'

interface Props {
  pageKey: string
}

export function DynamicSubNav({ pageKey }: Props) {
  const pathname = usePathname() ?? ''
  const { getPageSubNav } = useNavConfig()

  // Get active items from config, fallback to defaults
  let items = getPageSubNav(pageKey)
  if (items.length === 0) {
    items = (DEFAULT_NAV_CONFIG.pageSubNavs?.[pageKey] ?? [])
      .filter(i => i.active)
      .sort((a, b) => a.order - b.order)
  }

  if (items.length === 0) return null

  return (
    <div className="border-b bg-[var(--color-surface-elevated)] sticky top-16 z-30">
      <div className="container mx-auto px-4">
        <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" aria-label="서브 메뉴">
          {items.map((item, idx) => {
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
                }`}
              >
                {item.label}
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
