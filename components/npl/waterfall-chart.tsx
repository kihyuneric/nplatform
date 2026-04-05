'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, LabelList } from 'recharts'

interface WaterfallItem {
  name: string
  value: number
  type: 'total' | 'deduction' | 'distribution' | 'remainder'
}

interface WaterfallChartProps {
  salePrice: number
  auctionCost: number
  propertyTax: number
  smallTenantPriority: number
  wageClaim: number
  distributions: Array<{
    right_holder: string
    distribution_amount: number
    recovery_rate: number
    classification: string
  }>
}

function formatBillion(v: number) {
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(1)}억`
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}만`
  return `${v.toLocaleString()}`
}

export function WaterfallChart({ salePrice, auctionCost, propertyTax, smallTenantPriority, wageClaim, distributions }: WaterfallChartProps) {
  const items: WaterfallItem[] = []
  let running = salePrice

  items.push({ name: '낙찰가', value: salePrice, type: 'total' })

  if (auctionCost > 0) {
    items.push({ name: '경매비용', value: -auctionCost, type: 'deduction' })
    running -= auctionCost
  }
  if (propertyTax > 0) {
    items.push({ name: '당해세', value: -propertyTax, type: 'deduction' })
    running -= propertyTax
  }
  if (smallTenantPriority > 0) {
    items.push({ name: '소액임차인', value: -smallTenantPriority, type: 'deduction' })
    running -= smallTenantPriority
  }
  if (wageClaim > 0) {
    items.push({ name: '임금채권', value: -wageClaim, type: 'deduction' })
    running -= wageClaim
  }

  for (const d of distributions) {
    if (d.distribution_amount > 0) {
      const label = d.right_holder.length > 6 ? d.right_holder.slice(0, 6) + '...' : d.right_holder
      items.push({
        name: `${label} (${(d.recovery_rate * 100).toFixed(0)}%)`,
        value: -d.distribution_amount,
        type: 'distribution',
      })
      running -= d.distribution_amount
    }
  }

  if (running > 0) {
    items.push({ name: '잔여금', value: running, type: 'remainder' })
  }

  // Calculate waterfall data for stacked bar chart
  const chartData = []
  let cumulative = 0

  for (const item of items) {
    if (item.type === 'total') {
      chartData.push({
        name: item.name,
        invisible: 0,
        value: item.value,
        displayValue: item.value,
      })
      cumulative = item.value
    } else {
      const absValue = Math.abs(item.value)
      cumulative += item.value
      chartData.push({
        name: item.name,
        invisible: Math.max(0, cumulative),
        value: absValue,
        displayValue: item.value,
      })
    }
  }

  const colorMap: Record<string, string> = {
    total: '#1B3A5C',
    deduction: '#ef4444',
    distribution: '#3b82f6',
    remainder: '#22c55e',
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11 }}
            angle={-35}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tickFormatter={v => formatBillion(v)}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'invisible') return [null, null]
              return [formatBillion(value), '금액']
            }}
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Bar dataKey="invisible" stackId="a" fill="transparent" />
          <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, idx) => (
              <Cell
                key={idx}
                fill={colorMap[items[idx]?.type] || '#94a3b8'}
              />
            ))}
            <LabelList
              dataKey="displayValue"
              position="top"
              formatter={(v: number) => formatBillion(Math.abs(v))}
              style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded" style={{ background: '#1B3A5C' }} />낙찰가</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-red-500" />비용공제</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-blue-500" />채권배당</span>
        <span className="flex items-center gap-1"><span className="inline-block h-3 w-3 rounded bg-green-500" />잔여금</span>
      </div>
    </div>
  )
}
