# Phase H · 글로벌 핀테크급 디자인 시스템 재구축

**Status**: 🟡 기획 단계
**작성일**: 2026-04-24
**대상 벤치마크**: Coinbase · Stripe · Toss · Revolut · Interactive Brokers
**수석 디자이너 프린시플**: "AI-스러운 맥락 없는 보편적 톤"을 버리고, **금융 서비스의 신뢰 · 정확성 · 고급감** 을 언어로.

---

## 0. 현황 진단 (2026-04-24 기준)

### ✅ 이미 잘 된 부분
- `next-themes` 기반 라이트/다크 토글 인프라 (defaultTheme=light, storageKey=nplatform-theme)
- 비로그인 사용자에게도 테마 토글 노출 (`navigation.tsx` L604)
- Anti-FOUC 스크립트로 초기 테마 깜빡임 차단
- 일부 CSS 변수 토큰 정립 (`--color-brand-*`, `--color-text-*`, `--surface-*`)
- Pretendard 폰트 + fallback 체인 구축
- shadcn/ui + Radix 기반 Base 컴포넌트

### ❌ 문제점 4가지

| # | 문제 | 증상 |
|---|---|---|
| **1** | **디자인 토큰 불완전** | `bg-[#0A1628]` 등 색상 하드코딩 산재 · 라이트 모드에서 일부 섹션 다크로 고정 (메인 Seller 카드 등) |
| **2** | **컴포넌트 계층 붕괴** | Modal · Form · Input 이 페이지마다 재구현 · Input/Modal 안 폼이 다른 스타일 |
| **3** | **다크모드 설계 미숙** | `.dark` 오버라이드만으로 대응 · 대비(Contrast) 설계 없음 · Surface 깊이 표현 부실 |
| **4** | **모바일 대응 부족** | 터치 영역 <44px · Modal → Bottom Sheet 전환 없음 · breakpoint 기준 불통일 |

---

## 1. 목표 · 기준

> **NPLatform = 글로벌 핀테크 수준 UI/UX 시스템화**

| 축 | 지표 |
|---|---|
| **일관성** | 동일 컴포넌트(Button · Input · Modal) 페이지 전반 단일 구현 |
| **가독성** | WCAG AA 대비 4.5:1 이상 · tabular-nums 고정 금융 수치 |
| **신뢰감** | 금융 브랜드 톤 (네이비·에메랄드) · 과장된 그라디언트·이모지 금지 |
| **고급감** | 여백(spacing) · 타이포 위계 · shadow 깊이 표현으로 프리미엄 톤 |
| **접근성** | 키보드 내비게이션 · focus-visible · 스크린리더 레이블 전수 적용 |

---

## 2. Design Token (단일 진원지)

### 2.1 Color System (Semantic Tokens)

```ts
// lib/design-tokens.ts (기존 확장)
export const COLOR_TOKENS = {
  // ─ Brand ─
  brand: {
    deepest: '#060E1C',   // 최심부 네이비
    deep:    '#0D1F38',
    dark:    '#1B3A5C',   // Primary
    mid:     '#2558A0',   // Secondary
    bright:  '#3B82F6',   // Accent
    light:   '#93C5FD',
  },
  // ─ Semantic ─
  semantic: {
    positive: '#10B981',   // 에메랄드 (수익·승인)
    warning:  '#F59E0B',   // 앰버 (주의)
    danger:   '#F43F5E',   // 로즈 (위험·실패)
    info:     '#3B82F6',
  },
  // ─ Neutral (Light / Dark 이원) ─
  neutral: {
    light: {
      bg:      { base: '#FFFFFF', deep: '#F8FAFC', deepest: '#F1F5F9' },
      surface: { base: '#FFFFFF', elevated: '#F8FAFC', overlay: '#F1F5F9' },
      text:    { primary: '#0F172A', secondary: '#475569', tertiary: '#94A3B8', muted: '#CBD5E1' },
      border:  { subtle: '#E2E8F0', default: '#CBD5E1', strong: '#94A3B8' },
    },
    dark: {
      bg:      { base: '#0D1F38', deep: '#060E1C', deepest: '#040C18' },
      surface: { base: '#0A1628', elevated: '#0D1F38', overlay: '#122643' },
      text:    { primary: '#F1F5F9', secondary: '#CBD5E1', tertiary: '#94A3B8', muted: '#64748B' },
      border:  { subtle: '#1E293B', default: '#334155', strong: '#475569' },
    },
  },
} as const
```

