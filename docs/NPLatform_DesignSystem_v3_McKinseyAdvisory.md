# NPLatform Design System · v3 McKinsey Advisory Edition

**Status**: ✅ 활성 SSoT (이전 v2.5 editorial을 대체)
**작성**: 2026-04-25 · NPLatform Design Advisory
**근거**: mckinsey.com / mckinsey.com/kr 직접 추출 (한국어 보고서, 차트, 페이지 패턴)

---

## 0. 디자인 매니페스토 — McKinsey 글로벌 표준

> **"누가 봐도 McKinsey가 만든 사이트다"** 가 목표.
> 색은 빼지 않는다 — McKinsey가 쓰는 색만 쓴다.
> 위계는 색이 아니라 **색의 단계** + **typography weight** + **여백**으로 만든다.

### 절대 금지 (어떤 페이지든 발견 시 즉시 수정)
1. ❌ Emerald `#10B981`, `#34D399` 등 형광 녹색
2. ❌ Amber `#F59E0B`, `#FBBF24` 등 화려 노랑
3. ❌ Red `#EF4444`, `#F87171` 등 밝은 빨강
4. ❌ Purple `#8B5CF6`, `#A855F7` 등 보라
5. ❌ Pink `#EC4899` 등 핑크
6. ❌ Teal/Cyan `#06B6D4` 등 민트 (단 차트 cat-teal `#00A39C` 만 예외)
7. ❌ Round corner > 8px (McKinsey는 square edge 또는 0~4px)
8. ❌ Gradient 4색 이상 multi-stop
9. ❌ "다크 배경 위 어두운 색 텍스트" 또는 "라이트 배경 위 흰색 텍스트"

### 무조건 사용
1. ✅ Navy `#051C2C` — 헤딩, 다크 배경, 진한 차트
2. ✅ Bright Blue `#2251FF` — accent · CTA · 강조
3. ✅ Sky Blue `#42AFFF` — 차트 mid · link
4. ✅ Light Sky `#7FCDFF` — 차트 light
5. ✅ Pale Blue `#B3E0FF` — 차트 옅음
6. ✅ White `#FFFFFF` · Light Gray `#F5F5F5` · Hairline `#E5E5E5`
7. ✅ Gray Body `#666666` (라이트) / `#D4D4D4` (다크)

---

## 1. Color System — McKinsey Navy + Blue Stack

### 1.1 Brand Stack (단계적 위계 — 같은 데이터 표현)
| 토큰 | Hex | 용도 |
|---|---|---|
| `--color-mck-navy-deep` | `#051C2C` | 가장 진함 — 헤딩, 다크 배경, primary bar |
| `--color-mck-navy` | `#1F2E5C` | mid navy — body 강조 |
| `--color-mck-blue` | `#2251FF` | **메인 accent** · CTA · "Featured" · 강조 숫자 |
| `--color-mck-blue-bright` | `#1E3CFA` | hover state |
| `--color-mck-sky` | `#42AFFF` | 차트 mid bar · link active |
| `--color-mck-sky-light` | `#7FCDFF` | 차트 light bar |
| `--color-mck-sky-pale` | `#B3E0FF` | 차트 가장 옅은 bar |

### 1.2 Categorical Accents (두 카테고리 이상 구분 시만)
| 토큰 | Hex | 용도 |
|---|---|---|
| `--color-mck-teal` | `#00A39C` | 보조 카테고리 (단독, 드물게) |
| `--color-mck-magenta` | `#A53F8A` | 또 다른 카테고리 (단독, 드물게) |

### 1.3 Neutrals
| 토큰 | Hex | 용도 |
|---|---|---|
| `--color-mck-gray-50` | `#F5F5F5` | 페이지 sub 배경 / 차트 배경 |
| `--color-mck-gray-100` | `#E8E8E8` | section divider |
| `--color-mck-gray-300` | `#BFBFBF` | 비활성 텍스트 |
| `--color-mck-gray-500` | `#999999` | 캡션 |
| `--color-mck-gray-700` | `#666666` | 본문 (라이트) |
| `--color-mck-gray-900` | `#1A1A1A` | 검정 강조 |

### 1.4 Sentiment (긍정/부정/중립)
> **McKinsey는 emerald 안 씀** — sentiment도 navy + blue 위계로 표현
| 의미 | 라이트 모드 | 다크 모드 |
|---|---|---|
| **긍정/상승** | `#2251FF` bright blue | `#42AFFF` sky |
| **부정/하락** | `#A53F8A` magenta (드물게) 또는 `#666666` gray | `#A53F8A` 또는 `#94A3B8` |
| **중립** | `#666666` gray | `#999999` gray |
| **경고** | `#42AFFF` sky blue | `#7FCDFF` light sky |

