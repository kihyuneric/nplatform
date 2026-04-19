# NPLatform Development Phases Plan
## Phase P ~ EE (2026 Q2 → 2028 Q1)

> 본 문서는 "사용자가 `Phase X 진행해줘`라고 지시하면 Claude가 바로 그 Phase의 sub-task들을 순서대로 구현"하도록 설계된 실행 계획서입니다.
>
> 각 Phase는 **1~6개의 sub-task**로 쪼개져 있고, **1 sub-task = 1 dev session** 규모로 조정했습니다.
>
> 이미 완료된 Phase: **A, B, C, D, L-2, L-4, L-5, M-3~M-7, N, O**

---

## 🗂️ Phase 목록 (우선순위 순)

| Phase | 제목 | 우선순위 | Sessions | 의존성 | 목적 |
|:---:|---|:---:|:---:|:---:|---|
| **P** | 실데이터 파이프라인 | 🔴 최우선 | 6 | — | Mock 졸업, 실 NPL 데이터 수집 |
| **Q** | ML 가격 예측 서비스 | 🔴 최우선 | 6 | P | LightGBM 실모델 |
| **S** | Observability & Testing | 🔴 High | 5 | — | 프로덕션 안정성 |
| **R** | Institutional Workflow | 🔴 High | 5 | P | 금융기관 직거래 지원 |
| **CC** | 마케팅 인프라 | 🔴 High | 5 | — | 브랜드/유입 기반 |
| **T** | Enterprise API & SaaS | 🟡 Mid | 5 | S | B2B 수익원 |
| **U** | Data Subscription | 🟡 Mid | 5 | P, T | Bloomberg 모델 |
| **V** | Academy & Certificate | 🟡 Mid | 5 | — | 교육 수익 + 생태계 |
| **X** | Mobile Native (RN) | 🟡 Mid | 5 | — | 모바일 접근성 |
| **DD** | Admin 고도화 | 🟡 Mid | 5 | S | 운영 효율 |
| **W** | Community & Social | 🟢 Low | 5 | — | 네트워크 효과 |
| **Y** | Advanced ML (GNN/RL) | 🟢 Low | 5 | Q | 글로벌 경쟁력 |
| **BB** | 규제·인증 | 🟢 Low | 4 | — | 신뢰성 |
| **Z** | 글로벌 확장 (i18n) | 🟢 Later | 5 | 전체 | 해외 진출 |
| **AA** | 블록체인 감사 | 🟢 Later | 4 | — | 투명성 |
| **EE** | AI Agent Orchestration | 🟢 Later | 5 | Q, Y | 차세대 AI |

**합계: 약 80 sessions (≈ 6~9개월 분량)**

---

## 🔴 Tier 1 — 최우선 (2026 Q2-Q3)

### Phase P: 실데이터 파이프라인 (Real Data Pipeline)

**목표:** Mock 데이터 졸업. 실제 NPL 매물을 일 1,000+ 건 자동 수집.

| # | 작업 | 산출물 |
|:---:|---|---|
| P-1 | MOLIT 실API 연동 (apt/villa/office/land 거래) | `lib/external-apis/molit.ts` real mode + rate limit + retry |
| P-2 | KAMCO 공매 API (Onbid) 연동 | `lib/external-apis/kamco.ts` + auction_listings 동기화 |
| P-3 | 법원경매정보(Auction) 공개 파트 크롤러 | `lib/crawlers/court-auction.ts` + Playwright/Puppeteer |
| P-4 | Vercel Cron + Supabase 수집 파이프라인 | `app/api/cron/ingest-*/route.ts` × 3 + CRON_SECRET |
| P-5 | 데이터 품질 검증 (중복/이상치/missing field) | `lib/data-quality/validator.ts` + slack alert |
| P-6 | 관리자 파이프라인 대시보드 | `/admin/pipeline` — 최근 수집 이력, 에러, 건수, 수동 트리거 |

**Acceptance:**
- 일 1,000건+ NPL 매물 자동 수집 ✅
- 에러율 < 1%, 수집 지연 < 30분 ✅
- 관리자 대시보드에서 수동 재수집 가능 ✅

