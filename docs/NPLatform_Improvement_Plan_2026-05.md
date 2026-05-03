# NPLatform 개발 개선 계획 (2026-05-03)

> P0 13건 완료 후 새 갭 진단 — 한국 비즈니스 우선 + KB 본계약 진입 전 필수.
> 진단 범위: P0 인프라 UI 연결 / 외부 데이터 / 운영 인프라 / UX·모바일.

---

## 진단 종합 — 4개 영역 완성도

| 영역 | 완성도 | 핵심 갭 |
|------|--------|--------|
| **P0 인프라 UI 연결** | 30% | backend SSoT 7건 모두 화면 미연결 (V2 카탈로그·ESCROW·백테스트·Realtime 등) |
| **외부 데이터 통합** | 40% | MOLIT·온비드 ✓ / 대법원·등기부·건축물대장·결제 자동화 ✗ |
| **운영 인프라** | 60% | CI/CD·Sentry ✓ / Slack 알림·Lighthouse·Datadog·env 정합 ✗ |
| **UX·모바일** | 55% | 디자인 시스템 ✓ / 온보딩 단절·모바일 반응형·접근성 ✗ |

**한 문장 결론**: backend 안정성은 갖춰졌으나 **KB 본계약 데모 + 땅집고옥션 12,000명 유입** 시점에 사용자가 실제로 만질 화면과 운영 안정성에 즉시 처리해야 할 갭 존재.

---

## 영역 1 — P0 인프라 UI 연결 (가장 시급)

### 활용 중 (확인됨)
- `/api/v1/ocr/registry` — `/exchange/ocr-register` 페이지에서 호출 (초기 단계)
- `/api/v1/commissions` — webhook + admin PATCH 자동 호출 (UI 미노출)

### 갭 — backend 만 있고 UI 미연결
| 인프라 | 현황 | 필요 컴포넌트 |
|------|------|------|
| **V2 18 카탈로그** | `lib/agreements/v2-catalog.ts` SSoT | `/exchange/sell` + `/exchange/auction/new` 의 `SpecialConditionsSection` 이 V2_CATALOG.map() 동적 렌더링 |
| **ESCROW Workflow UI** | `/api/v1/exchange/deals/[id]/escrow` 미사용 | `dealroom` 우측 sticky 패널 — 4 마일스톤 진행바 + 관리자 confirm 버튼 |
| **백테스트 결과 UI** | `/api/v1/ai/backtest` 미연결 | `/admin/ml?tab=models` 카드에 latest backtest 메트릭 + 시계열 추세 |
| **Commission Invoice UI** | API 완성, 표시 없음 | 신규 `/admin/commissions` + 인보이스 PDF 다운로드 |
| **RLS 매트릭스 UI** | `lib/security/rls-matrix.ts` 코드만 | `/admin/security` 페이지 — 정책 가시화 + CI 게이트 결과 |
| **Realtime Hooks** | useNotificationsRealtime 만 사용, 나머지 3종 0건 | `/deals/dealroom` + `/my/deals` + 매물 카드 ❤ 버튼에 구독 추가 |
| **Esign Verify** | `/api/v1/esign/verify/[dealId]` 미호출 | 분쟁 페이지 / 관리자 감사 도구 — chain integrity 표시 |

### P1 시급 (KB 본계약 데모 진입 가능 수준)
1. **ESCROW Workflow UI** — `dealroom` 우측 sticky 패널 (마일스톤 4단계 진행바)
2. **V2 카탈로그 동적 렌더링** — `SpecialConditionsSection` 18 항목 SSoT 사용
3. **백테스트 대시보드** — `/admin/ml?tab=models` 정확도 카드 + 추세 차트
4. **Commission Invoice 관리** — 신규 `/admin/commissions` + PDF
5. **Realtime 4종 훅 활성** — 딜룸 + 즐겨찾기 + 알림 + 매수의향

---

## 영역 2 — 외부 데이터 통합

### 통합 완료
- **MOLIT 실거래가 API** — `lib/data-pipeline/real-transaction-fetcher.ts` (아파트·오피스텔·상가·토지 4 유형 + 20개 LAWD 코드)
- **온비드 공매 API** — `lib/data-pipeline/court-auction-fetcher.ts`
- **Vercel Cron 정기 수집** — Daily/Weekly/Monthly
- **결제 PG** — PortOne V2 + Inicis (Webhook 핸들러)
- **NBI 자체 산출** — `lib/indices/nbi-calculator.ts` (실거래·경매에서 자동 계산)

