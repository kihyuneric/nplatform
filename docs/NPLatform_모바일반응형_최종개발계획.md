# NPLatform 모바일 반응형 웹앱 최종 개발 계획
## "데스크탑에서 설계하되, 모바일에서 완성되는 플랫폼"

---

## 1. 현재 진단

### 1.1 반응형 현황
| 항목 | 상태 | 평가 |
|------|------|------|
| Tailwind 브레이크포인트 | 기본값 사용 (sm/md/lg/xl) | ✅ |
| 총 반응형 코드 | 429개 md:/lg:/sm: 사용 | ⚠️ 불균형 |
| 모바일 탭바 | 구현됨 (5탭, 키보드 감지) | ✅ |
| 네비게이션 모바일 메뉴 | 햄버거 메뉴 구현 | ✅ |
| PWA | 미구현 (manifest 없음) | ❌ |
| viewport 메타태그 | Next.js 기본값만 | ⚠️ |

### 1.2 페이지별 반응형 점수
| 페이지 | 반응형 코드 | 모바일 사용성 | 등급 |
|--------|-----------|-------------|------|
| 홈페이지 | 34개 | 양호 | B+ |
| NPL 검색 | **0개** | **사용불가** | **F** |
| NPL 입찰 | 13개 | 보통 | C+ |
| 매물 상세 | 16개 | 보통 | B- |
| 시뮬레이터 | 10개 | 불량 | D |
| NPL 지도 | 별도처리 | 보통 | C |
| NPL 분석 | 8개 | 불량 | D+ |
| 통계 | 5개 | 불량 | D |
| 입찰 등록 | 7개 | 불량 | D |
| 서비스소개 | 12개 | 보통 | C+ |

---

## 2. 모바일 반응형 설계 원칙

### 2.1 Mobile First 접근법
```
❌ 현재: 데스크탑 먼저 → 모바일 깨짐
✅ 목표: 모바일 기본 → md: 태블릿 확장 → lg: 데스크탑 확장

코드 패턴:
  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
  className="text-sm md:text-base lg:text-lg"
  className="px-4 md:px-6 lg:px-8"
  className="hidden md:block"  // 데스크탑만
  className="md:hidden"        // 모바일만
```

### 2.2 터치 인터페이스 기준
```
최소 터치 타겟: 44×44px (WCAG)
버튼 간격: 최소 8px
스와이프 영역: 전체 너비
스크롤: 관성 스크롤 (-webkit-overflow-scrolling: touch)
입력 필드: 최소 h-12 (48px) — 모바일 키보드 고려
폰트: 최소 14px (iOS 자동 줌 방지 = 16px)
```

### 2.3 브레이크포인트 전략
```
기본 (0~639px):    모바일 세로 — 단일 컬럼, 카드 뷰, 바텀시트
sm (640~767px):    모바일 가로 — 약간 넓은 카드
md (768~1023px):   태블릿 — 2컬럼, 사이드바 토글
lg (1024~1279px):  노트북 — 3컬럼, 사이드바 고정
xl (1280px+):      데스크탑 — 풀 레이아웃
```

---

## 3. 페이지별 구체적 모바일 개발 계획

### 3.1 NPL 검색 (현재 F → 목표 A)
```
현재 문제:
  - 반응형 코드 0개
  - 테이블이 가로로 넘침
  - 필터 모달이 전체화면 아님
  - 탭이 스크롤 안 됨

개발 내용:

[파일] app/(main)/market/search/page.tsx

1. 테이블 → 모바일 카드 자동 전환
   - md 이하: 테이블 숨기고 카드 리스트 표시
   - 카드: 기관명 + 주소 + 금액 + AI등급 + 상태
   - 한 줄에 1개, 세로 스크롤
   코드: <div className="hidden md:block">{테이블}</div>
         <div className="md:hidden">{카드리스트}</div>

2. 카테고리 탭 가로 스크롤
   - overflow-x-auto + scrollbar-hide
   - 그라데이션 페이드 양쪽 끝
   코드: <div className="flex overflow-x-auto scrollbar-hide gap-1 px-4">

3. 필터 → 바텀시트 (모바일)
   - md 이하: Sheet 컴포넌트 (하단에서 올라옴)
   - md 이상: 기존 사이드 패널
   코드: <Sheet> (모바일) vs <div className="hidden md:block"> (데스크탑)

4. 검색바 상단 고정
   - sticky top-0 z-30 bg-white
   코드: <div className="sticky top-0 z-30 bg-white border-b px-4 py-3">

5. 페이지네이션 → 더보기 버튼 (모바일)
   - md 이하: "더 보기" 버튼
   - md 이상: 페이지 번호
   코드: <button className="md:hidden w-full">더 보기 ({remaining}건)</button>

6. 정렬/뷰 토글 간소화
   - md 이하: 아이콘만 (텍스트 숨김)
   코드: <span className="hidden md:inline">최신순</span>

예상 추가 코드: ~150줄
```

