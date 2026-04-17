# NPLatform — Global Benchmark & Development Roadmap
## 글로벌 톱티어 핀테크·플랫폼 기업 대비 현재 수준 진단과 개발 방향

**Strictly Confidential — 2026-04-07 · v1.0**

---

> **이 문서가 답하는 질문**
>
> 1. NPLatform이 모방하고 추월해야 할 글로벌 톱티어 기업은 누구인가?
> 2. 9개 핵심 역량 영역에서 우리의 현재 수준은 톱티어 대비 몇 점인가?
> 3. 각 영역에서 톱티어에 도달하기 위한 구체적 개발 항목은 무엇인가?
> 4. 비즈니스 / 기술 / 디자인 3축에서 90일·6개월·12개월 마일스톤은 무엇인가?

---

# 0. Executive Summary — 현재 수준과 목표

## 0.1 Overall Maturity Score

> **현재 NPLatform의 종합 성숙도는 글로벌 톱티어 대비 약 32/100 점이다.**
> 90일 안에 50점, 6개월 안에 70점, 12개월 안에 85점에 도달해야 카테고리 리더가 된다.

### Exhibit 0.1 — 9 Capability Maturity (vs Global Top Tier)

| # | Capability | 글로벌 벤치마크 | 현재 점수 | 90일 목표 | 12개월 목표 |
|---|---|---|:---:|:---:|:---:|
| 1 | **거래 인프라** (Trading Core) | Carta, AngelList | 25 | 50 | 90 |
| 2 | **딜룸 / 데이터 룸** | Intralinks, Datasite | 20 | 60 | 90 |
| 3 | **AI / Vertical Intelligence** | Reorg, Octus, Pitchbook | 30 | 50 | 80 |
| 4 | **결제 / 정산 / 에스크로** | Stripe, Toss | 15 | 50 | 85 |
| 5 | **신원·보안·컴플라이언스** | Plaid, Persona | 35 | 60 | 90 |
| 6 | **디자인 시스템** | Linear, Stripe, Mercury | 35 | 65 | 90 |
| 7 | **데이터 / 분석** | Bloomberg, Pitchbook | 30 | 50 | 80 |
| 8 | **모바일·반응형** | Toss, Cash App | 25 | 50 | 80 |
| 9 | **Admin / Ops Console** | Linear, Retool | 40 | 70 | 90 |
| | **종합** | — | **28.3** | **56.1** | **86.1** |

> **Insight**: 우리는 9개 영역 중 단 한 곳에서도 글로벌 톱티어에 근접하지 못한다. 그러나 12개월 내 8개 영역에서 80점 이상에 도달할 수 있는 명확한 경로가 존재한다.

---
---

# 1. Capability 1 — 거래 인프라 (Trading Core)

## 1.1 Benchmark — Carta, AngelList, Bloomberg Terminal

### 톱티어가 잘하는 것

| 회사 | 핵심 강점 | NPLatform이 배워야 할 것 |
|---|---|---|
| **Carta** | 비공개 시장 자산을 디지털화하여 거래 가능한 형태로 변환 | 자산 발행 → 매칭 → 결제까지 단일 흐름 |
| **AngelList** | 양면 시장(스타트업 ↔ 투자자)을 syndicate 구조로 효율화 | LP 신뢰 + GP 권한의 균형 |
| **Bloomberg Terminal** | 데이터 밀도 + 단축키 중심 워크플로우 | 데이터를 '시각적으로' 압축하는 능력 |
| **Robinhood** | 복잡한 금융 상품을 모바일 친화적으로 단순화 | 진입 장벽 ↓ |

## 1.2 NPLatform 현재 수준 — 25/100

### ✅ 가지고 있는 것
- 매물 카탈로그 (`/exchange`) — 카드/리스트/지도 토글
- 4단계 티어 모델 (L0~L3)
- AI 등급·완성도 점수 시각화
- Sticky 필터바, KPI strip

### ❌ 없는 것 (Critical Gaps)
- **거래 발생 메커니즘 부재** — 클릭은 가능하지만 거래가 일어나지 않음
- **실시간 호가/입찰 시스템 부재**
- **포트폴리오 추적 부재**
- **자산 발행(매물 등록) 위저드 미완성**
- **단축키·데이터 밀도 부재** (Bloomberg 수준)

## 1.3 개발 방향

### Phase 1 (M1) — 거래 발생 가능 상태
- [ ] `/exchange/sell` 위저드 4단계 완성 (Step 1-4)
- [ ] LOI 제출 → `/deals/[id]` 자동 생성 connection
- [ ] 입찰 카운트다운 + 실시간 업데이트 (Supabase Realtime)

