const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, PageBreak, PageNumber, LevelFormat, TableOfContents } = require("docx");
const C = { navy: "1B3A5C", blue: "2E75B6", accent: "10B981", white: "FFFFFF", gray: "6B7280", lightGray: "E5E7EB", red: "EF4444", purple: "7C3AED" };
const bdr = (c = C.lightGray) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = { top: bdr(), bottom: bdr(), left: bdr(), right: bdr() };
const cellM = { top: 80, bottom: 80, left: 120, right: 120 };
const heading = (t, l = HeadingLevel.HEADING_1) => new Paragraph({ heading: l, children: [new TextRun(t)] });
const p = (text) => new Paragraph({ spacing: { after: 120 }, children: Array.isArray(text) ? text : [new TextRun({ text, font: "Arial", size: 22 })] });
const bold = (t) => new TextRun({ text: t, bold: true, font: "Arial", size: 22 });
const run = (t, o = {}) => new TextRun({ text: t, font: "Arial", size: 22, ...o });
const hc = (text, w) => new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cellM, shading: { fill: C.navy, type: ShadingType.CLEAR }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: C.white, font: "Arial", size: 20 })] })] });
const cl = (text, w, o = {}) => new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cellM, shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined, children: [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(text), font: "Arial", size: 20, ...o })] })] });
const mt = (h, rows, cw) => { const t=cw.reduce((a,b)=>a+b,0); return new Table({width:{size:t,type:WidthType.DXA},columnWidths:cw,rows:[new TableRow({children:h.map((x,i)=>hc(x,cw[i]))}), ...rows.map(r=>new TableRow({children:r.map((c,i)=>cl(typeof c==="object"?c.text:c,cw[i],typeof c==="object"?c:{}))}))] }); };
const numbering = { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }, { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] };
const bullet = (t) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const numItem = (t) => new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const code = (t) => new Paragraph({ spacing: { after: 80 }, shading: { fill: "F3F4F6", type: ShadingType.CLEAR }, children: [new TextRun({ text: t, font: "Consolas", size: 18 })] });

const styles = { default: { document: { run: { font: "Arial", size: 22 } } }, paragraphStyles: [
  { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 36, bold: true, color: C.navy }, paragraph: { spacing: { before: 360, after: 200 } } },
  { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 30, bold: true, color: C.blue }, paragraph: { spacing: { before: 280, after: 160 } } },
  { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 26, bold: true, color: C.navy }, paragraph: { spacing: { before: 200, after: 120 } } },
]};
const pageProps = { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } };

