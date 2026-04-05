const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, LevelFormat, TableOfContents } = require("docx");

// ── Design tokens (Figma 기반) ──
const C = { navy: "1B3A5C", blue: "2E75B6", accent: "10B981", bg: "F0F5FA", white: "FFFFFF", black: "1A1A1A", gray: "6B7280", lightGray: "E5E7EB", red: "EF4444", purple: "7C3AED" };
const bdr = (c = C.lightGray) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = { top: bdr(), bottom: bdr(), left: bdr(), right: bdr() };
const cellM = { top: 80, bottom: 80, left: 120, right: 120 };

const heading = (text, level = HeadingLevel.HEADING_1) =>
  new Paragraph({ heading: level, children: [new TextRun(text)] });

const p = (text, opts = {}) =>
  new Paragraph({ spacing: { after: 120 }, ...opts, children: Array.isArray(text) ? text : [new TextRun({ text, font: "Arial", size: 22 })] });

const bold = (text) => new TextRun({ text, bold: true, font: "Arial", size: 22 });
const run = (text, opts = {}) => new TextRun({ text, font: "Arial", size: 22, ...opts });

const headerCell = (text, w) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA }, margins: cellM,
  shading: { fill: C.navy, type: ShadingType.CLEAR },
  verticalAlign: "center",
  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: C.white, font: "Arial", size: 20 })] })]
});

const cell = (text, w, opts = {}) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA }, margins: cellM,
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  children: [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(text), font: "Arial", size: 20, ...opts })] })]
});

const multiCell = (texts, w, opts = {}) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA }, margins: cellM,
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  children: texts.map(t => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(t), font: "Arial", size: 20, ...opts })] }))
});

const makeTable = (headers, rows, colWidths) => {
  const total = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map(r => new TableRow({
        children: r.map((c, i) => {
          if (Array.isArray(c)) return multiCell(c, colWidths[i]);
          if (typeof c === "object" && c.text) return cell(c.text, colWidths[i], c);
          return cell(c, colWidths[i]);
        })
      }))
    ]
  });
};

const numbering = {
  config: [
    { reference: "bullets", levels: [
      { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      { level: 2, format: LevelFormat.BULLET, text: "\u25AA", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 2160, hanging: 360 } } } },
    ]},
    { reference: "numbers", levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      { level: 1, format: LevelFormat.DECIMAL, text: "%2)", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
    ]},
  ]
};

const bullet = (text, level = 0) => new Paragraph({ numbering: { reference: "bullets", level }, spacing: { after: 60 }, children: [run(text)] });
const numItem = (text, level = 0) => new Paragraph({ numbering: { reference: "numbers", level }, spacing: { after: 60 }, children: [run(text)] });

const codeBlock = (code) => new Paragraph({
  spacing: { after: 120 },
  shading: { fill: "F3F4F6", type: ShadingType.CLEAR },
  children: [new TextRun({ text: code, font: "Consolas", size: 18 })]
});

// ══════════════════════════════════════════════════════════════
// MODULE 1: 홈/랜딩 + 네비게이션 기획서
// ══════════════════════════════════════════════════════════════
const children = [];

