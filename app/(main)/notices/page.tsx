'use client'

import { useState, useEffect } from 'react'
import DS from '@/lib/design-system'

interface Notice {
  id: string
  title: string
  summary: string
  category: 'SERVICE' | 'MAINTENANCE' | 'UPDATE' | 'ALL'
  isPinned: boolean
  isNew: boolean
  isImportant?: boolean
  createdAt: string
}

const MOCK_NOTICES: Notice[] = [
  { id: 'n1', title: '[긴급] 시스템 정기 점검 안내 (3/22 02:00~06:00)', summary: '서비스 안정성 향상을 위한 정기 점검이 진행됩니다. 점검 시간 동안 서비스 이용이 제한됩니다.', category: 'MAINTENANCE', isPinned: true, isNew: true, isImportant: true, createdAt: '2026-03-20' },
  { id: 'n2', title: 'NPLatform v5.0 업데이트 — 실시간 기능 & 다크모드 출시', summary: '실시간 알림, 다크모드, 로딩 스켈레톤 등 다양한 신규 기능이 추가되었습니다.', category: 'UPDATE', isPinned: true, isNew: true, isImportant: false, createdAt: '2026-03-19' },
  { id: 'n3', title: 'AI 매칭 알고리즘 v3.0 적용 안내', summary: '더욱 정교해진 AI 매칭 알고리즘이 적용되어 매수자·매도자 간 최적 매칭 정확도가 15% 향상되었습니다.', category: 'SERVICE', isPinned: false, isNew: false, createdAt: '2026-03-15' },
  { id: 'n4', title: '모바일 앱 PWA 지원 시작', summary: '이제 모바일 브라우저에서 "홈 화면에 추가"로 앱처럼 사용할 수 있습니다.', category: 'UPDATE', isPinned: false, isNew: false, createdAt: '2026-03-12' },
  { id: 'n5', title: '개인정보 처리방침 변경 안내', summary: '2026년 4월 1일부터 적용되는 개인정보 처리방침 변경 사항을 안내드립니다.', category: 'SERVICE', isPinned: false, isNew: false, createdAt: '2026-03-10' },
  { id: 'n6', title: '2026년 1분기 NPL 시장 리포트 발행', summary: '전국 NPL 시장 동향, 지역별 할인율 분석, 투자 트렌드를 담은 분기 리포트가 발행되었습니다.', category: 'SERVICE', isPinned: false, isNew: false, createdAt: '2026-03-08' },
  { id: 'n7', title: '투자자 인증 등급 체계 개편 안내', summary: '투자자 인증 등급이 3단계에서 4단계로 세분화되며, 등급별 혜택이 확대됩니다.', category: 'SERVICE', isPinned: false, isNew: false, createdAt: '2026-03-05' },
]

const NOTICE_TABS = [
  { value: 'ALL', label: '전체' },
  { value: 'SERVICE', label: '서비스 공지' },
  { value: 'MAINTENANCE', label: '점검 안내' },
  { value: 'UPDATE', label: '업데이트' },
]

