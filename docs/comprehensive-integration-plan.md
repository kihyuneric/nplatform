# NPLatform 종합 통합 기획서 v1.0

## 1. 프로젝트 개요

### 1.1 비전
NPLatform은 한국 NPL(부실채권) 시장의 모든 참여자 — 금융기관(매도자), 투자자(매수자), 전문가 — 를 위한
**원스톱 NPL 거래 및 분석 플랫폼**이다.

### 1.2 통합 대상 프로젝트
| 프로젝트 | 핵심 기능 | 기술 스택 |
|----------|----------|-----------|
| **0-news** (현재) | NPL 분석 서비스, 교육 플랫폼, 딜룸, 매칭엔진 | Next.js 15, Supabase, shadcn/ui |
| **marketplace** | NPL 검색, 지도검색, 입찰, OCR, 대시보드 | Next.js 15, PostgreSQL(pg), Kakao Maps |
| **auction-simulator-v4** | 경매 수익률 분석기 (세금/비용 계산) | React (Vite), Recharts, jsPDF |

### 1.3 통합 후 메뉴 구조

```
NPLatform (홈)
├── 서비스 소개          ← 신규
├── NPL 마켓
│   ├── NPL 검색        ← marketplace/search 이식 + 고도화
│   ├── NPL 지도        ← marketplace/map 이식 + 고도화
│   ├── NPL 입찰        ← marketplace/bidding 이식 + 고도화
│   └── 매물 상세       ← 기존 listings/[id] 유지
├── 분석 도구
│   ├── NPL 분석        ← 기존 0-news npl-analysis 유지
│   ├── 경매 수익률 분석 ← auction-simulator 이식
│   └── AI 분석 이력    ← 기존 investor/analysis-history
├── 투자자 도구
│   ├── 투자자 대시보드
│   ├── 수요설문 / 매칭
│   ├── 관심매물 / 비교
│   └── 알림 설정
├── 기관 서비스
│   ├── 기관 대시보드
│   ├── 매물 등록
│   └── 포트폴리오
├── 딜룸 / 계약
├── 통계
├── 교육 (부동산 뉴스 크롤링)
│   ├── 커리큘럼
│   ├── 뉴스
│   └── 학습
└── 관리자
```

---

## 2. 기능별 상세 기획

### 2.1 서비스 소개 페이지 (신규)
**경로**: `/about`

**섹션 구성:**
1. **히어로**: "NPL 거래의 새로운 기준" — 비전 메시지 + CTA
2. **회사 소개**: 연혁, 수상 이력, 파트너십 (marketplace의 company-introduction 기반)
3. **서비스 특장점**: 6가지 핵심 기능 카드 (검색/지도/입찰/분석/매칭/딜룸)
4. **이용 프로세스**: 4단계 거래 흐름 시각화
5. **팀 소개**: 경영진 프로필 (marketplace 데이터 활용)
6. **파트너/수상**: 로고 배너 (KB금융, DGB, 캠코 등)
7. **FAQ**: 아코디언 형태
8. **CTA**: 회원가입 유도

### 2.2 NPL 검색 (marketplace/search 이식)
**경로**: `/market/search`

**핵심 기능:**
- 대분류 탭: 개요 / 채권 / 담보 / 경매 / 기타 (marketplace MajorCategory)
- 고급 필터: 지역, 담보유형, 채권잔액, 감정가, LTV, 상태
- 테이블/카드 뷰 토글
- 엑셀 다운로드
- NDA 동의 후 상세 열람
- 원본파일 조회 모달
- Q&A 모달
- 관심매물 등록

**데이터 소스**: Supabase `npl_listings` 테이블 (기존 marketplace는 pg 직접 연결 → Supabase로 전환)

**UI/UX 고도화:**
- 검색 자동완성 (pg_trgm)
- 무한 스크롤 + 가상 스크롤링
- 필터 상태 URL 동기화
- 반응형 디자인 강화
- 스켈레톤 로딩
- 검색 결과 건수 실시간 표시

### 2.3 NPL 지도 (marketplace/map 이식)
**경로**: `/market/map`

**핵심 기능:**
- Kakao Maps API 기반 전체 지도 검색
- 클러스터 마커 (지역별 매물 건수)
- 사이드바 매물 리스트
- 지역 필터 모달
- 빠른 검색
- 마커 클릭 시 상세 정보 팝업
- 지도/리스트 연동 (리스트 아이템 클릭 → 지도 이동)

