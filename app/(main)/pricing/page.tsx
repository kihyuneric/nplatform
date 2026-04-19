'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2, X, ArrowRight, Building2, Users, Shield,
  Sparkles, Calculator, ChevronDown, ChevronUp, Star, Zap,
  TrendingUp, Lock, FileText, MessageSquare,
} from 'lucide-react'
import DS from '@/lib/design-system'

// ── 거래 수수료 (성공보수 기반) ────────────────────────
const FEE_TABLE = [
  {
    type: 'NPL 매도자',
    icon: Building2,
    color: 'var(--color-brand-mid)',
    rate: '≤ 0.9%',
    base: '채권 매각 대금 기준',
    highlight: '6개월 무료 온보딩',
    note: '금융기관·캐피탈·저축은행 등 첫 가입 기관 6개월 수수료 면제',
  },
  {
    type: 'NPL 매수자',
    icon: TrendingUp,
    color: 'var(--color-positive)',
    rate: '1.5%',
    base: '채권 매입가 기준',
    highlight: '+ 0.3% 우선협상권',
    note: '우선협상권(Priority Negotiation Right) 선택 시 0.3% 추가, 경쟁 입찰 없이 독점 협상 진행',
  },
  {
    type: '부동산 매도자',
    icon: Building2,
    color: 'var(--color-info)',
    rate: '≤ 0.9%',
    base: '매각 대금 기준',
    highlight: '6개월 무료 온보딩',
    note: '부동산 매물 등록 최초 6개월 수수료 면제',
  },
  {
    type: '부동산 매수자',
    icon: Users,
    color: 'var(--color-warning)',
    rate: '≤ 0.9%',
    base: '매입가 기준',
    highlight: '멤버십 할인 적용',
    note: 'L2 멤버십 보유 시 수수료 0.1%p 추가 할인',
  },
]

// ── 역할 기반 요금제 ───────────────────────────────────
// 무료(기본) / 매각사 · 일반 투자그룹 · 전문 투자그룹
// 각 그룹은 대상·수수료·기능·온보딩 혜택이 다릅니다.
type PlanId = 'free' | 'seller' | 'general' | 'pro'

interface SellerSubtype {
  key: string; label: string; sample: string
}

interface MembershipPlan {
  id: PlanId
  name: string
  nameEn: string
  icon: typeof Users
  price: number
  priceLabel: string
  cadence: string
  audience: string
  audienceSubtitle: string
  subtypes?: SellerSubtype[]
  feeSummary: string
  popular: boolean
  color: string
  features: Array<{ text: string; ok: boolean }>
  ctaHref: string
  ctaLabel: string
}

