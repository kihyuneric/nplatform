'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Search, Brain, Menu, X,
  Gavel, Settings, LogIn, Upload,
  User, BookOpen, BarChart3, Users,
  Handshake, FileText, GraduationCap,
  Heart, Wallet, ClipboardList, Calculator,
  Archive, TrendingUp,
} from 'lucide-react'
import { useScrollDirection } from '@/hooks/use-scroll-direction'
import { t } from '@/lib/i18n'

// ─── Role-based Tab Configurations ──────────────────────────

interface TabItem {
  label: string
  href?: string
  icon: any
  action?: 'hub' | 'more'
}

const DEFAULT_TABS: TabItem[] = [
  { label: '홈', href: '/', icon: Home },
  { label: '거래소', href: '/exchange', icon: Search },
  { label: '딜룸', href: '/deals', icon: Handshake },
  { label: '분석', href: '/analysis', icon: Brain },
  { label: '더보기', icon: Menu, action: 'more' },
]
const DEFAULT_TABS_I18N = ['mobile.home', 'mobile.listings', 'mobile.deals', 'mobile.insights', 'mobile.more']

const SELLER_TABS: TabItem[] = [
  { label: '홈', href: '/', icon: Home },
  { label: '매물등록', href: '/exchange/sell', icon: FileText },
  { label: '내거래', href: '/deals', icon: ClipboardList },
  { label: '분석', href: '/analysis', icon: Brain },
  { label: '더보기', icon: Menu, action: 'more' },
]
const SELLER_TABS_I18N = ['mobile.home', 'mobile.listProperty', 'mobile.myDeals', 'mobile.insights', 'mobile.more']

const PARTNER_TABS: TabItem[] = [
  { label: '홈', href: '/', icon: Home },
  { label: '추천', href: '/my/partner', icon: Users },
  { label: '수익', href: '/my/partner', icon: Wallet },
  { label: '분석', href: '/analysis', icon: Brain },
  { label: '더보기', icon: Menu, action: 'more' },
]
const PARTNER_TABS_I18N = ['mobile.home', 'mobile.referrals', 'mobile.earnings', 'mobile.insights', 'mobile.more']

function getActiveRole(): string {
  if (typeof document === 'undefined') return 'default'
  return document.cookie.match(/active_role=([^;]+)/)?.[1] || 'default'
}

function getTabsForRole(role: string): TabItem[] {
  if (role === 'seller' || role === 'institution' || role === 'amc') return SELLER_TABS
  if (role === 'partner') return PARTNER_TABS
  return DEFAULT_TABS
}

function getTabsI18NForRole(role: string): string[] {
  if (role === 'seller' || role === 'institution' || role === 'amc') return SELLER_TABS_I18N
  if (role === 'partner') return PARTNER_TABS_I18N
  return DEFAULT_TABS_I18N
}

// ─── More Menu Sections ────────────────────────────────────────
const MORE_SECTIONS = [
  {
    title: '거래소',
    titleKey: 'nav.listings',
    items: [
      { label: '매물 탐색', labelKey: 'nav.nplSearch', href: '/exchange', icon: Search },
      { label: '입찰', labelKey: 'nav.auction', href: '/exchange/auction', icon: Gavel },
      { label: '매물 등록', labelKey: 'nav.listProperty', href: '/exchange/sell', icon: FileText },
      { label: '대량 등록', labelKey: 'nav.bulkUpload', href: '/exchange/bulk-upload', icon: Upload },
      { label: '매수 수요', labelKey: 'nav.buyerDemands', href: '/exchange/demands', icon: Users },
    ],
  },
  {
    title: '딜룸',
    titleKey: 'nav.deals',
    items: [
      { label: '진행 중', labelKey: 'nav.activeDeals', href: '/deals', icon: ClipboardList },
      { label: '완료', labelKey: 'nav.dealArchive', href: '/deals/archive', icon: Archive },
      { label: 'AI 매칭', labelKey: 'nav.aiMatching', href: '/deals/matching', icon: TrendingUp },
      { label: '팀 투자', labelKey: 'nav.teamInvest', href: '/deals/teams', icon: Users },
    ],
  },
  {
    title: '분석',
    titleKey: 'nav.insights',
    items: [
      { label: '시장 현황', labelKey: 'nav.marketAnalysis', href: '/analysis', icon: BarChart3 },
      { label: 'AI 실사 보고서', labelKey: 'nav.ddReport', href: '/analysis/due-diligence', icon: FileText },
      { label: '경매 시뮬레이터', labelKey: 'nav.simulator', href: '/analysis/simulator', icon: Calculator },
      { label: '커뮤니티', labelKey: 'nav.community', href: '/services/community', icon: Users },
      { label: '전문가', labelKey: 'nav.findExpert', href: '/services/experts', icon: GraduationCap },
      { label: '학습', labelKey: 'nav.learn', href: '/services/learn', icon: BookOpen },
    ],
  },
  {
    title: '마이 페이지',
    titleKey: 'nav.myInfo',
    items: [
      { label: '대시보드', labelKey: 'mobile.myPage', href: '/my', icon: User },
      { label: '포트폴리오', labelKey: 'nav.portfolio', href: '/my/portfolio', icon: Heart },
      { label: '설정', labelKey: 'nav.settings', href: '/my/settings', icon: Settings },
    ],
  },
]

