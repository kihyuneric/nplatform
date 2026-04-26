'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Pin, ChevronRight } from 'lucide-react'
import {
  MckPageShell,
  MckPageHeader,
  MckSection,
  MckCard,
  MckBadge,
  MckEmptyState,
  MckDemoBanner,
} from '@/components/mck'
import { MCK, MCK_FONTS, MCK_TYPE } from '@/lib/mck-design'

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

// Sample fallback — used when API fails so the page never errors out
const SAMPLE_NOTICES: Notice[] = [
  {
    id: 'sample-1',
    title: 'NPLatform v2.5 정식 릴리즈 — AI Copilot SSE 스트리밍 적용',
    summary:
      'AI 분석 Copilot 의 응답 속도가 평균 4.2배 향상되었습니다. 실시간 스트리밍 UI 와 도구 호출 시각화가 새롭게 도입되어 분석 워크플로우가 한결 매끄러워졌습니다.',
    category: 'UPDATE',
    isPinned: true,
    isNew: true,
    isImportant: true,
    createdAt: '2026-04-22',
  },
  {
    id: 'sample-2',
    title: '[정기 점검] 4월 28일 02:00 ~ 04:00 서비스 일시 중단',
    summary:
      'Supabase 인프라 안정화 및 RLS 정책 업데이트를 위한 정기 점검이 예정되어 있습니다. 점검 시간 동안 일부 거래 기능 이용이 제한될 수 있습니다.',
    category: 'MAINTENANCE',
    isPinned: true,
    isNew: true,
    createdAt: '2026-04-20',
  },
  {
    id: 'sample-3',
    title: '경매 시뮬레이터 v2 출시 — 실거래가 연동',
    summary:
      '국토부 실거래가 API 와 경매 통계 데이터가 시뮬레이터에 통합되었습니다. 입찰가별 회수율을 보다 정확히 예측할 수 있습니다.',
    category: 'SERVICE',
    isPinned: false,
    isNew: true,
    createdAt: '2026-04-18',
  },
  {
    id: 'sample-4',
    title: 'OCR 문서 인식 정확도 95% 달성',
    summary:
      '등기부등본 · 감정평가서 · 매각물건명세서 OCR 정확도가 95% 를 돌파했습니다. 자동 매물 등록이 더 빨라집니다.',
    category: 'UPDATE',
    isPinned: false,
    isNew: false,
    createdAt: '2026-04-12',
  },
  {
    id: 'sample-5',
    title: '딜룸 NDA 자동 서명 기능 추가',
    summary:
      '딜룸 입장 시 NDA 가 자동으로 생성·서명됩니다. 비공개 자료 공유가 한층 안전해집니다.',
    category: 'SERVICE',
    isPinned: false,
    isNew: false,
    createdAt: '2026-04-08',
  },
  {
    id: 'sample-6',
    title: '결제 채널 확장 — PortOne · Inicis 연동',
    summary:
      '기존 토스페이먼츠 외 PortOne · Inicis 가 추가되어 더 다양한 결제 수단을 지원합니다.',
    category: 'SERVICE',
    isPinned: false,
    isNew: false,
    createdAt: '2026-04-02',
  },
]

const NOTICE_TABS: Array<{ value: 'ALL' | 'SERVICE' | 'MAINTENANCE' | 'UPDATE'; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'SERVICE', label: '서비스 공지' },
  { value: 'MAINTENANCE', label: '점검 안내' },
  { value: 'UPDATE', label: '업데이트' },
]

const CATEGORY_LABEL: Record<string, string> = {
  SERVICE: '서비스 공지',
  MAINTENANCE: '점검 안내',
  UPDATE: '업데이트',
}

const CATEGORY_TONE: Record<string, 'blue' | 'warning' | 'positive' | 'neutral'> = {
  SERVICE: 'blue',
  MAINTENANCE: 'warning',
  UPDATE: 'positive',
}

const PAGE_SIZE = 5

