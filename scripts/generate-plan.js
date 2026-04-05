const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak,
  LevelFormat, ExternalHyperlink,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ─── 색상 팔레트 ───────────────────────────────────────────
const C = {
  navy:     "1B3A5C",
  blue:     "2E75B6",
  teal:     "10B981",
  orange:   "F59E0B",
  purple:   "8B5CF6",
  red:      "EF4444",
  gray:     "6B7280",
  lightBg:  "EFF6FF",
  lightGray:"F3F4F6",
  white:    "FFFFFF",
  black:    "111827",
  tableHead:"1B3A5C",
  tableAlt: "EFF6FF",
  border:   "D1D5DB",
};

// ─── 여백/크기 상수 ─────────────────────────────────────────
const PAGE_W = 11906;  // A4
const PAGE_H = 16838;
const MARGIN = 1134;   // 2cm
const CONTENT_W = PAGE_W - MARGIN * 2;  // 9638

// ─── 헬퍼 함수 ─────────────────────────────────────────────
const sp = (before = 0, after = 0, line = null) => ({
  before, after, ...(line ? { line, lineRule: "auto" } : {}),
});

const border1 = (color = C.border) => ({
  top: { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left: { style: BorderStyle.SINGLE, size: 1, color },
  right: { style: BorderStyle.SINGLE, size: 1, color },
});

const noBorder = () => ({
  top: { style: BorderStyle.NONE, size: 0, color: C.white },
  bottom: { style: BorderStyle.NONE, size: 0, color: C.white },
  left: { style: BorderStyle.NONE, size: 0, color: C.white },
  right: { style: BorderStyle.NONE, size: 0, color: C.white },
});

const cell = (children, w, opts = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA },
  borders: opts.borders ?? border1(),
  shading: opts.bg ? { fill: opts.bg, type: ShadingType.CLEAR } : undefined,
  verticalAlign: opts.vAlign ?? VerticalAlign.CENTER,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children,
});

const p = (text, opts = {}) => new Paragraph({
  alignment: opts.align ?? AlignmentType.LEFT,
  spacing: opts.sp ?? sp(0, 0),
  children: [new TextRun({
    text,
    bold: opts.bold ?? false,
    size: opts.size ?? 20,
    color: opts.color ?? C.black,
    font: "맑은 고딕",
    italics: opts.italic ?? false,
  })],
});

const pRun = (runs, opts = {}) => new Paragraph({
  alignment: opts.align ?? AlignmentType.LEFT,
  spacing: opts.sp ?? sp(0, 0),
  children: runs,
});

const run = (text, opts = {}) => new TextRun({
  text,
  bold: opts.bold ?? false,
  size: opts.size ?? 20,
  color: opts.color ?? C.black,
  font: "맑은 고딕",
  italics: opts.italic ?? false,
});

const blank = (h = 120) => new Paragraph({ spacing: sp(0, h) });

// ─── 섹션 타이틀 ───────────────────────────────────────────
const sectionTitle = (num, text) => [
  blank(160),
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: sp(200, 160),
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 4 },
    },
    children: [
      new TextRun({ text: `${num}. ${text}`, bold: true, size: 32, color: C.navy, font: "맑은 고딕" }),
    ],
  }),
];

const subTitle = (text, color = C.navy) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: sp(160, 80),
  children: [new TextRun({ text, bold: true, size: 26, color, font: "맑은 고딕" })],
});

// ─── 표 헤더 행 ────────────────────────────────────────────
const tableHeaderRow = (cols) => new TableRow({
  tableHeader: true,
  children: cols.map(([text, w]) => cell(
    [p(text, { bold: true, size: 18, color: C.white, align: AlignmentType.CENTER })],
    w,
    { bg: C.tableHead, borders: border1(C.tableHead) }
  )),
});

const tableRow = (cols, alt = false) => new TableRow({
  children: cols.map(([text, w, opts = {}]) => cell(
    [p(text, { size: 18, align: opts.align ?? AlignmentType.LEFT, color: opts.color ?? C.black, bold: opts.bold ?? false })],
    w,
    { bg: alt ? C.tableAlt : C.white }
  )),
});

// ─── 점수 바 (텍스트 기반) ─────────────────────────────────
const scoreBar = (label, current, target, note) => {
  const filled = Math.round(current / 10);
  const bar = "█".repeat(filled) + "░".repeat(10 - filled);
  return new Paragraph({
    spacing: sp(40, 40),
    children: [
      run(`${label.padEnd(18)}`, { bold: true, size: 18, color: C.navy }),
      run(` ${bar} `, { size: 18, color: current >= 70 ? C.teal : current >= 50 ? C.orange : C.red }),
      run(`${current}/100`, { bold: true, size: 18, color: current >= 70 ? C.teal : current >= 50 ? C.orange : C.red }),
      run(`  →  목표 ${target}점  `, { size: 18, color: C.gray }),
      run(note, { size: 16, color: C.gray, italic: true }),
    ],
  });
};

// ─── 불릿 아이템 ───────────────────────────────────────────
const bullet = (text, sub = false) => ({
  numbering: { reference: "bullets", level: sub ? 1 : 0 },
  spacing: sp(40, 40),
  children: [run(text, { size: sub ? 18 : 19, color: sub ? C.gray : C.black })],
});

// ─── KPI 카드 (테이블로 구현) ──────────────────────────────
const kpiTable = (items) => {
  const cols = items.map(() => Math.floor(CONTENT_W / items.length));
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: cols,
    rows: [
      new TableRow({
        children: items.map(({ label, value, sub, color }, i) => cell(
          [
            p(value, { bold: true, size: 32, color: color ?? C.navy, align: AlignmentType.CENTER }),
            p(label, { size: 17, color: C.gray, align: AlignmentType.CENTER }),
            sub ? p(sub, { size: 15, color: C.teal, align: AlignmentType.CENTER }) : blank(0),
          ],
          cols[i],
          { bg: C.lightBg }
        )),
      }),
    ],
  });
};

