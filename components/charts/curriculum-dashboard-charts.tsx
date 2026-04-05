'use client'

import { memo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts'

// ─── Radar Chart ──────────────────────────────────────────────

interface RadarItem {
  domain: string
  concepts: number
  coverage: number
}

export const CurriculumRadarChart = memo(function CurriculumRadarChart({ data }: { data: RadarItem[] }) {
  return (
    <div role="img" aria-label="커리큘럼 도메인별 개념 수 및 커버리지 레이더 차트">
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="domain" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          <Radar name="개념 수" dataKey="concepts" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
          <Radar name="커버리지%" dataKey="coverage" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
})

// ─── Level Bar Chart ──────────────────────────────────────────

interface LevelItem {
  level: string
  covered: number
  uncovered: number
}

export const CurriculumLevelChart = memo(function CurriculumLevelChart({ data }: { data: LevelItem[] }) {
  return (
    <div role="img" aria-label="커리큘럼 레벨별 커버 현황 막대 차트">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="level" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="covered" name="커버됨" stackId="a" fill="#8B5CF6" />
          <Bar dataKey="uncovered" name="미커버" stackId="a" fill="#E5E7EB" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
})

// ─── Pie Chart ────────────────────────────────────────────────

interface PieItem {
  name: string
  value: number
  color: string
}

export const CurriculumPieChart = memo(function CurriculumPieChart({ data }: { data: PieItem[] }) {
  if (data.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
        분석된 영상이 없습니다
      </div>
    )
  }
  const summary = data.map(d => `${d.name} ${d.value}건`).join(', ')
  return (
    <div role="img" aria-label={`커리큘럼 유형 분포 — ${summary}`}>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
})
