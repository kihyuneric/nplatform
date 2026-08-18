'use client'

/**
 * /my/seller — 매각 회원 「내 매물」 (운영설계서 기준 전면 정리 · 2026-08-18)
 *
 * 운영설계서 §8 매각 회원 마이페이지: 대시보드 / 내 매물 / 알림센터 / 설정 — 그 외 없음.
 *   - 정산 관리 · 분석 · 설정 탭, 가짜 계좌/사업자 정보 전부 삭제 (서비스 범위 밖)
 *   - 이 화면 = 내 매물: 주간 활동 요약 + 매물 표 (검색·페이지네이션 D0)
 *   - 표 컬럼: 매물명·주소(본인 매물 — 마스킹 없음) / 채권액 / 상태(진행중·협의중·매각완료)
 *             / 매칭 매입사(실매칭) / 마케팅 진행 현황(운영사 입력 연동) / 등록일 / 액션
 *   - 액션: 세부내역(우측 패널) | 진행종료 요청(운영사 승인 후 종료)
 */

import { useState, useEffect, useMemo } from 'react'
import { MARKETING_CHECKLIST, NPL_STATUSES, type ListingMarketing as MkRow } from '@/lib/marketing-checklist'
import Link from 'next/link'
import { Plus, Loader2 } from 'lucide-react'
import DS from '@/lib/design-system'
import { DetailPane } from '@/components/listing/detail-pane'
import { MckPageShell, MckPageHeader } from '@/components/mck'
import { MCK, MCK_FONTS, MCK_TYPE } from '@/lib/mck-design'

interface SellerListing {
  id: string
  title: string
  claim_amount: number
  interest_count: number
  view_count: number
  created_at: string
  address: string   // 본인 매물 — 마스킹 없이 전체 주소
}

const PAGE_SIZE = 20

const formatClaim = (v: number) => v >= 100000000 ? `${(v / 100000000).toFixed(1)}억` : `${(v / 10000).toFixed(0)}만`