### 갭
| 우선 | 데이터 | 현황 | 갭 임팩트 |
|------|------|------|----------|
| **P1** | 대법원 경매정보 | 외부 개발자 구현 완료 — 연동만 필요 | 회수율 모델 정확도 ↑ 핵심 입력 |
| **P1** | 인터넷등기소 등기부 | 수동 업로드만 | 매물 입고→분석 3일 → 2시간 단축 가능 |
| **P1** | 정부24 건축물대장 | 수동 입력 | AI 회수율 정확도 +15% |
| **P1** | 결제 Webhook 자동 수금 | 수수료 INSERT 만, 수금 트리거 X | 매출 자동화 (수동 송금 의존 해소) |
| **P1** | Geocoding (카카오/네이버) | 지도 표시만 | 입찰 추천가 정확도 +25% |
| **P2** | KB 부동산 NBI | 내부 계산만 | 외부 데이터 구독 |
| **P2** | PASS 본인인증 | 미구현 | KYC 신뢰도 강화 |
| **P3** | BIGKinds 뉴스 | 수동 처리 | 뉴스 분석 자동화 |

---

## 영역 3 — 운영 인프라

### 통합 완료
- **CI/CD** — GitHub Actions (lint/typecheck/build/vitest/Playwright/coverage)
- **Sentry** — `@sentry/nextjs` 서버/클라이언트 양면 통합
- **Vercel Analytics** — `@vercel/analytics` 활성
- **Bundle 분석** — `next-bundle-analyzer`
- **로깅** — `lib/logger.ts` 구조화 (NDJSON 프로덕션, 컬러 콘솔 개발)

### 갭
| 우선 | 도구 | 현황 | 필수 조치 |
|------|------|------|----------|
| **P1** | Slack 배포 알림 | GH Actions 알림 단계 없음 | webhook URL + 실패 시 자동 통보 |
| **P1** | Lighthouse CI | 미설정 | 빌드 게이팅 (LCP/CLS 임계치 강제) |
| **P1** | Datadog/Logtail | 외부 수집 0% | API 키 + 구조화 로그 forwarding |
| **P1** | `.env.example` | 부재 (38개 env var 사용) | 시크릿 제외 키 목록 작성 |
| **P1** | RLS 백업/복구 정책 | Supabase 정책 문서 ✗ | 일일 스냅샷 + 7일 보관 SLA 명시 |
| **P2** | Web Vitals 수집 | `web-vitals` 미설치 | reportWebVitals 구현 |

### 테스트 커버리지 실측
- 설정: thresholds = branches 60% / functions 70% / lines 70% / statements 70%
- 테스트 파일: `__tests__/lib/` 25+ 파일, 3,712줄
- **위험**: thresholds 정의됨, **CI 강제 미적용** — 낮은 커버리지 PR 통과 가능
- 권장: GH Actions 에 `vitest --coverage` 결과 기준 PR block

---

## 영역 4 — UX·모바일

### 잘 되어있는 부분
- **McKinsey Design System** — MckPageShell/Header/Badge/EmptyState 일관 사용
- **샘플 데이터 + 체험 모드** — API 실패 시 SAMPLE_* fallback + MckDemoBanner
- **로딩 상태** — shimmer skeleton 560+ 파일에서 사용
- **i18n 기반** — `lib/i18n.ts` 정적 영문/일문 사전 150+ 용어
- **PWA 기반** — `public/manifest.json` 설정

### 갭
| 영역 | 현황 |
|------|------|
| **온보딩 단절** | `/signup → /select-role → /my/kyc` 사이 KYC 1~2일 대기 시 매물 검색 차단 — 12,000명 유입 시 이탈 위험 |
| **모바일 반응형** | `/exchange` 카드 desktop-first 추정, 하단 탭 네비 부재, sm:/md:/lg: 일관성 부족 |
| **빈 상태 가이드** | MckEmptyState 컴포넌트 있지만 contextual CTA 부족 (검색 0건 → 다음 액션 불명확) |
| **에러 상태** | 4xx/5xx 발생 시 재시도 UI 일관성 부족 (dev-login 만 명확) |
| **접근성 WCAG AA** | aria-label 부족 (navigation 1개), 색 대비 미점검, 키보드 내비게이션 미점검 |

---

## 통합 P1 액션 플랜 (1~3주, 한국 비즈니스 우선)