### 2.2 CSS Variables (globals.css)

라이트/다크는 **class 분기** (`html.dark`). 컴포넌트는 `var(--color-*)` 만 참조 (하드코딩 금지).

```css
:root {
  /* Light mode */
  --color-bg-base: #FFFFFF;
  --color-surface-base: #FFFFFF;
  --color-surface-elevated: #F8FAFC;
  --color-surface-overlay: #F1F5F9;
  --color-text-primary: #0F172A;
  --color-text-secondary: #475569;
  --color-border-subtle: #E2E8F0;

  /* Semantic */
  --color-positive: #10B981;
  --color-danger:   #F43F5E;
  --color-warning:  #F59E0B;

  /* Elevation (라이트 shadow) */
  --shadow-level-1: 0 1px 2px rgba(13,31,56,0.04);
  --shadow-level-2: 0 4px 12px rgba(13,31,56,0.08);
  --shadow-level-3: 0 12px 32px rgba(13,31,56,0.14);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;

  /* Spacing (scale: 4 8 12 16 24 32 48) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;  --space-4: 16px;
  --space-5: 24px; --space-6: 32px; --space-7: 48px;
}

.dark {
  --color-bg-base: #0D1F38;
  --color-surface-base: #0A1628;
  --color-surface-elevated: #0D1F38;
  --color-surface-overlay: #122643;
  --color-text-primary: #F1F5F9;
  --color-text-secondary: #CBD5E1;
  --color-border-subtle: #1E293B;

  /* 다크 shadow 는 투명도 확대 + 위쪽 highlight 1px */
  --shadow-level-1: 0 1px 2px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04);
  --shadow-level-2: 0 4px 12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05);
  --shadow-level-3: 0 12px 32px rgba(0,0,0,0.70), inset 0 1px 0 rgba(255,255,255,0.06);
}
```

### 2.3 Typography

```ts
export const TYPOGRAPHY = {
  fontFamily: 'var(--font-pretendard), -apple-system, BlinkMacSystemFont, system-ui, "Apple SD Gothic Neo", sans-serif',
  scale: {
    display:  { size: '44px', weight: 800, line: 1.1,  tracking: '-0.02em' },  // 히어로
    h1:       { size: '32px', weight: 700, line: 1.2,  tracking: '-0.015em' },
    h2:       { size: '24px', weight: 600, line: 1.3,  tracking: '-0.01em' },
    h3:       { size: '20px', weight: 600, line: 1.4 },
    body:     { size: '15px', weight: 400, line: 1.6 },
    bodyBold: { size: '15px', weight: 600, line: 1.6 },
    caption:  { size: '13px', weight: 400, line: 1.5 },
    tiny:     { size: '11px', weight: 500, line: 1.4, tracking: '0.02em' },    // 라벨·배지
  },
  // 금융 수치 전용: tabular-nums 강제
  numeric: { fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"' },
}
```

---

## 3. Component Hierarchy (Level 1~4)

### Level 1 · Base UI (`components/ui/`)
- `Button` (primary · secondary · ghost · danger · link)
- `Input` (default · focus · disabled · error)
- `Select`, `Checkbox`, `Switch`, `Radio`
- `Badge`, `Tag`, `Avatar`, `Skeleton`

**불변 규칙**: `height: 44px`, `padding: 12px 14px`, `border: 1px solid var(--color-border-default)`, focus 시 `box-shadow: 0 0 0 3px rgba(brand-bright, 0.25)`.

### Level 2 · Form System (`components/form/`)
- `FormField` (wrap: Label + Input + HelpText + ErrorText)
- `InputGroup` (prefix/suffix · 복수 input 조합)
- `FieldArray` (동적 추가/삭제)
- `FormSection` (섹션 헤더 + 그룹)

**원칙**: 모달 안 폼, 페이지 폼, 딜룸 폼 **모두 동일 FormField 사용**. 스타일 재선언 금지.

### Level 3 · Container (`components/layout/`)
- `Card` (level-1 / level-2 / level-3 shadow 분기)
- `Panel` (좌우 분할 · 사이드바 콘텐츠)
- `Section` (헤더 + caption + 콘텐츠)
- `Tabs` (Radix 기반)