### Phase 2 (M2-3) — 거래 워크플로우 강화
- [ ] 대량 등록 (`/exchange/bulk-upload`) — CSV + AI OCR
- [ ] 매수 수요 (`/exchange/demands`) — 역경매 매칭
- [ ] 포트폴리오 (`/my/portfolio`) — 관심·보유·비교

### Phase 3 (M4-6) — Bloomberg Terminal 수준 데이터 밀도
- [ ] 단축키 시스템 (Cmd+K palette, j/k navigation)
- [ ] 데이터 그리드 모드 (한 화면 50+ 매물)
- [ ] 사용자 정의 워치리스트
- [ ] 다중 차트 분할 뷰

---
---

# 2. Capability 2 — 딜룸 / 데이터 룸 (Deal Room)

## 2.1 Benchmark — Intralinks, Datasite, DealRoom.net

### 톱티어가 잘하는 것

| 회사 | 핵심 강점 |
|---|---|
| **Intralinks** | 글로벌 M&A 표준 데이터룸. 워터마크·DRM·열람 추적의 황금 표준 |
| **Datasite (Merrill)** | AI 기반 자료 정리 + Q&A 워크플로우 |
| **DealRoom.net** | M&A 프로세스 + 데이터룸 통합 |
| **Firmex** | 사용성과 보안의 균형 |

### 그들의 핵심 기능 (우리가 모두 가져야 함)

1. **동적 워터마크** — 열람자별 이름·이메일·시간이 모든 페이지에 박힘
2. **다운로드 통제** — 다운로드 차단 / 제한 / TTL Signed URL
3. **열람 로그** — 누가, 언제, 몇 초, 어느 페이지를 봤는지 모두 기록
4. **Q&A 워크플로우** — 매수자 질문 → 매도자 답변 → 모든 매수자 공유 (선택)
5. **버전 관리** — 자료 갱신 시 이전 버전 보존
6. **권한 매트릭스** — 사용자 그룹 × 폴더 × 권한
7. **AI 자료 분류** — 업로드 즉시 카테고리 자동 분류

## 2.2 NPLatform 현재 수준 — 20/100

### ✅ 가지고 있는 것
- `/deals/[id]` URL 라우트 (셸만 존재)
- 4단계 티어 모델 (L3 = 딜룸 진입)

### ❌ 없는 것 (Critical Gaps)
- **8 Tabs 미구현** (개요·자료·AI·실사·Q&A·오퍼·계약·정산)
- **워터마크 모듈 0**
- **Signed URL 시스템 0**
- **열람 로그 0**
- **권한 매트릭스 0**
- **자료 버전 관리 0**
- **딜룸 내 화상회의 0**
- **온라인+오프라인 미팅 통합 0**

## 2.3 개발 방향 — 딜룸이 NPLatform의 심장

### Phase 1 (M1-2) — 8 Tabs 셸 + 핵심 보안
- [ ] `/deals/[id]/overview` - 자산 요약, 진행 단계, 카운트다운
- [ ] `/deals/[id]/documents` - 자료 vault + 워터마크 + 다운로드 통제
- [ ] `/deals/[id]/qa` - 매수자 ↔ 매도자 채팅
- [ ] `/deals/[id]/offers` - LOI 제출, 협상 히스토리
- [ ] `lib/document-protection.ts` - Signed URL (TTL 5분), 워터마크 렌더링
- [ ] `lib/audit-log.ts` - Append-only 열람 로그

### Phase 2 (M3-4) — AI · 실사 · 협상
- [ ] `/deals/[id]/ai` - 가격·권리·시세 분석을 딜 컨텍스트에서 호출
- [ ] `/deals/[id]/inspection` - 온라인 미팅 예약 (Zoom/Meet 통합) + 오프라인 일정
- [ ] 미팅 자동 녹화 + AI 회의록 → 딜룸 영구 저장
- [ ] Q&A AI 자동 답변 초안 (매도자 시간 절약)

### Phase 3 (M5-6) — 계약 · 정산 · 운영
- [ ] `/deals/[id]/contract` - AI 계약서 생성 + 전자서명
- [ ] `/deals/[id]/settlement` - 에스크로 + 자동 정산
- [ ] `/admin/deals` - 운영 모니터링 + 분쟁 조정
- [ ] 권한 매트릭스 (매수자 / 매도자 / 변호사 / 운영팀 그룹)

---
---

