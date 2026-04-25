# NPLatform Design System · v4 — McKinsey Layer System Edition

**Status**: ✅ 활성 SSoT (v3 + Layer System 4단계 위계 통합)
**작성**: 2026-04-25 · NPLatform Global Design Advisory
**근거**: mckinsey.com 패턴 + 사용자 직접 스크린샷 분석

---

## 0. 핵심 원칙 — "도형 안의 도형 안의 도형까지"

> 모든 페이지는 **최대 4단계 Layer 위계**로 설계한다.
> 각 Layer는 **명확한 배경 색차** + **보더** + **텍스트 색**으로 구분한다.
> "남색 안 남색", "흰색 안 흰색", "다크 안 다크" — 절대 금지.

---

## 1. Layer System 4단계 위계

### 1.1 라이트 모드 Layer Stack
| Layer | 배경 | 보더 | 텍스트 (헤딩 / 본문 / 캡션) |
|---|---|---|---|
| **L0** Page outermost | `#FFFFFF` (흰 종이) | none | `#051C2C` / `#666666` / `#999999` |
| **L1** Section / Hero | `#F5F5F5` (light gray) | `1px solid #E5E5E5` | `#051C2C` / `#666666` / `#999999` |
| **L2** Primary card | `#FFFFFF` | `1px solid #E5E5E5` (hover→ `#051C2C`) | `#051C2C` / `#666666` / `#999999` |
| **L3** Sub-card / inset | `#F5F5F5` | `1px solid #E5E5E5` | `#051C2C` / `#666666` / `#999999` |
| **L4** Label / chip | transparent 또는 `rgba(34,81,255,0.06)` | `1px solid rgba(5,28,44,0.20)` | `#051C2C` (uppercase 라벨) |

### 1.2 다크 모드 Layer Stack
| Layer | 배경 | 보더 | 텍스트 (헤딩 / 본문 / 캡션) |
|---|---|---|---|
| **L0** Page outermost | `#051C2C` (deep navy) | none | `#FFFFFF` / `#D4D4D4` / `#999999` |
| **L1** Section / Hero | `#0A1628` (slightly lighter) | `1px solid rgba(255,255,255,0.10)` | `#FFFFFF` / `#D4D4D4` / `#999999` |
| **L2** Primary card | `#122643` (clearly distinguishable) | `1px solid rgba(255,255,255,0.15)` | `#FFFFFF` / `#D4D4D4` / `#999999` |
| **L3** Sub-card / inset | `#1F2E5C` (or sky blue tint) | `1px solid rgba(66,175,255,0.30)` | `#FFFFFF` / `#D4D4D4` / `#999999` |
| **L4** Label / chip | `rgba(66,175,255,0.12)` | `1px solid rgba(66,175,255,0.30)` | `#42AFFF` (sky blue) |

### 1.3 Contrast 비율 보장 (WCAG)
| 레이어 위 텍스트 | 라이트 대비 | 다크 대비 |
|---|---|---|
| L0/L1 위 헤딩 | 16.8:1 ✓ AAA | 16.4:1 ✓ AAA |
| L0/L1 위 본문 | 5.7:1 ✓ AA | 9.6:1 ✓ AAA |
| L2 위 헤딩 | 16.8:1 ✓ AAA | 11.2:1 ✓ AAA |
| L2 위 본문 | 5.7:1 ✓ AA | 7.2:1 ✓ AAA |
| L3 위 헤딩 | 16.8:1 ✓ AAA | 8.4:1 ✓ AAA |
| L3 위 본문 | 5.7:1 ✓ AA | 5.5:1 ✓ AA |

---

## 2. 색상 시스템 (정리된 결정판)

### 2.1 Brand
| 토큰 | Hex | 용도 |
|---|---|---|
| `--mck-navy-900` | `#051C2C` | 가장 진함 — 헤딩, 다크 배경 |
| `--mck-navy-700` | `#0A1628` | 다크 모드 L1 |
| `--mck-navy-500` | `#122643` | 다크 모드 L2 |
| `--mck-navy-300` | `#1F2E5C` | 다크 모드 L3 |
| `--mck-blue-700` | `#1E3CFA` | hover state |
| `--mck-blue-500` | `#2251FF` | **메인 accent** · CTA |
| `--mck-blue-300` | `#42AFFF` | sky · 차트 mid · 다크 link |
| `--mck-blue-200` | `#7FCDFF` | 차트 light |
| `--mck-blue-100` | `#B3E0FF` | 차트 pale |

