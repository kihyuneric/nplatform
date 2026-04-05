# NPLatform - 종합 프로젝트 스펙 및 현황

> 최종 업데이트: 2026-03-24

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **서비스명** | NPLatform (NPL + Platform) |
| **비전** | AI 기반 부실채권(NPL) 투자 분석·거래 플랫폼 |
| **목표** | 저평가 자산 발굴 → AI 가치평가 → 투자 판단 → 글로벌 유동성 연결 |
| **타겟** | 금융기관(매도), 개인/기관 투자자(매수), 법률/세무 전문가, 파트너 |
| **다국어** | 한국어(기본), 영어, 일본어 (구글 번역 자동 + 캐싱) |

---

## 2. 기술 스택

| 카테고리 | 기술 |
|----------|------|
| **프레임워크** | Next.js 15.3.6 + React 19 |
| **언어** | TypeScript 5 (strict) |
| **스타일** | Tailwind CSS + shadcn/ui (76컴포넌트) |
| **애니메이션** | Framer Motion |
| **차트** | Recharts |
| **데이터베이스** | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| **상태관리** | 자체 useApi/appStore + 도메인 hooks |
| **다국어** | 구글 번역 자동화 + localStorage 캐싱 |
| **AI/ML** | Anthropic Claude, OpenAI, 자체 신경망(가격예측/리스크분류/매칭) |
| **문서생성** | jsPDF, docx, 자체 계약서 엔진 |
| **보안** | CSP, Rate Limiting, Input Sanitization, MFA/TOTP |
| **배포** | Vercel (예정), Capacitor (앱 예정) |

---

## 3. 프로젝트 규모

| 항목 | 수량 |
|------|------|
| 페이지 | 238 |
| API 라우트 | 222 |
| 컴포넌트 | 212 |
| 라이브러리 | 136 |
| 모듈 (DDD) | 10 |
| 테스트 파일 | 37 (306+ 테스트 케이스) |
| Error Boundary | 33 |
| Loading State | 110 |
| Layout | 28 |
| DB 마이그레이션 | 12 (70+ 테이블) |
| 다국어 파일 | 3 (ko/en/ja) |
| 서비스 가이드 | 25페이지 |
| CI/CD 워크플로우 | 4 |
| 샘플 데이터 | 100매물 + 50거래 + 20사용자 + 12전문가 |

---

## 4. 서비스 구조 (5대 카테고리)

### 4-1. 매물
| 페이지 | 경로 | 기능 |
|--------|------|------|
| 딜 브릿지 | /exchange | 통합 매물 검색 (자동완성, 카드/리스트뷰, URL필터) |
| 매물 검색 | /market/search | 상세 필터 검색 |
| 매물 지도 | /market/map | 카카오맵 기반 탐색 |
| 매물 등록 | /exchange/sell | 7단계 위저드 (이미지, 임시저장, AI검토) |
| 대량 등록 | /exchange/bulk-upload | AI OCR 대량 매물 등록 (25필드 추출) |
| 매수 수요 | /exchange/demands | 매수자 수요 등록/매칭 |
| 입찰/경매 | /market/bidding | 입찰 진행 |
| 매물 상세 | /exchange/[id] | 유사매물, 지도, 가격분석, 공유 |
| 매물 수정 | /exchange/edit/[id] | 반려/수정 후 재등록 |

### 4-2. 거래
| 페이지 | 경로 | 기능 |
|--------|------|------|
| 내 거래 현황 | /exchange/deals | 칸반 보드 (7단계) |
| 딜룸 | /exchange/deals/[id] | 채팅, 파일첨부, 오퍼카드, 읽음표시, 온라인표시 |
| AI 매칭 | /matching | AI 다중요소 매칭 |
| 계약서 생성 | /tools/contract-generator | 6종 계약서, PDF/DOCX/HWP, 기관양식, 버전관리 |
| 실사 체크리스트 | /exchange/due-diligence/[id] | 14항목 실사 관리 |
| 계약 관리 | /exchange/contract/[id] | 계약 타임라인 |
| 거래 아카이브 | /exchange/archive | 완료 거래 |
| 참여 기관 | /exchange/institutions | 기관 프로필/즐겨찾기 |