const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'free',
    name: '무료 체험',
    nameEn: 'Free',
    icon: Users,
    price: 0,
    priceLabel: '무료',
    cadence: '가입 후 바로 이용',
    audience: '모든 방문자',
    audienceSubtitle: '거래소 탐색 · 요금/가격 이해를 위한 공개 플랜',
    feeSummary: '거래 발생 시 표준 수수료 · 할인 없음',
    popular: false,
    color: 'var(--color-text-muted)',
    features: [
      { text: '매물 탐색·시세 조회 (L0 공개 수준)', ok: true },
      { text: 'AI 분석 체험 5회/월', ok: true },
      { text: '딜룸 1개 (개인 기록용)', ok: true },
      { text: '입찰·매수 제안 제출', ok: false },
      { text: '우선협상권(PNR) 이용', ok: false },
      { text: '수수료 할인', ok: false },
    ],
    ctaHref: '/exchange',
    ctaLabel: '거래소 둘러보기',
  },
  {
    id: 'seller',
    name: '매각사',
    nameEn: 'Seller',
    icon: Building2,
    price: 0,
    priceLabel: '첫 6개월 무료',
    cadence: '온보딩 이후 월 ₩0 (수수료 기반)',
    audience: '매물을 올리는 기관',
    audienceSubtitle: 'NPL · 부동산 포트폴리오를 플랫폼으로 유통하는 공급자',
    subtypes: [
      { key: 'bank', label: '금융기관', sample: '은행 · 저축은행 · 캐피탈 · 보험사' },
      { key: 'loan', label: '대부업체', sample: '등록대부업자 · NPL 매매업자' },
      { key: 'am', label: '자산운용사', sample: 'AMC · 사모펀드 · REITs' },
      { key: 'corp', label: '일반 법인', sample: '건설사 · 시행사 · 일반 기업' },
    ],
    feeSummary: 'NPL 매도 ≤0.9% · 부동산 매도 ≤0.9% (6개월 무료)',
    popular: false,
    color: 'var(--color-brand-mid)',
    features: [
      { text: '매물 대량 등록 + OCR 자동 파싱', ok: true },
      { text: '딜룸 무제한 · 서명·에스크로 완결', ok: true },
      { text: '매각가 시세 가이던스 + AI 리포트', ok: true },
      { text: '정산·세금계산서 자동 발행', ok: true },
      { text: '기관 인증 배지 부여 (매각사 전용)', ok: true },
      { text: '전담 어카운트 매니저 + SLA 99.9%', ok: true },
    ],
    ctaHref: '/contact',
    ctaLabel: '매각사 온보딩 문의',
  },
  {
    id: 'general',
    name: '일반 투자그룹',
    nameEn: 'General Investor',
    icon: Zap,
    price: 300000,
    priceLabel: '₩300,000',
    cadence: '/월 (VAT 별도)',
    audience: '활발한 개인/기업 투자자',
    audienceSubtitle: '월 1~5건 NPL 매수 또는 부동산 매입을 실행하는 투자그룹',
    subtypes: [
      { key: 'corp', label: '기업 회원', sample: '법인 · 투자조합 · 가족법인' },
      { key: 'indiv', label: '개인 회원', sample: '전문 투자자 기준 미달 활성 투자자' },
    ],
    feeSummary: 'NPL 매수 1.5% · 부동산 매수 0.9% (-0.05%p 할인)',
    popular: true,
    color: 'var(--color-positive)',
    features: [
      { text: '무제한 매물·시세·AI 분석', ok: true },
      { text: '경매 분석기 고급 + 시뮬레이터', ok: true },
      { text: '딜룸 10개 + 전자계약/NDA 관리', ok: true },
      { text: '우선협상권(PNR) 0.3% 이용', ok: true },
      { text: '법률 RAG 검색·판례 기본', ok: true },
      { text: '수수료 0.05%p 할인', ok: true },
    ],
    ctaHref: '/my/billing',
    ctaLabel: '일반 투자그룹 시작',
  },
  {
    id: 'pro',
    name: '전문 투자그룹',
    nameEn: 'Pro Investor',
    icon: Star,
    price: 1000000,
    priceLabel: '₩1,000,000',
    cadence: '/월 (VAT 별도)',
    audience: '대량 매입·풀세일·인수 전문',
    audienceSubtitle: '월 6건 이상 또는 풀(Pool) 단위 매입을 집행하는 전문그룹',
    subtypes: [
      { key: 'corp', label: '기업 회원', sample: '자산운용사 · 사모펀드 · 전문법인' },
      { key: 'indiv', label: '개인 회원', sample: '자본시장법 상 전문 투자자' },
    ],
    feeSummary: 'NPL 매수 1.5% · 부동산 매수 0.9% (-0.1%p 할인)',
    popular: false,
    color: 'var(--color-brand-mid)',
    features: [
      { text: '무제한 AI 분석 + 애널리스트 리포트', ok: true },
      { text: 'NBI 가격지수 전체 + 풀세일 집계', ok: true },
      { text: '딜룸 무제한 + 대량 매수 제안 엔진', ok: true },
      { text: '우선협상권(PNR) + 독점협상 예약', ok: true },
      { text: '법률 RAG + 판례 DB + 전문가 리뷰', ok: true },
      { text: '수수료 0.1%p 할인 + 분기 볼륨 리베이트', ok: true },
    ],
    ctaHref: '/my/billing',
    ctaLabel: '전문 투자그룹 시작',
  },
]

