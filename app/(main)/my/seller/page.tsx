'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Heart, Gavel, CheckCircle2, TrendingUp, Package, Download, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DS, { formatKRW } from '@/lib/design-system'

// Data hook for seller dashboard
interface SellerListing {
  id: string; title: string; claim_amount: number; ai_grade: string | null
  status: string; interest_count: number; view_count: number; created_at: string
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
  '공개중': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  '진행중': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  '초안': 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]',
  '완료': 'bg-violet-500/10 text-violet-400 border border-violet-500/20',
}
const GRADE_CLR: Record<string, string> = {
  'A+': 'text-emerald-600 font-bold', 'A': 'text-blue-600 font-bold',
  'B+': 'text-amber-600 font-bold', 'B': 'text-orange-600 font-bold',
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
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${on ? 'bg-blue-600' : 'bg-[var(--color-surface-overlay)]'}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${on ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  )
}

export default function SellerDashboardPage() {
  const { listings: sellerListings, settlements, loading: sellerLoading, stats: sellerStats, billing } = useSellerData()
  const [tab, setTab] = useState('listings')

  // Map real data to display format
  const STATS = [
    { label: '등록 매물', value: sellerStats.total, icon: Package, color: 'text-[var(--color-brand-mid)]' },
    { label: '진행 중 경매', value: sellerStats.liveAuction, icon: Gavel, color: 'text-sky-500' },
    { label: '관심 수신', value: sellerStats.interests, icon: Heart, color: 'text-pink-600' },
    { label: '완료 거래', value: sellerStats.completed, icon: CheckCircle2, color: 'text-[var(--color-positive)]' },
  ]
  // Phase G7+ · 자발적 경매 진행 정보를 LISTINGS row 에 포함
  const LISTINGS = sellerListings.map(l => {
    const auctionLive = l.bid_end_date ? new Date(l.bid_end_date).getTime() > Date.now() : false
    return {
      id: l.id,
      name: l.title,
      claim: formatClaim(l.claim_amount),
      grade: l.ai_grade || '-',
      status: STATUS_MAP[l.status] || l.status,
      interests: l.interest_count || 0,
      date: l.created_at?.slice(0, 10) || '-',
      bidEndDate: l.bid_end_date,
      auctionLive,
    }
  })
  const CHART: { month: string; views: number; interests: number }[] = []
  const VISITORS = [
    { label: '총 매물 조회', value: `${sellerStats?.views ?? 0}회` },
    { label: '활성 매물', value: `${sellerStats?.active ?? 0}건` },
    { label: '총 관심', value: `${sellerStats?.interests ?? 0}건` },
    { label: '완료 거래', value: `${sellerStats?.completed ?? 0}건` },
  ]

  if (sellerLoading) {
    return (
      <div className={DS.page.wrapper}>
        <div className={DS.page.container + ' ' + DS.page.paddingTop}>
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand-mid)]" />
            <span className="ml-3 text-[var(--color-text-muted)]">매도자 데이터를 불러오는 중...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        <div className={DS.header.wrapper}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className={DS.header.eyebrow}>마이페이지</p>
              <h1 className={DS.header.title}>매도자 대시보드</h1>
              <p className={DS.header.subtitle}>(주)한국자산신탁AMC · Gold Seller</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {[
                ['등록 매물', `${sellerStats.total}건`, ''],
                ['진행중', `${sellerStats.active}건`, '!text-[var(--color-brand-mid)]'],
                ['완료', `${sellerStats.completed}건`, '!text-[var(--color-positive)]'],
                ['이번달 정산', billing.monthSettlement > 0 ? formatKRW(billing.monthSettlement) : '—', '!text-amber-600'],
              ].map(([lbl, val, cls]) => (
                <div key={lbl} className="text-center">
                  <div className={DS.text.caption}>{lbl}</div>
                  <div className={DS.text.metricMedium + " " + cls}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={DS.page.container + " py-6 " + DS.page.sectionGap}>
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

        {/* Tab Bar */}
        <div className={DS.tabs.list}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 ${tab === t.id ? DS.tabs.active : DS.tabs.trigger}`}>
              {t.label}
            </button>
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
                    <th className={DS.table.headerCell}>매물명</th>
                    <th className={DS.table.headerCell}>채권액</th>
                    <th className={DS.table.headerCell}>AI등급</th>
                    <th className={DS.table.headerCell}>상태</th>
                    <th className={DS.table.headerCell}>경매 종료일</th>
                    <th className={DS.table.headerCell}>관심수</th>
                    <th className={DS.table.headerCell}>등록일</th>
                    <th className={DS.table.headerCell}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {LISTINGS.map((l) => (
                    <tr key={l.id} className={DS.table.row}>
                      <td className={DS.table.cell}><span className="font-medium">{l.name}</span><span className={"block text-[0.6875rem] text-[var(--color-text-muted)]"}>{l.id}</span></td>
                      <td className={DS.table.cell + " font-semibold tabular-nums"}>{l.claim}</td>
                      <td className={DS.table.cell + " " + (GRADE_CLR[l.grade] ?? 'text-[var(--color-text-tertiary)]')}>{l.grade}</td>
                      <td className={DS.table.cell}><span className={`text-[0.6875rem] px-2 py-0.5 rounded-full font-bold ${STATUS_CLR[l.status] ?? 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]'}`}>{l.status}</span></td>
                      <td className={DS.table.cell + " tabular-nums"}>
                        {l.bidEndDate ? (
                          <span className={`inline-flex items-center gap-1 text-[0.75rem] ${l.auctionLive ? 'text-sky-600 dark:text-sky-300 font-semibold' : 'text-[var(--color-text-muted)]'}`}>
                            {l.auctionLive && <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />}
                            <Gavel className="h-3 w-3" />
                            {new Date(l.bidEndDate).toLocaleDateString('ko-KR')}
                          </span>
                        ) : (
                          <span className="text-[0.6875rem] text-[var(--color-text-muted)]">—</span>
                        )}
                      </td>
                      <td className={DS.table.cell + " tabular-nums"}><span className="flex items-center gap-1"><Heart className="h-3 w-3 text-pink-500" />{l.interests}</span></td>
                      <td className={DS.table.cellMuted + " tabular-nums"}>{l.date}</td>
                      <td className={DS.table.cell}>
                        <div className="flex items-center gap-1.5">
                          {/* Phase G6 · 매도자 본인 매물 상세/편집 링크 연결 */}
                          <Link
                            href={`/exchange/listings/${l.id}`}
                            className={DS.text.link + " text-[0.8125rem]"}
                          >
                            상세
                          </Link>
                          <span className="text-[var(--color-border-default)]">|</span>
                          <Link
                            href={`/my/listings/${l.id}/edit`}
                            className={DS.text.caption + " hover:text-[var(--color-text-primary)] transition-colors"}
                          >
                            수정
                          </Link>
                          <span className="text-[var(--color-border-default)]">|</span>
                          <button className="text-[0.8125rem] text-[var(--color-danger)] hover:text-red-400 transition-colors cursor-pointer">종료</button>
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
                  <Bar dataKey="views" fill="var(--color-brand-mid)" radius={[4, 4, 0, 0]} name="조회수" />
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
                { label: '미지급 금액', value: billing.pendingSettlement > 0 ? formatKRW(billing.pendingSettlement) : '—', sub: '정산 대기 중', color: 'text-amber-600' },
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
                      const statusCls = row.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : row.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      const fmtKRW = (v: number) => `₩${v.toLocaleString()}`
                      return (
                        <tr key={row.id ?? i} className={DS.table.row}>
                          <td className={DS.table.cellMuted + ' tabular-nums'}>{row.settled_at?.slice(0, 10) || '-'}</td>
                          <td className={DS.table.cell + ' font-medium'}>{row.listing_title}</td>
                          <td className={DS.table.cell + ' tabular-nums'}>{fmtKRW(row.deal_amount)}</td>
                          <td className={DS.table.cellMuted + ' tabular-nums text-[var(--color-danger)]'}>-{fmtKRW(row.commission)}</td>
                          <td className={DS.table.cell + ' tabular-nums font-semibold text-[var(--color-positive)]'}>{fmtKRW(row.net_amount)}</td>
                          <td className={DS.table.cell}>
                            <span className={`text-[0.6875rem] px-2 py-0.5 rounded-full font-bold ${statusCls}`}>{statusLabel}</span>
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
                { id: 'auto_approve', label: '신규 관심 자동 승인', desc: '매수자의 관심 신청을 자동으로 수락합니다', defaultOn: true },
                { id: 'show_price', label: '가격 공개', desc: '채권 금액을 목록에서 공개합니다', defaultOn: true },
                { id: 'show_contact', label: '연락처 공개 (L1 이상)', desc: 'L1 이상 투자자에게 담당자 연락처를 공개합니다', defaultOn: false },
                { id: 'allow_negotiation', label: '가격 협상 허용', desc: '매수자의 가격 협상 요청을 허용합니다', defaultOn: true },
              ].map(s => (
                <SellerSettingToggle key={s.id} {...s} />
              ))}
            </div>

            <div className={DS.card.elevated + ' ' + DS.card.padding + ' space-y-4'}>
              <h2 className={DS.text.cardTitle}>알림 설정</h2>
              {[
                { id: 'notif_interest', label: '관심 수신 알림', desc: '매수자가 매물에 관심을 등록하면 알림을 받습니다', defaultOn: true },
                { id: 'notif_inquiry', label: '문의 알림', desc: '매수자가 문의를 남기면 알림을 받습니다', defaultOn: true },
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
    </div>
  )
}
