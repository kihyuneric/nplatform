/**
 * Centralized dynamic imports for heavy components.
 * All entries use { ssr: false } since they rely on browser APIs or are visually complex.
 * Skeleton loaders match the approximate dimensions to prevent layout shift.
 */

import dynamic from 'next/dynamic'

// ─── Skeleton helpers ─────────────────────────────────────────

const ChartSkeleton = () => (
  <div className="h-[200px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
)
const TallChartSkeleton = () => (
  <div className="h-[350px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />
)
const MapSkeleton = () => (
  <div className="h-[400px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl flex items-center justify-center text-gray-400 text-sm">
    지도 로딩 중...
  </div>
)
const NetworkSkeleton = () => (
  <div className="h-[500px] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
)

// ─── Recharts ─────────────────────────────────────────────────

export const DynamicLineChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.LineChart })),
  { ssr: false, loading: ChartSkeleton }
)

export const DynamicBarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.BarChart })),
  { ssr: false, loading: ChartSkeleton }
)

export const DynamicAreaChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.AreaChart })),
  { ssr: false, loading: ChartSkeleton }
)

export const DynamicPieChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.PieChart })),
  { ssr: false, loading: ChartSkeleton }
)

export const DynamicRadarChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.RadarChart })),
  { ssr: false, loading: ChartSkeleton }
)

export const DynamicComposedChart = dynamic(
  () => import('recharts').then(mod => ({ default: mod.ComposedChart })),
  { ssr: false, loading: TallChartSkeleton }
)

// ─── Domain-specific heavy components ─────────────────────────

export const DynamicKeywordNetwork = dynamic(
  () => import('@/components/keyword-network').then(mod => ({ default: mod.KeywordNetwork })),
  { ssr: false, loading: NetworkSkeleton }
)

export const DynamicKoreaRegionMap = dynamic(
  () => import('@/components/korea-region-map').then(mod => ({ default: mod.KoreaRegionMap })),
  { ssr: false, loading: MapSkeleton }
)

export const DynamicPeriodCompareChart = dynamic(
  () => import('@/components/period-compare-chart').then(mod => ({ default: mod.PeriodCompareChart })),
  { ssr: false, loading: TallChartSkeleton }
)

export const DynamicDirectionDonutChart = dynamic(
  () => import('@/components/direction-donut-chart').then(mod => ({ default: mod.DirectionDonutChart })),
  { ssr: false, loading: ChartSkeleton }
)

export const DynamicMarketInsightPanel = dynamic(
  () => import('@/components/market-insight-panel').then(mod => ({ default: mod.MarketInsightPanel })),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-gray-50 dark:bg-gray-800 rounded-xl" /> }
)
