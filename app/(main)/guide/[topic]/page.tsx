'use client'

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { useState, use } from 'react'
import { ArrowLeft, Clock, FileText, MessageSquare, ChevronRight, BookOpen, ThumbsUp, ThumbsDown } from 'lucide-react'
import DS from '@/lib/design-system'

const GUIDE_CONTENT: Record<string, {
  title: string
  description: string
  time: string
  difficulty: string
  category: string
  date: string
  sections: { id: string; heading: string; body: string; type?: 'tip' | 'warning' | 'normal' }[]
  related: { title: string; href: string; category: string }[]
}> = {
  psychology: {
    title: 'NPL 투자 심리 가이드',
    description: '경매 및 NPL 투자에서 나타나는 심리적 편향과 극복 방법을 알아보세요.',
    time: '10분',
    difficulty: '보통',
    category: '심화 학습',
    date: '2026.03.21',
    sections: [
      {
        id: 'anchoring',
        heading: '1. 앵커링 편향',
        body: '처음 접한 정보(감정가, 최초 제시가)에 과도하게 의존하는 현상입니다. 독립적인 AI 평가와 시장 데이터로 검증하세요.',
        type: 'normal',
      },
      {
        id: 'loss-aversion',
        heading: '2. 손실 회피 편향',
        body: '손실이 이득보다 2배 이상 강렬하게 느껴집니다. 명확한 손절 기준(예: -15% LTV 하락)을 사전에 설정하세요.',
        type: 'warning',
      },
      {
        id: 'overconfidence',
        heading: '3. 과신 편향',
        body: '경험이 쌓일수록 과신이 커집니다. 체크리스트 기반 실사와 AI 분석을 병행하여 객관성을 유지하세요.',
        type: 'tip',
      },
      {
        id: 'herding',
        heading: '4. 군집 행동',
        body: '인기 매물에 몰리는 현상입니다. 경쟁이 낮은 틈새 지역이나 자산 유형을 분석하는 역발상 전략을 고려하세요.',
        type: 'normal',
      },
      {
        id: 'overload',
        heading: '5. 정보 과부하',
        body: '너무 많은 정보가 결정을 마비시킵니다. 5~7개의 핵심 지표(LTV, 할인율, 선순위 설정금액, 예상 낙찰가율)로 집중하세요.',
        type: 'tip',
      },
    ],
    related: [
      { title: 'AI NPL 분석 가이드', href: '/guide/npl-analysis', category: '심화 학습' },
      { title: '경매 시뮬레이터 활용법', href: '/guide/auction-simulator', category: '도구' },
      { title: '거래 전체 프로세스', href: '/guide/deal-process', category: '기본' },
    ],
  },
  'npl-basics': {
    title: 'NPL 투자 입문 가이드',
    description: '부실채권(NPL)이란 무엇인지, 어떻게 투자하는지 기초부터 설명합니다.',
    time: '12분',
    difficulty: '쉬움',
    category: '기본',
    date: '2026.03.20',
    sections: [
      { id: 'what', heading: '1. NPL이란?', body: 'Non-Performing Loan의 약자로, 연체 90일 이상의 부실채권을 말합니다. 은행·금융기관이 원금 회수를 포기하고 할인 매각하는 채권입니다.', type: 'normal' },
      { id: 'why', heading: '2. 왜 투자하나?', body: '감정가 대비 30~60% 할인 매입이 가능하여, 공매·경매를 통해 정상 시세로 처분 시 높은 수익을 기대할 수 있습니다.', type: 'tip' },
      { id: 'risk', heading: '3. 주요 리스크', body: '선순위 채권 미확인, 점유자 명도 문제, 공법상 제한(건축법·용도지역) 등이 주요 리스크입니다. 사전 실사가 필수입니다.', type: 'warning' },
      { id: 'process', heading: '4. 투자 프로세스', body: '매물 탐색 → AI 분석 → 현장 조사 → 입찰가 산정 → 경매 참여 → 낙찰 후 명도 → 매각·임대로 수익 실현 순으로 진행됩니다.', type: 'normal' },
    ],
    related: [
      { title: '경매 시뮬레이터 활용법', href: '/analysis/simulator', category: '도구' },
      { title: 'AI NPL 분석 가이드', href: '/guide/npl-analysis', category: '심화' },
      { title: '거래 전체 프로세스', href: '/guide/deal-process', category: '기본' },
    ],
  },

  'platform-tour': {
    title: '플랫폼 둘러보기',
    description: 'NPLatform의 핵심 기능을 한눈에 파악하는 빠른 투어 가이드입니다.',
    time: '5분',
    difficulty: '쉬움',
    category: '기본',
    date: '2026.03.18',
    sections: [
      { id: 'exchange', heading: '1. 매물 허브', body: '/exchange 에서 NPL 매물을 검색하고 지도·필터로 탐색하세요. AI 분석 등급과 낙찰가율 통계가 함께 표시됩니다.', type: 'normal' },
      { id: 'analysis', heading: '2. 분석 도구', body: '/analysis 에서 AI 분석, 경매 시뮬레이터, OCR 문서인식을 사용하세요. 수익률 예측과 리스크 분석이 자동 계산됩니다.', type: 'tip' },
      { id: 'deals', heading: '3. 딜룸', body: '/deals 에서 관심 매물의 비공개 협상을 진행하세요. 문서 공유·오퍼·계약서까지 원스톱으로 처리됩니다.', type: 'normal' },
      { id: 'services', heading: '4. 전문가 서비스', body: '/services 에서 법무사·세무사·공인중개사와 1:1 상담을 예약하세요. 교육 강좌와 커뮤니티도 이용할 수 있습니다.', type: 'normal' },
    ],
    related: [
      { title: '회원가입 & 역할 설정', href: '/guide/getting-started', category: '기본' },
      { title: 'NPL 입문 가이드', href: '/guide/npl-basics', category: '기본' },
      { title: '매물 검색 가이드', href: '/guide/search', category: '매물 탐색' },
    ],
  },

  'institution': {
    title: '기관 투자자 가이드',
    description: '금융기관·부동산 펀드 등 기관 투자자의 NPLatform 활용 방법을 안내합니다.',
    time: '10분',
    difficulty: '중요',
    category: '기관',
    date: '2026.03.12',
    sections: [
      { id: 'register', heading: '1. 기관 계정 등록', body: '담당자 이메일로 가입 후 역할 선택에서 \'기관\'을 선택하세요. 관리자 승인 후 기관 전용 기능이 활성화됩니다.', type: 'normal' },
      { id: 'bulk', heading: '2. 대량 매물 등록', body: '/exchange/bulk-upload 에서 Excel·CSV 템플릿으로 수백 건의 매물을 일괄 등록할 수 있습니다.', type: 'tip' },
      { id: 'api', heading: '3. API 연동', body: '/my/developer 에서 API 키를 발급받아 내부 시스템과 연동하세요. RESTful API와 웹훅을 지원합니다.', type: 'tip' },
      { id: 'reporting', heading: '4. 리포팅', body: '관리자 대시보드에서 포트폴리오 전체 현황, 매각 성과, 수수료 정산 리포트를 다운로드할 수 있습니다.', type: 'normal' },
    ],
    related: [
      { title: '대량 매물 등록 가이드', href: '/guide/listing-register', category: '매물 관리' },
      { title: '파트너 가이드', href: '/guide/partner', category: '파트너' },
      { title: 'API 개발자 포털', href: '/my/developer', category: '개발자' },
    ],
  },

  'partner-referral': {
    title: '파트너 추천 프로그램 가이드',
    description: '추천코드로 수익을 창출하는 방법과 정산 구조를 안내합니다.',
    time: '8분',
    difficulty: '쉬움',
    category: '파트너',
    date: '2026.03.15',
    sections: [
      {
        id: 'register',
        heading: '1. 파트너 등록',
        body: '내 정보 → 파트너 → 파트너 등록 메뉴에서 신청하세요. 승인 후 고유 추천코드가 발급됩니다.',
        type: 'normal',
      },
      {
        id: 'share',
        heading: '2. 추천코드 공유',
        body: '블로그, SNS, 카카오톡 등 어디서든 추천코드를 공유하세요. 코드를 통해 가입한 사용자가 첫 구독 시 수익이 발생합니다.',
        type: 'tip',
      },
      {
        id: 'revenue',
        heading: '3. 수익 구조',
        body: '추천 가입 → 구독 전환 시 구독료의 20%를 지급합니다. 월별 정산으로 계좌 입금됩니다.',
        type: 'normal',
      },
      {
        id: 'leaderboard',
        heading: '4. 리더보드 & 보너스',
        body: '월간 추천 순위 상위 10명에게 추가 보너스를 지급합니다. 내 정보 → 파트너 → 리더보드에서 순위를 확인하세요.',
        type: 'tip',
      },
    ],
    related: [
      { title: '파트너 대시보드', href: '/my/partner', category: '파트너' },
      { title: '요금제 안내', href: '/pricing', category: '기본' },
      { title: '서비스 가이드 허브', href: '/guide', category: '기본' },
    ],
  },
}