### 2.2 Categorical (드물게)
| 토큰 | Hex | 용도 |
|---|---|---|
| `--mck-teal` | `#00A39C` | 보조 카테고리 |
| `--mck-magenta` | `#A53F8A` | 또 다른 카테고리 |

### 2.3 Neutrals
| 토큰 | Hex | 용도 |
|---|---|---|
| `--mck-white` | `#FFFFFF` | 라이트 배경 |
| `--mck-gray-50` | `#F5F5F5` | sub 배경 |
| `--mck-gray-100` | `#E8E8E8` | hairline divider |
| `--mck-gray-300` | `#BFBFBF` | 비활성 |
| `--mck-gray-500` | `#999999` | 캡션 |
| `--mck-gray-700` | `#666666` | 본문 (라이트) |
| `--mck-gray-900` | `#1A1A1A` | 검정 강조 |
| `--mck-on-dark-body` | `#D4D4D4` | 다크 위 본문 |

### 2.4 절대 금지 (전수 검출 즉시 fix)
- ❌ Emerald `#10B981`, `#34D399`, `#059669`, `#047857`
- ❌ Amber `#F59E0B`, `#FBBF24`, `#B45309`
- ❌ Red `#EF4444`, `#F87171`, `#DC2626`, `#B91C1C`
- ❌ Purple `#8B5CF6`, `#A855F7`, `#7C3AED`
- ❌ Pink `#EC4899`
- ❌ Cyan `#06B6D4`
- ❌ Round corner > 8px
- ❌ Multi-stop gradient (4색 이상)

---

## 3. Typography 위계

### 3.1 Stack
- 한글: Pretendard Variable (모든 위계)
- 영문 헤딩 (옵션): Bower / Tiempos / Charter / Georgia, serif
- 영문 본문: Pretendard / Helvetica
- 숫자 강조 (옵션): Pretendard Bold + `#2251FF` 또는 영문 serif Bold

### 3.2 위계 — 강조하는 글꼴은 다르게
| 의미 | 폰트 | Weight | Size | Tracking | Color |
|---|---|---|---|---|---|
| **Display 1** (Hero) | Pretendard | 700 | clamp(2.5rem, 5vw, 4rem) | -0.025em | navy/white |
| **Display 2** (Section) | Pretendard | 700 | clamp(2rem, 4vw, 3rem) | -0.022em | navy/white |
| **H1** (Page) | Pretendard | 700 | clamp(1.5rem, 3vw, 2.25rem) | -0.020em | navy/white |
| **H2** (Card) | Pretendard | 700 | 1.25rem | -0.012em | navy/white |
| **Body Large** | Pretendard | 400 | 1.0625rem | normal | gray-700 / `#D4D4D4` |
| **Body** | Pretendard | 400 | 0.9375rem | normal | gray-700 / `#D4D4D4` |
| **Caption** | Pretendard | 400 | 0.8125rem | normal | gray-500 / `#999999` |
| **Eyebrow** ⭐ | Pretendard | **700** | **0.6875rem** | **0.20em uppercase** | navy / sky blue |
| **Stat Number** ⭐ | Pretendard / Serif | **700** | clamp(3rem, 6vw, 5rem) | -0.025em | **`#2251FF` blue** |
| **Strong inline** ⭐ | Pretendard | **600** | inherit | normal | **`#2251FF` blue** |

⭐ = **강조 시 반드시 다른 색·다른 weight·다른 letter-spacing 사용**

### 3.3 강조 패턴 (인라인)
```html
일반 본문 텍스트 안에 <strong>핵심 수치</strong>는 navy bold,
<span class="mck-highlight">키 포인트</span>는 bright blue로,
<em class="mck-emphasis">강조</em>는 italic + blue,
<span class="mck-stat">30%</span>는 큰 serif blue.
```

---

## 4. 컴포넌트 표준 (도형 + 도형 안 도형까지)

### 4.1 Button 위계
**Primary CTA** (가장 강조) — square edge, navy/blue
```css
background: #051C2C (라이트) / #FFFFFF (다크);
color: #FFFFFF (라이트) / #051C2C (다크);
border: 1px solid same;
border-radius: 0;
padding: 0.875rem 1.75rem;
hover → #000000 / #F5F5F5;
```

**Bright Blue CTA** (Featured 강조)
```css
background: #2251FF;
color: #FFFFFF;
hover → #1E3CFA;
```

