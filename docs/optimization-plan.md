# NPLatform v8.0 → v9.0 고도화 최적화 계획

## 테스트 결과 기반 분석

### 전체 테스트 현황
- 유닛 테스트: 32/32 통과 (masking, rate-limiter, listing-validator)
- 50가지 시나리오: 50/50 통과
- 100가지 E2E: 100/100 통과
- 빌드: 250페이지 0 에러

### 테스트에서 발견된 개선점

| # | 발견 사항 | 현재 상태 | 개선 방향 |
|---|----------|----------|----------|
| 1 | 거래 API가 인증 없이 401 반환 | 정상이지만 mock 폴백 없음 | 비인증 시 mock 데이터 폴백 추가 (dev 환경) |
| 2 | API 응답 필드명 불일치 | listings: original_amount vs debt_principal | 스키마 기반 타입 통일 |
| 3 | API 응답 형식 불일치 | { services } vs { data } | 전체 API 응답을 `{ data, meta }` 형식으로 표준화 |
| 4 | /knowledge 메인 페이지 없음 | courses, glossary만 존재 | knowledge/page.tsx 신규 생성 |
| 5 | 클라이언트 렌더링으로 SSR 확인 불가 | "use client" 페이지는 HTML에 콘텐츠 미포함 | 가능한 페이지는 Server Component로 전환 |
| 6 | 히어로 이미지 로딩 지연 | 메인 히어로가 비어보임 | 스켈레톤 로더 + 배경색 즉시 적용 |

---

## Phase 1: 안정성 강화 (즉시)

### 1-1. API 응답 형식 표준화
모든 API를 `{ data, total?, page?, meta? }` 형식으로 통일:
- `api/v1/professional/services` → `{ data: [...] }` (현재 `{ services }`)
- `api/v1/professional/consultations` → `{ data: [...] }` (현재 `{ consultations }`)
- `api/v1/professional/earnings` → `{ data: {...} }` (현재 혼합)
- `api/v1/exchange/deals` → mock 폴백 추가 (현재 401만 반환)

### 1-2. 누락 페이지 생성
- `app/(main)/knowledge/page.tsx` — 지식센터 메인 (courses + glossary 링크)
- `app/guide/service/[key]/page.tsx` — 서비스별 새 창 가이드 (계획에 있으나 미구현)
- `app/guide/service/layout.tsx` — 가이드 전용 레이아웃

### 1-3. 타입 안전성
- `lib/types.ts`에 DealListing, DealMilestone, Offer 등 신규 타입 추가 (현재 API mock에만 존재)
- API 응답 타입과 프론트엔드 타입 동기화
- Zod 스키마로 API 입력 검증 강화

### 1-4. 에러 핸들링
- API 에러 응답 표준화: `{ error: { code, message, details? } }`
- 프론트엔드: API 에러 시 toast 메시지 + fallback UI
- 네트워크 오프라인 감지 → 오프라인 배너 표시

---

## Phase 2: 데이터 무결성 (1~2주)

### 2-1. Mock → Supabase 전환 우선순위
| 우선순위 | API | 현재 | 전환 |
|---------|-----|------|------|
| P0 | exchange/listings | mock 5건 | Supabase deal_listings 테이블 |
| P0 | institutions | mock 5건 | Supabase tenants + institution_profiles |
| P1 | professional/services | mock 3건 | Supabase professional_services |
| P1 | professional/consultations | mock 5건 | Supabase consultations |
| P1 | banners | 인메모리 | Supabase banners 테이블 |
| P2 | exchange/deals | 인증 필수 mock | Supabase deals |
| P2 | fund, lender | 하드코딩 | Supabase 연동 |

### 2-2. Supabase 마이그레이션 실행
- `001_full_schema.sql` 스키마를 실제 Supabase 프로젝트에 적용
- 시드 데이터 삽입 (구독 플랜, 크레딧 패키지, 수수료 설정)
- RLS 정책 테스트

### 2-3. 입력 검증 강화
- 매각 등록: Zod 스키마로 전체 필드 검증
- 상담 요청: 날짜 유효성, 전문가 존재 여부
- 오퍼 제출: 금액 범위 검증
- 추천코드: 형식 + 유효성 + 사용 횟수

---

## Phase 3: 성능 최적화 (2~3주)

