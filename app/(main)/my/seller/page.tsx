'use client'

import { useState, useEffect } from 'react'
import { MARKETING_CHECKLIST, NPL_STATUSES, type ListingMarketing as MkRow } from '@/lib/marketing-checklist'
import Link from 'next/link'
import { Plus, Heart, Gavel, CheckCircle2, TrendingUp, Package, Download, Loader2, LayoutDashboard } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DS, { formatKRW } from '@/lib/design-system'
import { maskInstitutionName } from '@/lib/mask'
import { DetailPane } from '@/components/listing/detail-pane'
import { MckPageShell, MckPageHeader, MckTabBar } from '@/components/mck'
import { MyZoneTabs } from '@/components/my/my-zone-tabs'
import { MCK, MCK_FONTS, MCK_TYPE } from '@/lib/mck-design'

// Data hook for seller dashboard
interface SellerListing {
  id: string; title: string; claim_amount: number; ai_grade: string | null
  status: string; interest_count: number; view_count: number; created_at: string
  address: string   // 주소 상세 — 매각사 본인 매물이므로 마스킹 없이 표시
  /** Phase G7+ · 자발적 경매 진행 정보 (매물 row 에서 직접 파생) */
  bid_start_date: string | null
  bid_end_date: string | null
  min_bid_price: number | null
}

interface SettlementRecord {
  id: string
  settled_at: string
  listing_title: string
  deal_amount: number
  commission: number
  net_amount: number
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED'
}


function useSellerData() {
  const [listings, setListings] = useState<SellerListing[]>([])
  const [settlements, setSettlements] = useState<SettlementRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Use the correct listings endpoint (seller_id filter applied server-side via session)
        const r = await fetch('/api/v1/exchange/listings?limit=50&seller_id=me')
        const d = await r.json()
        if (d.data) setListings(d.data.map((l: Record<string, unknown>) => ({
          id: l.id as string,
          title: (l.title as string) || `매물 ${l.id}`,
          claim_amount: (l.principal_amount as number) || (l.claim_amount as number) || 0,
          ai_grade: l.risk_grade as string | null,
          status: l.status as string,
          interest_count: (l.interest_count as number) || 0,
          view_count: (l.view_count as number) || 0,
          created_at: l.created_at as string,
          // 본인 매물 — 전체 주소 우선 (마스킹은 공개 리스트에만 적용)
          address: (l.address as string) || [l.sido, l.sigungu, l.dong].filter(Boolean).join(' ') || '',
          // Phase G7+ · 자발적 경매 진행 정보
          bid_start_date: (l.bid_start_date as string) ?? null,
          bid_end_date:   (l.bid_end_date   as string) ?? null,
          min_bid_price:  (l.min_bid_price  as number) ?? null,
        })))
      } catch (e) {
        console.error(e)
      }

      try {
        const settleRes = await fetch('/api/v1/seller/settlements')
        const settleData = await settleRes.json()
        if (settleData.data?.length > 0) setSettlements(settleData.data)
      } catch {
        // settlements stays empty — empty state shown in UI
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  const activeCount = listings.filter(l => l.status === 'ACTIVE' || l.status === 'APPROVED').length
  const completedCount = listings.filter(l => l.status === 'SOLD' || l.status === 'COMPLETED').length
  const totalInterests = listings.reduce((s, l) => s + (l.interest_count || 0), 0)
  const totalViews = listings.reduce((s, l) => s + (l.view_count || 0), 0)
  // Phase G7+ · 진행 중인 자발적 경매 (종료일이 미래)
  const nowMs = Date.now()
  const liveAuctionCount = listings.filter(
    l => l.bid_end_date && new Date(l.bid_end_date).getTime() > nowMs,
  ).length

  // Billing stats derived from real settlements data
  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthSettlement = settlements
    .filter(s => s.status === 'COMPLETED' && s.settled_at?.startsWith(thisMonth))
    .reduce((sum, s) => sum + s.net_amount, 0)
  const totalSettlement = settlements
    .filter(s => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + s.net_amount, 0)
  const pendingSettlement = settlements
    .filter(s => s.status === 'PENDING')
    .reduce((sum, s) => sum + s.net_amount, 0)

  return {
    listings, settlements, loading,
    stats: { total: listings.length, active: activeCount, completed: completedCount, interests: totalInterests, views: totalViews, liveAuction: liveAuctionCount },
    billing: { monthSettlement, totalSettlement, pendingSettlement },
  }
}

