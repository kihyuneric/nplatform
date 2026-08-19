'use client'

/**
 * /my/matches — 자동매칭 (매입 회원 · 2026-08-19)
 *
 * 매입 회원의 핵심 화면: **내 매입조건에 매칭된 NPL 매물 전체**를 한 곳에서 본다.
 *   - 조건이 여러 개면 매물별로 "어떤 조건에 걸렸는지" 표시
 *   - 매물 클릭 → 세부내역(NDA 승인 시 열람) / 관심 등록은 자동매칭 리스트에서
 * 데이터: /api/v1/matching/by-demand?mine=1 (지역·유형·금액대 실대조)
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, RefreshCw, ArrowRight, SlidersHorizontal } from 'lucide-react'

const ELECTRIC = '#2251FF'
const PAGE_SIZE = 20

type Listing = {
  id: string; title?: string; region?: string; collateral_type?: string
  claim_amount?: number; appraised_value?: number; asking_price?: number | null; created_at?: string
}
type DemandInfo = { id: string; label: string }

const eok = (v: unknown) => (typeof v === 'number' && v > 0 ? `${(v / 100000000).toFixed(1)}억` : '—')
const KO: Record<string, string> = {
  APARTMENT: '아파트', COMMERCIAL: '상가/통건물', LAND: '토지', FACTORY: '공장/지식산업센터',
  OFFICE: '오피스', VILLA: '다세대/빌라', OTHER: '기타',
}

export default function MyMatchesPage() {
  const [loading, setLoading] = useState(true)
  const [byDemand, setByDemand] = useState<Record<string, { count: number; listings: Listing[] }>>({})
  const [demands, setDemands] = useState<DemandInfo[]>([])
  const [filterDemand, setFilterDemand] = useState<string>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/matching/by-demand?mine=1', { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
      fetch('/api/v1/exchange/demands?limit=100&mine=1', { credentials: 'include' }).then(r => r.json()).catch(() => ({})),
    ]).then(([m, d]) => {
      setByDemand((m?.data ?? {}) as Record<string, { count: number; listings: Listing[] }>)
      const arr = (v: unknown): string[] => Array.isArray(v) ? v.map(String) : []
      setDemands((Array.isArray(d?.data) ? d.data : []).map((x: Record<string, unknown>) => ({
        id: String(x.id),
        label: [arr(x.regions).slice(0, 2).join('·') || '지역무관', arr(x.collateral_types).slice(0, 2).join('·') || '유형무관'].join(' / '),
      })))
    }).finally(() => setLoading(false))
  }
  useEffect(load, [])

  // 매물 단위로 합치고, 어떤 조건에 걸렸는지 함께 보관 (중복 제거)
  const rows = useMemo(() => {
    const map = new Map<string, { listing: Listing; demandIds: string[] }>()
    for (const [did, v] of Object.entries(byDemand)) {
      if (filterDemand !== 'ALL' && did !== filterDemand) continue
      for (const l of v.listings ?? []) {
        const cur = map.get(l.id)
        if (cur) cur.demandIds.push(did)
        else map.set(l.id, { listing: l, demandIds: [did] })
      }
    }
    let list = Array.from(map.values())
    const q = search.trim().toLowerCase()
    if (q) list = list.filter(r => [r.listing.title, r.listing.region, r.listing.collateral_type].join(' ').toLowerCase().includes(q))
    return list.sort((a, b) => String(b.listing.created_at ?? '').localeCompare(String(a.listing.created_at ?? '')))
  }, [byDemand, filterDemand, search])

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const demandLabel = (id: string) => demands.find(d => d.id === id)?.label ?? '조건'

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <Search size={13} /> MY · 자동매칭
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            자동매칭
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            등록한 매입조건(지역 · 유형 · 금액대)에 맞는 NPL 매물입니다. 조건을 수정하면 매칭 결과도 즉시 바뀝니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/exchange" className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold text-white"
            style={{ background: '#0A1628', borderTop: `2px solid ${ELECTRIC}`, textDecoration: 'none' }}>
            전체 리스트 <ArrowRight size={13} />
          </Link>
          <button onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
            style={{ background: 'transparent', cursor: 'pointer' }}>
            <RefreshCw size={12} /> 새로고침
          </button>
        </div>
      </div>

      {/* 요약 + 필터 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="px-4 py-2.5" style={{ background: '#0A1628', borderTop: `3px solid ${ELECTRIC}` }}>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.12em]" style={{ color: '#00A9F4' }}>매칭 매물</span>
          <span className="ml-2 text-sm font-extrabold tabular-nums" style={{ color: '#FFFFFF' }}>{rows.length}건</span>
        </div>
        <select value={filterDemand} onChange={e => { setFilterDemand(e.target.value); setPage(1) }}
          className="px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
          style={{ cursor: 'pointer' }}>
          <option value="ALL">전체 조건 ({demands.length}개)</option>
          {demands.map(d => <option key={d.id} value={d.id}>{d.label} — {byDemand[d.id]?.count ?? 0}건</option>)}
        </select>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="매물명 · 지역 · 유형 검색..."
          className="w-full max-w-xs px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]" />
        <Link href="/my/demands" className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#1A47CC]" style={{ textDecoration: 'none' }}>
          <SlidersHorizontal size={12} /> 매입조건 관리
        </Link>
      </div>

      {/* 매칭 매물 표 */}
      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-bold">매물명 · 지역</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">유형</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">감정가</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">채권액</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">협의가</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">매칭 조건</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">등록일</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">매칭 결과를 불러오는 중...</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-12 text-center">
                <Search size={22} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
                <p className="text-sm font-bold text-[var(--color-text-primary)]">매칭된 매물이 없습니다</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">매입조건(지역 · 유형 · 금액대)을 넓히면 더 많은 딜이 매칭됩니다.</p>
                <Link href="/exchange/demands/new" className="inline-block mt-3 px-4 py-2 text-xs font-extrabold text-white"
                  style={{ background: '#0A1628', borderTop: `2px solid ${ELECTRIC}`, textDecoration: 'none' }}>매입조건 등록·수정</Link>
              </td></tr>
            )}
            {paged.map(({ listing: l, demandIds }) => (
              <tr key={l.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] transition-colors">
                <td className="px-3 py-2">
                  <Link href={`/listing-detail/${encodeURIComponent(l.id)}?mode=view`}
                    className="block max-w-[240px] font-semibold text-[#1A47CC] truncate hover:underline" style={{ textDecoration: 'none' }}>
                    {l.title ?? '매물'}
                  </Link>
                  <span className="block text-[11px] text-[var(--color-text-muted)] truncate">{l.region ?? ''}</span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{KO[String(l.collateral_type ?? '').toUpperCase()] ?? l.collateral_type ?? '—'}</td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap">{eok(l.appraised_value)}</td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap">{eok(l.claim_amount)}</td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap font-bold" style={{ color: '#1A47CC' }}>{eok(l.asking_price ?? undefined)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-[10.5px] text-[var(--color-text-muted)]" title={demandIds.map(demandLabel).join(' / ')}>
                    {demandIds.length > 1 ? `조건 ${demandIds.length}개 일치` : demandLabel(demandIds[0])}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap text-[var(--color-text-muted)]">{String(l.created_at ?? '').slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[var(--color-text-muted)]">{safePage} / {totalPages} 페이지 · 전체 {rows.length}건</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              className="px-3 py-1.5 font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)] disabled:opacity-30"
              style={{ background: 'transparent', cursor: 'pointer' }}>이전</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              className="px-3 py-1.5 font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)] disabled:opacity-30"
              style={{ background: 'transparent', cursor: 'pointer' }}>다음</button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]">
        ※ 세부내역(전체 주소 · 채권 상세 · 서류)은 NDA 승인 후 열람할 수 있습니다. 채권기관 · 담당자 정보는 공개되지 않습니다.
      </p>
    </div>
  )
}