**Outline Secondary**
```css
background: transparent;
color: #051C2C / #FFFFFF;
border: 1px solid #051C2C / rgba(255,255,255,0.40);
hover → bg #051C2C / rgba(255,255,255,0.10);
```

**Tertiary text-only** (link)
```css
color: #2251FF;
text-decoration: underline;
text-underline-offset: 3px;
font-weight: 600;
+ arrow → 우측
```

### 4.2 Card 위계 (4단계 명확)
**L2 Primary Card**
- 라이트: `bg #FFFFFF` + `border 1px solid #E5E5E5` + `padding 2rem`
- 다크: `bg #122643` + `border 1px solid rgba(255,255,255,0.15)` + `padding 2rem`
- Hover: 라이트 `border #051C2C` / 다크 `border #42AFFF`

**L3 Sub-card (카드 안의 카드)**
- 라이트: `bg #F5F5F5` + `border 1px solid #E5E5E5`
- 다크: `bg #1F2E5C` + `border 1px solid rgba(66,175,255,0.30)`
- 명확한 색차로 L2와 구분

**L4 Inline highlight (sub-card 안의 강조 박스)**
- 라이트: `bg rgba(34,81,255,0.06)` + `border-left 2px solid #2251FF`
- 다크: `bg rgba(66,175,255,0.10)` + `border-left 2px solid #42AFFF`

### 4.3 Form Fields (input/textarea/select)
**라이트 모드**
```css
background: #FFFFFF;
border: 1px solid #E5E5E5;
color: #051C2C;
placeholder: #999999;
focus: border #2251FF + 3px shadow ring;
```
**다크 모드**
```css
background: rgba(255,255,255,0.06);
border: 1px solid rgba(255,255,255,0.20);
color: #F8FAFC;
placeholder: rgba(255,255,255,0.45);
focus: border #2251FF;
```
**라이트 강제 input (다크 모드)** — 텍스트 검정 강제 (가독성)

### 4.4 Chart 색상
**Stack chart** (같은 데이터 단계): navy-900 → navy-500 → blue-500 → blue-300 → blue-200 → blue-100
**Categorical** (다른 카테고리): navy-900 / blue-500 / teal / magenta (최대 4)
**Line chart**:
- 강조: `#2251FF` 굵은 2px
- 보조: `#42AFFF` 1px
- 가이드: `#999999` dashed
**다크 모드 강제**:
- axis text: `#F8FAFC`
- gridline: `rgba(255,255,255,0.18)`
- tooltip: `bg #0A1628 + 흰 글씨`

### 4.5 선/Divider 표준
| 종류 | 라이트 | 다크 |
|---|---|---|
| Section divider (큰) | `1px solid #E5E5E5` | `1px solid rgba(255,255,255,0.12)` |
| Card hairline | `1px solid #E5E5E5` | `1px solid rgba(255,255,255,0.15)` |
| Inline divider | `1px solid #BFBFBF` | `1px solid rgba(255,255,255,0.18)` |
| Brass accent line | `2px solid #2251FF` | `2px solid #42AFFF` |
| Dashed guide | `1px dashed #BFBFBF` | `1px dashed rgba(255,255,255,0.20)` |

### 4.6 Tables
**라이트 모드**
```
header: bg #F5F5F5 + color #051C2C + Bold
row hairline: #E5E5E5
강조 row: bg rgba(34,81,255,0.06)
hover: bg #F5F5F5
```
**다크 모드**
```
header: bg #0A1628 + color #FFFFFF + Bold
row hairline: rgba(255,255,255,0.06)
강조 row: bg rgba(66,175,255,0.12) + color #FFFFFF
hover: bg rgba(255,255,255,0.04)
```

---

## 5. Layer System utility classes (globals.css)

```css
/* Layer 0 — 페이지 outermost */
.mck-l0 { background: #FFFFFF; color: #051C2C; }
.dark .mck-l0 { background: #051C2C; color: #FFFFFF; }

/* Layer 1 — 섹션 */
.mck-l1 { background: #F5F5F5; color: #051C2C; padding: 5rem 0; }
.dark .mck-l1 { background: #0A1628; color: #FFFFFF; }

/* Layer 2 — 카드 */
.mck-l2 {
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  color: #051C2C;
  padding: 2rem;
  border-radius: 0;
  transition: border-color 200ms;
}
.mck-l2:hover { border-color: #051C2C; }
.dark .mck-l2 {
  background: #122643;
  border-color: rgba(255,255,255,0.15);
  color: #FFFFFF;
}
.dark .mck-l2:hover { border-color: #42AFFF; }

/* Layer 3 — 카드 안의 sub-카드 */
.mck-l3 {
  background: #F5F5F5;
  border: 1px solid #E5E5E5;
  color: #051C2C;
  padding: 1.25rem;
  border-radius: 0;
}
.dark .mck-l3 {
  background: #1F2E5C;
  border-color: rgba(66,175,255,0.30);
  color: #FFFFFF;
}

/* Layer 4 — 라벨/highlight */
.mck-l4 {
  background: rgba(34,81,255,0.06);
  border-left: 2px solid #2251FF;
  color: #051C2C;
  padding: 0.75rem 1rem;
  border-radius: 0;
}
.dark .mck-l4 {
  background: rgba(66,175,255,0.10);
  border-left-color: #42AFFF;
  color: #FFFFFF;
}
```