// ─── 문서 생성 ─────────────────────────────────────────────

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [
          {
            level: 0, format: LevelFormat.BULLET, text: "•",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 480, hanging: 240 } } },
          },
          {
            level: 1, format: LevelFormat.BULLET, text: "–",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 840, hanging: 240 } } },
          },
        ],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: "맑은 고딕", size: 20 } },
    },
    paragraphStyles: [
      {
        id: "Heading1", name: "Heading 1",
        run: { size: 32, bold: true, color: C.navy, font: "맑은 고딕" },
        paragraph: { spacing: sp(200, 160), outlineLevel: 0 },
      },
      {
        id: "Heading2", name: "Heading 2",
        run: { size: 26, bold: true, color: C.navy, font: "맑은 고딕" },
        paragraph: { spacing: sp(160, 80), outlineLevel: 1 },
      },
      {
        id: "Heading3", name: "Heading 3",
        run: { size: 22, bold: true, color: C.blue, font: "맑은 고딕" },
        paragraph: { spacing: sp(120, 60), outlineLevel: 2 },
      },
    ],
  },
  sections: [

    // ══════════════════════════════════════════════
    // 표지
    // ══════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: [
        blank(1800),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: sp(0, 80),
          children: [new TextRun({ text: "NPlatform", bold: true, size: 72, color: C.navy, font: "맑은 고딕" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: sp(0, 200),
          children: [new TextRun({ text: "종합기획서 · 기술현황 · 성장전략", size: 36, color: C.blue, font: "맑은 고딕" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: sp(0, 80),
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 4, color: C.teal, space: 4 },
          },
          children: [],
        }),
        blank(400),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: sp(0, 100),
          children: [new TextRun({ text: "대한민국 NPL 부동산 투자 플랫폼", size: 28, color: C.gray, font: "맑은 고딕" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: sp(0, 80),
          children: [new TextRun({ text: "AI 기반 · 데이터 드리븐 · 글로벌 유니콘 목표", size: 24, color: C.gray, font: "맑은 고딕" })],
        }),
        blank(1600),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [Math.floor(CONTENT_W / 3), Math.floor(CONTENT_W / 3), CONTENT_W - Math.floor(CONTENT_W / 3) * 2],
          rows: [
            new TableRow({
              children: [
                cell([p("문서 버전", { size: 16, color: C.gray }), p("v2.0", { bold: true, size: 22, color: C.navy })], Math.floor(CONTENT_W / 3), { bg: C.lightBg }),
                cell([p("작성일", { size: 16, color: C.gray }), p("2026. 04.", { bold: true, size: 22, color: C.navy })], Math.floor(CONTENT_W / 3), { bg: C.lightBg }),
                cell([p("분류", { size: 16, color: C.gray }), p("대외비", { bold: true, size: 22, color: C.red })], CONTENT_W - Math.floor(CONTENT_W / 3) * 2, { bg: C.lightBg }),
              ],
            }),
          ],
        }),
        blank(200),
      ],
    },

    // ══════════════════════════════════════════════
    // 본문
    // ══════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: PAGE_H },
          margin: { top: MARGIN + 400, right: MARGIN, bottom: MARGIN + 400, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 4 } },
              spacing: sp(0, 80),
              children: [
                new TextRun({ text: "NPlatform 종합기획서 2026", size: 16, color: C.gray, font: "맑은 고딕" }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 4 } },
              spacing: sp(80, 0),
              children: [
                new TextRun({ text: "- ", size: 16, color: C.gray, font: "맑은 고딕" }),
                new TextRun({ children: [PageNumber.CURRENT], size: 16, color: C.gray, font: "맑은 고딕" }),
                new TextRun({ text: " -  |  NPlatform  |  대외비", size: 16, color: C.gray, font: "맑은 고딕" }),
              ],
            }),
          ],
        }),
      },

      children: [

        // ══════════════════════
        // 1. 회사 개요
        // ══════════════════════
        ...sectionTitle("1", "회사 개요 및 비전"),

        subTitle("1-1. 서비스 개요"),
        p("NPlatform은 대한민국 NPL(부실채권) 부동산 투자 시장을 대상으로 하는 B2B2C 통합 플랫폼입니다.", { sp: sp(0, 60) }),
        p("은행·AMC·저축은행 등 기관투자자부터 개인 투자자까지, 부실채권 매물 탐색·분석·거래·정산의 전 과정을 디지털화합니다.", { sp: sp(0, 80) }),

        blank(80),
        kpiTable([
          { label: "총 API 엔드포인트", value: "150+", sub: "v1 RESTful" },
          { label: "프론트엔드 페이지", value: "200+", sub: "Next.js App Router" },
          { label: "DB 마이그레이션", value: "15개", sub: "Supabase PostgreSQL" },
          { label: "테스트 스위트", value: "30+", sub: "Vitest + Playwright" },
        ]),

        blank(120),
        subTitle("1-2. 핵심 가치 제안"),
        ...["NPL 투자 정보의 비대칭 해소 — AI 기반 물건 분석·리스크 등급화·낙찰가 예측",
           "완결 거래 플랫폼 — 매물 탐색부터 계약·정산까지 원스톱",
           "기관 전용 기능 — 대량 업로드·포트폴리오 분석·스트레스 테스트",
           "독자 시장 지수 — NBI(NPlatform Bid-Rate Index) 낙찰가율 지수 제공"].map(t => new Paragraph(bullet(t))),

        blank(120),
        subTitle("1-3. 미션 & 비전"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2400, CONTENT_W - 2400],
          rows: [
            tableHeaderRow([["구분", 2400], ["내용", CONTENT_W - 2400]]),
            tableRow([["미션", 2400], ["정보 불균형을 제거하고 NPL 투자 시장을 모든 이에게 투명하게 개방한다", CONTENT_W - 2400]]),
            tableRow([["비전", 2400], ["2030년까지 한국 NPL 시장 점유율 1위, 글로벌 유니콘($1B+) 달성", CONTENT_W - 2400]], true),
            tableRow([["슬로건", 2400], ["Data-Driven NPL Intelligence Platform", CONTENT_W - 2400]]),
          ],
        }),

        // ══════════════════════
        // 2. 시장 분석
        // ══════════════════════
        ...sectionTitle("2", "시장 분석 및 기회"),

        subTitle("2-1. 시장 규모"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2800, 2200, 2200, CONTENT_W - 7200],
          rows: [
            tableHeaderRow([["구분", 2800], ["2024년", 2200], ["2027년(예측)", 2200], ["성장률", CONTENT_W - 7200]]),
            tableRow([["국내 NPL 시장 규모", 2800], ["약 42조원", 2200], ["약 68조원", 2200], ["+62% (3년)", CONTENT_W - 7200, { color: C.teal, bold: true }]]),
            tableRow([["법원 경매 건수", 2800], ["연 12만건", 2200], ["연 18만건(예측)", 2200], ["+50%", CONTENT_W - 7200]], true),
            tableRow([["공매(온비드) 규모", 2800], ["약 15조원", 2200], ["약 22조원(예측)", 2200], ["+47%", CONTENT_W - 7200]]),
            tableRow([["디지털 중개 전환율", 2800], ["약 8%", 2200], ["약 35%(목표)", 2200], ["×4.4배 기회", CONTENT_W - 7200, { color: C.orange, bold: true }]], true),
          ],
        }),

        blank(120),
        subTitle("2-2. 경쟁사 포지셔닝"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2000, 1600, 1600, 1600, CONTENT_W - 6800],
          rows: [
            tableHeaderRow([["기업", 2000], ["국가", 1600], ["밸류에이션", 1600], ["핵심 강점", 1600], ["NPlatform 우위", CONTENT_W - 6800]]),
            tableRow([["CoStar Group", 2000], ["미국", 1600], ["$40B", 1600, { color: C.navy, bold: true }], ["CRE 데이터 50년", 1600], ["NPL 특화 + AI 분석", CONTENT_W - 6800, { color: C.teal }]]),
            tableRow([["Blend Labs", 2000], ["미국", 1600], ["$4B", 1600, { color: C.navy, bold: true }], ["모기지 UX", 1600], ["경매·부실채권 전문", CONTENT_W - 6800, { color: C.teal }]], true),
            tableRow([["Roofstock", 2000], ["미국", 1600], ["$2B", 1600, { color: C.navy, bold: true }], ["SFR 마켓플레이스", 1600], ["한국 법원경매 특화", CONTENT_W - 6800, { color: C.teal }]]),
            tableRow([["직방(Zigbang)", 2000], ["한국", 1600], ["₩2.2조", 1600, { color: C.navy, bold: true }], ["임대·매매 포털", 1600], ["NPL 전문 + B2B 기관", CONTENT_W - 6800, { color: C.teal }]], true),
            tableRow([["NPlatform", 2000], ["한국", 1600], ["목표 $1B+", 1600, { color: C.orange, bold: true }], ["NPL AI+데이터", 1600], ["국내 유일 통합플랫폼", CONTENT_W - 6800, { color: C.orange, bold: true }]]),
          ],
        }),

        // ══════════════════════
        // 3. 현재 기술 현황
        // ══════════════════════
        ...sectionTitle("3", "현재 기술 개발 현황"),

        subTitle("3-1. 아키텍처 구성도"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [Math.floor(CONTENT_W / 3), Math.floor(CONTENT_W / 3), CONTENT_W - Math.floor(CONTENT_W / 3) * 2],
          rows: [
            tableHeaderRow([["레이어", Math.floor(CONTENT_W / 3)], ["기술 스택", Math.floor(CONTENT_W / 3)], ["상태", CONTENT_W - Math.floor(CONTENT_W / 3) * 2]]),
            tableRow([["프론트엔드", Math.floor(CONTENT_W / 3)], ["Next.js 15.3, React 19, TypeScript 5, Tailwind CSS", Math.floor(CONTENT_W / 3)], ["✅ 프로덕션 준비", CONTENT_W - Math.floor(CONTENT_W / 3) * 2, { color: C.teal }]]),
            tableRow([["백엔드 API", Math.floor(CONTENT_W / 3)], ["Next.js API Routes, 150+ 엔드포인트, Zod 검증", Math.floor(CONTENT_W / 3)], ["✅ 프로덕션 준비", CONTENT_W - Math.floor(CONTENT_W / 3) * 2, { color: C.teal }]], true),
            tableRow([["데이터베이스", Math.floor(CONTENT_W / 3)], ["Supabase PostgreSQL, 15개 마이그레이션, RLS 정책", Math.floor(CONTENT_W / 3)], ["✅ 구축 완료", CONTENT_W - Math.floor(CONTENT_W / 3) * 2, { color: C.teal }]]),
            tableRow([["AI/ML", Math.floor(CONTENT_W / 3)], ["Claude API, XGBoost, NLP 파이프라인, 모델 레지스트리", Math.floor(CONTENT_W / 3)], ["⚡ 구조 완성, 학습 대기", CONTENT_W - Math.floor(CONTENT_W / 3) * 2, { color: C.orange }]], true),
            tableRow([["데이터 파이프라인", Math.floor(CONTENT_W / 3)], ["MOLIT API, ONBID API, Vercel Cron, DB UPSERT", Math.floor(CONTENT_W / 3)], ["⚡ API 키 연결 필요", CONTENT_W - Math.floor(CONTENT_W / 3) * 2, { color: C.orange }]]),
            tableRow([["캐싱", Math.floor(CONTENT_W / 3)], ["Upstash Redis (NBI 5분, 분석 10분, 시장통계 30분)", Math.floor(CONTENT_W / 3)], ["⚡ Redis 연결 필요", CONTENT_W - Math.floor(CONTENT_W / 3) * 2, { color: C.orange }]], true),
            tableRow([["결제", Math.floor(CONTENT_W / 3)], ["PortOne V2, 크레딧, 구독, Webhook, HMAC 검증", Math.floor(CONTENT_W / 3)], ["⚡ PG 키 연결 필요", CONTENT_W - Math.floor(CONTENT_W / 3) * 2, { color: C.orange }]]),
            tableRow([["인프라", Math.floor(CONTENT_W / 3)], ["Vercel (Edge), Sentry, 보안 헤더, Rate Limiting", Math.floor(CONTENT_W / 3)], ["✅ 운영 중", CONTENT_W - Math.floor(CONTENT_W / 3) * 2, { color: C.teal }]], true),
          ],
        }),

        blank(120),
        subTitle("3-2. 주요 구현 기능 목록"),

        p("① 분석 엔진 & AI", { bold: true, color: C.navy, sp: sp(80, 40) }),
        ...["NPL 자동 분석 엔진 — 입력 데이터에 맞는 모든 모델 자동 실행 (감정가·LTV·리스크·수익률·시장비교)",
           "NPL 코파일럿 (Claude AI) — 7개 인텐트 탐지, 시장 컨텍스트 주입, 자동 분석 연계",
           "XGBoost 가격 예측 모델 v2 — 15개 피처, ONNX 변환 준비, A/B 트래픽 라우팅",
           "포트폴리오 분석 엔진 — 최대 50개 물건, 상관관계 매트릭스, 5개 스트레스 시나리오",
           "NBI 낙찰가율 지수 — 15포인트 시계열, 지역·유형별 비교, 기준: 2024-01=100"].map(t => new Paragraph(bullet(t))),

        blank(60),
        p("② 데이터 인프라", { bold: true, color: C.navy, sp: sp(80, 40) }),
        ...["실거래가 파이프라인 — 한국부동산원 MOLIT API (아파트·오피스텔·상가·토지, 20개 지역)",
           "경매 데이터 파이프라인 — 온비드 ONBID API + DB UPSERT (100건 배치)",
           "Vercel Cron — 매일 02:00 KST 자동 수집, 주간·월간 집계",
           "ML 학습 자동화 — 낙찰 완결 시 Trigger → ml_training_samples 자동 적재",
           "Redis 캐싱 레이어 — Upstash + 인메모리 폴백, cache-aside 패턴"].map(t => new Paragraph(bullet(t))),

        blank(60),
        p("③ 마켓플레이스 & 거래", { bold: true, color: C.navy, sp: sp(80, 40) }),
        ...["NPL 매물 거래소 — 이중 상장 시스템, 대량 업로드, 고급 검색·필터",
           "딜룸 협업 공간 — 다자간 협상, 메시징, 실사 문서 관리",
           "계약 생성 — PDF·DOCX 자동 생성, 전자서명 준비",
           "PortOne V2 결제 — 크레딧 구매·구독·환불, HMAC 서명 Webhook"].map(t => new Paragraph(bullet(t))),

        blank(60),
        p("④ 보안 & 컴플라이언스", { bold: true, color: C.navy, sp: sp(80, 40) }),
        ...["AES-256-GCM 암호화 — API 키·시크릿 DB 저장",
           "MFA (다중 인증) — 설정·검증 완전 구현",
           "E2E 암호화 — 민감 문서 보호",
           "감사 로그 — 모든 데이터 접근·변경 자동 기록",
           "Zero-Trust 검증, RBAC, RLS, CSRF 보호, Rate Limiting"].map(t => new Paragraph(bullet(t))),

        blank(60),
        p("⑤ 관리자 시스템", { bold: true, color: C.navy, sp: sp(80, 40) }),
        ...["API 연동 관리 — 관리자 UI에서 MOLIT·ONBID·PortOne·Redis 키 설정 및 연결 테스트",
           "시장 참조 데이터 — 임대료·경매 데이터 직접 입력",
           "ML 모델 레지스트리 — 5개 모델 버전 관리, 자동 롤백",
           "파이프라인 모니터링 — 실행 이력·수집 통계·에러 현황"].map(t => new Paragraph(bullet(t))),

        // ══════════════════════
        // 4. 기술 수준 평가
        // ══════════════════════
        ...sectionTitle("4", "기술 수준 평가 — 글로벌 유니콘 대비"),

        subTitle("4-1. 12개 도메인 점수 (현재 vs 목표)"),
        p("■ 기준: CoStar($40B), Blend($4B), Roofstock($2B), 직방(₩2.2조) 평균 기술 수준 = 83점", { size: 18, color: C.gray, sp: sp(0, 80) }),

        blank(40),
        scoreBar("데이터 인프라",      35, 85, "파이프 완성, 실데이터 미유입"),
        scoreBar("AI/ML 성숙도",       40, 80, "아키텍처 우수, 모델은 규칙기반 스텁"),
        scoreBar("마켓플레이스/거래",   55, 85, "UI 완성, 실거래 완결 플로우 검증 필요"),
        scoreBar("보안/컴플라이언스",   60, 90, "기술 구현 양호, 금융 라이선스 없음"),
        scoreBar("실시간 기능",         55, 85, "Supabase Realtime 구축, 분산 확장성 미비"),
        scoreBar("테스트/품질",         50, 80, "30+ 스위트, CI/CD 커버리지 미확인"),
        scoreBar("성능/확장성",         45, 85, "Vercel 기반, Redis·DB풀링 없음"),
        scoreBar("개발자 생태계",       35, 75, "Webhook 있으나 OpenAPI·SDK 없음"),
        scoreBar("제품 완성도/UX",      60, 85, "200+ 페이지, 모바일 앱·온보딩 미완"),
        scoreBar("비즈니스 모델",       45, 80, "크레딧·구독 설계 완료, 실결제 미검증"),
        scoreBar("데이터 네트워크효과", 20, 85, "NBI 계산기 있으나 독점 데이터 미축적"),
        scoreBar("운영/모니터링",       40, 85, "Sentry 통합, APM·SLA·런북 없음"),

        blank(80),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [Math.floor(CONTENT_W / 2), CONTENT_W - Math.floor(CONTENT_W / 2)],
          rows: [
            new TableRow({
              children: [
                cell([
                  p("종합 점수", { bold: true, size: 22, color: C.navy, align: AlignmentType.CENTER }),
                  p("45 / 100", { bold: true, size: 52, color: C.orange, align: AlignmentType.CENTER }),
                  p("현재 NPlatform", { size: 18, color: C.gray, align: AlignmentType.CENTER }),
                ], Math.floor(CONTENT_W / 2), { bg: "FFF7ED" }),
                cell([
                  p("유니콘 기준", { bold: true, size: 22, color: C.navy, align: AlignmentType.CENTER }),
                  p("83 / 100", { bold: true, size: 52, color: C.teal, align: AlignmentType.CENTER }),
                  p("CoStar·Blend 평균", { size: 18, color: C.gray, align: AlignmentType.CENTER }),
                ], CONTENT_W - Math.floor(CONTENT_W / 2), { bg: "ECFDF5" }),
              ],
            }),
          ],
        }),

        blank(80),
        subTitle("4-2. 핵심 진단"),
        p("\"설계는 Series B 수준, 실행은 MVP 이전 — 파이프는 완벽하게 완성됐으나 물이 흐르지 않는 상태\"", {
          italic: true, size: 22, color: C.navy, sp: sp(80, 80),
          align: AlignmentType.CENTER,
        }),
        blank(40),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [Math.floor(CONTENT_W / 2), CONTENT_W - Math.floor(CONTENT_W / 2)],
          rows: [
            tableHeaderRow([["현재 NPlatform 보유", Math.floor(CONTENT_W / 2)], ["유니콘이 추가로 갖는 것", CONTENT_W - Math.floor(CONTENT_W / 2)]]),
            tableRow([["✅ 아키텍처 설계 우수", Math.floor(CONTENT_W / 2)], ["+ 실 데이터 수년치 축적", CONTENT_W - Math.floor(CONTENT_W / 2)], ]),
            tableRow([["✅ 150+ API 엔드포인트", Math.floor(CONTENT_W / 2)], ["+ 모든 엔드포인트 실 트래픽 검증", CONTENT_W - Math.floor(CONTENT_W / 2)]], true),
            tableRow([["✅ XGBoost 어댑터 스켈레톤", Math.floor(CONTENT_W / 2)], ["+ 10만건 이상 학습된 실 모델", CONTENT_W - Math.floor(CONTENT_W / 2)]]),
            tableRow([["✅ NBI 지수 계산기", Math.floor(CONTENT_W / 2)], ["+ 3년 이상 역사적 실데이터", CONTENT_W - Math.floor(CONTENT_W / 2)]], true),
            tableRow([["✅ 결제 시스템 설계", Math.floor(CONTENT_W / 2)], ["+ 월 수억원 실결제 처리", CONTENT_W - Math.floor(CONTENT_W / 2)]]),
            tableRow([["✅ RBAC·MFA·E2E 암호화", Math.floor(CONTENT_W / 2)], ["+ SOC2·금융위 라이선스", CONTENT_W - Math.floor(CONTENT_W / 2)]], true),
          ],
        }),

        // ══════════════════════
        // 5. 성장 로드맵
        // ══════════════════════
        ...sectionTitle("5", "글로벌 유니콘 달성 로드맵"),

        subTitle("5-1. 6단계 성장 로드맵"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [1200, 1400, 2200, 2400, CONTENT_W - 7200],
          rows: [
            tableHeaderRow([["단계", 1200], ["기간", 1400], ["목표 점수", 2200], ["핵심 마일스톤", 2400], ["예상 밸류에이션", CONTENT_W - 7200]]),
            tableRow([["현재", 1200], ["2026 Q2", 1400], ["45점 (현재)", 2200], ["MVP 아키텍처 완성", 2400], ["Pre-seed $2~5M", CONTENT_W - 7200, { color: C.gray }]]),
            tableRow([["Phase 1~2", 1200], ["2026 Q2~Q3", 1400], ["→ 60점", 2200, { color: C.orange, bold: true }], ["실데이터 유입 + 실결제", 2400], ["Seed $10~20M", CONTENT_W - 7200, { color: C.orange }]], true),
            tableRow([["Phase 3~4", 1200], ["2026 Q3~Q4", 1400], ["→ 74점", 2200, { color: C.blue, bold: true }], ["성능 + API 생태계", 2400], ["Series A $50~100M", CONTENT_W - 7200, { color: C.blue }]]),
            tableRow([["Phase 5", 1200], ["2027 Q1~Q2", 1400], ["→ 79점", 2200, { color: C.navy, bold: true }], ["금융 라이선스 + 데이터 Moat", 2400], ["Series B $200~500M", CONTENT_W - 7200, { color: C.navy }]], true),
            tableRow([["Phase 6", 1200], ["2027 Q3~", 1400], ["→ 83점", 2200, { color: C.teal, bold: true }], ["모바일 + 글로벌 확장", 2400], ["유니콘 $1B+", CONTENT_W - 7200, { color: C.teal, bold: true }]]),
          ],
        }),

        blank(120),
        subTitle("5-2. Phase 1 — 즉시 시작 (2주 이내)"),
        p("목표: 점수 45 → 52 | 실데이터 첫 유입", { color: C.orange, bold: true, sp: sp(0, 60) }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2000, 3200, 2400, CONTENT_W - 7600],
          rows: [
            tableHeaderRow([["항목", 2000], ["내용", 3200], ["담당 환경변수", 2400], ["상태", CONTENT_W - 7600]]),
            tableRow([["MOLIT API 연결", 2000], ["공공데이터포털 → 아파트매매 실거래 API 신청 (무료, 당일 발급)", 3200], ["MOLIT_API_KEY", 2400], ["⚠ 키 신청 필요", CONTENT_W - 7600, { color: C.orange }]]),
            tableRow([["ONBID API 연결", 2000], ["온비드 오픈API → 부동산 공매 데이터 신청 (무료)", 3200], ["ONBID_API_KEY", 2400], ["⚠ 키 신청 필요", CONTENT_W - 7600, { color: C.orange }]], true),
            tableRow([["PortOne PG 연결", 2000], ["PortOne 콘솔 가입 → 샌드박스 테스트 → 실결제 전환", 3200], ["PORTONE_*", 2400], ["⚠ 가입 필요", CONTENT_W - 7600, { color: C.orange }]]),
            tableRow([["Upstash Redis", 2000], ["Upstash 콘솔 → 무료 플랜 생성 → REST URL/Token 복사", 3200], ["UPSTASH_REDIS_*", 2400], ["⚠ 생성 필요", CONTENT_W - 7600, { color: C.orange }]], true),
            tableRow([["ENCRYPTION_KEY", 2000], ["openssl rand -hex 32 로 32바이트 키 생성", 3200], ["ENCRYPTION_KEY", 2400], ["⚠ 생성 필요", CONTENT_W - 7600, { color: C.orange }]]),
          ],
        }),

        blank(120),
        subTitle("5-3. Phase 2 — AI 모델 실학습 (2~4주)"),
        p("목표: 점수 52 → 60 | XGBoost 첫 학습 + 예측 정확도 검증", { color: C.blue, bold: true, sp: sp(0, 60) }),
        ...["scripts/train-price-model.py 실행 — Supabase에서 학습 데이터 로드 → XGBoost 학습 → ONNX 변환",
           "최소 100건 실데이터 → 합성 데이터 폴백, 1,000건 달성 시 모델 활성화 권고",
           "낙찰 결과 자동 피드백 루프 — court_auctions 트리거 → ml_training_samples 자동 적재",
           "MAPE < 15% 달성 시 price_v2 모델 status를 shadow → active로 전환"].map(t => new Paragraph(bullet(t))),

        blank(120),
        subTitle("5-4. Phase 3~4 — 성능/개발자 생태계 (3~6주)"),
        p("목표: 점수 60 → 74 | 프로덕션 품질 확보", { color: C.navy, bold: true, sp: sp(0, 60) }),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2400, CONTENT_W - 2400],
          rows: [
            tableHeaderRow([["개선 영역", 2400], ["구체 액션", CONTENT_W - 2400]]),
            tableRow([["Redis 캐싱", 2400], ["NBI 5분, 분석 10분, 시장통계 30분 → API 응답속도 80% 향상", CONTENT_W - 2400]]),
            tableRow([["DB 커넥션 풀링", 2400], ["Supabase PgBouncer Transaction mode → 연결 수 90% 감소", CONTENT_W - 2400]], true),
            tableRow([["OpenAPI 문서", 2400], ["/api/v1/docs — Swagger UI, JSON/YAML 자동생성, 외부 개발자 접근 허용", CONTENT_W - 2400]]),
            tableRow([["Webhook 실 발송", 2400], ["HMAC-SHA256 서명 + 최대 3회 재시도 + 감사 로그", CONTENT_W - 2400]], true),
            tableRow([["CI/CD 강화", 2400], ["GitHub Actions → tsc + vitest + playwright 필수 통과 후 배포", CONTENT_W - 2400]]),
          ],
        }),

        blank(120),
        subTitle("5-5. Phase 5~6 — 컴플라이언스 & 글로벌 (6~16주)"),
        ...["금융위원회 투자자문업 라이선스 검토 — KYC/AML 연동 (SCI평가정보, 아이나비)",
           "SOC 2 Type I 준비 — 감사 로그 90일 보존, 침투 테스트, 접근 제어 문서화",
           "독점 데이터 플라이휠 — 플랫폼 거래 완결 데이터 → NBI 지수 정확도 향상 → 사용자 유입 증가",
           "PWA → 네이티브 앱 — Google Play(TWA), iOS(Capacitor) 앱스토어 등록",
           "다국어 지원 — 영어·중국어 추가 → 해외 기관투자자 LP 유치"].map(t => new Paragraph(bullet(t))),

        // ══════════════════════
        // 6. 비즈니스 모델
        // ══════════════════════
        ...sectionTitle("6", "비즈니스 모델 및 수익 구조"),

        subTitle("6-1. 수익 모델"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [2000, 2400, 2400, CONTENT_W - 6800],
          rows: [
            tableHeaderRow([["수익원", 2000], ["모델", 2400], ["단가", 2400], ["목표 규모", CONTENT_W - 6800]]),
            tableRow([["구독료", 2000], ["Pro(₩49K/월), Enterprise(₩199K/월)", 2400], ["₩49K~₩199K", 2400], ["MAU 1만명 → ₩5억/월", CONTENT_W - 6800]]),
            tableRow([["거래 수수료", 2000], ["거래 완결 시 1~2% 수수료", 2400], ["거래액의 1~2%", 2400], ["월 100건 → ₩10억/월", CONTENT_W - 6800]], true),
            tableRow([["크레딧 판매", 2000], ["분석 1회당 1~5크레딧", 2400], ["₩990~₩4,900/회", 2400], ["소규모 투자자 단건", CONTENT_W - 6800]]),
            tableRow([["API/B2B", 2000], ["은행·AMC 대상 API 라이선스", 2400], ["₩500K~₩5M/월", 2400], ["기관 10개사 → ₩30억/년", CONTENT_W - 6800]], true),
            tableRow([["전문가 중개", 2000], ["변호사·감정사 매칭 10~15% 수수료", 2400], ["건당 10~15%", 2400], ["전문가 1,000명 등록", CONTENT_W - 6800]]),
            tableRow([["화이트레이블", 2000], ["저축은행·캐피탈사 맞춤 플랫폼", 2400], ["₩5M~₩20M/월", 2400], ["SaaS 고마진 모델", CONTENT_W - 6800]], true),
          ],
        }),

        blank(120),
        subTitle("6-2. 목표 사용자 세그먼트"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [1800, 2000, 2200, CONTENT_W - 6000],
          rows: [
            tableHeaderRow([["세그먼트", 1800], ["특징", 2000], ["핵심 기능", 2200], ["과금 모델", CONTENT_W - 6000]]),
            tableRow([["기관투자자 (B2B)", 1800], ["은행·AMC·저축은행", 2000], ["대량업로드·포트폴리오·API", 2200], ["Enterprise 구독 + API 라이선스", CONTENT_W - 6000]]),
            tableRow([["전문 개인투자자", 1800], ["경매 전문가, NPL 딜러", 2000], ["AI 분석·코파일럿·NBI", 2200], ["Pro 구독 + 크레딧", CONTENT_W - 6000]], true),
            tableRow([["일반 투자자", 1800], ["부동산 투자 관심자", 2000], ["매물 탐색·기본 분석", 2200], ["Free + 크레딧 단건", CONTENT_W - 6000]]),
            tableRow([["전문가 (공급자)", 1800], ["변호사·감정사·공인중개사", 2000], ["서비스 등록·고객 매칭", 2200], ["플랫폼 수수료 15%", CONTENT_W - 6000]], true),
            tableRow([["파트너사", 1800], ["부동산 정보사, 로펌", 2000], ["데이터 제공·레퍼럴", 2200], ["레퍼럴 수익 분배", CONTENT_W - 6000]]),
          ],
        }),

        // ══════════════════════
        // 7. 즉시 실행 계획
        // ══════════════════════
        ...sectionTitle("7", "즉시 실행 액션 플랜 (Quick Win)"),

        subTitle("7-1. 이번 주 실행 항목"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [400, 2200, 2800, 1600, CONTENT_W - 7000],
          rows: [
            tableHeaderRow([["#", 400], ["액션", 2200], ["방법", 2800], ["소요 시간", 1600], ["효과", CONTENT_W - 7000]]),
            tableRow([["1", 400], ["MOLIT API 키 발급", 2200], ["data.go.kr → 국토교통부 → 신청 (무료, 당일)", 2800], ["30분", 1600], ["실거래 데이터 수집 시작", CONTENT_W - 7000]]),
            tableRow([["2", 400], ["ONBID API 키 발급", 2200], ["onbid.co.kr → 오픈API 신청 (무료)", 2800], ["30분", 1600], ["경매 데이터 수집 시작", CONTENT_W - 7000]], true),
            tableRow([["3", 400], ["Upstash Redis 생성", 2200], ["upstash.com → 무료 플랜 → REST URL/Token 복사", 2800], ["10분", 1600], ["API 응답속도 80% 향상", CONTENT_W - 7000]]),
            tableRow([["4", 400], ["ENCRYPTION_KEY 생성", 2200], ["openssl rand -hex 32 → .env.local 추가", 2800], ["5분", 1600], ["관리자 API 키 암호화 저장", CONTENT_W - 7000]], true),
            tableRow([["5", 400], ["PortOne 샌드박스 가입", 2200], ["portone.io → 회원가입 → 스토어 ID 발급", 2800], ["1시간", 1600], ["결제 E2E 테스트 가능", CONTENT_W - 7000]]),
            tableRow([["6", 400], ["관리자 → API 연동 설정", 2200], ["/admin/api-integrations → 키 입력 → 연결 테스트", 2800], ["30분", 1600], ["실데이터 파이프라인 가동", CONTENT_W - 7000]], true),
          ],
        }),

        blank(120),
        subTitle("7-2. 이번 달 마일스톤"),
        ...["✅ 완료: DB 스키마 (014~015 마이그레이션), Redis 캐시 레이어, PortOne 결제 레이어, XGBoost 학습 스크립트, OpenAPI 문서, Webhook 디스패처, 관리자 API 연동 UI",
           "⚡ 진행 중: 관리자 페이지에서 API 키 설정 → 실데이터 첫 수집",
           "📋 다음 단계: 결제 샌드박스 테스트 → 첫 크레딧 구매 E2E 검증",
           "📋 다음 단계: XGBoost 학습 데이터 100건 확보 → 첫 모델 학습"].map(t => new Paragraph(bullet(t))),

        blank(120),
        subTitle("7-3. 환경변수 설정 체크리스트"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [3000, 1800, CONTENT_W - 4800],
          rows: [
            tableHeaderRow([["환경변수", 3000], ["카테고리", 1800], ["발급처 및 비고", CONTENT_W - 4800]]),
            tableRow([["MOLIT_API_KEY", 3000], ["데이터 (필수)", 1800, { color: C.red }], ["data.go.kr 무료 신청", CONTENT_W - 4800]]),
            tableRow([["ONBID_API_KEY", 3000], ["데이터 (필수)", 1800, { color: C.red }], ["onbid.co.kr 무료 신청", CONTENT_W - 4800]], true),
            tableRow([["CRON_SECRET", 3000], ["보안", 1800], ["openssl rand -base64 32", CONTENT_W - 4800]]),
            tableRow([["UPSTASH_REDIS_REST_URL", 3000], ["캐시", 1800], ["upstash.com 무료 플랜", CONTENT_W - 4800]], true),
            tableRow([["UPSTASH_REDIS_REST_TOKEN", 3000], ["캐시", 1800], ["Upstash 콘솔 → REST Token", CONTENT_W - 4800]]),
            tableRow([["PORTONE_STORE_ID", 3000], ["결제 (필수)", 1800, { color: C.red }], ["portone.io 콘솔 → 스토어 ID", CONTENT_W - 4800]], true),
            tableRow([["PORTONE_CHANNEL_KEY", 3000], ["결제 (필수)", 1800, { color: C.red }], ["포트원 → 결제 연동 → 채널키", CONTENT_W - 4800]]),
            tableRow([["PORTONE_API_SECRET", 3000], ["결제 (필수)", 1800, { color: C.red }], ["포트원 → 개발자 → V2 API Secret", CONTENT_W - 4800]], true),
            tableRow([["PORTONE_WEBHOOK_SECRET", 3000], ["결제", 1800], ["포트원 → 개발자 → Webhook Secret", CONTENT_W - 4800]]),
            tableRow([["ANTHROPIC_API_KEY", 3000], ["AI (필수)", 1800, { color: C.red }], ["anthropic.com API 키", CONTENT_W - 4800]], true),
            tableRow([["ENCRYPTION_KEY", 3000], ["보안 (필수)", 1800, { color: C.red }], ["openssl rand -hex 32", CONTENT_W - 4800]]),
            tableRow([["SUPABASE_SERVICE_ROLE_KEY", 3000], ["DB (필수)", 1800, { color: C.red }], ["Supabase 콘솔 → Project Settings → API", CONTENT_W - 4800]], true),
          ],
        }),

        // ══════════════════════
        // 8. 투자 유치 전략
        // ══════════════════════
        ...sectionTitle("8", "투자 유치 전략"),

        subTitle("8-1. 투자 라운드별 전략"),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [1400, 1800, 2000, CONTENT_W - 5200],
          rows: [
            tableHeaderRow([["라운드", 1400], ["목표 금액", 1800], ["시기", 2000], ["사용 계획", CONTENT_W - 5200]]),
            tableRow([["Seed", 1400], ["$5~10M", 1800, { color: C.teal, bold: true }], ["2026 Q3 (3개월 내)", 2000], ["실데이터 파이프라인 가동, 팀 빌딩 (개발 3명, 영업 2명)", CONTENT_W - 5200]]),
            tableRow([["Series A", 1400], ["$30~50M", 1800, { color: C.blue, bold: true }], ["2027 Q1", 2000], ["금융 라이선스 취득, 기관 영업팀 구축, API 사업 본격화", CONTENT_W - 5200]], true),
            tableRow([["Series B", 1400], ["$100~200M", 1800, { color: C.navy, bold: true }], ["2027 Q4", 2000], ["글로벌 진출 (일본·동남아), 데이터 독점 강화", CONTENT_W - 5200]]),
          ],
        }),

        blank(120),
        subTitle("8-2. 투자 포인트"),
        ...["대형 시장: 국내 NPL 42조원 시장, 디지털 전환율 8% → 35% 기회",
           "기술 장벽: AI 기반 낙찰가율 예측 + 독점 NBI 지수 = 경쟁사 복제 어려움",
           "네트워크 효과: 데이터 축적 → 모델 정확도 향상 → 사용자 유입 → 데이터 증가",
           "B2B 수익성: 기관 구독·API 라이선스 = 높은 LTV, 낮은 CAC",
           "팀: 국내 최초 NPL 전문 플랫폼, 풀스택 AI+핀테크 기술력"].map(t => new Paragraph(bullet(t))),

        // ══════════════════════
        // 9. 결론
        // ══════════════════════
        ...sectionTitle("9", "결론 및 다음 단계"),

        p("NPlatform은 대한민국 NPL 투자 시장의 디지털 전환을 주도할 기술 기반을 완성했습니다.", { sp: sp(0, 80), size: 22 }),
        p("Series B·C급 기술 아키텍처가 구축된 상태에서, 지금 필요한 것은 실데이터 유입과 첫 번째 수익 검증입니다.", { sp: sp(0, 80), size: 22 }),

        blank(80),
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: [Math.floor(CONTENT_W / 3), Math.floor(CONTENT_W / 3), CONTENT_W - Math.floor(CONTENT_W / 3) * 2],
          rows: [
            new TableRow({
              children: [
                cell([
                  p("STEP 1", { bold: true, size: 20, color: C.white, align: AlignmentType.CENTER }),
                  p("이번 주", { size: 18, color: C.white, align: AlignmentType.CENTER }),
                  p("API 키 3개 신청", { bold: true, size: 22, color: C.white, align: AlignmentType.CENTER }),
                  p("MOLIT·ONBID·Upstash", { size: 17, color: C.white, align: AlignmentType.CENTER }),
                ], Math.floor(CONTENT_W / 3), { bg: C.orange }),
                cell([
                  p("STEP 2", { bold: true, size: 20, color: C.white, align: AlignmentType.CENTER }),
                  p("2주 내", { size: 18, color: C.white, align: AlignmentType.CENTER }),
                  p("첫 데이터 수집", { bold: true, size: 22, color: C.white, align: AlignmentType.CENTER }),
                  p("관리자 → 파이프라인 실행", { size: 17, color: C.white, align: AlignmentType.CENTER }),
                ], Math.floor(CONTENT_W / 3), { bg: C.blue }),
                cell([
                  p("STEP 3", { bold: true, size: 20, color: C.white, align: AlignmentType.CENTER }),
                  p("1달 내", { size: 18, color: C.white, align: AlignmentType.CENTER }),
                  p("첫 결제 완결", { bold: true, size: 22, color: C.white, align: AlignmentType.CENTER }),
                  p("PortOne 샌드박스 → 실결제", { size: 17, color: C.white, align: AlignmentType.CENTER }),
                ], CONTENT_W - Math.floor(CONTENT_W / 3) * 2, { bg: C.teal }),
              ],
            }),
          ],
        }),

        blank(160),
        p("이 세 단계만 완료되면 NPlatform은 현재 점수 45점에서 60점으로 도약하며", { sp: sp(0, 40), align: AlignmentType.CENTER, size: 20, color: C.gray }),
        p("Seed 투자 유치에 필요한 최소 검증(PMF)을 달성하게 됩니다.", { sp: sp(0, 120), align: AlignmentType.CENTER, size: 20, color: C.gray }),
        p("NPlatform — 대한민국 NPL 투자의 Bloomberg를 만듭니다.", {
          bold: true, size: 28, color: C.navy,
          align: AlignmentType.CENTER,
          sp: sp(120, 0),
        }),

        blank(240),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  const out = path.join(__dirname, "..", "NPlatform_종합기획서_2026.docx");
  fs.writeFileSync(out, buffer);
  console.log("✅ 생성 완료:", out);
}).catch((e) => {
  console.error("❌ 오류:", e);
  process.exit(1);
});
