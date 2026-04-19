# NPLatform 개발 Phase 마스터 플랜 v2

> **테마: Deal Flow 극대화 — 병목 제거 및 효율 개선 청사진**
>
> 본 문서는 `docs/NPLatform_Strategic_Roadmap_2026.md` 의 비즈니스·수익·UX 전략을
> 실행 가능한 개발 Phase 로 분해한 **단일 개발 지침서(SSoT)** 입니다.
>
> 지시 방식: `"Phase 1 진행해줘"` / `"Phase 2-B 해줘"` / `"Phase 3-A, 3-B 병렬"`
>
> 모든 개발은 이 문서를 따르며, 벗어나는 작업은 지침 갱신 후 착수합니다.
>
> 문서 버전 v2.0 · 마지막 업데이트 2026-04-19

---

## 0. Deal Flow 프레임워크

NPLatform 의 핵심은 **매각사 → 투자자 거래 퍼널** 입니다.
각 Phase 는 이 퍼널의 **단계별 병목(drop-off)** 을 제거하여 GMV 극대화에 직접 기여해야 합니다.

```
┌─────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  공급    │ →  │  발견    │ →  │  분석    │ →  │  협상    │ →  │  체결    │ →  │  정산    │
│ Supply  │    │Discovery │    │ Analysis │    │Deal Room │    │  Close   │    │ Settle   │
└─────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
매각사 등록    매물 탐색       AI 리포트      NDA→LOI         전자계약       에스크로·결제
(OCR 일괄)    (리스트/카드)   (Copilot)     (딜룸)          (법적 효력)    (토스/PortOne)
```

**단계별 대표 KPI**

| 단계 | 핵심 KPI | 현재 | 2026 Q4 목표 |
|------|---------|------|-------------|
| 공급 | 월 신규 매물 등록 수 | 120건 | 1,500건 |
| 발견 | 매물 상세 진입률 | 18% | 35% |
| 분석 | AI 분석 WAU | 400명 | 1,500명 |
| 협상 | NDA→LOI 전환율 | 22% | 40% |
| 체결 | LOI→계약 체결율 | 55% | 72% |
| 정산 | 결제 성공률 | 92% | 98% |

---

## 1. Phase 구조 개요 (6 Phases · 12개월)

| Phase | 테마 | Deal Flow 매핑 | 분기 | 세션 |
|:---:|---|---|:---:|:---:|
| **1** | Deal Flow 가시성 (P0 UX 정합성) | 전 단계 · 입구 병목 | Q2 2026 (지금) | 8 |
| **2** | 공급·발견 병목 제거 | Supply + Discovery | Q2-Q3 2026 | 10 |
| **3** | 분석·협상 효율화 | Analysis + Deal Room | Q3 2026 | 10 |
| **4** | 체결·정산 완결성 | Close + Settlement | Q3-Q4 2026 | 8 |
| **5** | 데이터·ML 가속화 | 전 단계 관통 | Q4 2026 - Q1 2027 | 12 |
| **6** | B2B · 글로벌 확장 | 생태계 | Q1-Q2 2027 | 10 |

**총 ≈ 58 세션 (1 세션 ≈ 4~8 시간 개발 분량)**

---

## 2. Phase 1 — Deal Flow 가시성 & P0 UX 정합성 🔴 **최우선 · 즉시 착수**

> **테마**: "사용자가 거래를 느끼게" · 상단 네비·메인·카드/리스트 디자인을 거래소 수준으로 재정렬
>
> **Deal Flow 영향**: 모든 단계의 입구 마찰을 제거. 메인→거래소 CTR 2배, 네비 일관성으로 이탈률 -15%.

