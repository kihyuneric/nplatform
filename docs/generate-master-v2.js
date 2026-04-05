const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, LevelFormat, TableOfContents } = require("docx");

// ── Design tokens ──
const C = { navy: "1B3A5C", blue: "2E75B6", accent: "10B981", bg: "F0F5FA", white: "FFFFFF", black: "1A1A1A", gray: "6B7280", lightGray: "E5E7EB", red: "EF4444", purple: "7C3AED", orange: "F59E0B" };
const bdr = (c = C.lightGray) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = { top: bdr(), bottom: bdr(), left: bdr(), right: bdr() };
const cellM = { top: 80, bottom: 80, left: 120, right: 120 };

const heading = (t, l = HeadingLevel.HEADING_1) => new Paragraph({ heading: l, children: [new TextRun(t)] });
const p = (text, opts = {}) => new Paragraph({ spacing: { after: 120 }, ...opts, children: Array.isArray(text) ? text : [new TextRun({ text, font: "Arial", size: 22 })] });
const bold = (t) => new TextRun({ text: t, bold: true, font: "Arial", size: 22 });
const run = (t, o = {}) => new TextRun({ text: t, font: "Arial", size: 22, ...o });
const hc = (text, w) => new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cellM, shading: { fill: C.navy, type: ShadingType.CLEAR }, verticalAlign: "center", children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: C.white, font: "Arial", size: 20 })] })] });
const cl = (text, w, o = {}) => new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cellM, shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined, children: [new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: String(text), font: "Arial", size: 20, ...o })] })] });
const mt = (h, rows, cw) => new Table({ width: { size: cw.reduce((a,b)=>a+b,0), type: WidthType.DXA }, columnWidths: cw, rows: [new TableRow({ children: h.map((x,i)=>hc(x,cw[i])) }), ...rows.map(r=>new TableRow({ children: r.map((c,i)=>cl(typeof c==="object"?c.text:c,cw[i],typeof c==="object"?c:{})) }))] });
const numbering = { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }, { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }] }, { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] };
const bullet = (t, lv = 0) => new Paragraph({ numbering: { reference: "bullets", level: lv }, spacing: { after: 60 }, children: [run(t)] });
const numItem = (t) => new Paragraph({ numbering: { reference: "numbers", level: 0 }, spacing: { after: 60 }, children: [run(t)] });
const code = (t) => new Paragraph({ spacing: { after: 80 }, shading: { fill: "F3F4F6", type: ShadingType.CLEAR }, children: [new TextRun({ text: t, font: "Consolas", size: 18 })] });
const spacer = () => new Paragraph({ spacing: { after: 200 } });
const pb = () => new Paragraph({ children: [new PageBreak()] });

const styles = { default: { document: { run: { font: "Arial", size: 22 } } }, paragraphStyles: [
  { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 36, bold: true, color: C.navy }, paragraph: { spacing: { before: 360, after: 200 } } },
  { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 30, bold: true, color: C.blue }, paragraph: { spacing: { before: 280, after: 160 } } },
  { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", run: { font: "Arial", size: 26, bold: true, color: C.navy }, paragraph: { spacing: { before: 200, after: 120 } } },
]};

const ch = [];

// ══════════════════════════════════════════════════════════════
// COVER PAGE
// ══════════════════════════════════════════════════════════════
ch.push(new Paragraph({ spacing: { before: 3000 } }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "NPLATFORM", font: "Arial", size: 72, bold: true, color: C.navy })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: "엔플랫폼", font: "Arial", size: 48, color: C.blue })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [new TextRun({ text: "Master Architecture Document v2.0", font: "Arial", size: 32, color: C.gray })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 1 } }, children: [] }));
ch.push(new Paragraph({ spacing: { before: 400 } }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run("부실채권(NPL) 통합 플랫폼 | 보안·컴플라이언스·운영 아키텍처 포함", { color: C.gray })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [run("2026.03.14 | Confidential", { color: C.red, italics: true })] }));
ch.push(pb());
ch.push(heading("목차"));
ch.push(new TableOfContents("TOC", { hyperlink: true, headingStyleRange: "1-3" }));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 1. EXECUTIVE SUMMARY
// ══════════════════════════════════════════════════════════════
ch.push(heading("1. Executive Summary"));
ch.push(p([run("NPLATFORM(엔플랫폼)은 한국 부실채권(NPL) 시장의 수요 기반(Demand-Driven) 매칭 플랫폼입니다. 금융기관이 먼저 찾는 마켓플레이스, 투자자가 신뢰하는 AI 분석 플랫폼을 지향합니다.")]));

ch.push(heading("1.1 서비스 비전", HeadingLevel.HEADING_2));
ch.push(mt(["구분","내용"],[
  ["미션","NPL 시장의 정보 비대칭을 해소하고, AI 기반 분석으로 합리적인 투자 의사결정을 지원"],
  ["타겟","한국 금융기관 (은행/캐피탈/AMC/신탁사) + 기관/개인 투자자"],
  ["차별화","3대 마켓 통합, AI 4대 분석도구, 수요 기반 매칭, 3단계 정보공개, 딜룸 기반 거래"],
  ["목표","글로벌 유니콘 - 한국 NPL 시장 1위 플랫폼"],
],[1500,7860]));
ch.push(spacer());

