# NPLatform 커뮤니티·공지·배너·신원인증 통합 기획서
## "검증된 전문가들이 신뢰 속에서 소통하고 거래하는 플랫폼"

---

## 1. 회원 신원 인증 시스템

### 1.1 설계 철학
```
NPLatform은 일반 커뮤니티가 아니다.
수억~수십억 원의 부실채권을 거래하는 전문 플랫폼이다.
따라서 "누가 이 글을 썼는가"가 매우 중요하다.

원칙:
  1. 모든 활동에 신원 배지가 표시된다
  2. 인증 등급에 따라 접근 권한이 다르다
  3. 실명(기관명)이 기본이고, 익명은 선택이다
  4. 프로필 클릭 시 경력/실적이 보인다
```

### 1.2 신원 인증 등급 체계

```
┌─────────────────────────────────────────────────────────────────┐
│                    NPLatform 회원 신원 인증 체계                   │
├───────────┬──────────┬───────────────────┬──────────────────────┤
│ 등급       │ 배지      │ 인증 방법          │ 노출 정보            │
├───────────┼──────────┼───────────────────┼──────────────────────┤
│ 🏢 기관인증 │ 파란방패  │ 사업자등록증       │ 기관명, 유형,         │
│ Tier 1    │ + 체크   │ + 금융업 인허가    │ 대표자, 거래실적,     │
│           │          │ + 관리자 심사      │ 전문분야, 평점        │
├───────────┼──────────┼───────────────────┼──────────────────────┤
│ 🏛️ 법인인증 │ 초록방패  │ 법인등기부등본     │ 법인명, 대표자,       │
│ Tier 2    │ + 체크   │ + 사업자등록증     │ 설립일, 자본금,       │
│           │          │ + 관리자 심사      │ 투자실적, 평점        │
├───────────┼──────────┼───────────────────┼──────────────────────┤
│ 👤 전문인증 │ 노란방패  │ 자격증 또는        │ 이름, 소속기관,       │
│ Tier 3    │          │ 투자실적 5건+     │ 전문분야, 경력,       │
│           │          │ + 관리자 심사      │ 투자실적, 평점        │
├───────────┼──────────┼───────────────────┼──────────────────────┤
│ ⚖️ 전문가  │ 보라방패  │ 전문자격증        │ 법인명/이름,          │
│ (법무/세무/ │          │ (변호사, 세무사,   │ 자격증, 전문분야,     │
│ 중개사)    │          │  공인중개사 등)    │ 경력, 평점            │
├───────────┼──────────┼───────────────────┼──────────────────────┤
│ 🔵 본인인증 │ 회색방패  │ 휴대폰 본인인증    │ 이름(마스킹),         │
│ Tier 4    │          │ (실명확인만)       │ 가입일, 활동내역      │
├───────────┼──────────┼───────────────────┼──────────────────────┤
│ ⚪ 미인증   │ 없음     │ 이메일가입만       │ 닉네임만,             │
│           │          │                   │ 열람만 가능, 글쓰기X  │
└───────────┴──────────┴───────────────────┴──────────────────────┘
```

### 1.3 신원 배지 표시 UI

```
모든 곳에서 배지가 보임:

게시글 작성자:
  ┌─────────────────────────────────────┐
  │ 🏢 KB자산운용  기관인증              │
  │ 자산운용사 · NPL 전문 15년 · ★4.8   │
  │ 거래실적 47건 · 전문: 아파트, 상가    │
  └─────────────────────────────────────┘

댓글 작성자:
  🏢 김OO · 신한대부 · 기관인증 · 2시간 전

입찰 참여자:
  🏛️ (주)한국NPL투자 · 법인인증 · 자본금 20억 · 실적 23건

딜룸 상대방:
  ⚖️ 법무법인 정의 · 전문가인증 · 변호사 · NPL 전문 8년

프로필 카드 (클릭 시):
  ┌─────────────────────────────────────┐
  │  [로고/사진]                         │
  │  🏢 KB자산운용                       │
  │  기관인증 ✓ · 자산운용사              │
  │                                     │
  │  전문분야: 아파트, 상가, 토지          │
  │  활동지역: 수도권, 충청권              │
  │  거래실적: 47건 (총 520억)            │
  │  평점: ★★★★★ 4.8 (32건)            │
  │  가입일: 2025.03                     │
  │                                     │
  │  [프로필 보기] [메시지 보내기]          │
  └─────────────────────────────────────┘
```

