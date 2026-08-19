'use client'

/**
 * /admin/agreements — NDA · 딜 진행 관리 (2026-08-17 전면 교체)
 *
 * 정책:
 *   - LOI · 플래그 · 위반확정 등 미연동 개념 제거
 *   - 매물별 딜 진행 단계: 관심등록 → 실사진행 → 가격협의 → 최종계약
 *   - 관리자가 직접 등록·수정 (클릭 즉시 저장) → 매각사 대시보드에 공유
 *   - NDA 요청·관심 집계는 listing_marketing 자동 연동 값 표시
 */

import { useEffect, useState } from 'react'
import { FileSignature, RefreshCw, CheckCircle2 } from 'lucide-react'
import { DEAL_STAGES, NPL_STATUSES, NDA_REQUEST_STATUSES, type ListingMarketing, type NdaRequest } from '@/lib/marketing-checklist'
import { MemberPane } from '@/components/admin/member-pane'
import { ReactionsPane } from '@/components/admin/reactions-pane'
import { buildListingNoMap } from '@/lib/listing-no'
import { MemberFilterBar, useMemberFilter } from '@/components/admin/member-filter-bar'

const ELECTRIC = '#2251FF'

type Row = {
  id: string
  no: string            // 관리번호 N26-1 (2026-08-19)
  region: string
  collateral: string
  created: string
  sellerId?: string | null   // 매각 회원 Key
  sellerName?: string        // 매각 회원 표시명
}

const PAGE_SIZE = 20

