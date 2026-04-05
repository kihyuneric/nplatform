const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, LevelFormat, TableOfContents } = require("docx");

// ── Design tokens ──
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
    ]},
    { reference: "numbers", levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
    ]}
  ]
};
const bullet = (t) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const bullet2 = (t) => new Paragraph({ numbering: { reference: "bullets", level: 1 }, spacing: { after: 60 }, children: [run(t)] });
const numItem = (t) => new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const code = (t) => new Paragraph({ spacing: { after: 80 }, shading: { fill: "F3F4F6", type: ShadingType.CLEAR }, children: [new TextRun({ text: t, font: "Consolas", size: 18 })] });

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const spacer = () => new Paragraph({ spacing: { after: 200 } });

// ══════════════════════════════════════════════════════════════
// MODULE 5: 투자자 분석도구 + 수익률 시뮬레이터 (Enhanced v2)
// ══════════════════════════════════════════════════════════════
const children = [];

// ── COVER ──
children.push(new Paragraph({ spacing: { before: 3000 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NPLATFORM", font: "Arial", size: 72, bold: true, color: C.navy })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Module 5", font: "Arial", size: 48, color: C.blue })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "투자자 분석도구 + 수익률 시뮬레이터 세부 기획서", font: "Arial", size: 32, color: C.gray })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 1 } }, children: [] }));
children.push(new Paragraph({ spacing: { before: 400 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Version 2.0 | 2026.03.13 | 투자자 도구 종합", { color: C.gray })] }));
children.push(pageBreak());
children.push(heading("목차"));
children.push(new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 1. 모듈 개요
// ══════════════════════════════════════════════════════════════
children.push(heading("1. 모듈 개요"));
children.push(p([run("투자자에게 '여기오면 부실채권을 다 찾을 수 있고 분석 솔루션이 장착되어 별도 고민이 필요없다'는 경험을 제공하는 핵심 모듈입니다. 대시보드, 관심 매물, 매물 비교, 맞춤 알림, 분석 이력 관리 등 투자자 워크플로우 전체를 담당합니다.")]));

children.push(heading("1.1 담당 라우트", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["라우트", "페이지명", "권한", "설명"],
  [
    ["/investor/dashboard", "투자자 대시보드", "BUYER_INST, BUYER_INDV", "KPI, 추천매물, AI이력, 계약현황 통합"],
    ["/investor/favorites", "관심 매물", "BUYER_INST, BUYER_INDV", "찜한 매물 목록 + 폴더 + 변동 알림"],
    ["/investor/favorites/compare", "매물 비교", "BUYER_INST, BUYER_INDV", "최대 4개 매물 side-by-side 비교표"],
    ["/investor/alerts", "맞춤 알림 설정", "BUYER_INST, BUYER_INDV", "알림 조건 CRUD + 채널 설정 + 이력"],
    ["/investor/analysis-history", "분석 이력", "BUYER_INST, BUYER_INDV", "AI 분석 결과 전체 이력 + 내보내기"],
  ],
  [2500, 1500, 1800, 3560]
));
children.push(p([run("※ AI 가격예측, 등기분석, 낙찰가율, 수익률시뮬레이터 도구 상세는 Module 3 참조", { italics: true, color: C.gray })]));

children.push(heading("1.2 모듈 의존성", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["의존 모듈", "사용 항목", "연동 방식"],
  [
    ["Module 2 (검색/목록)", "매물 카드 컴포넌트, 필터 로직", "공유 컴포넌트 import"],
    ["Module 3 (상세/AI)", "AI 분석 API, 분석 결과 타입", "API 호출 + 타입 공유"],
    ["Module 6 (계약/딜룸)", "계약 요청 API, 딜룸 연결", "라우팅 + API 호출"],
    ["Supabase Auth", "유저 인증, 역할 확인", "useAuth() 훅"],
    ["Supabase Realtime", "가격변동 알림, 매칭 알림", "WebSocket 구독"],
  ],
  [2000, 3500, 3860]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 2. 컴포넌트 트리 (TypeScript 인터페이스)
// ══════════════════════════════════════════════════════════════
children.push(heading("2. 컴포넌트 트리"));
children.push(p([bold("모든 컴포넌트는 TypeScript strict mode로 작성하며, Props 인터페이스를 명시합니다.")]));

children.push(heading("2.1 InvestorDashboard", HeadingLevel.HEADING_2));
children.push(code("// app/(main)/investor/dashboard/page.tsx"));
children.push(code("interface InvestorDashboardProps {} // 페이지 컴포넌트, useAuth()로 유저 로드"));
children.push(code("├── KpiCardGrid: { kpis: KpiItem[] }"));
children.push(code("│   └── KpiCard: { label: string; value: number; change: number; icon: LucideIcon }"));
children.push(code("├── RecommendedListings: { items: NplListing[]; matchScores: number[] }"));
children.push(code("│   └── ListingCard: { listing: NplListing; score: number; onFavorite: () => void }"));
children.push(code("├── RecentAnalysis: { analyses: AiAnalysisResult[]; onRerun: (id: string) => void }"));
children.push(code("│   └── AnalysisCard: { analysis: AiAnalysisResult; onRerun: () => void; onExport: () => void }"));
children.push(code("└── ActiveDeals: { deals: ContractRequest[]; onNavigate: (id: string) => void }"));
children.push(code("    └── DealStatusCard: { deal: ContractRequest; onNavigate: () => void }"));
children.push(spacer());

children.push(heading("2.2 FavoritesPage", HeadingLevel.HEADING_2));
children.push(code("// app/(main)/investor/favorites/page.tsx"));
children.push(code("interface FavoritesPageProps {}"));
children.push(code("├── FolderSidebar: { folders: string[]; active: string; onSelect: (f: string) => void; onCreate: (name: string) => void }"));
children.push(code("├── FavoritesList: { items: Favorite[]; onRemove: (id: string) => void; onCompare: (ids: string[]) => void }"));
children.push(code("│   └── FavoriteCard: { favorite: Favorite; selected: boolean; onToggle: () => void }"));
children.push(code("│       └── PriceChangeBadge: { current: number; saved: number }"));
children.push(code("├── CompareButton: { selectedCount: number; maxCount: 4; onClick: () => void }"));
children.push(code("└── Pagination: { total: number; page: number; perPage: number; onChange: (p: number) => void }"));
children.push(spacer());

children.push(heading("2.3 ComparisonPage", HeadingLevel.HEADING_2));
children.push(code("// app/(main)/investor/favorites/compare/page.tsx"));
children.push(code("interface ComparisonPageProps { ids: string[] } // URL searchParams에서 추출"));
children.push(code("├── ComparisonTable: { listings: NplListing[]; marketType: ListingType }"));
children.push(code("│   ├── ComparisonHeader: { listings: NplListing[] }"));
children.push(code("│   ├── ComparisonRow: { label: string; values: (string | number)[] }"));
children.push(code("│   └── MarketSpecificRows: { listings: NplListing[]; marketType: ListingType }"));
children.push(code("└── ExportButton: { data: any; format: 'pdf' | 'csv' }"));
children.push(spacer());

children.push(heading("2.4 AlertSettingsPage", HeadingLevel.HEADING_2));
children.push(code("// app/(main)/investor/alerts/page.tsx"));
children.push(code("├── AlertConditionForm: { conditions: AlertConditions; onChange: (c: AlertConditions) => void }"));
children.push(code("│   ├── MarketTypeSelector: { selected: ListingType[]; onChange: (t: ListingType[]) => void }"));
children.push(code("│   ├── RegionCascader: { selected: string[]; onChange: (r: string[]) => void }"));
children.push(code("│   ├── PriceRangeSlider: { min: number; max: number; onChange: (range: [number, number]) => void }"));
children.push(code("│   └── DiscountMinSlider: { value: number; onChange: (v: number) => void }"));
children.push(code("├── ChannelToggle: { channels: AlertChannels; onChange: (c: AlertChannels) => void }"));
children.push(code("├── FrequencySelector: { value: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'; onChange: (f: string) => void }"));
children.push(code("└── AlertHistory: { alerts: Notification[]; onMarkRead: (id: string) => void }"));
children.push(spacer());

children.push(heading("2.5 AnalysisHistoryPage", HeadingLevel.HEADING_2));
children.push(code("// app/(main)/investor/analysis-history/page.tsx"));
children.push(code("├── AnalysisTypeTabs: { active: AnalysisType; onChange: (t: AnalysisType) => void }"));
children.push(code("├── AnalysisTable: { items: AiAnalysisResult[]; onRerun: (id: string) => void }"));
children.push(code("│   └── AnalysisResultRow: { item: AiAnalysisResult; onExport: () => void; onDelete: () => void }"));
children.push(code("├── HistoryChart: { data: { date: string; score: number }[] } // 분석 추이 차트"));
children.push(code("└── ExportAllButton: { selectedIds: string[]; format: 'pdf' | 'csv' }"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 3. 투자자 대시보드
// ══════════════════════════════════════════════════════════════
children.push(heading("3. 투자자 대시보드"));

children.push(heading("3.1 레이아웃 구성", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["영역", "내용", "데이터 소스", "크기"],
  [
    ["상단 KPI 카드", "관심매물 수 / 계약 진행중 / AI 분석 횟수 / 이번달 투자액", "GET /api/v1/investor/dashboard", "4-Column Grid"],
    ["추천 매물", "매칭 엔진 기반 추천 매물 Top 5 (80점+ 강력추천)", "matching_results JOIN npl_listings", "좌측 2/3"],
    ["관심 매물 변동", "가격 변동 / 상태 변경된 찜 매물 알림", "favorites JOIN npl_listings (변동 비교)", "우측 1/3"],
    ["최근 AI 분석", "최근 분석 결과 5건 (재분석 바로가기)", "ai_analysis_results ORDER BY created_at", "Full width 테이블"],
    ["진행중 딜", "계약 요청 / 딜룸 진행 현황 카드", "contract_requests WHERE status NOT IN (COMPLETED, REJECTED)", "Full width 카드"],
  ],
  [1200, 3000, 2800, 2360]
));
children.push(spacer());

children.push(heading("3.2 KPI 카드 상세", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["KPI", "계산 로직", "변동 표시", "아이콘"],
  [
    ["관심 매물", "SELECT COUNT(*) FROM favorites WHERE user_id = $1", "전주 대비 ±N건", "Heart"],
    ["진행중 계약", "SELECT COUNT(*) FROM contract_requests WHERE buyer_id = $1 AND status IN (...)", "신규 N건", "FileText"],
    ["AI 분석 횟수", "SELECT COUNT(*) FROM ai_analysis_results WHERE user_id = $1 AND created_at > 이번달", "전월 대비 ±%", "Brain"],
    ["이번달 투자액", "SUM(contract_requests.amount) WHERE status = COMPLETED AND 이번달", "전월 대비 ±%", "DollarSign"],
  ],
  [1200, 3800, 2000, 2360]
));
children.push(spacer());

children.push(heading("3.3 추천 매물 매칭 엔진", HeadingLevel.HEADING_2));
children.push(p([bold("가중치 매칭 알고리즘 (PostgreSQL Function):")]));
children.push(makeTable(
  ["Factor", "가중치", "데이터 소스", "매칭 로직"],
  [
    ["담보유형 (collateral)", "30%", "demand_surveys.preferred_types", "완전 일치 → 100, 같은 카테고리 → 50, 불일치 → 0"],
    ["지역 (region)", "25%", "demand_surveys.preferred_regions", "동일 시도 → 100, 인접 시도 → 50, 기타 → 0"],
    ["금액대 (amount)", "20%", "demand_surveys.investment_range", "범위 내 → 100, ±20% → 50, 초과 → 0"],
    ["할인율 (discount)", "15%", "demand_surveys.min_discount_rate", "초과 달성 → 100, 미달 → (실제/목표×100)"],
    ["회피 조건 (avoidance)", "10%", "demand_surveys.avoidance_conditions", "해당 시 -100, 미해당 → 0"],
  ],
  [1500, 600, 2500, 4760]
));
children.push(spacer());

children.push(heading("3.4 매칭 점수 계산식", HeadingLevel.HEADING_2));
children.push(code("matching_score = (collateral_match × 0.30) + (region_match × 0.25)"));
children.push(code("               + (amount_match × 0.20) + (discount_match × 0.15)"));
children.push(code("               + (avoidance_penalty × 0.10)"));
children.push(code("// 결과: 0~100점"));
children.push(code("// 80점 이상 → '강력 추천' 뱃지 (Badge variant='accent')"));
children.push(code("// 60~79점 → '추천' 뱃지"));
children.push(code("// 60점 미만 → 표시하지 않음"));
children.push(spacer());

children.push(heading("3.5 매칭 엔진 성능 & 실행 전략", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["항목", "사양", "비고"],
  [
    ["사전 필터", "담보유형 ∩ 매물 담보유형 → 후보군 축소", "O(n) 인덱스 스캔"],
    ["지역 필터", "선호지역 ∩ 매물 지역 → 2차 후보군", "O(m), GIN 인덱스"],
    ["가중치 계산", "후보군에만 적용 (10만건 기준 ~500건)", "< 100ms"],
    ["배치 실행", "pg_cron 매일 02:00 전체 활성 설문 × 신규 매물", "Supabase Edge Function"],
    ["실시간 실행", "매물 INSERT trigger → 해당 매물만 매칭", "< 50ms"],
    ["인덱스", "(collateral_type, region, status) 복합 인덱스", "B-tree"],
    ["결과 저장", "matching_results UPSERT ON CONFLICT (survey_id, listing_id)", "중복 방지"],
  ],
  [1500, 4500, 3360]
));
children.push(spacer());

children.push(heading("3.6 매칭 KPI 측정", HeadingLevel.HEADING_2));
children.push(bullet("매칭 정확도: 관심 등록 전환율 (matched → favorited) — 목표 15%+"));
children.push(bullet("매칭 유용성: 사용자 피드백 (thumbs up/down) — 목표 70%+ positive"));
children.push(bullet("매칭 속도: 배치 전체 완료 시간 — 목표 < 5분 (10만건 기준)"));
children.push(bullet("A/B 테스트: 가중치 변경 시 전환율 비교 (향후)"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 4. 관심 매물 관리
// ══════════════════════════════════════════════════════════════
children.push(heading("4. 관심 매물 관리"));

children.push(heading("4.1 관심 매물 기능 매트릭스", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["기능", "상세", "API"],
  [
    ["관심 등록", "매물 상세에서 하트 클릭, 중복 시 409 에러", "POST /api/v1/favorites"],
    ["관심 해제", "목록에서 개별 삭제, Optimistic Update", "DELETE /api/v1/favorites/:id"],
    ["정렬", "찜한 날짜순 / 가격순 / 변동순 (3가지)", "GET ?sort=date_desc|price_asc|change_desc"],
    ["필터", "마켓별 / 상태별 (활성/완료/삭제됨)", "GET ?market_type=&status="],
    ["변동 표시", "가격 변동: ↑5% (Red), ↓3% (Green) 뱃지", "price_at_save vs current price"],
    ["알림", "가격 변동 / 상태 변경 / 경매일 임박 자동 알림", "Supabase Realtime"],
    ["메모", "개별 매물에 투자 메모 작성 가능 (500자 제한)", "PATCH /api/v1/favorites/:id"],
    ["폴더", "사용자 정의 폴더 분류 (기본/관심/검토중 등)", "folder_name 컬럼"],
    ["비교", "체크박스 선택 → '비교하기' 버튼 (최대 4개)", "GET /api/v1/favorites/compare?ids="],
    ["한도", "최대 500개 (초과 시 400 LIMIT_EXCEEDED)", "서버 검증"],
  ],
  [1200, 4500, 3660]
));
children.push(spacer());

children.push(heading("4.2 매물 비교 기능", HeadingLevel.HEADING_2));
children.push(p([run("마켓 유형별로 비교 항목이 다르게 표시됩니다:")]));
children.push(makeTable(
  ["비교 항목", "급매 (DISTRESSED)", "경매/공매 (AUCTION)", "비경매 NPL"],
  [
    ["가격", "급매가 / 시세", "최저가 / 감정가", "채권액 / 담보가"],
    ["할인율", "시세대비 할인율", "감정가 대비 %", "매입가 대비 LTV"],
    ["AI 분석", "AI 추정가", "낙찰가율 AI", "채권 수익률"],
    ["위치", "주소 + 지도 링크", "법원 + 주소", "담보물 주소"],
    ["면적", "전용/공급 면적", "토지/건물 면적", "담보물 면적"],
    ["상태", "공실/임차 여부", "회차/유찰 횟수", "NDA/딜룸 단계"],
    ["특이사항", "하자/결함 메모", "점유자/권리분석", "채무자 상태"],
  ],
  [1200, 2400, 2400, 3360]
));
children.push(spacer());

children.push(heading("4.3 비교 결과 하이라이트", HeadingLevel.HEADING_2));
children.push(bullet("가격: 가장 저렴한 매물 green 배경, 가장 비싼 매물 red 배경"));
children.push(bullet("할인율: 가장 높은 할인율 green 강조"));
children.push(bullet("AI 점수: 가장 높은 점수에 star 아이콘"));
children.push(bullet("내보내기: PDF/CSV 다운로드 (비교 테이블 포함)"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 5. 맞춤 알림 시스템
// ══════════════════════════════════════════════════════════════
children.push(heading("5. 맞춤 알림 시스템"));

children.push(heading("5.1 알림 조건 설정", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["조건 항목", "UI 컴포넌트", "타입", "설명"],
  [
    ["마켓 유형", "MarketTypeSelector", "Multi-select", "급매 / 경매 / 비경매 (중복 선택 가능)"],
    ["지역", "RegionCascader", "Cascader (시도→시군구)", "관심 지역 설정 (다중 선택)"],
    ["담보유형", "CollateralTypeSelector", "Multi-select", "아파트/상가/토지/오피스텔 등"],
    ["금액 범위", "PriceRangeSlider", "Range (min~max)", "투자 가능 금액대 (만원 단위)"],
    ["할인율 최소", "DiscountMinSlider", "Slider", "최소 할인율 (%, 0~70)"],
    ["경매 회차", "AuctionRoundRange", "Range (min~max)", "1회~N회 (경매만 해당)"],
    ["키워드", "KeywordInput", "Text[]", "특정 키워드 매칭 (OR 조건)"],
  ],
  [1200, 1800, 1500, 4860]
));
children.push(spacer());

children.push(heading("5.2 알림 채널", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["채널", "구현 기술", "빈도 설정", "기본값", "비고"],
  [
    ["이메일", "Supabase Edge Function → SendGrid", "즉시 / 일 1회 / 주 1회", "ON", "기본 활성"],
    ["푸시 알림", "Web Push API (Service Worker)", "즉시만", "OFF", "브라우저 허용 필요"],
    ["카카오 알림톡", "카카오 알림톡 API", "즉시 / 일 1회", "OFF", "카카오 연동 필요"],
    ["인앱 알림", "Supabase Realtime → NotificationBell", "실시간", "ON (고정)", "항상 활성"],
  ],
  [1000, 2200, 1500, 600, 4060]
));
children.push(spacer());

children.push(heading("5.3 알림 트리거 로직", HeadingLevel.HEADING_2));
children.push(code("// Supabase Edge Function: check-new-listings (cron: 매 1시간)"));
children.push(code("1. SELECT * FROM npl_listings WHERE created_at > last_check_time AND status = 'ACTIVE'"));
children.push(code("2. FOR EACH alert_setting WHERE is_active = true:"));
children.push(code("   a. 조건 매칭: listing.collateral_type IN conditions.collateral_types"));
children.push(code("                 AND listing.region IN conditions.regions"));
children.push(code("                 AND listing.price BETWEEN conditions.price_range.min AND max"));
children.push(code("                 AND listing.discount_rate >= conditions.min_discount"));
children.push(code("   b. 매칭 시 → INSERT INTO notifications (type='NEW_LISTING_MATCH')"));
children.push(code("   c. frequency = 'IMMEDIATE' → 채널별 즉시 발송"));
children.push(code("   d. frequency = 'DAILY' → daily_digest_queue에 추가 (매일 09:00 발송)"));
children.push(code("   e. frequency = 'WEEKLY' → weekly_digest_queue에 추가 (매주 월요일 09:00)"));
children.push(spacer());

children.push(heading("5.4 알림 이력 관리", HeadingLevel.HEADING_2));
children.push(bullet("인앱 알림 벨: 미읽음 카운트 표시 (Navigation에 NotificationBell 컴포넌트)"));
children.push(bullet("알림 목록: 전체/미읽음 탭, 유형별 아이콘 (가격변동/신규매물/경매일)"));
children.push(bullet("일괄 읽음 처리: '모두 읽음' 버튼"));
children.push(bullet("알림 보관: 90일 후 자동 삭제 (pg_cron)"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 6. 분석 이력 관리
// ══════════════════════════════════════════════════════════════
children.push(heading("6. 분석 이력 관리"));
children.push(makeTable(
  ["기능", "상세", "UI 컴포넌트"],
  [
    ["이력 목록", "분석 유형별 탭 (가격/등기/낙찰가율/수익률)", "AnalysisTypeTabs + AnalysisTable"],
    ["결과 카드", "분석일, 대상 물건, 핵심 결과 요약, 재분석 버튼", "AnalysisResultRow"],
    ["추이 비교", "동일 물건 분석 이력 비교 (날짜별 변화 차트)", "HistoryChart (Recharts LineChart)"],
    ["내보내기", "개별 또는 일괄 PDF 내보내기", "ExportButton + ExportAllButton"],
    ["삭제", "개별 삭제 확인 다이얼로그, 30일 후 자동 삭제", "ConfirmDialog"],
    ["페이지네이션", "cursor-based, 20건/페이지", "Pagination 공유 컴포넌트"],
  ],
  [1200, 3800, 4360]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 7. API 엔드포인트 스키마
// ══════════════════════════════════════════════════════════════
children.push(heading("7. API 엔드포인트 스키마"));
children.push(p([bold("모든 API는 Authorization: Bearer <supabase_jwt> 필수, Rate Limit 적용")]));

children.push(heading("7.1 GET /api/v1/investor/dashboard", HeadingLevel.HEADING_2));
children.push(code("// Response 200:"));
children.push(code("{"));
children.push(code("  kpis: {"));
children.push(code("    favorite_count: number;"));
children.push(code("    active_contracts: number;"));
children.push(code("    analysis_count: number;       // 이번달"));
children.push(code("    monthly_investment: number;    // 원"));
children.push(code("  },"));
children.push(code("  recommendations: {"));
children.push(code("    listing: NplListing;"));
children.push(code("    match_score: number;           // 0~100"));
children.push(code("    match_factors: {"));
children.push(code("      factor: string;              // 'collateral' | 'region' | ..."));
children.push(code("      score: number;"));
children.push(code("      weight: number;"));
children.push(code("    }[];"));
children.push(code("  }[],"));
children.push(code("  recent_analysis: {"));
children.push(code("    id: string;"));
children.push(code("    listing_id: string;"));
children.push(code("    listing_title: string;"));
children.push(code("    analysis_type: 'PRICE' | 'REGISTRY' | 'WINNING_RATE' | 'PROFIT';"));
children.push(code("    result_summary: string;"));
children.push(code("    created_at: string;            // ISO 8601"));
children.push(code("  }[],"));
children.push(code("  active_deals: {"));
children.push(code("    id: string;"));
children.push(code("    listing_title: string;"));
children.push(code("    status: ContractStatus;"));
children.push(code("    counterparty: string;"));
children.push(code("    updated_at: string;"));
children.push(code("  }[]"));
children.push(code("}"));
children.push(spacer());

children.push(heading("7.2 GET /api/v1/favorites", HeadingLevel.HEADING_2));
children.push(code("// Query: ?folder=기본&sort=date_desc&cursor=xxx&limit=20"));
children.push(code("// Response 200:"));
children.push(code("{"));
children.push(code("  data: {"));
children.push(code("    id: string;"));
children.push(code("    listing: NplListing;"));
children.push(code("    folder_name: string;"));
children.push(code("    memo: string | null;"));
children.push(code("    price_at_save: number;"));
children.push(code("    price_change_pct: number;     // 계산: (current - saved) / saved × 100"));
children.push(code("    created_at: string;"));
children.push(code("  }[],"));
children.push(code("  next_cursor: string | null,"));
children.push(code("  total: number"));
children.push(code("}"));
children.push(spacer());

children.push(heading("7.3 POST /api/v1/favorites", HeadingLevel.HEADING_2));
children.push(code("// Request:"));
children.push(code("{ listing_id: string; folder_name?: string; memo?: string }"));
children.push(code("// Response 201: { id: string; created_at: string }"));
children.push(code("// Error 409: { code: 'DUPLICATE', message: '이미 관심 등록된 매물입니다' }"));
children.push(code("// Error 400: { code: 'LIMIT_EXCEEDED', message: '관심 매물은 최대 500개까지 등록 가능합니다' }"));
children.push(spacer());

children.push(heading("7.4 DELETE /api/v1/favorites/:id", HeadingLevel.HEADING_2));
children.push(code("// Response 204: No Content"));
children.push(code("// Error 404: { code: 'NOT_FOUND', message: '관심 매물을 찾을 수 없습니다' }"));
children.push(code("// Error 403: { code: 'FORBIDDEN', message: '본인의 관심 매물만 삭제할 수 있습니다' }"));
children.push(spacer());

children.push(heading("7.5 PATCH /api/v1/favorites/:id", HeadingLevel.HEADING_2));
children.push(code("// Request: { folder_name?: string; memo?: string }"));
children.push(code("// Response 200: { id: string; updated_at: string }"));
children.push(spacer());

children.push(heading("7.6 GET /api/v1/favorites/compare", HeadingLevel.HEADING_2));
children.push(code("// Query: ?ids=uuid1,uuid2,uuid3 (최소 2개, 최대 4개)"));
children.push(code("// Response 200:"));
children.push(code("{"));
children.push(code("  listings: NplListing[],"));
children.push(code("  comparison: {"));
children.push(code("    field: string;"));
children.push(code("    values: (string | number | null)[];"));
children.push(code("    highlight: 'best' | 'worst' | null;"));
children.push(code("  }[]"));
children.push(code("}"));
children.push(code("// Error 400: { code: 'VALIDATION_ERROR', message: '2~4개 매물을 선택해주세요' }"));
children.push(spacer());

children.push(heading("7.7 POST /api/v1/alerts", HeadingLevel.HEADING_2));
children.push(code("// Request:"));
children.push(code("{"));
children.push(code("  name: string;                    // 알림 이름 (예: '강남 아파트 급매')"));
children.push(code("  conditions: {"));
children.push(code("    market_types?: ListingType[];"));
children.push(code("    regions?: string[];"));
children.push(code("    collateral_types?: string[];"));
children.push(code("    price_range?: { min: number; max: number };"));
children.push(code("    min_discount?: number;"));
children.push(code("    auction_round_range?: { min: number; max: number };"));
children.push(code("    keywords?: string[];"));
children.push(code("  },"));
children.push(code("  channels: { email: boolean; push: boolean; kakao: boolean; in_app: boolean },"));
children.push(code("  frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY'"));
children.push(code("}"));
children.push(code("// Response 201: { id: string; created_at: string }"));
children.push(code("// Error 400: { code: 'LIMIT_EXCEEDED', message: '알림은 최대 10개까지 설정 가능합니다' }"));
children.push(spacer());

children.push(heading("7.8 POST /api/v1/matching/run", HeadingLevel.HEADING_2));
children.push(code("// Request: { survey_id: string }"));
children.push(code("// Response 200:"));
children.push(code("{"));
children.push(code("  job_id: string;"));
children.push(code("  status: 'PROCESSING' | 'COMPLETED';"));
children.push(code("  results?: {"));
children.push(code("    listing: NplListing;"));
children.push(code("    score: number;"));
children.push(code("    factors: { name: string; score: number; weight: number; detail: string }[];"));
children.push(code("    rank: number;"));
children.push(code("  }[],"));
children.push(code("  estimated_time?: number;          // 초 (PROCESSING일 때)"));
children.push(code("}"));
children.push(code("// Rate Limit: 10req/hour (AI 분석 카테고리)"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 8. 상태 관리
// ══════════════════════════════════════════════════════════════
children.push(heading("8. 상태 관리"));

children.push(heading("8.1 React Query (서버 상태)", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["queryKey", "staleTime", "refetchInterval", "비고"],
  [
    ["['investor', 'dashboard']", "30초", "30초", "대시보드 자동 새로고침"],
    ["['favorites', { folder, sort, cursor }]", "5분", "-", "폴더/정렬 변경 시 새 쿼리"],
    ["['favorites', 'compare', ids]", "10분", "-", "비교 페이지 캐시"],
    ["['alerts']", "10분", "-", "알림 설정은 자주 변경 안됨"],
    ["['analysis-history', { type, cursor }]", "5분", "-", "분석 이력"],
    ["['notifications', { unread }]", "1분", "1분", "미읽음 카운트 자동 갱신"],
  ],
  [3000, 1000, 1200, 4160]
));
children.push(spacer());

children.push(heading("8.2 Mutation + Cache Invalidation", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["Mutation", "onSuccess 캐시 처리", "Optimistic Update"],
  [
    ["addFavorite", "invalidate(['favorites']), setQueryData(['investor','dashboard'])", "O (즉시 목록에 추가)"],
    ["removeFavorite", "invalidate(['favorites']), update dashboard KPI", "O (즉시 목록에서 제거)"],
    ["updateFavoriteMemo", "setQueryData로 해당 항목만 갱신", "O"],
    ["createAlert", "invalidate(['alerts'])", "X"],
    ["deleteAlert", "invalidate(['alerts'])", "O"],
    ["runMatching", "invalidate(['investor','dashboard'])", "X (비동기)"],
  ],
  [2000, 4500, 2860]
));
children.push(spacer());

children.push(heading("8.3 Zustand (클라이언트 상태)", HeadingLevel.HEADING_2));
children.push(code("// stores/compare-store.ts"));
children.push(code("interface CompareStore {"));
children.push(code("  selectedIds: string[];           // 비교 대상 ID (최대 4개)"));
children.push(code("  add: (id: string) => void;"));
children.push(code("  remove: (id: string) => void;"));
children.push(code("  clear: () => void;"));
children.push(code("}"));
children.push(spacer());
children.push(code("// stores/filter-store.ts"));
children.push(code("interface FilterStore {"));
children.push(code("  folder: string;                  // 현재 선택된 폴더"));
children.push(code("  sort: 'date_desc' | 'price_asc' | 'change_desc';"));
children.push(code("  setFolder: (f: string) => void;"));
children.push(code("  setSort: (s: string) => void;"));
children.push(code("}"));
children.push(spacer());

children.push(heading("8.4 Supabase Realtime", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["Channel", "이벤트", "처리"],
  [
    ["favorites:{userId}", "npl_listings 가격 변동 감지", "Toast 알림 + KPI 갱신 + PriceChangeBadge"],
    ["matching:{userId}", "새 매칭 결과 생성", "Toast 알림 + 추천 매물 갱신"],
    ["notifications:{userId}", "새 알림 생성", "NotificationBell 카운트 + 1"],
  ],
  [2500, 3000, 3860]
));
children.push(bullet("연결 관리: useEffect cleanup, 재연결 자동 (Supabase Realtime 내장 backoff)"));
children.push(bullet("구독 최적화: 페이지 포커스 시에만 활성, background 시 구독 해제"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 9. DB 스키마
// ══════════════════════════════════════════════════════════════
children.push(heading("9. DB 스키마"));

children.push(heading("9.1 favorites", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE favorites ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,"));
children.push(code("  listing_id UUID NOT NULL REFERENCES npl_listings(id) ON DELETE CASCADE,"));
children.push(code("  folder_name TEXT DEFAULT '기본',"));
children.push(code("  memo TEXT CHECK (char_length(memo) <= 500),"));
children.push(code("  price_at_save NUMERIC NOT NULL,    -- 찜 시점 가격 (변동 비교용)"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now(),"));
children.push(code("  UNIQUE(user_id, listing_id)"));
children.push(code(");"));
children.push(code("-- 인덱스"));
children.push(code("CREATE INDEX idx_favorites_user ON favorites(user_id);"));
children.push(code("CREATE INDEX idx_favorites_user_folder ON favorites(user_id, folder_name);"));
children.push(code("CREATE INDEX idx_favorites_listing ON favorites(listing_id);"));
children.push(spacer());

children.push(heading("9.2 alert_settings", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE alert_settings ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,"));
children.push(code("  name TEXT NOT NULL CHECK (char_length(name) <= 50),"));
children.push(code("  conditions JSONB NOT NULL,          -- {market_types, regions, ...}"));
children.push(code("  channels JSONB DEFAULT '{\"email\":true,\"push\":false,\"kakao\":false,\"in_app\":true}',"));
children.push(code("  frequency TEXT DEFAULT 'IMMEDIATE' CHECK (frequency IN ('IMMEDIATE','DAILY','WEEKLY')),"));
children.push(code("  is_active BOOLEAN DEFAULT true,"));
children.push(code("  last_triggered_at TIMESTAMPTZ,"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now(),"));
children.push(code("  updated_at TIMESTAMPTZ DEFAULT now()"));
children.push(code(");"));
children.push(code("CREATE INDEX idx_alerts_user ON alert_settings(user_id);"));
children.push(code("CREATE INDEX idx_alerts_active ON alert_settings(is_active) WHERE is_active = true;"));
children.push(spacer());

children.push(heading("9.3 notifications", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE notifications ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,"));
children.push(code("  type TEXT NOT NULL CHECK (type IN ('PRICE_CHANGE','NEW_LISTING','AUCTION_REMINDER','CONTRACT_UPDATE','MATCHING','SYSTEM')),"));
children.push(code("  title TEXT NOT NULL,"));
children.push(code("  message TEXT,"));
children.push(code("  data JSONB,                        -- {listing_id, contract_id, ...}"));
children.push(code("  is_read BOOLEAN DEFAULT false,"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
children.push(code(");"));
children.push(code("CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);"));
children.push(code("CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;"));
children.push(spacer());

children.push(heading("9.4 matching_results", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE matching_results ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  survey_id UUID NOT NULL REFERENCES demand_surveys(id) ON DELETE CASCADE,"));
children.push(code("  listing_id UUID NOT NULL REFERENCES npl_listings(id) ON DELETE CASCADE,"));
children.push(code("  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 100),"));
children.push(code("  factors JSONB NOT NULL,             -- [{name, score, weight, detail}]"));
children.push(code("  rank INT,"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now(),"));
children.push(code("  UNIQUE(survey_id, listing_id)"));
children.push(code(");"));
children.push(code("CREATE INDEX idx_matching_survey ON matching_results(survey_id, score DESC);"));
children.push(code("CREATE INDEX idx_matching_listing ON matching_results(listing_id);"));
children.push(spacer());

children.push(heading("9.5 ai_analysis_results", HeadingLevel.HEADING_2));
children.push(code("CREATE TABLE ai_analysis_results ("));
children.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
children.push(code("  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,"));
children.push(code("  listing_id UUID NOT NULL REFERENCES npl_listings(id) ON DELETE CASCADE,"));
children.push(code("  analysis_type TEXT NOT NULL CHECK (analysis_type IN ('PRICE','REGISTRY','WINNING_RATE','PROFIT')),"));
children.push(code("  input_params JSONB,                 -- 분석 입력 파라미터"));
children.push(code("  result JSONB NOT NULL,              -- 분석 결과 (타입별 상이)"));
children.push(code("  result_summary TEXT,                -- 한줄 요약"));
children.push(code("  confidence_score NUMERIC,           -- 0~1 (AI 신뢰도)"));
children.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
children.push(code(");"));
children.push(code("CREATE INDEX idx_analysis_user ON ai_analysis_results(user_id, created_at DESC);"));
children.push(code("CREATE INDEX idx_analysis_listing ON ai_analysis_results(listing_id, analysis_type);"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 10. RLS (Row Level Security) 정책
// ══════════════════════════════════════════════════════════════
children.push(heading("10. RLS 정책"));
children.push(p([bold("모든 테이블에 RLS 활성화, 본인 데이터만 접근 가능")]));

children.push(makeTable(
  ["테이블", "SELECT", "INSERT", "UPDATE", "DELETE"],
  [
    ["favorites", "user_id = auth.uid()", "user_id = auth.uid()", "user_id = auth.uid()", "user_id = auth.uid()"],
    ["alert_settings", "user_id = auth.uid()", "user_id = auth.uid()", "user_id = auth.uid()", "user_id = auth.uid()"],
    ["notifications", "user_id = auth.uid()", "service_role만", "user_id = auth.uid() (is_read만)", "user_id = auth.uid()"],
    ["matching_results", "survey.user_id = auth.uid()", "service_role만", "-", "service_role만"],
    ["ai_analysis_results", "user_id = auth.uid()", "user_id = auth.uid()", "-", "user_id = auth.uid()"],
  ],
  [1500, 2000, 1800, 2000, 2060]
));
children.push(spacer());

children.push(heading("10.1 RLS 정책 SQL 예시", HeadingLevel.HEADING_2));
children.push(code("-- favorites: 본인 데이터만 접근"));
children.push(code("ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;"));
children.push(code("CREATE POLICY favorites_select ON favorites FOR SELECT USING (user_id = auth.uid());"));
children.push(code("CREATE POLICY favorites_insert ON favorites FOR INSERT WITH CHECK (user_id = auth.uid());"));
children.push(code("CREATE POLICY favorites_update ON favorites FOR UPDATE USING (user_id = auth.uid());"));
children.push(code("CREATE POLICY favorites_delete ON favorites FOR DELETE USING (user_id = auth.uid());"));
children.push(spacer());
children.push(code("-- notifications: 본인만 읽기, 서버만 생성"));
children.push(code("ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;"));
children.push(code("CREATE POLICY notif_select ON notifications FOR SELECT USING (user_id = auth.uid());"));
children.push(code("CREATE POLICY notif_update ON notifications FOR UPDATE USING (user_id = auth.uid())"));
children.push(code("  WITH CHECK (user_id = auth.uid()); -- is_read 필드만 업데이트 허용 (앱 로직)"));
children.push(code("CREATE POLICY notif_delete ON notifications FOR DELETE USING (user_id = auth.uid());"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 11. 에러 처리 + 엣지 케이스
// ══════════════════════════════════════════════════════════════
children.push(heading("11. 에러 처리 + 엣지 케이스"));

children.push(heading("11.1 API 에러 코드", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["HTTP", "code", "message (한국어)", "발생 조건"],
  [
    ["400", "VALIDATION_ERROR", "입력값이 올바르지 않습니다", "Zod 검증 실패"],
    ["400", "LIMIT_EXCEEDED", "관심 매물은 최대 500개까지 등록 가능합니다", "favorites 500개 초과"],
    ["400", "ALERT_LIMIT", "알림은 최대 10개까지 설정 가능합니다", "alert_settings 10개 초과"],
    ["401", "AUTH_UNAUTHORIZED", "로그인이 필요합니다", "JWT 만료/없음"],
    ["403", "FORBIDDEN", "접근 권한이 없습니다", "다른 유저 데이터 접근"],
    ["403", "ROLE_REQUIRED", "투자자 회원만 이용 가능합니다", "BUYER_INST/INDV 아님"],
    ["404", "NOT_FOUND", "매물을 찾을 수 없습니다", "삭제된 매물"],
    ["409", "DUPLICATE", "이미 관심 등록된 매물입니다", "favorites UNIQUE 위반"],
    ["429", "RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해주세요", "Rate Limit 초과"],
  ],
  [600, 1500, 3500, 3760]
));
children.push(spacer());

children.push(heading("11.2 프론트엔드 에러 처리", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["시나리오", "처리", "UI 피드백"],
  [
    ["네트워크 오프라인", "React Query retry 3회 → error boundary", "Toast: '네트워크 연결을 확인해주세요'"],
    ["JWT 만료 (401)", "refreshSession() 자동 시도 → 실패 시 /login 리다이렉트", "Toast: '세션이 만료되었습니다'"],
    ["권한 없음 (403)", "에러 페이지 표시 + 역할 안내", "Alert: '투자자 회원만 이용 가능합니다'"],
    ["중복 관심 등록 (409)", "Optimistic Update 롤백 + 알림", "Toast: '이미 관심 등록된 매물입니다'"],
    ["Rate Limit (429)", "자동 재시도 대기 표시", "Toast: '잠시 후 다시 시도해주세요' + countdown"],
    ["서버 에러 (500)", "React Query retry → Error Boundary", "에러 페이지 + '다시 시도' 버튼"],
    ["빈 상태 (0건)", "EmptyState 컴포넌트 (아이콘 + 안내 + CTA)", "관심 매물 없음 → '매물 검색하기' 버튼"],
  ],
  [1800, 3500, 4060]
));
children.push(spacer());

children.push(heading("11.3 엣지 케이스", HeadingLevel.HEADING_2));
children.push(bullet("관심 매물의 원본이 삭제된 경우: listing_id FK에 ON DELETE CASCADE → 자동 삭제 + 알림"));
children.push(bullet("비교 중 매물이 삭제된 경우: 비교 페이지에서 '삭제된 매물입니다' 표시, 다른 매물로 대체 안내"));
children.push(bullet("매칭 대상 매물 0건: '조건에 맞는 매물이 없습니다. 알림을 설정하면 새 매물 등록 시 알려드립니다'"));
children.push(bullet("동시 접속 시 가격 변동: Realtime 구독으로 즉시 반영, Optimistic Update와 서버 응답 불일치 시 서버 우선"));
children.push(bullet("대량 알림 발송: 일일 발송 한도 100건/유저, 초과 시 다음 DAILY digest로 이월"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 12. 보안 요구사항
// ══════════════════════════════════════════════════════════════
children.push(heading("12. 보안 요구사항"));

children.push(makeTable(
  ["영역", "위협", "방어 수단", "구현"],
  [
    ["인증", "비인증 접근", "JWT 필수 + middleware 검증", "middleware.ts + 각 API route"],
    ["인가", "타인 데이터 접근", "RLS + API에서 user_id 검증", "Supabase RLS 정책"],
    ["입력 검증", "XSS / Injection", "Zod 스키마 + DOMPurify (메모 필드)", "서버: Zod, 클라이언트: DOMPurify"],
    ["Rate Limit", "남용 / DDoS", "100req/min (인증), 10req/hr (AI)", "Supabase Edge Function"],
    ["데이터 노출", "PII 유출", "관심 매물에 PII 미포함, 마스킹", "API 응답 필터링"],
    ["CSRF", "Cross-site 요청 위조", "SameSite=Lax + Origin 검증", "Next.js 미들웨어"],
  ],
  [1000, 1500, 3000, 3860]
));
children.push(spacer());

children.push(heading("12.1 투자 위험 고지", HeadingLevel.HEADING_2));
children.push(p([bold("금융소비자보호법 준수 - 모든 AI 분석 결과에 표시:")]));
children.push(code("const RISK_DISCLAIMER = '⚠️ 본 분석은 AI가 생성한 참고 자료이며,"));
children.push(code("  투자 판단의 근거가 되지 않습니다. 실제 투자 전 반드시 전문가와"));
children.push(code("  상담하시기 바랍니다. NPLATFORM은 투자 손실에 대해 책임지지 않습니다.';"));
children.push(bullet("대시보드 추천 매물: 하단에 RiskDisclaimer 컴포넌트 상시 표시"));
children.push(bullet("분석 결과 카드: 결과 하단에 노란색 경고 박스로 표시"));
children.push(bullet("비교 페이지: 상단에 고정 배너로 표시"));
children.push(bullet("PDF 내보내기: 첫 페이지와 마지막 페이지에 고지문 포함"));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 13. 접근성 (a11y) 요구사항
// ══════════════════════════════════════════════════════════════
children.push(heading("13. 접근성 요구사항"));

children.push(makeTable(
  ["영역", "요구사항", "구현 방법"],
  [
    ["키보드 네비게이션", "모든 기능 키보드로 조작 가능", "Tab, Enter, Escape, Space 이벤트 핸들링"],
    ["스크린 리더", "매물 카드, KPI, 차트에 aria-label", "aria-label, aria-describedby, role 속성"],
    ["색상 대비", "텍스트/배경 대비율 4.5:1 이상", "WCAG 2.1 AA 기준, 가격 변동에 색상+아이콘 동시 사용"],
    ["포커스 관리", "모달 열기/닫기 시 포커스 이동", "Dialog 컴포넌트 focus trap"],
    ["반응형", "375px ~ 1440px 대응", "Mobile: 1col, Tablet: 2col, Desktop: 4col KPI"],
    ["로딩 상태", "비동기 데이터 로딩 시 skeleton", "Skeleton 컴포넌트 + aria-busy='true'"],
    ["에러 상태", "에러 메시지 스크린 리더 알림", "role='alert' + aria-live='polite'"],
  ],
  [1500, 3000, 4860]
));
children.push(spacer());

children.push(heading("13.1 반응형 Breakpoint", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["화면", "너비", "KPI", "추천 매물", "관심 목록"],
  [
    ["Mobile", "< 640px", "2×2 Grid", "1열 카드", "1열 리스트"],
    ["Tablet", "640~1024px", "4×1 Grid", "2열 카드", "2열 리스트"],
    ["Desktop", "> 1024px", "4×1 Grid", "좌2/3 + 우1/3", "3열 리스트"],
  ],
  [1000, 1000, 1500, 2500, 3360]
));
children.push(pageBreak());

// ══════════════════════════════════════════════════════════════
// 14. 개발 체크리스트
// ══════════════════════════════════════════════════════════════
children.push(heading("14. 개발 체크리스트"));

children.push(heading("14.1 개발 일정", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["우선순위", "태스크", "예상 일정", "의존성"],
  [
    ["P0", "투자자 대시보드 레이아웃 + KPI API", "Day 1-2", "DB 스키마 (Phase 1)"],
    ["P0", "관심 매물 CRUD + 목록 + 폴더 관리", "Day 2-3", "favorites 테이블"],
    ["P0", "매물 비교 기능 (ComparisonPage)", "Day 3-4", "관심 매물 완료"],
    ["P1", "맞춤 추천 매칭 엔진 (PostgreSQL Function)", "Day 4-5", "matching_results 테이블"],
    ["P1", "알림 조건 설정 UI + API", "Day 5-6", "alert_settings 테이블"],
    ["P1", "알림 채널 연동 (이메일/푸시)", "Day 6-7", "SendGrid + Web Push 설정"],
    ["P2", "분석 이력 관리 + 추이 차트", "Day 7-8", "ai_analysis_results 테이블"],
    ["P2", "Supabase Realtime 구독 (가격변동/매칭)", "Day 8", "Realtime 채널 설정"],
    ["P2", "PDF/CSV 내보내기 기능", "Day 8-9", "비교/분석 페이지 완료"],
    ["P3", "반응형 + 접근성 + Lighthouse 최적화", "Day 9-10", "전체 UI 완료"],
  ],
  [800, 3500, 1200, 3860]
));
children.push(spacer());

children.push(heading("14.2 테스트 항목", HeadingLevel.HEADING_2));
children.push(bullet("단위 테스트: 매칭 엔진 점수 계산, 가격 변동률 계산, 알림 조건 매칭 로직"));
children.push(bullet("통합 테스트: API 호출 → UI 반영, 관심 등록 → 목록 갱신, 비교 페이지 렌더링"));
children.push(bullet("RLS 테스트: 다른 유저의 관심 매물/알림/분석 결과 접근 불가 확인"));
children.push(bullet("E2E 테스트: 대시보드 → 추천 매물 클릭 → 상세 → 관심 등록 → 비교 → 내보내기"));
children.push(bullet("반응형 테스트: Chrome DevTools 3개 Breakpoint (1280/768/375)"));
children.push(bullet("성능 테스트: Lighthouse Performance 90+, API P95 < 500ms, 매칭 엔진 < 100ms"));
children.push(bullet("보안 테스트: XSS (메모 필드), Rate Limit (429 응답), JWT 만료 처리"));

children.push(heading("14.3 완료 기준 (Definition of Done)", HeadingLevel.HEADING_2));
children.push(bullet("모든 페이지 Preview 렌더링 확인"));
children.push(bullet("API 응답 타입 일치 (Zod 스키마 검증)"));
children.push(bullet("RLS 정책 테스트 통과 (다른 유저 데이터 접근 불가)"));
children.push(bullet("투자 위험 고지 모든 AI 관련 화면에 표시"));
children.push(bullet("콘솔 에러/경고 0건"));
children.push(bullet("Lighthouse: Performance 90+, Accessibility 90+, SEO 90+"));

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
        new TextRun({ text: "NPLATFORM Module 5: 투자자 분석도구 | ", font: "Arial", size: 16, color: C.gray }),
        new TextRun({ text: "Confidential", font: "Arial", size: 16, color: C.red, italics: true }),
      ]})
    ]})},
    footers: { default: new Footer({ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "\u00A9 2026 NPLATFORM. Page ", font: "Arial", size: 16, color: C.gray }),
        new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray }),
      ]})
    ]})},
    children
  }]
});

const outPath = __dirname + "/NPL_Module5_Investor_Tools_v2.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log(`Created: ${outPath} (${Math.round(buf.length/1024)}KB)`);
});
