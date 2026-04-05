# NPLatform v20.0 — 30명 1년 개발 수준 + 자동 고도화 마스터플랜

> 현재 300점 → 목표 600점 (2배)
> "데이터가 쌓일수록 스스로 진화하는 플랫폼"

---

## 1부: 현재 수준 객관적 평가

### 현재 자산
| 항목 | 수량 |
|------|------|
| 페이지 | 195 |
| API | 193 |
| 컴포넌트 | 179 |
| 라이브러리 | 93 |
| 모듈 | 10 |
| DB 테이블 | 37 |
| 번역 키 | 715 × 3언어 |

### 혁신성 평가 (10점 만점)

| 영역 | 점수 | 평가 |
|------|------|------|
| 비즈니스 모델 | 8/10 | SaaS 멀티테넌시 + 수익 다각화 (구독/크레딧/수수료/광고) |
| 기술 아키텍처 | 7/10 | 모듈러 구조 있으나 실연동 부족 |
| AI 활용 | 6/10 | 구조는 있으나 ML 기반 자동 학습 없음 |
| 데이터 활용 | 4/10 | **가장 부족** — 데이터 축적/학습 구조 없음 |
| UX 혁신 | 7/10 | 스와이프, 위젯 등 있으나 개인화 부족 |
| 규제 대응 | 8/10 | 면책, 역할 책임 구조 완비 |
| 글로벌 준비 | 6/10 | 3언어 + 다통화 있으나 실적용 부족 |
| 운영 자동화 | 5/10 | 수동 관리 많음, 자동화 부족 |

**혁신성 종합: 51/80 (64%)**

### 30명 팀 1년 대비 현재 수준
- UI/페이지: 80% 달성 (195 페이지)
- 백엔드/API: 60% (mock 많음)
- 데이터/ML: 10% (**거의 없음**)
- 운영 자동화: 30%
- 테스트/QA: 40%

---

## 2부: 2배 고도화 = 데이터 기반 자동 진화 플랫폼

### 핵심 철학: "사용할수록 똑똑해지는 플랫폼"

```
[사용자 행동] → [데이터 수집] → [ML 학습] → [모델 업데이트] → [서비스 개선]
      ↑                                                          │
      └──────────────────────────────────────────────────────────┘
```

---

## EVOLUTION 1: 데이터 파이프라인 + ML 기반 자동 고도화 (300→350)

### 1-1. 행동 데이터 수집 엔진

```ts
// lib/analytics/tracker.ts
// 모든 사용자 행동을 자동 수집:
- 페이지 방문 (어디를, 얼마나, 어떤 순서로)
- 매물 조회 (어떤 매물을, 얼마나 오래, 스크롤 깊이)
- 검색 패턴 (어떤 필터, 어떤 키워드, 결과 클릭률)
- 거래 행동 (관심표명→NDA→실사 전환율)
- 가격 반응 (어떤 가격대에 관심, 어떤 가격에 이탈)
- 체류 시간 (페이지별, 기능별)
```

### 1-2. ML 모델 (서버사이드)

```ts
// lib/ml/price-model.ts — 적정가 예측 (회귀 모델)
// 거래 완료 데이터가 쌓일수록 정확도 향상
- 입력: 담보유형, 지역, LTV, 연체기간, 감정가
- 출력: 예상 거래가 범위
- 학습: 완료된 거래의 실제 가격으로 계수 업데이트

// lib/ml/risk-model.ts — 리스크 스코어링 (분류 모델)
- 입력: 채권 특성 + 담보물 특성
- 출력: 리스크 등급 (A~E) + 확률
- 학습: 거래 결과 (회수율, 손실률)로 가중치 업데이트

// lib/ml/matching-model.ts — 매수자-매물 매칭 (협업 필터링)
- 입력: 매수자 프로필 + 과거 관심/거래 이력
- 출력: 추천 매물 순위 + 매칭 확률
- 학습: 관심표명→거래 전환 데이터로 자동 개선

// lib/ml/churn-model.ts — 이탈 예측
- 입력: 최근 로그인, 활동량, 체류시간 변화
- 출력: 이탈 확률 + 이탈 시점 예측
- 학습: 실제 이탈 데이터로 정확도 향상
```

