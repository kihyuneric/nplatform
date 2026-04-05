# NPLatform 프로젝트 가이드

## 프로젝트 개요
NPLatform — AI 기반 NPL(부실채권) 투자 분석 및 거래 플랫폼
(주)트랜스파머 | TransFarmer Inc.

## 기술 스택
- Next.js 15.3 (App Router) + React 19 + TypeScript 5
- shadcn/ui + Tailwind CSS + Framer Motion
- Recharts (차트) + Kakao Maps SDK (지도)
- Supabase (PostgreSQL + RLS + Realtime + Auth)
- jsPDF + xlsx + html2canvas (내보내기)
- Claude API (AI 분석/매칭/챗봇)

## Supabase
- Project ID: eqvpubntalikjxcjhpln
- Region: ap-northeast-2
- Dev user: 00000000-0000-0000-0000-000000000001 (김매도, SELLER)

## 현재 상태 (2026-04-03 기준)
- 283 pages, 242 API routes, 16 DB migrations, 216 components
- 빌드: ✅ Compiled successfully
- 글로벌 기술 수준: 53.6/100 (목표: 75/100 by Q4 2026)
- 상세 스펙: docs/NPLatform_종합기술계획서_2026.md

## 디자인 시스템
- Primary: #1B3A5C (네이비)
- Accent: #10B981 (에메랄드)
- Secondary: #2E75B6 (블루)
- 히어로 그라데이션: linear-gradient(135deg, #1B3A5C, #2E75B6)

## 컨벤션
- "use client" 모든 인터랙티브 페이지
- API: /api/v1/... 패턴, createClient from @/lib/supabase/server
- 에러 응답: { error: { code, message } }
- 금액: formatKRW (억/만원), 날짜: ko-KR
- Mock 데이터 fallback 패턴 (API 실패 시 mock 사용)

---

## 글로벌 기술 수준 평가 (2026-04-03)

| 영역 | 현재 | 글로벌 최고 | 비고 |
|------|------|-----------|------|
| AI/ML 통합 | 65/100 | 95 | Claude API 연동, RAG 구현 |
| 데이터 파이프라인 | 60/100 | 90 | pgvector RAG, 실시간 데이터 부족 |
| 보안/컴플라이언스 | 70/100 | 95 | RLS, JWT, MFA 구현 |
| UX/성능 | 68/100 | 92 | PWA, 반응형, SSR |
| 금융 도메인 | 55/100 | 88 | NPL 분석, 경매 시뮬레이터 |
| API 설계 | 72/100 | 90 | RESTful, 표준화 |
| 실시간 기능 | 45/100 | 90 | Supabase Realtime, WebSocket 미완 |
| 테스트/품질 | 34/100 | 88 | 테스트 커버리지 부족 |
| 도메인 데이터 | 30/100 | 85 | 실제 NPL 데이터 없음 |
| ML 모델 | 35/100 | 90 | 규칙 기반, 실제 ML 미구현 |
| **종합** | **53.6/100** | **92.5** | |

---

## 개선 로드맵

### Phase 1 (2026 Q2 — 지금)
- [x] pgvector + RAG 법률 검색 (#1 완료)
- [ ] AI 응답 스트리밍 SSE (#2)
- [ ] 결제 통합 테스트 Suite (#3)

### Phase 2 (2026 Q2 후반)
- [ ] LightGBM 가격 예측 Python FastAPI (#4)
- [ ] 실시간 입찰 WebSocket (#5)
- [ ] Jest 테스트 커버리지 80% 목표

### Phase 3 (2026 Q3)
- [ ] 유니콘 심플화: 238 → 55페이지 (플랜 파일 참조)
- [ ] 실제 금융 데이터 연동 (한국자산관리공사 API)
- [ ] 모바일 앱 TWA/PWA 배포

### Phase 4 (2026 Q3 후반)
- [ ] 파이썬 ML 파이프라인 (LightGBM + FAISS)
- [ ] 멀티테넌시 + B2B API

### Phase 5 (2026 Q4)
- [ ] 글로벌 확장 (영어/일어 지원)
- [ ] 규제 인증 (금융위원회 핀테크 혁신)
- [ ] 목표 점수: 75/100

---

## 최근 주요 변경 이력

### Sprint 1-5 완료 항목
- Supabase Auth + RLS 16개 마이그레이션
- NPL 분석 엔진 (규칙 기반 + Claude AI)
- 경매 시뮬레이터, OCR 문서인식
- 딜룸 (채팅+문서+계약+실사 통합)
- PWA + Service Worker + 오프라인 지원
- 관리자 패널 (회원/매물/결제/시스템 통합)
- pgvector RAG 법률 검색 (016 마이그레이션)
- 경쟁사 브랜드 제거 (땅집고옥션 → NPLatform)

---

## URL 구조 (현재)

```
/                     메인 랜딩
/(main)/
  page.tsx            대시보드
  listings/           매물 목록/지도
  market/             시세/입찰
  npl-analysis/       NPL 분석
  deal-rooms/         딜룸
  statistics/         통계
  tools/              도구 (경매시뮬, OCR, 계약서)
  admin/              관리자
  analysis/           분석 + AI Copilot
/api/v1/
  copilot/            AI 챗봇
  rag/ingest|search   RAG 법률 검색
  listings/           매물 CRUD
  payments/           결제
  users/              회원
  statistics/         통계
```

## 환경변수 (필수)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
VOYAGE_API_KEY          # RAG 임베딩 (voyage-multilingual-2)
ADMIN_SECRET            # RAG ingest 보호
NEXT_PUBLIC_BASE_URL    # 서버사이드 RAG 호출용
```
