# 자산 통합 경험 플랜 (Asset Unified Experience)

> **2026-04-21 · 후속 SSoT · DR-1~2d 흡수 · DR-3 이후 전면 대체**
> 이 문서는 "거래소 매물 상세 ≠ 딜룸" 이분법을 폐기하고,
> **1 자산 = 1 URL = 1 화면, 상태로 진화** 라는 단일 원칙을 실현합니다.

---

## 🎯 전략기획 관점 — 우리가 푸는 문제

### 근본 인사이트
현재 플랫폼은 **같은 자산을 두 장소에서 보여주고 있습니다**:
- `/exchange/[id]` — "탐색·검토" 모드
- `/deals/[id]` — "거래 실행" 모드

이 둘은 **같은 채권·같은 담보·같은 매도자·같은 조건**을 반복 렌더합니다. 사용자는:
1. 매물 상세에서 "관심 있음" 을 누름
2. 딜룸으로 **페이지 전환** — 같은 정보를 다시 봄
3. NDA 서명 → 또 다른 페이지
4. LOI → 또 다른 페이지 (DR-1 에서 통합됨)

**모든 전환은 "컨텍스트 리셋"** — 글로벌 핀테크 UX 원칙에 위배. Linear 이슈 / Figma 파일 / Stripe 결제 링크는 하나의 URL 이 끝까지 따라갑니다.

### 글로벌 벤치마크
| 서비스 | 패턴 | 우리에게 주는 교훈 |
|--------|------|------------------|
| Mission Capital (US NPL) | 1 asset = 1 URL, 권한별 공개 | 자산 단위 영속 URL |
| Bloomberg Terminal | 티커 하나에 워크스페이스 다중 | 상태는 주소가 아닌 "뷰"에서 |
| Stripe Payment Link | 링크가 결제 전/중/후 자동 전환 | URL 이 "진화" |
| Linear Issue | 상태 변화해도 URL 고정 | 컨텍스트 유지 = 속도 |
| Figma File | 협업자 수 증가해도 같은 파일 | 관계 확장 = 화면 풍부화 |

### 혁신 가설
> *"자산 주소가 영속적이고, 사용자 상태(티어 L0~L5)에 따라 화면이 스스로 진화하면, 페이지 전환 = 0, 거래 속도 = ∞."*

---

## 🎨 UX 관점 — 어떻게 단순해지는가

### 단일 자산 페이지 `/exchange/[id]`

**비로그인 (L0)**:
```
┌─────────────────────────────────────────────────┐
│ 강남구 아파트 NPL · 담보 ₩12억 · 할인율 약 25%   │
│ ●○○○○○ (관심 → NDA → LOI → 실사 → 서명 → 정산) │
├─────────────────────────────────────────────────┤
│ 좌: 공개 요약        중: [관심 표시하기]           │
│  - 담보 유형/지역     (대형 CTA 하나만)           │
│  - 감정가            "로그인 후 NDA 열람 가능"    │
│  - 희망 매각가 🔒    우: ❌ (로그인 안내 카드)    │
└─────────────────────────────────────────────────┘
```

**NDA 체결 후 (L2)**:
```
┌─────────────────────────────────────────────────┐
│ 강남구 아파트 NPL · 진행률 35% · 최근 활동 5분 전 │
│ ✓관심 ✓NDA ●LOI ○실사 ○서명 ○정산                │
├─────────────────────────────────────────────────┤
│ 좌: 풀 정보          중: [LOI 제출]               │
│  - 등급·예상 IRR      (+ 최근 오퍼·부가 액션)      │
│  - 선순위/후순위      우: 💬 채팅 + 📁 문서       │
│  - 현장 사진                                       │
└─────────────────────────────────────────────────┘
```

**계약 체결 후 (L4)**:
```
중 CTA 가 [전자서명 · 에스크로 입금] 으로 자동 전환
우 chat pane 옆에 에스크로 상태 카드 surface
```

### 핵심 원칙
1. **CTA 하나가 전체 여정을 인도** — 사용자는 "다음에 뭘 해야 할지" 절대 헤매지 않음
2. **정보는 티어에 맞게 스스로 공개** — "잠금 해제" 는 NDA·LOI 같은 맥락적 액션의 자연스러운 결과
3. **페이지 전환 금지** — 모든 진행이 인라인 모달·Optimistic UI 로
4. **탭은 최소** — 하단 상세 작업 탭 8개 → **3개**

---

## ⚙️ 프로세스 관점 — 사용자 여정 하나로

```
[매물 발견] → [상세 URL /exchange/[id]] ═════════════════════════════ [정산 완료]
                 │
                 ├─ L0: 관심 표시 (인라인 버튼 1클릭)
                 ├─ L1: NDA 서명 (모달, 전자서명 3초)
                 ├─ L2: LOI 제출 (인라인 폼)
                 ├─ L3: 실사·자료 요청 (Data Room 열림)
                 ├─ L4: 계약·전자서명·에스크로 (모달 → Optimistic)
                 └─ L5: 영수증 · 완료
```