### 1-3. 자동 고도화 파이프라인

```
매일 자정:
1. 전일 행동 데이터 집계
2. ML 모델 재학습 (가격, 리스크, 매칭)
3. 추천 매물 목록 갱신
4. 이상 거래 탐지
5. 리포트 자동 생성 (주간/월간)

거래 완료 시:
1. 실거래가로 가격 모델 업데이트
2. 매수자 프로필 학습 데이터 추가
3. 유사 매물 가격 재추정
4. 거래 소요 기간 통계 업데이트
```

**구현 파일:**
- `lib/analytics/tracker.ts` — 행동 데이터 수집
- `lib/analytics/aggregator.ts` — 데이터 집계
- `lib/ml/price-model.ts` — 가격 예측 (선형 회귀)
- `lib/ml/risk-model.ts` — 리스크 분류 (로지스틱 회귀)
- `lib/ml/matching-model.ts` — 협업 필터링
- `lib/ml/churn-model.ts` — 이탈 예측
- `lib/ml/model-manager.ts` — 모델 관리 (학습/저장/로드)
- `app/api/v1/ml/train/route.ts` — 모델 재학습 API
- `app/api/v1/ml/predict/route.ts` — 예측 API
- `app/(main)/admin/ml/page.tsx` — ML 모델 관리 대시보드

---

## EVOLUTION 2: 개인화 엔진 (350→400)

### 2-1. 사용자별 맞춤 대시보드

```
매수자 A가 강남 오피스만 본다 → 메인에 강남 오피스 추천
매수자 B가 5억 이하 아파트만 본다 → 5억 이하 아파트 추천
매도자 C가 빠른 매각을 원한다 → 적극적 매수자 매칭
```

### 2-2. 실시간 개인화

- 검색 결과: 과거 관심 기반 정렬 (ML 모델)
- 추천 매물: 협업 필터링 (비슷한 사용자가 본 매물)
- 알림: 관심 패턴 기반 자동 알림 (새 매물이 패턴에 맞으면)
- 가격 알림: "관심 지역의 매물 가격이 10% 하락했습니다"

**구현 파일:**
- `lib/personalization/engine.ts` — 개인화 엔진
- `lib/personalization/preferences.ts` — 사용자 선호도 프로필
- `app/api/v1/personalization/recommendations/route.ts` — 개인화 추천 API
- `app/api/v1/personalization/alerts/route.ts` — 스마트 알림 API

---

## EVOLUTION 3: 쿠폰/이용권/초대 시스템 (400→430)

### 3-1. 쿠폰 유형

| 유형 | 설명 | 관리자 설정 |
|------|------|-----------|
| 무료 이용권 | N개월 무료 (PRO 플랜) | 기간, 대상, 발급 수 |
| 크레딧 쿠폰 | N 크레딧 증정 | 크레딧 수, 유효기간 |
| 할인 쿠폰 | N% 할인 (구독/크레딧) | 할인율, 대상 상품, 기간 |
| 초대권 | 특정 URL로 가입 시 혜택 | URL 코드, 혜택 내용, 만료일 |
| 입장권 | 특정 기능/이벤트 접근 | 대상 기능, 유효기간 |
| VIP 쿠폰 | 전체 기능 무제한 | 기간, 대상 |

### 3-2. DB 테이블