### 1.4 개발 상세

```
[DB 테이블]

-- 기존 users 테이블에 컬럼 추가
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN company_name TEXT;
ALTER TABLE users ADD COLUMN verification_tier TEXT DEFAULT 'NONE'
  CHECK (verification_tier IN ('TIER1','TIER2','TIER3','EXPERT','BASIC','NONE'));
ALTER TABLE users ADD COLUMN verification_badge_color TEXT;
ALTER TABLE users ADD COLUMN specialty TEXT[];
ALTER TABLE users ADD COLUMN regions TEXT[];
ALTER TABLE users ADD COLUMN career_years INT;
ALTER TABLE users ADD COLUMN deal_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN deal_volume BIGINT DEFAULT 0;
ALTER TABLE users ADD COLUMN rating_avg DECIMAL(3,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN rating_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN is_public BOOLEAN DEFAULT true;

[컴포넌트]

components/user/verification-badge.tsx — 인증 배지 (방패+체크)
  Props: tier, size ('sm'|'md'|'lg')
  크기: sm(16px 인라인), md(20px 카드), lg(32px 프로필)

components/user/user-card.tsx — 사용자 프로필 카드
  Props: user, variant ('inline'|'card'|'full')
  inline: 배지+이름+기관 (게시글/댓글용)
  card: 사진+배지+이름+기관+전문분야+실적 (호버 팝업)
  full: 전체 프로필 (프로필 페이지)

components/user/user-hover-card.tsx — 호버 시 미니 프로필
  Radix HoverCard 기반
  이름 위에 마우스 올리면 프로필 요약 표시

[API]

GET  /api/v1/users/[id]/profile — 공개 프로필 조회
PUT  /api/v1/users/me/profile — 내 프로필 수정
GET  /api/v1/users/[id]/stats — 거래 실적/평점 조회

[페이지]

/profile/[id] — 공개 프로필 페이지
/settings/profile — 내 프로필 편집
/settings/verification — 인증 관리/갱신
```

---

## 2. 공지사항 시스템

### 2.1 기능 개요
```
관리자가 공지사항을 작성하면:
  1. 관리자 대시보드에서 공지 작성
  2. 메인 페이지에 자동 노출 (최신 3건)
  3. 전용 공지사항 목록 페이지에 등록
  4. 중요 공지: 팝업 모달로 표시 (1회)
  5. 알림: 모든 사용자에게 푸시
```

### 2.2 공지 유형
```
┌────────────┬──────────────────────────────────┐
│ 유형        │ 노출 방식                         │
├────────────┼──────────────────────────────────┤
│ 일반 공지   │ 공지 목록 + 메인 최신 3건          │
│ 중요 공지   │ + 메인 상단 배너 고정              │
│ 긴급 공지   │ + 팝업 모달 (최초 1회 필수 확인)    │
│ 이벤트     │ + 이벤트 배지 + 기간 표시           │
│ 시스템 점검 │ + 전체 페이지 상단 경고 바          │
└────────────┴──────────────────────────────────┘
```

### 2.3 관리자 공지 작성 UI

