# NPLatform 글로벌 성장 로드맵 2026-2028
## From Korea NPL to Global Standard

> 본 문서는 세계적 수준의 사업기획자(ex-McKinsey/BCG), CEO, 마케터(ex-Stripe/Toss), 디자이너(ex-Figma/Linear), CTO(ex-Bloomberg/Plaid) 5인 가상 패널의 관점을 통합해 작성되었습니다.

**작성일:** 2026-04-19
**버전:** v1.0 (Expert Panel Review)
**대상:** 경영진, VC, 전사 리더

---

## 🎯 Executive Summary

NPLatform은 **한국 NPL(부실채권) 시장에서 유일한 AI 기반 통합 거래 플랫폼**으로, 현재 제품은 기능 완성도 측면에서 **53.6/100** (내부 자체 평가) / **45.2/100** (글로벌 비교 평가, 본 보고서 기준)입니다.

글로벌 최고 수준(DebtX, Bloomberg Terminal, Robinhood의 교차점 = **92.5/100**)에 도달하기 위해서는 다음 5대 축을 동시에 끌어올려야 합니다.

1. **실(實)데이터 파이프라인** (현재 30점 → 2027 목표 80점)
2. **AI/ML 고도화** (65 → 92) — Rule-based → Transformer/LightGBM/GNN
3. **엔터프라이즈 기능** (45 → 88) — Institutional seller/buyer 워크플로우
4. **글로벌화 인프라** (10 → 75) — i18n, Multi-region, Compliance
5. **생태계 구축** (25 → 85) — 파트너, 커뮤니티, 자격증, API

**재무 목표:**
- 2026: 매출 10억, GMV 500억, MAU 5K
- 2027: 매출 100억, GMV 5,000억, MAU 50K
- 2028: **매출 500억, GMV 2조, 유니콘 진입 (valuation 1조+)**

---

## 📊 Part 1. 현재 프로덕트 진단

### 1.1 글로벌 최고수준 대비 영역별 점수

> 기준: DebtX (NPL 거래 40% 점유), Bloomberg Terminal (금융 데이터), Robinhood (개인 투자 UX), Stripe (결제 인프라), Plaid (금융 API), Toss (국내 B2C), Figma (디자인 시스템) — 각 영역별 최고 사례를 100점으로 가정.

| 영역 | 가중치 | 현재 | Global Max | Gap | 우선순위 |
|------|:---:|:---:|:---:|:---:|:---:|
| **상품 완성도 (Product Depth)** | 12% | 62 | 95 | -33 | 🟡 M |
| **기술 아키텍처** | 10% | 55 | 92 | -37 | 🔴 H |
| **AI / ML** | 12% | 65 | 95 | -30 | 🔴 H |
| **데이터 파이프라인 (실데이터)** | 15% | 30 | 92 | -62 | 🔴 **최우선** |
| **UX / 디자인 시스템** | 8% | 68 | 93 | -25 | 🟡 M |
| **보안 / 컴플라이언스** | 10% | 65 | 96 | -31 | 🔴 H |
| **수익 모델 설계** | 5% | 70 | 88 | -18 | 🟢 L |
| **실제 수익 실현** | 5% | 15 | 95 | -80 | 🔴 H |
| **마케팅 / 브랜드** | 7% | 20 | 90 | -70 | 🔴 H |
| **Biz Dev / 파트너십** | 6% | 22 | 92 | -70 | 🔴 H |
| **국제화 (i18n, Multi-region)** | 4% | 12 | 95 | -83 | 🟢 L (후기) |
| **규제 / 인증** | 4% | 25 | 98 | -73 | 🟡 M |
| **모바일 네이티브** | 2% | 45 | 90 | -45 | 🟢 L |
| **커뮤니티 / 생태계** | — | 25 | 85 | -60 | 🟡 M |
| **운영 / 조직** | — | 38 | 92 | -54 | 🟡 M |

