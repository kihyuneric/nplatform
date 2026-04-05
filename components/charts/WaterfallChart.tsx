'use client'

/**
 * WaterfallChart — 경매 투자 수익 구조 폭포차트
 *
 * 낙찰가 기준 비용·수익 항목별 누적 시각화
 * 사용: <WaterfallChart winningBid={...} appraisedValue={...} ... />
 */

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine, LabelList,
} from 'recharts'

// ─── 타입 ─────────────────────────────────────────────────

export interface WaterfallInput {
  appraisedValue:   number   // 감정가
  winningBid:       number   // 낙찰가 (또는 예상 입찰가)
  tenantDeposit?:   number   // 인수 임차보증금
  commissionFee?:   number   // 중개 수수료 (VAT 포함)
  legalFee?:        number   // 취득세·법무사 비용 (기본 3.4%)
  renovationCost?:  number   // 리모델링 예상 비용
  disposalPrice?:   number   // 예상 매각가 (기본 감정가 × 0.9)
}

interface WaterfallBar {
  name:    string
  value:   number   // 표시 높이
  start:   number   // 누적 시작점 (투명 bar)
  color:   string
  type:    'positive' | 'negative' | 'total'
  label:   string
}

// ─── 색상 ─────────────────────────────────────────────────
const COLOR = {
  positive: '#10b981',  // 초록 — 수익
  negative: '#ef4444',  // 빨강 — 비용
  total:    '#2E75B6',  // 파랑 — 합계
  neutral:  '#64748b',
}

// ─── 금액 포맷 ────────────────────────────────────────────
function fmtAmt(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (abs >= 10_000)      return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString('ko-KR') + '원'
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'
}

