'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import DS, { formatKRW, formatDate } from '@/lib/design-system'
import { MapPin, Building2, Plus, Target, Search, Users, DollarSign, ArrowUpRight, FileText, X, Sparkles, Loader2, ChevronLeft, ChevronRight, AlertCircle, LayoutGrid, List } from 'lucide-react'
import { COLLATERAL_OPTIONS, REGIONS } from '@/lib/taxonomy'

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

const URGENCY_MAP: Record<Urgency, { label: string; badge: string }> = {
  URGENT: { label: '긴급', badge: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  HIGH:   { label: '높음', badge: 'bg-orange-500/10 text-orange-400 border border-orange-500/20' },
  MEDIUM: { label: '보통', badge: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
  LOW:    { label: '낮음', badge: 'bg-[var(--color-surface-base)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]' },
}

// Use taxonomy collateral options (exclude 'ALL' sentinel)
const COLLATERAL_FILTER_OPTIONS = COLLATERAL_OPTIONS.filter(o => o.value !== 'ALL').map(o => o.label)
const REGION_OPTIONS = REGIONS.map(r => r.short)
const PER_PAGE = 12

function CardSkeleton() {
  const b = 'bg-[var(--color-surface-sunken)] rounded'
  return (
    <div className={`${DS.card.base} ${DS.card.padding} animate-pulse`}>
      <div className="flex items-center gap-2 mb-4"><div className={`h-5 w-14 ${b}-full`} /><div className={`h-5 w-10 ${b}-full`} /></div>
      <div className={`h-7 w-3/4 ${b} mb-3`} />
      <div className="flex gap-2 mb-3"><div className={`h-6 w-16 ${b}`} /><div className={`h-6 w-16 ${b}`} /></div>
      <div className={`h-4 w-1/2 ${b} mb-3`} /><div className={`h-4 w-full ${b} mb-2`} /><div className={`h-4 w-2/3 ${b}`} />
    </div>
  )
}

export default function DemandsPage() {
  const [demands, setDemands] = useState<Demand[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러올 수 없습니다')
      setDemands([])
    } finally {
      setLoading(false)
    }
  }, [page, urgencyFilter])

  useEffect(() => { fetchDemands() }, [fetchDemands])

  const handleSubmit = async () => {
    if (formCollateral.length === 0 || formRegions.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/exchange/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collateral_types: formCollateral,
          regions: formRegions,
          min_amount: Number(formMinAmount) || 0,
          max_amount: Number(formMaxAmount) || 0,
          urgency: formUrgency,
          memo: formMemo,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setShowModal(false)
      resetForm()
      setPage(1)
      fetchDemands()
    } catch {
      alert('수요 등록에 실패했습니다. 다시 시도해 주세요.')
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      fetchDemands()
    } catch {
      alert('AI 매칭 실행에 실패했습니다.')
    } finally {
      setMatchingId(null)
    }
  }

  const toggleItem = (arr: string[], item: string, setter: (v: string[]) => void) => {
    setter(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} ${DS.page.paddingTop} pb-16`}>

        {/* Header */}
        <div className={DS.header.wrapper}>
          <p className={DS.header.eyebrow}>Buyer Demand Board</p>
          <h1 className={DS.header.title}>매수 수요</h1>
          <p className={DS.header.subtitle}>
            매수 의향이 있는 투자자들의 NPL 매수 조건을 확인하고 직접 제안을 보내세요
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Link href="/exchange/sell" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
              매물 등록 →
            </Link>
            <Link href="/deals/matching" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>
              AI 매칭 결과 →
            </Link>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className={DS.stat.card}>
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} className="text-[var(--color-brand-mid)]" />
              <p className={DS.stat.label}>등록된 수요</p>
            </div>
            <p className={DS.stat.value}>{loading ? '—' : `${total}건`}</p>
          </div>
          <div className={DS.stat.card}>
            <div className="flex items-center gap-2 mb-1">
              <Target size={14} className="text-[var(--color-warning)]" />
              <p className={DS.stat.label}>긴급 수요</p>
            </div>
            <p className={DS.stat.value}>
              {loading ? '—' : `${demands.filter(d => d.urgency === 'URGENT' || d.urgency === 'HIGH').length}건`}
            </p>
          </div>
          <div className={DS.stat.card}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-[var(--color-positive)]" />
              <p className={DS.stat.label}>평균 희망 금액</p>
            </div>
            <p className={DS.stat.value}>
              {loading || demands.length === 0 ? '—' : formatKRW(
                Math.round(demands.reduce((s, d) => s + (d.min_amount + d.max_amount) / 2, 0) / demands.length)
              )}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className={`${DS.filter.bar} mb-6`}>
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className={DS.text.caption}>긴급도:</span>
            {(['', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map(u => (
              <button
                key={u || 'ALL'}
                onClick={() => { setUrgencyFilter(u as Urgency | ''); setPage(1) }}
                className={`${DS.filter.chip} ${urgencyFilter === u ? DS.filter.chipActive : DS.filter.chipInactive}`}
              >
                {u ? URGENCY_MAP[u].label : '전체'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className={DS.text.captionLight}>{total}건</span>
            {/* View toggle */}
            <div className="flex items-center border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[0.75rem] font-semibold transition-colors ${
                  viewMode === 'card'
                    ? 'bg-[var(--color-brand-dark)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]'
                }`}
              >
                <LayoutGrid size={13} /> 카드
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[0.75rem] font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--color-brand-dark)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]'
                }`}
              >
                <List size={13} /> 리스트
              </button>
            </div>
            <button onClick={() => setShowModal(true)} className={`${DS.button.accent} ${DS.button.sm}`}>
              <Plus size={14} /> 수요 등록
            </button>
          </div>
        </div>

        {/* Content area */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className={DS.empty.wrapper}>
            <AlertCircle className={DS.empty.icon} />
            <p className={DS.empty.title}>데이터를 불러올 수 없습니다</p>
            <p className={DS.empty.description}>{error}</p>
            <button onClick={fetchDemands} className={`${DS.button.secondary} mt-4`}>다시 시도</button>
          </div>
        ) : demands.length === 0 ? (
          <div className={DS.empty.wrapper}>
            <Search className={DS.empty.icon} />
            <p className={DS.empty.title}>등록된 수요가 없습니다</p>
            <p className={DS.empty.description}>첫 번째 매수 수요를 등록하고 AI 매칭을 받아보세요</p>
            <button onClick={() => setShowModal(true)} className={`${DS.button.accent} mt-4`}>
              <Plus size={14} /> 수요 등록하기
            </button>
          </div>
        ) : viewMode === 'list' ? (
          /* ── LIST VIEW ── */
          <>
            <div className={DS.table.wrapper}>
              <table className="w-full text-[0.8125rem]">
                <thead className={DS.table.header}>
                  <tr>
                    <th className={DS.table.headerCell}>긴급도</th>
                    <th className={DS.table.headerCell}>담보 유형</th>
                    <th className={DS.table.headerCell}>지역</th>
                    <th className={DS.table.headerCell}>희망 금액 범위</th>
                    <th className={DS.table.headerCell}>매칭</th>
                    <th className={DS.table.headerCell}>등록일</th>
                    <th className={DS.table.headerCell}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {demands.map(d => {
                    const urg = URGENCY_MAP[d.urgency]
                    return (
                      <tr key={d.id} className={DS.table.row}>
                        <td className={DS.table.cell}>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6875rem] font-bold ${urg.badge}`}>
                            {urg.label}
                          </span>
                        </td>
                        <td className={DS.table.cell}>
                          <div className="flex flex-wrap gap-1">
                            {d.collateral_types.slice(0, 3).map(ct => (
                              <span key={ct} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[0.625rem] font-semibold border ${DS.collateral[ct as keyof typeof DS.collateral] || DS.collateral['기타']}`}>
                                {ct}
                              </span>
                            ))}
                            {d.collateral_types.length > 3 && (
                              <span className={DS.text.micro}>+{d.collateral_types.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className={DS.table.cell}>
                          <div className="flex items-center gap-1">
                            <MapPin size={11} className="text-[var(--color-brand-mid)] shrink-0" />
                            <span className={DS.text.caption}>{d.regions.slice(0, 4).join(', ')}{d.regions.length > 4 ? ` +${d.regions.length - 4}` : ''}</span>
                          </div>
                        </td>
                        <td className={DS.table.cell}>
                          <span className="font-semibold text-[0.8125rem]">
                            {formatKRW(d.min_amount)} ~ {formatKRW(d.max_amount)}
                          </span>
                        </td>
                        <td className={DS.table.cell}>
                          {d.matching_count > 0
                            ? <span className={DS.badge.positive}>{d.matching_count}건</span>
                            : <span className={DS.text.muted}>-</span>
                          }
                        </td>
                        <td className={`${DS.table.cellMuted}`}>{formatDate(d.created_at)}</td>
                        <td className={DS.table.cell}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => runMatching(d.id)}
                              disabled={matchingId === d.id}
                              className={`${DS.button.ghost} ${DS.button.sm} gap-1`}
                            >
                              {matchingId === d.id ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                              매칭
                            </button>
                            <a href={`/exchange/demands/${d.id}`} className={`${DS.button.primary} ${DS.button.sm}`}>
                              상세 <ArrowUpRight size={11} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          /* ── CARD VIEW ── */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {demands.map(d => {
                const urg = URGENCY_MAP[d.urgency]
                return (
                  <div key={d.id} className={`${DS.card.interactive} ${DS.card.padding} flex flex-col`}>
                    {/* Top: urgency + date */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold ${urg.badge}`}>
                        {urg.label}
                      </span>
                      {d.matching_count > 0 && (
                        <Link href="/deals/matching" className={`${DS.badge.positive} hover:opacity-80 transition-opacity cursor-pointer`}>
                          매칭 {d.matching_count}건 →
                        </Link>
                      )}
                      <span className={`${DS.text.micro} ml-auto`}>{formatDate(d.created_at)}</span>
                    </div>

                    {/* Amount */}
                    <p className={`${DS.text.metricLarge} mb-2`}>
                      <span className="text-[var(--color-brand-mid)]">{formatKRW(d.min_amount)}</span>
                      <span className={DS.text.muted}> ~ </span>
                      <span>{formatKRW(d.max_amount)}</span>
                    </p>

                    {/* Collateral tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {d.collateral_types.map(ct => (
                        <span key={ct} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.6875rem] font-semibold border ${DS.collateral[ct as keyof typeof DS.collateral] || DS.collateral['기타']}`}>
                          <Building2 size={10} />{ct}
                        </span>
                      ))}
                    </div>

                    {/* Regions */}
                    <div className="flex items-center gap-1.5 mb-3">
                      <MapPin size={13} className="text-[var(--color-brand-mid)] shrink-0" />
                      <span className={DS.text.caption}>{d.regions.join(', ')}</span>
                    </div>

                    {/* Memo */}
                    {d.memo && (
                      <p className={`${DS.text.captionLight} line-clamp-2 mb-4`}>{d.memo}</p>
                    )}

                    {/* Spacer */}
                    <div className="flex-1" />

                    {/* Bottom actions */}
                    <div className={`flex items-center justify-between pt-3 mt-auto ${DS.divider.default}`}>
                      <div className="flex items-center gap-1.5">
                        <FileText size={12} className="text-[var(--color-text-muted)]" />
                        <span className={DS.text.micro}>
                          {d.matching_count > 0 ? `매칭 ${d.matching_count}건` : '매칭 없음'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); runMatching(d.id) }}
                          disabled={matchingId === d.id}
                          className={`${DS.button.ghost} ${DS.button.sm} gap-1`}
                        >
                          {matchingId === d.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <Sparkles size={12} />}
                          AI 매칭
                        </button>
                        <a href={`/exchange/demands/${d.id}`} className={`${DS.button.primary} ${DS.button.sm}`}>
                          상세 <ArrowUpRight size={12} />
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className={`${DS.button.secondary} ${DS.button.sm} disabled:opacity-40`}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce<(number | 'dots')[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1]) > 1) acc.push('dots')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === 'dots' ? (
                      <span key={`dots-${i}`} className={DS.text.muted}>...</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-9 h-9 rounded-lg text-[0.8125rem] font-bold transition-colors ${
                          p === page
                            ? 'bg-[var(--color-brand-dark)] text-white'
                            : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-brand-bright)]'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className={`${DS.button.secondary} ${DS.button.sm} disabled:opacity-40`}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Notice */}
        <div className={`${DS.card.flat} p-4 mt-10`}>
          <p className={`${DS.text.label} mb-1`}>이용 안내</p>
          <p className={DS.text.captionLight}>
            매수 수요 게시판은 NPL 투자자가 매수 조건을 공개하고 매도자의 제안을 받는 서비스입니다. 게시된 정보는 참고용이며 실제 거래 조건은 당사자 간 협의에 따릅니다.
          </p>
        </div>
      </div>

      {showModal && (
        <div className={DS.modal.overlay} onClick={() => setShowModal(false)}>
          <div className="flex items-center justify-center min-h-screen p-4">
            <div
              className={`${DS.modal.content} w-full max-w-lg max-h-[90vh] overflow-y-auto`}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className={DS.modal.title}>매수 수요 등록</h2>
                <button onClick={() => setShowModal(false)} className={DS.button.icon}>
                  <X size={18} />
                </button>
              </div>

              {/* Collateral multi-select */}
              <div className="mb-5">
                <label className={DS.input.label}>담보 유형 (복수 선택)</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {COLLATERAL_FILTER_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleItem(formCollateral, opt, setFormCollateral)}
                      className={`${DS.filter.chip} ${formCollateral.includes(opt) ? DS.filter.chipActive : DS.filter.chipInactive}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {formCollateral.length === 0 && (
                  <p className={DS.input.error}>최소 1개 선택 필요</p>
                )}
              </div>

              {/* Region multi-select */}
              <div className="mb-5">
                <label className={DS.input.label}>지역 (복수 선택)</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {REGION_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => toggleItem(formRegions, opt, setFormRegions)}
                      className={`${DS.filter.chip} ${formRegions.includes(opt) ? DS.filter.chipActive : DS.filter.chipInactive}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {formRegions.length === 0 && (
                  <p className={DS.input.error}>최소 1개 선택 필요</p>
                )}
              </div>

              {/* Amount range */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <label className={DS.input.label}>최소 금액 (원)</label>
                  <input
                    type="number"
                    placeholder="100000000"
                    value={formMinAmount}
                    onChange={e => setFormMinAmount(e.target.value)}
                    className={DS.input.base}
                  />
                  <p className={DS.input.helper}>예: 1억 = 100000000</p>
                </div>
                <div>
                  <label className={DS.input.label}>최대 금액 (원)</label>
                  <input
                    type="number"
                    placeholder="500000000"
                    value={formMaxAmount}
                    onChange={e => setFormMaxAmount(e.target.value)}
                    className={DS.input.base}
                  />
                </div>
              </div>

              {/* Urgency select */}
              <div className="mb-5">
                <label className={DS.input.label}>긴급도</label>
                <select
                  value={formUrgency}
                  onChange={e => setFormUrgency(e.target.value as Urgency)}
                  className={DS.input.base}
                >
                  <option value="URGENT">긴급</option>
                  <option value="HIGH">높음</option>
                  <option value="MEDIUM">보통</option>
                  <option value="LOW">낮음</option>
                </select>
              </div>

              {/* Memo */}
              <div className="mb-6">
                <label className={DS.input.label}>메모</label>
                <textarea
                  rows={3}
                  placeholder="매수 조건, 선호 물건 유형 등을 자유롭게 기재해 주세요"
                  value={formMemo}
                  onChange={e => setFormMemo(e.target.value)}
                  className={`${DS.input.base} resize-none`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setShowModal(false)} className={DS.button.secondary}>취소</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || formCollateral.length === 0 || formRegions.length === 0}
                  className={`${DS.button.primary} ${DS.button.lg} disabled:opacity-50`}
                >
                  {submitting ? (
                    <><Loader2 size={16} className="animate-spin" /> 등록 중...</>
                  ) : (
                    <><Plus size={16} /> 수요 등록</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
