# DR-4: Fast Trade 단순화

> **2026-04-21 · 글로벌 핀테크 수준 단순화 SSoT**
> DR-3 에서 통합한 `/exchange/[id]` 를 **"한 번 보면 즉시 움직이는"** 페이지로 재설계.
>
> 원칙: *"거래 속도 = UI 복잡도의 반비례"*

---

## 🎯 문제 — 왜 꼬였나

DR-3-A/B 후 `/exchange/[id]` 는 다음을 한 페이지에 쌓았습니다:

1. Top breadcrumb + **tier simulator** (개발용 UI)
2. Hero — 4개 KPI 카드
3. **InlineAssetRoom 3-Zone 셸** (L2+, 신규 추가)
4. Main content — Left 컬럼 (8+ 티어 패널) + Right 컬럼 (360px 스티키 fee breakdown)
5. Mobile sticky CTA

→ 같은 정보가 **3곳** (Hero KPI / 3-Zone 좌측 pane / Right sidebar) 에 중복.
→ 같은 CTA 가 **3곳** (3-Zone action pane / Right sidebar / Mobile sticky) 에 중복.
→ 1722 줄 · 258 KB 번들 · 스크롤 하단 도달 불가.

**Stripe · Robinhood · Bloomberg 는 이렇게 생기지 않았다.**

---

## 🧭 벤치마크 — 글로벌 "Fast Trade" 패턴

| 서비스 | 상세 뷰 구성 | 배움 |
|--------|------------|-------|
| **Robinhood** stock detail | 차트 · 3 stat · Buy 버튼 · 1줄 설명 | 핵심 숫자 3개 + CTA 하나 |
| **Stripe Checkout** | 1 hero + 1 card + 1 button | 결제 = 단일 카드 |
| **Bloomberg Terminal** MSG | 타임라인 스티키 + 워크스페이스 | 진행 상태를 얇게 최상단 |
| **Mission Capital** asset detail | 3-tab (Overview/Docs/Analytics) | 3탭이면 충분 |
| **Linear** issue | 제목 + 메타 + 본문 + 사이드 | 사이드바는 40% 이하 |

---

## 🎨 DR-4 페이지 구조

```
┌──────────────────────────────────────────────────────────┐
│ ← 매물 목록                                  ♥  <tier>   │  ◀ 32px high nav
├──────────────────────────────────────────────────────────┤
│                                                            │
│   강남구 아파트 NPL                              <AI: A>   │
│   채권 12억 · 희망가 9억 · 할인율 25%                        │  ◀ Hero (title + 1줄)
│                                                            │
│   ●─●─○─○─○─○  관심 → NDA → LOI → 실사 → 서명 → 정산      │  ◀ Thin stepper
│                                                            │
├──────────────────────────────────────────────────────────┤
│                                                            │
│   ┌──────────┬──────────┬──────────┐  ┌────────────────┐ │
│   │ 채권잔액  │ 희망 매각가│ AI IRR  │  │  다음 단계      │ │
│   │ 12.0억   │ 9.0억    │ 18.5%   │  │  NDA 서명      │ │  ◀ 3 KPI + 1 CTA
│   └──────────┴──────────┴──────────┘  │  ────────     │ │
│                                         │  30초 완료 →   │ │
│                                         └────────────────┘ │
│                                                            │
├──────────────────────────────────────────────────────────┤
│                                                            │
│   [ 담보 │ 권리 │ 분석 ]                                   │  ◀ 3-탭 (DR-3-C 적용)
│   ─────                                                    │
│   ┌──────────────────────────────────────────────────┐    │
│   │ <선택된 탭의 내용 — 티어별 점진 공개>             │    │
│   │                                                    │    │
│   └──────────────────────────────────────────────────┘    │
│                                                            │
└──────────────────────────────────────────────────────────┘

모바일 (< 768px):
- KPI 3개 가로 스크롤 → 세로 스택
- Primary Action Card 는 bottom sticky
- 3-탭은 그대로
```