### 3-1. Server Component 전환
현재 대부분 "use client". 데이터 패칭만 하는 페이지는 Server Component로 전환:
- `exchange/page.tsx` → 서버에서 fetch, 필터만 클라이언트
- `professional/page.tsx` → 서버에서 fetch
- `guide/*` → 정적 콘텐츠이므로 Server Component

### 3-2. 이미지 최적화
- `next.config.mjs`에서 `unoptimized: true` 제거 (이미 계획)
- `remotePatterns` 설정 (placehold.co, supabase storage)
- 히어로 이미지 → next/image + priority 속성

### 3-3. 코드 분할
- 무거운 컴포넌트 dynamic import:
  - Recharts → `dynamic(() => import('recharts'), { ssr: false })`
  - 카카오 맵 → lazy load
- 라우트별 번들 최적화

### 3-4. 캐싱 전략
- API 응답 캐싱: `Cache-Control: public, max-age=60` (매물 목록)
- ISR: 매물 상세 페이지 `revalidate: 300` (5분)
- SWR/React Query 도입 → 클라이언트 캐싱 + 재검증

---

## Phase 4: 보안 강화 (2~3주)

### 4-1. 인증/인가 완성
- Supabase Auth 완전 연동 (현재 일부 mock)
- 역할 기반 API 접근 제어 (middleware + API 레벨 이중 검증)
- 세션 타임아웃 실제 적용 (session-manager.ts 연동)

### 4-2. CSP 강화
- `unsafe-inline`, `unsafe-eval` 제거
- nonce 기반 인라인 스크립트
- 외부 도메인 최소화

### 4-3. 데이터 보안
- 민감 필드 암호화 실제 적용 (encryption.ts)
- 마스킹 규칙 DB 연동 (현재 클라이언트 전용)
- 감사 로그 실제 기록 (audit-logger.ts)

### 4-4. MFA/2FA
- TOTP 기반 2단계 인증
- 관리자/기관관리자 역할에 필수 적용

---

## Phase 5: SaaS 운영 완성 (3~4주)

### 5-1. 멀티테넌시 실제 운영
- 테넌트 생성 → 독립 공간 자동 설정
- 기능 토글 실시간 반영
- 테넌트별 브랜딩 (CSS 변수 동적 적용)

### 5-2. 결제 연동
- PG사 연동 (토스페이먼츠/이니시스)
- 구독 결제 자동 갱신
- 크레딧 구매 즉시 반영
- 청구서 자동 생성 + PDF 다운로드

### 5-3. 추천/파트너 실제 운영
- 추천코드 생성/검증 실제 DB 연동
- 수익 쉐어 자동 계산 + 정산
- 파트너 등급 자동 업데이트

### 5-4. AI 기능 완성
- Claude API 실제 연동 (현재 fallback만)
- OCR: Google DocumentAI 실제 연동
- AI 검수: 매물 자동 분석 + 리스크 등급
- AI 추천: 매수자 프로필 기반 매물 추천

---

## Phase 6: 고도화 (4~6주)

### 6-1. 실시간 기능 완성
- Supabase Realtime 실제 연결 (현재 훅만 존재)
- 딜룸 실시간 채팅
- 실시간 알림 (거래 상태 변경, 오퍼, 메시지)
- 프레즌스 (온라인 상태 표시)

### 6-2. 문서 생성/출력
- 계약서 PDF 자동 생성 (jsPDF 실제 구현)
- 실사 리포트 PDF
- 엑셀 다운로드 기능 (excel-export.ts 활용)
- 워터마크 자동 적용

### 6-3. 고급 분석
- AI 시장 요약 리포트
- 포트폴리오 성과 추적
- 거시경제 지표 연동
- 예측 모델 (NPL 물량 예측)

### 6-4. 모바일 최적화
- PWA 완성 (서비스 워커 개선)
- 모바일 전용 UX 개선
- 푸시 알림 (Web Push API)

---

## 우선순위 요약

| Phase | 기간 | 핵심 목표 |
|-------|------|----------|
| 1 | 즉시 | API 표준화, 누락 페이지, 타입 안전성 |
| 2 | 1~2주 | Mock→DB 전환, Supabase 마이그레이션 실행 |
| 3 | 2~3주 | Server Component, 이미지 최적화, 캐싱 |
| 4 | 2~3주 | 인증/인가, CSP, 암호화, MFA |
| 5 | 3~4주 | 결제 연동, 추천 시스템, AI 연동 |
| 6 | 4~6주 | 실시간, 문서생성, 고급분석, 모바일 |
