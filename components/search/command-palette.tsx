'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Building2,
  BarChart3,
  FileText,
  Users,
  Settings,
  Home,
  Clock,
  Sparkles,
  Brain,
  Calculator,
  Map,
  Bell,
  Shield,
  Gavel,
  TrendingUp,
  BookOpen,
  X,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  action: () => void
  shortcut?: string
  badge?: string
  keywords?: string[]
}

interface CommandSection {
  id: string
  title: string
  items: CommandItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────

const MAX_RECENT_SEARCHES = 8
const RECENT_SEARCHES_KEY = 'nplatform-recent-searches'

// ─── Main Component ───────────────────────────────────────────────────────

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [recentSearches, setRecentSearches] = React.useState<string[]>([])

  // Load recent searches from localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY)
      if (stored) {
        setRecentSearches(JSON.parse(stored))
      }
    } catch {
      // ignore
    }
  }, [])

  // Keyboard shortcut: Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const saveRecentSearch = React.useCallback((label: string) => {
    setRecentSearches((prev) => {
      const updated = [label, ...prev.filter((s) => s !== label)].slice(0, MAX_RECENT_SEARCHES)
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated))
      } catch {
        // ignore
      }
      return updated
    })
  }, [])

  const clearRecentSearches = () => {
    setRecentSearches([])
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY)
    } catch {
      // ignore
    }
  }

  const navigate = (path: string, label: string) => {
    saveRecentSearch(label)
    router.push(path)
    setOpen(false)
    setQuery('')
  }

  // ─── Command Sections ───────────────────────────────────────────────────

  const sections: CommandSection[] = React.useMemo(() => [
    {
      id: 'listings',
      title: '매물검색',
      items: [
        {
          id: 'search-all',
          label: '전체 매물 검색',
          description: '모든 NPL 매물 찾기',
          icon: <Search className="h-4 w-4 text-[#14161A]" />,
          action: () => navigate('/exchange/search', '전체 매물 검색'),
          keywords: ['매물', '검색', 'NPL', '부실채권'],
        },
        {
          id: 'auction-npl',
          label: '경공매 NPL',
          description: '법원경매 NPL 매물',
          icon: <Gavel className="h-4 w-4 text-stone-900" />,
          action: () => navigate('/exchange/search?type=AUCTION_NPL', '경공매 NPL'),
          badge: 'HOT',
          keywords: ['경매', '법원', '공매', 'NPL'],
        },
        {
          id: 'distressed',
          label: '임의매각',
          description: '금융기관 임의매각 매물',
          icon: <Building2 className="h-4 w-4 text-stone-900" />,
          action: () => navigate('/exchange/search?type=DISTRESSED_SALE', '임의매각'),
          keywords: ['임의매각', '금융기관', '매각'],
        },
        {
          id: 'non-auction',
          label: '비경매 NPL',
          description: '경매 외 NPL 채권',
          icon: <FileText className="h-4 w-4 text-stone-900" />,
          action: () => navigate('/exchange/search?type=NON_AUCTION_NPL', '비경매 NPL'),
          keywords: ['비경매', 'NPL', '채권'],
        },
        {
          id: 'market-map',
          label: '지도로 매물 찾기',
          description: '지도 기반 매물 검색',
          icon: <Map className="h-4 w-4 text-[#2E75B6]" />,
          action: () => navigate('/market/map', '지도 매물검색'),
          keywords: ['지도', '맵', '위치', '검색'],
        },
      ],
    },
    {
      id: 'pages',
      title: '페이지이동',
      items: [
        {
          id: 'home',
          label: '홈 대시보드',
          icon: <Home className="h-4 w-4" />,
          action: () => navigate('/', '홈 대시보드'),
          shortcut: 'G H',
          keywords: ['홈', '대시보드', '메인'],
        },
        {
          id: 'statistics',
          label: '시장 통계',
          description: '낙찰가율, 시세 분석',
          icon: <BarChart3 className="h-4 w-4 text-[#2E75B6]" />,
          action: () => navigate('/statistics', '시장 통계'),
          shortcut: 'G S',
          keywords: ['통계', '낙찰가율', '시세', '분석'],
        },
        {
          id: 'deal-rooms',
          label: '딜룸 관리',
          description: '진행 중인 거래 딜룸',
          icon: <Shield className="h-4 w-4 text-[#1B3A5C]" />,
          action: () => navigate('/deals', '딜룸 관리'),
          keywords: ['딜룸', '거래', '계약'],
        },
        {
          id: 'notifications',
          label: '알림 센터',
          icon: <Bell className="h-4 w-4" />,
          action: () => navigate('/notifications', '알림'),
          keywords: ['알림', '노티피케이션'],
        },
        {
          id: 'profile',
          label: '내 프로필',
          icon: <Users className="h-4 w-4" />,
          action: () => navigate('/profile', '내 프로필'),
          shortcut: 'G P',
          keywords: ['프로필', '내정보', '계정'],
        },
        {
          id: 'settings',
          label: '설정',
          icon: <Settings className="h-4 w-4" />,
          action: () => navigate('/settings', '설정'),
          shortcut: 'G ,',
          keywords: ['설정', '환경설정'],
        },
      ],
    },
    {
      id: 'ai-tools',
      title: 'AI 도구',
      items: [
        {
          id: 'npl-analysis',
          label: 'NPL 분석 도구',
          description: 'AI 기반 부실채권 분석',
          icon: <Brain className="h-4 w-4 text-stone-900" />,
          action: () => navigate('/analysis', 'NPL 분석'),
          badge: 'AI',
          keywords: ['AI', '분석', 'NPL', '인공지능'],
        },
        {
          id: 'auction-simulator',
          label: '경매 분석',
          description: '낙찰 전략 및 수익률 계산',
          icon: <Calculator className="h-4 w-4 text-stone-900" />,
          action: () => navigate('/analysis/simulator', '경매 분석'),
          badge: 'NEW',
          keywords: ['경매', '시뮬레이터', '분석기', '낙찰', '수익률', '분석'],
        },
        {
          id: 'market-trends',
          label: '시장 트렌드 분석',
          description: 'AI 예측 기반 시장 분석',
          icon: <TrendingUp className="h-4 w-4 text-stone-900" />,
          action: () => navigate('/statistics', '시장 트렌드'),
          keywords: ['트렌드', '시장', '예측', 'AI'],
        },
        {
          id: 'learning-center',
          label: 'NPL 학습 센터',
          description: 'NPL 투자 용어 및 가이드',
          icon: <BookOpen className="h-4 w-4 text-stone-900" />,
          action: () => navigate('/learning', 'NPL 학습 센터'),
          keywords: ['학습', '교육', 'NPL', '가이드', '용어'],
        },
      ],
    },
  ], [])

  // Fuzzy search filtering
  const filteredSections = React.useMemo(() => {
    if (!query.trim()) return sections

    const q = query.toLowerCase()
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const searchText = [
            item.label,
            item.description ?? '',
            ...(item.keywords ?? []),
          ].join(' ').toLowerCase()
          return searchText.includes(q)
        }),
      }))
      .filter((section) => section.items.length > 0)
  }, [query, sections])

  return (
    <>
      {/* Trigger Button (can be used in header) */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm',
          'bg-muted/50 hover:bg-muted text-muted-foreground border border-border/50',
          'transition-colors duration-150 group'
        )}
        aria-label="검색 열기 (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span>검색...</span>
        <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 group-hover:opacity-80">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <CommandInput
            placeholder="검색어를 입력하세요... (매물, 페이지, AI 도구)"
            value={query}
            onValueChange={setQuery}
            className="border-0 focus:ring-0 shadow-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
              aria-label="검색어 지우기"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <CommandList className="max-h-[480px] overflow-y-auto">
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <Search className="h-10 w-10 opacity-20" />
              <p className="text-sm">&ldquo;{query}&rdquo;에 대한 결과가 없습니다.</p>
              <p className="text-xs opacity-60">다른 검색어를 시도해보세요</p>
            </div>
          </CommandEmpty>

          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <>
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      최근 검색
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      모두 지우기
                    </button>
                  </div>
                }
              >
                {recentSearches.map((search) => {
                  // Find matching item for icon
                  const matchedItem = sections
                    .flatMap((s) => s.items)
                    .find((item) => item.label === search)

                  return (
                    <CommandItem
                      key={search}
                      onSelect={() => {
                        if (matchedItem) {
                          matchedItem.action()
                        }
                        setOpen(false)
                      }}
                      className="gap-2 cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{search}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Dynamic Sections */}
          {filteredSections.map((section, idx) => (
            <React.Fragment key={section.id}>
              {idx > 0 && !query && <CommandSeparator />}
              <CommandGroup heading={section.title}>
                {section.items.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={item.action}
                    className="gap-3 cursor-pointer group py-2.5"
                    keywords={item.keywords}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-muted/50 group-hover:bg-muted">
                      {item.icon}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium leading-none">{item.label}</span>
                      {item.description && (
                        <span className="text-xs text-muted-foreground mt-0.5 truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[10px] px-1.5 py-0 h-4',
                            item.badge === 'AI' && 'bg-stone-100/10 text-stone-900',
                            item.badge === 'HOT' && 'bg-stone-100/10 text-stone-900',
                            item.badge === 'NEW' && 'bg-stone-100/10 text-stone-900',
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                      {item.shortcut && (
                        <CommandShortcut className="text-[10px]">{item.shortcut}</CommandShortcut>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </React.Fragment>
          ))}

          {/* AI Quick Search suggestion */}
          {query && query.length >= 2 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="AI 도구">
                <CommandItem
                  onSelect={() => {
                    saveRecentSearch(`"${query}" 검색`)
                    router.push(`/market/search?q=${encodeURIComponent(query)}`)
                    setOpen(false)
                    setQuery('')
                  }}
                  className="gap-3 cursor-pointer"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-stone-100/10">
                    <Sparkles className="h-4 w-4 text-stone-900" />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">&ldquo;{query}&rdquo; 매물 검색</span>
                    <span className="text-xs text-muted-foreground">AI가 관련 매물을 찾아드립니다</span>
                  </div>
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>

        <div className="border-t px-3 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border px-1 font-mono text-[9px] font-medium">↑↓</kbd>
            이동
          </span>
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border px-1 font-mono text-[9px] font-medium">↵</kbd>
            선택
          </span>
          <span className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-4 select-none items-center rounded border px-1 font-mono text-[9px] font-medium">esc</kbd>
            닫기
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-stone-900" />
            AI 검색 지원
          </span>
        </div>
      </CommandDialog>
    </>
  )
}