### Level 4 · Overlay (`components/overlay/`)
- `Modal` (≥768px) ↔ `BottomSheet` (<768px) 자동 분기
- `Drawer`, `Popover`, `Tooltip`
- `CommandPalette` (Cmd+K)

**Modal 스크롤 포지셔닝 버그** (현재 이슈) → 신규 Modal 에서 `scrollToTop()` 을 content ref 로 보장.

---

## 4. Dark Mode · Contrast 설계

### ❌ 기존 (뒤집기 방식)
```css
.dark body { background: black; color: white; }
```

### ✅ 새 방식 (Surface Hierarchy · 6단계)
```
Base     → #040C18  (최심부 / 페이지 배경)
Deep     → #060E1C  (고정 헤더)
Surface  → #0A1628  (메인 콘텐츠 배경)
Elevated → #0D1F38  (카드)
Overlay  → #122643  (Modal · Popover)
Highlight → #1B3A5C  (hover · focus)
```

WCAG AA 보장:
- Text Primary (#F1F5F9) on Surface (#0A1628) → Contrast 16.5:1 ✅
- Text Secondary (#CBD5E1) on Surface → 11.2:1 ✅
- Text Tertiary (#94A3B8) on Elevated → 5.8:1 ✅

**규칙**: 다크 모드 카드는 `box-shadow` 대신 `border + inset highlight` 로 깊이 표현.

---

## 5. Mobile Responsive 전략

### Breakpoints (Tailwind 확장)
```ts
const breakpoints = {
  sm: '640px',   // mobile landscape
  md: '768px',   // tablet
  lg: '1024px',  // desktop
  xl: '1280px',  // wide
  '2xl': '1536px',
}
```

### 핵심 UX 규칙
- 버튼 · 터치 영역 최소 **48px × 48px**
- 모바일에서 Modal → **Bottom Sheet** 자동 전환
- 리스트 아이템 최소 높이 60px (터치 오조작 방지)
- 입력 필드 자동 zoom 방지 → `font-size: 16px` 최소

---

## 6. 구현 로드맵 (7-스프린트 계획)

### H1 · Token Foundation (1주)
- `lib/design-tokens.ts` 확장 · 전체 토큰 단일 진원지
- `globals.css` 재구성 · light/dark 이원 · 하드코딩 색상 전수 조사 및 교체 (`grep bg-\\[#` → 전수)
- 커버리지 지표: **100% 토큰 사용** (하드코딩 0건)

### H2 · Typography & Spacing (0.5주)
- `<Type variant="h1|h2|body|caption">` 컴포넌트 도입
- Spacing 유틸 클래스 `space-{1~7}` Tailwind plugin 등록
- 페이지별 수동 타이포 스타일 전수 교체

### H3 · Level 1 Primitives 재작성 (1주)
- `Button`, `Input`, `Select`, `Checkbox`, `Switch`, `Radio`, `Badge` 통일
- 기존 shadcn 스타일 wrapping · NPLatform 전용 토큰 주입

### H4 · Form System (1주)
- `FormField` · `InputGroup` · `FormSection` 공용 구현
- 기존 모든 폼 (sell · auction · analysis · profile · signup) **FormField 기반으로 리팩터**

### H5 · Modal & Bottom Sheet (0.5주)
- `Modal` 신규 구현 (content ref 기반 scroll-to-top 자동)
- `BottomSheet` 컴포넌트 · `<768px` 에서 Modal 이 자동 치환
- 기존 모달 전수 교체 (sell `AuctionOptIn`, analysis `InputEdit`, admin `Confirm` 등)

### H6 · 다크모드 Pass 2 (0.5주)
- Surface Hierarchy 6단계 전수 적용
- `box-shadow` → `border + inset` 변환
- 대비 자동 검사 스크립트 (`scripts/audit-contrast.mjs`)

### H7 · Motion & Polish (0.5주)
- Framer Motion Presets (`fadeIn`, `slideUp`, `scaleIn`) 표준화
- Page transition · Skeleton loading 일관화
- Focus ring · Hover 상태 전수 점검

---

## 7. 거버넌스 · 예방

### 하드코딩 금지 ESLint 룰
```js
// .eslintrc · 신규 커스텀 룰
'no-hardcoded-color': {
  patterns: ['bg-\\[#', 'text-\\[#', 'border-\\[#', 'background:\\s*#'],
  exceptions: ['brand-*', 'semantic-*'],
  message: 'Use var(--color-*) or Tailwind semantic tokens.',
}
```

### Visual Regression
- Chromatic · Percy 통합 (CI 단계에 diff 검증)
- 주요 페이지 스냅샷 12종 (home · sell · analysis · admin · my 등)

### Design Token 변경 프로세스
- `lib/design-tokens.ts` PR 은 디자이너 1인 + 엔지니어 1인 승인 필수
- 토큰 값 변경은 **Minor 버전 bump** (v1.1.0 → v1.2.0)
- 토큰 제거는 **Major 버전 bump** + deprecation 1스프린트 유예

---

## 8. 즉시 적용 (Phase G7+ 응급 수정)

**지금 바로 처리된 항목** (별도 커밋):
- ✅ 메인 페이지 Seller 카드 라이트/다크 분기 · `.home-seller-premium-card` CSS 추출
- ✅ 테마 토글 비로그인 접근 확인 (이미 `navigation.tsx` L604 에 존재)
- ✅ `/my/seller` 매물 리스트 **수정** 버튼 → `/my/listings/[id]/edit` 링크 연결
- ✅ `/admin/listings` 액션 열에 **편집** 버튼 추가 → `/admin/listings/[id]/edit`
- ✅ 자발적 경매 등록 페이지 제목 명확화 + 매물 등록 시 동시 등록 옵션
- ✅ Sell 페이지 step 이동 스크롤-상단 (H5 부분 적용)

## 9. Phase H 진척 상황 (Live Tracker)

| 단계 | 상태 | 산출물 / 파일 |
|---|---|---|
| **H1 · Token Foundation** | 🟡 부분 완료 | `globals.css` Surface Primitives (`.npl-surface-*`) · 메인 페이지 일부 교체 |
| **H2 · Typography** | 🟢 컴포넌트 완료 | `components/typography/type.tsx` · `<Type variant=display\|h1\|...>` |
| **H3 · Level 1 Primitives** | 🟢 Input 완료 | `globals.css .npl-input` · `<NplInput>` · `<NplTextarea>` · `<NplSelect>` · 기존 shadcn `<Button>` 호환 유지 |
| **H4 · Form System** | 🟢 컴포넌트 완료 | `components/form/form-field.tsx` · `<FormField label hint error>` |
| **H5 · Modal & BottomSheet** | 🟡 부분 완료 | sell page step 이동 scroll-to-top 적용 · 모달 BottomSheet 미시작 |
| **H6 · Dark Pass 2** | ⏳ 대기 | Surface Hierarchy 6단계 전수 적용 |
| **H7 · Motion & Polish** | ⏳ 대기 | |

**다음 작업 큐**:
- 시범 페이지에 FormField · Type · npl-input 점진 적용 (signup·login·my/profile 등)
- 하드코딩 색상 추가 전수 조사·교체 (`grep 'bg-\\[#'`)
- Modal 표준 wrapper (`<NplModal>`) 신규 · 모바일 ≤768px BottomSheet 자동 전환

---

## 9. 레퍼런스 · 벤치마크

| 브랜드 | 배울 점 |
|---|---|
| **Coinbase** | 금융 데이터 시각화 (tabular 수치 · 계층화된 카드 · 다크모드 심연 3단계) |
| **Stripe** | 기술적 설명의 탁월한 타이포 위계 · 드롭다운/툴팁 고급감 |
| **Toss** | 한국어 Pretendard 구사력 · 버튼 인터랙션 미세 곡선 |
| **Revolut** | 프리미엄 카드 스타일 · 뱃지 체계 · 다크모드 색감 |
| **Interactive Brokers** | 밀도 높은 정보 UI · 실시간 값 업데이트 애니메이션 |

### 피해야 할 안티패턴
- ❌ 과도한 그라디언트 (에메랄드 → 블루 전환 등) · 핀테크보다 "스타트업 AI 서비스" 느낌
- ❌ 이모지 · 이모티콘 아이콘 · 금융 신뢰감 훼손
- ❌ 고대비 네온 컬러 · 시각적 피로
- ❌ 파이 차트 범람 · 실제 금융 UI 는 수치 + sparkline 조합

---

_작성자 · NPLatform 엔지니어링팀 · Phase H 리드_
