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
   Palette · 공식 McKinsey & Company 칼라 시스템 (2026-04-26 · v2)

   Ref: 사용자 첨부 "맥킨지 칼라참고.pdf" — 공식 McKinsey 코퍼레이트 팔레트.
   원칙:
     1) Deep Navy #051C2C 가 모든 임팩트 패널의 기본 배경 (텍스트는 White)
     2) Electric Blue #2251FF 가 유일한 primary accent (CTA · KPI top accent · 하이라이트)
     3) Cyan #00A9F4 는 dark 배경 위 강조 ("best practice" 끝점)
     4) 데이터 비주얼은 Black → DarkGrey → LightGrey → LightBlue → ElectricBlue 단계 사용
     5) 색을 적게 사용 (semantic 은 회색조에 가깝게 — 채도 죽임)

   ⚠ Backwards-compat: 기존 brass/brassLight/brassDark 키는 유지하되
   값만 Electric Blue + Cyan 으로 remap. 20+ 페이지가 자동으로 새 팔레트 상속.
   ═══════════════════════════════════════════════════════════════════════════ */
export const MCK = {
  // ─ Ink (Deep Navy — McKinsey 코퍼레이트 다크) ────────────
  ink:        "#051C2C",   // primary text + dark panel base
  inkDeep:    "#051C2C",   // hero deep navy (공식 McKinsey #051C2C)
  inkMid:     "#1B3A5C",   // body strong / 서브 톤
  black:      "#000000",   // pure black (gradient endpoint)

  // ─ Paper (배경/표면) ─────────────────────────────────────
  paper:      "#FFFFFF",
  paperTint:  "#FAFBFC",   // subtle off-white
  paperDeep:  "#F4F6F9",   // page tint

  // ─ Electric Blue (PRIMARY ACCENT · McKinsey 시그니처) ───
  electric:    "#2251FF",   // McKinsey Electric Blue (공식 primary accent)
  electricDark:"#1A47CC",   // 흰 배경 WCAG AA 텍스트용
  electricSoft:"rgba(34, 81, 255, 0.10)",  // hover / active surface

  // ─ Cyan (HIGHLIGHT · best-practice end-point) ────────────
  cyan:        "#00A9F4",   // McKinsey Cyan (dark 배경 위 강조)
  cyanSoft:    "rgba(0, 169, 244, 0.14)",

  // ─ Greyscale (lagging → best 데이터 그라데이션) ──────────
  greyDarkest: "#1A1A1A",
  greyDark:    "#4A4A4A",
  greyMid:     "#888888",
  greyLight:   "#C8C8C8",
  greyLightest:"#E8E8E8",
  // 그라데이션 시퀀스 (5-step lagging→best)
  // [black, greyDark, greyLight, electric, cyan]

  // ─ Blue (legacy · 보조 톤) ───────────────────────────────
  blue:       "#2558A0",   // 서브 강조 (legacy)
  blueLight:  "#4F86C7",
  blueBright: "#2251FF",   // alias → electric

  // ─ Brass (BACKWARDS-COMPAT 별칭 · Electric Blue 로 remap) ─
  // ⚠ 새 코드는 electric/cyan 키 사용. 기존 페이지 자동 상속용.
  brass:      "#2251FF",   // → electric (primary accent)
  brassDark:  "#1A47CC",   // → electricDark (white-bg)
  brassLight: "#00A9F4",   // → cyan (dark-bg highlight)

  // ─ Borders & dividers ────────────────────────────────────
  border:        "rgba(5, 28, 44, 0.10)",
  borderStrong:  "rgba(5, 28, 44, 0.18)",
  borderInverse: "rgba(255, 255, 255, 0.18)",

  // ─ Text hierarchy ────────────────────────────────────────
  textSub:    "#4A5568",
  textMuted:  "#718096",
  textInverse:"#E2E8F0",

  // ─ Semantic (McKinsey 톤 — 채도 죽임 · 색 최소 사용) ────
  // McKinsey 는 semantic 컬러도 회색조 가깝게. green/red 강조 회피.
  positive:   "#1F4F46",   // 매우 진한 teal (거의 회녹)
  positiveBg: "rgba(31, 79, 70, 0.08)",
  warning:    "#5A4318",   // 매우 진한 amber (거의 회갈)
  warningBg:  "rgba(90, 67, 24, 0.08)",
  danger:     "#7A1F1F",   // 매우 진한 brick (거의 회적)
  dangerBg:   "rgba(122, 31, 31, 0.08)",
} as const

/* ═══════════════════════════════════════════════════════════════════════════
   McKinsey 데이터 비주얼 그라데이션 (lagging → best practice)
   PDF 참조: 5-step monochrome-to-electric 시퀀스
   ═══════════════════════════════════════════════════════════════════════════ */
export const MCK_GRADIENT = {
  laggingToBest: [
    "#000000",   // 0 · lagging (black)
    "#4A4A4A",   // 1 · below avg (dark grey)
    "#C8C8C8",   // 2 · average (light grey)
    "#00A9F4",   // 3 · above avg (cyan)
    "#2251FF",   // 4 · best practice (electric blue)
  ],
  // 차트용 series order (deep navy 위주, accent 만 cyan/electric)
  chartSeries: [
    "#051C2C",   // primary 시리즈 (deep navy)
    "#2251FF",   // accent (electric)
    "#00A9F4",   // highlight (cyan)
    "#888888",   // baseline (mid grey)
    "#C8C8C8",   // bench (light grey)
  ],
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
  thinAccent: `2px solid ${MCK.electric}`,
  electricAccent: `4px solid ${MCK.electric}`,
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
  borderTop: `2px solid ${opts?.accent ?? MCK.electric}`,
  padding: opts?.padding ?? MCK_GEOMETRY.cardPad,
})

export const mckSerifHeading: React.CSSProperties = {
  fontFamily: MCK_FONTS.serif,
  color: MCK.ink,
  ...MCK_TYPE.hero,
}

export const mckEyebrow = (color: string = MCK.electricDark): React.CSSProperties => ({
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