---

### Phase Q: ML 가격 예측 서비스 (LightGBM)

**목표:** Rule-based 점수식을 실제 ML 모델로 교체. 낙찰가 예측 RMSE < 10%.

| # | 작업 | 산출물 |
|:---:|---|---|
| Q-1 | Python FastAPI microservice 기반 | `ml-service/` (Dockerfile, pyproject, fastapi, uvicorn) |
| Q-2 | Feature engineering (50+ features) | `ml-service/features.py` (지역, 평형, 선순위, LTV, 임차인 등) |
| Q-3 | LightGBM 모델 학습 + 검증 | `ml-service/train.py` + RMSE/MAPE 리포트 + 모델 파일 |
| Q-4 | Prediction API → Next.js 통합 | `lib/ml/predictor.ts` + `/api/v1/ml/predict/route.ts` |
| Q-5 | SHAP explainability | 예측값 + top-5 기여 feature 반환 |
| Q-6 | A/B 테스트 infra (ML vs Rule) | `lib/experiments/ab-test.ts` + admin 관찰 |

**Acceptance:**
- RMSE < 감정가의 10% ✅
- 응답 시간 < 200ms ✅
- 설명 가능성(top-5 feature + SHAP) ✅

---

### Phase S: Observability & Testing

**목표:** "장애가 나면 30분 내 원인 파악." 프로덕션 운영 자신감.

| # | 작업 | 산출물 |
|:---:|---|---|
| S-1 | Sentry 전면 통합 (FE + BE) | `sentry.client.config.ts`, `sentry.server.config.ts`, source map upload |
| S-2 | OpenTelemetry + 구조화 로깅 | `lib/telemetry/*`, 기존 `lib/logger.ts` 확장 |
| S-3 | Vitest 전환 + 커버리지 60%+ | `vitest.config.ts`, `lib/**/__tests__/*.test.ts` |
| S-4 | Playwright E2E (top 5 flow) | `e2e/` — 로그인, 매물검색, 입찰, 딜룸, 결제 |
| S-5 | k6 부하 테스트 | `load-tests/` — 경매 1K 동시 입찰 시나리오 |

**Acceptance:**
- 모든 에러가 Sentry로 자동 수집 ✅
- Vitest 커버리지 60%+ 통과 ✅
- Playwright CI 통과 ✅

---

### Phase R: Institutional Workflow

**목표:** 저축은행·은행·PE가 "이 플랫폼 쓸만하네" 라고 느낄 엔터프라이즈 기능.

| # | 작업 | 산출물 |
|:---:|---|---|
| R-1 | Bulk Upload 포털 (CSV/Excel 100건+) | `/institution/bulk-upload` + mapping wizard + preview |
| R-2 | Virtual Data Room (NDA 전자서명+워터마크) | `/deals/[id]/vdr` + 문서 워터마크 렌더링 + 접근 로그 |
| R-3 | Pool Sale (bundle 10~100건 blind auction) | `/auctions/pool/new` + 번들 선택 UI + 암호 입찰 |
| R-4 | Analyst Portal (custom report + export) | `/institution/reports` + 템플릿 + PDF/Excel export |
| R-5 | 기관 전용 대시보드 | 사용 현황, 거래 이력, 청구서 다운로드 |

**Acceptance:**
- 저축은행 파일럿 고객 1곳 실제 사용 ✅
- 100건+ bulk upload 성공 ✅
- VDR 감사 로그 규제 수준 ✅

---

### Phase CC: 마케팅 인프라

**목표:** 브랜드 각인 + 유입 채널 구축.

| # | 작업 | 산출물 |
|:---:|---|---|
| CC-1 | 브랜드 리프레시 (로고 v2, 컬러 토큰, 타이포) | `lib/design-system/brand.ts` + 업데이트된 자산 |
| CC-2 | 마케팅 랜딩 v2 (히어로+스토리+소셜증명) | `app/(marketing)/page.tsx` — Framer Motion + Lottie |
| CC-3 | 블로그/CMS (MDX 기반) | `app/(marketing)/blog/**` + 태그/검색/RSS |
| CC-4 | 뉴스레터 시스템 (Resend) | `app/api/v1/newsletter/*` + 구독 UI + 주간 자동 발송 |
| CC-5 | SEO 완성 (Schema.org, sitemap, OG images) | `lib/seo/*` + 동적 OG 이미지 생성 |

