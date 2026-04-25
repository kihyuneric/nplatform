'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Sparkles,
  Clock,
  X,
  ArrowRight,
  MapPin,
  Building2,
  DollarSign,
  Tag,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatAmount } from '@/components/ui/amount-display'

// ─── Types ────────────────────────────────────────────────────────────────

export interface ParsedSearchFilters {
  regions?: string[]
  collateralTypes?: string[]
  minAmount?: number
  maxAmount?: number
  listingType?: string
  keywords?: string[]
  raw: string
}

interface SearchSuggestion {
  id: string
  label: string
  description?: string
  icon: React.ReactNode
  filters: Partial<ParsedSearchFilters>
  highlightTerms?: string[]
}

interface NaturalLanguageSearchProps {
  onSearch?: (filters: ParsedSearchFilters) => void
  onQueryChange?: (query: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  autoFocus?: boolean
  showHistory?: boolean
}

// ─── Parser Logic ─────────────────────────────────────────────────────────

const REGION_KEYWORDS: Record<string, string[]> = {
  서울: ['서울', '강남', '강북', '강동', '강서', '종로', '마포', '용산', '성동', '송파', '노원', '도봉', '은평', '서초', '관악'],
  경기: ['경기', '수원', '성남', '용인', '부천', '안양', '안산', '과천', '의왕', '군포'],
  부산: ['부산', '해운대', '서면', '사하', '기장'],
  인천: ['인천', '연수', '남동', '부평'],
  대구: ['대구', '수성', '달서'],
  대전: ['대전', '유성', '서구'],
  광주: ['광주'],
}

const COLLATERAL_KEYWORDS: Record<string, string[]> = {
  아파트: ['아파트', 'APT'],
  상가: ['상가', '상업', '점포'],
  토지: ['토지', '땅', '부지'],
  공장: ['공장', '산업'],
  오피스: ['오피스', '사무실', '오피스텔'],
  '빌라/다세대': ['빌라', '다세대', '다가구'],
}

const LISTING_TYPE_KEYWORDS: Record<string, string[]> = {
  AUCTION_NPL: ['경매', '법원경매', '공매', 'NPL 경매'],
  DISTRESSED_SALE: ['임의매각', '임의', '매각'],
  NON_AUCTION_NPL: ['비경매', 'NPL'],
}

function parseAmounts(query: string): { min?: number; max?: number } {
  const result: { min?: number; max?: number } = {}

  // Patterns: "5억 이하", "3억~8억", "2억 이상", "5천만원 이하"
  const belowPattern = /(\d+(?:\.\d+)?)\s*(억|천만|만)\s*(?:원\s*)?(?:이하|미만|under)/gi
  const abovePattern = /(\d+(?:\.\d+)?)\s*(억|천만|만)\s*(?:원\s*)?(?:이상|초과|above)/gi
  const rangePattern = /(\d+(?:\.\d+)?)\s*(억|천만|만)\s*(?:원\s*)?[~\-~～]\s*(\d+(?:\.\d+)?)\s*(억|천만|만)/gi

  const toWon = (num: number, unit: string): number => {
    if (unit === '억') return num * 100_000_000
    if (unit === '천만') return num * 10_000_000
    if (unit === '만') return num * 10_000
    return num
  }

  let match: RegExpExecArray | null

  // Range
  rangePattern.lastIndex = 0
  while ((match = rangePattern.exec(query)) !== null) {
    result.min = toWon(parseFloat(match[1]), match[2])
    result.max = toWon(parseFloat(match[3]), match[4])
  }

  if (!result.min && !result.max) {
    // Below
    belowPattern.lastIndex = 0
    while ((match = belowPattern.exec(query)) !== null) {
      result.max = toWon(parseFloat(match[1]), match[2])
    }

    // Above
    abovePattern.lastIndex = 0
    while ((match = abovePattern.exec(query)) !== null) {
      result.min = toWon(parseFloat(match[1]), match[2])
    }
  }

  return result
}

export function parseNaturalLanguage(query: string): ParsedSearchFilters {
  const result: ParsedSearchFilters = { raw: query }
  const lower = query.toLowerCase()

  // Regions
  const regions: string[] = []
  for (const [region, keywords] of Object.entries(REGION_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      if (!regions.includes(region)) regions.push(region)
    }
  }
  if (regions.length > 0) result.regions = regions

  // Collateral types
  const types: string[] = []
  for (const [type, keywords] of Object.entries(COLLATERAL_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      if (!types.includes(type)) types.push(type)
    }
  }
  if (types.length > 0) result.collateralTypes = types

  // Listing type
  for (const [type, keywords] of Object.entries(LISTING_TYPE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      result.listingType = type
      break
    }
  }

  // Amount
  const amounts = parseAmounts(query)
  if (amounts.min != null) result.minAmount = amounts.min
  if (amounts.max != null) result.maxAmount = amounts.max

  return result
}

// ─── Search History Key ────────────────────────────────────────────────────

const SEARCH_HISTORY_KEY = 'nplatform-nl-search-history'
const MAX_HISTORY = 10

// ─── Highlight matching terms ──────────────────────────────────────────────

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>

