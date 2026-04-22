"use client"

/**
 * components/listings/npl-input-blocks.tsx
 *
 * 매물 등록 · NPL 분석 입력 폼 · 딜룸 편집 공용 입력 블록 모음.
 *
 * 모든 필드는 lib/npl/unified-report/types.ts 의 UnifiedReportInput 파생:
 *   · ClaimBreakdown     — 원금 / 미수이자 / 연체시작일 / 정상금리 / 연체금리
 *   · LeaseSummary       — 보증금 / 월세 / 임차인 수
 *   · RightsSummary      — 선순위 총액 / 후순위 총액
 *   · debtorOwnerSame    — 채무자·소유자 동일인 여부
 *   · desiredSaleDiscount— 대출원금 대비 매각 희망가 할인율
 *   · AppraisalAndMarket — 감정가 기준일 / 시세 / 경매개시결정일
 *   · otherNote          — 기타 특이사항 (특수조건 picker에 포함)
 *
 * 각 블록은 제어형(controlled) 컴포넌트 — 상위 상태와 1:1 양방향 바인딩.
 * OCR / 채권자 수기 입력 / 딜룸 편집 모두 동일 UI 사용.
 */

import type {
  ClaimBreakdown,
  LeaseSummary,
  RightsSummary,
} from "@/lib/npl/unified-report/types"
import {
  Wallet,
  Building2,
  Scale,
  UserCheck,
  Percent,
  Landmark,
} from "lucide-react"

/** ─── 공통 유틸 ─────────────────────────────────────────── */
const fmtComma = (n: number): string => (n > 0 ? n.toLocaleString("ko-KR") : "")
const parseComma = (s: string): number => {
  const digits = s.replace(/[^0-9]/g, "")
  return digits ? Number(digits) : 0
}

function NumberInput({
  value,
  onChange,
  placeholder,
  suffix,
  disabled,
}: {
  value: number
  onChange: (n: number) => void
  placeholder?: string
  suffix?: string
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="numeric"
        value={fmtComma(value)}
        onChange={(e) => onChange(parseComma(e.target.value))}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-emerald-500/60 focus:outline-none disabled:opacity-50 tabular-nums"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.6875rem] text-[var(--color-text-tertiary)]">
          {suffix}
        </span>
      )}
    </div>
  )
}

function PercentInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: number // 소수 (0.069 = 6.9%)
  onChange: (v: number) => void
  disabled?: boolean
  placeholder?: string
}) {
  const display = value > 0 ? (value * 100).toFixed(2).replace(/\.?0+$/, "") : ""
  return (
    <div className="relative">
      <input
        type="text"
        inputMode="decimal"
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "")
          const pct = raw === "" ? 0 : parseFloat(raw)
          if (Number.isNaN(pct)) return
          onChange(pct / 100)
        }}
        placeholder={placeholder ?? "0.00"}
        disabled={disabled}
        className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 pr-8 text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-emerald-500/60 focus:outline-none disabled:opacity-50 tabular-nums"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.6875rem] text-[var(--color-text-tertiary)]">
        %
      </span>
    </div>
  )
}

function DateInput({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <input
      type="date"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] focus:border-emerald-500/60 focus:outline-none disabled:opacity-50 [color-scheme:light] dark:[color-scheme:dark]"
    />
  )
}