### 5.1 자동 텍스트 색 (Layer 안 자식 요소)
```css
.mck-l1 h1, .mck-l1 h2, .mck-l2 h1, .mck-l2 h2, .mck-l3 h3 { color: inherit; }
.mck-l1 p, .mck-l2 p, .mck-l3 p { color: inherit; opacity: 0.85; }
.mck-l1 .caption, .mck-l2 .caption { opacity: 0.65; }
```

---

## 6. 컨텍스트별 자동 가독성 보장

```css
/* 다크 컨테이너 안의 inline navy 텍스트 → 자동 흰톤 */
.dark .mck-l0 *[style*="color: #051C2C"],
.dark .mck-l1 *[style*="color: #051C2C"],
.dark .mck-l2 *[style*="color: #051C2C"] {
  color: #FFFFFF !important;
}

/* 라이트 카드 안의 inline 흰톤 텍스트 → navy 강제 */
.mck-l2 *[style*="color: rgba(255, 255, 255"],
.mck-l2 *[style*="color: #FFFFFF"] {
  color: #051C2C !important;
}
.mck-l2 .force-white { color: #FFFFFF !important; } /* 예외 명시 */
```

---

## 7. 패턴 — Featured Insight Layer 구조 예시

```
[L0 페이지 흰 배경]
  [L1 섹션 light gray 배경]
    [L2 Featured Card 흰 박스 + hairline]
      ┌───────────────┬──────────────────────┐
      │ 이미지         │ Eyebrow (uppercase)  │
      │               │ H2 헤딩 (큰 navy)     │
      │               │ Date · Body summary  │
      │               │                      │
      │               │ [L3 Sub-card]        │
      │               │ ▸ 핵심 지표 1 (navy) │
      │               │ ▸ 핵심 지표 2        │
      │               │                      │
      │               │ [L4 highlight box]   │
      │               │ "핵심 결론 한 줄"     │
      │               │                      │
      │               │ → CTA (Primary blue) │
      └───────────────┴──────────────────────┘
```

각 Layer 안의 텍스트가 항상 명확히 보이는 구조.

---

## 8. 적용 매트릭스 (전수 페이지)

| 페이지 | 라이트 적용 Layer | 다크 적용 Layer | 상태 |
|---|---|---|---|
| 메인 hero | L0 + L1 hero + L2 cards | 동일 | 🔧 진행 |
| 거래소 | L0 + L1 + L2 카드 + L3 sub | 동일 | 🔧 진행 |
| 딜룸 | L0 + L2 채팅/문서 + L3 메시지 | 다크 모드 | 🔧 진행 |
| 분석 대시보드 | L0 + L2 도구 카드 + L4 라벨 | 동일 | 🔧 진행 |
| 분석 리포트 | L0 + L1 헤더 + L2 결과 + L3 sub | 동일 | 🔧 진행 |
| 매물 등록 | L0 + L2 폼 + L3 input | 동일 | 🔧 진행 |
| Admin | L0 + L2 표 + L3 셀 | 동일 | 🔧 진행 |
| Footer | L0 다크 + 흰 텍스트 | 동일 | ✅ |

---

## 9. 거버넌스

- 모든 새 컴포넌트는 본 4-Layer 시스템 사용 의무
- L0~L4 외 임의 색상 사용 = 차단
- emerald/amber/red/purple Tailwind utility 사용 = 차단 (globals.css가 강제 무력화)
- multi-stop gradient (4색 이상) = 차단
- 차트 색상 ≥ 6종 = 데이터 재설계

---

_v4 작성자 · NPLatform Global Design Advisory · 2026-04-25_
_핵심: "도형 안의 도형 안의 도형까지" 4-Layer 명확 위계_
