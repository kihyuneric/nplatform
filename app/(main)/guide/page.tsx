'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen, Building2, Briefcase, Users, Clock, Play } from 'lucide-react'
import DS from '@/lib/design-system'

const CATEGORIES = [
  {
    icon: BookOpen,
    title: '초보자 가이드',
    desc: '처음 이용하시는 분을 위한 입문 가이드. 회원가입부터 첫 매물 검색까지.',
    href: '/guide/getting-started',
    color: '#10B981',
  },
  {
    icon: Building2,
    title: '매도자 가이드',
    desc: '매물 등록부터 딜룸 운영, 매각 완료까지 매도자 전체 여정.',
    href: '/guide/seller',
    color: '#F59E0B',
  },
  {
    icon: Briefcase,
    title: '전문가 등록 가이드',
    desc: '전문가 프로필 인증, 서비스 등록, 평판 관리 방법.',
    href: '/guide/professional',
    color: '#8B5CF6',
  },
  {
    icon: Users,
    title: '파트너 가이드',
    desc: '추천 코드 발급, 파트너 수익 구조, 정산 방법 안내.',
    href: '/guide/partner',
    color: '#2E75B6',
  },
]

const POPULAR_GUIDES = [
  { title: 'NPL 매물 검색 & 필터 완전 가이드', category: '매물 탐색', time: '10분', date: '2026.03.15' },
  { title: '딜룸 사용법 — 비공개 협상부터 계약 체결까지', category: '거래 프로세스', time: '12분', date: '2026.03.10' },
  { title: 'AI NPL 분석 — 등급 평가와 수익률 예측 이해하기', category: '분석 도구', time: '10분', date: '2026.03.05' },
  { title: '경매 시뮬레이터로 입찰가 전략 세우기', category: '분석 도구', time: '8분', date: '2026.02.28' },
  { title: '실사 체크리스트 14개 항목 완료하기', category: '거래 프로세스', time: '12분', date: '2026.02.20' },
]

const VIDEOS = [
  { title: '5분 빠른 시작 — 회원가입부터 첫 검색까지', duration: '5:12', thumb: '입문' },
  { title: 'AI 분석 보고서 읽는 법', duration: '8:44', thumb: 'AI 분석' },
  { title: '딜룸으로 안전하게 거래하기', duration: '11:30', thumb: '딜룸' },
]

export default function GuidePage() {
  return (
    <div className={DS.page.wrapper}>
      {/* Hero */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <p className={`${DS.text.label} text-[var(--color-brand-mid)] inline-block bg-[var(--color-brand-mid)]/10 border border-[var(--color-brand-mid)]/20 rounded-full px-4 py-1.5 mb-5`}>
            가이드 &amp; 튜토리얼
          </p>
          <h1 className={DS.text.pageTitle}>NPL 투자 완벽 가이드</h1>
          <p className={`${DS.text.body} mt-3 max-w-xl mx-auto`}>
            초보자부터 전문 투자자까지, 단계별로 쉽게 따라할 수 있는 상세 가이드를 제공합니다.
          </p>
        </div>
      </section>

      <div className={`${DS.page.container} max-w-5xl py-12`}>
        {/* Category grid */}
        <div className="mb-14">
          <h2 className={`${DS.text.sectionTitle} mb-6`}>역할별 가이드</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Link key={cat.title} href={cat.href} className={`${DS.card.interactive} group block ${DS.card.padding}`}>
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${cat.color}15`, border: `1px solid ${cat.color}30` }}
                >
                  <cat.icon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <h3 className={`${DS.text.bodyBold} mb-2`}>{cat.title}</h3>
                <p className={`${DS.text.caption} leading-relaxed mb-4`}>{cat.desc}</p>
                <span className="inline-flex items-center gap-1 text-[0.75rem] font-medium" style={{ color: cat.color }}>
                  바로가기 <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Popular guides */}
        <div className="mb-14">
          <h2 className={`${DS.text.sectionTitle} mb-6`}>인기 가이드</h2>
          <div className={`${DS.card.base} divide-y divide-[var(--color-border-subtle)]`}>
            {POPULAR_GUIDES.map((g, i) => (
              <Link key={i} href="#" className="flex items-center gap-4 px-5 py-4 hover:bg-[var(--color-surface-sunken)] transition-colors group">
                <span className="text-[0.8125rem] font-extrabold text-[var(--color-border-default)] w-5 shrink-0 tabular-nums">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className={`${DS.text.bodyBold} truncate group-hover:text-[var(--color-brand-mid)] transition-colors`}>{g.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className={DS.text.micro}>{g.category}</span>
                    <span className={`flex items-center gap-0.5 ${DS.text.micro}`}>
                      <Clock className="w-3 h-3" />{g.time}
                    </span>
                    <span className={DS.text.micro}>{g.date}</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-mid)] group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        {/* Video tutorials */}
        <div className="mb-14">
          <h2 className={`${DS.text.sectionTitle} mb-6`}>영상 튜토리얼</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {VIDEOS.map((v, i) => (
              <div key={i} className={`${DS.card.interactive} overflow-hidden`}>
                <div className="bg-[var(--color-brand-dark)] h-36 flex flex-col items-center justify-center relative">
                  <span className="text-[0.75rem] text-blue-300/60 mb-2">{v.thumb}</span>
                  <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                  <span className="absolute bottom-3 right-3 text-[0.6875rem] bg-black/60 text-white px-2 py-0.5 rounded">{v.duration}</span>
                </div>
                <div className="p-4">
                  <p className={DS.text.bodyBold}>{v.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className={`${DS.card.elevated} p-8 text-center`}>
          <p className={`${DS.text.label} mb-3`}>SUPPORT</p>
          <h3 className={`${DS.text.sectionSubtitle} mb-2`}>찾는 가이드가 없으신가요?</h3>
          <p className={`${DS.text.body} mb-6`}>고객센터에서 1:1 문의를 남겨주시면 빠르게 답변드립니다.</p>
          <Link href="/support" className={DS.button.primary}>
            고객센터 바로가기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
