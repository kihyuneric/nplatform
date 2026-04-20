# Phase 1-NX · Design System Reset Plan

> **발행**: 2026-04-20  
> **상태**: Draft → 사용자 승인 대기  
> **책임**: Global Design System Lead (Claude)  
> **전제**: D1~D9 프로덕션 배포 완료 (`5c08fdb`, `dpl_HvShLCorrypi6Pbrmr3Hfz4KrELi`)  
> **보류**: Phase 1-M Sprint 3 · D9 (공개 입찰 모달 연동) · D10 (알림톡 파이프라인)

---

## 0. Executive Summary (3줄 요약)

1. **이론은 있는데 규율이 없다.** `app/globals.css`에 세 겹의 토큰 시스템이 공존(legacy / NPL v3 / Semantic v2) · 같은 클래스가 3~4번 중복 정의됨 → 어떤 색이 어디서 오는지 추적 불가.
2. **라이트모드는 명목상 기본, 실질적으로는 다크 전용.** 헤더는 `bg-brand-deep` 고정 · 네비 텍스트는 흰색 고정 · Switch unchecked 배경은 `#CBD5E1`(흰 배경과 거의 동일) · Toaster는 `!bg-emerald-950` 하드코딩.
3. **테마 토글이 인증 게이팅됨.** `components/layout/navigation.tsx` L488에만 `<ThemeToggle>` 존재 → 로그인 사용자 전용. 비로그인 게스트에겐 라이트/다크 전환 UI가 없음. 이는 보편적 접근성 원칙 위반.

→ **조치**: D9/D10을 잠시 보류하고, **Phase 1-NX(토큰 SSoT 재정립) → 1-NY(다크모드 가독성) → 1-NZ(마감)** 3단계를 선행 실행. 완료 후 D9/D10 재개.

---

## 1. Root Cause Diagnosis — 6가지 근본 원인

### ① 토큰 SSoT 부재 — 3중 레이어 공존
- **증거**: `app/globals.css` 전체 2282줄 스캔 결과
  - Legacy Institutional Edge: `--color-brand-deepest`, `--color-brand-deep`, `--color-text-primary` (라인 40~150)
  - NPL v3: `--surface-0` ~ `--surface-5`, `--text-1` ~ `--text-4` (라인 300~450)
  - Semantic Tokens v2 OKLCH: `--surface-0`, `--fg-strong`, `--brand-primary`, `--intent-positive` (라인 800~1000)
- **영향**: 같은 의미의 색을 3가지 다른 이름으로 참조 가능 → 컴포넌트마다 다른 토큰을 쓰므로 테마 전환 시 불일치.
- **예**: 헤더는 `--color-brand-deep` (legacy) · 카드는 `--surface-1` (NPL v3) · 버튼은 `--intent-positive` (Semantic v2).

### ② 클래스 중복 정의 — 선언 순서에 따라 결과가 바뀜
- **증거**: `app/globals.css`에서 아래 클래스가 각각 3~4회 중복 정의됨
  - `.stat-card` — L504, L1194, L1272
  - `.card-interactive` — L1693, L1972
  - `.section-title`, `.section-eyebrow`, `.tab-line`, `.data-table` — 유사
- **영향**: 마지막 선언이 이김 → 수정 시 "왜 안 먹히지?" 디버깅 지옥. CSS cascade가 엔지니어의 의도를 배신.

### ③ 헤더가 테마에 반응하지 않음 (fixed-dark Header)
- **증거**: `components/layout/navigation.tsx` L408
  ```tsx
  className="... bg-[var(--color-brand-deep)] ..."
  ```
  그리고 `app/globals.css` L154~158:
  ```css
  --color-nav-text: rgba(255, 255, 255, 0.92);
  --color-nav-text-hover: #FFFFFF;
  ```
  → 라이트/다크 모드 양쪽에서 모두 흰색 고정.
- **영향**: 유저가 라이트모드로 전환해도 헤더만 네이비 → "라이트 모드가 적용 안 된다"는 체감.

