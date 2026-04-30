"use client"

/**
 * /my/inbox — 통합 알림센터 (Phase G7+ 2026-04-29)
 *
 * 사용자 정책:
 *   "알림 / 공지사항 / 문의내역은 하나로 합쳐야하지 않을까? 너무 복잡해"
 *
 * 단일 페이지 + 3-탭:
 *   · 알림  (notifications 테이블 — 시스템·거래 이벤트)
 *   · 공지  (community_posts type=NOTICE — 운영팀 공지)
 *   · 문의  (1:1 문의 + 답변 thread)
 *
 * URL: /my/inbox?tab=alerts|notices|inquiries (default: alerts)
 *
 * 헤더 종 아이콘 → /my/inbox 진입 + unread 카운터 통합.
 */

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Bell, Megaphone, MessageCircle, ChevronRight,
  CheckCircle2, Clock, Search,
} from "lucide-react"
import { MckPageShell, MckPageHeader, MckTabBar, MckEmptyState } from "@/components/mck"
import { MCK, MCK_FONTS } from "@/lib/mck-design"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { INBOX_TABS, type InboxTabKey } from "@/lib/my-nav"

// ─── 데이터 타입 ────────────────────────────────────────────
interface AlertRow {
  id: string
  type?: string | null
  title: string
  message: string
  is_read: boolean
  created_at: string
  link?: string | null
}
interface NoticeRow {
  id: string
  title: string
  content: string
  created_at: string
  pinned?: boolean
}
interface InquiryRow {
  id: string
  category: string
  title: string
  body: string
  status: 'OPEN' | 'ANSWERED' | 'CLOSED'
  created_at: string
  answered_at?: string | null
  answer_body?: string | null
}

