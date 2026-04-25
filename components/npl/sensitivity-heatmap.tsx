'use client'

interface SensitivityHeatmapProps {
  title: string
  xLabel: string
  yLabel: string
  xValues: number[]
  yValues: number[]
  matrix: number[][]
  formatCell?: (v: number) => string
  formatX?: (v: number) => string
  formatY?: (v: number) => string
  thresholds?: { good: number; warn: number }
}

function defaultFormat(v: number) {
  return `${(v * 100).toFixed(1)}%`
}

function formatBillion(v: number) {
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(1)}억`
  return `${v.toLocaleString()}`
}

function getCellColor(value: number, thresholds: { good: number; warn: number }) {
  if (value >= thresholds.good) return { bg: 'bg-stone-100/15', text: 'text-stone-900', border: 'border-stone-300/20' }
  if (value >= thresholds.warn) return { bg: 'bg-stone-100/10', text: 'text-stone-900', border: 'border-stone-300/20' }
  if (value >= 0) return { bg: 'bg-stone-100/10', text: 'text-stone-900', border: 'border-stone-300/20' }
  return { bg: 'bg-stone-100/15', text: 'text-stone-900', border: 'border-stone-300/20' }
}

export function SensitivityHeatmap({
  title,
  xLabel,
  yLabel,
  xValues,
  yValues,
  matrix,
  formatCell = defaultFormat,
  formatX,
  formatY,
  thresholds = { good: 0.20, warn: 0.10 },
}: SensitivityHeatmapProps) {
  const fmtX = formatX || ((v: number) => `${v}%`)
  const fmtY = formatY || ((v: number) => formatBillion(v))

  return (
    <div className="w-full">
      <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-secondary)]">{title}</h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-2 py-2 text-left font-medium text-[var(--color-text-muted)]">
                {yLabel} \ {xLabel}
              </th>
              {xValues.map((x, i) => (
                <th key={i} className="border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-2 py-2 text-center font-medium text-[var(--color-text-secondary)]">
                  {fmtX(x)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {yValues.map((y, rowIdx) => (
              <tr key={rowIdx}>
                <td className="border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-2 py-2 font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                  {fmtY(y)}
                </td>
                {xValues.map((_, colIdx) => {
                  const value = matrix[rowIdx]?.[colIdx] ?? 0
                  const colors = getCellColor(value, thresholds)
                  return (
                    <td
                      key={colIdx}
                      className={`border ${colors.border} ${colors.bg} px-2 py-2 text-center font-mono font-semibold ${colors.text} whitespace-nowrap cursor-default relative group`}
                      title={`${yLabel}: ${fmtY(y)}, ${xLabel}: ${fmtX(xValues[colIdx])} → ${formatCell(value)}`}
                    >
                      {formatCell(value)}
                      <div className="absolute z-10 hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1 w-max max-w-[200px] rounded bg-gray-900 px-2 py-1 text-[10px] text-white shadow-lg">
                        {yLabel}: {fmtY(y)}<br/>{xLabel}: {fmtX(xValues[colIdx])}<br/>결과: {formatCell(value)}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-stone-100/15 border border-stone-300/20" />
          {(thresholds.good * 100).toFixed(0)}%이상 (우수)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-stone-100/10 border border-stone-300/20" />
          {(thresholds.warn * 100).toFixed(0)}~{(thresholds.good * 100).toFixed(0)}% (양호)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-stone-100/10 border border-stone-300/20" />
          0~{(thresholds.warn * 100).toFixed(0)}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-stone-100/15 border border-stone-300/20" />
          손실구간
        </span>
      </div>
    </div>
  )
}