```
[페이지] /admin/notices/new

┌─────────────────────────────────────────────────┐
│ 공지사항 작성                              [발행] │
├─────────────────────────────────────────────────┤
│                                                 │
│ 제목: [                                    ]    │
│                                                 │
│ 유형: [일반 ▼] [중요 ▼] [긴급 ▼] [이벤트 ▼]     │
│                                                 │
│ 카테고리: [서비스 안내] [시스템] [이벤트] [규정]    │
│                                                 │
│ 본문:                                            │
│ ┌───────────────────────────────────────────┐   │
│ │ [B] [I] [U] [H1] [H2] [링크] [이미지] [표] │   │
│ │                                           │   │
│ │  리치 텍스트 에디터                         │   │
│ │  (Tiptap 또는 간단한 마크다운)              │   │
│ │                                           │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ 썸네일 이미지: [파일 선택]                        │
│                                                 │
│ 노출 설정:                                       │
│ ☑ 메인 페이지 노출                               │
│ ☐ 팝업 모달 (중요/긴급 시)                        │
│ ☑ 알림 발송                                      │
│ ☐ 상단 고정                                      │
│                                                 │
│ 노출 기간: [2026-03-20] ~ [2026-04-20]          │
│                                                 │
│ 대상: ◉ 전체 ○ 매도자만 ○ 매수자만 ○ 전문가만     │
│                                                 │
│ [미리보기]                     [임시저장] [발행]   │
└─────────────────────────────────────────────────┘
```

### 2.4 메인 페이지 자동 노출

```
[위치] 홈페이지 히어로 바로 아래

┌─────────────────────────────────────────────────┐
│ 📢 공지사항                           [전체보기 →] │
├─────────────────────────────────────────────────┤
│                                                 │
│ 🔴 [긴급] 시스템 점검 안내 (3/25 02:00~06:00)    │
│ 📌 [중요] NPLatform v3.0 업데이트 안내           │
│ 📋 [일반] 2026년 2분기 수수료 개편 안내           │
│                                                 │
└─────────────────────────────────────────────────┘

긴급/중요: 빨간/주황 배경, 상단 고정
일반: 흰 배경, 시간순
```

### 2.5 개발 상세

```
[DB]

CREATE TABLE notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML 또는 Markdown
  category TEXT NOT NULL CHECK (category IN ('SERVICE','SYSTEM','EVENT','POLICY','OTHER')),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL','IMPORTANT','URGENT','EVENT','MAINTENANCE')),
  thumbnail_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  show_popup BOOLEAN DEFAULT false,
  show_on_main BOOLEAN DEFAULT true,
  send_notification BOOLEAN DEFAULT false,
  target_audience TEXT DEFAULT 'ALL' CHECK (target_audience IN ('ALL','SELLER','BUYER','EXPERT')),
  publish_start TIMESTAMPTZ DEFAULT now(),
  publish_end TIMESTAMPTZ,
  view_count INT DEFAULT 0,
  status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published" ON notices FOR SELECT
  USING (status = 'PUBLISHED' AND (publish_end IS NULL OR publish_end > now()));
CREATE POLICY "Admins can manage" ON notices FOR ALL
  USING (auth.uid() IN (SELECT id FROM users WHERE role IN ('ADMIN','SUPER_ADMIN')));

-- 공지 팝업 확인 기록
CREATE TABLE notice_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notice_id, user_id)
);

[API]

GET    /api/v1/notices — 공지 목록 (필터: category, priority, pinned)
GET    /api/v1/notices/main — 메인 노출용 (최신 3건 + 고정)
GET    /api/v1/notices/popup — 미확인 팝업 공지
GET    /api/v1/notices/[id] — 상세 + 조회수 증가
POST   /api/v1/notices — 작성 (관리자)
PUT    /api/v1/notices/[id] — 수정 (관리자)
DELETE /api/v1/notices/[id] — 삭제 (관리자)
POST   /api/v1/notices/[id]/read — 읽음 처리

[페이지]

/notices — 공지사항 목록 (카테고리 탭, 검색, 페이지네이션)
/notices/[id] — 공지 상세 (이전/다음 네비게이션)
/admin/notices — 관리자 공지 관리 (목록, 상태변경, 삭제)
/admin/notices/new — 공지 작성
/admin/notices/[id]/edit — 공지 수정

[컴포넌트]

components/notices/notice-banner.tsx — 메인 공지 배너 (3건)
  홈페이지에 자동 삽입, API 호출로 최신 공지 표시
  priority별 스타일 (긴급=빨강, 중요=주황, 일반=파랑)

components/notices/notice-popup.tsx — 긴급 공지 팝업 모달
  앱 로드 시 미확인 팝업 공지 체크
  확인 버튼 → POST /read → localStorage 기록
  "오늘 하루 보지 않기" 옵션

components/notices/system-alert-bar.tsx — 시스템 점검 알림바
  모든 페이지 최상단 (네비 위)
  노란 배경 + 경고 아이콘 + 점검 시간
  닫기 버튼 (세션 동안 숨김)
```

