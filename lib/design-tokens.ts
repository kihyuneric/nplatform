// ─── NPLatform Design Tokens (Runtime) ──────────────────────────────────────
// Single Source of Truth for design primitives, exposed to JS/TS runtime.
//
// This module mirrors the CSS variables defined in `app/globals.css` so they
// can be consumed from JS contexts where CSS variables don't reach: chart
// libraries (recharts/echarts), framer-motion variants, canvas/SVG rendering,
// dynamic inline styles, and theme-aware color math.
//
// Authoring rules:
// 1. Never inline raw hex/px in components — import from this file or use the
//    CSS variable via `var(--color-…)`.
// 2. When a token changes, update BOTH this file and `globals.css` together.
// 3. Class-based composition lives in `lib/design-system.ts` — this file is
//    for *primitives* only.
// ─────────────────────────────────────────────────────────────────────────────

// ── Brand color scale ───────────────────────────────────────────────────────
export const brand = {
  deepest: '#060E1C',
  deep:    '#0D1F38',
  dark:    '#1B3A5C',
  mid:     '#2558A0',
  bright:  '#3B82F6',
  light:   '#93C5FD',
} as const

// ── Semantic colors ─────────────────────────────────────────────────────────
export const semantic = {
  positive:     '#10B981',
  positiveBg:   '#ECFDF5',
  positiveDark: '#065F46',
  warning:      '#F59E0B',
  warningBg:    '#FFFBEB',
  danger:       '#EF4444',
  dangerBg:     '#FEF2F2',
  info:         '#3B82F6',
  infoBg:       '#EFF6FF',
} as const

// ── Surfaces ────────────────────────────────────────────────────────────────
export const surface = {
  base:     '#FAFBFC',
  elevated: '#FFFFFF',
  sunken:   '#F2F4F7',
  overlay:  'rgba(255, 255, 255, 0.85)',
} as const

// ── Text colors ─────────────────────────────────────────────────────────────
export const text = {
  primary:   '#0D1F38',
  secondary: '#4A5568',
  tertiary:  '#718096',
  muted:     '#A0AEC0',
  inverse:   '#FFFFFF',
} as const

// ── Borders ─────────────────────────────────────────────────────────────────
export const border = {
  subtle:  '#E8EDF3',
  default: '#D0D8E4',
  strong:  '#9DAAB8',
} as const

// ── Type scale (rem) ────────────────────────────────────────────────────────
export const fontSize = {
  xs:   '0.6875rem', // 11px
  sm:   '0.8125rem', // 13px
  base: '0.9375rem', // 15px
  md:   '1.0625rem', // 17px
  lg:   '1.1875rem', // 19px
  xl:   '1.375rem',  // 22px
  '2xl':'1.625rem',  // 26px
  '3xl':'2rem',      // 32px
  '4xl':'2.5rem',    // 40px
  '5xl':'3.25rem',   // 52px
  '6xl':'4.25rem',   // 68px
} as const

export const fontWeight = {
  regular:  400,
  medium:   500,
  semibold: 600,
  bold:     700,
  extrabold:800,
} as const

export const lineHeight = {
  tight:   1.15,
  snug:    1.3,
  normal:  1.5,
  relaxed: 1.65,
} as const

// ── Spacing (4px grid) ──────────────────────────────────────────────────────
export const space = {
  0:  '0',
  1:  '0.25rem',
  2:  '0.5rem',
  3:  '0.75rem',
  4:  '1rem',
  5:  '1.25rem',
  6:  '1.5rem',
  8:  '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
} as const

// ── Radius ──────────────────────────────────────────────────────────────────
export const radius = {
  sm:   '0.25rem',
  md:   '0.5rem',
  lg:   '0.75rem',
  xl:   '1rem',
  '2xl':'1.25rem',
  '3xl':'1.75rem',
  full: '9999px',
} as const

