'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { ADMIN_ROLES, ROLE_LABELS } from '@/lib/constants'
import type { UserRole } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu'
import {
  Menu,
  X,
  User,
  Bell,
  LogOut,
  Shield,
  Search,
  Settings,
  Heart,
  RefreshCw,
} from 'lucide-react'
import { LanguageSelector } from './language-selector'
import { t } from '@/lib/i18n'

// ─── Nav items ───────────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/exchange', label: 'NPL 매물' },
  { href: '/deals', label: '거래 현황' },
  { href: '/analysis', label: '투자 분석' },
  { href: '/services/experts', label: '전문가' },
  { href: '/services/community', label: '커뮤니티' },
  { href: '/pricing', label: '요금제' },
]

// ─── Role helpers ─────────────────────────────────────────────
function getSwitchableRoles(userRole: string | undefined): UserRole[] {
  if (userRole === 'SUPER_ADMIN') {
    return ['SUPER_ADMIN', 'ADMIN', 'SELLER', 'BUYER_INST', 'BUYER_INDV', 'PARTNER', 'VIEWER']
  }
  if (userRole === 'ADMIN') {
    return ['ADMIN', 'SELLER', 'BUYER_INST', 'BUYER_INDV', 'PARTNER', 'VIEWER']
  }
  return []
}

const ROLE_DASHBOARD: Record<string, string> = {
  SUPER_ADMIN: '/admin',
  ADMIN: '/admin',
  SELLER: '/my/seller',
  BUYER_INST: '/exchange',
  BUYER_INDV: '/exchange',
  PARTNER: '/my/partner',
  VIEWER: '/',
}

function switchRole(role: string) {
  document.cookie = `active_role=${role}; path=/; max-age=${60 * 60 * 24 * 30}`
  window.location.href = ROLE_DASHBOARD[role] || '/'
}

function getActiveRole(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )active_role=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

// ─── Search Overlay ───────────────────────────────────────────
function SearchOverlay({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#0D1F38] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E8EDF3] dark:border-[#1A2E4A]">
          <Search className="h-5 w-5 text-[#4A5568] flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="NPL 매물, 경매 정보, 분석 검색..."
            className="flex-1 bg-transparent text-[#0D1F38] dark:text-white placeholder:text-[#A0AEC0] text-base outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#4A5568] hover:text-[#0D1F38] dark:hover:text-white transition-colors"
            aria-label="검색 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-[#A0AEC0]">빠른 이동: NPL마켓, 경매 분석, 시장 통계</p>
        </div>
      </div>
    </div>
  )
}