### ④ 테마 토글이 비로그인 유저에게 보이지 않음
- **증거**: `components/layout/navigation.tsx`
  - L488 (로그인 분기): `<ThemeToggle variant="icon" />` ✅
  - L591 (게스트 분기): `<LanguageSelector />` + login/signup 버튼만 ❌
- **영향**: 비로그인 방문자는 다크/라이트를 선택할 수 없음. WCAG 1.4.3 (Contrast) + 보편적 접근성 위반. 브랜드 첫인상 제어권 박탈.

### ⑤ Switch 컴포넌트 unchecked 상태 가시성 실패
- **증거**: `app/globals.css` L1053
  ```css
  button[role="switch"][data-state="unchecked"] {
    background-color: #CBD5E1 !important;
  }
  ```
  - `#CBD5E1` (slate-300) contrast ratio on white `#FFFFFF` = **1.39:1** (WCAG AA 3:1 요구 미달)
- **영향**: `/exchange/sell` 매각 주체 확인 단계의 "전속 계약" 토글이 흰 배경에서 시각적으로 사라짐. 사용자가 토글 존재 자체를 인지 못함.

### ⑥ Toaster · 일부 고정 컴포넌트가 다크 전용 하드코딩
- **증거**: `app/layout.tsx` Toaster 설정
  ```tsx
  toastOptions={{
    classNames: {
      success: '!bg-emerald-950 !text-emerald-300 !border-emerald-900',
      error:   '!bg-rose-950 !text-rose-300 !border-rose-900',
    },
  }}
  ```
- **영향**: 라이트모드에서 토스트가 화면과 대조되지 않고 무겁게 튐. 테마 일관성 깨짐.

---

## 2. Design Philosophy — **Institutional Calm**

> 우리가 지향하는 것: **JP Morgan의 신뢰감** × **Stripe의 밀도 있는 명료함** × **IBM Carbon의 토큰 엄격함** × **Material You의 적응형 컬러**

