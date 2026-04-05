'use client'

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from 'recharts'

// ─── Trend Line Chart ─────────────────────────────────────────

interface TrendItem {
  date: string
  views: number
  interests: number
  inquiries: number
}

export function AnalyticsTrendChart({ data }: { data: TrendItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="views" name="조회수" stroke="#2E75B6" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="interests" name="관심등록" stroke="#10B981" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="inquiries" name="문의" stroke="#F59E0B" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Radar Chart ──────────────────────────────────────────────

interface RadarItem {
  subject: string
  A: number
  fullMark: number
}

export function AnalyticsRadarChart({ data }: { data: RadarItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <RadarChart data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
        <Radar dataKey="A" stroke="#2E75B6" fill="#2E75B6" fillOpacity={0.25} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ─── Region Bar Chart ─────────────────────────────────────────

interface RegionItem {
  region: string
  views: number
  interests: number
  bids: number
}

export function AnalyticsRegionChart({ data }: { data: RegionItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} layout="vertical" barSize={14}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis dataKey="region" type="category" tick={{ fontSize: 12 }} width={40} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="views" name="조회수" fill="#2E75B6" radius={[0, 3, 3, 0]} />
        <Bar dataKey="interests" name="관심등록" fill="#10B981" radius={[0, 3, 3, 0]} />
        <Bar dataKey="bids" name="입찰" fill="#F59E0B" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Discount Response Bar Chart ──────────────────────────────

interface DiscountItem {
  rate: string
  views: number
  interests: number
  bids: number
}

export function AnalyticsDiscountChart({ data }: { data: DiscountItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} barSize={18}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="rate" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="views" name="조회수" fill="#1B3A5C" radius={[3, 3, 0, 0]} />
        <Bar dataKey="interests" name="관심등록" fill="#10B981" radius={[3, 3, 0, 0]} />
        <Bar dataKey="bids" name="입찰" fill="#F59E0B" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
