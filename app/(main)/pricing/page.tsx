'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, X, Zap, Building2, User, Crown, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import CheckoutModal, { type CheckoutPlan } from '@/components/payment/CheckoutModal'
import DS from '@/lib/design-system'

const PLANS = [
  {
    id: 'starter',
    plan_key: 'STARTER',
    icon: User,
    name: 'STARTER',
    price: { monthly: 29000, annual: 23200 },
    desc: 'NPL 입문 투자자를 위한 기본 도구',
    cta: '시작하기',
    popular: false,
    features: [
      '매물 조회 50건/월',
      'AI 분석 10회/월',
      '경매 시뮬레이터 기본',
      'OCR 스캔 20회/월',
      '딜룸 3개',
      '시장 리포트 월 1회',
    ],
  },
  {
    id: 'pro',
    plan_key: 'PRO',
    icon: Zap,
    name: 'PRO',
    price: { monthly: 79000, annual: 63200 },
    desc: '전문 투자자를 위한 모든 기능',
    cta: '플랜 선택하기',
    popular: true,
    features: [
      '무제한 매물 조회',
      'AI 분석 100건/월',
      '경매 시뮬레이터 고급',
      'OCR 스캔 100회/월',
      '딜룸 20개',
      '계약서 생성',
      '주간 시장 인텔리전스',
      '수수료 0.35% (기본 0.4%)',
    ],
  },
  {
    id: 'professional',
    plan_key: 'PROFESSIONAL',
    icon: Crown,
    name: 'PROFESSIONAL',
    price: { monthly: 199000, annual: 159200 },
    desc: '법인·전문 투자자 전용 Suite',
    cta: '플랜 선택하기',
    popular: false,
    features: [
      '무제한 AI 분석',
      '대량 매물 등록',
      'NPL 가격지수 (NBI) 전체',
      '법률 RAG 검색',
      '딜룸 무제한',
      '전담 지원 매니저',
      '수수료 0.30%',
    ],
  },
  {
    id: 'institution',
    plan_key: 'INSTITUTION',
    icon: Building2,
    name: 'INSTITUTION',
    price: { monthly: 499000, annual: 399200 },
    desc: '금융기관 · 자산운용사 맞춤',
    cta: '영업팀 문의',
    popular: false,
    features: [
      'PROFESSIONAL 모든 기능',
      'API 무제한 연동',
      '팀 계정 50명',
      'SLA 99.9% 보장',
      '화이트라벨 리포트',
      '수수료 0.30%',
      '전담 계좌매니저',
    ],
  },
]

const COMPARISON = [
  { feature: '매물 조회', free: '10건/월', pro: '무제한', enterprise: '무제한' },
  { feature: 'AI 분석', free: '3회/월', pro: '50건/월', enterprise: '무제한' },
  { feature: '경매 시뮬레이터', free: false, pro: true, enterprise: true },
  { feature: 'OCR 스캔', free: '5회/월', pro: '50회/월', enterprise: '무제한' },
  { feature: '딜룸', free: '1개', pro: '10개', enterprise: '무제한' },
  { feature: 'API 연동', free: false, pro: false, enterprise: true },
  { feature: '전담 매니저', free: false, pro: false, enterprise: true },
  { feature: 'SLA 보장', free: false, pro: false, enterprise: true },
]