### 4-3. 분석
| 페이지 | 경로 | 기능 |
|--------|------|------|
| AI NPL 분석 | /npl-analysis | AI 등급/수익률 (10크레딧) |
| 경매 시뮬레이터 | /tools/auction-simulator | 수익률 계산 |
| OCR 문서인식 | /tools/ocr | 25필드 AI 추출 (5크레딧) |
| 실사 리포트 | /tools/due-diligence-report | AI 실사 리포트 생성 |
| 시장 통계 | /statistics | NPL 시장 데이터 |
| 시장 인텔리전스 | /market-intelligence | 시장 동향/히트맵/시그널 |

### 4-4. 서비스
| 페이지 | 경로 | 기능 |
|--------|------|------|
| 전문가 찾기 | /professional | 법률/세무/감정 전문가 마켓 |
| 전문가 상세 | /professional/[id] | 예약 캘린더, 리뷰, 상담 |
| 전문가 등록 | /professional/register | 전문가 등록 |
| 커뮤니티 | /community | 카테고리, 이미지, 대댓글, 신고 |
| 뉴스 | /news | NPL/부동산 뉴스 |
| 지식센터 | /knowledge | 교육과정/용어사전 |
| 펀드 | /fund | NPL 펀드 |
| 대출 | /lender | 대출 상품 |

### 4-5. 내 정보
| 페이지 | 경로 | 기능 |
|--------|------|------|
| 마이페이지 | /mypage | 프로필/설정/투자선호 |
| 알림 | /notifications | 알림 센터 |
| 결제/크레딧 | /settings/payment | 3탭(구독/크레딧/결제내역) |
| 쿠폰 | /settings/coupons | 쿠폰 등록/관리 |
| 보안 | /settings/security | MFA/2FA, 비밀번호, 세션 |
| 사용 가이드 | /guide | 역할별 25개 가이드 |
| 고객센터 | /support | 문의/FAQ |
| 공지사항 | /notices | 공지 목록 |
| 요금제 | /pricing | FREE/PRO/ENTERPRISE |

---

## 5. 관리자 시스템

| 페이지 | 기능 |
|--------|------|
| 대시보드 | 8 KPI + 매출/가입/파이프라인 차트 + 활동피드 |
| 회원 관리 | CRUD, 역할승인, 엑셀내보내기, 상세뷰 |
| 매물 관리 | 검색, 추천, 삭제, 초기화, 엑셀 |
| 매물 심사 | 승인/반려/수정요청, 대량처리, 이미지확인 |
| 배너 관리 | CRUD, 위치별, 역할별 타겟 |
| 공지 관리 | CRUD, 노출 토글 |
| 요금 관리 | 플랜/크레딧/서비스크레딧/수수료 |
| 파트너 관리 | 정산 승인/거부, 추천코드 |
| 전문가 관리 | 가격변경 승인 |
| 회원 승인 | 역할별 승인/거부 |
| 테넌트 관리 | SaaS 멀티테넌트 |
| 쿠폰 관리 | 생성/삭제/토글 |
| 관리자 계정 | L1-L5 레벨, 추가/변경/정지 |
| 접근 권한 | 등급별/메뉴별 권한 설정 |
| 자동화 | 크론 작업 7개, 수동실행 |
| 사이트 설정 | 연락처/SNS/사업자정보 |
| 에러 모니터링 | 에러 추적, 추이차트, 심각도 |
| 통합 관리 | DB 37테이블 + API 222개 + 외부 18개 |
| API 연동 | 18개 외부 API 설정/테스트 |
| 데이터베이스 | Supabase/커스텀 DB 연결, 테이블 통계 |
| 마이그레이션 | 12개 SQL 실행, 시드 데이터 |
| ML 모델 | 가격예측/리스크/매칭 모델 관리 |
| 성능 모니터링 | Web Vitals (LCP/FID/CLS) |
| 컴플라이언스 | 10개 점검항목 |
| 통합 분석 | 코호트/퍼널 분석 |
| 모듈 관리 | 12개 모듈 활성화/비활성화 |
| 배포 체크리스트 | 15항목 배포 준비 |

---

## 6. 핵심 기술 기능

### 6-1. AI/ML
- 신경망 가격 예측 (8-32-16-1 아키텍처, ReLU, Xavier 초기화)
- 리스크 분류 (12-64-32-5, Softmax, A-E등급)
- 매칭 엔진 (16차원 임베딩, 코사인 유사도)
- 자연어 검색 (Claude Haiku 파싱 or 정규식 fallback)
- OCR 문서 인식 (25필드 추출)
- AI 계약서 검토 (8크레딧)

