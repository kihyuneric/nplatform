'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MessageSquare, DollarSign, Star, CheckCircle, TrendingUp, Play, Pause, BarChart3 } from 'lucide-react'
import DS, { formatKRW } from '@/lib/design-system'

const MOCK_CONSULTATIONS = [
  { id: 'c1', client: '이OO', service: 'NPL 채권 법률 자문',  date: '2026-03-20', status: 'COMPLETED',   amount: 450000 },
  { id: 'c2', client: '박OO', service: '경매 권리분석',        date: '2026-03-19', status: 'IN_PROGRESS', amount: 320000 },
  { id: 'c3', client: '김OO', service: '명도소송 대행',        date: '2026-03-18', status: 'CONFIRMED',   amount: 580000 },
  { id: 'c4', client: '정OO', service: 'NPL 채권 법률 자문',  date: '2026-03-17', status: 'PENDING',     amount: 450000 },
  { id: 'c5', client: '최OO', service: '경매 권리분석',        date: '2026-03-16', status: 'COMPLETED',   amount: 320000 },
]

const MOCK_REVIEWS = [
  { id: 'r1', client: '이OO', rating: 5, comment: '권리분석이 정확하고 설명이 명쾌했습니다. 매우 만족합니다.', date: '2026-03-20' },
  { id: 'r2', client: '최OO', rating: 4, comment: '전문적인 상담 감사합니다. 다음에도 이용하겠습니다.', date: '2026-03-16' },
  { id: 'r3', client: '한OO', rating: 5, comment: '복잡한 사안을 쉽게 설명해주셔서 도움이 많이 됐습니다.', date: '2026-03-12' },
]

