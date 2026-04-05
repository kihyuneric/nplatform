'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Menu, Bell } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  /** Current page title shown in the centre */
  title?: string
  /** Unread notification count */
  notificationCount?: number
  /** Callback when the hamburger button is clicked */
  onMenuOpen?: () => void
  /** Avatar URL for the right-side profile icon */
  avatarUrl?: string
  /** User display name (used for avatar fallback initials) */
  userName?: string
  className?: string
}

export function MobileHeader({
  title = 'NPlatform',
  notificationCount = 0,
  onMenuOpen,
  avatarUrl,
  userName = 'U',
  className,
}: MobileHeaderProps) {
  const [isScrolled, setIsScrolled] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = () => setIsScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <motion.header
      animate={{
        backgroundColor: isScrolled ? 'rgba(27, 58, 92, 1)' : 'rgba(27, 58, 92, 0)',
        boxShadow: isScrolled
          ? '0 2px 12px rgba(0,0,0,0.18)'
          : '0 0px 0px rgba(0,0,0,0)',
      }}
      transition={{ duration: 0.25 }}
      className={cn(
        'fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between px-4 md:hidden',
        !isScrolled && 'bg-[#1B3A5C]',
        className
      )}
    >
      {/* Left – hamburger */}
      <button
        type="button"
        aria-label="메뉴 열기"
        onClick={onMenuOpen}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white/90 hover:bg-white/10 active:bg-white/20"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Centre – logo / title */}
      <Link href="/" className="flex items-center gap-1.5">
        <span className="text-base font-bold tracking-tight text-white">{title}</span>
      </Link>

      {/* Right – notifications + avatar */}
      <div className="flex items-center gap-1">
        {/* Bell */}
        <Link
          href="/notifications"
          aria-label={`알림 ${notificationCount}개`}
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-white/90 hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#10B981] px-0.5 text-[10px] font-bold text-white">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </Link>

        {/* Avatar */}
        <Link
          href="/mypage"
          aria-label="프로필"
          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white/30"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-[#2E75B6] text-[11px] font-semibold text-white">
              {initials}
            </span>
          )}
        </Link>
      </div>
    </motion.header>
  )
}