### 1-A. 메인 페이지 거래 중심 재구성 ⭐ **사용자 지시 핵심**
- **현상**: 현재 메인 디자인은 훌륭하나 **기술·기능 중심**으로 구성되어 "거래 플랫폼" 정체성이 약함
- **지시**: 디자인 톤·색상·모션은 **유지**. 콘텐츠·섹션 순서·히어로만 "거래(거래소·딜룸)" 강조로 재배치
- **구현**:
  - Hero: AI/기술 문구 → **"지금 체결 중인 NPL 거래"** 실시간 ticker + GMV 카운터
  - Section 1: 거래소 라이브 매물 4~6개 카드 (실거래 우선, fallback sample)
  - Section 2: 딜룸 활성도 (진행 중 딜 N건, 체결 완료 M건 — 익명 카드)
  - Section 3: AI 매칭 (기존 "기술 어필" → **"내게 맞는 매물 27초"** 사용자 가치 문구)
  - Section 4 이하: 기술 어필(pgvector, Copilot)은 하단 보조 섹션으로 이동
  - CTA: "로그인" → **"거래 시작하기"** 로 변경, 서브: "매물 탐색 / 매물 등록" 2-branch
- **산출물**: [app/page.tsx](app/page.tsx) 섹션 순서 재배치 · 새 `LiveTradingHero` 컴포넌트

### 1-B. 거래소 > 매수 수요 카드·리스트 디자인 고도화 ⭐ **사용자 지시 핵심**
- **현상**: 매수 수요(구매 의향) 페이지의 카드형/리스트형이 **거래소/AI 매칭 대비 수준이 낮음**
- **지시**: 거래소 매물 목록 · AI 매칭 결과 카드와 **동일 DS 레벨** 로 맞춤
- **구현**:
  - 카드: `DS.card.elevated` + 호버 `translateY(-2px)` + 상태 뱃지 (활성/마감임박/체결완료)
  - 리스트 뷰: 거래소와 동일 컬럼(지역·유형·금액·투자자수·마감일·상태) + sticky 헤더
  - 이미지/지도 미리보기 + 담보 태그 chip + 수익률 예상 그라데이션 바
  - 반응형: 모바일 카드 스택, 태블릿 2열, 데스크톱 3~4열
  - 빈 상태: `DS.empty` + "등록하기" CTA
- **산출물**: [app/(main)/exchange/demand/page.tsx](app/(main)/exchange/demand/page.tsx) + 공용 `DemandCard` / `DemandListRow` 컴포넌트

### 1-C. 커뮤니티 > NPL 뉴스 3-tier 네비 구조 복원 ⭐ **사용자 지시 핵심**
- **현상**: NPL 뉴스 상세 진입 시 **NPLatform 본연의 3-tier 네비게이션이 무너짐**
  - 상단 고정: `거래소 / 딜룸 / 분석 / 커뮤니티 / 마이`
  - 중단: 섹션 네비게이션 메뉴 (탭/브레드크럼)
  - 하단: 서비스 콘텐츠
- **구현**:
  - 커뮤니티 섹션 공용 레이아웃 `app/(main)/community/layout.tsx` 도입 — 탑바 + 서브네비 + 브레드크럼 고정
  - 뉴스 상세 `/community/news/[id]` 를 이 레이아웃 아래로 이동 (현재는 별도 라우트라 무너짐)
  - 서브네비: `NPL 뉴스 / 공지사항 / Q&A / 판례` 탭
  - 브레드크럼: `커뮤니티 > NPL 뉴스 > {기사 제목}`
  - 기사 본문: DS 타이포 (제목·메타·본문·관련 기사) 통일
- **산출물**: [app/(main)/community/layout.tsx](app/(main)/community/layout.tsx) 신규 · 뉴스 상세 페이지 라우트 이전 · DS 통일

### 1-D. AI Copilot SSE 스트리밍 UI 완성
- [x] 서버 SSE (`/api/v1/ai/copilot`) · 클라이언트 `content` 키 파싱 · tool_start/error 이벤트 (완료)
- [ ] dd-report SSE 옵션 (선택 · Phase 3-D 로 이관)

### 1-E. 결제 통합 테스트 Suite
- **목표**: 토스/PortOne/Inicis 3 PG 샌드박스 E2E 통과
- **범위**:
  - Unit: `/api/v1/payments/confirm` (inicis·portone verification)
  - Unit: `/api/v1/payments/checkout` (SUBSCRIPTION vs CREDIT_PURCHASE branches)
  - Unit: `/api/v1/payments/webhook` (HMAC 서명 · Transaction.Paid/Failed/Cancelled · 크레딧 회수 idempotency)
  - E2E: checkout → confirm → DB 상태 → 영수증 발급 1 시나리오