# 3. Capability 3 — AI / Vertical Intelligence

## 3.1 Benchmark — Reorg, Octus, Pitchbook, Bloomberg

### 톱티어가 잘하는 것

| 회사 | 핵심 강점 | 데이터 자산 |
|---|---|---|
| **Reorg** | 부실채권·구조조정 정보의 글로벌 표준 | 5만+ 케이스 DB, 1000+ 변호사 네트워크 |
| **Octus (구 Reorg Research)** | 권리 우선순위·법원 판례 자동 분석 | 200만+ 법원 문서 NLP |
| **Pitchbook** | M&A·VC 거래 데이터의 결정판 | 350만+ 회사 + 35만+ 거래 |
| **Bloomberg LP** | 금융 데이터 + 분석 + 채팅의 통합 | 압도적 데이터 깊이 |

### 그들의 핵심 — Vertical Data Moat

> 그들은 GPT-4보다 똑똑한 게 아니라, GPT-4가 모르는 도메인 데이터를 가지고 있다.
> NPLatform도 같은 길을 가야 한다 — **한국 NPL/부동산의 Vertical RAG.**

## 3.2 NPLatform 현재 수준 — 30/100

### ✅ 가지고 있는 것
- `/analysis` 페이지 셸
- `/analysis/copilot` UI
- `/analysis/simulator` (경매 수익률)
- AI 등급 (S/A/B/C) 표시
- 자료 완성도 점수

### ❌ 없는 것
- **자체 학습 데이터셋 부재** (Reorg는 5만건, 우리는 0건)
- **Vertical RAG 미구현**
- **5대 AI 기능 중 4개가 데모 수준**
- **Admin에서 AI 데이터 공급 인터페이스 부재**
- **모델 버전 관리 부재**
- **AI 응답 품질 모니터링 부재**

## 3.3 개발 방향

### 데이터 자산 구축 (가장 중요)
- [ ] 한국 NPL 거래 5만건 데이터셋 (Crawling + 매도 기관 협력)
- [ ] 대법원 판례 임베딩 (권리분석용)
- [ ] 한국감정원·KB·실거래가 (시세분석용)
- [ ] 금융위 가이드라인 + Q&A (Copilot용)

### AI 5대 기능 정식 출시 (M3-4)

| 기능 | 모델 | Admin 데이터 입력 | 사용자 surface |
|---|---|---|---|
| AI 가격 가이드 | XGBoost + LLM 후처리 | `/admin/ml/price-data` | `/exchange/sell`, `/analysis/[id]` |
| AI 권리분석 | LLM (RAG, 판례) | `/admin/ml/rights-rules` | `/analysis/[id]`, `/deals/[id]/ai` |
| AI 시세분석 | 통계 + 외부 API | `/admin/ml/market-data` | `/analysis/[id]`, `/exchange/[id]` |
| AI 계약서 생성 | LLM (Few-shot) | `/admin/content/contracts` | `/deals/[id]/contract` |
| AI Copilot | LLM (RAG, 멀티턴) | `/admin/ml/rag-corpus` | `/analysis/copilot`, 모든 페이지 |

### Admin AI 통제 (M2-3)
- [ ] `/admin/ml/price-data` - CSV 업로드, 데이터 정제, 재학습 트리거
- [ ] `/admin/ml/rights-rules` - 권리 충돌 패턴, 우선순위 룰
- [ ] `/admin/ml/market-data` - 월간 시세 데이터 갱신
- [ ] `/admin/ml/rag-corpus` - 가이드·법규·판례 임베딩 관리
- [ ] `/admin/ml/eval-dashboard` - AI 응답 품질 모니터링
- [ ] `/admin/ml/feedback-loop` - 사용자 피드백 → 재학습 큐

---
---

# 4. Capability 4 — 결제 / 정산 / 에스크로

## 4.1 Benchmark — Stripe, Toss, Adyen, Wise

### 톱티어가 잘하는 것

| 회사 | 핵심 강점 |
|---|---|
| **Stripe** | API 우아함, 글로벌 표준, 마켓플레이스 정산 (Stripe Connect) |
| **Toss Payments** | 한국 결제의 사용자 친화 UX |
| **Adyen** | 엔터프라이즈 결제 + 위험 관리 |
| **Wise** | 국제 송금 비용 투명화 |

## 4.2 NPLatform 현재 수준 — 15/100

### ✅ 가지고 있는 것
- `/my/billing` 페이지 셸
- 크레딧 개념 정의 (`lib/credits.ts` 일부)