  const words = query.trim().split(/\s+/).filter(Boolean)
  const regex = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-stone-100/20 text-current rounded-sm px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ─── Suggestion Chip ──────────────────────────────────────────────────────

function ParsedChips({ filters }: { filters: ParsedSearchFilters }) {
  const chips: Array<{ icon: React.ReactNode; label: string; color: string }> = []

  if (filters.regions?.length) {
    filters.regions.forEach((r) =>
      chips.push({ icon: <MapPin className="h-3 w-3" />, label: r, color: 'bg-stone-100/10 text-stone-900' })
    )
  }
  if (filters.collateralTypes?.length) {
    filters.collateralTypes.forEach((t) =>
      chips.push({ icon: <Building2 className="h-3 w-3" />, label: t, color: 'bg-stone-100/10 text-stone-900' })
    )
  }
  if (filters.maxAmount) {
    chips.push({
      icon: <DollarSign className="h-3 w-3" />,
      label: `${formatAmount(filters.maxAmount, 'short')} 이하`,
      color: 'bg-stone-100/10 text-stone-900',
    })
  }
  if (filters.minAmount) {
    chips.push({
      icon: <DollarSign className="h-3 w-3" />,
      label: `${formatAmount(filters.minAmount, 'short')} 이상`,
      color: 'bg-stone-100/10 text-stone-900',
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {chips.map((chip, i) => (
        <span
          key={i}
          className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', chip.color)}
        >
          {chip.icon}
          {chip.label}
        </span>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────

const QUICK_SUGGESTIONS: SearchSuggestion[] = [
  {
    id: 'q1',
    label: '강남 아파트 10억 이하',
    description: '서울 강남 아파트 NPL',
    icon: <MapPin className="h-3.5 w-3.5 text-stone-900" />,
    filters: { regions: ['서울'], collateralTypes: ['아파트'], maxAmount: 1_000_000_000 },
  },
  {
    id: 'q2',
    label: '경기 상가 임의매각',
    description: '경기 지역 상가 임의매각 매물',
    icon: <Building2 className="h-3.5 w-3.5 text-stone-900" />,
    filters: { regions: ['경기'], collateralTypes: ['상가'], listingType: 'DISTRESSED_SALE' },
  },
  {
    id: 'q3',
    label: '법원경매 NPL 5억~15억',
    description: '경공매 NPL 5~15억 범위',
    icon: <Tag className="h-3.5 w-3.5 text-stone-900" />,
    filters: { listingType: 'AUCTION_NPL', minAmount: 500_000_000, maxAmount: 1_500_000_000 },
  },
]

export function NaturalLanguageSearch({
  onSearch,
  onQueryChange,
  placeholder = '"강남 아파트 5억 이하" 처럼 자연어로 검색하세요',
  className,
  disabled = false,
  autoFocus = false,
  showHistory = true,
}: NaturalLanguageSearchProps) {
  const [query, setQuery] = React.useState('')
  const [focused, setFocused] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [history, setHistory] = React.useState<string[]>([])
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const parsedFilters = React.useMemo(() => parseNaturalLanguage(query), [query])
  const hasFilters = !!(
    parsedFilters.regions?.length ||
    parsedFilters.collateralTypes?.length ||
    parsedFilters.maxAmount ||
    parsedFilters.minAmount ||
    parsedFilters.listingType
  )

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
      if (stored) setHistory(JSON.parse(stored))
    } catch {}
  }, [])

  const saveHistory = (q: string) => {
    if (!q.trim()) return
    setHistory((prev) => {
      const updated = [q, ...prev.filter((h) => h !== q)].slice(0, MAX_HISTORY)
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated))
      } catch {}
      return updated
    })
  }

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery ?? query
    if (!q.trim()) return

    saveHistory(q)
    setLoading(true)

    const filters = parseNaturalLanguage(q)
    setQuery(q)

    // Simulate parsing delay
    await new Promise((r) => setTimeout(r, 300))
    setLoading(false)
    setFocused(false)

    onSearch?.(filters)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onQueryChange?.(val)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') {
      setFocused(false)
      inputRef.current?.blur()
    }
  }

