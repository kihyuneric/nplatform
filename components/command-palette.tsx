'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import {
  Search, MapPin, BarChart3, Gavel, Brain, Users, MessageCircle,
  Store, FileText, Globe, ArrowRight, Keyboard,
  ArrowRightLeft, Briefcase, Building2, Calendar, GraduationCap,
  BookOpen, TrendingUp, Bell, Heart, Handshake, Home, User,
  Zap, Shield, Settings, CreditCard, Bot, ScanLine, Upload,
  Coins, BarChart2, Activity, X,
} from 'lucide-react'

// ─── 타입 ─────────────────────────────────────────────────

interface CommandItem {
  id:           string
  label:        string
  description?: string
  icon:         React.ComponentType<{ className?: string }>
  href:         string
  category:     string
  keywords?:    string[]  // 추가 검색어
}

// ─── 커맨드 목록 (v2 — 신규 URL 구조 반영) ────────────────

const COMMANDS: CommandItem[] = [
  // 매물 (exchange)
  { id: 'exchange',        label: 'NPL 매물 허브',     description: '전체 NPL·채권 매물',         icon: Globe,          href: '/exchange',                  category: '매물', keywords: ['npl','채권','매물'] },
  { id: 'auction',         label: '법원경매 매물',       description: 'AI 스크리닝 경매 매물',       icon: Gavel,          href: '/exchange/auction',          category: '매물', keywords: ['경매','법원','auction'] },
  { id: 'sell',            label: '매물 등록',           description: '새 NPL 매물 등록 (위저드)',    icon: Upload,         href: '/exchange/sell',             category: '매물' },
  { id: 'demands',         label: '매수 수요 목록',      description: '수요자 공개 매수 요청',        icon: ArrowRightLeft, href: '/exchange/demands',          category: '매물' },
  { id: 'demands-new',     label: '수요 등록',           description: '매수 희망 조건 등록',          icon: FileText,       href: '/exchange/demands/new',      category: '매물' },

  // 거래 (deals)
  { id: 'deals',           label: '내 거래 현황',        description: '진행 중인 딜 칸반',            icon: Activity,       href: '/deals',                     category: '거래', keywords: ['deal','딜','거래'] },
  { id: 'deal-matching',   label: 'AI 매칭',             description: 'AI 자동 매수·매도 매칭',       icon: Handshake,      href: '/deals/matching',            category: '거래' },
  { id: 'deal-contract',   label: '계약서 생성',          description: 'AI 계약서 자동 생성',          icon: FileText,       href: '/deals/contract',            category: '거래' },
  { id: 'deal-teams',      label: '공동투자팀',           description: '팀 구성 및 관리',              icon: Users,          href: '/deals/teams',               category: '거래' },
  { id: 'deal-teams-new',  label: '팀 생성',             description: '새 공동투자팀 만들기',          icon: Users,          href: '/deals/teams/new',           category: '거래' },

  // 분석 (analysis)
  { id: 'analysis',        label: 'NPL 분석 대시보드',  description: 'AI 투자 분석 허브',            icon: Brain,          href: '/analysis',                  category: '분석', keywords: ['분석','analysis','npl'] },
  { id: 'analysis-new',    label: '새 분석 시작',        description: 'NPL 신규 AI 분석',             icon: Zap,            href: '/analysis/new',              category: '분석' },
  { id: 'simulator',       label: '경매 시뮬레이터',     description: '입찰가·수익률 시나리오',        icon: BarChart3,      href: '/analysis/simulator',        category: '분석', keywords: ['시뮬레이터','수익률'] },
  { id: 'copilot',         label: 'AI Copilot',          description: 'GPT-4o NPL 전문 AI 대화',      icon: Bot,            href: '/analysis/copilot',          category: '분석', keywords: ['ai','gpt','copilot'] },
  { id: 'ocr',             label: 'OCR 문서 인식',       description: '등기부등본 자동 분석',          icon: ScanLine,       href: '/analysis/ocr',              category: '분석', keywords: ['ocr','등기','문서'] },
  { id: 'analysis-screen', label: 'AI 스크리닝 현황',   description: '경매 AI 배치 처리 상태',        icon: Shield,         href: '/analysis?tab=screening',    category: '분석' },

  // 서비스 (services)
  { id: 'services',        label: '서비스 허브',          description: '전문가·커뮤니티·교육',          icon: Globe,          href: '/services',                  category: '서비스' },
  { id: 'experts',         label: '전문가 찾기',           description: '법무사·세무사·공인중개사',       icon: Briefcase,      href: '/services/experts',          category: '서비스', keywords: ['전문가','법무사','세무사'] },
  { id: 'experts-reg',     label: '전문가 등록',           description: '내 전문가 프로필 등록',          icon: User,           href: '/services/experts/register', category: '서비스' },
  { id: 'community',       label: '커뮤니티',              description: '투자자 정보 공유',               icon: MessageCircle,  href: '/services/community',        category: '서비스' },
  { id: 'learn',           label: '교육 허브',             description: '강좌·용어사전·뉴스',             icon: GraduationCap,  href: '/services/learn',            category: '서비스', keywords: ['교육','강좌','학습'] },
  { id: 'glossary',        label: '용어사전',              description: 'NPL/경매 전문 용어',             icon: BookOpen,       href: '/services/learn/glossary',   category: '서비스', keywords: ['용어','사전'] },

  // 마이 페이지 (my)
  { id: 'my',              label: '내 대시보드',           description: '역할별 개인 대시보드',           icon: Home,           href: '/my',                        category: '마이 페이지' },
  { id: 'portfolio',       label: '포트폴리오',            description: '관심매물·비교·포트폴리오',        icon: Heart,          href: '/my/portfolio',              category: '마이 페이지' },
  { id: 'billing',         label: '요금제 · 결제',         description: '구독·크레딧·인보이스',           icon: CreditCard,     href: '/my/billing',                category: '마이 페이지', keywords: ['billing','결제','구독','크레딧'] },
  { id: 'notifications',   label: '알림',                  description: '알림 센터',                      icon: Bell,           href: '/my/notifications',          category: '마이 페이지' },
  { id: 'settings',        label: '설정',                  description: '프로필·보안·알림 설정',           icon: Settings,       href: '/my/settings',               category: '마이 페이지', keywords: ['설정','settings','보안'] },
  { id: 'developer',       label: '개발자 포털',           description: 'API 키 · Webhook · 문서',        icon: BarChart2,      href: '/my/developer',              category: '마이 페이지', keywords: ['api','developer','webhook'] },
  { id: 'credits',         label: '크레딧 현황',           description: '잔여 크레딧 및 사용 내역',        icon: Coins,          href: '/my/billing?tab=크레딧',     category: '마이 페이지', keywords: ['크레딧','credit'] },

  // 공통
  { id: 'pricing',         label: '요금제',                description: '플랜별 가격 및 비교',             icon: CreditCard,     href: '/pricing',                   category: '공통', keywords: ['pricing','요금','플랜'] },
  { id: 'guide',           label: '가이드 · 도움말',       description: '플랫폼 사용 가이드',              icon: BookOpen,       href: '/guide',                     category: '공통' },
  { id: 'support',         label: '고객센터',              description: 'FAQ · 티켓 · 문의',               icon: MessageCircle,  href: '/support',                   category: '공통', keywords: ['고객센터','faq','문의'] },
  { id: 'notices',         label: '공지사항',              description: '플랫폼 공지 및 업데이트',          icon: Bell,           href: '/notices',                   category: '공통' },
  { id: 'calendar',        label: '경매 캘린더',           description: '경매 일정 한눈에',                icon: Calendar,       href: '/exchange/auction',          category: '공통' },
  { id: 'institutions',    label: '기관 디렉터리',         description: '참여 금융기관 목록',               icon: Building2,      href: '/exchange/institutions',     category: '공통', keywords: ['기관','금융','institution'] },

  // 관리자 (admin)
  { id: 'admin',           label: '관리자 대시보드',       description: 'KPI · 시스템 현황',               icon: Shield,         href: '/admin',                     category: '관리자' },
  { id: 'admin-users',     label: '회원 관리',             description: '사용자 목록 · 승인 · KYC',        icon: Users,          href: '/admin/users',               category: '관리자' },
  { id: 'admin-listings',  label: '매물 심사',             description: '매물 승인 · 신고 처리',           icon: FileText,       href: '/admin/listings',            category: '관리자' },
  { id: 'admin-billing',   label: '결제 관리',             description: '결제 내역 · 정산',                icon: CreditCard,     href: '/admin/billing',             category: '관리자' },
  { id: 'admin-commiss',   label: '수수료 · 인보이스',     description: '수수료 내역 · 발행',               icon: Coins,          href: '/admin/commissions',         category: '관리자' },
  { id: 'admin-import',    label: '데이터 임포트',         description: '경매 데이터 CSV/Excel 일괄 등록',  icon: Upload,         href: '/admin/data-import',         category: '관리자', keywords: ['import','임포트','csv','excel'] },
  { id: 'admin-datasync',  label: '데이터 동기화',         description: '크롤링 · 인덱스 현황',             icon: Activity,       href: '/admin/data-sync',           category: '관리자' },
]

