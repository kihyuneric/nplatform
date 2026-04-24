"use client"

/**
 * FeeSection — 매도자 매물등록(SELL) 모드 전용.
 * 매각 수수료율(0.3%~0.9%) 입력. 전속 계약 시 하한 0.5% 자동 보정.
 */

import { Briefcase } from "lucide-react"
import type { FeeState } from "../types"

export function FeeSection({
  value,
  onChange,
  exclusive,
}: {
  value: FeeState
  onChange: (patch: Partial<FeeState>) => void
  exclusive: boolean
}) {
  const lowerBound = exclusive ? 0.005 : 0.003
  const upperBound = 0.009
  const pct = Math.round(value.sellerRate * 10000) / 100

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Briefcase className="w-4 h-4 mt-0.5 text-sky-500 shrink-0" />
          <div>
            <h4 className="text-[0.875rem] font-bold text-[var(--color-text-primary)]">
              매각 수수료율 <span className="text-sky-500 ml-1">직접 입력</span>
              {exclusive && (
                <span className="ml-2 px-2 py-0.5 rounded bg-sky-500/20 text-sky-500 text-[0.625rem] font-bold">
                  전속 계약 · 하한 0.5%
                </span>
              )}
            </h4>
            <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
              일반 매물 0.3% ~ 0.9% · 전속 계약 체결 시 하한 0.5% 자동 보정
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[0.625rem] text-[var(--color-text-tertiary)]">현재 설정</div>
          <div className="text-xl font-bold text-sky-500 tabular-nums">{pct.toFixed(2)}%</div>
        </div>
      </div>

      <input
        type="range"
        min={lowerBound * 1000}
        max={upperBound * 1000}
        step={0.5}
        value={value.sellerRate * 1000}
        onChange={(e) => onChange({ sellerRate: Number(e.target.value) / 1000 })}
        className="w-full accent-sky-500"
      />
      <div className="flex justify-between text-[0.625rem] text-[var(--color-text-tertiary)]">
        <span>{(lowerBound * 100).toFixed(1)}%</span>
        <span>0.5%</span>
        <span>0.7%</span>
        <span>{(upperBound * 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}