### 6-2. 결제/과금
- 크레딧 시스템 (AI분석 10, OCR 5, 계약검토 8)
- 구독 플랜 3종 (FREE/PRO/ENTERPRISE)
- 크레딧 패키지 4종 (50/100/500/2000)
- 쿠폰 3유형 (무료체험/크레딧/할인)
- 영수증 PDF + 인쇄
- Toss Payments 연동 구조 (키 입력 시 활성화)

### 6-3. 보안
- CSP, X-Frame-Options, HSTS 등 8개 보안 헤더
- Token Bucket Rate Limiting (AI 10/min, Auth 5/min)
- Input Sanitization (XSS, SQL Injection 방어)
- MFA/TOTP 2단계 인증
- 역할 기반 접근 제어 (6개 역할)
- 세션 관리 (동시 접속 차단)
- Zero-trust 요청 검증 구조

### 6-4. 실시간
- Supabase Realtime (채팅, 알림, 입찰)
- 알림 자동 생성 (매물등록/거래진행/상담)
- 온라인/오프라인 표시
- 읽음 표시

### 6-5. 데이터
- 통합 Data Layer (Supabase 우선 → 파일 영속 → 메모리 fallback)
- 샘플 데이터 100매물/50거래/20사용자/12전문가
- fetchSafe (retry 2회, timeout 10초, fallback)
- 관리자 데이터 내보내기/초기화/리셋

---

## 7. 현재 개발 수준 (글로벌 100점 기준)

| 영역 | 점수 | 상태 |
|------|------|------|
| 프론트엔드 | 40 | 238페이지, shadcn/ui, 반응형 |
| 백엔드/API | 32 | 222 API, data-layer, Zod 검증 |
| 상태관리 | 30 | 자체 useApi/Store |
| 코드 품질 | 45 | ESLint 0에러, TS 0에러, 306테스트 |
| 성능 | 42 | ISR 5개, Edge 1개, 캐싱 4개, lazy |
| 보안 | 42 | CSP/Rate-limit/Sanitize |
| 접근성/SEO | 48 | 메타데이터 10+, aria-label 28개, focus-visible |
| 다국어 | 45 | 구글 번역 자동화 |
| 테스트 | 35 | 37파일 306케이스 |
| 에러 복원력 | 52 | fetchSafe, 오프라인배너, 에러추적 |
| 문서화 | 48 | 25가이드, API문서 218개, 배포체크리스트 |
| 데이터 밀도 | 42 | 100매물/50거래 샘플 |
| CI/CD | 5 | YAML만 (미실행) |
| 모니터링 | 10 | 관리자 페이지만 |
| 인프라 | 5 | 로컬 dev만 |
| **종합** | **38** | **코드 레벨 한계** |

---

## 8. 종합 개발 계획 (38→80 목표)

### Phase A: 인프라 구축 (38→55) — 본인 직접

| 작업 | 점수 영향 | 방법 |
|------|----------|------|
| Supabase 프로젝트 생성 | +8 | supabase.com → 프로젝트 생성 → .env.local 설정 |
| DB 마이그레이션 실행 | +5 | 관리자 > 마이그레이션 > 12개 SQL 실행 |
| Vercel 배포 | +8 | vercel.com → GitHub 연결 → 환경변수 설정 |
| 도메인 연결 | +2 | DNS 설정 → SSL 자동 |
| Toss Payments 연동 | +5 | toss 가입 → 관리자 > API 연동에서 키 입력 |
| 카카오맵 키 | +2 | developers.kakao.com → JS 키 발급 |

### Phase B: 모니터링 (55→62) — 본인 직접

| 작업 | 점수 영향 | 방법 |
|------|----------|------|
| Vercel Analytics 활성화 | +3 | Vercel 대시보드에서 클릭 |
| Sentry 연동 | +4 | sentry.io 가입 → DSN 설정 |

### Phase C: CI/CD 실행 (62→70) — 본인 직접

| 작업 | 점수 영향 | 방법 |
|------|----------|------|
| GitHub Actions 활성화 | +5 | GitHub 레포 → Actions 탭 확인 |
| Preview 배포 | +3 | PR 생성 시 자동 프리뷰 |

### Phase D: 코드 고도화 (70→80) — Claude

| 작업 | 점수 영향 | 내용 |
|------|----------|------|
| Server Components 전환 | +3 | 정적 페이지 RSC 변환 |
| Streaming SSR | +2 | AI 응답 스트리밍 |
| 테스트 커버리지 60% | +3 | 핵심 플로우 E2E 테스트 |
| 번들 최적화 | +2 | 불필요 의존성 제거 |

---

## 9. 런칭 전 체크리스트

