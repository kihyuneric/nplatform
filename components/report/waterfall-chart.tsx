"use client"

import DS from "@/lib/design-system"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface WaterfallChartProps {
  yearlyFlows: { year: number; noi: number; pv: number }[]
  npv: number
  irr: number
}

function toEok(v: number): string {
  return (v / 100000000).toFixed(2)
}

export default function WaterfallChart({
  yearlyFlows,
  npv,
  irr,
}: WaterfallChartProps) {
  let cumulativePv = 0
  const data = yearlyFlows.map((f) => {
    cumulativePv += f.pv
    return {
      name: `${f.year}년`,
      noi: +(f.noi / 100000000).toFixed(2),
      cumulativePv: +(cumulativePv / 100000000).toFixed(2),
    }
  })

  // 투자회수기간 계산
  let paybackYear: number | null = null
  let runningPv = 0
  for (const f of yearlyFlows) {
    runningPv += f.pv
    if (runningPv >= 0 && paybackYear === null) {
      paybackYear = f.year
    }
  }

  const metrics = [
    {
      label: "NPV",
      value: `${toEok(npv)}억원`,
      color: npv >= 0 ? "var(--color-positive)" : "var(--color-negative)",
    },
    {
      label: "IRR",
      value: `${(irr * 100).toFixed(2)}%`,
      color: irr >= 0.08 ? "var(--color-positive)" : "var(--color-warning)",
    },
    {
      label: "투자회수기간",
      value: paybackYear ? `${paybackYear}년` : "미회수",
      color: paybackYear && paybackYear <= 5 ? "var(--color-positive)" : "var(--color-warning)",
    },
  ]

  return (
    <div className={`${DS.card.base} ${DS.card.paddingCompact}`}>
      <h3 className={`${DS.text.cardTitle} mb-4`}>
        DCF 캐시플로 분석
      </h3>

      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-subtle)"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              tickFormatter={(v) => `${v}억`}
              width={55}
              label={{
                value: "NOI (억원)",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 10, fill: "var(--color-text-muted)" },
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              tickFormatter={(v) => `${v}억`}
              width={55}
              label={{
                value: "누적 PV (억원)",
                angle: 90,
                position: "insideRight",
                style: { fontSize: 10, fill: "var(--color-text-muted)" },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: number, name: string) => [
                `${value}억원`,
                name === "noi" ? "NOI" : "누적 PV",
              ]}
            />
            <Legend
              formatter={(value) =>
                value === "noi" ? "연간 NOI" : "누적 현재가치"
              }
              wrapperStyle={{ fontSize: 12 }}
            />
            <Bar
              yAxisId="left"
              dataKey="noi"
              fill="var(--color-positive)"
              fillOpacity={0.8}
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePv"
              stroke="var(--color-brand-mid)"
              strokeWidth={2.5}
              dot={{
                r: 4,
                fill: "var(--color-brand-mid)",
                stroke: "white",
                strokeWidth: 2,
              }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {metrics.map((m) => (
          <div key={m.label} className={`${DS.stat.card} text-center`}>
            <div className={DS.stat.label}>{m.label}</div>
            <div
              className="text-[1.25rem] font-bold tabular-nums leading-none mt-1"
              style={{ color: m.color }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