// ─── 헬퍼 ──────────────────────────────────────────────────
function relativeTime(s: string) {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60_000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d}일 전` : new Date(s).toLocaleDateString('ko-KR')
}

// ─── 알림 탭 ────────────────────────────────────────────────
function AlertsView() {
  const { user } = useAuth()
  const [items, setItems] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('notifications')
          .select('id, type, title, message, is_read, created_at, link')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100)
        if (!cancelled && Array.isArray(data)) setItems(data as AlertRow[])
      } catch (e) {
        console.warn('[inbox/alerts] fetch failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  async function markAllRead() {
    if (!user) return
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    setItems(items.map((i) => ({ ...i, is_read: true })))
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: MCK.textSub }}>로딩 중…</div>
  }
  if (items.length === 0) {
    return (
      <MckEmptyState
        icon={Bell}
        title="새 알림이 없습니다"
        description="거래·매물·공지 알림이 도착하면 여기에 표시됩니다"
      />
    )
  }
  const unreadCount = items.filter((i) => !i.is_read).length
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: MCK.textSub }}>
          미확인 <strong style={{ color: MCK.ink }}>{unreadCount}</strong> 건 / 총 {items.length} 건
        </span>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            style={{
              fontSize: 12, fontWeight: 600, color: MCK.electric,
              padding: '6px 12px', border: `1px solid ${MCK.electric}`,
              borderRadius: 4, background: 'transparent', cursor: 'pointer',
            }}
          >
            모두 읽음 처리
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.link ?? '#'}
            style={{
              padding: 16,
              background: item.is_read ? MCK.paper : MCK.paperTint,
              border: `1px solid ${item.is_read ? MCK.border : MCK.electric}`,
              borderLeftWidth: item.is_read ? 1 : 4,
              borderRadius: 4,
              textDecoration: 'none',
              display: 'block',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: MCK.ink, marginBottom: 4 }}>
                  {item.title}
                </div>
                <div style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.5 }}>
                  {item.message}
                </div>
              </div>
              <div style={{ fontSize: 11, color: MCK.textMuted, whiteSpace: 'nowrap' }}>
                {relativeTime(item.created_at)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── 공지 탭 ────────────────────────────────────────────────
function NoticesView() {
  const [items, setItems] = useState<NoticeRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('community_posts')
          .select('id, title, content, created_at, pinned')
          .eq('type', 'NOTICE')
          .order('pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100)
        if (!cancelled && Array.isArray(data)) setItems(data as NoticeRow[])
      } catch (e) {
        console.warn('[inbox/notices] fetch failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: MCK.textSub }}>로딩 중…</div>
  }
  if (items.length === 0) {
    return (
      <MckEmptyState
        icon={Megaphone}
        title="새 공지가 없습니다"
        description="운영팀 공지·정책 변경 안내가 여기에 표시됩니다"
      />
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((n) => (
        <article
          key={n.id}
          style={{
            padding: 16,
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderRadius: 4,
            borderLeftWidth: n.pinned ? 4 : 1,
            borderLeftColor: n.pinned ? MCK.brass : MCK.border,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 700, color: MCK.ink }}>
              {n.pinned && <span style={{ color: MCK.brass, marginRight: 6 }}>📌</span>}
              {n.title}
            </h3>
            <span style={{ fontSize: 11, color: MCK.textMuted, whiteSpace: 'nowrap' }}>
              {new Date(n.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
            {n.content}
          </p>
        </article>
      ))}
    </div>
  )
}

// ─── 문의 탭 ────────────────────────────────────────────────
function InquiriesView() {
  const { user } = useAuth()
  const [items, setItems] = useState<InquiryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        // complaints 테이블 또는 inquiries 테이블 — 여기서는 complaints 사용 (현재 schema)
        const { data } = await supabase
          .from('complaints')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
        if (!cancelled && Array.isArray(data)) {
          setItems(data.map((c: Record<string, unknown>) => ({
            id: String(c.id),
            category: String(c.category ?? 'OTHER'),
            title: String(c.subject ?? c.title ?? '(제목 없음)'),
            body: String(c.description ?? c.body ?? ''),
            status: (c.status as InquiryRow['status']) ?? 'OPEN',
            created_at: String(c.created_at),
            answered_at: c.answered_at as string | null,
            answer_body: c.answer_body as string | null,
          })))
        }
      } catch (e) {
        console.warn('[inbox/inquiries] fetch failed:', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: MCK.textSub }}>로딩 중…</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: MCK.textSub }}>
          총 {items.length} 건
        </span>
        <Link
          href="/support#new-inquiry"
          style={{
            fontSize: 12, fontWeight: 600, color: MCK.paper, background: MCK.electric,
            padding: '8px 14px', borderRadius: 4, textDecoration: 'none',
          }}
        >
          + 새 문의
        </Link>
      </div>
      {items.length === 0 ? (
        <MckEmptyState
          icon={MessageCircle}
          title="문의 내역이 없습니다"
          description="궁금한 점은 위 [+ 새 문의] 버튼으로 접수해주세요"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((inq) => {
            const isOpen = expandedId === inq.id
            const Icon = inq.status === 'ANSWERED' ? CheckCircle2 : Clock
            return (
              <div
                key={inq.id}
                style={{
                  background: MCK.paper,
                  border: `1px solid ${MCK.border}`,
                  borderRadius: 4,
                }}
              >
                <button
                  onClick={() => setExpandedId(isOpen ? null : inq.id)}
                  style={{
                    width: '100%', padding: 16, background: 'transparent', border: 0,
                    textAlign: 'left', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Icon size={14} style={{ color: inq.status === 'ANSWERED' ? MCK.electric : MCK.brass }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: MCK.textSub, letterSpacing: '0.05em' }}>
                          {inq.category}
                        </span>
                      </div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: MCK.ink }}>{inq.title}</h4>
                    </div>
                    <span style={{ fontSize: 11, color: MCK.textMuted, whiteSpace: 'nowrap' }}>
                      {relativeTime(inq.created_at)}
                    </span>
                  </div>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${MCK.border}` }}>
                    <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.6, marginTop: 12 }}>
                      {inq.body}
                    </p>
                    {inq.answer_body && (
                      <div
                        style={{
                          marginTop: 12, padding: 12,
                          background: MCK.paperTint, borderLeft: `3px solid ${MCK.electric}`,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, color: MCK.electric, marginBottom: 4 }}>
                          운영팀 답변
                        </div>
                        <p style={{ fontSize: 13, color: MCK.ink, lineHeight: 1.6 }}>
                          {inq.answer_body}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── 메인 페이지 ───────────────────────────────────────────
function InboxContent() {
  const params = useSearchParams()
  const router = useRouter()
  const tab = (params?.get('tab') as InboxTabKey) ?? 'alerts'

  const tabItems = useMemo(
    () => INBOX_TABS.map((t) => ({
      id: t.key,
      label: t.label,
      icon: t.key === 'alerts' ? <Bell size={14} />
        : t.key === 'notices' ? <Megaphone size={14} />
        : <MessageCircle size={14} />,
    })),
    [],
  )

  return (
    <MckPageShell variant="white">
      <MckPageHeader
        eyebrow="MY · INBOX"
        title="알림센터"
        subtitle="알림 · 공지 · 문의 — 한 곳에서 확인"
        breadcrumbs={[
          { label: '마이', href: '/my' },
          { label: '알림센터' },
        ]}
      />
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 24px 48px' }}>
        <MckTabBar
          tabs={tabItems}
          active={tab}
          onChange={(v) => router.push(`/my/inbox?tab=${v}`)}
          notSticky
        />
        <div style={{ marginTop: 24 }}>
          {tab === 'alerts' && <AlertsView />}
          {tab === 'notices' && <NoticesView />}
          {tab === 'inquiries' && <InquiriesView />}
        </div>
      </div>
    </MckPageShell>
  )
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>로딩 중…</div>}>
      <InboxContent />
    </Suspense>
  )
}
