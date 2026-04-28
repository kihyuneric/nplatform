// ─── NPLatform Unified Design System ─────────────────────────────────────────
// 모든 페이지가 이 파일의 클래스/토큰을 사용하여 통일된 디자인을 보장합니다.
// 글로벌 최고 수준 (120/100) 기준으로 설계.
//
// 규칙:
// 1. 색상은 반드시 이 파일의 상수 또는 globals.css CSS 변수를 사용
// 2. 글씨 크기는 DS.text.* 클래스만 사용 (text-xs, text-sm 등 직접 사용 금지)
// 3. 카드는 DS.card.* 클래스 사용
// 4. 버튼은 DS.button.* 클래스 사용
// 5. 배지는 DS.badge.* 클래스 사용
// ─────────────────────────────────────────────────────────────────────────────

// ── 페이지 레이아웃 ──────────────────────────────────────────────────────────
export const PAGE = {
  /** 최외곽 배경 */
  wrapper: 'min-h-screen bg-[var(--color-surface-sunken)]',
  /** 콘텐츠 영역 (max-width + padding) */
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  /** 페이지 상단 여백 */
  paddingTop: 'pt-8 sm:pt-10',
  /** 섹션 간격 */
  sectionGap: 'space-y-8',
} as const

// ── 타이포그래피 ─────────────────────────────────────────────────────────────
// 모든 텍스트는 이 클래스를 사용합니다. 직접 text-xs, text-2xl 등 사용 금지.
export const TEXT = {
  // ─ 페이지 제목 (h1) ─
  /** 40px, 800, #0D1F38 — 페이지 메인 제목 */
  pageTitle: 'text-[2.5rem] font-extrabold text-[var(--color-text-primary)] leading-tight tracking-tight',
  /** 32px, 700 — 페이지 서브 제목 */
  pageSubtitle: 'text-[2rem] font-bold text-[var(--color-text-primary)] leading-snug',

  // ─ 섹션 제목 (h2~h3) ─
  /** 26px, 700 — 섹션 제목 */
  sectionTitle: 'text-[1.625rem] font-bold text-[var(--color-text-primary)] leading-snug',
  /** 22px, 600 — 섹션 서브 제목 */
  sectionSubtitle: 'text-[1.375rem] font-semibold text-[var(--color-text-primary)]',

  // ─ 카드/컴포넌트 제목 (h4~h5) ─
  /** 19px, 600 — 카드 제목 */
  cardTitle: 'text-[1.1875rem] font-semibold text-[var(--color-text-primary)]',
  /** 17px, 600 — 카드 서브 제목 */
  cardSubtitle: 'text-[1.0625rem] font-semibold text-[var(--color-text-primary)]',

  // ─ 본문 텍스트 ─
  /** 15px, 400 — 기본 본문 */
  body: 'text-[0.9375rem] text-[var(--color-text-secondary)] leading-relaxed',
  /** 15px, 500 — 강조 본문 */
  bodyMedium: 'text-[0.9375rem] font-medium text-[var(--color-text-secondary)]',
  /** 15px, 600 — 볼드 본문 */
  bodyBold: 'text-[0.9375rem] font-semibold text-[var(--color-text-primary)]',

  // ─ 캡션/메타 ─
  /** 13px, 500 — 설명 텍스트 */
  caption: 'text-[0.8125rem] font-medium text-[var(--color-text-tertiary)]',
  /** 13px, 400 — 보조 설명 */
  captionLight: 'text-[0.8125rem] text-[var(--color-text-muted)]',

  // ─ 라벨/오버라인 ─
  /** 11px, 700 — 라벨, 배지 텍스트, 테이블 헤더 */
  label: 'text-[0.6875rem] font-bold text-[var(--color-text-tertiary)] uppercase',
  /** 11px, 600 — 작은 메타 데이터 */
  micro: 'text-[0.6875rem] font-semibold text-[var(--color-text-muted)]',

  // ─ 데이터/숫자 (Georgia serif, McKinsey editorial 톤) ─
  /** 40px, 800 — 대형 KPI 숫자 */
  metricHero: "text-[2.5rem] font-extrabold text-[#0A1628] tabular-nums leading-none [font-family:Georgia,'Times_New_Roman',serif] tracking-[-0.03em]",
  /** 26px, 700 — 중형 데이터 숫자 */
  metricLarge: "text-[1.625rem] font-extrabold text-[#0A1628] tabular-nums leading-none [font-family:Georgia,'Times_New_Roman',serif] tracking-[-0.02em]",
  /** 19px, 600 — 소형 데이터 숫자 */
  metricMedium: "text-[1.1875rem] font-extrabold text-[#0A1628] tabular-nums [font-family:Georgia,'Times_New_Roman',serif] tracking-[-0.015em]",
  /** 15px, 700 — 카드 내 인라인 숫자 */
  metricSmall: 'text-[0.9375rem] font-extrabold text-[#0A1628] tabular-nums',

  // ─ 링크 ─
  /** 기본 링크 */
  link: 'text-[var(--color-brand-mid)] hover:text-[var(--color-brand-dark)] font-medium transition-colors',

  // ─ 색상 변형 ─
  primary: 'text-[var(--color-text-primary)]',
  secondary: 'text-[var(--color-text-secondary)]',
  tertiary: 'text-[var(--color-text-tertiary)]',
  muted: 'text-[var(--color-text-muted)]',
  inverse: 'text-white',
  brand: 'text-[var(--color-brand-mid)]',
  positive: 'text-[var(--color-positive)]',
  danger: 'text-[var(--color-danger)]',
  warning: 'text-[var(--color-warning)]',
} as const

