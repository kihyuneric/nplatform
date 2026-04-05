import dynamic from 'next/dynamic'

// Heavy chart components - only load when needed
export const LazyBarChart = dynamic(
  () => import('recharts').then((m) => ({ default: m.BarChart })),
  { ssr: false }
)
export const LazyLineChart = dynamic(
  () => import('recharts').then((m) => ({ default: m.LineChart })),
  { ssr: false }
)
export const LazyAreaChart = dynamic(
  () => import('recharts').then((m) => ({ default: m.AreaChart })),
  { ssr: false }
)
export const LazyPieChart = dynamic(
  () => import('recharts').then((m) => ({ default: m.PieChart })),
  { ssr: false }
)