**Acceptance:**
- Lighthouse ≥ 95 (Performance, SEO, Accessibility) ✅
- 주간 뉴스레터 자동 발송 ✅
- 검색엔진 sitemap 제출 완료 ✅

---

## 🟡 Tier 2 — 수익 확장 (2026 Q4 - 2027 Q1)

### Phase T: Enterprise API & SaaS

| # | 작업 | 산출물 |
|:---:|---|---|
| T-1 | API Key 발급/관리 시스템 | `/account/api-keys` + DB: api_keys table + scopes |
| T-2 | Rate Limiting (Upstash Redis) | `lib/rate-limit/*` + 미들웨어 |
| T-3 | GraphQL API | `app/api/graphql/route.ts` + schema (listings, deals, analytics) |
| T-4 | API 문서 (Scalar) | `/docs/api` + OpenAPI 3.1 spec 자동 생성 |
| T-5 | Usage billing (overage) | 월 호출량 집계 → 청구서 자동 생성 |

---

### Phase U: Data Subscription (Bloomberg 모델)

| # | 작업 | 산출물 |
|:---:|---|---|
| U-1 | 구독 플랜 UI (Starter/Pro/Enterprise) | `/pricing/data` + 결제 연동 |
| U-2 | Data export API (CSV/JSON/Parquet) | `/api/v1/data/export` + signed URL |
| U-3 | 주간 리포트 자동 생성 (PDF) | Python microservice + Claude 분석 + 자동 송부 |
| U-4 | 구독자 전용 데이터 대시보드 | `/data/dashboard` + 커스텀 위젯 |
| U-5 | Webhooks (실시간 이벤트) | `/account/webhooks` + 서명 검증 |

---

### Phase V: Academy & Certification

| # | 작업 | 산출물 |
|:---:|---|---|
| V-1 | 강의 플랫폼 (Video + Quiz) | `/academy/**` + Mux/Cloudflare Stream 영상 |
| V-2 | 시험 시스템 (timed) | 타이머, 자동 채점, 응시 제한 |
| V-3 | 자격증 발급 (PDF + hash) | 고유 ID + 검증 페이지 `/verify/[id]` |
| V-4 | 수강자 대시보드 | 진도, 수강 이력, 자격증 |
| V-5 | 강사 포털 | 강의 업로드, 수익 정산 |

---

### Phase X: Mobile Native (React Native)

| # | 작업 | 산출물 |
|:---:|---|---|
| X-1 | React Native 프로젝트 셋업 (Expo) | `mobile/` — Expo Router + Supabase client |
| X-2 | 주요 화면 포팅 (listing, detail, bid) | 5개 핵심 screen |
| X-3 | Push notification (Expo Push + FCM) | 입찰 알림, 딜룸 메시지 |
| X-4 | Biometric 인증 (expo-local-authentication) | Face ID / 지문 |
| X-5 | App Store + Play Store 베타 배포 | TestFlight + Internal Testing |

---

### Phase DD: Admin 고도화

| # | 작업 | 산출물 |
|:---:|---|---|
| DD-1 | 분석 대시보드 (Mixpanel-like) | 이벤트 추적, funnel, cohort |
| DD-2 | A/B 테스트 관리 UI | 실험 생성, 트래픽 분배, 결과 |
| DD-3 | Feature flag system | `lib/flags/*` + 실시간 토글 |
| DD-4 | 규제 리포팅 자동화 | 월간 거래 리포트 → 금융위 양식 |
| DD-5 | CS 티켓 시스템 | 내부 ticket board + 사용자 지원 |

---

## 🟢 Tier 3 — 장기 (2027 Q2+)

### Phase W: Community & Social

| # | 작업 |
|:---:|---|
| W-1 | 포럼/Q&A (Discourse-style) |
| W-2 | 포트폴리오 공유 |
| W-3 | 멘토십 매칭 |
| W-4 | 리더보드 (수익률 기반) |
| W-5 | 프로필 + 팔로우 |