interface MobileTabBarProps {
  badgeCounts?: Partial<Record<string, number>>
}

export function MobileTabBar({ badgeCounts = {} }: MobileTabBarProps) {
  const pathname = usePathname()
  const scrollDirection = useScrollDirection(8)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [role, setRole] = useState('default')

  // Read role from cookie on mount
  useEffect(() => {
    setRole(getActiveRole())
  }, [])

  const tabs = useMemo(() => getTabsForRole(role), [role])
  const tabsI18N = useMemo(() => getTabsI18NForRole(role), [role])

  // Detect virtual keyboard
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const handleResize = () => {
      setIsKeyboardOpen(viewport.height < window.innerHeight * 0.75)
    }
    viewport.addEventListener('resize', handleResize)
    return () => viewport.removeEventListener('resize', handleResize)
  }, [])

  // Close sheets on navigation
  useEffect(() => {
    setMoreOpen(false)
  }, [pathname])

  const handleMoreToggle = useCallback(() => {
    setMoreOpen(v => !v)
  }, [])

  if (isKeyboardOpen) return null

  const isHidden = scrollDirection === 'down' && !moreOpen

  const isActive = (href: string) =>
    pathname === href || (pathname ?? '').startsWith(href + '/')

  return (
    <>
      {/* ── Backdrop ─── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMoreOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── More Bottom Sheet ─── */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl bg-[var(--color-surface-elevated)] shadow-2xl md:hidden max-h-[70vh] overflow-y-auto"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="px-4 pt-4 pb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-bold text-[var(--color-text-primary)]">{t('mobile.allMenu') || '전체 메뉴'}</h3>
                <button onClick={() => setMoreOpen(false)} className="p-1 text-[var(--color-text-muted)]" aria-label={t('mobile.closeMenu') || '메뉴 닫기'}>
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              {MORE_SECTIONS.map((section) => (
                <div key={section.title} className="mb-4">
                  <h4 className="text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                    {t(section.titleKey) || section.title}
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex flex-col items-center gap-1 py-2 rounded-lg hover:bg-[var(--color-surface-overlay)] transition-colors"
                        >
                          <Icon className="w-5 h-5 text-[var(--color-text-secondary)]" />
                          <span className="text-[11px] text-[var(--color-text-secondary)]">{t(item.labelKey) || item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
              {/* Login CTA */}
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 w-full h-10 mt-2 rounded-lg bg-[#1B3A5C] text-white text-[13px] font-medium"
              >
                <LogIn className="w-4 h-4" />
                {t('mobile.loginSignup') || '로그인 / 회원가입'}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tab Bar ─── */}
      <AnimatePresence>
        {!isHidden && (
          <motion.nav
            key="mobile-tab-bar"
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            aria-label={t('mobile.tabBar') || '하단 탭 네비게이션'}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] shadow-[0_-2px_12px_rgba(0,0,0,0.06)] md:hidden"
          >
            <div
              className="flex h-16 items-center justify-around"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              {tabs.map((tab, tabIdx) => {
                const Icon = tab.icon
                const isMore = tab.action === 'more'
                const active = isMore ? moreOpen : (tab.href === '/' ? pathname === '/' : isActive(tab.href!))
                const tabLabel = t(tabsI18N[tabIdx]) || tab.label

                if (isMore) {
                  return (
                    <button
                      key="more"
                      onClick={handleMoreToggle}
                      aria-label={tabLabel}
                      aria-expanded={moreOpen}
                      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1"
                    >
                      {moreOpen && (
                        <motion.div layoutId="tab-active-pill" className="absolute top-1 h-7 w-12 rounded-full bg-[var(--color-brand-dark)]/8" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                      )}
                      <Icon className={`h-5 w-5 transition-colors ${moreOpen ? 'text-[#1B3A5C]' : 'text-[var(--color-text-muted)]'}`} />
                      <span className={`text-[10px] transition-colors ${moreOpen ? 'font-bold text-[#1B3A5C]' : 'text-[var(--color-text-muted)]'}`}>{tabLabel}</span>
                    </button>
                  )
                }

                return (
                  <Link key={tab.href} href={tab.href!} aria-label={tabLabel} className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1">
                    {active && (
                      <motion.div layoutId="tab-active-pill" className="absolute top-1 h-7 w-12 rounded-full bg-[var(--color-brand-dark)]/8" transition={{ type: 'spring', stiffness: 380, damping: 30 }} />
                    )}
                    <Icon className={`h-5 w-5 transition-colors ${active ? 'text-[#1B3A5C]' : 'text-[var(--color-text-muted)]'}`} />
                    <span className={`text-[10px] transition-colors ${active ? 'font-bold text-[#1B3A5C]' : 'text-[var(--color-text-muted)]'}`}>{tabLabel}</span>
                  </Link>
                )
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}
