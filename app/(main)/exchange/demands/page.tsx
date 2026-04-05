'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { MapPin, Building2, Plus, Target, Clock, Search, TrendingUp, Users, DollarSign, ChevronRight, ArrowUpRight, FileText, CheckCircle2 } from 'lucide-react'

const C = {
  bg0:"#030810", bg1:"#050D1A", bg2:"#080F1E", bg3:"#0A1628", bg4:"#0F1F35",
  em:"#10B981", emL:"#34D399", blue:"#3B82F6", blueL:"#60A5FA",
  amber:"#F59E0B", amber2:"#FCD34D", purple:"#A855F7", rose:"#F43F5E", teal:"#14B8A6",
  l0:"#FFFFFF", l1:"#F8FAFC", l2:"#F1F5F9", l3:"#E2E8F0",
  lt1:"#0F172A", lt2:"#334155", lt3:"#64748B", lt4:"#94A3B8",
}

type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
type Tier = 'BASIC' | 'STANDARD' | 'PREMIUM'

interface Demand {
  id: string
  buyer_tier: Tier
  collateral_types: string[]
  regions: string[]
  min_amount: number
  max_amount: number
  target_discount_rate: number
  recovery_period: string
  urgency: Urgency
  description: string
  proposal_count: number
  created_at: string
}

const URGENCY_CFG: Record<Urgency, { label: string; color: string; dot: string }> = {
  LOW:    { label: '일반',     color: C.blue,  dot: C.blue  },
  MEDIUM: { label: '보통',     color: C.teal,  dot: C.teal  },
  HIGH:   { label: '급함',     color: C.amber, dot: C.amber },
  URGENT: { label: '매우급함', color: C.rose,  dot: C.rose  },
}

const TIER_CFG: Record<Tier, { label: string; bg: string; color: string; border: string }> = {
  BASIC:    { label: 'Basic',    bg: C.l2,      color: C.lt3,  border: C.l3        },
  STANDARD: { label: 'Standard', bg: '#EFF6FF', color: C.blue, border: '#BFDBFE'   },
  PREMIUM:  { label: 'Premium',  bg: '#FFFBEB', color: C.amber,border: '#FDE68A'   },
}

const COLLATERAL_OPTS = ['전체', '아파트', '오피스텔', '상가', '토지', '공장', '기타']
const REGION_OPTS = ['전체', '서울', '경기', '인천', '부산', '대구', '대전', '광주']
const AMOUNT_OPTS = [
  { label: '전체', min: 0, max: Infinity },
  { label: '1억 이하', min: 0, max: 100_000_000 },
  { label: '1~5억', min: 100_000_000, max: 500_000_000 },
  { label: '5~20억', min: 500_000_000, max: 2_000_000_000 },
  { label: '20억 이상', min: 2_000_000_000, max: Infinity },
]

