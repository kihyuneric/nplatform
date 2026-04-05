'use client'

import { useState } from 'react'
import Link from 'next/link'
import DS, { formatKRW, formatDate } from '@/lib/design-system'

const TABS = ['전체 강좌', '초급', '중급', '고급', '용어사전', '뉴스'] as const
type Tab = (typeof TABS)[number]

const FEATURED = [
  {
    id: 'f1', level: '초급', gradient: 'from-blue-500 to-blue-400',
    title: 'NPL 투자 완전 정복: 기초부터 실전까지',
    instructor: '김민준 · 前 금감원', duration: '총 42강 / 약 12시간',
    rating: 4.9, enrolled: 1840, price: '무료',
  },
  {
    id: 'f2', level: '중급', gradient: 'from-emerald-500 to-emerald-400',
    title: '경매 절차 완전 정복 — 권리분석 실무',
    instructor: '박서연 · 법무사', duration: '총 22강 / 약 5시간',
    rating: 4.7, enrolled: 876, price: '49,000원',
  },
  {
    id: 'f3', level: '고급', gradient: 'from-purple-500 to-purple-400',
    title: '배당순위 & 권리분석 실전 마스터',
    instructor: '정대호 · CFA', duration: '총 24강 / 약 6시간',
    rating: 4.9, enrolled: 603, price: '69,000원',
  },
]

const COURSES = [
  { id: 'c1', category: '기초', title: 'NPL 투자 입문 가이드', level: '초급', duration: '3h 20m', lessons: 14, rating: 4.8, enrolled: 1240, price: '무료' },
  { id: 'c2', category: '법률', title: '경매 절차 완전 정복', level: '중급', duration: '5h 45m', lessons: 22, rating: 4.7, enrolled: 876, price: '49,000원' },
  { id: 'c3', category: '실전', title: '배당순위 & 권리분석 실전', level: '고급', duration: '6h 10m', lessons: 24, rating: 4.9, enrolled: 603, price: '69,000원' },
  { id: 'c4', category: '세무', title: 'NPL 양도소득세 완전 이해', level: '중급', duration: '4h 00m', lessons: 16, rating: 4.6, enrolled: 492, price: '39,000원' },
  { id: 'c5', category: '전략', title: '공매 vs 사매: 수익률 비교 전략', level: '중급', duration: '2h 50m', lessons: 10, rating: 4.7, enrolled: 734, price: '무료' },
  { id: 'c6', category: '사례', title: '실전 NPL 투자 성공/실패 사례집', level: '고급', duration: '7h 15m', lessons: 28, rating: 5.0, enrolled: 318, price: '89,000원' },
]

const GLOSSARY_TERMS = ['근저당권', 'NPL', '경매', '배당순위', '임의경매', '강제경매', '채권최고액', '권리분석', '명도', '공매', '양도소득세', '채무자']

const LEVEL_COLOR: Record<string, string> = {
  '초급': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  '중급': 'bg-amber-50 text-amber-700 border-amber-200',
  '고급': 'bg-red-50 text-red-700 border-red-200',
}

