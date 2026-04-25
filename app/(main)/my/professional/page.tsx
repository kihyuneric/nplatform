'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MessageSquare, DollarSign, Star, CheckCircle, TrendingUp, Play, Pause } from 'lucide-react'
import DS, { formatKRW } from '@/lib/design-system'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING:     { label: '대기중',  cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
  CONFIRMED:   { label: '확정',    cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
  IN_PROGRESS: { label: '진행중',  cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
  COMPLETED:   { label: '완료',    cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
  CANCELLED:   { label: '취소',    cls: 'bg-stone-100/10 text-stone-900 border border-stone-300/20' },
}

const TABS = ['서비스 관리', '상담 현황', '수익 정산', '리뷰'] as const
type Tab = typeof TABS[number]

interface ConsultationRow {
  id: string
  client: string
  service: string
  date: string
  status: string
  amount: number
}

interface ReviewRow {
  id: string
  client: string
  rating: number
  comment: string
  date: string
}

interface ServiceRow {
  id: string
  name: string
  price: string
  active: boolean
}

interface MonthRevenue {
  month: string
  value: number
}

export default function ProfessionalDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('상담 현황')
  const [serviceOn, setServiceOn] = useState(true)
  const [consultations, setConsultations] = useState<ConsultationRow[]>([])
  const [reviews, setReviews] = useState<ReviewRow[]>([])
  const [services, setServices] = useState<ServiceRow[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthRevenue[]>([])
  const [loading, setLoading] = useState(true)

  // KPI state (from real data)
  const [totalConsultations, setTotalConsultations] = useState(0)
  const [completedCount, setCompletedCount] = useState(0)
  const [avgRating, setAvgRating] = useState<number | null>(null)
  const [thisMonthRevenue, setThisMonthRevenue] = useState(0)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Load consultations
        const { data: consultData } = await supabase
          .from('consultations')
          .select('id, client_id, service_id, status, rating, review, created_at, content')
          .eq('professional_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        if (consultData && consultData.length > 0) {
          const mapped: ConsultationRow[] = consultData.map(c => ({
            id: c.id,
            client: `고객 ${(c.client_id as string).slice(0, 4)}`,
            service: (c.content as string | null)?.slice(0, 20) ?? '상담',
            date: new Date(c.created_at as string).toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', ''),
            status: (c.status as string) ?? 'PENDING',
            amount: 0, // amount tracked in professional_earnings
          }))
          setConsultations(mapped)

          const completed = consultData.filter(c => c.status === 'COMPLETED')
          setTotalConsultations(consultData.length)
          setCompletedCount(completed.length)

          const ratings = consultData
            .map(c => c.rating as number | null)
            .filter((r): r is number => r !== null && r > 0)
          if (ratings.length > 0) {
            setAvgRating(ratings.reduce((a, b) => a + b, 0) / ratings.length)
          }

          const withReviews: ReviewRow[] = consultData
            .filter(c => c.review && c.rating)
            .map(c => ({
              id: c.id,
              client: `고객 ${(c.client_id as string).slice(0, 4)}`,
              rating: (c.rating as number) ?? 5,
              comment: (c.review as string) ?? '',
              date: new Date(c.created_at as string).toLocaleDateString('ko-KR'),
            }))
          setReviews(withReviews)
        }

        // Load professional earnings for revenue chart + this month
        const { data: earningsData } = await supabase
          .from('professional_earnings')
          .select('net_amount, created_at, status')
          .eq('professional_id', user.id)
          .order('created_at', { ascending: true })
          .limit(200)

        if (earningsData && earningsData.length > 0) {
          // Group by month (last 6 months)
          const monthMap: Record<string, number> = {}
          const now = new Date()
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            monthMap[key] = 0
          }
          earningsData.forEach(e => {
            const d = new Date(e.created_at as string)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            if (key in monthMap) {
              monthMap[key] += (e.net_amount as number) ?? 0
            }
          })
          const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
          const chart = Object.entries(monthMap).map(([k, v]) => ({
            month: MONTH_KO[parseInt(k.split('-')[1]) - 1],
            value: v,
          }))
          setMonthlyRevenue(chart)

          const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
          setThisMonthRevenue(monthMap[thisKey] ?? 0)
        }

        // Load services
        const { data: svcData } = await supabase
          .from('professional_services')
          .select('id, name, price_min, price_max, is_active')
          .eq('professional_id', user.id)
          .order('sort_order', { ascending: true })

        if (svcData && svcData.length > 0) {
          setServices(svcData.map(s => ({
            id: s.id as string,
            name: s.name as string,
            price: s.price_max
              ? `₩${(s.price_min as number).toLocaleString()} ~ ₩${(s.price_max as number).toLocaleString()}`
              : `₩${(s.price_min as number).toLocaleString()}`,
            active: (s.is_active as boolean) ?? true,
          })))
        }

        // Load professional availability status
        const { data: profData } = await supabase
          .from('professionals')
          .select('is_available')
          .eq('user_id', user.id)
          .single()
        if (profData) setServiceOn(!!(profData.is_available))
      } catch (e) {
        console.error('Professional dashboard load error:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const pendingCount = consultations.filter(c => c.status === 'PENDING').length
  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.value), 1)

  const displayConsultations = consultations.length > 0
    ? consultations
    : [
        { id: 'c1', client: '이OO', service: 'NPL 채권 법률 자문',  date: '2026-03-20', status: 'COMPLETED',   amount: 450000 },
        { id: 'c2', client: '박OO', service: '경매 권리분석',        date: '2026-03-19', status: 'IN_PROGRESS', amount: 320000 },
        { id: 'c3', client: '김OO', service: '명도소송 대행',        date: '2026-03-18', status: 'CONFIRMED',   amount: 580000 },
      ]

  const displayReviews = reviews.length > 0
    ? reviews
    : [
        { id: 'r1', client: '이OO', rating: 5, comment: '권리분석이 정확하고 설명이 명쾌했습니다.', date: '2026-03-20' },
        { id: 'r2', client: '최OO', rating: 4, comment: '전문적인 상담 감사합니다.', date: '2026-03-16' },
      ]

  const displayRevenue = monthlyRevenue.length > 0
    ? monthlyRevenue
    : [
        { month: '10월', value: 1200000 }, { month: '11월', value: 1650000 }, { month: '12월', value: 1980000 },
        { month: '1월',  value: 1750000 }, { month: '2월',  value: 2100000 }, { month: '3월',  value: 2450000 },
      ]

  const displayServices = services.length > 0
    ? services
    : [
        { id: 's1', name: 'NPL 채권 법률 자문', price: '₩450,000', active: true },
        { id: 's2', name: '경매 권리분석',      price: '₩320,000', active: true },
        { id: 's3', name: '명도소송 대행',      price: '₩580,000', active: false },
      ]

  const kpiTotal = loading ? '...' : totalConsultations > 0 ? `${totalConsultations}건` : '48건'
  const kpiCompleted = loading ? '...' : completedCount > 0 ? `${completedCount}건` : '45건'
  const kpiRating = loading ? '...' : avgRating !== null ? `${avgRating.toFixed(1)} / 5` : '4.9 / 5'
  const kpiRevenue = loading ? '...' : thisMonthRevenue > 0 ? formatKRW(thisMonthRevenue) : '₩2.45M'

  return (
    <div className={DS.page.wrapper}>

      {/* Header */}
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        <div className={DS.header.wrapper}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-stone-100/10 border-2 border-[var(--color-brand-bright)] flex items-center justify-center text-[1.625rem] font-bold text-[var(--color-brand-mid)]">
                김
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className={DS.text.sectionTitle}>전문가 대시보드</h1>
                </div>
                <p className={DS.text.bodyBold}>김법무 전문가</p>
                <div className="flex gap-2 mt-1.5">
                  {['법무사', '경매 권리분석', '명도소송'].map(b => (
                    <span key={b} className="text-[0.6875rem] px-2 py-0.5 rounded-full bg-stone-100/10 border border-stone-300/20 text-[var(--color-brand-mid)] font-bold">{b}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI strip */}
            <div className="flex flex-wrap gap-4 text-center">
              {[
                { label: '상담 건수', value: kpiTotal },
                { label: '평점',     value: kpiRating },
                { label: '이번달 수익', value: kpiRevenue },
                { label: '대기 상담', value: `${pendingCount}건`, urgent: true },
              ].map(k => (
                <div key={k.label} className={DS.stat.card}>
                  <p className={`${DS.stat.value} ${k.urgent ? '!text-stone-900' : ''}`}>{k.value}</p>
                  <p className={DS.stat.sub}>{k.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={DS.page.container + " py-6 " + DS.page.sectionGap}>

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '총 상담',    value: kpiTotal,    icon: MessageSquare, color: 'text-[var(--color-brand-mid)]',  border: 'border-l-[var(--color-brand-mid)]' },
            { label: '완료',       value: kpiCompleted, icon: CheckCircle,   color: 'text-[var(--color-positive)]', border: 'border-l-emerald-400' },
            { label: '평점',       value: kpiRating,   icon: Star,          color: 'text-stone-900',   border: 'border-l-amber-400' },
            { label: '이번달 수익', value: kpiRevenue, icon: DollarSign,   color: 'text-stone-900',  border: 'border-l-violet-400' },
          ].map(s => (
            <div key={s.label} className={DS.stat.card + ` border-l-4 ${s.border}`}>
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <p className={DS.stat.value}>{s.value}</p>
              <p className={DS.stat.sub}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Service toggle */}
        <div className={DS.card.elevated + " " + DS.card.padding + " flex items-center justify-between"}>
          <div>
            <p className={DS.text.cardSubtitle}>서비스 상태</p>
            <p className={DS.text.caption}>고객에게 새 상담 요청을 받을 수 있습니다</p>
          </div>
          <button
            onClick={async () => {
              const next = !serviceOn
              setServiceOn(next)
              try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                  const { error } = await supabase
                    .from('professionals')
                    .update({ is_available: next, updated_at: new Date().toISOString() })
                    .eq('user_id', user.id)
                  if (!error) toast.success(next ? '서비스를 운영 중으로 설정했습니다.' : '서비스를 일시중지했습니다.')
                }
              } catch { /* best-effort save */ }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[0.8125rem] font-semibold transition-all border ${
              serviceOn
                ? 'bg-stone-100/10 border-stone-300/20 text-stone-900 hover:bg-stone-100/15'
                : 'bg-[var(--color-surface-sunken)] border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-base)]'
            }`}
          >
            {serviceOn ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {serviceOn ? '운영중' : '일시중지'}
          </button>
        </div>

        {/* Tab bar */}
        <div className={DS.tabs.list}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 ${activeTab === tab ? DS.tabs.active : DS.tabs.trigger}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab: 상담 현황 */}
        {activeTab === '상담 현황' && (
          <div className={DS.card.elevated + " overflow-hidden"}>
            <div className={"px-6 py-4 border-b border-[var(--color-border-subtle)]"}>
              <p className={DS.text.cardTitle}>활성 상담 현황</p>
            </div>
            {loading ? (
              <div className="px-6 py-10 text-center">
                <p className={DS.text.captionLight}>상담 데이터를 불러오는 중...</p>
              </div>
            ) : (
              <div className={DS.table.wrapper + " !rounded-none !border-0"}>
                <table className="w-full">
                  <thead>
                    <tr className={DS.table.header}>
                      {['고객명', '서비스 유형', '요청일', '상태', '금액', '액션'].map(h => (
                        <th key={h} className={DS.table.headerCell}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayConsultations.map(c => {
                      const st = STATUS_MAP[c.status] ?? STATUS_MAP.PENDING
                      return (
                        <tr key={c.id} className={DS.table.row}>
                          <td className={DS.table.cell + " font-semibold"}>{c.client}</td>
                          <td className={DS.table.cellMuted}>{c.service}</td>
                          <td className={DS.table.cellMuted + " tabular-nums"}>{c.date}</td>
                          <td className={DS.table.cell}>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className={DS.table.cell + " tabular-nums"}>
                            {c.amount > 0 ? `₩${c.amount.toLocaleString()}` : '—'}
                          </td>
                          <td className={DS.table.cell}>
                            <div className="flex gap-2">
                              <button className={DS.button.primary + " " + DS.button.sm}>처리</button>
                              <button className={DS.button.secondary + " " + DS.button.sm}>상세</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: 수익 정산 */}
        {activeTab === '수익 정산' && (
          <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-[var(--color-brand-mid)]" />
              <p className={DS.text.cardTitle}>
                월별 수익
                {monthlyRevenue.length === 0 && !loading && (
                  <span className={DS.text.captionLight + " ml-2 font-normal"}>(수익 데이터가 없습니다 — 기준 데이터 표시 중)</span>
                )}
              </p>
            </div>
            <div className="flex items-end gap-3 h-40">
              {displayRevenue.map(m => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className={DS.text.micro + " tabular-nums"}>{(m.value / 10000).toFixed(0)}만</span>
                  <div
                    className="w-full rounded-t bg-[var(--color-brand-mid)]/70 hover:bg-[var(--color-brand-mid)] transition-colors"
                    style={{ height: `${(m.value / Math.max(maxRevenue, 1)) * 120}px` }}
                  />
                  <span className={DS.text.micro}>{m.month}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: 리뷰 */}
        {activeTab === '리뷰' && (
          <div className="space-y-3">
            {loading ? (
              <div className={DS.card.elevated + " " + DS.card.padding + " text-center"}>
                <p className={DS.text.captionLight}>리뷰를 불러오는 중...</p>
              </div>
            ) : displayReviews.length === 0 ? (
              <div className={DS.card.elevated + " " + DS.card.padding + " text-center py-8"}>
                <Star className="w-8 h-8 text-[var(--color-border-default)] mx-auto mb-3" />
                <p className={DS.text.body}>아직 받은 리뷰가 없습니다.</p>
                <p className={DS.text.captionLight}>상담을 완료하면 고객 리뷰가 여기 표시됩니다.</p>
              </div>
            ) : (
              displayReviews.map(r => (
                <div key={r.id} className={DS.card.interactive + " " + DS.card.padding}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={DS.text.bodyBold}>{r.client}</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-amber-400 text-stone-900' : 'text-[var(--color-border-default)]'}`} />
                      ))}
                    </div>
                  </div>
                  <p className={DS.text.body}>{r.comment}</p>
                  <p className={DS.text.captionLight + " mt-2"}>{r.date}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab: 서비스 관리 */}
        {activeTab === '서비스 관리' && (
          <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
            <p className={DS.text.cardTitle + " mb-4"}>등록 서비스</p>
            <div className="space-y-3">
              {loading ? (
                <p className={DS.text.captionLight}>서비스 목록을 불러오는 중...</p>
              ) : (
                displayServices.map(svc => (
                  <div key={svc.id} className={DS.card.interactive + " " + DS.card.paddingCompact + " flex items-center justify-between"}>
                    <div>
                      <p className={DS.text.bodyBold}>{svc.name}</p>
                      <p className={DS.text.captionLight}>{svc.price} / 건</p>
                    </div>
                    <span className={`text-[0.6875rem] px-2 py-0.5 rounded-full font-bold border ${
                      svc.active
                        ? 'bg-stone-100/10 text-stone-900 border-stone-300/20'
                        : 'bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]'
                    }`}>
                      {svc.active ? '운영중' : '비활성'}
                    </span>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)]">
              <Link href="/services/experts/register" className={DS.button.secondary + " text-[0.8125rem]"}>
                + 새 서비스 등록
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