interface Props {
  params: Promise<{ topic: string }>
}

export default function GuideTopicPage({ params }: Props) {
  const { topic } = use(params)
  const content = GUIDE_CONTENT[topic]
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null)

  if (!content) notFound()

  const difficultyColor: Record<string, string> = {
    '쉬움': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    '보통': 'bg-blue-50 text-blue-700 border border-blue-200',
    '중요': 'bg-red-50 text-red-700 border border-red-200',
  }

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)] px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <nav className={`flex items-center gap-2 ${DS.text.caption} mb-6`}>
            <Link href="/guide" className="hover:text-[var(--color-text-primary)] transition-colors">가이드</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--color-text-primary)]">{content.category}</span>
          </nav>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`text-[0.75rem] font-semibold px-2.5 py-1 rounded-full ${difficultyColor[content.difficulty] ?? 'bg-[var(--color-surface-sunken)] text-[var(--color-text-secondary)]'}`}>
              {content.difficulty}
            </span>
            <span className={`${DS.text.label} text-[var(--color-brand-mid)]`}>{content.category}</span>
          </div>
          <h1 className={DS.text.pageTitle}>{content.title}</h1>
          <p className={`${DS.text.body} mt-2 max-w-2xl`}>{content.description}</p>
          <div className={`flex flex-wrap items-center gap-5 mt-5 ${DS.text.caption}`}>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{content.time} 소요</span>
            <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{content.sections.length}개 섹션</span>
            <span className="flex items-center gap-1.5">최종 수정: {content.date}</span>
          </div>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex gap-10">
          {/* Sidebar TOC -- sticky */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className={`sticky top-6 ${DS.card.base} ${DS.card.padding}`}>
              <p className={`${DS.text.label} mb-3`}>목차</p>
              <ul className="space-y-1">
                {content.sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={`block ${DS.text.caption} py-1 pl-2 border-l-2 border-transparent hover:border-[var(--color-brand-mid)] hover:text-[var(--color-text-primary)] transition-colors`}
                    >
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main article */}
          <div className="flex-1 min-w-0">
            <div className="max-w-3xl mx-auto space-y-6">
              {content.sections.map((section) => {
                if (section.type === 'tip') {
                  return (
                    <div key={section.id} id={section.id} className="bg-blue-50 border-l-4 border-[var(--color-brand-mid)] p-4 rounded-r-xl">
                      <h2 className={`${DS.text.cardSubtitle} mb-2`}>{section.heading}</h2>
                      <p className="text-[0.8125rem] text-blue-800 leading-relaxed">{section.body}</p>
                    </div>
                  )
                }
                if (section.type === 'warning') {
                  return (
                    <div key={section.id} id={section.id} className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl">
                      <h2 className={`${DS.text.cardSubtitle} text-amber-800 mb-2`}>{section.heading}</h2>
                      <p className="text-[0.8125rem] text-amber-700 leading-relaxed">{section.body}</p>
                    </div>
                  )
                }
                return (
                  <div key={section.id} id={section.id} className={`${DS.card.base} ${DS.card.padding}`}>
                    <h2 className={`${DS.text.cardTitle} mb-3`}>{section.heading}</h2>
                    <p className={DS.text.body}>{section.body}</p>
                  </div>
                )
              })}

              {/* Feedback */}
              <div className={`${DS.card.base} ${DS.card.padding} text-center`}>
                <p className={`${DS.text.cardTitle} mb-4`}>도움이 되었나요?</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setFeedback('up')}
                    className={`${DS.button.secondary} ${feedback === 'up' ? '!bg-[var(--color-brand-dark)] !text-white !border-[var(--color-brand-dark)]' : ''}`}
                  >
                    <ThumbsUp className="w-4 h-4" /> 도움됐어요
                  </button>
                  <button
                    onClick={() => setFeedback('down')}
                    className={`${DS.button.secondary} ${feedback === 'down' ? '!bg-red-50 !text-red-600 !border-red-300' : ''}`}
                  >
                    <ThumbsDown className="w-4 h-4" /> 아쉬워요
                  </button>
                </div>
                {feedback && (
                  <p className={`mt-3 ${DS.text.captionLight}`}>
                    {feedback === 'up' ? '소중한 피드백 감사합니다.' : '더 나은 콘텐츠를 만들겠습니다.'}
                  </p>
                )}
              </div>

              {/* Related guides */}
              <div>
                <p className={`${DS.text.cardTitle} mb-4`}>관련 가이드</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {content.related.map((rel) => (
                    <Link key={rel.href} href={rel.href} className={`${DS.card.interactive} ${DS.card.padding} group`}>
                      <span className={`${DS.text.label} text-[var(--color-brand-mid)] mb-2 block`}>{rel.category}</span>
                      <p className={`${DS.text.bodyBold} group-hover:text-[var(--color-brand-mid)] leading-snug transition-colors`}>{rel.title}</p>
                      <ChevronRight className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-brand-mid)] mt-2 transition-colors" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer nav */}
            <div className={`max-w-3xl mx-auto mt-10 pt-6 ${DS.divider.default} flex items-center justify-between`}>
              <Link href="/guide" className={`flex items-center gap-2 ${DS.text.caption} hover:text-[var(--color-text-primary)] transition-colors`}>
                <ArrowLeft className="w-4 h-4" /> 가이드 허브
              </Link>
              <Link href="/support" className={`flex items-center gap-1.5 ${DS.text.link}`}>
                <MessageSquare className="w-4 h-4" /> 문의하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
