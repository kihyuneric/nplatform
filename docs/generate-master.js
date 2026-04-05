const fs = require("fs");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, LevelFormat, TableOfContents } = require("docx");

// ── Design tokens ──
const C = { navy: "1B3A5C", blue: "2E75B6", accent: "10B981", bg: "F0F5FA", white: "FFFFFF", black: "1A1A1A", gray: "6B7280", lightGray: "E5E7EB", red: "EF4444", purple: "7C3AED" };
const bdr = (c = C.lightGray) => ({ style: BorderStyle.SINGLE, size: 1, color: c });
const borders = { top: bdr(), bottom: bdr(), left: bdr(), right: bdr() };
const cellM = { top: 80, bottom: 80, left: 120, right: 120 };
const W = 9360; // content width

const heading = (text, level = HeadingLevel.HEADING_1) =>
  new Paragraph({ heading: level, children: [new TextRun(text)] });

const p = (text, opts = {}) =>
  new Paragraph({ spacing: { after: 120 }, ...opts, children: Array.isArray(text) ? text : [new TextRun(text)] });

const bold = (text) => new TextRun({ text, bold: true });
const run = (text, opts = {}) => new TextRun({ text, ...opts });

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

const makeTable = (headers, rows, colWidths) => {
  const total = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map(r => new TableRow({
        children: r.map((c, i) => cell(typeof c === "object" ? c.text : c, colWidths[i], typeof c === "object" ? c : {}))
      }))
    ]
  });
};

