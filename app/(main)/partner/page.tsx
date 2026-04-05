'use client'

import { useState } from 'react'
import Link from 'next/link'
import DS from '@/lib/design-system'
import {
  Handshake,
  UserPlus,
  Share2,
  Wallet,
  Trophy,
  ArrowRight,
  TrendingUp,
  Shield,
  ChevronRight,
  Users,
  Percent,
  Gift,
} from 'lucide-react'

const STEPS = [
  {
    step: 1,
    icon: UserPlus,
    title: '파트너 등록',
    desc: '간단한 신청서를 작성하고 파트너로 승인받으세요. 별도의 자격 요건 없이 누구나 신청할 수 있습니다.',
  },
  {
    step: 2,
    icon: Share2,
    title: '추천 코드 공유',
    desc: '고유한 추천 코드와 링크를 받아 네트워크에 공유하세요. SNS, 블로그, 커뮤니티 어디서든 활용 가능합니다.',
  },
  {
    step: 3,
    icon: Wallet,
    title: '수익 정산',
    desc: '추천을 통해 가입한 유료 회원의 구독료 중 20%를 매월 안정적으로 정산받으세요.',
  },
]

const LEADERBOARD = [
  { rank: 1, name: 'K**파트너', referrals: 142, revenue: '3,240,000' },
  { rank: 2, name: '부**전문가', referrals: 98, revenue: '2,156,000' },
  { rank: 3, name: 'N**투자', referrals: 76, revenue: '1,672,000' },
  { rank: 4, name: '경**마스터', referrals: 61, revenue: '1,342,000' },
  { rank: 5, name: '서**리더', referrals: 45, revenue: '990,000' },
]

const BENEFITS = [
  {
    icon: Percent,
    title: '업계 최고 수준 커미션',
    desc: '추천인 구독료의 20%를 매월 지급합니다.',
  },
  {
    icon: TrendingUp,
    title: '반복 수익 구조',
    desc: '추천인이 구독을 유지하는 한 매월 수익이 발생합니다.',
  },
  {
    icon: Shield,
    title: '실시간 추적 대시보드',
    desc: '추천 현황, 전환율, 수익을 실시간으로 확인하세요.',
  },
  {
    icon: Gift,
    title: '파트너 전용 혜택',
    desc: 'PRO 플랜 무료 제공 및 전용 교육 자료를 지원합니다.',
  },
]

