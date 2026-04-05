'use client'

/**
 * BidRateDistributionChart — 낙찰가율 분포 차트
 *
 * 지역·물건종별 낙찰가율 분포를 히스토그램 + 박스플롯으로 표시
 * 사용: <BidRateDistributionChart data={soldListings} />
 */

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

// ─── 타입 ─────────────────────────────────────────────────

export interface BidRateSample {
  bid_rate:      number    // 낙찰가율 (0~1.2)
  property_type?: string
  sido?:          string
  auction_count?: number  // 입찰 회차
}

interface Props {
  data:         BidRateSample[]
  bucketSize?:  number    // 히스토그램 버킷 크기 (default 0.025 = 2.5%)
  height?:      number
  className?:   string
  showStats?:   boolean
  filterType?:  string    // 특정 물건종별 필터
}

interface Bucket {
  range:  string
  center: number
  count:  number
  pct:    number
}

// ─── 통계 계산 ────────────────────────────────────────────

function calcStats(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const mean = sorted.reduce((a, b) => a + b, 0) / n
  const variance = sorted.reduce((a, v) => a + (v - mean) ** 2, 0) / n
  const std  = Math.sqrt(variance)
  const q1   = sorted[Math.floor(n * 0.25)]!
  const med  = sorted[Math.floor(n * 0.50)]!
  const q3   = sorted[Math.floor(n * 0.75)]!

  return { mean, std, q1, median: med, q3, min: sorted[0]!, max: sorted[n - 1]!, n }
}

// ─── Tooltip ──────────────────────────────────────────────

function DistTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; payload: Bucket }[]
  label?: string
}) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#0D1F38] border border-white/15 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-semibold text-white mb-1 tracking-normal">낙찰가율 {label}</p>
      <p className="text-slate-300 tracking-normal">건수: <span className="font-bold text-white tabular-nums">{d.count}건</span></p>
      <p className="text-slate-300 tracking-normal">비율: <span className="font-bold text-blue-300 tabular-nums">{d.pct.toFixed(1)}%</span></p>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export default function BidRateDistributionChart({
  data,
  bucketSize = 0.025,
  height     = 220,
  className  = '',
  showStats  = true,
  filterType,
}: Props) {

  const filtered = useMemo(() =>
    filterType ? data.filter(d => d.property_type === filterType) : data,
    [data, filterType]
  )

  const values = useMemo(() =>
    filtered.map(d => d.bid_rate).filter(v => v > 0 && v < 1.5),
    [filtered]
  )

  const { buckets, stats } = useMemo(() => {
    if (values.length === 0) return { buckets: [], stats: null }

    const MIN = 0.50, MAX = 1.10
    const numBuckets = Math.round((MAX - MIN) / bucketSize)
    const bkts: Bucket[] = Array.from({ length: numBuckets }, (_, i) => {
      const lo = MIN + i * bucketSize
      const hi = lo + bucketSize
      return {
        range:  `${(lo * 100).toFixed(0)}-${(hi * 100).toFixed(0)}%`,
        center: lo + bucketSize / 2,
        count:  0,
        pct:    0,
      }
    })

    for (const v of values) {
      const idx = Math.min(
        Math.floor((v - MIN) / bucketSize),
        numBuckets - 1
      )
      if (idx >= 0 && idx < bkts.length) bkts[idx]!.count++
    }

    const total = values.length
    bkts.forEach(b => { b.pct = total > 0 ? (b.count / total) * 100 : 0 })

    return { buckets: bkts, stats: calcStats(values) }
  }, [values, bucketSize])

  if (values.length === 0) {
    return (
      <div className={`h-36 flex items-center justify-center text-sm text-slate-400 tracking-normal ${className}`}>
        낙찰 데이터 없음
      </div>
    )
  }

  // 중앙값 기준 색상 결정
  const getModeColor = (center: number, median: number) => {
    const diff = center - median
    if (diff > 0.05) return '#ef4444'   // 중앙값보다 5%p 이상 높음 → 빨강(고가)
    if (diff < -0.05) return '#3b82f6'  // 5%p 이하 → 파랑(저가)
    return '#10b981'                     // 중간 → 초록
  }

  return (
    <div className={`w-full ${className}`}>
      {/* 통계 요약 */}
      {showStats && stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: '평균', value: `${(stats.mean * 100).toFixed(1)}%`,   color: 'text-blue-600' },
            { label: '중앙값', value: `${(stats.median * 100).toFixed(1)}%`, color: 'text-emerald-600' },
            { label: 'Q1~Q3', value: `${(stats.q1 * 100).toFixed(0)}~${(stats.q3 * 100).toFixed(0)}%`, color: 'text-slate-700' },
            { label: '표본 수', value: `${stats.n}건`,                   color: 'text-slate-700' },
          ].map(k => (
            <div key={k.label} className="bg-slate-50 rounded-lg px-3 py-2 text-center">
              <p className="text-[10px] text-slate-400 mb-0.5 tracking-normal">{k.label}</p>
              <p className={`text-sm font-bold tabular-nums tracking-normal ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* 히스토그램 */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={buckets} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="5%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 9, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            interval={1}
            angle={-30}
            textAnchor="end"
            height={36}
          />
          <YAxis
            tickFormatter={v => `${v}건`}
            tick={{ fontSize: 10, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<DistTooltip />} cursor={{ fill: 'rgba(148,163,184,0.1)' }} />
          {/* 중앙값 참조선 */}
          {stats && (
            <ReferenceLine
              x={`${((stats.median - 0.025 / 2) * 100).toFixed(0)}-${((stats.median + 0.025 / 2) * 100).toFixed(0)}%`}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 3"
              label={{ value: `중앙값 ${(stats.median * 100).toFixed(0)}%`, position: 'top', fontSize: 10, fill: '#d97706' }}
            />
          )}
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {buckets.map((b, i) => (
              <Cell
                key={i}
                fill={stats ? getModeColor(b.center, stats.median) : '#2E75B6'}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 범례 */}
      <div className="mt-2 flex items-center gap-4 justify-end text-[10px] text-slate-400 tracking-normal">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" />저가 낙찰 (&lt;중앙값)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />적정 구간</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" />고가 낙찰 (&gt;중앙값)</span>
      </div>
    </div>
  )
}

// ─── 물건종별 비교 멀티 차트 ─────────────────────────────

export function BidRateByTypeComparison({
  data,
  types     = ['아파트', '오피스텔', '상가', '단독주택', '토지'],
  className = '',
}: {
  data:      BidRateSample[]
  types?:    string[]
  className?: string
}) {
  const stats = useMemo(() =>
    types.map(type => {
      const vals = data.filter(d => d.property_type === type).map(d => d.bid_rate).filter(v => v > 0)
      const s = calcStats(vals)
      return { type, ...s, n: vals.length }
    }),
    [data, types]
  )

  return (
    <div className={`space-y-1 ${className}`}>
      {stats.map(s => (
        <div key={s.type} className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-600 w-16 shrink-0 tracking-normal">{s.type}</span>
          <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
            {s.n > 0 && s.q1 !== undefined && s.q3 !== undefined && s.mean !== undefined ? (
              <>
                {/* IQR 박스 */}
                <div
                  className="absolute top-1 h-4 rounded bg-blue-400/60"
                  style={{
                    left:  `${Math.max(0, (s.q1  - 0.5) / 0.6 * 100)}%`,
                    width: `${Math.max(1, (s.q3 - s.q1) / 0.6 * 100)}%`,
                  }}
                />
                {/* 중앙값 라인 */}
                <div
                  className="absolute top-0.5 h-5 w-0.5 bg-blue-600 rounded"
                  style={{ left: `${Math.max(0, (s.median! - 0.5) / 0.6 * 100)}%` }}
                />
              </>
            ) : (
              <div className="h-full bg-slate-200 rounded-full" />
            )}
          </div>
          <span className="text-xs tabular-nums text-slate-500 w-12 text-right tracking-normal">
            {s.n > 0 && s.median !== undefined ? `${(s.median * 100).toFixed(0)}%` : '—'}
          </span>
          <span className="text-[10px] tabular-nums text-slate-400 w-8 text-right tracking-normal">
            {s.n > 0 ? `${s.n}건` : '—'}
          </span>
        </div>
      ))}
      <div className="flex items-center gap-3 pt-1">
        <span className="w-16" />
        <div className="flex-1 flex justify-between text-[9px] text-slate-300 tabular-nums px-0.5">
          <span>50%</span>
          <span>65%</span>
          <span>80%</span>
          <span>95%</span>
          <span>110%</span>
        </div>
      </div>
    </div>
  )
}
