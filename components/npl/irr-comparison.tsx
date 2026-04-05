'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList } from 'recharts'

interface IrrComparisonProps {
  scenarios: Array<{
    name: string
    irr: number
    moic?: number
  }>
  benchmarks?: Array<{ value: number; label: string }>
}

export function IrrComparison({ scenarios, benchmarks = [{ value: 0.10, label: '10%' }, { value: 0.15, label: '15%' }] }: IrrComparisonProps) {
  const data = scenarios.map(s => ({
    name: s.name,
    irr: s.irr,
    moic: s.moic,
    displayIrr: `${(s.irr * 100).toFixed(1)}%`,
  }))

  const COLORS = ['#93c5fd', '#3b82f6', '#1B3A5C']

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 60, left: 60, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={v => `${(v * 100).toFixed(0)}%`}
            tick={{ fontSize: 11 }}
            domain={[0, 'auto']}
          />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
          <Tooltip
            formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'IRR']}
            labelStyle={{ fontWeight: 'bold' }}
          />
          {benchmarks.map((b, i) => (
            <ReferenceLine
              key={i}
              x={b.value}
              stroke="#f97316"
              strokeDasharray="5 5"
              label={{ value: b.label, position: 'top', fontSize: 10, fill: '#f97316' }}
            />
          ))}
          <Bar dataKey="irr" radius={[0, 4, 4, 0]} barSize={30}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
            <LabelList
              dataKey="displayIrr"
              position="right"
              style={{ fontSize: 12, fontWeight: 'bold', fill: '#374151' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {scenarios.some(s => s.moic) && (
        <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
          {scenarios.map((s, i) => (
            <span key={i}>{s.name} MOIC: {s.moic?.toFixed(2)}x</span>
          ))}
        </div>
      )}
    </div>
  )
}
