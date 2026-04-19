'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home, Newspaper } from 'lucide-react'

/**
 * NPL 뉴스 상세 진입 시 3-tier 네비게이션의 Breadcrumb(3단계)를 복원한다.
 * 리스트 페이지(`/news`)에서는 CommunityTabs 가 SubNav 역할을 하므로 렌더하지 않는다.
 * 상세 페이지(`/news/[id]`)에서만 표시되어 `홈 > NPL 뉴스 > 기사` 위계를 명시.
 */
export function NewsBreadcrumb() {
  const pathname = usePathname() ?? ''
  const segments = pathname.split('/').filter(Boolean)
  const isDetail = segments[0] === 'news' && segments.length >= 2
  if (!isDetail) return null

  return (
    <nav
      aria-label="Breadcrumb"
      className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]"
    >
      <ol className="max-w-7xl mx-auto flex items-center gap-1 px-4 py-2 text-xs text-[var(--color-text-secondary)] md:px-6">
        <li>
          <Link
            href="/"
            aria-label="홈"
            className="flex items-center text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-secondary)]"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>
        <li className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-[var(--color-text-muted)]" />
          <Link
            href="/news"
            className="flex items-center gap-1 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            <Newspaper className="h-3 w-3" />
            NPL 뉴스
          </Link>
        </li>
        <li className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-[var(--color-text-muted)]" />
          <span aria-current="page" className="font-bold text-[var(--color-text-primary)]">
            기사 상세
          </span>
        </li>
      </ol>
    </nav>
  )
}