// ── Numbering config ──
const numbering = {
  config: [
    { reference: "bullets", levels: [
      { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
    ]},
    { reference: "numbers", levels: [
      { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
    ]},
  ]
};

const bullet = (text, level = 0) => new Paragraph({ numbering: { reference: "bullets", level }, children: [new TextRun({ text, font: "Arial", size: 22 })] });
const numItem = (text, level = 0) => new Paragraph({ numbering: { reference: "numbers", level }, children: [new TextRun({ text, font: "Arial", size: 22 })] });

// ══════════════════════════════════════════════════════════════
// DOCUMENT BUILD
// ══════════════════════════════════════════════════════════════
const children = [];

// ── COVER PAGE ──
children.push(new Paragraph({ spacing: { before: 3000 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
  new TextRun({ text: "NPLATFORM", font: "Arial", size: 72, bold: true, color: C.navy })
]}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [
  new TextRun({ text: "\uC5D4\uD50C\uB7AB\uD3FC", font: "Arial", size: 48, color: C.blue })
]}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 }, children: [
  new TextRun({ text: "\uBD80\uC2E4\uCC44\uAD8C(NPL) \uD1B5\uD569 \uD50C\uB7AB\uD3FC \uC138\uBD80 \uAC1C\uBC1C \uAE30\uD68D\uC11C", font: "Arial", size: 32, color: C.gray })
]}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 1 } }, children: [] }));
children.push(new Paragraph({ spacing: { before: 400 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
  new TextRun({ text: "Version 2.0 | Master Architecture Document", font: "Arial", size: 24, color: C.gray })
]}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [
  new TextRun({ text: "2026.03.13", font: "Arial", size: 24, color: C.gray })
]}));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 2000 }, children: [
  new TextRun({ text: "\uAE08\uC735\uAE30\uAD00\uC774 \uBA3C\uC800 \uCC3E\uB294 NPL \uB9C8\uCF13\uD50C\uB808\uC774\uC2A4 | \uD22C\uC790\uC790\uAC00 \uC2E0\uB8B0\uD558\uB294 AI \uBD84\uC11D \uD50C\uB7AB\uD3FC", font: "Arial", size: 22, italics: true, color: C.accent })
]}));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ── TOC ──
children.push(heading("\uBAA9\uCC28 (Table of Contents)"));
children.push(new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// SECTION 1: Executive Summary
// ══════════════════════════════════════════════════════════════
children.push(heading("1. Executive Summary"));

children.push(heading("1.1 \uD50C\uB7AB\uD3FC \uBE44\uC804", HeadingLevel.HEADING_2));
children.push(p([
  bold("NPLATFORM\uC740 "), run("\uB300\uD55C\uBBFC\uAD6D \uCD5C\uCD08\uC758 \uBD80\uC2E4\uCC44\uAD8C(NPL) \uD1B5\uD569 \uB9C8\uCF13\uD50C\uB808\uC774\uC2A4\uC785\uB2C8\uB2E4. "),
  run("\uAE08\uC735\uAE30\uAD00\uC774 \uBD80\uC2E4\uCC44\uAD8C\uC744 \uAC00\uC7A5 \uD6A8\uC728\uC801\uC73C\uB85C \uB9C8\uCF00\uD305\uD558\uACE0, \uD22C\uC790\uC790\uAC00 \uCD5C\uC801\uC758 \uD22C\uC790 \uAE30\uD68C\uB97C AI \uBD84\uC11D\uACFC \uD568\uAED8 \uBC1C\uACAC\uD558\uB294 \uC6D0\uC2A4\uD1B1 \uD50C\uB7AB\uD3FC\uC785\uB2C8\uB2E4.")
]));

children.push(heading("1.2 \uD575\uC2EC \uAC00\uCE58 \uC81C\uC548 (Core Value Proposition)", HeadingLevel.HEADING_2));

children.push(heading("1.2.1 \uAE08\uC735\uAE30\uAD00 \uAD00\uC810 (\uB9E4\uAC01\uC0AC)", HeadingLevel.HEADING_3));
children.push(bullet("\uAE09\uB9E4 \uBD80\uB3D9\uC0B0 \uB9C8\uCF13: \uCC44\uBB34\uC790 \uBD80\uB3D9\uC0B0\uC744 \uAE09\uB9E4\uB85C \uC2E0\uC18D\uD558\uAC8C \uD310\uB9E4\uD560 \uC218 \uC788\uB294 \uC804\uC6A9 \uB9C8\uCF13\uD50C\uB808\uC774\uC2A4 \uC81C\uACF5"));
children.push(bullet("\uACBD\uB9E4/\uACF5\uB9E4 \uC9C4\uD589\uC911 \uCC44\uAD8C \uB9C8\uCF00\uD305: \uCC44\uAD8C \uB2F4\uB2F9\uC790\uAC00 \uC9C1\uC811 \uC815\uBCF4 \uC791\uC131 \uBC0F \uB9C8\uCF00\uD305 \uAC00\uB2A5"));
children.push(bullet("\uBE44\uACBD\uB9E4 \uBD80\uC2E4\uCC44\uAD8C \uB9C8\uCF00\uD305: \uACBD\uB9E4/\uACF5\uB9E4 \uC808\uCC28 \uC5C6\uC774 \uC9C1\uC811 \uB9E4\uAC01 \uAC00\uB2A5\uD55C \uCC44\uAD8C \uD64D\uBCF4"));
children.push(bullet("\uC804\uC6A9 \uB300\uC2DC\uBCF4\uB4DC: \uC790\uC0AC \uCC44\uAD8C \uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uD1B5\uD569 \uAD00\uB9AC \uBC0F \uC2E4\uC2DC\uAC04 \uC131\uACFC \uBD84\uC11D"));
children.push(bullet("\uD22C\uC790\uC790 \uD480 \uC811\uADFC: \uAC80\uC99D\uB41C \uAE30\uAD00/\uAC1C\uC778 \uD22C\uC790\uC790 \uB124\uD2B8\uC6CC\uD06C\uC5D0 \uC989\uC2DC \uB178\uCD9C"));

children.push(heading("1.2.2 \uD22C\uC790\uC790 \uAD00\uC810 (\uB9E4\uC785\uC0AC)", HeadingLevel.HEADING_3));
children.push(bullet("\uBD80\uC2E4\uCC44\uAD8C \uC6D0\uC2A4\uD1B1: \uACBD\uB9E4/\uACF5\uB9E4 + \uBE44\uACBD\uB9E4 NPL \uC804\uCCB4\uB97C \uD55C \uACF3\uC5D0\uC11C \uD0D0\uC0C9"));
children.push(bullet("AI \uAC00\uACA9 \uC608\uCE21: \uC0AC\uB840\uAE30\uBC18 \uBD80\uB3D9\uC0B0 AI \uAC00\uACA9 \uCD94\uC815 (95% \uC2E0\uB8B0\uAD6C\uAC04)"));
children.push(bullet("AI \uB4F1\uAE30\uBD80\uB4F1\uBCF8 \uAD8C\uB9AC\uBD84\uC11D: \uB4F1\uAE30\uBD80\uB4F1\uBCF8 \uC5C5\uB85C\uB4DC\uB9CC\uC73C\uB85C \uC790\uB3D9 \uAD8C\uB9AC\uBD84\uC11D \uBCF4\uACE0\uC11C \uC0DD\uC131"));
children.push(bullet("\uACBD\uB9E4 \uB099\uCC30\uAC00\uC728 AI \uCD94\uC815: \uD1B5\uACC4\uAE30\uBC18 \uB099\uCC30\uAC00\uC728 \uC608\uCE21 \uBC0F \uC218\uC775\uB960 \uBD84\uC11D"));
children.push(bullet("\uC218\uC775\uB960 \uC2DC\uBBAC\uB808\uC774\uD130: \uACBD\uB9E4 \uC218\uC775\uB960 + \uCC44\uAD8C \uB9E4\uC785 \uC218\uC775\uB960 \uC774\uC911 \uBD84\uC11D \uB3C4\uAD6C"));
children.push(bullet("\uC790\uB3D9 \uB4F1\uAE30\uBD80\uB4F1\uBCF8 \uC5F4\uB78C: \uACBD\uB9E4 \uBB3C\uAC74 \uB4F1\uAE30\uBD80\uB4F1\uBCF8 \uC790\uB3D9 \uC5F4\uB78C \uBC0F \uC81C\uACF5"));

children.push(heading("1.3 \uD50C\uB7AB\uD3FC 3\uB300 \uC2DC\uC7A5 \uCE74\uD14C\uACE0\uB9AC", HeadingLevel.HEADING_2));

children.push(makeTable(
  ["\uCE74\uD14C\uACE0\uB9AC", "\uC124\uBA85", "\uB300\uC0C1 \uBB3C\uAC74", "\uD575\uC2EC \uAE30\uB2A5"],
  [
    ["\uAE09\uB9E4 \uBD80\uB3D9\uC0B0 \uB9C8\uCF13", "\uCC44\uBB34\uC790 \uC18C\uC720 \uBD80\uB3D9\uC0B0\uC744 \uC2DC\uC138 \uB300\uBE44 \uD560\uC778\uB41C \uAC00\uACA9\uC5D0 \uAE09\uB9E4", "\uCC44\uBB34\uC790 \uBD80\uB3D9\uC0B0", "AI\uAC00\uACA9\uC608\uCE21, \uAE09\uB9E4\uD560\uC778\uC728"],
    ["\uACBD\uB9E4/\uACF5\uB9E4 NPL \uB9C8\uCF00\uD305", "\uACBD\uB9E4/\uACF5\uB9E4 \uC9C4\uD589\uC911\uC778 \uBD80\uC2E4\uCC44\uAD8C \uC815\uBCF4 \uD1B5\uD569 \uC81C\uACF5", "\uACBD\uB9E4/\uACF5\uB9E4 \uBB3C\uAC74", "\uB099\uCC30\uAC00\uC728AI, \uB4F1\uAE30\uBD84\uC11D, \uC218\uC775\uC2DC\uBBAC\uB808\uC774\uD130"],
    ["\uBE44\uACBD\uB9E4 NPL \uC9C1\uAC70\uB798", "\uACBD\uB9E4 \uC808\uCC28 \uC5C6\uC774 \uAE08\uC735\uAE30\uAD00\uC774 \uC9C1\uC811 \uB9E4\uAC01\uD558\uB294 \uCC44\uAD8C", "\uBE44\uACBD\uB9E4 \uCC44\uAD8C", "NDA\uB51C\uB8F8, \uCC44\uAD8C\uBD84\uC11D, \uC218\uC775\uB960\uAC80\uD1A0"],
  ],
  [2000, 2800, 1800, 2760]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("1.4 \uC0AC\uC6A9\uC790 \uC5ED\uD560 \uCCB4\uACC4", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["\uC5ED\uD560", "\uC124\uBA85", "\uC8FC\uC694 \uAE30\uB2A5 \uBC94\uC704"],
  [
    ["\uB9E4\uAC01\uC0AC (\uAE08\uC735\uAE30\uAD00)", "\uC740\uD589/\uCE90\uD53C\uD0C8/AMC/\uC2E0\uD0C1\uC0AC \uB4F1 \uBD80\uC2E4\uCC44\uAD8C \uBCF4\uC720 \uAE30\uAD00", "\uBB3C\uAC74\uB4F1\uB85D, \uB9C8\uCF00\uD305, \uB300\uC2DC\uBCF4\uB4DC, \uACC4\uC57D\uAD00\uB9AC"],
    ["\uAE30\uAD00\uD22C\uC790\uC790 (BUYER_INST)", "\uC790\uC0B0\uC6B4\uC6A9\uC0AC/PEF/\uBD80\uB3D9\uC0B0\uD380\uB4DC \uB4F1 \uC804\uBB38 \uD22C\uC790\uAE30\uAD00", "\uAC80\uC0C9, AI\uBD84\uC11D, \uC218\uC694\uC124\uBB38, \uB51C\uB8F8, \uACC4\uC57D\uC694\uCCAD"],
    ["\uAC1C\uC778\uD22C\uC790\uC790 (BUYER_INDV)", "\uBD80\uB3D9\uC0B0 \uACBD\uB9E4/NPL \uAC1C\uC778 \uD22C\uC790\uC790", "\uAC80\uC0C9, \uC218\uC775\uC2DC\uBBAC\uB808\uC774\uD130, \uAD8C\uB9AC\uBD84\uC11D, \uB4F1\uAE30\uBD80\uC5F4\uB78C"],
    ["\uD30C\uD2B8\uB108 (PARTNER)", "\uBC95\uBB34\uBC95\uC778/\uAC10\uC815\uD3C9\uAC00\uC0AC/\uC138\uBB34\uC0AC/\uC790\uBB38\uC0AC", "\uBB3C\uAC74\uC790\uBB38, \uC804\uBB38\uAC00\uC758\uACAC, \uD30C\uD2B8\uB108\uB9E4\uCE6D"],
    ["\uC6B4\uC601\uAD00\uB9AC\uC790 (ADMIN)", "\uD50C\uB7AB\uD3FC \uC6B4\uC601\uC790", "\uD68C\uC6D0\uAD00\uB9AC, \uBB3C\uAC74\uAC80\uC218, \uD1B5\uACC4, KYC\uC2B9\uC778"],
    ["\uCD5C\uACE0\uAD00\uB9AC\uC790 (SUPER_ADMIN)", "\uC2DC\uC2A4\uD15C \uCD5C\uACE0 \uAD8C\uD55C", "\uC804\uCCB4\uAD00\uB9AC, \uC124\uC815, \uACFC\uAE08, \uC2DC\uC2A4\uD15C\uC124\uC815"],
  ],
  [1800, 3000, 4560]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// SECTION 2: Platform Architecture
// ══════════════════════════════════════════════════════════════
children.push(heading("2. \uD50C\uB7AB\uD3FC \uC544\uD0A4\uD14D\uCC98"));

children.push(heading("2.1 \uAE30\uC220 \uC2A4\uD0DD", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["\uACC4\uCE35", "\uAE30\uC220", "\uC120\uC815 \uC0AC\uC720"],
  [
    ["Frontend", "Next.js 15 (App Router) + React 19 + TypeScript", "SSR/SSG, \uD30C\uC77C\uAE30\uBC18\uB77C\uC6B0\uD305, \uC11C\uBC84\uCEF4\uD3EC\uB10C\uD2B8"],
    ["UI Framework", "Tailwind CSS + Radix UI (shadcn/ui)", "\uCEE4\uC2A4\uD130\uB9C8\uC774\uC9D5 \uC6A9\uC774, \uC811\uADFC\uC131 \uB0B4\uC7A5"],
    ["Backend/DB", "Supabase (PostgreSQL + Auth + Storage + Realtime)", "\uC2E4\uC2DC\uAC04 \uAD6C\uB3C5, RLS \uBCF4\uC548, Edge Functions"],
    ["\uC9C0\uB3C4", "Kakao Maps API / Naver Maps API", "\uAD6D\uB0B4 \uBD80\uB3D9\uC0B0 \uC8FC\uC18C \uCD5C\uC801\uD654"],
    ["AI/ML", "Python FastAPI + OpenAI GPT-4 + \uC790\uCCB4 ML \uBAA8\uB378", "\uAC00\uACA9\uC608\uCE21, \uAD8C\uB9AC\uBD84\uC11D, \uB099\uCC30\uAC00\uC728\uC608\uCE21"],
    ["Charts", "Recharts + D3.js", "\uD1B5\uACC4 \uC2DC\uAC01\uD654, \uC9C0\uC5ED\uBCC4 \uD788\uD2B8\uB9F5"],
    ["Motion", "Framer Motion", "\uD398\uC774\uC9C0 \uC804\uD658, \uB9C8\uC774\uD06C\uB85C\uC778\uD130\uB799\uC158"],
    ["File/OCR", "Tesseract.js + PDF.js + \uC790\uCCB4 \uB4F1\uAE30\uBD84\uC11D AI", "\uB4F1\uAE30\uBD80\uB4F1\uBCF8 OCR \uBC0F \uAD8C\uB9AC\uBD84\uC11D"],
    ["Infra", "Vercel (Frontend) + Supabase Cloud + AWS Lambda (AI)", "\uC790\uB3D9 \uC2A4\uCF00\uC77C\uB9C1, \uAE00\uB85C\uBC8C CDN"],
  ],
  [1600, 4200, 3560]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("2.2 \uC2DC\uC2A4\uD15C \uBAA8\uB4C8 \uAD6C\uC131\uB3C4", HeadingLevel.HEADING_2));
children.push(p([bold("\uC804\uCCB4 7\uAC1C \uBAA8\uB4C8\uB85C \uAD6C\uC131\uB418\uBA70, \uAC01 \uBAA8\uB4C8\uBCC4 \uBCC4\uB3C4 \uC138\uBD80 \uAE30\uD68D\uC11C\uAC00 \uC874\uC7AC\uD569\uB2C8\uB2E4:")]));

children.push(makeTable(
  ["\uBAA8\uB4C8 \uBC88\uD638", "\uBAA8\uB4C8\uBA85", "\uD3EC\uD568 \uD398\uC774\uC9C0 / \uAE30\uB2A5", "\uBCC4\uB3C4 \uBB38\uC11C"],
  [
    ["Module 1", "\uD648/\uB79C\uB529 + \uB124\uBE44\uAC8C\uC774\uC158", "\uD648 \uD788\uC5B4\uB85C, GNB/\uBA54\uB274, \uD478\uD130, CTA", "NPL_Module1_Home.docx"],
    ["Module 2", "NPL \uAC80\uC0C9/\uBAA9\uB85D/\uC9C0\uB3C4", "\uBA40\uD2F0\uD544\uD130\uAC80\uC0C9, \uD14C\uC774\uBE14\uBAA9\uB85D, \uC9C0\uB3C4\uBDF0", "NPL_Module2_Search.docx"],
    ["Module 3", "NPL \uC0C1\uC138 + AI \uBD84\uC11D \uC194\uB8E8\uC158", "Deal Book \uC0C1\uC138, AI\uAC00\uACA9, \uAD8C\uB9AC\uBD84\uC11D, \uB099\uCC30\uAC00\uC728", "NPL_Module3_Detail_AI.docx"],
    ["Module 4", "\uAE08\uC735\uAE30\uAD00 \uB9C8\uCF00\uD305 + \uCC44\uAD8C\uAD00\uB9AC", "\uBB3C\uAC74\uB4F1\uB85D, \uCC44\uAD8C\uB2F4\uB2F9\uC790\uB9C8\uCF00\uD305, \uD3EC\uD2B8\uD3F4\uB9AC\uC624", "NPL_Module4_Institution.docx"],
    ["Module 5", "\uD22C\uC790\uC790 \uBD84\uC11D\uB3C4\uAD6C + \uC218\uC775\uB960", "\uC218\uC775\uC2DC\uBBAC\uB808\uC774\uD130, \uCC44\uAD8C\uC218\uC775\uBD84\uC11D, \uB4F1\uAE30\uBD80\uC5F4\uB78C", "NPL_Module5_InvestorTools.docx"],
    ["Module 6", "\uACC4\uC57D/\uB51C\uB8F8 + \uD68C\uC6D0\uCCB4\uACC4", "NDA, KYC, \uACC4\uC57D\uC694\uCCAD, \uB51C\uB8F8, Signup, \uBA64\uBC84\uC2ED", "NPL_Module6_Contract.docx"],
    ["Module 7", "\uB300\uC2DC\uBCF4\uB4DC/\uD1B5\uACC4/\uAD00\uB9AC\uC790", "\uACBD\uACF5\uB9E4\uD1B5\uACC4, \uAD00\uB9AC\uC790\uB300\uC2DC\uBCF4\uB4DC, KPI", "NPL_Module7_Dashboard.docx"],
  ],
  [1100, 2200, 3560, 2500]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// SECTION 3: Data Architecture
// ══════════════════════════════════════════════════════════════
children.push(heading("3. \uB370\uC774\uD130 \uC544\uD0A4\uD14D\uCC98 (Database Schema)"));

children.push(heading("3.1 \uD575\uC2EC \uD14C\uC774\uBE14 \uC124\uACC4", HeadingLevel.HEADING_2));

// users table
children.push(heading("3.1.1 users \uD14C\uC774\uBE14", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["\uCEEC\uB7FC", "\uD0C0\uC785", "\uC124\uBA85"],
  [
    ["id", "UUID PK", "Supabase auth.users FK"],
    ["email", "TEXT NOT NULL UNIQUE", "\uB85C\uADF8\uC778 \uC774\uBA54\uC77C"],
    ["role", "user_role ENUM", "SUPER_ADMIN/ADMIN/SELLER/BUYER_INST/BUYER_INDV/PARTNER/VIEWER"],
    ["name", "TEXT", "\uB2F4\uB2F9\uC790 \uC774\uB984"],
    ["company_name", "TEXT", "\uD68C\uC0AC/\uAE30\uAD00\uBA85"],
    ["company_type", "TEXT", "\uC740\uD589/\uCE90\uD53C\uD0C8/AMC/\uC2E0\uD0C1\uC0AC/\uAC10\uC815\uD3C9\uAC00\uC0AC/\uBC95\uBB34\uBC95\uC778"],
    ["phone", "TEXT", "\uC5F0\uB77D\uCC98"],
    ["business_license_url", "TEXT", "\uC0AC\uC5C5\uC790\uB4F1\uB85D\uC99D \uD30C\uC77C URL"],
    ["is_verified", "BOOLEAN DEFAULT false", "\uAD00\uB9AC\uC790 \uC2B9\uC778 \uC5EC\uBD80"],
    ["kyc_status", "kyc_status ENUM", "PENDING/SUBMITTED/APPROVED/REJECTED"],
    ["nda_signed", "BOOLEAN DEFAULT false", "\uAE30\uBCF8 NDA \uC11C\uBA85 \uC5EC\uBD80"],
    ["subscription_tier", "subscription_tier ENUM", "FREE/BASIC/PREMIUM/ENTERPRISE"],
    ["partner_score", "NUMERIC(3,2)", "\uD30C\uD2B8\uB108 \uD3C9\uC810 (0~9.99)"],
    ["avatar_url", "TEXT", "\uD504\uB85C\uD544 \uC774\uBBF8\uC9C0"],
    ["created_at / updated_at", "TIMESTAMPTZ", "\uC0DD\uC131/\uC218\uC815 \uC77C\uC2DC"],
  ],
  [2500, 3000, 3860]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

// npl_listings table
children.push(heading("3.1.2 npl_listings \uD14C\uC774\uBE14 (NPL \uBB3C\uAC74)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["\uCEEC\uB7FC", "\uD0C0\uC785", "\uC124\uBA85"],
  [
    ["id", "UUID PK", "\uBB3C\uAC74 \uACE0\uC720 ID"],
    ["seller_id", "UUID FK \u2192 users", "\uB9E4\uAC01\uC0AC(\uAE08\uC735\uAE30\uAD00) ID"],
    ["listing_type", "listing_type ENUM", "DISTRESSED_SALE / AUCTION_NPL / NON_AUCTION_NPL"],
    ["title", "TEXT NOT NULL", "\uBB3C\uAC74 \uC81C\uBAA9"],
    ["collateral_type", "collateral_type ENUM", "APARTMENT/COMMERCIAL/LAND/FACTORY/OFFICE/VILLA/OTHER"],
    ["address / address_masked", "TEXT", "\uC2E4\uC81C\uC8FC\uC18C / \uB9C8\uC2A4\uD0B9\uB41C \uC8FC\uC18C"],
    ["sido / sigungu / dong", "TEXT", "\uC2DC\uB3C4/\uC2DC\uAD70\uAD6C/\uB3D9 \uBD84\uB9AC \uC800\uC7A5"],
    ["claim_amount", "BIGINT", "\uCC44\uAD8C\uC561 (\uC6D0)"],
    ["appraised_value", "BIGINT", "\uAC10\uC815\uAC00"],
    ["minimum_bid", "BIGINT", "\uCD5C\uC800\uB9E4\uAC01\uAC00 / \uCD5C\uC800\uC785\uCC30\uAC00"],
    ["discount_rate", "NUMERIC(5,2)", "\uD560\uC778\uC728 (%)"],
    ["ai_estimated_price", "BIGINT", "AI \uCD94\uC815 \uC2DC\uC138"],
    ["ai_winning_rate", "NUMERIC(5,2)", "AI \uCD94\uC815 \uB099\uCC30\uAC00\uC728 (%)"],
    ["debtor_status", "debtor_status ENUM", "PERFORMING/DEFAULTED/BANKRUPT"],
    ["occupancy_status", "occupancy_status ENUM", "VACANT/OCCUPIED/UNKNOWN"],
    ["auction_case_number", "TEXT", "\uACBD\uB9E4 \uC0AC\uAC74\uBC88\uD638 (2024\uD0C0\uACBD12345)"],
    ["auction_court", "TEXT", "\uAD00\uD560 \uBC95\uC6D0"],
    ["auction_date", "DATE", "\uACBD\uB9E4\uAE30\uC77C"],
    ["auction_count", "INTEGER", "\uC720\uCC30 \uD69F\uC218"],
    ["loan_balance", "BIGINT", "\uB300\uCD9C \uC794\uC561"],
    ["loan_interest_rate", "NUMERIC(5,2)", "\uB300\uCD9C \uAE08\uB9AC"],
    ["ltv_ratio", "NUMERIC(5,2)", "LTV \uBE44\uC728"],
    ["exclusive_area", "NUMERIC(10,2)", "\uC804\uC6A9\uBA74\uC801 (\u33A1)"],
    ["land_area", "NUMERIC(10,2)", "\uD1A0\uC9C0\uBA74\uC801 (\u33A1)"],
    ["building_area", "NUMERIC(10,2)", "\uAC74\uBB3C\uBA74\uC801 (\u33A1)"],
    ["legal_issues", "JSONB", "\uBC95\uC801 \uC774\uC288 \uBC30\uC5F4"],
    ["documents_summary", "TEXT", "\uBB38\uC11C \uC694\uC57D"],
    ["marketing_description", "TEXT", "\uCC44\uAD8C\uB2F4\uB2F9\uC790 \uC791\uC131 \uB9C8\uCF00\uD305 \uC124\uBA85"],
    ["creditor_institution", "TEXT", "\uCC44\uAD8C\uAE30\uAD00\uBA85 (\uC6B0\uB9AC\uC740\uD589, KB\uAD6D\uBBFC\uC740\uD589 \uB4F1)"],
    ["disclosure_level", "disclosure_level ENUM", "TEASER/NDA/FULL"],
    ["status", "listing_status ENUM", "DRAFT/ACTIVE/IN_DEAL/SOLD/WITHDRAWN"],
    ["featured", "BOOLEAN DEFAULT false", "\uCD94\uCC9C \uBB3C\uAC74 \uC5EC\uBD80"],
    ["view_count / interest_count", "INTEGER DEFAULT 0", "\uC870\uD68C\uC218 / \uAD00\uC2EC\uC218"],
    ["thumbnail_url", "TEXT", "\uB300\uD45C \uC774\uBBF8\uC9C0"],
    ["latitude / longitude", "NUMERIC(10,7)", "\uC88C\uD45C (\uC9C0\uB3C4 \uD45C\uC2DC\uC6A9)"],
    ["expires_at", "TIMESTAMPTZ", "\uB9C8\uAC10\uC77C"],
  ],
  [2500, 2500, 4360]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

// Additional key tables summary
children.push(heading("3.1.3 \uAE30\uD0C0 \uD575\uC2EC \uD14C\uC774\uBE14 \uC694\uC57D", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["\uD14C\uC774\uBE14\uBA85", "\uC5ED\uD560", "\uC8FC\uC694 \uCEEC\uB7FC"],
  [
    ["demand_surveys", "\uD22C\uC790\uC790 \uC218\uC694\uC124\uBB38", "collateral_types[], regions[], amount_min/max, target_discount_rate, urgency"],
    ["matching_results", "\uC218\uC694-\uACF5\uAE09 \uB9E4\uCE6D \uACB0\uACFC", "survey_id, listing_id, match_score, match_factors JSONB"],
    ["deal_rooms", "NDA \uAE30\uBC18 \uAC70\uB798 \uACF5\uAC04", "listing_id, nda_required, watermark_enabled, communication_locked"],
    ["deal_room_participants", "\uB51C\uB8F8 \uCC38\uC5EC\uC790", "deal_room_id, user_id, role, nda_signed_at, access_level"],
    ["deal_room_messages", "\uB51C\uB8F8 \uBA54\uC2DC\uC9C0", "deal_room_id, user_id, content, created_at"],
    ["listing_interests", "\uBB3C\uAC74 \uAD00\uC2EC \uD45C\uC2DC", "listing_id, user_id (unique pair)"],
    ["contract_requests", "\uACC4\uC57D \uC694\uCCAD", "listing_id, buyer_id, offer_amount, status, documents[]"],
    ["ai_analysis_results", "AI \uBD84\uC11D \uACB0\uACFC \uCE90\uC2DC", "listing_id, analysis_type, result JSONB, confidence, model_version"],
    ["registry_documents", "\uB4F1\uAE30\uBD80\uB4F1\uBCF8 \uBD84\uC11D", "listing_id, file_url, ocr_result JSONB, rights_analysis JSONB"],
    ["auction_statistics", "\uACBD\uACF5\uB9E4 \uD1B5\uACC4 \uB370\uC774\uD130", "region, property_type, winning_rate_avg, period, sample_count"],
    ["notifications", "\uC54C\uB9BC", "user_id, type, title, body, link, is_read"],
  ],
  [2200, 2600, 4560]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// SECTION 4: Page/Route Architecture
// ══════════════════════════════════════════════════════════════
children.push(heading("4. \uD398\uC774\uC9C0/\uB77C\uC6B0\uD2B8 \uC544\uD0A4\uD14D\uCC98"));

children.push(heading("4.1 \uC804\uCCB4 \uB77C\uC6B0\uD2B8 \uB9F5", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["\uACBD\uB85C", "\uD398\uC774\uC9C0", "\uC778\uC99D", "\uBAA8\uB4C8"],
  [
    ["/", "\uD648 (\uD788\uC5B4\uB85C + CTA)", "\uACF5\uAC1C", "M1"],
    ["/listings", "NPL \uBAA9\uB85D (\uD14C\uC774\uBE14 + \uD544\uD130)", "\uACF5\uAC1C", "M2"],
    ["/listings/search", "NPL \uACE0\uAE09 \uAC80\uC0C9 (\uBA40\uD2F0\uD544\uD130)", "\uACF5\uAC1C", "M2"],
    ["/listings/map", "NPL \uC9C0\uB3C4 \uBDF0", "\uACF5\uAC1C", "M2"],
    ["/listings/[id]", "NPL \uC0C1\uC138 (Deal Book)", "\uACF5\uAC1C(\uD2F0\uC800)/\uC778\uC99D(\uC804\uCCB4)", "M3"],
    ["/listings/[id]/analysis", "AI \uBD84\uC11D \uACB0\uACFC (\uAC00\uACA9/\uAD8C\uB9AC/\uB099\uCC30)", "\uC778\uC99D", "M3"],
    ["/listings/new", "\uBB3C\uAC74 \uB4F1\uB85D (\uB9E4\uAC01\uC0AC)", "SELLER/ADMIN", "M4"],
    ["/listings/[id]/edit", "\uBB3C\uAC74 \uC218\uC815", "SELLER/ADMIN", "M4"],
    ["/institution/dashboard", "\uAE08\uC735\uAE30\uAD00 \uC804\uC6A9 \uB300\uC2DC\uBCF4\uB4DC", "SELLER", "M4"],
    ["/institution/portfolio", "\uCC44\uAD8C \uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uAD00\uB9AC", "SELLER", "M4"],
    ["/investor/simulator", "\uC218\uC775\uB960 \uC2DC\uBBAC\uB808\uC774\uD130", "\uC778\uC99D", "M5"],
    ["/investor/registry-analysis", "\uB4F1\uAE30\uBD80\uB4F1\uBCF8 AI \uBD84\uC11D", "\uC778\uC99D", "M5"],
    ["/demand/survey/new", "\uC218\uC694\uC124\uBB38 \uC791\uC131", "BUYER", "M5"],
    ["/demand/survey/[id]", "\uC218\uC694\uC124\uBB38 \uACB0\uACFC + \uB9E4\uCE6D", "BUYER", "M5"],
    ["/matching", "\uB9E4\uCE6D \uACB0\uACFC \uBAA9\uB85D", "BUYER", "M5"],
    ["/deal-rooms", "\uB51C\uB8F8 \uBAA9\uB85D", "\uC778\uC99D", "M6"],
    ["/deal-rooms/[id]", "\uB51C\uB8F8 \uC0C1\uC138 (\uCC44\uD305/\uBB38\uC11C/NDA)", "\uCC38\uC5EC\uC790", "M6"],
    ["/contract/[id]", "\uACC4\uC57D \uC694\uCCAD/\uC9C4\uD589", "\uC778\uC99D", "M6"],
    ["/signup", "\uD68C\uC6D0\uAC00\uC785 (\uC5ED\uD560\uBCC4 \uD0ED)", "\uACF5\uAC1C", "M6"],
    ["/login", "\uB85C\uADF8\uC778", "\uACF5\uAC1C", "M6"],
    ["/mypage", "\uB9C8\uC774\uD398\uC774\uC9C0 (\uD504\uB85C\uD544/\uC54C\uB9BC)", "\uC778\uC99D", "M6"],
    ["/statistics", "\uACBD\uACF5\uB9E4 \uD1B5\uACC4 \uB300\uC2DC\uBCF4\uB4DC", "\uACF5\uAC1C(\uAE30\uBCF8)/\uC778\uC99D(\uC0C1\uC138)", "M7"],
    ["/admin", "\uAD00\uB9AC\uC790 \uB300\uC2DC\uBCF4\uB4DC", "ADMIN", "M7"],
    ["/admin/users", "\uD68C\uC6D0 \uAD00\uB9AC", "ADMIN", "M7"],
    ["/admin/listings", "\uBB3C\uAC74 \uAC80\uC218/\uAD00\uB9AC", "ADMIN", "M7"],
    ["/admin/kyc", "KYC \uC2B9\uC778 \uAD00\uB9AC", "ADMIN", "M7"],
  ],
  [2200, 2800, 1800, 2560]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// SECTION 5: AI Analysis Solutions
// ══════════════════════════════════════════════════════════════
children.push(heading("5. AI \uBD84\uC11D \uC194\uB8E8\uC158 \uC544\uD0A4\uD14D\uCC98"));

children.push(heading("5.1 AI \uAC00\uACA9 \uC608\uCE21 \uC2DC\uC2A4\uD15C", HeadingLevel.HEADING_2));
children.push(p("\uB2E8\uC77C \uC8FC\uC18C\uC9C0 \uBD80\uB3D9\uC0B0\uC5D0 \uB300\uD574 \uC0AC\uB840\uAE30\uBC18 AI \uAC00\uACA9 \uC608\uCE21\uC744 \uC218\uD589\uD569\uB2C8\uB2E4."));
children.push(makeTable(
  ["\uD56D\uBAA9", "\uC0C1\uC138"],
  [
    ["\uC785\uB825\uAC12", "\uC8FC\uC18C, \uBD80\uB3D9\uC0B0\uC720\uD615, \uBA74\uC801, \uCE35\uC218, \uBC29\uD5A5, \uAC74\uCD95\uB144\uB3C4"],
    ["\uCC38\uC870 \uB370\uC774\uD130", "\uAD6D\uD1A0\uBD80 \uC2E4\uAC70\uB798\uAC00, \uACF5\uC2DC\uC9C0\uAC00, KB\uBD80\uB3D9\uC0B0\uAC00\uACA9, \uAC10\uC815\uD3C9\uAC00\uC561"],
    ["\uCD9C\uB825\uAC12", "AI \uCD94\uC815\uAC00\uACA9 (95% \uC2E0\uB8B0\uAD6C\uAC04), \uC720\uC0AC \uC0AC\uB840 TOP 5, \uCD94\uC815 \uADFC\uAC70 \uC124\uBA85"],
    ["ML \uBAA8\uB378", "XGBoost + SHAP \uD574\uC11D (Feature Importance \uC2DC\uAC01\uD654)"],
    ["\uC5C5\uB370\uC774\uD2B8 \uC8FC\uAE30", "\uC6D4\uAC04 \uBAA8\uB378 \uC7AC\uD559\uC2B5 (3\uAC1C\uC6D4 \uC2E4\uAC70\uB798 \uB370\uC774\uD130 \uBC18\uC601)"],
  ],
  [2000, 7360]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("5.2 AI \uB4F1\uAE30\uBD80\uB4F1\uBCF8 \uAD8C\uB9AC\uBD84\uC11D", HeadingLevel.HEADING_2));
children.push(p("\uB4F1\uAE30\uBD80\uB4F1\uBCF8 PDF \uC5C5\uB85C\uB4DC\uB9CC\uC73C\uB85C \uC790\uB3D9 \uAD8C\uB9AC\uBD84\uC11D \uBCF4\uACE0\uC11C\uB97C \uC0DD\uC131\uD569\uB2C8\uB2E4."));
children.push(makeTable(
  ["\uBD84\uC11D \uD56D\uBAA9", "\uC0C1\uC138 \uB0B4\uC6A9"],
  [
    ["\uC18C\uC720\uAD8C \uBD84\uC11D", "\uC18C\uC720\uC790 \uBCC0\uB3D9 \uC774\uB825, \uACF5\uB3D9\uC18C\uC720 \uC5EC\uBD80, \uC18C\uC720\uAD8C \uC774\uC804 \uAC00\uB2A5\uC131"],
    ["\uADFC\uC800\uB2F9\uAD8C \uBD84\uC11D", "\uB2F4\uBCF4\uAD8C \uC124\uC815 \uD604\uD669, \uCC44\uAD8C\uCD5C\uACE0\uC561, \uC120\uC21C\uC704 \uBD84\uC11D"],
    ["\uC6A9\uC775\uBB3C\uAD8C \uBD84\uC11D", "\uC804\uC138\uAD8C/\uC9C0\uC0C1\uAD8C/\uC784\uCC28\uAD8C \uD655\uC778, \uB300\uD56D\uB825 \uC5EC\uBD80 \uD310\uB2E8"],
    ["\uC555\uB958/\uAC00\uC555\uB958 \uBD84\uC11D", "\uC555\uB958 \uAC74\uC218 \uBC0F \uAE08\uC561, \uCC44\uAD8C\uC790 \uC2DD\uBCC4"],
    ["\uD2B9\uC218\uAD8C\uB9AC \uBD84\uC11D", "\uC120\uC21C\uC704 \uBCC0\uC81C\uD611\uC758, \uC720\uCE58\uAD8C, \uBC95\uC815\uC9C0\uC0C1\uAD8C"],
    ["\uC704\uD5D8\uB3C4 \uD3C9\uAC00", "A(\uC548\uC804)/B(\uBCF4\uD1B5)/C(\uC8FC\uC758)/D(\uC704\uD5D8)/F(\uB9E4\uC6B0\uC704\uD5D8) \uB4F1\uAE09 \uBD80\uC5EC"],
    ["\uAE30\uC220 \uC2A4\uD0DD", "PDF.js(OCR) + GPT-4(NLP \uBD84\uC11D) + \uC790\uCCB4 \uAD8C\uB9AC\uBD84\uC11D AI \uBAA8\uB378"],
  ],
  [2200, 7160]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("5.3 \uACBD\uB9E4 \uB099\uCC30\uAC00\uC728 AI \uCD94\uC815", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["\uD56D\uBAA9", "\uC0C1\uC138"],
  [
    ["\uC785\uB825\uAC12", "\uC8FC\uC18C, \uBB3C\uAC74\uC720\uD615, \uAC10\uC815\uAC00, \uC720\uCC30\uD69F\uC218, \uAD00\uD560\uBC95\uC6D0"],
    ["\uCC38\uC870 \uB370\uC774\uD130", "\uBC95\uC6D0\uACBD\uB9E4 \uB099\uCC30 \uD1B5\uACC4 (5\uB144\uCE58), \uC9C0\uC5ED/\uC720\uD615\uBCC4 \uB099\uCC30\uAC00\uC728 \uBD84\uD3EC"],
    ["\uCD9C\uB825\uAC12", "AI \uCD94\uC815 \uB099\uCC30\uAC00\uC728 (\uBC94\uC704), \uCD94\uC815 \uB099\uCC30\uAC00, \uC720\uC0AC \uACBD\uB9E4 \uC0AC\uB840"],
    ["\uBAA8\uB378", "Random Forest + \uD1B5\uACC4\uC801 \uBD84\uD3EC \uBD84\uC11D (Quantile Regression)"],
    ["\uC5C5\uB370\uC774\uD2B8", "\uB9E4\uC8FC \uB099\uCC30 \uB370\uC774\uD130 \uBC18\uC601 (\uB300\uBC95\uC6D0 API \uC5F0\uB3D9)"],
  ],
  [2000, 7360]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("5.4 \uC218\uC775\uB960 \uC2DC\uBBAC\uB808\uC774\uD130", HeadingLevel.HEADING_2));
children.push(p([bold("\uB450 \uAC00\uC9C0 \uBAA8\uB4DC\uB97C \uC9C0\uC6D0\uD569\uB2C8\uB2E4:")]));

children.push(heading("5.4.1 \uACBD\uB9E4 \uC218\uC775\uB960 \uC2DC\uBBAC\uB808\uC774\uD130 (\uAC1C\uC778/\uB9E4\uB9E4\uC0AC\uC5C5\uC790\uC6A9)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["\uC785\uB825 \uD56D\uBAA9", "\uC124\uBA85"],
  [
    ["\uB099\uCC30\uAC00 (\uC608\uC0C1 \uB610\uB294 \uC2E4\uC81C)", "\uC9C1\uC811 \uC785\uB825 \uB610\uB294 AI \uCD94\uC815\uAC12 \uC790\uB3D9 \uBC18\uC601"],
    ["\uCDE8\uB4DD\uC138 + \uBD80\uB300\uBE44\uC6A9", "\uCDE8\uB4DD\uC138, \uAD50\uC721\uC138, \uBC95\uBB34\uC0AC \uBE44\uC6A9, \uBA85\uB3C4 \uBE44\uC6A9 \uB4F1"],
    ["\uBCF4\uC720\uAE30\uAC04 \uC911 \uBE44\uC6A9", "\uB300\uCD9C\uC774\uC790, \uAD00\uB9AC\uBE44, \uACF5\uC2E4 \uB9AC\uC2A4\uD06C"],
    ["\uB9E4\uB3C4\uAC00 (\uC608\uC0C1)", "\uC2DC\uC138 \uC608\uCE21 \uB610\uB294 \uC9C1\uC811 \uC785\uB825"],
    ["\uB9E4\uB3C4 \uC2DC \uBE44\uC6A9", "\uC591\uB3C4\uC138, \uC911\uAC1C\uC218\uC218\uB8CC \uB4F1"],
  ],
  [2800, 6560]
));

children.push(new Paragraph({ spacing: { after: 100 } }));
children.push(p([bold("\uCD9C\uB825: "), run("\uCD1D \uD22C\uC790\uAE08\uC561, \uC21C\uC218\uC775, ROI(%), \uC5F0\uD658\uC0B0 \uC218\uC775\uB960, \uC190\uC775\uBD84\uAE30\uC810 \uBD84\uC11D, \uD22C\uC790\uC758\uACAC")]));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("5.4.2 \uCC44\uAD8C \uB9E4\uC785 \uC218\uC775\uB960 \uBD84\uC11D (\uAE30\uAD00\uD22C\uC790\uC790\uC6A9)", HeadingLevel.HEADING_3));
children.push(makeTable(
  ["\uC785\uB825 \uD56D\uBAA9", "\uC124\uBA85"],
  [
    ["\uCC44\uAD8C \uB9E4\uC785\uAC00", "\uCC44\uAD8C \uC561\uBA74 \uB300\uBE44 \uB9E4\uC785 \uBE44\uC728"],
    ["\uD68C\uC218 \uC608\uC0C1 \uAE08\uC561", "\uACBD\uB9E4 \uB099\uCC30\uAC00 / \uC784\uC758\uB9E4\uAC01 / \uD611\uC758\uB9E4\uAC01"],
    ["\uD68C\uC218 \uAE30\uAC04", "\uC608\uC0C1 \uD68C\uC218 \uAE30\uAC04 (\uAC1C\uC6D4)"],
    ["\uBD80\uB300\uBE44\uC6A9", "\uBC95\uBB34 \uBE44\uC6A9, \uAC10\uC815 \uBE44\uC6A9, \uAD00\uB9AC \uBE44\uC6A9"],
    ["\uC790\uAE08\uC870\uB2EC \uBE44\uC6A9", "\uB808\uBC84\uB9AC\uC9C0 \uBE44\uC728, \uAE08\uB9AC"],
  ],
  [2800, 6560]
));
children.push(p([bold("\uCD9C\uB825: "), run("IRR, NPV, \uD68C\uC218\uBC30\uC218, \uC608\uC0C1 \uC218\uC775\uAE08, \uC2DC\uB098\uB9AC\uC624\uBCC4 \uBD84\uC11D (\uCD5C\uC120/\uBCF4\uD1B5/\uCD5C\uC545)")]));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// SECTION 6: Security & Anti-Circumvention
// ══════════════════════════════════════════════════════════════
children.push(heading("6. \uBCF4\uC548 \uBC0F \uC815\uBCF4 \uD1B5\uC81C \uC544\uD0A4\uD14D\uCC98"));

children.push(heading("6.1 3\uB2E8\uACC4 \uC815\uBCF4 \uACF5\uAC1C \uCCB4\uACC4", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["\uB2E8\uACC4", "\uACF5\uAC1C \uBC94\uC704", "\uC811\uADFC \uC870\uAC74", "\uBCF4\uC548 \uC870\uCE58"],
  [
    ["Teaser (\uACF5\uAC1C)", "\uBB3C\uAC74\uC720\uD615, \uC9C0\uC5ED(\uC2DC/\uAD6C), \uCC44\uAD8C\uC561 \uBC94\uC704, \uB9C8\uC2A4\uD0B9\uC8FC\uC18C", "\uBE44\uD68C\uC6D0 \uD3EC\uD568 \uBAA8\uB450", "\uC8FC\uC18C \uB9C8\uC2A4\uD0B9, \uC0C1\uC138\uC815\uBCF4 \uBE44\uACF5\uAC1C"],
    ["NDA (\uC81C\uD55C\uACF5\uAC1C)", "\uC815\uD655\uD55C \uC8FC\uC18C, \uCC44\uBB34\uC790\uC815\uBCF4, \uBC95\uC801\uC0C1\uC138", "NDA \uC11C\uBA85 + KYC \uC2B9\uC778", "\uC6CC\uD130\uB9C8\uD06C, \uB2E4\uC6B4\uB85C\uB4DC \uC81C\uD55C"],
    ["Full (\uC804\uCCB4\uACF5\uAC1C)", "\uC804\uCCB4 \uBB38\uC11C, \uB4F1\uAE30\uBD80, \uAC10\uC815\uD3C9\uAC00\uC11C", "\uB51C\uB8F8 \uCC38\uC5EC + LOI \uC81C\uCD9C", "\uC6CC\uD130\uB9C8\uD06C+\uB85C\uAE45+\uD1B5\uC2E0\uD1B5\uC81C"],
  ],
  [1600, 3000, 2200, 2560]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("6.2 RBAC (Role-Based Access Control)", HeadingLevel.HEADING_2));
children.push(p("\uBAA8\uB4E0 API \uC5D4\uB4DC\uD3EC\uC778\uD2B8\uC5D0 Supabase RLS (Row Level Security) + \uBBF8\uB4E4\uC6E8\uC5B4 \uC5ED\uD560 \uAC80\uC0AC\uB97C \uC801\uC6A9\uD569\uB2C8\uB2E4."));

children.push(heading("6.3 \uC6B0\uD68C\uBC29\uC9C0 (Anti-Circumvention)", HeadingLevel.HEADING_2));
children.push(bullet("\uC6CC\uD130\uB9C8\uD06C: \uBAA8\uB4E0 \uBB38\uC11C\uC5D0 \uC0AC\uC6A9\uC790 ID + \uC5F4\uB78C\uC77C\uC2DC \uC6CC\uD130\uB9C8\uD06C \uC790\uB3D9 \uC801\uC6A9"));
children.push(bullet("\uB2E4\uC6B4\uB85C\uB4DC \uC81C\uD55C: NDA \uB2E8\uACC4 \uC774\uC0C1 \uBB38\uC11C \uB2E4\uC6B4\uB85C\uB4DC \uCC28\uB2E8 (\uC628\uB77C\uC778 \uBDF0\uC5B4\uB9CC \uD5C8\uC6A9)"));
children.push(bullet("\uD1B5\uC2E0 \uD1B5\uC81C: \uB51C\uB8F8 \uB0B4 \uC678\uBD80 \uC5F0\uB77D\uCC98 \uACF5\uC720 \uAE08\uC9C0, \uBAA8\uB4E0 \uD1B5\uC2E0 \uD50C\uB7AB\uD3FC \uB0B4 \uC81C\uD55C"));
children.push(bullet("\uAC10\uC0AC \uB85C\uADF8: \uBAA8\uB4E0 \uBB3C\uAC74 \uC870\uD68C/\uB2E4\uC6B4\uB85C\uB4DC/\uBA54\uC2DC\uC9C0 \uAE30\uB85D \uBC0F \uCD94\uC801"));
children.push(bullet("\uC2A4\uD06C\uB9B0\uC0F7 \uBC29\uC9C0: \uBB38\uC11C \uBDF0\uC5B4 \uB0B4 \uC2A4\uD06C\uB9B0\uC0F7 \uAC10\uC9C0 \uBC0F \uACBD\uACE0 \uC2DC\uC2A4\uD15C"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// SECTION 7: Figma Design System Reference
// ══════════════════════════════════════════════════════════════
children.push(heading("7. \uB514\uC790\uC778 \uC2DC\uC2A4\uD15C (Figma \uAE30\uBC18)"));

children.push(heading("7.1 \uCEEC\uB7EC \uD30C\uB808\uD2B8", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["\uC6A9\uB3C4", "\uCEEC\uB7EC\uBA85", "HEX", "\uC0AC\uC6A9\uCC98"],
  [
    ["Primary", "Navy", "#1B3A5C", "\uD5E4\uB354, \uD478\uD130, \uD14C\uC774\uBE14 \uD5E4\uB354, \uC8FC\uC694 \uD14D\uC2A4\uD2B8"],
    ["Secondary", "Blue", "#2E75B6", "\uBC84\uD2BC, \uB9C1\uD06C, \uD3EC\uCEE4\uC2A4 \uC0C1\uD0DC"],
    ["Accent", "Purple", "#7C3AED", "CTA \uBC84\uD2BC, \uBC30\uC9C0, \uAC15\uC870 \uC694\uC18C (Figma \uAE30\uC900)"],
    ["Success", "Green", "#10B981", "\uC131\uACF5 \uC0C1\uD0DC, \uC0C1\uC2B9 \uC9C0\uD45C"],
    ["Danger", "Red", "#EF4444", "\uC624\uB958, \uD558\uB77D \uC9C0\uD45C, \uACBD\uACE0"],
    ["Background", "Light Blue-Gray", "#F0F5FA", "\uD398\uC774\uC9C0 \uBC30\uACBD"],
    ["Surface", "White", "#FFFFFF", "\uCE74\uB4DC, \uBAA8\uB2EC \uBC30\uACBD"],
  ],
  [1400, 1600, 1400, 4960]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("7.2 \uD0C0\uC774\uD3EC\uADF8\uB798\uD53C", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["\uC6A9\uB3C4", "\uD3F0\uD2B8", "\uC0AC\uC774\uC988", "\uAD75\uAE30"],
  [
    ["H1 (\uD398\uC774\uC9C0 \uD0C0\uC774\uD2C0)", "Pretendard / Arial", "32px (2rem)", "Bold 700"],
    ["H2 (\uC139\uC158 \uD0C0\uC774\uD2C0)", "Pretendard / Arial", "24px (1.5rem)", "Bold 700"],
    ["H3 (\uC11C\uBE0C\uC139\uC158)", "Pretendard / Arial", "20px (1.25rem)", "Semibold 600"],
    ["Body", "Pretendard / Arial", "16px (1rem)", "Regular 400"],
    ["Caption", "Pretendard / Arial", "14px (0.875rem)", "Regular 400"],
    ["Small", "Pretendard / Arial", "12px (0.75rem)", "Medium 500"],
  ],
  [2200, 2200, 2400, 2560]
));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(heading("7.3 Figma \uD398\uC774\uC9C0 \uB9E4\uD551", HeadingLevel.HEADING_2));
children.push(p("\uAC01 Figma \uD398\uC774\uC9C0\uC640 \uAC1C\uBC1C \uBAA8\uB4C8\uC758 \uB300\uC751 \uAD00\uACC4:"));
children.push(makeTable(
  ["Figma \uD398\uC774\uC9C0", "\uD504\uB808\uC784 \uAD6C\uC131", "\uB300\uC751 \uBAA8\uB4C8", "\uAC1C\uBC1C \uB77C\uC6B0\uD2B8"],
  [
    ["\uD648_Home", "PC(1920\xD75221) + Mobile(360\xD74539) + \uBC30\uB108 \uBCC0\uD615", "Module 1", "/ (app/(main)/page.tsx)"],
    ["NPL \uAC80\uC0C9_Search", "PC \xD72 (\uD544\uD130+\uACB0\uACFC\uD14C\uC774\uBE14)", "Module 2", "/listings/search"],
    ["NPL \uBAA9\uB85D_List", "PC(\uC640\uC774\uB4DC\uD14C\uC774\uBE14) + \uD544\uD130\uBC14", "Module 2", "/listings"],
    ["NPL \uAD00\uB9AC_Management", "NPL\uACC4\uC57D + \uB4F1\uB85D\uC2E0\uCCAD + Management\xD73", "Module 4", "/institution/*"],
    ["NPL \uACC4\uC57D_Contract", "\uB9E4\uC785\uC0AC \uACC4\uC57D\uC694\uCCAD \uD398\uC774\uC9C0", "Module 6", "/contract/*"],
    ["\uC9C0\uB3C4_Map", "npl map(1920\xD71080) \uD480\uC2A4\uD06C\uB9B0 + \uC0AC\uC774\uB4DC\uBC14", "Module 2", "/listings/map"],
    ["\uACBD\uACF5\uB9E4 \uD1B5\uACC4_Statistics", "PC(960w) + Mobile + \uC9C0\uC5ED\uBCC4 \uD788\uD2B8\uB9F5", "Module 7", "/statistics"],
    ["\uB300\uC2DC\uBCF4\uB4DC_Dashboard", "\uB300\uC2DC\uBCF4\uB4DC\xD72 + KPI\uCE74\uB4DC + \uBAA8\uB2EC", "Module 7", "/admin, /institution/dashboard"],
    ["NPL \uC0C1\uC138_Detail", "NPL\uBAA9\uB85D + \uC0C1\uC138\uD398\uC774\uC9C0 + \uC218\uC815 + Register", "Module 3", "/listings/[id]"],
    ["Signup", "\uD68C\uC6D0\uAC00\uC785/\uBA64\uBC84\uC2ED PC\xD73 + Mobile", "Module 6", "/signup"],
  ],
  [2200, 3000, 1600, 2560]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// SECTION 8: API Architecture
// ══════════════════════════════════════════════════════════════
children.push(heading("8. API \uC544\uD0A4\uD14D\uCC98"));

children.push(heading("8.1 RESTful API \uC5D4\uB4DC\uD3EC\uC778\uD2B8 \uBAA9\uB85D", HeadingLevel.HEADING_2));
children.push(makeTable(
  ["\uBA54\uC11C\uB4DC", "\uACBD\uB85C", "\uC124\uBA85", "\uC778\uC99D"],
  [
    ["GET", "/api/listings", "\uBB3C\uAC74 \uBAA9\uB85D (\uD544\uD130/\uC815\uB82C/\uD398\uC774\uC9C0\uB124\uC774\uC158)", "\uACF5\uAC1C"],
    ["GET", "/api/listings/[id]", "\uBB3C\uAC74 \uC0C1\uC138 (disclosure_level\uC5D0 \uB530\uB978 \uC815\uBCF4 \uD1B5\uC81C)", "\uACF5\uAC1C/\uC778\uC99D"],
    ["POST", "/api/listings", "\uBB3C\uAC74 \uB4F1\uB85D", "SELLER/ADMIN"],
    ["PUT", "/api/listings/[id]", "\uBB3C\uAC74 \uC218\uC815", "SELLER(\uC18C\uC720\uC790)"],
    ["POST", "/api/listings/[id]/interest", "\uAD00\uC2EC \uD1A0\uAE00", "\uC778\uC99D"],
    ["GET", "/api/surveys", "\uC218\uC694\uC124\uBB38 \uBAA9\uB85D", "\uC778\uC99D"],
    ["POST", "/api/surveys", "\uC218\uC694\uC124\uBB38 \uC0DD\uC131 + \uB9E4\uCE6D \uD2B8\uB9AC\uAC70", "\uC778\uC99D"],
    ["GET", "/api/matching", "\uB9E4\uCE6D \uACB0\uACFC \uC870\uD68C", "\uC778\uC99D"],
    ["POST", "/api/matching", "\uB9E4\uCE6D \uC7AC\uC2E4\uD589", "\uC778\uC99D"],
    ["GET", "/api/deal-rooms", "\uB51C\uB8F8 \uBAA9\uB85D", "\uC778\uC99D"],
    ["GET", "/api/deal-rooms/[id]", "\uB51C\uB8F8 \uC0C1\uC138 + \uBA54\uC2DC\uC9C0", "\uCC38\uC5EC\uC790"],
    ["POST", "/api/deal-rooms/[id]/messages", "\uB51C\uB8F8 \uBA54\uC2DC\uC9C0 \uC804\uC1A1", "\uCC38\uC5EC\uC790"],
    ["POST", "/api/ai/price-estimate", "AI \uAC00\uACA9 \uC608\uCE21", "\uC778\uC99D"],
    ["POST", "/api/ai/rights-analysis", "AI \uAD8C\uB9AC\uBD84\uC11D (\uB4F1\uAE30\uBD80 \uC5C5\uB85C\uB4DC)", "\uC778\uC99D"],
    ["POST", "/api/ai/winning-rate", "AI \uB099\uCC30\uAC00\uC728 \uCD94\uC815", "\uC778\uC99D"],
    ["POST", "/api/ai/profit-simulation", "\uC218\uC775\uB960 \uC2DC\uBBAC\uB808\uC774\uC158", "\uC778\uC99D"],
    ["GET", "/api/statistics/auction", "\uACBD\uACF5\uB9E4 \uD1B5\uACC4 \uB370\uC774\uD130", "\uACF5\uAC1C/\uC778\uC99D"],
    ["GET", "/api/users/me", "\uB0B4 \uD504\uB85C\uD544 + \uD1B5\uACC4", "\uC778\uC99D"],
    ["PUT", "/api/users/me", "\uD504\uB85C\uD544 \uC218\uC815", "\uC778\uC99D"],
    ["GET", "/api/notifications", "\uC54C\uB9BC \uBAA9\uB85D", "\uC778\uC99D"],
    ["GET", "/api/admin/dashboard", "\uAD00\uB9AC\uC790 KPI", "ADMIN"],
  ],
  [900, 3000, 3200, 2260]
));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// SECTION 9: Development Roadmap
// ══════════════════════════════════════════════════════════════
children.push(heading("9. \uAC1C\uBC1C \uB85C\uB4DC\uB9F5"));

children.push(heading("9.1 Phase 1: \uCF54\uC5B4 MVP (4\uC8FC)", HeadingLevel.HEADING_2));
children.push(bullet("\uD648 \uD398\uC774\uC9C0 + \uB124\uBE44\uAC8C\uC774\uC158 (Figma \uB514\uC790\uC778 \uC801\uC6A9)"));
children.push(bullet("NPL \uBAA9\uB85D/\uAC80\uC0C9/\uC9C0\uB3C4 \uBDF0"));
children.push(bullet("NPL \uC0C1\uC138\uD398\uC774\uC9C0 (Deal Book)"));
children.push(bullet("\uD68C\uC6D0\uAC00\uC785/\uB85C\uADF8\uC778 (\uC5ED\uD560\uBCC4 \uD0ED)"));
children.push(bullet("\uAE08\uC735\uAE30\uAD00 \uBB3C\uAC74 \uB4F1\uB85D \uAE30\uBCF8 \uD50C\uB85C\uC6B0"));
children.push(bullet("\uAD00\uB9AC\uC790 \uAE30\uBCF8 \uB300\uC2DC\uBCF4\uB4DC"));

children.push(heading("9.2 Phase 2: AI \uBD84\uC11D + \uD22C\uC790\uB3C4\uAD6C (4\uC8FC)", HeadingLevel.HEADING_2));
children.push(bullet("AI \uAC00\uACA9 \uC608\uCE21 \uC2DC\uC2A4\uD15C \uD1B5\uD569"));
children.push(bullet("AI \uB4F1\uAE30\uBD80\uB4F1\uBCF8 \uAD8C\uB9AC\uBD84\uC11D \uC5D4\uC9C4"));
children.push(bullet("\uACBD\uB9E4 \uB099\uCC30\uAC00\uC728 AI \uCD94\uC815"));
children.push(bullet("\uC218\uC775\uB960 \uC2DC\uBBAC\uB808\uC774\uD130 (\uACBD\uB9E4 + \uCC44\uAD8C\uB9E4\uC785)"));
children.push(bullet("\uC790\uB3D9 \uB4F1\uAE30\uBD80\uB4F1\uBCF8 \uC5F4\uB78C \uC11C\uBE44\uC2A4"));

children.push(heading("9.3 Phase 3: \uAC70\uB798 \uC778\uD504\uB77C + \uACE0\uB3C4\uD654 (4\uC8FC)", HeadingLevel.HEADING_2));
children.push(bullet("\uC218\uC694\uC124\uBB38 + \uAC00\uC911\uCE58 \uB9E4\uCE6D \uC5D4\uC9C4"));
children.push(bullet("NDA/KYC \uAE30\uBC18 \uB51C\uB8F8 + \uCC44\uD305"));
children.push(bullet("\uACC4\uC57D \uC694\uCCAD/\uC9C4\uD589 \uD50C\uB85C\uC6B0"));
children.push(bullet("\uAE08\uC735\uAE30\uAD00 \uC804\uC6A9 \uB300\uC2DC\uBCF4\uB4DC + \uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uAD00\uB9AC"));
children.push(bullet("\uACBD\uACF5\uB9E4 \uD1B5\uACC4 \uB300\uC2DC\uBCF4\uB4DC"));

children.push(heading("9.4 Phase 4: \uC2A4\uCF00\uC77C\uB9C1 + \uBA64\uBC84\uC2ED (2\uC8FC)", HeadingLevel.HEADING_2));
children.push(bullet("\uBA64\uBC84\uC2ED \uACFC\uAE08 \uCCB4\uACC4 (FREE/BASIC/PREMIUM/ENTERPRISE)"));
children.push(bullet("\uC54C\uB9BC \uC2DC\uC2A4\uD15C \uACE0\uB3C4\uD654 (Email + Push + Realtime)"));
children.push(bullet("\uC131\uB2A5 \uCD5C\uC801\uD654 + CDN + \uCE90\uC2F1"));
children.push(bullet("SEO + OG Image \uC790\uB3D9 \uC0DD\uC131"));
children.push(bullet("\uBAA8\uBC14\uC77C \uBC18\uC751\uD615 \uCD5C\uC801\uD654"));

children.push(new Paragraph({ children: [new PageBreak()] }));

// ══════════════════════════════════════════════════════════════
// SECTION 10: Module Document Index
// ══════════════════════════════════════════════════════════════
children.push(heading("10. \uBAA8\uB4C8\uBCC4 \uC138\uBD80 \uAE30\uD68D\uC11C \uC778\uB371\uC2A4"));
children.push(p("\uAC01 \uBAA8\uB4C8\uBCC4\uB85C \uBCC4\uB3C4\uC758 \uC138\uBD80 \uAC1C\uBC1C \uAE30\uD68D\uC11C\uAC00 \uC874\uC7AC\uD569\uB2C8\uB2E4. \uAC01 \uBB38\uC11C\uC5D0\uB294 \uB2E4\uC74C\uC774 \uD3EC\uD568\uB429\uB2C8\uB2E4:"));
children.push(bullet("Figma \uB514\uC790\uC778 \uBC18\uC601 \uD654\uBA74 \uC124\uACC4 (PC + Mobile)"));
children.push(bullet("\uD398\uC774\uC9C0\uBCC4 \uCEF4\uD3EC\uB10C\uD2B8 \uD2B8\uB9AC \uBC0F Props \uC815\uC758"));
children.push(bullet("API Request/Response \uC2A4\uD0A4\uB9C8 \uC0C1\uC138"));
children.push(bullet("DB \uCFFC\uB9AC \uC124\uACC4 \uBC0F \uC778\uB371\uC2A4 \uC804\uB7B5"));
children.push(bullet("\uC0C1\uD0DC \uAD00\uB9AC \uBC0F \uC0AC\uC6A9\uC790 \uD50C\uB85C\uC6B0"));
children.push(bullet("\uC5D0\uB7EC \uCC98\uB9AC \uBC0F \uC5E3\uC9C0 \uCF00\uC774\uC2A4"));

children.push(new Paragraph({ spacing: { after: 200 } }));

children.push(makeTable(
  ["\uBB38\uC11C\uBA85", "\uBAA8\uB4C8", "\uD398\uC774\uC9C0 \uC218 (\uC608\uC0C1)", "\uD575\uC2EC \uB0B4\uC6A9"],
  [
    ["NPL_Module1_Home.docx", "M1: \uD648/\uB79C\uB529", "15~20p", "GNB, Hero, CTA, Footer, \uBC18\uC751\uD615"],
    ["NPL_Module2_Search.docx", "M2: \uAC80\uC0C9/\uBAA9\uB85D/\uC9C0\uB3C4", "30~40p", "\uBA40\uD2F0\uD544\uD130, \uD14C\uC774\uBE14, \uC9C0\uB3C4\uC5F0\uB3D9"],
    ["NPL_Module3_Detail_AI.docx", "M3: \uC0C1\uC138+AI\uBD84\uC11D", "40~50p", "Deal Book, AI\uAC00\uACA9, \uAD8C\uB9AC\uBD84\uC11D, \uB099\uCC30\uC728"],
    ["NPL_Module4_Institution.docx", "M4: \uAE08\uC735\uAE30\uAD00", "25~35p", "\uBB3C\uAC74\uB4F1\uB85D, \uB9C8\uCF00\uD305, \uD3EC\uD2B8\uD3F4\uB9AC\uC624"],
    ["NPL_Module5_InvestorTools.docx", "M5: \uD22C\uC790\uC790\uB3C4\uAD6C", "30~40p", "\uC2DC\uBBAC\uB808\uC774\uD130, \uC218\uC694\uC124\uBB38, \uB9E4\uCE6D"],
    ["NPL_Module6_Contract.docx", "M6: \uACC4\uC57D/\uB51C\uB8F8/\uD68C\uC6D0", "25~35p", "NDA, KYC, Signup, \uB51C\uB8F8, \uBA64\uBC84\uC2ED"],
    ["NPL_Module7_Dashboard.docx", "M7: \uB300\uC2DC\uBCF4\uB4DC/\uD1B5\uACC4", "20~30p", "KPI, \uACBD\uACF5\uB9E4\uD1B5\uACC4, \uAD00\uB9AC\uC790"],
  ],
  [2600, 1800, 1600, 3360]
));

children.push(new Paragraph({ spacing: { after: 400 } }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [
  new TextRun({ text: "--- End of Master Architecture Document ---", font: "Arial", size: 20, color: C.gray, italics: true })
]}));

// ══════════════════════════════════════════════════════════════
// BUILD DOCUMENT
// ══════════════════════════════════════════════════════════════
const doc = new Document({
  numbering,
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: C.navy },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: C.navy },
        paragraph: { spacing: { before: 240, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: C.blue },
        paragraph: { spacing: { before: 180, after: 120 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({ children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "NPLATFORM \uC138\uBD80 \uAC1C\uBC1C \uAE30\uD68D\uC11C | Master Architecture", font: "Arial", size: 16, color: C.gray, italics: true })]
        })
      ]})
    },
    footers: {
      default: new Footer({ children: [
        new Paragraph({
          alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 1, color: C.lightGray, space: 4 } },
          children: [new TextRun({ text: "Page ", font: "Arial", size: 16, color: C.gray }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: C.gray })]
        })
      ]})
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const outDir = "C:\\Users\\82106\\Desktop\\부동산 뉴스 크롤링 서비스\\0-news\\docs";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = outDir + "\\NPL_Master_Architecture.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Created: " + outPath + " (" + (buffer.length / 1024).toFixed(0) + "KB)");
});