- **산출물**: `__tests__/api/payments-webhook.test.ts` 등 3~4 파일 · Vitest 커버리지 +8%

### 1-F. Deal Flow 가시성 대시보드 (Admin)
- **목적**: 단계별 전환율(Funnel) 실시간 관찰
- **구현**: `/admin/dealflow` — 6 단계 funnel + 주간 추이 + 드롭오프 드릴다운

### 1-G. 글로벌 네비게이션 3-tier 체계화 (1-C 확장)
- 모든 `(main)` 라우트에 3-tier 적용: 탑바 → 섹션 서브네비 → 브레드크럼
- 현재 무너진 곳: 커뮤니티·마이·툴즈 일부 → 전수 점검 · 일괄 수정

### 1-H. P0 버그 스프린트
- Phase K 에서 잡힌 이후 새로 유입된 P0 5~7건 rolling fix

**Phase 1 Acceptance**
- [ ] 메인 페이지 "거래 중심" 히어로 + 라이브 매물/딜룸 섹션 노출
- [ ] 매수 수요 카드/리스트 거래소 수준 DS 적용
- [ ] 커뮤니티 NPL 뉴스 상세에서 3-tier 네비 유지
- [ ] 결제 3 PG 테스트 suite 통과 (커버리지 +8%)
- [ ] Admin Deal Flow funnel 대시보드 동작

---

## 3. Phase 2 — 공급·발견 병목 제거 (Supply + Discovery)

> **Deal Flow 영향**: 매각사 등록 건수 +12x, 매물 상세 진입률 18% → 35%

### 2-A. OCR 일괄 등록 정확도 95% 돌파
- 현재 1~5건 OCR (Phase B 완료). 10~50건 대용량 파일(PDF 100p+) 분할 처리
- 필드 정확도 튜닝: 채무자명·감정가·선순위·지역 4종 집중 라벨링
- 실패 케이스 관리자 수동 보정 UI

### 2-B. KAMCO 공매 API (Onbid) 연동
- `lib/external-apis/kamco.ts` — rate limit + retry + 일간 동기화
- 매각 공고 자동 임포트 → 매각사 "앉아서 받는 공급"

### 2-C. MOLIT 실거래가 API 연동
- 아파트·빌라·오피스텔·토지 4종 거래가 — AI 분석 baseline 강화

### 2-D. 법원경매정보 공개 파트 크롤러
- Playwright 기반 `court-auction.ts` — 법적 리스크 검토 후 공개 범위만

### 2-E. 매물 탐색 UX 고도화 (Discovery 병목)
- 리스트 뷰: 가상 스크롤 + 무한 로딩 + 필터 사이드바 고정
- 카드 뷰: 지도 연동 (Kakao Map) + 마커 클러스터
- 저장 검색 · 새 매물 알림 (이메일 + 푸시)

### 2-F. AI 추천 (발견 단계 자동화)
- 사용자 프로필(역할·관심지역·예산·LTV 선호) 기반 개인화 카드
- "내게 맞는 매물 Top 5" 홈 위젯

### 2-G. 매물 일괄 수집 파이프라인 (Vercel Cron + Supabase)
- `app/api/cron/ingest-*/route.ts` × 3 + CRON_SECRET
- Slack 알림 · 데이터 품질 검증 · 수동 재수집 UI

### 2-H. 공급자 대시보드 (매각사)
- 내 매물 현황 · 조회수 · 입찰수 · 문의수 · 체결 이력
- 6개월 무료 잔여일 · 다음 수수료 과금일 D-day

### 2-I. Bulk Upload 포털 (CSV/Excel 100건+)
- `/institution/bulk-upload` + mapping wizard + preview + 오류 수정 UI

### 2-J. 데이터 품질 모니터
- 중복·이상치·missing field 감지 · 관리자 알림

**Phase 2 Acceptance**
- [ ] 월 신규 매물 500건+ (현 120건)
- [ ] KAMCO + MOLIT 실데이터 일 1,000건 동기화
- [ ] 매물 상세 진입률 +8pt
- [ ] 저축은행 파일럿 고객 1곳 Bulk Upload 실사용