**가중 평균: 45.2 / 100**
**글로벌 최고: 92.5 / 100**
**갭: 47.3 포인트**

### 1.2 Strengths (지킬 것)

1. **NPL 원스톱 통합 경험** — DebtX는 거래만, 캠코는 경매만, NPLatform은 분석+거래+딜룸+정산까지 단일 제품
2. **AI Copilot 네이티브 통합** — SSE 스트리밍 완료, RAG 법률 검색 pgvector 기반
3. **Supabase RLS 다층 보안** — 16개 마이그레이션, 테넌트 격리 준비
4. **Next.js 15 + Edge 아키텍처** — 글로벌 CDN 배포 준비된 기반
5. **디자인 토큰 기반 시스템** — Figma→Tailwind 매핑 용이, v2 업그레이드 코스트 낮음

### 1.3 Weaknesses (고칠 것)

| # | 약점 | 현재 상태 | 2028 목표 상태 |
|---|------|-----------|------------------|
| 1 | 실제 NPL 데이터 없음 | Mock/Sample 중심 | MOLIT/KAMCO/은행 직연동 실시간 |
| 2 | ML 모델 Rule-based | `lib/ai-screening/scorer.ts` 점수식 | LightGBM(가격) + Transformer(계약) + GNN(담보) |
| 3 | Institutional 워크플로우 부재 | 개인 투자자 중심 UI | Bulk upload, Pool sale, NDA/VDR, Analyst portal |
| 4 | 마케팅 0 | 채널 없음, 브랜드 미정립 | Performance + Brand + Content + Community |
| 5 | 테스트 커버리지 ~34% | Jest 단편 | Vitest + Playwright + k6 85% |
| 6 | Observability 부재 | console.log | OpenTelemetry + Sentry + Grafana |
| 7 | 국제화 0% | 한국어 only | 영/일/중 + Multi-region + GDPR |
| 8 | 규제 샌드박스 미진입 | 민간 서비스 | 금융위 혁신금융, MyData, 전자금융업자 |

---

## 🌏 Part 2. 시장 분석 (CEO 관점)

### 2.1 TAM / SAM / SOM

| Layer | 규모 | 비고 |
|-------|------|------|
| **TAM** (Global NPL Stock) | ~3,000B USD | EBA 2024: EU 380B EUR, 미국 200B USD, 아시아 700B+ USD |
| **TAM-A** (Korea NPL Outstanding) | ~80조원 | 은행 35조 + 저축은행/상호 30조 + 2금융권 15조 |
| **SAM** (Korea NPL 연간 거래) | ~25조원 | 공매(KAMCO) 8조 + 사매 17조 |
| **SOM 2028 (목표)** | **2조원** | Korea 민간 NPL 거래의 10% |
| **SOM 2030 (목표)** | **10조원** | 한국 10% + 일본·대만 2조 |

### 2.2 경쟁 지형

| 플레이어 | 지역 | 강점 | 약점 | NPLatform 대비 |
|----------|------|------|------|--------------------|
| **DebtX** | US 글로벌 | $100B+ AUM, 기관 네트워크, 35년 이력 | UI/UX 낙후, 개인 접근 불가, AI 미성숙 | 우리: 신규 유저 UX / AI |
| **캠코 (KAMCO)** | KR | 공공 독점, 정부 신뢰 | UX 20년 전, 데이터 폐쇄, 수수료 높음 | 우리: Product speed, API |
| **UAMCO** | KR | 민간 최대, 은행 backed | B2B only, 개인 불가, 공개성 낮음 | 우리: Open marketplace |
| **대신F&I / 연합자산관리** | KR | 자산운용 역량 | 자체 투자 중심, 거래 플랫폼 약함 | 우리: Neutral platform |
| **Intrum / DoValue** | EU | Pan-European, LSE listed | 비유럽 확장 제한 | 우리: Asia-first |
| **Garnet Capital** | US | NPL advisory + auction | 플랫폼化 미흡 | 우리: SaaS 모델 |