---

## 3. 배너 관리 시스템

### 3.1 배너 슬롯 위치 맵

```
모든 페이지에 배너를 넣을 수 있는 슬롯이 있음:

┌─────────────────────────────────────────────────┐
│ [시스템 알림 바] ← SLOT: system-alert            │
├─────────────────────────────────────────────────┤
│ [네비게이션]                                     │
├─────────────────────────────────────────────────┤
│ [페이지 상단 배너] ← SLOT: page-top              │
│                                                 │
│ [페이지 콘텐츠]                                  │
│                                                 │
│ [콘텐츠 중간 배너] ← SLOT: content-middle        │
│                                                 │
│ [페이지 콘텐츠 계속]                              │
│                                                 │
│ [콘텐츠 하단 배너] ← SLOT: content-bottom        │
├─────────────────────────────────────────────────┤
│ [푸터 상단 배너] ← SLOT: footer-top              │
├─────────────────────────────────────────────────┤
│ [푸터]                                          │
└─────────────────────────────────────────────────┘

사이드바 배너 (데스크탑 전용):
  [사이드 상단] ← SLOT: sidebar-top
  [사이드 하단] ← SLOT: sidebar-bottom
```

### 3.2 페이지별 배너 슬롯

```
홈페이지:
  home-hero-below     — 히어로 바로 아래 (풀폭)
  home-featured-above — 추천매물 위 (풀폭)
  home-cta-above      — CTA 위 (풀폭)

검색 페이지:
  search-top          — 검색 결과 위 (풀폭)
  search-sidebar      — 사이드바 (300×250)

지도 페이지:
  map-sidebar-top     — 사이드바 상단 (300×100)

입찰 페이지:
  bidding-top         — 입찰 목록 위 (풀폭)

분석 페이지:
  analysis-sidebar    — 사이드바 (300×250)

시뮬레이터:
  simulator-top       — 결과 위 (풀폭)

커뮤니티:
  community-top       — 글 목록 위 (풀폭)
  community-sidebar   — 사이드바 (300×250)
```

### 3.3 관리자 배너 관리 UI

```
[페이지] /admin/banners

┌─────────────────────────────────────────────────┐
│ 배너 관리                              [새 배너] │
├─────────────────────────────────────────────────┤
│                                                 │
│ [활성] [예약] [종료] [전체]                       │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🖼️ 신규 매물 프로모션                        │ │
│ │ 슬롯: home-hero-below                       │ │
│ │ 기간: 2026.03.20 ~ 2026.04.20              │ │
│ │ 클릭수: 1,234 · 노출수: 45,678             │ │
│ │ CTR: 2.7%                                   │ │
│ │ [수정] [중지] [통계]                         │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ 🖼️ 투자자 교육 세미나                        │ │
│ │ 슬롯: community-sidebar                     │ │
│ │ ...                                         │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 3.4 배너 생성 UI

```
[페이지] /admin/banners/new

