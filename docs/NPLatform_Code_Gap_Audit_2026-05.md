# NPLatform 코드 갭 진단 (2026-05-02)

> 한국 비즈니스 우선 — 모든 하드코딩·mock fixture 를 실 로직으로 전환하기 위한 액션 플랜.
> 진단 범위: AI 엔진 / 거래소 데이터 / 결제·ESCROW·전자계약 / OCR·권리분석·Realtime / 테스트.

---

## 진단 요약 — 4개 영역 완성도

| 영역 | 코드 구조 | 실 로직 | 한국 P0 갭 |
|------|----------|---------|-----------|
| **AI 가치평가** | 80% (Claude API + Supabase 연동 ✓) | 30% (앙상블·낙찰가율 모두 하드코딩 룩업) | ML 학습 파이프라인 0% |
| **거래소·딜룸** | 70% (스키마 + UI ✓) | 25% (12건 MOCK + RLS 미검증) | 메시지·NDA/LOI DB 저장 0% |
| **결제·ESCROW·전자계약** | 60% (PortOne+Inicis ✓) | 30% (수수료 자동청구 호출 0건) | KB ESCROW + 외부 e-Sign 미연결 |
| **OCR·권리분석·Realtime** | 40% (훅·검증·V2 카탈로그 ✓) | 35% (등기부 자동매핑 미완·Realtime 채널 비활성) | 80가지 검증 → 실제 20개 |

**한 문장 결론**: 코드 구조는 갖춰졌으나 **핵심 비즈니스 로직 다수가 하드코딩 룩업·합성 데이터·UI-only 모달**로 작동. 한국 1금융권 대상 본계약 전환을 위해 P0 13건 우선 처리 필요.

---

## 영역 1 — AI 가치평가 엔진 (KB 위탁테스트 직결)

### 작동하는 부분 ✓
- `lib/ai/core/llm-service.ts` — Anthropic SDK 직접 호출, Prompt Caching, Tool-use, graceful fallback
- `lib/ai/recovery-predictor.ts` — Claude + 수학 모델 하이브리드 구조
- `lib/npl/profitability/engine.ts` — 결정론적 계산 (채권액→비용→배당→수익률)
- `app/api/v1/ai/dd-report/route.ts` — DD 리포트 SSE 스트리밍
- Supabase 연동: `npl_cases`, `npl_case_rights`, `npl_case_tenants`, `npl_case_assumptions` 실 데이터 조회

### 갭 (즉시 수정 대상)
| 위치 | 문제 |
|------|------|
| `lib/ai/recovery-predictor.ts` L150-199 | 6-tree `ENSEMBLE` leaf 값 (0.68/0.82/0.40 등) **하드코딩 상수**. `trainingSamples: 12847` 표시는 실측 없음 |
| `lib/ai/recovery-predictor.ts` L315-323 | `findSimilarCases()` 동기 폴백 — `SC-001/002/003` 합성 ID, `principal*0.9`/`recoveryRate:0.78` 정적 값 |
| `lib/npl/profitability/ai-predictions.ts` L22-50 | `REGION_BID_RATES` (서울 82%, 경기 75%) + `PROPERTY_TYPE_ADJUSTMENTS` 룩업 — 시계열 모델 부재 |
| `lib/npl/profitability/ai-predictions.ts` L156-192 | Monte Carlo 표준편차 `appraisal*0.09` 고정 — 시장 변동성 미반영 |
| `lib/ai/recovery-predictor.ts` L364 | `accuracy: { mape: 11.3%, rmse: 0.072, r2: 0.847 }` 임의값 — 백테스팅 결과 아님 |
| `lib/npl/sample-data.ts` + `demo-data.ts` | 대구 공장 단일 샘플로 전체 데모 흐름 의존 |

