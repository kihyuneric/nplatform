'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'

interface CashflowChartProps {
  cashflows: number[]
  holdingYears: number
}

function formatBillion(v: number) {
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(1)}억`
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}만`
  return `${v.toLocaleString()}`
}

export function CashflowChart({ cashflows, holdingYears }: CashflowChartProps) {
  const data = cashflows.map((cf, idx) => ({
    name: idx === 0 ? 'Year 0' : `Year ${idx}`,
    value: cf,
    isInvestment: idx === 0,
    isExit: idx === holdingYears,
  }))

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={v => formatBillion(v)} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(value: number) => [formatBillion(value), '현금흐름']}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <ReferenceLine y={0} stroke="#666" />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.isInvestment ? '#ef4444' : entry.isExit ? '#14161A' : '#22c55e'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-stone-100" />초기 투자</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-stone-100" />NOI</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-stone-100" />NOI + Exit</span>
      </div>
    </div>
  )
}