### 2-1. Brand Identity Pillars
| Pillar | Meaning | Visual Expression |
|--------|---------|-------------------|
| **Trust** | 금융 기관급 신뢰 | Navy `#1B3A5C` 앵커 · 세리프 없는 Geometric Sans · 4px 그리드 |
| **Clarity** | 데이터 밀도 높이되 혼잡하지 않게 | 1.4:1 이하 대비 절대 금지 · tabular-nums 숫자 · 12-16-20-28 타입 스케일 |
| **Calm** | 과잉 장식 배제 | 채도 낮은 중립 기반 · Accent(#10B981)는 "행동"에만 사용 |
| **Adaptive** | 사용자 환경 존중 | 라이트 기본 / 다크 선택 · 시스템 prefers-color-scheme 폴백 |

### 2-2. Color Philosophy
- **Light mode가 기본** (한국 금융 앱 컨벤션 + 주간 사용 가정). 다크는 야간/개발자용 선택지.
- **OKLCH 기반 지각적 균일성** — HSL은 밝기가 지각과 불일치. OKLCH L*값으로 톤 단계 설계.
- **채도 최소화** — Neutral tier 5단(#FAFBFC → #0B1220)을 중심축으로, 브랜드/인텐트 컬러는 CTA·상태에만.
- **대비 최소 4.5:1 (AA)**, 본문은 7:1 (AAA) 지향.

---

## 3. Token Architecture Reset — 3-Layer Ladder

### 3-1. 단일 SSoT 원칙
- **유일한 소스**: `app/globals.css`의 `@layer tokens` 블록에 Semantic Tokens v2 (OKLCH) **만** 정의.
- **Legacy & NPL v3 네임**: 삭제하지 말고 **alias 로 전환** (`--color-brand-deep: var(--surface-inverse);`) → 기존 컴포넌트 깨지지 않음.
- **중복 정의 전체 제거** — `.stat-card`, `.card-interactive` 등은 1회만 정의.

### 3-2. 3-Layer 토큰 설계

**Layer 1: Surface Ladder** (배경/표면)
| Token | Light (OKLCH) | Dark (OKLCH) | 용도 |
|-------|---------------|--------------|------|
| `--surface-0` | `oklch(99% 0.002 255)` `#FCFCFD` | `oklch(14% 0.015 255)` `#0B1220` | 페이지 베이스 |
| `--surface-1` | `oklch(98% 0.003 255)` `#F7F8FA` | `oklch(18% 0.018 255)` `#111827` | 카드 배경 |
| `--surface-2` | `oklch(95% 0.005 255)` `#EEF0F4` | `oklch(22% 0.02 255)` `#1A2332` | Elevated 카드 · Input |
| `--surface-3` | `oklch(90% 0.008 255)` `#DDE1E8` | `oklch(28% 0.022 255)` `#26324A` | Divider · Inactive |
| `--surface-inverse` | `oklch(22% 0.04 250)` `#1B3A5C` | `oklch(92% 0.01 255)` `#E5E9F0` | 헤더 · Dark CTA (라이트에서만 사용) |

**Layer 2: Content Ladder** (텍스트/아이콘)
| Token | Light | Dark | 대비 vs surface-0 | 용도 |
|-------|-------|------|-------------------|------|
| `--fg-strong` | `#0B1220` | `#FCFCFD` | 18:1 · 18:1 | 제목 · 핵심 숫자 |
| `--fg-default` | `#1F2937` | `#E5E9F0` | 14:1 · 14:1 | 본문 |
| `--fg-muted` | `#6B7280` | `#9CA3AF` | 4.6:1 · 4.8:1 | 라벨 · 부연 |
| `--fg-subtle` | `#9CA3AF` | `#6B7280` | 2.8:1 · 3.0:1 | placeholder (AA 대상 아님) |
| `--fg-on-inverse` | `#FCFCFD` | `#0B1220` | — | inverse surface 위 텍스트 |

**Layer 3: Intent Tokens** (상태/액션)
| Token | Light | Dark | 용도 |
|-------|-------|------|------|
| `--intent-positive` | `#10B981` (oklch 73% 0.17 160) | `#34D399` | 성공 · 수락 · CTA |
| `--intent-warning` | `#F59E0B` | `#FBBF24` | 주의 · 진행 중 |
| `--intent-danger` | `#EF4444` | `#F87171` | 에러 · 거절 · 철회 |
| `--intent-info` | `#2E75B6` | `#60A5FA` | 정보 · 링크 |
| `--border-default` | `#E5E7EB` | `#2A3441` | 기본 테두리 |
| `--border-strong` | `#9CA3AF` | `#4B5563` | 포커스 · Selected |

### 3-3. 규약
- **절대 금지**: 컴포넌트 내 하드코딩된 색 (`#FFFFFF`, `bg-white`, `bg-gray-100`). 예외 없음.
- **Tailwind utility**는 테마 토큰에 매핑된 것만 사용 (`bg-surface-1`, `text-fg-strong`).
- **Switch, Toaster** 등 Radix/3rd-party 컴포넌트는 `data-[state]` 기반 토큰 오버라이드로 일원화.

---

## 4. Phase 1-NX · Implementation Plan

> **목표**: 라이트모드가 "정말로 기본"이고, 비로그인 유저도 쾌적하게 쓰는 디자인 시스템 확립.  
> **총 예상**: 18~22시간 (1.5 영업일)

### NX-1. Token SSoT 통합 (4~5h) 🔴 P0
- `app/globals.css` 토큰 블록 재작성 (3-Layer 구조)
- Legacy / NPL v3 토큰 → Semantic v2 alias 로 변환
- 중복 클래스 정의 제거 (`.stat-card` 등 8개)
- **성공 지표**: `grep -c "--surface-0" app/globals.css` == 2 (라이트/다크 각 1회)

### NX-2. 비로그인 테마 토글 노출 (1h) 🔴 P0
- `components/layout/navigation.tsx` L591 게스트 분기에 `<ThemeToggle variant="icon" />` 추가
- 모바일 네비 게스트 영역에도 동일 추가
- **성공 지표**: 시크릿 창에서 접속 → 테마 토글 클릭 → 라이트↔다크 전환 동작

### NX-3. 헤더 라이트모드 적응 (2~3h) 🔴 P0
- `navigation.tsx` L408 `bg-[var(--color-brand-deep)]` → `bg-surface-0 dark:bg-surface-inverse`
- `--color-nav-text` 라이트/다크 분기 정의 (라이트: `#1F2937`, 다크: `#E5E9F0`)
- 로고 색상 토큰 분기 · hover 상태 재설계
- **성공 지표**: 라이트모드에서 헤더가 흰색 기반 · 네비 텍스트 가독성 AA 통과

### NX-4. Switch 컴포넌트 가시성 수정 (1h) 🔴 P0
- `app/globals.css` L1053 재작성:
  ```css
  button[role="switch"][data-state="unchecked"] {
    background-color: var(--surface-3);
    border: 1px solid var(--border-strong);
  }
  button[role="switch"][data-state="checked"] {
    background-color: var(--intent-positive);
  }
  ```
- **성공 지표**: `/exchange/sell` 1단계 "전속 계약" 토글이 라이트모드에서 명확히 보임 (대비 3:1 이상)

### NX-5. `/exchange/sell` 매물 등록 마법사 감사 (2~3h) 🟠 P1
- 전체 6스텝 라이트/다크 양쪽 스크린샷 대조
- `매각 주체 확인` Step — `text-fg-strong` 누락 필드 전체 보정
- 입력 필드/셀렉트/체크박스 토큰 마이그레이션
- **성공 지표**: 각 스텝의 모든 레이블·입력·버튼이 라이트모드에서 4.5:1 이상

### NX-6. LanguageSelector 렌더링 검증 (30m) 🟡 P2
- 헤더/모바일 네비/풋터의 LanguageSelector 표시 여부 확인
- "깨짐"의 정확한 재현 조건 파악 (screenshot 기반)
- 필요 시 Globe 아이콘·언어 라벨 색 토큰 마이그레이션
- **성공 지표**: 3개 뷰포트(360/768/1440)에서 정상 렌더

### NX-7. 크로스 라우트 WCAG AA 대비 감사 (3~4h) 🟠 P1
- 감사 대상 14개 루트: `/`, `/exchange`, `/exchange/sell`, `/exchange/[id]`, `/market`, `/deal-rooms`, `/npl-analysis`, `/community`, `/my`, `/admin`, `/analysis`, `/tools`, `/statistics`, `/login`
- Chrome DevTools Accessibility 패널로 각 페이지 위반 건수 기록
- 상위 20개 위반 일괄 수정
- **성공 지표**: 전체 위반 건수 0 또는 < 5

---

## 5. Phase 1-NY · Dark Mode Readability (이어서 진행)

> **총 예상**: 6~8시간

### NY-1. 다크 전용 대비 검증 (2~3h) 🟠 P1
- NX-1 토큰이 다크모드에서도 AA/AAA 통과하는지 programmatic 체크
- OKLCH L* 값 미세 조정 (필요 시 surface 단계 ±3% 재조정)

### NY-2. 입력·토글·드롭다운 다크 감사 (2~3h) 🟠 P1
- 폼 입력 · 셀렉트 · 체크박스 · 라디오 · 드롭다운 5종 전수 검증
- Radix 기본 스타일 override 누락 확인

### NY-3. 차트 · 테이블 적응형 색상 (2h) 🟡 P2
- Recharts 차트 5종(Line/Bar/Area/Pie/Scatter) 다크 대응
- `.data-table` 헤더/행/호버 상태 토큰 분리
- **성공 지표**: 다크모드에서 차트 라인·범례 대비 4.5:1 이상

---

## 6. Phase 1-NZ · Polish (마감)

> **총 예상**: 2~3시간

### NZ-1. Toaster 테마 통합 (1h) 🟠 P1
- `app/layout.tsx` Toaster `!bg-emerald-950` 하드코딩 제거
- `bg-[var(--intent-positive-soft)]` + `text-[var(--fg-on-positive)]` 토큰 전환

### NZ-2. Empty/Skeleton/Loading 검증 (1~2h) 🟡 P2
- 공통 Empty/Skeleton 컴포넌트 토큰 정리
- 주요 라우트 로딩 상태 시각 대조

---

## 7. Rollout & Verification

### 7-1. 단계별 배포 전략
1. **NX-1 → NX-4 배포** (P0 묶음): `vercel --prod --yes` 로 선 배포 → 사용자 확인
2. **NX-5 → NX-7 배포**: 라우트별 차등 배포 가능
3. **NY 블록**: 한 번에 배포 (다크모드는 단일 컨텍스트)
4. **NZ 블록**: 최종 감사 후 배포

### 7-2. 검증 체크리스트
- [ ] `npm run type-check` 통과
- [ ] `npm run build` 통과
- [ ] Lighthouse Accessibility ≥ 95 (라이트/다크 각각)
- [ ] 14개 핵심 라우트 수동 스크린샷 대조 (라이트/다크 2세트)
- [ ] WCAG AA violation count == 0
- [ ] 시크릿 창에서 테마 토글 동작 확인
- [ ] 모바일 360px / 태블릿 768px / 데스크톱 1440px 3개 뷰포트 검증

### 7-3. Rollback 계획
- NX 브랜치를 별도로 관리하지 않고 `claude/silly-brahmagupta-527262`에서 이어서 커밋.
- 각 NX-* 태스크 완료마다 개별 커밋 → 문제 발생 시 `git revert <sha>` 로 부분 롤백.

---

## 8. D9 / D10 재개 조건

Phase 1-NX/NY/NZ가 모두 완료되면 다음 조건을 만족해야 D9 재개:
1. 라이트모드에서 `/exchange/sell` 전체 스텝 가독성 확보
2. 비로그인 유저도 테마 토글 가능
3. Switch 컴포넌트 unchecked 상태 대비 3:1 이상
4. Lighthouse A11y ≥ 95

조건 충족 후:
- **D9**: `PublicBidModal` 을 `/exchange/[id]` 페이지에 연동 + Realtime 구독 + `/my/seller` CTA.
- **D10**: 카카오 알림톡/SMS 파이프라인 + `public_bids` 이벤트 트리거.

---

## 9. 예상 타임라인

| 단계 | 내용 | 누적 시간 |
|------|------|-----------|
| Day 1 AM | NX-1 (토큰 SSoT) + NX-2 (게스트 토글) | 6h |
| Day 1 PM | NX-3 (헤더) + NX-4 (Switch) | 10h |
| Day 2 AM | NX-5 (sell 마법사) + NX-6 (LangSel) | 13h |
| Day 2 PM | NX-7 (크로스 라우트 감사) | 17h |
| Day 3 AM | NY-1, NY-2 (다크 검증) | 22h |
| Day 3 PM | NY-3 + NZ-1, NZ-2 (마감) | 27h |
| Day 4 AM | D9 재개 | — |
| Day 4 PM | D10 | — |

---

## 10. 승인 요청

위 플랜대로 진행하기 전에 사용자 확인이 필요합니다:

- [ ] **철학과 3-Layer 토큰 구조** 에 동의하십니까?
- [ ] **NX → NY → NZ → D9 → D10** 순서대로 진행에 동의하십니까?
- [ ] **P0 4건(NX-1~4)을 최우선 묶음 배포** 하는 것에 동의하십니까?
- [ ] 혹시 **우선순위 조정**(예: 먼저 게스트 토글만 즉시 배포)을 원하십니까?

승인 주시면 바로 **NX-1 토큰 SSoT 통합** 부터 착수하겠습니다.
