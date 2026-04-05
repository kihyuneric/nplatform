const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType, PageBreak, PageNumber, LevelFormat, TableOfContents } = require("docx");
const C = { navy: "1B3A5C", blue: "2E75B6", accent: "10B981", bg: "F0F5FA", white: "FFFFFF", black: "1A1A1A", gray: "6B7280", lightGray: "E5E7EB", red: "EF4444", purple: "7C3AED" };
const bdr = (c = C.lightGray) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = { top: bdr(), bottom: bdr(), left: bdr(), right: bdr() };
const cellM = { top: 80, bottom: 80, left: 120, right: 120 };
const heading = (t, l = HeadingLevel.HEADING_1) => new Paragraph({ heading: l, children: [new TextRun(t)] });
const p = (text, o = {}) => new Paragraph({ spacing: { after: 120 }, ...o, children: Array.isArray(text) ? text : [new TextRun({ text, font: "Arial", size: 22 })] });
const bold = (t) => new TextRun({ text: t, bold: true, font: "Arial", size: 22 });
const run = (t, o = {}) => new TextRun({ text: t, font: "Arial", size: 22, ...o });
const headerCell = (text, w) => new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cellM, shading: { fill: C.navy, type: ShadingType.CLEAR }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: C.white, font: "Arial", size: 20 })] })] });
const cell = (text, w, o = {}) => new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cellM, shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined, children: [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(text), font: "Arial", size: 20, ...o })] })] });
const makeTable = (h, rows, cw) => { const t = cw.reduce((a,b)=>a+b,0); return new Table({ width:{size:t,type:WidthType.DXA}, columnWidths:cw, rows:[new TableRow({children:h.map((x,i)=>headerCell(x,cw[i]))}), ...rows.map(r=>new TableRow({children:r.map((c,i)=>cell(typeof c==="object"?c.text:c,cw[i],typeof c==="object"?c:{}))}))] }); };
const numbering = { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }, { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] };
const bullet = (t) => new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const numItem = (t) => new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const code = (t) => new Paragraph({ spacing: { after: 80 }, shading: { fill: "F3F4F6", type: ShadingType.CLEAR }, children: [new TextRun({ text: t, font: "Consolas", size: 18 })] });

const ch = [];
// COVER
ch.push(new Paragraph({ spacing: { before: 3000 } }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NPLATFORM", font: "Arial", size: 72, bold: true, color: C.navy })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "Module 4", font: "Arial", size: 48, color: C.blue })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "금융기관 마케팅 + 채권관리 세부 기획서", font: "Arial", size: 32, color: C.gray })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 1 } }, children: [] }));
ch.push(new Paragraph({ spacing: { before: 400 } }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run("Version 2.0 | 2026.03.13 | Figma: NPL 관리 (1363-45591)", { color: C.gray })] }));
ch.push(new Paragraph({ children: [new PageBreak()] }));
ch.push(heading("목차"));
ch.push(new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }));
ch.push(new Paragraph({ children: [new PageBreak()] }));

// 1
ch.push(heading("1. 모듈 개요"));
ch.push(p([run("금융기관이 '누구나 들어오고 싶어하게' 만드는 핵심 모듈입니다. 채권 등록, 마케팅, 포트폴리오 관리, 투자자 매칭까지 원스톱으로 제공합니다.")]));
ch.push(heading("1.1 담당 라우트", HeadingLevel.HEADING_2));
ch.push(makeTable(["라우트","페이지명","접근 권한","설명"],[
  ["/institution/dashboard","기관 대시보드","SELLER","KPI, 차트, 최근활동"],
  ["/institution/portfolio","포트폴리오 관리","SELLER","등록 매물 목록/관리"],
  ["/institution/register","채권 등록","SELLER","Step-by-step 등록 위저드"],
  ["/institution/listings/[id]/edit","매물 수정","SELLER","개별 매물 편집"],
  ["/institution/analytics","분석/통계","SELLER","성과 분석 대시보드"],
  ["/institution/investors","투자자 관리","SELLER","관심 투자자/문의 관리"],
],[2500,1500,1200,4160]));
ch.push(new Paragraph({ children: [new PageBreak()] }));

