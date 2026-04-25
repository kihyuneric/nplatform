'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface RecommendationRadarProps {
  factors: { subject: string; score: number }[]
}

export function RecommendationRadar({ factors }: RecommendationRadarProps) {
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={factors}>
          <PolarGrid stroke="#E5E7EB" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#6B7280' }} />
          <Radar
            dataKey="score"
            stroke="#051C2C"
            fill="#051C2C"
            fillOpacity={0.2}
          />
          <Tooltip formatter={(v: number) => [`${v}점`, '매칭 점수']} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
