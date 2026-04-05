'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Heart, Gavel, CheckCircle2, TrendingUp, Package } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import DS, { formatKRW } from '@/lib/design-system'

const STATS = [
  { label: '등록 매물', value: 12, icon: Package, color: 'text-[var(--color-brand-mid)]' },
  { label: '관심 수신', value: 38, icon: Heart, color: 'text-pink-600' },
  { label: '오퍼 받은 수', value: 7, icon: Gavel, color: 'text-amber-600' },
  { label: '완료 거래', value: 8, icon: CheckCircle2, color: 'text-[var(--color-positive)]' },
]
const LISTINGS = [
  { id: 'L001', name: '서울 강남구 역삼동 오피스 NPL', claim: '32억', grade: 'A+', status: '공개중', interests: 34, date: '2025-02-10' },
  { id: 'L002', name: '부산 해운대 아파트 경매 NPL', claim: '18.5억', grade: 'A', status: '진행중', interests: 67, date: '2025-01-22' },
  { id: 'L003', name: '경기 성남 상가 NPL 포트폴리오', claim: '56억', grade: 'B+', status: '공개중', interests: 21, date: '2025-03-01' },
  { id: 'L004', name: '대구 수성구 오피스텔 NPL', claim: '9.8억', grade: 'B', status: '초안', interests: 0, date: '2025-03-15' },
  { id: 'L005', name: '인천 연수구 공장 담보 채권', claim: '42억', grade: 'A', status: '완료', interests: 98, date: '2024-11-15' },
]
const CHART = [
  { month: '10월', views: 1200, interests: 45 }, { month: '11월', views: 1580, interests: 62 },
  { month: '12월', views: 2100, interests: 89 }, { month: '1월', views: 1750, interests: 71 },
  { month: '2월', views: 2340, interests: 104 }, { month: '3월', views: 2890, interests: 132 },
]
const VISITORS = [
  { label: '오늘 방문자', value: '142명' }, { label: '주간 방문자', value: '891명' },
  { label: '월간 방문자', value: '3,204명' }, { label: '평균 체류시간', value: '4분 12초' },
]
const STATUS_CLR: Record<string, string> = {
  '공개중': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  '진행중': 'bg-blue-50 text-blue-700 border border-blue-200',
  '초안': 'bg-slate-50 text-slate-500 border border-slate-200',
  '완료': 'bg-violet-50 text-violet-700 border border-violet-200',
}
const GRADE_CLR: Record<string, string> = {
  'A+': 'text-emerald-600 font-bold', 'A': 'text-blue-600 font-bold',
  'B+': 'text-amber-600 font-bold', 'B': 'text-orange-600 font-bold',
}
const TABS = [
  { id: 'listings', label: '매물 관리' }, { id: 'analytics', label: '분석' },
  { id: 'billing', label: '정산 관리' }, { id: 'settings', label: '설정' },
]

