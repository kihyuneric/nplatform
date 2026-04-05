'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
    <div className="border-b bg-white dark:bg-gray-900 sticky top-16 z-30">
      <div className="container mx-auto px-4">
        <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" aria-label="서브 메뉴">
          {items.map((item, idx) => {
            const isActive = pathname === item.href ||
              (idx !== 0 && pathname.startsWith(item.href))
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1B3A5C] text-white'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