// 2. 대시보드
ch.push(heading("2. 금융기관 대시보드"));
ch.push(heading("2.1 KPI 카드 영역", HeadingLevel.HEADING_2));
ch.push(makeTable(["KPI","데이터 소스","시각화","업데이트"],[
  ["등록 매물 수","COUNT(listings WHERE seller_id = user_id)","큰 숫자 + 전월대비 증감","실시간"],
  ["활성 매물","COUNT(WHERE status = 'ACTIVE')","숫자 + 원형 비율","실시간"],
  ["계약 진행중","COUNT(contracts WHERE status = 'NEGOTIATING')","숫자 + 화살표 아이콘","실시간"],
  ["이번달 완료","COUNT(contracts WHERE completed_at in month)","숫자 + 전월 비교","일단위"],
  ["총 거래액","SUM(contracts.deal_amount WHERE completed)","formatKRW + 증감","일단위"],
],[1500,2500,2000,3360]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("2.2 차트 영역", HeadingLevel.HEADING_2));
ch.push(makeTable(["차트","타입","데이터","크기"],[
  ["월별 등록/완료 추이","Grouped Bar (Recharts)","최근 12개월 등록 vs 완료 건수","2/3 너비"],
  ["마켓별 비율","Donut Chart","급매/경매/비경매 비율","1/3 너비"],
  ["지역 분포","Map Heat (Mini)","등록 매물 지역 분포","1/2 너비"],
  ["투자자 관심도 추이","Line Chart","주간 관심(찜) 수 추이","1/2 너비"],
],[1800,1800,2800,2960]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("2.3 최근 활동 피드", HeadingLevel.HEADING_2));
ch.push(makeTable(["활동 유형","아이콘","메시지 형식","링크"],[
  ["새 관심 표시","❤️","'{투자자명}이(가) {매물명}에 관심을 표시했습니다'","매물 상세"],
  ["계약 요청","📋","'{투자자명}이(가) {매물명}에 계약을 요청했습니다'","계약 상세"],
  ["문의 메시지","💬","'{투자자명}으로부터 새 메시지가 도착했습니다'","메시지함"],
  ["매칭 알림","🎯","'{매물명}에 새로운 매칭 투자자 3명이 발견되었습니다'","매칭 상세"],
  ["매물 검수 완료","✅","'{매물명} 매물 검수가 완료되어 게시되었습니다'","매물 상세"],
  ["매물 반려","❌","'{매물명} 매물이 반려되었습니다: {사유}'","수정 페이지"],
],[1200,600,4500,3060]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// 3. 채권 등록
ch.push(heading("3. 채권 등록 프로세스"));
ch.push(heading("3.1 등록 위저드 (6-Step)", HeadingLevel.HEADING_2));
ch.push(makeTable(["Step","제목","내용","Validation"],[
  ["1","마켓 유형 선택","3-Card 선택 (급매/경매/비경매), 각 카드에 설명+아이콘","필수 선택"],
  ["2","기본 정보","주소(카카오API), 담보유형, 감정가/채권액, 면적","주소 API 검증, 금액 > 0"],
  ["3","상세 정보","마켓별 다른 필드 (아래 상세)","마켓별 필수 검증"],
  ["4","이미지/문서","이미지 업로드(최대20장), 문서 업로드(PDF/DOCX)","최소 1장 이미지"],
  ["5","마케팅 설명","리치텍스트 에디터로 물건 소개/투자포인트 작성","최소 100자"],
  ["6","미리보기/확인","실제 매물 카드 + 상세 페이지 미리보기","확인 버튼 클릭"],
],[500,1200,4000,3660]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("3.2 Step 3: 마켓별 상세 필드", HeadingLevel.HEADING_2));

ch.push(p([bold("급매 부동산 (DISTRESSED_SALE) 추가 필드:")]));
ch.push(makeTable(["필드","타입","필수","설명"],[
  ["희망매각가","Currency","필수","급매 희망 가격"],
  ["시세(KB/실거래)","Currency","선택","비교용 시세 (자동 조회 가능)"],
  ["긴급도","Select (일반/급매/초급매)","필수","판매 긴급도"],
  ["매각 사유","TextArea","선택","매각 배경 설명"],
  ["물건 상태","Select (공실/임차중/자가거주)","필수","현재 상태"],
  ["즉시 입주 가능","Boolean","필수",""],
],[1500,1800,600,5460]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(p([bold("경매/공매 NPL (AUCTION_NPL) 추가 필드:")]));
ch.push(makeTable(["필드","타입","필수","설명"],[
  ["법원/기관","Select","필수","경매: 법원 선택, 공매: 캠코/지자체"],
  ["사건번호","Text","필수","2025타경12345 형식"],
  ["경매일","Date","필수","다음 경매 예정일"],
  ["현재 회차","Number","필수","1회~"],
  ["최저매각가","Currency","필수","현재 회차 최저가"],
  ["보증금","Currency","자동계산","최저가 × 10%"],
  ["경매 유형","Select (임의/강제)","필수",""],
  ["선순위 채권액","Currency","선택","선순위 근저당 합계"],
],[1500,1200,600,6060]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(p([bold("비경매 NPL (NON_AUCTION_NPL) 추가 필드:")]));
ch.push(makeTable(["필드","타입","필수","설명"],[
  ["채권원금","Currency","필수","원금 잔액"],
  ["미수이자","Currency","선택","연체 이자"],
  ["담보가치","Currency","필수","감정가 또는 시가"],
  ["LTV (담보비율)","자동계산","자동","채권원금 / 담보가치"],
  ["매각방식","Select (공개/상대/경쟁입찰)","필수",""],
  ["NDA 필요","Boolean","필수","정보 공개 전 NDA 필요 여부"],
  ["데이터룸 문서","File Upload (다중)","조건부","NDA 후 공개 문서"],
  ["입찰 마감일","Date","선택","경쟁입찰 시"],
],[1500,1800,600,5460]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

ch.push(heading("3.3 이미지 업로드", HeadingLevel.HEADING_2));
ch.push(makeTable(["기능","상세"],[
  ["업로드 방식","Drag-and-Drop + 클릭 파일선택"],
  ["최대 수량","20장"],
  ["파일 형식","JPG, PNG, WebP (최대 10MB/장)"],
  ["리사이즈","업로드 시 자동: 원본 보존 + 썸네일(400px) + 미디엄(800px) 생성"],
  ["순서 변경","Drag-and-Drop으로 순서 변경 (첫 번째 = 대표 이미지)"],
  ["미리보기","업로드 즉시 썸네일 그리드 미리보기"],
  ["삭제","개별 X 버튼, 확인 다이얼로그"],
  ["저장소","Supabase Storage: listings/{listing_id}/images/"],
  ["CDN","Supabase CDN + Next.js Image Optimization"],
],[2000,7360]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("3.4 마케팅 설명 에디터", HeadingLevel.HEADING_2));
ch.push(makeTable(["기능","상세"],[
  ["에디터","Tiptap (ProseMirror 기반)"],
  ["툴바","Bold, Italic, H2, H3, 목록, 링크, 이미지삽입"],
  ["템플릿","마켓별 작성 가이드 템플릿 제공 (클릭 시 자동 삽입)"],
  ["최소/최대","최소 100자 ~ 최대 5000자"],
  ["자동 저장","30초마다 Draft 자동 저장 (localStorage + API)"],
  ["미리보기","실시간 미리보기 (우측 패널)"],
],[2000,7360]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// 4. 포트폴리오
ch.push(heading("4. 포트폴리오 관리"));
ch.push(heading("4.1 매물 목록 테이블", HeadingLevel.HEADING_2));
ch.push(makeTable(["컬럼","내용","정렬","너비"],[
  ["체크박스","일괄 선택","","40px"],
  ["이미지","썸네일 (60×45)","","70px"],
  ["제목/주소","매물명 + 주소 (2줄)","","200px"],
  ["마켓","급매/경매/비경매 뱃지","","80px"],
  ["금액","감정가/채권액","금액순","120px"],
  ["상태","뱃지 (활성/대기/반려/완료)","","80px"],
  ["관심","관심 투자자 수","관심순","60px"],
  ["등록일","YYYY.MM.DD","최신순","100px"],
  ["액션","편집/일시정지/삭제 드롭다운","","80px"],
],[800,1800,1200,5560]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("4.2 상태별 탭", HeadingLevel.HEADING_2));
ch.push(makeTable(["탭","필터","뱃지 색상","설명"],[
  ["전체","없음","","모든 매물"],
  ["활성","status = 'ACTIVE'","Green","현재 게시 중"],
  ["검수대기","status = 'PENDING_REVIEW'","Orange","관리자 검수 대기"],
  ["반려","status = 'REJECTED'","Red","반려 (수정 필요)"],
  ["일시정지","status = 'PAUSED'","Gray","매각사가 일시 중단"],
  ["완료","status = 'COMPLETED'","Blue","거래 완료"],
],[1500,2000,1200,4660]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("4.3 일괄 관리", HeadingLevel.HEADING_2));
ch.push(makeTable(["기능","동작","확인"],[
  ["일괄 일시정지","선택된 활성 매물 → PAUSED","확인 다이얼로그"],
  ["일괄 재게시","선택된 PAUSED 매물 → ACTIVE","확인 다이얼로그"],
  ["일괄 삭제","선택된 매물 → soft delete","'정말 삭제하시겠습니까?' + 되돌릴 수 없음 안내"],
  ["일괄 복제","선택된 매물 → Draft로 복제","'N건 복제되었습니다' 토스트"],
],[1500,3500,4360]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// 5. 마케팅 기능
ch.push(heading("5. 채권 담당자 마케팅 기능"));
ch.push(heading("5.1 마케팅 정보 작성", HeadingLevel.HEADING_2));
ch.push(p([run("채권 담당자가 직접 투자 매력 포인트를 작성하여 투자자에게 어필할 수 있습니다.")]));
ch.push(makeTable(["마케팅 필드","설명","예시"],[
  ["물건 하이라이트","핵심 투자 매력 3가지 (카드형)","'강남역 도보 5분 / 시세대비 30% 할인 / 즉시 입주 가능'"],
  ["투자 포인트","상세 투자 가치 설명 (리치텍스트)","주변 개발 호재, 임대 수익률, 가격 상승 전망"],
  ["주변 개발 호재","재개발/교통/인프라 정보","'GTX-A 역 예정지 500m 이내'"],
  ["특이사항","유의할 점이나 추가 정보","'건물 리모델링 완료 (2024년)'"],
  ["담당자 코멘트","채권 담당자 직접 멘트","'해당 물건은 빠른 처분이 필요하여 추가 협상 가능합니다'"],
],[1500,2500,5360]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("5.2 투자제안서 자동 생성", HeadingLevel.HEADING_2));
ch.push(bullet("매물 정보 + 마케팅 정보 → PDF 투자제안서 자동 생성"));
ch.push(bullet("템플릿: 기관 로고 + 물건 사진 + 핵심 정보 + 투자 포인트 + 위치 지도"));
ch.push(bullet("생성: jsPDF 또는 서버사이드 Puppeteer → PDF"));
ch.push(bullet("공유: 링크 공유 또는 다운로드"));

ch.push(heading("5.3 노출 관리", HeadingLevel.HEADING_2));
ch.push(makeTable(["옵션","설명","비용"],[
  ["기본 노출","검색/목록에 일반 노출","무료"],
  ["추천 매물","홈페이지 '주요 매물' 섹션 노출","유료 (월 기준)"],
  ["상단 고정","목록 최상단 고정 (마켓별)","유료 (주 기준)"],
  ["프리미엄 뱃지","'추천' 또는 '프리미엄' 뱃지 부착","유료 (건당)"],
],[1500,4000,3860]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// 6. 기관 인증
ch.push(heading("6. 기관 인증 및 KYC"));
ch.push(heading("6.1 기관 회원가입 필드", HeadingLevel.HEADING_2));
ch.push(makeTable(["필드","타입","필수","검증"],[
  ["기관명","Text","필수","2~50자"],
  ["기관 유형","Select (은행/캐피탈/AMC/신탁/보험/기타)","필수","Enum"],
  ["사업자등록번호","Text (000-00-00000)","필수","정규식 + 국세청 API 검증"],
  ["금융업 라이선스","File Upload (PDF)","필수","금융위 등록증"],
  ["대표자명","Text","필수",""],
  ["담당자명","Text","필수","실제 사용자"],
  ["담당자 직급","Text","선택",""],
  ["담당자 이메일","Email","필수","@기관도메인 권장"],
  ["담당자 연락처","Phone","필수","010-XXXX-XXXX"],
  ["기관 로고","Image","선택","PNG/SVG, 200×200 이상"],
],[1500,2000,600,5260]));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(heading("6.2 KYC 심사 프로세스", HeadingLevel.HEADING_2));
ch.push(numItem("기관 회원가입 제출 → status: 'KYC_PENDING'"));
ch.push(numItem("관리자 알림 수신 (이메일 + 대시보드 알림)"));
ch.push(numItem("관리자가 /admin/kyc에서 서류 확인"));
ch.push(numItem("사업자등록번호 검증 (국세청 API 조회)"));
ch.push(numItem("금융업 라이선스 확인 (수동 검토)"));
ch.push(numItem("승인 → status: 'KYC_APPROVED', role: 'SELLER' 부여, 환영 이메일 발송"));
ch.push(numItem("반려 → status: 'KYC_REJECTED', 사유 입력, 재신청 안내 이메일"));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// 7. API
ch.push(heading("7. API 엔드포인트"));
ch.push(makeTable(["Method","엔드포인트","Auth","설명"],[
  ["GET","/api/institution/dashboard","SELLER","대시보드 KPI + 차트 데이터"],
  ["GET","/api/institution/listings","SELLER","내 매물 목록 (필터/정렬/페이지네이션)"],
  ["POST","/api/institution/listings","SELLER","새 매물 등록"],
  ["PUT","/api/institution/listings/[id]","SELLER","매물 수정"],
  ["PATCH","/api/institution/listings/[id]/status","SELLER","상태 변경 (ACTIVE/PAUSED)"],
  ["DELETE","/api/institution/listings/[id]","SELLER","매물 삭제 (soft delete)"],
  ["POST","/api/institution/listings/[id]/duplicate","SELLER","매물 복제 (Draft)"],
  ["GET","/api/institution/analytics","SELLER","성과 분석 데이터"],
  ["GET","/api/institution/investors","SELLER","관심 투자자 목록"],
  ["POST","/api/institution/listings/bulk-action","SELLER","일괄 상태변경/삭제"],
  ["POST","/api/upload/images","SELLER","이미지 업로드 (Supabase Storage)"],
  ["POST","/api/upload/documents","SELLER","문서 업로드"],
],[600,3000,800,4960]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// 8. 컴포넌트
ch.push(heading("8. 컴포넌트 트리"));
ch.push(code("app/(auth)/institution/dashboard/page.tsx"));
ch.push(code("├── KPICards.tsx (5개 KPI 카드 그리드)"));
ch.push(code("├── ChartsGrid.tsx"));
ch.push(code("│   ├── MonthlyTrendChart.tsx (Bar)"));
ch.push(code("│   ├── MarketRatioChart.tsx (Donut)"));
ch.push(code("│   ├── RegionDistribution.tsx (Map)"));
ch.push(code("│   └── InterestTrendChart.tsx (Line)"));
ch.push(code("├── RecentActivityFeed.tsx"));
ch.push(code("│   └── ActivityItem.tsx"));
ch.push(code("└── QuickActions.tsx (바로가기 버튼들)"));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(code("app/(auth)/institution/register/page.tsx"));
ch.push(code("├── RegistrationWizard.tsx"));
ch.push(code("│   ├── StepIndicator.tsx (6단계 프로그레스)"));
ch.push(code("│   ├── Step1_MarketType.tsx (3-Card 선택)"));
ch.push(code("│   ├── Step2_BasicInfo.tsx (주소+감정가+면적)"));
ch.push(code("│   ├── Step3_DetailInfo.tsx (마켓별 분기)"));
ch.push(code("│   │   ├── DistressedSaleForm.tsx"));
ch.push(code("│   │   ├── AuctionNplForm.tsx"));
ch.push(code("│   │   └── NonAuctionNplForm.tsx"));
ch.push(code("│   ├── Step4_MediaUpload.tsx"));
ch.push(code("│   │   ├── ImageUploader.tsx (Drag&Drop)"));
ch.push(code("│   │   └── DocumentUploader.tsx"));
ch.push(code("│   ├── Step5_Marketing.tsx (Tiptap Editor)"));
ch.push(code("│   └── Step6_Preview.tsx"));
ch.push(code("└── DraftAutoSave.tsx (자동저장 훅)"));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// 9. DB
ch.push(heading("9. DB 스키마"));
ch.push(code("-- 매물 상태 워크플로우"));
ch.push(code("-- DRAFT → PENDING_REVIEW → ACTIVE / REJECTED"));
ch.push(code("-- ACTIVE → PAUSED → ACTIVE (토글)"));
ch.push(code("-- ACTIVE → COMPLETED (거래 완료)"));
ch.push(code("-- ANY → DELETED (soft delete)"));
ch.push(new Paragraph({ spacing: { after: 100 } }));
ch.push(code("ALTER TABLE npl_listings ADD COLUMN IF NOT EXISTS"));
ch.push(code("  marketing_highlights JSONB, -- ['하이라이트1', '하이라이트2', '하이라이트3']"));
ch.push(code("  marketing_description TEXT, -- 리치텍스트 HTML"));
ch.push(code("  investment_points TEXT, -- 투자 포인트"));
ch.push(code("  special_notes TEXT, -- 특이사항"));
ch.push(code("  agent_comment TEXT, -- 담당자 코멘트"));
ch.push(code("  is_featured BOOLEAN DEFAULT false, -- 추천 매물 여부"));
ch.push(code("  feature_expires_at TIMESTAMPTZ, -- 추천 만료일"));
ch.push(code("  draft_data JSONB, -- 임시저장 데이터"));
ch.push(code("  reviewed_by UUID REFERENCES users(id), -- 검수 관리자"));
ch.push(code("  reviewed_at TIMESTAMPTZ,"));
ch.push(code("  rejection_reason TEXT;"));
ch.push(new Paragraph({ spacing: { after: 200 } }));

ch.push(code("CREATE TABLE institution_profiles ("));
ch.push(code("  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),"));
ch.push(code("  user_id UUID NOT NULL REFERENCES users(id) UNIQUE,"));
ch.push(code("  institution_name TEXT NOT NULL,"));
ch.push(code("  institution_type TEXT NOT NULL, -- BANK, CAPITAL, AMC, TRUST, INSURANCE, OTHER"));
ch.push(code("  business_number TEXT NOT NULL UNIQUE,"));
ch.push(code("  license_file_url TEXT,"));
ch.push(code("  logo_url TEXT,"));
ch.push(code("  description TEXT,"));
ch.push(code("  contact_name TEXT,"));
ch.push(code("  contact_title TEXT,"));
ch.push(code("  contact_phone TEXT,"));
ch.push(code("  kyc_status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED"));
ch.push(code("  kyc_reviewed_by UUID REFERENCES users(id),"));
ch.push(code("  kyc_reviewed_at TIMESTAMPTZ,"));
ch.push(code("  kyc_rejection_reason TEXT,"));
ch.push(code("  created_at TIMESTAMPTZ DEFAULT now()"));
ch.push(code(");"));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// 10. 에러처리
ch.push(heading("10. 에러 처리 및 엣지 케이스"));
ch.push(makeTable(["시나리오","처리","UI"],[
  ["이미지 업로드 실패","재시도 3회 → 개별 에러 표시","실패 이미지에 빨간 경고 + 재업로드 버튼"],
  ["자동저장 실패","로컬스토리지 폴백 + 재시도","'자동저장에 실패했습니다. 수동으로 저장해주세요' 토스트"],
  ["중복 사건번호","DB unique constraint → 에러 메시지","'이미 등록된 사건번호입니다' 인라인 에러"],
  ["동시 편집","optimistic locking (updated_at 비교)","'다른 곳에서 수정되었습니다. 새로고침하세요'"],
  ["대용량 파일","클라이언트 사이즈 체크 (10MB/이미지, 50MB/문서)","'파일 크기가 초과됩니다 (최대 10MB)'"],
  ["KYC 반려 후 재신청","이전 데이터 유지 + 반려사유 표시","반려 사유 하이라이트 + 수정 안내"],
],[1800,3000,4560]));

ch.push(new Paragraph({ children: [new PageBreak()] }));

// 11. 체크리스트
ch.push(heading("11. 개발 체크리스트"));
ch.push(makeTable(["우선순위","태스크","일정","의존성"],[
  ["P0","기관 대시보드 KPI + 레이아웃","Day 1-2","기관 API"],
  ["P0","채권 등록 위저드 (Step 1-3)","Day 2-4","폼 컴포넌트"],
  ["P0","이미지/문서 업로드 (Step 4)","Day 4-5","Supabase Storage"],
  ["P0","마케팅 에디터 (Step 5) + 미리보기","Day 5-6","Tiptap"],
  ["P1","포트폴리오 관리 테이블","Day 6-7","매물 CRUD API"],
  ["P1","일괄 관리 기능","Day 7-8","포트폴리오"],
  ["P1","대시보드 차트 (Recharts)","Day 8-9",""],
  ["P1","기관 KYC 회원가입","Day 9-10","Auth"],
  ["P2","투자제안서 PDF 생성","Day 10-11","jsPDF"],
  ["P2","노출 관리 + 프리미엄","Day 11",""],
  ["P2","분석/통계 페이지","Day 12","차트 컴포넌트"],
  ["P3","반응형 + 성능","Day 12-13","전체"],
],[1000,3200,1200,4960]));

// BUILD
const doc = new Document({ numbering,
  styles: { default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 36, bold: true, color: C.navy }, paragraph: { spacing: { before: 360, after: 200 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 30, bold: true, color: C.blue }, paragraph: { spacing: { before: 280, after: 160 } } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 26, bold: true, color: C.navy }, paragraph: { spacing: { before: 200, after: 120 } } },
    ]},
  sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("NPLATFORM Module 4: 금융기관 마케팅 | ", { size: 16, color: C.gray }), run("Confidential", { size: 16, color: C.red, italics: true })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("© 2026 NPLATFORM. Page ", { size: 16, color: C.gray }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray })] })] }) },
    children: ch
  }]
});
Packer.toBuffer(doc).then(buf => { const out = __dirname + "/NPL_Module4_Institution_Marketing.docx"; fs.writeFileSync(out, buf); console.log(`Created: ${out} (${Math.round(buf.length/1024)}KB)`); });
