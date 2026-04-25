'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronLeft, AlertTriangle, ArrowUp } from 'lucide-react'
import DS from '@/lib/design-system'

const SECTIONS = [
  {
    id: 'nature',
    title: '1. 투자 정보의 성격',
    body: 'NPLatform이 제공하는 모든 정보(매물 데이터, 수익률 예측, 경매 결과 등)는 투자 참고용 자료이며, 투자 권유 또는 확정적 수익을 보장하지 않습니다. 모든 투자 결정은 이용자 본인이 직접 판단하고 그 결과에 책임을 져야 합니다.',
  },
  {
    id: 'ai-limits',
    title: '2. AI 분석의 한계',
    body: 'AI 분석 기능은 과거 데이터와 통계적 모델에 기반합니다. 부동산 시장의 급격한 변동, 법적 분쟁, 정책 변화 등 예측 불가능한 요인에 의해 실제 결과가 크게 달라질 수 있습니다. AI 분석 결과를 최종 의사결정의 유일한 근거로 사용하지 마시기 바랍니다.',
  },
  {
    id: 'liability',
    title: '3. 손실에 대한 책임',
    body: '플랫폼 정보를 근거로 한 투자에서 발생하는 손실, 기회 비용, 세금 부담 등에 대해 (주)트랜스파머는 법적 책임을 지지 않습니다. 고위험 투자인 NPL 및 경매의 특성상 원금 손실이 발생할 수 있으며, 투자 전 반드시 전문 법무사·세무사·공인중개사의 자문을 받으시기 바랍니다.',
  },
  {
    id: 'accuracy',
    title: '4. 정보의 정확성',
    body: '플랫폼에 게시된 데이터는 공공기관 및 협력사 API를 통해 수집되나, 실시간 갱신 지연 또는 오류가 발생할 수 있습니다. 중요한 수치(감정가, 선순위 채권액, 낙찰가율 등)는 반드시 법원 경매 정보 사이트 등 원본 출처에서 직접 확인하시기 바랍니다.',
  },
  {
    id: 'external-links',
    title: '5. 외부 링크',
    body: '본 서비스에서 연결되는 외부 웹사이트의 콘텐츠, 정확성, 합법성에 대해 (주)트랜스파머는 책임을 지지 않습니다. 외부 사이트 이용 시 해당 사이트의 이용약관 및 개인정보처리방침이 적용됩니다.',
  },
]

export default function DisclaimerPage() {
  const [activeId, setActiveId] = useState<string | null>(null)

  return (
    <div className={DS.page.wrapper}>
      {/* Light header */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <nav className={`flex items-center gap-2 ${DS.text.caption} mb-6`}>
            <Link href="/terms" className="hover:text-[var(--color-text-primary)] transition-colors">약관</Link>
            <span className="text-[var(--color-text-muted)]">/</span>
            <span className="text-[var(--color-text-primary)]">면책 조항</span>
          </nav>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100/10 border border-stone-300/20">
              <AlertTriangle className="h-5 w-5 text-stone-900" />
            </div>
            <span className={DS.header.eyebrow}>법적 고지</span>
          </div>
          <h1 className={DS.header.title}>면책 조항</h1>
          <p className={`${DS.header.subtitle}`}>NPLatform 서비스 이용 전 반드시 확인하세요.</p>
          <div className={`mt-4 ${DS.text.caption}`}>
            최종 수정일: <span className="text-stone-900 font-semibold">2026년 3월 21일</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/" className={`inline-flex items-center gap-1.5 ${DS.text.captionLight} hover:text-[var(--color-text-primary)] transition-colors mb-8`}>
          <ChevronLeft className="h-4 w-4" /> 홈으로 돌아가기
        </Link>

        <div className="flex gap-10">
          {/* Sidebar TOC */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className={`sticky top-6 ${DS.card.base} p-4`}>
              <p className={`${DS.text.label} mb-3`}>목차</p>
              <ul className="space-y-1">
                {SECTIONS.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={() => setActiveId(s.id)}
                      className={`block text-[0.8125rem] py-1 pl-2 border-l-2 transition-colors ${activeId === s.id ? 'border-[var(--color-brand-mid)] text-[var(--color-text-primary)] font-semibold' : 'border-transparent text-[var(--color-text-tertiary)] hover:border-[var(--color-brand-mid)] hover:text-[var(--color-text-primary)]'}`}
                    >
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Warning banner */}
            <div className="bg-stone-100/10 border-l-4 border-stone-300 p-4 rounded-r-xl mb-8">
              <p className={`${DS.text.bodyBold} text-stone-900 mb-1`}>투자 위험 고지</p>
              <p className={`${DS.text.body} text-stone-900`}>
                본 플랫폼의 모든 수치, 분석, 시뮬레이션은 참고용이며 실제 결과와 다를 수 있습니다.
                투자와 관련된 모든 판단은 이용자 본인의 책임입니다.
              </p>
            </div>

            <div className="space-y-6 max-w-3xl">
              {SECTIONS.map((section) => (
                <div key={section.id} id={section.id} className={`${DS.card.base} ${DS.card.padding} scroll-mt-6`}>
                  <h2 className={`${DS.text.cardTitle} mb-3`}>{section.title}</h2>
                  <p className={DS.text.body}>{section.body}</p>
                </div>
              ))}

              {/* General notices */}
              <div className="bg-stone-100/10 border-l-4 border-[var(--color-brand-mid)] p-4 rounded-r-xl">
                <h2 className={`${DS.text.cardSubtitle} text-stone-900 mb-3`}>일반 고지 사항</h2>
                <ul className="space-y-2">
                  {[
                    '본 면책 조항은 NPLatform의 모든 서비스에 적용됩니다.',
                    '서비스 이용 시 본 면책 조항에 동의한 것으로 간주합니다.',
                    '관련 법규 변경 시 면책 조항을 수정할 수 있으며, 공지를 통해 안내합니다.',
                    '투자와 관련된 모든 판단은 이용자 본인의 책임이며, 필요한 경우 전문가의 자문을 받으시기 바랍니다.',
                  ].map((item, i) => (
                    <li key={i} className={`flex items-start gap-2 ${DS.text.body} text-stone-900`}>
                      <span className="text-[var(--color-brand-mid)] mt-0.5 shrink-0">--</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Signature block */}
              <div className={`${DS.card.base} ${DS.card.padding}`}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
                  <div>
                    <p className={DS.text.label}>시행일</p>
                    <p className={DS.text.bodyBold}>2026년 3월 21일</p>
                  </div>
                  <div>
                    <p className={DS.text.label}>회사명</p>
                    <p className={DS.text.bodyBold}>주식회사 트랜스파머</p>
                    <p className={DS.text.captionLight}>TransFarmer Inc.</p>
                  </div>
                  <div>
                    <p className={DS.text.label}>문의</p>
                    <p className={DS.text.bodyBold}>support@nplatform.kr</p>
                    <p className={DS.text.captionLight}>02-1234-5678</p>
                  </div>
                </div>
              </div>

              {/* Footer links */}
              <div className={`flex items-center justify-between pt-2 ${DS.text.captionLight} border-t border-[var(--color-border-subtle)]`}>
                <div className="flex gap-4">
                  <Link href="/terms/service" className="hover:text-[var(--color-text-primary)] transition-colors">이용약관</Link>
                  <Link href="/terms/privacy" className="hover:text-[var(--color-text-primary)] transition-colors">개인정보처리방침</Link>
                </div>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="flex items-center gap-1 hover:text-[var(--color-text-primary)] transition-colors"
                >
                  <ArrowUp className="h-3.5 w-3.5" /> 맨 위로
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
