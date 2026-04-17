'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, MapPin, Star, Clock, CheckCircle2 } from 'lucide-react'

type Review = { id: number; name: string; rating: number; date: string; content: string }

const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']

export default function ExpertDetailPage() {
  const params = useParams()
  const expertId = params?.id as string
  const [activeTab, setActiveTab] = useState<'profile' | 'services' | 'reviews'>('profile')
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [reviews, setReviews] = useState<Review[]>([])

  useEffect(() => {
    if (!expertId) return
    const load = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('expert_reviews')
          .select('id, reviewer_name, rating, created_at, content')
          .eq('expert_id', expertId)
          .order('created_at', { ascending: false })
          .limit(20)
        if (data?.length) {
          setReviews(data.map((r: any, i: number) => ({
            id: r.id ?? i,
            name: r.reviewer_name ?? '익명',
            rating: r.rating ?? 5,
            date: String(r.created_at ?? '').slice(0, 10),
            content: r.content ?? '',
          })))
        }
      } catch { /* stays empty */ }
    }
    load()
  }, [expertId])

  const tabs = [
    { key: 'profile', label: '프로필' },
    { key: 'services', label: '서비스' },
    { key: 'reviews', label: '리뷰' },
  ] as const

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)]">
      {/* Hero Header */}
      <div className="bg-[var(--color-brand-deep)] text-white px-6 py-10">
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
              <div className="text-2xl font-black text-[var(--color-brand-deep)] tracking-normal">{s.value}</div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-1 tracking-normal">{s.label}</div>
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
            <div className="flex gap-1 bg-[var(--color-surface-elevated)] rounded-xl p-1 shadow-sm mb-5 border border-[var(--color-border-subtle)]">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors tracking-normal ${
                    activeTab === t.key
                      ? 'bg-[var(--color-brand-deep)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
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
                  <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed tracking-normal">
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
                        <span className="text-sm text-[var(--color-text-secondary)] tracking-normal">{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-interactive">
                  <p className="section-eyebrow">전문 분야</p>
                  <div className="flex flex-wrap gap-2">
                    {['NPL 채권', '부동산 경매', '명도소송', '권리분석', '근저당 실행', '채권 회수'].map((tag) => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold tracking-normal border border-blue-500/20">
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
                      <h3 className="font-bold text-[var(--color-text-primary)] text-sm mb-1 tracking-normal">{svc.name}</h3>
                      <p className="text-[var(--color-text-secondary)] text-xs tracking-normal">{svc.desc}</p>
                      <div className="flex items-center gap-1 mt-2 text-[var(--color-text-muted)] text-xs">
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
                {reviews.length === 0 && (
                  <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">아직 리뷰가 없습니다.</div>
                )}
                {reviews.map((r) => (
                  <div key={r.id} className="card-interactive">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--color-surface-sunken)] flex items-center justify-center text-xs font-bold text-[var(--color-text-secondary)]">
                          {r.name[0]}
                        </div>
                        <span className="text-sm font-semibold text-[var(--color-text-primary)] tracking-normal">{r.name}</span>
                      </div>
                      <span className="text-xs text-[var(--color-text-muted)]">{r.date}</span>
                    </div>
                    <div className="text-yellow-400 text-sm mb-1 tracking-normal">{'★'.repeat(r.rating)}</div>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed tracking-normal">{r.content}</p>
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
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 tracking-normal">날짜 선택</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-sm bg-[var(--color-surface-base)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[#2E75B6]"
                />
              </div>

              <div className="mb-5">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] block mb-1.5 tracking-normal">시간 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS.map((slot) => (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`py-1.5 rounded-lg text-xs font-semibold border transition-colors tracking-normal ${
                        selectedSlot === slot
                          ? 'bg-[#2E75B6] text-white border-[#2E75B6]'
                          : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[#2E75B6] hover:text-[#2E75B6]'
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

              <p className="text-center text-xs text-[var(--color-text-muted)] mt-3 tracking-normal">
                예약 확정 후 카카오톡으로 안내됩니다
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
