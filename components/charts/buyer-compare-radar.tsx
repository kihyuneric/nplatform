'use client'

import { memo } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

interface BuyerCompareRadarProps {
  radarMerged: Record<string, unknown>[]
  items: { id: string; title: string }[]
  colors: string[]
}

export const BuyerCompareRadar = memo(function BuyerCompareRadar({ radarMerged, items, colors }: BuyerCompareRadarProps) {
  return (
    <div role="img" aria-label={`매물 비교 레이더 차트 — ${items.map(i => i.title).join(', ')}`}>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={radarMerged}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6B7280' }} />
          {items.map((item, idx) => (
            <Radar
              key={item.id}
              name={item.title.slice(0, 15) + '\u2026'}
              dataKey={`item${idx}`}
              stroke={colors[idx]}
              fill={colors[idx]}
              fillOpacity={0.1}
              strokeWidth={2}
            />
          ))}
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number, name: string) => [`${v}점`, name]} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
})