```sql
CREATE TABLE coupons (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL, -- FREE_PLAN, CREDITS, DISCOUNT, INVITATION, TICKET, VIP
  value JSONB NOT NULL, -- { months: 3 } or { credits: 100 } or { discount_pct: 20 }
  max_uses INT,
  used_count INT DEFAULT 0,
  target_roles TEXT[],
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_by UUID,
  status TEXT DEFAULT 'ACTIVE'
);

CREATE TABLE coupon_uses (
  id UUID PRIMARY KEY,
  coupon_id UUID REFERENCES coupons(id),
  user_id UUID,
  used_at TIMESTAMPTZ DEFAULT now(),
  result JSONB -- 적용 결과
);
```

**구현 파일:**
- `lib/coupon.ts` — 쿠폰 생성/검증/적용
- `app/api/v1/coupons/route.ts` — 쿠폰 CRUD
- `app/api/v1/coupons/redeem/route.ts` — 쿠폰 사용
- `app/(main)/admin/coupons/page.tsx` — 관리자 쿠폰 관리
- `app/(main)/settings/coupons/page.tsx` — 사용자 쿠폰 입력/목록

---

## EVOLUTION 4: 회원 등급 + 메뉴별 권한 시스템 (430→470)

### 4-1. 회원 등급

| 등급 | 조건 | 혜택 |
|------|------|------|
| BASIC | 가입 시 | 기본 열람, 크레딧 5/월 |
| STANDARD | PRO 구독 | 확장 기능, 크레딧 100/월 |
| PREMIUM | ENTERPRISE 구독 | 전 기능, 무제한 크레딧 |
| VIP | 관리자 지정 | 모든 제한 해제 |
| INSTITUTION | 기관 가입 | 기관 전용 기능 |

### 4-2. 메뉴별/서비스별 접근 권한

```ts
// lib/permissions.ts
interface PermissionRule {
  feature: string        // 'exchange.view' | 'exchange.create' | 'ai.analysis'
  allowedGrades: string[] // ['STANDARD', 'PREMIUM', 'VIP']
  allowedRoles: string[]  // ['BUYER', 'SELLER']
  creditCost: number      // 0 = 무료
}

// 관리자에서 모든 규칙 설정 가능
```

**구현 파일:**
- `lib/permissions.ts` — 권한 규칙 엔진
- `lib/membership.ts` — 회원 등급 관리
- `app/api/v1/permissions/route.ts` — 권한 설정 API
- `app/(main)/admin/permissions/page.tsx` — 메뉴별 권한 설정 관리자
- `components/shared/permission-gate.tsx` — `<PermissionGate feature="ai.analysis">` 컴포넌트

---

## EVOLUTION 5: 관리자 다계층 시스템 (470→500)

### 5-1. 관리자 레벨

| 레벨 | 이름 | 권한 |
|------|------|------|
| L1 | 슈퍼관리자 | 모든 권한 + 다른 관리자 관리 |
| L2 | 시스템관리자 | 시스템 설정, API, DB, 모듈 |
| L3 | 운영관리자 | 회원/매물/거래/정산 관리 |
| L4 | 콘텐츠관리자 | 교육/뉴스/가이드/배너 관리 |
| L5 | 모니터링 | 읽기 전용 (대시보드, 로그 열람) |

### 5-2. 관리자별 메뉴 접근

```ts
const ADMIN_LEVEL_PERMISSIONS = {
  L1: ['*'], // 전체
  L2: ['system', 'api', 'database', 'modules', 'monitoring', 'security'],
  L3: ['users', 'listings', 'deals', 'professionals', 'partners', 'billing', 'settlements'],
  L4: ['banners', 'courses', 'glossary', 'news', 'guide', 'notices'],
  L5: ['dashboard', 'monitoring', 'audit-logs'], // 읽기 전용
}
```

**구현 파일:**
- `lib/admin-levels.ts` — 관리자 레벨 정의 + 권한 체크
- `app/api/v1/admin/admins/route.ts` — 관리자 계정 CRUD
- `app/(main)/admin/admins/page.tsx` — 관리자 계정 관리 (등록/레벨변경/삭제)
- `app/(main)/admin/layout.tsx` — 레벨별 메뉴 필터링

---

## EVOLUTION 6: 자동 운영 (500→530)