### 2.3 Positioning Map

```
                   High Tech (AI/Automation)
                              ▲
                              │
           DebtX              │      ★ NPLatform
          (scale-tech)        │    (AI-native)
                              │
      Low-touch ──────────────┼────────────── High-touch
                              │
                              │
       캠코 (공공)            │    Garnet (advisory)
        UAMCO (B2B)           │
                              ▼
                   Low Tech (Manual)
```

**차별화 3축:**
1. **AI-First** — Multi-LLM (Claude/OpenAI/Gemini) + 실제 ML 모델
2. **Retail Accessible** — 개인 투자자도 참여 가능 (Robinhood of NPL)
3. **Vertical Integration** — 분석 → 거래 → 딜룸 → 정산 → 자격증까지

---

## 🏗️ Part 3. Product Roadmap (5-Phase, 2026-2028)

### Phase A — 한국 시장 PMF (2026 Q2-Q3) ✅ 완료

- ✅ Core 거래 플랫폼
- ✅ AI Copilot 통합
- ✅ SSE 스트리밍
- ✅ Supabase Realtime 실시간 입찰
- ✅ 관리자 헬스/런타임 설정
- ✅ OCR 일괄 등록
- ✅ v2 거래수수료 정산 엔진

### Phase B — 실데이터 + ML (2026 Q3-Q4) 🔄 진행

- 🔄 MOLIT/KAMCO/법원경매정보 실API 연동 + 크론 파이프라인
- 🔄 LightGBM 가격 예측 microservice (Python FastAPI)
- 🔄 은행 Bulk Upload 포털 (CSV/Excel 100건+)
- 🔄 Institutional VDR (NDA 전자서명 + 워터마크 + 접근 로그)
- 🔄 Sentry + OpenTelemetry + Grafana
- 🔄 Jest/Vitest/Playwright 커버리지 85%
- 🎯 **완료 기준:** 금융기관 3곳 MOU + 실거래 100억 GMV

### Phase C — 엔터프라이즈 확장 (2027 Q1-Q2)

- 은행 전용 Analyst Portal (reports, export, compliance logs)
- Pool sale 경매 (bundle 10~100건, blind auction)
- 이력·담보 Graph DB (Neo4j or pgGraph) — 채권·담보·채무자 연결
- Transformer 기반 계약서 분석 (KoBERT fine-tuning)
- Data Subscription 상품 (Bloomberg 모델, 월 50~500만원)
- React Native 앱 (iOS + Android)
- 🎯 **완료 기준:** 금융기관 MOU 15건 + 거래액 1,000억 + Data 고객 50개

### Phase D — 정교화 + Mobile + 커뮤니티 (2027 Q3-Q4)

- 자동 입찰 RL (Reinforcement Learning)
- RTB(실시간 입찰) 엔진 (Go 기반 matching service)
- 블록체인 감사 로그 (Polygon, 계약서 해시 저장)
- NPLatform Academy (자격증 발급, 온·오프 교육)
- 커뮤니티 (Q&A, 포트폴리오 공유, 멘토십)
- 다중 지역 배포 (서울 + 도쿄)
- SOC2 Type II, ISO 27001 인증
- 🎯 **완료 기준:** MAU 50K, 매출 100억, BEP 근접

### Phase E — 글로벌 확장 (2028)

- 일본/대만/싱가포르 localized (번역 + 규제)
- EU 진출 (GDPR, ESMA, ECB reporting)
- 엔터프라이즈 API (GraphQL federation)
- White-label SaaS (은행 자체 NPL 플랫폼)
- NPL 펀드 운용 (AUM 1,000억, 성과보수 20%)
- 🎯 **완료 기준:** 매출 500억, GMV 2조원, 유니콘 진입

---

## 💼 Part 4. 비즈니스 계획 (McKinsey 관점)

### 4.1 Go-to-Market 전략

**Layer 1 — Supply (NPL 공급)**