### Phase Y: Advanced ML (GNN + RL + Transformer)

| # | 작업 |
|:---:|---|
| Y-1 | Graph DB (Apache AGE) + 담보 관계 스키마 |
| Y-2 | GNN (GraphSAGE) 학습 |
| Y-3 | Transformer 계약서 분석 (Legal-BERT) |
| Y-4 | RL 자동 입찰 (PPO) |
| Y-5 | Fraud Detection (Isolation Forest) |

### Phase BB: 규제·인증

| # | 작업 |
|:---:|---|
| BB-1 | 금융위 혁신금융 샌드박스 기술 자료 |
| BB-2 | MyData 진입 준비 (API 인증) |
| BB-3 | SOC2 Type II 준비 (audit trail, policy) |
| BB-4 | ISMS-P 준비 |

### Phase Z: 글로벌 확장 (i18n)

| # | 작업 |
|:---:|---|
| Z-1 | next-intl 도입 + ko locale 분리 |
| Z-2 | 영어 번역 + 페이지 적용 |
| Z-3 | 일본어 번역 |
| Z-4 | Stripe 국제 결제 |
| Z-5 | Multi-region (Vercel Tokyo + Frankfurt) |

### Phase AA: 블록체인 감사

| # | 작업 |
|:---:|---|
| AA-1 | Polygon wallet 연결 (ethers.js) |
| AA-2 | 계약서 해시 onchain 저장 |
| AA-3 | 거래 감사 로그 onchain |
| AA-4 | NFT 자격증 (선택) |

### Phase EE: AI Agent Orchestration

| # | 작업 |
|:---:|---|
| EE-1 | Multi-agent framework (딜 협상, 실사, 입찰 agent) |
| EE-2 | Tool-use 통합 (MOLIT, KAMCO, 법원 조회) |
| EE-3 | Human-in-loop 승인 UI |
| EE-4 | Agent 메모리 + 학습 |
| EE-5 | Agent 성과 대시보드 |

---

## 📋 사용 방법

### 사용자 지시 예시

```
🗣️  "Phase P 진행해줘"          → P-1 ~ P-6 순차 구현
🗣️  "Phase Q-3 해줘"             → Q-3만 집중 구현
🗣️  "Phase S와 Q 동시 진행"       → 독립적인 부분 병렬 진행
🗣️  "Phase R-1 먼저"             → 특정 sub-task 먼저
```

### Phase 진입 시 Claude의 자동 확인 순서

1. **의존성 점검** — 선행 Phase가 완료되어 있는가?
2. **Acceptance criteria 명시** — 이번 Phase가 "끝"나는 기준 확정
3. **파일 구조 설계** — 새로 만들 파일/수정할 파일 목록
4. **Sub-task 순서 제안** — 최소 침습 순서
5. **1-session 단위 구현 → 검증 → 커밋** 반복

### Phase 완료 시

- TypeScript 빌드 pass
- 관련 테스트 추가 (Phase S 완료 이후)
- 커밋 메시지: `feat({area}): Phase {X} — {short desc}` 형식
- 본 문서의 Phase에 ✅ 체크

---

## 🎯 추천 착수 순서 (CEO 승인 기준)

**Sprint 1 (4주):** P-1, P-2, P-4 + S-1, S-2 + CC-1, CC-2
→ 실데이터 + Observability + 브랜드

**Sprint 2 (4주):** Q-1~Q-4 + P-5, P-6 + CC-3, CC-4
→ ML 가격예측 + 파이프라인 완성 + 블로그/뉴스레터

**Sprint 3 (4주):** R-1~R-3 + S-3, S-4 + CC-5
→ Institutional 기능 + 테스트 커버리지 + SEO

**Sprint 4 (4주):** Q-5, Q-6 + R-4, R-5 + T-1~T-3 + DD-1
→ ML 설명가능성 + API + 분석 대시보드

**→ 16주 후 1차 완성본 → Series A 가능 시점**

---

**문서 버전:** v1.0
**마지막 업데이트:** 2026-04-19
