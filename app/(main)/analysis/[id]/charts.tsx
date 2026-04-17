'use client'

/**
 * Analysis page chart components — isolated so they can be dynamically imported.
 *
 * Consumers should use `next/dynamic` with `ssr: false` when importing from this
 * file to keep recharts out of the initial SSR/client bundles until the charts
 * actually mount.
 */

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

interface RoiScenario {
  bid_rate_pct: number
  roi_pct: number
}

interface PriceBar {
  name: string
  value: number
  fill: string
}

interface TrendPoint {
  month: string
  rate: number
}

const fmt = (v: number | undefined | null) => {
  if (v == null || v === 0) return '-'
  if (Math.abs(v) >= 1_0000_0000) return `${(v / 1_0000_0000).toFixed(1)}억`
  if (Math.abs(v) >= 1_0000) return `${(v / 1_0000).toFixed(0)}만`
  return v.toLocaleString()
}

const fmtWon = (v: number | undefined | null) => {
  if (v == null) return '-'
  return v.toLocaleString() + '원'
}

export function RoiScenarioChart({ data }: { data: RoiScenario[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 10, right: 50, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8EDF3" />
        <XAxis type="number" tickFormatter={(v: number) => `${v}%`} fontSize={11} stroke="#9DAAB8" />
        <YAxis type="category" dataKey="bid_rate_pct" tickFormatter={(v: number) => `${v}%`} width={40} fontSize={11} stroke="#9DAAB8" />
        <Tooltip
          formatter={(value: number) => [`${value.toFixed(1)}%`, 'ROI']}
          contentStyle={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', fontSize: 13, backgroundColor: 'var(--color-surface-elevated)' }}
        />
        <Bar dataKey="roi_pct" radius={[0, 8, 8, 0]} barSize={28}>
          {data.map((sc, i) => (
            <Cell key={i} fill={sc.roi_pct >= 30 ? '#10B981' : sc.roi_pct >= 10 ? '#F59E0B' : '#EF4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PriceComparisonChart({ data }: { data: PriceBar[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8EDF3" />
        <XAxis type="number" tickFormatter={(v: number) => fmt(v)} fontSize={11} stroke="#9DAAB8" />
        <YAxis type="category" dataKey="name" width={60} fontSize={11} stroke="#9DAAB8" />
        <Tooltip
          formatter={(value: number) => [fmtWon(value), '금액']}
          contentStyle={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'var(--color-surface-elevated)' }}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={26}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BidRateTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: -10 }}>
        <defs>
          <linearGradient id="bidRateGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1B3A5C" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#1B3A5C" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8EDF3" />
        <XAxis dataKey="month" fontSize={10} tickFormatter={(v: string) => v.slice(5)} stroke="#9DAAB8" />
        <YAxis domain={['dataMin - 3', 'dataMax + 3']} fontSize={10} tickFormatter={(v: number) => `${v}%`} stroke="#9DAAB8" />
        <Tooltip
          formatter={(value: number) => [`${value}%`, '낙찰가율']}
          contentStyle={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', backgroundColor: 'var(--color-surface-elevated)' }}
        />
        <Area
          type="monotone"
          dataKey="rate"
          stroke="#1B3A5C"
          strokeWidth={2.5}
          fill="url(#bidRateGrad)"
          dot={{ r: 3, fill: '#1B3A5C' }}
          activeDot={{ r: 5, fill: '#0D1F38' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