### 한국 P0 (KB 본계약 트리거)
1. **앙상블 → 실 모델 교체**: `npl_cases` 200+건 적재 후 XGBoost/LightGBM 학습 (회수율). 모델 서빙은 (a) 경량 ONNX → Edge 또는 (b) FastAPI 마이크로서비스. 결정 후 `predict()` 함수 시그니처만 유지하고 내부 교체.
2. **낙찰가율 시계열 모델**: 법원경매정보 (대법원 e-나라도움) + KB부동산 NBI 월별 데이터 수집 → ARIMA/Prophet 회귀 → 지역×용도×기간 3축 동적 산출. `REGION_BID_RATES` 상수 폐기.
3. **백테스팅 보고서**: 2023~2024 경매 낙찰 실적 vs 모델 예측 비교 결과를 `lib/ai/backtest/` 에 자동 생성하는 스크립트 + Cron. KB 본계약 시 제출 필수.

---

## 영역 2 — 거래소·딜룸 (53건 클레임)

### 작동하는 부분 ✓
- `npl_listings` + `deal_listings` 듀얼 테이블 + 자동 폴백 (`/api/v1/exchange/listings`)
- 필드 정규화: `claim_amount↔principal_amount`, `ai_grade↔risk_grade`
- `discount_rate` DB 계산 필드
- 마이그레이션 022 (2026-04-28): `deal_rooms`, `deal_room_participants`, `deal_room_messages`, `nda_agreements`, `contract_requests` 스키마 정의
- RLS 정책 정의 (010_rls_policies.sql): seller↔buyer 구분

### 갭
| 위치 | 문제 |
|------|------|
| `app/(main)/exchange/page.tsx` L107-229 | `const MOCK: CardListing[] = [12건 하드코딩]` (npl-2026-0412 ~ 0401). `npl_listings` empty 시 자동 발동 |
| `app/api/v1/exchange/listings/route.ts` L22-77 | `JONGNO_HONGJI_DETAIL` 1페이지 최상단 영구 prepend — `_featured_sample: true` 마크 |
| `app/(main)/deals/dealroom/page.tsx` | `_chat-data` 의 `SHARED_BUYER_THREADS` import — UI 데모용 |
| `app/api/v1/deal-rooms/[id]/messages/route.ts` L127 | `// TODO: 실제 deal_room_messages 테이블 + Supabase Realtime 연동` 주석. POST 0% |
| 딜룸 NDA/LOI 모달 | 컴포넌트 구조만 — DB 저장 워크플로우 부재 |
| `nda_agreements`, `contract_requests` | 테이블만 정의, CRUD 미구현 |
| RLS 정책 | 정의만 있고 통합 테스트로 권한 분리 검증 안 됨 |

### 한국 P0
1. **`exchange/page.tsx` MOCK 제거**: 53건 이상 실 매물 — KAMCO 온비드 / 법원경매정보 / 회원사 직접 등록 데이터로 교체. Featured Sample 1건은 마킹 유지하되 prepend 정책을 `is_featured` 컬럼으로 정상화.
2. **딜룸 transaction 완결성**: `deal_room_messages` POST/PUT/DELETE 실 구현 + Supabase Realtime `INSERT` 채널 구독. NDA 전자서명 → `nda_agreements` 저장 → 상태 머신 (DRAFT → SIGNED → EXPIRED). 본계약 `contract_requests` (PENDING → ACCEPTED → CLOSING → COMPLETED) 풀 사이클.
3. **RLS 통합 테스트**: `tests/rls/` 신설 — seller/buyer/admin 3개 토큰으로 동일 row 접근 권한 매트릭스 자동 검증. CI 게이트 필수.

---

## 영역 3 — 결제·ESCROW·전자계약

### 작동하는 부분 ✓
- `lib/payment-portone.ts` — PortOne V2 API 정통합 (샌드박스 모드 기본), Webhook HMAC-SHA256 서명 검증, 부분 취소
- `lib/payment-inicis.ts` — KG이니시스 1차 결제창 + 2차 승인 정통합
- `app/api/v1/payments/confirm` — 검증 라우트 실 작동
- `lib/payments/e-sign.ts` — Hash Chain (SHA-256 Merkle-lite) + 마이그레이션 `esign_records` 테이블 (chain_hash·document_hash)
- `lib/agreements/pdf-generator.ts` — jsPDF 기반 NDA·LOI·본계약 PDF 생성

