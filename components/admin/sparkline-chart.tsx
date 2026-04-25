"use client"

import { memo, useMemo } from "react"

interface SparklineChartProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  /** If true, auto-detect trend and color accordingly */
  autoColor?: boolean
}

export const SparklineChart = memo(function SparklineChart({
  data,
  width = 80,
  height = 30,
  color,
  autoColor = true,
}: SparklineChartProps) {
  const { path, fillPath, strokeColor } = useMemo(() => {
    if (!data || data.length < 2) {
      return { path: "", fillPath: "", strokeColor: color ?? "#051C2C" }
    }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const padding = 2
    const chartWidth = width - padding * 2
    const chartHeight = height - padding * 2

    const points = data.map((val, i) => ({
      x: padding + (i / (data.length - 1)) * chartWidth,
      y: padding + chartHeight - ((val - min) / range) * chartHeight,
    }))

    // Determine trend: compare average of last third vs first third
    const third = Math.max(1, Math.floor(data.length / 3))
    const firstAvg = data.slice(0, third).reduce((a, b) => a + b, 0) / third
    const lastAvg = data.slice(-third).reduce((a, b) => a + b, 0) / third

    let detectedColor = color ?? "#051C2C"
    if (autoColor && !color) {
      if (lastAvg > firstAvg * 1.05) {
        detectedColor = "#051C2C" // green - improving
      } else if (lastAvg < firstAvg * 0.95) {
        detectedColor = "#A53F8A" // red - degrading
      } else {
        detectedColor = "#051C2C" // yellow - stable
      }
    }

    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ")

    const fill =
      linePath +
      ` L ${points[points.length - 1].x.toFixed(1)} ${height - padding}` +
      ` L ${points[0].x.toFixed(1)} ${height - padding} Z`

    return { path: linePath, fillPath: fill, strokeColor: detectedColor }
  }, [data, width, height, color, autoColor])

  if (!data || data.length < 2) {
    return (
      <svg width={width} height={height} className="inline-block">
        <text x={width / 2} y={height / 2} textAnchor="middle" fontSize={10} fill="#9CA3AF">
          --
        </text>
      </svg>
    )
  }

  return (
    <svg width={width} height={height} className="inline-block">
      <path d={fillPath} fill={strokeColor} fillOpacity={0.15} />
      <path d={path} fill="none" stroke={strokeColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
})