// ── 카드 (McKinsey White Paper) ──────────────────────────────────────────────
// sharp corners (rounded-none) + paper bg + electric blue top accent (2px)
// 거래소 (/exchange) 와 정합되는 시그니처 톤
export const CARD = {
  /** 기본 카드 (흰 배경, 1px hairline) */
  base: 'bg-white border border-[rgba(5,28,44,0.10)]',
  /** 인터랙티브 카드 (호버 효과) */
  interactive: 'bg-white border border-[rgba(5,28,44,0.10)] hover:shadow-[0_12px_24px_-8px_rgba(5,28,44,0.15),0_4px_8px_-2px_rgba(5,28,44,0.08)] transition-shadow duration-200 cursor-pointer',
  /** 강조 카드 (electric blue top accent — 시그니처) */
  elevated: 'bg-white border border-[rgba(5,28,44,0.10)] border-t-2 border-t-[#2251FF] shadow-[0_8px_18px_-6px_rgba(5,28,44,0.08)]',
  /** 히어로 카드 (가장 강조 — electric top + 그림자) */
  hero: 'bg-white border border-[rgba(5,28,44,0.10)] border-t-[3px] border-t-[#2251FF] shadow-[0_12px_24px_-8px_rgba(5,28,44,0.15)] p-8',
  /** 평면 카드 (그림자 없음, paper-tint 배경) */
  flat: 'bg-[#F8FAFC] border border-[rgba(5,28,44,0.10)]',
  /** 브랜드 다크 카드 (ink + electric top) */
  dark: 'bg-[#0A1628] text-white border-t-2 border-t-[#2251FF] shadow-[0_8px_24px_rgba(10,22,40,0.20)]',
  /** 글래스모피즘 (라이트 배경 호환) */
  glass: 'bg-white/70 backdrop-blur-xl border border-white/30',
  /** 카드 내부 패딩 */
  padding: 'p-5 sm:p-6',
  paddingCompact: 'p-4',
  paddingLarge: 'p-6 sm:p-8',
} as const

