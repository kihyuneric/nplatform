'use client'

/**
 * /admin/agreements — NDA · 계약 (2026-08-19 · NDA 요청 중심으로 재편)
 *
 * 무엇이 바뀌었나:
 *   기존에는 **매물 1건 = 1행**이라, 한 매물에 여러 매입 회원이 붙으면
 *   누가 어디까지 진행됐는지 구분할 수 없었다.
 *   이제 **NDA 요청 1건 = 1행**이다.
 *
 * 구성
 *   - 상단: 상태별 건수 (전체 · 운영사 검토 · 승인 · 거절) — 누르면 그 상태로 필터
 *   - 검색: 관리번호 · 요청 회원 · 매각 회원 · 서명자
 *   - 각 행: 상태 변경 · 딜 진행 단계(요청 건별) · 체결 문서 열람
 *
 * 딜 진행 단계는 NDA 요청 건별로 저장한다(nda_requests[].deal_stage).
 * 매각의뢰 현황에는 그 매물에서 **가장 앞선 단계**가 요약 표시된다.
 */

import { useEffect, useMemo, useState } from 'react'
import { FileSignature, RefreshCw, CheckCircle2, FileText } from 'lucide-react'
import {
  DEAL_STAGES, NDA_REQUEST_STATUSES,
  type ListingMarketing, type NdaRequest,
} from '@/lib/marketing-checklist'
import { MemberPane } from '@/components/admin/member-pane'
import { ReactionsPane } from '@/components/admin/reactions-pane'
import { buildListingNoMap } from '@/lib/listing-no'
import { MemberFilterBar, useMemberFilter } from '@/components/admin/member-filter-bar'
import { NdaDocumentPane, type NdaDocument } from '@/components/nda/nda-document-pane'
import { SEGMENT } from '@/lib/design-system'

const ELECTRIC = '#2251FF'
const PAGE_SIZE = 20

/** 매물 정보 (요청 행에 붙는 컨텍스트) */
type ListingInfo = {
  id: string
  no: string
  region: string
  collateral: string
  sellerId?: string | null
  sellerName?: string
}

/** 화면의 기본 단위 — NDA 요청 1건 */
type NdaRow = {
  key: string          // listingId + requestId
  listing: ListingInfo
  req: NdaRequest
}

const statusColor = (s: string) =>
  s === '승인' ? { fg: '#047857', bd: 'rgba(16,185,129,0.45)', bg: 'rgba(16,185,129,0.08)' }
  : s === '거절' ? { fg: '#9F1239', bd: 'rgba(225,29,72,0.45)', bg: 'rgba(225,29,72,0.07)' }
  : { fg: '#A53F00', bd: 'rgba(255,140,0,0.45)', bg: 'rgba(255,140,0,0.08)' }