### Week 1 (즉시)
- **P1-A** ESCROW Workflow UI (dealroom sticky 패널) — 매출 마일스톤 가시화
- **P1-B** V2 카탈로그 동적 렌더링 (매물 등록 폼) — SSoT 정합
- **P1-C** Realtime 4종 훅 활성 (딜룸·즐겨찾기·알림·매수의향) — 사용자 체감 성능
- **P1-D** Slack 배포 알림 (GH Actions webhook) — 운영 신호

### Week 2
- **P1-E** 대법원 경매정보 외부 모듈 연동 (이미 구현됨, API 호출/스키마 매핑만) — 회수율 모델 정확도 ↑
- **P1-F** 결제 PG webhook → 자동 수금 트리거 — 매출 자동화
- **P1-G** 백테스트 대시보드 (`/admin/ml`) — KB 정확도 보고서 자동 생성
- **P1-H** Commission Invoice 관리 (`/admin/commissions`) — 매출 추적

### Week 3
- **P1-I** 모바일 반응형 핵심 3페이지 (`/exchange`, `/deals`, `/my`) — 땅집고옥션 모바일 유입
- **P1-J** 온보딩 KYC 대기 중 L0 매물 미리보기 — 신규 사용자 5분 내 가치 발견
- **P1-K** Lighthouse CI + Web Vitals — 성능 게이팅
- **P1-L** `.env.example` + Datadog 통합 — 운영 안정성

---

## P2 중기 (1~3개월, KB 본계약 진입 후)

| 항목 | 의존성 |
|------|------|
| 등기부 자동 발급 (인터넷등기소) | 수수료 결제 자동화 + 법무팀 검토 |
| 건축물대장 (정부24) | 통합 API 신청 + 인증 |
| 카카오/네이버 Geocoding 통합 | API 키 + 캐싱 전략 |
| Web Vitals 수집 + 성능 최적화 | Lighthouse CI 후속 |
| RLS 실 supabase 검증 (todo 5건) | staging 환경 분리 |
| 빈 상태 + 에러 UI 일관화 | 디자인 시스템 패턴 정립 |
| 접근성 WCAG AA 적합화 | 색대비·키보드·aria 일괄 |
| 영문/일문 i18n 완성 | 글로벌 진입 전제 |

---

## P3 장기 (3~6개월, 글로벌 진입 전제)

- **Python ML 마이크로서비스** — XGBoost/LightGBM 본격 학습 + 모델 서빙
- **ARIMA/Prophet 시계열** — 낙찰가율 본격 시계열 모델
- **PASS 본인인증** — KYC 신뢰도 강화
- **KB 부동산 NBI 외부 구독** — 시세 데이터 보강
- **XRF/Ripple 본격 통합** — Y2 시점 (한국 P0/P1 완료 후)

---

## 우선순위 가이드

### KB 본계약 트리거 직결 (P1 우선)
- 백테스트 대시보드 (정확도 가시화)
- ESCROW UI (마일스톤 추적)
- 대법원 경매 데이터 (모델 정확도)
- 등기부 자동 매핑 UI (시간 단축)

### 매출 발생 직결 (P1 동시)
- Commission Invoice UI (수금 추적)
- 결제 PG webhook 자동 수금
- 온보딩 KYC 대기 중 L0 매물 미리보기

### 운영 안정성 직결 (P1 후순)
- Slack 배포 알림
- Datadog 로그 수집
- Lighthouse CI 게이팅
- `.env.example` 정합

### 미루어도 되는 것 (P3)
- 글로벌 i18n 완성
- XRF/Ripple 본격 통합
- PASS 본인인증
- 다국어 RAG

---

## 원칙

1. **한국 P1 13건 완료 → KB 본계약 + 땅집고옥션 12,000명 유입 가능 수준 도달**
2. **외부 연동 정책 유지** — 자체 hash chain (e-Sign), 자체 ESCROW (NPLatform 자금 보관 X)
3. **하드코딩 금지** — V2 카탈로그 SSoT 패턴 다른 도메인에도 적용
4. **글로벌 (P3) 은 한국 매출 ₩10억/월 도달 후 시작**

---

## 진단서 vs 개선 계획 차이

- **진단서 (`NPLatform_Code_Gap_Audit_2026-05.md`)**: P0 13건 진입 전 갭 진단
- **개선 계획 (본 문서)**: P0 13건 완료 후 발견된 새 갭 + P1 액션 플랜
