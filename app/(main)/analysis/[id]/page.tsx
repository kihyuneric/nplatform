'use client'

import { useState, useEffect, use, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  Building2, Scale, BarChart3, Users, Landmark, Calculator,
  AlertTriangle, CheckCircle2, ArrowRight, Shield, Briefcase,
  Printer, FileDown,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts'

/* ───────────────────── helpers ───────────────────── */

function fmt(v: number | undefined | null) {
  if (v == null || v === 0) return '-'
  if (Math.abs(v) >= 1_0000_0000) return `${(v / 1_0000_0000).toFixed(1)}억`
  if (Math.abs(v) >= 1_0000) return `${(v / 1_0000).toFixed(0)}만`
  return v.toLocaleString()
}

function fmtCompact(v: number | undefined | null) {
  if (v == null || v === 0) return '-'
  if (Math.abs(v) >= 100_0000_0000) return `${Math.round(v / 1_0000_0000)}억`
  if (Math.abs(v) >= 1_0000_0000) return `${(v / 1_0000_0000).toFixed(1)}억`
  if (Math.abs(v) >= 1_0000) return `${(v / 1_0000).toFixed(0)}만`
  return v.toLocaleString()
}

function fmtWon(v: number | undefined | null) {
  if (v == null) return '-'
  return v.toLocaleString() + '원'
}

function gradeColor(grade: string) {
  switch (grade) {
    case 'A': return { bg: 'bg-emerald-100 dark:bg-emerald-900/50', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-300 dark:border-emerald-700', ring: 'ring-emerald-200 dark:ring-emerald-800', accent: 'border-emerald-500', glow: 'rgba(16,185,129,0.6)', solid: '#10B981', heroText: 'text-emerald-400', heroBg: 'bg-emerald-500/10' }
    case 'B': return { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-300 dark:border-blue-700', ring: 'ring-blue-200 dark:ring-blue-800', accent: 'border-blue-500', glow: 'rgba(59,130,246,0.6)', solid: '#3B82F6', heroText: 'text-blue-400', heroBg: 'bg-blue-500/10' }
    case 'C': return { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-300 dark:border-amber-700', ring: 'ring-amber-200 dark:ring-amber-800', accent: 'border-amber-500', glow: 'rgba(245,158,11,0.6)', solid: '#F59E0B', heroText: 'text-amber-400', heroBg: 'bg-amber-500/10' }
    case 'D': return { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-400', border: 'border-red-300 dark:border-red-700', ring: 'ring-red-200 dark:ring-red-800', accent: 'border-red-500', glow: 'rgba(239,68,68,0.6)', solid: '#EF4444', heroText: 'text-red-400', heroBg: 'bg-red-500/10' }
    default: return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-700', ring: 'ring-gray-200 dark:ring-gray-800', accent: 'border-gray-400', glow: 'rgba(156,163,175,0.4)', solid: '#9CA3AF', heroText: 'text-gray-400', heroBg: 'bg-gray-500/10' }
  }
}

function riskScoreColor(score: number) {
  if (score <= 30) return '#10B981'
  if (score <= 60) return '#F59E0B'
  return '#EF4444'
}

function verdictLabel(grade: string) {
  if (grade === 'A') return { label: '투자 추천', color: 'bg-emerald-500 text-white' }
  if (grade === 'B') return { label: '투자 검토', color: 'bg-blue-500 text-white' }
  if (grade === 'C') return { label: '주의 필요', color: 'bg-amber-500 text-white' }
  return { label: '비추천', color: 'bg-red-600 text-white' }
}

/* ───────────────────── types ───────────────────── */

interface BidRateTrend { month: string; rate: number }
interface BidRateStats { avg_1m: number; avg_3m: number; avg_6m: number; trend_12m: BidRateTrend[] }
interface CourtInfo {
  court_name: string
  avg_processing_days: number
  active_cases: number
  recent_cases: { case_number: string; property_type: string; appraisal_value: number; bid_price: number; bid_rate: number; date: string }[]
}
interface SimilarCase { case_number: string; address: string; appraisal_value: number; bid_price: number; bid_rate: number; fail_count: number; bid_date: string }
interface TransactionCase { address: string; area: number; price: number; date: string; type: string }
interface RiskFactor { category: string; description: string; severity: 'high' | 'medium' | 'low' }
interface PositiveFactor { category: string; description: string }
interface RoiScenario { bid_rate_pct: number; bid_price: number; acquisition_cost: number; expected_market_value: number; expected_profit: number; roi_pct: number }

interface AnalysisData {
  id: string
  case_number: string
  address: string
  property_type: string
  area_land: number
  area_building: number
  institution: string
  status: string
  appraisal_value: number
  official_price: number
  market_price: number
  kb_price: number
  minimum_price: number
  auction_count: number
  next_auction_date: string
  court_name: string
  ai_grade: string
  risk_score: number
  safety_score: number
  recommendation_text: string
  bid_rate_stats: BidRateStats
  court_info: CourtInfo
  similar_cases: SimilarCase[]
  transaction_cases: TransactionCase[]
  risk_factors: RiskFactor[]
  positive_factors: PositiveFactor[]
  roi_scenarios: RoiScenario[]
}

/* ───────────────────── mock data ───────────────────── */

const MOCK_DATA: AnalysisData = {
  id: 'mock-001',
  case_number: '2025타경12345',
  address: '서울특별시 강남구 역삼동 123-45 역삼타워 301호',
  property_type: '아파트',
  area_land: 85.2,
  area_building: 112.5,
  institution: '국민은행',
  status: '진행중',
  appraisal_value: 980000000,
  official_price: 850000000,
  market_price: 1050000000,
  kb_price: 1020000000,
  minimum_price: 627200000,
  auction_count: 2,
  next_auction_date: '2026-04-15',
  court_name: '서울중앙지방법원',
  ai_grade: 'B',
  risk_score: 42,
  safety_score: 71,
  recommendation_text: '본 물건은 강남구 역삼동에 위치한 아파트로, 감정가 대비 최저매각가율이 64%로 형성되어 있어 투자 메리트가 있습니다. 다만 임차인 현황과 권리분석에 대한 면밀한 검토가 필요하며, 최근 해당 지역 낙찰가율이 소폭 하락 추세에 있어 보수적 접근이 권장됩니다. 전반적으로 중장기 투자 관점에서 양호한 물건으로 판단됩니다.',
  bid_rate_stats: {
    avg_1m: 78.5, avg_3m: 81.2, avg_6m: 83.7,
    trend_12m: [
      { month: '2025-04', rate: 86.2 }, { month: '2025-05', rate: 84.8 }, { month: '2025-06', rate: 85.5 },
      { month: '2025-07', rate: 83.1 }, { month: '2025-08', rate: 82.4 }, { month: '2025-09', rate: 80.9 },
      { month: '2025-10', rate: 81.7 }, { month: '2025-11', rate: 79.3 }, { month: '2025-12', rate: 78.8 },
      { month: '2026-01', rate: 80.1 }, { month: '2026-02', rate: 79.5 }, { month: '2026-03', rate: 78.5 },
    ],
  },
  court_info: {
    court_name: '서울중앙지방법원',
    avg_processing_days: 245,
    active_cases: 1823,
    recent_cases: [
      { case_number: '2025타경11234', property_type: '아파트',   appraisal_value: 750000000,  bid_price: 615000000,  bid_rate: 82.0, date: '2026-03-10' },
      { case_number: '2025타경11456', property_type: '오피스텔', appraisal_value: 320000000,  bid_price: 243200000,  bid_rate: 76.0, date: '2026-03-08' },
      { case_number: '2025타경11678', property_type: '아파트',   appraisal_value: 1200000000, bid_price: 1008000000, bid_rate: 84.0, date: '2026-03-05' },
    ],
  },
  similar_cases: [
    { case_number: '2025타경10001', address: '서울 강남구 역삼동 111-22', appraisal_value: 950000000,  bid_price: 779000000, bid_rate: 82.0, fail_count: 1, bid_date: '2026-02-20' },
    { case_number: '2025타경10045', address: '서울 강남구 역삼동 234-56', appraisal_value: 1020000000, bid_price: 816000000, bid_rate: 80.0, fail_count: 2, bid_date: '2026-01-15' },
    { case_number: '2025타경10112', address: '서울 강남구 삼성동 78-9',   appraisal_value: 890000000,  bid_price: 747600000, bid_rate: 84.0, fail_count: 0, bid_date: '2026-01-08' },
    { case_number: '2024타경98765', address: '서울 강남구 역삼동 456-78', appraisal_value: 1050000000, bid_price: 808500000, bid_rate: 77.0, fail_count: 3, bid_date: '2025-12-18' },
    { case_number: '2024타경97654', address: '서울 강남구 대치동 33-12',  appraisal_value: 920000000,  bid_price: 773000000, bid_rate: 84.0, fail_count: 1, bid_date: '2025-11-25' },
  ],
  transaction_cases: [
    { address: '역삼동 123-45', area: 112.5, price: 1080000000, date: '2026-01-20', type: '매매' },
    { address: '역삼동 130-10', area: 108.0, price: 1020000000, date: '2025-12-05', type: '매매' },
    { address: '역삼동 145-22', area: 115.0, price: 1100000000, date: '2025-11-18', type: '매매' },
  ],
  risk_factors: [
    { category: '임차인',   description: '대항력 있는 임차인 1명 존재 (보증금 2억원)',       severity: 'high'   },
    { category: '권리관계', description: '선순위 근저당 설정액이 감정가의 85% 수준',          severity: 'medium' },
    { category: '시장환경', description: '최근 6개월 낙찰가율 하락 추세 (-5.2%p)',           severity: 'medium' },
    { category: '물건상태', description: '준공 후 15년 경과, 내부 수선 필요 가능성',          severity: 'low'    },
  ],
  positive_factors: [
    { category: '입지',     description: '강남구 역삼역 도보 5분 이내 초역세권 입지'              },
    { category: '가격',     description: '감정가 대비 최저매각가 64%로 시세 대비 할인폭 큼'      },
    { category: '수요',     description: '해당 단지 최근 1년 거래량 활발 (월 평균 3.2건)'        },
    { category: '개발호재', description: '역삼역 인근 재개발 호재로 중장기 가치 상승 기대'       },
  ],
  roi_scenarios: [
    { bid_rate_pct: 60, bid_price: 588000000, acquisition_cost: 615060000, expected_market_value: 1050000000, expected_profit: 434940000, roi_pct: 70.7 },
    { bid_rate_pct: 70, bid_price: 686000000, acquisition_cost: 717470000, expected_market_value: 1050000000, expected_profit: 332530000, roi_pct: 46.3 },
    { bid_rate_pct: 80, bid_price: 784000000, acquisition_cost: 819880000, expected_market_value: 1050000000, expected_profit: 230120000, roi_pct: 28.1 },
    { bid_rate_pct: 90, bid_price: 882000000, acquisition_cost: 922290000, expected_market_value: 1050000000, expected_profit: 127710000, roi_pct: 13.8 },
  ],
}

/* ───────────────────── page ───────────────────── */

interface PageProps {
  params: Promise<{ id: string }>
}

const TABS = [
  { value: 'overview',  label: '종합 분석',  icon: BarChart3     },
  { value: 'risk',      label: '리스크 분석', icon: AlertTriangle },
  { value: 'strategy',  label: '전략 제안',  icon: TrendingUp    },
  { value: 'legal',     label: '법률 검토',  icon: Scale         },
]

export default function NplAnalysisDetail({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/analysis/${id}`)
        if (res.ok) {
          setData(await res.json())
        } else {
          setData({ ...MOCK_DATA, id })
        }
      } catch {
        setData({ ...MOCK_DATA, id })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const gc = useMemo(() => data ? gradeColor(data.ai_grade) : gradeColor(''), [data])

  const buildSimulatorUrl = useMemo(() => {
    if (!data) return '/tools/auction-simulator'
    const typeUpper = data.property_type?.toUpperCase() || ''
    let category = '토지건물'
    if (['아파트', '빌라', 'APARTMENT', 'VILLA'].some(t => typeUpper.includes(t))) category = '주택'
    else if (['토지', 'LAND'].some(t => typeUpper.includes(t))) category = '토지건물'
    const propertyTypeMap: Record<string, string> = {
      '아파트': '아파트', '오피스텔': '오피스텔', '빌라': '빌라', '토지': '토지', '상가': '상가',
    }
    const propertyType = propertyTypeMap[data.property_type] || data.property_type || '아파트'
    const appraised = Math.round(data.appraisal_value / 10000)
    const minBid = data.minimum_price ? Math.round(data.minimum_price / 10000) : Math.round(appraised * 0.7)
    const salePrice = data.market_price ? Math.round(data.market_price / 10000) : appraised
    const area = data.area_building || data.area_land || 0
    const params2 = new URLSearchParams({
      from: 'analysis', analysisId: data.id, caseNumber: data.case_number || '',
      propertyType, category, area: area.toString(), appraisedValue: appraised.toString(),
      minimumBid: minBid.toString(), expectedSalePrice: salePrice.toString(),
      startBid: Math.round(minBid * 0.85).toString(),
      bidStep: Math.round(Math.max(appraised * 0.01, 100)).toString(),
      holdingMonths: '12', loanRatio: '70',
    })
    return `/tools/auction-simulator?${params2.toString()}`
  }, [data])

  /* loading skeleton */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#060E1C]">
        <div className="h-14 bg-[#0D1F38] animate-pulse" />
        <div className="h-64 bg-gradient-to-br from-[#060E1C] to-[#0D1F38] animate-pulse" />
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
          <div className="-mt-8 grid gap-4 sm:grid-cols-4 relative z-10">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-[#0D1F38] animate-pulse" />)}
          </div>
          <div className="h-10 rounded-xl bg-[#0D1F38] animate-pulse" />
          <div className="h-80 rounded-2xl bg-[#0D1F38] animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">분석 데이터를 찾을 수 없습니다.</p>
        <Link href="/analysis" className="mt-4 inline-block">
          <Button variant="outline">목록으로</Button>
        </Link>
      </div>
    )
  }

  const trendDirection = (() => {
    const t = data.bid_rate_stats?.trend_12m
    if (!t || t.length < 2) return 'flat'
    const recent = t.slice(-3).reduce((s, v) => s + v.rate, 0) / 3
    const earlier = t.slice(0, 3).reduce((s, v) => s + v.rate, 0) / 3
    const diff = recent - earlier
    if (diff > 1.5) return 'up'
    if (diff < -1.5) return 'down'
    return 'flat'
  })()

  const priceComparisonData = [
    { name: '감정가',   value: data.appraisal_value, fill: '#0D1F38' },
    { name: '공시가격', value: data.official_price,  fill: '#2E75B6' },
    { name: '실거래가', value: data.market_price,    fill: '#10B981' },
    { name: 'KB시세',  value: data.kb_price,         fill: '#8B5CF6' },
  ]

  const verdict = verdictLabel(data.ai_grade)
  const bestScenario = data.roi_scenarios?.reduce((best, s) => s.roi_pct > best.roi_pct ? s : best, data.roi_scenarios[0])

  const minPriceRatio = ((data.minimum_price / data.appraisal_value) * 100).toFixed(1)

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#060E1C]">

      {/* ═══ STICKY HEADER BAR 56px ════════════════════════════ */}
      <div className="sticky top-0 z-30 h-14 bg-[#0D1F38] border-b border-white/8 shadow-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-full flex items-center justify-between gap-3">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/analysis"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="h-4 w-px bg-white/20 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-normal hidden sm:block">AI 분석 리포트</p>
              <h1 className="text-sm font-bold text-white leading-tight truncate">
                {data.case_number || id} — {data.property_type}
              </h1>
            </div>
          </div>
          {/* Right: grade + actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => window.print()}
              className="hidden sm:flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:bg-white/20 hover:text-white transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              인쇄
            </button>
            <div className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black ${gc.bg} ${gc.text} ring-2 ${gc.ring}`}>
              <Shield className="h-3.5 w-3.5" />
              AI 등급 {data.ai_grade}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ GRADE HERO SECTION ════════════════════════════════ */}
      <div className="bg-gradient-to-br from-[#060E1C] to-[#0D1F38] pt-10 pb-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Giant grade letter */}
            <div className="relative shrink-0">
              <div
                className={`text-[120px] sm:text-[160px] font-black leading-none select-none ${gc.heroText}`}
                style={{ textShadow: `0 0 80px ${gc.glow}, 0 0 40px ${gc.glow}` }}
              >
                {data.ai_grade}
              </div>
              <div
                className="absolute inset-0 rounded-3xl blur-3xl opacity-20 -z-10"
                style={{ backgroundColor: gc.solid }}
              />
            </div>
            {/* Text info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${verdict.color}`}>
                  <Shield className="h-3.5 w-3.5" />
                  {verdict.label}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-white/10 text-white/70">
                  {data.property_type} · {data.status}
                </span>
              </div>
              <p className="text-white/50 text-sm mb-2 font-mono">{data.case_number}</p>
              <p className="text-white text-base font-semibold mb-4 leading-relaxed max-w-2xl">
                {data.address}
              </p>
              <p className="text-white/60 text-sm leading-relaxed max-w-2xl line-clamp-2">
                {data.recommendation_text}
              </p>
            </div>
            {/* Right: best ROI + nav score */}
            <div className="flex gap-5 shrink-0">
              {bestScenario && (
                <div className="text-center">
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-normal mb-1">최대 ROI</p>
                  <p className="text-3xl font-black text-[#10B981]">+{bestScenario.roi_pct.toFixed(1)}%</p>
                </div>
              )}
              <div className="w-px bg-white/15 self-stretch" />
              <div className="text-center">
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-normal mb-1">안전점수</p>
                <p className="text-3xl font-black text-white">{data.safety_score}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ KPI ROW — floats over dark→light boundary ═══════ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 -mt-10 relative z-10 mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

          {/* AI 등급 */}
          <div className={`card-elevated rounded-2xl p-5 border-2 ${gc.border}`}>
            <p className="data-label mb-3">AI 등급</p>
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl font-black mb-2 ${gc.bg} ${gc.text}`}>
              {data.ai_grade}
            </div>
            <p className={`text-sm font-bold ${gc.text}`}>
              {data.ai_grade === 'A' ? '매우 우수' : data.ai_grade === 'B' ? '우수' : data.ai_grade === 'C' ? '보통' : '주의'}
            </p>
          </div>

          {/* 리스크 점수 */}
          <div className="card-elevated rounded-2xl p-5">
            <p className="data-label mb-3">리스크 점수</p>
            <div className="flex items-end gap-1.5 mb-2">
              <span className="text-3xl font-black tabular-nums" style={{ color: riskScoreColor(data.risk_score) }}>
                {data.risk_score}
              </span>
              <span className="mb-1 text-xs text-gray-400">/ 100</span>
            </div>
            <div className="h-2 rounded-full bg-[#E8EDF3] dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${data.risk_score}%`, backgroundColor: riskScoreColor(data.risk_score) }}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              {data.risk_score <= 30 ? '낮은 리스크' : data.risk_score <= 60 ? '보통 리스크' : '높은 리스크'}
            </p>
          </div>

          {/* 투자 안전점수 */}
          <div className="card-elevated rounded-2xl p-5">
            <p className="data-label mb-3">투자 안전점수</p>
            <div className="flex items-end gap-1.5 mb-2">
              <span className="text-3xl font-black text-[#0D1F38] dark:text-blue-400 tabular-nums">{data.safety_score}</span>
              <span className="mb-1 text-xs text-gray-400">/ 100</span>
            </div>
            <div className="h-2 rounded-full bg-[#E8EDF3] dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#0D1F38] dark:bg-blue-500 transition-all duration-700"
                style={{ width: `${data.safety_score}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              {data.safety_score >= 70 ? '안전' : data.safety_score >= 40 ? '보통' : '위험'}
            </p>
          </div>

          {/* 핵심 가격 */}
          <div className="card-elevated rounded-2xl p-5">
            <p className="data-label mb-3">핵심 가격 정보</p>
            <div className="space-y-2 text-xs">
              {[
                { label: '감정가',    value: fmt(data.appraisal_value), color: 'text-[#0D1F38] dark:text-white font-bold' },
                { label: '최저매각가', value: fmt(data.minimum_price),   color: 'text-blue-600 dark:text-blue-400 font-bold' },
                { label: '최저가율',  value: `${minPriceRatio}%`,        color: 'text-[#10B981] font-bold' },
                { label: '실거래가',  value: fmt(data.market_price),     color: 'text-purple-600 dark:text-purple-400 font-bold' },
              ].map(item => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-gray-400">{item.label}</span>
                  <span className={item.color}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6 pb-12">

        {/* ═══ NATIVE TAB NAVIGATION ══════════════════════════ */}
        <div className="flex gap-1 p-1.5 rounded-2xl bg-white dark:bg-[#0D1F38] border border-[#E8EDF3] dark:border-white/10 shadow-sm overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 justify-center ${
                activeTab === tab.value
                  ? 'bg-[#0D1F38] text-white dark:bg-[#1B3A5C] dark:text-white shadow-md border dark:border-white/10'
                  : 'text-gray-500 dark:text-white/50 hover:text-[#0D1F38] dark:hover:text-white hover:bg-[#0D1F38]/5 dark:hover:bg-white/5'
              }`}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB 1: 종합 분석
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">

            {/* ROI Scenario Chart */}
            <div className="card-elevated rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#0D1F38] dark:text-white mb-5 uppercase tracking-wider">입찰가율별 수익성 시뮬레이션</h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.roi_scenarios || []} layout="vertical" margin={{ left: 10, right: 50, top: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8EDF3" />
                    <XAxis type="number" tickFormatter={(v: number) => `${v}%`} fontSize={11} stroke="#9DAAB8" />
                    <YAxis type="category" dataKey="bid_rate_pct" tickFormatter={(v: number) => `${v}%`} width={40} fontSize={11} stroke="#9DAAB8" />
                    <Tooltip
                      formatter={(value: number) => [`${value.toFixed(1)}%`, 'ROI']}
                      contentStyle={{ borderRadius: 10, border: '1px solid #E8EDF3', fontSize: 13, backgroundColor: '#fff' }}
                    />
                    <Bar dataKey="roi_pct" radius={[0, 8, 8, 0]} barSize={28}>
                      {(data.roi_scenarios || []).map((sc, i) => (
                        <Cell key={i} fill={sc.roi_pct >= 30 ? '#10B981' : sc.roi_pct >= 10 ? '#F59E0B' : '#EF4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* ROI data table */}
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#E8EDF3] dark:border-white/10">
                      {['입찰가율', '입찰가', '취득비용', '예상 시세', '예상 수익', 'ROI'].map(h => (
                        <th key={h} className="py-2 px-3 text-left font-semibold text-gray-400 dark:text-white/40 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.roi_scenarios || []).map((sc, i) => (
                      <tr
                        key={i}
                        className={`border-b border-[#E8EDF3] dark:border-white/5 transition-colors hover:bg-[#F8F9FB] dark:hover:bg-white/3 ${sc.expected_profit < 0 ? 'bg-red-50/60 dark:bg-red-950/20' : ''}`}
                      >
                        <td className="py-2.5 px-3 font-black text-[#0D1F38] dark:text-blue-400 tabular-nums">{sc.bid_rate_pct}%</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300 tabular-nums">{fmt(sc.bid_price)}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300 tabular-nums">{fmt(sc.acquisition_cost)}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300 tabular-nums">{fmt(sc.expected_market_value)}</td>
                        <td className={`py-2.5 px-3 font-bold tabular-nums ${sc.expected_profit >= 0 ? 'text-[#10B981]' : 'text-red-600 dark:text-red-400'}`}>
                          {sc.expected_profit >= 0 ? '+' : ''}{fmt(sc.expected_profit)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-black ${
                            sc.roi_pct >= 30 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            sc.roi_pct >= 10 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                            'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                          }`}>
                            {sc.roi_pct >= 0 ? '+' : ''}{sc.roi_pct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Price comparison + bid rate trend */}
            <div className="grid gap-5 lg:grid-cols-2">

              {/* Price comparison */}
              <div className="card-elevated rounded-2xl p-6">
                <h3 className="text-sm font-bold text-[#0D1F38] dark:text-white mb-5 uppercase tracking-wider">시세 비교 분석</h3>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={priceComparisonData} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8EDF3" />
                      <XAxis type="number" tickFormatter={(v: number) => fmt(v)} fontSize={11} stroke="#9DAAB8" />
                      <YAxis type="category" dataKey="name" width={60} fontSize={11} stroke="#9DAAB8" />
                      <Tooltip formatter={(value: number) => [fmtWon(value), '금액']} contentStyle={{ borderRadius: 10, border: '1px solid #E8EDF3', backgroundColor: '#fff' }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={26}>
                        {priceComparisonData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: '감정가 대비 최저가율', value: ((data.minimum_price / data.appraisal_value) * 100).toFixed(1) },
                    { label: '시세 대비 최저가율',   value: ((data.minimum_price / data.market_price) * 100).toFixed(1)   },
                    { label: 'KB시세 대비 최저가율', value: ((data.minimum_price / data.kb_price) * 100).toFixed(1)       },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl bg-[#F8F9FB] dark:bg-white/5 p-3 text-center border border-[#E8EDF3] dark:border-white/8">
                      <p className="text-[10px] text-gray-400 leading-tight mb-1">{item.label}</p>
                      <p className="text-xl font-black text-[#0D1F38] dark:text-blue-400">{item.value}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bid rate trend */}
              <div className="card-elevated rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-bold text-[#0D1F38] dark:text-white uppercase tracking-wider">12개월 낙찰가율 추이</h3>
                  <div className="flex items-center gap-1.5">
                    {trendDirection === 'up'   && <TrendingUp   className="h-4 w-4 text-[#10B981]" />}
                    {trendDirection === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                    {trendDirection === 'flat' && <Minus        className="h-4 w-4 text-gray-400" />}
                    <span className={`text-xs font-black ${trendDirection === 'up' ? 'text-[#10B981]' : trendDirection === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                      {trendDirection === 'up' ? '상승' : trendDirection === 'down' ? '하락' : '보합'}
                    </span>
                  </div>
                </div>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.bid_rate_stats?.trend_12m || []} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
                      <defs>
                        <linearGradient id="bidRateGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#1B3A5C" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#1B3A5C" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF3" />
                      <XAxis dataKey="month" fontSize={10} tickFormatter={(v: string) => v.slice(5)} stroke="#9DAAB8" />
                      <YAxis domain={['dataMin - 3', 'dataMax + 3']} fontSize={10} tickFormatter={(v: number) => `${v}%`} stroke="#9DAAB8" />
                      <Tooltip formatter={(value: number) => [`${value}%`, '낙찰가율']} contentStyle={{ borderRadius: 10, border: '1px solid #E8EDF3', backgroundColor: '#fff' }} />
                      <Area type="monotone" dataKey="rate" stroke="#1B3A5C" strokeWidth={2.5} fill="url(#bidRateGrad)" dot={{ r: 3, fill: '#1B3A5C' }} activeDot={{ r: 5, fill: '#0D1F38' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: '1개월 평균', value: `${data.bid_rate_stats?.avg_1m ?? 0}%`, color: 'text-[#0D1F38] dark:text-blue-400' },
                    { label: '3개월 평균', value: `${data.bid_rate_stats?.avg_3m ?? 0}%`, color: 'text-[#1B3A5C] dark:text-blue-300' },
                    { label: '6개월 평균', value: `${data.bid_rate_stats?.avg_6m ?? 0}%`, color: 'text-[#10B981]' },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl bg-[#F8F9FB] dark:bg-white/5 p-3 text-center border border-[#E8EDF3] dark:border-white/8">
                      <p className="text-[10px] text-gray-400">{item.label}</p>
                      <p className={`mt-1 text-xl font-black ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Similar cases */}
            <div className="card-elevated rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#0D1F38] dark:text-white mb-5 uppercase tracking-wider">유사 경매 낙찰 사례</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#E8EDF3] dark:border-white/10">
                      {['사건번호', '소재지', '감정가', '낙찰가', '낙찰가율', '유찰', '낙찰일'].map(h => (
                        <th key={h} className="py-2 px-3 text-left font-semibold text-gray-400 dark:text-white/40 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.similar_cases || []).map((sc, i) => (
                      <tr key={i} className="border-b border-[#E8EDF3] dark:border-white/5 hover:bg-[#F8F9FB] dark:hover:bg-white/3 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#0D1F38] dark:text-blue-400">{sc.case_number}</td>
                        <td className="py-2.5 px-3 max-w-[160px] truncate text-gray-600 dark:text-gray-300">{sc.address}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300">{fmt(sc.appraisal_value)}</td>
                        <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400">{fmt(sc.bid_price)}</td>
                        <td className="py-2.5 px-3 font-black text-[#0D1F38] dark:text-white">{sc.bid_rate}%</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            sc.fail_count === 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            sc.fail_count <= 2   ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          }`}>{sc.fail_count}회</span>
                        </td>
                        <td className="py-2.5 px-3 text-gray-400">{sc.bid_date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {(() => {
                  const rates = (data.similar_cases || []).map(s => s.bid_rate)
                  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
                  const max = Math.max(...rates)
                  const min = Math.min(...rates)
                  return [
                    { label: '평균 낙찰가율', value: `${avg.toFixed(1)}%` },
                    { label: '최고 낙찰가율', value: `${max}%` },
                    { label: '최저 낙찰가율', value: `${min}%` },
                  ]
                })().map(item => (
                  <div key={item.label} className="rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4 text-center border border-blue-100 dark:border-blue-900/30">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{item.label}</p>
                    <p className="mt-1 text-2xl font-black text-[#0D1F38] dark:text-blue-400">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 2: 리스크 분석
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'risk' && (
          <div className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">

              {/* Risk score gauge */}
              <div className="card-elevated rounded-2xl p-6">
                <p className="data-label mb-5">리스크 점수 게이지</p>
                <div className="flex items-center gap-6">
                  <div className="relative w-32 h-32 shrink-0">
                    <svg viewBox="0 0 100 100" className="w-32 h-32 -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#E8EDF3" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="40" fill="none" strokeWidth="8"
                        stroke={riskScoreColor(data.risk_score)}
                        strokeDasharray={`${(data.risk_score / 100) * 251} 251`}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${riskScoreColor(data.risk_score)})` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-[#0D1F38] dark:text-white tabular-nums">{data.risk_score}</span>
                      <span className="text-[10px] text-gray-400">/ 100</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-2xl font-black mb-1" style={{ color: riskScoreColor(data.risk_score) }}>
                      {data.risk_score <= 30 ? '낮은 리스크' : data.risk_score <= 60 ? '보통 리스크' : '높은 리스크'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {data.risk_score <= 30
                        ? '전반적으로 안전한 투자 물건입니다.'
                        : data.risk_score <= 60
                        ? '일부 리스크 요인이 있어 실사가 필요합니다.'
                        : '다수의 고위험 요인이 있어 신중한 접근이 필요합니다.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* LTV 분석 */}
              <div className="card-elevated rounded-2xl p-6">
                <p className="data-label mb-5">가격 비율 분석</p>
                <div className="space-y-4">
                  {[
                    { label: '감정가 대비 최저매각가', value: ((data.minimum_price / data.appraisal_value) * 100).toFixed(1), color: '#10B981' },
                    { label: '감정가 대비 시세',       value: ((data.market_price / data.appraisal_value) * 100).toFixed(1),  color: '#1B3A5C' },
                    { label: '시세 대비 최저매각가',   value: ((data.minimum_price / data.market_price) * 100).toFixed(1),   color: '#8B5CF6' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{item.label}</span>
                        <span className="font-black tabular-nums" style={{ color: item.color }}>{item.value}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[#E8EDF3] dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(parseFloat(item.value), 100)}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                  <hr className="border-t border-[#E8EDF3] dark:border-white/10" />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="data-label mb-0.5">다음 매각기일</p>
                      <p className="font-semibold text-[#0D1F38] dark:text-white">{data.next_auction_date || '-'}</p>
                    </div>
                    <div>
                      <p className="data-label mb-0.5">유찰 횟수</p>
                      <p className="font-semibold text-[#0D1F38] dark:text-white">{data.auction_count}회</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk & Positive factors */}
            <div className="grid gap-5 sm:grid-cols-2">

              <div className="card-elevated rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">위험 요인</h3>
                </div>
                <ul className="space-y-3">
                  {(data.risk_factors || []).map((rf, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl bg-red-50 dark:bg-red-950/25 p-4 border border-red-100 dark:border-red-900/30">
                      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        rf.severity === 'high' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' :
                        rf.severity === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                      }`} />
                      <div className="text-sm min-w-0">
                        <span className="font-black text-gray-800 dark:text-gray-200">[{rf.category}]</span>{' '}
                        <span className="text-gray-600 dark:text-gray-400">{rf.description}</span>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rf.severity === 'high'   ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' :
                        rf.severity === 'medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                        'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {rf.severity === 'high' ? '고위험' : rf.severity === 'medium' ? '중위험' : '저위험'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card-elevated rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                  <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">긍정 요인</h3>
                </div>
                <ul className="space-y-3">
                  {(data.positive_factors || []).map((pf, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/25 p-4 border border-emerald-100 dark:border-emerald-900/30">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                      <div className="text-sm">
                        <span className="font-black text-gray-800 dark:text-gray-200">[{pf.category}]</span>{' '}
                        <span className="text-gray-600 dark:text-gray-400">{pf.description}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 3: 전략 제안
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'strategy' && (
          <div className="space-y-5">

            {/* Recommendation card */}
            <div className={`card-elevated rounded-2xl p-6 border-l-4 ${gc.accent}`}>
              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl font-black ${gc.bg} ${gc.text}`}>
                  {data.ai_grade}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold ${verdict.color}`}>
                      <Shield className="h-3.5 w-3.5" />
                      {verdict.label}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {data.recommendation_text}
                  </p>
                </div>
              </div>
            </div>

            {/* Optimal bid range */}
            <div className="card-elevated rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#0D1F38] dark:text-white mb-5 uppercase tracking-wider">최적 입찰가 범위</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {(data.roi_scenarios || []).slice(0, 3).map((sc, i) => {
                  const labels  = ['보수적', '기본', '공격적']
                  const colors  = ['text-blue-700 dark:text-blue-400',    'text-[#10B981]',            'text-amber-600 dark:text-amber-400']
                  const bgCols  = ['bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/30',
                                   'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30',
                                   'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30']
                  return (
                    <div key={i} className={`rounded-2xl p-5 text-center border ${bgCols[i]}`}>
                      <p className="data-label mb-2">{labels[i]} ({sc.bid_rate_pct}%)</p>
                      <p className={`text-2xl font-black ${colors[i]} tabular-nums`}>{fmt(sc.bid_price)}</p>
                      <p className="mt-3 data-label">예상 ROI</p>
                      <p className={`text-lg font-black ${colors[i]}`}>+{sc.roi_pct.toFixed(1)}%</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Exit strategy — numbered timeline */}
            <div className="card-elevated rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#0D1F38] dark:text-white mb-6 uppercase tracking-wider">출구 전략 옵션</h3>
              <div className="space-y-4">
                {[
                  { num: '01', title: '단기 매각',  desc: '낙찰 후 6~12개월 내 매각. 시세 차익 실현. 취득세+양도세 고려 필요.', icon: TrendingUp, color: 'text-[#10B981]', bar: 'bg-[#10B981]' },
                  { num: '02', title: '임대 수익',  desc: '보유 후 임대 운용. 안정적 현금흐름 확보. 공실 리스크 관리 필요.',  icon: Building2,  color: 'text-blue-600 dark:text-blue-400',   bar: 'bg-blue-500'    },
                  { num: '03', title: '장기 보유',  desc: '중장기 자본이득 극대화 전략. 개발호재 반영 시 높은 수익 가능.',     icon: BarChart3,  color: 'text-purple-600 dark:text-purple-400', bar: 'bg-purple-500'  },
                ].map(item => (
                  <div key={item.num} className="flex gap-4">
                    {/* Number indicator */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white ${item.bar}`}>
                        {item.num}
                      </div>
                      <div className="w-0.5 flex-1 bg-[#E8EDF3] dark:bg-white/10 mt-2" />
                    </div>
                    {/* Content */}
                    <div className="pb-6 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <item.icon className={`h-4 w-4 ${item.color}`} />
                        <h4 className={`text-sm font-black ${item.color}`}>{item.title}</h4>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulator CTA */}
            <div className="rounded-2xl bg-[#0D1F38] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white mb-1">더 정밀한 수익률 시뮬레이션이 필요하신가요?</p>
                <p className="text-xs text-white/50">실제 입찰가별 세금·비용 포함 정밀 계산</p>
              </div>
              <Link href={buildSimulatorUrl} className="shrink-0">
                <Button className="bg-white text-[#0D1F38] hover:bg-blue-50 gap-2 font-bold shadow-md">
                  <Calculator className="h-4 w-4" />
                  수익률 시뮬레이터 열기
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 4: 법률 검토
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'legal' && (
          <div className="space-y-5">

            {/* Court info — 3 KPI tiles */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card-elevated rounded-2xl p-6 text-center">
                <Landmark className="mx-auto mb-3 h-8 w-8 text-[#0D1F38] dark:text-blue-400" />
                <p className="data-label mb-1">관할 법원</p>
                <p className="text-base font-black text-[#0D1F38] dark:text-white">{data.court_info?.court_name ?? '-'}</p>
              </div>
              <div className="card-elevated rounded-2xl p-6 text-center">
                <p className="data-label mb-2">평균 처리일수</p>
                <p className="text-4xl font-black text-[#1B3A5C] dark:text-blue-300 tabular-nums">{data.court_info?.avg_processing_days ?? '-'}</p>
                <p className="data-label mt-1">일</p>
              </div>
              <div className="card-elevated rounded-2xl p-6 text-center">
                <p className="data-label mb-2">진행사건수</p>
                <p className="text-4xl font-black text-[#10B981] tabular-nums">{fmtCompact(data.court_info?.active_cases ?? 0)}</p>
                <p className="data-label mt-1">건</p>
              </div>
            </div>

            {/* Legal considerations */}
            <div className="card-elevated rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#0D1F38] dark:text-white mb-5 uppercase tracking-wider">주요 법적 검토 사항</h3>
              <ul className="space-y-3">
                {(data.risk_factors || []).map((rf, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-[#E8EDF3] dark:border-white/8 p-4 hover:bg-[#F8F9FB] dark:hover:bg-white/3 transition-colors">
                    <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      rf.severity === 'high'   ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' :
                      rf.severity === 'medium' ? 'bg-amber-500' : 'bg-gray-300'
                    }`} />
                    <div className="text-sm flex-1">
                      <p className="font-black text-[#0D1F38] dark:text-white mb-0.5">{rf.category}</p>
                      <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{rf.description}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${
                      rf.severity === 'high'   ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      rf.severity === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {rf.severity === 'high' ? '고위험' : rf.severity === 'medium' ? '중위험' : '저위험'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recent court cases */}
            <div className="card-elevated rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[#0D1F38] dark:text-white mb-5 uppercase tracking-wider">최근 법원 낙찰 사례</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#E8EDF3] dark:border-white/10">
                      {['사건번호', '물건유형', '감정가', '낙찰가', '낙찰가율', '낙찰일'].map(h => (
                        <th key={h} className="py-2 px-3 text-left font-semibold text-gray-400 dark:text-white/40 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.court_info?.recent_cases || []).map((rc, i) => (
                      <tr key={i} className="border-b border-[#E8EDF3] dark:border-white/5 hover:bg-[#F8F9FB] dark:hover:bg-white/3 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[#0D1F38] dark:text-gray-300">{rc.case_number}</td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">{rc.property_type}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300 tabular-nums">{fmt(rc.appraisal_value)}</td>
                        <td className="py-2.5 px-3 font-mono text-blue-600 dark:text-blue-400 tabular-nums">{fmt(rc.bid_price)}</td>
                        <td className="py-2.5 px-3 font-black text-[#0D1F38] dark:text-white tabular-nums">{rc.bid_rate}%</td>
                        <td className="py-2.5 px-3 text-gray-400">{rc.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expert consultation */}
            <div className="rounded-2xl bg-gradient-to-br from-[#0D1F38]/5 to-[#1B3A5C]/5 dark:from-[#0D1F38] dark:to-[#1B3A5C]/80 border border-[#0D1F38]/15 dark:border-blue-800/30 p-6 text-center">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-[#0D1F38] dark:text-blue-400" />
              <h3 className="text-base font-black text-[#0D1F38] dark:text-white mb-1">전문가에게 법률 검토 요청</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">경·공매 전문 변호사 및 법무사에게 이 건 검토를 의뢰하세요</p>
              <Link href="/services/experts">
                <Button variant="outline" className="border-[#0D1F38]/30 text-[#0D1F38] hover:bg-[#0D1F38]/5 dark:border-blue-700 dark:text-blue-300 gap-2 font-semibold">
                  <Briefcase className="h-4 w-4" />
                  전문가 상담 신청
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* ═══ BOTTOM CTA BAR ═════════════════════════════════ */}
        <div className="card-elevated rounded-2xl p-6 border border-[#E8EDF3] dark:border-white/8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="min-w-0">
              <p className="font-black text-[#0D1F38] dark:text-white text-base">이 분석을 기반으로 다음 단계로 이동하세요</p>
              <p className="text-sm text-gray-400 mt-0.5 truncate">{data.address}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link href={`/exchange?search=${encodeURIComponent(data.address || data.case_number || '')}`}>
                <Button className="gap-2 bg-[#10B981] hover:bg-emerald-400 text-white font-black shadow-[0_0_16px_rgba(16,185,129,0.3)]">
                  <ArrowRight className="h-4 w-4" />
                  딜 시작
                </Button>
              </Link>
              <Link href="/services/experts">
                <Button variant="outline" className="gap-2 border-[#0D1F38]/25 text-[#0D1F38] hover:bg-[#0D1F38]/5 dark:border-white/15 dark:text-gray-300 font-semibold">
                  <Briefcase className="h-4 w-4" />
                  전문가 검토 요청
                </Button>
              </Link>
              <Link href="/exchange/bidding">
                <Button variant="outline" className="gap-2 dark:border-white/15 dark:text-gray-300 font-semibold">
                  <Scale className="h-4 w-4" />
                  입찰 참여
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* 관련 서비스 */}
        <div className="pb-4">
          <p className="data-label mb-3">관련 서비스</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { label: '경매 수익률 분석', href: buildSimulatorUrl, icon: BarChart3 },
              { label: '딜룸 열기',       href: '/deals',          icon: Building2 },
              { label: '목록으로',        href: '/analysis',       icon: ArrowLeft },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="card-flat flex items-center gap-2.5 rounded-xl p-3.5 transition-colors hover:bg-[#F2F4F7] dark:hover:bg-white/5"
              >
                <item.icon className="h-4 w-4 text-[#1B3A5C] dark:text-blue-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