export default function PartnerPage() {
  const [activeTab, setActiveTab] = useState<'monthly' | 'annual'>('monthly')

  return (
    <div className={DS.page.wrapper}>
      {/* Hero Section */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className="max-w-6xl mx-auto px-4 py-20 sm:py-28 text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-sunken)] mb-6 ${DS.text.caption}`}>
            <Handshake className="w-4 h-4 text-emerald-600" />
            <span>NPLatform 파트너 프로그램</span>
          </div>
          <h1 className={`${DS.text.pageTitle} mb-6`}>
            NPL 전문 플랫폼과 함께
            <br />
            <span className="text-emerald-600">수익을 만드세요</span>
          </h1>
          <p className={`${DS.text.body} max-w-2xl mx-auto mb-10`}>
            추천만으로 매월 안정적인 수익을 창출하세요.
            <br className="hidden sm:block" />
            NPLatform 파트너가 되어 구독료의 <strong className="text-[var(--color-text-primary)] font-semibold">20%</strong>를 정산받으세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/my/partner" className={DS.button.accent}>
              파트너 신청하기
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#how-it-works" className={DS.button.secondary}>
              자세히 알아보기
            </a>
          </div>
          <div className="mt-12 flex justify-center gap-8 sm:gap-16 text-center">
            <div>
              <p className={`${DS.text.metricLarge} text-emerald-600`}>20%</p>
              <p className={`${DS.text.caption} mt-1`}>커미션 비율</p>
            </div>
            <div>
              <p className={DS.text.metricLarge}>500+</p>
              <p className={`${DS.text.caption} mt-1`}>활동 파트너</p>
            </div>
            <div>
              <p className={DS.text.metricLarge}>1.2억+</p>
              <p className={`${DS.text.caption} mt-1`}>총 정산 금액</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={`${DS.page.container} py-20`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className={DS.text.sectionTitle}>파트너 프로그램 참여 방법</h2>
            <p className={`${DS.text.body} mt-3`}>3단계로 간단하게 시작하세요</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s) => (
              <div key={s.step} className={`${DS.card.interactive} ${DS.card.paddingLarge} group`}>
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <s.icon className="w-6 h-6" />
                  </div>
                  <span className={`${DS.text.label} text-emerald-600`}>STEP {s.step}</span>
                </div>
                <h3 className={DS.text.cardTitle}>{s.title}</h3>
                <p className={`${DS.text.body} mt-2`}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Revenue Structure */}
      <section className="bg-[var(--color-surface-elevated)] border-y border-[var(--color-border-subtle)]">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14">
            <h2 className={DS.text.sectionTitle}>수익 구조</h2>
            <p className={`${DS.text.body} mt-3`}>추천인의 구독이 유지되는 한 매월 반복 수익을 얻으세요</p>
          </div>

          <div className="flex justify-center mb-10">
            <div className={DS.tabs.list}>
              <button
                onClick={() => setActiveTab('monthly')}
                className={activeTab === 'monthly' ? DS.tabs.active : DS.tabs.trigger}
              >
                월간 구독 기준
              </button>
              <button
                onClick={() => setActiveTab('annual')}
                className={activeTab === 'annual' ? DS.tabs.active : DS.tabs.trigger}
              >
                연간 구독 기준
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { plan: 'STARTER', monthly: 29000, annual: 23200 },
              { plan: 'PRO', monthly: 79000, annual: 63200 },
              { plan: 'ENTERPRISE', monthly: 199000, annual: 159200 },
            ].map((p) => {
              const base = activeTab === 'monthly' ? p.monthly : p.annual
              const commission = Math.round(base * 0.2)
              return (
                <div key={p.plan} className={`${DS.card.interactive} ${DS.card.padding} text-center`}>
                  <p className={`${DS.text.label} text-[var(--color-brand-mid)] mb-1`}>{p.plan}</p>
                  <p className={`${DS.text.captionLight} mb-4`}>
                    구독료 {base.toLocaleString()}원/{activeTab === 'monthly' ? '월' : '월(연간)'}
                  </p>
                  <p className={`${DS.text.metricLarge} text-emerald-600`}>
                    {commission.toLocaleString()}
                    <span className={`${DS.text.caption} ml-1`}>원/월</span>
                  </p>
                  <p className={`${DS.text.captionLight} mt-2`}>추천인 1명 기준</p>
                </div>
              )
            })}
          </div>

          <div className="mt-10 text-center">
            <p className={DS.text.body}>
              추천인 <strong className="text-[var(--color-text-primary)] font-semibold">10명</strong>이 PRO 월간 구독 시 월{' '}
              <strong className="text-emerald-600 font-semibold">158,000원</strong>의 반복 수익
            </p>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className={`${DS.page.container} py-20`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className={DS.text.sectionTitle}>파트너 혜택</h2>
            <p className={`${DS.text.body} mt-3`}>NPLatform 파트너만의 특별한 혜택을 누리세요</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {BENEFITS.map((b) => (
              <div key={b.title} className={`${DS.card.interactive} ${DS.card.padding}`}>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-[var(--color-brand-mid)] mb-4">
                  <b.icon className="w-5 h-5" />
                </div>
                <h3 className={DS.text.cardSubtitle}>{b.title}</h3>
                <p className={`${DS.text.body} mt-1`}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="bg-[var(--color-surface-elevated)] border-y border-[var(--color-border-subtle)]">
        <div className="max-w-4xl mx-auto px-4 py-20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 text-emerald-600 mb-3">
              <Trophy className="w-5 h-5" />
              <span className={DS.text.label}>TOP PARTNERS</span>
            </div>
            <h2 className={DS.text.sectionTitle}>파트너 리더보드</h2>
            <p className={`${DS.text.caption} mt-3`}>이번 달 최고 성과를 기록한 파트너를 확인하세요</p>
          </div>

          <div className={DS.table.wrapper}>
            <div className={`grid grid-cols-[3rem_1fr_5rem_6rem] sm:grid-cols-[4rem_1fr_6rem_8rem] gap-2 px-4 sm:px-6 py-3 ${DS.table.header}`}>
              <span>순위</span>
              <span>파트너</span>
              <span className="text-right">추천</span>
              <span className="text-right">수익</span>
            </div>
            {LEADERBOARD.map((entry) => (
              <div
                key={entry.rank}
                className={`grid grid-cols-[3rem_1fr_5rem_6rem] sm:grid-cols-[4rem_1fr_6rem_8rem] gap-2 px-4 sm:px-6 py-4 items-center ${DS.table.row}`}
              >
                <span className="flex items-center justify-center">
                  {entry.rank <= 3 ? (
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.6875rem] font-bold text-white ${
                        entry.rank === 1
                          ? 'bg-yellow-500'
                          : entry.rank === 2
                          ? 'bg-[var(--color-text-muted)]'
                          : 'bg-amber-700'
                      }`}
                    >
                      {entry.rank}
                    </span>
                  ) : (
                    <span className={DS.text.caption}>{entry.rank}</span>
                  )}
                </span>
                <span className={DS.text.bodyBold}>{entry.name}</span>
                <span className={`text-right ${DS.text.body}`}>{entry.referrals}명</span>
                <span className={`text-right ${DS.text.bodyBold} text-emerald-600`}>{entry.revenue}원</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className={`${DS.card.hero} relative overflow-hidden`}>
          <div className="relative">
            <Users className="w-12 h-12 mx-auto mb-6 text-emerald-600" />
            <h2 className={DS.text.sectionTitle}>지금 파트너가 되어보세요</h2>
            <p className={`${DS.text.body} max-w-lg mx-auto mt-4 mb-8`}>
              NPL 시장의 성장과 함께 안정적인 수익을 만들어 가세요.
              파트너 등록은 무료이며, 별도의 자격 요건이 필요 없습니다.
            </p>
            <Link href="/my/partner" className={DS.button.accent}>
              파트너 신청하기
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
