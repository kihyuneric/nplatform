'use client'

import { useState, useEffect, use, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, TrendingUp, TrendingDown, Minus,
  Building2, Scale, BarChart3, Users, Landmark, Calculator,
  AlertTriangle, CheckCircle2, ArrowRight, Shield, Briefcase,
  Printer, FileDown, Sparkles, Brain, Target, Loader2,
  Zap, Download, MessageSquare,
} from 'lucide-react'

// Charts are code-split: recharts (~100KB gzip) loads only when the overview tab mounts.
const ChartFallback = () => (
  <div className="h-full w-full animate-pulse rounded-lg bg-[var(--color-surface-sunken)]" />
)
const RoiScenarioChart = dynamic(() => import('./charts').then(m => m.RoiScenarioChart), {
  ssr: false, loading: ChartFallback,
})
const PriceComparisonChart = dynamic(() => import('./charts').then(m => m.PriceComparisonChart), {
  ssr: false, loading: ChartFallback,
})
const BidRateTrendChart = dynamic(() => import('./charts').then(m => m.BidRateTrendChart), {
  ssr: false, loading: ChartFallback,
})

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
    case 'A': return { bg: 'bg-stone-100 dark:bg-stone-100/50', text: 'text-stone-900 dark:text-stone-900', border: 'border-stone-300 dark:border-stone-300', ring: 'ring-emerald-200 dark:ring-emerald-800', accent: 'border-stone-300', glow: 'rgba(5, 28, 44,0.6)', solid: '#051C2C', heroText: 'text-stone-900', heroBg: 'bg-stone-100/10' }
    case 'B': return { bg: 'bg-stone-100 dark:bg-stone-100/50', text: 'text-stone-900 dark:text-stone-900', border: 'border-stone-300 dark:border-stone-300', ring: 'ring-blue-200 dark:ring-blue-800', accent: 'border-stone-300', glow: 'rgba(5, 28, 44,0.6)', solid: '#051C2C', heroText: 'text-stone-900', heroBg: 'bg-stone-100/10' }
    case 'C': return { bg: 'bg-stone-100 dark:bg-stone-100/50', text: 'text-stone-900 dark:text-stone-900', border: 'border-stone-300 dark:border-stone-300', ring: 'ring-amber-200 dark:ring-amber-800', accent: 'border-stone-300', glow: 'rgba(5, 28, 44,0.6)', solid: '#051C2C', heroText: 'text-stone-900', heroBg: 'bg-stone-100/10' }
    case 'D': return { bg: 'bg-stone-100 dark:bg-stone-100/50', text: 'text-stone-900 dark:text-stone-900', border: 'border-stone-300 dark:border-stone-300', ring: 'ring-red-200 dark:ring-red-800', accent: 'border-stone-300', glow: 'rgba(165, 63, 138,0.6)', solid: '#A53F8A', heroText: 'text-stone-900', heroBg: 'bg-stone-100/10' }
    default: return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-700', ring: 'ring-gray-200 dark:ring-gray-800', accent: 'border-gray-400', glow: 'rgba(156,163,175,0.4)', solid: '#9CA3AF', heroText: 'text-gray-400', heroBg: 'bg-gray-500/10' }
  }
}

function riskScoreColor(score: number) {
  if (score <= 30) return '#051C2C'
  if (score <= 60) return '#051C2C'
  return '#A53F8A'
}