### 3.2 경매 시뮬레이터 (현재 D → 목표 A)
```
현재 문제:
  - 좌(입력)+우(결과) 레이아웃이 모바일에서 세로로 쌓이지만 입력폼이 너무 김
  - 차트가 가로 넘침
  - 4탭 분석이 좁음

개발 내용:

[파일] app/(main)/tools/auction-simulator/page.tsx

1. 모바일 탭 모드
   - md 이하: 3탭 전환 [입력] [결과] [분석]
   - 각 탭이 전체 화면 차지
   코드:
     <Tabs className="md:hidden">
       <TabsList className="grid grid-cols-3">
         <TabsTrigger>입력</TabsTrigger>
         <TabsTrigger>결과</TabsTrigger>
         <TabsTrigger>분석</TabsTrigger>
       </TabsList>
     </Tabs>

2. 입력폼 아코디언
   - md 이하: 카테고리별 접기/펴기 (기본정보, 비용, 대출)
   - 기본: 기본정보만 펼침
   코드: <Collapsible defaultOpen={section === 'basic'}>

3. 차트 세로 최적화
   - ResponsiveContainer width="100%" height={250} (모바일) / {400} (데스크탑)
   - 모바일: X축 라벨 45도 회전, 간격 넓힘
   코드: <ResponsiveContainer height={isMobile ? 250 : 400}>

4. 결과 테이블 → 카드
   - md 이하: 각 행을 카드로 변환
   - 핵심 정보만: 입찰가, ROI, 순수익, AI 판정

5. 프리셋 그리드
   - 모바일: 2×2 그리드
   - 데스크탑: 1×4 행
   코드: className="grid grid-cols-2 md:grid-cols-4 gap-2"

6. 플로팅 "계산하기" 버튼
   - md 이하: 하단 고정 버튼
   코드: <div className="fixed bottom-20 left-4 right-4 md:hidden z-40">

예상 추가 코드: ~120줄
```

### 3.3 NPL 지도 (현재 C → 목표 A)
```
[파일] app/(main)/market/map/map-client.tsx

1. 지도 전체화면 (모바일 기본)
   - 사이드바 숨기고 지도만 표시
   - 하단에 선택된 매물 미니카드
   코드: <div className="h-[calc(100vh-120px)] md:h-auto">

2. 사이드바 → 바텀시트
   - 위로 스와이프하면 매물 리스트 올라옴
   - Sheet snap points: 30% / 60% / 90%
   코드: <Sheet snapPoints={[0.3, 0.6, 0.9]}>

3. 필터 → 상단 칩 가로 스크롤
   - 담보유형 칩이 가로 스크롤
   코드: <div className="flex overflow-x-auto gap-2 px-4 py-2">

4. 마커 터치 영역 확대
   - 마커 크기: 모바일 40px, 데스크탑 32px
   - 터치 히트영역 48×48px 보장

예상 추가 코드: ~80줄
```

### 3.4 NPL 분석 상세 (현재 D+ → 목표 A-)
```
[파일] app/(main)/npl-analysis/[id]/page.tsx

1. 6탭 → 가로 스크롤 탭
   - overflow-x-auto scrollbar-hide
   - 활성 탭 자동 스크롤 (scrollIntoView)

2. 차트 반응형
   - Recharts ResponsiveContainer height 조절
   - 모바일: 범례 아래로 이동

3. 액션 버튼 → 하단 고정 바
   - md 이하: [PDF] [시뮬레이션] [목록] 3버튼 하단 고정

예상 추가 코드: ~60줄
```