function BlockHeader({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: React.ReactNode
  title: string
  subtitle?: string
  right?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between mb-3 gap-3">
      <div className="flex items-start gap-2">
        <span className="shrink-0 mt-0.5 text-emerald-500">{icon}</span>
        <div>
          <h4 className="text-[0.8125rem] font-bold text-[var(--color-text-primary)]">{title}</h4>
          {subtitle && (
            <p className="text-[0.6875rem] text-[var(--color-text-tertiary)] mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  )
}

function Field({ label, required, children, hint }: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div>
      <label className="block text-[0.6875rem] font-semibold text-[var(--color-text-secondary)] mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[0.625rem] text-[var(--color-text-tertiary)]">{hint}</p>}
    </div>
  )
}

const BLOCK = "rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] p-4"

/** ─── 1. 채권잔액 브레이크다운 ───────────────────────────── */
export function ClaimBreakdownBlock({
  value,
  onChange,
  disabled,
}: {
  value: ClaimBreakdown
  onChange: (v: ClaimBreakdown) => void
  disabled?: boolean
}) {
  const totalPast = value.principal + value.unpaidInterest

  // 연체이자 실시간 추정 (연체시작일 ~ 오늘) — 참고용
  const today = new Date()
  const startDate = value.delinquencyStartDate ? new Date(value.delinquencyStartDate) : today
  const days = Math.max(0, Math.floor((today.getTime() - startDate.getTime()) / 86400000))
  const accruedOverdue = Math.round((value.principal * value.overdueRate * days) / 365)

  function set<K extends keyof ClaimBreakdown>(k: K, v: ClaimBreakdown[K]) {
    onChange({ ...value, [k]: v })
  }

  return (
    <div className={BLOCK}>
      <BlockHeader
        icon={<Wallet className="w-4 h-4" />}
        title="채권잔액 세부"
        subtitle="원금 + 미수이자 + 연체이자 → 채권잔액 자동 산출 · OCR 지원"
        right={
          <div className="text-right">
            <div className="text-[0.625rem] text-[var(--color-text-tertiary)]">예상 채권잔액</div>
            <div className="text-[0.875rem] font-bold text-emerald-600 dark:text-emerald-300 tabular-nums">
              {(totalPast + accruedOverdue).toLocaleString("ko-KR")}원
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="대출원금" required>
          <NumberInput
            value={value.principal}
            onChange={(n) => set("principal", n)}
            placeholder="0"
            suffix="원"
            disabled={disabled}
          />
        </Field>
        <Field label="미수이자 (정상이자 누적)">
          <NumberInput
            value={value.unpaidInterest}
            onChange={(n) => set("unpaidInterest", n)}
            placeholder="0"
            suffix="원"
            disabled={disabled}
          />
        </Field>
        <Field label="연체시작일" required>
          <DateInput
            value={value.delinquencyStartDate}
            onChange={(v) => set("delinquencyStartDate", v)}
            disabled={disabled}
          />
        </Field>
        <Field label="정상금리 (연이율)">
          <PercentInput
            value={value.normalRate}
            onChange={(v) => set("normalRate", v)}
            disabled={disabled}
            placeholder="6.90"
          />
        </Field>
        <Field label="연체금리 (연이율)" required hint={days > 0 ? `연체 ${days}일 경과 · 추정 연체이자 ${accruedOverdue.toLocaleString("ko-KR")}원` : undefined}>
          <PercentInput
            value={value.overdueRate}
            onChange={(v) => set("overdueRate", v)}
            disabled={disabled}
            placeholder="16.00"
          />
        </Field>
      </div>
    </div>
  )
}

/** ─── 2. 임대차 현황 ─────────────────────────────────────── */
export function LeaseSummaryBlock({
  value,
  onChange,
  disabled,
}: {
  value: LeaseSummary
  onChange: (v: LeaseSummary) => void
  disabled?: boolean
}) {
  function set<K extends keyof LeaseSummary>(k: K, v: LeaseSummary[K]) {
    onChange({ ...value, [k]: v })
  }

  return (
    <div className={BLOCK}>
      <BlockHeader
        icon={<Building2 className="w-4 h-4" />}
        title="임대차 현황"
        subtitle="임차인 수 / 보증금·월세 합계 (개별 임차인 분석은 별도 현장조사)"
      />
      <div className="grid grid-cols-3 gap-3">
        <Field label="임차인 수">
          <NumberInput
            value={value.tenantCount}
            onChange={(n) => set("tenantCount", n)}
            placeholder="0"
            suffix="명"
            disabled={disabled}
          />
        </Field>
        <Field label="보증금 합계">
          <NumberInput
            value={value.totalDeposit}
            onChange={(n) => set("totalDeposit", n)}
            placeholder="0"
            suffix="원"
            disabled={disabled}
          />
        </Field>
        <Field label="월세 합계">
          <NumberInput
            value={value.totalMonthlyRent}
            onChange={(n) => set("totalMonthlyRent", n)}
            placeholder="0"
            suffix="원"
            disabled={disabled}
          />
        </Field>
      </div>
    </div>
  )
}

/** ─── 3. 권리관계 요약 (선순위/후순위 총액) ───────────────── */
export function RightsSummaryBlock({
  value,
  onChange,
  disabled,
}: {
  value: RightsSummary
  onChange: (v: RightsSummary) => void
  disabled?: boolean
}) {
  function set<K extends keyof RightsSummary>(k: K, v: RightsSummary[K]) {
    onChange({ ...value, [k]: v })
  }

  return (
    <div className={BLOCK}>
      <BlockHeader
        icon={<Scale className="w-4 h-4" />}
        title="권리관계 요약"
        subtitle="낙찰자 인수/배당 구분된 권리 총액 (등기부 원본 별도 업로드)"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="선순위 권리 총액" hint="낙찰자 인수 가능성 · 배당순위 상위">
          <NumberInput
            value={value.seniorTotal}
            onChange={(n) => set("seniorTotal", n)}
            placeholder="0"
            suffix="원"
            disabled={disabled}
          />
        </Field>
        <Field label="후순위 권리 총액" hint="본 건 NPL 포함 · 배당 대상">
          <NumberInput
            value={value.juniorTotal}
            onChange={(n) => set("juniorTotal", n)}
            placeholder="0"
            suffix="원"
            disabled={disabled}
          />
        </Field>
      </div>
    </div>
  )
}

/** ─── 4. 채무자·소유자 동일인 토글 ─────────────────────── */
export function DebtorOwnerSameToggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className={BLOCK}>
      <BlockHeader
        icon={<UserCheck className="w-4 h-4" />}
        title="채무자 · 소유자 동일인 여부"
        subtitle="동일인 아닐 경우 물상보증 · 명도 협상 주체 변동 → 회수 전략 영향"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => !disabled && onChange(true)}
          disabled={disabled}
          className={`flex-1 rounded-lg px-3 py-2 text-[0.8125rem] font-semibold border transition-colors ${
            value
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
              : "bg-[var(--color-surface-base)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
          } disabled:opacity-50`}
        >
          동일인 (채무자 = 소유자)
        </button>
        <button
          type="button"
          onClick={() => !disabled && onChange(false)}
          disabled={disabled}
          className={`flex-1 rounded-lg px-3 py-2 text-[0.8125rem] font-semibold border transition-colors ${
            !value
              ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-200"
              : "bg-[var(--color-surface-base)] border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
          } disabled:opacity-50`}
        >
          다름 (물상보증·제3자 담보)
        </button>
      </div>
    </div>
  )
}