function NoticeRow({ notice, last }: { notice: Notice; last: boolean }) {
  const [open, setOpen] = useState(false)
  const tone = CATEGORY_TONE[notice.category] ?? 'neutral'
  const label = CATEGORY_LABEL[notice.category] ?? '공지'

  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        cursor: 'pointer',
        padding: '18px 22px',
        background: notice.isPinned ? 'rgba(184, 146, 75, 0.05)' : MCK.paper,
        borderBottom: last ? 'none' : `1px solid ${MCK.border}`,
        borderLeft: notice.isPinned ? `2px solid ${MCK.brass}` : '2px solid transparent',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={(e) => {
        if (!notice.isPinned) e.currentTarget.style.background = MCK.paperTint
      }}
      onMouseLeave={(e) => {
        if (!notice.isPinned) e.currentTarget.style.background = MCK.paper
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <MckBadge tone={tone} size="sm">
              {label}
            </MckBadge>
            {notice.isImportant && (
              <MckBadge tone="danger" size="sm">
                중요
              </MckBadge>
            )}
            {notice.isNew && (
              <MckBadge tone="brass" size="sm">
                NEW
              </MckBadge>
            )}
            {notice.isPinned && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 10,
                  fontWeight: 700,
                  color: MCK.brassDark,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <Pin size={10} /> 고정
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            style={{
              fontFamily: MCK_FONTS.serif,
              color: MCK.ink,
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-0.015em',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {notice.title}
          </h3>

          {/* Expanded summary */}
          {open && notice.summary && (
            <p
              style={{
                ...MCK_TYPE.body,
                color: MCK.textSub,
                marginTop: 10,
                marginBottom: 0,
              }}
            >
              {notice.summary}
            </p>
          )}

          {/* Date */}
          <p
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: MCK.textMuted,
              letterSpacing: '0.02em',
              marginTop: 8,
              marginBottom: 0,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {notice.createdAt}
          </p>
        </div>

        <ChevronRight
          size={16}
          style={{
            color: MCK.textMuted,
            flexShrink: 0,
            marginTop: 2,
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease',
          }}
        />
      </div>
    </div>
  )
}

function Pagination({ total, page, onPage }: { total: number; page: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / PAGE_SIZE)
  if (pages <= 1) return null

  const baseBtn = {
    width: 32,
    height: 32,
    fontSize: 12,
    fontWeight: 700,
    background: MCK.paper,
    border: `1px solid ${MCK.border}`,
    color: MCK.textSub,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontVariantNumeric: 'tabular-nums' as const,
  }
  const activeBtn = {
    ...baseBtn,
    background: MCK.ink,
    color: MCK.paper,
    border: `1px solid ${MCK.ink}`,
    borderTop: `2px solid ${MCK.brass}`,
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 32,
      }}
    >
      <button
        onClick={() => onPage(Math.max(1, page - 1))}
        disabled={page === 1}
        style={{ ...baseBtn, opacity: page === 1 ? 0.35 : 1 }}
      >
        ‹
      </button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onPage(p)} style={p === page ? activeBtn : baseBtn}>
          {p}
        </button>
      ))}
      <button
        onClick={() => onPage(Math.min(pages, page + 1))}
        disabled={page === pages}
        style={{ ...baseBtn, opacity: page === pages ? 0.35 : 1 }}
      >
        ›
      </button>
    </div>
  )
}