### 갭
| 위치 | 문제 |
|------|------|
| `lib/payment.ts` L58-66 | `provider='none'` 기본값으로 모든 검증 통과 (개발 편의 → 운영 위험) |
| Toss Payments | `@tosspayments/sdk` 미설치, `lib/payment.ts` 스텁만 |
| `/api/v1/exchange/deals/{id}/escrow` | **엔드포인트 미존재** (404). `lib/deal-pipeline.ts` L271-279 에 `CREATE_ESCROW` action 정의되었지만 fetch 시 실패 |
| KB ESCROW | API 미연결 — Toss ESCROW API 도 미통합 |
| `lib/billing-events.ts` L36-101 `onDealSettlement()` | **호출 위치 0건** (grep). 거래 완료 시 자동 청구 발생 안 함 |
| `fee_settings` 테이블 | `deal_buyer_commission`, `deal_seller_commission` 시드 row 부재 |
| 외부 e-Sign | 모두싸인/이폼사인/DocuSign 미연결 — 자체 hash chain 만 (전자서명법 고급 전자서명 미준수) |
| 5년 보관 | 서명 PDF 별도 보관 정책 없음 (DB 컬럼만) |

### 한국 P0
1. **거래수수료 자동 청구 워크플로우** (1주): `lib/deal-state.ts` 의 `ESCROW → CLOSED` 전환 시 `onDealSettlement()` 호출 추가. `fee_settings` 마이그레이션 시드 (buyer 0.75%, seller 0.75% 기본). `invoices.status='UNPAID'` 자동 결제 요청 트리거.
2. **KB ESCROW 본계약 통합** (2~3주): `app/api/v1/exchange/deals/[id]/escrow/route.ts` 신설 — POST(생성)/GET(조회)/PUT(상태). 마일스톤 (30% 채권양도 / 50% 등기이전 / 20% 인수확인) 정식 구현. 본계약 전자서명 완료 → KB API 자동 호출. 잔금일 도달 → 채권양도통지 자동 발송 → 자동 정산.
3. **외부 e-Sign 연결** (1~2주): 모두싸인 (국내 전자서명법 준수, REST API) 우선 도입. `app/api/v1/esign/send-request/route.ts` 추가 — 서명자 초대 + sessionId. Webhook 으로 완료 콜백 → `esign_records.signature_image_url` + Supabase Storage 5년 보관.

---

## 영역 4 — OCR·권리분석·Realtime·테스트

### 작동하는 부분 ✓
- `app/api/v1/ocr/route.ts` — Claude Vision 사용 (이미지/PDF/DOCX/HWP/스프레드시트)
- `app/api/v1/ocr/autofill/route.ts` — confidence 점수 기반 폼 매핑
- `lib/ocr/validate.ts` — 날짜·금액·면적 정규화
- `lib/registry-analysis.ts` — 법정 기본 10행 + V2 특수조건 18개 (소유권 5/비용 7/유동성 6) + 등기부 시그널 2 + 고정감점
- `computeDistributionTable()` — 폭포수 배당 시뮬레이션
- 경매비용 누진표 계산
- `lib/supabase/realtime.ts` — 5개 훅 정의