| 타겟 | 접근 전략 | 2027 목표 |
|------|----------|----------|
| 저축은행 (79개) | 직접 세일즈 + 저축은행중앙회 MOU | 30개 |
| 상호금융 (신협/새마을) | 중앙회 통합 계약 | 10개 |
| 캐피털/카드 (2금융) | 개별 RM 접근 | 8개 |
| 제1금융권 은행 | 임원 네트워크 + 파일럿 | 3개 |
| 자산운용사 / PE | 리셀러 파트너 | 5개 |

**Layer 2 — Demand (NPL 투자자)**

| 타겟 | 접근 전략 | 2027 목표 |
|------|----------|----------|
| PE / HF | 애널리스트 리포트 + 컨퍼런스 | 20개 |
| 자산운용사 | 데이터 구독 bundling | 15개 |
| 개인 투자자 (HNWI) | B2C 마케팅 + 아카데미 | 5,000명 |
| 법인 투자자 | B2B sales + CRM | 300개 |

**Layer 3 — Infrastructure (인프라 파트너)**

- 법무법인 (10곳): 김앤장, 광장, 태평양, 세종, 화우 — 법률 자문 + 딜룸 통합
- 감정평가법인 (20곳): 한국감정원, 나라 — 감정 서비스 마켓플레이스
- 신탁사 (5곳): KB, 하나, 우리, 코람코, 생보 — 자금 에스크로
- 회계법인 (Big 4): Due diligence 자동화

**Layer 4 — Regulatory (규제 파트너)**

- 금융위원회: 혁신금융 샌드박스 진입 (2026 Q4)
- MyData (신용정보법): 2027 Q1 지정 신청
- 전자금융업자 (여전법): 2027 Q2
- FIU (금융정보분석원): AML 자동 리포팅

### 4.2 Pricing Strategy

**현재 완성:**
- Transaction Fee: Seller ≤0.9%, Buyer 1.5% + PNR 0.3%
- Membership: L1 30만/L2 100만/Verify 50만

**추가 확장:**

| Tier | 월 요금 | 포함 | 타겟 |
|------|--------|------|------|
| Free | 0원 | 기본 매물 조회, 월 3건 분석 | Discovery |
| Pro | 10만원 | 무제한 분석, 주간 리포트 | 개인 투자자 |
| Institutional | 100만원 | API 접근, 고급 데이터, 자동 입찰 | 법인 |
| Enterprise | 1,000만원~ | SLA, 전담 RM, White-label 옵션 | 금융기관 |

### 4.3 유니콘 달성 KPI

| 지표 | 2026 | 2027 | 2028 |
|------|:---:|:---:|:---:|
| GMV (거래액) | 500억 | 5,000억 | 2조원 |
| Revenue | 10억 | 100억 | 500억 |
| Gross Margin | 60% | 72% | 78% |
| MAU | 5K | 50K | 500K |
| LTV/CAC | 2.0 | 3.5 | 5.0 |
| Enterprise ARR | 0 | 20억 | 150억 |
| NRR (Net Revenue Retention) | — | 115% | 130% |

---

## 📣 Part 5. 마케팅 계획 (ex-Stripe/Toss 관점)

### 5.1 브랜드 포지셔닝

**One-liner:** "한국 1% 투자자들이 쓰는 부실채권 플랫폼"
**Extended:** "AI가 분석하고, 금융기관이 공급하고, 투자자가 거래하는 — 부실채권 투자의 새로운 표준"

**3대 브랜드 가치:**
1. **Transparent** (투명) — 모든 거래·데이터 실시간 공개
2. **Intelligent** (지능) — AI가 리스크·수익률 분석
3. **Inclusive** (포용) — 개인도 1억 원부터 참여 가능

### 5.2 채널 Mix (매출 기여 기준)