export default function SellerDashboardPage() {
  const [tab, setTab] = useState('listings')
  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        <div className={DS.header.wrapper}>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className={DS.header.eyebrow}>마이페이지</p>
              <h1 className={DS.header.title}>매도자 대시보드</h1>
              <p className={DS.header.subtitle}>(주)한국자산신탁AMC · Gold Seller</p>
            </div>
            <div className="flex flex-wrap gap-4">
              {[['등록 매물', '12건', ''], ['진행중', '3건', '!text-[var(--color-brand-mid)]'], ['완료', '8건', '!text-[var(--color-positive)]'], ['이번달 정산', '₩12.4M', '!text-amber-600']].map(([lbl, val, cls]) => (
                <div key={lbl} className="text-center">
                  <div className={DS.text.caption}>{lbl}</div>
                  <div className={DS.text.metricMedium + " " + cls}>{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={DS.page.container + " py-6 " + DS.page.sectionGap}>
        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className={DS.stat.card}>
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <div className={DS.stat.value}>{s.value}</div>
              <div className={DS.stat.sub}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab Bar */}
        <div className={DS.tabs.list}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 ${tab === t.id ? DS.tabs.active : DS.tabs.trigger}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Listings Tab */}
        {tab === 'listings' && (
          <div className={DS.card.elevated + " " + DS.card.padding}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={DS.text.cardTitle}>등록 매물 현황</h2>
              <Link href="/exchange/sell">
                <button className={DS.button.accent + " " + DS.button.sm}>
                  <Plus className="h-3.5 w-3.5" />새 매물 등록
                </button>
              </Link>
            </div>
            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    <th className={DS.table.headerCell}>매물명</th>
                    <th className={DS.table.headerCell}>채권액</th>
                    <th className={DS.table.headerCell}>AI등급</th>
                    <th className={DS.table.headerCell}>상태</th>
                    <th className={DS.table.headerCell}>관심수</th>
                    <th className={DS.table.headerCell}>등록일</th>
                    <th className={DS.table.headerCell}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {LISTINGS.map((l) => (
                    <tr key={l.id} className={DS.table.row}>
                      <td className={DS.table.cell}><span className="font-medium">{l.name}</span><span className={"block text-[0.6875rem] text-[var(--color-text-muted)]"}>{l.id}</span></td>
                      <td className={DS.table.cell + " font-semibold tabular-nums"}>{l.claim}</td>
                      <td className={DS.table.cell + " " + (GRADE_CLR[l.grade] ?? 'text-[var(--color-text-tertiary)]')}>{l.grade}</td>
                      <td className={DS.table.cell}><span className={`text-[0.6875rem] px-2 py-0.5 rounded-full font-bold ${STATUS_CLR[l.status] ?? 'bg-slate-50 text-slate-500 border border-slate-200'}`}>{l.status}</span></td>
                      <td className={DS.table.cell + " tabular-nums"}><span className="flex items-center gap-1"><Heart className="h-3 w-3 text-pink-500" />{l.interests}</span></td>
                      <td className={DS.table.cellMuted + " tabular-nums"}>{l.date}</td>
                      <td className={DS.table.cell}>
                        <div className="flex items-center gap-1.5">
                          <button className={DS.text.link + " text-[0.8125rem]"}>상세</button>
                          <span className="text-[var(--color-border-default)]">|</span>
                          <button className={DS.text.caption + " hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"}>수정</button>
                          <span className="text-[var(--color-border-default)]">|</span>
                          <button className="text-[0.8125rem] text-[var(--color-danger)] hover:text-red-700 transition-colors cursor-pointer">종료</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {tab === 'analytics' && (
          <div className={DS.page.sectionGap}>
            <div className={DS.card.elevated + " " + DS.card.paddingLarge}>
              <h2 className={DS.text.cardTitle + " mb-4"}>매물별 조회수 / 관심수</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={CHART} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--color-text-tertiary)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'var(--color-text-tertiary)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, color: 'var(--color-text-primary)' }} />
                  <Bar dataKey="views" fill="var(--color-brand-mid)" radius={[4, 4, 0, 0]} name="조회수" />
                  <Bar dataKey="interests" fill="#ec4899" radius={[4, 4, 0, 0]} name="관심수" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {VISITORS.map((v) => (
                <div key={v.label} className={DS.stat.card}>
                  <div className={DS.stat.value}>{v.value}</div>
                  <div className={DS.stat.sub}>{v.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'billing' && <div className={DS.card.elevated + " " + DS.card.padding + " flex items-center justify-center h-40"}><p className={DS.text.body}>정산 내역을 불러오는 중...</p></div>}
        {tab === 'settings' && <div className={DS.card.elevated + " " + DS.card.padding + " flex items-center justify-center h-40"}><p className={DS.text.body}>설정 기능은 준비 중입니다.</p></div>}
      </div>
    </div>
  )
}
