'use client'

import { useState } from 'react'
import DS from '@/lib/design-system'

const CATEGORIES = [
  { id: 'account', label: '계정/보안', icon: '👤', desc: '가입·로그인·인증·보안' },
  { id: 'billing', label: '결제/구독', icon: '💳', desc: '플랜·환불·크레딧' },
  { id: 'listings', label: '매물 이용', icon: '🏠', desc: '등록·검색·분석' },
  { id: 'deals', label: '거래', icon: '🤝', desc: '딜룸·공동투자' },
  { id: 'tech', label: '기술지원', icon: '⚙️', desc: '오류·버그·시스템' },
  { id: 'other', label: '기타', icon: '💬', desc: '기타 문의사항' },
]

const FAQS = [
  { q: '회원가입은 어떻게 하나요?', a: '홈페이지 우측 상단 "회원가입" 버튼을 클릭하여 이메일과 비밀번호를 입력하면 가입이 완료됩니다. 가입 후 투자자 인증을 진행하면 더 많은 서비스를 이용할 수 있습니다.' },
  { q: 'NPL 분석은 어떻게 시작하나요?', a: '상단 메뉴의 분석 도구 > NPL 분석에서 "새 분석 시작"을 클릭하세요. 사건번호, 감정가, 최저입찰가를 입력하면 AI가 자동으로 수익률과 리스크를 분석합니다.' },
  { q: '경매 시뮬레이터는 무료인가요?', a: '네, 모든 회원에게 무료로 제공됩니다. 입찰가별 예상 수익률, 세금, 비용을 자동으로 계산하여 최적의 투자 의사결정을 도와드립니다.' },
  { q: '딜룸은 어떤 기능인가요?', a: '딜룸은 매수자와 매도자가 안전하게 거래를 진행할 수 있는 비공개 거래 워크스페이스입니다. NDA 서명, 실사 자료 공유, 계약 체결까지 모든 과정이 딜룸 내에서 이루어집니다.' },
  { q: '플랜은 언제든 변경할 수 있나요?', a: '네, 언제든 상위 플랜으로 업그레이드하거나 다음 결제 주기부터 다운그레이드할 수 있습니다. 마이페이지 > 결제에서 변경 가능합니다.' },
]

function FaqRow({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[var(--color-border-subtle)] last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-[var(--color-surface-sunken)] transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-[var(--color-brand-mid)] font-bold text-[0.9375rem] shrink-0 mt-0.5">Q</span>
          <span className={DS.text.bodyMedium}>{q}</span>
        </div>
        <span className={`shrink-0 ml-3 text-[var(--color-text-muted)] text-lg leading-none transition-transform ${open ? 'rotate-45' : ''}`}>+</span>
      </button>
      {open && (
        <div className="px-6 pb-4 border-t border-[var(--color-border-subtle)]">
          <div className="flex gap-3 pt-4">
            <span className="text-[var(--color-positive)] font-bold text-[0.9375rem] shrink-0">A</span>
            <p className={DS.text.body}>{a}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SupportPage() {
  const [search, setSearch] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ category: '', title: '', content: '' })

  const filtered = FAQS.filter(
    (f) => !search || f.q.includes(search) || f.a.includes(search)
  )

  const handleSubmit = async () => {
    if (!form.category || !form.title || !form.content) return
    try {
      await fetch('/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
    } catch {}
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setForm({ category: '', title: '', content: '' })
    }, 3000)
  }

  return (
    <div className={DS.page.wrapper}>

      {/* Hero */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className="max-w-3xl mx-auto px-4 py-20 text-center">
          <p className={DS.header.eyebrow}>고객센터</p>
          <h1 className={`${DS.header.title} mt-4 mb-4`}>
            어떻게 도와드릴까요?
          </h1>
          <p className={`${DS.header.subtitle} mx-auto mb-8`}>
            궁금한 점이 있으시면 언제든 문의해 주세요
          </p>
          {/* Search */}
          <div className="relative max-w-xl mx-auto">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-lg">🔍</span>
            <input
              type="text"
              placeholder="질문을 검색해보세요..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${DS.input.base} pl-12`}
            />
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

        {/* Category Grid */}
        <section>
          <p className={`${DS.text.label} mb-6`}>문의 분류</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.id} className={`${DS.card.interactive} ${DS.card.padding}`}>
                <span className="text-2xl mb-3 block">{cat.icon}</span>
                <p className={DS.text.cardSubtitle}>{cat.label}</p>
                <p className={`${DS.text.captionLight} mt-0.5`}>{cat.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Popular FAQs */}
        <section>
          <p className={`${DS.text.label} mb-6`}>인기 FAQ</p>
          <div className={`${DS.card.elevated} overflow-hidden`}>
            {filtered.length === 0 ? (
              <div className={DS.empty.wrapper}>
                <p className={DS.empty.title}>검색 결과가 없습니다.</p>
              </div>
            ) : (
              filtered.map((f, i) => <FaqRow key={i} {...f} />)
            )}
          </div>
        </section>

        {/* Contact Channels */}
        <section>
          <p className={`${DS.text.label} mb-6`}>연락처</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center text-lg">📧</span>
                <p className={DS.text.cardSubtitle}>이메일 문의</p>
              </div>
              <p className={`${DS.text.bodyMedium} ${DS.text.brand}`}>support@nplatform.co.kr</p>
              <p className={`${DS.text.captionLight} mt-1`}>24시간 접수 · 영업일 1~2일 내 답변</p>
            </div>
            <div className={`${DS.card.base} ${DS.card.padding}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-lg">🕐</span>
                <p className={DS.text.cardSubtitle}>운영시간</p>
              </div>
              <p className={DS.text.bodyMedium}>평일 오전 9시 — 오후 6시</p>
              <p className={`${DS.text.captionLight} mt-1`}>주말 및 공휴일 제외</p>
            </div>
          </div>
        </section>

        {/* Inquiry Form */}
        <section>
          <p className={`${DS.text.label} mb-6`}>1:1 문의하기</p>
          <div className={`${DS.card.elevated} overflow-hidden`}>
            {submitted ? (
              <div className={DS.empty.wrapper}>
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 text-3xl text-emerald-500">✓</div>
                <p className={DS.text.cardTitle}>문의가 접수되었습니다</p>
                <p className={`${DS.text.caption} mt-2`}>영업일 기준 1~2일 내 답변드리겠습니다.</p>
              </div>
            ) : (
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={DS.input.label}>문의 유형</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className={DS.input.base}
                    >
                      <option value="">유형 선택</option>
                      <option value="account">계정 관련</option>
                      <option value="billing">결제 관련</option>
                      <option value="listings">매물 관련</option>
                      <option value="deals">거래 관련</option>
                      <option value="tech">기술 지원</option>
                      <option value="other">기타</option>
                    </select>
                  </div>
                  <div>
                    <label className={DS.input.label}>제목</label>
                    <input
                      type="text"
                      placeholder="문의 제목을 입력하세요"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className={DS.input.base}
                    />
                  </div>
                </div>
                <div>
                  <label className={DS.input.label}>문의 내용</label>
                  <textarea
                    placeholder="문의 내용을 상세히 입력해 주세요..."
                    rows={5}
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className={`${DS.input.base} resize-none`}
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={!form.category || !form.title || !form.content}
                    className={`${DS.button.primary} disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    문의 접수 →
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