```
B2B 65% ── Direct Sales ─── 35% (엔터프라이즈)
         ├ Partner Channel ─ 15% (법무·감정)
         └ Conference/PR ─── 15% (업계 노출)

B2C 35% ── SEO/Content ───── 15% (자연 유입)
         ├ Performance Ads ─ 10% (구글/네이버)
         ├ Community ──────── 6% (카페/유튜브)
         └ Academy/Events ──── 4% (리드 자석)
```

### 5.3 Content Engine (주간 제작 cadence)

| 채널 | 빈도 | 포맷 | KPI |
|------|------|------|-----|
| **주간 NPL 시장 리포트** | 매주 월 | 뉴스레터 + PDF | 구독자 10K by 2027 |
| **NPLatform 블로그** | 주 2회 | 심층 분석 (2,000자+) | 월 50K 방문 |
| **유튜브 NPLatform TV** | 주 1회 | 케이스 스터디 영상 | 10K 구독자 |
| **인스타 Reels** | 주 3회 | 15초 숏폼 | 30K 팔로워 |
| **NPL 백서** | 분기 | 50p PDF | 분기 5K 다운로드 |
| **애널리스트 세미나** | 월 1회 | 오프라인 + 웨비나 | 분기 300명 참석 |

### 5.4 Brand Campaigns (연 2회)

- **2026 Q4 런칭 캠페인:** "부실채권, 이제 다릅니다" — TV/디지털 1억 예산
- **2027 Q2 신뢰 캠페인:** "은행도 쓰는 플랫폼" — 금융기관 로고 월 월 이용자 증명
- **2027 Q4 아카데미 캠페인:** "NPL 투자 자격증" — 교육 부문 집중

### 5.5 마케팅 예산 (3개년)

| 해 | 마케팅 예산 | 매출 대비 |
|---|------------|---------|
| 2026 | 5억 | 50% (초기 투자) |
| 2027 | 25억 | 25% |
| 2028 | 75억 | 15% (규모 효율) |

---

## 💰 Part 6. 수익화 모델 (CFO 관점)

### 6.1 수익원 매트릭스

```
                    Low Effort       High Effort
                        │                │
   High Margin   ┌──────┴──────┐  ┌─────┴──────┐
                 │  Membership  │  │  Data Sub  │
                 │  Certificate │  │  API/SaaS  │
                 │  Referral    │  │  Academy   │
                 └──────────────┘  └────────────┘
                 ┌──────────────┐  ┌────────────┐
                 │  Txn Fee     │  │ Fund Mgmt  │
                 │  Ad (limited)│  │ Advisory   │
                 └──────────────┘  └────────────┘
                        │                │
   Low Margin    High Volume        Low Volume
```

### 6.2 2028 매출 구성 목표 (500억)

| 수익원 | 연매출 | % | 마진 | 비고 |
|--------|------|---|------|------|
| **거래수수료 (Txn Fee)** | 200억 | 40% | 80% | GMV 2조의 1.0% |
| **데이터 구독** | 125억 | 25% | 85% | 500 고객 × 월 200만 |
| **엔터프라이즈 (SaaS/API)** | 75억 | 15% | 75% | 15 고객 × 월 400만 + overage |
| **멤버십 (개인)** | 50억 | 10% | 90% | 30K × 월 15만 |
| **Academy / Certificate** | 20억 | 4% | 70% | 10K 수강 × 20만 |
| **실사·법무 마켓 수수료** | 15억 | 3% | 90% | 월 200건 × 750만 수수료 |
| **펀드 운용보수** | 10억 | 2% | 50% | AUM 1,000억 × 1% |
| **기타 (광고/제휴)** | 5억 | 1% | 95% | |
| **합계** | **500억** | 100% | **78%** | |

### 6.3 단위경제 (Unit Economics)

**B2C 개인 투자자:**
- CAC: 30만원 (콘텐츠 유입 기준)
- ARPU: 월 8만원 (거래수수료 + Pro 구독)
- Churn: 월 5%
- LTV: 160만원
- LTV/CAC: 5.3 ✅
- Payback: 4개월