### ❌ 없는 것
- **결제 PG 연동 0** (토스페이먼츠, 아임포트 등)
- **에스크로 모듈 0**
- **자동 정산 모듈 0**
- **세금계산서·영수증 자동 발행 0**
- **환불 워크플로우 0**

## 4.3 개발 방향

### Phase 1 (M2) — 크레딧 결제
- [ ] 토스페이먼츠 연동 (카드·계좌이체·간편결제)
- [ ] 크레딧 충전 UI (`/my/billing/credits`)
- [ ] 거래 원장 (`credit_ledger` 테이블)

### Phase 2 (M4) — 구독 결제
- [ ] 정기결제 시스템 (월/년)
- [ ] 구독 변경·취소·환불 워크플로우
- [ ] 영수증·세금계산서 자동 발행

### Phase 3 (M5-6) — 에스크로 거래 정산
- [ ] 에스크로 계정 시스템
- [ ] 거래 클로징 시 자동 분할 정산 (매도자 / 플랫폼 / 전문가)
- [ ] 정산 보고서 (`/my/billing/settlements`)
- [ ] `/admin/billing/escrow` 운영자 모니터링

---
---

# 5. Capability 5 — 신원·보안·컴플라이언스

## 5.1 Benchmark — Plaid, Persona, Onfido, Auth0

### 톱티어가 잘하는 것

| 회사 | 핵심 강점 |
|---|---|
| **Plaid** | 금융 계좌 연결의 표준 |
| **Persona** | KYC/KYB 워크플로우의 표준 |
| **Onfido** | 신분증·얼굴 인증 |
| **Auth0** | 인증·MFA·SSO |

## 5.2 NPLatform 현재 수준 — 35/100

### ✅ 가지고 있는 것
- Supabase Auth (이메일·OAuth)
- MFA 페이지 셸
- 4단계 티어 모델 코드
- PII 마스킹 기본 구조

### ❌ 없는 것
- **본인인증 (PASS) 연동 0**
- **기관 KYB 워크플로우 0**
- **NDA 전자서명 0**
- **권한 매트릭스 미구현**
- **감사 로그 (append-only) 미구현**
- **GDPR/PIPA 컴플라이언스 부분 구현**

## 5.3 개발 방향

### Phase 1 (M1-2)
- [ ] PASS 본인인증 연동
- [ ] L1 자동 승급 로직
- [ ] NDA 전자서명 (자체 모듈 또는 모두싸인 연동)

### Phase 2 (M3-4)
- [ ] 기관 KYB (사업자등록증·금융기관 코드)
- [ ] L2 보증금/크레딧 차감 워크플로우
- [ ] `/admin/users/kyc` 검토 큐

### Phase 3 (M5-6)
- [ ] Append-only 감사 로그 (Postgres + WORM S3)
- [ ] 권한 매트릭스 (RBAC + ABAC)
- [ ] PII 마스킹 파이프라인 (OCR + NER + Redaction)
- [ ] 컴플라이언스 대시보드 (`/admin/security/compliance`)

---
---

# 6. Capability 6 — 디자인 시스템

## 6.1 Benchmark — Linear, Stripe, Mercury, Vercel

### 톱티어가 잘하는 것

| 회사 | 핵심 강점 |
|---|---|
| **Linear** | 인터랙션 마이크로 애니메이션, 키보드 우선, 다크모드의 표준 |
| **Stripe** | 데이터 밀도 + 미니멀 톤, 글로벌 핀테크 vocabulary 정립 |
| **Mercury** | 차분한 confidence, 트레이딩 톤의 표준 |
| **Vercel** | 다크 미니멀의 정수, 코드 같은 화면 |
| **Carta** | 복잡한 금융을 단순하게 시각화 |

### 그들의 공통점

1. **디자인 토큰 시스템** — 모든 색·간격·타입이 단일 출처
2. **컴포넌트 라이브러리** — 50~200개 재사용 가능 컴포넌트
3. **Storybook 또는 동등** — 디자인 시스템 문서화
4. **마이크로 인터랙션** — 모든 클릭·호버에 0.15s 트랜지션
5. **다크/라이트 일관성** — 두 모드가 동일한 경험 제공
6. **모바일·데스크톱 동등** — 반응형이 아니라 양쪽 모두 최적화
7. **Empty/Loading/Error 상태** — 디자인된 일러스트
8. **타이포그래피 위계** — Display → H1~H6 → Body의 명확한 스케일

## 6.2 NPLatform 현재 수준 — 35/100

