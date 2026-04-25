"use client"

import DS from "@/lib/design-system"

interface SensitivityHeatmapProps {
  discountRates: number[]
  capRates: number[]
  npvGrid: number[][]
  currentNpv?: number
}

function toEok(value: number): string {
  return (value / 100000000).toFixed(1)
}

function getCellColor(value: number, min: number, max: number): string {
  if (value < 0) return "rgba(27,27,31, 0.7)"
  const ratio = max === min ? 0.5 : (value - min) / (max - min)
  if (ratio > 0.66) return `rgba(20,22,26, ${0.3 + ratio * 0.5})`
  if (ratio > 0.33) return `rgba(20,22,26, ${0.3 + ratio * 0.4})`
  return `rgba(27,27,31, ${0.2 + (1 - ratio) * 0.3})`
}

export default function SensitivityHeatmap({
  discountRates,
  capRates,
  npvGrid,
  currentNpv,
}: SensitivityHeatmapProps) {
  const allValues = npvGrid.flat()
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)

  return (
    <div className={`${DS.card.base} ${DS.card.paddingCompact}`}>
      <h3 className={`${DS.text.cardTitle} mb-4`}>
        민감도 분석 (NPV 매트릭스)
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: 420 }}>
          <thead>
            <tr>
              <th
                className="px-2 py-2 text-[0.6875rem] font-bold text-[var(--color-text-tertiary)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-center"
                rowSpan={2}
              >
                할인율 \<br />Cap Rate →
              </th>
              {capRates.map((cr) => (
                <th
                  key={cr}
                  className="px-2 py-2 text-[0.6875rem] font-bold text-[var(--color-text-tertiary)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-center"
                >
                  {(cr * 100).toFixed(1)}%
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {discountRates.map((dr, ri) => (
              <tr key={dr}>
                <td className="px-2 py-2 text-[0.75rem] font-semibold text-[var(--color-text-secondary)] bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-center whitespace-nowrap">
                  {(dr * 100).toFixed(1)}%
                </td>
                {capRates.map((_, ci) => {
                  const val = npvGrid[ri]?.[ci] ?? 0
                  const isCurrentCell =
                    currentNpv !== undefined &&
                    Math.abs(val - currentNpv) < 1000
                  return (
                    <td
                      key={ci}
                      className="px-2 py-2 text-center border border-[var(--color-border-subtle)]"
                      style={{
                        backgroundColor: getCellColor(val, min, max),
                        ...(isCurrentCell
                          ? {
                              outline: "3px solid var(--color-brand-mid)",
                              outlineOffset: "-2px",
                              fontWeight: 800,
                            }
                          : {}),
                      }}
                    >
                      <span
                        className={`text-[0.75rem] tabular-nums font-semibold ${
                          val < 0
                            ? "text-white"
                            : "text-[var(--color-text-primary)]"
                        }`}
                      >
                        {toEok(val)}억
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`${DS.text.captionLight} mt-2`}>
        * 단위: 억원 | 현재 시나리오는 파란 테두리로 표시
      </p>
    </div>
  )
}