// ── COVER PAGE ──
children.push(new Paragraph({ spacing: { before: 3000 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
  new TextRun({ text: "NPLATFORM", font: "Arial", size: 72, bold: true, color: C.navy })
]}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
  new TextRun({ text: "Module 1", font: "Arial", size: 48, color: C.blue })
]}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
  new TextRun({ text: "홈/랜딩 페이지 + 네비게이션 세부 기획서", font: "Arial", size: 32, color: C.gray })
]}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 1 } }, children: [] }));
children.push(new Paragraph({ spacing: { before: 400 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
  run("Version 2.0 | 2026.03.13", { color: C.gray })
]}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
  run("Figma Design Reference: node-id=2-3 (홈페이지 메인)", { color: C.gray, size: 20 })
]}));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ── TOC ──
children.push(heading("목차 (Table of Contents)"));
children.push(new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 1. 모듈 개요
// ══════════════════════════════════════════════════════════════
children.push(heading("1. 모듈 개요"));

children.push(heading("1.1 목적 및 범위", HeadingLevel.HEADING_2));
children.push(p([
  bold("홈/랜딩 페이지는 "), run("NPLATFORM의 첫 인상을 결정하는 핵심 진입점입니다. "),
  run("금융기관(매각사)에게는 '여기에 올리면 가장 효율적으로 팔 수 있다'는 확신을, "),
  run("투자자(매입사)에게는 '여기오면 부실채권을 다 찾을 수 있고 분석 도구까지 갖춰져 있다'는 신뢰를 "),
  run("3초 이내에 전달해야 합니다.")
]));

children.push(heading("1.2 담당 페이지 및 라우트", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["라우트", "페이지명", "접근 권한", "설명"],
  [
    ["/", "홈페이지 메인", "Public", "3대 마켓 소개, 주요 매물 하이라이트, CTA"],
    ["/about", "서비스 소개", "Public", "플랫폼 소개, 팀, 비전"],
    ["/pricing", "요금제 안내", "Public", "기관용/투자자용 요금 체계"],
    ["/contact", "문의하기", "Public", "상담 요청 폼"],
  ],
  [1800, 2000, 1560, 4000]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("1.3 Figma 디자인 매핑", HeadingLevel.HEADING_2));
children.push(p([run("Figma 프레임: "), bold("홈페이지 메인 (node-id=2-3)")]));
children.push(bullet("전체 레이아웃: 풀스크린 히어로 + 3-Column 마켓 카드 + 통계 배너 + 최신 매물 그리드"));
children.push(bullet("디자인 시스템: Primary Navy (#1B3A5C) 헤더/푸터, Blue (#2E75B6) CTA 버튼, Green (#10B981) 실시간 지표"));
children.push(bullet("반응형 Breakpoints: Desktop 1280px, Tablet 768px, Mobile 375px"));
children.push(bullet("헤더: 로고 좌측 + 메인 네비게이션 중앙 + 검색바 + 로그인/회원가입 우측"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 2. 글로벌 네비게이션 시스템
// ══════════════════════════════════════════════════════════════
children.push(heading("2. 글로벌 네비게이션 시스템"));

children.push(heading("2.1 GNB (Global Navigation Bar) 구조", HeadingLevel.HEADING_2));
children.push(p([run("모든 페이지에 공통 적용되는 상단 네비게이션 바입니다. Figma 디자인에 따라 Navy (#1B3A5C) 배경에 White 텍스트를 사용합니다.")]));

children.push(heading("2.1.1 GNB 레이아웃 (Desktop ≥1280px)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["영역", "구성 요소", "위치", "동작"],
  [
    ["로고 영역", "NPLATFORM 로고 (SVG)", "좌측 고정", "클릭 시 / (홈) 이동"],
    ["메인 메뉴", ["급매 마켓", "경매/공매 NPL", "비경매 NPL", "지도", "통계"], "중앙", "호버 시 드롭다운 메가메뉴"],
    ["검색바", "통합 검색 입력창", "중앙-우측", "주소/지역/사건번호 통합 검색"],
    ["사용자 영역", "로그인/회원가입 또는 프로필", "우측 고정", "미로그인: 버튼 2개, 로그인: 아바타+드롭다운"],
    ["알림 아이콘", "벨 아이콘 + 뱃지", "프로필 좌측", "미읽은 알림 수 표시, 클릭 시 드롭다운"],
  ],
  [1500, 2500, 1500, 3860]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("2.1.2 메가메뉴 드롭다운 상세", HeadingLevel.HEADING_3));
children.push(p([bold("급매 마켓 메가메뉴")]));
children.push(makeTable(
  ["칼럼", "메뉴 항목", "링크", "설명"],
  [
    ["유형별", "아파트 급매", "/listings?type=DISTRESSED_SALE&collateral=APT", "아파트 급매물 필터"],
    ["유형별", "오피스텔 급매", "/listings?type=DISTRESSED_SALE&collateral=OFFICETEL", "오피스텔 급매물 필터"],
    ["유형별", "상가 급매", "/listings?type=DISTRESSED_SALE&collateral=COMMERCIAL", "상가 급매물 필터"],
    ["유형별", "토지 급매", "/listings?type=DISTRESSED_SALE&collateral=LAND", "토지 급매물 필터"],
    ["지역별", "서울", "/listings?type=DISTRESSED_SALE&region=SEOUL", "서울 지역 필터"],
    ["지역별", "경기", "/listings?type=DISTRESSED_SALE&region=GYEONGGI", "경기 지역 필터"],
    ["바로가기", "전체 급매 목록", "/listings?type=DISTRESSED_SALE", "필터 없이 전체"],
    ["바로가기", "AI 가격 분석", "/investor/price-analysis", "AI 가격 예측 도구"],
  ],
  [1200, 1800, 4000, 2360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(p([bold("경매/공매 NPL 메가메뉴")]));
children.push(makeTable(
  ["칼럼", "메뉴 항목", "링크", "설명"],
  [
    ["매물탐색", "경매 NPL 목록", "/listings?type=AUCTION_NPL", "경매 진행중 NPL"],
    ["매물탐색", "공매 NPL 목록", "/listings?type=AUCTION_NPL&sub=PUBLIC", "공매 진행중 NPL"],
    ["매물탐색", "지도로 찾기", "/listings/map?type=AUCTION_NPL", "지도 기반 탐색"],
    ["AI 분석", "낙찰가율 AI 추정", "/investor/winning-rate", "AI 낙찰가율 예측"],
    ["AI 분석", "등기부 권리분석", "/investor/registry-analysis", "등기부등본 AI 분석"],
    ["AI 분석", "수익률 시뮬레이터", "/investor/simulator", "경매 수익률 계산"],
    ["통계", "경공매 통계", "/statistics", "법원별/유형별 통계"],
    ["통계", "낙찰가율 추이", "/statistics/trend", "기간별 추이 차트"],
  ],
  [1200, 1800, 3600, 2760]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(p([bold("비경매 NPL 메가메뉴")]));
children.push(makeTable(
  ["칼럼", "메뉴 항목", "링크", "설명"],
  [
    ["매물탐색", "비경매 NPL 목록", "/listings?type=NON_AUCTION_NPL", "비경매 채권 전체"],
    ["매물탐색", "신규 등록 매물", "/listings?type=NON_AUCTION_NPL&sort=newest", "최신 등록순"],
    ["매물탐색", "금액대별 탐색", "/listings?type=NON_AUCTION_NPL&sort=amount", "채권 금액 기준"],
    ["딜 진행", "계약 요청하기", "/contract/new", "NDA 서명 후 계약요청"],
    ["딜 진행", "진행중 딜룸", "/deal-rooms", "참여중 딜룸 목록"],
    ["기관전용", "채권 등록하기", "/institution/register", "금융기관 채권 등록"],
    ["기관전용", "포트폴리오 관리", "/institution/portfolio", "등록 채권 관리"],
  ],
  [1200, 1800, 4000, 2360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("2.1.3 GNB 반응형 동작", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["Breakpoint", "레이아웃 변화", "메뉴 동작"],
  [
    ["Desktop (≥1280px)", "풀 GNB 표시: 로고 + 메뉴 + 검색 + 유저", "호버 시 메가메뉴 드롭다운"],
    ["Tablet (768-1279px)", "로고 + 햄버거 메뉴 + 검색아이콘 + 유저", "슬라이드 사이드바 메뉴 (좌측에서)"],
    ["Mobile (<768px)", "로고 + 햄버거 + 프로필아이콘", "풀스크린 오버레이 메뉴 + 검색 내장"],
  ],
  [2000, 3500, 3860]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("2.1.4 사용자 상태별 GNB 분기", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["사용자 상태", "좌측 메뉴 변화", "우측 영역 변화"],
  [
    ["비로그인 (VIEWER)", "급매마켓/경매NPL/비경매NPL/지도/통계", "로그인 버튼 + 회원가입 버튼(Primary CTA)"],
    ["투자자 (BUYER_INST/INDV)", "위 + '내 관심매물' 추가", "알림벨 + 프로필(이름+역할 뱃지) + 드롭다운"],
    ["금융기관 (SELLER)", "위 + '채권관리' + '대시보드'", "알림벨 + 기관명 + 프로필드롭다운"],
    ["파트너 (PARTNER)", "위 + '파트너센터'", "알림벨 + 프로필"],
    ["관리자 (ADMIN/SUPER)", "위 + '관리자 패널'", "알림벨 + Admin 뱃지 + 프로필"],
  ],
  [2400, 3400, 3560]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 2.2 모바일 네비게이션
// ══════════════════════════════════════════════════════════════
children.push(heading("2.2 모바일 네비게이션 (Hamburger Menu)", HeadingLevel.HEADING_2));

children.push(heading("2.2.1 사이드바 구조", HeadingLevel.HEADING_3));
children.push(bullet("진입: 햄버거 아이콘(☰) 클릭 → 좌측에서 슬라이드인 (width: 85vw, max-width: 360px)"));
children.push(bullet("배경: 반투명 오버레이 (rgba(0,0,0,0.5)) → 클릭 시 닫기"));
children.push(bullet("애니메이션: slide-in 300ms ease-out, 오버레이 fade-in 200ms"));
children.push(bullet("상단: 사용자 프로필 영역 (아바타 + 이름 + 역할) 또는 로그인/회원가입 버튼"));
children.push(bullet("중단: 아코디언 형태 메뉴 (3대 마켓 각각 펼침/접기)"));
children.push(bullet("하단: 설정/고객센터/로그아웃 링크"));

children.push(heading("2.2.2 모바일 하단 탭바", HeadingLevel.HEADING_3));
children.push(p([run("모바일에서는 주요 기능에 빠르게 접근할 수 있는 하단 고정 탭바를 제공합니다.")]));
children.push(makeTable(
  ["탭", "아이콘", "라우트", "뱃지"],
  [
    ["홈", "🏠 Home", "/", "없음"],
    ["검색", "🔍 Search", "/listings/search", "없음"],
    ["지도", "🗺️ Map", "/listings/map", "없음"],
    ["관심", "❤️ Heart", "/mypage/favorites", "관심매물 수"],
    ["MY", "👤 Person", "/mypage", "미읽은 알림 수"],
  ],
  [1500, 1800, 2700, 3360]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 2.3 푸터
// ══════════════════════════════════════════════════════════════
children.push(heading("2.3 글로벌 푸터 (Footer)", HeadingLevel.HEADING_2));

children.push(heading("2.3.1 푸터 레이아웃", HeadingLevel.HEADING_3));
children.push(p([run("Navy (#1B3A5C) 배경, White 텍스트. 4-Column 그리드.")]));
children.push(makeTable(
  ["칼럼", "제목", "포함 링크"],
  [
    ["1", "서비스", ["급매 마켓", "경매/공매 NPL", "비경매 NPL", "AI 분석도구", "통계"]],
    ["2", "고객지원", ["문의하기", "FAQ", "이용가이드", "공지사항"]],
    ["3", "회사정보", ["회사소개", "채용", "보도자료", "파트너십"]],
    ["4", "법적고지", ["이용약관", "개인정보처리방침", "전자금융거래약관", "분쟁해결절차"]],
  ],
  [800, 1200, 7360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));
children.push(bullet("하단 바: 사업자 정보 (상호, 대표, 사업자번호, 주소, 통신판매업) + Copyright"));
children.push(bullet("SNS 아이콘: 카카오톡 채널, 블로그, 유튜브, 인스타그램"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 3. 홈페이지 메인 섹션별 상세 기획
// ══════════════════════════════════════════════════════════════
children.push(heading("3. 홈페이지 메인 섹션별 상세 기획"));

// 3.1 Hero Section
children.push(heading("3.1 Hero Section (히어로 영역)", HeadingLevel.HEADING_2));
children.push(heading("3.1.1 디자인 사양", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["속성", "값", "비고"],
  [
    ["높이", "100vh (최소 600px)", "풀스크린 히어로"],
    ["배경", "그라데이션 오버레이 + 부동산 이미지", "linear-gradient(135deg, rgba(27,58,92,0.9), rgba(46,117,182,0.7))"],
    ["메인 헤드라인", "48px/Bold/White", "'부실채권 투자의 새로운 기준'"],
    ["서브 헤드라인", "20px/Regular/White(0.8)", "'금융기관의 급매 물건부터 경매/공매 NPL까지, AI 분석과 함께'"],
    ["CTA 버튼 (Primary)", "매물 탐색하기", "Blue (#2E75B6) 배경, White 텍스트, 48px 높이"],
    ["CTA 버튼 (Secondary)", "기관 회원 등록", "투명 배경, White 보더, White 텍스트"],
    ["하단 스크롤 표시", "아래 화살표 애니메이션", "bounce 2s infinite"],
  ],
  [2000, 2800, 4560]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("3.1.2 통합 검색바 (Hero 내)", HeadingLevel.HEADING_3));
children.push(p([run("히어로 영역 중앙에 위치한 통합 검색바입니다. 사용자가 즉시 원하는 매물을 탐색할 수 있도록 합니다.")]));
children.push(makeTable(
  ["구성요소", "사양", "동작"],
  [
    ["검색 입력창", "max-width: 720px, height: 56px, border-radius: 28px", "주소/지역명/사건번호/기관명 통합 검색"],
    ["카테고리 탭", "급매 | 경매/공매 | 비경매 (3탭)", "클릭 시 검색 범위 필터링"],
    ["검색 아이콘", "🔍 우측 Circle 버튼 (Blue 배경)", "클릭 또는 Enter 시 검색 실행"],
    ["자동완성", "드롭다운 (최대 8개 항목)", "타이핑 300ms debounce 후 API 호출"],
    ["인기 검색어", "검색바 하단 태그 형태", "최근 24h 검색 빈도 기준 상위 5개"],
  ],
  [1800, 3200, 4360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("3.1.3 Hero 통계 카운터", HeadingLevel.HEADING_3));
children.push(p([run("히어로 하단에 실시간 플랫폼 지표를 표시하여 신뢰감을 줍니다.")]));
children.push(makeTable(
  ["지표", "API 소스", "표시 형식", "애니메이션"],
  [
    ["등록 매물 수", "GET /api/stats/listings", "12,345건", "카운트업 (0 → 목표값, 2초)"],
    ["참여 금융기관", "GET /api/stats/institutions", "48개 기관", "카운트업"],
    ["누적 거래액", "GET /api/stats/volume", "1.2조원", "카운트업"],
    ["AI 분석 횟수", "GET /api/stats/analysis", "89,234회", "카운트업"],
  ],
  [1800, 2500, 2000, 3060]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3.2 Market Overview
children.push(heading("3.2 3대 마켓 소개 섹션", HeadingLevel.HEADING_2));
children.push(heading("3.2.1 섹션 레이아웃", HeadingLevel.HEADING_3));
children.push(p([run("3-Column 카드 레이아웃으로 각 마켓의 핵심 가치를 전달합니다.")]));
children.push(bullet("섹션 제목: '부실채권 투자의 모든 것, 한 곳에서' (center, 32px, Navy)"));
children.push(bullet("서브타이틀: '금융기관이 먼저 찾는 NPL 마켓플레이스' (center, 18px, Gray)"));
children.push(bullet("카드 간격: gap 32px, 패딩 상하 80px"));

children.push(heading("3.2.2 마켓 카드 상세", HeadingLevel.HEADING_3));

// Card 1
children.push(p([bold("카드 1: 급매 부동산 마켓")]));
children.push(makeTable(
  ["속성", "값"],
  [
    ["아이콘", "🏢 빌딩 아이콘 (48px, Blue Circle 배경)"],
    ["제목", "급매 부동산 마켓"],
    ["설명", "채무자 소유 부동산을 시세 대비 할인된 가격에\n금융기관이 직접 올리는 급매 물건"],
    ["핵심 태그", "AI 가격예측 | 시세대비 할인율 | 즉시 매매"],
    ["실시간 지표", "현재 245건 등록중 (Green 점 + pulse 애니메이션)"],
    ["CTA 버튼", "'급매 매물 보기 →' (Blue text, hover underline)"],
    ["호버 효과", "translateY(-8px) + box-shadow 확대"],
    ["배경", "White, border: 1px solid #E5E7EB, border-radius: 16px"],
  ],
  [2000, 7360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

// Card 2
children.push(p([bold("카드 2: 경매/공매 NPL 마케팅")]));
children.push(makeTable(
  ["속성", "값"],
  [
    ["아이콘", "⚖️ 법원 아이콘 (48px, Purple Circle 배경)"],
    ["제목", "경매/공매 NPL"],
    ["설명", "경매·공매 진행중인 부실채권 정보를 통합 제공\n채권 담당자가 직접 마케팅 정보를 작성"],
    ["핵심 태그", "낙찰가율 AI | 등기 권리분석 | 수익률 시뮬레이터"],
    ["실시간 지표", "이번주 신규 89건 (Blue 텍스트)"],
    ["CTA 버튼", "'경매 NPL 탐색 →'"],
    ["호버 효과", "동일"],
    ["특별 뱃지", "'AI 분석 탑재' 뱃지 (Purple, 우상단)"],
  ],
  [2000, 7360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

// Card 3
children.push(p([bold("카드 3: 비경매 NPL 직거래")]));
children.push(makeTable(
  ["속성", "값"],
  [
    ["아이콘", "🤝 핸드셰이크 아이콘 (48px, Green Circle 배경)"],
    ["제목", "비경매 NPL 직거래"],
    ["설명", "경매 절차 없이 금융기관이 직접 매각하는 부실채권\nNDA 기반 안전한 딜 프로세스"],
    ["핵심 태그", "NDA 딜룸 | 채권 분석 | 기관 직접 매각"],
    ["실시간 지표", "진행중 딜 37건 (Green 텍스트)"],
    ["CTA 버튼", "'비경매 NPL 보기 →'"],
    ["호버 효과", "동일"],
    ["특별 뱃지", "'기관 전용' 뱃지 (Navy, 우상단)"],
  ],
  [2000, 7360]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3.3 Featured Listings
children.push(heading("3.3 주요 매물 하이라이트 섹션", HeadingLevel.HEADING_2));

children.push(heading("3.3.1 섹션 구성", HeadingLevel.HEADING_3));
children.push(bullet("섹션 제목: '주목할 매물' + '전체보기 →' 링크 (우측)"));
children.push(bullet("탭 필터: 전체 | 급매 | 경매/공매 | 비경매 (4탭, 좌측정렬)"));
children.push(bullet("카드 그리드: 4-Column (Desktop), 2-Column (Tablet), 1-Column (Mobile)"));
children.push(bullet("카드 수: 최대 8개 (2행×4열), API: GET /api/listings?featured=true&limit=8"));
children.push(bullet("정렬: 기본 최신순, 관심도순/할인율순 토글 가능"));

children.push(heading("3.3.2 매물 카드 컴포넌트 상세", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["영역", "구성요소", "데이터 소스", "스타일"],
  [
    ["상단 이미지", "대표 이미지 (aspect-ratio: 4/3)", "listing.images[0]", "border-radius: 12px 12px 0 0, object-fit: cover"],
    ["마켓 뱃지", "급매/경매/비경매 구분 뱃지", "listing.listing_type", "좌상단 오버레이, 각 마켓별 컬러"],
    ["관심 버튼", "하트 아이콘 (토글)", "favorites API", "우상단 오버레이, 클릭시 filled/outline 전환"],
    ["제목", "물건명/주소 (1줄, ellipsis)", "listing.title", "16px/Bold/Navy"],
    ["위치", "시/구/동 (1줄)", "listing.address", "14px/Regular/Gray"],
    ["감정가/채권액", "금액 표시", "listing.appraisal_amount", "18px/Bold/Blue, formatKRW()"],
    ["할인율/낙찰가율", "퍼센트 표시", "계산값", "Red/Green 색상, 뱃지 형태"],
    ["AI 가격", "AI 예측가 (있을 경우)", "listing.ai_estimated_price", "14px/Purple, 'AI' 아이콘 접두"],
    ["태그", "담보유형 + 지역 태그", "listing.collateral_type", "12px, 회색 라운드 태그"],
    ["등록일", "n일 전 형식", "listing.created_at", "12px/Gray, 하단 우측"],
  ],
  [1500, 2500, 2500, 2860]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("3.3.3 매물 카드 인터랙션", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["인터랙션", "트리거", "동작", "애니메이션"],
  [
    ["호버", "마우스 오버", "카드 상승 + 그림자 확대", "transform: translateY(-4px), 200ms ease"],
    ["클릭", "카드 영역 클릭", "/listings/[id] 상세 페이지 이동", "없음 (즉시 이동)"],
    ["관심 토글", "하트 아이콘 클릭", "POST /api/favorites/{id}", "scale(1.2) → scale(1) bounce, 300ms"],
    ["이미지 에러", "이미지 로드 실패", "기본 placeholder 표시", "fade-in 200ms"],
    ["스와이프 (모바일)", "좌우 스와이프", "카드 캐러셀 슬라이드", "momentum scrolling"],
  ],
  [1500, 2000, 2800, 3060]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3.4 AI Tools Showcase
children.push(heading("3.4 AI 분석 도구 소개 섹션", HeadingLevel.HEADING_2));
children.push(p([run("투자자에게 '별도 고민을 하지 않아도 되는' 분석 솔루션을 어필하는 핵심 섹션입니다.")]));

children.push(heading("3.4.1 섹션 레이아웃", HeadingLevel.HEADING_3));
children.push(bullet("배경: Light Gray (#F0F5FA) 풀와이드"));
children.push(bullet("제목: '투자 분석, AI가 대신합니다' (32px, Navy, center)"));
children.push(bullet("서브: '부실채권 전문 AI 솔루션으로 더 빠르고 정확한 투자 결정' (18px, Gray)"));
children.push(bullet("레이아웃: 2행 × 2열 그리드 (Desktop), 1열 (Mobile)"));

children.push(heading("3.4.2 AI 도구 카드 상세", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["AI 도구", "아이콘", "헤드라인", "설명", "CTA"],
  [
    ["AI 가격 예측", "📊 차트", "사례기반 AI 가격 추정", "XGBoost + SHAP 기반 가격 예측\n95% 신뢰구간 제공\n유사 사례 근거 표시", "가격 예측 해보기 →"],
    ["등기 권리분석", "📋 문서", "등기부등본 AI 분석", "PDF 업로드만으로 자동 권리분석\nGPT-4 기반 상세 분석 보고서\n위험 요소 자동 탐지", "권리분석 시작 →"],
    ["낙찰가율 AI", "📈 상승", "경매 낙찰가율 예측", "Random Forest + 분위수 회귀\n법원별/유형별 통계 기반\n낙찰 확률 시각화", "낙찰가율 확인 →"],
    ["수익률 시뮬레이터", "💰 계산기", "투자 수익률 분석", "경매 수익률 + 채권 매입 수익률\n세금/비용 자동 계산\n시나리오별 비교 분석", "수익률 계산 →"],
  ],
  [1500, 1000, 1800, 2800, 2260]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3.5 Trust Section
children.push(heading("3.5 신뢰 구축 섹션", HeadingLevel.HEADING_2));
children.push(heading("3.5.1 참여 금융기관 로고 슬라이더", HeadingLevel.HEADING_3));
children.push(bullet("제목: '함께하는 금융기관' (24px, Navy)"));
children.push(bullet("로고: 좌→우 무한 슬라이드 (CSS marquee, 30초/cycle)"));
children.push(bullet("로고 크기: 120px × 60px, grayscale(100%) → hover: grayscale(0%)"));
children.push(bullet("최소 8개 로고 슬롯 (실제 참여 기관 로고 + placeholder)"));

children.push(heading("3.5.2 주요 수치 배너", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["수치", "라벨", "소스", "스타일"],
  [
    ["12,345건", "등록 매물", "/api/stats/total-listings", "48px/Bold/Navy + 카운트업"],
    ["89.2%", "매칭 성공률", "/api/stats/match-rate", "48px/Bold/Blue + 카운트업"],
    ["48개", "참여 기관", "/api/stats/institutions", "48px/Bold/Purple + 카운트업"],
    ["3.5조원", "누적 거래액", "/api/stats/volume", "48px/Bold/Green + 카운트업"],
  ],
  [1500, 1800, 3000, 3060]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("3.5.3 이용 후기/사례", HeadingLevel.HEADING_3));
children.push(bullet("카드 캐러셀: 3개씩 표시 (Desktop), 1개 (Mobile)"));
children.push(bullet("카드 구성: 프로필 이미지 + 이름(가명) + 역할 + 후기 텍스트 + 별점"));
children.push(bullet("자동 슬라이드: 5초 간격, 좌우 화살표 수동 이동 가능"));
children.push(bullet("실제 사례: '000 캐피탈' → '3개월 내 채권 85% 매각 완료' 형태"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// 3.6 CTA Section
children.push(heading("3.6 최종 CTA 섹션", HeadingLevel.HEADING_2));
children.push(p([run("페이지 하단에서 사용자를 행동으로 유도하는 최종 전환 영역입니다.")]));
children.push(makeTable(
  ["대상", "헤드라인", "CTA 버튼", "배경"],
  [
    ["금융기관", "부실채권, 가장 빠르게 처분하세요", "기관 회원 등록 →", "Navy 배경, White 텍스트"],
    ["투자자", "AI와 함께 최적의 NPL 투자를 시작하세요", "무료 회원가입 →", "Blue 그라데이션, White 텍스트"],
  ],
  [1500, 3000, 2500, 2360]
));
children.push(bullet("양쪽 CTA를 좌/우 Split Layout으로 구성 (50:50)"));
children.push(bullet("모바일에서는 세로 스택 (기관 → 투자자 순서)"));
children.push(bullet("버튼 호버: scale(1.05) + 밝기 증가"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 4. 컴포넌트 트리 및 상태 관리
// ══════════════════════════════════════════════════════════════
children.push(heading("4. 컴포넌트 트리 및 상태 관리"));

children.push(heading("4.1 페이지 컴포넌트 트리", HeadingLevel.HEADING_2));
children.push(codeBlock("app/(public)/page.tsx  (홈페이지)"));
children.push(codeBlock("├── components/layout/GlobalNav.tsx"));
children.push(codeBlock("│   ├── Logo.tsx"));
children.push(codeBlock("│   ├── MainMenu.tsx"));
children.push(codeBlock("│   │   └── MegaMenuDropdown.tsx"));
children.push(codeBlock("│   ├── SearchBar.tsx (GNB 내 축소형)"));
children.push(codeBlock("│   ├── NotificationBell.tsx"));
children.push(codeBlock("│   └── UserMenu.tsx"));
children.push(codeBlock("├── components/home/HeroSection.tsx"));
children.push(codeBlock("│   ├── HeroSearchBar.tsx"));
children.push(codeBlock("│   │   ├── CategoryTabs.tsx"));
children.push(codeBlock("│   │   ├── SearchInput.tsx"));
children.push(codeBlock("│   │   └── AutoComplete.tsx"));
children.push(codeBlock("│   └── StatsCounter.tsx"));
children.push(codeBlock("├── components/home/MarketOverview.tsx"));
children.push(codeBlock("│   └── MarketCard.tsx (×3)"));
children.push(codeBlock("├── components/home/FeaturedListings.tsx"));
children.push(codeBlock("│   ├── TabFilter.tsx"));
children.push(codeBlock("│   └── ListingCard.tsx (×8)"));
children.push(codeBlock("├── components/home/AIToolsShowcase.tsx"));
children.push(codeBlock("│   └── AIToolCard.tsx (×4)"));
children.push(codeBlock("├── components/home/TrustSection.tsx"));
children.push(codeBlock("│   ├── InstitutionLogoSlider.tsx"));
children.push(codeBlock("│   ├── StatsBar.tsx"));
children.push(codeBlock("│   └── TestimonialCarousel.tsx"));
children.push(codeBlock("├── components/home/FinalCTA.tsx"));
children.push(codeBlock("└── components/layout/Footer.tsx"));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("4.2 상태 관리 구조", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["상태", "관리 방식", "스코프", "업데이트 트리거"],
  [
    ["사용자 인증", "AuthContext (React Context)", "Global", "로그인/로그아웃, 토큰 갱신"],
    ["검색어", "URL SearchParams + local state", "HeroSearchBar", "입력 변경, 검색 실행"],
    ["자동완성 결과", "React Query (useQuery)", "AutoComplete", "검색어 변경 (debounce 300ms)"],
    ["탭 필터 (매물)", "local state + URL", "FeaturedListings", "탭 클릭"],
    ["추천 매물", "React Query (useQuery)", "FeaturedListings", "탭 변경 시 refetch"],
    ["통계 카운터", "React Query (staleTime: 60s)", "StatsCounter", "페이지 로드, 60초 자동 갱신"],
    ["관심 매물 토글", "React Query (mutation)", "ListingCard", "하트 클릭, optimistic update"],
    ["알림", "Supabase Realtime subscription", "NotificationBell", "실시간 구독"],
    ["메가메뉴 열림", "local state (hovering)", "MegaMenuDropdown", "마우스 호버"],
    ["모바일 메뉴", "local state (isOpen)", "GlobalNav", "햄버거 클릭"],
  ],
  [2000, 2500, 2000, 2860]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 5. API 엔드포인트 상세
// ══════════════════════════════════════════════════════════════
children.push(heading("5. API 엔드포인트 상세"));

children.push(heading("5.1 홈페이지 데이터 API", HeadingLevel.HEADING_2));

children.push(heading("5.1.1 GET /api/home/stats", HeadingLevel.HEADING_3));
children.push(p([bold("플랫폼 통계 데이터")]));
children.push(makeTable(
  ["항목", "상세"],
  [
    ["Method", "GET"],
    ["Auth", "Public (인증 불필요)"],
    ["Cache", "Cache-Control: public, s-maxage=60, stale-while-revalidate=300"],
    ["Response 200", "{ totalListings, activeInstitutions, totalVolume, totalAnalysis, distressedCount, auctionCount, nonAuctionCount }"],
    ["DB Query", "SELECT count(*) FROM npl_listings WHERE status='ACTIVE' GROUP BY listing_type"],
    ["에러 처리", "500 → 캐시된 이전 값 사용 (fallback)"],
  ],
  [2000, 7360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("5.1.2 GET /api/home/featured", HeadingLevel.HEADING_3));
children.push(p([bold("주요 매물 목록")]));
children.push(makeTable(
  ["항목", "상세"],
  [
    ["Method", "GET"],
    ["Query Params", "?type=DISTRESSED_SALE|AUCTION_NPL|NON_AUCTION_NPL&limit=8"],
    ["Auth", "Public"],
    ["Cache", "s-maxage=30, stale-while-revalidate=120"],
    ["Response 200", "{ listings: Array<{ id, title, address, listing_type, appraisal_amount, ai_estimated_price, discount_rate, collateral_type, region, images, created_at }>, total }"],
    ["정렬 기준", "is_featured DESC, created_at DESC"],
    ["필드 제한", "민감 정보(채무자명, 전체주소) 제외 — Teaser 수준만 노출"],
  ],
  [2000, 7360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("5.1.3 GET /api/search/autocomplete", HeadingLevel.HEADING_3));
children.push(p([bold("통합 검색 자동완성")]));
children.push(makeTable(
  ["항목", "상세"],
  [
    ["Method", "GET"],
    ["Query Params", "?q=검색어&type=all|distressed|auction|non_auction&limit=8"],
    ["Auth", "Public"],
    ["Cache", "no-cache (실시간)"],
    ["Response 200", "{ suggestions: Array<{ type: 'listing'|'region'|'institution'|'case', text, id?, count? }> }"],
    ["검색 대상", "npl_listings.title, address, auction_case_number + regions 테이블 + users(기관명)"],
    ["성능", "pg_trgm 확장 GIN 인덱스, trigram similarity 기반"],
    ["Rate Limit", "IP당 30req/min"],
  ],
  [2000, 7360]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 6. DB 스키마 및 쿼리
// ══════════════════════════════════════════════════════════════
children.push(heading("6. DB 스키마 및 쿼리"));

children.push(heading("6.1 홈페이지 관련 테이블", HeadingLevel.HEADING_2));

children.push(p([bold("favorites 테이블 (관심 매물)")]));
children.push(codeBlock("CREATE TABLE favorites ("));
children.push(codeBlock("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(codeBlock("  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,"));
children.push(codeBlock("  listing_id UUID NOT NULL REFERENCES npl_listings(id) ON DELETE CASCADE,"));
children.push(codeBlock("  created_at TIMESTAMPTZ DEFAULT now(),"));
children.push(codeBlock("  UNIQUE(user_id, listing_id)"));
children.push(codeBlock(");"));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(p([bold("search_logs 테이블 (검색 로그 — 인기 검색어용)")]));
children.push(codeBlock("CREATE TABLE search_logs ("));
children.push(codeBlock("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(codeBlock("  query TEXT NOT NULL,"));
children.push(codeBlock("  category TEXT, -- DISTRESSED_SALE | AUCTION_NPL | NON_AUCTION_NPL | ALL"));
children.push(codeBlock("  user_id UUID REFERENCES users(id),"));
children.push(codeBlock("  result_count INT DEFAULT 0,"));
children.push(codeBlock("  created_at TIMESTAMPTZ DEFAULT now()"));
children.push(codeBlock(");"));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(p([bold("platform_stats 테이블 (미리 집계된 통계)")]));
children.push(codeBlock("CREATE TABLE platform_stats ("));
children.push(codeBlock("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(codeBlock("  stat_key TEXT NOT NULL UNIQUE, -- 'total_listings', 'active_institutions', etc."));
children.push(codeBlock("  stat_value NUMERIC NOT NULL DEFAULT 0,"));
children.push(codeBlock("  updated_at TIMESTAMPTZ DEFAULT now()"));
children.push(codeBlock(");"));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("6.2 인기 검색어 쿼리", HeadingLevel.HEADING_2));
children.push(codeBlock("SELECT query, COUNT(*) as cnt"));
children.push(codeBlock("FROM search_logs"));
children.push(codeBlock("WHERE created_at > now() - INTERVAL '24 hours'"));
children.push(codeBlock("GROUP BY query"));
children.push(codeBlock("ORDER BY cnt DESC"));
children.push(codeBlock("LIMIT 5;"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 7. 사용자 플로우
// ══════════════════════════════════════════════════════════════
children.push(heading("7. 사용자 플로우 (User Flows)"));

children.push(heading("7.1 비로그인 사용자 → 회원가입 전환 플로우", HeadingLevel.HEADING_2));
children.push(numItem("홈페이지 진입 (organic/광고/직접)"));
children.push(numItem("Hero 검색바로 관심 지역/유형 검색"));
children.push(numItem("검색 결과 목록에서 매물 카드 클릭"));
children.push(numItem("상세 페이지에서 Teaser 정보 확인"));
children.push(numItem("'전체 정보 보기' 클릭 → 로그인/회원가입 모달 표시"));
children.push(numItem("회원가입 진행 (역할 선택: 투자자/기관)"));
children.push(numItem("이메일 인증 → 프로필 완성 → 상세 정보 접근"));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("7.2 금융기관 담당자 → 채권 등록 플로우", HeadingLevel.HEADING_2));
children.push(numItem("홈페이지 진입"));
children.push(numItem("'기관 회원 등록' CTA 클릭"));
children.push(numItem("기관 회원가입 (사업자등록번호 + 금융업 라이선스 인증)"));
children.push(numItem("관리자 KYC 승인 대기 → 승인 알림 수신"));
children.push(numItem("로그인 → 기관 대시보드 접근"));
children.push(numItem("'채권 등록하기' → 마켓 유형 선택 → 정보 입력 → 등록 완료"));
children.push(numItem("투자자 매칭 알림 수신 → 딜 진행"));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("7.3 투자자 → AI 분석 도구 활용 플로우", HeadingLevel.HEADING_2));
children.push(numItem("홈페이지 AI 도구 섹션에서 관심 도구 발견"));
children.push(numItem("'가격 예측 해보기' 클릭"));
children.push(numItem("로그인 상태면 바로 도구 페이지 이동"));
children.push(numItem("비로그인이면 '무료 회원가입 후 이용 가능' 모달"));
children.push(numItem("주소 입력 → AI 가격 예측 결과 확인"));
children.push(numItem("해당 지역 관련 매물 추천 → 매물 상세 이동"));
children.push(numItem("관심 매물 저장 / 계약 요청"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 8. SEO 및 성능 최적화
// ══════════════════════════════════════════════════════════════
children.push(heading("8. SEO 및 성능 최적화"));

children.push(heading("8.1 메타 태그 전략", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["메타 태그", "값"],
  [
    ["title", "NPLATFORM | 부실채권(NPL) 통합 마켓플레이스 - AI 분석 기반"],
    ["description", "금융기관 급매 부동산, 경매/공매 NPL, 비경매 부실채권을 한 곳에서. AI 가격예측, 등기 권리분석, 수익률 시뮬레이터 제공"],
    ["og:title", "NPLATFORM - 부실채권 투자의 새로운 기준"],
    ["og:description", "대한민국 최초 NPL 통합 마켓플레이스. AI 분석과 함께하는 스마트한 부실채권 투자"],
    ["og:image", "/og-image.png (1200×630, 플랫폼 로고 + 핵심 카피)"],
    ["og:type", "website"],
    ["twitter:card", "summary_large_image"],
    ["keywords", "부실채권, NPL, 경매, 공매, 급매, 부동산 투자, AI 분석, 낙찰가율, 권리분석"],
  ],
  [2000, 7360]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("8.2 성능 최적화 전략", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["항목", "전략", "목표"],
  [
    ["이미지", "Next.js Image + WebP/AVIF + lazy loading", "LCP < 2.5s"],
    ["히어로 배경", "CSS background + preload 힌트", "FCP < 1.8s"],
    ["JS 번들", "코드 스플리팅 (각 섹션 dynamic import)", "TTI < 3.5s"],
    ["폰트", "next/font/google (Noto Sans KR)", "FOUT 방지"],
    ["통계 API", "ISR (60s) + stale-while-revalidate", "TTFB < 200ms"],
    ["매물 카드", "Suspense boundary + Skeleton UI", "CLS < 0.1"],
    ["자동완성", "debounce 300ms + abort 이전 요청", "API 부하 최소화"],
    ["스크롤 애니메이션", "Intersection Observer + CSS transform", "60fps 유지"],
  ],
  [2000, 3500, 3860]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("8.3 접근성 (Accessibility)", HeadingLevel.HEADING_2));
children.push(bullet("시맨틱 HTML: header/nav/main/section/footer 적절 사용"));
children.push(bullet("ARIA 레이블: 모든 인터랙티브 요소에 aria-label 부여"));
children.push(bullet("키보드 네비게이션: Tab/Enter/Escape로 전체 탐색 가능"));
children.push(bullet("색상 대비: WCAG AA 기준 4.5:1 이상 준수 (Navy/White = 11.2:1 ✓)"));
children.push(bullet("스크린리더: 이미지 alt 텍스트, 동적 콘텐츠 aria-live='polite'"));
children.push(bullet("모바일 터치: 최소 터치 영역 44×44px 보장"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 9. 에러 처리 및 엣지 케이스
// ══════════════════════════════════════════════════════════════
children.push(heading("9. 에러 처리 및 엣지 케이스"));

children.push(heading("9.1 API 에러 처리", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["시나리오", "처리 방법", "UI 표시"],
  [
    ["통계 API 실패", "캐시된 이전 값 사용, 백그라운드 재시도", "이전 값 표시 (사용자 인지 불가)"],
    ["매물 API 실패", "에러 바운더리 + 재시도 버튼", "'매물을 불러오지 못했습니다' + 다시 시도 버튼"],
    ["자동완성 API 실패", "조용히 실패, 자동완성 비표시", "검색바만 표시 (자동완성 숨김)"],
    ["이미지 로드 실패", "onError → placeholder 이미지", "회색 배경 + 건물 아이콘"],
    ["네트워크 오프라인", "navigator.onLine 감지", "상단 배너: '인터넷 연결을 확인하세요'"],
    ["인증 토큰 만료", "자동 갱신 시도 → 실패시 로그인 리다이렉트", "로그인 모달 표시"],
  ],
  [2200, 3300, 3860]
));
children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("9.2 엣지 케이스", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["케이스", "발생 조건", "처리"],
  [
    ["매물 0건", "신규 서비스 또는 특정 카테고리 비어있음", "'곧 매물이 등록될 예정입니다' 안내 + 알림 신청 CTA"],
    ["검색 결과 0건", "해당 검색어 매물 없음", "'검색 결과가 없습니다' + 유사 검색어 제안 + 전체 매물 보기 링크"],
    ["동시 접속 폭주", "이벤트/광고 집행 시", "CDN 캐싱 극대화 + 매물 API에 cursor 페이지네이션"],
    ["긴 제목/주소", "텍스트 오버플로우", "text-overflow: ellipsis + title 속성에 전체 텍스트"],
    ["권한별 CTA 분기", "비로그인/투자자/기관 각각 다른 CTA", "useAuth() 훅으로 역할 확인 → 조건부 렌더링"],
    ["SEO 크롤러", "JavaScript 미실행 크롤러", "SSR (Server Components)로 HTML 완전 렌더링"],
  ],
  [2000, 3000, 4360]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// 10. 개발 체크리스트
// ══════════════════════════════════════════════════════════════
children.push(heading("10. 개발 체크리스트"));

children.push(heading("10.1 구현 우선순위", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["우선순위", "태스크", "예상 일정", "의존성"],
  [
    ["P0", "GNB + 푸터 레이아웃", "Day 1-2", "없음"],
    ["P0", "Hero Section + 검색바 UI", "Day 2-3", "GNB"],
    ["P0", "3대 마켓 카드 섹션", "Day 3", "디자인 토큰"],
    ["P1", "매물 카드 컴포넌트", "Day 4", "API 연동"],
    ["P1", "추천 매물 그리드 + API 연동", "Day 4-5", "매물 카드"],
    ["P1", "AI 도구 소개 섹션", "Day 5", "없음"],
    ["P1", "통계 카운터 + API", "Day 5-6", "platform_stats 테이블"],
    ["P2", "자동완성 검색 + API", "Day 6-7", "search_logs, pg_trgm"],
    ["P2", "신뢰 섹션 (로고+후기)", "Day 7", "없음"],
    ["P2", "메가메뉴 드롭다운", "Day 7-8", "GNB"],
    ["P2", "반응형 대응 (Tablet+Mobile)", "Day 8-9", "전체 Desktop 완료"],
    ["P3", "하단 탭바 (Mobile)", "Day 9", "없음"],
    ["P3", "애니메이션 + 마이크로인터랙션", "Day 9-10", "전체 UI"],
    ["P3", "SEO 메타 + OG 이미지", "Day 10", "없음"],
    ["P3", "접근성 검수 + Lighthouse 최적화", "Day 10", "전체"],
  ],
  [1000, 3000, 1800, 3560]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("10.2 테스트 항목", HeadingLevel.HEADING_2));
children.push(bullet("단위 테스트: 각 컴포넌트 렌더링, 조건부 렌더링, 이벤트 핸들러"));
children.push(bullet("통합 테스트: API 호출 → UI 반영, 검색 플로우, 탭 전환"));
children.push(bullet("E2E 테스트: 비로그인 홈 → 검색 → 매물 클릭 → 로그인 유도"));
children.push(bullet("반응형 테스트: Chrome DevTools 3개 Breakpoint (1280/768/375)"));
children.push(bullet("크로스 브라우저: Chrome, Safari, Firefox, Edge 최신 2버전"));
children.push(bullet("성능 테스트: Lighthouse 90+ (Performance, Accessibility, SEO)"));

// ══════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ══════════════════════════════════════════════════════════════
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
  sections: [{
    properties: {
      page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
    },
    headers: { default: new Header({ children: [
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [
        new TextRun({ text: "NPLATFORM Module 1: 홈/랜딩 + 네비게이션 | ", font: "Arial", size: 16, color: C.gray }),
        new TextRun({ text: "Confidential", font: "Arial", size: 16, color: C.red, italics: true }),
      ]})
    ]})},
    footers: { default: new Footer({ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "© 2026 NPLATFORM. Page ", font: "Arial", size: 16, color: C.gray }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray }),
      ]})
    ]})},
    children
  }]
});

const outPath = __dirname + "/NPL_Module1_Home_Navigation.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log(`Created: ${outPath} (${Math.round(buf.length/1024)}KB)`);
});