const FAQ_ITEMS = [
  {
    q: '수수료는 언제 발생하나요?',
    a: '거래가 최종 성사(계약 완료)된 시점에만 수수료가 발생합니다. 매물 조회·분석·AI 매칭 등의 과정은 무료이며, 실제 거래 체결 시에만 정산됩니다.',
  },
  {
    q: '금융기관 6개월 무료 온보딩은 어떻게 신청하나요?',
    a: '금융기관(은행, 캐피탈, 저축은행, AMC 등)은 영업팀에 문의하시면 법인 인증 후 즉시 6개월 무료 온보딩 혜택이 적용됩니다. 온보딩 기간 동안 모든 거래에 수수료가 면제됩니다.',
  },
  {
    q: '우선협상권(PNR)이란 무엇인가요?',
    a: '우선협상권(Priority Negotiation Right)은 매물에 대해 다른 투자자보다 먼저 독점적으로 협상할 수 있는 권리입니다. 경쟁 없이 원하는 조건으로 협상 테이블에 앉을 수 있습니다. NPL 매수자 수수료 1.5%에 0.3%를 추가해 이용 가능합니다.',
  },
  {
    q: '역할 요금제와 거래 수수료는 별도인가요?',
    a: '네, 완전히 별도입니다. 역할 요금제(매각사/일반·전문 투자그룹)는 플랫폼 기능(AI 분석, 딜룸, 법률 검색 등)에 대한 이용료이고, 거래 수수료는 실제 거래 성사 시 발생하는 성공보수입니다. 무료 체험으로도 시세·공개 매물 탐색이 가능하며, 매수 제안·입찰은 일반/전문 투자그룹에서 제공됩니다.',
  },
  {
    q: '일반 투자그룹과 전문 투자그룹의 차이는 무엇인가요?',
    a: '일반 투자그룹은 월 1~5건의 매수를 진행하는 활성 투자자(기업/개인)이며 수수료 0.05%p 할인이 적용됩니다. 전문 투자그룹은 월 6건 이상 또는 풀(Pool) 단위 매입을 집행하는 전문법인/자본시장법 상 전문투자자로, 0.1%p 할인 + 분기 볼륨 리베이트 + 풀세일 엔진이 제공됩니다.',
  },
  {
    q: '매각사는 어떤 회원이 가입할 수 있나요?',
    a: '매각사는 매물을 올리는 공급자를 위한 요금제이며, 금융기관(은행·저축은행·캐피탈·보험), 대부업체(등록대부업자), 자산운용사(AMC·사모펀드·REITs), 일반 법인(건설사·시행사 등) 네 가지 유형으로 세분화됩니다. 모든 매각사는 첫 6개월간 수수료가 면제됩니다.',
  },
]