function buildCover(moduleNum, title, figmaRef) {
  return [
    new Paragraph({ spacing: { before: 3000 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NPLATFORM", font: "Arial", size: 72, bold: true, color: C.navy })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Module ${moduleNum}`, font: "Arial", size: 48, color: C.blue })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: title, font: "Arial", size: 32, color: C.gray })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 1 } }, children: [] }),
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [run(`Version 2.0 | 2026.03.13 | ${figmaRef}`, { color: C.gray })] }),
    new Paragraph({ children: [new PageBreak()] }),
    heading("목차"),
    new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ═══════════════════════════════════
// MODULE 5: 투자자 분석도구
// ═══════════════════════════════════
const m5 = [];
m5.push(...buildCover(5, "투자자 분석도구 + 수익률 시뮬레이터 세부 기획서", "투자자 도구 종합"));

m5.push(heading("1. 모듈 개요"));
m5.push(p([run("투자자에게 '여기오면 부실채권을 다 찾을 수 있고 분석 솔루션이 장착되어 별도 고민이 필요없다'는 경험을 제공하는 핵심 모듈입니다.")]));
m5.push(heading("1.1 담당 라우트", HeadingLevel.HEADING_2));
m5.push(mt(["라우트","페이지명","권한","설명"],[
  ["/investor/dashboard","투자자 대시보드","BUYER_INST/INDV","관심매물, AI이력, 계약현황"],
  ["/investor/favorites","관심 매물","BUYER_INST/INDV","찜한 매물 목록 + 변동 알림"],
  ["/investor/alerts","맞춤 알림","BUYER_INST/INDV","알림 조건 설정 + 이력"],
  ["/investor/analysis-history","분석 이력","BUYER_INST/INDV","AI 분석 결과 전체 이력"],
  ["/investor/comparisons","매물 비교","BUYER_INST/INDV","최대 4개 매물 비교표"],
],[2500,1500,1500,3860]));
ch5Note = "※ AI 가격예측, 등기분석, 낙찰가율, 수익률시뮬레이터 도구 상세는 Module 3 참조";
m5.push(p([run(ch5Note, { italics: true, color: C.gray })]));
m5.push(new Paragraph({ children: [new PageBreak()] }));

m5.push(heading("2. 투자자 대시보드"));
m5.push(heading("2.1 레이아웃", HeadingLevel.HEADING_2));
m5.push(mt(["영역","내용","크기"],[
  ["상단 KPI","관심매물 수, 계약 진행중, 분석 이용 횟수, 이번달 투자액","4-Column 카드"],
  ["관심 매물 변동","찜한 매물 중 가격변동/상태변경 알림 카드","좌측 2/3"],
  ["맞춤 추천","매칭 엔진 기반 추천 매물 3건","우측 1/3"],
  ["최근 AI 분석","최근 분석 결과 5건 (재분석 바로가기)","Full width 테이블"],
  ["진행중 딜","계약 요청/딜룸 진행 현황","Full width 카드"],
],[1500,4000,3860]));
m5.push(new Paragraph({ spacing: { after: 200 } }));

m5.push(heading("2.2 맞춤 추천 매칭 엔진", HeadingLevel.HEADING_2));
m5.push(p([bold("가중치 매칭 알고리즘:")]));
m5.push(mt(["Factor","가중치","데이터 소스","매칭 로직"],[
  ["담보유형","30%","수요설문 선호 유형","선호 유형 일치 → 100%, 유사 → 50%, 불일치 → 0%"],
  ["지역","25%","수요설문 선호 지역","동일 시도 → 100%, 인접 → 50%"],
  ["금액대","20%","수요설문 투자 범위","범위 내 → 100%, ±20% → 50%"],
  ["할인율","15%","수요설문 최소 할인율","초과 → 100%, 미달 → 비례"],
  ["회피 조건","10%","수요설문 회피 조건","회피 조건 해당 시 -100%"],
],[1200,800,2000,5360]));
m5.push(new Paragraph({ spacing: { after: 200 } }));

m5.push(heading("2.3 가중치 매칭 점수 계산", HeadingLevel.HEADING_2));
m5.push(code("matching_score = (collateral_match × 0.30) + (region_match × 0.25)"));
m5.push(code("               + (amount_match × 0.20) + (discount_match × 0.15)"));
m5.push(code("               + (avoidance_penalty × 0.10)"));
m5.push(code("// 최종 점수: 0~100, 80점 이상 → '강력 추천' 뱃지"));

m5.push(new Paragraph({ children: [new PageBreak()] }));

m5.push(heading("3. 관심 매물 관리"));
m5.push(heading("3.1 관심 매물 리스트", HeadingLevel.HEADING_2));
m5.push(mt(["기능","상세"],[
  ["정렬","찜한 날짜순 / 가격순 / 변동순"],
  ["필터","마켓별 / 상태별 (활성/완료/삭제됨)"],
  ["변동 표시","가격 변동: ↑5% (Red), ↓3% (Green) 뱃지"],
  ["알림","가격 변동 / 상태 변경 / 경매일 임박 자동 알림"],
  ["메모","개별 매물에 투자 메모 작성 가능"],
  ["폴더","관심 매물을 폴더로 분류 (사용자 정의)"],
  ["비교","체크박스 선택 → '비교하기' 버튼 (최대 4개)"],
],[2000,7360]));
m5.push(new Paragraph({ spacing: { after: 200 } }));

m5.push(heading("3.2 매물 비교 기능", HeadingLevel.HEADING_2));
m5.push(mt(["비교 항목","급매","경매/공매","비경매"],[
  ["가격","급매가 / 시세","최저가 / 감정가","채권액 / 담보가"],
  ["할인율","시세대비 할인율","감정가 대비 %","매입가 대비 LTV"],
  ["AI 분석","AI 추정가","낙찰가율 AI","채권 수익률"],
  ["위치","주소 + 지도","법원 + 주소","담보물 주소"],
  ["면적","전용/공급","토지/건물","담보물 면적"],
  ["상태","공실/임차","회차/유찰","NDA/딜룸"],
],[1500,2200,2200,3460]));

m5.push(new Paragraph({ children: [new PageBreak()] }));

m5.push(heading("4. 맞춤 알림 시스템"));
m5.push(heading("4.1 알림 조건 설정", HeadingLevel.HEADING_2));
m5.push(mt(["조건 항목","타입","설명"],[
  ["마켓 유형","Multi-select","급매 / 경매 / 비경매 (중복 선택)"],
  ["지역","Multi-select (시도→시군구)","관심 지역 설정"],
  ["담보유형","Multi-select","아파트/상가/토지 등"],
  ["금액 범위","Range (min~max)","투자 가능 금액대"],
  ["할인율 최소","Slider","최소 할인율 (%)"],
  ["경매 회차","Range","1회~N회"],
  ["키워드","Text","특정 키워드 매칭"],
],[1500,1800,6060]));
m5.push(new Paragraph({ spacing: { after: 200 } }));

m5.push(heading("4.2 알림 채널", HeadingLevel.HEADING_2));
m5.push(mt(["채널","구현","빈도 설정","비고"],[
  ["이메일","Supabase Edge Function → SendGrid","즉시 / 일 1회 요약 / 주 1회","기본 ON"],
  ["푸시 알림","Web Push API (Service Worker)","즉시","브라우저 허용 필요"],
  ["카카오톡","카카오 알림톡 API","즉시 / 일 1회","카카오 연동 필요"],
  ["인앱 알림","Supabase Realtime → NotificationBell","실시간","항상 ON"],
],[1200,2000,1800,4360]));

m5.push(new Paragraph({ children: [new PageBreak()] }));

m5.push(heading("5. 분석 이력 관리"));
m5.push(mt(["기능","상세"],[
  ["이력 목록","분석 유형별 탭 (가격/등기/낙찰가율/수익률)"],
  ["결과 카드","분석일, 대상 물건, 핵심 결과, 재분석 버튼"],
  ["비교","동일 물건 분석 이력 비교 (날짜별 변화 추이)"],
  ["내보내기","개별 또는 일괄 PDF 내보내기"],
  ["삭제","개별 삭제, 30일 후 자동 삭제"],
],[2000,7360]));

m5.push(new Paragraph({ children: [new PageBreak()] }));

m5.push(heading("6. DB 스키마"));
m5.push(code("CREATE TABLE favorites ("));
m5.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
m5.push(code("  user_id UUID NOT NULL REFERENCES users(id),"));
m5.push(code("  listing_id UUID NOT NULL REFERENCES npl_listings(id),"));
m5.push(code("  folder_name TEXT DEFAULT '기본',"));
m5.push(code("  memo TEXT,"));
m5.push(code("  price_at_save NUMERIC, -- 찜 시점 가격 (변동 비교용)"));
m5.push(code("  created_at TIMESTAMPTZ DEFAULT now(),"));
m5.push(code("  UNIQUE(user_id, listing_id)"));
m5.push(code(");"));
m5.push(new Paragraph({ spacing: { after: 200 } }));
m5.push(code("CREATE TABLE alert_settings ("));
m5.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
m5.push(code("  user_id UUID NOT NULL REFERENCES users(id),"));
m5.push(code("  name TEXT NOT NULL,"));
m5.push(code("  conditions JSONB NOT NULL, -- {market_types, regions, collateral_types, price_range, min_discount, ...}"));
m5.push(code("  channels JSONB DEFAULT '{\"email\":true,\"push\":false,\"kakao\":false}',"));
m5.push(code("  frequency TEXT DEFAULT 'IMMEDIATE', -- IMMEDIATE | DAILY | WEEKLY"));
m5.push(code("  is_active BOOLEAN DEFAULT true,"));
m5.push(code("  last_triggered_at TIMESTAMPTZ,"));
m5.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
m5.push(code(");"));
m5.push(new Paragraph({ spacing: { after: 200 } }));
m5.push(code("CREATE TABLE notifications ("));
m5.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
m5.push(code("  user_id UUID NOT NULL REFERENCES users(id),"));
m5.push(code("  type TEXT NOT NULL, -- PRICE_CHANGE | NEW_LISTING | AUCTION_REMINDER | CONTRACT_UPDATE | MATCHING"));
m5.push(code("  title TEXT NOT NULL,"));
m5.push(code("  message TEXT,"));
m5.push(code("  data JSONB, -- {listing_id, contract_id, ...}"));
m5.push(code("  is_read BOOLEAN DEFAULT false,"));
m5.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
m5.push(code(");"));

m5.push(new Paragraph({ children: [new PageBreak()] }));

m5.push(heading("7. 개발 체크리스트"));
m5.push(mt(["우선순위","태스크","일정"],[
  ["P0","투자자 대시보드 레이아웃 + KPI","Day 1-2"],
  ["P0","관심 매물 CRUD + 목록","Day 2-3"],
  ["P1","매물 비교 기능","Day 3-4"],
  ["P1","알림 조건 설정 UI + API","Day 4-5"],
  ["P1","맞춤 추천 매칭 엔진","Day 5-6"],
  ["P2","알림 채널 연동 (이메일/푸시/카카오)","Day 6-8"],
  ["P2","분석 이력 관리","Day 8-9"],
  ["P3","PDF 내보내기 + 반응형","Day 9-10"],
],[1000,4000,4360]));

// ═══════════════════════════════════
// MODULE 6: 계약/딜룸/회원
// ═══════════════════════════════════
const m6 = [];
m6.push(...buildCover(6, "계약/딜룸 + 회원체계 세부 기획서", "Figma: 계약요청(1452-37184), Signup(5-6341)"));

m6.push(heading("1. 모듈 개요"));
m6.push(p([run("투자 의사결정 후 실제 거래를 완결하는 핵심 모듈입니다. 회원가입부터 NDA, 계약 요청, 딜룸 운영까지 전체 거래 라이프사이클을 관리합니다.")]));
m6.push(heading("1.1 담당 라우트", HeadingLevel.HEADING_2));
m6.push(mt(["라우트","페이지명","권한","설명"],[
  ["/auth/signup","회원가입","Public","4종 역할별 가입 플로우"],
  ["/auth/login","로그인","Public","이메일+소셜 로그인"],
  ["/auth/verify","이메일 인증","Public","인증 코드 확인"],
  ["/auth/reset-password","비밀번호 재설정","Public","이메일 기반 재설정"],
  ["/contract/new","계약 요청","Authenticated","매물 선택 → 조건 제안"],
  ["/contract/[id]","계약 상세","참여자","협상 과정 + 상태 추적"],
  ["/deal-rooms","딜룸 목록","Authenticated","참여중 딜룸 리스트"],
  ["/deal-rooms/[id]","딜룸 상세","참여자","문서/채팅/체크리스트"],
  ["/mypage","마이페이지","Authenticated","프로필/알림/이력"],
],[2200,1200,1200,4760]));
m6.push(new Paragraph({ children: [new PageBreak()] }));

m6.push(heading("2. 회원가입 체계"));
m6.push(heading("2.1 역할 선택 화면", HeadingLevel.HEADING_2));
m6.push(mt(["역할 카드","아이콘","설명","추가 필드"],[
  ["기관투자자","🏢","자산운용사/PEF/부동산펀드 등 전문 투자기관","기관명, 사업자번호, 투자유형"],
  ["개인투자자","👤","경매/NPL 개인 투자자","투자경험, 관심분야"],
  ["금융기관","🏛️","은행/캐피탈/AMC/신탁사 등 채권 보유 기관","기관유형, 라이선스 (→ KYC)"],
  ["파트너","🤝","법무/감정/세무/자문 전문가","전문분야, 자격증"],
],[1200,600,3000,4560]));
m6.push(new Paragraph({ spacing: { after: 200 } }));

m6.push(heading("2.2 공통 가입 필드", HeadingLevel.HEADING_2));
m6.push(mt(["필드","타입","필수","검증"],[
  ["이메일","Email","필수","이메일 형식 + 중복 체크 (실시간)"],
  ["비밀번호","Password","필수","8자 이상, 영문+숫자+특수문자 조합"],
  ["비밀번호 확인","Password","필수","비밀번호 일치 검증"],
  ["이름","Text","필수","2~20자, 한글/영문"],
  ["연락처","Phone","필수","010-XXXX-XXXX 형식"],
  ["이용약관 동의","Checkbox","필수","필수 약관 + 선택 마케팅 동의"],
],[1500,1200,600,6060]));
m6.push(new Paragraph({ spacing: { after: 200 } }));

m6.push(heading("2.3 소셜 로그인", HeadingLevel.HEADING_2));
m6.push(mt(["Provider","Supabase 설정","버튼 디자인","추가 정보"],[
  ["카카오","Kakao OAuth2 Provider","노란 배경 + 카카오 로고","이름, 이메일 자동 수집"],
  ["네이버","Naver OAuth2 Provider","초록 배경 + 네이버 로고","이름, 이메일, 연락처"],
  ["Google","Google OAuth2 Provider","흰 배경 + G 로고","이름, 이메일"],
],[1200,2000,2200,3960]));
m6.push(bullet("소셜 로그인 후에도 역할 선택 + 추가 정보 입력 단계 필요"));
m6.push(bullet("기존 이메일 계정과 소셜 계정 연동 가능 (프로필 설정에서)"));

m6.push(new Paragraph({ children: [new PageBreak()] }));

m6.push(heading("3. NDA (비밀유지계약) 프로세스"));
m6.push(mt(["단계","동작","UI"],[
  ["1. NDA 트리거","비경매 NPL 상세 Stage 2 접근 시","블러 오버레이 + 'NDA 서명 필요' 모달"],
  ["2. NDA 문서 표시","약관 형태 NDA 전문 표시 (스크롤)","약관 뷰어 (전체 읽기 필수)"],
  ["3. 전자서명","Canvas 기반 서명 입력","서명패드 + '서명 지우기' + '서명 완료'"],
  ["4. 정보 확인","서명자 정보 자동 입력 (이름, 소속, 날짜)","읽기 전용 정보 표시"],
  ["5. NDA 생성","서명 정보 + 매물 정보 → PDF 자동 생성","'NDA가 체결되었습니다' 확인"],
  ["6. 정보 공개","Stage 2 정보 즉시 공개","블러 해제 + 전체 정보 표시"],
],[1200,3500,4660]));
m6.push(new Paragraph({ spacing: { after: 200 } }));

m6.push(code("CREATE TABLE nda_agreements ("));
m6.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
m6.push(code("  user_id UUID NOT NULL REFERENCES users(id),"));
m6.push(code("  listing_id UUID NOT NULL REFERENCES npl_listings(id),"));
m6.push(code("  signature_data TEXT, -- Base64 서명 이미지"));
m6.push(code("  signed_name TEXT NOT NULL,"));
m6.push(code("  signed_company TEXT,"));
m6.push(code("  nda_pdf_url TEXT, -- Supabase Storage URL"));
m6.push(code("  signed_at TIMESTAMPTZ DEFAULT now(),"));
m6.push(code("  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 year',"));
m6.push(code("  status TEXT DEFAULT 'ACTIVE', -- ACTIVE | EXPIRED | REVOKED"));
m6.push(code("  UNIQUE(user_id, listing_id)"));
m6.push(code(");"));

m6.push(new Paragraph({ children: [new PageBreak()] }));

m6.push(heading("4. 계약 요청 프로세스"));
m6.push(heading("4.1 계약 요청 폼", HeadingLevel.HEADING_2));
m6.push(mt(["필드","타입","필수","설명"],[
  ["대상 매물","자동 입력","필수","매물 상세에서 연동"],
  ["제안 금액","Currency","필수","매입 희망 금액"],
  ["제안 조건","TextArea","선택","특수 조건, 단서 조항"],
  ["자금 증빙","Select","필수","자기자금/대출/기관자금"],
  ["예상 일정","Date Range","선택","매입 희망 기간"],
  ["첨부 문서","File Upload","선택","사업계획서, 자금증빙 등"],
],[1500,1200,600,6060]));
m6.push(new Paragraph({ spacing: { after: 200 } }));

m6.push(heading("4.2 계약 상태 워크플로우", HeadingLevel.HEADING_2));
m6.push(mt(["상태","설명","다음 상태","액션"],[
  ["PENDING","요청 접수","REVIEWING","매각사에 알림"],
  ["REVIEWING","매각사 검토중","ACCEPTED/REJECTED/COUNTER","매각사 결정"],
  ["COUNTER","역제안","ACCEPTED/REJECTED/COUNTER","매입사 재협상"],
  ["ACCEPTED","조건 합의","DEAL_ROOM_CREATED","딜룸 자동 생성"],
  ["REJECTED","거절","종료","거절 사유 표시"],
  ["DEAL_ROOM_CREATED","딜룸 운영중","COMPLETED/CANCELLED","문서 교환, 최종 합의"],
  ["COMPLETED","거래 완료","종료","완료 처리"],
  ["CANCELLED","취소","종료","취소 사유"],
],[1500,2000,2000,3860]));

m6.push(new Paragraph({ children: [new PageBreak()] }));

m6.push(heading("5. 딜룸 (Deal Room) 시스템"));
m6.push(heading("5.1 딜룸 구성", HeadingLevel.HEADING_2));
m6.push(mt(["영역","기능","기술"],[
  ["문서 센터","폴더 구조 파일 관리, 업로드/다운로드, 버전 관리","Supabase Storage + 메타데이터"],
  ["실시간 채팅","매각사↔매입사 메시지 교환, 파일 첨부","Supabase Realtime subscriptions"],
  ["체크리스트","거래 진행 단계 체크 (NDA→실사→계약→결제→이전)","JSONB 배열 + 완료 토글"],
  ["타임라인","모든 활동 시간순 로그","자동 기록 (메시지/파일/상태변경)"],
  ["참여자 관리","참여자 추가/제거, 역할별 권한","RLS + 참여자 테이블"],
],[1200,3000,5160]));
m6.push(new Paragraph({ spacing: { after: 200 } }));

m6.push(heading("5.2 딜룸 채팅", HeadingLevel.HEADING_2));
m6.push(mt(["기능","상세"],[
  ["실시간 메시지","Supabase Realtime: deal_room_messages 테이블 INSERT 구독"],
  ["파일 첨부","이미지/PDF 인라인 첨부 (10MB 이하)"],
  ["읽음 확인","메시지 읽음 상태 표시 (✓✓)"],
  ["인용 답장","특정 메시지 인용 답장"],
  ["알림","새 메시지 → 인앱 + 이메일 알림"],
  ["검색","채팅 내 텍스트 검색"],
],[2000,7360]));

m6.push(new Paragraph({ spacing: { after: 200 } }));
m6.push(code("CREATE TABLE deal_rooms ("));
m6.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
m6.push(code("  contract_id UUID NOT NULL REFERENCES contract_requests(id),"));
m6.push(code("  listing_id UUID NOT NULL REFERENCES npl_listings(id),"));
m6.push(code("  status TEXT DEFAULT 'ACTIVE', -- ACTIVE | COMPLETED | CANCELLED"));
m6.push(code("  checklist JSONB DEFAULT '[]', -- [{step, label, completed, completed_at}]"));
m6.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
m6.push(code(");"));
m6.push(new Paragraph({ spacing: { after: 100 } }));
m6.push(code("CREATE TABLE deal_room_messages ("));
m6.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
m6.push(code("  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id),"));
m6.push(code("  sender_id UUID NOT NULL REFERENCES users(id),"));
m6.push(code("  message TEXT,"));
m6.push(code("  attachment_url TEXT,"));
m6.push(code("  attachment_name TEXT,"));
m6.push(code("  reply_to UUID REFERENCES deal_room_messages(id),"));
m6.push(code("  is_read BOOLEAN DEFAULT false,"));
m6.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
m6.push(code(");"));

m6.push(new Paragraph({ children: [new PageBreak()] }));

m6.push(heading("6. 마이페이지"));
m6.push(mt(["탭","내용","라우트"],[
  ["프로필","개인정보 수정, 비밀번호 변경, 소셜 연동, 기관정보 수정","/mypage/profile"],
  ["관심 매물","찜한 매물 목록 (→ Module 5 관심매물과 동일)","/mypage/favorites"],
  ["알림 설정","채널별 알림 ON/OFF, 맞춤 알림 조건 관리","/mypage/notifications"],
  ["분석 이력","AI 분석 결과 목록 + PDF 내보내기","/mypage/analysis"],
  ["계약/딜 이력","진행중 + 완료 계약/딜룸 목록","/mypage/contracts"],
  ["결제/크레딧","크레딧 잔액, 충전, 이용 내역","/mypage/billing"],
],[1200,4500,3660]));

m6.push(new Paragraph({ children: [new PageBreak()] }));

m6.push(heading("7. 보안 (RLS 정책)"));
m6.push(mt(["테이블","정책","SQL"],[
  ["nda_agreements","본인 NDA만 조회","auth.uid() = user_id"],
  ["contract_requests","관련 당사자만 조회","seller_id = auth.uid() OR buyer_id = auth.uid()"],
  ["deal_rooms","참여자만 접근","id IN (SELECT deal_room_id FROM deal_room_participants WHERE user_id = auth.uid())"],
  ["deal_room_messages","딜룸 참여자만","deal_room_id IN (참여 딜룸)"],
  ["favorites","본인만","user_id = auth.uid()"],
],[1500,2500,5360]));

m6.push(new Paragraph({ children: [new PageBreak()] }));

m6.push(heading("8. 개발 체크리스트"));
m6.push(mt(["우선순위","태스크","일정"],[
  ["P0","회원가입 (4종 역할) + 이메일 인증","Day 1-3"],
  ["P0","로그인 + 소셜 로그인 (카카오/네이버/Google)","Day 3-4"],
  ["P0","계약 요청 폼 + 상태 관리","Day 4-6"],
  ["P1","NDA 전자서명 + PDF 생성","Day 6-7"],
  ["P1","딜룸 생성 + 문서 관리","Day 7-9"],
  ["P1","딜룸 실시간 채팅 (Supabase Realtime)","Day 9-10"],
  ["P2","마이페이지 (프로필/알림/이력)","Day 10-12"],
  ["P2","비밀번호 재설정 플로우","Day 12"],
  ["P3","RLS 정책 + 보안 검수","Day 12-13"],
],[1000,4000,4360]));

// ═══════════════════════════════════
// MODULE 7: 대시보드/통계/관리자
// ═══════════════════════════════════
const m7 = [];
m7.push(...buildCover(7, "대시보드/통계/관리자 세부 기획서", "Figma: 대시보드(1337-8820), 통계(314-1974)"));

m7.push(heading("1. 모듈 개요"));
m7.push(p([run("플랫폼 운영 관리 + 경공매 통계 서비스 모듈입니다. 관리자는 전체 플랫폼을 관리하고, 모든 사용자는 경공매 통계를 활용할 수 있습니다.")]));
m7.push(heading("1.1 담당 라우트", HeadingLevel.HEADING_2));
m7.push(mt(["라우트","페이지명","권한","설명"],[
  ["/admin/dashboard","관리자 대시보드","ADMIN/SUPER","KPI, 차트, 긴급 알림"],
  ["/admin/users","사용자 관리","ADMIN/SUPER","전체 사용자 목록/검색/관리"],
  ["/admin/kyc","KYC 심사","ADMIN/SUPER","기관 가입 심사"],
  ["/admin/listings","매물 관리","ADMIN/SUPER","매물 검수/관리"],
  ["/admin/reports","리포트","ADMIN/SUPER","자동/커스텀 리포트"],
  ["/admin/settings","시스템 설정","SUPER_ADMIN","수수료/API키/알림 설정"],
  ["/statistics","경공매 통계","Public","법원별/유형별/지역별 통계"],
  ["/statistics/trend","추이 분석","Public","기간별 추이 차트"],
],[2200,1200,1200,4760]));
m7.push(new Paragraph({ children: [new PageBreak()] }));

m7.push(heading("2. 관리자 대시보드"));
m7.push(heading("2.1 KPI 카드", HeadingLevel.HEADING_2));
m7.push(mt(["KPI","계산","업데이트","색상"],[
  ["오늘 신규 가입","COUNT(users WHERE date=today)","실시간","Blue"],
  ["신규 매물","COUNT(listings WHERE date=today)","실시간","Green"],
  ["KYC 대기","COUNT(WHERE kyc_status='PENDING')","실시간","Orange (긴급)"],
  ["검수 대기","COUNT(WHERE status='PENDING_REVIEW')","실시간","Orange"],
  ["활성 딜룸","COUNT(WHERE status='ACTIVE')","실시간","Purple"],
  ["이번달 거래액","SUM(completed deals in month)","일 1회","Navy"],
],[1500,2500,1200,4160]));
m7.push(new Paragraph({ spacing: { after: 200 } }));

m7.push(heading("2.2 차트", HeadingLevel.HEADING_2));
m7.push(mt(["차트","타입","데이터","기간"],[
  ["사용자 증가 추이","Area Chart","일별 가입자 수 (역할별 색상)","최근 30일"],
  ["매물 등록/완료","Stacked Bar","일별 등록/완료/삭제","최근 30일"],
  ["마켓별 비율","Donut","3대 마켓 매물 비율","현재"],
  ["거래액 추이","Line","월별 거래 완료 금액","최근 12개월"],
],[1500,1200,3000,3660]));

m7.push(new Paragraph({ children: [new PageBreak()] }));

m7.push(heading("3. 사용자 관리"));
m7.push(heading("3.1 사용자 목록 테이블", HeadingLevel.HEADING_2));
m7.push(mt(["컬럼","내용","정렬"],[
  ["이름","사용자 실명","가나다순"],
  ["이메일","이메일 주소",""],
  ["역할","역할 뱃지 (색상 구분)","역할별 필터"],
  ["기관명","기관투자자/금융기관만",""],
  ["가입일","YYYY.MM.DD","최신순"],
  ["상태","활성/비활성/정지 뱃지",""],
  ["KYC","승인/대기/반려",""],
  ["활동","최근 로그인 일시",""],
  ["액션","상세/역할변경/정지/삭제",""],
],[1200,4000,4160]));
m7.push(new Paragraph({ spacing: { after: 200 } }));

m7.push(heading("3.2 KYC 심사 화면", HeadingLevel.HEADING_2));
m7.push(mt(["영역","내용"],[
  ["신청 정보","기관명, 유형, 사업자번호, 대표자, 담당자 정보"],
  ["첨부 서류","사업자등록증 PDF 뷰어 + 금융업 라이선스 PDF 뷰어"],
  ["검증 결과","사업자번호 국세청 API 조회 결과 (유효/무효)"],
  ["심사 액션","승인 버튼 (Green) / 반려 버튼 (Red, 사유 입력 필수)"],
  ["심사 이력","이전 심사 기록 (반려 → 재신청 이력)"],
],[2000,7360]));

m7.push(new Paragraph({ children: [new PageBreak()] }));

m7.push(heading("4. 매물 관리 (검수)"));
m7.push(mt(["기능","상세"],[
  ["검수 대기 목록","PENDING_REVIEW 상태 매물 리스트 (긴급순)"],
  ["검수 상세","매물 전체 정보 미리보기 (실제 게시 화면과 동일)"],
  ["검수 체크리스트","필수 정보 완성도, 이미지 품질, 가격 적정성, 중복 여부"],
  ["승인","status → ACTIVE, 매각사에 알림"],
  ["반려","status → REJECTED, 사유 입력, 매각사에 수정 안내"],
  ["수정 요청","특정 필드 수정 요청 + 코멘트"],
  ["추천 설정","is_featured = true + 만료일 설정 (홈페이지 노출)"],
],[2000,7360]));

m7.push(new Paragraph({ children: [new PageBreak()] }));

m7.push(heading("5. 경공매 통계 시스템"));
m7.push(heading("5.1 통계 대시보드 레이아웃", HeadingLevel.HEADING_2));
m7.push(mt(["영역","내용","위치"],[
  ["필터 바","기간/법원/지역/물건유형/경매·공매 구분","상단 고정"],
  ["핵심 지표","전국 평균 낙찰가율, 매각률, 총 건수, 총 금액","4-Card"],
  ["법원별 차트","법원별 낙찰가율 Bar Chart (상위 20개)","좌 1/2"],
  ["유형별 차트","담보유형별 낙찰가율 Donut + Bar","우 1/2"],
  ["지역 히트맵","시도별 매물 밀집도 + 낙찰가율 히트맵 (D3.js)","Full width"],
  ["추이 차트","월별/분기별 낙찰가율 추이 Line Chart","Full width"],
  ["상세 테이블","법원×유형 교차 통계 테이블","Full width, 정렬/필터"],
],[1200,3500,4660]));
m7.push(new Paragraph({ spacing: { after: 200 } }));

m7.push(heading("5.2 통계 필터 상세", HeadingLevel.HEADING_2));
m7.push(mt(["필터","타입","옵션","기본값"],[
  ["기간","Date Range Picker","최근1개월/3개월/6개월/1년/직접입력","최근 6개월"],
  ["법원","Multi-select (검색포함)","전국 57개 법원","전체"],
  ["지역","Cascading Select (시도→시군구)","17개 시도 + 하위","전체"],
  ["물건유형","Checkbox Group","아파트/상가/토지/빌딩/기타","전체"],
  ["경매/공매","Radio","전체/경매/공매","전체"],
  ["회차","Select","전체/1회/2회/3회이상","전체"],
],[1200,1500,2800,3860]));

m7.push(new Paragraph({ children: [new PageBreak()] }));

m7.push(heading("5.3 차트 사양", HeadingLevel.HEADING_2));
m7.push(mt(["차트","라이브러리","데이터","인터랙션"],[
  ["법원별 Bar","Recharts BarChart","법원명, 평균낙찰가율, 건수","호버 → 툴팁(상세), 클릭 → 법원 필터"],
  ["유형별 Donut","Recharts PieChart","담보유형, 건수, 비율","호버 → 퍼센트 표시"],
  ["추이 Line","Recharts LineChart","월별 날짜, 낙찰가율, 매각률","줌/패닝, 기간 브러시"],
  ["지역 히트맵","D3.js + TopoJSON","시도별 좌표, 매물수, 낙찰가율","호버 → 상세, 클릭 → 드릴다운"],
  ["교차 테이블","Custom Table","법원×유형 2차원 데이터","정렬, 클릭 → 상세 필터"],
],[1200,1500,2500,4160]));
m7.push(new Paragraph({ spacing: { after: 200 } }));

m7.push(heading("5.4 통계 데이터 소스", HeadingLevel.HEADING_2));
m7.push(mt(["데이터","소스","갱신 주기","저장"],[
  ["법원 경매","대법원 경매정보 API / 크롤링","일 1회 (새벽)","auction_statistics 테이블"],
  ["캠코 공매","캠코 온비드 API","일 1회","auction_statistics 테이블"],
  ["실거래가","국토부 실거래가 API","월 1회","trade_prices 테이블"],
  ["자체 거래","플랫폼 내 완료 거래","실시간","contract_requests 테이블"],
],[1500,2200,1500,4160]));

m7.push(new Paragraph({ children: [new PageBreak()] }));

m7.push(heading("6. DB 스키마"));
m7.push(code("CREATE TABLE auction_statistics ("));
m7.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
m7.push(code("  court_name TEXT NOT NULL,"));
m7.push(code("  court_code TEXT,"));
m7.push(code("  region TEXT NOT NULL,"));
m7.push(code("  sub_region TEXT,"));
m7.push(code("  collateral_type TEXT NOT NULL,"));
m7.push(code("  auction_type TEXT NOT NULL, -- AUCTION | PUBLIC_SALE"));
m7.push(code("  appraisal_amount NUMERIC,"));
m7.push(code("  winning_amount NUMERIC,"));
m7.push(code("  winning_rate NUMERIC, -- 낙찰가율 (%)"));
m7.push(code("  auction_round INT,"));
m7.push(code("  result TEXT, -- SOLD | UNSOLD | CANCELLED"));
m7.push(code("  auction_date DATE NOT NULL,"));
m7.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
m7.push(code(");"));
m7.push(new Paragraph({ spacing: { after: 100 } }));
m7.push(code("CREATE INDEX idx_auction_stats_date_region ON auction_statistics(auction_date, region);"));
m7.push(code("CREATE INDEX idx_auction_stats_court ON auction_statistics(court_name, auction_date);"));
m7.push(code("CREATE INDEX idx_auction_stats_type ON auction_statistics(collateral_type, auction_date);"));
m7.push(new Paragraph({ spacing: { after: 200 } }));

m7.push(code("CREATE TABLE admin_audit_logs ("));
m7.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
m7.push(code("  admin_id UUID NOT NULL REFERENCES users(id),"));
m7.push(code("  action TEXT NOT NULL, -- KYC_APPROVE, KYC_REJECT, LISTING_APPROVE, USER_BAN, etc."));
m7.push(code("  target_type TEXT, -- USER | LISTING | CONTRACT"));
m7.push(code("  target_id UUID,"));
m7.push(code("  details JSONB,"));
m7.push(code("  ip_address TEXT,"));
m7.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
m7.push(code(");"));

m7.push(new Paragraph({ children: [new PageBreak()] }));

m7.push(heading("7. 시스템 설정"));
m7.push(mt(["설정 항목","타입","설명","접근 권한"],[
  ["사이트 기본정보","Text/Image","사이트명, 로고, 연락처, 주소","SUPER_ADMIN"],
  ["수수료율","Number (%)","거래 중개 수수료율","SUPER_ADMIN"],
  ["프리미엄 요금","Currency","추천매물, 상단고정 비용","SUPER_ADMIN"],
  ["이메일 템플릿","Rich Text","가입환영/KYC승인/알림 등 템플릿","ADMIN"],
  ["API 키 관리","Secret Text","카카오맵/등기소/AI서버 API 키","SUPER_ADMIN"],
  ["자동 갱신 설정","Cron Schedule","통계 데이터 수집, 등기부 자동열람 주기","SUPER_ADMIN"],
],[1500,1200,3000,3660]));

m7.push(new Paragraph({ children: [new PageBreak()] }));

m7.push(heading("8. 개발 체크리스트"));
m7.push(mt(["우선순위","태스크","일정"],[
  ["P0","관리자 대시보드 KPI + 레이아웃","Day 1-2"],
  ["P0","사용자 관리 테이블 + 검색","Day 2-3"],
  ["P0","KYC 심사 화면 + 승인/반려","Day 3-4"],
  ["P0","매물 검수 화면 + 승인/반려","Day 4-5"],
  ["P1","경공매 통계 필터 + 핵심지표","Day 5-6"],
  ["P1","Recharts 차트 (Bar/Line/Donut)","Day 6-8"],
  ["P1","D3.js 지역 히트맵","Day 8-9"],
  ["P1","통계 데이터 수집 파이프라인","Day 9-10"],
  ["P2","리포트 생성 (자동/커스텀)","Day 10-11"],
  ["P2","시스템 설정 + 감사 로그","Day 11-12"],
  ["P3","반응형 + 성능 최적화","Day 12-13"],
],[1000,4000,4360]));

// ═══════════════════════════════════
// BUILD ALL 3 DOCUMENTS
// ═══════════════════════════════════
async function build() {
  const mkDoc = (title, children) => new Document({ numbering, styles, sections: [{
    properties: pageProps,
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run(`NPLATFORM ${title} | `, { size: 16, color: C.gray }), run("Confidential", { size: 16, color: C.red, italics: true })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("© 2026 NPLATFORM. Page ", { size: 16, color: C.gray }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray })] })] }) },
    children
  }]});

  const docs = [
    { name: "NPL_Module5_Investor_Tools.docx", title: "Module 5: 투자자 도구", ch: m5 },
    { name: "NPL_Module6_Contract_DealRoom_Auth.docx", title: "Module 6: 계약/딜룸/회원", ch: m6 },
    { name: "NPL_Module7_Dashboard_Stats_Admin.docx", title: "Module 7: 대시보드/통계/관리자", ch: m7 },
  ];

  for (const d of docs) {
    const buf = await Packer.toBuffer(mkDoc(d.title, d.ch));
    const out = __dirname + "/" + d.name;
    fs.writeFileSync(out, buf);
    console.log(`Created: ${out} (${Math.round(buf.length/1024)}KB)`);
  }
}
build();