**데이터 소스**: Supabase + PostGIS (위도/경도)

**UI/UX 고도화:**
- 드래그 시 자동 재검색 (bounds 기반)
- 모바일: 지도/리스트 탭 전환
- 로딩 서클 UX
- 매물 유형별 마커 색상 분리
- 위성/일반 지도 토글

### 2.4 NPL 입찰 (marketplace/bidding 이식)
**경로**: `/market/bidding`

**핵심 기능:**
- 입찰 진행중인 매물 목록
- 입찰 참여 (NDA 서명 후)
- 입찰 등록 폼 (금융기관 전용)
- 입찰 상세: 물건 정보 + 첨부서류 + 입찰 이력
- 테이블/카드 뷰 토글
- 페이지네이션
- 프리미엄 접근 제어 (역할 기반)

**입찰 프로세스:**
1. 매도 기관이 매물 등록 + 입찰 조건 설정
2. 매수 희망자가 NDA 서명 → 상세 열람
3. 입찰 가격 제출 (마감일 전)
4. 매도 기관이 입찰 결과 검토 → 낙찰자 선정
5. 딜룸 생성 → 계약 진행

### 2.5 경매 수익률 분석기 (auction-simulator 이식)
**경로**: `/tools/auction-simulator`

**핵심 기능 (v4 전체 이식):**
- 물건 정보 입력: 사건번호, 물건종류, 감정가, 최저가, 예상 매도가
- 비용 계산: 취득세, 중개보수, 명도비, 이자, 기타
- 세금 계산: 양도소득세 (개인/매매사업자 모드)
- 수익률 테이블: 입찰가별 순수익/ROI 자동 계산
- AI 판정: 입찰추천/검토/위험/스톱 배지
- 프리셋: 오피스텔/아파트/빌라/토지 샘플
- 시나리오 관리: 최대 10개 저장/비교
- 민감도 분석: 대출비율/보유기간별 수익 변화
- 목표 수익률 역산: ROI 목표 → 최적 입찰가
- PDF/엑셀 내보내기
- 차트: Recharts (꺾은선, 파이)
- KPI 카드: 최적입찰가, ROI, 순수익, 자기자본

**이식 방식**: React 컴포넌트를 Next.js App Router용으로 변환, 단일 JSX → 여러 컴포넌트로 분리

### 2.6 기존 기능 유지
- **NPL 분석** (`/npl-analysis`): 기존 그대로 유지
- **교육/커리큘럼** (`/curriculum`, `/news`): 기존 그대로 유지
- **딜룸** (`/deal-rooms`): 기존 유지
- **통계** (`/statistics`): 기존 유지
- **관리자** (`/admin`): 기존 유지
- **투자자 도구**: 기존 유지
- **기관 서비스**: 기존 유지
- **계약 관리**: 기존 유지

---

## 3. 기술 아키텍처

### 3.1 통합 원칙
- **단일 코드베이스**: 모든 기능을 0-news 프로젝트에 통합
- **Supabase 단일 백엔드**: marketplace의 pg 직접 연결 → Supabase PostgREST로 전환
- **UI 통일**: shadcn/ui + Tailwind CSS (marketplace의 styled-components 제거)
- **인증 통일**: Supabase Auth (marketplace의 자체 JWT 제거)

### 3.2 신규 패키지
```
Kakao Maps SDK  → @kakao/maps (지도 검색용)
xlsx            → 엑셀 내보내기 (검색 결과, 시뮬레이터)
jspdf           → PDF 내보내기 (시뮬레이터)
jspdf-autotable → PDF 테이블
html2canvas     → 차트 PDF 캡처
```

