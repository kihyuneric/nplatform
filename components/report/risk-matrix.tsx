"use client"

import { useState } from "react"
import DS from "@/lib/design-system"

interface RiskMatrixProps {
  risks: {
    name: string
    probability: number
    impact: number
    category: string
  }[]
}

const PROB_LABELS = ["", "매우낮음", "낮음", "보통", "높음", "매우높음"]
const IMPACT_LABELS = ["", "경미", "경미+", "보통", "심각", "치명적"]

function getZoneColor(prob: number, impact: number): string {
  const score = prob + impact
  if (score <= 4) return "rgba(16, 185, 129, 0.15)"
  if (score <= 6) return "rgba(245, 158, 11, 0.15)"
  if (score <= 8) return "rgba(249, 115, 22, 0.2)"
  return "rgba(239, 68, 68, 0.2)"
}

function getZoneBorder(prob: number, impact: number): string {
  const score = prob + impact
  if (score <= 4) return "rgba(16, 185, 129, 0.3)"
  if (score <= 6) return "rgba(245, 158, 11, 0.3)"
  if (score <= 8) return "rgba(249, 115, 22, 0.35)"
  return "rgba(239, 68, 68, 0.35)"
}

function getDotColor(prob: number, impact: number): string {
  const score = prob + impact
  if (score <= 4) return "#10B981"
  if (score <= 6) return "#F59E0B"
  if (score <= 8) return "#F97316"
  return "#EF4444"
}

export default function RiskMatrix({ risks }: RiskMatrixProps) {
  const [hoveredRisk, setHoveredRisk] = useState<string | null>(null)

  // probability on Y (1 bottom, 5 top → render top-to-bottom: 1→5 so CSS grid bottom=5)
  // 아래에서 위로: 낮음(1) → 매우높음(5)
  const rows = [1, 2, 3, 4, 5]
  const cols = [1, 2, 3, 4, 5]

  function risksAt(prob: number, impact: number) {
    return risks.filter((r) => r.probability === prob && r.impact === impact)
  }

  return (
    <div className={`${DS.card.base} ${DS.card.paddingCompact}`}>
      <h3 className={`${DS.text.cardTitle} mb-4`}>
        리스크 매트릭스 (확률 x 영향도)
      </h3>

      <div className="flex items-stretch" style={{ height: 320 }}>
        {/* Y axis label */}
        <div className="flex flex-col justify-center mr-2">
          <span
            className="text-[0.625rem] font-bold text-[var(--color-text-tertiary)] uppercase"
            style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              letterSpacing: 2,
            }}
          >
            확률
          </span>
        </div>

        {/* Y axis ticks */}
        <div className="flex flex-col justify-around mr-2">
          {rows.map((p) => (
            <div
              key={p}
              className="flex items-center justify-end text-[0.6875rem] font-medium text-[var(--color-text-muted)] whitespace-nowrap"
            >
              {PROB_LABELS[p]}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 grid grid-rows-5 grid-cols-5 gap-[2px]">
            {rows.map((prob) =>
              cols.map((impact) => {
                const cellRisks = risksAt(prob, impact)
                return (
                  <div
                    key={`${prob}-${impact}`}
                    className="relative flex flex-wrap items-center justify-center gap-1 rounded-md"
                    style={{
                      backgroundColor: getZoneColor(prob, impact),
                      border: `1px solid ${getZoneBorder(prob, impact)}`,
                    }}
                  >
                    {cellRisks.map((r, i) => (
                      <div
                        key={i}
                        className="relative"
                        onMouseEnter={() => setHoveredRisk(r.name)}
                        onMouseLeave={() => setHoveredRisk(null)}
                      >
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm cursor-pointer transition-transform hover:scale-125"
                          style={{
                            backgroundColor: getDotColor(prob, impact),
                          }}
                        />
                        {hoveredRisk === r.name && (
                          <div
                            className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
                            style={{
                              backgroundColor: "var(--color-surface-elevated)",
                              border: "1px solid var(--color-border-subtle)",
                            }}
                          >
                            <div className="text-[0.6875rem] font-semibold text-[var(--color-text-primary)]">
                              {r.name}
                            </div>
                            <div className="text-[0.625rem] text-[var(--color-text-muted)]">
                              {r.category}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })
            )}
          </div>

          {/* X axis ticks */}
          <div className="grid grid-cols-5 mt-1">
            {cols.map((impact) => (
              <div
                key={impact}
                className="text-center text-[0.625rem] font-medium text-[var(--color-text-muted)]"
              >
                {IMPACT_LABELS[impact]}
              </div>
            ))}
          </div>

          {/* X axis label */}
          <div className="text-center mt-1">
            <span className="text-[0.625rem] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">
              영향도
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
        {[
          { label: "낮음", color: "#10B981" },
          { label: "중간", color: "#F59E0B" },
          { label: "높음", color: "#F97316" },
          { label: "치명적", color: "#EF4444" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: l.color }}
            />
            <span className="text-[0.6875rem] text-[var(--color-text-muted)]">
              {l.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