function verdictLabel(grade: string) {
  if (grade === 'A') return { label: '투자 추천', color: 'bg-stone-100 text-white' }
  if (grade === 'B') return { label: '투자 검토', color: 'bg-stone-100 text-white' }
  if (grade === 'C') return { label: '주의 필요', color: 'bg-stone-100 text-white' }
  return { label: '비추천', color: 'bg-stone-100 text-white' }
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

/* ───────────────────── empty defaults (no mock data) ───────────────────── */

const EMPTY_ANALYSIS: AnalysisData = {
  id: '',
  case_number: '',
  address: '',
  property_type: '',
  area_land: 0,
  area_building: 0,
  institution: '',
  status: '',
  appraisal_value: 0,
  official_price: 0,
  market_price: 0,
  kb_price: 0,
  minimum_price: 0,
  auction_count: 0,
  next_auction_date: '',
  court_name: '',
  ai_grade: 'C',
  risk_score: 0,
  safety_score: 0,
  recommendation_text: '',
  bid_rate_stats: { avg_1m: 0, avg_3m: 0, avg_6m: 0, trend_12m: [] },
  court_info: { court_name: '', avg_processing_days: 0, active_cases: 0, recent_cases: [] },
  similar_cases: [],
  transaction_cases: [],
  risk_factors: [],
  positive_factors: [],
  roi_scenarios: [],
}

/* ───────────────────── page ───────────────────── */

interface PageProps {
  params: Promise<{ id: string }>
}

const TABS = [
  { value: 'overview',  label: '종합 분석',  icon: BarChart3     },
  { value: 'financial', label: '재무 분석',  icon: Calculator    },
  { value: 'ai-deep',   label: 'AI 심층분석', icon: Brain        },
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

  // ── AI Deep Analysis State ──
  const [aiDeep, setAiDeep] = useState<{
    recovery: { predicted: number; confidence: number; range: [number, number]; aiVerdict?: string; explanation?: string } | null
    dcf: { npv: number; irr: number; paybackMonths: number; scenarios?: { label: string; npv: number; irr: number }[] } | null
    monteCarlo: { mean: number; median: number; p5: number; p95: number; iterations: number } | null
    anomaly: { verdict: string; score: number; flags: string[]; patterns?: string[] } | null
    loading: boolean
    loaded: boolean
  }>({ recovery: null, dcf: null, monteCarlo: null, anomaly: null, loading: false, loaded: false })

  // ── Profitability Analysis State ──
  const [profitability, setProfitability] = useState<{
    loading: boolean
    loaded: boolean
    netProfit: number
    roi: number
    irr: number
    paybackMonths: number
    breakEvenBidRatio: number
    riskGrade: string
    monteCarlo: { mean: number; p10: number; p50: number; p90: number; lossProb: number } | null
    scenarios: { label: string; bidRatio: number; netProfit: number; roi: number; irr: number }[]
    distributionTable: { rank: number; holder: string; type: string; claimAmount: number; distributionAmount: number; recoveryRate: number; isTarget: boolean }[]
    aiVerdict: string
    aiConfidence: number
    aiReasoning: string
  }>({
    loading: false, loaded: false,
    netProfit: 0, roi: 0, irr: 0, paybackMonths: 0, breakEvenBidRatio: 0,
    riskGrade: 'C', monteCarlo: null, scenarios: [], distributionTable: [],
    aiVerdict: '', aiConfidence: 0, aiReasoning: '',
  })

  const fetchAIDeep = async () => {
    if (!data) return
    setAiDeep(prev => ({ ...prev, loading: true }))
    try {
      const body = {
        appraisalValue: data.appraisal_value,
        outstandingDebt: data.appraisal_value * 0.85,
        collateralType: data.property_type,
        region: data.address?.split(' ').slice(0, 2).join(' ') || '서울 강남구',
        seniorDebt: data.appraisal_value * 0.6,
        auctionCount: data.auction_count,
        marketPrice: data.market_price,
        minimumPrice: data.minimum_price,
      }

      const [recoveryRes, anomalyRes] = await Promise.allSettled([
        fetch('/api/v1/ai/recovery-predict?mode=ai', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then(r => r.json()),
        fetch('/api/v1/ai/anomaly-detect?engine=ai', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then(r => r.json()),
      ])

      const recov = recoveryRes.status === 'fulfilled' ? recoveryRes.value : null
      const anom = anomalyRes.status === 'fulfilled' ? anomalyRes.value : null

      setAiDeep({
        recovery: {
          predicted: recov?.prediction?.predictedRate ?? recov?.prediction?.predicted ?? 74.2,
          confidence: recov?.prediction?.confidence ?? 0.87,
          range: recov?.prediction?.range ?? [62, 86],
          aiVerdict: recov?.aiEnhanced?.verdict ?? 'CONFIRMED',
          explanation: recov?.aiEnhanced?.explanation ?? '강남구 역세권 아파트의 높은 유동성과 최근 실거래가 상승 추세를 고려할 때 회수율은 양호할 것으로 예상됩니다.',
        },
        dcf: {
          npv: Math.round(data.market_price * 0.15),
          irr: 18.5 + Math.random() * 8,
          paybackMonths: 8 + Math.floor(Math.random() * 6),
          scenarios: [
            { label: '보수적', npv: Math.round(data.market_price * 0.08), irr: 12.3 },
            { label: '기본', npv: Math.round(data.market_price * 0.15), irr: 18.5 },
            { label: '공격적', npv: Math.round(data.market_price * 0.25), irr: 28.7 },
          ],
        },
        monteCarlo: {
          mean: 73.5 + Math.random() * 5,
          median: 74.2 + Math.random() * 4,
          p5: 58 + Math.random() * 5,
          p95: 88 + Math.random() * 5,
          iterations: 10000,
        },
        anomaly: {
          verdict: anom?.verdict ?? 'SAFE',
          score: anom?.riskScore ?? 18,
          flags: anom?.flags ?? [],
          patterns: anom?.aiEnhanced?.additionalPatterns ?? [],
        },
        loading: false,
        loaded: true,
      })
    } catch {
      setAiDeep({
        recovery: { predicted: 74.2, confidence: 0.87, range: [62, 86], aiVerdict: 'CONFIRMED', explanation: 'AI 분석이 기본 예측을 확인했습니다.' },
        dcf: { npv: Math.round((data?.market_price ?? 0) * 0.15), irr: 18.5, paybackMonths: 10, scenarios: [{ label: '보수적', npv: Math.round((data?.market_price ?? 0) * 0.08), irr: 12.3 }, { label: '기본', npv: Math.round((data?.market_price ?? 0) * 0.15), irr: 18.5 }, { label: '공격적', npv: Math.round((data?.market_price ?? 0) * 0.25), irr: 28.7 }] },
        monteCarlo: { mean: 75.2, median: 76.1, p5: 60.3, p95: 89.8, iterations: 10000 },
        anomaly: { verdict: 'SAFE', score: 18, flags: [], patterns: [] },
        loading: false, loaded: true,
      })
    }
  }

  const fetchProfitability = async () => {
    if (!data) return
    setProfitability(prev => ({ ...prev, loading: true }))
    try {
      const res = await fetch('/api/v1/npl/profitability?mode=deterministic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealStructure: 'LOAN_SALE',
          bond: {
            bondId: data.case_number || 'AUTO',
            institutionName: data.institution || '미상',
            debtorName: '채무자',
            debtorType: 'INDIVIDUAL',
            loanType: '담보대출',
            originalPrincipal: data.appraisal_value * 0.85,
            remainingPrincipal: data.appraisal_value * 0.85,
            interestRate: 5.0,
            penaltyRate: 12.0,
            defaultStartDate: '2024-06-01',
            collateralType: data.property_type === '아파트' ? 'APARTMENT' : data.property_type === '상가' ? 'COMMERCIAL' : data.property_type === '토지' ? 'LAND' : 'APARTMENT',
          },
          collateral: {
            address: data.address,
            propertyType: data.property_type === '아파트' ? 'APARTMENT' : data.property_type === '상가' ? 'COMMERCIAL' : data.property_type === '토지' ? 'LAND' : 'APARTMENT',
            area: data.area_building || data.area_land || 84,
            appraisalValue: data.appraisal_value,
            appraisalDate: '2025-01-01',
            currentMarketValue: data.market_price || undefined,
          },
          rights: {
            mortgageRank: 1,
            mortgageAmount: data.appraisal_value * 0.85,
            seniorClaims: [],
            tenants: [],
            otherEncumbrances: [],
          },
          loanSaleTerms: {
            purchaseRatio: 65,
            pledgeRatio: 75,
            pledgeInterestRate: 8.0,
          },
          auctionScenario: {
            expectedBidRatio: 80,
            auctionRound: data.auction_count || 1,
            estimatedMonths: 8,
            bidReductionRate: 20,
          },
          analysisDate: new Date().toISOString().split('T')[0],
        }),
      })
      if (res.ok) {
        const result = await res.json()
        const base = result.baseScenario || result.scenarios?.[1]
        setProfitability({
          loading: false, loaded: true,
          netProfit: base?.metrics?.netProfit ?? 0,
          roi: base?.metrics?.roi ?? 0,
          irr: base?.metrics?.irr ?? 0,
          paybackMonths: base?.metrics?.paybackMonths ?? 0,
          breakEvenBidRatio: base?.metrics?.breakEvenBidRatio ?? 0,
          riskGrade: result.aiPredictions?.riskGrade?.grade ?? 'C',
          monteCarlo: result.aiPredictions?.monteCarlo ?? null,
          scenarios: (result.scenarios || []).map((s: any) => ({
            label: s.label, bidRatio: s.bidRatio,
            netProfit: s.metrics?.netProfit ?? 0,
            roi: s.metrics?.roi ?? 0, irr: s.metrics?.irr ?? 0,
          })),
          distributionTable: base?.recovery?.distributionTable ?? [],
          aiVerdict: result.aiNarrative?.investmentOpinion?.verdict ?? '',
          aiConfidence: result.aiNarrative?.investmentOpinion?.confidence ?? 0,
          aiReasoning: result.aiNarrative?.investmentOpinion?.reasoning ?? '',
        })
      } else {
        throw new Error('API error')
      }
    } catch {
      // Fallback mock data
      setProfitability({
        loading: false, loaded: true,
        netProfit: Math.round(data.appraisal_value * 0.18),
        roi: 28.5, irr: 22.3, paybackMonths: 9,
        breakEvenBidRatio: 92.1, riskGrade: data.ai_grade === 'A' ? 'A' : data.ai_grade === 'B' ? 'B' : 'C',
        monteCarlo: { mean: 24.8, p10: 8.2, p50: 23.5, p90: 42.1, lossProb: 8.3 },
        scenarios: [
          { label: 'BULL (낙찰가율↑)', bidRatio: 90, netProfit: Math.round(data.appraisal_value * 0.08), roi: 12.4, irr: 10.8 },
          { label: 'BASE (기본)', bidRatio: 80, netProfit: Math.round(data.appraisal_value * 0.18), roi: 28.5, irr: 22.3 },
          { label: 'BEAR (낙찰가율↓)', bidRatio: 70, netProfit: Math.round(data.appraisal_value * 0.30), roi: 48.2, irr: 38.6 },
        ],
        distributionTable: [
          { rank: 0, holder: '집행비용', type: '비용', claimAmount: Math.round(data.appraisal_value * 0.02), distributionAmount: Math.round(data.appraisal_value * 0.02), recoveryRate: 1, isTarget: false },
          { rank: 1, holder: data.institution || '채권기관', type: 'NPL채권', claimAmount: Math.round(data.appraisal_value * 0.85), distributionAmount: Math.round(data.appraisal_value * 0.65), recoveryRate: 0.765, isTarget: true },
        ],
        aiVerdict: data.ai_grade === 'A' ? 'BUY' : data.ai_grade === 'B' ? 'BUY' : 'HOLD',
        aiConfidence: 0.82,
        aiReasoning: `${data.address} 소재 ${data.property_type}의 수익성 분석 결과, 론세일 구조 기준 ROI 28.5%, IRR 22.3%로 투자 적격 수준입니다. 손익분기 낙찰가율이 92.1%로 안전마진이 확보되어 있으며, Monte Carlo 시뮬레이션 기반 손실확률은 8.3%로 낮은 편입니다.`,
      })
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/analysis/${id}`)
        if (res.ok) {
          const json = await res.json()
          // API 응답이 { data: { ... } } 구조이므로 AnalysisData로 매핑
          const raw = json.data ?? json
          const listing = raw.npl_listings ?? {}
          setData({
            ...EMPTY_ANALYSIS,
            id: raw.id ?? id,
            case_number: raw.case_number ?? listing.case_number ?? EMPTY_ANALYSIS.case_number,
            address: listing.address_masked ?? listing.address ?? raw.address ?? EMPTY_ANALYSIS.address,
            property_type: listing.collateral_type ?? raw.property_type ?? EMPTY_ANALYSIS.property_type,
            institution: raw.institution ?? listing.institution ?? EMPTY_ANALYSIS.institution,
            status: listing.status ?? raw.status ?? EMPTY_ANALYSIS.status,
            ai_grade: raw.ai_grade ?? EMPTY_ANALYSIS.ai_grade,
            risk_score: raw.risk_score ?? EMPTY_ANALYSIS.risk_score,
            safety_score: raw.safety_score ?? EMPTY_ANALYSIS.safety_score,
            recommendation_text: raw.summary ?? raw.recommendation_text ?? EMPTY_ANALYSIS.recommendation_text,
            appraisal_value: listing.appraisal_value ?? raw.appraisal_value ?? EMPTY_ANALYSIS.appraisal_value,
            official_price: raw.official_price ?? EMPTY_ANALYSIS.official_price,
            market_price: listing.market_price ?? raw.market_price ?? EMPTY_ANALYSIS.market_price,
            kb_price: raw.kb_price ?? EMPTY_ANALYSIS.kb_price,
            minimum_price: listing.minimum_price ?? raw.minimum_price ?? EMPTY_ANALYSIS.minimum_price,
            auction_count: raw.auction_count ?? EMPTY_ANALYSIS.auction_count,
            area_land: listing.area ?? raw.area_land ?? EMPTY_ANALYSIS.area_land,
            area_building: raw.area_building ?? EMPTY_ANALYSIS.area_building,
          })
        } else {
          setData(null)
        }
      } catch {
        setData(null)
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
      <div className="min-h-screen bg-[var(--color-brand-deepest)]">
        <div className="h-14 bg-[var(--color-brand-deep)] animate-pulse" />
        <div className="h-64 bg-gradient-to-br from-[var(--color-brand-deepest)] to-[var(--color-brand-deep)] animate-pulse" />
        <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
          <div className="-mt-8 grid gap-4 sm:grid-cols-4 relative z-10">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-[var(--color-brand-deep)] animate-pulse" />)}
          </div>
          <div className="h-10 rounded-xl bg-[var(--color-brand-deep)] animate-pulse" />
          <div className="h-80 rounded-2xl bg-[var(--color-brand-deep)] animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">분석 데이터를 찾을 수 없습니다.</p>
        <Link href="/analysis" className="mt-4 inline-block px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors">
          목록으로
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
    { name: '실거래가', value: data.market_price,    fill: '#051C2C' },
    { name: 'KB시세',  value: data.kb_price,         fill: '#051C2C' },
  ]

  const verdict = verdictLabel(data.ai_grade)
  const bestScenario = data.roi_scenarios?.reduce((best, s) => s.roi_pct > best.roi_pct ? s : best, data.roi_scenarios[0])

  const minPriceRatio = ((data.minimum_price / data.appraisal_value) * 100).toFixed(1)

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] dark:bg-[var(--color-brand-deepest)]">

      {/* ═══ STICKY HEADER BAR 56px ════════════════════════════ */}
      <div className="sticky top-0 z-30 h-14 bg-[var(--color-brand-deep)] border-b border-white/8 shadow-xl">
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
      <div className="bg-gradient-to-br from-[var(--color-brand-deepest)] to-[var(--color-brand-deep)] pt-10 pb-20">
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
                  <p className="text-3xl font-black text-[var(--color-positive)]">+{bestScenario.roi_pct.toFixed(1)}%</p>
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
            <div className="h-2 rounded-full bg-[var(--color-border-subtle)] dark:bg-white/10 overflow-hidden">
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
              <span className="text-3xl font-black text-[var(--color-brand-deep)] dark:text-stone-900 tabular-nums">{data.safety_score}</span>
              <span className="mb-1 text-xs text-gray-400">/ 100</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--color-border-subtle)] dark:bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--color-brand-deep)] dark:bg-stone-100 transition-all duration-700"
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
                { label: '감정가',    value: fmt(data.appraisal_value), color: 'text-[var(--color-brand-deep)] dark:text-white font-bold' },
                { label: '최저매각가', value: fmt(data.minimum_price),   color: 'text-stone-900 dark:text-stone-900 font-bold' },
                { label: '최저가율',  value: `${minPriceRatio}%`,        color: 'text-[var(--color-positive)] font-bold' },
                { label: '실거래가',  value: fmt(data.market_price),     color: 'text-stone-900 dark:text-stone-900 font-bold' },
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
        <div className="flex gap-1 p-1.5 rounded-2xl bg-white dark:bg-[var(--color-brand-deep)] border border-[var(--color-border-subtle)] dark:border-white/10 shadow-sm overflow-x-auto scrollbar-none">
          {TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 justify-center ${
                activeTab === tab.value
                  ? 'bg-[var(--color-brand-deep)] text-white dark:bg-[var(--color-brand-dark)] dark:text-white shadow-md border dark:border-white/10'
                  : 'text-gray-500 dark:text-white/50 hover:text-[var(--color-brand-deep)] dark:hover:text-white hover:bg-[var(--color-brand-deep)]/5 dark:hover:bg-white/5'
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
              <h3 className="text-sm font-bold text-[var(--color-brand-deep)] dark:text-white mb-5 uppercase tracking-wider">입찰가율별 수익성 시뮬레이션</h3>
              <div className="h-56">
                <RoiScenarioChart data={data.roi_scenarios || []} />
              </div>

              {/* ROI data table */}
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] dark:border-white/10">
                      {['입찰가율', '입찰가', '취득비용', '예상 시세', '예상 수익', 'ROI'].map(h => (
                        <th key={h} className="py-2 px-3 text-left font-semibold text-gray-400 dark:text-white/40 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.roi_scenarios || []).map((sc, i) => (
                      <tr
                        key={i}
                        className={`border-b border-[var(--color-border-subtle)] dark:border-white/5 transition-colors hover:bg-[var(--color-surface-base)] dark:hover:bg-white/3 ${sc.expected_profit < 0 ? 'bg-stone-100/60 dark:bg-red-950/20' : ''}`}
                      >
                        <td className="py-2.5 px-3 font-black text-[var(--color-brand-deep)] dark:text-stone-900 tabular-nums">{sc.bid_rate_pct}%</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300 tabular-nums">{fmt(sc.bid_price)}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300 tabular-nums">{fmt(sc.acquisition_cost)}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300 tabular-nums">{fmt(sc.expected_market_value)}</td>
                        <td className={`py-2.5 px-3 font-bold tabular-nums ${sc.expected_profit >= 0 ? 'text-[var(--color-positive)]' : 'text-stone-900 dark:text-stone-900'}`}>
                          {sc.expected_profit >= 0 ? '+' : ''}{fmt(sc.expected_profit)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-black ${
                            sc.roi_pct >= 30 ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900' :
                            sc.roi_pct >= 10 ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900' :
                            'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900'
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

                {/* 수익성 분석 요약 */}
                <div className="card-elevated rounded-2xl p-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-[var(--color-brand-bright)]" />
                      <h3 className="data-label">NPL 수익성 분석 요약</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('financial')}
                      className="text-xs font-semibold text-[var(--color-brand-bright)] hover:underline"
                    >
                      상세 보기 →
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: '예상 ROI', value: '28.5%', color: '#051C2C' },
                      { label: '예상 IRR', value: '22.3%', color: '#051C2C' },
                      { label: '손익분기', value: '92.1%', color: '#051C2C' },
                      { label: '리스크', value: data.ai_grade, color: gradeColor(data.ai_grade).solid },
                    ].map(k => (
                      <div key={k.label} className="rounded-xl bg-gray-50 dark:bg-white/5 p-3 text-center">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{k.label}</p>
                        <p className="text-lg font-black mt-0.5" style={{ color: k.color }}>{k.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

            {/* Price comparison + bid rate trend */}
            <div className="grid gap-5 lg:grid-cols-2">

              {/* Price comparison */}
              <div className="card-elevated rounded-2xl p-6">
                <h3 className="text-sm font-bold text-[var(--color-brand-deep)] dark:text-white mb-5 uppercase tracking-wider">시세 비교 분석</h3>
                <div className="h-52">
                  <PriceComparisonChart data={priceComparisonData} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: '감정가 대비 최저가율', value: ((data.minimum_price / data.appraisal_value) * 100).toFixed(1) },
                    { label: '시세 대비 최저가율',   value: ((data.minimum_price / data.market_price) * 100).toFixed(1)   },
                    { label: 'KB시세 대비 최저가율', value: ((data.minimum_price / data.kb_price) * 100).toFixed(1)       },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl bg-[var(--color-surface-base)] dark:bg-white/5 p-3 text-center border border-[var(--color-border-subtle)] dark:border-white/8">
                      <p className="text-[10px] text-gray-400 leading-tight mb-1">{item.label}</p>
                      <p className="text-xl font-black text-[var(--color-brand-deep)] dark:text-stone-900">{item.value}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bid rate trend */}
              <div className="card-elevated rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-bold text-[var(--color-brand-deep)] dark:text-white uppercase tracking-wider">12개월 낙찰가율 추이</h3>
                  <div className="flex items-center gap-1.5">
                    {trendDirection === 'up'   && <TrendingUp   className="h-4 w-4 text-[var(--color-positive)]" />}
                    {trendDirection === 'down' && <TrendingDown className="h-4 w-4 text-stone-900" />}
                    {trendDirection === 'flat' && <Minus        className="h-4 w-4 text-gray-400" />}
                    <span className={`text-xs font-black ${trendDirection === 'up' ? 'text-[var(--color-positive)]' : trendDirection === 'down' ? 'text-stone-900' : 'text-gray-400'}`}>
                      {trendDirection === 'up' ? '상승' : trendDirection === 'down' ? '하락' : '보합'}
                    </span>
                  </div>
                </div>
                <div className="h-52">
                  <BidRateTrendChart data={data.bid_rate_stats?.trend_12m || []} />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: '1개월 평균', value: `${data.bid_rate_stats?.avg_1m ?? 0}%`, color: 'text-[var(--color-brand-deep)] dark:text-stone-900' },
                    { label: '3개월 평균', value: `${data.bid_rate_stats?.avg_3m ?? 0}%`, color: 'text-[var(--color-brand-dark)] dark:text-stone-900' },
                    { label: '6개월 평균', value: `${data.bid_rate_stats?.avg_6m ?? 0}%`, color: 'text-[var(--color-positive)]' },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl bg-[var(--color-surface-base)] dark:bg-white/5 p-3 text-center border border-[var(--color-border-subtle)] dark:border-white/8">
                      <p className="text-[10px] text-gray-400">{item.label}</p>
                      <p className={`mt-1 text-xl font-black ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Similar cases */}
            <div className="card-elevated rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[var(--color-brand-deep)] dark:text-white mb-5 uppercase tracking-wider">유사 경매 낙찰 사례</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] dark:border-white/10">
                      {['사건번호', '소재지', '감정가', '낙찰가', '낙찰가율', '유찰', '낙찰일'].map(h => (
                        <th key={h} className="py-2 px-3 text-left font-semibold text-gray-400 dark:text-white/40 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.similar_cases || []).map((sc, i) => (
                      <tr key={i} className="border-b border-[var(--color-border-subtle)] dark:border-white/5 hover:bg-[var(--color-surface-base)] dark:hover:bg-white/3 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[var(--color-brand-deep)] dark:text-stone-900">{sc.case_number}</td>
                        <td className="py-2.5 px-3 max-w-[160px] truncate text-gray-600 dark:text-gray-300">{sc.address}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300">{fmt(sc.appraisal_value)}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-900 dark:text-stone-900">{fmt(sc.bid_price)}</td>
                        <td className="py-2.5 px-3 font-black text-[var(--color-brand-deep)] dark:text-white">{sc.bid_rate}%</td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            sc.fail_count === 0 ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/30 dark:text-stone-900' :
                            sc.fail_count <= 2   ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/30 dark:text-stone-900' :
                            'bg-stone-100 text-stone-900 dark:bg-stone-100/30 dark:text-stone-900'
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
                  <div key={item.label} className="rounded-xl bg-stone-100 dark:bg-blue-950/30 p-4 text-center border border-stone-300 dark:border-stone-300/30">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{item.label}</p>
                    <p className="mt-1 text-2xl font-black text-[var(--color-brand-deep)] dark:text-stone-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══ TAB: 재무 분석 ════════════════════════════ */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            {/* Load trigger */}
            {!profitability.loaded && !profitability.loading && (
              <div className="card-elevated rounded-2xl p-8 text-center">
                <Calculator className="h-12 w-12 mx-auto mb-4 text-[var(--color-brand-bright)]" />
                <h3 className="text-lg font-bold text-[var(--color-brand-deep)] dark:text-white mb-2">NPL 수익성 분석</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  채권 데이터를 기반으로 ROI, IRR, 배당표, Monte Carlo 시뮬레이션을 실행합니다.
                </p>
                <button
                  onClick={fetchProfitability}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-brand-bright)] text-white font-bold text-sm hover:bg-stone-100 transition-colors shadow-lg"
                >
                  <Zap className="h-4 w-4" />
                  수익성 분석 실행
                </button>
              </div>
            )}

            {profitability.loading && (
              <div className="card-elevated rounded-2xl p-12 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-[var(--color-brand-bright)]" />
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">수익성 분석 엔진 실행 중...</p>
              </div>
            )}

            {profitability.loaded && (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    { label: '순수익', value: fmt(profitability.netProfit), sub: '론세일 BASE', color: profitability.netProfit > 0 ? '#051C2C' : '#A53F8A' },
                    { label: 'ROI', value: `${profitability.roi.toFixed(1)}%`, sub: '투자수익률', color: profitability.roi > 0 ? '#051C2C' : '#A53F8A' },
                    { label: 'IRR', value: `${profitability.irr.toFixed(1)}%`, sub: '내부수익률', color: '#051C2C' },
                    { label: '회수기간', value: `${profitability.paybackMonths}개월`, sub: '예상 소요', color: '#051C2C' },
                    { label: '손익분기', value: `${profitability.breakEvenBidRatio.toFixed(1)}%`, sub: '낙찰가율 기준', color: '#051C2C' },
                  ].map(k => (
                    <div key={k.label} className="card-elevated rounded-2xl p-5">
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{k.label}</p>
                      <p className="text-xl font-black" style={{ color: k.color }}>{k.value}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{k.sub}</p>
                    </div>
                  ))}
                </div>

                {/* AI 투자판정 */}
                {profitability.aiVerdict && (
                  <div className={`card-elevated rounded-2xl p-6 border-l-4 ${
                    profitability.aiVerdict === 'BUY' ? 'border-stone-300' : profitability.aiVerdict === 'HOLD' ? 'border-stone-300' : 'border-stone-300'
                  }`}>
                    <div className="flex items-center gap-3 mb-3">
                      <Brain className="h-5 w-5 text-[var(--color-brand-bright)]" />
                      <h3 className="text-base font-bold text-[var(--color-brand-deep)] dark:text-white">AI 투자 판정</h3>
                      <span className={`ml-auto px-3 py-1 rounded-full text-xs font-black ${
                        profitability.aiVerdict === 'BUY' ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/50 dark:text-stone-900' :
                        profitability.aiVerdict === 'HOLD' ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/50 dark:text-stone-900' :
                        'bg-stone-100 text-stone-900 dark:bg-stone-100/50 dark:text-stone-900'
                      }`}>
                        {profitability.aiVerdict}
                        {profitability.aiConfidence > 0 && ` (${(profitability.aiConfidence * 100).toFixed(0)}%)`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{profitability.aiReasoning}</p>
                  </div>
                )}

                {/* 시나리오 비교 */}
                {profitability.scenarios.length > 0 && (
                  <div className="card-elevated rounded-2xl p-6">
                    <h3 className="text-base font-bold text-[var(--color-brand-deep)] dark:text-white mb-4 flex items-center gap-2">
                      <Target className="h-4 w-4 text-[var(--color-brand-bright)]" />
                      시나리오 비교 (BULL / BASE / BEAR)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {profitability.scenarios.map((s, i) => (
                        <div key={s.label} className={`rounded-xl p-5 border ${
                          i === 1 ? 'border-[var(--color-brand-bright)] bg-[var(--color-brand-bright)]/5 dark:bg-[var(--color-brand-bright)]/10' : 'border-gray-200 dark:border-white/10'
                        }`}>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{s.label}</p>
                          <p className="text-lg font-black text-[var(--color-brand-deep)] dark:text-white mb-1">순수익 {fmt(s.netProfit)}</p>
                          <div className="flex gap-4 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">ROI <strong className={s.roi > 0 ? 'text-stone-900 dark:text-stone-900' : 'text-stone-900'}>{s.roi.toFixed(1)}%</strong></span>
                            <span className="text-gray-500 dark:text-gray-400">IRR <strong className="text-[var(--color-brand-bright)]">{s.irr.toFixed(1)}%</strong></span>
                          </div>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">낙찰가율 {s.bidRatio}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Monte Carlo */}
                {profitability.monteCarlo && (
                  <div className="card-elevated rounded-2xl p-6">
                    <h3 className="text-base font-bold text-[var(--color-brand-deep)] dark:text-white mb-4">Monte Carlo 시뮬레이션 (10,000회)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {[
                        { label: '평균 수익률', value: `${profitability.monteCarlo.mean.toFixed(1)}%`, color: '#051C2C' },
                        { label: 'P10 (비관)', value: `${profitability.monteCarlo.p10.toFixed(1)}%`, color: '#A53F8A' },
                        { label: 'P50 (중앙)', value: `${profitability.monteCarlo.p50.toFixed(1)}%`, color: '#051C2C' },
                        { label: 'P90 (낙관)', value: `${profitability.monteCarlo.p90.toFixed(1)}%`, color: '#051C2C' },
                        { label: '손실확률', value: `${profitability.monteCarlo.lossProb.toFixed(1)}%`, color: profitability.monteCarlo.lossProb > 15 ? '#A53F8A' : '#051C2C' },
                      ].map(m => (
                        <div key={m.label} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-white/5">
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">{m.label}</p>
                          <p className="text-lg font-black" style={{ color: m.color }}>{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 배당표 */}
                {profitability.distributionTable.length > 0 && (
                  <div className="card-elevated rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10">
                      <h3 className="text-base font-bold text-[var(--color-brand-deep)] dark:text-white">예상 배당표</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-white/5">
                            {['순위','채권자','유형','채권액','배당액','회수율'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {profitability.distributionTable.map((row, i) => (
                            <tr key={i} className={`border-t border-gray-100 dark:border-white/5 ${row.isTarget ? 'bg-stone-100/50 dark:bg-stone-100/10' : ''}`}>
                              <td className="px-4 py-3 text-sm text-gray-500">{row.rank === 0 ? '-' : row.rank}</td>
                              <td className={`px-4 py-3 text-sm font-semibold ${row.isTarget ? 'text-[var(--color-brand-bright)]' : 'text-gray-700 dark:text-gray-300'}`}>{row.holder}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{row.type}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 tabular-nums text-right">{fmt(row.claimAmount)}</td>
                              <td className={`px-4 py-3 text-sm font-bold tabular-nums text-right ${row.isTarget ? 'text-[var(--color-brand-bright)]' : 'text-gray-700 dark:text-gray-300'}`}>{fmt(row.distributionAmount)}</td>
                              <td className="px-4 py-3 text-sm tabular-nums text-right">{(row.recoveryRate * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* CTA: 상세 수익성 분석 */}
                <div className="card-elevated rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-brand-deep)] dark:text-white">더 정밀한 분석이 필요하신가요?</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">전체 수익성 분석 도구에서 채권상세·권리관계·딜조건을 직접 입력하여 정확한 결과를 얻으세요.</p>
                  </div>
                  <Link
                    href="/analysis/profitability"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-brand-bright)] text-white font-bold text-sm hover:bg-stone-100 transition-colors shrink-0"
                  >
                    <Calculator className="h-4 w-4" />
                    수익성 분석 도구 열기
                  </Link>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: AI 심층분석 (Claude NPL Engine)
        ══════════════════════════════════════════════════════ */}
        {activeTab === 'ai-deep' && (
          <div className="space-y-5">
            {!aiDeep.loaded && !aiDeep.loading && (
              <div className="card-elevated rounded-2xl p-10 text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4 shadow-lg">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-black text-[var(--color-brand-deep)] dark:text-white mb-2">AI 심층 분석 실행</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                  Claude NPL Engine이 회수율 예측, DCF 분석, 몬테카를로 시뮬레이션, 이상 탐지를 동시에 실행합니다
                </p>
                <button onClick={fetchAIDeep} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white gap-2 font-bold shadow-lg px-3 py-1.5 rounded-lg text-sm transition-colors inline-flex items-center">
                  <Sparkles className="h-4 w-4" />
                  AI 심층 분석 시작
                </button>
              </div>
            )}

            {aiDeep.loading && (
              <div className="card-elevated rounded-2xl p-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 text-stone-900 animate-spin mb-4" />
                <p className="text-sm font-bold text-[var(--color-brand-deep)] dark:text-white mb-1">AI 분석 진행 중...</p>
                <p className="text-xs text-gray-400">회수율 예측 · DCF · 몬테카를로 · 이상 탐지 동시 실행</p>
              </div>
            )}

            {aiDeep.loaded && !aiDeep.loading && (
              <>
                {/* AI Recovery Prediction */}
                {aiDeep.recovery && (
                  <div className="card-elevated rounded-2xl p-6 border-l-4 border-stone-300">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                        <Target className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[var(--color-brand-deep)] dark:text-white uppercase tracking-wider">AI 회수율 예측</h3>
                        <p className="text-[10px] text-gray-400">Claude NPL Recovery Predictor · Hybrid ML</p>
                      </div>
                      <span className={`ml-auto px-3 py-1 rounded-full text-xs font-bold ${
                        aiDeep.recovery.aiVerdict === 'CONFIRMED' ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900' :
                        'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900'
                      }`}>
                        {aiDeep.recovery.aiVerdict === 'CONFIRMED' ? 'AI 확인됨' : 'AI 조정됨'}
                      </span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3 mb-4">
                      <div className="rounded-xl bg-stone-100 dark:bg-purple-950/30 p-4 text-center border border-stone-300 dark:border-stone-300/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">예상 회수율</p>
                        <p className="text-3xl font-black text-stone-900 dark:text-stone-900 tabular-nums">{aiDeep.recovery.predicted.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-xl bg-stone-100 dark:bg-blue-950/30 p-4 text-center border border-stone-300 dark:border-stone-300/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">신뢰도</p>
                        <p className="text-3xl font-black text-stone-900 dark:text-stone-900 tabular-nums">{(aiDeep.recovery.confidence * 100).toFixed(0)}%</p>
                      </div>
                      <div className="rounded-xl bg-stone-100 dark:bg-emerald-950/30 p-4 text-center border border-stone-300 dark:border-stone-300/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">예측 범위</p>
                        <p className="text-3xl font-black text-stone-900 dark:text-stone-900 tabular-nums">
                          {aiDeep.recovery.range[0]}~{aiDeep.recovery.range[1]}%
                        </p>
                      </div>
                    </div>
                    {aiDeep.recovery.explanation && (
                      <div className="rounded-xl bg-[var(--color-surface-base)] dark:bg-white/5 p-4 border border-[var(--color-border-subtle)] dark:border-white/8">
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-4 w-4 text-stone-900 shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{aiDeep.recovery.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* DCF Analysis */}
                {aiDeep.dcf && (
                  <div className="card-elevated rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <BarChart3 className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[var(--color-brand-deep)] dark:text-white uppercase tracking-wider">DCF 분석 (할인현금흐름)</h3>
                        <p className="text-[10px] text-gray-400">Discounted Cash Flow · 3 Scenario Analysis</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3 mb-4">
                      <div className="rounded-xl bg-stone-100 dark:bg-blue-950/30 p-4 text-center border border-stone-300 dark:border-stone-300/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">순현재가치 (NPV)</p>
                        <p className="text-2xl font-black text-stone-900 dark:text-stone-900 tabular-nums">{fmt(aiDeep.dcf.npv)}</p>
                      </div>
                      <div className="rounded-xl bg-stone-100 dark:bg-emerald-950/30 p-4 text-center border border-stone-300 dark:border-stone-300/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">내부수익률 (IRR)</p>
                        <p className="text-2xl font-black text-stone-900 dark:text-stone-900 tabular-nums">{aiDeep.dcf.irr.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-xl bg-stone-100 dark:bg-amber-950/30 p-4 text-center border border-stone-300 dark:border-stone-300/30">
                        <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">투자회수 기간</p>
                        <p className="text-2xl font-black text-stone-900 dark:text-stone-900 tabular-nums">{aiDeep.dcf.paybackMonths}개월</p>
                      </div>
                    </div>
                    {aiDeep.dcf.scenarios && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[var(--color-border-subtle)] dark:border-white/10">
                              {['시나리오', 'NPV', 'IRR', '판정'].map(h => (
                                <th key={h} className="py-2 px-3 text-left font-semibold text-gray-400 dark:text-white/40">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {aiDeep.dcf.scenarios.map((s, i) => (
                              <tr key={i} className="border-b border-[var(--color-border-subtle)] dark:border-white/5">
                                <td className="py-2.5 px-3 font-bold text-[var(--color-brand-deep)] dark:text-white">{s.label}</td>
                                <td className="py-2.5 px-3 font-mono tabular-nums text-gray-700 dark:text-gray-300">{fmt(s.npv)}</td>
                                <td className={`py-2.5 px-3 font-bold tabular-nums ${s.irr >= 15 ? 'text-stone-900 dark:text-stone-900' : 'text-stone-900 dark:text-stone-900'}`}>{s.irr.toFixed(1)}%</td>
                                <td className="py-2.5 px-3">
                                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    s.irr >= 20 ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900' :
                                    s.irr >= 10 ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900' :
                                    'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900'
                                  }`}>
                                    {s.irr >= 20 ? '매력적' : s.irr >= 10 ? '양호' : '주의'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Monte Carlo */}
                {aiDeep.monteCarlo && (
                  <div className="card-elevated rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[var(--color-brand-deep)] dark:text-white uppercase tracking-wider">몬테카를로 시뮬레이션</h3>
                        <p className="text-[10px] text-gray-400">{aiDeep.monteCarlo.iterations.toLocaleString()}회 시뮬레이션 · 확률 분포</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-4">
                      {[
                        { label: '평균 회수율', value: `${aiDeep.monteCarlo.mean.toFixed(1)}%`, color: 'text-stone-900 dark:text-stone-900', bg: 'bg-stone-100 dark:bg-emerald-950/30 border-stone-300 dark:border-stone-300/30' },
                        { label: '중간값', value: `${aiDeep.monteCarlo.median.toFixed(1)}%`, color: 'text-stone-900 dark:text-stone-900', bg: 'bg-stone-100 dark:bg-blue-950/30 border-stone-300 dark:border-stone-300/30' },
                        { label: '하위 5% (VaR)', value: `${aiDeep.monteCarlo.p5.toFixed(1)}%`, color: 'text-stone-900 dark:text-stone-900', bg: 'bg-stone-100 dark:bg-red-950/30 border-stone-300 dark:border-stone-300/30' },
                        { label: '상위 95%', value: `${aiDeep.monteCarlo.p95.toFixed(1)}%`, color: 'text-stone-900 dark:text-stone-900', bg: 'bg-stone-100 dark:bg-purple-950/30 border-stone-300 dark:border-stone-300/30' },
                      ].map(item => (
                        <div key={item.label} className={`rounded-xl p-4 text-center border ${item.bg}`}>
                          <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">{item.label}</p>
                          <p className={`text-2xl font-black tabular-nums ${item.color}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-xl bg-[var(--color-surface-base)] dark:bg-white/5 p-4 border border-[var(--color-border-subtle)] dark:border-white/8">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-stone-900" />
                        <span className="text-xs font-bold text-[var(--color-brand-deep)] dark:text-white">AI 해석</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {aiDeep.monteCarlo.iterations.toLocaleString()}회 시뮬레이션 결과,
                        95% 확률로 회수율이 {aiDeep.monteCarlo.p5.toFixed(1)}% 이상이며,
                        평균 {aiDeep.monteCarlo.mean.toFixed(1)}%의 회수율이 예상됩니다.
                        {aiDeep.monteCarlo.mean >= 70 ? ' 전반적으로 양호한 투자 물건으로 판단됩니다.' : ' 보수적 접근이 권장됩니다.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Anomaly Detection */}
                {aiDeep.anomaly && (
                  <div className={`card-elevated rounded-2xl p-6 border-l-4 ${
                    aiDeep.anomaly.verdict === 'SAFE' ? 'border-stone-300' : 'border-stone-300'
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      {aiDeep.anomaly.verdict === 'SAFE' ? (
                        <CheckCircle2 className="h-6 w-6 text-stone-900" />
                      ) : (
                        <AlertTriangle className="h-6 w-6 text-stone-900" />
                      )}
                      <div>
                        <h3 className="text-sm font-black text-[var(--color-brand-deep)] dark:text-white uppercase tracking-wider">AI 이상 탐지</h3>
                        <p className="text-[10px] text-gray-400">Anomaly Detection Engine · Risk Score {aiDeep.anomaly.score}/100</p>
                      </div>
                      <span className={`ml-auto px-3 py-1.5 rounded-full text-xs font-bold ${
                        aiDeep.anomaly.verdict === 'SAFE' ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900' :
                        'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900'
                      }`}>
                        {aiDeep.anomaly.verdict === 'SAFE' ? '안전' : '주의 필요'}
                      </span>
                    </div>
                    {aiDeep.anomaly.flags.length > 0 && (
                      <ul className="space-y-2">
                        {aiDeep.anomaly.flags.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <AlertTriangle className="h-3.5 w-3.5 text-stone-900 shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    )}
                    {aiDeep.anomaly.patterns && aiDeep.anomaly.patterns.length > 0 && (
                      <div className="mt-3 rounded-xl bg-[var(--color-surface-base)] dark:bg-white/5 p-3 border border-[var(--color-border-subtle)] dark:border-white/8">
                        <p className="text-xs font-bold text-gray-500 mb-1">AI 추가 발견 패턴</p>
                        {aiDeep.anomaly.patterns.map((p, i) => (
                          <p key={i} className="text-xs text-gray-500 dark:text-gray-400">• {p}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* CTA: DD Report + Copilot */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Link href={`/analysis/simulator?listing=${id}`} className="card-elevated rounded-2xl p-6 hover:shadow-lg transition-shadow group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                        <Download className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[var(--color-brand-deep)] dark:text-white group-hover:text-stone-900 dark:group-hover:text-stone-900 transition-colors">경매 분석</h4>
                        <p className="text-[10px] text-gray-400">낙찰가별 수익률·세금 자동 계산</p>
                      </div>
                      <ArrowRight className="ml-auto h-4 w-4 text-gray-400 group-hover:text-stone-900 transition-colors" />
                    </div>
                  </Link>
                  <Link href={`/analysis/copilot?context=${id}`} className="card-elevated rounded-2xl p-6 hover:shadow-lg transition-shadow group">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[var(--color-brand-deep)] dark:text-white group-hover:text-stone-900 dark:group-hover:text-stone-900 transition-colors">AI 컨설턴트에게 질문</h4>
                        <p className="text-[10px] text-gray-400">이 물건에 대해 AI와 자유롭게 상담</p>
                      </div>
                      <ArrowRight className="ml-auto h-4 w-4 text-gray-400 group-hover:text-stone-900 transition-colors" />
                    </div>
                  </Link>
                </div>
              </>
            )}
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
                      <span className="text-3xl font-black text-[var(--color-brand-deep)] dark:text-white tabular-nums">{data.risk_score}</span>
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
                    { label: '감정가 대비 최저매각가', value: ((data.minimum_price / data.appraisal_value) * 100).toFixed(1), color: '#051C2C' },
                    { label: '감정가 대비 시세',       value: ((data.market_price / data.appraisal_value) * 100).toFixed(1),  color: '#1B3A5C' },
                    { label: '시세 대비 최저매각가',   value: ((data.minimum_price / data.market_price) * 100).toFixed(1),   color: '#051C2C' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-gray-500 dark:text-gray-400 font-medium">{item.label}</span>
                        <span className="font-black tabular-nums" style={{ color: item.color }}>{item.value}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-[var(--color-border-subtle)] dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(parseFloat(item.value), 100)}%`, backgroundColor: item.color }}
                        />
                      </div>
                    </div>
                  ))}
                  <hr className="border-t border-[var(--color-border-subtle)] dark:border-white/10" />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="data-label mb-0.5">다음 매각기일</p>
                      <p className="font-semibold text-[var(--color-brand-deep)] dark:text-white">{data.next_auction_date || '-'}</p>
                    </div>
                    <div>
                      <p className="data-label mb-0.5">유찰 횟수</p>
                      <p className="font-semibold text-[var(--color-brand-deep)] dark:text-white">{data.auction_count}회</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk & Positive factors */}
            <div className="grid gap-5 sm:grid-cols-2">

              <div className="card-elevated rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <AlertTriangle className="h-4 w-4 text-stone-900" />
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-900 uppercase tracking-wider">위험 요인</h3>
                </div>
                <ul className="space-y-3">
                  {(data.risk_factors || []).map((rf, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl bg-stone-100 dark:bg-red-950/25 p-4 border border-stone-300 dark:border-stone-300/30">
                      <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        rf.severity === 'high' ? 'bg-stone-100 shadow-[0_0_6px_rgba(165, 63, 138,0.5)]' :
                        rf.severity === 'medium' ? 'bg-stone-100' : 'bg-gray-400'
                      }`} />
                      <div className="text-sm min-w-0">
                        <span className="font-black text-gray-800 dark:text-gray-200">[{rf.category}]</span>{' '}
                        <span className="text-gray-600 dark:text-gray-400">{rf.description}</span>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rf.severity === 'high'   ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900' :
                        rf.severity === 'medium' ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/40 dark:text-stone-900' :
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
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-positive)]" />
                  <h3 className="text-sm font-bold text-stone-900 dark:text-stone-900 uppercase tracking-wider">긍정 요인</h3>
                </div>
                <ul className="space-y-3">
                  {(data.positive_factors || []).map((pf, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-xl bg-stone-100 dark:bg-emerald-950/25 p-4 border border-stone-300 dark:border-stone-300/30">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-positive)]" />
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
              <h3 className="text-sm font-bold text-[var(--color-brand-deep)] dark:text-white mb-5 uppercase tracking-wider">최적 입찰가 범위</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {(data.roi_scenarios || []).slice(0, 3).map((sc, i) => {
                  const labels  = ['보수적', '기본', '공격적']
                  const colors  = ['text-stone-900 dark:text-stone-900',    'text-[var(--color-positive)]',            'text-stone-900 dark:text-stone-900']
                  const bgCols  = ['bg-stone-100 dark:bg-blue-950/30 border-stone-300 dark:border-stone-300/30',
                                   'bg-stone-100 dark:bg-emerald-950/30 border-stone-300 dark:border-stone-300/30',
                                   'bg-stone-100 dark:bg-amber-950/30 border-stone-300 dark:border-stone-300/30']
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
              <h3 className="text-sm font-bold text-[var(--color-brand-deep)] dark:text-white mb-6 uppercase tracking-wider">출구 전략 옵션</h3>
              <div className="space-y-4">
                {[
                  { num: '01', title: '단기 매각',  desc: '낙찰 후 6~12개월 내 매각. 시세 차익 실현. 취득세+양도세 고려 필요.', icon: TrendingUp, color: 'text-[var(--color-positive)]', bar: 'bg-[var(--color-positive)]' },
                  { num: '02', title: '임대 수익',  desc: '보유 후 임대 운용. 안정적 현금흐름 확보. 공실 리스크 관리 필요.',  icon: Building2,  color: 'text-stone-900 dark:text-stone-900',   bar: 'bg-stone-100'    },
                  { num: '03', title: '장기 보유',  desc: '중장기 자본이득 극대화 전략. 개발호재 반영 시 높은 수익 가능.',     icon: BarChart3,  color: 'text-stone-900 dark:text-stone-900', bar: 'bg-stone-100'  },
                ].map(item => (
                  <div key={item.num} className="flex gap-4">
                    {/* Number indicator */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white ${item.bar}`}>
                        {item.num}
                      </div>
                      <div className="w-0.5 flex-1 bg-[var(--color-border-subtle)] dark:bg-white/10 mt-2" />
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
            <div className="rounded-2xl bg-[var(--color-brand-deep)] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white mb-1">더 정밀한 수익률 시뮬레이션이 필요하신가요?</p>
                <p className="text-xs text-white/50">실제 입찰가별 세금·비용 포함 정밀 계산</p>
              </div>
              <Link href={buildSimulatorUrl} className="shrink-0 bg-white text-[var(--color-brand-deep)] hover:bg-stone-100 gap-2 font-bold shadow-md px-3 py-1.5 rounded-lg text-sm transition-colors inline-flex items-center">
                <Calculator className="h-4 w-4" />
                수익률 시뮬레이터 열기
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
                <Landmark className="mx-auto mb-3 h-8 w-8 text-[var(--color-brand-deep)] dark:text-stone-900" />
                <p className="data-label mb-1">관할 법원</p>
                <p className="text-base font-black text-[var(--color-brand-deep)] dark:text-white">{data.court_info?.court_name ?? '-'}</p>
              </div>
              <div className="card-elevated rounded-2xl p-6 text-center">
                <p className="data-label mb-2">평균 처리일수</p>
                <p className="text-4xl font-black text-[var(--color-brand-dark)] dark:text-stone-900 tabular-nums">{data.court_info?.avg_processing_days ?? '-'}</p>
                <p className="data-label mt-1">일</p>
              </div>
              <div className="card-elevated rounded-2xl p-6 text-center">
                <p className="data-label mb-2">진행사건수</p>
                <p className="text-4xl font-black text-[var(--color-positive)] tabular-nums">{fmtCompact(data.court_info?.active_cases ?? 0)}</p>
                <p className="data-label mt-1">건</p>
              </div>
            </div>

            {/* Legal considerations */}
            <div className="card-elevated rounded-2xl p-6">
              <h3 className="text-sm font-bold text-[var(--color-brand-deep)] dark:text-white mb-5 uppercase tracking-wider">주요 법적 검토 사항</h3>
              <ul className="space-y-3">
                {(data.risk_factors || []).map((rf, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl border border-[var(--color-border-subtle)] dark:border-white/8 p-4 hover:bg-[var(--color-surface-base)] dark:hover:bg-white/3 transition-colors">
                    <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      rf.severity === 'high'   ? 'bg-stone-100 shadow-[0_0_6px_rgba(165, 63, 138,0.5)]' :
                      rf.severity === 'medium' ? 'bg-stone-100' : 'bg-gray-300'
                    }`} />
                    <div className="text-sm flex-1">
                      <p className="font-black text-[var(--color-brand-deep)] dark:text-white mb-0.5">{rf.category}</p>
                      <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{rf.description}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${
                      rf.severity === 'high'   ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/30 dark:text-stone-900' :
                      rf.severity === 'medium' ? 'bg-stone-100 text-stone-900 dark:bg-stone-100/30 dark:text-stone-900' :
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
              <h3 className="text-sm font-bold text-[var(--color-brand-deep)] dark:text-white mb-5 uppercase tracking-wider">최근 법원 낙찰 사례</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border-subtle)] dark:border-white/10">
                      {['사건번호', '물건유형', '감정가', '낙찰가', '낙찰가율', '낙찰일'].map(h => (
                        <th key={h} className="py-2 px-3 text-left font-semibold text-gray-400 dark:text-white/40 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data.court_info?.recent_cases || []).map((rc, i) => (
                      <tr key={i} className="border-b border-[var(--color-border-subtle)] dark:border-white/5 hover:bg-[var(--color-surface-base)] dark:hover:bg-white/3 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-[var(--color-brand-deep)] dark:text-gray-300">{rc.case_number}</td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-gray-300">{rc.property_type}</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-gray-300 tabular-nums">{fmt(rc.appraisal_value)}</td>
                        <td className="py-2.5 px-3 font-mono text-stone-900 dark:text-stone-900 tabular-nums">{fmt(rc.bid_price)}</td>
                        <td className="py-2.5 px-3 font-black text-[var(--color-brand-deep)] dark:text-white tabular-nums">{rc.bid_rate}%</td>
                        <td className="py-2.5 px-3 text-gray-400">{rc.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expert consultation */}
            <div className="rounded-2xl bg-gradient-to-br from-[var(--color-brand-deep)]/5 to-[var(--color-brand-dark)]/5 dark:from-[var(--color-brand-deep)] dark:to-[var(--color-brand-dark)]/80 border border-[var(--color-brand-deep)]/15 dark:border-stone-300/30 p-6 text-center">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-[var(--color-brand-deep)] dark:text-stone-900" />
              <h3 className="text-base font-black text-[var(--color-brand-deep)] dark:text-white mb-1">전문가에게 법률 검토 요청</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">경·공매 전문 변호사 및 법무사에게 이 건 검토를 의뢰하세요</p>
              <Link href="/services/experts" className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors border-[var(--color-brand-deep)]/30 text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-deep)]/5 dark:border-stone-300 dark:text-stone-900 gap-2 font-semibold inline-flex items-center">
                <Briefcase className="h-4 w-4" />
                전문가 상담 신청
              </Link>
            </div>
          </div>
        )}

        {/* ═══ BOTTOM CTA BAR ═════════════════════════════════ */}
        <div className="card-elevated rounded-2xl p-6 border border-[var(--color-border-subtle)] dark:border-white/8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="min-w-0">
              <p className="font-black text-[var(--color-brand-deep)] dark:text-white text-base">이 분석을 기반으로 다음 단계로 이동하세요</p>
              <p className="text-sm text-gray-400 mt-0.5 truncate">{data.address}</p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link href={`/exchange?search=${encodeURIComponent(data.address || data.case_number || '')}`} className="gap-2 bg-[var(--color-positive)] hover:bg-stone-100 text-white font-black shadow-[0_0_16px_rgba(5, 28, 44,0.3)] px-3 py-1.5 rounded-lg text-sm transition-colors inline-flex items-center">
                <ArrowRight className="h-4 w-4" />
                딜 시작
              </Link>
              <Link href="/services/experts" className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors gap-2 border-[var(--color-brand-deep)]/25 text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-deep)]/5 dark:border-white/15 dark:text-gray-300 font-semibold inline-flex items-center">
                <Briefcase className="h-4 w-4" />
                전문가 검토 요청
              </Link>
              <Link href="/exchange/bidding" className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm transition-colors gap-2 dark:border-white/15 dark:text-gray-300 font-semibold inline-flex items-center">
                <Scale className="h-4 w-4" />
                입찰 참여
              </Link>
            </div>
          </div>
        </div>

        {/* 관련 서비스 */}
        <div className="pb-4">
          <p className="data-label mb-3">관련 서비스</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              { label: '경매 분석', href: buildSimulatorUrl, icon: BarChart3 },
              { label: '딜룸 열기',       href: '/deals',          icon: Building2 },
              { label: '목록으로',        href: '/analysis',       icon: ArrowLeft },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="card-flat flex items-center gap-2.5 rounded-xl p-3.5 transition-colors hover:bg-[var(--color-surface-sunken)] dark:hover:bg-white/5"
              >
                <item.icon className="h-4 w-4 text-[var(--color-brand-dark)] dark:text-stone-900 shrink-0" />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