const FAQ = [
  {
    q: '무료 플랜에서 프로로 업그레이드하면 데이터가 유지되나요?',
    a: '네, 모든 데이터(매물 관심, 분석 이력, 거래 기록)가 그대로 유지됩니다. 플랜 변경 즉시 새로운 기능을 이용할 수 있습니다.',
  },
  {
    q: '연간 결제 시 할인이 있나요?',
    a: '네, 연간 결제 시 20% 할인이 적용됩니다. 프로 플랜 기준 월 ₩39,200으로 이용 가능합니다.',
  },
  {
    q: '환불 정책은 어떻게 되나요?',
    a: '결제 후 7일 이내 미사용 크레딧에 한해 전액 환불 가능합니다. 자세한 사항은 고객센터로 문의해 주세요.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[var(--color-border-subtle)] last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 bg-transparent border-none cursor-pointer text-left"
        aria-expanded={open}
      >
        <span className={`${DS.text.bodyBold} pr-4 leading-relaxed`}>{q}</span>
        <span
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[1rem] font-bold transition-all border ${
            open
              ? 'bg-[var(--color-brand-mid)] text-white border-[var(--color-brand-mid)]'
              : 'bg-[var(--color-surface-sunken)] text-[var(--color-brand-mid)] border-[var(--color-border-default)]'
          }`}
        >
          {open ? '\u2212' : '+'}
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className={`${DS.text.body} leading-[1.75]`}>{a}</p>
        </div>
      )}
    </div>
  )
}

function CompareCell({ val }: { val: string | boolean }) {
  if (val === true) return <CheckCircle2 size={18} className="text-[var(--color-positive)] mx-auto" />
  if (val === false) return <X size={16} className="text-[var(--color-text-muted)] mx-auto" />
  return <span className={DS.text.metricSmall}>{val}</span>
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)
  const [checkoutPlan, setCheckoutPlan] = useState<CheckoutPlan | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [userInfo, setUserInfo] = useState<{ name: string; email: string }>({ name: '', email: '' })

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const meta = data.user.user_metadata as Record<string, string>
        setUserInfo({
          name:  meta['full_name'] ?? meta['name'] ?? '사용자',
          email: data.user.email ?? '',
        })
      }
    })
  }, [])

  function handleSelectPlan(plan: typeof PLANS[number]) {
    if (plan.id === 'institution' || !plan.plan_key) {
      window.location.href = '/support?subject=enterprise'
      return
    }
    setCheckoutPlan({
      id:            plan.id,
      plan_key:      plan.plan_key,
      name:          plan.name,
      price_monthly: plan.price.monthly,
      price_yearly:  plan.price.annual * 12,
      description:   plan.desc,
    })
    setCheckoutOpen(true)
  }

  return (
    <div className={DS.page.wrapper}>

      {/* ── Hero Section ── */}
      <section className="relative overflow-hidden bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] pt-16 pb-20 text-center">
        <div className="relative max-w-[700px] mx-auto px-6">
          <span className={DS.header.eyebrow}>요금제</span>
          <h1 className={`${DS.text.pageTitle} mt-3 mb-4`}>
            투자 목표에 맞는<br />플랜을 선택하세요
          </h1>
          <p className={`${DS.text.body} mb-10 max-w-xl mx-auto`}>
            NPL 투자 규모와 목적에 맞는 플랜을 선택하세요.<br />
            모든 플랜은 무약정, 언제든 변경 가능합니다.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] rounded-xl p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-lg text-[0.875rem] font-bold cursor-pointer border-none transition-all ${
                !annual
                  ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]'
                  : 'bg-transparent text-[var(--color-text-tertiary)]'
              }`}
            >월간 결제</button>
            <button
              onClick={() => setAnnual(true)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[0.875rem] font-bold cursor-pointer border-none transition-all ${
                annual
                  ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]'
                  : 'bg-transparent text-[var(--color-text-tertiary)]'
              }`}
            >
              연간 결제
              <span className="text-[0.6875rem] font-extrabold px-2 py-0.5 rounded-full bg-[var(--color-positive)] text-white">
                20% 할인
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Pricing Cards ── */}
      <section className={`${DS.page.container} -mt-12 relative z-10 pb-16`}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {PLANS.map((plan) => {
            const price = annual ? plan.price.annual : plan.price.monthly
            const priceLabel = price === 0 ? '\u20A90' : `\u20A9${price.toLocaleString('ko-KR')}`
            const Icon = plan.icon
            return (
              <div
                key={plan.id}
                className={`relative overflow-hidden transition-all duration-200 ${
                  plan.popular
                    ? `${DS.card.elevated} border-2 border-[var(--color-brand-mid)] shadow-[var(--shadow-xl)] scale-[1.02]`
                    : DS.card.base
                }`}
              >
                {/* Top accent bar for popular */}
                {plan.popular && (
                  <div className="h-1 bg-gradient-to-r from-[var(--color-brand-mid)] to-[var(--color-brand-bright)]" />
                )}
                {plan.popular && (
                  <div className="absolute top-3 right-5 bg-[var(--color-brand-mid)] text-white text-[0.6875rem] font-extrabold px-3.5 py-1 rounded-full shadow-[var(--shadow-brand)]">
                    MOST POPULAR
                  </div>
                )}

                <div className={DS.card.paddingLarge}>
                  {/* Plan icon + name */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] flex items-center justify-center">
                      <Icon size={20} className={plan.popular ? 'text-[var(--color-brand-mid)]' : 'text-[var(--color-text-tertiary)]'} />
                    </div>
                    <div>
                      <div className={`${DS.text.label} tracking-wider ${plan.popular ? 'text-[var(--color-brand-mid)]' : ''}`}>
                        {plan.name}
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-end gap-1 mb-1">
                    <span className={DS.text.metricHero}>{priceLabel}</span>
                    {price > 0 && (
                      <span className={`${DS.text.caption} pb-1`}>
                        /월{annual ? ' (연간)' : ''}
                      </span>
                    )}
                  </div>

                  <p className={`${DS.text.body} mb-6`}>
                    {plan.desc}
                  </p>

                  <div className={`${DS.divider.default} mb-5`} />

                  {/* Features */}
                  <ul className="list-none p-0 m-0 flex flex-col gap-2.5 mb-7">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5">
                        <CheckCircle2
                          size={16}
                          className={`flex-shrink-0 ${plan.popular ? 'text-[var(--color-brand-mid)]' : 'text-[var(--color-positive)]'}`}
                        />
                        <span className={DS.text.bodyMedium}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-3.5 rounded-xl font-bold cursor-pointer transition-all duration-150 hover:opacity-90 hover:-translate-y-0.5 ${
                      plan.popular
                        ? DS.button.primary + ' text-[0.9375rem]'
                        : DS.button.secondary + ' text-[0.9375rem]'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Trust Bar ── */}
      <section className="bg-[var(--color-surface-elevated)] border-y border-[var(--color-border-subtle)] py-6 px-6">
        <div className="max-w-[900px] mx-auto flex flex-wrap gap-6 justify-center items-center">
          {[
            '신용카드 불필요 — 무료 시작',
            '언제든 해지 가능',
            '7일 환불 보장',
            '데이터 안전 보관',
          ].map(item => (
            <div key={item} className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-[var(--color-positive)]" />
              <span className={DS.text.bodyMedium}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparison Table ── */}
      <section className="max-w-[1000px] mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <span className={DS.header.eyebrow}>기능 비교</span>
          <h2 className={`${DS.text.sectionTitle} mt-2`}>플랜별 상세 비교</h2>
        </div>

        <div className={DS.table.wrapper}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className={DS.table.header}>
                  <th className={`${DS.table.headerCell} w-[40%]`}>기능</th>
                  <th className={`${DS.table.headerCell} text-center`}>무료</th>
                  <th className={`${DS.table.headerCell} text-center bg-[var(--color-brand-mid)]/5 text-[var(--color-brand-mid)]`}>프로</th>
                  <th className={`${DS.table.headerCell} text-center`}>기업</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature} className={`${DS.table.row} ${i % 2 === 1 ? 'bg-[var(--color-surface-sunken)]' : ''}`}>
                    <td className={DS.table.cell}>{row.feature}</td>
                    <td className={`${DS.table.cell} text-center`}><CompareCell val={row.free} /></td>
                    <td className={`${DS.table.cell} text-center bg-[var(--color-brand-mid)]/[0.03]`}><CompareCell val={row.pro} /></td>
                    <td className={`${DS.table.cell} text-center`}><CompareCell val={row.enterprise} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="max-w-[720px] mx-auto px-6 pb-20">
        <div className="text-center mb-10">
          <span className={DS.header.eyebrow}>FAQ</span>
          <h2 className={`${DS.text.sectionTitle} mt-2`}>자주 묻는 질문</h2>
        </div>

        <div className={DS.card.elevated}>
          {FAQ.map((item, i) => (
            <FaqItem key={i} {...item} />
          ))}
        </div>

        <div className="text-center mt-8">
          <p className={`${DS.text.body} mb-4`}>원하시는 답변을 찾지 못하셨나요?</p>
          <Link href="/support">
            <button className={DS.button.secondary}>
              고객센터 문의하기
            </button>
          </Link>
        </div>
      </section>

      {/* ── Checkout Modal ── */}
      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        plan={checkoutPlan}
        billingCycle={annual ? 'yearly' : 'monthly'}
        customerName={userInfo.name}
        customerEmail={userInfo.email}
      />
    </div>
  )
}