### ✅ 가지고 있는 것
- `/exchange` 메인 페이지 (다크 NPL 트레이딩 톤, 9/10)
- TierBadge, CompletenessBadge 등 NPL 컴포넌트 일부
- framer-motion 페이지 트랜지션
- Tailwind 4 + CSS variables 일부

### ❌ 없는 것
- **디자인 토큰 시스템 부재** (인라인 `style={{}}` 가 너무 많음)
- **컴포넌트 라이브러리 부재** (재사용 X, 페이지마다 인라인)
- **Storybook 부재**
- **/exchange 외 페이지 톤앤매너 미완성** (사용자 직접 지적)
- **/exchange 하위 페이지 미완성** (사용자 직접 지적)
- **Empty/Loading/Error 일러스트 부재**
- **모바일 부분 구현**
- **다크/라이트 일관성 부족**

## 6.3 개발 방향 — 가장 시급한 영역

### Phase 1 (M1) — 토큰 시스템 구축
- [ ] `lib/design-tokens.ts` 신설
  - [ ] Color (bg, brand, accent, text — 다크/라이트 mirror)
  - [ ] Typography scale (Display ~ Caption + Mono)
  - [ ] Spacing (4·8·12·16·20·24·32·40·56·72·96)
  - [ ] Radius, Shadow, Elevation
- [ ] `tailwind.config.ts`에 토큰 매핑
- [ ] CSS variable 자동 생성

### Phase 2 (M1-2) — 컴포넌트 라이브러리 50개
```
Primitives    Button, Input, Select, Checkbox, Radio, Switch, Slider, Textarea
Layout        Container, Grid, Stack, Divider, Section
Display       Card, Badge, Avatar, Tag, Chip, Skeleton, EmptyState
Feedback      Alert, Toast, Tooltip, Popover, Dialog (★Portal!), Drawer
Navigation    Tabs, Breadcrumb, Pagination, Stepper, Sidebar
Data          Table, DataGrid, Tree, KanbanBoard, Calendar
Charts        Line, Bar, Donut, Heatmap, Sparkline (recharts)
NPL-specific  TierBadge, CompletenessBadge, AIGradeBadge,
              ListingCard, ListingRow, DealRoomTab, OfferCard,
              InspectionTimeline, WatermarkedDocument, AccessScoreRing,
              CreditMeter, LOIForm, PriceGuideWidget, RightsRiskMatrix
```

### Phase 3 (M2-3) — 페이지 톤앤매너 통일 (P0~P3)

| 우선순위 | 페이지 | 현재 → 목표 |
|---|---|---|
| **P0** | `/exchange/[id]` | 5/10 → 10/10 (5d) |
| **P0** | `/deals/[id]` 8 Tabs | 1/10 → 10/10 (7d) |
| **P0** | `/exchange/sell` | 4/10 → 10/10 (4d) |
| **P1** | `/deals` 칸반 | 5/10 → 10/10 (3d) |
| **P1** | `/analysis` 대시보드 | 6/10 → 10/10 (3d) |
| **P1** | `/exchange/demands` | 4/10 → 10/10 (3d) |
| **P2** | `/services/experts` | 4/10 → 10/10 (2d) |
| **P2** | `/my` 역할별 | 5/10 → 10/10 (4d) |
| **P2** | `/exchange/bulk-upload` | 3/10 → 10/10 (3d) |
| **P3** | `/admin/*` 12 페이지 | 6/10 → 9/10 (6d) |

### Phase 4 (M3-4) — 마이크로 인터랙션 (Linear 수준)
- [ ] 모든 버튼 hover/active 0.15s 트랜지션
- [ ] 페이지 트랜지션 opacity-only (transform 금지 — modal 깨짐 방지)
- [ ] 모달은 반드시 React Portal
- [ ] 키보드 단축키 시스템 (Cmd+K palette)
- [ ] Skeleton loader (모든 비동기 영역)
- [ ] Toast 알림 시스템
- [ ] Empty/Error state 일러스트 일관 적용

### Phase 5 (M4-5) — 모바일·다크모드 일관성
- [ ] 모든 페이지의 모바일 (≤640) / 태블릿 (641~1023) / 데스크톱 (≥1024) 3-tier
- [ ] 다크/라이트 모드 100% 일관성
- [ ] 접근성 (a11y) WCAG AA 준수

---
---

# 7. Capability 7 — 데이터 / 분석

## 7.1 Benchmark — Bloomberg, Pitchbook, Crunchbase, CB Insights

### 톱티어가 잘하는 것

