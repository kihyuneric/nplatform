'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── Skip Link ────────────────────────────────────────────────────────────

interface SkipLinkProps {
  href?: string
  label?: string
  className?: string
}

export function SkipLink({
  href = '#main-content',
  label = '본문으로 바로가기',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        // Visually hidden until focused
        'sr-only focus:not-sr-only',
        'focus:fixed focus:top-4 focus:left-4 focus:z-[9999]',
        'focus:px-4 focus:py-2.5',
        'focus:bg-[#1B3A5C] focus:text-white',
        'focus:rounded-lg focus:shadow-lg',
        'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2',
        'focus:ring-offset-[#1B3A5C]',
        'text-sm font-medium',
        'transition-none',
        className
      )}
    >
      {label}
    </a>
  )
}

// ─── Multiple Skip Links ──────────────────────────────────────────────────

interface SkipLink {
  href: string
  label: string
}

interface SkipLinksProps {
  links?: SkipLink[]
  className?: string
}

const DEFAULT_SKIP_LINKS: SkipLink[] = [
  { href: '#main-content', label: '본문으로 바로가기' },
  { href: '#main-navigation', label: '내비게이션으로 바로가기' },
  { href: '#search', label: '검색으로 바로가기' },
]

export function SkipLinks({ links = DEFAULT_SKIP_LINKS, className }: SkipLinksProps) {
  return (
    <nav
      aria-label="빠른 이동"
      className={cn('fixed top-0 left-0 z-[9999]', className)}
    >
      <ul className="flex flex-col gap-1 p-1">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              className={cn(
                'sr-only focus:not-sr-only',
                'focus:block focus:px-4 focus:py-2',
                'focus:bg-[#1B3A5C] focus:text-white',
                'focus:rounded-md focus:shadow-lg',
                'focus:outline-none focus:ring-2 focus:ring-white',
                'text-sm font-medium whitespace-nowrap'
              )}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
