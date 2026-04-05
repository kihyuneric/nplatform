const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, LevelFormat, TableOfContents } = require("docx");

const C = { navy: "1B3A5C", blue: "2E75B6", accent: "10B981", bg: "F0F5FA", white: "FFFFFF", black: "1A1A1A", gray: "6B7280", lightGray: "E5E7EB", red: "EF4444", purple: "7C3AED" };
const bdr = (c = C.lightGray) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = { top: bdr(), bottom: bdr(), left: bdr(), right: bdr() };
const cellM = { top: 80, bottom: 80, left: 120, right: 120 };

const heading = (t, l = HeadingLevel.HEADING_1) => new Paragraph({ heading: l, children: [new TextRun(t)] });
const p = (text, opts = {}) => new Paragraph({ spacing: { after: 120 }, ...opts, children: Array.isArray(text) ? text : [new TextRun({ text, font: "Arial", size: 22 })] });
const bold = (t) => new TextRun({ text: t, bold: true, font: "Arial", size: 22 });
const run = (t, o = {}) => new TextRun({ text: t, font: "Arial", size: 22, ...o });

const headerCell = (text, w) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA }, margins: cellM,
  shading: { fill: C.navy, type: ShadingType.CLEAR }, verticalAlign: "center",
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: C.white, font: "Arial", size: 20 })] })]
});
const cell = (text, w, o = {}) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA }, margins: cellM,
  shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined,
  children: [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(text), font: "Arial", size: 20, ...o })] })]
});
const makeTable = (headers, rows, cw) => {
  const total = cw.reduce((a, b) => a + b, 0);
  return new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: cw,
    rows: [new TableRow({ children: headers.map((h, i) => headerCell(h, cw[i])) }),
      ...rows.map(r => new TableRow({ children: r.map((c, i) => cell(typeof c === "object" ? c.text : c, cw[i], typeof c === "object" ? c : {})) }))]
  });
};