### 갭
| 위치 | 문제 |
|------|------|
| OCR 외부 서비스 | Claude Vision 단일. Google Cloud Vision / Naver CLOVA / AWS Textract 미통합 (병렬 호출로 정확도/속도 향상 가능) |
| OCR 1분 응답 | 대용량 PDF 시 Claude 10~30초 + 네트워크 → 1분 미달 또는 초과. 큐+잡 패턴 미적용 |
| 등기부 → 특수조건 매핑 | OCR JSON 추출까지는 동작. **자동 매핑 파이프라인 미완성** — 수동 테스트 데이터 의존 |
| 80가지 검증 | 실제 코드는 V2 18 + 시그널 2 + 고정감점 = **20+개**. "80가지" 클레임은 코드 검증 안 됨 |
| Realtime 활성 채널 | `npl_listings`/`deals`/`notifications`/`npl_ai_analyses` 4개만. **딜룸 채팅·매수의향·실시간 입찰 모두 polling 또는 미구현** |
| `RealtimeBidPanel.tsx` | SSE/polling fallback만 — WebSocket 입찰 (Phase 5) 미구현 |
| 테스트 | 56개 파일 / 399 passed / 1 failed / **595 skipped** / 커버리지 reporter 설정만 있고 CI 미실행 |

### 한국 P0
1. **OCR → 등기부 자동 매핑 파이프라인**: `app/api/v1/ocr/registry/route.ts` 신설 — 등기부 PDF 업로드 → Claude Vision 추출 → V2 18개 특수조건 자동 체크 → `npl_case_rights` 자동 저장. 사용자 수동 입력 분기 제거.
2. **권리분석 카탈로그 정합화**: 마케팅 카피의 "80가지" 를 코드 실제 (V2 18 + 시그널 2 + 고정감점) 로 재정의. 카탈로그를 `lib/registry-analysis/v2-catalog.ts` 로 분리하고 enum 으로 명시. 추후 항목 추가 시 마이그레이션 + 테스트 필수.
3. **Realtime 채널 활성화**: 딜룸 채팅 (`deal_room_messages` INSERT 채널) + 매수의향 알림 (`bid_intentions` INSERT) + 매물 즐겨찾기 동기 (`favorites` UPSERT) 즉시 활성. Phase 5 WebSocket 입찰은 별도 트랙.

---

## 한국 우선 P0 13건 통합 로드맵 (Q2 2026)

### 즉시 (1~2주)
- **P0-1** AI 앙상블 모델 학습 파이프라인 신설 (`lib/ai/training/` + Cron 주간 재학습)
- **P0-2** 거래수수료 `onDealSettlement()` 자동 호출 + `fee_settings` 시드
- **P0-3** 거래소 MOCK 12건 제거 + Featured Sample 정책 정상화
- **P0-4** 딜룸 메시지 POST/Realtime INSERT 채널 활성

### 단기 (3~6주)
- **P0-5** 낙찰가율 시계열 모델 (ARIMA/Prophet) + 데이터 수집 Cron
- **P0-6** KB ESCROW API 통합 + 마일스톤 워크플로우
- **P0-7** 외부 e-Sign (모두싸인) 통합 + Storage 5년 보관
- **P0-8** NDA/LOI/본계약 상태머신 풀 사이클 + 전자서명 연계
- **P0-9** 등기부 OCR → 특수조건 자동 매핑 파이프라인

### 중기 (6~10주)
- **P0-10** 백테스팅 자동화 + KB 본계약 보고서 생성기
- **P0-11** RLS 통합 테스트 매트릭스 (CI 게이트)
- **P0-12** 권리분석 카탈로그 enum + 마이그레이션 테스트
- **P0-13** Realtime 채널 4개 → 8개 확장 (채팅/매수의향/즐겨찾기/입찰)

---

## 글로벌 진입을 위한 P1 (한국 P0 완료 후)

| 항목 | 의존성 |
|------|-------|
| 영문 i18n 사전 + 다국어 RAG | KO 100% 완성 후 |
| XRF Foundation Master Framework Contract | KB ESCROW + e-Sign 완료 후 |
| MAS SFA s.274/275 Compliance Checker | 컴플라이언스 SOC2 후 |
| RLUSD/USDC OTC 계좌 통합 | XRF SPV 설립 후 |
| ODL Corridor (USD↔KRW) | 한국은행 외환신고 루틴화 후 |

> **원칙**: 한국 P0 13건이 완료되어야 글로벌 P1 가 신뢰 가능.
> 글로벌 어필은 **KB 본계약 + 회원사 매출 ₩10억/월 도달 후** 시작.
