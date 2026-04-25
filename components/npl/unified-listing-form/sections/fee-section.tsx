"use client"

/**
 * FeeSection — 매도자 매물등록(SELL) 모드 전용.
 *
 * 매각 수수료율 입력 + NPLatform 전속 계약 토글 (Phase G6+ 정책 업데이트).
 *   · 전속 OFF (일반) : 0.5% ~ 0.9% 범위에서 자유 설정
 *   · 전속 ON         : 0.3% 혜택 자동 적용 (+ 조선일보 땅집고 기사 지원)
 *
 * Phase G5 (최초):
 *   · NPLatform 전속 계약 토글을 InstitutionSection → FeeSection 최상단으로 이동.
 *
 * Phase G6+ (2026-04-24, 수수료 정책 반전):
 *   · 전속 ON 혜택 : 기존 "하한 0.5% 상향" → "0.3% 자동 적용 + 땅집고 기사 지원"
 *   · 일반 매물   : 기존 0.3%~0.9% → 0.5%~0.9%
 *   · 즉 전속 계약이 "할인" 혜택 (부담 축소)으로 재정의됨.
 *   · `institution.exclusive` 데이터 모델은 그대로 유지.
 */

import { Briefcase, Shield } from "lucide-react"
import type { FeeState } from "../types"

// 수수료율 상수 (모듈형 · 번역 영향 없음)
const EXCLUSIVE_RATE = 0.003          // 전속 계약 자동 적용 요율 (0.3%)
const GENERAL_MIN_RATE = 0.005        // 일반 매물 하한 (0.5%)
const RATE_UPPER_BOUND = 0.009        // 공통 상한 (0.9%)

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
  const lowerBound = exclusive ? EXCLUSIVE_RATE : GENERAL_MIN_RATE
  const upperBound = RATE_UPPER_BOUND
  const pct = Math.round(value.sellerRate * 10000) / 100

  // Phase G6+ 정책:
  //   · 전속 ON 전환 → 0.3% 혜택 자동 적용 (기존 rate 와 무관하게 혜택값으로 설정)
  //   · 전속 OFF 전환 → rate 가 일반 하한(0.5%) 미만이면 0.5% 로 자동 상향 보정
  const handleExclusiveChange = (next: boolean) => {
    if (!onExclusiveChange) return
    onExclusiveChange(next)
    if (next) {
      onChange({ sellerRate: EXCLUSIVE_RATE })
    } else if (value.sellerRate < GENERAL_MIN_RATE) {
      onChange({ sellerRate: GENERAL_MIN_RATE })
    }
  }

  return (
    <div className="rounded-xl border border-stone-300/30 bg-stone-100/5 p-5 space-y-4">
      {/* Phase G5 · 전속 토글 최상단 */}
      {onExclusiveChange && (
        <div className="rounded-lg border border-stone-300/25 bg-[var(--color-surface-elevated)] p-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={exclusive}
              onChange={(e) => handleExclusiveChange(e.target.checked)}
              className="mt-0.5 accent-sky-500 w-4 h-4 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <Shield className="w-3.5 h-3.5 text-stone-900" />
                <span className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
                  NPLatform 전속 계약 체결
                </span>
                {exclusive && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-stone-100/20 text-stone-900 dark:text-stone-900 text-[0.625rem] font-bold">
                    ON · 수수료 0.3% 자동 적용
                  </span>
                )}
              </div>
              <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] leading-relaxed">
                전속 계약 체결 시 본 매물은 NPLatform 에서만 거래되며,
                <strong className="text-stone-900 dark:text-stone-900"> 조선일보 땅집고 기사 지원</strong> 및
                <strong className="text-stone-900 dark:text-stone-900"> 수수료는 0.3% 로 조정</strong>됩니다.
                일반 매물은 {(GENERAL_MIN_RATE * 100).toFixed(1)}% ~ {(RATE_UPPER_BOUND * 100).toFixed(1)}% 범위에서 자유롭게 설정 가능합니다.
              </p>
            </div>
          </label>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Briefcase className="w-4 h-4 mt-0.5 text-stone-900 shrink-0" />
          <div>
            <h4 className="text-[0.875rem] font-bold text-[var(--color-text-primary)]">
              매각 수수료율 <span className="text-stone-900 ml-1">직접 입력</span>
              {exclusive && (
                <span className="ml-2 px-2 py-0.5 rounded bg-stone-100/20 text-stone-900 text-[0.625rem] font-bold">
                  전속 계약 · {(EXCLUSIVE_RATE * 100).toFixed(1)}% 적용
                </span>
              )}
            </h4>
            <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
              일반 매물 {(GENERAL_MIN_RATE * 100).toFixed(1)}% ~ {(RATE_UPPER_BOUND * 100).toFixed(1)}%
              · 전속 계약 체결 시 하한 {(EXCLUSIVE_RATE * 100).toFixed(1)}% 자동 보정
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[0.625rem] text-[var(--color-text-tertiary)]">현재 설정</div>
          <div className="text-xl font-bold text-stone-900 tabular-nums">{pct.toFixed(2)}%</div>
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
        {exclusive
          ? <span>0.5%</span>
          : <span>0.7%</span>}
        <span>{exclusive ? "0.7%" : "0.8%"}</span>
        <span>{(upperBound * 100).toFixed(1)}%</span>
      </div>
    </div>
  )
}
