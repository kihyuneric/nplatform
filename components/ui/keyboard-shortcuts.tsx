'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Keyboard, X, Search, Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FocusTrap } from './focus-trap'

// ─── Types ────────────────────────────────────────────────────────────────

interface ShortcutItem {
  keys: string[]
  description: string
  context?: string
}

interface ShortcutGroup {
  id: string
  title: string
  icon?: React.ReactNode
  shortcuts: ShortcutItem[]
}

// ─── Shortcut Data ────────────────────────────────────────────────────────

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    id: 'global',
    title: '전역',
    shortcuts: [
      { keys: ['⌘', 'K'], description: '검색 팔레트 열기' },
      { keys: ['?'], description: '단축키 목록 보기' },
      { keys: ['Esc'], description: '모달/패널 닫기' },
      { keys: ['⌘', '/'], description: '도움말' },
    ],
  },
  {
    id: 'navigation',
    title: '페이지 이동',
    shortcuts: [
      { keys: ['G', 'H'], description: '홈 대시보드' },
      { keys: ['G', 'M'], description: '매물 검색' },
      { keys: ['G', 'S'], description: '시장 통계' },
      { keys: ['G', 'D'], description: '딜룸 관리' },
      { keys: ['G', 'P'], description: '내 프로필' },
      { keys: ['G', ','], description: '설정' },
    ],
  },
  {
    id: 'listings',
    title: '매물 목록',
    shortcuts: [
      { keys: ['J'], description: '다음 항목' },
      { keys: ['K'], description: '이전 항목' },
      { keys: ['F'], description: '관심 매물 추가/제거' },
      { keys: ['Enter'], description: '매물 상세 보기' },
      { keys: ['⌘', 'Enter'], description: '새 탭에서 열기' },
      { keys: ['⌘', 'F'], description: '목록 내 검색' },
    ],
  },
  {
    id: 'deal',
    title: '딜룸 & 계약',
    shortcuts: [
      { keys: ['⌘', 'S'], description: '저장' },
      { keys: ['⌘', 'Z'], description: '실행 취소' },
      { keys: ['⌘', '⇧', 'Z'], description: '다시 실행' },
      { keys: ['⌘', 'D'], description: '문서 다운로드' },
    ],
  },
  {
    id: 'ui',
    title: 'UI 컨트롤',
    shortcuts: [
      { keys: ['⌘', '⇧', 'L'], description: '라이트/다크 모드 전환' },
      { keys: ['⌘', '+'], description: '화면 확대' },
      { keys: ['⌘', '-'], description: '화면 축소' },
      { keys: ['⌘', '0'], description: '화면 비율 초기화' },
    ],
  },
]

// ─── Key Badge ────────────────────────────────────────────────────────────

function KeyBadge({ keyStr }: { keyStr: string }) {
  const isSpecial = ['⌘', '⇧', '⌥', '⌃', 'Ctrl', 'Alt', 'Shift', 'Esc', 'Enter', 'Tab'].includes(keyStr)

  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center',
        'min-w-[24px] h-6 px-1.5',
        'rounded-md border border-border/80',
        'bg-muted/60 text-muted-foreground',
        'font-mono text-[11px] font-medium leading-none',
        'shadow-[0_1px_0_1px] shadow-border/40',
        isSpecial && 'text-xs px-2 bg-muted',
      )}
    >
      {keyStr}
    </kbd>
  )
}

// ─── Shortcut Row ─────────────────────────────────────────────────────────

function ShortcutRow({ item }: { item: ShortcutItem }) {
  return (
    <div className="flex items-center justify-between py-1.5 group">
      <span className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
        {item.description}
      </span>
      <div className="flex items-center gap-1 shrink-0 ml-4">
        {item.keys.map((key, i) => (
          <React.Fragment key={i}>
            <KeyBadge keyStr={key} />
            {i < item.keys.length - 1 && (
              <span className="text-muted-foreground text-xs">+</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────

interface KeyboardShortcutsProps {
  customGroups?: ShortcutGroup[]
  triggerKey?: string
}

export function KeyboardShortcuts({
  customGroups,
  triggerKey = '?',
}: KeyboardShortcutsProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState('')

  const groups = customGroups ?? SHORTCUT_GROUPS

  // Open on "?" key
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if (e.key === triggerKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [triggerKey])

  // Filtered groups
  const filtered = React.useMemo(() => {
    if (!search.trim()) return groups
    const q = search.toLowerCase()
    return groups
      .map((g) => ({
        ...g,
        shortcuts: g.shortcuts.filter(
          (s) =>
            s.description.toLowerCase().includes(q) ||
            s.keys.join(' ').toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.shortcuts.length > 0)
  }, [search, groups])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[9980] bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <FocusTrap active={open}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="키보드 단축키 목록"
              className={cn(
                'fixed z-[9981] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
                'w-[90vw] max-w-2xl max-h-[80vh]',
                'bg-[var(--color-surface-base)] rounded-2xl shadow-2xl border border-border',
                'flex flex-col overflow-hidden',
              )}
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b">
                <Keyboard className="h-5 w-5 text-blue-400" />
                <h2 className="text-base font-semibold flex-1">키보드 단축키</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors rounded-md p-1 hover:bg-muted"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-5 py-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="단축키 검색..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn(
                      'w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-muted/40',
                      'text-sm placeholder:text-muted-foreground',
                      'focus:outline-none focus:ring-2 focus:ring-[#1B3A5C]',
                    )}
                  />
                </div>
              </div>

              {/* Shortcuts Grid */}
              <div className="overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    &ldquo;{search}&rdquo;에 대한 단축키가 없습니다.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 divide-x divide-border/50">
                    {filtered.map((group) => (
                      <div key={group.id} className="px-5 py-4">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          {group.title}
                        </h3>
                        <div className="divide-y divide-border/30">
                          {group.shortcuts.map((item, i) => (
                            <ShortcutRow key={i} item={item} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Command className="h-3 w-3" />
                  NPLatform 키보드 단축키
                </span>
                <span>
                  <KeyBadge keyStr="?" /> 를 눌러 열기/닫기
                </span>
              </div>
            </motion.div>
          </FocusTrap>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Export helpers ───────────────────────────────────────────────────────

export { SHORTCUT_GROUPS }
export type { ShortcutGroup, ShortcutItem }
