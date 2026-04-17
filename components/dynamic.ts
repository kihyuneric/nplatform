/**
 * Central registry for next/dynamic lazy-loaded components.
 * Use these instead of direct imports for heavy components.
 *
 * Rules:
 *  - ssr: false  → components that use browser APIs (window, canvas, DOM)
 *  - loading skeleton → animate-pulse placeholder while the chunk loads
 */
import dynamic from 'next/dynamic'

// ── Charts (recharts-based, heavy) ──────────────────────────────────────────

export const DynamicWaterfallChart = dynamic(
  () => import('@/components/charts/WaterfallChart'),
  { ssr: false }
)

export const DynamicWaterfallSummaryCards = dynamic(
  () => import('@/components/charts/WaterfallChart').then(m => ({ default: m.WaterfallSummaryCards })),
  { ssr: false }
)

export const DynamicYieldCurveChart = dynamic(
  () => import('@/components/charts/YieldCurveChart'),
  { ssr: false }
)

export const DynamicNplPriceIndexChart = dynamic(
  () => import('@/components/charts/NplPriceIndexChart'),
  { ssr: false }
)

export const DynamicHeatmapChart = dynamic(
  () => import('@/components/charts/HeatmapChart'),
  { ssr: false }
)

export const DynamicBidRateDistributionChart = dynamic(
  () => import('@/components/charts/BidRateDistributionChart'),
  { ssr: false }
)

// ── AI Chat Widget ───────────────────────────────────────────────────────────

export const DynamicChatWidget = dynamic(
  () => import('@/components/ai-agent/chat-widget').then(m => ({ default: m.ChatWidget })),
  { ssr: false }
)

export const DynamicEnhancedChatWidget = dynamic(
  () => import('@/components/ai-agent/enhanced-chat-widget').then(m => ({
    default: m.EnhancedChatWidget,
  })),
  { ssr: false }
)

// ── Command Palette (uses keyboard event listeners) ──────────────────────────

export const DynamicCommandPalette = dynamic(
  () => import('@/components/command-palette').then(m => ({ default: m.CommandPalette })),
  { ssr: false }
)
