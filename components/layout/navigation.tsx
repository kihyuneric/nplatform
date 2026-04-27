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
import { TierBadge } from '@/components/tier/tier-badge'
import type { AccessTier } from '@/lib/access-tier'
import { getNextUpgradeStep, TIER_META } from '@/lib/access-tier'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import type { Notification } from '@/lib/types'

// ─── Nav items ────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/exchange',  label: '거래소',     matchPaths: ['/exchange'] },
  { href: '/deals',     label: '딜룸',       matchPaths: ['/deals'] },
  { href: '/analysis',  label: '분석',       matchPaths: ['/analysis'] },
  { href: '/notices',   label: '공지/문의',  matchPaths: ['/notices', '/support'] },
  { href: '/my',        label: '마이 페이지', matchPaths: ['/my'] },
]

// ─── 사용자 티어 판정 (auth user → AccessTier) ─────────────
function resolveUserTier(user: any): AccessTier {
  if (!user) return 'L0'
  // 전문투자자 or 기관 → L2
  if (user.qualified_investor || user.role === 'INSTITUTION' || user.role === 'SUPER_ADMIN') return 'L2'
  // 본인인증 완료 → L1
  if (user.identity_verified || user.kyc_status === 'APPROVED' || user.approval_status === 'APPROVED') return 'L1'
  return 'L0'
}

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
        className="w-full max-w-2xl bg-[var(--color-brand-deep)] rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--color-border-subtle)]">
          <Search className="h-5 w-5 text-[var(--color-nav-text-dim)] flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="NPL 매물, 경매 정보, 분석 검색..."
            className="flex-1 bg-transparent text-[var(--color-nav-text)] placeholder:text-[var(--color-nav-text-dim)] text-base outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[var(--color-nav-text-dim)] hover:text-[var(--color-nav-text)] transition-colors"
            aria-label="검색 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-3">
          <p className="text-xs text-[var(--color-nav-text-dim)]">빠른 이동: 거래소, 경매 분석, 시장 통계</p>
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

      {/* Drawer panel — NX-3: 테마 반응형 배경 */}
      <div
        className="fixed inset-y-0 left-0 z-[110] w-72 flex flex-col shadow-2xl"
        style={{ backgroundColor: 'var(--color-nav-bg)' }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--color-border-subtle)] flex-shrink-0">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div
              className="w-7 h-7 flex items-center justify-center flex-shrink-0"
              style={{
                background: "#2251FF",
                borderTop: "2px solid #00A9F4",
                boxShadow: "0 3px 8px rgba(34, 81, 255, 0.40)",
              }}
            >
              <span className="text-white font-black text-sm tracking-tighter">N</span>
            </div>
            <span className="font-black text-[var(--color-nav-text)] text-sm tracking-tight">
              NPL<span className="font-light text-[var(--color-nav-text-dim)]">atform</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-[var(--color-nav-text-dim)] hover:text-[var(--color-nav-text)] hover:bg-[var(--color-nav-hover-bg)] transition-colors"
            aria-label="메뉴 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = item.matchPaths.some(p => (pathname ?? '').startsWith(p))
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'text-[var(--color-nav-active)] bg-[var(--color-nav-hover-bg)] font-semibold'
                        : 'text-[var(--color-nav-text-dim)] hover:text-[var(--color-nav-text)] hover:bg-[var(--color-nav-hover-bg)]'
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
            <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-900 hover:bg-stone-100/10 transition-colors"
              >
                <Shield className="h-4 w-4" />
                관리자 대시보드
              </Link>
            </div>
          )}
        </nav>

        {/* Bottom auth section */}
        <div className="px-3 py-4 border-t border-[var(--color-border-subtle)] flex-shrink-0">
          {user ? (
            <div className="space-y-1">
              <div className="px-3 py-2 mb-2">
                <p className="text-sm font-semibold text-[var(--color-nav-text)]">{user.name}</p>
                <p className="text-xs text-[var(--color-nav-text-dim)] truncate">{user.email}</p>
              </div>
              <Link
                href="/my"
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[var(--color-nav-text-dim)] hover:text-[var(--color-nav-text)] hover:bg-[var(--color-nav-hover-bg)] transition-colors"
              >
                <User className="h-4 w-4" />내 페이지
              </Link>
              <Link
                href="/my/notifications"
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-[var(--color-nav-text-dim)] hover:text-[var(--color-nav-text)] hover:bg-[var(--color-nav-hover-bg)] transition-colors"
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
                <div className="pt-2 mt-2 border-t border-[var(--color-border-subtle)]">
                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-nav-text-dim)] flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> 역할 전환
                  </p>
                  <div className="flex flex-wrap gap-1 px-3 py-1">
                    {getSwitchableRoles(user.role).map((role) => (
                      <Badge
                        key={role}
                        variant={(activeRole || user.role) === role ? 'default' : 'outline'}
                        className={`cursor-pointer text-[10px] ${
                          (activeRole || user.role) === role
                            ? 'bg-[var(--color-brand-dark)] text-white'
                            : 'hover:bg-[var(--color-surface-overlay)]'
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
                className="flex w-full items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-stone-900 hover:bg-stone-100/10 transition-colors mt-1"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* NX-2: 비로그인 유저 모바일 메뉴에도 테마/언어 컨트롤 제공 */}
              <div className="flex items-center justify-center gap-2 pb-2 mb-1 border-b border-[var(--color-border-subtle)]">
                <ThemeToggle variant="icon" />
                <LanguageSelector />
              </div>
              <Link href="/login" onClick={onClose}>
                <Button variant="outline" className="w-full text-sm">로그인</Button>
              </Link>
              <Link href="/signup" onClick={onClose}>
                <Button className="w-full bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-deep)] text-white text-sm font-semibold">
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
    (item: typeof NAV_ITEMS[number]) =>
      item.matchPaths.some(p => (pathname ?? '').startsWith(p)),
    [pathname]
  )

  // Notification callbacks for real data
  const fetchNotifications = useCallback(async (): Promise<Notification[]> => {
    try {
      const r = await fetch('/api/v1/notifications')
      const d = await r.json()
      const raw = (d.data ?? []) as Array<Record<string, unknown>>
      return raw.map(n => ({
        id: String(n.id ?? ''),
        user_id: String(n.user_id ?? ''),
        type: (n.type ?? 'SYSTEM') as Notification['type'],
        title: String(n.title ?? '알림'),
        body: n.body ? String(n.body) : undefined,
        link: n.link ? String(n.link) : undefined,
        is_read: !!(n.is_read ?? n.read ?? false),
        created_at: String(n.created_at ?? new Date().toISOString()),
      }))
    } catch {
      return []
    }
  }, [])

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setUnreadCount(c => Math.max(0, c - 1))
    } catch { /* silently fail */ }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch('/api/v1/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      setUnreadCount(0)
    } catch { /* silently fail */ }
  }, [])

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full border-b transition-shadow duration-200 ${
          scrolled ? 'shadow-sm backdrop-blur-sm' : ''
        }`}
        style={{
          backgroundColor: scrolled ? 'var(--color-nav-bg-scrolled)' : 'var(--color-nav-bg)',
          borderBottomColor: 'var(--color-nav-border)',
        }}
      >
        <div className="max-w-[1440px] mx-auto flex h-16 items-center justify-between px-6 lg:px-8">

          {/* ── Logo — Electric Blue 강조 (McKinsey cobalt) ─────────── */}
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div
              className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-colors"
              style={{
                background: "#2251FF",
                borderTop: "2px solid #00A9F4",
                boxShadow: "0 4px 10px rgba(34, 81, 255, 0.40)",
              }}
            >
              <span className="text-white font-black text-base tracking-tighter">N</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-black text-[var(--color-nav-text)] text-base tracking-tight">NPL</span>
              <span className="font-light text-[var(--color-nav-text-dim)] text-base">atform</span>
            </div>
          </Link>

          {/* ── Center Nav (desktop) ──────────────────────── */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="메인 네비게이션" data-tour="nav">
            {NAV_ITEMS.map((item) => {
              const isActive = isNavActive(item)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-[var(--color-nav-active)] font-semibold after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:bg-[var(--color-nav-active)] after:rounded-full'
                      : 'text-[var(--color-nav-text-dim)] hover:text-[var(--color-nav-text)] hover:bg-[var(--color-nav-hover-bg)] rounded-lg'
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
              className="p-2 rounded-md text-[var(--color-nav-text-dim)] hover:text-[var(--color-nav-text)] hover:bg-[var(--color-nav-hover-bg)] transition-colors"
              aria-label="검색"
              data-tour="search"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Desktop right side */}
            <div className="hidden lg:flex items-center gap-1">
              {!mounted || loading ? (
                <div className="h-8 w-24 animate-pulse rounded-lg bg-white/10" />
              ) : user ? (
                <>
                  {/* Admin link */}
                  {isAdmin && (
                    <Link href="/admin">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-stone-900 hover:text-stone-900 hover:bg-stone-100/10 text-xs"
                      >
                        <Shield className="mr-1 h-3.5 w-3.5" />
                        관리
                      </Button>
                    </Link>
                  )}

                  {/* Notification bell + dropdown */}
                  <NotificationCenter
                    placement="dropdown"
                    userId={user?.id ?? null}
                    onFetch={fetchNotifications}
                    onMarkRead={handleMarkRead}
                    onMarkAllRead={handleMarkAllRead}
                  />

                  {/* Theme toggle */}
                  <ThemeToggle variant="icon" />

                  {/* Language selector */}
                  <LanguageSelector />

                  {/* User dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-[var(--color-nav-hover-bg)] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-dark)] text-xs font-bold text-white flex-shrink-0">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span className="max-w-[80px] truncate text-sm font-medium text-[var(--color-nav-text)]">
                          {user.name}
                        </span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <div className="px-3 py-2.5">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{user.name}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] truncate">{user.email}</p>
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <TierBadge tier={resolveUserTier(user)} size="sm" showLabel />
                          <Badge variant="secondary" className="text-[10px]">
                            {ROLE_LABELS[(activeRole || user.role) as UserRole] || activeRole || user.role}
                          </Badge>
                        </div>
                        {(() => {
                          const tier = resolveUserTier(user)
                          const next = getNextUpgradeStep(tier)
                          if (!next || !next.href) return null
                          return (
                            <Link
                              href={next.href}
                              className="mt-2 flex items-center justify-between rounded-md px-2.5 py-1.5"
                              style={{
                                backgroundColor: `${TIER_META[next.nextTier].color}14`,
                                border: `1px solid ${TIER_META[next.nextTier].color}40`,
                              }}
                            >
                              <span className="text-[11px] font-semibold" style={{ color: TIER_META[next.nextTier].color }}>
                                {next.action} → {TIER_META[next.nextTier].shortLabel} 해금
                              </span>
                              <span aria-hidden style={{ color: TIER_META[next.nextTier].color, fontSize: 12 }}>→</span>
                            </Link>
                          )
                        })()}
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
                          <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)] flex items-center gap-1 pt-2">
                            <RefreshCw className="h-3 w-3" /> 역할 전환
                          </DropdownMenuLabel>
                          {getSwitchableRoles(user.role).map((role) => (
                            <DropdownMenuItem
                              key={role}
                              onClick={() => switchRole(role)}
                              className={`text-xs ${(activeRole || user.role) === role ? 'bg-[var(--color-surface-overlay)] font-semibold' : ''}`}
                            >
                              {(activeRole || user.role) === role && (
                                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-stone-100 inline-block flex-shrink-0" />
                              )}
                              {ROLE_LABELS[role]}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={signOut}
                        className="text-stone-900 focus:text-stone-900 cursor-pointer"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        로그아웃
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  {/* NX-2: 비로그인 유저에게도 테마 토글 노출 — 보편적 접근성 원칙 */}
                  <ThemeToggle variant="icon" />
                  <LanguageSelector />
                  <Button variant="ghost" size="sm" asChild className="text-sm text-[var(--color-nav-text-dim)] hover:text-[var(--color-nav-text)] hover:bg-[var(--color-nav-hover-bg)]">
                    <Link href="/login">로그인</Link>
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-deep)] text-white text-sm font-semibold"
                  >
                    <Link href="/signup">무료 시작</Link>
                  </Button>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-md text-[var(--color-nav-text-dim)] hover:text-[var(--color-nav-text)] hover:bg-[var(--color-nav-hover-bg)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
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