### 핵심 원칙
1. **스크롤 한 번** — 접힘/확장 없이 모든 핵심이 2화면 내 노출
2. **시선의 대각선** — 좌상(제목) → 중앙(수치) → 우하(CTA)
3. **한 번에 하나의 질문** — "이 자산은 좋은가?" → "무엇을 해야 하는가?"
4. **숨겨진 것은 진짜 필요할 때만** — 등기/임대차/감정 원본 = 탭 안에

---

## 🗑️ 삭제

| 제거 대상 | 이유 | 대체 |
|----------|------|------|
| `tier simulator` | 개발용 디버그 UI | 환경 변수 `NEXT_PUBLIC_TIER_DEBUG=1` 시만 표시 |
| `InlineAssetRoom` 3-Zone | Hero + Action Card 와 중복 | Action Card 로 대체 |
| `Masking notice banner` | 규제 안내는 footer 로 충분 | `/terms/disclaimer` 링크 |
| `Right sidebar 360px` | CTA/fee 중복 | Action Card 에 흡수 |
| `Fee breakdown sticky` | 결제 단계에서만 필요 | NDA/LOI 모달 안으로 이동 |
| `MiniStat` · `KpiCard` 중복 | 4개 → 3개로 축약 | `KpiRow` 1종으로 통일 |
| `Mobile sticky CTA` 별도 구현 | Action Card 가 bottom-sticky 로 | 동일 컴포넌트 재사용 |

---

## ✅ 유지 (단순화)

| 컴포넌트 | 역할 |
|---------|------|
| `AssetHeroSummary` | 제목 + 1줄 요약 + thin stepper |
| `KpiRow` (3개) | 채권잔액 · 희망매각가 · AI IRR |
| `PrimaryActionCard` | 티어 인지 단일 CTA (모바일은 bottom-sticky) |
| `DetailTabs` (3개) | 담보 · 권리 · 분석 |
| `TierGate` | 탭 안에서만 사용 |

---

## 💻 신규/리팩터 대상

```
app/(main)/exchange/[id]/page.tsx   1722 → ~700줄 (60% 감소)

components/asset-detail/
  ├─ AssetHeroSummary.tsx           ← 신규
  ├─ KpiRow.tsx                     ← 신규
  ├─ PrimaryActionCard.tsx          ← 신규 (기존 DealActionPane 단순화 포팅)
  └─ DetailTabs.tsx                 ← 신규 (3-탭)

컴포넌트 미사용 → 제거 예정:
  - components/deal-room/* (DR-4 이후 archive/)
```

---

## 📊 성공 지표

| 지표 | Before (DR-3) | Target (DR-4) |
|------|--------------|---------------|
| `/exchange/[id]` LOC | 1722 | **< 800** |
| First Load JS | 258 KB | **< 200 KB** |
| 스크롤 길이 (데스크톱) | ~4 화면 | **~2 화면** |
| CTA 위치 수 | 3곳 | **1곳** (+ 모바일 sticky) |
| 탭 수 | 8개 (DR-2d) | **3개** |
| Tier simulator | 상시 노출 | **환경변수 토글** |

---

## 🚀 실행 범위 (1 커밋)

1. **Plan 문서** (이 파일) — 1분
2. **`/exchange/[id]/page.tsx` 재작성** — 핵심 작업
3. **신규 컴포넌트 4종** — `components/asset-detail/`
4. **DR-3 InlineAssetRoom 제거** — dead code
5. **Build + Deploy**

DR-4-A (후속): `components/deal-room/` → `archive/` 이동
DR-4-B (후속): `/api/v1/assets/[id]` tier-aware 통합 API
DR-4-C (후속): 인라인 NDA/LOI 모달

---

## 🎯 원 줄 요약

> **"2 화면 안에 모든 답이 있다. 세 번째 탭을 찾을 필요가 없다."**

---

## 연관 문서
- `docs/Asset_Unified_Experience_Plan_2026-04-21.md` — DR-3 선행 계획
- `docs/Deal_Room_Redesign_Plan_2026-04-20.md` — DR-1~2d (archived)

## 변경 이력
- **2026-04-21** · 초안 작성 · DR-3 배포 후 중복 문제 피드백 반영
