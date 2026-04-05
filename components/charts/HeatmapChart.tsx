'use client'

/**
 * HeatmapChart — 지역별 낙찰가율 히트맵
 *
 * 시·도 × 물건종별 매트릭스 히트맵
 * 사용: <RegionHeatmap data={rows} />
 */

import { useMemo } from 'react'

// ─── 타입 ─────────────────────────────────────────────────

export interface HeatmapCell {
  sido:          string
  property_type: string
  avg_bid_rate:  number    // 0~1 (낙찰가 / 감정가)
  count:         number    // 샘플 수
}

interface Props {
  data:       HeatmapCell[]
  className?: string
  // 고정 축 목록 (없으면 data에서 자동 추출)
  sidos?:          string[]
  propertyTypes?:  string[]
}

// ─── 색상 스케일 (낙찰가율 0.5 ~ 1.0) ──────────────────
function rateToColor(rate: number | null, opacity = 1): string {
  if (rate === null || rate === 0) return `rgba(241,245,249,${opacity})`   // 데이터 없음 — slate-100

  // 0.60 이하 → 파랑 (저가 낙찰)
  // 0.75 → 노랑
  // 0.90 이상 → 빨강 (고가 경쟁)
  const clamped = Math.max(0.55, Math.min(1.05, rate))
  const t = (clamped - 0.55) / (1.05 - 0.55)  // 0→1

  // 파랑(cool) → 초록 → 노랑 → 빨강(hot)
  if (t < 0.33) {
    const s = t / 0.33
    return `rgba(${Math.round(59 + (34 - 59) * s)},${Math.round(130 + (197 - 130) * s)},${Math.round(246 + (94 - 246) * s)},${opacity})`
  } else if (t < 0.66) {
    const s = (t - 0.33) / 0.33
    return `rgba(${Math.round(34 + (234 - 34) * s)},${Math.round(197 + (179 - 197) * s)},${Math.round(94 + (8 - 94) * s)},${opacity})`
  } else {
    const s = (t - 0.66) / 0.34
    return `rgba(${Math.round(234 + (239 - 234) * s)},${Math.round(179 + (68 - 179) * s)},${Math.round(8 + (68 - 8) * s)},${opacity})`
  }
}

function textColor(rate: number | null): string {
  if (rate === null || rate === 0) return '#94a3b8'
  const t = (rate - 0.55) / 0.5
  return t > 0.55 ? '#fff' : '#1e293b'
}

// ─── 기본 축 데이터 ───────────────────────────────────────
const DEFAULT_SIDOS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산']
const DEFAULT_TYPES = ['아파트', '오피스텔', '상가', '단독주택', '토지']

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export default function HeatmapChart({
  data,
  className    = '',
  sidos        = DEFAULT_SIDOS,
  propertyTypes = DEFAULT_TYPES,
}: Props) {

  // data를 O(1) 룩업 맵으로 변환
  const cellMap = useMemo(() => {
    const m = new Map<string, HeatmapCell>()
    for (const d of data) {
      const sidoShort = d.sido.replace('특별시', '').replace('광역시', '').replace('특별자치시', '').replace('도', '').trim()
      m.set(`${sidoShort}__${d.property_type}`, d)
    }
    return m
  }, [data])

  const resolvedSidos = sidos.length > 0 ? sidos : DEFAULT_SIDOS
  const resolvedTypes = propertyTypes.length > 0 ? propertyTypes : DEFAULT_TYPES

  // 범례 스케일
  const LEGEND_STEPS = [0.60, 0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00]

  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      {/* 매트릭스 */}
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="py-2 pr-3 text-right text-[11px] text-slate-400 font-normal w-16 shrink-0">지역↓ 유형→</th>
            {resolvedTypes.map(t => (
              <th key={t} className="py-2 px-1 text-center font-semibold text-slate-600 tracking-normal min-w-[64px]">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {resolvedSidos.map(sido => (
            <tr key={sido}>
              <td className="py-1 pr-3 text-right font-semibold text-slate-600 text-[11px] tracking-normal whitespace-nowrap">
                {sido}
              </td>
              {resolvedTypes.map(type => {
                const cell = cellMap.get(`${sido}__${type}`)
                const rate = cell?.avg_bid_rate ?? null
                const bg   = rateToColor(rate)
                const fg   = textColor(rate)
                return (
                  <td key={type} className="py-1 px-1">
                    <div
                      className="h-10 rounded-lg flex flex-col items-center justify-center cursor-default transition-transform hover:scale-105"
                      style={{ backgroundColor: bg, color: fg }}
                      title={cell ? `${sido} ${type}: ${(rate! * 100).toFixed(1)}% (${cell.count}건)` : '데이터 없음'}
                    >
                      {rate !== null ? (
                        <>
                          <span className="font-bold tabular-nums leading-none" style={{ fontSize: 13 }}>
                            {(rate * 100).toFixed(0)}%
                          </span>
                          {cell && cell.count > 0 && (
                            <span className="tabular-nums leading-none mt-0.5" style={{ fontSize: 9, opacity: 0.75 }}>
                              {cell.count}건
                            </span>
                          )}
                        </>
                      ) : (
                        <span style={{ fontSize: 9 }}>—</span>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 범례 */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-[10px] text-slate-400 tracking-normal shrink-0">낙찰가율</span>
        <div className="flex items-stretch h-4 rounded overflow-hidden flex-1 max-w-[280px]">
          {LEGEND_STEPS.map((step, i) => (
            <div
              key={i}
              className="flex-1 flex items-center justify-center"
              style={{ backgroundColor: rateToColor(step) }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 tabular-nums">
          <span>60%</span>
          <span className="text-slate-300">—</span>
          <span>100%+</span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: rateToColor(0.65) }} />
          <span className="text-[10px] text-slate-500 tracking-normal">저가 낙찰</span>
          <div className="w-3 h-3 rounded" style={{ backgroundColor: rateToColor(0.95) }} />
          <span className="text-[10px] text-slate-500 tracking-normal">고가 경쟁</span>
        </div>
      </div>
    </div>
  )
}

// ─── 데이터 없을 때 플레이스홀더 ─────────────────────────

export function HeatmapPlaceholder({ className = '' }: { className?: string }) {
  const placeholderData: HeatmapCell[] = DEFAULT_SIDOS.flatMap(sido =>
    DEFAULT_TYPES.map(type => ({
      sido,
      property_type: type,
      avg_bid_rate: 0.65 + Math.random() * 0.30,
      count: Math.floor(Math.random() * 50) + 5,
    }))
  )
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/60 rounded-xl">
        <p className="text-xs font-medium text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow tracking-normal">
          실제 데이터 수집 중 — 미리보기
        </p>
      </div>
      <HeatmapChart data={placeholderData} />
    </div>
  )
}
