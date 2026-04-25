# NPLatform Design System · v2.5 (McKinsey Editorial-Grade)

> **Status**: ✅ SSoT (Single Source of Truth)
> **Effective**: 2026-04-25 ~
> **Scope**: 전체 페이지·컴포넌트·마이크로카피·번역

이 문서는 NPLatform 의 **유일한** 디자인·UX 기준 문서다. 이후 모든 페이지·컴포넌트 개발은 본 문서의 토큰·컴포넌트·원칙을 따른다. 어긋나는 PR 은 머지 거부.

---

## 0. 톤 매니페스토 — McKinsey Editorial-Grade

NPLatform 은 **B2B 금융 플랫폼**이다. 기관 투자자·금융사가 사용한다.
사용자는 **20분 안에 첫 거래 의향 확정** 을 기대한다.

**우리가 추구하는 톤**:
- McKinsey 보고서의 **정렬·여백·위계** (콘텐츠가 데이터 위주)
- Stripe 의 **타이포그래피 정밀도** (line-height·tracking·font-feature)
- Linear 의 **모션 절제** (불필요한 fade/slide 없음)
- Bloomberg Terminal 의 **데이터 밀도** (단, 가독성 절대 양보 X)

**피해야 할 안티패턴**:
- ❌ 그라디언트 배경 (Stripe 의 `linear-gradient` 도 사용 자제)
- ❌ Soft shadow (`shadow-2xl` 같은 부드러운 그림자)
- ❌ 둥근 코너 과용 (`rounded-3xl` 이상)
- ❌ 이모티콘·이모지 아이콘 (🔴🟠🟡 류)
- ❌ Toss/Coinbase 류의 **"부드러움"** — 우리는 단단하고 정확함을 추구
- ❌ AI 자동완성 톤 ("Discover seamless...", "Empower your...")

---

## 1. Color Tokens — Editorial Palette

### 1.1 Primary
```ts
// 브랜드 (Navy + Steel)
--brand-900: #0B1B2E   // 본문 위 강조 (h1)
--brand-700: #1B3A5C   // 기본 Navy
--brand-500: #2E75B6   // Interactive (link, button hover)
--brand-300: #93C5FD   // 디스플레이 강조 (히어로)

// Semantic (FactSet 톤)
--positive: #047857    // Emerald 700 (수익·승인 — 너무 밝지 않게)
--warning:  #B45309    // Amber 700
--danger:   #B91C1C    // Red 700
--info:     #1D4ED8    // Blue 700
```

### 1.2 Neutrals — Light Mode
```ts
--bg-canvas:    #FFFFFF
--bg-subtle:    #FAFBFC   // 페이지 배경
--bg-muted:     #F4F6F9   // 카드 sunken
--bg-elevated:  #FFFFFF   // 카드 raised

--text-primary:   #0F172A   // 본문 (대비 최대)
--text-secondary: #475569   // 캡션
--text-tertiary:  #64748B   // 라벨
--text-muted:     #94A3B8   // 비활성

--border-subtle:  #E2E8F0
--border-default: #CBD5E1
--border-strong:  #94A3B8
```

### 1.3 Neutrals — Dark Mode
```ts
--bg-canvas:    #0A1628
--bg-subtle:    #060E1C
--bg-muted:     #122643
--bg-elevated:  #182338

--text-primary:   #F8FAFC   // 다크에서는 살짝 따뜻한 화이트
--text-secondary: #CBD5E1
--text-tertiary:  #94A3B8
--text-muted:     #64748B

--border-subtle:  #1E293B
--border-default: #334155
--border-strong:  #475569
```

### 1.4 Disabled-state 카드 가독성 (사용자 지적 #1)
스크린샷에서 "Fast transactions, transparent fees" 가 거의 안 보임 → **opacity 0.5 이하 금지**.
```css
/* 금지 */
.disabled-card { opacity: 0.4; }

/* 권장 */
.disabled-card {
  color: var(--text-muted);  /* 명시적 색상 */
  opacity: 1;
}
```

---

## 2. Typography — Editorial Scale