**B2B 금융기관:**
- CAC: 5,000만원 (세일즈 + 파일럿)
- ARPU: 월 400만원 (API + 거래수수료)
- Churn: 월 1%
- LTV: 4억원
- LTV/CAC: 8.0 ✅
- Payback: 12개월

---

## 🎨 Part 7. 디자인 계획 (ex-Figma/Linear 관점)

### 7.1 Design System 2.0

**현재 (1.0):** 색상 토큰 + shadcn/ui — 일관성은 있으나 확장성 제한

**목표 (2.0):**
```
Figma Tokens (source of truth)
   │
   ├── Design Tokens JSON (W3C spec)
   │      ↓
   ├── Tailwind config (runtime)
   ├── CSS variables (runtime)
   └── React Native (mobile)
          ↓
   Storybook (단일 문서 + 시각 회귀 테스트)
```

**컴포넌트 레이어:**
- Atoms (buttons, inputs) — 30개
- Molecules (cards, toasts) — 40개
- Organisms (filters, tables) — 25개
- Templates (page layouts) — 15개
- Data Viz (charts, maps, graphs) — 20개

### 7.2 브랜드 리프레시

| 요소 | Current | v2 (Global) |
|------|---------|-------------|
| Primary | #1B3A5C 네이비 | 유지 (신뢰 + 깊이) |
| Accent | #10B981 에메랄드 | 유지 (성장 + 수익) |
| 서체 (KR) | Pretendard | Pretendard Variable (최신) |
| 서체 (EN) | Inter | Inter + IBM Plex Serif (리포트) |
| Icon | Lucide | Lucide + 커스텀 (NPL 도메인) |
| Illustration | — | Custom 3D isometric |
| Motion | Framer Motion | Framer + Lottie + GSAP |

### 7.3 Signature Experiences (차별화 UI)

1. **NPL 히트맵 3D** — Three.js, 지역별 거래량·수익률 3D 시각화
2. **담보 관계 그래프** — d3-force, 채권·담보·채무자·임차인 네트워크
3. **실시간 입찰 Stream** — 이미 구현 (Supabase Realtime)
4. **AI Copilot Streaming** — 이미 구현 (SSE)
5. **스마트 대시보드** — 개인화 위젯 (드래그, 추가/제거)
6. **Dark Mode Default** — 핀테크 관례, Light 선택 가능

### 7.4 Accessibility / i18n

- **WCAG 2.2 AA** 전체 준수 (color contrast, keyboard nav, screen reader)
- **한/영/일/중** 4개 언어 (Phase E)
- **RTL 준비** (아랍권 확장 옵션)
- **통화/숫자/날짜** locale별 자동 포맷

---

## 🛠️ Part 8. 개발 계획 (CTO 관점)

### 8.1 Architecture Evolution

**Stage 1 (현재):** Modular Monolith
```
[Next.js 15 App Router] ─── [Supabase Postgres + Auth + Realtime]
        │
        ├─ app/api/v1/* (Edge + Node)
        └─ lib/* (업무 로직, 240+ files)
```

**Stage 2 (2026 Q4):** Services Extract
```
Cloudflare Workers (global auth/edge cache)
       ↓
Next.js 15 (BFF, UI, SSR)
       ↓
┌──────────────┬──────────────┬──────────────┐
│ ML-service   │ Matching     │ Notification │
│ Python+      │ Go           │ Node + WS    │
│ FastAPI+     │ (bid match)  │ (Push/SSE)   │
│ LightGBM     │              │              │
└──────────────┴──────────────┴──────────────┘
       ↓
┌─ Postgres (OLTP) ─ Supabase → RDS multi-region
├─ ClickHouse (OLAP, analytics)
├─ Redis (cache, queue, session)
├─ Kafka/Redpanda (event bus)
├─ S3/R2 (documents, images)
├─ pgvector (+ Pinecone for scale, legal RAG)
└─ Neo4j or Apache AGE (collateral graph)
```