### 필수 (Must Have)
- [ ] Supabase 프로젝트 생성 + .env.local 설정
- [ ] 12개 마이그레이션 SQL 실행
- [ ] 시드 데이터 입력
- [ ] Vercel 배포 + 빌드 성공 확인
- [ ] 커스텀 도메인 연결 (nplatform.co.kr)
- [ ] 관리자 계정 생성 + 비밀번호 설정
- [ ] 이용약관/개인정보처리방침 최종 검토
- [ ] 사업자등록 (PG사 연동 필요)

### 권장 (Should Have)
- [ ] Toss Payments 키 입력 + 테스트 결제
- [ ] 카카오맵 API 키 입력
- [ ] AI API 키 입력 (Anthropic or OpenAI)
- [ ] 관리자 > 사이트 설정 > 연락처 정보 입력
- [ ] 초기 공지사항 3개 등록
- [ ] 초기 배너 등록

### 선택 (Nice to Have)
- [ ] Sentry 에러 모니터링 연동
- [ ] Google Analytics 연동
- [ ] 외부 부동산 데이터 API 연동
- [ ] PWA 앱 스토어 등록

---

## 10. 디렉토리 구조

```
nplatform/
├── app/                    # Next.js 15 App Router
│   ├── (main)/             # 메인 레이아웃 (네비게이션 포함)
│   │   ├── exchange/       # 딜 브릿지 (매물/거래)
│   │   ├── market/         # NPL 마켓 (검색/지도/입찰)
│   │   ├── professional/   # 전문가 서비스
│   │   ├── community/      # 커뮤니티
│   │   ├── buyer/          # 매수자 포털
│   │   ├── seller/         # 매도자 포털
│   │   ├── partner/        # 파트너 포털
│   │   ├── admin/          # 관리자 (30+ 페이지)
│   │   ├── tools/          # 분석 도구
│   │   ├── guide/          # 서비스 가이드 (25페이지)
│   │   └── settings/       # 설정/결제
│   ├── (auth)/             # 인증 레이아웃
│   ├── api/                # API 라우트 (222개)
│   │   └── v1/             # 버전 관리
│   └── news/               # 뉴스 (별도 레이아웃)
├── components/             # 공유 컴포넌트 (212개)
│   ├── ui/                 # shadcn/ui 기본
│   ├── layout/             # 네비게이션/푸터/모바일
│   ├── shared/             # 공통 (페이지상태/폼필드/에러)
│   ├── deal-room/          # 딜룸 전용
│   ├── professional/       # 전문가 전용
│   ├── admin/              # 관리자 전용
│   ├── guide/              # 가이드 전용
│   └── legal/              # 면책조항
├── lib/                    # 유틸리티 (136개)
│   ├── sample-data/        # 샘플 데이터
│   ├── ml/                 # ML 모델
│   ├── security/           # 보안
│   ├── analytics/          # 분석
│   ├── hooks/              # 커스텀 훅
│   └── stores/             # 상태 저장소
├── modules/                # DDD 모듈 (exchange/professional/billing)
├── supabase/               # DB 마이그레이션 (12 SQL)
├── messages/               # 다국어 (ko/en/ja)
├── __tests__/              # 테스트 (37파일)
├── e2e/                    # E2E 테스트
├── .github/workflows/      # CI/CD (4 YAML)
├── docs/                   # 문서
└── public/                 # 정적 파일
```

---

## 11. 환경변수

| 변수 | 필수 | 설명 |
|------|------|------|
| NEXT_PUBLIC_SUPABASE_URL | 필수 | Supabase 프로젝트 URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | 필수 | Supabase Anon Key |
| NEXT_PUBLIC_SITE_URL | 필수 | 사이트 URL |
| ANTHROPIC_API_KEY | 선택 | Claude AI |
| OPENAI_API_KEY | 선택 | OpenAI |
| PAYMENT_CLIENT_KEY | 선택 | Toss Payments 클라이언트 키 |
| PAYMENT_SECRET_KEY | 선택 | Toss Payments 시크릿 키 |
| NEXT_PUBLIC_KAKAO_MAP_KEY | 선택 | 카카오맵 JS 키 |
| EXTERNAL_REAL_ESTATE_API_URL | 선택 | 부동산 데이터 API |
| EXTERNAL_NEWS_API_URL | 선택 | 뉴스 API |
| EXTERNAL_AUCTION_API_URL | 선택 | 경매 데이터 API |

---

*NPLatform - AI 기반 부실채권 투자 분석·거래 플랫폼*
*Version: v25.0*
