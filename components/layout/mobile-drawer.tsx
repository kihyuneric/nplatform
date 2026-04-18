'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Search,
  Map,
  Gavel,
  Brain,
  User,
  BarChart2,
  FileText,
  MessageSquare,
  Settings,
  Shield,
  ChevronDown,
  ChevronRight,
  Building2,
  Briefcase,
  Users,
  BookOpen,
  PlusCircle,
  Globe,
  HelpCircle,
  TrendingUp,
  Landmark,
  CreditCard,
  ScanLine,
  FileSignature,
  Upload,
  Sparkles,
  Archive,
  Newspaper,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// ─── Nav structure (4-category) ──────────────────────────────────────────────

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: '거래소',
    items: [
      { label: '매물 탐색', icon: Search, href: '/exchange' },
      { label: '입찰', icon: Gavel, href: '/exchange/auction' },
      { label: '매물 등록', icon: PlusCircle, href: '/exchange/sell' },
      { label: '대량 등록', icon: Upload, href: '/exchange/bulk-upload' },
      { label: '매수 수요', icon: Users, href: '/exchange/demands' },
    ],
  },
  {
    group: '딜룸',
    items: [
      { label: '진행 중', icon: Briefcase, href: '/deals' },
      { label: '완료', icon: Archive, href: '/deals/archive' },
      { label: 'AI 매칭', icon: TrendingUp, href: '/deals/matching' },
      { label: '팀 투자', icon: Building2, href: '/deals/teams' },
    ],
  },
  {
    group: '분석',
    items: [
      { label: '시장 현황', icon: BarChart2, href: '/analysis' },
      { label: 'AI 컨설턴트', icon: FileText, href: '/analysis/copilot' },
      { label: '경매 수익률 분석기', icon: TrendingUp, href: '/analysis/simulator' },
      { label: '계약서 생성', icon: FileText, href: '/analysis/ocr' },
      { label: '커뮤니티', icon: MessageSquare, href: '/services/community' },
      { label: '전문가', icon: Users, href: '/services/experts' },
      { label: '학습', icon: BookOpen, href: '/services/learn' },
    ],
  },
  {
    group: '마이 페이지',
    items: [
      { label: '대시보드', icon: User, href: '/my' },
      { label: '포트폴리오', icon: Briefcase, href: '/my/portfolio' },
      { label: '설정', icon: Settings, href: '/my/settings' },
    ],
  },
]

// ─── Quick Actions ───────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: '매물 등록', href: '/exchange/sell', icon: PlusCircle },
  { label: '전문가', href: '/services/experts', icon: Users },
  { label: '대시보드', href: '/my', icon: User },
]

// ─── Language options ────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
]

// ─── Component ───────────────────────────────────────────────────────────────

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  /** User info displayed at the top */
  user?: {
    name: string
    email: string
    avatarUrl?: string
    role?: string
  }
}

function NavGroupAccordion({
  group,
  items,
  pathname,
  onClose,
}: {
  group: string
  items: NavItem[]
  pathname: string
  onClose: () => void
}) {
  const hasActive = items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  )
  const [expanded, setExpanded] = React.useState(hasActive)

  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-3.5 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
          {group}
        </span>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-4 w-4 text-white/40" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {items.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-6 py-3 text-sm transition-colors',
                      isActive
                        ? 'bg-white/10 font-semibold text-[#10B981]'
                        : 'text-white/80 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                    {isActive && (
                      <ChevronRight className="ml-auto h-3.5 w-3.5 text-[#10B981]" />
                    )}
                  </Link>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MobileDrawer({ open, onClose, user }: MobileDrawerProps) {
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [currentLang, setCurrentLang] = React.useState('ko')

  // Read locale from cookie on mount
  React.useEffect(() => {
    const match = document.cookie.match(/locale=([^;]+)/)
    if (match) setCurrentLang(match[1])
  }, [])

  const handleLangChange = (code: string) => {
    setCurrentLang(code)
    document.cookie = `locale=${code};path=/;max-age=${365 * 24 * 60 * 60}`
    window.location.reload()
  }

  // Filter nav items by search query
  const filteredGroups = React.useMemo(() => {
    if (!searchQuery.trim()) return NAV_GROUPS
    const q = searchQuery.toLowerCase()
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => item.label.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0)
  }, [searchQuery])

  // Swipe-left to close
  const dragStartX = React.useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartX.current === null) return
    const delta = e.changedTouches[0].clientX - dragStartX.current
    if (delta < -60) onClose()
    dragStartX.current = null
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
            onClick={onClose}
          />

          {/* Drawer panel — full-screen on mobile */}
          <motion.div
            key="drawer-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="fixed inset-0 z-50 flex flex-col bg-[#1B3A5C] shadow-2xl md:left-0 md:right-auto md:w-[80vw] md:max-w-[360px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 pb-4 pt-safe-top pt-12">
              {/* User info */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white/30">
                  {user?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-[#2E75B6] text-sm font-semibold text-white">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {user?.name ?? '게스트'}
                  </p>
                  <p className="truncate text-xs text-white/50">
                    {user?.email ?? '로그인이 필요합니다'}
                  </p>
                </div>
              </div>

              {/* Close button */}
              <button
                type="button"
                aria-label="메뉴 닫기"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/60 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Search bar */}
            <div className="px-5 py-3 border-b border-white/10">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="메뉴 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg bg-white/10 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 outline-none focus:bg-white/15 transition-colors"
                />
              </div>
            </div>

            {/* Nav groups (5 categories) */}
            <nav className="flex-1 overflow-y-auto py-2">
              {filteredGroups.map((g) => (
                <NavGroupAccordion
                  key={g.group}
                  group={g.group}
                  items={g.items}
                  pathname={pathname ?? ''}
                  onClose={onClose}
                />
              ))}
              {filteredGroups.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-white/40">
                  검색 결과가 없습니다
                </div>
              )}
            </nav>

            {/* Quick action buttons */}
            <div className="border-t border-white/10 px-5 py-3">
              <div className="flex gap-2">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon
                  return (
                    <Link
                      key={action.href}
                      href={action.href}
                      onClick={onClose}
                      className="flex flex-1 flex-col items-center gap-1.5 rounded-lg bg-white/10 px-2 py-2.5 text-center text-white/80 hover:bg-white/15 transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-[10px] font-medium leading-tight">{action.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Language selector + Footer */}
            <div className="border-t border-white/10 px-5 py-3 pb-safe-bottom">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Globe className="h-3.5 w-3.5 text-white/40" />
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLangChange(lang.code)}
                    className={cn(
                      'rounded px-2 py-1 text-xs transition-colors',
                      currentLang === lang.code
                        ? 'bg-white/20 text-white font-semibold'
                        : 'text-white/40 hover:text-white/60'
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              <p className="text-center text-[10px] text-white/30">
                NPLatform v12.0 &copy; 2025
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
