'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface FundingDonutProps {
  equity: number
  pledgeLoan: number
  transferCost: number
  vehicleFee: number
  pledgeInterest: number
  totalInvestment: number
}

function formatBillion(v: number) {
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(2)}억`
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}만`
  return `${v.toLocaleString()}원`
}

const COLORS = ['#1B3A5C', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe']

export function FundingDonut({ equity, pledgeLoan, transferCost, vehicleFee, pledgeInterest, totalInvestment }: FundingDonutProps) {
  const data = [
    { name: '에쿼티', value: equity },
    { name: '질권대출', value: pledgeLoan },
    { name: '이전비용', value: transferCost },
    { name: '비히클사용료', value: vehicleFee },
    { name: '질권이자', value: pledgeInterest },
  ].filter(d => d.value > 0)

  return (
    <div className="w-full">
      <div className="relative">
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatBillion(value)}
              contentStyle={{ fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs text-gray-500">총 투입금</span>
          <span className="text-lg font-bold text-gray-900">{formatBillion(totalInvestment)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-xs text-gray-600">
        {data.map((d, idx) => (
          <span key={idx} className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded" style={{ background: COLORS[idx % COLORS.length] }} />
            {d.name}: {formatBillion(d.value)}
          </span>
        ))}
      </div>
    </div>
  )
}