const numbering = { config: [
  { reference: "bullets", levels: [
    { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
    { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
  ]},
  { reference: "numbers", levels: [
    { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
  ]},
]};
const bullet = (t, l = 0) => new Paragraph({ numbering: { reference: "bullets", level: l }, spacing: { after: 60 }, children: [run(t)] });
const numItem = (t) => new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const code = (t) => new Paragraph({ spacing: { after: 80 }, shading: { fill: "F3F4F6", type: ShadingType.CLEAR }, children: [new TextRun({ text: t, font: "Consolas", size: 18 })] });

// ══════════════════════════════════════════════════════════════
const children = [];

// COVER
children.push(new Paragraph({ spacing: { before: 3000 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NPLATFORM", font: "Arial", size: 72, bold: true, color: C.navy })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Module 2", font: "Arial", size: 48, color: C.blue })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NPL 검색/목록/지도 세부 기획서", font: "Arial", size: 32, color: C.gray })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 1 } }, children: [] }));
children.push(new Paragraph({ spacing: { before: 400 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Version 2.0 | 2026.03.13", { color: C.gray })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [run("Figma: Search(1526-66057), List(5-6340), Map(301-5104)", { color: C.gray, size: 20 })] }));
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(heading("목차"));
children.push(new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 1. 모듈 개요 ═══
children.push(heading("1. 모듈 개요"));
children.push(heading("1.1 목적 및 범위", HeadingLevel.HEADING_2));
children.push(p([run("NPL 검색/목록/지도 모듈은 투자자가 원하는 부실채권을 가장 빠르고 정확하게 찾을 수 있도록 하는 핵심 탐색 모듈입니다. "), run("'여기오면 부실채권을 다 찾을 수 있다'는 신뢰를 주는 통합 검색 경험을 제공합니다.")]));

children.push(heading("1.2 담당 라우트", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["라우트", "페이지명", "접근 권한", "설명"],
  [
    ["/listings", "매물 목록", "Public", "3대 마켓 통합 매물 리스트 (필터/정렬)"],
    ["/listings/search", "통합 검색", "Public", "풀텍스트 검색 + 고급 필터"],
    ["/listings/map", "지도 탐색", "Public", "Kakao Maps 기반 지도 뷰 + 클러스터링"],
    ["/listings?type=DISTRESSED_SALE", "급매 목록", "Public", "급매 부동산 필터 적용"],
    ["/listings?type=AUCTION_NPL", "경매/공매 목록", "Public", "경매/공매 NPL 필터 적용"],
    ["/listings?type=NON_AUCTION_NPL", "비경매 목록", "Public", "비경매 NPL 필터 적용"],
  ],
  [2500, 1500, 1200, 4160]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("1.3 Figma 디자인 매핑", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["Figma 프레임", "Node ID", "매핑 페이지", "핵심 디자인 요소"],
  [
    ["NPL 검색 Search", "1526-66057", "/listings/search", "검색바 중앙, 필터 사이드바, 자동완성 드롭다운"],
    ["NPL 목록 List", "5-6340", "/listings", "4-Column 카드그리드, 탭필터, 페이지네이션"],
    ["지도 Map", "301-5104", "/listings/map", "좌측 리스트 패널 + 우측 지도, 마커 클러스터"],
  ],
  [2000, 1200, 1800, 4360]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 2. 통합 검색 시스템 ═══
children.push(heading("2. 통합 검색 시스템"));

children.push(heading("2.1 검색 아키텍처", HeadingLevel.HEADING_2));
children.push(p([run("PostgreSQL pg_trgm 확장과 GIN 인덱스를 활용한 퍼지 검색 + 정확한 필터링을 결합합니다.")]));
children.push(makeTable(
  ["검색 유형", "기술", "대상 필드", "성능 목표"],
  [
    ["풀텍스트 검색", "pg_trgm GIN index + ILIKE", "title, address, description, auction_case_number", "< 100ms (P95)"],
    ["필터 검색", "WHERE 절 조합", "listing_type, collateral_type, region, status", "< 50ms"],
    ["범위 검색", "BETWEEN", "appraisal_amount, discount_rate, auction_date", "< 80ms"],
    ["지역 검색", "PostGIS ST_Within", "latitude, longitude (지도 뷰포트)", "< 150ms"],
    ["자동완성", "pg_trgm similarity()", "title, address + regions", "< 50ms"],
  ],
  [1500, 2200, 3000, 2660]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("2.2 검색 필터 체계", HeadingLevel.HEADING_2));
children.push(heading("2.2.1 1차 필터: 마켓 유형 (listing_type)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["필터값", "라벨", "설명", "URL Param"],
  [
    ["ALL", "전체", "3대 마켓 통합 조회", "type=all (기본값)"],
    ["DISTRESSED_SALE", "급매 마켓", "채무자 부동산 급매", "type=DISTRESSED_SALE"],
    ["AUCTION_NPL", "경매/공매 NPL", "경매·공매 진행중 NPL", "type=AUCTION_NPL"],
    ["NON_AUCTION_NPL", "비경매 NPL", "직거래 부실채권", "type=NON_AUCTION_NPL"],
  ],
  [2000, 1500, 2500, 3360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("2.2.2 2차 필터: 담보유형 (collateral_type)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["값", "라벨", "아이콘"],
  [
    ["APT", "아파트", "🏢"],
    ["OFFICETEL", "오피스텔", "🏬"],
    ["COMMERCIAL", "상가", "🏪"],
    ["LAND", "토지", "🌍"],
    ["BUILDING", "빌딩/건물", "🏗️"],
    ["VILLA", "빌라/다세대", "🏠"],
    ["FACTORY", "공장/창고", "🏭"],
    ["OTHER", "기타", "📦"],
  ],
  [2000, 2000, 5360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("2.2.3 3차 필터: 지역 (region)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["시/도", "코드", "하위 시/군/구 필터"],
  [
    ["서울특별시", "SEOUL", "강남구, 서초구, 송파구, 강동구, 마포구 등 25개 구"],
    ["경기도", "GYEONGGI", "수원시, 성남시, 용인시, 고양시, 부천시 등 31개 시/군"],
    ["인천광역시", "INCHEON", "남동구, 부평구, 서구, 연수구 등 10개 구/군"],
    ["부산광역시", "BUSAN", "해운대구, 부산진구, 동래구 등 16개 구/군"],
    ["대구광역시", "DAEGU", "수성구, 달서구, 북구 등 8개 구/군"],
    ["대전광역시", "DAEJEON", "유성구, 서구, 중구 등 5개 구"],
    ["광주광역시", "GWANGJU", "북구, 서구, 남구 등 5개 구"],
    ["울산광역시", "ULSAN", "남구, 중구, 북구, 울주군 등 5개 구/군"],
    ["세종특별자치시", "SEJONG", "세종시 전역"],
    ["강원특별자치도", "GANGWON", "춘천시, 원주시, 강릉시 등 18개 시/군"],
    ["충청북도", "CHUNGBUK", "청주시, 충주시, 제천시 등 11개 시/군"],
    ["충청남도", "CHUNGNAM", "천안시, 아산시, 서산시 등 15개 시/군"],
    ["전라북도", "JEONBUK", "전주시, 익산시, 군산시 등 14개 시/군"],
    ["전라남도", "JEONNAM", "여수시, 순천시, 목포시 등 22개 시/군"],
    ["경상북도", "GYEONGBUK", "포항시, 경주시, 구미시 등 23개 시/군"],
    ["경상남도", "GYEONGNAM", "창원시, 김해시, 진주시 등 18개 시/군"],
    ["제주특별자치도", "JEJU", "제주시, 서귀포시"],
  ],
  [2000, 1500, 5860]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("2.2.4 4차 필터: 금액/할인/기간", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["필터", "타입", "범위", "UI 컴포넌트", "URL Param"],
  [
    ["감정가/채권액", "Range Slider", "1천만 ~ 100억+", "Dual Thumb Slider + 직접 입력", "min_amount=&max_amount="],
    ["할인율", "Range Slider", "0% ~ 80%", "Dual Thumb Slider", "min_discount=&max_discount="],
    ["경매일", "Date Range", "오늘 ~ 6개월 후", "Date Picker (시작~종료)", "auction_from=&auction_to="],
    ["등록일", "Date Range", "최근 1일/7일/30일/전체", "Button Group (4옵션)", "registered=1d|7d|30d|all"],
    ["경매 회차", "Select", "1회 ~ 6회+", "Dropdown / Checkbox", "min_round=&max_round="],
    ["낙찰가율 (AI)", "Range Slider", "30% ~ 120%", "Dual Thumb Slider", "min_rate=&max_rate="],
  ],
  [1500, 1200, 1500, 2500, 2660]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(heading("2.3 검색 필터 UI", HeadingLevel.HEADING_2));
children.push(heading("2.3.1 Desktop: 좌측 사이드바 필터", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["속성", "값"],
  [
    ["위치", "좌측 고정, width: 280px"],
    ["배경", "White, border-right: 1px solid #E5E7EB"],
    ["패딩", "padding: 24px"],
    ["필터 그룹", "아코디언 형태 (접기/펼치기, 기본: 전체 펼침)"],
    ["필터 순서", "마켓유형 → 담보유형 → 지역 → 금액범위 → 경매일/등록일 → 정렬"],
    ["적용 방식", "즉시 적용 (필터 변경 시 URL 업데이트 + API 재호출)"],
    ["초기화", "'필터 초기화' 버튼 (하단 고정)"],
    ["필터 카운트", "상단에 '현재 N개 필터 적용중' 표시"],
    ["스크롤", "사이드바 내부 스크롤 (sticky header)"],
  ],
  [2000, 7360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("2.3.2 Mobile: 하단 시트 필터", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["속성", "값"],
  [
    ["트리거", "'필터' 버튼 (검색바 우측, 아이콘+뱃지)"],
    ["동작", "하단에서 슬라이드업, height: 80vh"],
    ["오버레이", "반투명 배경 (클릭 시 닫기)"],
    ["헤더", "'필터' 타이틀 + 적용중 카운트 + X 닫기"],
    ["필터 그룹", "아코디언 형태 (Desktop과 동일)"],
    ["하단 바", "'초기화' (좌) + '결과 N건 보기' 버튼 (우, Primary)"],
    ["적용 방식", "'결과 보기' 클릭 시 일괄 적용 (모바일은 즉시적용 X)"],
  ],
  [2000, 7360]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(heading("2.4 검색 결과 정렬", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["정렬 옵션", "URL Param", "SQL ORDER BY", "기본값"],
  [
    ["최신 등록순", "sort=newest", "created_at DESC", "✓ (기본)"],
    ["감정가 낮은순", "sort=price_asc", "appraisal_amount ASC", ""],
    ["감정가 높은순", "sort=price_desc", "appraisal_amount DESC", ""],
    ["할인율 높은순", "sort=discount_desc", "discount_rate DESC NULLS LAST", ""],
    ["경매일 임박순", "sort=auction_date", "auction_date ASC (미래만)", "경매 마켓 기본"],
    ["AI 추정가 낮은순", "sort=ai_price_asc", "ai_estimated_price ASC", ""],
    ["AI 추천순", "sort=ai_recommended", "matching_score DESC", "로그인시"],
  ],
  [1800, 1800, 2800, 2960]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("2.5 자동완성 상세", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["속성", "상세"],
  [
    ["트리거", "검색 입력 2자 이상 + 300ms debounce"],
    ["API", "GET /api/search/autocomplete?q={query}&type={market}&limit=8"],
    ["결과 카테고리", "주소 (address), 지역명 (region), 사건번호 (case_number), 기관명 (institution)"],
    ["하이라이팅", "매칭 텍스트 <mark> 태그로 하이라이트 (Bold + Blue)"],
    ["키보드 네비", "↑↓ 방향키로 항목 이동, Enter로 선택, Esc로 닫기"],
    ["카테고리 아이콘", "📍주소, 🗺지역, ⚖사건번호, 🏛기관명"],
    ["최근 검색", "자동완성 결과 없을 때 → 최근 검색어 5개 표시 (localStorage)"],
    ["성능", "AbortController로 이전 요청 취소, 최신 요청만 반영"],
  ],
  [2000, 7360]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 3. 목록 페이지 ═══
children.push(heading("3. 목록(리스트) 페이지 상세"));

children.push(heading("3.1 리스트 뷰 레이아웃", HeadingLevel.HEADING_2));
children.push(heading("3.1.1 페이지 구조", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["영역", "Desktop (≥1280px)", "Tablet (768-1279px)", "Mobile (<768px)"],
  [
    ["상단 바", "검색바 + 마켓탭 + 결과수 + 정렬 + 뷰 토글", "검색바 + 필터버튼 + 정렬", "검색바 + 필터버튼"],
    ["좌측", "사이드바 필터 (280px)", "없음 (필터 → 모달)", "없음"],
    ["메인", "카드 그리드 (3col) 또는 리스트", "카드 그리드 (2col)", "카드 그리드 (1col)"],
    ["하단", "페이지네이션 (1,2,3...N)", "페이지네이션", "무한 스크롤"],
  ],
  [1500, 2800, 2200, 2860]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("3.1.2 뷰 전환: 그리드 vs 리스트", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["뷰 모드", "아이콘", "카드 레이아웃", "표시 정보"],
  [
    ["그리드 뷰 (기본)", "⊞ 4칸 아이콘", "세로형 카드 (이미지 상단)", "이미지, 제목, 주소, 가격, 할인율, 태그"],
    ["리스트 뷰", "☰ 목록 아이콘", "가로형 카드 (이미지 좌측)", "이미지(작게) + 제목/주소/가격/상세정보 가로 나열"],
  ],
  [1800, 1500, 2500, 3560]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(heading("3.2 마켓별 매물 카드 디자인", HeadingLevel.HEADING_2));

children.push(heading("3.2.1 급매 부동산 카드 (DISTRESSED_SALE)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["영역", "구성요소", "스타일/로직"],
  [
    ["뱃지", "'급매' 뱃지 (좌상단)", "Blue (#2E75B6) 배경, White 텍스트, border-radius: 4px"],
    ["할인율", "'시세대비 -32%' 표시 (우상단)", "Red (#EF4444) 배경, White, Bold, 16px"],
    ["이미지", "대표 이미지 (4:3)", "border-radius: 12px 12px 0 0"],
    ["제목", "물건명/단지명", "16px/Bold/Navy, 1줄 ellipsis"],
    ["주소", "시/구/동 (Teaser 수준)", "14px/Gray"],
    ["시세", "'시세 5.2억' (취소선)", "14px/Gray, text-decoration: line-through"],
    ["급매가", "'급매가 3.5억'", "20px/Bold/Blue"],
    ["AI가격", "'AI추정 3.8억'", "14px/Purple, AI 아이콘 접두"],
    ["태그", "담보유형 + 면적 + 지역", "12px, 회색 라운드 태그"],
    ["관심/비교", "하트 + 비교 아이콘", "우상단 오버레이"],
  ],
  [1200, 2800, 5360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("3.2.2 경매/공매 NPL 카드 (AUCTION_NPL)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["영역", "구성요소", "스타일/로직"],
  [
    ["뱃지", "'경매' 또는 '공매' 뱃지", "Purple (#7C3AED) 배경"],
    ["회차", "'3회차' 뱃지 (우상단)", "Orange 배경, 회차에 따라 색상 변화"],
    ["이미지", "대표 이미지 + 법원 로고 오버레이", ""],
    ["사건번호", "'2025타경12345'", "14px/Bold/Navy, 모노스페이스"],
    ["법원", "'서울중앙지방법원'", "12px/Gray"],
    ["경매일", "'2026.04.15 (D-33)'", "14px/Bold, D-day Red 강조"],
    ["감정가", "'감정 8.5억'", "14px/Gray"],
    ["최저가", "'최저 5.1억 (60%)'", "20px/Bold/Blue"],
    ["낙찰가율", "'AI추정 낙찰가율 78%'", "14px/Purple, 게이지 아이콘"],
    ["등기부", "'등기분석 완료' 또는 '등기분석 가능'", "Green/Blue 뱃지"],
    ["태그", "담보유형 + 면적 + 지역", ""],
  ],
  [1200, 2800, 5360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("3.2.3 비경매 NPL 카드 (NON_AUCTION_NPL)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["영역", "구성요소", "스타일/로직"],
  [
    ["뱃지", "'비경매 NPL' 뱃지", "Green (#10B981) 배경"],
    ["NDA뱃지", "'NDA 필요' 뱃지 (우상단)", "Navy 배경, 🔒 아이콘"],
    ["이미지", "대표 이미지 (NDA 전: 블러 오버레이)", "filter: blur(4px) for restricted"],
    ["제목", "채권 요약 (Teaser)", "16px/Bold/Navy"],
    ["기관명", "매각 금융기관명", "14px/Blue, 기관 인증 뱃지"],
    ["채권액", "'채권원금 12.5억'", "20px/Bold/Navy"],
    ["담보비율", "'담보비율 65%'", "14px, 색상 코드(높으면 Green, 낮으면 Red)"],
    ["매각방식", "'상대매각' 또는 '공개매각'", "12px 뱃지"],
    ["관심기관수", "'12개 기관 관심중'", "14px/Gray, 인기도 표시"],
    ["태그", "채권유형 + 담보유형 + 지역", ""],
  ],
  [1200, 2800, 5360]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(heading("3.3 페이지네이션", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["플랫폼", "방식", "구현", "UX"],
  [
    ["Desktop", "전통 페이지네이션", "cursor-based, 20건/페이지", "< 1 2 3 ... 10 > + 페이지 직접 입력"],
    ["Tablet", "전통 페이지네이션", "cursor-based, 12건/페이지", "< 1 2 3 > 간소화"],
    ["Mobile", "무한 스크롤", "Intersection Observer + 추가 로드", "스크롤 하단 도달 시 자동 로드 + 스피너"],
  ],
  [1200, 2000, 2800, 3360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(p([bold("Cursor-based Pagination 구현:")]));
children.push(code("GET /api/listings?cursor={lastId}&limit=20&sort=newest&type=AUCTION_NPL"));
children.push(code("Response: { listings: [...], nextCursor: 'uuid', hasMore: true, total: 1234 }"));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("3.4 빈 상태 / 로딩 상태", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["상태", "UI 표시", "추가 동작"],
  [
    ["초기 로딩", "Skeleton 카드 (8개) - 회색 펄스 애니메이션", "없음"],
    ["추가 로딩", "리스트 하단 스피너 (무한스크롤)", "없음"],
    ["결과 0건", "'검색 결과가 없습니다' 일러스트 + 메시지", "필터 초기화 CTA + 유사 검색어 제안"],
    ["에러", "'매물을 불러오지 못했습니다' + 재시도 버튼", "3회 자동 재시도 후 에러 표시"],
    ["오프라인", "'인터넷 연결을 확인하세요' 배너", "재연결 시 자동 리로드"],
  ],
  [1500, 3500, 4360]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 4. 지도 페이지 ═══
children.push(heading("4. 지도 페이지 상세"));

children.push(heading("4.1 지도 API 및 기술 스택", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["항목", "선택", "사유"],
  [
    ["지도 SDK", "Kakao Maps SDK v2", "한국 지번/도로명 주소 최적화, 무료 티어 충분"],
    ["클러스터링", "MarkerClusterer (Kakao)", "줌 레벨별 자동 클러스터링"],
    ["지오코딩", "Kakao 주소검색 API", "주소 → 좌표 변환"],
    ["역지오코딩", "Kakao Geocoder", "좌표 → 주소 변환 (지도 클릭 시)"],
    ["히트맵", "D3.js + Canvas", "지역별 매물 밀집도 시각화"],
    ["성능", "requestAnimationFrame + Web Worker", "대량 마커 렌더링 최적화"],
  ],
  [1800, 2500, 5060]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("4.2 지도 레이아웃", HeadingLevel.HEADING_2));
children.push(heading("4.2.1 Desktop 레이아웃", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["영역", "위치", "크기", "내용"],
  [
    ["좌측 패널", "왼쪽 고정", "width: 400px", "필터바 + 매물 리스트 (지도 연동)"],
    ["지도 영역", "우측", "나머지 전체", "Kakao Map + 마커 + 클러스터"],
    ["필터 오버레이", "지도 상단", "auto width", "마켓탭 + 빠른필터 (담보유형/금액)"],
    ["줌 컨트롤", "지도 우측", "고정", "+/- 버튼, 현재 위치, 줌 레벨 표시"],
  ],
  [1500, 1200, 1500, 5160]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("4.2.2 Mobile 레이아웃", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["상태", "레이아웃", "전환"],
  [
    ["기본", "지도 풀스크린 + 하단 핸들바 (미니 리스트)", ""],
    ["리스트 확장", "하단 시트 50% 높이 (스와이프업)", "핸들바 스와이프업"],
    ["리스트 풀", "하단 시트 85% 높이", "추가 스와이프업"],
    ["매물 상세 프리뷰", "하단 시트에 카드 표시 (마커 클릭 시)", "마커 클릭"],
  ],
  [1500, 3800, 4060]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(heading("4.3 마커 시스템", HeadingLevel.HEADING_2));
children.push(heading("4.3.1 마커 디자인 (마켓별 차별화)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["마켓", "마커 색상", "마커 형태", "라벨"],
  [
    ["급매 부동산", "Blue (#2E75B6)", "원형 핀 + 금액 라벨", "'3.5억' (감정가/급매가)"],
    ["경매/공매 NPL", "Purple (#7C3AED)", "사각 핀 + 금액 라벨", "'5.1억' (최저매각가)"],
    ["비경매 NPL", "Green (#10B981)", "다이아몬드 핀 + 금액 라벨", "'12.5억' (채권액)"],
  ],
  [1800, 1800, 2500, 3260]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("4.3.2 클러스터링 전략", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["줌 레벨", "클러스터 반경", "표시 방식", "예시"],
  [
    ["6 이하 (전국)", "200px", "지역명 + 총 매물수 원형", "'서울 1,234건'"],
    ["7-9 (시/도)", "100px", "구/군명 + 매물수 원형", "'강남구 89건'"],
    ["10-12 (구/군)", "60px", "숫자 클러스터", "'23' (원형, 크기 비례)"],
    ["13-14 (동)", "40px", "개별 마커 + 소규모 클러스터", "마커 겹침 시만 클러스터"],
    ["15+ (상세)", "없음", "개별 마커 전체 표시", "각 매물 개별 핀"],
  ],
  [1500, 1200, 2800, 3860]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("4.3.3 마커 인터랙션", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["인터랙션", "동작", "결과"],
  [
    ["클러스터 클릭", "해당 클러스터 영역으로 줌인", "하위 클러스터 또는 개별 마커 표시"],
    ["개별 마커 클릭", "인포윈도우 표시 + 좌측 패널 스크롤", "매물 요약 팝업 (이미지+가격+CTA)"],
    ["마커 호버", "마커 확대 (1.2배) + 그림자", "시각적 피드백"],
    ["좌측 패널 호버", "해당 마커 하이라이트 (bounce)", "지도↔리스트 연동"],
    ["지도 드래그/줌", "새 뷰포트 내 매물 API 호출", "마커 갱신 (debounce 500ms)"],
  ],
  [1800, 3000, 4560]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

children.push(heading("4.4 인포윈도우 (마커 클릭 팝업)", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["영역", "내용", "스타일"],
  [
    ["이미지", "썸네일 (80×60px)", "좌측, border-radius: 8px"],
    ["마켓 뱃지", "급매/경매/비경매", "이미지 위 오버레이"],
    ["제목", "물건명 (1줄)", "14px/Bold/Navy"],
    ["주소", "시/구/동", "12px/Gray"],
    ["가격", "주요 금액", "16px/Bold/Blue"],
    ["CTA", "'상세보기 →' 링크", "12px/Blue, 클릭 시 /listings/[id]"],
    ["닫기", "X 버튼", "우상단"],
  ],
  [1200, 3000, 5160]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("4.5 히트맵 뷰", HeadingLevel.HEADING_2));
children.push(bullet("토글: 지도 상단 '히트맵' 토글 버튼 (마커 뷰 ↔ 히트맵 뷰)"));
children.push(bullet("기술: D3.js로 Canvas 레이어 위에 히트맵 렌더링"));
children.push(bullet("데이터: 지역별 매물 밀집도 (매물 수 기반 가중치)"));
children.push(bullet("색상: Green(적음) → Yellow(보통) → Red(많음) 그라데이션"));
children.push(bullet("업데이트: 지도 뷰포트 변경 시 재계산 (debounce 1s)"));
children.push(bullet("범례: 우하단에 색상 범례 (매물 수 범위 표시)"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 5. 컴포넌트 트리 ═══
children.push(heading("5. 컴포넌트 트리 및 상태 관리"));

children.push(heading("5.1 검색/목록 컴포넌트 트리", HeadingLevel.HEADING_2));
children.push(code("app/(public)/listings/page.tsx"));
children.push(code("├── components/listings/ListingPageHeader.tsx"));
children.push(code("│   ├── SearchBar.tsx (통합 검색)"));
children.push(code("│   │   └── AutoComplete.tsx"));
children.push(code("│   ├── MarketTabs.tsx (전체/급매/경매/비경매)"));
children.push(code("│   ├── ResultCount.tsx"));
children.push(code("│   ├── SortDropdown.tsx"));
children.push(code("│   └── ViewToggle.tsx (그리드/리스트)"));
children.push(code("├── components/listings/FilterSidebar.tsx (Desktop)"));
children.push(code("│   ├── FilterGroup.tsx (아코디언)"));
children.push(code("│   ├── CollateralTypeFilter.tsx (체크박스)"));
children.push(code("│   ├── RegionFilter.tsx (시도→시군구 2단)"));
children.push(code("│   ├── PriceRangeSlider.tsx (Dual Thumb)"));
children.push(code("│   ├── DateRangeFilter.tsx"));
children.push(code("│   ├── AuctionRoundFilter.tsx"));
children.push(code("│   └── FilterResetButton.tsx"));
children.push(code("├── components/listings/FilterBottomSheet.tsx (Mobile)"));
children.push(code("├── components/listings/ListingGrid.tsx"));
children.push(code("│   ├── DistressedSaleCard.tsx"));
children.push(code("│   ├── AuctionNplCard.tsx"));
children.push(code("│   ├── NonAuctionNplCard.tsx"));
children.push(code("│   └── ListingCardSkeleton.tsx"));
children.push(code("├── components/listings/ListingListView.tsx"));
children.push(code("│   └── ListingListItem.tsx"));
children.push(code("├── components/listings/Pagination.tsx (Desktop)"));
children.push(code("├── components/listings/InfiniteScroll.tsx (Mobile)"));
children.push(code("└── components/listings/EmptyState.tsx"));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("5.2 지도 컴포넌트 트리", HeadingLevel.HEADING_2));
children.push(code("app/(public)/listings/map/page.tsx"));
children.push(code("├── components/map/MapContainer.tsx"));
children.push(code("│   ├── KakaoMap.tsx (지도 인스턴스)"));
children.push(code("│   ├── MarkerLayer.tsx"));
children.push(code("│   │   ├── ClusterMarker.tsx"));
children.push(code("│   │   └── ListingMarker.tsx (3종)"));
children.push(code("│   ├── InfoWindow.tsx"));
children.push(code("│   ├── HeatmapLayer.tsx (D3.js Canvas)"));
children.push(code("│   ├── MapControls.tsx (줌/위치/히트맵토글)"));
children.push(code("│   └── MapFilterOverlay.tsx"));
children.push(code("├── components/map/MapSidePanel.tsx (Desktop)"));
children.push(code("│   ├── MapSearchBar.tsx"));
children.push(code("│   └── MapListingList.tsx"));
children.push(code("│       └── MapListingCard.tsx (소형)"));
children.push(code("└── components/map/MapBottomSheet.tsx (Mobile)"));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("5.3 상태 관리", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["상태", "관리 방식", "스코프", "동기화"],
  [
    ["검색어", "URL searchParams", "글로벌", "브라우저 히스토리 연동"],
    ["필터 값", "URL searchParams + useSearchParams()", "페이지", "URL ↔ 필터 UI 양방향 동기화"],
    ["정렬", "URL searchParams", "페이지", "URL 변경 → API 재호출"],
    ["뷰 모드", "localStorage + local state", "페이지", "새로고침 시 유지"],
    ["매물 목록", "React Query (useInfiniteQuery)", "페이지", "URL 변경 시 refetch"],
    ["자동완성", "React Query (useQuery, gcTime: 5min)", "SearchBar", "검색어 변경 시 refetch"],
    ["지도 뷰포트", "Zustand (mapStore)", "Map 페이지", "드래그/줌 시 업데이트"],
    ["지도 매물", "React Query (bounds 기반)", "Map 페이지", "뷰포트 변경 시 refetch"],
    ["선택 마커", "Zustand (mapStore.selectedId)", "Map", "마커 클릭 ↔ 패널 스크롤"],
    ["관심 매물", "React Query (mutation + optimistic)", "글로벌", "하트 클릭 시"],
  ],
  [1500, 2500, 1500, 3860]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 6. API 엔드포인트 ═══
children.push(heading("6. API 엔드포인트 상세"));

children.push(heading("6.1 GET /api/listings", HeadingLevel.HEADING_2));
children.push(p([bold("매물 목록 조회 (필터 + 정렬 + 페이지네이션)")]));
children.push(makeTable(
  ["항목", "상세"],
  [
    ["Method", "GET"],
    ["Auth", "Public (비로그인 가능)"],
    ["Query Params", "type, collateral_type, region, sub_region, min_amount, max_amount, min_discount, max_discount, auction_from, auction_to, registered, min_round, max_round, sort, cursor, limit, q"],
    ["Cache", "public, s-maxage=30, stale-while-revalidate=120"],
    ["Response", "{ listings: ListingCard[], nextCursor: string|null, hasMore: boolean, total: number, filters: { applied: string[], available: FilterOptions } }"],
    ["Rate Limit", "IP당 60 req/min"],
    ["성능", "< 200ms (P95), compound index on (listing_type, status, created_at)"],
  ],
  [1500, 7860]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("6.2 GET /api/listings/map", HeadingLevel.HEADING_2));
children.push(p([bold("지도 뷰포트 내 매물 조회")]));
children.push(makeTable(
  ["항목", "상세"],
  [
    ["Method", "GET"],
    ["Query Params", "sw_lat, sw_lng, ne_lat, ne_lng (뷰포트 좌표), type, collateral_type, zoom_level, limit"],
    ["Auth", "Public"],
    ["Response (zoom≤12)", "{ clusters: Array<{ lat, lng, count, types: {DISTRESSED: n, AUCTION: n, NON_AUCTION: n} }> }"],
    ["Response (zoom≥13)", "{ listings: Array<{ id, lat, lng, listing_type, title, price, collateral_type }>, total }"],
    ["성능", "PostGIS spatial index, < 150ms"],
    ["DB Query", "SELECT * FROM npl_listings WHERE ST_Within(geom, ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326))"],
  ],
  [1500, 7860]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("6.3 ListingCard TypeScript 인터페이스", HeadingLevel.HEADING_2));
children.push(code("interface ListingCard {"));
children.push(code("  id: string;"));
children.push(code("  listing_type: 'DISTRESSED_SALE' | 'AUCTION_NPL' | 'NON_AUCTION_NPL';"));
children.push(code("  title: string;"));
children.push(code("  address_summary: string; // '서울 강남구 역삼동' (Teaser)"));
children.push(code("  collateral_type: string;"));
children.push(code("  appraisal_amount: number;"));
children.push(code("  minimum_bid_amount?: number; // 경매: 최저매각가"));
children.push(code("  asking_price?: number; // 급매: 희망가"));
children.push(code("  bond_amount?: number; // 비경매: 채권원금"));
children.push(code("  discount_rate?: number;"));
children.push(code("  ai_estimated_price?: number;"));
children.push(code("  ai_winning_rate?: number;"));
children.push(code("  auction_date?: string; // ISO date"));
children.push(code("  auction_round?: number;"));
children.push(code("  auction_court?: string;"));
children.push(code("  auction_case_number?: string;"));
children.push(code("  images: string[]; // first is thumbnail"));
children.push(code("  region: string;"));
children.push(code("  land_area?: number;"));
children.push(code("  building_area?: number;"));
children.push(code("  is_favorited?: boolean; // 로그인 사용자만"));
children.push(code("  favorite_count: number;"));
children.push(code("  nda_required: boolean; // 비경매 NDA 필요 여부"));
children.push(code("  created_at: string;"));
children.push(code("}"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 7. DB 스키마 ═══
children.push(heading("7. DB 스키마 및 인덱스"));

children.push(heading("7.1 핵심 인덱스", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["인덱스명", "대상", "타입", "용도"],
  [
    ["idx_listings_type_status_created", "listing_type, status, created_at", "B-tree compound", "목록 조회 기본 정렬"],
    ["idx_listings_trgm_title", "title gin_trgm_ops", "GIN (pg_trgm)", "풀텍스트 퍼지 검색"],
    ["idx_listings_trgm_address", "address gin_trgm_ops", "GIN (pg_trgm)", "주소 검색"],
    ["idx_listings_geom", "ST_Point(longitude, latitude)", "GIST (PostGIS)", "지도 뷰포트 쿼리"],
    ["idx_listings_collateral_region", "collateral_type, region", "B-tree compound", "필터 조합 검색"],
    ["idx_listings_appraisal", "appraisal_amount", "B-tree", "금액 범위 검색"],
    ["idx_listings_auction_date", "auction_date", "B-tree", "경매일 정렬/필터"],
    ["idx_favorites_user", "user_id, listing_id", "B-tree unique", "관심 매물 조회"],
  ],
  [2500, 2500, 1800, 2560]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("7.2 PostGIS 설정", HeadingLevel.HEADING_2));
children.push(code("-- PostGIS 확장 활성화"));
children.push(code("CREATE EXTENSION IF NOT EXISTS postgis;"));
children.push(code(""));
children.push(code("-- 좌표 컬럼 추가 (npl_listings에 이미 lat/lng 있으므로 geometry 컬럼 추가)"));
children.push(code("ALTER TABLE npl_listings ADD COLUMN geom geometry(Point, 4326);"));
children.push(code(""));
children.push(code("-- 기존 lat/lng → geom 변환"));
children.push(code("UPDATE npl_listings SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)"));
children.push(code("WHERE latitude IS NOT NULL AND longitude IS NOT NULL;"));
children.push(code(""));
children.push(code("-- GIST 인덱스"));
children.push(code("CREATE INDEX idx_listings_geom ON npl_listings USING GIST(geom);"));
children.push(code(""));
children.push(code("-- 트리거: lat/lng 변경 시 geom 자동 업데이트"));
children.push(code("CREATE OR REPLACE FUNCTION update_geom() RETURNS trigger AS $$"));
children.push(code("BEGIN"));
children.push(code("  NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);"));
children.push(code("  RETURN NEW;"));
children.push(code("END; $$ LANGUAGE plpgsql;"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 8. 사용자 플로우 ═══
children.push(heading("8. 사용자 플로우"));

children.push(heading("8.1 투자자 검색 → 상세 플로우", HeadingLevel.HEADING_2));
children.push(numItem("홈페이지 Hero 검색바 또는 GNB 메가메뉴에서 진입"));
children.push(numItem("마켓 탭 선택 (급매/경매/비경매 또는 전체)"));
children.push(numItem("좌측 필터로 담보유형, 지역, 금액 범위 설정"));
children.push(numItem("그리드 뷰에서 카드 탐색 → 관심 매물 하트 클릭"));
children.push(numItem("카드 클릭 → /listings/[id] 상세 페이지 이동"));
children.push(numItem("(비로그인 시) Teaser 정보만 확인 가능 → 로그인 유도"));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("8.2 지도 탐색 플로우", HeadingLevel.HEADING_2));
children.push(numItem("/listings/map 접근 (GNB '지도' 메뉴 또는 리스트의 '지도보기' 전환)"));
children.push(numItem("지도에서 관심 지역으로 드래그/줌"));
children.push(numItem("클러스터 클릭 → 줌인 → 개별 마커 표시"));
children.push(numItem("마커 클릭 → 인포윈도우 표시 + 좌측 패널 해당 매물 하이라이트"));
children.push(numItem("좌측 패널 매물 카드 클릭 → 상세 페이지 이동"));
children.push(numItem("(옵션) 히트맵 토글 → 매물 밀집 지역 시각 확인"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 9. 성능 최적화 ═══
children.push(heading("9. 성능 최적화"));

children.push(makeTable(
  ["항목", "전략", "기대 효과"],
  [
    ["목록 API", "cursor-based pagination + compound index", "일관된 < 200ms 응답"],
    ["지도 API", "PostGIS GIST index + 뷰포트 바운딩", "< 150ms, 대량 마커 지원"],
    ["이미지", "Next.js Image (WebP/AVIF) + blur placeholder", "LCP < 2.5s"],
    ["가상 스크롤", "react-virtual (목록 뷰 대량 데이터)", "DOM 노드 최소화"],
    ["필터 디바운스", "URL 업데이트 300ms debounce", "불필요한 API 호출 방지"],
    ["지도 디바운스", "드래그/줌 500ms debounce", "과도한 마커 API 호출 방지"],
    ["자동완성 캐시", "React Query gcTime: 5분", "동일 검색어 재요청 방지"],
    ["SSR", "Server Components for 초기 목록", "FCP < 1.8s, SEO 대응"],
    ["코드 스플릿", "지도 SDK dynamic import", "비지도 페이지 번들 경량화"],
    ["마커 풀링", "마커 객체 재사용 (Object Pool)", "GC 압박 감소"],
  ],
  [1500, 3500, 4360]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 10. 에러 처리 ═══
children.push(heading("10. 에러 처리 및 엣지 케이스"));

children.push(makeTable(
  ["시나리오", "처리", "UI"],
  [
    ["Kakao Maps SDK 로드 실패", "CDN fallback + 재시도 3회", "'지도를 불러올 수 없습니다' + 목록 뷰 전환 CTA"],
    ["GPS 위치 거부", "기본 위치(서울 시청) 사용", "'위치 권한이 필요합니다' 토스트"],
    ["필터 조합 0건", "필터 자동 완화 제안", "'서울+아파트+10억이하' → '서울+아파트' 제안"],
    ["URL 직접 입력 (유효하지않은 필터)", "유효하지않은 param 무시", "기본값으로 폴백"],
    ["대량 마커 (1000+)", "클러스터링 강제 + 줌 안내", "'줌인하면 개별 매물을 확인할 수 있습니다'"],
    ["네트워크 타임아웃", "5초 타임아웃 + 재시도", "'데이터를 불러오는 중입니다...' → 재시도 버튼"],
    ["동시 필터 변경", "최신 요청만 반영 (AbortController)", "이전 요청 자동 취소"],
    ["브라우저 뒤로가기", "URL state로 필터/스크롤 복원", "사용자 위치 정확히 복원"],
  ],
  [2200, 3000, 4160]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ═══ 11. 개발 체크리스트 ═══
children.push(heading("11. 개발 체크리스트"));

children.push(makeTable(
  ["우선순위", "태스크", "예상 일정", "의존성"],
  [
    ["P0", "매물 목록 API (필터+정렬+페이지네이션)", "Day 1-2", "DB 인덱스"],
    ["P0", "목록 페이지 UI (카드 그리드)", "Day 2-3", "매물 카드 컴포넌트"],
    ["P0", "3종 매물 카드 컴포넌트", "Day 3-4", "디자인 토큰"],
    ["P0", "필터 사이드바 (Desktop)", "Day 4-5", "필터 API 연동"],
    ["P1", "통합 검색바 + 자동완성", "Day 5-6", "pg_trgm GIN 인덱스"],
    ["P1", "pg_trgm + PostGIS 인덱스 설정", "Day 6", "Supabase 확장"],
    ["P1", "Kakao Maps 연동 + 마커 렌더링", "Day 6-7", "Kakao API 키"],
    ["P1", "지도 클러스터링", "Day 7-8", "지도 기본 구현"],
    ["P1", "지도 좌측 패널 + 리스트 연동", "Day 8", "지도 + API"],
    ["P2", "모바일 필터 하단 시트", "Day 9", "필터 로직"],
    ["P2", "모바일 무한 스크롤", "Day 9", "API 커서"],
    ["P2", "히트맵 뷰 (D3.js)", "Day 10", "지도 기본"],
    ["P2", "뷰 전환 (그리드/리스트)", "Day 10", ""],
    ["P3", "인포윈도우 + 패널↔지도 연동", "Day 11", "마커 시스템"],
    ["P3", "반응형 대응 (Tablet/Mobile)", "Day 11-12", "전체 Desktop"],
    ["P3", "SEO (SSR 목록) + 성능 최적화", "Day 12", "전체"],
  ],
  [1000, 3200, 1500, 3660]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("11.2 테스트 항목", HeadingLevel.HEADING_2));
children.push(bullet("단위: 카드 컴포넌트 (3종 각각), 필터 컴포넌트, 페이지네이션"));
children.push(bullet("통합: 필터 변경 → URL 업데이트 → API 호출 → 카드 렌더링 플로우"));
children.push(bullet("E2E: 검색 → 필터 → 카드 클릭 → 상세 이동 전체 플로우"));
children.push(bullet("지도: Kakao Maps 로드, 마커 표시, 클러스터링, 인포윈도우"));
children.push(bullet("반응형: 3개 Breakpoint (1280/768/375) UI 검증"));
children.push(bullet("성능: Lighthouse 90+ / API P95 < 200ms / 지도 FPS 60"));

// BUILD
const doc = new Document({
  numbering,
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 36, bold: true, color: C.navy }, paragraph: { spacing: { before: 360, after: 200 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 30, bold: true, color: C.blue }, paragraph: { spacing: { before: 280, after: 160 } } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 26, bold: true, color: C.navy }, paragraph: { spacing: { before: 200, after: 120 } } },
    ]
  },
  sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("NPLATFORM Module 2: 검색/목록/지도 | ", { size: 16, color: C.gray }), run("Confidential", { size: 16, color: C.red, italics: true })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("© 2026 NPLATFORM. Page ", { size: 16, color: C.gray }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray })] })] }) },
    children
  }]
});

Packer.toBuffer(doc).then(buf => {
  const out = __dirname + "/NPL_Module2_Search_List_Map.docx";
  fs.writeFileSync(out, buf);
  console.log(`Created: ${out} (${Math.round(buf.length/1024)}KB)`);
});
