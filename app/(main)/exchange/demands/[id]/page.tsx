'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Building2, MapPin, Target, TrendingUp, Clock,
  Star, MessageSquare, Sparkles, Shield, Calendar, ExternalLink, Send, X, CheckCircle2,
} from 'lucide-react'
import { formatKRW } from '@/lib/design-system'
import { matchListingsToDemand, type MatchableDemand, type MatchableListing, type MatchResult } from '@/lib/demand-matching'

type DemandUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type BuyerTier = 'BASIC' | 'STANDARD' | 'PREMIUM'

interface BuyerDemand {
  id: string; buyer_name: string; buyer_tier: BuyerTier; buyer_joined: string
  collateral_types: string[]; regions: string[]
  min_amount: number; max_amount: number; target_discount_rate: number
  recovery_period: string; investment_experience: string
  urgency: DemandUrgency; description: string
  proposal_count: number; status: string; created_at: string; updated_at: string
}

interface AIRecommendation {
  id: string; title: string; collateral_type: string; region: string
  amount: number; discount_rate: number; match_score: number
}

interface MatchedListing {
  id: string; title: string; collateral_type: string; address?: string
  principal_amount: number; risk_grade?: string; score: number
}

interface Proposal {
  id: string; seller_name: string; listing_title: string; listing_amount: number
  listing_discount_rate: number; listing_collateral_type: string; listing_region: string
  message: string; status: string; created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  ACTIVE:   { label: '활성',  cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  COMPLETE: { label: '완료',  cls: 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]' },
  CANCELED: { label: '취소',  cls: 'bg-red-500/10 text-red-400 border border-red-500/20' },
}

// myListings state is populated from Supabase in the main component
type MyListing = { id: string; title: string; type: string }

function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-600'
  if (score >= 40) return 'text-blue-600'
  return 'text-gray-500'
}

function scoreBar(score: number) {
  if (score >= 70) return 'bg-emerald-500'
  if (score >= 40) return 'bg-blue-500'
  return 'bg-gray-400'
}

