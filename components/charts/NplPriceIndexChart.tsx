'use client'

import { useState, useEffect } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { Loader2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── 타입 ─────────────────────────────────────────────────

interface NpiDataPoint {
  index_date: string
  region: string
  property_type: string
  avg_bid_rate: number
  sold_count: number
  auction_count: number
  index_value: number | null
  wow_change: number | null
}

interface ChartPoint {
  date: string
  [region: string]: string | number
}

interface Props {
  region?: string
  propertyType?: string
  weeks?: number       // 몇 주치 데이터 (기본 12)
  height?: number
  showLegend?: boolean
}

const REGION_COLORS: Record<string, string> = {
  '전국':   '#3b82f6',
  '서울':   '#8b5cf6',
  '경기':   '#10b981',
  '부산':   '#f59e0b',
  '인천':   '#06b6d4',
  '대구':   '#ef4444',
  '광주':   '#ec4899',
  '대전':   '#84cc16',
}

const REGIONS = ['전국', '서울', '경기', '부산', '인천']

// ─── 커스텀 툴팁 ─────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-xl">
      <p className="text-xs text-gray-400 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-300 w-12">{p.name}</span>
          <span className="text-white font-semibold">{(p.value * 100).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  )
}

// ─── NBI 헤더 통계 ───────────────────────────────────────

function NbiStatCard({ region, rate, change }: { region: string; rate: number; change: number | null }) {
  const changeColor = change == null ? 'text-gray-500' : change > 0 ? 'text-emerald-400' : change < 0 ? 'text-red-400' : 'text-gray-400'
  const ChangeIcon  = change == null ? Minus : change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus
  return (
    <div className="bg-gray-800/50 rounded-xl px-4 py-3 text-center flex-1 min-w-0">
      <p className="text-xs text-gray-500 mb-1">{region}</p>
      <p className="text-lg font-bold text-white">{(rate * 100).toFixed(1)}%</p>
      {change != null && (
        <p className={`text-xs flex items-center justify-center gap-0.5 mt-0.5 ${changeColor}`}>
          <ChangeIcon className="h-3 w-3" />
          {Math.abs(change).toFixed(1)}%p
        </p>
      )}
    </div>
  )
}

// ─── 메인 컴포넌트 ────────────────────────────────────────

export default function NplPriceIndexChart({
  region,
  propertyType = 'ALL',
  weeks = 12,
  height = 280,
  showLegend = true,
}: Props) {
  const [data, setData]       = useState<ChartPoint[]>([])
  const [latest, setLatest]   = useState<NpiDataPoint[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    void loadData()
  }, [region, propertyType, weeks])

  async function loadData() {
    setLoading(true)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - weeks * 7)
    const cutoffStr = cutoff.toISOString().split('T')[0]!

    const regionsToLoad = region ? [region] : REGIONS

    const { data: rows } = await supabase
      .from('npl_price_index')
      .select('index_date, region, property_type, avg_bid_rate, sold_count, auction_count, index_value, wow_change')
      .eq('property_type', propertyType)
      .in('region', regionsToLoad)
      .gte('index_date', cutoffStr)
      .order('index_date', { ascending: true })

    if (!rows || rows.length === 0) {
      // 데이터 없을 때 빈 상태
      setData([])
      setLatest([])
      setLoading(false)
      return
    }

    // 날짜별 그룹화
    const byDate: Record<string, ChartPoint> = {}
    for (const row of rows as NpiDataPoint[]) {
      const d = row.index_date
      if (!byDate[d]) byDate[d] = { date: d.slice(5) }   // MM-DD 형식
      byDate[d][row.region] = row.avg_bid_rate
    }

    setData(Object.values(byDate).sort((a, b) => String(a.date) < String(b.date) ? -1 : 1))

    // 최신 데이터
    const latestDate = rows[rows.length - 1]?.index_date
    setLatest((rows as NpiDataPoint[]).filter(r => r.index_date === latestDate))
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center bg-gray-900/50 rounded-xl border border-gray-800" style={{ height }}>
        <div className="text-center">
          <p className="text-sm text-gray-500">NPL 가격지수 데이터를 수집 중입니다</p>
          <p className="text-xs text-gray-600 mt-1">데이터 동기화 후 자동 업데이트됩니다</p>
        </div>
      </div>
    )
  }

  const displayRegions = region ? [region] : REGIONS

  return (
    <div>
      {/* 최신 지수 요약 */}
      {latest.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {latest.map(l => (
            <NbiStatCard key={l.region} region={l.region} rate={l.avg_bid_rate} change={l.wow_change} />
          ))}
        </div>
      )}

      {/* 차트 */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${(Number(v) * 100).toFixed(0)}%`}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend
            wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }}
          />}
          {/* 90% 기준선 */}
          <ReferenceLine y={0.9} stroke="#374151" strokeDasharray="4 2" />
          {displayRegions.map(r => (
            <Line
              key={r}
              type="monotone"
              dataKey={r}
              name={r}
              stroke={REGION_COLORS[r] ?? '#64748b'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
