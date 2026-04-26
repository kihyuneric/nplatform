/**
 * lib/mck-design.ts
 *
 * NPLatform 전역 McKinsey 디자인 시스템 SSoT (2026-04-26 · v1)
 *
 * 모든 (main) 라우트가 일관된 McKinsey 화이트 페이퍼 룩앤필을 갖도록
 * components/asset-detail/deal-flow-view.tsx 의 검증된 팔레트/타이포그래피를
 * 단일 모듈로 추출. 페이지 전환 시 디자인 분기가 보이지 않도록 강제.
 *
 * 사용:
 *   import { MCK, MCK_FONTS, mckPaperBackground } from "@/lib/mck-design"
 *   <h1 style={{ fontFamily: MCK_FONTS.serif, color: MCK.ink }}>...</h1>
 *
 * 컴포넌트 빌드 블록은 components/mck/ 참조.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   Palette · 진짜 McKinsey 화이트 페이퍼 (mckinsey.com 매칭)
   ═══════════════════════════════════════════════════════════════════════════ */
export const MCK = {
  // ─ Ink (텍스트/제목/네이비) ──────────────────────────────
  ink:        "#0A1628",   // primary text
  inkDeep:    "#051C2C",   // hero deep navy
  inkMid:     "#1B3A5C",   // body strong

  // ─ Paper (배경/표면) ─────────────────────────────────────
  paper:      "#FFFFFF",
  paperTint:  "#FAFBFC",   // subtle off-white
  paperDeep:  "#F4F6F9",   // page tint

  // ─ Brass (악센트 · 골드) ─────────────────────────────────
  brass:      "#B8924B",   // primary accent
  brassDark:  "#8B6F2F",   // brass on white (WCAG AA)
  brassLight: "#E5C77A",   // brass on navy (Header decorations)

  // ─ Blue (interactive · McKinsey bright blue) ────────────
  blue:       "#2558A0",   // brand blue (서브 강조)
  blueLight:  "#4F86C7",
  blueBright: "#2251FF",   // McKinsey real bright blue

  // ─ Borders & dividers ────────────────────────────────────
  border:        "rgba(10, 22, 40, 0.10)",
  borderStrong:  "rgba(10, 22, 40, 0.18)",
  borderInverse: "rgba(255, 255, 255, 0.18)",

  // ─ Text hierarchy ────────────────────────────────────────
  textSub:    "#4A5568",
  textMuted:  "#718096",
  textInverse:"#E2E8F0",

  // ─ Semantic (McKinsey 차분 톤) ───────────────────────────
  positive:   "#0F766E",   // McKinsey 진한 teal (밝은 green 회피)
  positiveBg: "rgba(15, 118, 110, 0.10)",
  warning:    "#92400E",   // McKinsey 진한 amber (밝은 yellow 회피)
  warningBg:  "rgba(146, 64, 14, 0.10)",
  danger:     "#B91C1C",
  dangerBg:   "rgba(185, 28, 28, 0.10)",
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   Typography · McKinsey 매칭
     - 헤딩: Georgia Serif (mckinsey.com 실측)
     - 본문: -apple-system / Segoe UI sans-serif
     - 모노: 숫자 정렬 + 코드
   ═══════════════════════════════════════════════════════════════════════════ */
export const MCK_FONTS = {
  serif:
    'Georgia, "Times New Roman", "Noto Serif KR", serif',
  sans:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  mono:
    'ui-monospace, SFMono-Regular, "JetBrains Mono", Consolas, monospace',
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   Type Scale · McKinsey 화이트 페이퍼 (px)
   ═══════════════════════════════════════════════════════════════════════════ */
export const MCK_TYPE = {
  // Hero / H1
  hero:      { fontSize: "clamp(2.25rem, 4.2vw, 3.25rem)", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.1 },
  h1:        { fontSize: "clamp(2rem, 3.6vw, 2.75rem)",   fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15 },
  h2:        { fontSize: "clamp(1.5rem, 2.5vw, 1.875rem)", fontWeight: 700, letterSpacing: "-0.02em",  lineHeight: 1.2 },
  h3:        { fontSize: 17,  fontWeight: 700, letterSpacing: "-0.015em" },
  // Eyebrow (small uppercase)
  eyebrow:   { fontSize: 11,  fontWeight: 700, letterSpacing: "0.10em",  textTransform: "uppercase" as const },
  eyebrowLg: { fontSize: 13,  fontWeight: 800, letterSpacing: "0.12em",  textTransform: "uppercase" as const },
  // KPI 숫자
  kpi:       { fontSize: 22,  fontWeight: 800, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" as const, lineHeight: 1.1 },
  kpiLg:     { fontSize: 28,  fontWeight: 800, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" as const, lineHeight: 1.0 },
  // Body
  body:      { fontSize: 14,  fontWeight: 400, lineHeight: 1.55 },
  bodySm:    { fontSize: 12,  fontWeight: 500, lineHeight: 1.5 },
  bodyXs:    { fontSize: 11,  fontWeight: 500, lineHeight: 1.45 },
  // Label
  label:     { fontSize: 10,  fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" as const },
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   Spacing & Geometry
   ═══════════════════════════════════════════════════════════════════════════ */
export const MCK_GEOMETRY = {
  pageMaxWidth: 1280,
  contentPad: 24,
  // McKinsey 화이트 페이퍼 — sharp corners (no rounded), thin top accent
  borderRadius: 0,
  cardPad: 22,
  sectionGap: 48,
  divider: `1px solid ${MCK.border}`,
  thinAccent: `2px solid ${MCK.brass}`,
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   Reusable inline-style snippets
   ═══════════════════════════════════════════════════════════════════════════ */
export const mckPaperBackground = (variant: "tint" | "white" | "deep" = "tint"): React.CSSProperties => ({
  background: variant === "tint" ? MCK.paperTint : variant === "deep" ? MCK.paperDeep : MCK.paper,
  minHeight: "100vh",
})

export const mckCard = (opts?: { accent?: string; padding?: number }): React.CSSProperties => ({
  background: MCK.paper,
  border: `1px solid ${MCK.border}`,
  borderTop: `2px solid ${opts?.accent ?? MCK.brass}`,
  padding: opts?.padding ?? MCK_GEOMETRY.cardPad,
})

export const mckSerifHeading: React.CSSProperties = {
  fontFamily: MCK_FONTS.serif,
  color: MCK.ink,
  ...MCK_TYPE.hero,
}

export const mckEyebrow = (color: string = MCK.brassDark): React.CSSProperties => ({
  color,
  ...MCK_TYPE.eyebrow,
})

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */
/** 천 단위 콤마 + ₩ KRW 단위(억/만원) */
export function formatKRW(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)}억`
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`
  return n.toLocaleString("ko-KR")
}

/** %, 1 decimal */
export function formatPct(n: number | null | undefined, decimals = 1): string {
  if (n == null || !Number.isFinite(n)) return "—"
  return `${n.toFixed(decimals)}%`
}
