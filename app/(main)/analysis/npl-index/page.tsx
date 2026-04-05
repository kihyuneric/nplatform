'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  ArrowLeft,
  Info,
  Crown,
  MapPin,
  Activity,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react'
import DS from '@/lib/design-system'

// ── Mock deterministic data ──────────────────────────────────────────────────

const weeklyNbiData = [
  { week: '1주차', date: '01.06~01.12', nbi: 72.3, volume: 134, avgRate: 71.8 },
  { week: '2주차', date: '01.13~01.19', nbi: 73.1, volume: 148, avgRate: 72.4 },
  { week: '3주차', date: '01.20~01.26', nbi: 71.8, volume: 127, avgRate: 71.2 },
  { week: '4주차', date: '01.27~02.02', nbi: 74.5, volume: 156, avgRate: 73.9 },
  { week: '5주차', date: '02.03~02.09', nbi: 75.2, volume: 162, avgRate: 74.6 },
  { week: '6주차', date: '02.10~02.16', nbi: 74.8, volume: 145, avgRate: 74.1 },
  { week: '7주차', date: '02.17~02.23', nbi: 76.1, volume: 171, avgRate: 75.5 },
  { week: '8주차', date: '02.24~03.02', nbi: 75.6, volume: 158, avgRate: 75.0 },
  { week: '9주차', date: '03.03~03.09', nbi: 77.3, volume: 183, avgRate: 76.7 },
  { week: '10주차', date: '03.10~03.16', nbi: 76.9, volume: 175, avgRate: 76.2 },
  { week: '11주차', date: '03.17~03.23', nbi: 78.2, volume: 191, avgRate: 77.6 },
  { week: '12주차', date: '03.24~03.30', nbi: 79.1, volume: 198, avgRate: 78.4 },
]

interface RegionData {
  name: string
  rate: number
  change: number
  count: number
}