// ─── Mobile Drawer ────────────────────────────────────────────
function MobileDrawer({
  open,
  onClose,
  user,
  isAdmin,
  unreadCount,
  activeRole,
  pathname,
  signOut,
}: {
  open: boolean
  onClose: () => void
  user: any
  isAdmin: boolean
  unreadCount: number
  activeRole: string | null
  pathname: string | null
  signOut: () => void
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div className="fixed inset-y-0 left-0 z-[110] w-72 bg-white dark:bg-[#0D1F38] flex flex-col shadow-2xl">
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-[#E8EDF3] dark:border-[#1A2E4A] flex-shrink-0">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-7 h-7 bg-[#1B3A5C] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-black text-xs tracking-tighter">N</span>
            </div>
            <span className="font-black text-[#0D1F38] dark:text-white text-sm tracking-tight">
              NPL<span className="font-light text-[#4A5568] dark:text-slate-400">atform</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[#4A5568] hover:text-[#0D1F38] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2E4A] transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = (pathname ?? '').startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[#1B3A5C] dark:text-white bg-[#EBF2FA] dark:bg-[#1A2E4A] font-semibold'
                        : 'text-[#4A5568] dark:text-slate-300 hover:text-[#0D1F38] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1A2E4A]'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Admin link */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t border-[#E8EDF3] dark:border-[#1A2E4A]">
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
              >
                <Shield className="h-4 w-4" />
                관리자 대시보드
              </Link>
            </div>
          )}
        </nav>

        {/* Bottom auth section */}
        <div className="px-3 py-4 border-t border-[#E8EDF3] dark:border-[#1A2E4A] flex-shrink-0">
          {user ? (
            <div className="space-y-1">
              <div className="px-3 py-2 mb-2">
                <p className="text-sm font-semibold text-[#0D1F38] dark:text-white">{user.name}</p>
                <p className="text-xs text-[#4A5568] dark:text-slate-400 truncate">{user.email}</p>
              </div>
              <Link
                href="/my"
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#4A5568] dark:text-slate-300 hover:text-[#0D1F38] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1A2E4A] transition-colors"
              >
                <User className="h-4 w-4" />내 페이지
              </Link>
              <Link
                href="/my/notifications"
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[#4A5568] dark:text-slate-300 hover:text-[#0D1F38] dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1A2E4A] transition-colors"
              >
                <Bell className="h-4 w-4" />
                알림
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px] px-1.5 py-0">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Link>
              {getSwitchableRoles(user.role).length > 0 && (
                <div className="pt-2 mt-2 border-t border-[#E8EDF3] dark:border-[#1A2E4A]">
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#A0AEC0] flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> 역할 전환
                  </p>
                  <div className="flex flex-wrap gap-1 px-3 py-1">
                    {getSwitchableRoles(user.role).map((role) => (
                      <Badge
                        key={role}
                        variant={(activeRole || user.role) === role ? 'default' : 'outline'}
                        className={`cursor-pointer text-[10px] ${
                          (activeRole || user.role) === role
                            ? 'bg-[#1B3A5C] text-white'
                            : 'hover:bg-slate-100 dark:hover:bg-[#1A2E4A]'
                        }`}
                        onClick={() => { switchRole(role); onClose() }}
                      >
                        {ROLE_LABELS[role]}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => { signOut(); onClose() }}
                className="flex w-full items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors mt-1"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Link href="/login" onClick={onClose}>
                <Button variant="outline" className="w-full text-sm">로그인</Button>
              </Link>
              <Link href="/signup" onClick={onClose}>
                <Button className="w-full bg-[#1B3A5C] hover:bg-[#0D1F38] text-white text-sm font-semibold">
                  무료 시작
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Main Navigation ──────────────────────────────────────────
export function Navigation() {
  const { user, loading, signOut } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [activeRole, setActiveRole] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    setActiveRole(getActiveRole())
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Notification fetch
  useEffect(() => {
    if (!user) return
    fetch('/api/v1/notifications')
      .then(r => r.json())
      .then(d => setUnreadCount(d.unread_count || 0))
      .catch(() => {})

    try {
      const { createClient } = require('@/lib/supabase/client')
      const supabase = createClient()
      const channel = supabase
        .channel('notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => {
          setUnreadCount(prev => prev + 1)
        })
        .subscribe()
      return () => { supabase.removeChannel(channel) }
    } catch {
      // Supabase realtime not available
    }
  }, [user])

  const isAdmin = user && ADMIN_ROLES.includes(user.role as UserRole)

  const isNavActive = useCallback(
    (href: string) => (pathname ?? '').startsWith(href),
    [pathname]
  )

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b border-[#E8EDF3] dark:border-[#1A2E4A] bg-white dark:bg-[#0D1F38] transition-shadow duration-200 ${
          scrolled ? 'shadow-sm backdrop-blur-sm' : ''
        }`}
      >
        <div className="max-w-[1440px] mx-auto flex h-16 items-center justify-between px-6 lg:px-8">

          {/* ── Logo ─────────────────────────────────────── */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-8 h-8 bg-[#1B3A5C] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#0D1F38] transition-colors">
              <span className="text-white font-black text-sm tracking-tighter">N</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-[#0D1F38] dark:text-white text-base tracking-tight">NPL</span>
              <span className="font-light text-[#4A5568] dark:text-slate-400 text-base">atform</span>
            </div>
          </Link>

          {/* ── Center Nav (desktop) ──────────────────────── */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="메인 네비게이션">
            {NAV_ITEMS.map((item) => {
              const isActive = isNavActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[#1B3A5C] dark:text-white font-semibold after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-[#1B3A5C] dark:after:bg-white after:rounded-full'
                      : 'text-[#4A5568] dark:text-slate-400 hover:text-[#0D1F38] dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* ── Right area ───────────────────────────────── */}
          <div className="flex items-center gap-1">
            {/* Search button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-md text-[#4A5568] dark:text-slate-400 hover:text-[#0D1F38] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2E4A] transition-colors"
              aria-label="검색"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Desktop right side */}
            <div className="hidden lg:flex items-center gap-1">
              {!mounted || loading ? (
                <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100 dark:bg-[#1A2E4A]" />
              ) : user ? (
                <>
                  {/* Admin link */}
                  {isAdmin && (
                    <Link href="/admin">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs"
                      >
                        <Shield className="mr-1 h-3.5 w-3.5" />
                        관리
                      </Button>
                    </Link>
                  )}

                  {/* Notification bell */}
                  <Link href="/my/notifications">
                    <button
                      className="relative p-2 rounded-md text-[#4A5568] dark:text-slate-400 hover:text-[#0D1F38] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2E4A] transition-colors"
                      aria-label="알림"
                    >
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                  </Link>

                  {/* Language selector */}
                  <LanguageSelector />

                  {/* User dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-[#1A2E4A] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#1B3A5C]">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B3A5C] text-xs font-bold text-white flex-shrink-0">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span className="max-w-[80px] truncate text-sm font-medium text-[#0D1F38] dark:text-white">
                          {user.name}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <div className="px-3 py-2.5">
                        <p className="text-sm font-semibold text-[#0D1F38] dark:text-white">{user.name}</p>
                        <p className="text-xs text-[#4A5568] dark:text-slate-400 truncate">{user.email}</p>
                        <Badge variant="secondary" className="mt-1.5 text-[10px]">
                          {ROLE_LABELS[(activeRole || user.role) as UserRole] || activeRole || user.role}
                        </Badge>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                          <Link href="/my" className="flex items-center cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            내 페이지
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/my/portfolio" className="flex items-center cursor-pointer">
                            <Heart className="mr-2 h-4 w-4" />
                            관심매물
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/my/settings" className="flex items-center cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            설정
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      {/* Role switcher — admin only */}
                      {getSwitchableRoles(user.role).length > 0 && (
                        <>
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-[#A0AEC0] flex items-center gap-1 pt-2">
                            <RefreshCw className="h-3 w-3" /> 역할 전환
                          </DropdownMenuLabel>
                          {getSwitchableRoles(user.role).map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => switchRole(role)}
                              className={`text-xs ${(activeRole || user.role) === role ? 'bg-slate-100 dark:bg-[#1A2E4A] font-semibold' : ''}`}
                            >
                              {(activeRole || user.role) === role && (
                                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block flex-shrink-0" />
                              )}
                              {ROLE_LABELS[role]}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={signOut}
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        로그아웃
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <LanguageSelector />
                  <Button variant="ghost" size="sm" asChild className="text-sm text-[#4A5568] dark:text-slate-400">
                    <Link href="/login">로그인</Link>
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="bg-[#1B3A5C] hover:bg-[#0D1F38] text-white text-sm font-semibold"
                  >
                    <Link href="/signup">무료 시작</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-md text-[#4A5568] dark:text-slate-400 hover:text-[#0D1F38] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2E4A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3A5C]"
              onClick={() => setMobileMenuOpen(true)}
              aria-expanded={mobileMenuOpen}
              aria-label="메뉴 열기"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Search overlay */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}

      {/* Mobile drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        isAdmin={!!isAdmin}
        unreadCount={unreadCount}
        activeRole={activeRole}
        pathname={pathname}
        signOut={signOut}
      />
    </>
  )
}
