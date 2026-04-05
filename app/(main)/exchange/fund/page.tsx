'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  Shield,
  Users,
  Wallet,
  BarChart3,
  ChevronRight,
  Star,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PieChart,
  Target,
  Building2,
  MessageSquare,
  Loader2,
  ArrowRight,
  Info,
  Sparkles,
  Lock,
  FileText,
  CircleDot,
} from 'lucide-react'
import { GuideButton } from '@/components/guide/guide-button'
import { toast } from 'sonner'

/* ─── Design System ─────────────────────────────────────────────── */
const C = {
  bg0: '#030810', bg1: '#050D1A', bg2: '#080F1E', bg3: '#0A1628', bg4: '#0F1F35',
  em: '#10B981', emL: '#34D399', blue: '#3B82F6', blueL: '#60A5FA',
  amber: '#F59E0B', amber2: '#FCD34D', purple: '#A855F7', rose: '#F43F5E', teal: '#14B8A6',
  l0: '#FFFFFF', l1: '#F8FAFC', l2: '#F1F5F9', l3: '#E2E8F0',
  lt1: '#0F172A', lt2: '#334155', lt3: '#64748B', lt4: '#94A3B8',
}

/* ─── Types ─────────────────────────────────────────────────────── */
type FundStatus = '모집중' | '운용중' | '상환완료'
type RiskLevel = '낮음' | '중간' | '높음'
type FundType = '수익형' | '안정형' | '성장형' | '특수상황'

interface Fund {
  id: number
  name: string
  manager: string
  type: FundType
  targetReturn: number
  minInvestment: number
  aum: number
  targetAum: number
  status: FundStatus
  strategy: string
  riskLevel: RiskLevel
  duration: string
  maturity: string
  investors: number
  progress: number
  featured?: boolean
  annualizedReturn?: number
}

/* ─── Mock Data ─────────────────────────────────────────────────── */
const FUNDS: Fund[] = [
  {
    id: 1,
    name: 'NPL 프라임 수익 1호',
    manager: '한국NPL자산운용',
    type: '수익형',
    targetReturn: 15.5,
    minInvestment: 50_000_000,
    aum: 32_000_000_000,
    targetAum: 50_000_000_000,
    status: '모집중',
    strategy: '수도권 아파트 담보 부실채권 매입 후 경매·임의매각을 통한 수익 실현. 1순위 근저당권 위주로 안정적 회수율 확보.',
    riskLevel: '중간',
    duration: '24개월',
    maturity: '2026-12-31',
    investors: 45,
    progress: 68,
    featured: true,
    annualizedReturn: 14.2,
  },
  {
    id: 2,
    name: 'NPL 안정 성장 펀드',
    manager: '세일자산운용',
    type: '안정형',
    targetReturn: 10.2,
    minInvestment: 30_000_000,
    aum: 18_500_000_000,
    targetAum: 22_000_000_000,
    status: '모집중',
    strategy: '금융권 부실채권 매입 및 정상화를 통한 안정적 수익 추구. 분산투자 전략으로 리스크 최소화.',
    riskLevel: '낮음',
    duration: '18개월',
    maturity: '2026-06-30',
    investors: 72,
    progress: 82,
  },
  {
    id: 3,
    name: '스페셜 시추에이션 2호',
    manager: '디에스에셋',
    type: '특수상황',
    targetReturn: 22.0,
    minInvestment: 100_000_000,
    aum: 45_000_000_000,
    targetAum: 45_000_000_000,
    status: '운용중',
    strategy: '특수 상황(기업회생·파산) 관련 NPL 집중 투자. 높은 수익률을 목표로 적극적 자산 운용.',
    riskLevel: '높음',
    duration: '36개월',
    maturity: '2027-03-15',
    investors: 28,
    progress: 100,
    annualizedReturn: 19.8,
  },
  {
    id: 4,
    name: 'NPL 밸류업 3호',
    manager: '우리NPL운용',
    type: '성장형',
    targetReturn: 13.8,
    minInvestment: 50_000_000,
    aum: 25_000_000_000,
    targetAum: 25_000_000_000,
    status: '운용중',
    strategy: '상업용 부동산 담보 NPL 매입 후 리모델링·임대를 통한 가치 상승 전략.',
    riskLevel: '중간',
    duration: '30개월',
    maturity: '2026-09-30',
    investors: 35,
    progress: 100,
    annualizedReturn: 12.1,
  },
  {
    id: 5,
    name: '소형주택 NPL 펀드',
    manager: '한국NPL자산운용',
    type: '안정형',
    targetReturn: 12.0,
    minInvestment: 20_000_000,
    aum: 8_500_000_000,
    targetAum: 8_500_000_000,
    status: '상환완료',
    strategy: '소형 주거용 부동산 NPL 집중 매입. 실수요 기반 빠른 매각으로 안정적 수익 달성.',
    riskLevel: '낮음',
    duration: '12개월',
    maturity: '2024-12-31',
    investors: 120,
    progress: 100,
    annualizedReturn: 13.4,
  },
  {
    id: 6,
    name: '기업회생 스페셜 1호',
    manager: '디에스에셋',
    type: '특수상황',
    targetReturn: 18.5,
    minInvestment: 200_000_000,
    aum: 60_000_000_000,
    targetAum: 60_000_000_000,
    status: '상환완료',
    strategy: '기업회생 절차 중인 기업의 부실자산 매입·정상화. 구조조정 전문팀 운용.',
    riskLevel: '높음',
    duration: '24개월',
    maturity: '2025-06-30',
    investors: 15,
    progress: 100,
    annualizedReturn: 21.3,
  },
  {
    id: 7,
    name: '메자닌 브릿지 펀드 1호',
    manager: '하나대체투자운용',
    type: '성장형',
    targetReturn: 17.0,
    minInvestment: 70_000_000,
    aum: 14_000_000_000,
    targetAum: 30_000_000_000,
    status: '모집중',
    strategy: '메자닌 구조를 활용한 NPL 브릿지 투자. 후순위 담보권 취득 후 선순위 협상을 통한 수익 극대화.',
    riskLevel: '높음',
    duration: '18개월',
    maturity: '2026-08-31',
    investors: 19,
    progress: 47,
  },
  {
    id: 8,
    name: '수도권 상업용 NPL 2호',
    manager: '세일자산운용',
    type: '수익형',
    targetReturn: 14.5,
    minInvestment: 30_000_000,
    aum: 21_000_000_000,
    targetAum: 35_000_000_000,
    status: '모집중',
    strategy: '서울·경기 상업용 부동산 NPL 집중 매입. 우량 상권 위주 선별로 안정적 회수 기반 마련.',
    riskLevel: '중간',
    duration: '24개월',
    maturity: '2027-01-31',
    investors: 38,
    progress: 60,
  },
]