// ── 버튼 (McKinsey sharp + ink/electric) ─────────────────────────────────────
export const BUTTON = {
  /** Primary: ink dark + electric top accent (deep navy CTA) */
  primary: 'mck-cta-dark inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0A1628] text-white text-[0.8125rem] font-bold border-t-2 border-t-[#2251FF] shadow-[0_4px_12px_rgba(10,22,40,0.20)] hover:shadow-[0_6px_16px_rgba(34,81,255,0.30)] transition-shadow duration-150',
  /** Secondary: paper + ink border */
  secondary: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white text-[#0A1628] text-[0.8125rem] font-bold border border-[#0A1628] hover:bg-[#F8FAFC] transition-colors duration-150',
  /** Ghost: 텍스트만, hover 시 paper-tint */
  ghost: 'inline-flex items-center justify-center gap-2 px-4 py-2 text-[#0A1628] text-[0.8125rem] font-medium hover:bg-[#F8FAFC] transition-colors duration-150',
  /** Accent: positive (emerald) */
  accent: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-positive)] text-white text-[0.8125rem] font-bold border-t-2 border-t-[#34D399] hover:opacity-90 transition-opacity duration-150',
  /** Danger: 레드 */
  danger: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-danger)] text-white text-[0.8125rem] font-bold hover:opacity-90 transition-opacity duration-150',
  /** 작은 버튼 */
  sm: 'text-[0.75rem] px-3 py-1.5',
  /** 큰 버튼 */
  lg: 'text-[0.9375rem] px-7 py-3.5',
  /** 아이콘 버튼 */
  icon: 'inline-flex items-center justify-center w-11 h-11 hover:bg-[#F8FAFC] text-[rgba(5,28,44,0.55)] hover:text-[#0A1628] transition-colors',
} as const

// ── 배지 ─────────────────────────────────────────────────────────────────────
export const BADGE = {
  positive: 'badge-positive',
  negative: 'badge-negative',
  warning: 'badge-warning',
  info: 'badge-info',
  neutral: 'badge-neutral',
  /** 인라인 배지 (Tailwind) */
  inline: (bg: string, text: string, border: string) =>
    `inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.6875rem] font-bold border ${bg} ${text} ${border}`,
} as const

// ── 통계 카드 (McKinsey paper + electric top) ────────────────────────────────
export const STAT = {
  /** 통계 카드 래퍼 — paper + 1px hairline + electric top accent */
  card: 'bg-white border border-[rgba(5,28,44,0.10)] border-t-2 border-t-[#2251FF] p-5 shadow-[0_4px_10px_-2px_rgba(5,28,44,0.06)]',
  /** 통계 라벨 — electric blue eyebrow */
  label: "text-[0.6875rem] font-extrabold text-[#2251FF] uppercase tracking-[0.10em] mb-1",
  /** 통계 값 — Georgia serif, ink, tabular-nums */
  value: "text-[1.625rem] font-extrabold text-[#0A1628] tabular-nums leading-none [font-family:Georgia,'Times_New_Roman',serif] tracking-[-0.02em]",
  /** 통계 보조 텍스트 */
  sub: 'text-[0.8125rem] text-[rgba(5,28,44,0.55)] mt-1',
} as const

// ── 입력/폼 (McKinsey sharp + electric focus) ────────────────────────────────
export const INPUT = {
  base: "w-full px-4 py-2.5 bg-white border border-[rgba(5,28,44,0.20)] text-[0.9375rem] !text-[#0A1628] placeholder:text-[rgba(5,28,44,0.35)] focus:outline-none focus:border-[#2251FF] focus:border-t-2 focus:shadow-[0_0_0_3px_rgba(34,81,255,0.12)] transition-shadow",
  label: "text-[0.6875rem] font-extrabold text-[#2251FF] uppercase tracking-[0.10em] mb-1.5",
  helper: 'text-[0.75rem] text-[rgba(5,28,44,0.45)] mt-1',
  error: 'text-[0.75rem] text-[var(--color-danger)] mt-1',
} as const

