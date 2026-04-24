"use client"

/**
 * FeeSection — 매도자 매물등록(SELL) 모드 전용.
 *
 * 매각 수수료율(0.3%~0.9%) 입력 + 전속 계약 토글 (Phase G5 이전).
 *   · 전속 ON  : 하한 0.5% 자동 보정
 *   · 전속 OFF : 하한 0.3%
 *
 * Phase G5 변경:
 *   · NPLatform 전속 계약 토글을 InstitutionSection → FeeSection 최상단으로 이동.
 *   · 수수료 범위에 직접적인 영향이므로 UX·정보 위계 정합.
 *   · `institution.exclusive` 데이터 모델은 그대로 유지 (상태 머신 변경 없음).
 */

import { Briefcase, Shield } from "lucide-react"
import type { FeeState } from "../types"

export function FeeSection({
  value,
  onChange,
  exclusive,
  onExclusiveChange,
}: {
  value: FeeState
  onChange: (patch: Partial<FeeState>) => void
  /** 현재 전속 계약 여부 (institution.exclusive 와 동기화) */
  exclusive: boolean
  /**
   * Phase G5 · 전속 토글을 FeeSection 내부에서 변경 가능.
   * 미지정 시 읽기 전용 (상위에서 InstitutionSection 등 다른 곳에서 관리).
   */
  onExclusiveChange?: (next: boolean) => void
}) {
  const lowerBound = exclusive ? 0.005 : 0.003
  const upperBound = 0.009
  const pct = Math.round(value.sellerRate * 10000) / 100

  // 전속 ON 으로 전환 시 수수료가 하한 아래면 0.5% 로 보정
  const handleExclusiveChange = (next: boolean) => {
    if (!onExclusiveChange) return
    onExclusiveChange(next)
    if (next && value.sellerRate < 0.005) {
      onChange({ sellerRate: 0.005 })
    }
  }

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-5 space-y-4">
      {/* Phase G5 · 전속 토글 최상단 */}
      {onExclusiveChange && (
        <div className="rounded-lg border border-sky-500/25 bg-[var(--color-surface-elevated)] p-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={exclusive}
              onChange={(e) => handleExclusiveChange(e.target.checked)}
              className="mt-0.5 accent-sky-500 w-4 h-4 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <Shield className="w-3.5 h-3.5 text-sky-500" />
                <span className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
                  NPLatform 전속 계약 체결
                </span>
                {exclusive && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300 text-[0.625rem] font-bold">
                    ON · 하한 0.5% 자동 보정
                  </span>
                )}
              </div>
              <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] leading-relaxed">
                전속 계약 체결 시 본 매물은 NPLatform 에서만 거래되며, 수수료 하한이 0.5% 로 상향됩니다.
                일반 매물은 0.3% ~ 0.9% 범위에서 자유롭게 설정 가능합니다.
              </p>
            </div>
          </label>
        </div>
      )}

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