const CATEGORY_STYLE: Record<string, { label: string; bg: string; text: string; border: string }> = {
  SERVICE:     { label: '서비스 공지', bg: 'bg-blue-50',  text: 'text-blue-700', border: 'border-blue-200' },
  MAINTENANCE: { label: '점검 안내',   bg: 'bg-red-50',   text: 'text-red-700', border: 'border-red-200' },
  UPDATE:      { label: '업데이트',    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
}

const PAGE_SIZE = 5

function NoticeRow({ notice }: { notice: Notice }) {
  const [open, setOpen] = useState(false)
  const cat = CATEGORY_STYLE[notice.category] ?? CATEGORY_STYLE.SERVICE

  return (
    <div
      onClick={() => setOpen(!open)}
      className={`group px-5 py-4 cursor-pointer transition-colors ${notice.isPinned ? 'bg-[var(--color-surface-sunken)] border-l-2 border-[var(--color-brand-mid)]' : 'hover:bg-[var(--color-surface-sunken)]'} border-b border-[var(--color-border-subtle)] last:border-0`}
    >
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[0.6875rem] font-bold border ${cat.bg} ${cat.text} ${cat.border}`}>
              {cat.label}
            </span>
            {notice.isImportant && (
              <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-red-500 text-white border border-red-500">중요</span>
            )}
            {notice.isNew && (
              <span className="px-2 py-0.5 rounded-full text-[0.6875rem] font-bold bg-[var(--color-brand-mid)] text-white border border-[var(--color-brand-mid)]">NEW</span>
            )}
            {notice.isPinned && (
              <span className={DS.text.caption}>📌 고정</span>
            )}
          </div>
          {/* Title */}
          <h3 className={`${DS.text.bodyBold} transition-colors ${open ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]'}`}>
            {notice.title}
          </h3>
          {/* Expanded summary */}
          {open && (
            <p className={`${DS.text.body} mt-2`}>{notice.summary}</p>
          )}
          {/* Date */}
          <p className={`${DS.text.captionLight} mt-2`}>{notice.createdAt}</p>
        </div>
        <span className={`shrink-0 text-[var(--color-text-muted)] text-[0.9375rem] mt-0.5 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
      </div>
    </div>
  )
}

function Pagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-1.5 mt-8">
      <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}
        className="w-8 h-8 rounded-lg text-[0.8125rem] font-semibold bg-[var(--color-surface-elevated)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)] disabled:opacity-30 hover:bg-[var(--color-surface-sunken)] transition-colors">‹</button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onPage(p)}
          className={`w-8 h-8 rounded-lg text-[0.8125rem] font-semibold transition-colors ${p === page ? 'bg-[var(--color-brand-dark)] text-white' : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)]'}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onPage(Math.min(pages, page + 1))} disabled={page === pages}
        className="w-8 h-8 rounded-lg text-[0.8125rem] font-semibold bg-[var(--color-surface-elevated)] text-[var(--color-text-tertiary)] border border-[var(--color-border-subtle)] disabled:opacity-30 hover:bg-[var(--color-surface-sunken)] transition-colors">›</button>
    </div>
  )
}

export default function NoticesPage() {
  const [tab, setTab] = useState('ALL')
  const [notices, setNotices] = useState<Notice[]>(MOCK_NOTICES)
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetch('/api/v1/notices')
      .then((r) => r.json())
      .then(({ data }) => { if (Array.isArray(data) && data.length > 0) setNotices(data) })
      .catch(() => {})
  }, [])

  const filtered = notices.filter((n) => tab === 'ALL' || n.category === tab)
  const pinned = filtered.filter((n) => n.isPinned)
  const regular = filtered.filter((n) => !n.isPinned)
  const paginated = regular.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleTab(val: string) {
    setTab(val)
    setPage(1)
  }

  return (
    <div className={DS.page.wrapper}>

      {/* Header */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-brand-mid)]/10 flex items-center justify-center text-xl">🔔</div>
            <div>
              <h1 className={DS.text.sectionTitle}>공지사항</h1>
              <p className={DS.text.caption}>NPLatform의 주요 소식과 업데이트를 확인하세요</p>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1.5 mt-6 flex-wrap">
            {NOTICE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => handleTab(t.value)}
                className={tab === t.value ? DS.tabs.active : DS.tabs.trigger}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Pinned notices */}
        {pinned.length > 0 && (
          <div>
            <p className={`${DS.text.label} mb-3 px-1`}>고정 공지</p>
            <div className={`${DS.card.elevated} overflow-hidden`}>
              {pinned.map((n) => <NoticeRow key={n.id} notice={n} />)}
            </div>
          </div>
        )}

        {/* Regular notices */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <p className={DS.text.label}>전체 공지</p>
            <span className={DS.text.captionLight}>{regular.length}건</span>
          </div>

          {regular.length === 0 ? (
            <div className={DS.empty.wrapper}>
              <div className={`${DS.empty.icon} text-2xl`}>🔔</div>
              <p className={DS.empty.title}>공지사항이 없습니다</p>
              <p className={DS.empty.description}>다른 탭을 확인해보세요.</p>
            </div>
          ) : (
            <>
              <div className={`${DS.card.elevated} overflow-hidden`}>
                {paginated.map((n) => <NoticeRow key={n.id} notice={n} />)}
              </div>
              <Pagination total={regular.length} page={page} onPage={setPage} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