  // Click outside
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const showDropdown = focused && (query.length === 0 || hasFilters || history.length > 0)

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <div
        className={cn(
          'relative flex items-center rounded-xl border bg-background',
          'transition-all duration-200',
          focused
            ? 'border-[#1B3A5C] ring-2 ring-[#1B3A5C]/20 shadow-md'
            : 'border-border hover:border-[#2E75B6]/50',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <div className="pl-4 pr-2 shrink-0">
          {loading ? (
            <Loader2 className="h-4 w-4 text-[#14161A] animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-[#14161A]" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            'flex-1 py-3 bg-transparent text-sm outline-none',
            'placeholder:text-muted-foreground/60',
          )}
          aria-label="자연어 검색"
          aria-autocomplete="list"
        />

        {query && (
          <button
            onClick={() => { setQuery(''); onQueryChange?.('') }}
            className="px-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="검색어 지우기"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <button
          onClick={() => handleSearch()}
          disabled={!query.trim() || loading}
          className={cn(
            'mx-2 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-[#1B3A5C] text-white hover:bg-[#2E75B6]',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'transition-colors shrink-0',
          )}
          aria-label="검색"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">검색</span>
        </button>
      </div>

      {/* Parsed chips preview */}
      <AnimatePresence>
        {query && hasFilters && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-1.5 px-1"
          >
            <ParsedChips filters={parsedFilters} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            className={cn(
              'absolute top-full left-0 right-0 mt-2 z-50',
              'bg-[var(--color-surface-base)] rounded-xl border border-border shadow-xl overflow-hidden',
            )}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            {/* Recent history */}
            {showHistory && history.length > 0 && (
              <div className="px-3 pt-3 pb-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> 최근 검색
                  </span>
                  <button
                    onClick={() => {
                      setHistory([])
                      try { localStorage.removeItem(SEARCH_HISTORY_KEY) } catch {}
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    모두 지우기
                  </button>
                </div>
                <div className="space-y-0.5">
                  {history.slice(0, 5).map((h, i) => (
                    <button
                      key={i}
                      onClick={() => { setQuery(h); handleSearch(h) }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted text-left group"
                    >
                      <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground flex-1 truncate">
                        <HighlightedText text={h} query={query} />
                      </span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick suggestions */}
            {!query && (
              <div className={cn('px-3 py-3', history.length > 0 && 'border-t')}>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                  빠른 검색 예시
                </p>
                <div className="space-y-0.5">
                  {QUICK_SUGGESTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => { setQuery(s.label); handleSearch(s.label) }}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted text-left group"
                    >
                      <span className="shrink-0">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{s.label}</p>
                        {s.description && (
                          <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI hint */}
            <div className="px-4 py-2.5 border-t bg-muted/30 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-[#14161A] shrink-0" />
              <p className="text-xs text-muted-foreground">
                지역, 물건 종류, 금액을 자연어로 입력하면 AI가 자동으로 필터를 적용합니다
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
