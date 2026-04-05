'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SubNavItem {
  href: string
  label: string
}

interface SubNavProps {
  items: SubNavItem[]
}

export function SubNav({ items }: SubNavProps) {
  const pathname = usePathname() ?? ''

  return (
    <div className="border-b bg-white dark:bg-gray-900 sticky top-16 z-30">
      <div className="container mx-auto px-4">
        <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" aria-label="서브 메뉴">
          {items.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== items[0].href && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
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