┌─────────────────────────────────────────────────┐
│ 배너 등록                                        │
├─────────────────────────────────────────────────┤
│                                                 │
│ 배너명: [                                  ]    │
│                                                 │
│ 유형: ◉ 이미지 배너  ○ 텍스트 배너  ○ HTML 배너   │
│                                                 │
│ 슬롯 선택:                                       │
│ ┌───────────────────────────────────────────┐   │
│ │ 페이지: [홈 ▼]                             │   │
│ │ 위치: [히어로 하단 ▼]                       │   │
│ │ 슬롯 ID: home-hero-below                  │   │
│ │ 권장 크기: 1200×200px (풀폭)               │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│ 이미지: [데스크탑용 업로드] [모바일용 업로드]       │
│ (권장: 데스크탑 1200×200, 모바일 390×150)         │
│                                                 │
│ 링크 URL: [https://                        ]    │
│ 링크 타겟: ◉ 새 탭  ○ 현재 탭                    │
│                                                 │
│ 노출 기간: [시작일] ~ [종료일]                    │
│ 노출 대상: ◉ 전체  ○ 매도자  ○ 매수자  ○ 전문가   │
│ 우선순위: [1~10]                                 │
│                                                 │
│ 미리보기:                                        │
│ ┌───────────────────────────────────────────┐   │
│ │        [배너 미리보기 영역]                  │   │
│ └───────────────────────────────────────────┘   │
│                                                 │
│                              [임시저장] [등록]    │
└─────────────────────────────────────────────────┘
```

### 3.5 개발 상세

```
[DB]

CREATE TABLE banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('IMAGE','TEXT','HTML')),
  slot_id TEXT NOT NULL, -- home-hero-below, search-top, etc.
  image_desktop_url TEXT,
  image_mobile_url TEXT,
  html_content TEXT,
  text_content TEXT,
  link_url TEXT,
  link_target TEXT DEFAULT '_blank',
  target_audience TEXT DEFAULT 'ALL',
  priority INT DEFAULT 5,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  impression_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','PAUSED','ENDED')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

[API]

GET    /api/v1/banners?slot=home-hero-below — 슬롯별 활성 배너 조회
POST   /api/v1/banners — 배너 등록 (관리자)
PUT    /api/v1/banners/[id] — 배너 수정
DELETE /api/v1/banners/[id] — 배너 삭제
POST   /api/v1/banners/[id]/click — 클릭 기록
POST   /api/v1/banners/[id]/impression — 노출 기록
GET    /api/v1/banners/[id]/stats — 통계 (CTR, 노출, 클릭)

[컴포넌트]

components/banners/banner-slot.tsx — 범용 배너 슬롯 컴포넌트
  Props: slotId, className
  API 호출로 해당 슬롯의 활성 배너 로딩
  배너 없으면 숨김 (높이 0)
  클릭/노출 자동 추적
  반응형: 데스크탑/모바일 이미지 자동 전환

  사용법:
    <BannerSlot slotId="home-hero-below" className="my-4" />
    → 관리자가 배너를 등록하면 자동 표시

[페이지]

/admin/banners — 배너 관리 목록
/admin/banners/new — 배너 등록
/admin/banners/[id]/edit — 배너 수정
/admin/banners/[id]/stats — 배너 통계 (차트)
```

---

## 4. 커뮤니티 게시판 시스템

### 4.1 게시판 구조

```
┌─────────────────────────────────────────────────────┐
│                NPLatform 커뮤니티                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📋 게시판 카테고리                                    │
│                                                     │
│ ├─ 💬 자유게시판        — 자유 토론                   │
│ ├─ 🏠 매물 토론         — 특정 매물에 대한 의견        │
│ ├─ 📊 시장 분석         — 시장 동향, 전망 공유         │
│ ├─ ❓ Q&A              — 질문과 답변                  │
│ ├─ 📚 투자 사례         — 성공/실패 사례 공유          │
│ ├─ ⚖️ 법률/세무         — 법률, 세금 관련 질문/정보    │
│ ├─ 🎓 교육/정보         — NPL 투자 교육 자료          │
│ └─ 📢 구인/구직         — 파트너 찾기, 공동투자 모집    │
│                                                     │
│ 🏆 전문가 칼럼 (별도)    — 인증된 전문가만 작성        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 4.2 글쓰기 권한