const STATUS_OPTIONS = ['전체', '모집중', '운용중', '상환완료'] as const
const TYPE_OPTIONS = ['전체', '수익형', '안정형', '성장형', '특수상황'] as const

/* ─── Helpers ───────────────────────────────────────────────────── */
function formatKrwShort(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(0)}억`
  if (n >= 10_000_000) return `${(n / 10_000_000).toFixed(0)}천만`
  return `${(n / 10_000).toFixed(0)}만`
}

const TYPE_COLORS: Record<FundType, { bg: string; text: string; border: string }> = {
  수익형:   { bg: 'rgba(16,185,129,.15)',  text: C.emL,   border: 'rgba(16,185,129,.3)' },
  안정형:   { bg: 'rgba(59,130,246,.15)',  text: C.blueL, border: 'rgba(59,130,246,.3)' },
  성장형:   { bg: 'rgba(168,85,247,.15)',  text: '#C084FC', border: 'rgba(168,85,247,.3)' },
  특수상황: { bg: 'rgba(245,158,11,.15)',  text: C.amber2, border: 'rgba(245,158,11,.3)' },
}

const RISK_CONFIG: Record<RiskLevel, { color: string; label: string }> = {
  낮음: { color: C.em,    label: '낮음' },
  중간: { color: C.amber, label: '중간' },
  높음: { color: C.rose,  label: '높음' },
}

/* ─── Sparkline ─────────────────────────────────────────────────── */
function Sparkline({ color, progress }: { color: string; progress: number }) {
  const pts = [30, 28, 35, 33, 40, 38, 45, 42, 50, 48, 55, 53, 60].map(
    (v, i, a) => `${(i / (a.length - 1)) * 100},${100 - v * (progress / 100)}`
  )
  return (
    <svg viewBox="0 0 100 60" className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${pts.join(' L ')} L 100,100 L 0,100 Z`}
        fill={`url(#sg-${color.replace('#', '')})`}
      />
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ─── Fund Card ─────────────────────────────────────────────────── */
function FundCard({ fund, onInquiry, inquiring }: {
  fund: Fund
  onInquiry: (name: string, id: number) => void
  inquiring: number | null
}) {
  const typeStyle = TYPE_COLORS[fund.type]
  const riskCfg = RISK_CONFIG[fund.riskLevel]
  const isActive = fund.status === '모집중'
  const isDone = fund.status === '상환완료'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3 }}
      className="group flex flex-col overflow-hidden rounded-2xl"
      style={{
        background: C.l0,
        border: `1px solid ${C.l3}`,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(0,0,0,0.10)' }}
    >
      {/* Dark Header */}
      <div className="relative overflow-hidden px-5 pt-5 pb-4" style={{ backgroundColor: C.bg3 }}>
        {/* Subtle grid pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* Badges row */}
        <div className="relative flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: typeStyle.bg, color: typeStyle.text, border: `1px solid ${typeStyle.border}` }}>
            {fund.type}
          </span>
          {isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{ background: 'rgba(16,185,129,.18)', color: C.emL, border: `1px solid rgba(16,185,129,.35)` }}>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: C.em }} />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: C.em }} />
              </span>
              모집중
            </span>
          ) : fund.status === '운용중' ? (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{ background: 'rgba(59,130,246,.15)', color: C.blueL, border: `1px solid rgba(59,130,246,.3)` }}>
              <CircleDot size={10} /> 운용중
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: 'rgba(255,255,255,.06)', color: C.lt4, border: `1px solid rgba(255,255,255,.1)` }}>
              <CheckCircle2 size={10} /> 상환완료
            </span>
          )}
        </div>

        {/* Name */}
        <h3 className="relative text-[15px] font-bold leading-snug mb-0.5" style={{ color: C.l1 }}>
          {fund.name}
        </h3>
        <p className="relative text-[12px] mb-3" style={{ color: C.lt4 }}>
          <Building2 size={11} className="inline mr-1" />
          {fund.manager}
        </p>

        {/* Target return — BIG */}
        <div className="relative flex items-end gap-2">
          <span className="text-[32px] font-black tabular-nums leading-none" style={{ color: C.em }}>
            {fund.targetReturn}%
          </span>
          <div className="pb-1">
            <p className="text-[10px] font-medium uppercase tracking-widest" style={{ color: C.lt3 }}>목표 수익률</p>
            {fund.annualizedReturn && (
              <p className="text-[11px] font-semibold" style={{ color: C.emL }}>
                실현 {fund.annualizedReturn}%
              </p>
            )}
          </div>
        </div>

        {/* Sparkline */}
        <div className="relative mt-2 -mx-1">
          <Sparkline color={isActive ? C.em : isDone ? C.lt3 : C.blueL} progress={fund.progress} />
        </div>
      </div>

      {/* Light Body */}
      <div className="flex flex-col flex-1 p-5" style={{ backgroundColor: C.l0 }}>
        {/* Key metrics 2x2 */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {[
            { label: '운용 규모', value: formatKrwShort(fund.aum) },
            { label: '최소 투자금', value: formatKrwShort(fund.minInvestment) },
            { label: '운용 기간', value: fund.duration },
            { label: '만기일', value: fund.maturity.slice(0, 7) },
          ].map((m) => (
            <div key={m.label} className="rounded-xl px-3 py-2.5" style={{ background: C.l2 }}>
              <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: C.lt3 }}>{m.label}</p>
              <p className="text-[13px] font-bold" style={{ color: C.lt1 }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Progress bar (모집중 only) */}
        {isActive && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium" style={{ color: C.lt3 }}>모집 진행률</span>
              <span className="text-[12px] font-bold" style={{ color: C.lt1 }}>{fund.progress}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.l3 }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${fund.progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${C.em}, ${C.emL})` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px]" style={{ color: C.lt4 }}>
                {formatKrwShort(fund.aum)}
              </span>
              <span className="text-[10px]" style={{ color: C.lt4 }}>
                목표 {formatKrwShort(fund.targetAum)}
              </span>
            </div>
          </div>
        )}

        {/* Risk + investors */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            {fund.riskLevel === '낮음' ? <Shield size={12} style={{ color: riskCfg.color }} /> : <AlertTriangle size={12} style={{ color: riskCfg.color }} />}
            <span className="text-[11px] font-semibold" style={{ color: riskCfg.color }}>위험도 {riskCfg.label}</span>
          </div>
          <div className="flex items-center gap-1" style={{ color: C.lt3 }}>
            <Users size={12} />
            <span className="text-[11px]">{fund.investors}명 참여</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-auto flex gap-2">
          <button
            onClick={() => onInquiry(fund.name, fund.id)}
            disabled={inquiring === fund.id}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium transition-colors"
            style={{ background: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}
          >
            {inquiring === fund.id ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />}
            문의
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold transition-all"
            style={{
              background: isActive
                ? `linear-gradient(135deg, ${C.em}, ${C.teal})`
                : fund.status === '운용중'
                ? `linear-gradient(135deg, ${C.blue}, ${C.blueL})`
                : C.l2,
              color: isActive || fund.status === '운용중' ? C.l0 : C.lt3,
            }}
          >
            {isActive ? '투자 참여' : '상세보기'}
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Page ──────────────────────────────────────────────────────── */
export default function ExchangeFundPage() {
  const [statusFilter, setStatusFilter] = useState<string>('전체')
  const [typeFilter, setTypeFilter] = useState<string>('전체')
  const [funds, setFunds] = useState<Fund[]>(FUNDS)
  const [inquiring, setInquiring] = useState<number | null>(null)

  const heroRef = useRef(null)
  const contentRef = useRef(null)
  const contentInView = useInView(contentRef, { once: true, margin: '-50px' })

  useEffect(() => {
    async function fetchFunds() {
      try {
        const res = await fetch('/api/v1/fund?action=overview')
        const data = await res.json()
        if (data.funds?.length) {
          setFunds(data.funds.map((f: Record<string, unknown>) => ({
            id: f.id,
            name: (f.name as string) || '',
            manager: (f.manager as string) || '',
            type: (f.type as FundType) || '수익형',
            targetReturn: Number(f.target_return ?? f.targetReturn) || 0,
            minInvestment: Number(f.min_investment ?? f.minInvestment) || 0,
            aum: Number(f.aum) || 0,
            targetAum: Number(f.target_aum ?? f.targetAum) || 0,
            status: (f.status as FundStatus) || '모집중',
            strategy: (f.strategy as string) || '',
            riskLevel: (f.risk_level as RiskLevel ?? f.riskLevel as RiskLevel) || '중간',
            duration: (f.duration as string) || '',
            maturity: (f.maturity as string) || '',
            investors: Number(f.investors) || 0,
            progress: Number(f.progress) || 0,
            featured: !!f.featured,
            annualizedReturn: Number(f.annualized_return ?? f.annualizedReturn) || undefined,
          })))
        }
      } catch {
        // Keep FUNDS as fallback
      }
    }
    fetchFunds()
  }, [])

  const handleInquiry = async (fundName: string, fundId: number) => {
    setInquiring(fundId)
    try {
      await fetch('/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `펀드 문의: ${fundName}`, category: 'FUND', content: `${fundName} 펀드에 대한 문의입니다.` }),
      })
      toast.success('문의가 접수되었습니다. 담당자가 연락드리겠습니다.')
    } catch {
      toast.error('문의 접수에 실패했습니다.')
    } finally {
      setInquiring(null)
    }
  }

  const filtered = useMemo(() => {
    return funds.filter((f) => {
      const statusOk = statusFilter === '전체' || f.status === statusFilter
      const typeOk = typeFilter === '전체' || f.type === typeFilter
      return statusOk && typeOk
    })
  }, [statusFilter, typeFilter, funds])

  const totalAum = funds.reduce((s, f) => s + f.aum, 0)
  const avgReturn = (funds.reduce((s, f) => s + f.targetReturn, 0) / funds.length).toFixed(1)
  const activeCount = funds.filter((f) => f.status === '모집중').length

  const KPI_STRIP = [
    { label: '총 운용 규모', value: formatKrwShort(totalAum), sub: '누적 AUM', icon: PieChart, color: C.blueL },
    { label: '평균 수익률', value: `${avgReturn}%`, sub: '목표 연환산', icon: TrendingUp, color: C.emL },
    { label: '참여 펀드 수', value: `${funds.length}개`, sub: '전체 라인업', icon: Target, color: '#C084FC' },
    { label: '모집중 펀드', value: `${activeCount}개`, sub: '현재 투자 가능', icon: Star, color: C.amber2 },
  ]

  return (
    <div style={{ background: C.l1, minHeight: '100vh' }}>

      {/* ══ DARK HERO ══════════════════════════════════════════════ */}
      <section ref={heroRef} className="relative overflow-hidden" style={{ backgroundColor: C.bg1 }}>
        {/* Background noise/grid */}
        <div className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,.18) 0%, transparent 70%)`,
          }}
        />
        <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 pb-0 pt-14 lg:px-8">
          <div className="flex items-start justify-between mb-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest"
                style={{ background: 'rgba(16,185,129,.12)', color: C.emL, border: `1px solid rgba(16,185,129,.25)` }}>
                <Sparkles size={11} /> Fund Investment
              </div>
              <h1 className="text-[36px] font-black leading-tight tracking-tight lg:text-[48px]" style={{ color: C.l0 }}>
                NPL 투자 펀드
              </h1>
              <p className="mt-2 text-[16px] font-medium" style={{ color: C.lt4 }}>
                전문 운용사 공동 투자 · 검증된 수익 구조
              </p>
            </motion.div>
            <div className="hidden md:block pt-2">
              <GuideButton serviceKey="deal-bridge" />
            </div>
          </div>

          {/* KPI Strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl lg:grid-cols-4"
            style={{ background: 'rgba(255,255,255,.05)', border: `1px solid rgba(255,255,255,.07)` }}
          >
            {KPI_STRIP.map((k, i) => (
              <div key={k.label} className="flex items-center gap-3 px-5 py-5"
                style={{ background: i % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent' }}>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `rgba(${k.color === C.blueL ? '96,165,250' : k.color === C.emL ? '52,211,153' : k.color === '#C084FC' ? '192,132,252' : '252,211,77'},.15)` }}>
                  <k.icon size={16} style={{ color: k.color }} />
                </div>
                <div>
                  <p className="text-[22px] font-black tabular-nums leading-none" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: C.lt4 }}>{k.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-5 py-5">
            {[
              { icon: Shield, text: '금융위원회 인가 운용사' },
              { icon: Lock, text: '투자자 자산 분리 보관' },
              { icon: FileText, text: '분기별 운용 보고서 제공' },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-1.5 text-[11px]" style={{ color: C.lt4 }}>
                <b.icon size={12} style={{ color: C.lt3 }} />
                {b.text}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STICKY FILTER BAR ══════════════════════════════════════ */}
      <div className="sticky top-0 z-30 border-b" style={{ background: C.l0, borderColor: C.l3 }}>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex items-center gap-6 overflow-x-auto py-3 scrollbar-none">
            {/* Status chips */}
            <div className="flex shrink-0 items-center gap-1.5">
              {STATUS_OPTIONS.map((opt) => {
                const active = statusFilter === opt
                return (
                  <button
                    key={opt}
                    onClick={() => setStatusFilter(opt)}
                    className="rounded-full px-3 py-1 text-[12px] font-semibold transition-all whitespace-nowrap"
                    style={{
                      background: active ? C.lt1 : C.l2,
                      color: active ? C.l0 : C.lt2,
                      border: `1px solid ${active ? C.lt1 : C.l3}`,
                    }}
                  >
                    {opt}
                    {opt !== '전체' && (
                      <span className="ml-1 opacity-60 text-[10px]">
                        {FUNDS.filter((f) => f.status === opt).length}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="h-4 w-px shrink-0" style={{ background: C.l3 }} />

            {/* Type chips */}
            <div className="flex shrink-0 items-center gap-1.5">
              {TYPE_OPTIONS.map((opt) => {
                const active = typeFilter === opt
                const style = opt !== '전체' ? TYPE_COLORS[opt as FundType] : null
                return (
                  <button
                    key={opt}
                    onClick={() => setTypeFilter(opt)}
                    className="rounded-full px-3 py-1 text-[12px] font-semibold transition-all whitespace-nowrap"
                    style={{
                      background: active && style ? style.bg : active ? C.lt1 : C.l2,
                      color: active && style ? style.text : active ? C.l0 : C.lt3,
                      border: `1px solid ${active && style ? style.border : active ? C.lt1 : C.l3}`,
                    }}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>

            <div className="ml-auto shrink-0 text-[11px]" style={{ color: C.lt4 }}>
              {filtered.length}개 펀드
            </div>
          </div>
        </div>
      </div>

      {/* ══ LIGHT CONTENT ══════════════════════════════════════════ */}
      <div ref={contentRef} className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="flex gap-8">

          {/* ── Fund Grid ── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-24 rounded-2xl"
                  style={{ background: C.l2, border: `1px solid ${C.l3}` }}
                >
                  <BarChart3 size={32} style={{ color: C.lt4 }} className="mb-3" />
                  <p className="text-[14px] font-semibold" style={{ color: C.lt2 }}>해당 조건의 펀드가 없습니다</p>
                  <p className="text-[12px] mt-1" style={{ color: C.lt4 }}>필터를 변경해 보세요</p>
                </motion.div>
              ) : (
                <motion.div
                  key="grid"
                  className="grid gap-5 sm:grid-cols-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {filtered.map((fund, i) => (
                    <motion.div
                      key={fund.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={contentInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ duration: 0.35, delay: i * 0.07 }}
                    >
                      <FundCard fund={fund} onInquiry={handleInquiry} inquiring={inquiring} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right Sidebar: Guide ── */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-[57px] space-y-4">

              {/* Guide card */}
              <div className="overflow-hidden rounded-2xl" style={{ border: `1px solid ${C.l3}` }}>
                {/* Dark header */}
                <div className="px-5 py-4" style={{ backgroundColor: C.bg3 }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Info size={14} style={{ color: C.emL }} />
                    <span className="text-[12px] font-bold uppercase tracking-widest" style={{ color: C.emL }}>투자 가이드</span>
                  </div>
                  <h3 className="text-[15px] font-bold" style={{ color: C.l0 }}>NPL 펀드 투자 전 체크리스트</h3>
                </div>
                {/* Light body */}
                <div className="px-5 py-4 space-y-3" style={{ background: C.l0 }}>
                  {[
                    { icon: Shield, title: '운용사 인허가 확인', desc: '금융위원회 등록 자산운용사 여부 반드시 확인' },
                    { icon: FileText, title: '투자설명서 검토', desc: '전략, 리스크 요인, 수수료 구조를 꼼꼼히 파악' },
                    { icon: TrendingUp, title: '과거 수익률 검증', desc: '운용사의 유사 펀드 실제 수익률 이력 비교' },
                    { icon: Clock, title: '유동성 리스크 인지', desc: '만기 전 환매 제한 조건 확인 필수' },
                    { icon: Target, title: '분산 투자 원칙', desc: '단일 펀드에 총 자산 30% 이상 투자 지양' },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: C.l2 }}>
                        <item.icon size={13} style={{ color: C.blue }} />
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold" style={{ color: C.lt1 }}>{item.title}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: C.lt3 }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA card */}
              <div className="rounded-2xl p-5"
                style={{
                  background: `linear-gradient(135deg, ${C.bg3}, ${C.bg4})`,
                  border: `1px solid rgba(16,185,129,.2)`,
                }}>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: C.emL }}>전문가 상담</p>
                <p className="text-[14px] font-bold mb-1" style={{ color: C.l0 }}>펀드 투자, 막막하신가요?</p>
                <p className="text-[12px] mb-4" style={{ color: C.lt4 }}>NPL 전문 매니저가 1:1로 맞춤 펀드를 추천해 드립니다.</p>
                <button className="w-full rounded-xl py-2.5 text-[13px] font-bold transition-all"
                  style={{ background: `linear-gradient(135deg, ${C.em}, ${C.teal})`, color: C.l0 }}>
                  무료 상담 신청 <ArrowRight size={13} className="inline ml-1" />
                </button>
              </div>

            </div>
          </aside>
        </div>
      </div>

      {/* ══ DISCLAIMER ════════════════════════════════════════════ */}
      <div className="border-t px-6 py-6 lg:px-8" style={{ borderColor: C.l3, background: C.l1 }}>
        <p className="mx-auto max-w-7xl text-[11px]" style={{ color: C.lt4 }}>
          <span className="font-semibold" style={{ color: C.lt3 }}>투자 유의사항:</span> 펀드 투자는 원금 손실이 발생할 수 있으며, 과거 수익률이 미래 수익을 보장하지 않습니다.
          투자 전 투자설명서를 충분히 읽고 이해하시기 바랍니다. 본 서비스는 투자 권유가 아닌 정보 제공을 목적으로 합니다.
        </p>
      </div>
    </div>
  )
}
