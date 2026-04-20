'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, MapPin, Calendar, Building2, Gavel,
  TrendingUp, AlertTriangle, Users, FileText,
  Bookmark, BookmarkCheck, Share2, ChevronRight,
  Loader2, ExternalLink, Calculator, MessageSquarePlus,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { VERDICT_CONFIG, screenNplListing, listingToScreeningInput } from '@/lib/ai-screening/scorer'
import { maskCreditor } from '@/lib/masking'
import type { CourtAuctionListing } from '@/lib/court-auction/types'
import { LiveBidPanel } from './live-bid-panel'

// ─── 금액 포맷 ────────────────────────────────────────────

function fmtKRW(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  if (n >= 100_000_000) return (n / 100_000_000).toFixed(2) + '억원'
  if (n >= 10_000)      return (n / 10_000).toFixed(0) + '만원'
  return n.toLocaleString('ko-KR') + '원'
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ─── 메트릭 카드 ─────────────────────────────────────────

function MetricCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── 리스크 게이지 ────────────────────────────────────────

function RiskGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#ef4444' : score >= 40 ? '#f59e0b' : '#10b981'
  const label = score >= 70 ? '높음' : score >= 40 ? '중간' : '낮음'
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>리스크 점수</span>
        <span style={{ color }}>{label} ({score}/100)</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  )
}

// ─── 메인 ────────────────────────────────────────────────