```
┌──────────────┬──────┬──────┬──────┬──────┬──────┐
│ 기능          │ 미인증│ 본인 │ 전문 │ 법인 │ 기관 │
├──────────────┼──────┼──────┼──────┼──────┼──────┤
│ 글 읽기       │ ✅   │ ✅   │ ✅   │ ✅   │ ✅   │
│ 글 쓰기       │ ❌   │ ✅   │ ✅   │ ✅   │ ✅   │
│ 댓글 쓰기     │ ❌   │ ✅   │ ✅   │ ✅   │ ✅   │
│ 좋아요        │ ❌   │ ✅   │ ✅   │ ✅   │ ✅   │
│ 북마크        │ ❌   │ ✅   │ ✅   │ ✅   │ ✅   │
│ 전문가 칼럼   │ ❌   │ ❌   │ ❌   │ ✅   │ ✅   │
│ 매물 토론 개설│ ❌   │ ❌   │ ✅   │ ✅   │ ✅   │
│ 공동투자 모집 │ ❌   │ ❌   │ ❌   │ ✅   │ ✅   │
│ 신고          │ ❌   │ ✅   │ ✅   │ ✅   │ ✅   │
└──────────────┴──────┴──────┴──────┴──────┴──────┘

모든 글/댓글에 작성자 신원 배지 필수 표시
```

### 4.3 게시글 UI

```
[글 목록] /community

┌─────────────────────────────────────────────────┐
│ NPLatform 커뮤니티                    [글쓰기 ✏️] │
├─────────────────────────────────────────────────┤
│ [전체] [자유] [매물토론] [시장분석] [Q&A] [사례]   │
├─────────────────────────────────────────────────┤
│ 🔥 인기글                                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📌 [시장분석] 2026 1분기 NPL 시장 동향         │ │
│ │ 🏢 KB자산운용 · 기관인증 · 3시간 전            │ │
│ │ 👍 47  💬 12  👁 1,234                       │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Q&A] 서울 강남 아파트 NPL 낙찰가율 질문       │ │
│ │ 👤 김OO · 전문인증 · 5시간 전                  │ │
│ │ 👍 23  💬 8   👁 567                         │ │
│ └─────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐ │
│ │ [투자사례] 상가 NPL 매입 후 18개월 수익 공유    │ │
│ │ 🏛️ (주)한국NPL · 법인인증 · 1일 전            │ │
│ │ 👍 89  💬 34  👁 2,456   🏆 베스트             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ [1] [2] [3] ... [10] [다음 →]                   │
└─────────────────────────────────────────────────┘
```

### 4.4 글 상세 UI

```
[글 상세] /community/[id]

┌─────────────────────────────────────────────────┐
│ ← 목록으로                                       │
├─────────────────────────────────────────────────┤
│                                                 │
│ [시장분석] 2026 1분기 NPL 시장 동향               │
│                                                 │
│ ┌─────────────────────────────────────────┐     │
│ │ 🏢 KB자산운용                            │     │
│ │ 기관인증 · 자산운용사 · NPL 전문 15년     │     │
│ │ 거래실적 47건 · ★4.8                     │     │
│ └─────────────────────────────────────────┘     │
│ 2026.03.20 14:32 · 조회 1,234                   │
│                                                 │
│ [본문 내용...]                                   │
│                                                 │
│ [👍 좋아요 47] [🔖 북마크] [🔗 공유] [🚨 신고]    │
│                                                 │
│ ─── 댓글 12개 ───                                │
│                                                 │
│ 🏛️ (주)한국NPL · 법인인증 · 2시간 전             │
│ "좋은 분석 감사합니다. 2분기에는..."              │
│ [👍 5] [답글]                                    │
│                                                 │
│   ↳ ⚖️ 법무법인 정의 · 전문가인증 · 1시간 전     │
│     "법률적으로는 다음과 같은 점도..."            │
│     [👍 3] [답글]                                │
│                                                 │
│ ┌─────────────────────────────────────────┐     │
│ │ [댓글 작성]                              │     │
│ │ 🏢 나의 프로필이 표시됩니다               │     │
│ │ [                                   ]   │     │
│ │                              [등록]     │     │
│ └─────────────────────────────────────────┘     │
└─────────────────────────────────────────────────┘
```