**페이지 이동 0회**. 모든 단계가 같은 URL 에서 진행됩니다.

### "내 거래" 는 필터, 별도 페이지 아님
- `/deals` → `/exchange?filter=my-active` 리다이렉트 + 필터 프리셋
- 대시보드의 "진행 중 거래 3건" → 필터된 exchange 리스트로 연결

---

## 💻 프론트엔드 관점 — 라우트·컴포넌트 통합

### 삭제할 라우트
| 경로 | 처리 |
|------|------|
| `app/(main)/deals/[id]/page.tsx` | **삭제** → `/exchange/[id]` 로 통합 |
| `app/(main)/deals/page.tsx` | **단순화** → `/exchange?filter=my-active` 리다이렉트 |
| `app/(main)/exchange/[id]/nda/` | ✅ 이미 DR-1 에서 삭제됨 |
| `app/(main)/exchange/[id]/loi/` | ✅ 이미 DR-1 에서 삭제됨 |
| `app/(main)/exchange/[id]/dataroom/` | ✅ 이미 DR-1 에서 삭제됨 |
| `app/(main)/exchange/[id]/escrow/` | ✅ 이미 DR-1 에서 삭제됨 |
| `app/(main)/exchange/[id]/flow/` | ✅ 이미 DR-1 에서 삭제됨 |

### 핵심 컴포넌트 (재사용)
```
app/(main)/exchange/[id]/page.tsx  ← 유일 자산 페이지

components/asset-room/              ← 기존 components/deal-room/ 을 개명·확장
  ├─ AssetHeader.tsx               (DealHeader 리네임)
  ├─ AssetRoomShell.tsx            (DealRoomShell 유지)
  ├─ AssetSummaryPane.tsx          (L0~L5 티어 대응 강화)
  ├─ AssetActionPane.tsx           (CTA 파생 로직은 useAssetTier hook 으로 분리)
  ├─ AssetChatPane.tsx             (L2+ 에서만 렌더)
  └─ tier/
      ├─ useAssetTier.ts           ← 단일 진실 공급원
      └─ tier-config.ts            (L0-L5 → { CTA, 공개 필드, UI variant })
```

### 탭 재편 — 8개 → **3개**
| 구버전 (8개) | 신버전 (3개) |
|------------|-----------|
| 문서 + 실사 체크 | **📁 자료** (문서 + Data Room + 실사 체크리스트 통합) |
| 오퍼 + AI 분석 + 감사 | **📝 이력** (오퍼 타임라인 + AI 인사이트 + 활동 로그 통합) |
| 계약 + 에스크로 + 미팅 | **⚖️ 거래** (전자서명 + 에스크로 + 미팅 일정 통합) |

> AI 분석은 하단 탭 대신 **요약 pane 상단 배지** ("AI 등급 A · 예상 IRR 18.5%") 로 상시 노출.

### 단일 진실 공급원 — `useAssetTier(id)`
```ts
const { asset, tier, actions, reload } = useAssetTier(assetId)
// asset: 자산 데이터 (티어별 필드 자동 마스킹)
// tier: "L0" | "L1" | ... | "L5"
// actions: Array<{ type, label, disabled, onClick }>
//   예: [{ type: "NDA_SIGN", label: "NDA 서명", disabled: false, onClick: openNdaModal }]
```
모든 자식 컴포넌트는 `tier` 와 `actions` 만 소비 — 개별 분기 로직 제거.

---

## 🗄️ 백엔드 관점 — API 통합

### 현재 (파편화)
```
GET /api/v1/exchange/listings/[id]
GET /api/v1/exchange/deals/[id]
GET /api/v1/exchange/deals/[id]/documents
GET /api/v1/exchange/deals/[id]/offers
GET /api/v1/exchange/deals/[id]/messages
POST /api/v1/exchange/deals/[id] (PATCH 스테이지)
```

### 통합 후
```
GET  /api/v1/assets/[id]              ← 단일 진실 공급원
POST /api/v1/assets/[id]/progress     ← 다음 단계로 (NDA, LOI, Contract, Escrow)
POST /api/v1/assets/[id]/messages     ← 채팅
GET  /api/v1/assets?filter=my-active  ← 내 거래 (/deals 대체)
```

응답은 **티어 인지(tier-aware)**:
```ts
// L0 응답
{
  id, title, collateral: {type, region}, appraisalValue,
  tier: "L0",
  actions: [{ type: "MARK_INTEREST", label: "관심 표시하기" }],
  locked: ["principal", "askingPrice", "grade", "estIrr", ...]
}

// L2 응답 (NDA 서명 후)
{
  id, title, collateral, principal, askingPrice, grade, estIrr, ...,
  tier: "L2",
  actions: [{ type: "SUBMIT_LOI", label: "LOI 제출" }],
  chat: { enabled: true, channelId: "..." },
  documents: [...]
}
```

기존 API 는 310 일간 deprecation 경고와 함께 유지 → 이후 삭제.

---

## 🚀 실행 플랜

### DR-3: Asset 통합 (총 4일)

