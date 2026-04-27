'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  MapPin, Building2, Plus, Target, Search, Users, DollarSign,
  ArrowUpRight, X, Sparkles, Loader2, ChevronLeft, ChevronRight,
  AlertCircle, LayoutGrid, List, Zap, Flame, TrendingUp, Clock,
} from 'lucide-react'
import { COLLATERAL_OPTIONS, REGIONS } from '@/lib/taxonomy'
import { CommaNumberInput } from '@/components/ui/comma-number-input'
import {
  MckPageShell, MckPageHeader, MckKpiGrid, MckCard, MckEmptyState,
  MckDemoBanner, MckBadge,
} from '@/components/mck'
import { MCK, MCK_FONTS, MCK_TYPE, formatKRW } from '@/lib/mck-design'
import { OwnerEditButton } from '@/components/edit/owner-edit-button'

/* ═══════════════════════════════════════════════════════════
   Types
═══════════════════════════════════════════════════════════ */
type Urgency = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'

interface Demand {
  id: string
  collateral_types: string[]
  regions: string[]
  min_amount: number
  max_amount: number
  urgency: Urgency
  memo: string
  matching_count: number
  created_at: string
}

interface DemandsResponse {
  data: Demand[]
  total: number
  page: number
  limit: number
  total_pages: number
}

/* ═══════════════════════════════════════════════════════════
   Urgency mapping — McKinsey 차분 톤
═══════════════════════════════════════════════════════════ */
const URGENCY_MAP: Record<Urgency, {
  label: string
  tone: 'danger' | 'warning' | 'blue' | 'neutral'
  color: string
  icon: typeof Flame
}> = {
  URGENT: { label: '긴급', tone: 'danger',  color: MCK.danger,   icon: Flame },
  HIGH:   { label: '높음', tone: 'warning', color: MCK.warning,  icon: TrendingUp },
  MEDIUM: { label: '보통', tone: 'blue',    color: MCK.blue,     icon: Clock },
  LOW:    { label: '낮음', tone: 'neutral', color: MCK.textMuted, icon: Clock },
}

const COLLATERAL_FILTER_OPTIONS = COLLATERAL_OPTIONS.filter(o => o.value !== 'ALL').map(o => o.label)
const REGION_OPTIONS = REGIONS.map(r => r.short)
const PER_PAGE = 12