ch.push(heading("1.2 3대 마켓", HeadingLevel.HEADING_2));
ch.push(mt(["마켓","영문 코드","설명","주요 사용자"],[
  ["급매 부동산","DISTRESSED_SALE","시세 대비 할인된 급매 매물","개인/기관 투자자"],
  ["경매/공매 NPL","AUCTION_NPL","법원 경매, 캠코 공매 물건","개인/기관 투자자"],
  ["비경매 NPL 직거래","NON_AUCTION_NPL","금융기관 직접 매각 부실채권","기관 투자자"],
],[1500,1800,3500,2560]));
ch.push(spacer());

ch.push(heading("1.3 7개 모듈 구조", HeadingLevel.HEADING_2));
ch.push(mt(["Module","이름","핵심 기능","기획서"],[
  ["M1","홈/랜딩/네비게이션","GNB, Hero, 마켓 카드, AI 도구 소개, 통계","NPL_Module1"],
  ["M2","검색/목록/지도","통합 검색, 3마켓 탭, 필터, Kakao Maps","NPL_Module2"],
  ["M3","상세 + AI 분석","3단계 정보공개, 가격예측, 등기분석, 낙찰가율, 수익시뮬레이터","NPL_Module3"],
  ["M4","금융기관 마케팅","기관 대시보드, 6단계 등록, 포트폴리오, KYC","NPL_Module4"],
  ["M5","투자자 도구","투자자 대시보드, 관심매물, 비교, 알림, 매칭엔진","NPL_Module5"],
  ["M6","계약/딜룸/회원","4종 가입, MFA, NDA 전자서명, 계약 워크플로우, Realtime 채팅","NPL_Module6"],
  ["M7","대시보드/통계/관리자","관리자 KPI, KYC 심사, 경공매 통계, D3.js 히트맵, 감사로그","NPL_Module7"],
],[600,1800,4000,2960]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 2. SYSTEM ARCHITECTURE
// ══════════════════════════════════════════════════════════════
ch.push(heading("2. 시스템 아키텍처"));
ch.push(p([bold("전체 시스템 구성도:")]));
ch.push(code("[Client] Next.js 15 App Router (Vercel)"));
ch.push(code("  ↕ HTTPS / TLS 1.3"));
ch.push(code("[API Layer] Next.js Route Handlers + Supabase Edge Functions (Deno)"));
ch.push(code("  ↕ Supabase Client SDK (PostgREST / Realtime / Storage / Auth)"));
ch.push(code("[Backend] Supabase Cloud (ap-northeast-2, Seoul)"));
ch.push(code("  ├── PostgreSQL 15 (RLS + pgcrypto + pg_trgm + PostGIS)"));
ch.push(code("  ├── Auth (JWT + PKCE + Social OAuth + MFA/TOTP)"));
ch.push(code("  ├── Storage (S3-compatible, 문서/이미지/NDA PDF)"));
ch.push(code("  ├── Realtime (WebSocket, 딜룸 채팅 + 알림)"));
ch.push(code("  └── Edge Functions (Deno, cron jobs, 알림 발송)"));
ch.push(code("[AI Server] Python FastAPI (Railway/Render)"));
ch.push(code("  ├── XGBoost + SHAP (가격 예측)"));
ch.push(code("  ├── PDF.js + GPT-4 (등기 분석)"));
ch.push(code("  ├── Random Forest + Quantile Regression (낙찰가율)"));
ch.push(code("  └── 수익 시뮬레이터 (경매/채권매입 2모드)"));
ch.push(spacer());

ch.push(heading("2.1 외부 서비스 통합", HeadingLevel.HEADING_2));
ch.push(mt(["서비스","용도","연동 방식","비고"],[
  ["Kakao Maps API","지도/지오코딩/클러스터링","CDN + REST API","지도 페이지, 히트맵"],
  ["국세청 API","사업자번호 실시간 검증","REST API","기관 KYC 검증"],
  ["대법원 경매정보 API","경매 통계 데이터 수집","REST (cron 매일 03:00)","auction_statistics 테이블"],
  ["캠코 온비드 API","공매 데이터 수집","REST (cron 매일 04:00)","auction_statistics 테이블"],
  ["국토부 실거래가 API","실거래 데이터","REST (cron 매월 1일)","trade_prices 테이블"],
  ["SendGrid","이메일 발송","REST API","가입확인, KYC결과, 알림"],
  ["Kakao 알림톡","카카오톡 알림","REST API","맞춤 알림, 계약 알림"],
  ["NICE/KCB","본인인증 (pass)","팝업 + 콜백","첫 계약 시 필수"],
  ["Web Push API","브라우저 푸시 알림","Service Worker","실시간 알림"],
],[1800,2000,1800,3760]));
ch.push(spacer());

ch.push(heading("2.2 캐시 전략", HeadingLevel.HEADING_2));
ch.push(mt(["레이어","기술","대상","TTL"],[
  ["클라이언트","React Query (TanStack)","API 응답 캐시","staleTime: 30s~5min"],
  ["SSR/ISR","Next.js ISR","랜딩/통계 페이지","revalidate: 60s"],
  ["CDN","Supabase Storage CDN","이미지/문서 파일","Edge 캐시 (자동)"],
  ["DB 캐시","PostgreSQL shared_buffers","쿼리 결과","자동 (LRU)"],
  ["향후","Upstash Redis","세션, Rate Limit, 실시간 카운터","TTL: 1h~24h"],
],[1500,2000,2800,3060]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 3. TECH STACK
// ══════════════════════════════════════════════════════════════
ch.push(heading("3. 기술 스택"));
ch.push(mt(["카테고리","기술","버전","용도"],[
  ["Framework","Next.js (App Router)","15.x","SSR/ISR, 라우팅, API Routes"],
  ["Language","TypeScript","5.x","타입 안전성"],
  ["UI Library","React","19.x","컴포넌트 기반 UI"],
  ["Style","Tailwind CSS","3.x","유틸리티 기반 스타일링"],
  ["UI Components","Radix UI + shadcn/ui","Latest","80+ 접근성 컴포넌트"],
  ["Form","React Hook Form + Zod","7.x + 3.x","폼 관리 + 스키마 검증"],
  ["Charts","Recharts","2.x","Bar, Line, Pie, Area 차트"],
  ["Heatmap","D3.js + TopoJSON","7.x","한국 지역 히트맵"],
  ["Animation","Framer Motion","11.x","페이지 전환, 마이크로 인터랙션"],
  ["Icons","Lucide React","Latest","UI 아이콘"],
  ["PDF","jsPDF","2.x","NDA PDF 생성"],
  ["DOCX","docx-js","8.x","리포트 문서 생성"],
  ["HTTP","Axios","1.x","외부 API 호출"],
  ["State","React Query + Zustand","5.x + 4.x","서버/클라이언트 상태관리"],
  ["Backend","Supabase","2.x","PostgreSQL, Auth, Storage, Realtime"],
  ["AI Server","Python FastAPI","0.100+","AI 모델 서빙"],
  ["ML","XGBoost, scikit-learn","Latest","가격예측, 낙찰가율"],
  ["NLP","GPT-4 API","Latest","등기 분석"],
  ["Monitoring","Sentry","Latest","에러 추적"],
  ["Analytics","Vercel Analytics","Latest","Web Vitals"],
  ["Logging","Winston","3.x","서버 사이드 로깅"],
],[1500,2000,1000,4860]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 4. SECURITY ARCHITECTURE (신규)
// ══════════════════════════════════════════════════════════════
ch.push(heading("4. 보안 아키텍처"));
ch.push(p([run("금융 플랫폼에 요구되는 보안 수준을 충족하기 위한 다층 보안 아키텍처입니다.")]));

ch.push(heading("4.1 암호화", HeadingLevel.HEADING_2));
ch.push(mt(["구분","방식","대상","구현"],[
  ["전송 암호화","TLS 1.3","모든 HTTP 통신","Vercel + Supabase 자동 적용"],
  ["저장 암호화 (PII)","pgcrypto AES-256","이름, 연락처, 사업자번호, 주소","pgcrypto.encrypt() / decrypt()"],
  ["파일 암호화","Supabase Storage (SSE)","사업자등록증, KYC 서류, NDA PDF","S3 Server-Side Encryption"],
  ["비밀번호","bcrypt (cost 10)","사용자 비밀번호","Supabase Auth 내장"],
  ["시크릿 관리","Supabase Vault","API 키, 외부 서비스 시크릿","Edge Function 환경변수"],
  ["문서 무결성","SHA-256 해시","NDA/계약서 PDF","생성 시 해시 저장, 검증 시 대조"],
],[1200,1500,2500,4160]));
ch.push(spacer());

ch.push(heading("4.2 인증 & 세션", HeadingLevel.HEADING_2));
ch.push(mt(["항목","구현","설명"],[
  ["인증 방식","Supabase Auth (PKCE)","이메일/PW + 소셜 (카카오/네이버/Google)"],
  ["JWT 토큰","Access 1h + Refresh 7d","자동 리프레시 (middleware.ts)"],
  ["MFA (2단계 인증)","TOTP (앱 기반)","금융기관/관리자 필수, 일반 사용자 선택"],
  ["세션 제한","동시 3세션","새 디바이스 로그인 시 이메일 알림"],
  ["브루트포스 방어","5회 실패 → 15분 lockout","lockout 후 이메일 알림"],
  ["이상 탐지","IP/디바이스 변경 감지","새 환경 → 이메일 알림 + 2차 인증"],
  ["API 인증","Bearer JWT (anon key)","클라이언트: anon key, 서버: service_role key"],
],[1500,2200,5660]));
ch.push(spacer());

ch.push(heading("4.3 RLS 정책 매트릭스", HeadingLevel.HEADING_2));
ch.push(mt(["테이블","SELECT","INSERT","UPDATE","DELETE"],[
  ["users","본인 OR 관리자","Auth trigger","본인만","SUPER_ADMIN만"],
  ["npl_listings","공개 (Teaser)","SELLER + KYC 승인","소유자만","소유자 + ADMIN"],
  ["favorites","본인만","인증 유저","본인만","본인만"],
  ["alert_settings","본인만","인증 유저","본인만","본인만"],
  ["nda_agreements","본인만","인증 유저","불가","불가"],
  ["contract_requests","매각사/매입사","인증 유저","관련 당사자","불가"],
  ["deal_rooms","참여자만","시스템 자동","참여자","ADMIN만"],
  ["deal_room_messages","딜룸 참여자만","딜룸 참여자","불가","불가"],
  ["admin_audit_logs","ADMIN (본인) / SUPER (전체)","시스템 자동","불가 (Immutable)","불가 (Immutable)"],
  ["auction_statistics","전체 공개","ADMIN/시스템","ADMIN만","SUPER_ADMIN만"],
],[1500,1800,1500,1500,3060]));
ch.push(spacer());

ch.push(heading("4.4 웹 보안", HeadingLevel.HEADING_2));
ch.push(mt(["위협","방어","구현"],[
  ["XSS","CSP 헤더 + DOMPurify","Content-Security-Policy: script-src 'self'"],
  ["CSRF","SameSite=Lax + Origin 검증","쿠키 설정 + API 미들웨어"],
  ["SQL Injection","Supabase PostgREST (자동 파라미터화)","직접 쿼리 불가 구조"],
  ["Rate Limiting","IP/유저별 요청 제한","인증: 100/min, 비인증: 20/min, AI: 10/h"],
  ["WAF","Vercel Firewall","기본 규칙 + 관리자 IP 제한"],
  ["DDoS","Vercel Edge Network","글로벌 CDN 기반 트래픽 분산"],
  ["파일 업로드","확장자 화이트리스트 + 크기 제한","pdf,docx,xlsx,jpg,png / 10MB"],
],[1500,2500,5360]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 5. COMPLIANCE FRAMEWORK (신규)
// ══════════════════════════════════════════════════════════════
ch.push(heading("5. 컴플라이언스 프레임워크"));
ch.push(p([run("한국 금융 관련 3대 법률에 대한 준수 사항과 구현 방법을 정의합니다.")]));

ch.push(heading("5.1 개인정보보호법 (PIPA)", HeadingLevel.HEADING_2));
ch.push(mt(["조항","요구사항","구현 방법","검증"],[
  ["제14조 (암호화)","PII 암호화 저장","pgcrypto AES-256: users.name, phone, company_name","execute_sql로 암호문 확인"],
  ["제21조 (보관기한)","목적 달성 후 파기","탈퇴 후 5년 보관 → pg_cron 자동 삭제","cron 로그 확인"],
  ["제35조 (열람권)","본인 정보 열람/정정/삭제","GET /api/v1/privacy/my-data (JSON 내보내기)","API 테스트"],
  ["제36조 (정정권)","부정확 정보 정정","PUT /api/v1/privacy/update","API 테스트"],
  ["제37조 (처리정지)","처리 정지 요청","PUT /api/v1/privacy/suspend-processing","API 테스트"],
  ["동의 관리","수집/이용/제3자 제공 동의","consent_logs 테이블 (필수/선택별 동의이력)","DB 확인"],
  ["처리방침","개인정보 처리방침 공개","/privacy-policy 페이지","페이지 렌더링"],
],[1200,1800,3000,3360]));
ch.push(spacer());

ch.push(heading("5.2 전자금융거래법", HeadingLevel.HEADING_2));
ch.push(mt(["요구사항","구현 방법","보관기한"],[
  ["본인확인","이메일 OTP + 휴대폰 인증 (NICE API)","인증기록 5년"],
  ["거래기록 보관","append-only audit_logs (UPDATE/DELETE RLS 차단)","5년"],
  ["변조방지","NDA/계약서 PDF SHA-256 해시 저장 → 대조 검증","5년"],
  ["이상거래탐지","로그인 IP/디바이스 변경 감지 → 이메일 + 2차 인증","탐지 로그 5년"],
  ["접근기록","admin_audit_logs: 관리자 모든 액션 기록","5년"],
  ["암호화","PII 암호화 저장 + TLS 1.3 전송","상시"],
],[2000,4500,2860]));
ch.push(spacer());

ch.push(heading("5.3 금융소비자보호법", HeadingLevel.HEADING_2));
ch.push(mt(["요구사항","구현 방법","UI"],[
  ["투자 위험 고지","AI 분석 결과에 '본 분석은 참고용이며 투자 판단의 근거가 되지 않습니다' 상시 표시","RiskDisclaimer 컴포넌트"],
  ["적합성 확인","투자경험/지식 확인 후 적합 매물 추천","수요설문 Step 4"],
  ["청약 철회","계약 체결 후 7영업일 내 철회 가능","contract.cooldown_expires_at + '철회' 버튼"],
  ["민원 처리","접수 → 14영업일 내 처리 → 결과 통보","complaints 테이블 + 관리자 대시보드"],
  ["설명의무","상품 특성·위험 충분히 설명","매물 상세 '투자 유의사항' 섹션"],
],[1500,3500,4360]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 6. DEPLOYMENT & OPERATIONS (신규)
// ══════════════════════════════════════════════════════════════
ch.push(heading("6. 배포 및 운영 아키텍처"));

ch.push(heading("6.1 환경 구성", HeadingLevel.HEADING_2));
ch.push(mt(["환경","인프라","DB","용도"],[
  ["dev","localhost:3000","Supabase local (supabase start)","개발/디버깅"],
  ["staging","Vercel Preview URL","Supabase branch (자동 생성)","PR 리뷰, QA"],
  ["production","Vercel Production","Supabase main (ap-northeast-2)","실서비스"],
],[1200,2500,2500,3160]));
ch.push(spacer());

ch.push(heading("6.2 CI/CD 파이프라인", HeadingLevel.HEADING_2));
ch.push(code("PR 생성 → GitHub Actions:"));
ch.push(code("  1. Lint (ESLint)"));
ch.push(code("  2. Type Check (tsc --noEmit)"));
ch.push(code("  3. Unit Test (Vitest)"));
ch.push(code("  4. Vercel Preview 자동 배포"));
ch.push(code(""));
ch.push(code("main 머지 → "));
ch.push(code("  1. Vercel Production 자동 배포"));
ch.push(code("  2. Supabase migration push (supabase db push)"));
ch.push(code("  3. Sentry 소스맵 업로드"));
ch.push(spacer());

ch.push(heading("6.3 SLA 정의", HeadingLevel.HEADING_2));
ch.push(mt(["지표","목표","측정 방법","에스컬레이션"],[
  ["가용성","99.9% (월 43분 이하)","Vercel + Supabase 상태 페이지","P1: 즉시 알림"],
  ["API 응답","P95 < 500ms","Vercel Analytics","P2: 1시간 내"],
  ["페이지 로드","P95 < 2s (LCP)","Lighthouse CI","P2: 1시간 내"],
  ["데이터 복구 (RPO)","24시간","Supabase PITR","정기 백업 검증"],
  ["복구 시간 (RTO)","4시간","장애 복구 훈련","분기 1회 훈련"],
  ["KYC 심사","72시간 내 처리","admin_audit_logs","30일 초과 시 에스컬레이션"],
  ["매물 검수","48시간 내 처리","admin_audit_logs","7일 초과 시 리마인더"],
  ["민원 처리","14영업일 내","complaints 테이블","초과 시 관리자 알림"],
],[1500,1500,2500,3860]));
ch.push(spacer());

ch.push(heading("6.4 모니터링", HeadingLevel.HEADING_2));
ch.push(mt(["도구","대상","알림 조건","채널"],[
  ["Sentry","프론트엔드/API 에러","에러율 > 5%","Slack (즉시)"],
  ["Vercel Analytics","Web Vitals (LCP, FID, CLS)","LCP > 2.5s","이메일 (일일)"],
  ["Supabase Dashboard","DB 성능, Auth, Storage","연결 80%+, 스토리지 80%+","이메일"],
  ["/admin/system","API 응답시간, 에러율, 세션","커스텀 임계치","대시보드 + Slack"],
  ["pg_cron 로그","데이터 파이프라인","수집 실패 3회","이메일 (즉시)"],
],[1500,2200,2200,3460]));
ch.push(spacer());

ch.push(heading("6.5 장애 복구", HeadingLevel.HEADING_2));
ch.push(mt(["장애 유형","복구 방법","RTO","담당"],[
  ["프론트엔드 배포 실패","Vercel 1-click 롤백 (이전 배포)","5분","개발팀"],
  ["DB 데이터 손실","Supabase PITR (Point-in-Time Recovery)","4시간","인프라팀"],
  ["파일 저장소 장애","Supabase Storage (S3 자동 복제)","자동","인프라"],
  ["외부 API 장애","Fallback + 캐시 데이터 제공","자동","시스템"],
  ["DDoS 공격","Vercel Edge Network + Cloudflare","30분","보안팀"],
  ["데이터 파이프라인 실패","dead_letter_queue → 수동 재처리","24시간","데이터팀"],
],[1500,3000,1000,3860]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 7. API DESIGN PRINCIPLES (신규)
// ══════════════════════════════════════════════════════════════
ch.push(heading("7. API 설계 원칙"));

ch.push(heading("7.1 공통 규칙", HeadingLevel.HEADING_2));
ch.push(mt(["항목","규칙","예시"],[
  ["스타일","RESTful + JSON:API","GET /api/v1/listings?sort=-created_at"],
  ["버전","URL prefix /api/v1/","Breaking Change 시 /api/v2/ 신설"],
  ["인증","Authorization: Bearer <jwt>","Supabase Auth JWT"],
  ["페이지네이션 (기본)","cursor-based","?cursor=<uuid>&limit=20 → { data[], next_cursor }"],
  ["페이지네이션 (관리자)","offset-based","?page=1&per_page=50 → { data[], total, pages }"],
  ["날짜 형식","ISO 8601 (UTC)","2026-03-14T09:30:00Z"],
  ["금액 단위","원 (KRW, 정수)","1000000000 (= 10억원)"],
  ["ID 형식","UUID v4","550e8400-e29b-41d4-a716-446655440000"],
],[1500,2500,5360]));
ch.push(spacer());

ch.push(heading("7.2 에러 응답 표준", HeadingLevel.HEADING_2));
ch.push(code('{ "error": {'));
ch.push(code('    "code": "AUTH_UNAUTHORIZED | VALIDATION_ERROR | NOT_FOUND | FORBIDDEN | RATE_LIMITED | CONFLICT | INTERNAL_ERROR",'));
ch.push(code('    "message": "한국어 에러 메시지",'));
ch.push(code('    "details": { ... }  // Zod 검증 에러, 필드별 에러 등'));
ch.push(code('  }'));
ch.push(code('}'));
ch.push(spacer());

ch.push(heading("7.3 HTTP 상태 코드", HeadingLevel.HEADING_2));
ch.push(mt(["코드","의미","사용 시점"],[
  ["200","OK","조회 성공, 수정 성공"],
  ["201","Created","생성 성공 (POST)"],
  ["204","No Content","삭제 성공"],
  ["400","Bad Request","입력 검증 실패 (Zod)"],
  ["401","Unauthorized","JWT 없음/만료"],
  ["403","Forbidden","권한 없음 (RLS)"],
  ["404","Not Found","리소스 없음"],
  ["409","Conflict","중복/상태 충돌"],
  ["422","Unprocessable Entity","비즈니스 로직 에러"],
  ["429","Too Many Requests","Rate Limit 초과"],
  ["500","Internal Server Error","서버 오류 (Sentry 전송)"],
],[800,1800,6760]));
ch.push(spacer());

ch.push(heading("7.4 Rate Limiting", HeadingLevel.HEADING_2));
ch.push(mt(["대상","제한","윈도우","초과 시"],[
  ["인증 유저","100 requests","1분","429 + Retry-After 헤더"],
  ["비인증","20 requests","1분","429 + 로그인 안내"],
  ["AI 분석","10 requests","1시간","429 + '분석 크레딧 소진' 안내"],
  ["파일 업로드","20 requests","1시간","429 + '업로드 제한' 안내"],
  ["관리자","300 requests","1분","429 + Sentry 알림"],
  ["로그인 시도","5회 실패","15분","lockout + 이메일 알림"],
],[1500,1500,1200,5160]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 8. SCALABILITY PLAN (신규)
// ══════════════════════════════════════════════════════════════
ch.push(heading("8. 확장성 로드맵"));
ch.push(mt(["Phase","사용자 수","인프라","전환 기준"],[
  ["Phase 1 (MVP)","0~1,000","Supabase Pro + Vercel Pro","동접 100+ 또는 DB 500MB+"],
  ["Phase 2 (성장)","1K~10K","+ PgBouncer + Upstash Redis + ISR 확대","P95 > 1s 또는 동접 500+"],
  ["Phase 3 (스케일)","10K~100K","+ Read Replica + Edge CDN + DB 파티셔닝","DB CPU 70%+ 또는 동접 5000+"],
  ["Phase 4 (글로벌)","100K+","+ Multi-region + 마이크로서비스 + 이벤트 큐","해외 20%+ 또는 거래 100억+/월"],
],[1200,1200,3500,3460]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 9. DATA PIPELINE (신규)
// ══════════════════════════════════════════════════════════════
ch.push(heading("9. 데이터 파이프라인"));

ch.push(heading("9.1 수집 스케줄", HeadingLevel.HEADING_2));
ch.push(mt(["시각","소스","대상 테이블","방식","빈도"],[
  ["03:00","대법원 경매정보 API","auction_statistics","Supabase Edge Function cron","매일"],
  ["04:00","캠코 온비드 API","auction_statistics","Supabase Edge Function cron","매일"],
  ["매월 1일","국토부 실거래가 API","trade_prices","Supabase Edge Function cron","매월"],
  ["02:00","매칭 엔진 배치","matching_results","pg_cron + PostgreSQL function","매일"],
  ["06:00","알림 다이제스트","notifications","Edge Function","매일"],
],[800,1800,1800,2500,2460]));
ch.push(spacer());

ch.push(heading("9.2 ETL 프로세스", HeadingLevel.HEADING_2));
ch.push(mt(["단계","처리","에러 대응"],[
  ["Extract","API 호출 (timeout 30s)","3회 재시도 (exponential backoff: 1s, 4s, 16s)"],
  ["Transform","데이터 정규화 + 필수 필드 검증","NULL 필드 비율 > 1% → 알림"],
  ["Load","UPSERT ON CONFLICT (case_number + auction_date)","충돌 시 최신 데이터 우선"],
  ["Verify","건수 체크 (전일 대비 ±30%)","이상 시 관리자 이메일 + 수동 확인 대기열"],
  ["Backfill","초기 로딩 시 최근 2년치 일괄 수집","배치 크기 1000건 + 진행률 로깅"],
],[1200,3500,4660]));
ch.push(spacer());

ch.push(heading("9.3 데이터 품질 모니터링", HeadingLevel.HEADING_2));
ch.push(mt(["지표","정상 범위","이상 시 액션"],[
  ["일일 수집 건수","전일 대비 ±30% 이내","관리자 이메일 + 대시보드 알림"],
  ["필수 필드 NULL 비율","< 1%","수집 일시 중단 + 수동 확인"],
  ["낙찰가율 범위","10%~200%","이상치 플래그 + 원본 데이터 재확인"],
  ["데이터 신선도","24시간 이내","'마지막 업데이트: X일 전' 경고 표시"],
  ["중복 레코드","0건","UPSERT ON CONFLICT 자동 처리"],
],[1800,2500,5060]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 10. TEST STRATEGY (신규)
// ══════════════════════════════════════════════════════════════
ch.push(heading("10. 테스트 전략"));

ch.push(heading("10.1 테스트 피라미드", HeadingLevel.HEADING_2));
ch.push(mt(["레벨","도구","대상","커버리지 목표"],[
  ["Unit","Vitest + RTL","lib/ 함수, 컴포넌트 렌더링","70%+"],
  ["Integration","Vitest + Supabase","API Route, RLS 정책, 상태머신 전이","주요 플로우 100%"],
  ["E2E","Playwright (향후)","사용자 시나리오 (가입→검색→계약)","핵심 플로우 100%"],
  ["Performance","Lighthouse CI + k6","페이지 로드, API 응답시간","90+ 점수"],
  ["Security","수동 + axe-core","OWASP Top 10, XSS, RLS 침투","체크리스트 100%"],
  ["Accessibility","axe-core + 수동","WCAG 2.1 AA, 스크린리더, 키보드","주요 페이지 100%"],
],[1200,1800,3000,3360]));
ch.push(spacer());

ch.push(heading("10.2 성능 기준", HeadingLevel.HEADING_2));
ch.push(mt(["지표","목표","측정 방법"],[
  ["Lighthouse Performance","90+","Lighthouse CI (CI/CD)"],
  ["Lighthouse Accessibility","90+","Lighthouse CI"],
  ["Lighthouse SEO","90+","Lighthouse CI"],
  ["First Load JS","< 150KB","next build 출력"],
  ["API P95 응답","< 500ms","k6 또는 Artillery"],
  ["DB 쿼리","< 100ms (P95)","EXPLAIN ANALYZE"],
  ["LCP","< 2.5s","Vercel Analytics"],
  ["CLS","< 0.1","Vercel Analytics"],
  ["FID","< 100ms","Vercel Analytics"],
],[1800,1500,6060]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 11. MONITORING DASHBOARD (신규)
// ══════════════════════════════════════════════════════════════
ch.push(heading("11. 모니터링 대시보드"));
ch.push(p([run("/admin/system 페이지에서 실시간 시스템 상태를 모니터링합니다.")]));

ch.push(heading("11.1 대시보드 구성", HeadingLevel.HEADING_2));
ch.push(mt(["영역","표시 내용","업데이트"],[
  ["시스템 헬스","API 응답시간 P50/P95/P99, 에러율 4xx/5xx, 활성 세션 수","실시간 (30초)"],
  ["DB 상태","연결 수/최대, 느린 쿼리 Top 10, 스토리지 사용량","1분"],
  ["데이터 파이프라인","작업별 상태 (성공/실패), 마지막 실행, 수집 건수 추이","10분"],
  ["알림 현황","발송 큐 대기, 발송 성공률, 채널별 통계","5분"],
  ["비즈니스 KPI","가입/매물/계약/매칭 건수, 전환 퍼널, 매칭 점수 분포","실시간"],
],[1500,4500,3360]));
ch.push(spacer());

ch.push(heading("11.2 알림 체계", HeadingLevel.HEADING_2));
ch.push(mt(["우선순위","조건","채널","대응 시간"],[
  ["P1 (Critical)","API 에러율 > 5%, 서버 다운, DB 연결 실패","Slack + 이메일 + SMS","5분 이내 확인"],
  ["P2 (High)","느린 쿼리 > 3s, 스토리지 80%+, 파이프라인 실패","Slack + 이메일","1시간 이내"],
  ["P3 (Medium)","KYC/검수 SLA 초과, 비정상 트래픽 패턴","이메일","24시간 이내"],
  ["P4 (Info)","일일 KPI 요약, 데이터 파이프라인 완료","이메일 (일일 리포트)","정기 확인"],
],[1200,3000,2000,3160]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 12. DB SCHEMA OVERVIEW
// ══════════════════════════════════════════════════════════════
ch.push(heading("12. 데이터베이스 스키마 (요약)"));
ch.push(mt(["테이블","핵심 컬럼","용도","RLS"],[
  ["users","id, email, role, name, phone, kyc_status, mfa_enabled","사용자 정보 + 역할","본인/관리자"],
  ["npl_listings","id, listing_type, title, address, price, status, disclosure_level","NPL 매물","공개/소유자"],
  ["demand_surveys","id, user_id, preferred_types[], regions[], budget_range","수요 설문","본인"],
  ["matching_results","id, survey_id, listing_id, score, factors","매칭 결과","본인"],
  ["favorites","id, user_id, listing_id, folder_name, memo, price_at_save","관심 매물","본인"],
  ["alert_settings","id, user_id, conditions(JSONB), channels(JSONB), frequency","맞춤 알림","본인"],
  ["nda_agreements","id, user_id, listing_id, signature_data, nda_pdf_url","NDA 전자서명","본인"],
  ["contract_requests","id, listing_id, buyer_id, seller_id, status, proposed_price","계약 요청","당사자"],
  ["deal_rooms","id, contract_id, listing_id, status, checklist(JSONB)","딜룸","참여자"],
  ["deal_room_messages","id, deal_room_id, sender_id, message, attachment_url","딜룸 채팅","참여자"],
  ["institution_profiles","id, user_id, institution_type, license_url, kyc_status","기관 프로필","본인/관리자"],
  ["auction_statistics","id, court_name, region, collateral_type, winning_rate, auction_date","경공매 통계","공개"],
  ["admin_audit_logs","id, admin_id, action_type, target_type, before/after_state","감사 로그 (Immutable)","관리자"],
  ["notifications","id, user_id, type, title, message, is_read","알림","본인"],
  ["consent_logs","id, user_id, consent_type, agreed, version","동의 이력","본인"],
  ["complaints","id, user_id, subject, status, assigned_admin_id","민원","본인/관리자"],
],[1500,3000,1500,3360]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 13. ROUTE MAP
// ══════════════════════════════════════════════════════════════
ch.push(heading("13. 라우트 맵"));
ch.push(mt(["라우트","페이지","모듈","권한"],[
  ["/","홈/랜딩","M1","Public"],
  ["/auth/login","로그인","M6","Public"],
  ["/auth/signup","회원가입","M6","Public"],
  ["/listings","매물 목록","M2","Public"],
  ["/listings/map","지도 보기","M2","Public"],
  ["/listings/[id]","매물 상세","M3","Public (Teaser) / Auth (NDA/Full)"],
  ["/listings/new","매물 등록","M4","SELLER (KYC 승인)"],
  ["/demand/survey/new","수요설문 등록","M5","Authenticated"],
  ["/demand/surveys","수요설문 목록","M5","Authenticated"],
  ["/investor/dashboard","투자자 대시보드","M5","BUYER_INST/INDV"],
  ["/investor/favorites","관심 매물","M5","Authenticated"],
  ["/investor/comparisons","매물 비교","M5","Authenticated"],
  ["/investor/alerts","맞춤 알림","M5","Authenticated"],
  ["/institution/dashboard","기관 대시보드","M4","SELLER (KYC 승인)"],
  ["/contract/new","계약 요청","M6","Authenticated"],
  ["/contract/[id]","계약 상세","M6","당사자"],
  ["/deal-rooms","딜룸 목록","M6","Authenticated"],
  ["/deal-rooms/[id]","딜룸 상세","M6","참여자"],
  ["/mypage","마이페이지","M6","Authenticated"],
  ["/statistics","경공매 통계","M7","Public"],
  ["/statistics/trend","추이 분석","M7","Public"],
  ["/admin/dashboard","관리자 대시보드","M7","ADMIN/SUPER"],
  ["/admin/users","사용자 관리","M7","ADMIN/SUPER"],
  ["/admin/kyc","KYC 심사","M7","ADMIN/SUPER"],
  ["/admin/listings","매물 관리","M7","ADMIN/SUPER"],
  ["/admin/audit-logs","감사 로그","M7","ADMIN/SUPER"],
  ["/admin/system","시스템 모니터링","M7","SUPER_ADMIN"],
  ["/privacy-policy","개인정보 처리방침","공통","Public"],
],[2200,1800,600,4760]));
ch.push(pb());

// ══════════════════════════════════════════════════════════════
// 14. DEVELOPMENT ROADMAP
// ══════════════════════════════════════════════════════════════
ch.push(heading("14. 개발 로드맵"));
ch.push(mt(["Phase","기간","작업","핵심 산출물","의존성"],[
  ["0","2일","기획서 보강 (Module 5,6,7 재생성)","3개 .docx 기획서","없음"],
  ["1","3일","DB 스키마 확장 + 타입 + RLS","마이그레이션 8회 + types.ts","없음"],
  ["2","4일","M1: 홈/네비게이션 고도화","랜딩 + 메가메뉴","Phase 1"],
  ["3","5일","M2: 검색/목록/지도","3마켓 탭 + Kakao Maps","Phase 1,2"],
  ["4","5일","M3: 상세 + AI 분석","3단계 공개 + AI 4도구","Phase 1,3"],
  ["5","4일","M4: 기관 마케팅","기관 대시보드 + 6단계 등록","Phase 1,4"],
  ["6","4일","M5: 투자자 도구","대시보드 + 관심매물 + 매칭","Phase 1,3,4"],
  ["7","5일","M6: 계약/딜룸/회원","MFA + NDA + 계약 + Realtime","Phase 1,5"],
  ["8","5일","M7: 통계/관리자","히트맵 + KPI + KYC + 감사로그","Phase 1,7"],
],[600,600,3000,2500,2660]));
ch.push(spacer());

ch.push(p([bold("크리티컬 패스: "), run("Phase 0 → 1 → 2 → 3 → 4 → 6 → 7 → 8 (총 35일)")]));
ch.push(p([bold("병렬 가능: "), run("Phase 5 (기관)는 Phase 4와 병렬 진행 가능")]));

// ══════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ══════════════════════════════════════════════════════════════
const doc = new Document({
  numbering, styles,
  sections: [{
    properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run("NPLATFORM Master Architecture v2.0 | ", { size: 16, color: C.gray }), run("Confidential", { size: 16, color: C.red, italics: true })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run("© 2026 NPLATFORM. Page ", { size: 16, color: C.gray }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray })] })] }) },
    children: ch
  }]
});

const outPath = __dirname + "/NPL_Master_Architecture_v2.docx";
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log(`Created: ${outPath} (${Math.round(buf.length/1024)}KB)`);
});