---

## 4. Phase 3 — 분석·협상 효율화 (Analysis + Deal Room)

> **Deal Flow 영향**: AI 분석 WAU 4x, NDA→LOI 전환율 22% → 40%

### 3-A. AI 분석 리포트 SSE 전환 (dd-report 스트리밍)
- 실사 리포트 · 법률 요약 · 가격 타당성 3개 리포트 타입 통합 SSE
- 중간 결과 → 사용자가 멈출 수 있는 중단 UI

### 3-B. Claude Tool Use + RAG 통합 Copilot
- Tool: 시세 조회 / 판례 검색 (pgvector) / 경매 시뮬 호출
- 사용자 질문 → Claude 가 자율 tool orchestration

### 3-C. 경매 시뮬레이터 v2
- 공동입찰 · 입찰 전략 추천 · 수익률 분포 시뮬레이션
- LightGBM (Phase 5) 준비 어답터

### 3-D. 법률 RAG 인덱스 확장
- 현재 016 마이그레이션 기반 → 판례 5,000건 + NPL 특화 법률 해설 1,000건
- Voyage multilingual-2 embedding · chunk 최적화

### 3-E. 딜룸 NDA 전자서명 자동화
- 클릭 1회 NDA → 즉시 L1→L2 승격
- 감사 로그 영구 보관 · 워터마크 PDF 발급

### 3-F. 딜룸 LOI 템플릿 + 협상 타임라인
- LOI 표준 템플릿 · 상대방 카운터 제안 diff 뷰
- 메시지·문서·협상 포인트 통합 타임라인

### 3-G. Virtual Data Room (VDR)
- 실사 문서 업로드 · 워터마크 · 접근 로그 · 다운로드 제한
- 감사 로그 규제 수준

### 3-H. 실사 체크리스트 자동화
- NPL 유형별 표준 체크리스트 (담보·채무자·법적상태·회수가능성)
- 완료 시 LOI 단계 자동 권고

### 3-I. 분석 IA 재구성 (Phase A 후속)
- 분석 랜딩 → Copilot · 리포트 · 시뮬 · 법률검색 4-way
- 용어 표준화 · 진입 경로 통일

### 3-J. 협상 KPI 대시보드 (매각사/투자자 양쪽)
- 딜 단계 진척 · 평균 체결 소요일 · 포기/성공 사유 분석

**Phase 3 Acceptance**
- [ ] AI 리포트 SSE · 중단 가능
- [ ] NDA 클릭 1회 → L2 자동 승격
- [ ] VDR 감사 로그 규제 수준 pass
- [ ] 판례 RAG 5,000건 인덱싱

---

## 5. Phase 4 — 체결·정산 완결성 (Close + Settlement)

> **Deal Flow 영향**: LOI→계약 체결율 55% → 72%, 결제 성공률 92% → 98%

### 4-A. 전자계약 v2 (NPL 양도 특화)
- 채권양도통지 자동 생성 · 담보권 이전 조항 · 연체이자 계산기 내장
- 다자간 서명 (매각사·투자자·보증인) 순차 플로우

### 4-B. KB에스크로 Partner 통합
- API 연동 · 자동 입출금 · 분쟁 조정 트리거

### 4-C. 결제 실패 복구 UX
- 카드 한도초과·유효성 실패 → 대체 PG 자동 fallback
- 실패 후 72시간 내 재시도 알림

### 4-D. PNR (우선협상권) 과금 자동화
- 1:1 협상 개시 시점 PNR 0.3%p 자동 계산 · 청구서 포함

### 4-E. 인보이스 자동 발급 + 국세청 전자세금계산서
- 체결 즉시 세금계산서 발급 · 매각사/투자자 이메일 전송

### 4-F. Pool Sale (Bundle 10~100건 Blind Auction)
- `/auctions/pool/new` · 번들 구성 UI · 암호 입찰 · 낙찰 후 자동 분할 체결

### 4-G. 분쟁 해결 워크플로우
- 체결 후 30일 내 분쟁 신고 · 관리자 조정 · 에스크로 반환/실행