// ── 수수료 계산기 ──────────────────────────────────────
function FeeCalculator() {
  const [dealType, setDealType] = useState<'npl-seller' | 'npl-buyer' | 're-seller' | 're-buyer'>('npl-buyer')
  const [amount, setAmount] = useState('')
  const [withPNR, setWithPNR] = useState(false)
  const [membership, setMembership] = useState<'free' | 'l1' | 'l2'>('free')

  const numAmount = Number(amount.replace(/,/g, '')) || 0

  const baseRate = {
    'npl-seller': 0.009,
    'npl-buyer': 0.015,
    're-seller': 0.009,
    're-buyer': 0.009,
  }[dealType]

  const pnrRate = (dealType === 'npl-buyer' && withPNR) ? 0.003 : 0
  const discountRate = { free: 0, l1: 0.0005, l2: 0.001 }[membership]
  const effectiveRate = Math.max(0, baseRate + pnrRate - discountRate)
  const fee = Math.round(numAmount * effectiveRate)

  const fmt = (n: number) => n.toLocaleString('ko-KR')

  return (
    <div className={`${DS.card.elevated} p-5`}>
      <div className="flex items-center gap-2 mb-5">
        <Calculator className="w-5 h-5 text-[var(--color-brand-mid)]" />
        <h3 className={DS.text.cardSubtitle}>수수료 계산기</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={`${DS.input.label} mb-1.5`}>거래 유형</label>
          <select
            value={dealType}
            onChange={e => setDealType(e.target.value as typeof dealType)}
            className={DS.input.base}
          >
            <option value="npl-seller">NPL 매도자</option>
            <option value="npl-buyer">NPL 매수자</option>
            <option value="re-seller">부동산 매도자</option>
            <option value="re-buyer">부동산 매수자</option>
          </select>
        </div>
        <div>
          <label className={`${DS.input.label} mb-1.5`}>거래 금액 (원)</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="1,000,000,000"
            value={amount}
            onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ','))}
            className={DS.input.base}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div>
          <label className={`${DS.input.label} mb-1.5`}>멤버십</label>
          <select
            value={membership}
            onChange={e => setMembership(e.target.value as 'free' | 'l1' | 'l2')}
            className={DS.input.base}
          >
            <option value="free">기본 (할인 없음)</option>
            <option value="l1">L1 (-0.05%p)</option>
            <option value="l2">L2 (-0.1%p)</option>
          </select>
        </div>
        {dealType === 'npl-buyer' && (
          <div className="flex items-center gap-3 pt-6">
            <button
              type="button"
              onClick={() => setWithPNR(!withPNR)}
              className={`w-11 h-6 rounded-full transition-colors ${withPNR ? 'bg-[var(--color-positive)]' : 'bg-[var(--color-surface-sunken)] border border-[var(--color-border-default)]'}`}
            >
              <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform mx-0.5 ${withPNR ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className={DS.text.body}>우선협상권 (+0.3%)</span>
          </div>
        )}
      </div>

      {numAmount > 0 && (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={DS.text.caption}>적용 수수료율</span>
            <span className={`${DS.text.bodyBold} text-[var(--color-brand-mid)]`}>{(effectiveRate * 100).toFixed(2)}%</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className={DS.text.caption}>거래 금액</span>
            <span className={DS.text.body}>₩{fmt(numAmount)}</span>
          </div>
          <div className="h-px bg-[var(--color-border-subtle)] mb-3" />
          <div className="flex items-center justify-between">
            <span className={DS.text.bodyBold}>예상 수수료</span>
            <span className="text-[1.5rem] font-extrabold text-[var(--color-positive)] tabular-nums">
              ₩{fmt(fee)}
            </span>
          </div>
          {discountRate > 0 && (
            <p className={`${DS.text.micro} text-[var(--color-positive)] mt-1 text-right`}>
              멤버십 할인 ₩{fmt(Math.round(numAmount * discountRate))} 적용됨
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[var(--color-border-subtle)] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className={`${DS.text.bodyBold} pr-4`}>{q}</span>
        {open ? <ChevronUp className="w-4 h-4 shrink-0 text-[var(--color-brand-mid)]" /> : <ChevronDown className="w-4 h-4 shrink-0 text-[var(--color-text-muted)]" />}
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className={`${DS.text.body} text-[var(--color-text-secondary)]`}>{a}</p>
        </div>
      )}
    </div>
  )
}

export default function PricingPage() {
  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} ${DS.page.paddingTop} pb-20`}>

        {/* ── Hero ── */}
        <div className={DS.header.wrapper}>
          <p className={DS.header.eyebrow}>Pricing</p>
          <h1 className={DS.header.title}>성공할 때만 수수료</h1>
          <p className={`${DS.header.subtitle} max-w-lg`}>
            거래가 성사될 때만 수수료가 발생합니다. 월정액 없이 시작하고, 성공할수록 더 큰 가치를 누리세요.
          </p>
        </div>

        {/* ── 거래 수수료 테이블 ── */}
        <section className="mb-12">
          <h2 className={`${DS.text.sectionTitle} mb-2`}>거래 수수료</h2>
          <p className={`${DS.text.captionLight} mb-6`}>모든 수수료는 거래 성사 시 1회 정산됩니다.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {FEE_TABLE.map((row) => {
              const Icon = row.icon
              return (
                <div key={row.type} className={`${DS.card.elevated} p-5`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${row.color} 15%, transparent)` }}>
                      <Icon className="w-4 h-4" style={{ color: row.color }} />
                    </div>
                    <span className={DS.text.label}>{row.type}</span>
                  </div>
                  <p className="text-[2rem] font-extrabold leading-none tabular-nums mb-1" style={{ color: row.color }}>
                    {row.rate}
                  </p>
                  <p className={`${DS.text.micro} mb-3`}>{row.base}</p>
                  <div className="rounded-lg px-2.5 py-1.5 mb-3 text-center text-[0.7rem] font-bold" style={{ background: `color-mix(in srgb, ${row.color} 15%, transparent)`, color: row.color }}>
                    {row.highlight}
                  </div>
                  <p className={`${DS.text.micro} leading-relaxed`}>{row.note}</p>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 수수료 계산기 ── */}
        <section className="mb-12 max-w-2xl">
          <FeeCalculator />
        </section>

        {/* ── 역할별 요금제 ── */}
        <section className="mb-12">
          <h2 className={`${DS.text.sectionTitle} mb-2`}>역할별 요금제</h2>
          <p className={`${DS.text.captionLight} mb-6`}>
            플랫폼 이용 목적에 맞는 역할을 선택하세요. 매각사는 첫 6개월 무료, 투자그룹은 활동량에 따라 일반/전문으로 구분됩니다.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {MEMBERSHIP_PLANS.map((plan) => {
              const Icon = plan.icon
              return (
                <div
                  key={plan.id}
                  className={`${DS.card.elevated} p-5 flex flex-col relative ${plan.popular ? 'ring-2 ring-[var(--color-positive)]' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--color-positive)] text-white text-[0.65rem] font-black tracking-wide whitespace-nowrap">
                      추천 플랜
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `color-mix(in srgb, ${plan.color} 15%, transparent)` }}>
                      <Icon className="w-4 h-4" style={{ color: plan.color }} />
                    </div>
                    <div>
                      <p className={DS.text.bodyBold}>{plan.name}</p>
                      <p className={DS.text.micro}>{plan.nameEn}</p>
                    </div>
                  </div>

                  <p className="text-[1.75rem] font-extrabold leading-none mb-0.5" style={{ color: plan.color }}>
                    {plan.priceLabel}
                  </p>
                  <p className={`${DS.text.micro} mb-3`}>{plan.cadence}</p>

                  <div className="mb-3">
                    <p className={`${DS.text.label} mb-0.5`}>{plan.audience}</p>
                    <p className={`${DS.text.micro} leading-relaxed`}>{plan.audienceSubtitle}</p>
                  </div>

                  {plan.subtypes && plan.subtypes.length > 0 && (
                    <div className="mb-3 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-sunken)] p-2.5">
                      <p className={`${DS.text.micro} font-bold mb-1.5 text-[var(--color-text-primary)]`}>대상 회원 유형</p>
                      <ul className="space-y-1">
                        {plan.subtypes.map((st) => (
                          <li key={st.key} className="flex items-start gap-2 text-[0.7rem]">
                            <span className="inline-block w-1 h-1 rounded-full bg-[var(--color-brand-mid)] mt-1.5 shrink-0" />
                            <span>
                              <span className="font-semibold text-[var(--color-text-primary)]">{st.label}</span>
                              <span className="text-[var(--color-text-muted)]"> · {st.sample}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="mb-3 rounded-lg px-2.5 py-1.5 text-center text-[0.7rem] font-bold" style={{ background: `color-mix(in srgb, ${plan.color} 15%, transparent)`, color: plan.color }}>
                    {plan.feeSummary}
                  </div>

                  <ul className="space-y-2 mb-5">
                    {plan.features.map((f, i) => (
                      <li key={i} className={`flex items-start gap-2 text-[0.8rem] ${f.ok ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] line-through'}`}>
                        {f.ok
                          ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[var(--color-positive)] mt-0.5" />
                          : <X className="w-3.5 h-3.5 shrink-0 text-[var(--color-text-muted)] mt-0.5" />}
                        <span>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.ctaHref}
                    className={`${plan.popular ? DS.button.accent : DS.button.secondary} w-full justify-center text-center mt-auto`}
                  >
                    {plan.ctaLabel}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── 금융기관 온보딩 배너 ── */}
        <section className="mb-12">
          <div className="rounded-2xl border border-[var(--color-brand-mid)]/30 bg-gradient-to-r from-[var(--color-brand-dark)] to-[var(--color-brand-mid)]/20 p-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-brand-mid)]/20 flex items-center justify-center shrink-0">
                  <Building2 className="w-7 h-7 text-[var(--color-brand-mid)]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--color-brand-mid)] uppercase tracking-wider mb-1">금융기관 특별 혜택</p>
                  <h3 className="text-xl font-extrabold text-[var(--color-text-primary)] mb-1">첫 6개월 수수료 완전 무료</h3>
                  <p className={DS.text.captionLight}>
                    은행, 캐피탈, 저축은행, AMC 등 금융기관 대상. 법인 인증 후 즉시 적용.
                  </p>
                </div>
              </div>
              <Link href="/contact" className={`${DS.button.accent} shrink-0`}>
                영업팀 문의 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 기능 비교표 ── */}
        <section className="mb-12">
          <h2 className={`${DS.text.sectionTitle} mb-6`}>역할별 기능 비교</h2>
          <div className={DS.table.wrapper}>
            <table className="w-full text-[0.8125rem]">
              <thead className={DS.table.header}>
                <tr>
                  <th className={DS.table.headerCell}>기능</th>
                  <th className={`${DS.table.headerCell} text-center`}>무료</th>
                  <th className={`${DS.table.headerCell} text-center`}>매각사</th>
                  <th className={`${DS.table.headerCell} text-center`}>일반 투자그룹</th>
                  <th className={`${DS.table.headerCell} text-center`}>전문 투자그룹</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: '매물 탐색', free: '공개 L0', seller: '본인 등록물 + 전체', general: '무제한', pro: '무제한' },
                  { feature: '매물 등록', free: false, seller: '대량 + OCR', general: false, pro: false },
                  { feature: '매수 제안·입찰', free: false, seller: false, general: true, pro: true },
                  { feature: 'AI 분석', free: '5회/월', seller: '매물당 자동 발급', general: '무제한', pro: '무제한 + 애널리스트' },
                  { feature: '경매 분석기', free: '기본', seller: '매각 관점', general: '고급 + 시뮬레이터', pro: '고급 + 풀세일' },
                  { feature: '딜룸', free: '1개', seller: '무제한', general: '10개', pro: '무제한' },
                  { feature: '우선협상권(PNR)', free: false, seller: '—', general: true, pro: true },
                  { feature: '법률 RAG', free: false, seller: true, general: true, pro: '+ 판례 DB' },
                  { feature: '수수료', free: '표준', seller: 'NPL/부동산 매도 ≤0.9%', general: 'NPL 매수 1.5% · -0.05%p', pro: 'NPL 매수 1.5% · -0.1%p' },
                  { feature: '온보딩 혜택', free: '—', seller: '첫 6개월 무료', general: '—', pro: '분기 볼륨 리베이트' },
                  { feature: '전담 매니저', free: false, seller: true, general: false, pro: true },
                ].map((row, i) => (
                  <tr key={i} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{row.feature}</td>
                    {(['free', 'seller', 'general', 'pro'] as const).map((col) => {
                      const val = (row as Record<string, unknown>)[col]
                      return (
                        <td key={col} className={`${DS.table.cell} text-center`}>
                          {val === true
                            ? <CheckCircle2 className="w-4 h-4 text-[var(--color-positive)] mx-auto" />
                            : val === false
                            ? <X className="w-4 h-4 text-[var(--color-text-muted)] mx-auto" />
                            : <span className={DS.text.caption}>{String(val)}</span>}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mb-12 max-w-2xl">
          <h2 className={`${DS.text.sectionTitle} mb-6`}>자주 묻는 질문</h2>
          <div className={DS.card.base}>
            {FAQ_ITEMS.map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </section>

        {/* ── 문의 CTA ── */}
        <section className="text-center">
          <div className={`${DS.card.flat} inline-flex flex-col items-center gap-3 px-10 py-8`}>
            <MessageSquare className="w-8 h-8 text-[var(--color-brand-mid)]" />
            <p className={DS.text.sectionTitle}>더 궁금한 점이 있으신가요?</p>
            <p className={DS.text.captionLight}>영업팀이 최적의 수수료 조건을 안내해 드립니다.</p>
            <div className="flex gap-3 mt-1">
              <Link href="/contact" className={DS.button.primary}>영업팀 문의</Link>
              <Link href="/exchange" className={DS.button.secondary}>거래소 둘러보기</Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
