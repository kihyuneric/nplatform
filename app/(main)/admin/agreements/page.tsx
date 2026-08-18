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

const ELECTRIC = '#2251FF'

type Row = {
  id: string
  region: string
  collateral: string
  created: string
}

const PAGE_SIZE = 20

export default function AdminAgreementsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [mk, setMk] = useState<Record<string, ListingMarketing>>({})
  const [loading, setLoading] = useState(true)
  // D0 공통 UI — 검색 + 페이지네이션
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = search.trim().toLowerCase()
  const filtered = q
    ? rows.filter(r => [r.id, r.region, r.collateral, mk[r.id]?.npl_status ?? '', mk[r.id]?.deal_stage ?? ''].join(' ').toLowerCase().includes(q))
    : rows
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((Math.min(page, totalPages) - 1) * PAGE_SIZE, Math.min(page, totalPages) * PAGE_SIZE)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch('/api/v1/exchange/listings?limit=200&status=ACTIVE').then(r => r.json()).catch(() => ({})),
      fetch('/api/v1/listing-marketing').then(r => r.json()).catch(() => ({})),
    ]).then(([ld, md]) => {
      const list: Array<Record<string, any>> = Array.isArray(ld.data) ? ld.data : []
      setRows(list.map(x => ({
        id: String(x.id),
        region: [x.sido, x.sigungu].filter(Boolean).join(' ') || String(x.address ?? '').split(/\s+/).slice(0, 2).join(' ') || '—',
        collateral: String(x.collateral_type ?? '—'),
        created: x.created_at ? String(x.created_at).slice(0, 10) : '—',
      })))
      if (md?.data) setMk(md.data)
    }).finally(() => setLoading(false))
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

      {/* D0 공통 UI — 검색 */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="관리번호 · 지역 · 유형 · 상태 · 딜 단계 검색..."
          className="w-full max-w-sm px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]"
        />
        <span className="text-[11px] text-[var(--color-text-muted)]">{filtered.length}건 / 전체 {rows.length}건</span>
      </div>

      <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-3 py-2.5 font-bold whitespace-nowrap">관리번호</th>
              <th className="px-3 py-2.5 font-bold">지역 · 유형</th>
              <th className="px-2 py-2.5 font-bold whitespace-nowrap">관심</th>
              <th className="px-2 py-2.5 font-bold whitespace-nowrap">NDA 요청</th>
              <th className="px-2 py-2.5 font-bold whitespace-nowrap">상담</th>
              <th className="px-3 py-2.5 font-bold whitespace-nowrap">NPL 상태</th>
              <th className="px-3 py-2.5 font-bold whitespace-nowrap">매칭날짜</th>
              <th className="px-3 py-2.5 font-bold min-w-[300px]">딜 진행 단계 (클릭 = 등록/수정)</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-12 text-center text-sm text-[var(--color-text-muted)]">활성 매물이 없습니다</td></tr>
            )}
            {paged.map(r => {
              const m = mk[r.id]
              const stage = m?.deal_stage ?? ''
              return (
                <tr key={r.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-[var(--color-text-primary)] whitespace-nowrap">{r.id}</td>
                  <td className="px-3 py-2.5 min-w-[150px]">
                    <div className="font-semibold text-[var(--color-text-primary)]">{r.region}</div>
                    <div className="text-[11px] text-[var(--color-text-muted)]">{r.collateral} · {r.created}</div>
                  </td>
                  <td className="px-2 py-2.5 tabular-nums font-bold">{m?.interest_count ?? 0}</td>
                  {/* NDA 요청 — 건수 + 요청별 운영사 검토 → 승인/거절 (승인 = 매입사 세부내역 열람 오픈) */}
                  <td className="px-2 py-2.5">
                    <div className="tabular-nums font-bold">{m?.nda_requests?.length ?? m?.nda_count ?? 0}</div>
                    {(m?.nda_requests ?? []).map(q => (
                      <div key={q.id} className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-[var(--color-text-primary)] whitespace-nowrap" title={q.email || ''}>
                          {q.signer || q.email || '무기명'}
                        </span>
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
                  <td className="px-3 py-2.5 whitespace-nowrap">
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
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <input
                      type="date"
                      value={m?.matched_at ?? ''}
                      onChange={e => void saveField(r.id, { matched_at: e.target.value })}
                      disabled={savingId === r.id}
                      className="px-2 py-1 text-[11.5px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2.5">
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
        ※ LOI · 플래그 · 위반확정 등 미연동 개념은 제거되었습니다. 단계 저장은 listing_marketing 테이블 생성 후 유지됩니다.
      </p>
    </div>
  )
}