/* ═══════════════════════════════════════════════════════════
   Sample fallback
═══════════════════════════════════════════════════════════ */
const SAMPLE_DEMANDS: Demand[] = [
  {
    id: 'demo-demand-001',
    collateral_types: ['아파트', '오피스텔(주거)'],
    regions: ['서울 강남구', '서울 서초구'],
    min_amount: 500_000_000,
    max_amount: 2_000_000_000,
    urgency: 'HIGH',
    memo: '서울 강남권 주거용 NPL — 할인율 25% 이상, 선순위 근저당 선호. 빠른 클로징 가능합니다.',
    matching_count: 3,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: 'demo-demand-002',
    collateral_types: ['근린시설/상가'],
    regions: ['경기 성남시', '경기 수원시'],
    min_amount: 800_000_000,
    max_amount: 3_500_000_000,
    urgency: 'MEDIUM',
    memo: '수도권 상가 NPL 관심. 임대차 현황 명확한 건 우선. 포트폴리오 투자 가능.',
    matching_count: 5,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'demo-demand-003',
    collateral_types: ['토지'],
    regions: ['경기', '충청'],
    min_amount: 200_000_000,
    max_amount: 1_000_000_000,
    urgency: 'LOW',
    memo: '개발 가능성 있는 토지 NPL 장기 투자. 할인율 높은 물건 선호.',
    matching_count: 2,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
]

/* ═══════════════════════════════════════════════════════════
   Format date
═══════════════════════════════════════════════════════════ */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

/* ═══════════════════════════════════════════════════════════
   Skeleton card
═══════════════════════════════════════════════════════════ */
function CardSkeleton() {
  return (
    <div
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        borderTop: `2px solid ${MCK.brass}`,
        padding: 22,
      }}
      className="animate-pulse"
    >
      <div className="flex items-center gap-2 mb-4">
        <div style={{ height: 16, width: 56, background: MCK.paperDeep }} />
        <div style={{ height: 16, width: 40, background: MCK.paperDeep }} />
      </div>
      <div style={{ height: 22, width: '75%', background: MCK.paperDeep, marginBottom: 12 }} />
      <div className="flex gap-2 mb-3">
        <div style={{ height: 22, width: 64, background: MCK.paperDeep }} />
        <div style={{ height: 22, width: 64, background: MCK.paperDeep }} />
      </div>
      <div style={{ height: 14, width: '50%', background: MCK.paperDeep, marginBottom: 12 }} />
      <div style={{ height: 14, width: '100%', background: MCK.paperDeep, marginBottom: 8 }} />
      <div style={{ height: 14, width: '66%', background: MCK.paperDeep }} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   Main Page
═══════════════════════════════════════════════════════════ */
export default function DemandsPage() {
  const [demands, setDemands] = useState<Demand[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | ''>('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formCollateral, setFormCollateral] = useState<string[]>([])
  const [formRegions, setFormRegions] = useState<string[]>([])
  const [formMinAmount, setFormMinAmount] = useState('')
  const [formMaxAmount, setFormMaxAmount] = useState('')
  const [formUrgency, setFormUrgency] = useState<Urgency>('MEDIUM')
  const [formMemo, setFormMemo] = useState('')
  const [matchingId, setMatchingId] = useState<string | null>(null)

  const fetchDemands = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PER_PAGE) })
      if (urgencyFilter) params.set('urgency', urgencyFilter)
      const res = await fetch(`/api/v1/exchange/demands?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: DemandsResponse = await res.json()
      setDemands(json.data)
      setTotal(json.total)
      setTotalPages(json.total_pages)
      setIsDemo(false)
    } catch {
      setDemands(SAMPLE_DEMANDS)
      setTotal(SAMPLE_DEMANDS.length)
      setTotalPages(1)
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }, [page, urgencyFilter])

  useEffect(() => { fetchDemands() }, [fetchDemands])

  const handleSubmit = async () => {
    if (formCollateral.length === 0) {
      alert('담보 유형을 하나 이상 선택해주세요.'); return
    }
    if (formRegions.length === 0) {
      alert('지역을 하나 이상 선택해주세요.'); return
    }
    const minAmt = Number(formMinAmount) || 0
    const maxAmt = Number(formMaxAmount) || 0
    if (maxAmt > 0 && minAmt > maxAmt) {
      alert('최소 금액이 최대 금액보다 클 수 없습니다.'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/exchange/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collateral_types: formCollateral,
          regions: formRegions,
          min_amount: minAmt,
          max_amount: maxAmt,
          urgency: formUrgency,
          memo: formMemo,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = (data as { error?: { message?: string } })?.error?.message ?? `수요 등록 실패 (HTTP ${res.status})`
        throw new Error(msg)
      }
      setShowModal(false)
      resetForm()
      setPage(1)
      fetchDemands()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Demand submit] error:', err)
      alert(err instanceof Error ? err.message : '수요 등록에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormCollateral([])
    setFormRegions([])
    setFormMinAmount('')
    setFormMaxAmount('')
    setFormUrgency('MEDIUM')
    setFormMemo('')
  }

  const runMatching = async (demandId: string) => {
    setMatchingId(demandId)
    try {
      const res = await fetch('/api/v1/matching/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demand_id: demandId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = (data as { error?: { message?: string } })?.error?.message ?? `HTTP ${res.status}`
        throw new Error(msg)
      }
      fetchDemands()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[AI matching] error:', err)
      alert(`AI 매칭 실행에 실패했습니다.${err instanceof Error ? `\n(${err.message})` : ''}`)
    } finally {
      setMatchingId(null)
    }
  }

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  // ── KPI items ────────────────────────────────────────────────
  const urgentCount = demands.filter(d => d.urgency === 'URGENT' || d.urgency === 'HIGH').length
  const avgAmount = demands.length === 0
    ? 0
    : Math.round(demands.reduce((s, d) => s + (d.min_amount + d.max_amount) / 2, 0) / demands.length)

  const kpiItems = [
    { label: '등록된 수요', value: loading ? '—' : `${total}건`, hint: 'Buyer Demand' },
    { label: '긴급 수요', value: loading ? '—' : `${urgentCount}건`, hint: 'URGENT · HIGH' },
    { label: '평균 희망가', value: loading || demands.length === 0 ? '—' : formatKRW(avgAmount), hint: 'AVG mid-band' },
  ]

  // ── Header actions ───────────────────────────────────────────
  const headerActions = (
    <button
      onClick={() => setShowModal(true)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 22px',
        background: MCK.ink,
        color: MCK.paper,
        border: 'none',
        borderTop: `2.5px solid ${MCK.brass}`,
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        boxShadow: '0 6px 20px rgba(10,22,40,0.18)',
      }}
    >
      <Plus size={14} />
      수요 등록
    </button>
  )

  return (
    <MckPageShell variant="tint">
      {isDemo && <MckDemoBanner message="체험 모드 — 샘플 매수 수요 데이터를 표시 중입니다." />}

      <MckPageHeader
        breadcrumbs={[
          { label: '거래소', href: '/exchange' },
          { label: '매수 수요' },
        ]}
        eyebrow="BUYER DEMAND BOARD"
        title="매수 수요"
        subtitle="매수 의향이 있는 투자자들의 NPL 매수 조건을 확인하고 직접 제안을 보내세요"
        actions={headerActions}
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: '32px 24px 64px' }}>
        {/* Quick links */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <Link
            href="/exchange/sell"
            style={{
              fontSize: 12, fontWeight: 700, color: MCK.brassDark,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              textDecoration: 'none', borderBottom: `1px solid ${MCK.brass}`,
              paddingBottom: 2,
            }}
          >
            매물 등록 →
          </Link>
          <Link
            href="/deals/matching"
            style={{
              fontSize: 12, fontWeight: 700, color: MCK.brassDark,
              letterSpacing: '0.04em', textTransform: 'uppercase',
              textDecoration: 'none', borderBottom: `1px solid ${MCK.brass}`,
              paddingBottom: 2,
            }}
          >
            AI 매칭 결과 →
          </Link>
        </div>

        {/* KPI grid — McKinsey Deep Navy variant (매물 탐색 대시보드와 동일 톤) */}
        <div style={{ marginBottom: 32 }}>
          <MckKpiGrid variant="dark" items={kpiItems} />
        </div>

        {/* Filter bar */}
        <div
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...MCK_TYPE.label, color: MCK.textSub }}>긴급도</span>
            {(['', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map(u => {
              const active = urgencyFilter === u
              return (
                <button
                  key={u || 'ALL'}
                  onClick={() => { setUrgencyFilter(u as Urgency | ''); setPage(1) }}
                  style={{
                    padding: '6px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    background: active ? MCK.ink : MCK.paperTint,
                    color: active ? MCK.paper : MCK.textSub,
                    border: `1px solid ${active ? MCK.ink : MCK.border}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {u ? URGENCY_MAP[u].label : '전체'}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: MCK.textMuted, fontWeight: 600 }}>{total}건</span>
            {/* View toggle */}
            <div style={{ display: 'flex', border: `1px solid ${MCK.border}`, overflow: 'hidden' }}>
              <button
                onClick={() => setViewMode('card')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', fontSize: 11, fontWeight: 700,
                  background: viewMode === 'card' ? MCK.ink : MCK.paper,
                  color: viewMode === 'card' ? MCK.paper : MCK.textSub,
                  border: 'none', cursor: 'pointer',
                }}
              >
                <LayoutGrid size={12} /> 카드
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', fontSize: 11, fontWeight: 700,
                  background: viewMode === 'list' ? MCK.ink : MCK.paper,
                  color: viewMode === 'list' ? MCK.paper : MCK.textSub,
                  border: 'none', cursor: 'pointer',
                  borderLeft: `1px solid ${MCK.border}`,
                }}
              >
                <List size={12} /> 리스트
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <MckEmptyState
            icon={AlertCircle}
            title="데이터를 불러올 수 없습니다"
            description={error}
            actionLabel="다시 시도"
            onActionClick={fetchDemands}
            variant="error"
          />
        ) : demands.length === 0 ? (
          <MckEmptyState
            icon={Search}
            title="등록된 수요가 없습니다"
            description="첫 번째 매수 수요를 등록하고 AI 매칭을 받아보세요"
            actionLabel="수요 등록하기"
            onActionClick={() => setShowModal(true)}
          />
        ) : viewMode === 'list' ? (
          /* ── LIST VIEW ── */
          <div
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.brass}`,
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: MCK.paperTint, borderBottom: `1px solid ${MCK.border}` }}>
                    {['긴급도', '담보 유형', '지역', '희망 금액 범위', '매칭', '등록일', '액션'].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 14px',
                          textAlign: 'left',
                          ...MCK_TYPE.label,
                          color: MCK.textSub,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {demands.map(d => {
                    const urg = URGENCY_MAP[d.urgency]
                    return (
                      <tr key={d.id} style={{ borderBottom: `1px solid ${MCK.border}` }}>
                        <td style={{ padding: '14px' }}>
                          <MckBadge tone={urg.tone}>{urg.label}</MckBadge>
                        </td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {d.collateral_types.slice(0, 3).map(ct => (
                              <span
                                key={ct}
                                style={{
                                  display: 'inline-flex', alignItems: 'center',
                                  padding: '2px 6px', fontSize: 10, fontWeight: 700,
                                  color: MCK.brassDark,
                                  background: 'rgba(184, 146, 75, 0.10)',
                                  border: `1px solid ${MCK.brass}33`,
                                }}
                              >
                                {ct}
                              </span>
                            ))}
                            {d.collateral_types.length > 3 && (
                              <span style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 600 }}>
                                +{d.collateral_types.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} style={{ color: MCK.brassDark }} />
                            <span style={{ fontSize: 12, color: MCK.textSub }}>
                              {d.regions.slice(0, 4).join(', ')}{d.regions.length > 4 ? ` +${d.regions.length - 4}` : ''}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '14px' }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: MCK.ink, fontVariantNumeric: 'tabular-nums' }}>
                            {formatKRW(d.min_amount)} ~ {formatKRW(d.max_amount)}
                          </span>
                        </td>
                        <td style={{ padding: '14px' }}>
                          {d.matching_count > 0
                            ? <MckBadge tone="positive">{d.matching_count}건</MckBadge>
                            : <span style={{ color: MCK.textMuted, fontSize: 12 }}>-</span>}
                        </td>
                        <td style={{ padding: '14px', fontSize: 12, color: MCK.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                          {formatDate(d.created_at)}
                        </td>
                        <td style={{ padding: '14px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => runMatching(d.id)}
                              disabled={matchingId === d.id}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '5px 10px', fontSize: 11, fontWeight: 700,
                                background: MCK.paperTint,
                                color: MCK.ink,
                                border: `1px solid ${MCK.border}`,
                                cursor: matchingId === d.id ? 'wait' : 'pointer',
                                opacity: matchingId === d.id ? 0.6 : 1,
                              }}
                            >
                              {matchingId === d.id ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                              매칭
                            </button>
                            <Link
                              href={`/exchange/demands/${d.id}`}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '5px 10px', fontSize: 11, fontWeight: 700,
                                background: MCK.ink, color: MCK.paper,
                                borderTop: `2px solid ${MCK.brass}`,
                                textDecoration: 'none',
                              }}
                            >
                              상세 <ArrowUpRight size={11} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── CARD VIEW ── */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {demands.map(d => (
                <DemandCard
                  key={d.id}
                  demand={d}
                  onRunMatching={runMatching}
                  matching={matchingId === d.id}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 40 }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{
                    width: 36, height: 36,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: MCK.paper, border: `1px solid ${MCK.border}`,
                    color: MCK.ink, cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    opacity: page <= 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('dots')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === 'dots' ? (
                      <span key={`dots-${i}`} style={{ color: MCK.textMuted, padding: '0 4px' }}>...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        style={{
                          width: 36, height: 36, fontSize: 13, fontWeight: 700,
                          background: p === page ? MCK.ink : MCK.paper,
                          color: p === page ? MCK.paper : MCK.textSub,
                          border: `1px solid ${p === page ? MCK.ink : MCK.border}`,
                          cursor: 'pointer',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{
                    width: 36, height: 36,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: MCK.paper, border: `1px solid ${MCK.border}`,
                    color: MCK.ink, cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: page >= totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Notice */}
        <div
          style={{
            marginTop: 48,
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderLeft: `3px solid ${MCK.brass}`,
            padding: '16px 20px',
          }}
        >
          <p style={{ ...MCK_TYPE.label, color: MCK.brassDark, marginBottom: 6 }}>이용 안내</p>
          <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.6 }}>
            매수 수요 게시판은 NPL 투자자가 매수 조건을 공개하고 매도자의 제안을 받는 서비스입니다.
            게시된 정보는 참고용이며 실제 거래 조건은 당사자 간 협의에 따릅니다.
          </p>
        </div>
      </div>

      {/* ── Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(10, 22, 40, 0.6)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: MCK.paper,
                borderTop: `3px solid ${MCK.brass}`,
                width: '100%', maxWidth: 560,
                maxHeight: '90vh', overflowY: 'auto',
                padding: 28,
                boxShadow: '0 20px 60px rgba(10, 22, 40, 0.40)',
              }}
            >
              {/* Modal header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontFamily: MCK_FONTS.serif, ...MCK_TYPE.h2, color: MCK.ink }}>
                  매수 수요 등록
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    width: 32, height: 32,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: MCK.textSub,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Collateral multi-select */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ ...MCK_TYPE.label, color: MCK.textSub, display: 'block', marginBottom: 8 }}>
                  담보 유형 (복수 선택)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {COLLATERAL_FILTER_OPTIONS.map(opt => {
                    const active = formCollateral.includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleItem(formCollateral, opt, setFormCollateral)}
                        style={{
                          padding: '6px 10px', fontSize: 11, fontWeight: 700,
                          background: active ? MCK.ink : MCK.paperTint,
                          color: active ? MCK.paper : MCK.textSub,
                          border: `1px solid ${active ? MCK.ink : MCK.border}`,
                          cursor: 'pointer',
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
                {formCollateral.length === 0 && (
                  <p style={{ fontSize: 11, color: MCK.danger, marginTop: 6 }}>최소 1개 선택 필요</p>
                )}
              </div>

              {/* Region multi-select */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ ...MCK_TYPE.label, color: MCK.textSub, display: 'block', marginBottom: 8 }}>
                  지역 (복수 선택)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {REGION_OPTIONS.map(opt => {
                    const active = formRegions.includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleItem(formRegions, opt, setFormRegions)}
                        style={{
                          padding: '6px 10px', fontSize: 11, fontWeight: 700,
                          background: active ? MCK.ink : MCK.paperTint,
                          color: active ? MCK.paper : MCK.textSub,
                          border: `1px solid ${active ? MCK.ink : MCK.border}`,
                          cursor: 'pointer',
                        }}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
                {formRegions.length === 0 && (
                  <p style={{ fontSize: 11, color: MCK.danger, marginTop: 6 }}>최소 1개 선택 필요</p>
                )}
              </div>

              {/* Amount range */}
              <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
                <div>
                  <label style={{ ...MCK_TYPE.label, color: MCK.textSub, display: 'block', marginBottom: 8 }}>
                    최소 금액 (원)
                  </label>
                  <CommaNumberInput
                    placeholder="100,000,000"
                    value={formMinAmount}
                    onChange={setFormMinAmount}
                    className="w-full"
                    style={{
                      padding: '10px 12px',
                      border: `1px solid ${MCK.border}`,
                      background: MCK.paper,
                      fontSize: 13,
                      color: MCK.ink,
                    }}
                  />
                  <p style={{ fontSize: 11, color: MCK.textMuted, marginTop: 4 }}>예: 1억 = 100,000,000</p>
                </div>
                <div>
                  <label style={{ ...MCK_TYPE.label, color: MCK.textSub, display: 'block', marginBottom: 8 }}>
                    최대 금액 (원)
                  </label>
                  <CommaNumberInput
                    placeholder="500,000,000"
                    value={formMaxAmount}
                    onChange={setFormMaxAmount}
                    className="w-full"
                    style={{
                      padding: '10px 12px',
                      border: `1px solid ${MCK.border}`,
                      background: MCK.paper,
                      fontSize: 13,
                      color: MCK.ink,
                    }}
                  />
                </div>
              </div>

              {/* Urgency */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ ...MCK_TYPE.label, color: MCK.textSub, display: 'block', marginBottom: 8 }}>
                  긴급도
                </label>
                <select
                  value={formUrgency}
                  onChange={e => setFormUrgency(e.target.value as Urgency)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${MCK.border}`,
                    background: MCK.paper,
                    fontSize: 13,
                    color: MCK.ink,
                  }}
                >
                  <option value="URGENT">긴급</option>
                  <option value="HIGH">높음</option>
                  <option value="MEDIUM">보통</option>
                  <option value="LOW">낮음</option>
                </select>
              </div>

              {/* Memo */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ ...MCK_TYPE.label, color: MCK.textSub, display: 'block', marginBottom: 8 }}>
                  메모
                </label>
                <textarea
                  rows={3}
                  placeholder="매수 조건, 선호 물건 유형 등을 자유롭게 기재해 주세요"
                  value={formMemo}
                  onChange={e => setFormMemo(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${MCK.border}`,
                    background: MCK.paper,
                    fontSize: 13,
                    color: MCK.ink,
                    resize: 'none',
                    fontFamily: MCK_FONTS.sans,
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: MCK.paper,
                    color: MCK.ink,
                    border: `1px solid ${MCK.border}`,
                    fontSize: 13, fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || formCollateral.length === 0 || formRegions.length === 0}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 22px',
                    background: MCK.ink,
                    color: MCK.paper,
                    border: 'none',
                    borderTop: `2px solid ${MCK.brass}`,
                    fontSize: 13, fontWeight: 800,
                    cursor: submitting ? 'wait' : 'pointer',
                    opacity: (submitting || formCollateral.length === 0 || formRegions.length === 0) ? 0.5 : 1,
                  }}
                >
                  {submitting ? (
                    <><Loader2 size={14} className="animate-spin" /> 등록 중...</>
                  ) : (
                    <><Plus size={14} /> 수요 등록</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MckPageShell>
  )
}

/* ═══════════════════════════════════════════════════════════
   DemandCard — 자발적 경매 BidCard 톤 정합 (McKinsey 화이트 페이퍼 + Deep Navy 임팩트 패널)
═══════════════════════════════════════════════════════════ */
function DemandCard({
  demand: d,
  onRunMatching,
  matching,
}: {
  demand: Demand
  onRunMatching: (id: string) => void
  matching: boolean
}) {
  const urg = URGENCY_MAP[d.urgency]
  const UrgIcon = urg.icon
  const hasMatches = d.matching_count > 0
  const avg = Math.round((d.min_amount + d.max_amount) / 2)
  const ageDays = Math.max(0, Math.floor((Date.now() - new Date(d.created_at).getTime()) / 86400000))
  const isUrgent = d.urgency === 'URGENT'

  return (
    <article
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        // 자발적 경매와 동일 — urgent 도 monochromatic ink, 그 외는 electric blue
        borderTop: `2px solid ${isUrgent ? MCK.ink : MCK.electric}`,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 12px 32px rgba(10,22,40,0.10)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Badges row */}
      <div className="flex items-center" style={{ gap: 6, flexWrap: 'wrap' }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 8px',
            fontSize: 10, fontWeight: 800,
            background: isUrgent ? MCK.ink : 'rgba(34, 81, 255, 0.10)',
            color: isUrgent ? MCK.paper : '#1A47CC',
            border: `1px solid ${isUrgent ? MCK.ink : 'rgba(34, 81, 255, 0.35)'}`,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}
        >
          <UrgIcon size={10} /> {urg.label}
        </span>
        {d.collateral_types.slice(0, 2).map(ct => (
          <span
            key={ct}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '3px 8px',
              fontSize: 10, fontWeight: 700,
              background: MCK.paper,
              color: MCK.textSub,
              border: `1px solid ${MCK.border}`,
            }}
          >
            <Building2 size={10} />{ct}
          </span>
        ))}
        <span style={{ marginLeft: 'auto' }}>
          {hasMatches ? (
            <Link
              href="/deals/matching"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px',
                background: 'rgba(34, 81, 255, 0.10)',
                border: `1px solid rgba(34, 81, 255, 0.35)`,
                color: '#1A47CC',
                fontSize: 10, fontWeight: 800,
                letterSpacing: '0.04em', textTransform: 'uppercase',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: MCK.electric, display: 'inline-block',
                }}
              />
              매칭 {d.matching_count}
            </Link>
          ) : (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 8px',
                fontSize: 10, fontWeight: 700,
                color: MCK.textMuted,
                border: `1px solid ${MCK.border}`,
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              <Clock size={10} /> {ageDays === 0 ? '오늘' : `${ageDays}일 전`}
            </span>
          )}
        </span>
      </div>

      {/* Eyebrow + Title (담보 종류 희망) */}
      <div>
        <p
          style={{
            ...MCK_TYPE.eyebrow,
            color: MCK.electric,
            marginBottom: 6,
          }}
        >
          BUYER DEMAND · {formatDate(d.created_at)}
        </p>
        <Link href={`/exchange/demands/${d.id}`} style={{ textDecoration: 'none' }}>
          <h3
            style={{
              fontFamily: MCK_FONTS.serif,
              color: MCK.ink,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: '-0.015em',
              lineHeight: 1.35,
              marginBottom: 6,
            }}
          >
            {d.collateral_types.slice(0, 2).join(' · ')}
            {d.collateral_types.length > 2 ? ` 외 ${d.collateral_types.length - 2}종` : ''} 희망
          </h3>
        </Link>
        <div className="flex items-center" style={{ gap: 6 }}>
          <MapPin size={12} style={{ color: MCK.textMuted, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: MCK.textSub, fontWeight: 500 }}>
            {d.regions.slice(0, 3).join(' · ')}
            {d.regions.length > 3 ? ` +${d.regions.length - 3}` : ''}
          </span>
        </div>
      </div>

      {/* Metrics 3-col panel — 자발적 경매와 동일: Deep Navy + Electric top + 흰 Georgia 16px + Cyan 강조 */}
      <div
        style={{
          background: MCK.inkDeep,
          borderTop: `3px solid ${MCK.electric}`,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
        }}
      >
        <div style={{ padding: '12px 14px', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
          <p style={{ ...MCK_TYPE.label, color: 'rgba(255, 255, 255, 0.65)', marginBottom: 4 }}>최소</p>
          <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.paper, letterSpacing: '-0.015em', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
            {formatKRW(d.min_amount)}
          </p>
        </div>
        <div style={{ padding: '12px 14px', borderRight: '1px solid rgba(255, 255, 255, 0.12)' }}>
          <p style={{ ...MCK_TYPE.label, color: 'rgba(255, 255, 255, 0.65)', marginBottom: 4 }}>최대</p>
          <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.paper, letterSpacing: '-0.015em', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
            {formatKRW(d.max_amount)}
          </p>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <p style={{ ...MCK_TYPE.label, color: MCK.cyan, marginBottom: 4 }}>평균 희망가</p>
          <p style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.cyan, letterSpacing: '-0.015em', lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>
            {formatKRW(avg)}
          </p>
        </div>
      </div>

      {/* Memo (선택) */}
      {d.memo && (
        <p
          style={{
            fontSize: 12, lineHeight: 1.55, color: MCK.textSub,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {d.memo}
        </p>
      )}

      <div style={{ flex: 1 }} />

      {/* Footer Stats — 자발적 경매와 동일 톤 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          paddingBottom: 14,
          borderBottom: `1px solid ${MCK.border}`,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            fontWeight: 800,
            color: MCK.ink,
          }}
        >
          <Clock size={13} />
          {ageDays === 0 ? '오늘 등록' : `${ageDays}일 전 등록`}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: MCK.textSub, fontWeight: 700 }}>
          <Sparkles size={12} /> 매칭 {d.matching_count}건
        </span>
      </div>

      {/* CTAs — 자발적 경매와 동일: 흰 outline + soft sky blue */}
      <div className="flex" style={{ gap: 8 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onRunMatching(d.id) }}
          disabled={matching}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 12px',
            fontSize: 12,
            fontWeight: 800,
            background: MCK.paper,
            color: MCK.ink,
            border: `1px solid ${MCK.ink}`,
            cursor: matching ? 'wait' : 'pointer',
            opacity: matching ? 0.6 : 1,
            letterSpacing: '-0.01em',
          }}
          aria-label="AI 매칭 실행"
        >
          {matching ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          AI 매칭
        </button>
        <Link
          href={`/exchange/demands/${d.id}`}
          style={{
            flex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 12px',
            fontSize: 12,
            fontWeight: 800,
            background: '#A8CDE8',                              /* McKinsey soft sky blue */
            color: MCK.ink,
            borderTop: `2px solid ${MCK.electric}`,
            border: '1px solid #7FA8C8',
            borderRadius: 4,
            letterSpacing: '-0.01em',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(34, 81, 255, 0.10)',
          }}
        >
          <Zap size={13} style={{ color: MCK.ink }} /> 제안 보내기
        </Link>
      </div>

      {/* 관리자 / 매수자 본인 편집 — 자체 권한 체크로 비대상자에게는 미노출 */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <OwnerEditButton
          resourceType="demand"
          resourceId={d.id}
          ownerId={(d as { buyer_id?: string }).buyer_id ?? null}
          compact
          label="편집"
        />
      </div>
    </article>
  )
}

function DemandFigure({
  label, value, tone,
}: {
  label: string
  value: React.ReactNode
  tone: 'em' | 'neutral'
}) {
  return (
    <div>
      <div style={{ ...MCK_TYPE.label, color: MCK.textMuted, marginBottom: 3 }}>{label}</div>
      <div
        style={{
          fontFamily: MCK_FONTS.serif,
          fontSize: 16, fontWeight: 800,
          color: tone === 'em' ? MCK.positive : MCK.ink,
          letterSpacing: '-0.025em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
    </div>
  )
}