export default function NoticesPage() {
  const [tab, setTab] = useState<'ALL' | 'SERVICE' | 'MAINTENANCE' | 'UPDATE'>('ALL')
  const [notices, setNotices] = useState<Notice[]>([])
  const [, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [isDemo, setIsDemo] = useState(false)

  const loadNotices = useCallback(async () => {
    setLoading(true)
    try {
      // Primary: Supabase notices table
      const supabase = createClient()
      const { data } = await supabase
        .from('notices')
        .select('id, title, summary, category, is_pinned, created_at, is_important')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)

      if (data && data.length > 0) {
        const now = new Date()
        setNotices(
          data.map((r: any) => ({
            id: String(r.id),
            title: r.title ?? '—',
            summary: r.summary ?? '',
            category: (r.category ?? 'SERVICE') as Notice['category'],
            isPinned: Boolean(r.is_pinned),
            isNew: new Date(r.created_at) > new Date(now.getTime() - 7 * 86400000),
            isImportant: Boolean(r.is_important),
            createdAt: String(r.created_at ?? '').slice(0, 10),
          })),
        )
        setIsDemo(false)
        return
      }

      // Secondary: API route
      const res = await fetch('/api/v1/notices')
      if (res.ok) {
        const { data: apiData } = await res.json()
        if (Array.isArray(apiData) && apiData.length > 0) {
          setNotices(apiData)
          setIsDemo(false)
          return
        }
      }

      // Fallback: sample data
      setNotices(SAMPLE_NOTICES)
      setIsDemo(true)
    } catch {
      setNotices(SAMPLE_NOTICES)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotices()
  }, [loadNotices])

  const filtered = notices.filter((n) => tab === 'ALL' || n.category === tab)
  const pinned = filtered.filter((n) => n.isPinned)
  const regular = filtered.filter((n) => !n.isPinned)
  const paginated = regular.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleTab(val: typeof tab) {
    setTab(val)
    setPage(1)
  }

  // Tab buttons rendered in the actions slot of the header
  const tabActions = (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {NOTICE_TABS.map((t) => {
        const active = tab === t.value
        return (
          <button
            key={t.value}
            onClick={() => handleTab(t.value)}
            style={{
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.02em',
              background: active ? MCK.ink : MCK.paper,
              color: active ? MCK.paper : MCK.textSub,
              border: `1px solid ${active ? MCK.ink : MCK.border}`,
              borderTop: active ? `2px solid ${MCK.brass}` : `1px solid ${MCK.border}`,
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <MckPageShell variant="tint">
      {isDemo && (
        <MckDemoBanner
          message="체험 모드 — 샘플 공지사항을 표시 중입니다. 로그인 후 실제 데이터로 전환됩니다."
          ctaLabel="로그인하기"
          ctaHref="/login"
        />
      )}

      <MckPageHeader
        breadcrumbs={[
          { label: '홈', href: '/' },
          { label: '공지/문의' },
          { label: '공지사항' },
        ]}
        eyebrow="ANNOUNCEMENTS · SERVICE UPDATES"
        title="공지사항"
        subtitle="NPLatform 의 서비스 공지 · 점검 안내 · 업데이트 소식을 한 곳에서 확인하세요."
        actions={tabActions}
      />

      {/* Pinned section */}
      {pinned.length > 0 && (
        <MckSection eyebrow="PINNED" title="고정 공지">
          <MckCard padding={0} accent={MCK.brass}>
            <div>
              {pinned.map((n, i) => (
                <NoticeRow key={n.id} notice={n} last={i === pinned.length - 1} />
              ))}
            </div>
          </MckCard>
        </MckSection>
      )}

      {/* Regular notices */}
      <MckSection
        eyebrow="ALL NOTICES"
        title="전체 공지"
        rightActions={
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: MCK.textMuted,
              letterSpacing: '0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            총 {regular.length}건
          </span>
        }
      >
        {regular.length === 0 ? (
          <MckEmptyState
            icon={Bell}
            title="공지사항이 없습니다"
            description="다른 탭을 확인해보거나 잠시 후 다시 시도해 주세요."
            variant="info"
          />
        ) : (
          <>
            <MckCard padding={0} accent={MCK.ink}>
              <div>
                {paginated.map((n, i) => (
                  <NoticeRow key={n.id} notice={n} last={i === paginated.length - 1} />
                ))}
              </div>
            </MckCard>
            <Pagination total={regular.length} page={page} onPage={setPage} />
          </>
        )}
      </MckSection>
    </MckPageShell>
  )
}