| 회사 | 핵심 강점 |
|---|---|
| **Bloomberg** | 데이터 깊이 + 실시간 + 분석 + 채팅의 통합 |
| **Pitchbook** | 비공개 시장 데이터의 결정판 |
| **Crunchbase** | 검색·필터·알림의 사용자 친화 |
| **CB Insights** | AI 기반 트렌드 인사이트 |

## 7.2 NPLatform 현재 수준 — 30/100

### ✅ 가지고 있는 것
- `/analysis` 페이지 셸
- `/analysis/npl-index` (NBI 주간 지수)
- 자료 완성도 점수
- AI 등급

### ❌ 없는 것
- **시세 데이터 자동 수집 파이프라인 0**
- **NBI 지수 자동 산출 0**
- **트렌드 알림 0**
- **사용자 정의 워치리스트 0**
- **데이터 export (한정적, 워터마크 동반) 0**

## 7.3 개발 방향

### Phase 1 (M2-3)
- [ ] 매물 전체 검색 (`/exchange?q=`) Postgres FTS
- [ ] 사용자 정의 필터 저장
- [ ] 키워드 알림 (`/my/notifications/keywords`)

### Phase 2 (M3-4)
- [ ] NBI 주간 지수 자동 산출 cron
- [ ] 시세 데이터 자동 수집 (KB·한국감정원 API)
- [ ] `/analysis` 대시보드 차트 풀세트

### Phase 3 (M5-6)
- [ ] 워치리스트 (`/my/portfolio/watchlist`)
- [ ] 트렌드 알림 (가격 변동, 신규 매물)
- [ ] 워터마크 동반 PDF export (전문가 한정)

---
---

# 8. Capability 8 — 모바일 / 반응형

## 8.1 Benchmark — Toss, Cash App, Robinhood, KakaoBank

### 톱티어가 잘하는 것

| 회사 | 핵심 강점 |
|---|---|
| **Toss** | 한국 핀테크 모바일 UX의 정수 |
| **Cash App** | 단순함의 극치 |
| **Robinhood** | 복잡한 금융을 모바일에서 |
| **KakaoBank** | 한국 사용자의 마음을 잡는 디테일 |

## 8.2 NPLatform 현재 수준 — 25/100

### ✅ 가지고 있는 것
- 일부 페이지 반응형
- PWA 기본 셸
- Tailwind 반응형 utility

### ❌ 없는 것
- **체계적인 모바일 디자인 부재**
- **모바일 전용 인터랙션 부재** (스와이프, 풀투리프레시 등)
- **모바일 네비게이션 미완성**
- **딜룸의 모바일 워크플로우 0**

## 8.3 개발 방향

### Phase 1 (M2-3)
- [ ] 모바일 네비게이션 (하단 탭 5개)
- [ ] `/exchange` 모바일 카드 뷰
- [ ] `/exchange/[id]` 모바일 sticky CTA
- [ ] `/my` 모바일 대시보드

### Phase 2 (M4-5)
- [ ] 딜룸 모바일 (Tab을 swipe로)
- [ ] 모바일 알림 (FCM)
- [ ] PWA 풀스크린 모드

### Phase 3 (M6+)
- [ ] iOS 앱 (Capacitor 또는 React Native 검토)
- [ ] Android 앱 (TWA 또는 React Native)

---
---

# 9. Capability 9 — Admin / Ops Console

## 9.1 Benchmark — Linear, Retool, Notion Admin, Stripe Dashboard

### 톱티어가 잘하는 것

| 회사 | 핵심 강점 |
|---|---|
| **Linear** | 운영자도 사용자 같은 UX |
| **Retool** | 내부 도구 빠른 구축 |
| **Notion Admin** | 권한·설정의 단순함 |
| **Stripe Dashboard** | 데이터 시각화 + 액션 |

## 9.2 NPLatform 현재 수준 — 40/100

### ✅ 가지고 있는 것
- `/admin/*` 12개 페이지 중 7개 셸
- 사이드바 + 메인 레이아웃
- 마스킹 큐, PII 감사 페이지

### ❌ 없는 것
- **`/admin/ml` 영역 전무** (AI 데이터 공급 인터페이스)
- **콘텐츠 관리 통합 부족**
- **딜룸 모니터링 부족**
- **운영 KPI 대시보드 부족**

## 9.3 개발 방향