const regionData: RegionData[] = [
  { name: '서울', rate: 82.4, change: 1.2, count: 47 },
  { name: '경기', rate: 78.6, change: 0.8, count: 63 },
  { name: '인천', rate: 75.3, change: -0.4, count: 28 },
  { name: '부산', rate: 76.8, change: 1.5, count: 31 },
  { name: '대구', rate: 74.2, change: -0.7, count: 22 },
  { name: '대전', rate: 73.5, change: 0.3, count: 18 },
  { name: '광주', rate: 71.9, change: -1.1, count: 14 },
  { name: '울산', rate: 72.6, change: 0.6, count: 12 },
  { name: '세종', rate: 77.1, change: 2.1, count: 8 },
  { name: '강원', rate: 68.4, change: -0.9, count: 16 },
  { name: '충북', rate: 70.2, change: 0.4, count: 15 },
  { name: '충남', rate: 71.8, change: 0.2, count: 19 },
  { name: '전북', rate: 67.5, change: -1.3, count: 13 },
  { name: '전남', rate: 66.8, change: -0.6, count: 11 },
  { name: '경북', rate: 69.7, change: 0.1, count: 17 },
  { name: '경남', rate: 72.1, change: 0.9, count: 21 },
  { name: '제주', rate: 74.9, change: 1.8, count: 9 },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRateColor(rate: number): string {
  if (rate >= 80) return 'text-red-600'
  if (rate >= 75) return 'text-orange-600'
  if (rate >= 70) return 'text-amber-600'
  return 'text-blue-600'
}

function getHeatBg(rate: number): string {
  if (rate >= 80) return 'bg-red-50'
  if (rate >= 75) return 'bg-orange-50'
  if (rate >= 70) return 'bg-amber-50'
  return 'bg-blue-50'
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NplIndexPage() {
  const [showMethodology, setShowMethodology] = useState(false)
  const [sortKey, setSortKey] = useState<'rate' | 'change' | 'count'>('rate')
  const [sortAsc, setSortAsc] = useState(false)

  const currentWeek = weeklyNbiData[weeklyNbiData.length - 1]
  const previousWeek = weeklyNbiData[weeklyNbiData.length - 2]
  const nbiChange = +(currentWeek.nbi - previousWeek.nbi).toFixed(1)

  const avgRate =
    +(weeklyNbiData.reduce((s, w) => s + w.avgRate, 0) / weeklyNbiData.length).toFixed(1)

  const sortedRegions = [...regionData].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey]
    return sortAsc ? diff : -diff
  })

  function handleSort(key: 'rate' | 'change' | 'count') {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const SortIcon = ({ field }: { field: 'rate' | 'change' | 'count' }) =>
    sortKey === field ? (
      sortAsc ? (
        <ChevronUp className="inline h-3.5 w-3.5 ml-0.5" />
      ) : (
        <ChevronDown className="inline h-3.5 w-3.5 ml-0.5" />
      )
    ) : null

  return (
    <div className={DS.page.wrapper}>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border-subtle)]">
        <div className={`${DS.page.container} py-12 sm:py-16`}>
          <Link
            href="/analysis"
            className={`inline-flex items-center gap-1.5 ${DS.text.link} text-[0.8125rem] mb-6`}
          >
            <ArrowLeft className="h-4 w-4" />
            분석 도구
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200">
                  <Activity className="h-5 w-5 text-emerald-600" />
                </div>
                <h1 className={DS.text.pageTitle}>
                  NPL 낙찰가율 지수 (NBI)
                </h1>
              </div>
              <p className={`${DS.text.body} max-w-2xl`}>
                전국 NPL 경매 낙찰가율을 주간 단위로 추적하여 시장 과열·냉각 상태를
                한눈에 파악할 수 있는 종합 지표입니다.
              </p>
            </div>

            <button className={DS.button.secondary + " shrink-0"}>
              <Download className="h-4 w-4" />
              리포트 다운로드
            </button>
          </div>
        </div>
      </section>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <section className={`${DS.page.container} -mt-6 relative z-10`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 금주 NBI */}
          <div className={`${DS.stat.card}`}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-[var(--color-brand-dark)]" />
              <span className={DS.stat.label}>금주 NBI</span>
            </div>
            <p className={`${DS.text.metricLarge} text-[var(--color-brand-dark)]`}>
              {currentWeek.nbi}
            </p>
            <p className={`${DS.stat.sub}`}>{currentWeek.date}</p>
          </div>

          {/* 전주 대비 변동 */}
          <div className={`${DS.stat.card}`}>
            <div className="flex items-center gap-2 mb-2">
              {nbiChange >= 0 ? (
                <TrendingUp className="h-4 w-4 text-[var(--color-positive)]" />
              ) : (
                <TrendingDown className="h-4 w-4 text-[var(--color-danger)]" />
              )}
              <span className={DS.stat.label}>전주 대비 변동</span>
            </div>
            <p
              className={`${DS.text.metricLarge} ${
                nbiChange >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-danger)]'
              }`}
            >
              {nbiChange >= 0 ? '+' : ''}
              {nbiChange}
            </p>
            <p className={`${DS.stat.sub}`}>
              {nbiChange >= 0 ? '상승 추세' : '하락 추세'}
            </p>
          </div>

          {/* 평균 낙찰가율 */}
          <div className={`${DS.stat.card}`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-[var(--color-brand-mid)]" />
              <span className={DS.stat.label}>평균 낙찰가율</span>
            </div>
            <p className={`${DS.text.metricLarge} text-[var(--color-brand-mid)]`}>{avgRate}%</p>
            <p className={`${DS.stat.sub}`}>12주 평균</p>
          </div>

          {/* 데이터 기간 */}
          <div className={`${DS.stat.card}`}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <span className={DS.stat.label}>데이터 기간</span>
            </div>
            <p className={DS.text.metricLarge}>12주</p>
            <p className={`${DS.stat.sub}`}>
              {weeklyNbiData[0].date} ~ {currentWeek.date}
            </p>
          </div>
        </div>
      </section>

      {/* ── NBI Trend Chart ───────────────────────────────────────────────── */}
      <section className={`${DS.page.container} mt-8`}>
        <div className={`${DS.card.base} ${DS.card.paddingLarge}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <h2 className={DS.text.sectionTitle}>
              주간 NBI 추이
            </h2>
            <span className={DS.text.captionLight}>
              최근 12주 | 매주 월요일 업데이트
            </span>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyNbiData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[65, 85]}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#1f2937',
                    fontSize: '13px',
                  }}
                  labelStyle={{ color: '#6b7280', marginBottom: 4 }}
                  formatter={(value: number, name: string) => {
                    const label = name === 'nbi' ? 'NBI' : '평균 낙찰가율'
                    return [`${value}`, label]
                  }}
                />
                <Legend
                  formatter={(value) =>
                    value === 'nbi' ? 'NBI 지수' : '평균 낙찰가율'
                  }
                />
                <Line
                  type="monotone"
                  dataKey="nbi"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgRate"
                  stroke="#2E75B6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: '#2E75B6', stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Volume Bar Chart ──────────────────────────────────────────────── */}
      <section className={`${DS.page.container} mt-8`}>
        <div className={`${DS.card.base} ${DS.card.paddingLarge}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <h2 className={DS.text.sectionTitle}>
              주간 거래량 추이
            </h2>
            <span className={DS.text.captionLight}>낙찰 건수 기준</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyNbiData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#1f2937',
                    fontSize: '13px',
                  }}
                  formatter={(value: number) => [`${value}건`, '낙찰 건수']}
                />
                <Bar dataKey="volume" fill="#2E75B6" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ── Regional Heatmap Table ────────────────────────────────────────── */}
      <section className={`${DS.page.container} mt-8`}>
        <div className={`${DS.card.base} ${DS.card.paddingLarge}`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-[var(--color-brand-dark)]" />
              <h2 className={DS.text.sectionTitle}>
                지역별 낙찰가율 현황
              </h2>
            </div>
            <div className={`flex items-center gap-3 ${DS.text.captionLight}`}>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                80% 이상
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                75~80%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                70~75%
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                70% 미만
              </span>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-[0.8125rem]">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)]">
                  <th className={`text-left py-3 px-4 ${DS.text.label}`}>
                    지역
                  </th>
                  <th
                    className={`text-right py-3 px-4 ${DS.text.label} cursor-pointer select-none hover:text-[var(--color-text-primary)]`}
                    onClick={() => handleSort('rate')}
                  >
                    낙찰가율
                    <SortIcon field="rate" />
                  </th>
                  <th
                    className={`text-right py-3 px-4 ${DS.text.label} cursor-pointer select-none hover:text-[var(--color-text-primary)]`}
                    onClick={() => handleSort('change')}
                  >
                    전주 대비
                    <SortIcon field="change" />
                  </th>
                  <th
                    className={`text-right py-3 px-4 ${DS.text.label} cursor-pointer select-none hover:text-[var(--color-text-primary)]`}
                    onClick={() => handleSort('count')}
                  >
                    매물 수
                    <SortIcon field="count" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRegions.map((r) => (
                  <tr
                    key={r.name}
                    className={`border-b border-[var(--color-border-subtle)] ${getHeatBg(r.rate)} transition-colors`}
                  >
                    <td className="py-3 px-4 font-medium text-[var(--color-text-primary)]">
                      {r.name}
                    </td>
                    <td className={`py-3 px-4 text-right font-semibold ${getRateColor(r.rate)}`}>
                      {r.rate}%
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 font-medium ${
                          r.change >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-danger)]'
                        }`}
                      >
                        {r.change >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5" />
                        )}
                        {r.change >= 0 ? '+' : ''}
                        {r.change}%p
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--color-text-secondary)]">
                      {r.count}건
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden space-y-3">
            {sortedRegions.map((r) => (
              <div
                key={r.name}
                className={`rounded-lg p-4 ${getHeatBg(r.rate)} border border-[var(--color-border-subtle)]`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-[var(--color-text-primary)]">{r.name}</span>
                  <span className={`text-[1.1875rem] font-bold ${getRateColor(r.rate)}`}>{r.rate}%</span>
                </div>
                <div className={`flex items-center justify-between ${DS.text.caption}`}>
                  <span
                    className={`flex items-center gap-0.5 ${
                      r.change >= 0 ? 'text-[var(--color-positive)]' : 'text-[var(--color-danger)]'
                    }`}
                  >
                    {r.change >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {r.change >= 0 ? '+' : ''}
                    {r.change}%p
                  </span>
                  <span>매물 {r.count}건</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology ───────────────────────────────────────────────────── */}
      <section className={`${DS.page.container} mt-8`}>
        <div className={DS.card.base}>
          <button
            className="w-full flex items-center justify-between p-6 text-left"
            onClick={() => setShowMethodology(!showMethodology)}
          >
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-[var(--color-brand-mid)]" />
              <h2 className={DS.text.sectionTitle}>
                NBI 산출 방법론
              </h2>
            </div>
            {showMethodology ? (
              <ChevronUp className="h-5 w-5 text-[var(--color-text-muted)]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[var(--color-text-muted)]" />
            )}
          </button>

          {showMethodology && (
            <div className={`px-6 pb-6 -mt-2 space-y-4 ${DS.text.body} leading-relaxed`}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-[var(--color-surface-sunken)] p-4">
                  <h3 className={`${DS.text.cardSubtitle} mb-2`}>
                    1. 데이터 수집
                  </h3>
                  <p>
                    전국 법원 경매 낙찰 데이터를 주간 단위로 수집합니다. NPL 채권이
                    담보로 설정된 부동산 경매 건만 필터링하여 순수 NPL 관련 낙찰
                    데이터를 확보합니다.
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-sunken)] p-4">
                  <h3 className={`${DS.text.cardSubtitle} mb-2`}>
                    2. 낙찰가율 산정
                  </h3>
                  <p>
                    개별 물건의 낙찰가율은 (낙찰가 / 감정가) x 100으로 계산됩니다.
                    이상치(outlier)를 제거하기 위해 상·하위 5%를 trim한 후
                    가중평균을 적용합니다.
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-sunken)] p-4">
                  <h3 className={`${DS.text.cardSubtitle} mb-2`}>
                    3. NBI 지수 산출
                  </h3>
                  <p>
                    지역별 거래량 가중치를 적용하여 전국 단위 NBI 종합 지수를
                    산출합니다. 기준 시점(2024년 1월 1주차)의 NBI를 70.0으로
                    설정하고 변동분을 반영합니다.
                  </p>
                </div>
                <div className="rounded-lg bg-[var(--color-surface-sunken)] p-4">
                  <h3 className={`${DS.text.cardSubtitle} mb-2`}>
                    4. 해석 가이드
                  </h3>
                  <p>
                    NBI 75 이상은 시장 과열 구간, 65~75는 정상 구간, 65 미만은 매수
                    우위 구간으로 판단합니다. 전주 대비 2%p 이상 변동 시 급변
                    신호로 분류됩니다.
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--color-brand-mid)]/30 bg-[var(--color-brand-mid)]/5 p-4">
                <p className="text-[0.75rem] text-[var(--color-brand-mid)]">
                  <strong>참고:</strong> NBI는 NPLatform이 자체 개발한 지표로, 투자
                  판단의 참고 자료로만 활용하시기 바랍니다. 실제 투자 결정 시에는
                  개별 물건의 권리 분석, 현장 실사 등을 반드시 병행하시기 바랍니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── PRO Upgrade Banner ────────────────────────────────────────────── */}
      <section className={`${DS.page.container} mt-8 pb-16`}>
        <div className={`${DS.card.dark} relative overflow-hidden p-8 sm:p-10`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[#10B981] blur-[80px]" />
          </div>

          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-400/20 border border-yellow-400/30 shrink-0">
                <Crown className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-[1.1875rem] font-bold text-white mb-1">
                  PRO 요금제로 업그레이드
                </h3>
                <p className="text-white/70 text-[0.8125rem] leading-relaxed max-w-lg">
                  실시간 NBI 알림, 지역별 세부 분석, 과거 52주 데이터 열람, 맞춤형
                  리포트 다운로드 등 프리미엄 기능을 이용하세요.
                </p>
              </div>
            </div>

            <Link
              href="/pricing"
              className={DS.button.accent + " shrink-0 shadow-lg"}
            >
              <Crown className="h-4 w-4" />
              PRO 시작하기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
