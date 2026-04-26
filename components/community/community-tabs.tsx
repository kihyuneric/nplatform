"use client"

/**
 * CommunityTabs — "공지/문의" TopBar 카테고리 하위 SubNav.
 *
 * 사용 위치
 *   · /notices/layout.tsx — 공지사항 페이지
 *   · /news/layout.tsx    — (legacy) NPL 뉴스 — TopBar 카테고리에서 제외됨, 외부 링크로만 진입
 *   · /services/layout.tsx — 전문가 서비스
 *
 * 변경 이력
 *   · 2026-04-26 — TABS 를 "공지사항 + 고객센터" 로 정정 (NPL 뉴스 제거).
 *     공지/문의 카테고리는 nav-config.ts (`news` category) 와 일치해야 함.
 */

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, LifeBuoy } from "lucide-react"

const TABS = [
  { href: "/notices", label: "공지사항", icon: Bell,     exact: false },
  { href: "/support", label: "고객센터", icon: LifeBuoy, exact: false },
]

export function CommunityTabs() {
  const pathname = usePathname() ?? ""

  return (
    <div className="sticky top-16 z-10 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {TABS.map(({ href, label, icon: Icon, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-[#1B3A5C] text-[#1B3A5C]"
                    : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
