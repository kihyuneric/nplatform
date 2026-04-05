'use client'

import { memo } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

// ─── Performance Trend Area Chart ─────────────────────────────

interface TrendItem {
  month: string
  invested: number
  returned: number
  cumulative: number
}

export const PortfolioTrendChart = memo(function PortfolioTrendChart({ data }: { data: TrendItem[] }) {
  return (
    <div role="img" aria-label="포트폴리오 수익 추이 차트 — 신규 투자, 회수, 누적 투자액">
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gradInvested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1B3A5C" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1B3A5C" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradReturned" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: '#9CA3AF' }}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value}억원`,
              name === 'invested' ? '신규 투자' : name === 'returned' ? '회수' : '누적 투자',
            ]}
            labelFormatter={(l) => `${l}`}
          />
          <Legend
            formatter={(v) => v === 'invested' ? '신규 투자' : v === 'returned' ? '회수' : '누적 투자'}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Area type="monotone" dataKey="cumulative" stroke="#1B3A5C" fill="url(#gradInvested)" strokeWidth={2} />
          <Area type="monotone" dataKey="returned" stroke="#10B981" fill="url(#gradReturned)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
})

// ─── Composition Pie Chart ────────────────────────────────────

interface CompositionItem {
  name: string
  value: number
  color: string
}

export const PortfolioCompositionChart = memo(function PortfolioCompositionChart({ data }: { data: CompositionItem[] }) {
  const summary = data.map(d => `${d.name} ${d.value}억`).join(', ')
  return (
    <div role="img" aria-label={`포트폴리오 구성 비율 — ${summary}`}>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={70}
            dataKey="value"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => [`${v}억원`, '투자액']} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
})