### 2.1 Type Stack
```css
font-family:
  'Pretendard Variable',
  -apple-system, BlinkMacSystemFont,
  'Apple SD Gothic Neo', 'Noto Sans KR',  /* ko fallback */
  'Inter', 'Helvetica Neue',               /* en */
  'Hiragino Sans', 'Yu Gothic UI',         /* ja */
  sans-serif;

/* 금융 수치 전용 — tnum 강제 */
font-feature-settings: "tnum", "ss01", "cv11";
font-variant-numeric: tabular-nums;
```

### 2.2 Scale (9-step)
| Token | Size | Weight | Line | Tracking | 용도 |
|---|---|---|---|---|---|
| `display-xl` | 56px | 700 | 1.05 | -0.025em | 히어로 (1페이지에 1회) |
| `display-l`  | 44px | 700 | 1.10 | -0.020em | 섹션 진입 |
| `h1` | 32px | 700 | 1.20 | -0.015em | 페이지 제목 |
| `h2` | 24px | 600 | 1.30 | -0.010em | 카드 제목 |
| `h3` | 20px | 600 | 1.40 | -0.005em | 서브섹션 |
| `h4` | 17px | 600 | 1.40 | 0 | 라벨 강조 |
| `body` | 15px | 400 | 1.65 | 0 | 본문 |
| `caption` | 13px | 400 | 1.50 | 0 | 부가 정보 |
| `tiny` | 11px | 500 | 1.40 | 0.02em | 메타·뱃지 |

### 2.3 한국어 텍스트 마이크로카피 원칙
- **금융 용어 사전 우선**: `lib/i18n.ts` 의 `STATIC_DICT` 에 등록
- **번역 일관성**: 같은 한국어 → 같은 영어/일본어
- **줄바꿈 제어**: 한국어는 `word-break: keep-all` + `overflow-wrap: break-word`
- **금지 단어**: "원클릭", "스마트", "혁신" — 진부함

---

## 3. Spacing & Layout

### 3.1 Spacing Scale
```ts
--space-0: 0
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px   // base
--space-5: 24px
--space-6: 32px
--space-7: 48px
--space-8: 64px
--space-9: 96px
```

### 3.2 Container
```ts
.container-narrow:  640px   // 폼·블로그
.container-default: 960px   // 일반 페이지
.container-wide:    1200px  // 대시보드
.container-full:    1440px  // 거래소·맵
```

### 3.3 Grid
- 12-column · gap-6 (24px) · gutter-8 (32px)
- 모바일 < 768px → 4-column · gap-4 (16px)

---

## 4. Components — Level 1~4

### Level 1 (Primitive)
| 컴포넌트 | 토큰 | 비고 |
|---|---|---|
| `Button` | h-11 / h-9 / h-12 (icon h-11 w-11) | radius 10 · ring-4 brand-bright/35 focus |
| `Input` | h-11 · padding 14px · radius 10 | tabular-nums 기본 |
| `Select` | Input 동일 + 화살표 SVG | 18×18 |
| `Checkbox` | 16x16 | brand-bright accent |
| `Radio` | 16x16 | 동일 |
| `Switch` | 32×18 | semantic positive |
| `Badge` | tiny + radius 4 | semantic 6종 |

### Level 2 (Form)
- `<FormField label hint error required rightAccessory>`
- `<FormSection title description>`
- `<InputGroup prefix suffix>`

### Level 3 (Container)
- `<Card>` · radius 14 · `var(--shadow-card)`
- `<Panel>` · 좌우 분할
- `<Section>` · 헤더 + 캡션 + 콘텐츠

### Level 4 (Overlay)
- `<NplModal size sm|md|lg|xl>` · 데스크 중앙 / 모바일 BottomSheet 자동
- `<Drawer>` · 좌·우 슬라이드
- `<Popover>` · radius 8

### Surface Primitives (`globals.css`)
- `.npl-surface-card` · 라이트 #FFFFFF / 다크 #0D1F38
- `.npl-surface-card-raised` · shadow 강조
- `.npl-surface-sunken` · 들어간 박스
- `.npl-surface-subtle` · 매우 연한 섹션
- `.npl-preview-dark-card` · 랜딩 카드
- `.npl-preview-panel` · 큰 프리뷰 패널