#### DR-3-A · URL 통합 (0.5일)
- `/deals/[id]` → `/exchange/[id]` 308 리다이렉트
- `/deals` → `/exchange?filter=my-active` 리다이렉트
- 내부 Link 전부 치환 (grep 으로 일괄)
- **완료 기준**: `/deals` 클릭 시 `/exchange?filter=my-active` 로 자연스럽게 이동

#### DR-3-B · 단일 페이지 통합 (1.5일)
- `/exchange/[id]/page.tsx` 가 기존 `/deals/[id]` 기능을 완전 흡수
- 현재 `/deals/[id]/page.tsx` (2400줄) → `/exchange/[id]/page.tsx` 로 병합
  - 기존 exchange 상세 페이지의 사진 갤러리·지도 등은 **좌측 pane 또는 헤더 상단** 에 흡수
- `useAssetTier(id)` hook 신설 — 모든 티어 로직 단일화
- **완료 기준**: `/exchange/[id]` 하나로 L0~L5 전부 렌더 가능

#### DR-3-C · 정보 아키텍처 축약 (0.5일)
- 하단 탭 8개 → 3개 (자료 / 이력 / 거래)
- AI 분석 → 요약 pane 상단 배지로 이동
- 미팅 → 거래 탭에 흡수
- 감사 → 이력 탭에 흡수
- **완료 기준**: 스크린샷 비교로 "탭 개수 8 → 3" 확인

#### DR-3-D · 인라인 진행 (1일)
- NDA 서명 모달 (인라인, 페이지 이동 없음, 전자서명 재사용)
- LOI 제출 폼 (인라인 드로어)
- Optimistic UI — 서버 응답 전 tier 즉시 업그레이드
- 실패 시 rollback + 토스트
- **완료 기준**: NDA → LOI → 실사 전환이 URL 변경 0회로 완료

#### DR-3-E · 백엔드 통합 API (1일, 병렬 가능)
- `/api/v1/assets/[id]` 신설 — tier-aware 응답
- `/api/v1/assets/[id]/progress` POST — 상태 전이 단일 엔드포인트
- 기존 API 는 deprecated 주석 + Sentry 경고만 추가
- **완료 기준**: 프론트가 신 API 만 호출, 기존 API 호출 0건

#### DR-3-F · 검증 (0.5일)
- 시나리오 테스트: 익명 → 로그인 → 관심 → NDA → LOI → 실사 → 서명 → 정산
- 각 티어 전환이 페이지 리로드 없이 자연스러운지
- 모바일 동등성 (iPhone SE · iPad 검증)
- Lighthouse 점수 (Performance ≥ 90, Accessibility ≥ 95)

---

## 📊 성공 지표 (Post-DR-3)

| 지표 | Before | Target | 측정 방식 |
|------|--------|--------|----------|
| 자산 1개당 URL 수 | 2~7 (exchange + deals + 5 서브라우트) | **1** | 라우트 그램 |
| 페이지 전환 (관심→정산) | 5~7 회 | **0 회** | 분석 로그 |
| 탭 수 | 9 | **3** | UI 감사 |
| 중복 컴포넌트 | OverviewTab/ShellOverview/RightPanel 등 | **0** | 코드 감사 |
| API 엔드포인트 (asset 관련) | 6+ | **3** | `/api/v1/assets*` |
| `/exchange/[id]` 번들 (First Load) | 228 KB | **< 180 KB** | `next build` |
| 관심 → NDA 완료 시간 | ~90 초 (페이지 3회 로드) | **< 15 초** | UX 타이머 |

---

## 🗑️ 삭제·축소 대상 (짓지 않는 것이 건축)

### 삭제
- `app/(main)/deals/[id]/` (전체) — 기능은 exchange 에 흡수
- `app/(main)/deals/page.tsx` → 리다이렉트로 축소
- `components/deal-room/` → `components/asset-room/` 개명 (legacy alias 유지)
- 기존 legacy API 6개 (310일 후)

### 축소
- 하단 탭 8 → 3
- `page.tsx` 2400줄 → **< 1500줄** (중복 제거 + 명확한 관심사 분리)
- 개별 tier 분기 로직 → `useAssetTier` 단일화

### 유지
- 3-Zone 셸 컴포넌트 (Summary/Action/Chat Pane) — 콘셉트는 이미 정답
- DealHeader (스테퍼 포함) — 개명만 (AssetHeader)
- 전자서명/에스크로 로직 — 모달로 포팅

---

## 🎯 원 줄 요약

> **"하나의 자산은 하나의 URL, 하나의 화면, 하나의 CTA. 사용자는 움직이지 않고 자산이 진화한다."**

---

## 연관 문서
- `docs/Deal_Room_Redesign_Plan_2026-04-20.md` — 선행 계획 (DR-1~2d 완료) · 본 문서로 승계
- `docs/NPLatform_Development_Phases_Plan.md` — 메인 Phase 로드맵
- `CLAUDE.md` — 프로젝트 컨벤션

## 변경 이력
- **2026-04-21** · 초안 작성 · DR-2c 중첩 이슈를 계기로 근본 재설계
