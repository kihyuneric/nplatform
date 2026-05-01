'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SubNavItem {
  href: string
  label: string
  /**
   * (선택) 추가로 활성 상태로 표시할 prefix 들.
   *   예) 거래 macro: matchPaths=['/my/deals', '/my/agreements', '/my/demands']
   * 미지정 시 href 만으로 매칭.
   */
  matchPaths?: readonly string[]
}

interface SubNavProps {
  items: SubNavItem[]
}

export function SubNav({ items }: SubNavProps) {
  const pathname = usePathname() ?? ''

  return (
    <div className="border-b bg-[var(--color-surface-elevated)] sticky top-16 z-30">
      <div className="container mx-auto px-4">
        <nav className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" aria-label="서브 메뉴">
          {items.map((item) => {
            // matchPaths 가 있으면 그 prefix 들 중 하나라도 매칭되면 활성
            const matches = item.matchPaths ?? [item.href]
            const isActive = matches.some((m) => pathname === m || pathname.startsWith(m + '/'))
            // 단, items[0] (대시보드 등 root) 는 정확 매칭만 — startsWith 로 모든 하위에 활성되는 것 방지
            const isFirst = item.href === items[0]?.href
            const finalActive = isFirst ? pathname === item.href : isActive
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  finalActive
                    ? 'bg-[#1B3A5C] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]'
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