### 4.5 개발 상세

```
[DB]

CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN (
    'FREE','LISTING_DISCUSS','MARKET_ANALYSIS','QNA',
    'CASE_STUDY','LEGAL_TAX','EDUCATION','RECRUIT'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- HTML
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  listing_id UUID REFERENCES npl_listings(id), -- 매물 토론 시 연결
  is_pinned BOOLEAN DEFAULT false,
  is_best BOOLEAN DEFAULT false,
  is_expert_column BOOLEAN DEFAULT false,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  view_count INT DEFAULT 0,
  bookmark_count INT DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','HIDDEN','DELETED','REPORTED')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active" ON community_posts FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Verified users can create" ON community_posts FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE verification_tier != 'NONE'));
CREATE POLICY "Authors can update own" ON community_posts FOR UPDATE USING (auth.uid() = author_id);

CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES community_comments(id), -- 대댓글
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  like_count INT DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE community_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('POST','COMMENT')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE TABLE community_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  post_id UUID NOT NULL REFERENCES community_posts(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

CREATE TABLE community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  target_type TEXT NOT NULL CHECK (target_type IN ('POST','COMMENT')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING','REVIEWED','RESOLVED')),
  created_at TIMESTAMPTZ DEFAULT now()
);

[API]

-- 게시글
GET    /api/v1/community/posts — 목록 (카테고리, 정렬, 페이지네이션)
GET    /api/v1/community/posts/best — 인기글 TOP 10
GET    /api/v1/community/posts/[id] — 상세
POST   /api/v1/community/posts — 작성
PUT    /api/v1/community/posts/[id] — 수정
DELETE /api/v1/community/posts/[id] — 삭제

-- 댓글
GET    /api/v1/community/posts/[id]/comments — 댓글 목록
POST   /api/v1/community/posts/[id]/comments — 댓글 작성
DELETE /api/v1/community/comments/[id] — 댓글 삭제

-- 인터랙션
POST   /api/v1/community/like — 좋아요 토글
POST   /api/v1/community/bookmark — 북마크 토글
POST   /api/v1/community/report — 신고

-- 관리자
GET    /api/v1/admin/community/reports — 신고 목록
PUT    /api/v1/admin/community/posts/[id]/pin — 고정/해제
PUT    /api/v1/admin/community/posts/[id]/best — 베스트 지정

[페이지]

/community — 게시판 메인 (카테고리 탭, 인기글, 최신글)
/community/[id] — 글 상세 (댓글, 좋아요, 공유)
/community/new — 글 쓰기 (카테고리, 제목, 본문, 태그)
/community/[id]/edit — 글 수정
/community/my — 내 활동 (내 글, 댓글, 북마크)
/community/expert — 전문가 칼럼 (인증 전문가만 작성)

/admin/community — 관리자 (신고 처리, 숨김, 베스트 지정)

[컴포넌트]

components/community/post-card.tsx — 게시글 카드 (목록용)
  작성자 배지 + 카테고리 + 제목 + 미리보기 + 반응

components/community/post-editor.tsx — 글 에디터
  리치텍스트 (bold, italic, heading, link, image, list)
  카테고리 선택, 태그 입력, 매물 연결 (선택)

components/community/comment-section.tsx — 댓글 섹션
  댓글 목록 + 대댓글 접기/펴기 + 작성 폼

components/community/like-button.tsx — 좋아요 버튼
  낙관적 UI (즉시 반영, 서버 확인)
```

