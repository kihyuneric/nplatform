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
import { t } from '@/lib/i18n'
import { TierBadge } from '@/components/tier/tier-badge'
import type { AccessTier } from '@/lib/access-tier'
import { getNextUpgradeStep, TIER_META } from '@/lib/access-tier'
import { NotificationCenter } from '@/components/notifications/notification-center'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import type { Notification } from '@/lib/types'

// ─── Nav items — 미니멀 IA · 서브메뉴 없음 (덜 보여주는 플랫폼) ──
const NAV_ITEMS = [
  { href: '/exchange',             label: 'NPL 자동매칭',   matchPaths: ['/exchange'] },
  { href: '/exchange/sell',        label: 'NPL 매각의뢰', matchPaths: ['/exchange/sell', '/exchange/ocr-register'] },
  { href: '/exchange/demands/new', label: '매입조건 등록', matchPaths: ['/exchange/demands'] },
  { href: '/about',                label: 'NPLATFORM',   matchPaths: ['/about', '/guide'] },

]

// ─── 활성 메뉴 판정 — 가장 긴 prefix 매칭 (하위 경로 오버하이라이트 방지) ──
function getActiveHref(pathname: string | null): string | null {
  const path = pathname ?? ''
  let best: { href: string; len: number } | null = null
  for (const item of NAV_ITEMS) {
    for (const p of item.matchPaths) {
      if (path === p || path.startsWith(p + '/')) {
        if (!best || p.length > best.len) best = { href: item.href, len: p.length }
      }
    }
  }
  return best?.href ?? null
}

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
// 관리자 역할은 '운영관리자' 하나로 통일 · 회원 유형 3종 (매각/매입/파트너) + 일반회원 (2026-08-18)
function getSwitchableRoles(userRole: string | undefined): UserRole[] {
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
    // 역할 4종만 — 운영관리자 · 운영 파트너 · 매각 회원 · 매입 회원 (2026-08-18 확정)
    return ['ADMIN', 'PARTNER', 'SELLER', 'BUYER']
  }
  return []
}

const ROLE_DASHBOARD: Record<string, string> = {
  SUPER_ADMIN: '/admin',
  ADMIN: '/admin',
  SELLER: '/my/seller',
  BUYER: '/my',
  BUYER_INST: '/my',
  BUYER_INDV: '/my',
  PARTNER: '/admin',
  VIEWER: '/my',
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
              style={{ background: "#0A1220", border: "1px solid rgba(191, 164, 118, 0.45)" }}
            >
              <span style={{ color: "#BFA476", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 14, lineHeight: 1 }}>N</span>
            </div>
            <span
              className="text-[var(--color-nav-text)]"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 15, fontWeight: 700 }}
            >
              nplatform
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
              const isActive = item.href === getActiveHref(pathname)
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
                <User className="h-4 w-4" />마이페이지
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
              </div>
              <Link href="/login" onClick={onClose}>
                <Button variant="outline" className="w-full text-sm">로그인</Button>
              </Link>
              <Link href="/signup" onClick={onClose}>
                <Button className="w-full bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-deep)] text-white text-sm font-semibold">
                  회원가입
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
      item.href === getActiveHref(pathname),
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
            {/* 브랜드 로고 — 잉크 바탕 + 골드 N (2026-08-17 아이덴티티) */}
            <div
              className="w-8 h-8 flex items-center justify-center flex-shrink-0"
              style={{
                background: "#0A1220",
                border: "1px solid rgba(191, 164, 118, 0.45)",
              }}
            >
              <span style={{ color: "#BFA476", fontFamily: "Georgia, serif", fontWeight: 900, fontSize: 17, lineHeight: 1 }}>N</span>
            </div>
            <div className="hidden sm:block">
              <span
                className="text-[var(--color-nav-text)]"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, fontWeight: 700, letterSpacing: "-0.01em" }}
              >
                nplatform
              </span>
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
            {/* 검색 버튼 제거 — NPL 리스트 자체 검색만 사용 (단순화, 2026-08-17) */}

            {/* Desktop right side */}
            <div className="hidden lg:flex items-center gap-1">
              {!mounted || loading ? (
                <div className="h-8 w-24 animate-pulse rounded-lg bg-white/10" />
              ) : user ? (
                <>
                  {/* Admin link */}
                  {isAdmin && (
                    <Link href="/my">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-stone-900 hover:text-stone-900 hover:bg-stone-100/10 text-xs"
                      >
                        <Shield className="mr-1 h-3.5 w-3.5" />
                        마이페이지
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
                        {/* 2026-08-18 사용자 정책: NDA 체결(L2) 티어 배지 제거 —
                            명함·사업자등록증 확인(관리자 승인) 여부만 '자격 인증완료'로 표시 */}
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {(() => {
                            const u = user as unknown as { approval_status?: string; kyc_status?: string; identity_verified?: boolean }
                            return (u.approval_status === 'APPROVED' || u.kyc_status === 'APPROVED' || u.identity_verified)
                          })() ? (
                            <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white">자격 인증완료</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">인증 대기 — 명함 · 사업자등록증 확인 중</Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px]">
                            {ROLE_LABELS[(activeRole || user.role) as UserRole] || activeRole || user.role}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem asChild>
                          <Link href="/my" className="flex items-center cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            마이페이지
                          </Link>
                        </DropdownMenuItem>
                        {/* 관심매물 · 설정 항목 제거 (2026-08-18) — 마이페이지 좌측 메뉴에서 제공 */}
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
                  {/* 로그인 — 회색(#6B7280)이라 흰 헤더에서 대비 4.83 로 흐렸다.
                      본문색으로 올려 회원가입 버튼과 나란히 읽히게 한다 (2026-08-20) */}
                  <Button variant="ghost" size="sm" asChild className="text-sm font-semibold text-[var(--color-nav-text)] hover:bg-[var(--color-nav-hover-bg)]">
                    <Link href="/login">로그인</Link>
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-deep)] text-white text-sm font-semibold"
                  >
                    <Link href="/signup">회원가입</Link>
                  </Button>
                </>
              )}
            </div>

            {/* 모바일 — 로그인 · 회원가입 (2026-08-20)
                승인제 서비스에서 가입이 가장 중요한 행동인데 햄버거 안에만 있어
                모바일 방문자에게는 로고와 메뉴 버튼만 보였다. 헤더에 직접 노출한다. */}
            {!user && (
              <div className="flex lg:hidden items-center gap-1.5 ml-auto mr-1">
                <Link
                  href="/login"
                  className="px-2 py-1.5 text-[13px] font-semibold text-[var(--color-nav-text-dim)] hover:text-[var(--color-nav-text)]"
                  style={{ textDecoration: 'none' }}
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="px-2.5 py-1.5 text-[13px] font-bold text-white bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-deep)]"
                  style={{ textDecoration: 'none' }}
                >
                  회원가입
                </Link>
              </div>
            )}

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