### 3.5 매물 상세 (현재 B- → 목표 A)
```
[파일] app/(main)/listings/[id]/page.tsx

1. 사이드바 → 하단 고정 액션바 (이미 일부 구현)
   - 보강: [관심❤️] [입찰] [분석] [공유] 4버튼

2. 7탭 → 섹션 스크롤
   - md 이하: 탭 대신 세로 섹션 + 상단 점프 드롭다운

3. 금액 그리드
   - 모바일: 2×2 (4항목)
   - 데스크탑: 1×4

예상 추가 코드: ~50줄
```

### 3.6 통계 대시보드 (현재 D → 목표 B+)
```
[파일] app/(main)/statistics/page.tsx

1. KPI 카드
   - 모바일: 2×3 그리드
   - 데스크탑: 1×6
   코드: className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6"

2. 차트 스택
   - 모바일: 세로 1컬럼
   - 데스크탑: 2컬럼

3. 테이블 → 카드 (모바일)

예상 추가 코드: ~40줄
```

### 3.7 입찰 등록 위자드 (현재 D → 목표 A-)
```
[파일] app/(main)/market/bidding/new/page.tsx

1. 스텝 인디케이터
   - 모바일: "Step 2/4" 텍스트 + 프로그레스바
   - 데스크탑: 4단계 가로 인디케이터

2. 폼 레이아웃
   - 모바일: 단일 컬럼
   - 데스크탑: 2컬럼 그리드

3. 요약 카드 (Step 4)
   - 모바일: 아코디언으로 접기

예상 추가 코드: ~40줄
```

### 3.8 입찰 목록 (현재 C+ → 목표 A-)
```
[파일] app/(main)/market/bidding/page.tsx

1. 카드/테이블 자동 전환 (일부 구현)
   - 모바일: 카드만 표시 강화
   - KPI: 2×2 그리드

2. 입찰 모달 최적화
   - 모바일: 전체화면 Sheet

예상 추가 코드: ~30줄
```

---

## 4. PWA (Progressive Web App) 구현

### 4.1 PWA 설정
```
[파일] public/manifest.json (신규)

{
  "name": "NPLatform - NPL 투자 분석 플랫폼",
  "short_name": "NPLatform",
  "description": "AI 기반 NPL 투자 분석 및 거래 플랫폼",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFFFF",
  "theme_color": "#1B3A5C",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "screenshots": [
    { "src": "/screenshots/mobile.png", "sizes": "390x844", "type": "image/png", "form_factor": "narrow" },
    { "src": "/screenshots/desktop.png", "sizes": "1280x800", "type": "image/png", "form_factor": "wide" }
  ]
}
```

### 4.2 Service Worker
```
[파일] next.config.mjs 수정

next-pwa 패키지 설치 후:
  const withPWA = require('next-pwa')({ dest: 'public', disable: process.env.NODE_ENV === 'development' })
  module.exports = withPWA(nextConfig)

캐시 전략:
  Static assets: Cache First (CSS, JS, fonts, icons)
  API calls: Network First (데이터 항상 최신)
  Images: Stale While Revalidate
  시뮬레이터: Cache Only (오프라인 동작)
```

### 4.3 앱 설치 프롬프트
```
[파일] components/pwa/install-prompt.tsx (신규)

기능:
  - beforeinstallprompt 이벤트 감지
  - "홈 화면에 추가" 배너 표시 (첫 방문 후 2번째 방문 시)
  - iOS: "공유 → 홈 화면에 추가" 안내 모달
  - 설치 후 배너 숨김 (localStorage)
```

### 4.4 오프라인 지원
```
오프라인에서 동작하는 기능:
  ✅ 시뮬레이터 (계산 로직 클라이언트)
  ✅ 관심매물 목록 (IndexedDB 캐시)
  ✅ 최근 분석 결과 (캐시)
  ✅ 용어 사전 (정적 데이터)

오프라인 불가 (네트워크 필요):
  ❌ 검색 (API 필수)
  ❌ 입찰 (실시간)
  ❌ 딜룸 (메시지)
  ❌ 지도 (타일 로딩)

오프라인 감지:
  [파일] components/layout/offline-banner.tsx
  - navigator.onLine 감지
  - "오프라인 모드입니다" 배너
  - 제한된 기능 안내
```

---

## 5. 글로벌 모바일 컴포넌트

