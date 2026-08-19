'use client'

/**
 * /my/demands — 내 매입 조건 (2026-08-18 전면 교체)
 *
 * 서비스의 매입조건 등록(/exchange/demands/new)과 1:1 동일한 필드 구성.
 * 등록된 조건을 리스트로 보여주고 등록 · 수정 · 삭제가 바로 가능.
 * 저장소: /api/v1/exchange/demands (매입조건 등록 폼과 동일 API)
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react'

const ELECTRIC = '#2251FF'

type DemandRow = {
  id: string
  created: string
  demandType: string
  types: string[]
  regions: string[]
  landMin: number | null
  landMax: number | null
  bldgMin: number | null
  bldgMax: number | null
  amountMin: number | null
  amountMax: number | null
  priority: number | null
  memo: string
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : (v as number)
  return typeof n === 'number' && isFinite(n) && n > 0 ? n : null
}

const arr = (v: unknown): string[] => {
  if (Array.isArray(v)) return v.map(String)
  if (typeof v === 'string' && v) {
    try { const p = JSON.parse(v); if (Array.isArray(p)) return p.map(String) } catch { /* ignore */ }
    return v.split(',').map(s => s.trim()).filter(Boolean)
  }
  return []
}

const fmtRange = (min: number | null, max: number | null) => {
  if (min === null && max === null) return '—'
  const a = min !== null ? min.toLocaleString() : ''
  const b = max !== null ? max.toLocaleString() : ''
  if (min !== null && max !== null) return `${a}~${b}`
  if (min !== null) return `${a}~`
  return `~${b}`
}

const PAGE_SIZE = 20