const LEVEL_FILTER: Record<Tab, string | null> = {
  '전체 강좌': null, '초급': '초급', '중급': '중급', '고급': '고급', '용어사전': null, '뉴스': null,
}

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<Tab>('전체 강좌')
  const [glossaryQuery, setGlossaryQuery] = useState('')

  const filtered = LEVEL_FILTER[activeTab]
    ? COURSES.filter(c => c.level === LEVEL_FILTER[activeTab])
    : COURSES

  const handleGlossaryKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && glossaryQuery.trim()) {
      window.location.href = `/knowledge/glossary/${encodeURIComponent(glossaryQuery.trim())}`
    }
  }

  return (
    <div className={DS.page.wrapper}>

      {/* Hero */}
      <div className={`${DS.page.container} ${DS.page.paddingTop}`}>
        <div className={DS.header.wrapper}>
          <p className={DS.header.eyebrow}>NPL 교육</p>
          <h1 className={DS.header.title}>NPL 투자 마스터 과정</h1>
          <p className={DS.header.subtitle}>
            실전 중심 강의와 전문 용어 학습 — 초보 투자자부터 전문가까지 모든 수준에 맞는 콘텐츠
          </p>
          <div className={`flex items-center gap-8 mt-4 ${DS.text.body}`}>
            <span>강좌 <strong className={DS.text.bodyBold}>48개</strong></span>
            <span className="text-[var(--color-border-default)]">|</span>
            <span>수강생 <strong className={DS.text.bodyBold}>12,400명</strong></span>
            <span className="text-[var(--color-border-default)]">|</span>
            <span>평균 평점 <strong className="text-amber-500 font-semibold">4.8★</strong></span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-0 z-10 bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] shadow-[var(--shadow-xs)]">
        <div className={`${DS.page.container} flex gap-1 overflow-x-auto`} style={{ maxWidth: '64rem' }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-[0.8125rem] font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[var(--color-brand-mid)] text-[var(--color-brand-mid)]'
                  : 'border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className={`${DS.page.container} py-10 ${DS.page.sectionGap}`} style={{ maxWidth: '64rem' }}>

        {/* Featured courses */}
        {(activeTab === '전체 강좌') && (
          <section>
            <p className={`${DS.text.sectionTitle} mb-6`}>추천 강좌</p>
            <div className="grid gap-5 sm:grid-cols-3">
              {FEATURED.map(c => (
                <Link key={c.id} href={`/knowledge/courses/${c.id}`} className={`${DS.card.interactive} flex flex-col overflow-hidden`}>
                  {/* Thumbnail */}
                  <div className={`h-32 bg-gradient-to-br ${c.gradient} flex items-center justify-center relative`}>
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                    </div>
                    <span className={`absolute top-3 left-3 text-[0.6875rem] font-bold px-2 py-0.5 rounded-full border ${LEVEL_COLOR[c.level] ?? 'bg-gray-100 text-gray-700'}`}>
                      {c.level}
                    </span>
                  </div>
                  {/* Info */}
                  <div className={`flex-1 ${DS.card.padding} space-y-2`}>
                    <h3 className={`${DS.text.cardSubtitle} line-clamp-2`}>{c.title}</h3>
                    <p className={DS.text.captionLight}>{c.instructor}</p>
                    <p className={DS.text.captionLight}>{c.duration}</p>
                    <div className={`flex items-center justify-between pt-2 ${DS.divider.default}`}>
                      <span className={`${DS.text.caption} text-amber-500`}>★ {c.rating} <span className="text-[var(--color-text-muted)] font-normal">({c.enrolled.toLocaleString()}명)</span></span>
                      <span className={`${DS.text.caption} font-bold ${c.price === '무료' ? 'text-emerald-600' : 'text-[var(--color-brand-dark)]'}`}>{c.price}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Course grid */}
        {activeTab !== '용어사전' && activeTab !== '뉴스' && (
          <section>
            <p className={`${DS.text.sectionTitle} mb-6`}>
              {LEVEL_FILTER[activeTab] ? `${activeTab} 강좌` : '전체 강좌 카탈로그'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(c => (
                <Link key={c.id} href={`/knowledge/courses/${c.id}`} className={`${DS.card.interactive} flex flex-col overflow-hidden`}>
                  <div className="h-1.5 bg-gradient-to-r from-[var(--color-brand-dark)] to-[var(--color-brand-mid)]" />
                  <div className={`flex-1 ${DS.card.padding} space-y-3`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-[0.6875rem] font-medium px-2 py-0.5 rounded bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]`}>{c.category}</span>
                      <span className={`text-[0.6875rem] font-medium px-2 py-0.5 rounded-full border ${LEVEL_COLOR[c.level] ?? 'bg-gray-100 text-gray-600'}`}>{c.level}</span>
                    </div>
                    <h3 className={`${DS.text.cardSubtitle} line-clamp-2`}>{c.title}</h3>
                    <p className={DS.text.micro}>{c.duration} · {c.lessons}강</p>
                    <div className={`flex items-center justify-between pt-2 ${DS.divider.default}`}>
                      <span className={`${DS.text.caption} text-amber-500`}>★ {c.rating} <span className="text-[var(--color-text-muted)] font-normal">({c.enrolled.toLocaleString()}명)</span></span>
                      <span className={`${DS.text.caption} font-bold ${c.price === '무료' ? 'text-emerald-600' : 'text-[var(--color-brand-dark)]'}`}>{c.price}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Glossary quick search */}
        <section className={`${DS.card.elevated} ${DS.card.padding}`}>
          <p className={`${DS.text.sectionTitle} mb-5`}>NPL 핵심 용어 사전</p>
          <div className="relative mb-5">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="NPL 용어 검색..."
              value={glossaryQuery}
              onChange={e => setGlossaryQuery(e.target.value)}
              onKeyDown={handleGlossaryKey}
              className={`${DS.input.base} pl-10`}
            />
          </div>
          <div className="flex flex-wrap gap-2 mb-5">
            {GLOSSARY_TERMS.map(term => (
              <Link
                key={term}
                href={`/knowledge/glossary/${encodeURIComponent(term)}`}
                className={`${DS.filter.chip} ${DS.filter.chipInactive}`}
              >
                {term}
              </Link>
            ))}
          </div>
          <Link href="/knowledge/glossary" className={`${DS.text.link} flex items-center gap-1`}>
            전체 용어사전 보기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

      </div>
    </div>
  )
}