const DEMO: Demand[] = [
  {
    id: '1', buyer_tier: 'PREMIUM',
    collateral_types: ['아파트', '오피스텔'], regions: ['서울', '경기'],
    min_amount: 500_000_000, max_amount: 3_000_000_000,
    target_discount_rate: 25, recovery_period: '12개월', urgency: 'HIGH',
    description: '서울 수도권 아파트 담보 NPL 매수 희망. 감정가 70% 이하 물건 집중 검토. 경매 진행 중인 건도 가능.',
    proposal_count: 3, created_at: '2026-04-03',
  },
  {
    id: '2', buyer_tier: 'STANDARD',
    collateral_types: ['상가', '오피스'], regions: ['서울', '부산'],
    min_amount: 1_000_000_000, max_amount: 10_000_000_000,
    target_discount_rate: 35, recovery_period: '18개월', urgency: 'URGENT',
    description: '상업용 부동산 담보 채권 대규모 매입 검토 중. 복수 물건 일괄 거래 환영. 협상 가능.',
    proposal_count: 7, created_at: '2026-04-02',
  },
  {
    id: '3', buyer_tier: 'BASIC',
    collateral_types: ['아파트'], regions: ['경기'],
    min_amount: 100_000_000, max_amount: 500_000_000,
    target_discount_rate: 30, recovery_period: '6개월', urgency: 'MEDIUM',
    description: '경기도 아파트 소액 NPL 매수. 개인 투자자로 첫 진입. 법무사 연계 경매 대행 가능.',
    proposal_count: 1, created_at: '2026-04-02',
  },
  {
    id: '4', buyer_tier: 'PREMIUM',
    collateral_types: ['토지', '공장'], regions: ['경기', '충남', '경북'],
    min_amount: 2_000_000_000, max_amount: 15_000_000_000,
    target_discount_rate: 40, recovery_period: '24개월', urgency: 'MEDIUM',
    description: '수도권 인접 산업용지 및 공장 담보 채권 선별 매입. 개발 가능성 높은 토지 우선 검토.',
    proposal_count: 5, created_at: '2026-04-01',
  },
  {
    id: '5', buyer_tier: 'STANDARD',
    collateral_types: ['오피스텔'], regions: ['서울', '인천'],
    min_amount: 200_000_000, max_amount: 1_500_000_000,
    target_discount_rate: 28, recovery_period: '9개월', urgency: 'LOW',
    description: '수도권 오피스텔 NPL 소규모 포트폴리오 구성 중. 임대 수익 연계 물건 선호.',
    proposal_count: 2, created_at: '2026-03-30',
  },
  {
    id: '6', buyer_tier: 'PREMIUM',
    collateral_types: ['아파트', '토지', '상가'], regions: ['전국'],
    min_amount: 5_000_000_000, max_amount: 50_000_000_000,
    target_discount_rate: 38, recovery_period: '36개월', urgency: 'URGENT',
    description: '전국 단위 대형 NPL 포트폴리오 매입 검토. 1천억 이하 전국 분산 포트폴리오 우선. 신속 결정 가능.',
    proposal_count: 11, created_at: '2026-03-29',
  },
  {
    id: '7', buyer_tier: 'BASIC',
    collateral_types: ['상가'], regions: ['부산', '대구', '광주'],
    min_amount: 300_000_000, max_amount: 2_000_000_000,
    target_discount_rate: 32, recovery_period: '15개월', urgency: 'MEDIUM',
    description: '지방 광역시 소형 상업용 NPL 투자. 상권 분석 후 입찰 예정. 지역 분산 전략.',
    proposal_count: 0, created_at: '2026-03-28',
  },
  {
    id: '8', buyer_tier: 'STANDARD',
    collateral_types: ['아파트'], regions: ['강남구', '서초구', '송파구'],
    min_amount: 1_000_000_000, max_amount: 5_000_000_000,
    target_discount_rate: 22, recovery_period: '9개월', urgency: 'HIGH',
    description: '강남 3구 아파트 담보 NPL 집중 매입. 낙찰가율 90% 이상 우량 물건 선호. 즉시 검토 가능.',
    proposal_count: 4, created_at: '2026-03-27',
  },
  {
    id: '9', buyer_tier: 'BASIC',
    collateral_types: ['공장', '토지'], regions: ['경기', '충북'],
    min_amount: 500_000_000, max_amount: 3_000_000_000,
    target_discount_rate: 45, recovery_period: '30개월', urgency: 'LOW',
    description: '산업단지 내 공장·창고 담보 NPL. 경매 진행 중인 물건도 적극 검토. 장기 보유 가능.',
    proposal_count: 2, created_at: '2026-03-25',
  },
]