function useSellerListings() {
  const [listings, setListings] = useState<SellerListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/exchange/listings?limit=100&seller_id=me')
      .then(r => r.json())
      .then(d => {
        if (d.data) setListings(d.data.map((l: Record<string, unknown>) => ({
          id: l.id as string,
          title: (l.title as string) || `매물 ${l.id}`,
          claim_amount: (l.principal_amount as number) || (l.claim_amount as number) || 0,
          interest_count: (l.interest_count as number) || 0,
          view_count: (l.view_count as number) || 0,
          created_at: l.created_at as string,
          address: (l.address as string) || [l.sido, l.sigungu, l.dong].filter(Boolean).join(' ') || '',
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { listings, loading }
}

export default function SellerMyListingsPage() {
  const { listings, loading } = useSellerListings()

  // ── 마케팅 진행 · 반응 · NDA · 상태 (운영사 관리자 입력 → 실시간 공유 저장소) ──
  const [marketing, setMarketing] = useState<Record<string, MkRow>>({})
  useEffect(() => {
    fetch('/api/v1/listing-marketing')
      .then(r => r.json())
      .then(d => { if (d?.data) setMarketing(d.data) })
      .catch(() => {})
  }, [])

  // ── 실매칭 엔진 — 매입조건(지역·유형·금액대) 실제 대조 결과만 표시 ──
  const [matchMap, setMatchMap] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/v1/matching/summary')
      .then(r => r.json())
      .then(d => { if (d?.data?.perListing) setMatchMap(d.data.perListing) })
      .catch(() => {})
  }, [])

  // ── 세부내역 우측 패널 (D0·D6) ──
  const [detailTarget, setDetailTarget] = useState<string | null>(null)

  // ── 진행종료 요청 — 운영사 접수함 접수 → 승인 후 종료 ──
  const [endRequested, setEndRequested] = useState<Set<string>>(new Set())
  const requestEnd = (listingId: string, name: string) => {
    if (!confirm(`"${name}" 매물의 진행종료를 요청할까요?\n운영사 승인 후 종료 처리됩니다.`)) return
    setEndRequested(prev => new Set(prev).add(listingId))
    fetch('/api/v1/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `[진행종료 요청] ${name} (${listingId})`,
        category: '매물',
        priority: 'HIGH',
        description: `매각 회원이 매물 진행종료를 요청했습니다.\n매물: ${name}\nID: ${listingId}\n\n운영사 확인 후 매각의뢰 현황에서 종료 처리해주세요.`,
      }),
    }).catch(() => {})
  }

  // ── 매각 회원 직접 수정 — NPL 상태 3종 (관리자와 동일 저장소) ──
  const saveMk = (listingId: string, patch: Partial<MkRow>) => {
    setMarketing(prev => ({
      ...prev,
      [listingId]: { ...(prev[listingId] ?? { listing_id: listingId, checklist: {}, consult_count: 0, interest_count: 0, nda_count: 0 }), ...patch },
    }))
    fetch('/api/v1/listing-marketing', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, ...patch }),
    }).catch(() => {})
  }

  // ── 상태 집계 — NPL 상태 3종 (미지정 = 진행중) ──
  const statusOf = (id: string) => marketing[id]?.npl_status || '진행중'
  const counts = {
    total: listings.length,
    ing: listings.filter(l => statusOf(l.id) === '진행중').length,
    nego: listings.filter(l => statusOf(l.id) === '협의중').length,
    done: listings.filter(l => statusOf(l.id) === '매각완료').length,
  }

  // ── D4 — 주간 활동 요약 (주간 리포트 알림과 동일 기준) ──
  const weekly = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    let nda7 = 0, interestTotal = 0, consultTotal = 0, mkDone = 0
    for (const l of listings) {
      const mk = marketing[l.id]
      if (!mk) continue
      nda7 += (mk.nda_requests ?? []).filter(q => q.requested_at && new Date(q.requested_at).getTime() >= cutoff).length
      interestTotal += mk.interest_count ?? 0
      consultTotal += mk.consult_count ?? 0
      mkDone += MARKETING_CHECKLIST.filter(c => mk.checklist?.[c.key]).length
    }
    return { nda7, interestTotal, consultTotal, mkDone }
  }, [listings, marketing])

  // ── D0 — 검색 + 페이지네이션 ──
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = search.trim().toLowerCase()
  const filtered = q
    ? listings.filter(l => [l.title, l.address, l.id, statusOf(l.id)].join(' ').toLowerCase().includes(q))
    : listings
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  if (loading) {
    return (
      <MckPageShell variant="tint">
        <MckPageHeader
          breadcrumbs={[{ label: '마이페이지', href: '/my' }, { label: '내 매물' }]}
          eyebrow="MY · SELLER"
          title="내 매물"
          subtitle="매각의뢰 매물 정보를 불러오고 있습니다."
        />
        <div className="max-w-[1280px] mx-auto" style={{ padding: '60px 24px', textAlign: 'center', color: MCK.textMuted, fontSize: 12 }}>
          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" style={{ color: MCK.electric }} />
          내 매물을 불러오는 중...
        </div>
      </MckPageShell>
    )
  }

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[{ label: '마이페이지', href: '/my' }, { label: '내 매물' }]}
        eyebrow="MY · SELLER"
        title="내 매물"
        subtitle="매각의뢰 매물의 상태 · 매칭 · 마케팅 진행 현황을 확인합니다. 세부내역과 진행종료 요청은 액션에서 처리합니다."
        actions={
          <div className="flex flex-wrap gap-5">
            {[
              ['등록 매물', `${counts.total}건`],
              ['진행중', `${counts.ing}건`],
              ['협의중', `${counts.nego}건`],
              ['매각완료', `${counts.done}건`],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ textAlign: 'right' }}>
                <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 2 }}>{lbl}</div>
                <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, fontWeight: 800, color: MCK.ink, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
        }
      />

      <div className={DS.page.container + ' py-6 ' + DS.page.sectionGap}>
        {/* D4 — 주간 활동 요약 (주간 리포트 알림 = 이 요약의 발송본) */}
        <div className="flex items-center justify-between gap-4 flex-wrap px-5 py-4" style={{ background: '#0A1628', borderTop: '3px solid #2251FF' }}>
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: '#00A9F4' }}>주간 활동 요약</div>
            <div className="mt-1 text-sm font-extrabold" style={{ color: '#FFFFFF' }}>
              NDA 요청 <span className="tabular-nums">+{weekly.nda7}</span> <span className="opacity-50 text-[11px] font-bold">(최근 7일)</span>
              <span className="mx-2 opacity-40">·</span>
              관심 누적 <span className="tabular-nums">{weekly.interestTotal}</span>
              <span className="mx-2 opacity-40">·</span>
              상담 누적 <span className="tabular-nums">{weekly.consultTotal}</span>
              <span className="mx-2 opacity-40">·</span>
              마케팅 항목 <span className="tabular-nums">{weekly.mkDone}건</span> 진행
            </div>
          </div>
          <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>주간 리포트 알림과 동일 기준</span>
        </div>

        {/* 내 매물 표 */}
        <div className={DS.card.elevated + ' ' + DS.card.padding}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h2 className={DS.text.cardTitle}>내 매물</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="매물명, 주소, 상태 검색..."
                className={DS.input.base + ' w-[220px]'}
              />
              <span className={DS.text.micro + ' text-[var(--color-text-muted)]'}>
                {filtered.length}건 / 전체 {listings.length}건
              </span>
              <Link href="/exchange/sell">
                <button className={DS.button.accent + ' ' + DS.button.sm}>
                  <Plus className="h-3.5 w-3.5" />새 매물 등록
                </button>
              </Link>
            </div>
          </div>

          <div className={DS.table.wrapper}>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  <th className={DS.table.headerCell}>매물명 · 주소</th>
                  <th className={DS.table.headerCell}>채권액</th>
                  <th className={DS.table.headerCell}>상태</th>
                  <th className={DS.table.headerCell}>매칭 매입사</th>
                  <th className={DS.table.headerCell}>마케팅 진행 현황</th>
                  <th className={DS.table.headerCell}>등록일</th>
                  <th className={DS.table.headerCell}>액션</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-sm text-[var(--color-text-muted)]">
                      {q ? '검색 결과가 없습니다.' : '등록된 매물이 없습니다 — 새 매물 등록으로 매각의뢰를 시작해주세요.'}
                    </td>
                  </tr>
                )}
                {paged.map(l => {
                  const mk = marketing[l.id]
                  const done = MARKETING_CHECKLIST.filter(c => mk?.checklist?.[c.key])
                  const matched = matchMap[l.id]
                  return (
                    <tr key={l.id} className={DS.table.row}>
                      {/* 매물명 + 전체 주소 — 본인 매물이므로 마스킹 없음 */}
                      <td className={DS.table.cell}>
                        <span className="font-medium">{l.title}</span>
                        <span className="block text-[0.6875rem] text-[var(--color-text-muted)]">{l.address || l.id}</span>
                      </td>
                      <td className={DS.table.cell + ' font-semibold tabular-nums'}>{formatClaim(l.claim_amount)}</td>
                      {/* 상태 — 진행중 / 협의중 / 매각완료 3종만 */}
                      <td className={DS.table.cell}>
                        <select
                          value={statusOf(l.id)}
                          onChange={e => saveMk(l.id, { npl_status: e.target.value })}
                          className="px-2 py-1 text-[0.75rem] font-bold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
                          style={{ cursor: 'pointer' }}
                        >
                          {NPL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      {/* 매칭 매입사 — 실매칭 결과만 (매입조건 실데이터 대조) */}
                      <td className={DS.table.cell}>
                        {typeof matched === 'number' ? (
                          <div className="min-w-[80px]">
                            <div className="flex items-baseline gap-1">
                              <b className="text-lg tabular-nums text-[var(--color-text-primary)]">{matched}</b>
                              <span className="text-[0.6875rem] text-[var(--color-text-muted)]">개사</span>
                            </div>
                            <span className="block text-[0.625rem] text-[var(--color-text-muted)]">매입조건 일치 · 실시간</span>
                          </div>
                        ) : (
                          <span className="text-[0.6875rem] text-[var(--color-text-muted)]">대조 중</span>
                        )}
                      </td>
                      {/* 마케팅 진행 현황 — 운영사 입력 실데이터 연동 */}
                      <td className={DS.table.cell}>
                        <div className="min-w-[250px] space-y-1.5">
                          {mk?.matched_at && (
                            <div className="text-[0.6875rem]">
                              <span className="text-[var(--color-text-muted)]">매칭 등록일 </span>
                              <b className="tabular-nums text-[var(--color-text-primary)]">{mk.matched_at}</b>
                              <span className="ml-1 text-[0.625rem] text-[var(--color-text-muted)]">(운영사 자동 기록)</span>
                            </div>
                          )}
                          {mk?.deal_stage ? (
                            <div className="text-[0.6875rem]">
                              <span className="text-[var(--color-text-muted)]">진행 단계 </span>
                              <b className="px-1.5 py-0.5 text-white text-[0.625rem]" style={{ background: '#0A1628' }}>{mk.deal_stage}</b>
                            </div>
                          ) : null}
                          <div className="flex items-center gap-3 text-[0.6875rem]">
                            <span className="text-[var(--color-text-muted)]">관심 <b className="tabular-nums text-[var(--color-text-primary)]">{mk?.interest_count ?? 0}</b></span>
                            <span className="text-[var(--color-text-muted)]">NDA 요청 <b className="tabular-nums text-[var(--color-text-primary)]">{mk?.nda_requests?.length ?? mk?.nda_count ?? 0}</b></span>
                            <span className="text-[var(--color-text-muted)]">상담 진행 <b className="tabular-nums text-[var(--color-text-primary)]">{mk?.consult_count ?? 0}</b></span>
                          </div>
                          {(mk?.nda_requests ?? []).length > 0 && (
                            <div className="space-y-0.5">
                              {(mk?.nda_requests ?? []).map(nq => (
                                <div key={nq.id} className="flex items-center gap-1.5 text-[0.6563rem]">
                                  <span
                                    className="px-1.5 py-0.5 font-bold text-[0.5938rem] whitespace-nowrap"
                                    style={{
                                      color: nq.status === '승인' ? '#047857' : nq.status === '거절' ? '#9F1239' : '#A53F00',
                                      background: nq.status === '승인' ? 'rgba(16,185,129,0.10)' : nq.status === '거절' ? 'rgba(225,29,72,0.10)' : 'rgba(255,140,0,0.10)',
                                      border: `1px solid ${nq.status === '승인' ? 'rgba(16,185,129,0.35)' : nq.status === '거절' ? 'rgba(225,29,72,0.35)' : 'rgba(255,140,0,0.35)'}`,
                                    }}
                                  >
                                    {nq.status}
                                  </span>
                                  <span className="text-[var(--color-text-muted)]">
                                    {nq.signer || '무기명'} · {nq.requested_at?.slice(5, 10)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="text-[0.625rem] font-bold text-[var(--color-text-muted)]">
                            마케팅 {done.length}/{MARKETING_CHECKLIST.length} 진행
                          </div>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                            {MARKETING_CHECKLIST.map(c => {
                              const ok = !!mk?.checklist?.[c.key]
                              return (
                                <span key={c.key} className={`text-[0.6563rem] ${ok ? 'text-[var(--color-text-primary)] font-semibold' : 'text-[var(--color-text-muted)]'}`}>
                                  {ok ? '✓' : '·'} {c.label.replace('땅집고옥션 ', '땅옥 ').replace('엔플랫폼 ', '엔플 ')}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </td>
                      <td className={DS.table.cellMuted + ' tabular-nums'}>{l.created_at?.slice(0, 10) || '-'}</td>
                      <td className={DS.table.cell}>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setDetailTarget(l.id)}
                            className={DS.text.link + ' text-[0.8125rem]'}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            세부내역
                          </button>
                          <span className="text-[var(--color-border-default)]">|</span>
                          {endRequested.has(l.id) ? (
                            <span className="text-[0.75rem] font-bold text-amber-700">종료 요청됨 (운영사 승인 대기)</span>
                          ) : (
                            <button
                              onClick={() => requestEnd(l.id, l.title)}
                              className="text-[0.8125rem] text-[var(--color-danger)] hover:underline transition-colors cursor-pointer"
                              style={{ background: 'transparent', border: 'none', padding: 0 }}
                            >
                              진행종료 요청
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3">
              <span className={DS.text.caption}>{filtered.length}건 중 {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className={`${DS.button.ghost} ${DS.button.sm} disabled:opacity-30`}>이전</button>
                <span className={DS.text.caption}>{safePage} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className={`${DS.button.ghost} ${DS.button.sm} disabled:opacity-30`}>다음</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 세부내역 우측 패널 — 별도 화면 이동 없음 (D0·D6) */}
      {detailTarget && (
        <DetailPane listingId={detailTarget} onClose={() => setDetailTarget(null)} />
      )}
    </MckPageShell>
  )
}
