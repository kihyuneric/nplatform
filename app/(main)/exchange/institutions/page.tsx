'use client'

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import { Building2, Search, MapPin, Phone, Globe, ExternalLink, TrendingUp, Award, BarChart3, Users, Star, ChevronRight, Filter, Shield } from 'lucide-react'

const C = {
  bg0:"#030810", bg1:"#050D1A", bg2:"#080F1E", bg3:"#0A1628", bg4:"#0F1F35",
  em:"#10B981", emL:"#34D399", blue:"#3B82F6", blueL:"#60A5FA",
  amber:"#F59E0B", amber2:"#FCD34D", purple:"#A855F7", rose:"#F43F5E", teal:"#14B8A6",
  l0:"#FFFFFF", l1:"#F8FAFC", l2:"#F1F5F9", l3:"#E2E8F0",
  lt1:"#0F172A", lt2:"#334155", lt3:"#64748B", lt4:"#94A3B8",
}

type InstitutionType = 'AMC' | '기관투자자' | '사모펀드' | '자산운용사' | '신탁사' | '저축은행'

interface Institution {
  id: string
  name: string
  type: InstitutionType
  logo_initials: string
  logo_color: string
  established: number
  location: string
  aum: string
  description: string
  specialties: string[]
  regions: string[]
  total_deals: number
  active_listings: number
  avg_deal_size: string
  rating: number
  review_count: number
  verified: boolean
  website?: string
  contact_email?: string
}

const TYPE_CFG: Record<InstitutionType, { label: string; color: string; bg: string; border: string }> = {
  'AMC':      { label: 'AMC',      color: C.em,    bg: '#ECFDF5', border: '#A7F3D0' },
  '기관투자자': { label: '기관투자자', color: C.blue,  bg: '#EFF6FF', border: '#BFDBFE' },
  '사모펀드':   { label: '사모펀드',   color: C.purple,bg: '#FAF5FF', border: '#DDD6FE' },
  '자산운용사': { label: '자산운용사', color: C.teal,  bg: '#F0FDFA', border: '#99F6E4' },
  '신탁사':    { label: '신탁사',    color: C.amber, bg: '#FFFBEB', border: '#FDE68A' },
  '저축은행':   { label: '저축은행',   color: C.lt2,   bg: C.l2,      border: C.l3     },
}