export default function AdminAgreementsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [mk, setMk] = useState<Record<string, ListingMarketing>>({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  // D0 공통 UI — 검색 + 페이지네이션
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = search.trim().toLowerCase()
  // 회원 Key 기준 필터 — ?user=<회원ID> (2026-08-19)
  const memberFilter = useMemberFilter()
  // 회원 기준 = 이 회원이 매각 회원인 매물 + 이 회원이 NDA 를 요청한 매물 (양방향)
  const scoped = memberFilter
    ? rows.filter(r =>
        r.sellerId === memberFilter ||
        (mk[r.id]?.nda_requests ?? []).some(q => q.user_id === memberFilter)
      )
    : rows
  const filtered = q
    ? scoped.filter(r => [r.id, r.no, r.region, r.collateral, r.sellerName ?? '', mk[r.id]?.npl_status ?? '', mk[r.id]?.deal_stage ?? ''].join(' ').toLowerCase().includes(q))
    : scoped
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((Math.min(page, totalPages) - 1) * PAGE_SIZE, Math.min(page, totalPages) * PAGE_SIZE)
  const [savingId, setSavingId] = useState<string | null>(null)
  // 회원 상세 패널 — NDA 요청 회원 클릭 시 (2026-08-19)
  const [memberTarget, setMemberTarget] = useState<string | null>(null)
  // 매물 반응 상세 (관리번호 클릭) — 2026-08-19
  const [reactionTarget, setReactionTarget] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setLoadError('')
    // 실패를 삼키지 않는다 — 응답 코드까지 화면에 보여야 원인을 알 수 있다 (2026-08-19)
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
    ]).then(async ([ld, md]) => {
      const list: Array<Record<string, any>> = Array.isArray(ld.data) ? ld.data : []
      // 관리번호 N26-1 — 전 화면 공통 규칙 (2026-08-19)
      const noMap = buildListingNoMap(list.map(x => ({ id: String(x.id), listing_no: x.listing_no, created_at: x.created_at })))
      // 매각 회원(seller_id) 조인 — NDA·계약 화면에서 "누구 매물인지" 즉시 파악 (2026-08-19)
      const sellerMap: Record<string, string> = {}
      const sids = Array.from(new Set(list.map(x => x.seller_id).filter(Boolean))) as string[]
      if (sids.length > 0) {
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const { data: sellers } = await createClient().from('users').select('id, name, company_name').in('id', sids)
          for (const s of sellers ?? []) {
            sellerMap[s.id as string] = [s.name, s.company_name].filter(Boolean).join(' · ') || String(s.id).slice(0, 8)
          }
        } catch { /* 조인 실패 시 미연결 표기 */ }
      }
      setRows(list.map(x => ({
        id: String(x.id),
        no: noMap[String(x.id)] ?? '—',
        region: [x.sido, x.sigungu].filter(Boolean).join(' ') || String(x.address ?? '').split(/\s+/).slice(0, 2).join(' ') || '—',
        collateral: String(x.collateral_type ?? '—'),
        created: x.created_at ? String(x.created_at).slice(0, 10) : '—',
        sellerId: (x.seller_id as string) ?? null,
        sellerName: x.seller_id ? (sellerMap[x.seller_id as string] ?? '(연결 회원 없음)') : '(미연결)',
      })))
      if (md?.data) setMk(md.data)
    }).catch((e: Error) => setLoadError(e.message || '알 수 없는 오류'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  // 공용 저장 — 상태 · 매칭날짜 등 필드 단위 PATCH (낙관적 업데이트)
  const saveField = async (listingId: string, patch: Partial<ListingMarketing>) => {
    setSavingId(listingId)
    setSavedId(null)
    setMk(prev => ({
      ...prev,
      [listingId]: { ...(prev[listingId] ?? { listing_id: listingId, checklist: {}, consult_count: 0, interest_count: 0, nda_count: 0 }), ...patch },
    }))
    try {
      await fetch('/api/v1/listing-marketing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, ...patch }),
      })
      setSavedId(listingId)
      setTimeout(() => setSavedId(s => (s === listingId ? null : s)), 1800)
    } finally {
      setSavingId(null)
    }
  }

  // NDA 요청 상태 변경 — 운영사 검토 → 승인/거절 (승인 시 매입사 세부내역 열람 오픈)
  const setNdaStatus = async (listingId: string, requestId: string, status: string) => {
    const current = mk[listingId]?.nda_requests ?? []
    const next: NdaRequest[] = current.map(q =>
      q.id === requestId ? { ...q, status, decided_at: new Date().toISOString() } : q
    )
    await saveField(listingId, { nda_requests: next })
  }

  const setStage = async (listingId: string, stage: string) => {
    const current = mk[listingId]?.deal_stage ?? ''
    const next = current === stage ? '' : stage   // 같은 단계 다시 클릭 = 해제
    // 매칭 시작(단계 첫 등록) 시 매칭날짜 자동 기록 — 매입사 알림은 이 날짜 이후 건만 발송 기준
    const autoMatchedAt = next && !mk[listingId]?.matched_at ? new Date().toISOString().slice(0, 10) : undefined
    setSavingId(listingId)
    setSavedId(null)
    // 낙관적 업데이트
    setMk(prev => ({
      ...prev,
      [listingId]: {
        ...(prev[listingId] ?? { listing_id: listingId, checklist: {}, consult_count: 0, interest_count: 0, nda_count: 0 }),
        deal_stage: next,
        ...(autoMatchedAt ? { matched_at: autoMatchedAt } : {}),
      },
    }))
    try {
      await fetch('/api/v1/listing-marketing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, deal_stage: next, ...(autoMatchedAt ? { matched_at: autoMatchedAt } : {}) }),
      })
      setSavedId(listingId)
      setTimeout(() => setSavedId(s => (s === listingId ? null : s)), 1800)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="p-6 max-w-[1150px] space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <FileSignature size={13} /> NDA · 계약
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            NDA · 계약
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            단계를 클릭하면 즉시 저장되고 매각사 대시보드에 공유됩니다. (다시 클릭 = 해제)
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


      {memberFilter && <MemberFilterBar userId={memberFilter} count={filtered.length} unit="건" onOpenMember={setMemberTarget} />}

      {/* 조회 실패를 조용히 넘기지 않는다 (2026-08-19) */}
      {loadError && (
        <div className="flex items-center gap-3 px-3 py-2.5 border" style={{ borderColor: 'rgba(225,29,72,0.4)', background: 'rgba(225,29,72,0.06)' }}>
          <span className="text-[12.5px] font-bold text-[#9F1239]">{loadError}</span>
          <button onClick={load} className="ml-auto px-2.5 py-1 text-[11px] font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
            style={{ background: 'var(--color-surface-elevated)', cursor: 'pointer' }}>
            다시 시도
          </button>
        </div>
      )}

      {/* D0 공통 UI — 검색 */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="관리번호 · 매각 회원 · 지역 · 유형 · 상태 검색..."
          className="w-full max-w-sm px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]"
        />
        <span className="text-[11px] text-[var(--color-text-muted)]">{filtered.length}건 / 전체 {rows.length}건</span>
      </div>

      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-3 py-2 font-bold whitespace-nowrap">관리번호</th>
              <th className="px-3 py-2 font-bold">지역 · 유형</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">매각 회원</th>
              <th className="px-2 py-2.5 font-bold whitespace-nowrap">관심</th>
              <th className="px-2 py-2.5 font-bold whitespace-nowrap">NDA 요청</th>
              <th className="px-2 py-2.5 font-bold whitespace-nowrap">상담</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">NPL 상태</th>
              <th className="px-3 py-2 font-bold whitespace-nowrap">매칭날짜</th>
              <th className="px-3 py-2 font-bold ">딜 진행 단계 (클릭 = 등록/수정)</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-12 text-center text-sm text-[var(--color-text-muted)]">활성 매물이 없습니다</td></tr>
            )}
            {paged.map(r => {
              const m = mk[r.id]
              const stage = m?.deal_stage ?? ''
              return (
                <tr key={r.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] transition-colors">
                  {/* 관리번호 클릭 → 이 매물의 반응 상세(매칭 매입회원·NDA·관심) */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button onClick={() => setReactionTarget(r.id)}
                      className="font-mono text-[11px] font-bold text-[#1A47CC] hover:underline"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                      title="이 매물의 매칭 매입회원 · NDA · 관심 보기">
                      {r.no}
                    </button>
                  </td>
                  <td className="px-3 py-2 ">
                    <div className="font-semibold text-[var(--color-text-primary)]">{r.region}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">{r.collateral} · {r.created}</div>
                  </td>
                  {/* 매각 회원 — 클릭 시 회원 상세(연락처·활동) 패널 (2026-08-19) */}
                  <td className="px-3 py-2 max-w-[150px]">
                    {r.sellerId ? (
                      <button
                        onClick={() => setMemberTarget(r.sellerId as string)}
                        className="block w-full text-left text-[11.5px] font-semibold text-[#1A47CC] truncate hover:underline"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        title={`${r.sellerName} — 매각 회원 정보 보기`}
                      >
                        {r.sellerName}
                      </button>
                    ) : (
                      <span className="text-[11.5px] text-[var(--color-text-muted)]">(미연결)</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums font-bold">{m?.interest_count ?? 0}</td>
                  {/* NDA 요청 — 건수 + 요청별 운영사 검토 → 승인/거절 (승인 = 매입사 세부내역 열람 오픈) */}
                  <td className="px-2 py-2.5">
                    <div className="tabular-nums font-bold">{m?.nda_requests?.length ?? m?.nda_count ?? 0}</div>
                    {(m?.nda_requests ?? []).map(q => (
                      <div key={q.id} className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        {/* NDA 요청 회원 — 클릭 시 회원 상세(연락처·활동) 패널 */}
                        {q.user_id ? (
                          <button
                            onClick={() => setMemberTarget(q.user_id as string)}
                            className="text-[11px] font-semibold text-[#1A47CC] whitespace-nowrap hover:underline"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                            title={`${q.email || ''} — 회원 정보 보기`}
                          >
                            {q.signer || q.email || '요청 회원'}
                          </button>
                        ) : (
                          <span className="text-[11px] font-semibold text-[var(--color-text-primary)] whitespace-nowrap" title={q.email || ''}>
                            {q.signer || q.email || '무기명'}
                          </span>
                        )}
                        <span className="text-[10px] text-[var(--color-text-muted)] tabular-nums whitespace-nowrap">
                          {q.requested_at?.slice(5, 10)}
                        </span>
                        <select
                          value={q.status}
                          onChange={e => void setNdaStatus(r.id, q.id, e.target.value)}
                          disabled={savingId === r.id}
                          className="px-1.5 py-0.5 text-[10.5px] font-bold border bg-[var(--color-surface-elevated)]"
                          style={{
                            cursor: 'pointer',
                            color: q.status === '승인' ? '#047857' : q.status === '거절' ? '#9F1239' : '#A53F00',
                            borderColor: q.status === '승인' ? 'rgba(16,185,129,0.45)' : q.status === '거절' ? 'rgba(225,29,72,0.45)' : 'rgba(255,140,0,0.45)',
                          }}
                        >
                          {NDA_REQUEST_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    ))}
                  </td>
                  <td className="px-2 py-2.5 tabular-nums font-bold">{m?.consult_count ?? 0}</td>
                  {/* NPL 상태 — 거래중/협의중/매각완료 */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <select
                      value={m?.npl_status ?? ''}
                      onChange={e => void saveField(r.id, { npl_status: e.target.value })}
                      disabled={savingId === r.id}
                      className="px-2 py-1.5 text-[11.5px] font-bold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">— 상태</option>
                      {NPL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  {/* 매칭날짜 — 이후 업데이트 알림 기준점 */}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <input
                      type="date"
                      value={m?.matched_at ?? ''}
                      onChange={e => void saveField(r.id, { matched_at: e.target.value })}
                      disabled={savingId === r.id}
                      className="px-2 py-1 text-[11.5px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      {DEAL_STAGES.map((s, i) => {
                        const active = stage === s
                        const passed = stage !== '' && DEAL_STAGES.indexOf(stage as typeof DEAL_STAGES[number]) > i
                        return (
                          <button
                            key={s}
                            onClick={() => void setStage(r.id, s)}
                            disabled={savingId === r.id}
                            className="px-2.5 py-1.5 text-[11px] font-bold transition-colors"
                            style={{
                              background: active ? '#0A1628' : passed ? 'rgba(34, 81, 255, 0.10)' : 'transparent',
                              color: active ? '#FFFFFF' : passed ? '#1A47CC' : 'var(--color-text-secondary)',
                              border: active ? '1px solid #0A1628' : '1px solid var(--color-border-default)',
                              borderTop: active ? `2px solid ${ELECTRIC}` : undefined,
                              cursor: 'pointer',
                              opacity: savingId === r.id ? 0.6 : 1,
                            }}
                          >
                            {i + 1}. {s}
                          </button>
                        )
                      })}
                      {savedId === r.id && <CheckCircle2 size={14} className="text-emerald-600" />}
                    </div>
                  </td>
                </tr>
              )
            })}
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

      <p className="text-[11px] text-[var(--color-text-muted)]">
        ※ NDA 요청자 이름을 클릭하면 요청 회원의 연락처 · 매입조건 · 관심매물 이력을 바로 확인할 수 있습니다.
      </p>

      {/* 회원 상세 패널 — NDA 요청 → 요청 회원 정보 직결 */}
      {memberTarget && <MemberPane userId={memberTarget} onClose={() => setMemberTarget(null)} />}

      {/* 매물 반응 상세 — 이 매물의 매칭 매입회원·NDA·관심 */}
      {reactionTarget && (
        <ReactionsPane listingId={reactionTarget} onClose={() => setReactionTarget(null)}
          onOpenMember={(uid) => { setReactionTarget(null); setMemberTarget(uid) }} />
      )}
    </div>
  )
}