export default function AuctionDetailPage() {
  const router  = useRouter()
  const params  = useParams<{ id: string }>()
  const id      = params?.id ?? ''

  const [listing, setListing]       = useState<CourtAuctionListing | null>(null)
  const [loading, setLoading]       = useState(true)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [activeTab, setActiveTab]   = useState<'overview' | 'tenants' | 'ai' | 'docs'>('overview')
  const [aiResult, setAiResult]     = useState<ReturnType<typeof screenNplListing> | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined)

  const supabase = createClient()

  useEffect(() => {
    if (!id) return
    void loadListing()
  }, [id])

  // 샘플 경매 물건 (DB에 없을 때 개발/데모용 fallback)
  const SAMPLE_LISTING: CourtAuctionListing = {
    id: id || 'sample-001',
    case_number: '서울중앙지방법원 2025타경 12345',
    court_name: '서울중앙지방법원',
    property_type: '아파트',
    address: '서울특별시 강남구 역삼동 123-45 역삼빌라 3층 301호',
    sido: '서울', sigungu: '강남구',
    area_m2: 84.5, floor: 3, total_floors: 15, build_year: 2005,
    appraised_value: 1_050_000_000,
    min_bid_price: 840_000_000,
    deposit_amount: 84_000_000,
    status: 'BIDDING',
    auction_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    auction_count: 1,
    creditor_name: '하나저축은행',
    creditor_type: 'SAVINGS_BANK',
    loan_principal: 780_000_000,
    loan_balance: 820_000_000,
    total_claim: 850_000_000,
    senior_claim: 0,
    lien_count: 1,
    seizure_count: 0,
    tenant_count: 1,
    total_tenant_deposit: 50_000_000,
    has_opposing_force: false,
    lease_detail: [{ deposit: 50_000_000, opposing: false, priority: true }],
    ai_roi_estimate: 18.5,
    ai_risk_score: 35,
    ai_bid_prob: 0.74,
    ai_verdict: 'BUY',
    ai_reasoning: '강남권 아파트로 입지 우수. LTV 74%로 안정적. 임차인 1인이나 대항력 없어 명도 리스크 낮음.',
    ai_model_version: 'demo-v1',
    source: 'MANUAL',
    raw_data: {},
    images: [],
    documents: [],
    is_featured: false,
    view_count: 42,
    bookmark_count: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  async function loadListing() {
    setLoading(true)
    const { data, error } = await supabase
      .from('court_auction_listings')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      // DB 없는 개발/데모 환경에서 샘플 데이터로 계속 진행
      const item = SAMPLE_LISTING
      setListing(item)
      const input = listingToScreeningInput(item)
      setAiResult(screenNplListing(input))
      setLoading(false)
      return
    }

    const item = data as CourtAuctionListing
    setListing(item)

    // AI 스크리닝 (로컬 계산 또는 서버에서 가져온 값 활용)
    if (!item.ai_verdict) {
      const input  = listingToScreeningInput(item)
      const result = screenNplListing(input)
      setAiResult(result)
    } else {
      setAiResult({
        roi_estimate:  item.ai_roi_estimate ?? 0,
        risk_score:    item.ai_risk_score ?? 0,
        bid_prob:      item.ai_bid_prob ?? 0,
        verdict:       item.ai_verdict,
        reasoning:     item.ai_reasoning ?? '',
        factors:       [],
        model_version: item.ai_model_version,
      })
    }

    // 사용자 정보 로드
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
      const { data: bm } = await supabase
        .from('auction_bookmarks')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', id)
        .single()
      setIsBookmarked(!!bm)
    }

    // 조회수 증가 (오류 무시)
    void supabase.rpc('increment_view', { table_name: 'court_auction_listings', record_id: id })

    setLoading(false)
  }

  async function toggleBookmark() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    if (isBookmarked) {
      await supabase.from('auction_bookmarks').delete()
        .eq('user_id', user.id).eq('listing_id', id)
      setIsBookmarked(false)
      toast.success('북마크 해제됨')
    } else {
      await supabase.from('auction_bookmarks').insert({ user_id: user.id, listing_id: id })
      setIsBookmarked(true)
      toast.success('북마크에 추가됨')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    )
  }

  if (!listing) return null

  const bidRate = Math.round((listing.min_bid_price / listing.appraised_value) * 1000) / 10
  const verdictCfg = aiResult ? VERDICT_CONFIG[aiResult.verdict] : null

  return (
    // NX-7d (의도적): 경매 딜링 터미널은 Bloomberg-style 항상-다크 스킨.
    // 헤더/사이드는 테마 반응형, 본문만 다크 유지. 완전 토큰화는 NY 배치 예정.
    <div className="dark min-h-screen bg-gray-950 text-gray-100">
      {/* 헤더 */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs text-gray-400 font-mono">{listing.case_number}</p>
              <p className="text-xs text-gray-500">{listing.court_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void toggleBookmark()} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700">
              {isBookmarked
                ? <BookmarkCheck className="h-4 w-4 text-yellow-400" />
                : <Bookmark className="h-4 w-4 text-gray-400" />}
            </button>
            <button
              onClick={() => { void navigator.clipboard.writeText(window.location.href); toast.success('링크 복사됨') }}
              className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-2 space-y-5">
            {/* 제목 + 버딕트 */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm bg-gray-800 text-gray-300 px-2.5 py-0.5 rounded-lg font-medium">
                      {listing.property_type}
                    </span>
                    {listing.auction_count > 1 && (
                      <span className="text-sm bg-yellow-500/20 text-yellow-400 px-2.5 py-0.5 rounded-lg font-medium">
                        {listing.auction_count}회차
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-white leading-tight">{listing.address}</h1>
                </div>
                {verdictCfg && (
                  <span className={`flex-shrink-0 text-sm font-bold px-3 py-1.5 rounded-xl border ${verdictCfg.bg} ${verdictCfg.color} ${verdictCfg.border}`}>
                    {verdictCfg.label}
                  </span>
                )}
              </div>
              <p className="flex items-center gap-1.5 text-sm text-gray-400">
                <MapPin className="h-3.5 w-3.5" />
                {listing.sido} {listing.sigungu} {listing.dong}
              </p>
            </div>

            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="최저매각가" value={fmtKRW(listing.min_bid_price)} sub={`감정가의 ${bidRate}%`} />
              <MetricCard label="감정평가액" value={fmtKRW(listing.appraised_value)} />
              <MetricCard label="총 채권액" value={fmtKRW(listing.total_claim)} />
              <MetricCard
                label="입찰보증금"
                value={fmtKRW(listing.deposit_amount ?? Math.round(listing.min_bid_price * 0.1))}
                sub="최저가의 10%"
              />
            </div>

            {/* 탭 */}
            <div className="flex gap-1 border-b border-gray-800">
              {(['overview', 'tenants', 'ai', 'docs'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {{ overview: '개요', tenants: '임차인', ai: 'AI 분석', docs: '문서' }[tab]}
                </button>
              ))}
            </div>

            {/* 탭 컨텐츠 */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-400" />물건 정보
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    {[
                      { label: '물건 종류', value: listing.property_type + (listing.property_sub_type ? ` (${listing.property_sub_type})` : '') },
                      { label: '전용면적', value: listing.area_m2 ? `${listing.area_m2}㎡` : '—' },
                      { label: '층수', value: listing.floor ? `${listing.floor}층 / ${listing.total_floors ?? '?'}층` : '—' },
                      { label: '준공연도', value: listing.build_year ? `${listing.build_year}년` : '—' },
                      { label: '근저당 건수', value: `${listing.lien_count}건` },
                      { label: '압류 건수', value: `${listing.seizure_count}건` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                        <p className="text-white font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Gavel className="h-4 w-4 text-orange-400" />채권 정보
                  </h3>
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    {[
                      { label: '채권자', value: listing.creditor_name ? maskCreditor(listing.creditor_name) : '—' },
                      { label: '채권자 유형', value: listing.creditor_type ?? '—' },
                      { label: '원금', value: fmtKRW(listing.loan_principal) },
                      { label: '잔액 (이자 포함)', value: fmtKRW(listing.loan_balance) },
                      { label: '총 청구액', value: fmtKRW(listing.total_claim) },
                      { label: '선순위 채권', value: fmtKRW(listing.senior_claim) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
                        <p className="text-white font-medium">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tenants' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-400" />임차인 현황
                </h3>
                {listing.tenant_count === 0 ? (
                  <p className="text-sm text-gray-500">임차인 없음</p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-white">{listing.tenant_count}</p>
                        <p className="text-xs text-gray-500">임차인 수</p>
                      </div>
                      <div className="bg-gray-800 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold text-white">{fmtKRW(listing.total_tenant_deposit)}</p>
                        <p className="text-xs text-gray-500">보증금 합계</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${listing.has_opposing_force ? 'bg-red-500/15 border border-red-500/30' : 'bg-emerald-500/15 border border-emerald-500/30'}`}>
                        <p className={`text-sm font-bold ${listing.has_opposing_force ? 'text-red-400' : 'text-emerald-400'}`}>
                          {listing.has_opposing_force ? '있음' : '없음'}
                        </p>
                        <p className="text-xs text-gray-500">대항력</p>
                      </div>
                    </div>
                    {listing.lease_detail.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-gray-500 border-b border-gray-800">
                              <th className="pb-2 text-left">임차인</th>
                              <th className="pb-2 text-right">보증금</th>
                              <th className="pb-2 text-center">대항력</th>
                              <th className="pb-2 text-right">계약기간</th>
                            </tr>
                          </thead>
                          <tbody>
                            {listing.lease_detail.map((t, i) => (
                              <tr key={i} className="border-b border-gray-800/50">
                                <td className="py-2 text-gray-300">{t.name ?? `임차인 ${i + 1}`}</td>
                                <td className="py-2 text-right text-white">{fmtKRW(t.deposit)}</td>
                                <td className="py-2 text-center">
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${t.opposing ? 'text-red-400 bg-red-500/15' : 'text-gray-500'}`}>
                                    {t.opposing ? '있음' : '없음'}
                                  </span>
                                </td>
                                <td className="py-2 text-right text-gray-400 text-xs">
                                  {t.from ?? '—'} ~ {t.to ?? '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai' && aiResult && (
              <div className="space-y-4">
                <div className={`rounded-xl p-5 border ${verdictCfg?.bg} ${verdictCfg?.border}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-lg font-bold ${verdictCfg?.color}`}>{verdictCfg?.label}</span>
                    <span className="text-xs text-gray-500">모델: {aiResult.model_version}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{aiResult.reasoning}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    label="예상 ROI"
                    value={`${aiResult.roi_estimate.toFixed(1)}%`}
                    highlight={aiResult.roi_estimate > 0 ? 'text-emerald-400' : 'text-red-400'}
                  />
                  <MetricCard
                    label="낙찰 가능성"
                    value={`${Math.round(aiResult.bid_prob * 100)}%`}
                    highlight="text-blue-400"
                  />
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-2">리스크 점수</p>
                    <RiskGauge score={aiResult.risk_score} />
                  </div>
                </div>

                {aiResult.factors.length > 0 && (
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">스코어링 요인</h3>
                    <div className="space-y-2">
                      {aiResult.factors.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className={`w-16 text-xs font-medium flex-shrink-0 ${f.impact === 'POSITIVE' ? 'text-emerald-400' : f.impact === 'NEGATIVE' ? 'text-red-400' : 'text-gray-400'}`}>
                            {f.impact === 'POSITIVE' ? '+' : f.impact === 'NEGATIVE' ? '-' : '~'}{Math.abs(f.weight)}
                          </span>
                          <span className="font-medium text-white w-28 flex-shrink-0">{f.name}</span>
                          <span className="text-gray-400 text-xs">{f.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-400" />관련 문서
                </h3>
                {listing.documents.length === 0 ? (
                  <p className="text-sm text-gray-500">등록된 문서가 없습니다</p>
                ) : (
                  <div className="space-y-2">
                    {listing.documents.map((doc, i) => (
                      <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                        <FileText className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                        <span className="text-sm text-white">{doc.name}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-gray-500 ml-auto" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 사이드바 */}
          <div className="space-y-4">
            {/* 경매 정보 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />경매 정보
              </h3>
              <div className="space-y-3 text-sm">
                {[
                  { label: '경매 기일', value: fmtDate(listing.auction_date) },
                  { label: '입찰 회차', value: `${listing.auction_count}회차` },
                  { label: '입찰보증금', value: fmtKRW(listing.deposit_amount ?? Math.round(listing.min_bid_price * 0.1)) },
                  { label: '상태', value: listing.status },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-gray-500">{label}</span>
                    <span className="text-white font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 실시간 입찰 패널 */}
            <LiveBidPanel
              auctionId={listing.id}
              initialHighest={listing.winning_bid ?? listing.min_bid_price}
              minimumBid={listing.min_bid_price}
              endTime={listing.auction_date ? `${listing.auction_date}T10:00:00` : undefined}
              status={listing.status}
              currentUserId={currentUserId}
            />

            {/* 액션 버튼 */}
            <div className="space-y-2.5">
              <button
                onClick={() => router.push(`/analysis/simulator?appraised=${listing.appraised_value}&minBid=${listing.min_bid_price}&senior=${listing.senior_claim ?? 0}`)}
                className="w-full flex items-center justify-between gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  경매 수익률 분석기
                </span>
                <ChevronRight className="h-4 w-4 opacity-70" />
              </button>

              <button
                onClick={() => router.push(`/deals/new?listing_id=${listing.id}&case=${listing.case_number}`)}
                className="w-full flex items-center justify-between gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-2">
                  <MessageSquarePlus className="h-4 w-4" />
                  딜룸 신청
                </span>
                <ChevronRight className="h-4 w-4 opacity-70" />
              </button>
            </div>

            {/* 주의사항 */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-yellow-400 mb-1">투자 유의사항</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    AI 분석은 참고용이며 실제 투자 결과를 보장하지 않습니다.
                    경매 참여 전 법무사, 감정사 등 전문가 검토를 권장합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
