# NPLatform 종합 기술 계획서 2026
> (주)트랜스파머 TransFarmer Inc. | 작성일: 2026-04-03 | AI 기반 NPL 투자 분석·거래 플랫폼

---

## 목차
1. [프로젝트 현황 총괄](#1-프로젝트-현황-총괄)
2. [기술 스택 전체 명세](#2-기술-스택-전체-명세)
3. [구현 기능 전체 목록](#3-구현-기능-전체-목록)
4. [글로벌 최고 기술 대비 평가](#4-글로벌-최고-기술-대비-평가)
5. [종합 기술 점수](#5-종합-기술-점수)
6. [개선 개발 계획 (로드맵)](#6-개선-개발-계획-로드맵)
7. [우선순위 개발 항목](#7-우선순위-개발-항목)
8. [인프라 및 배포 명세](#8-인프라-및-배포-명세)
9. [보안 및 컴플라이언스](#9-보안-및-컴플라이언스)
10. [데이터베이스 스키마 명세](#10-데이터베이스-스키마-명세)

---

## 1. 프로젝트 현황 총괄

### 1.1 핵심 지표 (2026-04-03 기준)

| 지표 | 수량 |
|------|------|
| 전체 페이지 | 283개 |
| API 라우트 (v0 + v1) | 242개 |
| DB 마이그레이션 | 16개 |
| lib 모듈 | 120+ 개 |
| 컴포넌트 | 216개 |
| 테스트 파일 | Vitest + Playwright |
| Supabase Project ID | eqvpubntalikjxcjhpln |
| Region | ap-northeast-2 (서울) |

### 1.2 도메인
NPL(Non-Performing Loan, 부실채권) 투자 플랫폼
- 법원 경매 물건 검색/분석
- AI 기반 투자 의사결정 지원
- 채권 거래 마켓플레이스
- 전문가 네트워크 (변호사·세무사·공인중개사)
- B2B SaaS (은행·AMC·기관 투자자 대상)

### 1.3 비즈니스 모델
- **구독 (SaaS)**: Tier 1/2/3 플랜
- **크레딧**: AI 분석, OCR, 리포트 생성 비용
- **거래 수수료**: 채권 매매 중개
- **전문가 수수료**: 상담 서비스 중개
- **B2B 화이트라벨**: 금융기관 전용 인스턴스

### 1.4 디자인 시스템
- Primary: `#1B3A5C` (네이비)
- Accent: `#10B981` (에메랄드)
- Secondary: `#2E75B6` (블루)
- 히어로 그라데이션: `linear-gradient(135deg, #1B3A5C, #2E75B6)`

---

## 2. 기술 스택 전체 명세

### 2.1 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 15.3.6 | 풀스택 프레임워크 (App Router) |
| React | 19 | UI 라이브러리 |
| TypeScript | 5 | 정적 타입 |
| Tailwind CSS | 3.4.17 | 스타일링 유틸리티 |
| shadcn/ui + Radix UI | 최신 | 접근성 UI 컴포넌트 (20+ 종) |
| Lucide React | 0.454.0 | 아이콘 |
| Recharts | 2.15.0 | 차트/데이터 시각화 |
| Framer Motion | 12.23.12 | 애니메이션 |
| Embla Carousel | 8.5.1 | 캐러셀 |
| React Hook Form | 7.54.1 | 폼 상태 관리 |
| Zod | 3.24.1 | 스키마 검증 |
| Sonner | 1.7.1 | 토스트 알림 |
| Geist | 1.3.1 | 디자인 시스템 폰트 |
| Next-themes | 0.4.4 | 다크모드 |

### 2.2 백엔드 / AI

| 기술 | 버전 | 용도 |
|------|------|------|
| @anthropic-ai/sdk | 0.78.0 | Claude Sonnet/Haiku AI |
| @ai-sdk/openai | 3.0.41 | GPT-4o 통합 |
| @google-cloud/vertexai | 1.10.0 | Google Vertex AI |
| @google/generative-ai | 0.24.1 | Gemini |
| @google-cloud/documentai | 9.3.0 | OCR 문서 분석 |
| Voyage AI API | - | 한국어 임베딩 (RAG) |

### 2.3 데이터베이스 / 인프라

| 기술 | 버전 | 용도 |
|------|------|------|
| Supabase | 2.99.1 | PostgreSQL + Auth + Realtime |
| pgvector | - | 벡터 임베딩 (법률 RAG) |
| @tanstack/react-query | 5.96.0 | 서버 상태 관리 |
| @aws-sdk/client-s3 | 3.864.0 | 파일 저장 |
| Redis | - | AI 응답 캐싱, 세션 |
| pg | 8.16.3 | PostgreSQL 직접 연결 |

### 2.4 문서 생성

| 기술 | 버전 | 용도 |
|------|------|------|
| jspdf + jspdf-autotable | 4.2.0 / 5.0.7 | PDF 생성 |
| docx | 9.6.1 | Word 문서 |
| xlsx | 0.18.5 | Excel 읽기/쓰기 |
| pdf-parse | 2.4.5 | PDF 파싱 |
| File-saver | 2.0.5 | 브라우저 다운로드 |

### 2.5 결제

| 기술 | 용도 |
|------|------|
| PortOne V2 | 카드/계좌이체 결제 게이트웨이 |
| Supabase Functions | 결제 웹훅 처리 |

### 2.6 보안

| 기술 | 용도 |
|------|------|
| Sentry | 에러 추적/모니터링 |
| bcrypt | 비밀번호 해싱 |
| jsonwebtoken | JWT 토큰 |
| CSP (Nonce 기반) | XSS 방어 |
| HSTS | HTTPS 강제 |
| Zero Trust | 제로 트러스트 아키텍처 |
| E2E Encryption | 엔드투엔드 암호화 |
| CSRF 토큰 | CSRF 방어 |
| Rate Limiting | API 요청 제한 |
| Data Masking | 민감 정보 마스킹 |

### 2.7 테스트 / 모니터링

| 기술 | 용도 |
|------|------|
| Vitest 4.1.0 | 단위/통합 테스트 |
| Playwright | E2E 테스트 |
| Testing Library | 컴포넌트 테스트 |
| Vercel Analytics | 사용자 분석 |
| Winston + DailyRotate | 로깅 |

### 2.8 모바일 / PWA

| 기술 | 용도 |
|------|------|
| Capacitor | iOS/Android 하이브리드 앱 |
| PWA Manifest | 웹앱 설치 |
| Service Worker | 오프라인 지원 |
| TWA | Android Chrome 앱 |

### 2.9 개발 도구

| 기술 | 용도 |
|------|------|
| ESLint | 코드 품질 |
| Vercel Crons | 백그라운드 작업 |
| GitHub Actions | CI/CD |

---

## 3. 구현 기능 전체 목록

### 3.1 인증 · 회원 관리 (8개 페이지)
- [x] 이메일/비밀번호 로그인
- [x] 회원가입 (역할 선택 포함)
- [x] MFA 설정/확인 (TOTP)
- [x] 승인 회원제 (관리자 수동 승인)
- [x] 역할 기반 접근 제어 (RBAC): SELLER / BUYER / ADMIN / PROFESSIONAL / PARTNER / INSTITUTION
- [x] 세션 관리 (Supabase Auth + 쿠키)
- [x] 비밀번호 변경
- [x] 개발용 로그인 (dev-login)

### 3.2 NPL 분석 엔진 (7개 페이지 + AI)
- [x] 분석 목록 및 히스토리
- [x] 새 분석 생성 (물건 정보 입력)
- [x] 분석 상세 (리포트 조회)
- [x] OCR 분석 (AI 서류 자동 인식)
- [x] 경매 시뮬레이터 (입찰가 시뮬레이션)
- [x] Due Diligence 리포트 자동 생성
- [x] AI 코파일럿 (대화형 NPL 어시스턴트)
- [x] **[NEW] pgvector RAG 법률 검색** (민사집행법·임대차보호법·NPL규정)
- [x] 분석 결과 PDF/Word/Excel 내보내기
- [x] 분석 모델: 가격 예측, 위험도 평가, ROI 시뮬레이션, 권리분석

### 3.3 거래 시스템 (6개 페이지)
- [x] 거래방 (Deal Room) 생성/관리
- [x] 실시간 메시지 (Supabase Realtime)
- [x] NDA 전자 서명
- [x] 계약서 자동 생성 (Word/PDF)
- [x] 수요-공급 매칭 엔진
- [x] 거래 상태 추적 (진행 중/완료/취소)
- [x] 거래 보관함 (아카이브)

### 3.4 마켓플레이스 (Exchange)
- [x] 법원 경매 물건 목록 (리스트/맵 뷰)
- [x] 지도 기반 검색 (Kakao Maps)
- [x] 고급 필터 (지역/유형/가격/상태)
- [x] 물건 상세 페이지
- [x] 관심 목록 (즐겨찾기)
- [x] 키워드 알림 설정
- [x] 시장 데이터 (낙찰가율, NBI 지수)

### 3.5 결제 · 크레딧 시스템
- [x] 구독 플랜 (Tier 1/2/3)
- [x] PortOne V2 카드결제
- [x] 크레딧 충전/차감
- [x] 쿠폰 시스템
- [x] 청구서 (payment_history 기반)
- [x] 레퍼럴 보너스
- [x] 크레딧 사용 내역

### 3.6 전문가 네트워크
- [x] 전문가 프로필 (변호사·세무사·공인중개사)
- [x] 상담 예약/관리
- [x] 리뷰 및 평점
- [x] 전문가 수익 정산
- [x] 서비스 등록 및 가격 설정

### 3.7 커뮤니티
- [x] 게시판 (글/댓글/좋아요)
- [x] 전문가 커뮤니티 별도 운영
- [x] 공지사항
- [x] 검색

### 3.8 교육 콘텐츠 (온톨로지 기반)
- [x] 개념 온톨로지 (부동산 투자 지식 그래프)
- [x] AI 합성 강의안 생성
- [x] 학습 경로 (로드맵)
- [x] 뉴스레터 자동 생성 (AI)
- [x] PDF/Word 전자책 내보내기
- [x] 퀴즈/자기 진단

### 3.9 관리자 대시보드 (50+ 페이지)
- [x] 사용자 관리 (CRUD, 승인, 역할 변경)
- [x] 분석 (코호트, 퍼널)
- [x] 결제 통계 (매출, 구독, 크레딧)
- [x] 콘텐츠 관리 (배너, 공지, 가이드, 뉴스)
- [x] 감사 로그
- [x] 자동화 스케줄러 관리
- [x] 시스템 모니터링 (DB, 에러, 성능)
- [x] API 키 관리
- [x] 테넌트 관리
- [x] 파트너 정산
- [x] KYC/컴플라이언스

### 3.10 개인화 / 알림
- [x] 실시간 푸시 알림
- [x] 이메일 알림 (Nodemailer)
- [x] 키워드 기반 물건 알림
- [x] 개인화 엔진 (행동 기반 추천)
- [x] 코호트 분석

### 3.11 기타 기능
- [x] 다크모드
- [x] 반응형 모바일 UI
- [x] PWA (오프라인 지원)
- [x] 멀티테넌시 (B2B SaaS)
- [x] 화이트라벨
- [x] API 개발자 포털 (키 관리, 문서)
- [x] 웹훅 지원
- [x] Sentry 에러 모니터링
- [x] 데이터 파이프라인 (법원경매 + 실거래가)
- [x] 자연어 검색 (AI 기반)
- [x] 계약 검토 AI
- [x] 워터마크 (문서 보안)

---

## 4. 글로벌 최고 기술 대비 평가

> 비교 기준: Stripe, Notion, Linear, OpenAI Platform, Airbnb, Bloomberg Terminal, 토스, 카카오 수준

### 4.1 프론트엔드 / UX

| 항목 | NPlatform 수준 | 글로벌 최고 | 점수 |
|------|--------------|-----------|------|
| 컴포넌트 아키텍처 | Radix UI + shadcn, 216개 | Figma/Linear급 | 82/100 |
| 반응형/모바일 최적화 | 기본 반응형 구현 | 네이티브 수준 | 70/100 |
| 애니메이션/마이크로인터랙션 | Framer Motion 기본 | Stripe/Notion급 | 65/100 |
| 접근성 (a11y) | Radix 기반 (기본 수준) | WCAG AA 완전 준수 | 60/100 |
| 성능 (Core Web Vitals) | 미측정/최적화 미완 | LCP<1s, CLS<0.1 | 58/100 |
| 다국어 지원 | 한국어 전용 | i18n 완전 지원 | 40/100 |
| **소계** | | | **62/100** |

### 4.2 AI / ML 통합

| 항목 | NPlatform 수준 | 글로벌 최고 | 점수 |
|------|--------------|-----------|------|
| LLM 통합 | Claude+GPT-4o+Gemini 멀티모델 | Cursor/Perplexity급 | 80/100 |
| RAG 시스템 | **[NEW]** pgvector + Voyage AI | Pinecone 기반 프로덕션 | 62/100 |
| 도메인 특화 ML | 휴리스틱 기반 (실제 ML 미완) | LightGBM/XGBoost 실서비스 | 35/100 |
| AI 응답 품질 | 프롬프트 엔지니어링 | Fine-tuning 적용 | 60/100 |
| AI 캐싱 | Redis 캐싱 기본 | 멀티레이어 캐싱 | 65/100 |
| 실시간 AI 스트리밍 | 비구현 | SSE/WebSocket 스트리밍 | 20/100 |
| 자동화 에이전트 | 기본 코파일럿 | LangChain Agent급 | 45/100 |
| **소계** | | | **52/100** |

### 4.3 실시간 시스템

| 항목 | NPlatform 수준 | 글로벌 최고 | 점수 |
|------|--------------|-----------|------|
| 실시간 데이터 | Supabase Realtime (Postgres) | Ably/Pusher 전용 채널 | 65/100 |
| 실시간 입찰 | 기본 구조만 존재 | 밀리초 레이턴시 보장 | 30/100 |
| 실시간 채팅 | Realtime 기반 기본 | Slack/Discord급 | 55/100 |
| WebSocket 관리 | Supabase 의존 | 커스텀 WS 서버 | 50/100 |
| 오프라인 지원 | Service Worker 기본 | IndexedDB + 완전 동기화 | 45/100 |
| **소계** | | | **49/100** |

### 4.4 백엔드 / API

| 항목 | NPlatform 수준 | 글로벌 최고 | 점수 |
|------|--------------|-----------|------|
| API 설계 (RESTful) | v0/v1 혼재, 242개 라우트 | Stripe급 일관성 | 68/100 |
| API 문서화 | 개발자 포털 기본 | OpenAPI 3.0 완전 자동화 | 55/100 |
| 에러 처리 | 표준화된 에러 코드 | 완전한 에러 카탈로그 | 72/100 |
| Rate Limiting | 기본 구현 (tier별) | 토큰 버킷, 적응형 | 60/100 |
| 캐싱 전략 | Redis + HTTP 캐시 기본 | Edge 캐싱 + CDN | 65/100 |
| 데이터 검증 | Zod 기반 완전 검증 | 완전한 타입 안전성 | 82/100 |
| **소계** | | | **67/100** |

### 4.5 데이터베이스 / 데이터

| 항목 | NPlatform 수준 | 글로벌 최고 | 점수 |
|------|--------------|-----------|------|
| 스키마 설계 | 16개 마이그레이션, RLS 적용 | 완전 정규화 + 파티셔닝 | 72/100 |
| 쿼리 최적화 | 인덱스 기본 적용 | EXPLAIN ANALYZE 기반 튜닝 | 58/100 |
| 벡터 검색 | **[NEW]** pgvector IVFFlat | Pinecone 전용 서비스 | 55/100 |
| 도메인 실데이터 | 파이프라인 구축만 (데이터 미약) | 법원 10년치 실데이터 | 30/100 |
| 데이터 파이프라인 | 기본 Cron 수집 | Apache Airflow급 | 45/100 |
| OLAP/분석 | 기본 집계 쿼리 | ClickHouse/BigQuery | 35/100 |
| **소계** | | | **49/100** |

### 4.6 보안

| 항목 | NPlatform 수준 | 글로벌 최고 | 점수 |
|------|--------------|-----------|------|
| 인증/인가 | RLS + RBAC + MFA | FedRAMP 수준 | 78/100 |
| 데이터 암호화 | E2E 암호화 + 마스킹 | AES-256 완전 암호화 | 75/100 |
| 제로 트러스트 | 아키텍처 설계 완료 | 완전 구현 | 65/100 |
| CSP/헤더 | Nonce 기반 완전 구현 | | 85/100 |
| 감사 로그 | 기본 감사 로그 | 불변 감사 로그 | 70/100 |
| 취약점 스캔 | 미구현 | SAST/DAST 자동화 | 20/100 |
| **소계** | | | **65/100** |

### 4.7 테스팅 / 품질

| 항목 | NPlatform 수준 | 글로벌 최고 | 점수 |
|------|--------------|-----------|------|
| 단위 테스트 | Vitest 설정, 기본 테스트 | 커버리지 90%+ | 30/100 |
| 통합 테스트 | 기본 API 테스트 | 전체 API 커버 | 25/100 |
| E2E 테스트 | Playwright 설정만 | 핵심 플로우 100% | 15/100 |
| 성능 테스트 | k6 설정 존재 | 로드 테스트 자동화 | 35/100 |
| 결제 테스트 | 샌드박스 기본 | 결제 플로우 전체 E2E | 40/100 |
| CI/CD | 기본 구성 | GitHub Actions + 자동 배포 | 60/100 |
| **소계** | | | **34/100** |

### 4.8 인프라 / 성능

| 항목 | NPlatform 수준 | 글로벌 최고 | 점수 |
|------|--------------|-----------|------|
| Edge Runtime | 미들웨어 기본 | Edge Functions 완전 활용 | 45/100 |
| CDN 최적화 | Vercel 기본 CDN | 멀티 CDN + 엣지 캐싱 | 60/100 |
| 번들 최적화 | Tree-shaking 기본 | 코드 스플리팅 완전 최적화 | 65/100 |
| DB 연결 풀링 | Supabase 기본 | PgBouncer 완전 설정 | 55/100 |
| 모니터링 | Sentry + Analytics | OpenTelemetry 풀 APM | 60/100 |
| 비용 최적화 | 미최적화 | FinOps 완전 적용 | 40/100 |
| **소계** | | | **54/100** |

### 4.9 비즈니스 로직 / 도메인

| 항목 | NPlatform 수준 | 글로벌 최고 | 점수 |
|------|--------------|-----------|------|
| NPL 가격 산정 | 기본 휴리스틱 계산 | 실데이터 기반 모델 | 50/100 |
| 권리 분석 자동화 | **[NEW]** RAG 법률 검색 | 등기부 API 연동 | 55/100 |
| 시장 데이터 | NBI 지수 자체 계산 | 법원경매정보원 API | 45/100 |
| 배당 계산 | 수동 입력 기반 | 자동 배당표 생성 | 40/100 |
| 리스크 모델 | 기본 점수 계산 | 머신러닝 기반 | 40/100 |
| 금융 규정 준수 | 기본 고지 | 자본시장법 완전 준수 | 50/100 |
| **소계** | | | **47/100** |

### 4.10 개발자 경험 (DX)

| 항목 | NPlatform 수준 | 글로벌 최고 | 점수 |
|------|--------------|-----------|------|
| 타입 안전성 | TypeScript Strict | 완전한 타입 커버 | 80/100 |
| 코드 구조 | 모듈화 잘 됨, 일부 혼재 | 완전한 DDD | 72/100 |
| 환경변수 관리 | env-check.ts 기본 | Vault 기반 시크릿 | 55/100 |
| 로컬 개발 환경 | 기본 setup | Docker Compose | 50/100 |
| API SDK 지원 | 미제공 | Stripe SDK 수준 | 30/100 |
| **소계** | | | **57/100** |

---

## 5. 종합 기술 점수

```
┌─────────────────────────────────────────────────────┐
│           NPLatform 글로벌 기술 점수 평가             │
├─────────────────────┬──────┬──────────────────────┤
│ 영역                 │ 점수 │ 글로벌 최고 수준        │
├─────────────────────┼──────┼──────────────────────┤
│ 프론트엔드/UX        │ 62   │ 95 (Notion, Linear)  │
│ AI/ML 통합          │ 52   │ 95 (OpenAI Platform) │
│ 실시간 시스템        │ 49   │ 90 (Slack, Figma)    │
│ 백엔드/API          │ 67   │ 95 (Stripe)          │
│ 데이터베이스/데이터  │ 49   │ 95 (Bloomberg)       │
│ 보안                │ 65   │ 90 (토스)            │
│ 테스팅/품질          │ 34   │ 90 (Google)          │
│ 인프라/성능         │ 54   │ 90 (Vercel 자체)     │
│ 비즈니스 로직       │ 47   │ 90 (도메인 특화)     │
│ 개발자 경험(DX)     │ 57   │ 95 (Stripe)          │
├─────────────────────┼──────┼──────────────────────┤
│ 종합 점수 (평균)     │ 53.6 │ 92.5                 │
├─────────────────────┼──────┼──────────────────────┤
│ 한국 시장 기준       │ 70/100 (상위 10%)       │
│ 글로벌 기준         │ 54/100 (중상급)          │
└─────────────────────┴──────┴──────────────────────┘
```

### 5.1 강점 (70+ 점)
- ✅ **타입 안전성**: TypeScript Strict + Zod 완전 검증
- ✅ **보안 헤더**: CSP Nonce + HSTS + 제로 트러스트 아키텍처
- ✅ **컴포넌트 아키텍처**: Radix UI 기반 216개 접근성 컴포넌트
- ✅ **에러 처리**: 표준화된 에러 코드 + Sentry 통합
- ✅ **데이터 검증**: Zod 기반 API 완전 검증
- ✅ **LLM 멀티모델**: Claude + GPT-4o + Gemini 통합

### 5.2 약점 (40점 미만)
- ❌ **테스팅**: 커버리지 30% 미만 추정, E2E 거의 없음
- ❌ **도메인 실데이터**: 법원경매 10년치 데이터 부재
- ❌ **실ML 모델**: 모든 예측이 휴리스틱 (실제 학습 없음)
- ❌ **AI 스트리밍**: 실시간 AI 응답 스트리밍 미구현
- ❌ **다국어**: 한국어 전용

---

## 6. 개선 개발 계획 (로드맵)

### Phase 1 — 기반 강화 (2026 Q2: 4~5월)
> 목표: 현재 53.6점 → 65점

| 우선순위 | 작업 | 예상 효과 | 난이도 |
|---------|------|----------|-------|
| P1 | 결제 통합 테스트 suite (Vitest + 샌드박스) | 테스팅 +20pt | 중 |
| P1 | AI 응답 스트리밍 (SSE) 구현 | AI +15pt | 중 |
| P1 | Edge Runtime 미들웨어 최적화 | 인프라 +15pt | 중 |
| P2 | DB 쿼리 최적화 (EXPLAIN + 인덱스 튜닝) | DB +10pt | 중 |
| P2 | Core Web Vitals 최적화 (LCP/CLS/FID) | FE +10pt | 중 |
| P3 | 취약점 스캔 자동화 (SAST) | 보안 +20pt | 중 |

### Phase 2 — AI 실질화 (2026 Q2~Q3: 5~7월)
> 목표: AI/ML 52점 → 72점

| 우선순위 | 작업 | 예상 효과 | 난이도 |
|---------|------|----------|-------|
| P1 | LightGBM 가격 예측 서비스 (Python ML API) | ML +25pt | 고 |
| P1 | 법원경매 실데이터 수집 파이프라인 완성 | 도메인 +20pt | 고 |
| P1 | RAG 법률 임베딩 시드 확장 (1000+ 문서) | AI +15pt | 중 |
| P2 | AI 대화 스트리밍 (코파일럿 SSE) | AI +10pt | 중 |
| P2 | 실시간 입찰 WebSocket 서버 | 실시간 +20pt | 고 |
| P3 | 자동 등기부 분석 파서 | 도메인 +15pt | 고 |

### Phase 3 — 실시간 강화 (2026 Q3: 7~8월)
> 목표: 실시간 49점 → 70점

| 우선순위 | 작업 | 예상 효과 |
|---------|------|----------|
| P1 | WebSocket 실시간 입찰 방 (경매 라이브) | +25pt |
| P1 | 거래방 실시간 협상 개선 | +15pt |
| P2 | 오프라인 모드 완성 (IndexedDB 동기화) | +10pt |
| P3 | 실시간 시세 피드 | +10pt |

### Phase 4 — 성능 최적화 (2026 Q3~Q4: 8~9월)
> 목표: 인프라 54점 → 75점

| 우선순위 | 작업 | 예상 효과 |
|---------|------|----------|
| P1 | Next.js Partial Prerendering + Edge Runtime 완전 이전 | +20pt |
| P1 | 이미지 최적화 + 번들 코드 스플리팅 | +15pt |
| P2 | PgBouncer 커넥션 풀링 설정 | +10pt |
| P2 | Redis 캐싱 레이어 완성 | +10pt |
| P3 | OpenTelemetry 분산 추적 도입 | +10pt |

### Phase 5 — 모바일/글로벌화 (2026 Q4: 10~12월)
> 목표: 종합 65점 → 75점

| 우선순위 | 작업 | 예상 효과 |
|---------|------|----------|
| P1 | Capacitor iOS/Android 앱 빌드 및 스토어 출시 | +모바일 |
| P1 | 영어 i18n 지원 (해외 투자자 타겟) | +다국어 |
| P2 | Stripe 글로벌 결제 추가 | +결제 |
| P3 | 테스트 커버리지 70% 달성 | +품질 |

---

## 7. 우선순위 개발 항목

### 7.1 즉시 착수 (2~4주 내)

#### #1 ✅ pgvector + RAG 법률 검색 — **완료**
- `supabase/migrations/016_pgvector_legal_rag.sql`
- `app/api/v1/rag/ingest/route.ts` + `search/route.ts`
- `lib/copilot/npl-copilot.ts` RAG 통합
- 시드 데이터: 9개 한국 NPL/경매 법률 문서

#### #2 AI 응답 스트리밍 (SSE)
- 코파일럿 응답을 실시간으로 스트리밍 (타이핑 효과)
- Anthropic SDK `.stream()` API 활용
- `app/api/v1/copilot/stream/route.ts` 신규 생성
- FE: `useChat` 훅 + EventSource 스트림 처리

#### #3 결제 통합 테스트 Suite
- PortOne V2 샌드박스 E2E 테스트
- 크레딧 충전 → 차감 → 잔액 검증 플로우
- Vitest + MSW (Mock Service Worker)

#### #4 LightGBM 가격 예측 서비스
- Python FastAPI 마이크로서비스 (`/ml-service/`)
- 법원경매 실데이터로 학습
- `/api/v1/ml/predict` → FastAPI 프록시
- 피처: 지역, 감정가, LTV, 연체개월, 임차인 수

#### #5 실시간 입찰 WebSocket
- Supabase Realtime Broadcast 채널 활용
- 입찰 방 (`/exchange/[id]/auction`) 신규 페이지
- 실시간 입찰 현황, 참여자 수, 남은 시간

### 7.2 중기 착수 (1~3개월)
- 법원경매정보 Open API 연동 (실데이터 수집)
- 등기부등본 자동 파싱 (OpenAI Vision API)
- 자동화 테스트 파이프라인 (GitHub Actions)
- Core Web Vitals 최적화
- OpenTelemetry 분산 추적

---

## 8. 인프라 및 배포 명세

### 8.1 현재 아키텍처

```
[사용자 브라우저]
    │
    ▼
[Vercel Edge Network] ← CDN + Middleware (Rate Limit, Auth, Feature Gate)
    │
    ├── [Next.js App] ← SSR/SSG/ISR
    │       │
    │       ├── [Supabase] ← PostgreSQL + pgvector + Realtime + Auth
    │       ├── [Redis] ← 캐싱, 세션
    │       ├── [AWS S3] ← 파일 저장
    │       ├── [Anthropic API] ← Claude AI
    │       ├── [Voyage AI] ← 임베딩
    │       ├── [PortOne] ← 결제
    │       └── [Sentry] ← 모니터링
    │
    └── [Vercel Crons] ← 5개 백그라운드 작업
```

### 8.2 Cron Jobs

| 스케줄 | 작업 |
|--------|------|
| `0 0 * * *` | 일일 데이터 파이프라인 |
| `0 9 * * 1` | 주간 뉴스레터 발송 |
| `0 17 * * *` | 시장 데이터 업데이트 |
| `0 18 * * 0` | 주간 분석 집계 |
| `0 19 1 * *` | 월간 리포트 생성 |

### 8.3 목표 아키텍처 (Phase 4 완료 후)

```
[사용자]
    │
    ▼
[Cloudflare] ← DDoS 방어, WAF, 글로벌 CDN
    │
    ▼
[Vercel Edge] ← Partial Prerendering, Edge Functions
    │
    ├── [Next.js App]
    │       ├── [Supabase] (pgvector + Realtime)
    │       ├── [Redis Cluster] (레디스 클러스터링)
    │       ├── [ML Service] (Python FastAPI, LightGBM)
    │       ├── [Anthropic] (Claude + SSE 스트리밍)
    │       └── [OpenTelemetry Collector]
    │
    ├── [WebSocket Server] ← 실시간 입찰
    └── [Airflow] ← 데이터 파이프라인 오케스트레이션
```

---

## 9. 보안 및 컴플라이언스

### 9.1 현재 보안 구현

| 레이어 | 구현 | 수준 |
|--------|------|------|
| 네트워크 | CSP Nonce + HSTS + X-Frame-Options | 강 |
| 인증 | Supabase Auth + MFA (TOTP) | 강 |
| 인가 | RLS + RBAC (6개 역할) | 강 |
| 데이터 | E2E 암호화 + 마스킹 | 중 |
| API | Rate Limiting + CSRF 토큰 | 중 |
| 감사 | 감사 로그 기본 | 중 |
| 취약점 | 수동 검토만 | 약 |

### 9.2 컴플라이언스 목표

| 규정 | 현재 | 목표 |
|------|------|------|
| 개인정보보호법 | 부분 준수 | 완전 준수 |
| 자본시장법 (투자자문 고지) | 고지 문구 있음 | 법무 검토 완료 |
| 신용정보법 | 부분 준수 | 완전 준수 |
| GDPR (해외 사용자) | 미준수 | 글로벌화 시 적용 |

---

## 10. 데이터베이스 스키마 명세

### 10.1 마이그레이션 목록

| 파일 | 내용 |
|------|------|
| 001_full_schema.sql | 핵심 테이블 (tenants, users, listings, etc.) |
| 002_exchange_tables.sql | 거래 관련 (deal_rooms, contracts, etc.) |
| 003_professional_tables.sql | 전문가 프로필, 상담 |
| 004_billing_tables.sql | 구독, 결제, 크레딧 |
| 005_partner_tables.sql | 파트너 관계 |
| 006_community_tables.sql | 게시판, 댓글 |
| 007_institution_tables.sql | 기관 KYC |
| 008_notification_tables.sql | 알림 설정 |
| 009_analytics_tables.sql | 분석 이벤트 |
| 010_rls_policies.sql | Row Level Security 정책 |
| 011_indexes.sql | 성능 인덱스 |
| 012_seed_data.sql | 시드 데이터 |
| 013_credit_balance_column.sql | 크레딧 잔액 컬럼 추가 |
| 014_market_data_tables.sql | 시장 데이터 테이블 |
| 015_api_configs.sql | API 설정 테이블 |
| 016_pgvector_legal_rag.sql | 벡터 임베딩 + RAG (신규) |

### 10.2 핵심 테이블 요약

**사용자 그룹**
- `users` (공개 프로필) - Auth와 연동
- `user_roles` - SELLER/BUYER/ADMIN/PROFESSIONAL/PARTNER/INSTITUTION
- `tenants` - SaaS 테넌트 (은행, AMC)
- `tenant_members` - 테넌트 멤버

**거래 그룹**
- `listings` - 물건 목록 (NPL, 경매)
- `deal_rooms` - 거래방
- `deal_room_messages` - 거래방 메시지
- `nda_agreements` - NDA
- `contract_requests` - 계약 요청
- `demand_surveys` - 수요 조사
- `matching_results` - 매칭 결과
- `ai_analysis_results` - AI 분석 결과

**결제 그룹**
- `subscriptions` - 구독 (order_id, payment_id, amount 포함)
- `credit_transactions` - 크레딧 거래 (transaction_type, reference_id)
- `payment_history` - 결제 이력 (pg_provider, credits_granted)
- `coupons` / `coupon_uses`

**RAG 그룹 (신규)**
- `legal_embeddings` - 법률 문서 벡터 임베딩 (vector(1536))
- `search_legal_embeddings()` - pgvector 유사도 검색 RPC

**전문가 그룹**
- `professionals` - 전문가 프로필
- `consultation_reviews` - 상담 리뷰
- `professional_earnings` - 수익 정산

---

## 부록: 주요 개발 컨벤션

### API 패턴
```typescript
// 표준 응답 형식
{ data: T, error?: { code: string, message: string } }

// 인증 클라이언트 (서버 컴포넌트)
import { createClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'  // RLS 우회

// 에러 처리
import { Errors, fromUnknown } from '@/lib/api-error'
return Errors.unauthorized('로그인이 필요합니다.')
```

### 컨벤션
- 금액: `formatKRW()` (억/만원 표기)
- 날짜: `toLocaleDateString('ko-KR')`
- 환경변수: `NEXT_PUBLIC_` prefix는 클라이언트 노출
- Mock Fallback: API 실패 시 mock 데이터 반환 (graceful degradation)
- 페이지 라우트: `/analysis/*` (신규), `/exchange/*` (신규)

### 설계 원칙
1. **타입 안전성 우선**: 모든 API Body에 Zod 스키마
2. **Graceful Degradation**: AI/외부 API 실패 시 폴백
3. **병렬 처리 선호**: `Promise.allSettled()` 활용
4. **서버 컴포넌트 우선**: 클라이언트 컴포넌트는 인터랙션 필요 시만
5. **서비스 역할 분리**: Admin API는 `getSupabaseAdmin()` (RLS 우회)

---

*마지막 업데이트: 2026-04-03*
*버전: v2.1 — pgvector RAG + 땅집고옥션 브랜드 정리 완료*