### Phase 1 (M1-2) — Admin 12 페이지 셸 완성
- [ ] `/admin` - KPI 대시보드
- [ ] `/admin/users` - 회원 + KYC + 역할
- [ ] `/admin/listings` - 매물 + 심사 + 마스킹 + 추천 + 신고
- [ ] `/admin/deals` - 딜룸 모니터링 + 분쟁
- [ ] `/admin/billing` - 결제 + 정산 + 쿠폰 + 요금제 + 환불
- [ ] `/admin/content` - 공지 + 배너 + 뉴스 + 가이드 + 용어 + FAQ + 후기
- [ ] `/admin/experts` - 전문가 + 파트너 + 검증 + 정산
- [ ] `/admin/settings` - 사이트 + 내비 + 권한 + 관리자
- [ ] `/admin/system` - DB + API + 모듈 + 에러 + 인프라
- [ ] `/admin/analytics` - 코호트 + 퍼널 + 성능 + 컴플라이언스
- [ ] `/admin/security` - 감사로그 + 마스킹 + MFA + 테넌트
- [ ] `/admin/ml` - 모델 + 데이터 + RAG + 평가 + 피드백

### Phase 2 (M2-3) — `/admin/ml` 풀세트 (AI의 모든 데이터 공급)
- [ ] `/admin/ml/price-data` - 학습 데이터 CSV 업로드, 정제, 재학습
- [ ] `/admin/ml/rights-rules` - 권리 충돌 룰셋
- [ ] `/admin/ml/market-data` - 월간 시세 데이터 갱신
- [ ] `/admin/ml/rag-corpus` - Copilot 지식 베이스 임베딩
- [ ] `/admin/ml/model-versions` - 모델 버전 + A/B 테스트
- [ ] `/admin/ml/eval-dashboard` - AI 응답 품질 점수
- [ ] `/admin/ml/feedback-loop` - 사용자 피드백 → 재학습 큐

### Phase 3 (M4-6) — 운영 자동화
- [ ] `/admin/automation` - 매물 자동 추천 룰
- [ ] 알림 자동 발송 (가격 변동, 신규 매물)
- [ ] 분쟁 조정 워크플로우

---
---

# 10. Connected Roadmap — 90 Days · 6 Months · 12 Months

## 10.1 90-Day Sprint (Foundation)

### Track A — Business
| Week | Action | KPI |
|---|---|---|
| W1-2 | 매도 기관 5곳 인터뷰 | Pain point 보고서 |
| W3-4 | Exclusive Deal 계약 템플릿 | 법무 검토 통과 |
| W5-6 | 금융위 사전 협의 신청 | 회의록 |
| W7-8 | Beachhead 1 타겟 30곳 리스트 | CRM 등록 |
| W9-12 | Beachhead 1 영업 시작 | 5곳 LOI |

### Track B — Engineering
| Week | Action | Output |
|---|---|---|
| W1 | 디자인 토큰 시스템 | `lib/design-tokens.ts` |
| W2 | 모달 Portal 강제 | `components/ui/dialog.tsx` |
| W2-3 | DB v6 마이그레이션 | Supabase migration |
| W3-5 | 딜룸 8 Tabs (P0) | `/deals/[id]/*` |
| W5-6 | 워터마크 + Signed URL | `lib/document-protection.ts` |
| W6-8 | LOI · 협상 채팅 · 열람 로그 | 딜룸 코어 완성 |
| W8-10 | AI 가격 가이드 v2 | `/admin/ml/price-data` |
| W10-12 | Admin Console 12 페이지 | 운영 가능 |

### Track C — Design
| Week | Action | Output |
|---|---|---|
| W1-2 | 디자인 토큰 시각화 | Storybook |
| W2-3 | 컴포넌트 라이브러리 50개 | Storybook |
| W3-5 | `/exchange/[id]` 풀 디자인 | 시안 + 구현 |
| W5-7 | `/deals/[id]` 8 Tabs 디자인 | 시안 + 구현 |
| W7-9 | `/exchange/sell` 위저드 | 시안 + 구현 |
| W9-11 | `/analysis`, `/services`, `/my` 톤앤매너 | 5개 영역 일관 |
| W11-12 | 모바일 + 다크/라이트 | 출시 가능 |

### 90일 후 도달 점수

| Capability | 시작 | 90일 |
|---|---:|---:|
| 거래 인프라 | 25 | **50** |
| 딜룸 | 20 | **60** |
| AI | 30 | **50** |
| 결제 | 15 | **50** |
| 보안 | 35 | **60** |
| 디자인 | 35 | **65** |
| 데이터 | 30 | **50** |
| 모바일 | 25 | **50** |
| Admin | 40 | **70** |
| **종합** | **28.3** | **56.1** |

---

## 10.2 6-Month Roadmap (MVP+)