### 3.3 DB 스키마 확장
```sql
-- NPL 매물 확장 (marketplace 필드 추가)
ALTER TABLE npl_listings ADD COLUMN IF NOT EXISTS
  creditor_institution TEXT,        -- 채권기관
  loan_principal NUMERIC,           -- 대출원금
  unpaid_interest NUMERIC,          -- 미수이자
  appraisal_value NUMERIC,          -- 감정가
  setup_amount NUMERIC,             -- 설정금액
  proposed_sale_price NUMERIC,      -- 희망매각가
  debtor_type TEXT,                 -- 채무자 유형 (법인/개인)
  collateral_address TEXT,          -- 담보물 주소
  original_file_url TEXT,           -- 원본파일 URL
  original_file_name TEXT,          -- 원본파일명
  image_url TEXT,                   -- 이미지 URL
  ltv NUMERIC,                      -- LTV
  loan_start_date DATE,             -- 대출실행일
  auction_count INT DEFAULT 0;      -- 유찰횟수

-- 입찰 테이블 (신규)
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES npl_listings(id),
  bidder_id UUID REFERENCES users(id),
  bid_amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'SUBMITTED', -- SUBMITTED, ACCEPTED, REJECTED, WITHDRAWN
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- NDA 테이블 (신규)
CREATE TABLE IF NOT EXISTS nda_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  listing_id UUID REFERENCES npl_listings(id),
  signed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  UNIQUE(user_id, listing_id)
);

-- Q&A 테이블 (신규)
CREATE TABLE IF NOT EXISTS listing_qna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES npl_listings(id),
  questioner_id UUID REFERENCES users(id),
  question TEXT NOT NULL,
  answer TEXT,
  answered_by UUID REFERENCES users(id),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 시뮬레이션 저장 (신규)
CREATE TABLE IF NOT EXISTS auction_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  params JSONB NOT NULL,
  results JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.4 API 라우트 신규
```
GET  /api/v1/market/search         → 매물 검색 (필터+페이지네이션)
GET  /api/v1/market/search/suggest  → 검색 자동완성
GET  /api/v1/market/map             → 지도용 매물 조회 (bounds)
GET  /api/v1/market/map/clusters    → 클러스터 데이터
GET  /api/v1/market/bidding         → 입찰 목록
POST /api/v1/market/bidding/submit  → 입찰 제출
GET  /api/v1/market/bidding/[id]    → 입찰 상세
POST /api/v1/nda/sign               → NDA 서명
GET  /api/v1/nda/check              → NDA 확인
POST /api/v1/listing-qna            → Q&A 질문 등록
GET  /api/v1/listing-qna/[listingId] → Q&A 목록
POST /api/v1/simulations/save       → 시뮬레이션 저장
GET  /api/v1/simulations            → 내 시뮬레이션 목록
```

---

## 4. UI/UX 디자인 원칙

### 4.1 디자인 시스템
- **Primary**: #1B3A5C (네이비), #2E75B6 (블루)
- **Accent**: #10B981 (그린, 긍정), #EF4444 (레드, 부정)
- **Font**: Pretendard (본문), monospace (숫자)
- **Radius**: rounded-lg (기본), rounded-xl (카드)
- **Shadow**: shadow-sm (기본), shadow-lg (모달)

### 4.2 반응형 브레이크포인트
- Mobile: < 768px (카드 1열, 지도 전체화면)
- Tablet: 768px ~ 1024px (카드 2열)
- Desktop: > 1024px (카드 3열, 사이드바 지도)

### 4.3 고도화 포인트
- 스켈레톤 로딩 모든 데이터 영역
- 에러 바운더리 + 재시도 버튼
- 토스트 알림 (성공/실패)
- 키보드 내비게이션
- ARIA 라벨 완비

---

## 5. 보안

### 5.1 RLS 정책
- `bids`: 본인 입찰만 조회/수정, 매물 소유자가 전체 조회
- `nda_agreements`: 본인만 조회, INSERT만 허용
- `listing_qna`: 누구나 조회, 본인 질문만 INSERT, 매물 소유자만 답변
- `auction_simulations`: 본인만 CRUD

### 5.2 접근 제어
- NDA 미서명 시 원본파일/상세정보 차단
- 입찰 등록: SELLER/ADMIN만 가능
- 입찰 참여: BUYER + NDA 서명 완료

---

## 6. 성능 최적화

- 지도: 동적 import (SSR 비활성)
- 경매 시뮬레이터: 동적 import (큰 번들)
- 검색: 디바운스 300ms + cursor 페이지네이션
- 이미지: next/image 최적화
- React Query: staleTime 5분

---

## 7. 개발 우선순위

| 순서 | 작업 | 예상 규모 | 의존성 |
|------|------|----------|--------|
| 1 | 메뉴 구조 변경 + 네비게이션 | 중 | 없음 |
| 2 | NPL 검색 페이지 | 대 | DB 스키마 |
| 3 | NPL 지도 페이지 | 대 | Kakao Maps + DB |
| 4 | NPL 입찰 페이지 | 대 | DB 스키마 |
| 5 | 경매 수익률 분석기 | 중 | 없음 |
| 6 | 서비스 소개 페이지 | 소 | 없음 |
| 7 | 홈 페이지 리디자인 | 중 | 모든 기능 완성 후 |