// ─── Custom Tooltip ───────────────────────────────────────
function CustomTooltip({ active, payload }: {
  active?: boolean
  payload?: { payload: WaterfallBar }[]
}) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#0D1F38] border border-white/15 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1 tracking-normal">{d.name}</p>
      <p className={`font-bold tabular-nums ${d.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {d.value >= 0 ? '+' : ''}{d.label}
      </p>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────

interface Props extends WaterfallInput {
  className?: string
  height?:    number
}

export default function WaterfallChart({
  appraisedValue,
  winningBid,
  tenantDeposit   = 0,
  commissionFee,
  legalFee,
  renovationCost  = 0,
  disposalPrice,
  className       = '',
  height          = 280,
}: Props) {

  const bars = useMemo<WaterfallBar[]>(() => {
    // 기본값 계산
    const actualCommission = commissionFee ?? Math.round(winningBid * 0.004 * 1.1)
    const actualLegal      = legalFee      ?? Math.round(winningBid * 0.034)
    const actualDisposal   = disposalPrice ?? Math.round(appraisedValue * 0.90)

    // 순투자액
    const totalInvestment = winningBid + tenantDeposit + actualCommission + actualLegal + renovationCost
    // 순수익
    const netProfit = actualDisposal - totalInvestment
    const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0

    const items: Omit<WaterfallBar, 'start'>[] = [
      { name: '낙찰가',     value: -winningBid,        color: COLOR.negative, type: 'negative', label: fmtAmt(winningBid) },
      ...(tenantDeposit > 0 ? [{ name: '임차보증금 인수', value: -tenantDeposit,  color: COLOR.negative, type: 'negative' as const, label: fmtAmt(tenantDeposit) }] : []),
      { name: '취득비용',   value: -actualLegal,        color: COLOR.negative, type: 'negative', label: fmtAmt(actualLegal) },
      { name: '수수료',     value: -actualCommission,   color: COLOR.negative, type: 'negative', label: fmtAmt(actualCommission) },
      ...(renovationCost > 0 ? [{ name: '리모델링',     value: -renovationCost, color: COLOR.negative, type: 'negative' as const, label: fmtAmt(renovationCost) }] : []),
      { name: '매각 예상가', value: actualDisposal,     color: COLOR.positive, type: 'positive', label: fmtAmt(actualDisposal) },
      { name: `순이익 (ROI ${fmtPct(roi)})`, value: netProfit, color: netProfit >= 0 ? COLOR.positive : COLOR.negative, type: 'total', label: fmtAmt(netProfit) },
    ]

    // start 값 누적 계산
    let running = 0
    return items.map(item => {
      const bar: WaterfallBar = { ...item, start: item.type === 'total' ? 0 : running }
      if (item.type !== 'total') running += item.value
      return bar
    })
  }, [appraisedValue, winningBid, tenantDeposit, commissionFee, legalFee, renovationCost, disposalPrice])

  const yDomain = useMemo(() => {
    const all = bars.flatMap(b => [b.start, b.start + b.value])
    return [Math.min(...all) * 1.1, Math.max(...all) * 1.1]
  }, [bars])

  return (
    <div className={`w-full ${className}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={bars} margin={{ top: 20, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={48}
          />
          <YAxis
            tickFormatter={v => fmtAmt(v as number)}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            domain={yDomain}
            width={72}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.08)' }} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />

          {/* 투명 오프셋 bar */}
          <Bar dataKey="start" stackId="a" fill="transparent" />

          {/* 실제 값 bar */}
          <Bar dataKey="value" stackId="a" radius={[4, 4, 0, 0]}>
            {bars.map((b, i) => (
              <Cell key={i} fill={b.color} fillOpacity={0.9} />
            ))}
            <LabelList
              dataKey="label"
              position="top"
              style={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── 요약 카드 컴포넌트 ───────────────────────────────────

export function WaterfallSummaryCards({
  input,
  variant = 'light',
}: {
  input: WaterfallInput
  variant?: 'light' | 'dark'
}) {
  const commission  = input.commissionFee ?? Math.round(input.winningBid * 0.0044)
  const legal       = input.legalFee      ?? Math.round(input.winningBid * 0.034)
  const disposal    = input.disposalPrice ?? Math.round(input.appraisedValue * 0.9)
  const totalCost   = input.winningBid + (input.tenantDeposit ?? 0) + commission + legal + (input.renovationCost ?? 0)
  const netProfit   = disposal - totalCost
  const roi         = totalCost > 0 ? (netProfit / totalCost) * 100 : 0
  const discountPct = ((input.appraisedValue - input.winningBid) / input.appraisedValue) * 100

  const isDark = variant === 'dark'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: '감정가 대비 할인율',  value: `${discountPct.toFixed(1)}%`,       sub: `감정가 ${fmtAmt(input.appraisedValue)}`,      color: isDark ? 'text-blue-300'   : 'text-blue-600',    border: isDark ? 'border-l-blue-400'    : 'border-l-blue-500' },
        { label: '총 투자액',          value: fmtAmt(totalCost),                  sub: '낙찰가+비용 합계',                            color: isDark ? 'text-slate-200'  : 'text-slate-700',   border: isDark ? 'border-l-slate-500'   : 'border-l-slate-400' },
        { label: '예상 순이익',        value: fmtAmt(netProfit),                  sub: `매각가 ${fmtAmt(disposal)}`,                 color: netProfit >= 0 ? (isDark ? 'text-emerald-300' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-500'), border: netProfit >= 0 ? (isDark ? 'border-l-emerald-400' : 'border-l-emerald-500') : (isDark ? 'border-l-red-400' : 'border-l-red-400') },
        { label: '예상 ROI',           value: `${fmtPct(roi)}`,                   sub: '순이익 / 총투자액',                           color: roi >= 0 ? (isDark ? 'text-emerald-300' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-500'), border: roi >= 0 ? (isDark ? 'border-l-emerald-400' : 'border-l-emerald-500') : (isDark ? 'border-l-red-400' : 'border-l-red-400') },
      ].map(k => (
        <div key={k.label} className={`rounded-xl border-l-4 ${k.border} px-4 py-3 ${
          isDark
            ? 'bg-white/5 border border-white/8'
            : 'bg-white shadow-sm'
        }`}>
          <p className={`text-[11px] mb-1 tracking-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{k.label}</p>
          <p className={`text-xl font-black tabular-nums ${k.color}`}>{k.value}</p>
          <p className={`text-[10px] mt-0.5 tracking-normal ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{k.sub}</p>
        </div>
      ))}
    </div>
  )
}