// ── 테이블 (McKinsey paper + ink) ────────────────────────────────────────────
export const TABLE = {
  wrapper: 'overflow-x-auto border border-[rgba(5,28,44,0.10)] border-t-2 border-t-[#2251FF] bg-white',
  header: "text-[0.6875rem] font-extrabold text-[rgba(5,28,44,0.55)] uppercase tracking-[0.10em] bg-[#F8FAFC]",
  headerCell: 'px-4 py-3 text-left',
  row: 'border-b border-[rgba(5,28,44,0.08)] hover:bg-[#F8FAFC] transition-colors',
  cell: 'px-4 py-3.5 text-[0.8125rem] text-[#0A1628]',
  cellMuted: 'px-4 py-3.5 text-[0.8125rem] text-[rgba(5,28,44,0.55)]',
} as const

// ── 탭 (McKinsey ink+paper) ──────────────────────────────────────────────────
export const TABS = {
  /** 탭 리스트 래퍼 — paper card + electric top */
  list: "flex gap-1 p-2 bg-white border border-[rgba(5,28,44,0.10)] border-t-2 border-t-[#2251FF]",
  /** 비활성 탭 */
  trigger: 'px-4 py-2 text-[0.8125rem] font-bold text-[rgba(5,28,44,0.55)] hover:text-[#0A1628] hover:bg-[#F8FAFC] transition-colors',
  /** 활성 탭 — ink + paper text + electric top */
  active: "px-4 py-2 text-[0.8125rem] font-extrabold text-white bg-[#0A1628] border-t-2 border-t-[#2251FF]",
} as const

// ── 페이지 헤더 (McKinsey editorial — 거래소 정합) ───────────────────────────
export const HEADER = {
  /** 페이지 헤더 래퍼 — paper, hairline bottom, generous padding */
  wrapper: 'pb-6 border-b border-[rgba(5,28,44,0.08)] mb-6',
  /** 아이브로우 — electric blue, uppercase, wide tracking */
  eyebrow: "text-[0.6875rem] font-extrabold text-[#2251FF] uppercase tracking-[0.10em] mb-2",
  /** 제목 — Georgia serif, ink, 큰 letter-spacing */
  title: "text-[2.25rem] font-extrabold text-[#0A1628] leading-tight tracking-[-0.025em] [font-family:Georgia,'Times_New_Roman',serif]",
  /** 설명 */
  subtitle: 'text-[0.9375rem] text-[rgba(5,28,44,0.55)] mt-2 max-w-2xl leading-relaxed',
} as const

// ── 필터 바 ──────────────────────────────────────────────────────────────────
export const FILTER = {
  bar: 'flex flex-wrap items-center gap-3 p-4 bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl',
  chip: 'px-3.5 py-1.5 text-[0.8125rem] font-medium rounded-full border transition-all cursor-pointer',
  chipActive: 'bg-[var(--color-brand-dark)] text-white border-[var(--color-brand-dark)]',
  chipInactive: 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border-default)] hover:border-[var(--color-brand-bright)] hover:text-[var(--color-brand-mid)]',
} as const

// ── 빈 상태 ──────────────────────────────────────────────────────────────────
export const EMPTY = {
  wrapper: 'flex flex-col items-center justify-center py-16 text-center',
  icon: 'w-16 h-16 mb-4 text-[var(--color-text-muted)] opacity-40',
  title: 'text-[1.0625rem] font-semibold text-[var(--color-text-primary)] mb-2',
  description: 'text-[0.8125rem] text-[var(--color-text-tertiary)] max-w-sm',
} as const

// ── 구분선 ───────────────────────────────────────────────────────────────────
export const DIVIDER = {
  default: 'border-t border-[var(--color-border-subtle)]',
  strong: 'border-t border-[var(--color-border-default)]',
} as const

// ── 모달/다이얼로그 ──────────────────────────────────────────────────────────
export const MODAL = {
  overlay: 'fixed inset-0 bg-black/40 backdrop-blur-sm z-50',
  content: 'bg-[var(--color-surface-elevated)] rounded-2xl shadow-[var(--shadow-2xl)] border border-[var(--color-border-subtle)] p-6 sm:p-8',
  title: TEXT.sectionTitle,
  description: TEXT.body,
} as const