---

## 2. Typography

### 2.1 Stack
- **헤딩 영문 (옵션)**: Bower / Tiempos Headline / Charter / Georgia, serif Bold
- **헤딩 한글**: Pretendard SemiBold / Bold (위계는 weight + size + tracking)
- **본문 모두**: Pretendard Regular / Medium
- **숫자 강조**: Pretendard Bold (또는 영문 serif Bold) + `#2251FF` blue

### 2.2 Scale (한국어 위주)
| 클래스 | Size | Weight | Tracking | Line | 용도 |
|---|---|---|---|---|---|
| Display 1 | clamp(2.5rem, 5vw, 4rem) | 700 | -0.025em | 1.05 | Hero h1 |
| Display 2 | clamp(2rem, 4vw, 3rem) | 700 | -0.022em | 1.10 | Section h2 |
| Heading | clamp(1.5rem, 3vw, 2.25rem) | 700 | -0.020em | 1.20 | Page h1 |
| Sub-heading | 1.25rem | 600 | -0.012em | 1.30 | Card title |
| Body Large | 1.0625rem | 400 | normal | 1.65 | 본문 강조 |
| Body | 0.9375rem | 400 | normal | 1.65 | 본문 |
| Caption | 0.8125rem | 400 | 0.005em | 1.55 | 부속 |
| **Eyebrow** | 0.6875rem | **700** | **0.20em** | 1.0 | uppercase 라벨 |
| **Stat Number** | clamp(3.5rem, 6vw, 5.5rem) | 700 | -0.025em | 0.95 | "30+", "80%" |

### 2.3 색 (배경 대비 보장)
| 컨텍스트 | 색상 |
|---|---|
| 라이트 흰 배경 + 헤딩 | `#051C2C` (navy) |
| 라이트 흰 배경 + 본문 | `#666666` (gray-700) |
| 라이트 흰 배경 + 캡션 | `#999999` (gray-500) |
| 다크 navy 배경 + 헤딩 | `#FFFFFF` |
| 다크 navy 배경 + 본문 | `#D4D4D4` |
| 다크 navy 배경 + 캡션 | `#999999` |
| Eyebrow (라이트) | `#051C2C` (navy) |
| Eyebrow (다크) | `#42AFFF` (sky blue) |
| 강조 숫자 (라이트) | `#2251FF` (bright blue) |
| 강조 숫자 (다크) | `#FFFFFF` 또는 `#42AFFF` |

---

## 3. Components

### 3.1 Buttons
**Primary CTA** — 가장 중요한 행동
```
- 라이트: bg #051C2C navy + 흰 글씨 (square edge, radius 0)
- 다크: bg #FFFFFF + #051C2C 글씨
- Hover: bg #000000 (라이트) / bg #F5F5F5 (다크)
- 화살표 우측 (→)
```
**Bright Blue Variant** — 강조 CTA (Featured)
```
- bg #2251FF + 흰 글씨, square edge
- Hover: #1E3CFA
```
**Outline** — Secondary
```
- transparent + 1px solid border + 검정 글씨
- Hover: bg #051C2C + 흰 글씨
```
**금지**: round-full 버튼, gradient 버튼, emerald/amber 버튼

### 3.2 Cards
**Light Card** — 흰 종이
```
- bg #FFFFFF
- border 1px solid #E5E5E5 (hairline)
- padding 2rem
- Hover: border-color → #051C2C
- radius 0 (square edge)
```
**Dark Card** — Navy
```
- bg #051C2C
- border 1px solid #1F2E5C
- padding 2rem
- 텍스트 color #F5F5F5 (헤딩 #FFFFFF)
```
**Sub-card in Dark** — 다크 컨테이너 안의 sub 박스
```
- bg rgba(66, 175, 255, 0.10)  ← sky blue tint (대비)
- border 1px solid rgba(66, 175, 255, 0.30)
- 내부 아이콘 #42AFFF
```