// ─── 단축키 도움말 데이터 ─────────────────────────────────

export const SHORTCUTS = [
  { keys: ['⌘', 'K'],    label: '명령어 팔레트 열기'  },
  { keys: ['G', 'E'],    label: '거래소 (Exchange) 이동' },
  { keys: ['G', 'A'],    label: '분석 (Analysis) 이동'  },
  { keys: ['G', 'D'],    label: '딜룸 (Deals) 이동'     },
  { keys: ['G', 'S'],    label: '서비스 이동'           },
  { keys: ['G', 'M'],    label: '마이 페이지 이동'      },
  { keys: ['G', 'H'],    label: '홈으로 이동'           },
  { keys: ['/'],         label: '검색 포커스'           },
  { keys: ['?'],         label: '단축키 도움말'         },
  { keys: ['Esc'],       label: '팔레트 / 모달 닫기'   },
  { keys: ['↑', '↓'],   label: '항목 이동'             },
  { keys: ['↵'],         label: '선택 / 이동'          },
]

// ─── 단축키 도우미 컴포넌트 ──────────────────────────────

function KbdKey({ k }: { k: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 text-[11px] font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded shadow-[0_1px_0_var(--color-border-default)] tracking-tight">
      {k}
    </kbd>
  )
}

// ─── 단축키 도움말 모달 ───────────────────────────────────