---

## 5. 네비게이션에 추가

```
[수정 파일] components/layout/navigation.tsx

메뉴 추가:
  MAIN_NAV에 추가:
    { href: '/community', label: '커뮤니티' }
    { href: '/notices', label: '공지사항' }

  모바일 메뉴에도 동일 추가
```

---

## 6. 종합 점수 배점

| 항목 | 배점 |
|------|------|
| **신원 인증 시스템** | |
| 5등급 인증 체계 | 10 |
| 인증 배지 UI (3종 variant) | 8 |
| 프로필 카드/호버카드 | 7 |
| 공개 프로필 페이지 | 5 |
| **공지사항 시스템** | |
| 관리자 작성 (리치에디터) | 10 |
| 메인 자동 노출 (3건) | 5 |
| 팝업 모달 (긴급) | 5 |
| 시스템 알림바 | 3 |
| 공지 목록/상세 페이지 | 5 |
| **배너 관리 시스템** | |
| 배너 슬롯 시스템 (15+ 슬롯) | 12 |
| 관리자 배너 CRUD | 8 |
| 반응형 배너 (데스크탑/모바일) | 5 |
| 클릭/노출 추적 + 통계 | 5 |
| **커뮤니티 게시판** | |
| 8개 카테고리 게시판 | 10 |
| 댓글/대댓글 | 7 |
| 좋아요/북마크/공유 | 5 |
| 전문가 칼럼 | 5 |
| 인기글/베스트 | 3 |
| 신고/관리 | 5 |
| 검색/태그 | 3 |
| DB 스키마 (8 테이블) | 5 |
| API (20+ 라우트) | 5 |
| **합계** | **151** |

---

## 7. 개발 순서

```
Phase C1: 신원 인증 (2시간)
  1. users 테이블 컬럼 추가 (마이그레이션)
  2. verification-badge.tsx 컴포넌트
  3. user-card.tsx (inline/card/full)
  4. user-hover-card.tsx
  5. /profile/[id] 페이지
  6. /settings/verification 페이지
  7. 프로필 API 3개

Phase C2: 공지사항 (2시간)
  1. notices, notice_reads 테이블 생성
  2. 공지 API 7개
  3. /admin/notices/new 작성 페이지 (에디터)
  4. /admin/notices 관리 목록
  5. /notices 목록 + /notices/[id] 상세
  6. notice-banner.tsx (메인 자동 노출)
  7. notice-popup.tsx (긴급 팝업)
  8. system-alert-bar.tsx

Phase C3: 배너 관리 (1.5시간)
  1. banners 테이블 생성
  2. 배너 API 7개
  3. banner-slot.tsx 범용 컴포넌트
  4. /admin/banners 관리 + /admin/banners/new 등록
  5. 주요 페이지에 BannerSlot 삽입 (8곳)
  6. 배너 통계 페이지

Phase C4: 커뮤니티 (3시간)
  1. 커뮤니티 DB 5 테이블 생성
  2. 게시글 API 6개 + 댓글 API 3개 + 인터랙션 API 3개
  3. /community 메인 (카테고리 탭, 인기글)
  4. /community/[id] 상세 (댓글, 좋아요)
  5. /community/new 글쓰기 (에디터)
  6. /community/expert 전문가 칼럼
  7. /community/my 내 활동
  8. /admin/community 관리 (신고, 베스트)
  9. 네비게이션 메뉴 추가

총 소요: ~8.5시간
신규 파일: ~25개
신규 DB 테이블: 8개
신규 API: ~40개
```

---

*NPLatform 커뮤니티·공지·배너·신원인증 통합 기획서*
*"검증된 전문가들이 신뢰 속에서 소통하고 거래하는 플랫폼"*
*작성일: 2026-03-20*