/** ─── 5. 매각 희망가 할인율 ─────────────────────────────── */
export function DesiredSaleDiscountInput({
  value,
  onChange,
  principal,
  disabled,
}: {
  value: number // 0~1
  onChange: (v: number) => void
  principal: number
  disabled?: boolean
}) {
  const display = value > 0 ? (value * 100).toFixed(1).replace(/\.0$/, "") : ""
  const targetSalePrice = Math.max(0, Math.round(principal * (1 - value)))
  return (
    <div className={BLOCK}>
      <BlockHeader
        icon={<Percent className="w-4 h-4" />}
        title="매각 희망가 (대출원금 대비 할인율)"
        subtitle="채권자 제시 매각가 — 원금 대비 x% 할인 입력"
        right={
          <div className="text-right">
            <div className="text-[0.625rem] text-[var(--color-text-tertiary)]">목표 매각가</div>
            <div className="text-[0.875rem] font-bold text-sky-600 dark:text-sky-300 tabular-nums">
              {targetSalePrice.toLocaleString("ko-KR")}원
            </div>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="할인율" hint="0% 입력 시 원금 전액 매각가로 간주">
          <div className="relative">
            <input
              type="text"
              inputMode="decimal"
              value={display}
              onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9.]/g, "")
                const pct = raw === "" ? 0 : parseFloat(raw)
                if (Number.isNaN(pct)) return
                onChange(Math.min(1, Math.max(0, pct / 100)))
              }}
              placeholder="10.0"
              disabled={disabled}
              className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 pr-8 text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-emerald-500/60 focus:outline-none disabled:opacity-50 tabular-nums"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.6875rem] text-[var(--color-text-tertiary)]">%</span>
          </div>
        </Field>
        <Field label="대출원금 (참조)" hint="채권잔액 블록의 원금 자동 연동">
          <div className="w-full rounded-lg bg-[var(--color-surface-base)]/60 border border-dashed border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-tertiary)] tabular-nums">
            {principal > 0 ? `${principal.toLocaleString("ko-KR")}원` : "원금 미입력"}
          </div>
        </Field>
      </div>
    </div>
  )
}

/** ─── 6. 감정가 / 시세 / 경매 일정 ────────────────────── */
export function AppraisalAndMarketBlock({
  appraisalValue,
  onAppraisalValue,
  appraisalDate,
  onAppraisalDate,
  marketValue,
  onMarketValue,
  marketPriceNote,
  onMarketPriceNote,
  auctionStartDate,
  onAuctionStartDate,
  disabled,
}: {
  appraisalValue: number
  onAppraisalValue: (n: number) => void
  appraisalDate: string
  onAppraisalDate: (v: string) => void
  marketValue: number
  onMarketValue: (n: number) => void
  marketPriceNote: string
  onMarketPriceNote: (v: string) => void
  auctionStartDate: string
  onAuctionStartDate: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className={BLOCK}>
      <BlockHeader
        icon={<Landmark className="w-4 h-4" />}
        title="감정가 · 시세 · 경매 일정"
        subtitle="감정평가서 기준일 / 현재 시세 / 경매개시결정일 (없으면 공란)"
      />
      <div className="grid grid-cols-2 gap-3">
        <Field label="감정가" required>
          <NumberInput
            value={appraisalValue}
            onChange={onAppraisalValue}
            placeholder="0"
            suffix="원"
            disabled={disabled}
          />
        </Field>
        <Field label="감정가 기준일" hint="감정평가서 발행일 기준">
          <DateInput value={appraisalDate} onChange={onAppraisalDate} disabled={disabled} />
        </Field>
        <Field label="현재 시세" hint="AI 추정/실거래 중앙값 또는 수기 입력">
          <NumberInput
            value={marketValue}
            onChange={onMarketValue}
            placeholder="0"
            suffix="원"
            disabled={disabled}
          />
        </Field>
        <Field label="경매개시결정일" hint="없으면 공란 · 입력 시 매각일정 자동 반영">
          <DateInput value={auctionStartDate} onChange={onAuctionStartDate} disabled={disabled} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label="시세 출처 · 근거 메모">
          <input
            type="text"
            value={marketPriceNote}
            onChange={(e) => onMarketPriceNote(e.target.value)}
            placeholder="예: 같은 단지 동일 평형 2024-01 실거래 중앙값"
            disabled={disabled}
            className="w-full rounded-lg bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] px-3 py-2 text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:border-emerald-500/60 focus:outline-none disabled:opacity-50"
          />
        </Field>
      </div>
    </div>
  )
}