**Stage 3 (2028):** Full Distribution
- Multi-region: 서울 + 도쿄 + 프랑크푸르트 + 싱가포르
- CQRS + Event Sourcing (거래 이력)
- gRPC 내부 통신
- GraphQL Federation (external API)
- Service mesh (Istio)

### 8.2 ML/AI 로드맵

| 모델 | 용도 | 현재 | 2027 목표 |
|------|------|------|-----------|
| **Pricing Model** | NPL 예상 낙찰가 | Rule: 감정가 × 0.7 | LightGBM + 100+ feature + RMSE < 8% |
| **Risk Scoring** | 투자 리스크 0-100 | Rule: 선순위/임차인 weighted | XGBoost + SHAP explainability |
| **Collateral NLP** | 등기부 파싱 | Regex + Claude vision | KoBERT fine-tune + 95% F1 |
| **Contract NLP** | 계약서 위험 조항 | Claude | Legal-BERT + 위험 탐지 |
| **Matching** | 매물 ↔ 투자자 | Rule-based | Two-tower neural + 실시간 |
| **Fraud Detection** | AML/Bot | 미구현 | Isolation Forest + Neural |
| **Graph Reasoning** | 담보 연결 | 미구현 | GNN (GraphSAGE) |
| **RL Auto-Bid** | 자동 입찰 전략 | 미구현 | PPO (Deep RL) |
| **RAG** | 법률 검색 | ✅ pgvector + Voyage | + Hybrid (BM25 + dense) |

### 8.3 Platform Engineering

| 영역 | 현재 | 2027 목표 |
|------|------|-----------|
| **CI/CD** | GitHub Actions 기본 | + ArgoCD + Canary + Feature flags |
| **Testing** | Jest 부분 (~34%) | Vitest + Playwright + k6 + MutationTest 85% |
| **Observability** | console.log | OpenTelemetry + Sentry + Grafana + DataDog |
| **Secrets** | .env | Vault / AWS Secrets Manager + rotation |
| **Infra as Code** | Vercel UI | Terraform + Pulumi |
| **Cost Mgmt** | 없음 | FinOps dashboard + budget alerts |
| **Compliance** | RLS만 | SOC2 Type II + ISO 27001 + ISMS-P |
| **Disaster Recovery** | Supabase backup | Multi-region active-active + RPO 1min |

### 8.4 Performance Targets

| 지표 | 현재 | 2027 목표 |
|------|------|-----------|
| API p50 | ~150ms | < 80ms |
| API p99 | ~800ms | < 200ms |
| Page LCP | ~2.4s | < 1.2s |
| TTFB (Edge) | ~300ms | < 100ms |
| Availability SLA | — | 99.95% (월 22분 downtime) |
| Deployment Frequency | 수회/주 | Multiple/day |
| MTTR (incident) | — | < 15min |
| RTO (disaster) | — | < 1hr |
| RPO (data loss) | — | < 1min |

### 8.5 팀 구성 (2027 Target: 50명)

```
CEO ──┐
      ├── CTO (50명 중 30명 엔지니어링)
      │    ├── FE Lead (8: Next.js/RN)
      │    ├── BE Lead (10: Go/Node/Python)
      │    ├── ML Lead (4: PyTorch/LightGBM)
      │    ├── DevOps Lead (3: K8s/Terraform)
      │    └── Security Lead (3: SOC2/Pentest)
      │    └── QA Lead (2)
      │
      ├── CPO (5 designers + 2 PM)
      ├── CRO (10 biz: 5 sales + 3 BD + 2 legal)
      ├── CMO (5: Content + Performance + Brand)
      └── COO (5: CS + Ops + Finance + HR)
```

---

## 📐 Part 9. Financial Projections (3-Year)

### 9.1 손익 (억 단위)