const STATUS_MAP: Record<string, string> = {
  ACTIVE: '공개중', PENDING: '대기', SOLD: '완료', CANCELLED: '취소', DRAFT: '초안',
}

const formatClaim = (v: number) => v >= 100000000 ? `${(v / 100000000).toFixed(1)}억` : `${(v / 10000).toFixed(0)}만`
const STATUS_CLR: Record<string, string> = {
  '공개중': 'bg-stone-100/10 text-stone-900 border border-stone-300/20',
  '진행중': 'bg-stone-100/10 text-stone-900 border border-stone-300/20',
  '초안': 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]',
  '완료': 'bg-stone-100/10 text-stone-900 border border-stone-300/20',
}
const TABS = [
  { id: 'listings', label: '매물 관리' }, { id: 'analytics', label: '분석' },
  { id: 'billing', label: '정산 관리' }, { id: 'settings', label: '설정' },
]

// ─── Toggle helper component ──────────────────────────────────
function SellerSettingToggle({ id, label, desc, defaultOn }: { id: string; label: string; desc: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className={DS.text.bodyBold}>{label}</p>
        <p className={DS.text.caption + ' mt-0.5'}>{desc}</p>
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => setOn(prev => !prev)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-none border-2 border-transparent transition-colors duration-200 ease-in-out ${on ? 'bg-stone-100' : 'bg-[var(--color-surface-overlay)]'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-none bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${on ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export default function SellerDashboardPage() {
  const { listings: sellerListings, settlements, loading: sellerLoading, stats: sellerStats, billing } = useSellerData()
  const [tab, setTab] = useState('listings')

  // ── 마케팅 진행 · 반응 집계 (운영사 관리자에서 입력 → 여기 공유) ──
  const [marketing, setMarketing] = useState<Record<string, MkRow>>({})
  useEffect(() => {
    fetch('/api/v1/listing-marketing')
      .then(r => r.json())
      .then(d => { if (d?.data) setMarketing(d.data) })
      .catch(() => {})
  }, [])

  // ── 세부내역 우측 패널 (D0·D6) ──
  const [detailTarget, setDetailTarget] = useState<string | null>(null)

  // ── 진행종료 요청 — 운영사 관리자 접수함으로 접수, 승인 후 종료 ──
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
        description: `매각사가 매물 진행종료를 요청했습니다.\n매물: ${name}\nID: ${listingId}\n\n운영사 확인 후 매각의뢰 현황에서 거절(비활성화) 또는 매각완료 처리해주세요.`,
      }),
    }).catch(() => {})
  }

  // 매각사 직접 수정 — NPL 상태 (관리자와 동일 저장소)
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

  // ── 실매칭 엔진 v1 — 매입조건(지역·유형·금액대) 실제 대조 결과 ──
  const [matchMap, setMatchMap] = useState<Record<string, number>>({})
  useEffect(() => {
    fetch('/api/v1/matching/summary')
      .then(r => r.json())
      .then(d => { if (d?.data?.perListing) setMatchMap(d.data.perListing) })
      .catch(() => {})
  }, [])

  // Map real data to display format
  const STATS = [
    { label: '등록 매물', value: sellerStats.total, icon: Package, color: 'text-[#2251FF]' },
    { label: '진행 중 경매', value: sellerStats.liveAuction, icon: Gavel, color: 'text-stone-900' },
    { label: '관심 수신', value: sellerStats.interests, icon: Heart, color: 'text-stone-900' },
    { label: '완료 거래', value: sellerStats.completed, icon: CheckCircle2, color: 'text-[var(--color-positive)]' },
  ]
  const LISTINGS = sellerListings.map(l => ({
    id: l.id,
    name: l.title,
    address: l.address,
    claim: formatClaim(l.claim_amount),
    status: STATUS_MAP[l.status] || l.status,
    interests: l.interest_count || 0,
    date: l.created_at?.slice(0, 10) || '-',
  }))
  // Phase J · 매물 등록일 기준 월별 집계 차트 (실데이터 파생)
  const CHART = (() => {
    const monthlyMap = new Map<string, { views: number; interests: number }>()
    const now = new Date()
    // 최근 6개월 키 미리 생성 (빈 월에도 0 표시)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}월`
      monthlyMap.set(key, { views: 0, interests: 0 })
    }
    for (const l of sellerListings) {
      if (!l.created_at) continue
      const created = new Date(l.created_at)
      const monthsDiff = (now.getFullYear() - created.getFullYear()) * 12 + (now.getMonth() - created.getMonth())
      if (monthsDiff < 0 || monthsDiff > 5) continue
      const key = `${String(created.getMonth() + 1).padStart(2, '0')}월`
      const cur = monthlyMap.get(key) ?? { views: 0, interests: 0 }
      cur.views += l.view_count || 0
      cur.interests += l.interest_count || 0
      monthlyMap.set(key, cur)
    }
    return Array.from(monthlyMap.entries()).map(([month, v]) => ({ month, views: v.views, interests: v.interests }))
  })()
  const VISITORS = [
    { label: '총 매물 조회', value: `${sellerStats?.views ?? 0}회` },
    { label: '활성 매물', value: `${sellerStats?.active ?? 0}건` },
    { label: '총 관심', value: `${sellerStats?.interests ?? 0}건` },
    { label: '완료 거래', value: `${sellerStats?.completed ?? 0}건` },
  ]

  if (sellerLoading) {
    return (
      <MckPageShell variant="tint">
        <MckPageHeader
          breadcrumbs={[{ label: "마이", href: "/my" }, { label: "매각사 관리" }]}
          eyebrow="MY · SELLER"
          title="매각사 대시보드"
          subtitle="매물 관리·정산 데이터를 불러오고 있습니다."
        />
        <div className="max-w-[1280px] mx-auto" style={{ padding: "60px 24px", textAlign: "center", color: MCK.textMuted, fontSize: 12 }}>
          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" style={{ color: MCK.electric }} />
          매각사 데이터를 불러오는 중...
        </div>
      </MckPageShell>
    )
  }

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[{ label: "마이", href: "/my" }, { label: "매각사 관리" }]}
        eyebrow="MY · SELLER"
        title="매각사 대시보드"
        subtitle="등록한 매물 / 진행 중 경매 / 정산을 한 화면에서 관리합니다."
        actions={
          <div className="flex flex-wrap gap-5">
            {[
              ['등록 매물', `${sellerStats.total}건`],
              ['진행중', `${sellerStats.active}건`],
              ['완료', `${sellerStats.completed}건`],
              ['이번달 정산', billing.monthSettlement > 0 ? formatKRW(billing.monthSettlement) : '—'],
            ].map(([lbl, val]) => (
              <div key={lbl} style={{ textAlign: "right" }}>
                <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 2 }}>{lbl}</div>
                <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
        }
      />

      <MyZoneTabs zone="assets" />

      <MckTabBar
        eyebrow="SECTION"
        eyebrowIcon={<LayoutDashboard size={12} style={{ color: MCK.electric }} />}
        tabs={TABS.map(t => ({
          id: t.id,
          label: t.label,
          count: t.id === 'listings' ? sellerStats.total
                : t.id === 'billing' ? settlements.length
                : undefined,
        }))}
        active={tab}
        onChange={setTab}
      />

      <div className={DS.page.container + " py-6 " + DS.page.sectionGap}>
        {/* D4 — 주간 활동 요약 (주간 리포트 알림 = 이 요약의 발송본) */}
        {(() => {
          const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
          let nda7 = 0, interestTotal = 0, consultTotal = 0, mkDone = 0, mkAll = 0
          for (const l of sellerListings) {
            const mk = marketing[l.id]
            if (!mk) continue
            nda7 += (mk.nda_requests ?? []).filter(q => q.requested_at && new Date(q.requested_at).getTime() >= cutoff).length
            interestTotal += mk.interest_count ?? 0
            consultTotal += mk.consult_count ?? 0
            mkDone += MARKETING_CHECKLIST.filter(c => mk.checklist?.[c.key]).length
            mkAll += MARKETING_CHECKLIST.length
          }
          return (
            <div className="flex items-center justify-between gap-4 flex-wrap px-5 py-4" style={{ background: '#0A1628', borderTop: '3px solid #2251FF' }}>
              <div>
                <div className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: '#00A9F4' }}>주간 활동 요약</div>
                <div className="mt-1 text-sm font-extrabold" style={{ color: '#FFFFFF' }}>
                  NDA 요청 <span className="tabular-nums">+{nda7}</span> <span className="opacity-50 text-[11px] font-bold">(최근 7일)</span>
                  <span className="mx-2 opacity-40">·</span>
                  관심 누적 <span className="tabular-nums">{interestTotal}</span>
                  <span className="mx-2 opacity-40">·</span>
                  상담 누적 <span className="tabular-nums">{consultTotal}</span>
                  <span className="mx-2 opacity-40">·</span>
                  마케팅 <span className="tabular-nums">{mkDone}/{mkAll || MARKETING_CHECKLIST.length}</span> 진행
                </div>
              </div>
              <span className="text-[11px] font-bold" style={{ color: 'rgba(255,255,255,0.65)' }}>주간 리포트 알림과 동일 기준</span>
            </div>
          )
        })()}

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className={DS.stat.card}>
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <div className={DS.stat.value}>{s.value}</div>
              <div className={DS.stat.sub}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Listings Tab */}
        {tab === 'listings' && (
          <div className={DS.card.elevated + " " + DS.card.padding}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={DS.text.cardTitle}>등록 매물 현황</h2>
              <Link href="/exchange/sell">
                <button className={DS.button.accent + " " + DS.button.sm}>
                  <Plus className="h-3.5 w-3.5" />새 매물 등록
                </button>
              </Link>
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
                  {LISTINGS.map((l) => (
                    <tr key={l.id} className={DS.table.row}>
                      {/* 매물명 + 주소 상세 — 본인 매물이므로 마스킹 없이 표시 */}
                      <td className={DS.table.cell}>
                        <span className="font-medium">{l.name}</span>
                        <span className={"block text-[0.6875rem] text-[var(--color-text-muted)]"}>{l.address || l.id}</span>
                      </td>
                      <td className={DS.table.cell + " font-semibold tabular-nums"}>{l.claim}</td>
                      {/* 상태 — 진행중/협의중/매각완료 3개 중 하나만 (매각사 직접 수정) */}
                      <td className={DS.table.cell}>
                        <select
                          value={marketing[l.id]?.npl_status || '진행중'}
                          onChange={e => saveMk(l.id, { npl_status: e.target.value })}
                          className="px-2 py-1 text-[0.75rem] font-bold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
                          style={{ cursor: 'pointer' }}
                        >
                          {NPL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      {/* ── 매칭 매입사 (placeholder) + 마케팅 진행 (운영사 입력 실데이터) ── */}
                      {(() => {
                        // 실매칭 값 우선 — 매입조건 실데이터가 있으면 그 결과, 없으면 placeholder
                        const seed = String(l.id).split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
                        const real = matchMap[l.id]
                        const matched = typeof real === 'number' ? real : ((seed + 210) % 30) + 15
                        const isReal = typeof real === 'number'
                        const mk = marketing[l.id]
                        const done = MARKETING_CHECKLIST.filter(c => mk?.checklist?.[c.key])
                        return (
                          <>
                            <td className={DS.table.cell}>
                              <div className="min-w-[92px]">
                                <div className="flex items-baseline gap-1">
                                  <b className="text-lg tabular-nums text-[var(--color-text-primary)]">{matched}</b>
                                  <span className="text-[0.6875rem] text-[var(--color-text-muted)]">개사</span>
                                </div>
                                <span className="block text-[0.625rem] text-[var(--color-text-muted)]">
                                  매입조건 일치{isReal ? ' · 실시간' : ''}
                                </span>
                                {/* 매칭 상세 링크 삭제 (2026-08-18 사용자 지시) */}
                              </div>
                            </td>
                            <td className={DS.table.cell}>
                              <div className="min-w-[250px] space-y-1.5">
                                {/* 매칭 등록일 — 운영사가 매칭 진행 시 자동 기록 (읽기 전용) */}
                                {mk?.matched_at && (
                                  <div className="text-[0.6875rem]">
                                    <span className="text-[var(--color-text-muted)]">매칭 등록일 </span>
                                    <b className="tabular-nums text-[var(--color-text-primary)]">{mk.matched_at}</b>
                                    <span className="ml-1 text-[0.625rem] text-[var(--color-text-muted)]">(운영사 자동 기록)</span>
                                  </div>
                                )}
                                {/* 딜 진행 단계 — 운영사가 등록·수정 (관심등록→실사진행→가격협의→최종계약) */}
                                {mk?.deal_stage ? (
                                  <div className="text-[0.6875rem]">
                                    <span className="text-[var(--color-text-muted)]">진행 단계 </span>
                                    <b className="px-1.5 py-0.5 text-white text-[0.625rem]" style={{ background: '#0A1628' }}>{mk.deal_stage}</b>
                                  </div>
                                ) : null}
                                {/* 반응 집계 — 자동 연동 (관심·NDA) + 운영사 입력 (상담) */}
                                <div className="flex items-center gap-3 text-[0.6875rem]">
                                  <span className="text-[var(--color-text-muted)]">관심 <b className="tabular-nums text-[var(--color-text-primary)]">{mk?.interest_count ?? 0}</b></span>
                                  <span className="text-[var(--color-text-muted)]">NDA 요청 <b className="tabular-nums text-[var(--color-text-primary)]">{mk?.nda_requests?.length ?? mk?.nda_count ?? 0}</b></span>
                                  <span className="text-[var(--color-text-muted)]">상담 진행 <b className="tabular-nums text-[var(--color-text-primary)]">{mk?.consult_count ?? 0}</b></span>
                                </div>
                                {/* NDA 진행상황 — 운영사 검토/승인/거절 (관리자 승인과 실시간 공유) */}
                                {(mk?.nda_requests ?? []).length > 0 && (
                                  <div className="space-y-0.5">
                                    {(mk?.nda_requests ?? []).map(q => (
                                      <div key={q.id} className="flex items-center gap-1.5 text-[0.6563rem]">
                                        <span
                                          className="px-1.5 py-0.5 font-bold text-[0.5938rem] whitespace-nowrap"
                                          style={{
                                            color: q.status === '승인' ? '#047857' : q.status === '거절' ? '#9F1239' : '#A53F00',
                                            background: q.status === '승인' ? 'rgba(16,185,129,0.10)' : q.status === '거절' ? 'rgba(225,29,72,0.10)' : 'rgba(255,140,0,0.10)',
                                            border: `1px solid ${q.status === '승인' ? 'rgba(16,185,129,0.35)' : q.status === '거절' ? 'rgba(225,29,72,0.35)' : 'rgba(255,140,0,0.35)'}`,
                                          }}
                                        >
                                          {q.status}
                                        </span>
                                        <span className="text-[var(--color-text-muted)]">
                                          {q.signer || '무기명'} · {q.requested_at?.slice(5, 10)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* 마케팅 체크리스트 진행 상태 */}
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
                          </>
                        )
                      })()}
                      <td className={DS.table.cellMuted + " tabular-nums"}>{l.date}</td>
                      <td className={DS.table.cell}>
                        <div className="flex items-center gap-1.5">
                          {/* 세부내역 = NPL 상세정보 (탬플릿) — 우측 패널에서 수정 (D0·D6) */}
                          <button
                            onClick={() => setDetailTarget(l.id)}
                            className={DS.text.link + " text-[0.8125rem]"}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            세부내역
                          </button>
                          <span className="text-[var(--color-border-default)]">|</span>
                          {/* 진행종료 요청 — 운영사 관리자 접수함에서 승인 후 종료 */}
                          {endRequested.has(l.id) ? (
                            <span className="text-[0.75rem] font-bold text-amber-700">종료 요청됨 (운영사 승인 대기)</span>
                          ) : (
                            <button
                              onClick={() => requestEnd(l.id, l.name)}
                              className="text-[0.8125rem] text-[var(--color-danger)] hover:underline transition-colors cursor-pointer"
                              style={{ background: 'transparent', border: 'none', padding: 0 }}
                            >
                              진행종료 요청
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <div className={DS.page.sectionGap}>
            <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
              <h2 className={DS.text.cardTitle + " mb-4"}>매물별 조회수 / 관심수</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={CHART} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, color: 'var(--color-text-primary)' }} />
                  <Bar dataKey="views" fill="#2251FF" radius={[4, 4, 0, 0]} name="조회수" />
                  <Bar dataKey="interests" fill="#ec4899" radius={[4, 4, 0, 0]} name="관심수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {VISITORS.map((v) => (
                <div key={v.label} className={DS.stat.card}>
                  <div className={DS.stat.value}>{v.value}</div>
                  <div className={DS.stat.sub}>{v.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Billing Tab */}
        {tab === 'billing' && (
          <div className="space-y-5">
            {/* Settlement Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: '이번 달 정산 예정', value: billing.monthSettlement > 0 ? formatKRW(billing.monthSettlement) : '—', sub: '완료 기준', color: 'text-[var(--color-positive)]' },
                { label: '누적 정산 완료', value: billing.totalSettlement > 0 ? formatKRW(billing.totalSettlement) : '—', sub: '전체 기간', color: 'text-[var(--color-text-primary)]' },
                { label: '미지급 금액', value: billing.pendingSettlement > 0 ? formatKRW(billing.pendingSettlement) : '—', sub: '정산 대기 중', color: 'text-stone-900' },
              ].map(c => (
                <div key={c.label} className={DS.stat.card}>
                  <div className={DS.stat.value + ' ' + c.color}>{c.value}</div>
                  <div className={DS.stat.label}>{c.label}</div>
                  <div className={DS.text.captionLight + ' mt-1'}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Settlement History Table */}
            <div className={DS.card.elevated + ' ' + DS.card.padding}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={DS.text.cardTitle}>정산 내역</h2>
                <button className={DS.button.secondary + ' ' + DS.button.sm}>
                  <Download className="h-3.5 w-3.5" /> 내보내기
                </button>
              </div>
              <div className={DS.table.wrapper}>
                <table className="w-full">
                  <thead>
                    <tr className={DS.table.header}>
                      <th className={DS.table.headerCell}>정산일</th>
                      <th className={DS.table.headerCell}>매물명</th>
                      <th className={DS.table.headerCell}>거래금액</th>
                      <th className={DS.table.headerCell}>수수료</th>
                      <th className={DS.table.headerCell}>정산액</th>
                      <th className={DS.table.headerCell}>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-sm text-[var(--color-text-muted)]">
                          정산 내역이 없습니다.
                        </td>
                      </tr>
                    )}
                    {settlements.map((row, i) => {
                      const statusLabel = row.status === 'COMPLETED' ? '완료' : row.status === 'PENDING' ? '대기' : '취소'
                      const statusCls = row.status === 'COMPLETED' ? 'bg-stone-100/10 text-stone-900 border border-stone-300/20'
                        : row.status === 'CANCELLED' ? 'bg-stone-100/10 text-stone-900 border border-stone-300/20'
                        : 'bg-stone-100/10 text-stone-900 border border-stone-300/20'
                      const fmtKRW = (v: number) => `₩${v.toLocaleString()}`
                      return (
                        <tr key={row.id ?? i} className={DS.table.row}>
                          <td className={DS.table.cellMuted + ' tabular-nums'}>{row.settled_at?.slice(0, 10) || '-'}</td>
                          <td className={DS.table.cell + ' font-medium'}>{row.listing_title}</td>
                          <td className={DS.table.cell + ' tabular-nums'}>{fmtKRW(row.deal_amount)}</td>
                          <td className={DS.table.cellMuted + ' tabular-nums text-[var(--color-danger)]'}>-{fmtKRW(row.commission)}</td>
                          <td className={DS.table.cell + ' tabular-nums font-semibold text-[var(--color-positive)]'}>{fmtKRW(row.net_amount)}</td>
                          <td className={DS.table.cell}>
                            <span className={`text-[0.6875rem] px-2 py-0.5 rounded-none font-bold ${statusCls}`}>{statusLabel}</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bank Account Info */}
            <div className={DS.card.elevated + ' ' + DS.card.padding}>
              <h2 className={DS.text.cardTitle + ' mb-3'}>정산 계좌 정보</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: '은행', value: '신한은행' },
                  { label: '계좌번호', value: '110-***-*****' },
                  { label: '예금주', value: '(주)한국자산신탁' },
                ].map(f => (
                  <div key={f.label}>
                    <p className={DS.text.caption}>{f.label}</p>
                    <p className={DS.text.bodyBold}>{f.value}</p>
                  </div>
                ))}
              </div>
              <button className={DS.button.secondary + ' mt-4 ' + DS.button.sm}>계좌 변경 요청</button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="space-y-5">
            <div className={DS.card.elevated + ' ' + DS.card.padding + ' space-y-4'}>
              <h2 className={DS.text.cardTitle}>매물 공개 설정</h2>
              {[
                { id: 'auto_approve', label: '신규 관심 자동 승인', desc: '매입사의 관심 신청을 자동으로 수락합니다', defaultOn: true },
                { id: 'show_price', label: '가격 공개', desc: '채권 금액을 목록에서 공개합니다', defaultOn: true },
                { id: 'show_contact', label: '연락처 공개 (L1 이상)', desc: 'L1 이상 투자자에게 담당자 연락처를 공개합니다', defaultOn: false },
                { id: 'allow_negotiation', label: '가격 협상 허용', desc: '매입사의 가격 협상 요청을 허용합니다', defaultOn: true },
              ].map(s => (
                <SellerSettingToggle key={s.id} {...s} />
              ))}
            </div>

            <div className={DS.card.elevated + ' ' + DS.card.padding + ' space-y-4'}>
              <h2 className={DS.text.cardTitle}>알림 설정</h2>
              {[
                { id: 'notif_interest', label: '관심 수신 알림', desc: '매입사가 매물에 관심을 등록하면 알림을 받습니다', defaultOn: true },
                { id: 'notif_inquiry', label: '문의 알림', desc: '매입사가 문의를 남기면 알림을 받습니다', defaultOn: true },
                { id: 'notif_deal', label: '거래 진행 알림', desc: '거래 단계가 변경될 때 알림을 받습니다', defaultOn: true },
                { id: 'notif_settlement', label: '정산 알림', desc: '정산 처리 시 이메일·SMS를 받습니다', defaultOn: true },
              ].map(s => (
                <SellerSettingToggle key={s.id} {...s} />
              ))}
            </div>

            <div className={DS.card.elevated + ' ' + DS.card.padding}>
              <h2 className={DS.text.cardTitle + ' mb-3'}>사업자 정보</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: '법인명', value: '(주)한국자산신탁AMC' },
                  { label: '사업자등록번호', value: '123-**-*****' },
                  { label: '담당자', value: '김관리' },
                  { label: '연락처', value: '02-****-****' },
                ].map(f => (
                  <div key={f.label}>
                    <p className={DS.text.caption}>{f.label}</p>
                    <p className={DS.text.bodyBold}>{f.value}</p>
                  </div>
                ))}
              </div>
              <button className={DS.button.secondary + ' mt-4 ' + DS.button.sm}>정보 수정 요청</button>
            </div>
          </div>
        )}
      </div>

      {/* 세부내역 우측 패널 — 별도 화면 이동 없이 확인·수정 (D0·D6) */}
      {detailTarget && (
        <DetailPane listingId={detailTarget} onClose={() => setDetailTarget(null)} />
      )}
    </MckPageShell>
  )
}
