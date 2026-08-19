'use client'

/**
 * /my/portfolio — 관심매물 (2026-08-18 전면 교체)
 *
 * NPL 자동매칭 리스트에서 ♥ 관심 등록한 매물 리스트.
 * 저장소: localStorage 'npl_favorites' (자동매칭 페이지와 동일 키) + 실매물 데이터 대조.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, ArrowRight, RefreshCw, Trash2 } from 'lucide-react'

const ELECTRIC = '#2251FF'

type FavRow = {
  id: string
  region: string
  address: string
  collateral: string
  appraisal: number
  principal: number
  asking: number
  created: string
}

const fmtEok = (v: number) => (v > 0 ? `${(v / 100000000).toFixed(1)}억` : '—')

const PAGE_SIZE = 20

export default function PortfolioPage() {
  const [favIds, setFavIds] = useState<string[]>([])
  const [rows, setRows] = useState<FavRow[]>([])
  const [loading, setLoading] = useState(true)
  // D0 공통 UI — 검색 + 페이지네이션
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = search.trim().toLowerCase()
  const filteredRows = q
    ? rows.filter(r => [r.region, r.address, r.collateral, r.created].join(' ').toLowerCase().includes(q))
    : rows
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const paged = filteredRows.slice((Math.min(page, totalPages) - 1) * PAGE_SIZE, Math.min(page, totalPages) * PAGE_SIZE)

  const load = () => {
    setLoading(true)
    let ids: string[] = []
    try { ids = JSON.parse(localStorage.getItem('npl_favorites') || '[]') } catch { /* ignore */ }
    setFavIds(ids)
    if (ids.length === 0) { setRows([]); setLoading(false); return }
    fetch('/api/v1/exchange/listings?limit=200', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const list: Array<Record<string, any>> = Array.isArray(d.data) ? d.data : []
        const byId = new Map(list.map(x => [String(x.id), x]))
        setRows(ids.filter(id => byId.has(id)).map(id => {
          const x = byId.get(id)!
          // 담보유형 영문 enum → 한글 라벨
          const KO: Record<string, string> = {
            APARTMENT: '아파트', COMMERCIAL: '상가/통건물', LAND: '토지', FACTORY: '공장/지식산업센터',
            OFFICE: '오피스', VILLA: '다세대/빌라', OTHER: '기타',
          }
          const region = [x.sido, x.sigungu].filter(Boolean).join(' ') || '—'
          const addr = String(x.address_masked ?? '') || [x.sido, x.sigungu, x.dong].filter(Boolean).join(' ') || String(x.address ?? '—')
          return {
            id,
            region,
            // 지역과 동일한 주소는 중복 표기 생략
            address: addr === region ? '' : addr,
            collateral: KO[String(x.collateral_type ?? '').toUpperCase()] ?? String(x.collateral_type ?? '—'),
            appraisal: Number(x.appraised_value ?? x.appraisal_value ?? 0),
            principal: Number(x.outstanding_principal ?? x.principal_amount ?? x.claim_amount ?? 0),
            asking: Number(x.asking_price ?? x.proposed_sale_price ?? x.minimum_bid ?? 0),
            created: x.created_at ? String(x.created_at).slice(0, 10) : '—',
          }
        }))
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const remove = (id: string) => {
    const next = favIds.filter(x => x !== id)
    setFavIds(next)
    setRows(prev => prev.filter(r => r.id !== id))
    try { localStorage.setItem('npl_favorites', JSON.stringify(next)) } catch { /* ignore */ }
    // 관심 카운터 감소 — 운영사·매각사 대시보드 집계 연동
    fetch('/api/v1/listing-marketing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: id, type: 'interest_remove' }),
    }).catch(() => {})
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <Heart size={13} /> MY · 관심매물
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            관심매물
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            NPL 자동매칭 리스트에서 ♥ 관심 등록한 매물입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/exchange"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold text-white"
            style={{ background: '#0A1628', borderTop: `2px solid ${ELECTRIC}`, textDecoration: 'none' }}>
            NPL 자동매칭 <ArrowRight size={13} />
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
          placeholder="지역 · 주소 · 유형 검색..."
          className="w-full max-w-sm px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]"
        />
        <span className="text-[11px] text-[var(--color-text-muted)]">{filteredRows.length}건 / 전체 {rows.length}건</span>
      </div>

      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-bold">지역 · 주소</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">유형</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">감정가</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">총 채권액</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">협의가</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">등록일</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</td></tr>
            )}
            {!loading && filteredRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <Heart size={22} className="mx-auto mb-2 text-[var(--color-text-muted)]" />
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">관심 등록한 매물이 없습니다</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">NPL 자동매칭 리스트에서 ♥ 를 눌러 관심 매물을 등록하세요.</p>
                </td>
              </tr>
            )}
            {paged.map(r => (
              <tr key={r.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] transition-colors">
                <td className="px-3 py-2 min-w-[160px]">
                  <div className="font-semibold text-[var(--color-text-primary)]">{r.region}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{r.address}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.collateral}</td>
                <td className="px-3 py-2 tabular-nums font-semibold whitespace-nowrap">{fmtEok(r.appraisal)}</td>
                <td className="px-3 py-2 tabular-nums font-semibold whitespace-nowrap">{fmtEok(r.principal)}</td>
                <td className="px-3 py-2 tabular-nums font-extrabold whitespace-nowrap" style={{ color: '#1A47CC' }}>{fmtEok(r.asking)}</td>
                <td className="px-3 py-2 tabular-nums whitespace-nowrap text-[var(--color-text-muted)]">{r.created}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Link href="/exchange" className="text-[11px] font-bold text-[#2251FF]" style={{ textDecoration: 'none' }}>
                      리스트에서 보기
                    </Link>
                    <button
                      onClick={() => remove(r.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-rose-300 text-rose-600"
                      style={{ background: 'transparent', cursor: 'pointer' }}
                    >
                      <Trash2 size={11} /> 해제
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
    </div>
  )
}