const MONTHLY_REVENUE = [
  { month: '10월', value: 1200000 }, { month: '11월', value: 1650000 }, { month: '12월', value: 1980000 },
  { month: '1월',  value: 1750000 }, { month: '2월',  value: 2100000 }, { month: '3월',  value: 2450000 },
]

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  PENDING:     { label: '대기중',  cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  CONFIRMED:   { label: '확정',    cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  IN_PROGRESS: { label: '진행중',  cls: 'bg-indigo-50 text-indigo-700 border border-indigo-200' },
  COMPLETED:   { label: '완료',    cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  CANCELLED:   { label: '취소',    cls: 'bg-red-50 text-red-700 border border-red-200' },
}

const TABS = ['서비스 관리', '상담 현황', '수익 정산', '리뷰'] as const
type Tab = typeof TABS[number]

const maxRevenue = Math.max(...MONTHLY_REVENUE.map(m => m.value))

export default function ProfessionalDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('상담 현황')
  const [serviceOn, setServiceOn] = useState(true)

  const pendingCount = MOCK_CONSULTATIONS.filter(c => c.status === 'PENDING').length

  return (
    <div className={DS.page.wrapper}>

      {/* Header */}
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        <div className={DS.header.wrapper}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            {/* Avatar + identity */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-[var(--color-brand-bright)] flex items-center justify-center text-[1.625rem] font-bold text-[var(--color-brand-mid)]">
                김
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className={DS.text.sectionTitle}>전문가 대시보드</h1>
                </div>
                <p className={DS.text.bodyBold}>김법무 전문가</p>
                <div className="flex gap-2 mt-1.5">
                  {['법무사', '경매 권리분석', '명도소송'].map(b => (
                    <span key={b} className="text-[0.6875rem] px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[var(--color-brand-mid)] font-bold">{b}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* KPI strip */}
            <div className="flex flex-wrap gap-4 text-center">
              {[
                { label: '상담 건수', value: '48건' },
                { label: '평점',     value: '4.9★' },
                { label: '이번달 수익', value: '₩2.4M' },
                { label: '대기 상담', value: `${pendingCount}건`, urgent: true },
              ].map(k => (
                <div key={k.label} className={DS.stat.card}>
                  <p className={`${DS.stat.value} ${k.urgent ? '!text-amber-600' : ''}`}>{k.value}</p>
                  <p className={DS.stat.sub}>{k.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={DS.page.container + " py-6 " + DS.page.sectionGap}>

        {/* Stats strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: '총 상담',    value: '48건',    icon: MessageSquare, color: 'text-[var(--color-brand-mid)]',  border: 'border-l-[var(--color-brand-mid)]' },
            { label: '완료',       value: '45건',    icon: CheckCircle,   color: 'text-[var(--color-positive)]', border: 'border-l-emerald-400' },
            { label: '평점',       value: '4.9 / 5', icon: Star,          color: 'text-amber-500',   border: 'border-l-amber-400' },
            { label: '이번달 수익', value: '₩2.45M', icon: DollarSign,   color: 'text-violet-600',  border: 'border-l-violet-400' },
          ].map(s => (
            <div key={s.label} className={DS.stat.card + ` border-l-4 ${s.border}`}>
              <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
              <p className={DS.stat.value}>{s.value}</p>
              <p className={DS.stat.sub}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Service toggle */}
        <div className={DS.card.elevated + " " + DS.card.padding + " flex items-center justify-between"}>
          <div>
            <p className={DS.text.cardSubtitle}>서비스 상태</p>
            <p className={DS.text.caption}>고객에게 새 상담 요청을 받을 수 있습니다</p>
          </div>
          <button
            onClick={() => setServiceOn(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[0.8125rem] font-semibold transition-all border ${
              serviceOn
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                : 'bg-[var(--color-surface-sunken)] border-[var(--color-border-default)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-base)]'
            }`}
          >
            {serviceOn ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            {serviceOn ? '운영중' : '일시중지'}
          </button>
        </div>

        {/* Tab bar */}
        <div className={DS.tabs.list}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 ${activeTab === tab ? DS.tabs.active : DS.tabs.trigger}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab: 상담 현황 */}
        {activeTab === '상담 현황' && (
          <div className={DS.card.elevated + " overflow-hidden"}>
            <div className={"px-6 py-4 border-b border-[var(--color-border-subtle)]"}>
              <p className={DS.text.cardTitle}>활성 상담 현황</p>
            </div>
            <div className={DS.table.wrapper + " !rounded-none !border-0"}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {['고객명', '서비스 유형', '요청일', '상태', '금액', '액션'].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MOCK_CONSULTATIONS.map(c => {
                    const st = STATUS_MAP[c.status] ?? STATUS_MAP.PENDING
                    return (
                      <tr key={c.id} className={DS.table.row}>
                        <td className={DS.table.cell + " font-semibold"}>{c.client}</td>
                        <td className={DS.table.cellMuted}>{c.service}</td>
                        <td className={DS.table.cellMuted + " tabular-nums"}>{c.date}</td>
                        <td className={DS.table.cell}>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className={DS.table.cell + " tabular-nums"}>₩{c.amount.toLocaleString()}</td>
                        <td className={DS.table.cell}>
                          <div className="flex gap-2">
                            <button className={DS.button.primary + " " + DS.button.sm}>처리</button>
                            <button className={DS.button.secondary + " " + DS.button.sm}>상세</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab: 수익 정산 */}
        {activeTab === '수익 정산' && (
          <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-4 h-4 text-[var(--color-brand-mid)]" />
              <p className={DS.text.cardTitle}>월별 수익</p>
            </div>
            <div className="flex items-end gap-3 h-40">
              {MONTHLY_REVENUE.map(m => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className={DS.text.micro + " tabular-nums"}>{(m.value / 10000).toFixed(0)}만</span>
                  <div
                    className="w-full rounded-t bg-[var(--color-brand-mid)]/70 hover:bg-[var(--color-brand-mid)] transition-colors"
                    style={{ height: `${(m.value / maxRevenue) * 120}px` }}
                  />
                  <span className={DS.text.micro}>{m.month}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: 리뷰 */}
        {activeTab === '리뷰' && (
          <div className="space-y-3">
            {MOCK_REVIEWS.map(r => (
              <div key={r.id} className={DS.card.interactive + " " + DS.card.padding}>
                <div className="flex items-center justify-between mb-2">
                  <span className={DS.text.bodyBold}>{r.client}</span>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-[var(--color-border-default)]'}`} />
                    ))}
                  </div>
                </div>
                <p className={DS.text.body}>{r.comment}</p>
                <p className={DS.text.captionLight + " mt-2"}>{r.date}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab: 서비스 관리 */}
        {activeTab === '서비스 관리' && (
          <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
            <p className={DS.text.cardTitle + " mb-4"}>등록 서비스</p>
            <div className="space-y-3">
              {[
                { name: 'NPL 채권 법률 자문', price: '₩450,000', active: true },
                { name: '경매 권리분석',      price: '₩320,000', active: true },
                { name: '명도소송 대행',      price: '₩580,000', active: false },
              ].map(svc => (
                <div key={svc.name} className={DS.card.interactive + " " + DS.card.paddingCompact + " flex items-center justify-between"}>
                  <div>
                    <p className={DS.text.bodyBold}>{svc.name}</p>
                    <p className={DS.text.captionLight}>{svc.price} / 건</p>
                  </div>
                  <span className={`text-[0.6875rem] px-2 py-0.5 rounded-full font-bold border ${
                    svc.active
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {svc.active ? '운영중' : '비활성'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