export default function AdminAgreementsPage() {
  const [listings, setListings] = useState<ListingInfo[]>([])
  const [mk, setMk] = useState<Record<string, ListingMarketing>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'전체' | '운영사 검토' | '승인' | '거절'>('전체')
  const [page, setPage] = useState(1)

  const memberFilter = useMemberFilter()
  const [memberTarget, setMemberTarget] = useState<string | null>(null)
  const [reactionTarget, setReactionTarget] = useState<string | null>(null)
  const [ndaDoc, setNdaDoc] = useState<NdaDocument | null>(null)

  const openNdaDoc = async (requestId: string) => {
    try {
      const r = await fetch(`/api/v1/nda/documents?request=${encodeURIComponent(requestId)}`, { credentials: 'include' })
      const d = await r.json()
      const doc = Array.isArray(d?.data) ? d.data[0] : null
      if (!doc) {
        alert('이 요청의 체결 문서가 없습니다.\n(문서 보관 기능 도입 이전에 접수된 건일 수 있습니다)')
        return
      }
      setNdaDoc(doc as NdaDocument)
    } catch {
      alert('NDA 문서를 불러오지 못했습니다.')
    }
  }

  const load = () => {
    setLoading(true)
    setLoadError('')
    const getJson = async (url: string) => {
      const r = await fetch(url, { credentials: 'include' })
      if (!r.ok) {
        throw new Error(
          r.status === 401 ? '로그인이 만료되었습니다. 다시 로그인해주세요.'
          : r.status === 403 ? '이 화면을 볼 권한이 없습니다. (운영관리자 전용)'
          : `데이터를 불러오지 못했습니다 (${r.status})`
        )
      }
      return r.json()
    }
    Promise.all([
      getJson('/api/v1/exchange/listings?limit=200&status=ACTIVE'),
      getJson('/api/v1/listing-marketing'),
    ]).then(([ld, md]) => {
      const list: Array<Record<string, any>> = Array.isArray(ld.data) ? ld.data : []
      const noMap = buildListingNoMap(list.map(x => ({ id: String(x.id), listing_no: x.listing_no, created_at: x.created_at })))
      setListings(list.map(x => ({
        id: String(x.id),
        no: noMap[String(x.id)] ?? '—',
        region: [x.sido, x.sigungu].filter(Boolean).join(' ') || String(x.address ?? '').split(/\s+/).slice(0, 2).join(' ') || '—',
        collateral: String(x.collateral_type ?? '—'),
        sellerId: (x.seller_id as string) ?? null,
        sellerName: (x.seller_name as string) || '(미연결)',
      })))
      if (md?.data) setMk(md.data)
    }).catch((e: Error) => setLoadError(e.message || '알 수 없는 오류'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // 매물 → NDA 요청 행으로 펼치기 (최신 요청 먼저)
  const allRows: NdaRow[] = useMemo(() => {
    const out: NdaRow[] = []
    for (const l of listings) {
      for (const q of mk[l.id]?.nda_requests ?? []) {
        out.push({ key: `${l.id}::${q.id}`, listing: l, req: q })
      }
    }
    return out.sort((a, b) => String(b.req.requested_at ?? '').localeCompare(String(a.req.requested_at ?? '')))
  }, [listings, mk])

  // 상태별 건수 — 상단 요약 + 클릭 필터
  const counts = useMemo(() => {
    const c = { 전체: allRows.length, '운영사 검토': 0, 승인: 0, 거절: 0 } as Record<string, number>
    for (const r of allRows) {
      const s = r.req.status || '운영사 검토'
      if (s in c) c[s] += 1
    }
    return c
  }, [allRows])

  const q = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    let arr = allRows
    if (memberFilter) {
      arr = arr.filter(r => r.req.user_id === memberFilter || r.listing.sellerId === memberFilter)
    }
    if (statusFilter !== '전체') arr = arr.filter(r => (r.req.status || '운영사 검토') === statusFilter)
    if (q) {
      arr = arr.filter(r => [
        r.listing.no, r.listing.region, r.listing.collateral, r.listing.sellerName ?? '',
        r.req.signer ?? '', r.req.email ?? '', r.req.status ?? '', r.req.deal_stage ?? '',
      ].join(' ').toLowerCase().includes(q))
    }
    return arr
  }, [allRows, memberFilter, statusFilter, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  /** nda_requests 배열을 통째로 저장 (상태·딜 단계 공통) */
  const saveRequests = async (listingId: string, next: NdaRequest[], key: string) => {
    setSavingKey(key)
    setSavedKey(null)
    setMk(prev => ({
      ...prev,
      [listingId]: {
        ...(prev[listingId] ?? { listing_id: listingId, checklist: {}, consult_count: 0, interest_count: 0, nda_count: 0 }),
        nda_requests: next,
      },
    }))
    try {
      await fetch('/api/v1/listing-marketing', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, nda_requests: next }),
      })
      setSavedKey(key)
      setTimeout(() => setSavedKey(k => (k === key ? null : k)), 1600)
    } finally {
      setSavingKey(null)
    }
  }

  const setStatus = (row: NdaRow, status: string) => {
    const cur = mk[row.listing.id]?.nda_requests ?? []
    const next = cur.map(x => x.id === row.req.id ? { ...x, status, decided_at: new Date().toISOString() } : x)
    void saveRequests(row.listing.id, next, row.key)
  }

  /** 딜 단계 — 요청 건별. 같은 단계 다시 누르면 해제 */
  const setStage = (row: NdaRow, stage: string) => {
    const cur = mk[row.listing.id]?.nda_requests ?? []
    const next = cur.map(x => x.id === row.req.id
      ? { ...x, deal_stage: x.deal_stage === stage ? '' : stage }
      : x)
    void saveRequests(row.listing.id, next, row.key)
  }

  return (
    <div className="p-6 max-w-[1240px] space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <FileSignature size={13} /> NDA · 계약
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            NDA · 계약
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            NDA 요청 한 건이 한 행입니다. 상태와 딜 진행 단계는 요청 건별로 관리되며, 즉시 저장됩니다.
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

      {/* 상태 요약 — 숫자를 누르면 그 상태만 조회 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px" style={{ background: 'var(--color-border-subtle)' }}>
        {(['전체', '운영사 검토', '승인', '거절'] as const).map(s => {
          const on = statusFilter === s
          const c = s === '전체' ? { fg: 'var(--color-text-primary)', bd: ELECTRIC } : { fg: statusColor(s).fg, bd: statusColor(s).fg }
          return (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1) }}
              style={{
                background: on ? 'var(--color-surface-overlay)' : 'var(--color-surface-elevated)',
                borderTop: `2px solid ${on ? c.bd : 'transparent'}`,
                padding: '12px 14px', textAlign: 'left', border: 'none', cursor: 'pointer',
              }}
            >
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 800, lineHeight: 1, color: c.fg, fontVariantNumeric: 'tabular-nums' }}>
                {counts[s] ?? 0}<span style={{ fontSize: 12, marginLeft: 2, color: 'var(--color-text-muted)' }}>건</span>
              </div>
              <div style={{ marginTop: 5, fontSize: 11.5, fontWeight: 700, color: on ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                {s === '운영사 검토' ? '검토 대기' : s}
              </div>
            </button>
          )
        })}
      </div>

      {memberFilter && <MemberFilterBar userId={memberFilter} count={filtered.length} unit="건" onOpenMember={setMemberTarget} />}

      {loadError && (
        <div className="flex items-center gap-3 px-3 py-2.5 border" style={{ borderColor: 'rgba(225,29,72,0.4)', background: 'rgba(225,29,72,0.06)' }}>
          <span className="text-[12.5px] font-bold text-[#9F1239]">{loadError}</span>
          <button onClick={load} className="ml-auto px-2.5 py-1 text-[11px] font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
            style={{ background: 'var(--color-surface-elevated)', cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="관리번호 · 요청 회원 · 매각 회원 · 단계 검색..."
          className="w-full max-w-sm px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]"
        />
        <span className="text-[11px] text-[var(--color-text-muted)]">{filtered.length}건 / 전체 {allRows.length}건</span>
      </div>

      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-bold whitespace-nowrap">관리번호</th>
              <th className="px-3 py-2 font-bold">매물 · 매각 회원</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">요청 회원</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">요청일</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">상태</th>
              <th className="px-3 py-2 font-bold">딜 진행 단계 (클릭 = 등록/해제)</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">문서</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center">
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
                    {statusFilter === '전체' ? 'NDA 요청이 없습니다' : `'${statusFilter}' 상태의 요청이 없습니다`}
                  </p>
                </td>
              </tr>
            )}
            {paged.map(row => {
              const sc = statusColor(row.req.status || '운영사 검토')
              return (
                <tr key={row.key} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] align-top">
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => setReactionTarget(row.listing.id)}
                      className="font-mono text-[11px] font-bold text-[#1A47CC] hover:underline"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      title="이 매물의 매칭 매입회원 · NDA · 관심 보기">
                      {row.listing.no}
                    </button>
                  </td>
                  <td className="px-3 py-2">
                    <span className="block font-semibold text-[var(--color-text-primary)]">{row.listing.region}</span>
                    <span className="block text-[10.5px] text-[var(--color-text-muted)]">{row.listing.collateral}</span>
                    {row.listing.sellerId ? (
                      <button onClick={() => setMemberTarget(row.listing.sellerId as string)}
                        className="block text-[10.5px] font-semibold text-[#1A47CC] hover:underline text-left"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                        매각 {row.listing.sellerName}
                      </button>
                    ) : (
                      <span className="block text-[10.5px] text-[var(--color-text-muted)]">매각 (미연결)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-[160px]">
                    {row.req.user_id ? (
                      <button onClick={() => setMemberTarget(row.req.user_id as string)}
                        className="block w-full text-left text-[12px] font-bold text-[#1A47CC] truncate hover:underline"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        title={`${row.req.email ?? ''} — 회원 정보 보기`}>
                        {row.req.signer || row.req.email || '요청 회원'}
                      </button>
                    ) : (
                      <span className="text-[12px] text-[var(--color-text-primary)]">{row.req.signer || row.req.email || '무기명'}</span>
                    )}
                    <span className="block text-[10px] text-[var(--color-text-muted)] truncate">{row.req.email}</span>
                  </td>
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap text-[var(--color-text-secondary)]">
                    {String(row.req.requested_at ?? '').slice(0, 10)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <select
                      value={row.req.status || '운영사 검토'}
                      onChange={e => setStatus(row, e.target.value)}
                      disabled={savingKey === row.key}
                      className="px-1.5 py-1 text-[11px] font-bold border"
                      style={{ cursor: 'pointer', color: sc.fg, borderColor: sc.bd, background: sc.bg }}
                    >
                      {NDA_REQUEST_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {savedKey === row.key && (
                      <span className="ml-1 inline-flex items-center text-[10px] font-bold text-emerald-700">
                        <CheckCircle2 size={10} /> 저장
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      {DEAL_STAGES.map(s => {
                        const on = row.req.deal_stage === s
                        return (
                          <button
                            key={s}
                            onClick={() => setStage(row, s)}
                            disabled={savingKey === row.key}
                            className="inline-flex items-center justify-center h-[24px] px-2 text-[10.5px] font-bold border whitespace-nowrap"
                            style={{
                              background: on ? '#0A1628' : 'transparent',
                              color: on ? '#FFFFFF' : 'var(--color-text-secondary)',
                              borderColor: on ? '#0A1628' : 'var(--color-border-default)',
                              boxShadow: on ? `inset 0 2px 0 0 ${ELECTRIC}` : 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {s}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => void openNdaDoc(row.req.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-[var(--color-border-default)] text-[#1A47CC]"
                      style={{ background: 'var(--color-surface-elevated)', cursor: 'pointer' }}
                      title="체결된 NDA 문서 보기 (PDF 저장·보관)"
                    >
                      <FileText size={11} /> 문서
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
          <div className={SEGMENT.group}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              className={`${SEGMENT.item} disabled:opacity-30`} style={SEGMENT.style(false)}>이전</button>
            <span className="px-2 font-bold text-[var(--color-text-primary)]">{safePage}/{totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              className={`${SEGMENT.item} disabled:opacity-30`} style={SEGMENT.style(false)}>다음</button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]">
        ※ 요청 회원 이름을 클릭하면 연락처 · 매입조건 · 관심매물 이력을 바로 확인할 수 있습니다.
        매각의뢰 현황에는 각 매물에서 가장 앞선 딜 단계가 표시됩니다.
      </p>

      {ndaDoc && (
        <NdaDocumentPane doc={ndaDoc} isAdmin onClose={() => setNdaDoc(null)} onChanged={() => void openNdaDoc(ndaDoc.request_id)} />
      )}
      {memberTarget && <MemberPane userId={memberTarget} onClose={() => setMemberTarget(null)} />}
      {reactionTarget && <ReactionsPane listingId={reactionTarget} onClose={() => setReactionTarget(null)} onOpenMember={setMemberTarget} />}
    </div>
  )
}
