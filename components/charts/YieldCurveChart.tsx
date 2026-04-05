'use client'

/**
 * YieldCurveChart — NPL 수익률 곡선
 *
 * 보유 기간별(또는 낙찰가율별) 예상 수익률 곡선 시각화
 * 사용:
 *   <YieldCurveChart appraisedValue={1.8e9} seniorClaim={1.5e9} />
 *   <YieldCurveChart mode="bid-rate" bidRatePoints={[...]} />
 */

import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart,
} from 'recharts'
import { TrendingUp, TrendingDown } from 'lucide-react'

// ─── 타입 ─────────────────────────────────────────────────

/** 낙찰가율별 ROI 시나리오 포인트 */
export interface BidRatePoint {
  bidRate:  number    // 0.60 ~ 1.10
  roi:      number    // ROI (%)
  label?:   string
}

/** 보유 기간별 IRR 포인트 */
export interface HoldingPeriodPoint {
  months:   number    // 보유 기간 (개월)
  irr:      number    // 연환산 수익률 (%)
  label?:   string
}

type Mode = 'bid-rate' | 'holding-period' | 'auto'

interface AutoInput {
  appraisedValue:  number
  seniorClaim?:    number    // 선순위 채권
  tenantDeposit?:  number    // 임차보증금
  commissionRate?: number    // 수수료율 (default 0.004)
  legalRate?:      number    // 취득비용률 (default 0.034)
  disposalRate?:   number    // 처분가율 (default 0.90)
}

interface Props {
  mode?:              Mode
  // auto 모드
  autoInput?:         AutoInput
  // 직접 데이터
  bidRatePoints?:     BidRatePoint[]
  holdingPoints?:     HoldingPeriodPoint[]
  // 스타일
  height?:            number
  className?:         string
  showOptimal?:       boolean   // 최적 입찰가율 마커
}

// ─── 자동 계산 — 낙찰가율별 ROI ───────────────────────────

function computeBidRateCurve(input: AutoInput): BidRatePoint[] {
  const {
    appraisedValue,
    seniorClaim   = 0,
    tenantDeposit = 0,
    commissionRate = 0.0044,
    legalRate      = 0.034,
    disposalRate   = 0.90,
  } = input

  const disposal = appraisedValue * disposalRate
  const points: BidRatePoint[] = []

  for (let rate = 0.50; rate <= 1.05; rate += 0.025) {
    const bidAmt = appraisedValue * rate
    const commission = bidAmt * commissionRate
    const legal      = bidAmt * legalRate
    const totalCost  = bidAmt + tenantDeposit + commission + legal
    const netRecovery = disposal - Math.max(0, seniorClaim - bidAmt * 0.1)
    const roi = totalCost > 0 ? ((netRecovery - totalCost) / totalCost) * 100 : 0

    points.push({
      bidRate: Math.round(rate * 1000) / 1000,
      roi:     Math.round(roi * 10) / 10,
      label:   `낙찰가율 ${(rate * 100).toFixed(1)}%`,
    })
  }
  return points
}

// ─── Tooltip ──────────────────────────────────────────────

function CurveTooltip({ active, payload, label, xLabel, yLabel }: {
  active?:  boolean
  payload?: { value: number }[]
  label?:   string | number
  xLabel:   string
  yLabel:   string
}) {
  if (!active || !payload?.[0]) return null
  const v = payload[0].value
  return (
    <div className="bg-[#0D1F38] border border-white/15 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-slate-300 mb-1 tracking-normal">{xLabel}: <span className="font-bold text-white">{label}</span></p>
      <p className={`font-bold tabular-nums tracking-normal ${v >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {yLabel}: {v >= 0 ? '+' : ''}{v.toFixed(1)}%
      </p>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export default function YieldCurveChart({
  mode         = 'auto',
  autoInput,
  bidRatePoints,
  holdingPoints,
  height        = 240,
  className     = '',
  showOptimal   = true,
}: Props) {

  const isBidMode = mode === 'bid-rate' || (mode === 'auto' && !holdingPoints)

  const chartData = useMemo(() => {
    if (isBidMode) {
      const pts = bidRatePoints ?? (autoInput ? computeBidRateCurve(autoInput) : [])
      return pts.map(p => ({
        x:   `${(p.bidRate * 100).toFixed(0)}%`,
        roi: p.roi,
        raw: p.bidRate,
      }))
    } else {
      return (holdingPoints ?? []).map(p => ({
        x:   `${p.months}개월`,
        roi: p.irr,
        raw: p.months,
      }))
    }
  }, [isBidMode, bidRatePoints, holdingPoints, autoInput])

  // 손익분기점 (ROI = 0에 가장 가까운 점)
  const breakEven = useMemo(() => {
    if (!isBidMode) return null
    let best = chartData[0]
    for (const d of chartData) {
      if (best && Math.abs(d.roi) < Math.abs(best.roi)) best = d
    }
    return best
  }, [chartData, isBidMode])

  // 최적 입찰가율 (ROI 최대)
  const optimal = useMemo(() => {
    if (!isBidMode || chartData.length === 0) return null
    return chartData.reduce((a, b) => (b.roi > a.roi ? b : a))
  }, [chartData, isBidMode])

  const minRoi = Math.min(...chartData.map(d => d.roi))
  const maxRoi = Math.max(...chartData.map(d => d.roi))
  const hasPositive = maxRoi > 0
  const hasNegative = minRoi < 0

  return (
    <div className={`w-full ${className}`}>
      {/* 헤더 요약 */}
      {showOptimal && optimal && (
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-xs">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-500 tracking-normal">최적 입찰가율</span>
            <span className="font-bold text-emerald-600 tabular-nums">{optimal.x}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 tracking-normal">예상 ROI</span>
            <span className={`font-bold tabular-nums ${optimal.roi >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {optimal.roi >= 0 ? '+' : ''}{optimal.roi.toFixed(1)}%
            </span>
          </div>
          {breakEven && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 tracking-normal">손익분기</span>
              <span className="font-semibold text-amber-600 tabular-nums">{breakEven.x}</span>
            </div>
          )}
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="roiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={hasPositive ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
              <stop offset="95%" stopColor={hasPositive ? '#10b981' : '#ef4444'} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="roiNegGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            domain={[Math.min(minRoi * 1.2, -2), Math.max(maxRoi * 1.2, 5)]}
            width={44}
          />
          <Tooltip
            content={
              <CurveTooltip
                xLabel={isBidMode ? '낙찰가율' : '보유기간'}
                yLabel={isBidMode ? 'ROI' : 'IRR'}
              />
            }
          />
          {/* 손익분기선 */}
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" />
          {/* 최적점 마커 */}
          {showOptimal && optimal && (
            <ReferenceLine
              x={optimal.x}
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{ value: '최적', position: 'top', fontSize: 10, fill: '#059669' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="roi"
            stroke={hasPositive ? '#10b981' : '#ef4444'}
            strokeWidth={2.5}
            fill="url(#roiGradient)"
            dot={false}
            activeDot={{ r: 5, fill: '#2E75B6', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* 하단 범례 */}
      <div className="mt-2 flex items-center gap-4 justify-end text-[10px] text-slate-400">
        {hasPositive && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />수익 구간
          </span>
        )}
        {hasNegative && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400" />손실 구간
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 border-t border-dashed border-slate-400" />손익분기
        </span>
      </div>
    </div>
  )
}
