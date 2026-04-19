'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileText, ShieldCheck, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/terms/service',    label: '이용약관',     icon: FileText },
  { href: '/terms/privacy',    label: '개인정보처리방침', icon: ShieldCheck },
  { href: '/terms/disclaimer', label: '면책 조항',    icon: AlertTriangle },
]

export function TermsTabs() {
  const pathname = usePathname() ?? ''
  return (
    <nav
      aria-label="약관 섹션"
      className="sticky top-16 z-20 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]/95 backdrop-blur-sm"
    >
      <div className="max-w-4xl mx-auto flex items-center gap-1 overflow-x-auto px-4 md:px-6">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = pathname.startsWith(t.href)
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition-colors',
                active
                  ? 'border-[var(--color-brand-bright)] text-[var(--color-brand-bright)]'
                  : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