---

## 5. Motion · Elevation

### 5.1 Duration · Easing
```ts
--motion-fast:    150ms cubic-bezier(0, 0, 0.2, 1)
--motion-base:    220ms cubic-bezier(0.16, 1, 0.3, 1)
--motion-slow:    350ms cubic-bezier(0.16, 1, 0.3, 1)
```
**금지**: `bounce`, `spring overshoot`, `400ms 이상 fade`

### 5.2 Shadow (Light / Dark)
```css
--shadow-card:        0 1px 3px rgba(13,31,56,0.05)  /  inset highlight (dark)
--shadow-card-hover:  0 8px 24px rgba(13,31,56,0.10)
--shadow-modal:       0 24px 60px rgba(13,31,56,0.18) / 0 16px 48px rgba(0,0,0,0.7) (dark)
```

---

## 6. Internationalization (i18n) — 사용자 지적 핵심

### 6.1 현재 잔여 이슈 (스크린샷 검출)
| 한국어 | 페이지 | 미번역 사유 |
|---|---|---|
| NPL 매물 거래소 | / | STATIC_DICT 누락 |
| 딜룸 · NDA · 전자계약 | / | 동일 |
| 에스크로 · PII 마스킹 | / | 동일 |
| AI 딜 분석 리포트 | / | 동일 |
| AI Copilot — 거래 어시스턴트 | / | 동일 |
| 매물 공개 → 낙찰 평균 7일 | / | 동일 |
| 에스크로 · 전자계약 기본 제공 | / | 동일 |
| 중간 유통 없는 1차 공급 가격 | / | 동일 |
| 기관 KYC · 자격 검증 완료 | / | 동일 |
| 실시간 경쟁 입찰 / 프라이빗 협상 | / | 동일 |
| 금감원·신용정보법 가이드 준수 | / | 동일 |
| 자동 PII 마스킹 파이프라인 | / | 동일 |
| NDA 전자서명 + 감사로그 영구 보관 | / | 동일 |
| 국내 주요 은행, 저축은행, 캐피탈사와 파트너십을 맺고 있습니다. | / | 동일 |
| 카드 본문 (3카드 한국어 그대로) | / | 동일 (긴 문장 — Claude 번역 필요) |

### 6.2 i18n 정책
1. **STATIC_DICT 우선** — 모든 UI 텍스트는 사전 등록
2. **빌드타임 자동 추출** (다음 스프린트) — `.tsx` 한글 텍스트 → STATIC_DICT 누락분 경고
3. **번역 폴백 체인**:
   - 1차 STATIC_DICT (즉시)
   - 2차 localStorage 캐시 (즉시)
   - 3차 Google Translate 클라이언트 직접 호출 (한국 IP 정상)
   - 4차 `/api/v1/translate` 서버 프록시 (Claude API)
   - 5차 원문 그대로
4. **새 페이지 추가 시 의무 등록**: PR 체크리스트에 STATIC_DICT 갱신 포함

### 6.3 번역 톤
- **금융 용어**: NPL, LTV, ROI, KYC, NDA, LOI 등은 영어 약어 그대로
- **문체**: 영어는 sentence case · 일본어는 です·ます체
- **숫자 단위**: 한국어 "억/만원" → 영어 "B/M KRW" · 일본어 "億/万円"

---

## 7. 페이지별 디자인 시스템 적용 우선순위

### Tier S (즉시 100% 적용 — 첫 인상)
1. `/` 메인 (히어로 · 카드 그리드)
2. `/exchange` 거래소
3. `/login` · `/signup` 인증
4. `/exchange/sell` 매물등록 (1순위 funnel)
5. `/exchange/auction/new` 자발적 경매

### Tier A (1주 내)
6. `/analysis/new` 분석 위자드
7. `/analysis/report` 분석 리포트
8. `/exchange/demands/new` 매수자 등록
9. `/my/seller` 매도자 대시보드
10. `/admin` 관리자 대시보드