export default function MyDemandsPage() {
  const [rows, setRows] = useState<DemandRow[]>([])
  // 조건별 자동매칭 결과 (2026-08-19) — 매입 회원 핵심 기능
  const [matchCount, setMatchCount] = useState<Record<string, number>>({})
  const [matchListings, setMatchListings] = useState<Record<string, Array<Record<string, unknown>>>>({})
  const [matchTarget, setMatchTarget] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/v1/matching/by-demand?mine=1', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const counts: Record<string, number> = {}
        const lists: Record<string, Array<Record<string, unknown>>> = {}
        for (const [id, v] of Object.entries(d?.data ?? {})) {
          const val = v as { count: number; listings: Array<Record<string, unknown>> }
          counts[id] = val.count
          lists[id] = val.listings ?? []
        }
        setMatchCount(counts); setMatchListings(lists)
      })
      .catch(() => {})
  }, [])
  const [loading, setLoading] = useState(true)
  // D0 공통 UI — 검색 + 페이지네이션
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = search.trim().toLowerCase()
  const filteredRows = q
    ? rows.filter(r => [r.demandType, r.types.join(' '), r.regions.join(' '), r.memo, r.created].join(' ').toLowerCase().includes(q))
    : rows
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const paged = filteredRows.slice((Math.min(page, totalPages) - 1) * PAGE_SIZE, Math.min(page, totalPages) * PAGE_SIZE)

  const load = () => {
    setLoading(true)
    fetch('/api/v1/exchange/demands?limit=100&mine=1', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const list: Array<Record<string, any>> = Array.isArray(d.data) ? d.data : []
        setRows(list.map(x => ({
          id: String(x.id ?? ''),
          created: x.created_at ? String(x.created_at).slice(0, 10) : '—',
          demandType: String(x.demand_type ?? '') === 'realestate' ? '부동산 급매' : 'NPL',
          types: arr(x.collateral_types),
          regions: arr(x.regions),
          landMin: num(x.land_area_min_m2),
          landMax: num(x.land_area_max_m2),
          bldgMin: num(x.building_area_min_m2),
          bldgMax: num(x.building_area_max_m2),
          amountMin: num(x.min_amount),
          amountMax: num(x.max_amount),
          priority: num(x.priority),
          memo: String(x.memo ?? '').replace(/\n?\[담당자\].*$/m, '').trim(),
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const remove = (id: string) => {
    if (!confirm('이 매입조건을 삭제할까요?')) return
    fetch(`/api/v1/exchange/demands/${encodeURIComponent(id)}`, { method: 'DELETE' })
      .then(() => setRows(prev => prev.filter(x => x.id !== id)))
      .catch(() => {})
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <ShoppingCart size={13} /> MY · 매입 조건
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            내 매입 조건
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            등록한 조건에 맞는 NPL 딜만 자동매칭되어 공개됩니다. 우선순위별로 여러 개 등록할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/exchange/demands/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold text-white"
            style={{ background: '#0A1628', borderTop: `2px solid ${ELECTRIC}`, textDecoration: 'none' }}>
            <Plus size={13} /> 매입조건 등록
          </Link>
          <button onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
            style={{ background: 'transparent', cursor: 'pointer' }}>
            <RefreshCw size={12} /> 새로고침
          </button>
        </div>
      </div>

      {/* D0 공통 UI — 검색 */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="유형 · 담보 · 지역 · 요청사항 검색..."
          className="w-full max-w-sm px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]"
        />
        <span className="text-[11px] text-[var(--color-text-muted)]">{filteredRows.length}건 / 전체 {rows.length}건</span>
      </div>

      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-bold whitespace-nowrap">등록일</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">우선순위</th>
              <th className="px-3 py-2 font-bold">담보유형</th>
              <th className="px-3 py-2 font-bold">지역</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">면적 토지/건물(㎡)</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">금액대(억)</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">자동매칭</th>
              <th className="px-3 py-2 font-bold">요청사항</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={10} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</td></tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-12 text-center">
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">등록된 매입조건이 없습니다</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">매입조건을 등록하시면 조건에 맞는 NPL 딜만 자동매칭됩니다.</p>
                  <Link href="/exchange/demands/new"
                    className="inline-flex items-center gap-1.5 mt-4 px-4 py-2.5 text-xs font-extrabold text-white"
                    style={{ background: '#0A1628', borderTop: `2px solid ${ELECTRIC}`, textDecoration: 'none' }}>
                    매입조건 등록하기
                  </Link>
                </td>
              </tr>
            )}
            {paged.map(r => (
              <tr key={r.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] transition-colors">
                <td className="px-3 py-2 tabular-nums whitespace-nowrap text-[var(--color-text-muted)]">{r.created}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.priority !== null ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 text-[11px] font-black text-white" style={{ background: '#0A1628' }}>
                      {r.priority}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-3 py-2 text-[var(--color-text-primary)]"><span className="block max-w-[130px] truncate" title={r.types.join(' · ')}>{r.types.length ? r.types.join(' · ') : '—'}</span></td>
                <td className="px-3 py-2 text-[var(--color-text-primary)]"><span className="block max-w-[110px] truncate" title={r.regions.join(' · ')}>{r.regions.length ? r.regions.join(' · ') : '—'}</span></td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap">{fmtRange(r.landMin, r.landMax)}</td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap">{fmtRange(r.bldgMin, r.bldgMax)}</td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap font-bold text-[var(--color-text-primary)]">{fmtRange(r.amountMin, r.amountMax)}</td>
                {/* 자동매칭 — 이 조건에 맞는 매물 수 → 클릭 시 해당 매물만 보기 (2026-08-19) */}
                <td className="px-3 py-2 whitespace-nowrap">
                  {matchCount[r.id] === undefined ? (
                    <span className="text-[11px] text-[var(--color-text-muted)]">대조 중…</span>
                  ) : matchCount[r.id] === 0 ? (
                    <span className="text-[11px] text-[var(--color-text-muted)]">매칭 0건</span>
                  ) : (
                    <button
                      onClick={() => setMatchTarget(r.id)}
                      className="inline-flex items-baseline gap-1 hover:underline"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      title="매칭된 매물 보기"
                    >
                      <b className="text-[15px] tabular-nums" style={{ color: '#1A47CC' }}>{matchCount[r.id]}</b>
                      <span className="text-[11px] text-[var(--color-text-muted)]">건 보기</span>
                    </button>
                  )}
                </td>
                <td className="px-3 py-2 max-w-[200px] text-[var(--color-text-secondary)]">
                  <span className="line-clamp-2">{r.memo || '—'}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/exchange/demands/${encodeURIComponent(r.id)}/edit`}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
                      style={{ textDecoration: 'none' }}
                    >
                      <Pencil size={11} /> 수정
                    </Link>
                    <button
                      onClick={() => remove(r.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-rose-300 text-rose-600"
                      style={{ background: 'transparent', cursor: 'pointer' }}
                    >
                      <Trash2 size={11} /> 삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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

      {/* 조건별 자동매칭 결과 패널 (2026-08-19) */}
      {matchTarget && (
        <div className="fixed inset-0 z-[300] flex justify-end" style={{ background: 'rgba(5,28,44,0.45)' }} onClick={() => setMatchTarget(null)}>
          <div className="h-full w-full md:w-[560px] md:max-w-[90vw] overflow-y-auto bg-[var(--color-surface-elevated)]"
            style={{ borderLeft: '3px solid #2251FF' }} onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: '#2251FF' }}>자동매칭 결과</div>
                <div className="text-[14px] font-black text-[var(--color-text-primary)]">
                  이 조건에 맞는 NPL {matchCount[matchTarget] ?? 0}건
                </div>
              </div>
              <button onClick={() => setMatchTarget(null)} aria-label="닫기"
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
            </div>
            <div className="p-3 space-y-1.5">
              {(matchListings[matchTarget] ?? []).length === 0 ? (
                <p className="py-8 text-center text-[12px] text-[var(--color-text-muted)]">매칭된 매물이 없습니다.</p>
              ) : (matchListings[matchTarget] ?? []).map((l, i) => {
                const eok = (v: unknown) => typeof v === 'number' && v > 0 ? `${(v / 100000000).toFixed(1)}억` : '—'
                return (
                  <Link key={String(l.id ?? i)} href={`/listing-detail/${encodeURIComponent(String(l.id))}?mode=view`}
                    className="block px-3 py-2 border border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]"
                    style={{ textDecoration: 'none' }}>
                    <div className="text-[12.5px] font-bold text-[var(--color-text-primary)] truncate">{String(l.title ?? '')}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)] tabular-nums">
                      <span>{String(l.region ?? '')}</span>
                      <span>채권 {eok(l.claim_amount)}</span>
                      <span>협의가 {eok(l.asking_price)}</span>
                    </div>
                  </Link>
                )
              })}
              <Link href="/exchange" className="block mt-2 px-3 py-2 text-center text-[12px] font-extrabold text-white"
                style={{ background: '#0A1628', borderTop: '2px solid #2251FF', textDecoration: 'none' }}>
                NPL 자동매칭 전체 보기
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