// ── Elevation (shadows) ─────────────────────────────────────────────────────
export const shadow = {
  xs:       '0 1px 2px rgba(13,31,56,0.04), 0 0 1px rgba(13,31,56,0.02)',
  sm:       '0 1px 3px rgba(13,31,56,0.06), 0 1px 2px rgba(13,31,56,0.04)',
  md:       '0 4px 12px rgba(13,31,56,0.08), 0 2px 4px rgba(13,31,56,0.04)',
  lg:       '0 8px 24px rgba(13,31,56,0.10), 0 4px 8px rgba(13,31,56,0.06)',
  xl:       '0 16px 48px rgba(13,31,56,0.14), 0 8px 16px rgba(13,31,56,0.08)',
  '2xl':    '0 32px 80px rgba(13,31,56,0.18), 0 16px 32px rgba(13,31,56,0.10)',
  brand:    '0 4px 20px rgba(27,58,92,0.25)',
  brandLg:  '0 8px 40px rgba(27,58,92,0.35)',
  glowGreen:'0 0 24px rgba(16,185,129,0.25)',
  glowBlue: '0 0 24px rgba(59,130,246,0.25)',
} as const

// ── Z-index layers ──────────────────────────────────────────────────────────
export const zIndex = {
  base:        0,
  raised:      10,
  dropdown:    1000,
  sticky:      1100,
  banner:      1200,
  overlay:     1300,
  modal:       1400,
  popover:     1500,
  toast:       1600,
  tooltip:     1700,
  notification:1800,
} as const

// ── Motion (framer-motion / CSS transitions) ────────────────────────────────
export const duration = {
  instant: 0.1,
  fast:    0.15,
  base:    0.22,
  slow:    0.35,
  slower:  0.5,
} as const

export const easing = {
  // cubic-bezier values used across the app
  standard: [0.16, 1, 0.3, 1] as const,        // page-enter
  decelerate:[0, 0, 0.2, 1] as const,
  accelerate:[0.4, 0, 1, 1] as const,
  spring:   { type: 'spring', stiffness: 320, damping: 28 } as const,
} as const

// ── Breakpoints (Tailwind defaults, mirrored for JS) ────────────────────────
export const breakpoint = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const

// ── Domain palettes (NPL/부동산) ────────────────────────────────────────────

/** 리스크 등급 A~E · McKinsey White Paper 톤
 *  멀티컬러 X — 모든 등급 흰 종이 + ink 검정 + brass 1점.
 *  차별화는 grade letter weight + small brass accent + 보더 두께로.
 *  E(Critical)만 ink(검정) bg + 흰 fg = 알림 강조. */
export const riskPalette = {
  A: { fg: '#0A1628', bg: '#FFFFFF', border: '#B8924B' },   // brass border = 안정 강조
  B: { fg: '#0A1628', bg: '#FFFFFF', border: '#B8924B' },
  C: { fg: '#0A1628', bg: '#FFFFFF', border: 'rgba(5, 28, 44, 0.20)' },
  D: { fg: '#0A1628', bg: '#FAFAFA', border: '#0A1628' },   // 진한 ink border = 주의
  E: { fg: '#FFFFFF', bg: '#0A1628', border: '#0A1628' },   // ink bg + 흰 fg = critical
} as const

/** 담보물 유형 색상 — 지도 마커, 차트 카테고리 */
export const collateralPalette = {
  아파트:   '#2558A0',
  오피스텔: '#7C3AED',
  상가:     '#EA580C',
  토지:     '#059669',
  빌라:     '#0891B2',
  기타:     '#64748B',
} as const

/** 거래 단계(8-stage funnel) 색상 — 칸반/타임라인 */
export const dealStagePalette = {
  등록:    '#94A3B8',
  Teaser:  '#3B82F6',
  '권한 부여': '#6366F1',
  딜룸:    '#2558A0',
  LOI:     '#8B5CF6',
  매칭:    '#EC4899',
  계약:    '#F59E0B',
  정산:    '#10B981',
} as const

/** 차트 시리즈 기본 팔레트 — recharts/echarts 시리즈 색 순환 */
export const chartSeries = [
  '#2558A0',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#0891B2',
  '#EC4899',
  '#64748B',
] as const

// ── Helper: get CSS variable reference ──────────────────────────────────────
/**
 * Use when writing inline styles that should follow theme switching.
 * `cssVar('color-brand-mid')` → `'var(--color-brand-mid)'`
 */
export const cssVar = (name: string): string => `var(--${name})`

// ── Aggregated export ───────────────────────────────────────────────────────
export const tokens = {
  brand,
  semantic,
  surface,
  text,
  border,
  fontSize,
  fontWeight,
  lineHeight,
  space,
  radius,
  shadow,
  zIndex,
  duration,
  easing,
  breakpoint,
  riskPalette,
  collateralPalette,
  dealStagePalette,
  chartSeries,
} as const

export type Tokens = typeof tokens
export default tokens