### 4-H. 체결 후 자동 온보딩 (투자자)
- 딜룸 → 투자자 대시보드 · 채권회수 진도 트래커 · 월간 보고서

**Phase 4 Acceptance**
- [ ] 전자계약 NPL 템플릿 3종 법무 승인
- [ ] KB에스크로 실거래 10건
- [ ] 결제 성공률 98%+
- [ ] 전자세금계산서 자동 발급 100%

---

## 6. Phase 5 — 데이터·ML 가속화 (전 단계 관통)

> **Deal Flow 영향**: 분석 정확도 · 추천 정확도 · 가격 예측 MAPE 개선 → 재방문율 · 전환율 전 단계 리프트

### 5-A. LightGBM 가격 예측 Python FastAPI
- `ml-service/` Docker + FastAPI + uvicorn
- 월간 재학습 · MAPE < 12% · 응답 < 200ms

### 5-B. Feature Engineering (50+ features)
- 지역 · 평형 · 선순위 · LTV · 임차인 · 경매 횟수 · 계절성 등

### 5-C. SHAP Explainability
- 예측값 + Top-5 기여 feature · 사용자 친화 설명 문구

### 5-D. ML vs Rule A/B 실험 인프라
- GrowthBook 연동 · 관리자 트래픽 분배 · 결과 대시보드

### 5-E. 실시간 입찰 WebSocket (Supabase Realtime Presence)
- 입찰가 실시간 동기화 · presence (누가 보는 중) · 알림

### 5-F. 데이터 레이크 (Airflow + dbt)
- Supabase CDC → BigQuery/ClickHouse
- 일간 집계 · 장기 보관 · 분석 쿼리 가속

### 5-G. Jest/Vitest 커버리지 60% → 80%
- 우선순위: 결제 · 딜룸 · 매물 CRUD · AI

### 5-H. Playwright E2E 10 시나리오
- 로그인 · 탐색 · 분석 · NDA · LOI · 계약 · 결제 · 에스크로 · 분쟁 · 대시보드

### 5-I. Sentry + OpenTelemetry 전면 통합
- FE/BE 에러 자동 수집 · source map · 트레이스 분산

### 5-J. k6 부하 테스트
- 경매 1K 동시 입찰 · API 초당 5K 요청 통과

### 5-K. Fraud Detection (Isolation Forest)
- 비정상 입찰 패턴 · 계정 공유 · 시세 조작 탐지

### 5-L. Admin 고도화 (A/B · Feature Flag · CS 티켓)
- `/admin/experiments` · `/admin/flags` · `/admin/support`

**Phase 5 Acceptance**
- [ ] LightGBM MAPE < 12% 프로덕션
- [ ] WebSocket 입찰 1K 동시 접속 통과
- [ ] Vitest 80% · Playwright 10 시나리오 CI 통과
- [ ] Sentry 에러 자동 수집 100%

---

## 7. Phase 6 — B2B · 글로벌 확장 (생태계)

> **Deal Flow 영향**: B2B GMV 신규 · 해외 pilot · Series A 투자 유치 기반

### 6-A. Enterprise API (API Key · Rate Limit · GraphQL)
- `/account/api-keys` · Upstash Redis · `/api/graphql`

### 6-B. Data Subscription (Bloomberg 모델)
- Starter/Pro/Enterprise 구독 플랜 · CSV/JSON/Parquet export · 주간 PDF

### 6-C. Webhooks (실시간 이벤트 배포)
- 매물 등록 · 입찰 · 체결 · 결제 이벤트 서명된 webhook

### 6-D. 모바일 앱 (PWA/TWA → RN 단계적)
- Lighthouse 95+ PWA → Expo RN 포팅 → App Store · Play Store 베타

### 6-E. i18n (영어 · 일어)
- `next-intl` · ko → en 70% → ja 30% · Crowdin 연동

### 6-F. 규제·인증 (금감원 핀테크 혁신 / ISO 27001 / SOC2 Type 1)
- 기술 자료 · 감사 준비 · 모의해킹 연 2회