### 3.3 Form Fields (input/textarea/select)
**라이트 모드**
```
- bg #FFFFFF
- border 1px solid #E5E5E5
- color #051C2C (navy)
- placeholder #999999
- Focus: border #2251FF + 3px shadow ring
```
**다크 모드**
```
- bg rgba(255, 255, 255, 0.06)
- border 1px solid rgba(255, 255, 255, 0.20)
- color #F8FAFC
- placeholder rgba(255, 255, 255, 0.45)
- Focus: border #2251FF
```
**중요**: 라이트 배경 강제 (예: `bg-white`) 인 input은 다크 모드에서도 검정 텍스트 강제 (가독성)

### 3.4 Labels / Chips
**상태 라벨** (multi-color 절대 금지)
- 라이트: outline 1px navy border + navy 글씨 (square)
- 다크: outline 1px white border + 흰 글씨

**카테고리 라벨** ("BLOG POST", "CASE STUDY")
- uppercase + 0.20em tracking
- color: 라이트 #051C2C, 다크 #FFFFFF
- 배경 없음 (텍스트만)

**AI 등급 / 위계 표시** (예: AI A, AI B, AI C, AI D)
- 모두 동일 톤 (검정 사각 박스 + 흰 알파벳) — 색 차별화 X
- 차별화는 **위치 + size + 라벨**로

### 3.5 Charts
**Stack chart** (같은 데이터의 단계)
- Navy stack: `#051C2C → #1F2E5C → #2251FF → #42AFFF → #7FCDFF → #B3E0FF`
- 6단계까지 충분

**Categorical chart** (다른 카테고리)
- 최대 4종: `#051C2C`, `#2251FF`, `#00A39C`, `#A53F8A`
- 5종 이상이면 디자인 잘못된 것 — 데이터 재설계

**Line chart**
- 강조 라인: `#2251FF` 굵은 선 (2px)
- 보조 라인: `#42AFFF` 또는 `#1F2E5C` 가는 선 (1px)
- 회색 라인: `#999999` (가이드)

**다크 모드 차트 텍스트**
- axis label: `#F8FAFC`
- gridline: `rgba(255, 255, 255, 0.18)`
- tooltip bg: `#0A1628` + 흰 글씨

### 3.6 Tables
**라이트 모드**
- header: bg `#F5F5F5` + navy 글씨 (Bold)
- row hairline: `#E5E5E5`
- 강조 셀: bg `rgba(34, 81, 255, 0.08)` + navy 글씨
- 회색 셀: bg `#F5F5F5`

**다크 모드**
- header: bg `#0A1628` + 흰 글씨
- row hairline: `rgba(255, 255, 255, 0.06)`
- 강조 셀: bg `rgba(66, 175, 255, 0.12)` + 흰 글씨

### 3.7 Layouts
**Section Padding**: 라이트 5rem 0 / 다크 5rem 0
**Container Max-Width**: 1280px (콘텐츠) / 980px (보고서)
**Grid Gap**: 1.5rem (카드) / 2rem (섹션)
**Hairline Divider**: 1px gray-100

---

## 4. Patterns

### 4.1 Hero Section (다크)
```
┌────────────────────────────────────────────┐
│  bg: #051C2C navy                          │
│  ── eyebrow uppercase tracking (sky) ──    │
│  H1 큰 흰 글씨 (Pretendard Bold)            │
│  + 핵심 단어만 sky/blue 강조               │
│  body 회색 #D4D4D4                         │
│  CTA: 흰 outline 또는 bright blue 박스     │
└────────────────────────────────────────────┘
```

### 4.2 Stat Numbers Section (3-up)
```
| 30+              | 80%              | 130+             |
| serif blue Bold  | serif blue Bold  | serif blue Bold  |
| ────             | ────             | ────             |
| years            | of top Korean    | cities           |
| operating Korea  | companies served | globally         |
```

### 4.3 Featured Insight Card
```
┌──────────┬──────────────────────────────┐
│ 이미지    │ Big Serif Heading            │
│          │ Date - Body summary text     │
│          │ ↓ Full report (link)         │
└──────────┴──────────────────────────────┘
```

### 4.4 Korean Report Page
```
H1 큰 검정 Bold (말바꿈 없이)

[회색 박스]
본 보고서는...
원문과 일치하지 않을 수 있습니다.
[CTA: 보고서 원문 보기 →] (navy square)

본문 시작...
```

### 4.5 Process Steps (5단계)
```
01  →  02  →  03  →  04  →  05
●     ●     ●     ●     ●     (sky blue dots)
이름  이름  이름  이름  이름   (Bold)
desc  desc  desc  desc  desc  (Body)
```
**금지**: 각 단계마다 다른 색 사용 (사용자 본 화면에서 보라/녹색/sky 사용 = 잘못)

