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

  // ─ 데이터/숫자 ─
  /** 40px, 800 — 대형 KPI 숫자 */
  metricHero: 'text-[2.5rem] font-extrabold text-[var(--color-text-primary)] tabular-nums leading-none',
  /** 26px, 700 — 중형 데이터 숫자 */
  metricLarge: 'text-[1.625rem] font-bold text-[var(--color-text-primary)] tabular-nums leading-none',
  /** 19px, 600 — 소형 데이터 숫자 */
  metricMedium: 'text-[1.1875rem] font-semibold text-[var(--color-text-primary)] tabular-nums',
  /** 15px, 700 — 카드 내 인라인 숫자 */
  metricSmall: 'text-[0.9375rem] font-bold text-[var(--color-text-primary)] tabular-nums',

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

// ── 카드 ─────────────────────────────────────────────────────────────────────
export const CARD = {
  /** 기본 카드 (흰 배경, 미세 그림자) */
  base: 'bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl shadow-[var(--shadow-sm)]',
  /** 인터랙티브 카드 (호버 효과) */
  interactive: 'bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer',
  /** 강조 카드 (큰 그림자) */
  elevated: 'bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-2xl shadow-[var(--shadow-md)]',
  /** 히어로 카드 (가장 큰 그림자, 가장 큰 radius) */
  hero: 'bg-[var(--color-surface-elevated)] border border-[var(--color-border-default)] rounded-2xl shadow-[var(--shadow-xl)] p-8',
  /** 평면 카드 (그림자 없음) */
  flat: 'bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-xl',
  /** 브랜드 다크 카드 */
  dark: 'bg-[var(--color-brand-dark)] text-white rounded-xl shadow-[var(--shadow-brand)]',
  /** 글래스모피즘 */
  glass: 'bg-white/60 backdrop-blur-xl border border-white/20 rounded-xl',
  /** 카드 내부 패딩 */
  padding: 'p-5 sm:p-6',
  paddingCompact: 'p-4',
  paddingLarge: 'p-6 sm:p-8',
} as const

// ── 버튼 ─────────────────────────────────────────────────────────────────────
export const BUTTON = {
  /** Primary: 진한 네이비, 흰 텍스트 */
  primary: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-brand-dark)] text-white text-[0.8125rem] font-semibold rounded-lg shadow-[var(--shadow-brand)] hover:bg-[var(--color-brand-mid)] hover:shadow-[var(--shadow-brand-lg)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 relative overflow-hidden',
  /** Secondary: 흰 배경, 테두리 */
  secondary: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-surface-elevated)] text-[var(--color-brand-dark)] text-[0.8125rem] font-semibold rounded-lg border border-[var(--color-border-default)] shadow-[var(--shadow-xs)] hover:bg-[var(--color-surface-sunken)] hover:border-[var(--color-border-strong)] transition-all duration-150 relative overflow-hidden',
  /** Ghost: 텍스트만 */
  ghost: 'inline-flex items-center justify-center gap-2 px-4 py-2 text-[var(--color-text-secondary)] text-[0.8125rem] font-medium rounded-lg hover:bg-[var(--color-surface-sunken)] hover:text-[var(--color-text-primary)] transition-all duration-150',
  /** Accent: 에메랄드 */
  accent: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-positive)] text-white text-[0.8125rem] font-semibold rounded-lg shadow-[var(--shadow-sm)] hover:bg-emerald-600 hover:-translate-y-0.5 transition-all duration-150',
  /** Danger: 레드 */
  danger: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-danger)] text-white text-[0.8125rem] font-semibold rounded-lg shadow-[var(--shadow-sm)] hover:bg-red-600 transition-all duration-150',
  /** 작은 버튼 */
  sm: 'text-[0.75rem] px-3 py-1.5 rounded-md',
  /** 큰 버튼 */
  lg: 'text-[0.9375rem] px-7 py-3.5 rounded-xl',
  /** 아이콘 버튼 */
  icon: 'inline-flex items-center justify-center w-11 h-11 rounded-lg hover:bg-[var(--color-surface-sunken)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors',
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

// ── 통계 카드 ────────────────────────────────────────────────────────────────
export const STAT = {
  /** 통계 카드 래퍼 */
  card: 'bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] rounded-xl p-5 shadow-[var(--shadow-sm)]',
  /** 통계 라벨 */
  label: 'text-[0.6875rem] font-bold text-[var(--color-text-tertiary)] uppercase mb-1',
  /** 통계 값 */
  value: 'text-[1.625rem] font-bold text-[var(--color-text-primary)] tabular-nums leading-none',
  /** 통계 보조 텍스트 */
  sub: 'text-[0.8125rem] text-[var(--color-text-muted)] mt-1',
} as const

// ── 입력/폼 ──────────────────────────────────────────────────────────────────
// 입력 텍스트 색상은 반드시 명시적(text-slate-900)으로 둬서
// 다크모드/OS 기본 스타일 때문에 흰색으로 보이지 않도록 방지.
export const INPUT = {
  base: 'w-full px-4 py-2.5 bg-white border border-[var(--color-border-default)] rounded-lg text-[0.9375rem] !text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-bright)] focus:border-transparent transition-all',
  label: 'text-[0.8125rem] font-semibold text-[var(--color-text-primary)] mb-1.5',
  helper: 'text-[0.75rem] text-[var(--color-text-muted)] mt-1',
  error: 'text-[0.75rem] text-[var(--color-danger)] mt-1',
} as const

// ── 테이블 ───────────────────────────────────────────────────────────────────
export const TABLE = {
  wrapper: 'overflow-x-auto rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]',
  header: 'text-[0.6875rem] font-bold text-[var(--color-text-tertiary)] uppercase bg-[var(--color-surface-sunken)]',
  headerCell: 'px-4 py-3 text-left',
  row: 'border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-sunken)] transition-colors',
  cell: 'px-4 py-3.5 text-[0.8125rem] text-[var(--color-text-primary)]',
  cellMuted: 'px-4 py-3.5 text-[0.8125rem] text-[var(--color-text-tertiary)]',
} as const

// ── 탭 ───────────────────────────────────────────────────────────────────────
export const TABS = {
  /** 탭 리스트 래퍼 */
  list: 'flex gap-1 p-1 bg-[var(--color-surface-sunken)] rounded-xl',
  /** 비활성 탭 */
  trigger: 'px-4 py-2 text-[0.8125rem] font-medium text-[var(--color-text-tertiary)] rounded-lg transition-all hover:text-[var(--color-text-primary)] hover:bg-white/50',
  /** 활성 탭 */
  active: 'px-4 py-2 text-[0.8125rem] font-semibold text-[var(--color-brand-dark)] bg-white rounded-lg shadow-[var(--shadow-sm)]',
} as const

// ── 페이지 헤더 ──────────────────────────────────────────────────────────────
export const HEADER = {
  /** 페이지 헤더 래퍼 (히어로 없는 일반 페이지) */
  wrapper: 'pb-6 border-b border-[var(--color-border-subtle)] mb-8',
  /** 아이브로우 (카테고리 표시) */
  eyebrow: 'text-[0.6875rem] font-bold text-[var(--color-brand-mid)] uppercase tracking-wider mb-2',
  /** 제목 + 설명 */
  title: TEXT.pageTitle,
  subtitle: 'text-[1.0625rem] text-[var(--color-text-secondary)] mt-2 max-w-2xl leading-relaxed',
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

// ── 통합 export ──────────────────────────────────────────────────────────────
export const DS = {
  page: PAGE,
  text: TEXT,
  card: CARD,
  button: BUTTON,
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