### 6-G. 멀티테넌시 (화이트라벨)
- 금융기관 · AM 사별 subdomain · 브랜딩 · 독립 DB 스키마

### 6-H. Academy & Certificate
- 강의 · 시험 · 자격증 · 강사 포털

### 6-I. Community Social (포럼 · Q&A · 포트폴리오 · 리더보드)

### 6-J. 글로벌 pilot (대만 · 베트남)
- 해외 매물 3건 · 현지 법률 파트너 · 외환 결제

**Phase 6 Acceptance**
- [ ] Enterprise API 파트너 10개사
- [ ] 모바일 앱 App Store / Play Store 베타 출시
- [ ] 영어 버전 70% · ISO 27001 인증
- [ ] 해외 pilot 3건 체결

---

## 8. Cross-cutting 원칙 (모든 Phase 공통)

### 8.1 개발 원칙
1. **Server-first** — SSR/RSC 기본 · 클라이언트는 인터랙션 한정
2. **Supabase RLS 100%** — API 레벨 권한 + DB 레벨 이중 방어
3. **역할·티어 게이팅** — L0~L3 · role/subtype 메타데이터 단일 소스
4. **API 버전**: `/api/v1/` 고정 · Breaking 시 `/v2/` 병행 6개월
5. **에러 응답 스키마**: `{ error: { code, message } }` 강제
6. **Mock fallback 금지** — 프로덕션 환경변수로 차단

### 8.2 3-tier 네비게이션 규약 ⭐
모든 `(main)` 라우트는 다음 3단계 구조 준수:

```
┌────────────────────────────────────────────────┐
│ TopBar: 거래소 | 딜룸 | 분석 | 커뮤니티 | 마이   │  ← 고정
├────────────────────────────────────────────────┤
│ 섹션 SubNav: (탭 또는 좌측 사이드)               │  ← 섹션별
├────────────────────────────────────────────────┤
│ Breadcrumb: 섹션 > 하위섹션 > 현재페이지          │  ← 위치
├────────────────────────────────────────────────┤
│ Content (서비스 실체)                           │
└────────────────────────────────────────────────┘
```

**위반 시 Phase 1-G 타입 P0 버그로 취급**

### 8.3 디자인 시스템 규약
- `DS.page.container` · `DS.page.hero`
- 카드: `DS.card.base` / `.elevated` / `.interactive` 중 선택
- 버튼: `DS.btn({ variant, size })` 헬퍼 사용
- 빈 상태: `DS.empty` 통일
- 색상: 디자인 토큰 (`--color-brand-dark` 등) 경유 · 직접 hex 금지

### 8.4 Deal Flow 가시성
모든 주요 액션은 `/admin/dealflow` funnel 이벤트 송출:
- listing.created · listing.viewed
- deal.nda_signed · deal.loi_submitted
- contract.signed · payment.completed

---

## 9. Phase 진입 플레이북

### 사용자 지시 패턴
```
🗣️ "Phase 1 진행해줘"       → 1-A 부터 1-H 순차 · 세션별 커밋
🗣️ "Phase 1-B 해줘"         → 매수 수요 카드 고도화만 집중
🗣️ "Phase 2-A, 2-B 병렬"    → 독립 서브태스크 동시 진행
🗣️ "Phase 1 Acceptance"    → 체크리스트 검증 + 회고 리포트
```

### Claude 의 Phase 진입 체크리스트
1. **의존성 확인** — 선행 Phase 완료 여부
2. **Acceptance criteria 확정** — 종료 기준 명문화
3. **파일 영향도 분석** — 신규/수정 파일 목록
4. **세션 분할 제안** — 1 세션 = 1 커밋 기준
5. **Deal Flow KPI 영향 명시** — 어느 단계의 어떤 지표에 기여
6. **구현 → 검증 → 커밋** 반복

### Phase 완료 기준
- TypeScript 빌드 pass
- Vitest / Playwright 관련 테스트 추가 (Phase 5 이후 필수)
- 커밋 메시지: `feat({area}): Phase {N}-{X} — {short desc}`
- 본 문서 Acceptance 체크박스 ✅
- Deal Flow funnel 지표 측정 기간 1주 이상