- 매물 만료 자동 처리 (deadline 지나면 CLOSED)
- 이탈 사용자 자동 리텐션 이메일
- 정산 자동 배치 (매월 1일)
- 리포트 자동 생성 (주간/월간 → 관리자 이메일)
- 쿠폰 만료 자동 처리
- 미결제 구독 자동 해지
- 데이터 백업 자동화

**구현 파일:**
- `lib/automation/scheduler.ts` — 스케줄러 (cron 기반)
- `lib/automation/retention.ts` — 이탈 방지 로직
- `lib/automation/settlement-batch.ts` — 정산 배치
- `lib/automation/report-generator.ts` — 자동 리포트
- `app/api/v1/cron/daily/route.ts` — 일간 배치 API
- `app/api/v1/cron/weekly/route.ts` — 주간 배치 API
- `app/(main)/admin/automation/page.tsx` — 자동화 작업 관리

---

## EVOLUTION 7: 고급 분석 + 시각화 (530→560)

- 코호트 분석 (가입 시점별 활성도)
- 퍼널 분석 (검색→조회→관심→거래 전환율)
- 지역별 히트맵 (거래 밀도)
- 가격 추이 차트 (시계열 분석)
- 매수자/매도자 네트워크 그래프
- 기관별 성과 비교 대시보드

**구현 파일:**
- `lib/analytics/cohort.ts` — 코호트 분석
- `lib/analytics/funnel.ts` — 퍼널 분석
- `app/(main)/admin/analytics/page.tsx` — 통합 분석 대시보드
- `app/(main)/admin/analytics/cohort/page.tsx` — 코호트 분석
- `app/(main)/admin/analytics/funnel/page.tsx` — 퍼널 분석

---

## EVOLUTION 8: API 마켓플레이스 (560→580)

- 외부 개발자가 NPLatform API를 사용할 수 있는 마켓
- API 키 발급/관리
- API 문서 자동 생성 (Swagger/OpenAPI)
- 사용량 추적 + 과금
- 샌드박스 환경

**구현 파일:**
- `app/(main)/developer/page.tsx` — 개발자 포털
- `app/(main)/developer/docs/page.tsx` — API 문서
- `app/(main)/developer/keys/page.tsx` — API 키 관리
- `app/api/v1/developer/docs/route.ts` — OpenAPI 스펙

---

## EVOLUTION 9: 고급 보안 (580→595)

- WAF (Web Application Firewall) 규칙
- DDoS 방어 (Cloudflare 연동 구조)
- 데이터 마스킹 고도화 (동적 마스킹 정책)
- 컴플라이언스 리포트 자동 생성
- 침해 사고 대응 플레이북

---

## EVOLUTION 10: 생태계 확장 (595→600)

- 파트너 API (파트너사 시스템 연동)
- 금융기관 전용 커넥터 (은행 시스템 연동 규격)
- 공공 데이터 자동 연동 (법원 경매, 캠코 공매)
- 업계 표준 데이터 포맷 (NPL 데이터 교환 규격)
- 오픈 이노베이션 플랫폼

---

## 실행 요약

| Phase | 내용 | 파일 수 | 점수 |
|-------|------|---------|------|
| EVO 1 | ML 파이프라인 + 자동 학습 | ~15 | 350 |
| EVO 2 | 개인화 엔진 | ~5 | 400 |
| EVO 3 | 쿠폰/이용권/초대 | ~6 | 430 |
| EVO 4 | 회원 등급 + 메뉴별 권한 | ~5 | 470 |
| EVO 5 | 관리자 다계층 | ~4 | 500 |
| EVO 6 | 자동 운영 | ~8 | 530 |
| EVO 7 | 고급 분석 | ~6 | 560 |
| EVO 8 | API 마켓 | ~4 | 580 |
| EVO 9 | 고급 보안 | ~3 | 595 |
| EVO 10 | 생태계 확장 | ~3 | 600 |