function ShortcutHelp({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-[var(--color-surface-base)]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <span className="text-sm font-semibold text-[var(--color-text-primary)] tracking-normal">키보드 단축키</span>
          </div>
          <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[360px] overflow-y-auto">
          <div className="space-y-2.5">
            {SHORTCUTS.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-[var(--color-text-secondary)] tracking-normal">{s.label}</span>
                <div className="flex items-center gap-1">
                  {s.keys.map((k, j) => <KbdKey key={j} k={k} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-3 border-t bg-[var(--color-surface-base)] text-[11px] text-[var(--color-text-muted)] tracking-normal">
          <span className="font-medium">G</span> 키 시퀀스: G를 누른 뒤 1초 내 두 번째 키 입력
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── 메인 CommandPalette ──────────────────────────────────

export function CommandPalette() {
  const [open,          setOpen]          = useState(false)
  const [helpOpen,      setHelpOpen]      = useState(false)
  const [query,         setQuery]         = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [gPending,      setGPending]      = useState(false)  // G-sequence 대기
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // ── 전역 키보드 핸들러 ──────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable

      // ⌘K / Ctrl+K — 팔레트 토글
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
        return
      }

      // ? — 단축키 도움말
      if (e.key === '?' && !isInput && !open) {
        e.preventDefault()
        setHelpOpen(prev => !prev)
        return
      }

      // / — 검색 포커스 (팔레트 열기)
      if (e.key === '/' && !isInput && !open) {
        e.preventDefault()
        setOpen(true)
        return
      }

      // ESC — 닫기
      if (e.key === 'Escape') {
        setOpen(false)
        setHelpOpen(false)
        setGPending(false)
        if (gTimer.current) clearTimeout(gTimer.current)
        return
      }

      // G-시퀀스 — 입력 필드에서는 무시
      if (isInput || open) return

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault()
        setGPending(true)
        if (gTimer.current) clearTimeout(gTimer.current)
        gTimer.current = setTimeout(() => setGPending(false), 1000)
        return
      }

      if (gPending) {
        if (gTimer.current) clearTimeout(gTimer.current)
        setGPending(false)
        const map: Record<string, string> = {
          'e': '/exchange',
          'E': '/exchange',
          'a': '/analysis',
          'A': '/analysis',
          'd': '/deals',
          'D': '/deals',
          's': '/services',
          'S': '/services',
          'm': '/my',
          'M': '/my',
          'h': '/',
          'H': '/',
        }
        const dest = map[e.key]
        if (dest) {
          e.preventDefault()
          router.push(dest)
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (gTimer.current) clearTimeout(gTimer.current)
    }
  }, [open, gPending, router])

  // ── 검색 필터링 ─────────────────────────────────────────
  const filtered = COMMANDS.filter(cmd => {
    const q = query.toLowerCase()
    if (!q) return true
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.description?.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q) ||
      cmd.keywords?.some(kw => kw.toLowerCase().includes(q))
    )
  })

  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category]!.push(cmd)
    return acc
  }, {} as Record<string, CommandItem[]>)

  const handleSelect = useCallback((href: string) => {
    setOpen(false)
    setQuery('')
    router.push(href)
  }, [router])

  // ── 팔레트 내부 키보드 네비게이션 ──────────────────────
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]!.href)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, filtered, selectedIndex, handleSelect])

  useEffect(() => { setSelectedIndex(0) }, [query])

  return (
    <>
      {/* G-시퀀스 힌트 토스트 */}
      {gPending && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white text-xs rounded-xl shadow-xl border border-white/10 animate-in fade-in slide-in-from-bottom-2">
          <KbdKey k="G" />
          <span className="text-[var(--color-text-secondary)] tracking-normal">이동할 페이지 단축키를 누르세요 (E·A·D·S·M·H)</span>
        </div>
      )}

      {/* 단축키 도움말 */}
      <ShortcutHelp open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* 커맨드 팔레트 */}
      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setQuery('') }}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">

          {/* 검색 입력 */}
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="페이지 검색... (예: 경매, 분석, 결제)"
              className="flex-1 h-12 px-2 text-sm outline-none bg-transparent"
              aria-label="명령어 검색"
            />
            <button
              onClick={() => setHelpOpen(true)}
              className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition"
            >
              <Keyboard className="w-3 h-3" />
              <span className="hidden sm:inline">단축키</span>
            </button>
          </div>

          {/* 결과 목록 */}
          <div className="max-h-[380px] overflow-y-auto py-1.5">
            {Object.keys(grouped).length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)] tracking-normal">
                <Search className="w-6 h-6 mx-auto mb-2 opacity-30" />
                <span>검색 결과 없음</span>
              </div>
            ) : (
              Object.entries(grouped).map(([category, items]) => (
                <div key={category}>
                  <div className="px-4 pt-3 pb-1 text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">
                    {category}
                  </div>
                  {items.map((item) => {
                    const globalIdx = filtered.indexOf(item)
                    const isSelected = globalIdx === selectedIndex
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.href)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isSelected ? 'bg-blue-500/10' : 'hover:bg-[var(--color-surface-overlay)]'
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                          isSelected ? 'bg-blue-500/15' : 'bg-[var(--color-surface-overlay)]'
                        }`}>
                          <item.icon className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-[var(--color-text-muted)]'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium tracking-normal ${isSelected ? 'text-blue-400' : 'text-[var(--color-text-primary)]'}`}>
                            {item.label}
                          </div>
                          {item.description && (
                            <div className="text-xs text-[var(--color-text-muted)] truncate tracking-normal">{item.description}</div>
                          )}
                        </div>
                        <ArrowRight className={`w-3 h-3 shrink-0 ${isSelected ? 'text-blue-400' : 'text-[var(--color-text-muted)]'}`} />
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* 푸터 */}
          <div className="border-t px-4 py-2 flex items-center justify-between text-[11px] text-[var(--color-text-muted)] bg-[var(--color-surface-base)]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><KbdKey k="↑" /><KbdKey k="↓" /> 이동</span>
              <span className="flex items-center gap-1"><KbdKey k="↵" /> 선택</span>
            </div>
            <span className="flex items-center gap-1"><KbdKey k="?" /> 단축키 도움말</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── 내보내기: 단축키 훅 ─────────────────────────────────

export function useKeyboardShortcut(
  keys: string | string[],
  callback: () => void,
  options?: { ctrl?: boolean; meta?: boolean; enabled?: boolean }
) {
  useEffect(() => {
    if (options?.enabled === false) return
    const target = Array.isArray(keys) ? keys : [keys]
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable
      if (isInput) return
      if (options?.ctrl && !e.ctrlKey) return
      if (options?.meta && !e.metaKey) return
      if (target.includes(e.key)) {
        e.preventDefault()
        callback()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [keys, callback, options?.ctrl, options?.meta, options?.enabled])
}
