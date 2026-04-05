'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, Star, Clock, CheckCircle2 } from 'lucide-react'

const MOCK_REVIEWS = [
  { id: 1, name: '박OO', rating: 5, date: '2026-03-18', content: '친절하고 전문적으로 설명해주셔서 큰 도움이 됐습니다. 복잡한 권리관계도 명확히 정리해주셨어요.' },
  { id: 2, name: '이OO', rating: 5, date: '2026-02-25', content: '빠른 답변과 정확한 분석으로 경매 입찰 전 불안감이 해소됐습니다. 강력 추천합니다.' },
  { id: 3, name: '최OO', rating: 4, date: '2026-01-10', content: '서류 검토 매우 꼼꼼히 해주셨습니다. 다음에도 꼭 이용하겠습니다.' },
]

const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']

export default function ExpertDetailPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'services' | 'reviews'>('profile')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState('')

  const tabs = [
    { key: 'profile', label: '프로필' },
    { key: 'services', label: '서비스' },
    { key: 'reviews', label: '리뷰' },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="bg-[#0D1F38] text-white px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <Link href="/services/experts" className="inline-flex items-center gap-1.5 text-blue-300 hover:text-white text-sm mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> 전문가 목록
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-[#2E75B6] flex items-center justify-center text-3xl font-black text-white shrink-0">
              김
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-black tracking-normal">김재원</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 text-xs font-semibold tracking-normal">법무사</span>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-green-500/20 text-green-300 text-xs font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> 인증 전문가
                </span>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-yellow-400 text-base tracking-normal">★★★★★</span>
                <span className="text-white font-bold text-sm">4.9</span>
                <span className="text-blue-200 text-sm">({128}개 리뷰)</span>
              </div>

              <div className="flex items-center gap-1.5 text-blue-200 text-sm">
                <MapPin className="w-4 h-4" /> 서울 강남구
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2 shrink-0">
              <button className="px-6 py-2.5 rounded-lg bg-[#2E75B6] hover:bg-[#255e99] text-white font-semibold text-sm transition-colors">
                상담 예약
              </button>
              <button className="px-6 py-2.5 rounded-lg border border-white/30 hover:bg-white/10 text-white font-semibold text-sm transition-colors">
                문의하기
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="max-w-5xl mx-auto px-6 -mt-6 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '총 상담', value: '847건' },
            { label: '경력', value: '12년' },
            { label: '평점', value: '4.9' },
            { label: '응답률', value: '98%' },
          ].map((s) => (
            <div key={s.label} className="stat-card text-center">
              <div className="text-2xl font-black text-[#0D1F38] tracking-normal">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1 tracking-normal">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* Left Column */}
          <div>
            {/* Tab Bar */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm mb-5 border border-gray-100">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors tracking-normal ${
                    activeTab === t.key
                      ? 'bg-[#0D1F38] text-white'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <div className="card-interactive">
                  <p className="section-eyebrow">소개</p>
                  <p className="text-gray-700 text-sm leading-relaxed tracking-normal">
                    NPL 채권 관련 소송 전문 법무사로 12년간 부동산 경매 법률 자문을 제공하고 있습니다. 부실채권 매입, 근저당권 실행, 명도소송 등 NPL 투자의 전 과정을 지원합니다. 대한법무사협회 부동산법 분과위원으로 활동 중입니다.
                  </p>
                </div>

                <div className="card-interactive">
                  <p className="section-eyebrow">자격증 / 경력</p>
                  <div className="space-y-3">
                    {[
                      { year: '2014', text: '법무사 자격 취득 (제2014-서울-0421호)' },
                      { year: '2016', text: '김재원 법무사 사무소 개업' },
                      { year: '2019', text: '대한법무사협회 부동산법 분과위원 위촉' },
                      { year: '2022', text: 'NPL 전문 투자 컨설팅 서비스 런칭' },
                    ].map((item) => (
                      <div key={item.year} className="flex gap-4 items-start">
                        <span className="text-xs font-bold text-[#2E75B6] shrink-0 mt-0.5">{item.year}</span>
                        <span className="text-sm text-gray-700 tracking-normal">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-interactive">
                  <p className="section-eyebrow">전문 분야</p>
                  <div className="flex flex-wrap gap-2">
                    {['NPL 채권', '부동산 경매', '명도소송', '권리분석', '근저당 실행', '채권 회수'].map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold tracking-normal border border-blue-100">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Services Tab */}
            {activeTab === 'services' && (
              <div className="space-y-3">
                {[
                  { name: '일반 상담', desc: '부동산 NPL 관련 일반 법률 상담', duration: '30분', price: '₩50,000' },
                  { name: '서류 검토', desc: '계약서, 등기부 등본, 경매 서류 검토 및 분석', duration: '1~2일', price: '₩150,000' },
                  { name: '종합 컨설팅', desc: '매입 전략부터 명도까지 전 과정 종합 자문', duration: '협의', price: '₩300,000' },
                ].map((svc) => (
                  <div key={svc.name} className="card-interactive flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm mb-1 tracking-normal">{svc.name}</h3>
                      <p className="text-gray-500 text-xs tracking-normal">{svc.desc}</p>
                      <div className="flex items-center gap-1 mt-2 text-gray-400 text-xs">
                        <Clock className="w-3 h-3" /> {svc.duration}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-black text-[#2E75B6] tracking-normal">{svc.price}</div>
                      <button className="mt-1 text-xs text-white bg-[#2E75B6] hover:bg-[#255e99] px-3 py-1 rounded-lg transition-colors">
                        선택
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-3">
                {MOCK_REVIEWS.map((r) => (
                  <div key={r.id} className="card-interactive">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {r.name[0]}
                        </div>
                        <span className="text-sm font-semibold text-gray-800 tracking-normal">{r.name}</span>
                      </div>
                      <span className="text-xs text-gray-400">{r.date}</span>
                    </div>
                    <div className="text-yellow-400 text-sm mb-1 tracking-normal">{'★'.repeat(r.rating)}</div>
                    <p className="text-sm text-gray-700 leading-relaxed tracking-normal">{r.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: Booking Widget */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="card-interactive">
              <p className="section-eyebrow">상담 예약</p>

              <div className="mb-4">
                <label className="text-xs font-semibold text-gray-600 block mb-1.5 tracking-normal">날짜 선택</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
                />
              </div>

              <div className="mb-5">
                <label className="text-xs font-semibold text-gray-600 block mb-1.5 tracking-normal">시간 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors tracking-normal ${
                        selectedSlot === slot
                          ? 'bg-[#2E75B6] text-white border-[#2E75B6]'
                          : 'border-gray-200 text-gray-600 hover:border-[#2E75B6] hover:text-[#2E75B6]'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={!selectedDate || !selectedSlot}
                className="w-full py-3 rounded-xl bg-[#2E75B6] hover:bg-[#255e99] disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm tracking-normal transition-colors"
              >
                예약 확정
              </button>

              <p className="text-center text-xs text-gray-400 mt-3 tracking-normal">
                예약 확정 후 카카오톡으로 안내됩니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