### Tier B (2주 내)
11. `/exchange/[id]` 매물 상세
12. `/deals` 딜룸
13. `/services/community` 커뮤니티
14. `/news` 뉴스

### Tier C (백오피스)
15. 나머지 admin 서브페이지
16. `/services/learn` 등 보조 페이지

---

## 8. 적용 체크리스트 (PR Review)

신규 페이지·컴포넌트 PR 은 다음 모두 ✓ 가 필요:

### A. 토큰 사용
- [ ] 색상은 `var(--color-*)` 또는 `var(--bg-*) / var(--text-*) / var(--border-*)`
- [ ] 하드코딩 hex (`#RRGGBB`) 0건 (`grep 'bg-\\[#' src/`)
- [ ] 폰트는 `<Type variant=...>` 또는 동등한 클래스
- [ ] Spacing 은 `--space-N` 또는 Tailwind `p-{N}`

### B. 컴포넌트
- [ ] Button/Input 은 `@/components/ui/*` 사용 (직접 `<button>` 금지 — 단순 hover 제외)
- [ ] Form 은 `<FormField>` 사용
- [ ] Modal 은 `<NplModal>` 사용 (Radix Dialog 직접 사용 금지)
- [ ] 로딩은 `<Skeleton>` (커스텀 spinner 금지)

### C. 다크모드
- [ ] 라이트/다크 모두 WCAG AA 4.5:1 이상 (text-muted 도)
- [ ] disabled-state 도 보임 (opacity 0.5 이하 금지)
- [ ] 카드 hover 시 다크에서 inset highlight 적용

### D. i18n
- [ ] 모든 한국어 텍스트가 `STATIC_DICT.en` · `STATIC_DICT.ja` 에 등록
- [ ] `data-no-translate` 는 코드/숫자/외래어에만
- [ ] 동적 interpolation 텍스트는 분리 (`{count}건` → `{count} ${t('건')}`)

### E. 모션
- [ ] 240ms 이상 transition 없음 (콘텐츠 진입 제외)
- [ ] bounce/spring 없음
- [ ] reduced-motion 미디어 쿼리 존중

### F. 모바일
- [ ] 터치 영역 ≥ 44×44px
- [ ] Modal → BottomSheet 자동 (NplModal 자동 처리)
- [ ] 가로 스크롤 없음 (overflow-x-hidden 제거 가능)

---

## 9. 거버넌스

### 9.1 변경 프로세스
- 토큰 추가/삭제 → 디자이너 1인 + 엔지니어 1인 승인
- Component Level 1 변경 → Visual Regression CI (Chromatic)
- 색상 hex 추가 → ESLint 룰로 PR 차단

### 9.2 버전
- Major (v3.0) — Color/Typography 큰 변경
- Minor (v2.6) — 새 컴포넌트 · 토큰 추가
- Patch (v2.5.1) — 버그 fix

### 9.3 폐지 정책
- 구 컴포넌트는 `@deprecated` JSDoc + 1 스프린트 유예
- 구 토큰은 globals.css 주석 처리 + 2 스프린트 후 제거

---

## 10. 부록 — 즉시 적용 fix 리스트 (Phase L)

**Critical**:
- [ ] STATIC_DICT 에 메인 페이지 카드 제목 + 본문 + 라벨 30+ 추가 (사용자 스크린샷 기반)
- [ ] 다크모드 카드 제목 색상 가독성 (Fast transactions 사례)
- [ ] 매도자/투자자 카드의 한국어 본문 → STATIC_DICT 등록

**High**:
- [ ] 통계 섹션 "국내 주요 은행..." 텍스트 등록
- [ ] "Where NPL deals gather" 같은 영어가 메인 히어로에 노출되는 케이스 — 한국어→영어 자동 전환 검증

**Medium**:
- [ ] 모든 위자드 step 이동 시 scroll-to-top
- [ ] 빌드타임 한글 텍스트 자동 추출 도구

---

_Authored by NPLatform Engineering · v2.5 · 2026-04-25_
_이 문서는 모든 디자인·UX 결정의 SSoT 이며, 변경은 PR + 2인 승인 필요_
