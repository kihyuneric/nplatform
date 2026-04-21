"use client"

/**
 * 매물 등록 · 특수조건 Picker
 *
 * 채권자가 매물 등록 시 체크박스로 경매 특수조건을 선택.
 * 선택된 항목은 리포트 생성 시 낙찰가율 감점 및 AI 리스크 프롬프트에 반영됨.
 *
 * 사용처:
 *   · 매물 등록 폼 (/listings/new or 채권자 등록 플로우)
 *   · NPL 분석 입력 폼
 *
 * Usage:
 *   <SpecialConditionsPicker value={conditions} onChange={setConditions} />
 */

import { AlertTriangle, Info } from "lucide-react"
import type { SpecialConditions } from "@/lib/npl/unified-report/types"
import {
  SPECIAL_CONDITION_LABEL,
  SPECIAL_CONDITION_PENALTY,
} from "@/lib/npl/unified-report/types"

export const EMPTY_SPECIAL_CONDITIONS: SpecialConditions = {
  lienRight: false,
  statutorySuperficies: false,
  sharedAuction: false,
  seniorTenant: false,
  illegalBuilding: false,
  graveYardRight: false,
  farmlandRestriction: false,
}

const HELPER_TEXT: Record<keyof typeof SPECIAL_CONDITION_LABEL, string> = {
  lienRight: '제3자가 담보물에 유치권을 행사 중 · 유치권자 변제 없이 명도 제한',
  statutorySuperficies: '토지·건물 소유자 분리로 법정지상권 성립 · 건물 철거 불가',
  sharedAuction: '공유지분만 매각 대상 · 우선매수권·분할청구 고려',
  seniorTenant: '대항력 있는 선순위 임차인 존재 · 보증금 인수 가능성',
  illegalBuilding: '건축물대장상 위반건축물 등재 · 강제이행금·양성화 비용',
  graveYardRight: '분묘기지권 인정 가능 토지 · 개장 제약',
  farmlandRestriction: '농지법상 영농목적 증명 필요 · 취득자격 제한',
}

interface Props {
  value: SpecialConditions
  onChange: (v: SpecialConditions) => void
  disabled?: boolean
}

export default function SpecialConditionsPicker({ value, onChange, disabled }: Props) {
  const keys = Object.keys(SPECIAL_CONDITION_LABEL) as (keyof typeof SPECIAL_CONDITION_LABEL)[]

  const selected = keys.filter(k => value[k])
  const totalPenalty = selected.reduce((s, k) => s + SPECIAL_CONDITION_PENALTY[k], 0)

  function toggle(key: keyof typeof SPECIAL_CONDITION_LABEL) {
    if (disabled) return
    onChange({ ...value, [key]: !value[key] })
  }

  return (
    <div className="rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">
            경매 특수조건
          </h4>
          <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">
            체크한 항목은 AI 리스크 등급과 낙찰가율 예측에 자동 반영됩니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {keys.map(k => {
          const checked = value[k]
          const penalty = SPECIAL_CONDITION_PENALTY[k]
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              disabled={disabled}
              className={`text-left rounded-lg px-3 py-2.5 border transition-colors ${
                checked
                  ? "bg-amber-500/10 border-amber-500/40"
                  : "bg-[var(--color-surface-base)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-strong)]"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex w-4 h-4 items-center justify-center rounded border ${
                      checked
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "bg-transparent border-[var(--color-border-strong)]"
                    }`}
                  >
                    {checked && (
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4l2.8 2.8 6.8-6.8a1 1 0 0 1 1.4 0z"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="text-[0.8125rem] font-semibold text-[var(--color-text-primary)]">
                    {SPECIAL_CONDITION_LABEL[k]}
                  </span>
                </span>
                <span className={`text-[0.625rem] font-bold tabular-nums ${checked ? "text-amber-700" : "text-[var(--color-text-tertiary)]"}`}>
                  {penalty}%p
                </span>
              </div>
              <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] leading-relaxed pl-5.5">
                {HELPER_TEXT[k]}
              </p>
            </button>
          )
        })}
      </div>

      {/* 요약 바 */}
      <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
        <div className="text-[0.6875rem] text-[var(--color-text-secondary)] flex items-center gap-1.5">
          <Info className="w-3 h-3 text-[var(--color-text-tertiary)]" />
          선택된 특수조건: <b className="text-[var(--color-text-primary)]">{selected.length}개</b>
        </div>
        <div className="text-[0.6875rem]">
          낙찰가율 예상 감점: <span className="font-bold tabular-nums text-amber-700">{totalPenalty}%p</span>
        </div>
      </div>
    </div>
  )
}