---

## 10. 권장 착수 순서

### Sprint 1 (4주 · 지금~5월 중순)
- **Phase 1-A / 1-B / 1-C** (사용자 지시 3대 UX · 최우선)
- **Phase 1-D** 마무리 · **Phase 1-E** 시작 (결제 테스트)

### Sprint 2 (4주 · 5월 후반~6월 중순)
- **Phase 1-F / 1-G / 1-H** (Funnel 대시보드 · 네비 전수 · P0 롤링 픽스)
- **Phase 2-A / 2-B / 2-E** (OCR · KAMCO · 탐색 UX)

### Sprint 3 (4주 · 6월 후반~7월 중순)
- **Phase 2-C/D/F~J** 병렬
- **Phase 3-A / 3-B** 시작 (SSE 리포트 · Copilot tool use)

### Sprint 4 (4주 · 7월 후반~8월 중순)
- **Phase 3** 완주
- **Phase 4-A / 4-B** 시작 (전자계약 · 에스크로)

### Sprint 5~8 (Q3-Q4)
- Phase 4 완주 · Phase 5 착수

**→ 16주 후 Deal Flow 6단계 병목 제거 완료 → Series A 실사 대비 완료**

---

## 11. 이력 및 완료 Phase

### 완료 (Legacy Phase 문자 코드)
- ✅ **Phase A** 분석 IA 재구성 및 용어 표준화 (2026-04-16)
- ✅ **Phase B** OCR 기반 1~5건 매물 일괄 등록 (2026-04-16)
- ✅ **Phase C** 관리자 모바일 반응형 (2026-04-16)
- ✅ **Phase D** 매물 목록 실/샘플 플리커 해결 (2026-04-16)
- ✅ **Phase F** PC 커뮤니티 메뉴 + 모바일 네비 일치 (2026-04-17)
- ✅ **Phase G** 커뮤니티 서브 네비 3곳 통일 (2026-04-17)
- ✅ **Phase H** P0/P1 UI/UX 일관성 (2026-04-17)
- ✅ **Phase I-1~3** DS.btn 헬퍼 · CSS 변수 통합 · 모바일 스크롤 (2026-04-17)
- ✅ **Phase J-1~3** 금액 입력 콤마 · 버그 7종 · NPL 뉴스 디자인 통일 (2026-04-17)
- ✅ **Phase K** P0 버그 5종 (2026-04-17)
- ✅ **Phase L-1** 요금제 페이지 v2 · 수수료 v2 모델 (2026-04-18)
- ✅ **Phase M~O** (내부 코드 · 스프린트 1~9 관련)
- ✅ **Sprint 7 R-3** Pool Sale aggregator (2026-04-18)
- ✅ **pgvector + RAG 법률 검색** (016 마이그레이션)
- ✅ **역할 기반 온보딩 + PNR 과금** (Sprint 9)
- ✅ **AI Copilot SSE 서버 + 클라이언트** (Phase 1-D 2026-04-19)

### 진행 중
- 🟡 **Phase 1-E** 결제 통합 테스트 Suite

### 대기
- ⏳ Phase 1-A/B/C/F/G/H · Phase 2~6 전체

---

## 12. 문서 단일 진실 소스 (SSoT)

| 문서 | 역할 | 갱신 주기 |
|------|-----|---------|
| `docs/NPLatform_Strategic_Roadmap_2026.md` | 비즈니스·수익·마케팅 전략 | 분기 |
| **`docs/NPLatform_Development_Phases_Plan.md`** (본 문서) | 개발 Phase 실행 지침 | Phase 완료 시 |
| `docs/NPLatform_종합기술계획서_2026.md` | 기술 아키텍처 · 스택 | 반기 |
| `CLAUDE.md` | Claude 세션 컨텍스트 요약 | 수시 |
| Linear `NPL` 프로젝트 | 개별 이슈 트래킹 | 실시간 |

**개발 지시는 본 문서 Phase 번호로만.** 문자 코드(A~EE)는 legacy 로 비활성화.

---

*문서 버전 v2.0 · 2026-04-19 · 다음 리비전: Phase 1 완료 후*