### 4.6 Korean Bar Chart
```
   2024     2025     2030
   ▆▆       ▆▆▆▆     ▆▆▆▆▆▆▆▆     ← all #2251FF or sky blue stack
```

---

## 5. Light vs Dark Mode

### 5.1 Light Mode 원칙
- 배경: 흰색 (`#FFFFFF`) 또는 light gray (`#F5F5F5`) 섹션
- 텍스트 위계: navy → gray-700 → gray-500
- accent: `#2251FF` blue
- 카드: 흰 종이 + hairline border

### 5.2 Dark Mode 원칙
- 배경: deep navy (`#051C2C`) 풀
- 텍스트 위계: 흰색 → gray-300 → gray-500
- accent: `#42AFFF` sky blue (다크 배경 위 가독성 우선 sky가 blue보다 밝음)
- 카드: navy 위 sub-navy + hairline border
- **input/textarea**: 다크 surface (`rgba(255,255,255,0.06)`) + 흰 텍스트

### 5.3 컨텍스트 강제 — 흰 배경 강제 input
- 라이트 모드: 흰 배경 + navy 텍스트 (정상)
- 다크 모드: input의 inline `bg-white`는 그대로 두되 **텍스트는 검정 강제**

---

## 6. 가독성 보장 규칙 (절대 위반 금지)

1. **WCAG AA 4.5:1** 본문 / 3:1 큰 텍스트
2. **다크 위 다크 금지** — 다크 navy 배경 → 텍스트는 무조건 #D4D4D4 이상
3. **라이트 위 라이트 금지** — 흰 배경 → 텍스트는 무조건 #666666 이하
4. **input 흰 배경** → 다크 모드 강제 fallback으로 검정 텍스트
5. **차트 라벨/툴팁** — 다크 모드에서 강제 흰톤
6. **toolip 안의 텍스트** — 배경에 따라 자동 분기

---

## 7. 적용 매트릭스 (전수 페이지)

| 영역 | 라이트 적용 | 다크 적용 | 상태 |
|---|---|---|---|
| 메인 page.tsx | navy + blue 위계 | 다크 hero + 흰 텍스트 | ✅ |
| 거래소 | 흰 카드 + navy 헤딩 | 다크 surface | ✅ |
| 딜룸 | 흰 + sky blue accent | 다크 + sky blue | 🔧 진행 (purple 잔재 제거 중) |
| 분석 대시보드 | 흰 카드 통일 톤 | 다크 카드 + sky | 🔧 진행 |
| 리포트 | 흰 종이 + serif | 다크 + 흰 텍스트 | ✅ |
| 매물 등록 | input white + navy 글씨 | input 다크 + 흰 글씨 | 🔧 강제 적용 |
| 인증 (login/signup) | 흰 + navy | 다크 + 흰 | ✅ |
| Admin | 흰 + navy stack | 다크 + sky | 🔧 강제 적용 |
| 차트 (Recharts) | navy stack | sky stack + 흰 라벨 | ✅ 강제 |
| Footer | 다크 navy + 흰 텍스트 | 동일 | ✅ |

---

## 8. globals.css Override 시스템

### 8.1 Tailwind utility 강제 무력화
모든 `text-{color}-` / `bg-{color}-` / `border-{color}-` (emerald/amber/red/purple/pink/violet/fuchsia/orange/yellow) → navy + blue로 강제

### 8.2 다크 컨테이너 contextual override
```css
[style*="hero-bg"] [class*="text-emerald-"] { color: #FFFFFF !important }
[style*="hero-bg"] .npl-editorial-eyebrow { color: #42AFFF !important }
.dark input { background: rgba(255,255,255,0.06) !important; color: #F8FAFC !important }
```

### 8.3 차트 강제 mono
```css
.dark .recharts-text { fill: #F8FAFC !important }
.dark .recharts-cartesian-grid line { stroke: rgba(255,255,255,0.18) !important }
```

---

## 9. 변경 거버넌스

- 본 SSoT 변경은 디자이너 1인 + 엔지니어 1인 승인 필수
- emerald/amber/red/purple 등 multi-color 추가 = **차단**
- 새 컴포넌트는 본 문서 §3 패턴 따라야 함
- 차트 색상 6종 이상 = **차단** (재설계 요청)

---

_v3 작성자 · NPLatform Design Advisory · 2026-04-25_
_v2.5 editorial을 대체. 진짜 mckinsey.com 직접 추출 기반_