| 항목 | 2026 | 2027 | 2028 |
|------|:---:|:---:|:---:|
| 매출 | 10 | 100 | 500 |
| 매출원가 | -4 | -28 | -110 |
| 매출총이익 | 6 | 72 | 390 |
| GPM % | 60% | 72% | 78% |
| 마케팅 | -5 | -25 | -75 |
| R&D | -15 | -40 | -100 |
| G&A | -10 | -20 | -60 |
| EBITDA | **-24** | **-13** | **+155** |
| BEP | — | Q4 2027 | — |

### 9.2 투자 라운드 시나리오

| 라운드 | 시점 | 규모 | Valuation | 주요 용도 |
|--------|------|------|-----------|-----------|
| Seed | Past | ? | ? | Product MVP |
| Series A | 2026 Q3 | 50-100억 | 500-1,000억 | 팀 확장, 실데이터 파이프라인 |
| Series B | 2027 Q2 | 300-500억 | 3,000-5,000억 | 엔터프라이즈 확장, React Native |
| Series C | 2028 Q1 | 1,000-1,500억 | **1조+ (유니콘)** | 글로벌 진출, M&A |
| IPO / Exit | 2030+ | — | 3-5조 | — |

---

## 🎯 Part 10. Next 90 Days — 실행 우선순위

> CEO 임원회의에서 이번 주 바로 착수할 Top 10 액션

| # | 항목 | 소유자 | Due | 측정 지표 |
|---|------|--------|-----|-----------|
| 1 | **MOLIT/KAMCO 실API 연동 파이프라인** | CTO | 2026-05-31 | 일 1,000건+ 수집 |
| 2 | **LightGBM 가격 예측 microservice** | ML Lead | 2026-06-15 | RMSE 감정가 대비 <10% |
| 3 | **금융기관 MOU 3건** (저축은행 중심) | CEO+BD | 2026-06-30 | 서명 완료 |
| 4 | **브랜드 리프레시 + 마케팅 사이트 v2** | CPO+CMO | 2026-06-30 | Lighthouse ≥ 95 |
| 5 | **Sentry + OpenTelemetry** 전면 도입 | DevOps | 2026-05-20 | 모든 API 계측 |
| 6 | **Vitest + Playwright 테스트 커버리지 60%** | FE/BE Lead | 2026-06-30 | coverage report |
| 7 | **주간 NPL 시장 리포트** 런칭 | CMO | 2026-05-15 | 구독 1K |
| 8 | **React Native 앱 프로토타입** | FE Lead | 2026-07-15 | TestFlight 베타 |
| 9 | **금융위 혁신금융 샌드박스 신청** | Legal | 2026-06-30 | 신청 완료 |
| 10 | **NPLatform Academy 베타 (5개 강의)** | CMO+Content | 2026-06-30 | 수강 100명 |

---

## 📎 Appendix: 지표 대시보드

### A. 제품 건강 지표 (월간 추적)

```
🔵 제품: DAU/MAU, Activation rate, Retention (D1/D7/D30)
🟢 기술: Uptime, p99 latency, Error rate, Deploy freq
🟡 비즈: GMV, Take rate, LTV/CAC, Payback
🟠 성장: CAC by channel, Viral K, NPS
🟣 ML:   Model accuracy, prediction volume, explainability rate
```

### B. 위험 요소 (Risk Register)

| 위험 | 발생확률 | 영향도 | 대응 |
|------|:---:|:---:|-----|
| 금융위 규제 강화 | 중 | 고 | 샌드박스 조기 진입, Legal 강화 |
| 경쟁사 (DebtX) 국내 진출 | 저 | 고 | Fast moat building, 금융기관 exclusive |
| 실데이터 공급 장애 | 중 | 고 | 다중 소스 + 자체 크롤링 백업 |
| AI hallucination 사고 | 중 | 중 | Guardrails + Human-in-loop + 면책 |
| 보안 사고 (PII 유출) | 저 | 매우 고 | SOC2 + 외부 pentest 분기 |

---

**본 로드맵은 살아있는 문서입니다.** 분기별 리뷰 & 업데이트하여 전사 North Star로 활용합니다.

**Contact:** Product Strategy (내부 회람 전용)