### 5.1 반응형 테이블 컴포넌트
```
[파일] components/ui/responsive-table.tsx (신규)

기능:
  - 데스크탑: 일반 Table
  - 모바일: 카드 리스트 자동 변환
  - props: columns, data, mobileCardRenderer

사용:
  <ResponsiveTable
    columns={[...]}
    data={items}
    mobileCard={(item) => <MobileCard {...item} />}
  />
```

### 5.2 모바일 시트 (Bottom Sheet)
```
[파일] components/ui/mobile-sheet.tsx (신규)

기능:
  - 바텀에서 올라오는 시트
  - 스냅 포인트 (30%, 60%, 90%)
  - 드래그로 높이 조절
  - 배경 터치 시 닫기

사용:
  <MobileSheet snapPoints={[0.3, 0.6]}>
    <FilterPanel />
  </MobileSheet>
```

### 5.3 터치 스와이프 네비게이션
```
[파일] components/ui/swipe-tabs.tsx (신규)

기능:
  - 탭 콘텐츠 좌우 스와이프로 전환
  - 터치 시작/이동/끝 이벤트 처리
  - 50px 이상 스와이프 시 탭 변경

사용:
  <SwipeTabs tabs={['개요', '채권', '담보']} activeTab={tab}>
    {tabContent}
  </SwipeTabs>
```

### 5.4 플로팅 액션 버튼
```
[파일] components/ui/fab.tsx (신규)

기능:
  - 화면 우하단 고정 (bottom-20, 탭바 위)
  - 단일 액션 또는 확장 메뉴
  - 스크롤 시 축소/확대

사용:
  <FAB icon={<Plus />} onClick={handleNew} />
  <FAB.Group>
    <FAB.Item icon={<Search />} label="검색" />
    <FAB.Item icon={<Plus />} label="등록" />
  </FAB.Group>
```

### 5.5 풀투리프레시
```
[파일] components/ui/pull-to-refresh.tsx (신규)

기능:
  - 아래로 당기면 새로고침
  - 스피너 + "새로고침 중..." 텍스트
  - 커스텀 onRefresh 콜백

사용:
  <PullToRefresh onRefresh={fetchData}>
    <ListContent />
  </PullToRefresh>
```

---

## 6. 다크모드 구현

### 6.1 설정
```
[파일] tailwind.config.js
  darkMode: 'class'

[파일] components/layout/theme-provider.tsx (신규)
  next-themes ThemeProvider 래핑

[파일] components/layout/theme-toggle.tsx (신규)
  Sun/Moon 아이콘 토글 버튼
  시스템 설정 자동 감지 옵션
```

### 6.2 색상 매핑
```
Light                     Dark
bg-white             →   bg-gray-950 (dark:bg-gray-950)
bg-gray-50           →   bg-gray-900
bg-gray-100          →   bg-gray-800
text-gray-900        →   text-gray-50
text-gray-500        →   text-gray-400
border-gray-200      →   border-gray-700
#1B3A5C (primary)    →   #4B8BC9
#10B981 (accent)     →   #34D399

차트:
  그리드선: gray-200 → gray-700
  배경: white → gray-900
  텍스트: gray-600 → gray-400
```

---

## 7. 구체적 개발 계획 (Phase + 파일 + 예상 시간)

### Phase M1: 핵심 인프라 (1시간)
```
작업:
  1. viewport 메타태그 추가 (app/layout.tsx)
  2. PWA manifest 생성 (public/manifest.json)
  3. 앱 아이콘 생성 (public/icons/)
  4. next-pwa 설치 및 설정
  5. 오프라인 배너 컴포넌트
  6. 다크모드 ThemeProvider + toggle
  7. globals.css 모바일 유틸리티 추가

파일:
  수정: app/layout.tsx, next.config.mjs, tailwind.config.js, app/globals.css
  생성: public/manifest.json, components/layout/theme-provider.tsx,
        components/layout/theme-toggle.tsx, components/pwa/install-prompt.tsx,
        components/layout/offline-banner.tsx
```

### Phase M2: 공용 모바일 컴포넌트 (1시간)
```
작업:
  1. ResponsiveTable 컴포넌트
  2. MobileSheet (바텀시트)
  3. SwipeTabs
  4. FloatingActionButton
  5. PullToRefresh

파일 (모두 신규):
  components/ui/responsive-table.tsx
  components/ui/mobile-sheet.tsx
  components/ui/swipe-tabs.tsx
  components/ui/fab.tsx
  components/ui/pull-to-refresh.tsx
```

