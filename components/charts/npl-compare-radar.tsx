'use client'

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'

interface CompareCase {
  id: string
  case_number: string
}

interface NplCompareRadarProps {
  radarData: Record<string, string | number>[]
  selectedCases: CompareCase[]
  chartColors: string[]
}

export function NplCompareRadar({ radarData, selectedCases, chartColors }: NplCompareRadarProps) {
  return (
    <div className="h-[420px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={radarData} outerRadius="75%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 13, fontWeight: 600, fill: '#374151' }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
          />
          {selectedCases.map((c, idx) => (
            <Radar
              key={c.id}
              name={c.case_number}
              dataKey={c.case_number}
              stroke={chartColors[idx]}
              fill={chartColors[idx]}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={{ r: 4, fill: chartColors[idx] }}
            />
          ))}
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '12px',
            }}
            formatter={(value: number) => [`${value}점`, '']}
          />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            iconType="circle"
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