const DEMO: Institution[] = [
  {
    id: '1', name: '블루아크 자산운용', type: '자산운용사',
    logo_initials: 'BA', logo_color: C.blue,
    established: 2012, location: '서울 강남구',
    aum: '2.3조',
    description: '부동산 NPL 전문 자산운용사. 아파트·오피스텔 담보 채권 포트폴리오 운용 15년 이상의 노하우를 보유한 업계 선도 기업.',
    specialties: ['아파트', '오피스텔', '상가'],
    regions: ['서울', '경기', '인천'],
    total_deals: 342, active_listings: 12, avg_deal_size: '68억',
    rating: 4.8, review_count: 89, verified: true,
    website: 'https://bluearc.co.kr',
  },
  {
    id: '2', name: '코리아 AMC', type: 'AMC',
    logo_initials: 'KA', logo_color: C.em,
    established: 2009, location: '서울 여의도',
    aum: '5.1조',
    description: '국내 최대 자산관리회사 중 하나. 금융기관 부실채권 인수 및 정리 전문. 다양한 담보 유형의 NPL 포트폴리오 운용.',
    specialties: ['아파트', '상가', '토지', '공장'],
    regions: ['전국'],
    total_deals: 1204, active_listings: 38, avg_deal_size: '142억',
    rating: 4.6, review_count: 234, verified: true,
  },
  {
    id: '3', name: '스타브릿지 PE', type: '사모펀드',
    logo_initials: 'SB', logo_color: C.purple,
    established: 2016, location: '서울 중구',
    aum: '8,500억',
    description: '고수익 부동산 NPL에 특화된 사모펀드. 경매 물건 및 공매 물건을 중심으로 단기 고수익 투자 전략 추구.',
    specialties: ['상가', '오피스텔', '토지'],
    regions: ['서울', '경기', '부산'],
    total_deals: 178, active_listings: 7, avg_deal_size: '95억',
    rating: 4.5, review_count: 62, verified: true,
  },
  {
    id: '4', name: '한국자산관리공사', type: '기관투자자',
    logo_initials: 'KA', logo_color: C.amber,
    established: 1962, location: '서울 종로구',
    aum: '23조',
    description: '공공 부실채권 정리 전문 기관. 금융권 NPL 매입부터 자산 매각까지 전 과정 일괄 처리. 투명하고 공정한 거래 프로세스 보유.',
    specialties: ['아파트', '오피스텔', '상가', '토지', '공장'],
    regions: ['전국'],
    total_deals: 8923, active_listings: 156, avg_deal_size: '210억',
    rating: 4.9, review_count: 1842, verified: true,
  },
  {
    id: '5', name: '넥서스 인베스트먼트', type: '사모펀드',
    logo_initials: 'NX', logo_color: C.teal,
    established: 2019, location: '서울 강남구',
    aum: '3,200억',
    description: '신생 사모펀드로 수도권 중소형 NPL 집중 투자. 빠른 의사결정과 유연한 가격 협상이 강점. AI 기반 물건 분석 시스템 도입.',
    specialties: ['아파트', '오피스텔'],
    regions: ['서울', '경기'],
    total_deals: 67, active_listings: 4, avg_deal_size: '28억',
    rating: 4.3, review_count: 28, verified: true,
  },
  {
    id: '6', name: '미래저축은행', type: '저축은행',
    logo_initials: 'MS', logo_color: C.lt3,
    established: 2001, location: '서울 영등포구',
    aum: '4,800억',
    description: '금융위기 이후 부실채권 정리 경험 풍부. 중소형 부동산 담보채권 직접 매각. 신속한 클로징과 확실한 자금 집행 보장.',
    specialties: ['아파트', '상가'],
    regions: ['서울', '인천', '경기'],
    total_deals: 523, active_listings: 21, avg_deal_size: '12억',
    rating: 4.4, review_count: 187, verified: true,
  },
  {
    id: '7', name: '크레딧에셋 파트너스', type: '자산운용사',
    logo_initials: 'CA', logo_color: C.rose,
    established: 2014, location: '부산 해운대구',
    aum: '1.1조',
    description: '부산·경남 지역 NPL 1위 자산운용사. 상업용 부동산 및 토지 담보 채권 특화. 지역 경매 법원과의 협력 네트워크 보유.',
    specialties: ['상가', '토지', '공장'],
    regions: ['부산', '경남', '울산'],
    total_deals: 289, active_listings: 9, avg_deal_size: '38억',
    rating: 4.7, review_count: 103, verified: true,
  },
  {
    id: '8', name: '골든트리 신탁', type: '신탁사',
    logo_initials: 'GT', logo_color: C.amber2,
    established: 2007, location: '서울 중구',
    aum: '6.7조',
    description: '부동산 신탁 겸 NPL 운용 전문 신탁사. 신탁 물건의 경매·공매 관련 NPL 직접 매각. 법적 권리관계 정리까지 원스톱 서비스.',
    specialties: ['아파트', '오피스텔', '상가', '토지'],
    regions: ['서울', '경기', '전국'],
    total_deals: 1087, active_listings: 44, avg_deal_size: '89억',
    rating: 4.5, review_count: 312, verified: false,
  },
]

const TYPE_OPTS = ['전체', 'AMC', '기관투자자', '사모펀드', '자산운용사', '신탁사', '저축은행']
const REGION_OPTS = ['전체', '서울', '경기', '인천', '부산', '대구', '전국']
const SORT_OPTS = [
  { label: '거래건수 순', key: 'deals' },
  { label: '평점 순',     key: 'rating' },
  { label: '설립연도 순', key: 'established' },
]

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} style={{ width: 12, height: 12, color: i < Math.floor(rating) ? C.amber : C.l3 }} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: C.lt2, marginLeft: 2 }}>{rating}</span>
      <span style={{ fontSize: '0.6875rem', color: C.lt4 }}>({count})</span>
    </div>
  )
}