### Phase M3: 검색 페이지 모바일 (1시간)
```
작업:
  1. 테이블→카드 자동 전환 (md 이하 카드)
  2. 탭 가로 스크롤
  3. 필터 바텀시트
  4. 검색바 sticky
  5. 더보기 버튼 (모바일 페이지네이션)

파일: app/(main)/market/search/page.tsx
예상 변경: +150줄
```

### Phase M4: 시뮬레이터 모바일 (1시간)
```
작업:
  1. 3탭 모드 (입력/결과/분석)
  2. 입력폼 아코디언
  3. 차트 세로 최적화
  4. 결과 카드 변환
  5. 플로팅 계산 버튼

파일: app/(main)/tools/auction-simulator/page.tsx
예상 변경: +120줄
```

### Phase M5: 지도/분석/상세/통계 모바일 (1.5시간)
```
작업 (4개 페이지):
  지도: 전체화면 + 바텀시트 + 칩 필터
  분석: 탭 스크롤 + 차트 반응형 + 하단 액션바
  상세: 하단 액션바 강화 + 섹션 스크롤
  통계: KPI 2×3 + 차트 스택

파일:
  app/(main)/market/map/map-client.tsx (+80줄)
  app/(main)/npl-analysis/[id]/page.tsx (+60줄)
  app/(main)/listings/[id]/page.tsx (+50줄)
  app/(main)/statistics/page.tsx (+40줄)
```

### Phase M6: 나머지 페이지 + 입찰/딜룸/관리자 (1.5시간)
```
작업:
  입찰 목록: 카드 강화 + 모달→Sheet
  입찰 등록: 스텝 반응형 + 폼 단일컬럼
  입찰 상세: 2컬럼→스택
  딜룸: 전체화면 채팅
  관리자: 테이블→카드
  파트너: 폼 반응형

파일: 8개 page.tsx 수정
```

### Phase M7: 테스트 + 최적화 (1시간)
```
작업:
  1. 크롬 DevTools 모바일 시뮬레이션 테스트 (iPhone SE, iPhone 14, Pixel 7)
  2. 실제 모바일 디바이스 테스트
  3. Lighthouse 모바일 점수 측정 → 90+ 목표
  4. 터치 타겟 크기 검증 (44px 미만 수정)
  5. Safe area 테스트 (노치, 홈바)
  6. 키보드 오버랩 테스트
  7. 가로/세로 전환 테스트
```

---

## 8. 총 개발량 요약

| Phase | 내용 | 신규 파일 | 수정 파일 | 추가 코드 | 시간 |
|-------|------|----------|----------|----------|------|
| M1 | 인프라 (PWA/다크모드) | 6 | 4 | ~200줄 | 1h |
| M2 | 공용 모바일 컴포넌트 | 5 | 0 | ~400줄 | 1h |
| M3 | 검색 모바일 | 0 | 1 | ~150줄 | 1h |
| M4 | 시뮬레이터 모바일 | 0 | 1 | ~120줄 | 1h |
| M5 | 지도/분석/상세/통계 | 0 | 4 | ~230줄 | 1.5h |
| M6 | 나머지 페이지 | 0 | 8 | ~200줄 | 1.5h |
| M7 | 테스트/최적화 | 0 | 다수 | ~100줄 | 1h |
| **합계** | | **11** | **18+** | **~1,400줄** | **8h** |

---

## 9. 완료 후 예상 결과

### Before vs After
| 항목 | Before | After |
|------|--------|-------|
| 모바일 사용 가능 페이지 | ~40% | **100%** |
| PWA 설치 | 불가 | **가능** |
| 오프라인 | 불가 | **시뮬레이터/관심매물** |
| 다크모드 | 없음 | **전체 앱** |
| 터치 최적화 | 부분 | **전체** |
| Lighthouse 모바일 | ~60 | **90+** |
| 반응형 코드 | 429개 | **800+개** |

---

*NPLatform 모바일 반응형 웹앱 최종 개발 계획*
*"데스크탑에서 설계하되, 모바일에서 완성되는 플랫폼"*
*작성일: 2026-03-20*
