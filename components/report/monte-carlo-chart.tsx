"use client"

import DS from "@/lib/design-system"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts"

interface MonteCarloChartProps {
  histogram: {
    binStart: number
    binEnd: number
    count: number
    frequency: number
  }[]
  statistics: { mean: number; median: number; stdDev: number }
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number }
  probabilities: { positive: number; above10: number; loss: number }
}

// 단위: due-diligence report에서 bin/statistics/percentiles = 금액(원), frequency/probabilities = 0~1 분수.
function toEok(v: number): string {
  const safe = isFinite(v) ? v : 0
  return (safe / 100000000).toFixed(1)
}

function formatBin(start: number, end: number): string {
  return `${toEok(start)}~${toEok(end)}`
}

export default function MonteCarloChart({
  histogram,
  statistics,
  percentiles,
  probabilities,
}: MonteCarloChartProps) {
  // frequency는 0~1 분수이므로 × 100 으로 %로 변환 후 표시
  const data = histogram.map((bin) => ({
    name: formatBin(bin.binStart, bin.binEnd),
    frequency: +(Math.max(0, Math.min(1, isFinite(bin.frequency) ? bin.frequency : 0)) * 100).toFixed(2),
    binMid: (bin.binStart + bin.binEnd) / 2,
  }))

  const p5Label = formatBin(
    histogram.find((b) => b.binStart <= percentiles.p5 && b.binEnd > percentiles.p5)?.binStart ?? percentiles.p5,
    histogram.find((b) => b.binStart <= percentiles.p5 && b.binEnd > percentiles.p5)?.binEnd ?? percentiles.p5
  )
  const p95Label = formatBin(
    histogram.find((b) => b.binStart <= percentiles.p95 && b.binEnd > percentiles.p95)?.binStart ?? percentiles.p95,
    histogram.find((b) => b.binStart <= percentiles.p95 && b.binEnd > percentiles.p95)?.binEnd ?? percentiles.p95
  )

  const meanLabel = formatBin(
    histogram.find((b) => b.binStart <= statistics.mean && b.binEnd > statistics.mean)?.binStart ?? statistics.mean,
    histogram.find((b) => b.binStart <= statistics.mean && b.binEnd > statistics.mean)?.binEnd ?? statistics.mean
  )
  const medianLabel = formatBin(
    histogram.find((b) => b.binStart <= statistics.median && b.binEnd > statistics.median)?.binStart ?? statistics.median,
    histogram.find((b) => b.binStart <= statistics.median && b.binEnd > statistics.median)?.binEnd ?? statistics.median
  )

  // probabilities.loss는 0~1 분수. NaN/Infinity/범위 이탈 방어 후 × 100으로 %.
  const rawLoss = isFinite(probabilities.loss) ? probabilities.loss : 0
  const lossPct = Math.max(0, Math.min(100, rawLoss * 100))

  const stats = [
    {
      label: "평균",
      value: `${toEok(statistics.mean)}억`,
      color: "var(--color-brand-mid)",
    },
    {
      label: "중앙값",
      value: `${toEok(statistics.median)}억`,
      color: "var(--color-positive)",
    },
    {
      label: "95% VaR",
      value: `${toEok(percentiles.p5)}억`,
      color: "var(--color-warning)",
    },
    {
      label: "손실확률",
      value: `${lossPct.toFixed(1)}%`,
      color: "var(--color-negative)",
    },
  ]

  return (
    <div className={`${DS.card.base} ${DS.card.paddingCompact}`}>
      <h3 className={`${DS.text.cardTitle} mb-4`}>
        몬테카를로 시뮬레이션 (10,000회)
      </h3>

      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border-subtle)"
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
              tickFormatter={(v) => `${v}%`}
              width={45}
            />
            <Tooltip
              formatter={(value: number) => [`${value}%`, "빈도"]}
              contentStyle={{
                backgroundColor: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            {p5Label && p95Label && (
              <ReferenceArea
                x1={p5Label}
                x2={p95Label}
                fill="var(--color-brand-mid)"
                fillOpacity={0.08}
                label={{
                  value: "90% 신뢰구간",
                  position: "insideTopRight",
                  fontSize: 10,
                  fill: "var(--color-text-muted)",
                }}
              />
            )}
            <ReferenceLine
              x={meanLabel}
              stroke="var(--color-brand-dark)"
              strokeDasharray="6 3"
              strokeWidth={2}
              label={{
                value: "평균",
                position: "insideTopLeft",
                fontSize: 11,
                fill: "var(--color-brand-dark)",
                fontWeight: 600,
                offset: 8,
              }}
            />
            <ReferenceLine
              x={medianLabel}
              stroke="var(--color-positive)"
              strokeWidth={2}
              label={{
                value: "중앙값",
                position: "insideTopRight",
                fontSize: 11,
                fill: "var(--color-positive)",
                fontWeight: 600,
                offset: 8,
              }}
            />
            <Bar
              dataKey="frequency"
              fill="var(--color-brand-mid)"
              fillOpacity={0.7}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`${DS.stat.card} text-center`}
          >
            <div className={DS.stat.label}>{s.label}</div>
            <div
              className="text-[1.25rem] font-bold tabular-nums leading-none mt-1"
              style={{ color: s.color }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