const formatDate = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export default function DemandDetailPage() {
  const params = useParams()
  const demandId = params?.id as string

  const [demand, setDemand] = useState<BuyerDemand | null>(null)
  const [aiRecs, setAiRecs] = useState<AIRecommendation[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [matchedListings, setMatchedListings] = useState<MatchedListing[]>([])
  const [loading, setLoading] = useState(true)

  const [myListings, setMyListings] = useState<MyListing[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectedListing, setSelectedListing] = useState('')
  const [proposalMessage, setProposalMessage] = useState('')
  const [proposalSubmitting, setProposalSubmitting] = useState(false)
  const [proposalSent, setProposalSent] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [demandRes, proposalRes] = await Promise.all([
          fetch(`/api/v1/exchange/demands/${demandId}`),
          fetch(`/api/v1/exchange/demands/${demandId}/propose`),
        ])
        const demandJson = await demandRes.json()
        const proposalJson = await proposalRes.json()
        if (demandJson.success) {
          const d = demandJson.data as BuyerDemand
          setDemand(d)
          setAiRecs(demandJson.ai_recommendations || [])
          try {
            const p = new URLSearchParams({ limit: '50' })
            if (d.collateral_types?.length === 1) p.set('collateral_type', d.collateral_types[0])
            const listingsRes = await fetch(`/api/v1/exchange/listings?${p}`)
            const listingsJson = await listingsRes.json()
            const all = (listingsJson.data || []) as MatchableListing[]
            if (all.length > 0) {
              const dm: MatchableDemand = {
                id: d.id, collateral_types: d.collateral_types || [],
                regions: d.regions || [], min_amount: d.min_amount || 0,
                max_amount: d.max_amount || 0, urgency: d.urgency || 'MEDIUM',
                target_discount_rate: d.target_discount_rate,
              }
              const matches = matchListingsToDemand(dm, all, 5)
              setMatchedListings(matches.map((m: MatchResult) => {
                const l = all.find(x => x.id === m.id)
                return {
                  id: m.id, title: l?.title || `${l?.collateral_type || ''} 채권`,
                  collateral_type: l?.collateral_type || '',
                  address: l?.address || l?.location || '',
                  principal_amount: l?.principal_amount || 0,
                  risk_grade: l?.risk_grade, score: m.score,
                }
              }))
            }
          } catch {}
        }
        if (proposalJson.success) setProposals(proposalJson.data || [])

        // Load current user's own active listings for the proposal dropdown
        try {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: myListingsData } = await supabase
              .from('npl_listings')
              .select('id, title, collateral_type')
              .eq('seller_id', user.id)
              .eq('status', 'ACTIVE')
              .order('created_at', { ascending: false })
              .limit(20)
            if (myListingsData?.length) {
              setMyListings(myListingsData.map((r: any) => ({
                id: String(r.id), title: r.title ?? `${r.collateral_type ?? '기타'} NPL`, type: r.collateral_type ?? '기타',
              })))
            }
          }
        } catch {}
      } catch {}
      finally { setLoading(false) }
    }
    fetchData()
  }, [demandId])

  const handlePropose = async () => {
    if (!selectedListing) { alert('매물을 선택해주세요.'); return }
    setProposalSubmitting(true)
    try {
      const res = await fetch(`/api/v1/exchange/demands/${demandId}/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: selectedListing, message: proposalMessage }),
      })
      const json = await res.json()
      if (json.success) {
        setProposalSent(true)
        setTimeout(() => { setShowModal(false); setProposalSent(false); setSelectedListing(''); setProposalMessage('') }, 1500)
      }
    } catch { alert('제안 전송에 실패했습니다.') }
    finally { setProposalSubmitting(false) }
  }

  if (loading) return (
    <div className="min-h-screen bg-[var(--color-surface-overlay)] p-8">
      <div className="max-w-4xl mx-auto space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 animate-pulse rounded-xl bg-[var(--color-surface-overlay)]" />)}
      </div>
    </div>
  )

  if (!demand) return (
    <div className="flex min-h-[60vh] items-center justify-center bg-[var(--color-surface-overlay)]">
      <div className="text-center space-y-4">
        <h2 className="text-lg font-bold text-[var(--color-text-primary)] tracking-normal">수요를 찾을 수 없습니다</h2>
        <Link href="/exchange/demands" className="inline-block px-5 py-2.5 bg-[#2E75B6] text-white rounded-lg text-sm font-medium tracking-normal">
          목록으로 돌아가기
        </Link>
      </div>
    </div>
  )

  const statusCfg = STATUS_CONFIG[demand.status] || STATUS_CONFIG.ACTIVE

  return (
    <div className="min-h-screen bg-[var(--color-surface-overlay)]">
      {/* Header */}
      <div className="bg-[#0D1F38] text-white px-6 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/exchange/demands" className="inline-flex items-center gap-1.5 text-sm text-blue-300 hover:text-white transition-colors mb-3">
            <ArrowLeft className="h-4 w-4" />
            매수 수요 마켓
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold tracking-normal">수요 #{demand.id.slice(-8).toUpperCase()}</h1>
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${statusCfg.cls}`}>
              {statusCfg.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-blue-200 tracking-normal">{demand.buyer_name} · 등록 {formatDate(demand.created_at)}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* 투자 조건 요약 카드 */}
        <div className="stat-card rounded-xl bg-[var(--color-surface-elevated)] p-6">
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal mb-4">투자 조건 요약</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: Building2, label: '담보 유형', value: demand.collateral_types.join(', '), color: 'text-[#2E75B6]' },
              { icon: Target,    label: '투자 규모', value: `${formatKRW(demand.min_amount)} ~ ${formatKRW(demand.max_amount)}`, color: 'text-[var(--color-text-primary)] font-semibold' },
              { icon: MapPin,    label: '희망 지역', value: demand.regions.join(', '), color: 'text-[var(--color-text-secondary)]' },
              { icon: TrendingUp, label: '희망 수익률', value: `${demand.target_discount_rate}%`, color: 'text-emerald-400 font-bold text-lg' },
            ].map(item => (
              <div key={item.label} className="bg-[var(--color-surface-overlay)] rounded-lg p-3 space-y-1">
                <p className="text-xs text-gray-400 flex items-center gap-1">
                  <item.icon className="h-3 w-3" />{item.label}
                </p>
                <p className={`text-sm ${item.color} tracking-normal`}>{item.value}</p>
              </div>
            ))}
          </div>
          {demand.description && (
            <p className="mt-4 text-sm text-[var(--color-text-secondary)] leading-relaxed border-t border-[var(--color-border-subtle)] pt-4 tracking-normal">
              {demand.description}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />회수기간 {demand.recovery_period}</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3" />투자경험 {demand.investment_experience}</span>
            <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />제안 {demand.proposal_count}건</span>
          </div>
        </div>

        {/* AI 매칭 결과 */}
        <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2 tracking-normal">
              <Sparkles className="h-5 w-5 text-amber-500" />
              AI가 매칭한 매물 {matchedListings.length > 0 ? `${matchedListings.length}건` : ''}
            </h2>
            {matchedListings.length > 0 && (
              <span className="text-xs text-gray-400 tracking-normal">매칭 점수 순</span>
            )}
          </div>
          <div className="p-6">
            {matchedListings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6 tracking-normal">매칭 결과를 분석 중입니다.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {matchedListings.map(ml => (
                  <div key={ml.id} className="stat-card rounded-xl border border-[var(--color-border-subtle)] p-4 space-y-3 hover:border-[#2E75B6]/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--color-text-primary)] truncate tracking-normal">{ml.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span className="flex items-center gap-0.5"><Building2 className="h-3 w-3" />{ml.collateral_type}</span>
                          {ml.address && <span className="flex items-center gap-0.5 truncate"><MapPin className="h-3 w-3" />{ml.address}</span>}
                        </div>
                      </div>
                      {ml.risk_grade && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-[#2E75B6] border border-blue-500/20 flex-shrink-0">
                          {ml.risk_grade}등급
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-secondary)] tracking-normal">채권액 <span className="font-medium text-[var(--color-text-primary)] tabular-nums">{formatKRW(ml.principal_amount)}</span></span>
                    </div>
                    {/* 매칭 점수 바 */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-400 tracking-normal">매칭 점수</span>
                        <span className={`font-bold tabular-nums ${scoreColor(ml.score)}`}>{ml.score}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--color-surface-overlay)]">
                        <div className={`h-full rounded-full ${scoreBar(ml.score)}`} style={{ width: `${ml.score}%` }} />
                      </div>
                    </div>
                    <Link
                      href={`/exchange/${ml.id}`}
                      className="flex items-center justify-center gap-1.5 w-full text-xs font-medium text-[#2E75B6] hover:text-[#1e5a94] border border-[#2E75B6]/30 hover:border-[#2E75B6] rounded-lg py-1.5 transition-colors tracking-normal"
                    >
                      상세보기 <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
            {matchedListings.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
                <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-2 tracking-normal">매칭 기준</p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                  {['담보 유형 일치', '희망 지역 포함', '투자 규모 범위', '수익률 조건'].map(c => (
                    <span key={c} className="flex items-center gap-1 px-2 py-0.5 bg-[var(--color-surface-overlay)] rounded-md border border-[var(--color-border-subtle)] tracking-normal">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#2E75B6]" />{c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI 추천 + 안전거래 + 제안 */}
        <div className="grid gap-6 sm:grid-cols-2">
          {/* AI 추천 */}
          {aiRecs.length > 0 && (
            <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] overflow-hidden">
              <div className="px-5 py-4 border-b border-[var(--color-border-subtle)]">
                <h2 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2 text-sm tracking-normal">
                  <Sparkles className="h-4 w-4 text-amber-500" />AI 추천 매물
                </h2>
              </div>
              <div className="p-5 space-y-2.5">
                {aiRecs.map(rec => (
                  <div key={rec.id} className="rounded-lg border border-[var(--color-border-subtle)] p-3 hover:border-amber-500/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] flex-1 min-w-0 truncate tracking-normal">{rec.title}</p>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 whitespace-nowrap">{rec.match_score}%</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-400">
                      <span>{rec.collateral_type}</span><span>{rec.region}</span>
                      <span className="font-medium text-gray-600 tabular-nums">{formatKRW(rec.amount)}</span>
                      <span className="text-emerald-600">할인율 {rec.discount_rate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 매물 제안 + 안전거래 */}
          <div className="space-y-4">
            <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] p-5 space-y-4">
              <h2 className="font-semibold text-[var(--color-text-primary)] text-sm tracking-normal">매도자 전용</h2>
              <p className="text-xs text-gray-500 tracking-normal">이 수요자의 조건에 맞는 매물을 제안할 수 있습니다.</p>
              <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors tracking-normal"
              >
                <Send className="h-4 w-4" />매물 제안하기
              </button>
            </div>
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-start gap-2.5">
              <Shield className="h-4 w-4 text-[#2E75B6] flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-[#1B3A5C] tracking-normal">안전 거래 안내</p>
                <p className="mt-1 text-gray-500 leading-relaxed tracking-normal">모든 제안은 NPLatform을 통해 전달되며, 개인정보는 마스킹 처리됩니다. 거래 진행 시 NDA 체결 후 상세 정보가 공개됩니다.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 받은 제안 목록 */}
        <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
            <h2 className="font-semibold text-[var(--color-text-primary)] flex items-center gap-2 text-sm tracking-normal">
              <MessageSquare className="h-4 w-4 text-[#2E75B6]" />받은 제안 목록
            </h2>
            <span className="text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-overlay)] rounded-full px-2.5 py-0.5">{proposals.length}건</span>
          </div>
          <div className="p-6">
            {proposals.length === 0 ? (
              <div className="py-10 text-center">
                <MessageSquare className="mx-auto h-10 w-10 text-gray-200 mb-3" />
                <p className="text-sm text-gray-400 tracking-normal">아직 받은 제안이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {proposals.map(prop => (
                  <div key={prop.id} className="rounded-xl border border-[var(--color-border-subtle)] hover:border-[#2E75B6]/30 transition-colors p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--color-text-primary)] tracking-normal">{prop.seller_name}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] tracking-normal">
                            {prop.status === 'PENDING' ? '검토 대기' : prop.status === 'REVIEWED' ? '검토 완료' : prop.status}
                          </span>
                        </div>
                        <p className="text-sm text-[#2E75B6] font-medium tracking-normal">{prop.listing_title}</p>
                      </div>
                      <span className="text-xs text-gray-400 flex items-center gap-1 ml-3 whitespace-nowrap">
                        <Calendar className="h-3 w-3" />{formatDate(prop.created_at)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                      <span>{prop.listing_collateral_type}</span><span>{prop.listing_region}</span>
                      <span className="font-medium text-gray-600 tabular-nums">{formatKRW(prop.listing_amount)}</span>
                      <span className="text-emerald-600">할인율 {prop.listing_discount_rate}%</span>
                    </div>
                    {prop.message && <p className="mt-2 text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-overlay)] rounded-lg p-3 leading-relaxed tracking-normal">{prop.message}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 제안 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--color-surface-elevated)] shadow-2xl overflow-hidden">
            {proposalSent ? (
              <div className="p-10 text-center space-y-3">
                <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)] tracking-normal">제안 전송 완료!</h3>
                <p className="text-sm text-gray-500 tracking-normal">매수자가 제안을 검토할 예정입니다.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-6 py-4">
                  <h3 className="text-base font-bold text-[var(--color-text-primary)] tracking-normal">매물 제안하기</h3>
                  <button onClick={() => setShowModal(false)} className="p-1 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 tracking-normal">
                      내 매물 선택 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedListing}
                      onChange={e => setSelectedListing(e.target.value)}
                      className="input-enhanced w-full"
                    >
                      <option value="">제안할 매물을 선택하세요</option>
                      {myListings.length === 0 && (
                        <option disabled value="">등록된 매물이 없습니다</option>
                      )}
                      {myListings.map(l => (
                        <option key={l.id} value={l.id}>[{l.type}] {l.title}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5 tracking-normal">제안 메시지</label>
                    <textarea
                      rows={4}
                      placeholder="매수자에게 전달할 메시지를 입력하세요."
                      value={proposalMessage}
                      onChange={e => setProposalMessage(e.target.value)}
                      className="input-enhanced w-full resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border-subtle)] px-6 py-4">
                  <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-lg border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors tracking-normal">
                    취소
                  </button>
                  <button
                    onClick={handlePropose}
                    disabled={proposalSubmitting}
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors tracking-normal"
                  >
                    {proposalSubmitting ? (
                      <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />전송 중...</>
                    ) : (
                      <><Send className="h-4 w-4" />제안 전송</>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