function fmtKRW(n: number) {
  if (n >= 1_0000_0000) return `${(n / 1_0000_0000).toFixed(0)}억`
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만`
  return n.toLocaleString()
}

const PER_PAGE = 9

export default function DemandsPage() {
  const [collateral, setCollateral] = useState('전체')
  const [region, setRegion] = useState('전체')
  const [amountIdx, setAmountIdx] = useState(0)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const heroRef = useRef(null)
  const heroInView = useInView(heroRef, { once: true })
  const gridRef = useRef(null)
  const gridInView = useInView(gridRef, { once: true })

  const filtered = useMemo(() => {
    let d = DEMO
    if (collateral !== '전체') d = d.filter(x => x.collateral_types.includes(collateral))
    if (region !== '전체') d = d.filter(x => x.regions.some(r => r.includes(region)))
    const amt = AMOUNT_OPTS[amountIdx]
    if (amt.min > 0 || amt.max < Infinity) {
      d = d.filter(x => x.min_amount >= amt.min && x.min_amount < amt.max)
    }
    if (search) d = d.filter(x => x.description.includes(search) || x.regions.join('').includes(search))
    return d
  }, [collateral, region, amountIdx, search])

  const totalPages = Math.ceil(filtered.length / PER_PAGE)
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.l2 }}>

      {/* ── DARK HERO ── */}
      <section ref={heroRef} style={{ backgroundColor: C.bg1, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: `linear-gradient(${C.em} 1px, transparent 1px), linear-gradient(90deg, ${C.em} 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
        <div style={{
          position: 'absolute', top: -120, left: '20%', width: 400, height: 400,
          borderRadius: '50%', background: `radial-gradient(circle, ${C.em}18 0%, transparent 70%)`,
        }} />

        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '64px 32px 48px' }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.12em', color: C.em, textTransform: 'uppercase' }}>
                Buyer Demand Board
              </span>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                backgroundColor: `${C.em}18`, border: `1px solid ${C.em}40`,
                borderRadius: 20, padding: '3px 10px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: C.em }} />
                <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: C.emL }}>LIVE</span>
              </div>
            </div>

            <h1 style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800,
              color: C.l0, letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: 12,
            }}>매수 수요</h1>

            <p style={{ fontSize: '1.0625rem', color: C.lt4, lineHeight: 1.7, maxWidth: 560, marginBottom: 40 }}>
              매수 의향이 있는 투자자들의 NPL 매수 조건을 확인하고 직접 제안을 보내세요
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              {[
                { icon: <Users size={16} />, label: '등록된 수요', value: `${DEMO.length}건`, sub: '이번 달 등록', color: C.em },
                { icon: <Target size={16} />, label: '평균 목표 할인율', value: `${Math.round(DEMO.reduce((s,d)=>s+d.target_discount_rate,0)/DEMO.length)}%`, sub: '전체 평균', color: C.blue },
                { icon: <DollarSign size={16} />, label: '평균 희망 금액', value: `${fmtKRW(Math.round(DEMO.reduce((s,d)=>s+(d.min_amount+d.max_amount)/2,0)/DEMO.length))}`, sub: '원 기준', color: C.amber },
              ].map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={heroInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                  style={{
                    backgroundColor: `${C.bg4}cc`, border: `1px solid ${C.bg4}`,
                    borderRadius: 12, padding: '16px 20px',
                    display: 'flex', alignItems: 'center', gap: 14, minWidth: 200,
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                    {kpi.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: C.lt4, marginBottom: 2 }}>{kpi.label}</p>
                    <p style={{ fontSize: '1.375rem', fontWeight: 800, color: C.l0, lineHeight: 1, marginBottom: 2 }}>{kpi.value}</p>
                    <p style={{ fontSize: '0.6875rem', color: `${kpi.color}99` }}>{kpi.sub}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STICKY FILTER BAR ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 40,
        backgroundColor: C.l0, borderBottom: `1px solid ${C.l3}`,
        boxShadow: '0 1px 12px rgba(0,0,0,0.07)',
      }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 260 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.lt4 }} />
              <input
                type="text"
                placeholder="지역, 담보유형 검색..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1) }}
                style={{
                  width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
                  fontSize: '0.875rem', borderRadius: 8, border: `1px solid ${C.l3}`,
                  outline: 'none', backgroundColor: C.l1, color: C.lt1,
                }}
              />
            </div>

            {/* Collateral chips */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {COLLATERAL_OPTS.slice(0, 5).map(opt => (
                <button
                  key={opt}
                  onClick={() => { setCollateral(opt); setPage(1) }}
                  style={{
                    padding: '6px 12px', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 600,
                    border: `1.5px solid ${collateral === opt ? C.em : C.l3}`,
                    backgroundColor: collateral === opt ? `${C.em}12` : 'transparent',
                    color: collateral === opt ? C.em : C.lt3,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >{opt}</button>
              ))}
            </div>

            {/* Region select */}
            <select
              value={region}
              onChange={e => { setRegion(e.target.value); setPage(1) }}
              style={{
                padding: '7px 12px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 500,
                border: `1px solid ${C.l3}`, backgroundColor: C.l1, color: C.lt2, outline: 'none',
              }}
            >
              {REGION_OPTS.map(r => <option key={r} value={r}>{r === '전체' ? '전체 지역' : r}</option>)}
            </select>

            {/* Amount select */}
            <select
              value={amountIdx}
              onChange={e => { setAmountIdx(Number(e.target.value)); setPage(1) }}
              style={{
                padding: '7px 12px', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 500,
                border: `1px solid ${C.l3}`, backgroundColor: C.l1, color: C.lt2, outline: 'none',
              }}
            >
              {AMOUNT_OPTS.map((a, i) => <option key={i} value={i}>{a.label}</option>)}
            </select>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '0.8125rem', color: C.lt4 }}>{filtered.length}건</span>
              <Link href="/exchange/demands/new" style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 18px', borderRadius: 8, fontWeight: 700, fontSize: '0.875rem',
                color: C.l0, textDecoration: 'none',
                background: `linear-gradient(135deg, ${C.em} 0%, ${C.teal} 100%)`,
                boxShadow: `0 4px 14px ${C.em}40`,
              }}>
                <Plus size={15} /> 수요 등록
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px' }} ref={gridRef}>
        <AnimatePresence mode="wait">
          {paged.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ textAlign: 'center', padding: '80px 0' }}
            >
              <p style={{ fontSize: '1.125rem', color: C.lt3, fontWeight: 600, marginBottom: 8 }}>조건에 맞는 수요가 없습니다</p>
              <button
                onClick={() => { setCollateral('전체'); setRegion('전체'); setAmountIdx(0); setSearch('') }}
                style={{ color: C.em, fontWeight: 600, fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                필터 초기화
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 18 }}
            >
              {paged.map((d, i) => {
                const urg = URGENCY_CFG[d.urgency]
                const tier = TIER_CFG[d.buyer_tier]
                return (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={gridInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.4, delay: i * 0.05 }}
                    whileHover={{ y: -3, boxShadow: `0 16px 40px rgba(0,0,0,0.12), 0 0 0 2px ${C.em}30` }}
                    style={{
                      backgroundColor: C.l0, borderRadius: 14,
                      border: `1px solid ${C.l3}`,
                      boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                      overflow: 'hidden', cursor: 'pointer',
                      transition: 'box-shadow 0.2s, transform 0.2s',
                    }}
                  >
                    {/* Accent top bar */}
                    <div style={{ height: 4, background: `linear-gradient(90deg, ${C.em} 0%, ${C.teal}80 100%)` }} />

                    <div style={{ padding: '18px 20px' }}>
                      {/* Row 1: badges + urgency */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.6875rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                          backgroundColor: tier.bg, color: tier.color, border: `1px solid ${tier.border}`,
                        }}>{tier.label}</span>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: '0.6875rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                          backgroundColor: `${urg.color}12`, color: urg.color,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: urg.dot }} />
                          {urg.label}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: C.lt4 }}>{d.created_at}</span>
                      </div>

                      {/* Amount BIG */}
                      <p style={{ fontSize: '1.5rem', fontWeight: 800, color: C.lt1, marginBottom: 6, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                        <span style={{ color: C.em }}>{fmtKRW(d.min_amount)}</span>
                        <span style={{ color: C.lt4, fontSize: '1rem' }}> ~ </span>
                        <span>{fmtKRW(d.max_amount)}</span>
                        <span style={{ fontSize: '0.875rem', color: C.lt4, fontWeight: 500 }}>원</span>
                      </p>

                      {/* Collateral tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                        {d.collateral_types.map(ct => (
                          <span key={ct} style={{
                            fontSize: '0.75rem', padding: '3px 9px', borderRadius: 6,
                            backgroundColor: '#EFF6FF', color: C.blue, border: '1px solid #BFDBFE',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                          }}>
                            <Building2 size={10} />{ct}
                          </span>
                        ))}
                      </div>

                      {/* Regions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10, color: C.lt3, fontSize: '0.8125rem' }}>
                        <MapPin size={13} style={{ color: C.em }} />
                        <span>{d.regions.join(', ')}</span>
                      </div>

                      {/* Meta */}
                      <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', color: C.lt3 }}>
                          <Target size={12} style={{ color: C.amber }} />
                          <span>할인율 <strong style={{ color: C.lt2 }}>{d.target_discount_rate}%</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', color: C.lt3 }}>
                          <Clock size={12} />
                          <span>{d.recovery_period}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p style={{
                        fontSize: '0.8125rem', color: C.lt4, lineHeight: 1.6, marginBottom: 16,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{d.description}</p>

                      {/* Bottom */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: `1px solid ${C.l3}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: C.lt4 }}>
                          <FileText size={12} />
                          {d.proposal_count > 0
                            ? <span>제안 <strong style={{ color: C.lt2 }}>{d.proposal_count}건</strong> 접수</span>
                            : <span>제안 없음</span>
                          }
                        </div>
                        <Link href={`/exchange/demands/${d.id}`} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '7px 14px', borderRadius: 8, fontWeight: 700, fontSize: '0.8125rem',
                          color: C.l0, textDecoration: 'none',
                          background: `linear-gradient(135deg, ${C.em} 0%, ${C.teal} 100%)`,
                        }}>
                          매물 제안 <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.l3}`, backgroundColor: C.l0, color: C.lt3, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{ width: 36, height: 36, borderRadius: 8, fontWeight: 700, fontSize: '0.875rem', border: `1px solid ${p === page ? C.em : C.l3}`, backgroundColor: p === page ? C.em : C.l0, color: p === page ? C.l0 : C.lt3, cursor: 'pointer' }}
              >{p}</button>
            ))}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.l3}`, backgroundColor: C.l0, color: C.lt3, cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >›</button>
          </div>
        )}

        {/* How to register CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          style={{
            marginTop: 48, backgroundColor: C.bg3, borderRadius: 16,
            padding: '32px 36px', border: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CheckCircle2 size={16} style={{ color: C.em }} />
              <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.emL, letterSpacing: '0.1em', textTransform: 'uppercase' }}>매수 수요 등록 안내</span>
            </div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: C.l0, marginBottom: 6 }}>
              NPL 매수 조건을 등록하고 매물 제안을 받아보세요
            </h3>
            <p style={{ fontSize: '0.875rem', color: C.lt4, lineHeight: 1.6 }}>
              원하는 담보 유형, 지역, 금액 범위를 등록하면 조건에 맞는 NPL 매도자가 직접 제안을 보냅니다.
            </p>
          </div>
          <Link href="/exchange/demands/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 28px', borderRadius: 10, fontWeight: 800, fontSize: '0.9375rem',
            color: C.l0, textDecoration: 'none',
            background: `linear-gradient(135deg, ${C.em} 0%, ${C.teal} 100%)`,
            boxShadow: `0 6px 20px ${C.em}45`, flexShrink: 0,
          }}>
            <Plus size={16} /> 수요 등록하기
          </Link>
        </motion.div>

        {/* Notice */}
        <div style={{ marginTop: 24, padding: '14px 18px', backgroundColor: C.l1, borderRadius: 10, border: `1px solid ${C.l3}` }}>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: C.lt4, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>이용 안내</p>
          <p style={{ fontSize: '0.8125rem', color: C.lt4, lineHeight: 1.7 }}>
            매수 수요 게시판은 NPL 투자자가 매수 조건을 공개하고 매도자의 제안을 받는 서비스입니다. 게시된 정보는 참고용이며 실제 거래 조건은 당사자 간 협의에 따릅니다.
          </p>
        </div>
      </main>
    </div>
  )
}