// ── 리스크 등급 색상 ─────────────────────────────────────────────────────────
export const RISK = {
  A: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'border-l-emerald-500' },
  B: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', accent: 'border-l-blue-500' },
  C: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', accent: 'border-l-amber-500' },
  D: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', accent: 'border-l-orange-500' },
  E: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', accent: 'border-l-red-500' },
} as const

// ── 담보물 유형 배지 색상 ────────────────────────────────────────────────────
export const COLLATERAL = {
  아파트: 'bg-blue-50 text-blue-700 border-blue-200',
  오피스텔: 'bg-purple-50 text-purple-700 border-purple-200',
  상가: 'bg-orange-50 text-orange-700 border-orange-200',
  토지: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  빌라: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  기타: 'bg-slate-50 text-slate-600 border-slate-200',
} as const

// ── 상태 색상 ────────────────────────────────────────────────────────────────
export const STATUS = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  closed: 'bg-slate-50 text-slate-500 border-slate-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
} as const

// ── 유틸리티 ─────────────────────────────────────────────────────────────────
/** 한국 원화 포맷 */
export function formatKRW(n: number): string {
  if (n == null || isNaN(n)) return '-'
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만`
  return `${n.toLocaleString()}원`
}

/** D-Day 계산 */
export function getDDay(deadline: string): { text: string; urgent: boolean; expired: boolean } {
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
  if (days < 0) return { text: '마감', urgent: false, expired: true }
  if (days === 0) return { text: '오늘 마감', urgent: true, expired: false }
  return { text: `D-${days}`, urgent: days <= 3, expired: false }
}

/** 날짜 포맷 */
export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

// ── 버튼 variant 헬퍼 ───────────────────────────────────────────────────────
// 기존 DS.button.primary + DS.button.sm 조합 시 tailwind utility 충돌(!text/!py override) 문제를 해결.
// button('primary', 'sm') 형태로 호출하면 size 별 완전한 class 문자열 반환.
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const BTN_BASE = 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 relative overflow-hidden'
const BTN_GHOST_BASE = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150'

const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-[0.75rem] rounded-md',
  md: 'px-5 py-2.5 text-[0.8125rem] rounded-lg',
  lg: 'px-7 py-3.5 text-[0.9375rem] rounded-xl',
}

const BTN_COLORS: Record<ButtonVariant, string> = {
  primary:   'bg-[var(--color-brand-dark)] text-white shadow-[var(--shadow-brand)] hover:bg-[var(--color-brand-mid)] hover:shadow-[var(--shadow-brand-lg)] hover:-translate-y-0.5 active:translate-y-0',
  secondary: 'bg-[var(--color-surface-elevated)] text-[var(--color-brand-dark)] border border-[var(--color-border-default)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-surface-sunken)] hover:border-[var(--color-border-strong)]',
  ghost:     'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)]',
  accent:    'bg-[var(--color-positive)] text-white shadow-[var(--shadow-sm)] hover:bg-emerald-600 hover:-translate-y-0.5',
  danger:    'bg-[var(--color-danger)] text-white shadow-[var(--shadow-sm)] hover:bg-red-600',
}

export function button(variant: ButtonVariant, size: ButtonSize = 'md'): string {
  const base = variant === 'ghost' ? BTN_GHOST_BASE : BTN_BASE
  return `${base} ${BTN_SIZE[size]} ${BTN_COLORS[variant]}`
}

// ── 통합 export ──────────────────────────────────────────────────────────────
export const DS = {
  page: PAGE,
  text: TEXT,
  card: CARD,
  button: BUTTON,
  btn: button,
  badge: BADGE,
  stat: STAT,
  input: INPUT,
  table: TABLE,
  tabs: TABS,
  header: HEADER,
  filter: FILTER,
  empty: EMPTY,
  divider: DIVIDER,
  modal: MODAL,
  risk: RISK,
  collateral: COLLATERAL,
  status: STATUS,
} as const

export default DS
