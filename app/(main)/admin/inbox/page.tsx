'use client'

/**
 * /admin/inbox — 접수함 (2026-08-17 신설)
 *
 * 서비스 기능 ↔ 관리자 1:1 매칭:
 *   - NPL 매각의뢰 폼 접수 ([매각의뢰] 티켓)
 *   - 1:1 문의 접수 ([1:1 문의] 티켓)
 * 상태를 클릭으로 변경 (접수 → 처리중 → 완료) — /api/v1/support PATCH(update_status) 실연동.
 */

import { useEffect, useState } from 'react'
import { Inbox, RefreshCw, ChevronDown } from 'lucide-react'

const ELECTRIC = '#2251FF'

type Ticket = {
  id: string
  title: string
  description: string
  status: string
  created: string
  kind: '매각의뢰' | '1:1 문의' | '기타'
}

const STATUS_FLOW: { key: string; label: string }[] = [
  { key: 'OPEN', label: '접수' },
  { key: 'IN_PROGRESS', label: '처리중' },
  { key: 'RESOLVED', label: '완료' },
]
const statusLabel = (s: string) => STATUS_FLOW.find(x => x.key === s)?.label ?? s

export default function AdminInboxPage() {
  const [rows, setRows] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'all' | '매각의뢰' | '1:1 문의'>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch('/api/v1/support?page_size=100')
      .then(r => r.json())
      .then(d => {
        const list: Array<Record<string, any>> = Array.isArray(d.data) ? d.data : []
        setRows(list.map(t => {
          const title = String(t.title ?? '')
          const kind: Ticket['kind'] = title.startsWith('[매각의뢰]') ? '매각의뢰'
            : title.startsWith('[1:1 문의]') ? '1:1 문의' : '기타'
          return {
            id: String(t.id),
            title: title.replace(/^\[(매각의뢰|1:1 문의)\]\s*/, ''),
            description: String(t.description ?? ''),
            status: String(t.status ?? 'OPEN'),
            created: t.created_at ? String(t.created_at).slice(0, 10) : '—',
            kind,
          }
        }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const setStatus = async (id: string, status: string) => {
    setSavingId(id)
    setRows(prev => prev.map(r => (r.id === id ? { ...r, status } : r)))   // 낙관적
    try {
      await fetch('/api/v1/support', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: id, action: 'update_status', status }),
      })
    } finally {
      setSavingId(null)
    }
  }

  // D0 공통 UI — 검색 + 페이지네이션 (20건/페이지)
  const PAGE_SIZE = 20
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = search.trim().toLowerCase()
  const byTab = rows.filter(r => tab === 'all' || r.kind === tab)
  const filteredRows = q
    ? byTab.filter(r => JSON.stringify(r).toLowerCase().includes(q))
    : byTab
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const visible = filteredRows.slice((Math.min(page, totalPages) - 1) * PAGE_SIZE, Math.min(page, totalPages) * PAGE_SIZE)

  return (
    <div className="p-6 max-w-[1000px] space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <Inbox size={13} /> 접수함
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            매각의뢰 · 1:1 문의 접수함
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            매각의뢰 폼과 1:1 문의가 실시간으로 도착합니다. 상태를 눌러 접수 → 처리중 → 완료로 관리하세요.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
          style={{ background: 'transparent', cursor: 'pointer' }}
        >
          <RefreshCw size={12} /> 새로고침
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-[var(--color-border-subtle)]">
        {([['all', `전체 (${rows.length})`], ['매각의뢰', `매각의뢰 (${rows.filter(r => r.kind === '매각의뢰').length})`], ['1:1 문의', `1:1 문의 (${rows.filter(r => r.kind === '1:1 문의').length})`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className="px-4 py-2.5 text-[13px] font-bold"
            style={{
              color: tab === key ? '#0A1628' : 'var(--color-text-muted)',
              borderBottom: tab === key ? `2px solid ${ELECTRIC}` : '2px solid transparent',
              marginBottom: -1, background: 'transparent', border: 'none',
              borderBottomWidth: 2, borderBottomStyle: 'solid',
              borderBottomColor: tab === key ? ELECTRIC : 'transparent',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* D0 공통 UI — 검색 */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="제목 · 내용 · 연락처 · 상태 검색..."
          className="w-full max-w-sm px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]"
        />
        <span className="text-[11px] text-[var(--color-text-muted)]">{filteredRows.length}건 / 전체 {byTab.length}건</span>
      </div>

      {/* 리스트 */}
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] divide-y divide-[var(--color-border-subtle)]">
        {loading && <p className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</p>}
        {!loading && visible.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-[var(--color-text-secondary)]">접수된 건이 없습니다</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">매각의뢰·1:1 문의가 접수되면 이곳에 표시됩니다.</p>
          </div>
        )}
        {visible.map(t => (
          <div key={t.id}>
            <button
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <span
                className="flex-shrink-0 px-2 py-0.5 text-[10px] font-extrabold"
                style={{
                  background: t.kind === '매각의뢰' ? '#0A1628' : 'rgba(34, 81, 255, 0.10)',
                  color: t.kind === '매각의뢰' ? '#FFFFFF' : '#1A47CC',
                }}
              >
                {t.kind}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold text-[var(--color-text-primary)] truncate">{t.title || '(제목 없음)'}</span>
                <span className="block text-[11px] text-[var(--color-text-muted)] tabular-nums">{t.created}</span>
              </span>
              {/* 상태 버튼 그룹 */}
              <span className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                {STATUS_FLOW.map(s => (
                  <button
                    key={s.key}
                    onClick={() => void setStatus(t.id, s.key)}
                    disabled={savingId === t.id}
                    className="px-2 py-1 text-[10.5px] font-bold"
                    style={{
                      background: t.status === s.key ? '#0A1628' : 'transparent',
                      color: t.status === s.key ? '#FFFFFF' : 'var(--color-text-secondary)',
                      border: '1px solid var(--color-border-default)',
                      borderTop: t.status === s.key ? `2px solid ${ELECTRIC}` : undefined,
                      cursor: 'pointer',
                      opacity: savingId === t.id ? 0.6 : 1,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </span>
              <ChevronDown size={14} style={{ flexShrink: 0, transform: expanded === t.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: 'var(--color-text-muted)' }} />
            </button>
            {expanded === t.id && (
              <div className="px-4 pb-4 pt-2 text-[12.5px] leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-wrap border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)]">
                {t.description || '내용 없음'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* D0 공통 UI — 페이지네이션 (20건/페이지) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[var(--color-text-muted)]">{page} / {totalPages} 페이지</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)] disabled:opacity-30"
              style={{ background: 'transparent', cursor: 'pointer' }}>이전</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)] disabled:opacity-30"
              style={{ background: 'transparent', cursor: 'pointer' }}>다음</button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]">
        ※ 현재 상태: {rows.filter(r => r.status === 'OPEN').length}건 접수 대기 · {rows.filter(r => r.status === 'IN_PROGRESS').length}건 처리중 · {rows.filter(r => r.status === 'RESOLVED').length}건 완료 ({statusLabel('OPEN')} 기준)
      </p>
    </div>
  )
}
