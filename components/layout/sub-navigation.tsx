'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface SubNavItem {
  href: string
  label: string
  icon?: LucideIcon
}

interface SubNavigationProps {
  items: SubNavItem[]
  className?: string
}

export function SubNavigation({ items, className }: SubNavigationProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'flex gap-0.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-6 overflow-x-auto',
        className,
      )}
      aria-label="섹션 탐색"
    >
      {items.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex items-center gap-1.5 px-4 py-3 text-[0.8125rem] font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'text-[var(--color-brand-dark)] font-semibold'
                : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {item.label}
            {isActive && (
              <motion.div
                layoutId="sub-nav-indicator"
                className="absolute bottom-0 left-4 right-4 h-0.5 bg-[var(--color-brand-mid)] rounded-full"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
