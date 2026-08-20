'use client'

/**
 * IntakeList — 매각의뢰 접수 목록 (2026-08-19) · 운영기획서 v4 §3-2, §3-3
 *
 * 같은 컴포넌트를 두 메뉴가 공유한다. 다른 건 `mode` 하나뿐이다.
 *   mode=agency — 매물등록 대행관리 (파일만 온 건)
 *   mode=direct — 매각의뢰 관리 (회원이 세부내역을 채운 건)
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw, Inbox, FileText, ImageIcon, AlertCircle } from 'lucide-react'
import { IntakeWorkbench, type Intake } from '@/components/admin/intake-workbench'
import { MemberPane } from '@/components/admin/member-pane'
import { isPhoto } from '@/lib/listing-attachments'
import { missingRequired } from '@/lib/npl-detail-spec'

const ELECTRIC = '#2251FF'
const PAGE_SIZE = 20

const STATUSES = ['전체', '접수', '보완 필요', '등록완료'] as const

const statusStyle = (s: string) =>
  s === '등록완료' ? { fg: '#047857', bg: 'rgba(16,185,129,0.10)', bd: 'rgba(16,185,129,0.4)' }
  : s === '보완 필요' ? { fg: '#A53F00', bg: 'rgba(255,140,0,0.10)', bd: 'rgba(255,140,0,0.45)' }
  : { fg: '#1A47CC', bg: 'rgba(34,81,255,0.08)', bd: 'rgba(34,81,255,0.35)' }

export function IntakeList({
  mode,
  title,
  subtitle,
}: {
  mode: 'agency' | 'direct'
  title: string
  subtitle: string
}) {
  const [rows, setRows] = useState<Intake[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUSES)[number]>('전체')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<Intake | null>(null)
  const [memberTarget, setMemberTarget] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true); setError('')
    fetch(`/api/v1/listing-intakes?mode=${mode}`, { credentials: 'include' })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(
            r.status === 401 ? '로그인이 만료되었습니다. 다시 로그인해주세요.'
            : r.status === 403 ? '이 화면을 볼 권한이 없습니다. (운영관리자 전용)'
            : d?.error?.message ?? `접수 목록을 불러오지 못했습니다 (${r.status})`
          )
        }
        setRows(Array.isArray(d.data) ? d.data : [])
      })
      .catch(e => setError(e instanceof Error ? e.message : '알 수 없는 오류'))
      .finally(() => setLoading(false))
  }, [mode])
  useEffect(() => { load() }, [load])

  const counts = useMemo(() => {
    const c: Record<string, number> = { 전체: rows.length, 접수: 0, '보완 필요': 0, 등록완료: 0 }
    for (const r of rows) if (r.status in c) c[r.status] += 1
    return c
  }, [rows])

  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    let arr = rows
    if (statusFilter !== '전체') arr = arr.filter(r => r.status === statusFilter)
    if (q) {
      arr = arr.filter(r => [
        r.seller_label ?? '', r.seller_contact ?? '',
        String(r.detail?.collateral_address ?? ''), String(r.detail?.institution ?? ''), r.memo ?? '',
      ].join(' ').toLowerCase().includes(q))
    }
    return arr
  }, [rows, statusFilter, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div className="p-6 max-w-[1200px] space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <Inbox size={13} /> {title}
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            {title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{subtitle}</p>
        </div>
        <button onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
          style={{ background: 'transparent', cursor: 'pointer' }}>
          <RefreshCw size={12} /> 새로고침
        </button>
      </div>

      {/* 상태 요약 — 누르면 그 상태만 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: 'var(--color-border-subtle)' }}>
        {STATUSES.map(s => {
          const on = statusFilter === s
          const c = s === '전체' ? { fg: 'var(--color-text-primary)', bd: ELECTRIC } : statusStyle(s)
          return (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1) }}
              style={{
                background: on ? 'var(--color-surface-overlay)' : 'var(--color-surface-elevated)',
                borderTop: `2px solid ${on ? c.bd : 'transparent'}`,
                padding: '12px 14px', textAlign: 'left', border: 'none', cursor: 'pointer',
              }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 800, lineHeight: 1, color: c.fg, fontVariantNumeric: 'tabular-nums' }}>
                {counts[s] ?? 0}<span style={{ fontSize: 12, marginLeft: 2, color: 'var(--color-text-muted)' }}>건</span>
              </div>
              <div style={{ marginTop: 5, fontSize: 11.5, fontWeight: 700, color: on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>{s}</div>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="flex items-center gap-3 px-3 py-2.5 border" style={{ borderColor: 'rgba(225,29,72,0.4)', background: 'rgba(225,29,72,0.06)' }}>
          <span className="text-[12.5px] font-bold text-[#9F1239]">{error}</span>
          <button onClick={load} className="ml-auto px-2.5 py-1 text-[11px] font-bold border border-[var(--color-border-default)]"
            style={{ background: 'var(--color-surface-elevated)', cursor: 'pointer' }}>다시 시도</button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="매각 회원 · 기관 · 소재지 검색..."
          className="w-full max-w-sm px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]" />
        <span className="text-[11px] text-[var(--color-text-muted)]">{filtered.length}건 / 전체 {rows.length}건</span>
      </div>

      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-bold whitespace-nowrap">접수일</th>
              <th className="px-3 py-2 font-bold">매각 회원</th>
              <th className="px-3 py-2 font-bold">소재지 · 기관</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">자료</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">필수 항목</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">상태</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">처리</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</td></tr>
            )}
            {!loading && filtered.length === 0 && !error && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                    {statusFilter === '전체' ? '접수된 건이 없습니다' : `'${statusFilter}' 상태의 건이 없습니다`}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {mode === 'agency'
                      ? '매각 회원이 [등록 대행 요청]으로 파일을 올리면 이곳에 도착합니다.'
                      : '매각 회원이 [직접 등록]으로 세부내역을 제출하면 이곳에 도착합니다.'}
                  </p>
                </td>
              </tr>
            )}
            {paged.map(r => {
              const files = r.attachments ?? []
              const photos = files.filter(isPhoto).length
              const docs = files.length - photos
              const miss = missingRequired(r.detail ?? {})
              const st = statusStyle(r.status)
              return (
                <tr key={r.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] align-top">
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap text-[var(--color-text-secondary)]">
                    {String(r.created_at).slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 max-w-[180px]">
                    <button onClick={() => setMemberTarget(r.seller_id)}
                      className="block w-full text-left text-[12px] font-bold text-[#1A47CC] truncate hover:underline"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {r.seller_label || '매각 회원'}
                    </button>
                    <span className="block text-[10px] text-[var(--color-text-muted)] truncate">{r.seller_contact}</span>
                  </td>
                  <td className="px-3 py-2 max-w-[220px]">
                    <span className="block truncate text-[var(--color-text-primary)]">
                      {r.detail?.collateral_address || (r.memo ? r.memo.slice(0, 40) : '—')}
                    </span>
                    <span className="block text-[10.5px] text-[var(--color-text-muted)] truncate">
                      {r.detail?.institution || (r.mode === 'agency' ? '기관 미기재 — 파일 확인 필요' : '—')}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
                      <FileText size={11} /> {docs}
                      <ImageIcon size={11} className="ml-1.5" /> {photos}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {miss.length === 0 ? (
                      <span className="text-[11px] font-bold text-emerald-700">완비</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#A53F00]" title={miss.join(' · ')}>
                        <AlertCircle size={11} /> {miss.length}개 부족
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="inline-flex items-center justify-center px-2 h-[20px] text-[10.5px] font-extrabold border"
                      style={{ color: st.fg, background: st.bg, borderColor: st.bd }}>
                      {r.status}
                    </span>
                    {(r.revision_count ?? 0) > 0 && (
                      <span className="ml-1 text-[10px] text-[var(--color-text-muted)]">보완 {r.revision_count}회</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => setTarget(r)} disabled={r.status === '등록완료'}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold border"
                      style={{
                        background: r.status === '등록완료' ? 'transparent' : '#0A1628',
                        color: r.status === '등록완료' ? 'var(--color-text-muted)' : '#FFFFFF',
                        borderColor: r.status === '등록완료' ? 'var(--color-border-default)' : '#0A1628',
                        cursor: r.status === '등록완료' ? 'default' : 'pointer',
                      }}>
                      {r.status === '등록완료' ? '등록됨' : (mode === 'agency' ? '대행 처리' : '검토')}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
          <span>{filtered.length}건 중 {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              className="px-2 py-1 border border-[var(--color-border-default)] disabled:opacity-30"
              style={{ background: 'var(--color-surface-elevated)', cursor: 'pointer' }}>이전</button>
            <span className="px-2 font-bold text-[var(--color-text-primary)]">{safePage}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              className="px-2 py-1 border border-[var(--color-border-default)] disabled:opacity-30"
              style={{ background: 'var(--color-surface-elevated)', cursor: 'pointer' }}>다음</button>
          </div>
        </div>
      )}

      {target && (
        <IntakeWorkbench intake={target} onClose={() => setTarget(null)} onDone={() => { setTarget(null); load() }} />
      )}
      {memberTarget && <MemberPane userId={memberTarget} onClose={() => setMemberTarget(null)} />}
    </div>
  )
}