function InstitutionCard({ inst, index }: { inst: Institution; index: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const typeConf = TYPE_CFG[inst.type]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: (index % 4) * 0.07 }}
      whileHover={{ y: -4 }}
      style={{ backgroundColor: C.l0, borderRadius: 20, border: `1px solid ${C.l3}`, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)' }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.06)' }}
    >
      {/* Card header */}
      <div style={{ padding: '20px 20px 16px', position: 'relative', background: `linear-gradient(135deg, ${C.l1} 0%, ${C.l0} 100%)`, borderBottom: `1px solid ${C.l3}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Logo */}
          <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: inst.logo_color + '1A', border: `2px solid ${inst.logo_color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: inst.logo_color, letterSpacing: '-0.02em' }}>{inst.logo_initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: C.lt1, lineHeight: 1.2 }}>{inst.name}</h3>
              {inst.verified && (
                <span title="인증 기관" style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.5625rem', fontWeight: 800, padding: '2px 7px', borderRadius: 20, backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0' }}>
                  <Shield size={9} />인증
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, backgroundColor: typeConf.bg, color: typeConf.color, border: `1px solid ${typeConf.border}` }}>
                {typeConf.label}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.6875rem', color: C.lt4 }}>
                <MapPin size={10} />{inst.location}
              </span>
            </div>
          </div>
        </div>

        {/* AUM badge */}
        <div style={{ position: 'absolute', top: 16, right: 16, textAlign: 'right' }}>
          <p style={{ fontSize: '0.5625rem', fontWeight: 700, color: C.lt4, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>AUM</p>
          <p style={{ fontSize: '0.9375rem', fontWeight: 900, color: inst.logo_color }}>{inst.aum}</p>
        </div>
      </div>

      {/* Description */}
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.l3}` }}>
        <p style={{ fontSize: '0.8125rem', color: C.lt3, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {inst.description}
        </p>
      </div>

      {/* Metrics row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: `1px solid ${C.l3}` }}>
        {[
          { label: '누적 거래', value: `${inst.total_deals.toLocaleString()}건`, icon: BarChart3 },
          { label: '평균 규모', value: inst.avg_deal_size, icon: TrendingUp },
          { label: '현재 매물', value: `${inst.active_listings}건`, icon: Building2 },
        ].map((m, i) => (
          <div key={i} style={{ padding: '12px 16px', textAlign: 'center', borderRight: i < 2 ? `1px solid ${C.l3}` : 'none' }}>
            <m.icon size={12} style={{ color: C.lt4, marginBottom: 4, display: 'block', margin: '0 auto 4px' }} />
            <p style={{ fontSize: '1rem', fontWeight: 900, color: C.lt1, letterSpacing: '-0.02em' }}>{m.value}</p>
            <p style={{ fontSize: '0.5625rem', color: C.lt4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* Specialties */}
      <div style={{ padding: '12px 20px', borderBottom: `1px solid ${C.l3}`, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.5625rem', fontWeight: 800, color: C.lt4, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>전문 분야</span>
        {inst.specialties.map((s) => (
          <span key={s} style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, backgroundColor: C.l2, color: C.lt2, border: `1px solid ${C.l3}` }}>{s}</span>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: C.lt4, display: 'flex', alignItems: 'center', gap: 3 }}>
          <MapPin size={10} />{inst.regions.join(', ')}
        </span>
      </div>

      {/* Footer */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StarRating rating={inst.rating} count={inst.review_count} />
          <span style={{ fontSize: '0.6875rem', color: C.lt4 }}>· {inst.established}년 설립</span>
        </div>
        <Link href={`/exchange/institutions/${inst.id}`} style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, backgroundColor: inst.logo_color + '15', border: `1px solid ${inst.logo_color}30`, color: inst.logo_color, fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}>
            프로필 보기 <ChevronRight size={13} />
          </div>
        </Link>
      </div>
    </motion.div>
  )
}

export default function InstitutionsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('전체')
  const [regionFilter, setRegionFilter] = useState('전체')
  const [sortKey, setSortKey] = useState('deals')
  const heroRef = useRef(null)

  const filtered = useMemo(() => {
    let list = [...DEMO]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(i => i.name.includes(q) || i.description.includes(q) || i.specialties.some(s => s.includes(q)))
    }
    if (typeFilter !== '전체') list = list.filter(i => i.type === typeFilter)
    if (regionFilter !== '전체') list = list.filter(i => i.regions.includes(regionFilter) || i.regions.includes('전국'))
    list.sort((a, b) => {
      if (sortKey === 'deals') return b.total_deals - a.total_deals
      if (sortKey === 'rating') return b.rating - a.rating
      if (sortKey === 'established') return a.established - b.established
      return 0
    })
    return list
  }, [search, typeFilter, regionFilter, sortKey])

  const totalAUM = '41.5조'
  const totalInstitutions = DEMO.length
  const totalDeals = DEMO.reduce((s, i) => s + i.total_deals, 0).toLocaleString()
  const avgRating = (DEMO.reduce((s, i) => s + i.rating, 0) / DEMO.length).toFixed(1)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.l2 }}>

      {/* ═══ DARK HERO ═══════════════════════════════════════════ */}
      <div ref={heroRef} style={{ backgroundColor: C.bg1, position: 'relative', overflow: 'hidden' }}>
        {/* Background grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
        {/* Gradient orbs */}
        <div style={{ position: 'absolute', top: -60, left: '20%', width: 400, height: 400, borderRadius: '50%', background: `radial-gradient(circle, ${C.blue}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: '10%', width: 300, height: 300, borderRadius: '50%', background: `radial-gradient(circle, ${C.em}12 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', padding: '64px 24px 48px' }}>
          {/* Eyebrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.12em', padding: '4px 12px', borderRadius: 20, backgroundColor: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}>
              Participating Institutions
            </span>
          </div>

          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 16 }}>
            참여 기관 디렉터리
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.55)', maxWidth: 520, lineHeight: 1.7, marginBottom: 40 }}>
            NPLatform에 참여하는 기관투자자, AMC, 사모펀드, 자산운용사의 프로필과 전문 분야를 확인하세요.
          </p>

          {/* KPI Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
            {[
              { label: '참여 기관',   value: `${totalInstitutions}개`,      icon: Building2, color: C.blue },
              { label: '총 AUM',     value: totalAUM,                      icon: TrendingUp, color: C.em },
              { label: '누적 거래건', value: `${totalDeals}건`,              icon: BarChart3, color: C.amber },
              { label: '평균 평점',   value: `${avgRating} / 5.0`,           icon: Star, color: C.purple },
            ].map((kpi, i) => (
              <div key={i} style={{ padding: '20px 24px', backgroundColor: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
                <kpi.icon size={16} style={{ color: kpi.color, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                <p style={{ fontSize: 'clamp(1.25rem,3vw,1.75rem)', fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</p>
                <p style={{ fontSize: '0.6875rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ STICKY FILTER BAR ═══════════════════════════════════ */}
      <div className="sticky top-0 z-20" style={{ backgroundColor: C.l0, borderBottom: `1px solid ${C.l3}`, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.lt4, pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="기관명, 전문 분야 검색..."
              style={{ width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 8, paddingBottom: 8, borderRadius: 10, border: `1px solid ${C.l3}`, backgroundColor: C.l1, fontSize: '0.875rem', color: C.lt1, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {/* Type filter */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TYPE_OPTS.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setTypeFilter(opt)}
                style={{ padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  backgroundColor: typeFilter === opt ? C.lt1 : C.l2,
                  color: typeFilter === opt ? '#fff' : C.lt3,
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Region select */}
          <select
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 10, border: `1px solid ${C.l3}`, backgroundColor: C.l1, fontSize: '0.8125rem', color: C.lt2, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            {REGION_OPTS.map(r => <option key={r}>{r}</option>)}
          </select>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 10, border: `1px solid ${C.l3}`, backgroundColor: C.l1, fontSize: '0.8125rem', color: C.lt2, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
          >
            {SORT_OPTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>

          <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: C.lt4, fontWeight: 600, whiteSpace: 'nowrap' }}>
            총 {filtered.length}개 기관
          </span>
        </div>
      </div>

      {/* ═══ GRID ════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: C.lt4 }}>
            <Building2 size={40} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
            <p style={{ fontSize: '1rem', fontWeight: 700 }}>검색 결과가 없습니다</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
            {filtered.map((inst, i) => (
              <InstitutionCard key={inst.id} inst={inst} index={i} />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginTop: 48, borderRadius: 20, background: `linear-gradient(135deg, ${C.bg3} 0%, #0D2547 100%)`, padding: '40px 48px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        >
          <div>
            <p style={{ fontSize: '0.75rem', fontWeight: 800, color: C.blue, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>기관 파트너십</p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: 8 }}>기관으로 참여하시겠습니까?</h2>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 420 }}>
              NPLatform에 기관으로 등록하면 수천 명의 투자자에게 직접 노출됩니다. 빠른 딜 소싱과 AI 매칭을 경험하세요.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
            <Link href="/my/partner" style={{ textDecoration: 'none' }}>
              <button type="button" style={{ padding: '12px 24px', borderRadius: 12, backgroundColor: C.em, color: '#fff', fontWeight: 800, fontSize: '0.9375rem', border: 'none', cursor: 'pointer', boxShadow: `0 0 20px ${C.em}40` }}>
                파트너 신청
              </button>
            </Link>
            <Link href="/support" style={{ textDecoration: 'none' }}>
              <button type="button" style={{ padding: '12px 24px', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', fontWeight: 700, fontSize: '0.9375rem', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}>
                문의하기
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