### M1 — Foundation (위 90일과 동일)
### M2 — Listing & Discovery
- `/exchange/[id]`, `/exchange/sell`, `/exchange/demands` 풀구현
- L0/L1 마스킹 파이프라인
- 검색·필터·지도 통합

### M3 — DealRoom Core
- 8 Tabs 완성
- 워터마크 + Signed URL
- LOI · 협상 채팅
- 열람 로그 · Audit Trail
- 하이브리드 미팅 모듈 v1 (온라인+오프라인 통합)

### M4 — AI Layer
- 가격·권리·시세·계약·Copilot 정식 출시
- `/admin/ml` 풀세트
- 크레딧 시스템

### M5 — Contract & Settlement
- 계약서 자동 생성·전자서명
- 에스크로 + 토스페이먼츠 연동
- 자동 분할 정산

### M6 — GTM Launch
- Beachhead 1 영업 활동
- PR 캠페인
- 베타 → GA 전환
- Series A 자료

### 6개월 후 도달 점수

| Capability | 시작 | 6개월 |
|---|---:|---:|
| 거래 인프라 | 25 | **75** |
| 딜룸 | 20 | **80** |
| AI | 30 | **70** |
| 결제 | 15 | **75** |
| 보안 | 35 | **80** |
| 디자인 | 35 | **80** |
| 데이터 | 30 | **65** |
| 모바일 | 25 | **65** |
| Admin | 40 | **85** |
| **종합** | **28.3** | **75** |

---

## 10.3 12-Month Roadmap (Category Leader)

### M7-9 — Scale
- 매도 기관 5곳 → 15곳
- 등록 매물 1,200건
- 거래 건수 95건 / GMV ₩480억
- 모바일 앱 (iOS/Android)

### M10-12 — Differentiate
- Bloomberg 수준 데이터 밀도 (단축키, 데이터 그리드)
- Linear 수준 인터랙션 디테일
- Reorg 수준 데이터 자산 (5만건 NPL DB)
- 외부 실사 전문가 마켓
- B2B SaaS (백오피스 화이트라벨)

### 12개월 후 도달 점수

| Capability | 시작 | 12개월 | 글로벌 톱티어 |
|---|---:|---:|:---:|
| 거래 인프라 | 25 | **90** | 100 |
| 딜룸 | 20 | **90** | 100 |
| AI | 30 | **80** | 100 |
| 결제 | 15 | **85** | 100 |
| 보안 | 35 | **90** | 100 |
| 디자인 | 35 | **90** | 100 |
| 데이터 | 30 | **80** | 100 |
| 모바일 | 25 | **80** | 100 |
| Admin | 40 | **90** | 100 |
| **종합** | **28.3** | **86.1** | **100** |

> **12개월 후 NPLatform은 글로벌 톱티어의 86% 수준에 도달한다. 한국 NPL 카테고리에서는 100% 리더가 된다.**

---
---

# 11. Final Recommendations — 의사결정 사항

## 11.1 합의가 필요한 9가지

| # | Decision | 권고 | 근거 |
|---|---|---|---|
| 1 | 9개 Capability 모두를 동시에 진행할 것인가? | **YES** | 단일 영역 강화는 락인을 만들지 못함 |
| 2 | 디자인 토큰 시스템 도입 (W1) | **YES** | 모든 후속 작업의 기반 |
| 3 | 딜룸 8 Tabs를 P0 최우선 (W3-8) | **YES** | NPLatform의 심장 |
| 4 | `/admin/ml` 풀세트 구축 (W8-12) | **YES** | AI는 데이터의 함수 |
| 5 | 자체 NPL 데이터셋 5만건 구축 시작 | **YES** | Reorg 수준 vertical moat |
| 6 | 토스페이먼츠 + 에스크로 연동 (M5) | **YES** | 거래 락인의 마지막 조각 |
| 7 | 모바일 앱 (iOS/Android) 개발 (M7-9) | **YES** | 한국 핀테크 표준 |
| 8 | Storybook 도입 (W2) | **YES** | 컴포넌트 일관성 |
| 9 | Series A 펀딩 ₩120억 준비 (M6) | **YES** | 12개월 내 카테고리 리더 |

---

## 11.2 마지막 한 줄

> **글로벌 톱티어는 모방의 대상이 아니라 측정의 기준이다.**
> **9개 Capability 모두에서 80점을 넘는 순간, 우리는 한국 NPL의 카테고리 리더가 된다.**
> **그 순간부터 일본·동남아로 확장이 시작된다.**

— 끝 —
