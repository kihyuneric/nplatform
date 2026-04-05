const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageBreak, PageNumber, TableOfContents, LevelFormat } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellM = { top: 60, bottom: 60, left: 100, right: 100 };
const W = 9360; // US Letter content width

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, size: 36, font: "Arial", color: "1B3A5C" })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 },
    children: [new TextRun({ text, bold: true, size: 28, font: "Arial", color: "2E75B6" })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 24, font: "Arial", color: "1B3A5C" })] });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, font: "Arial", ...opts })] });
}
function pb() { return new Paragraph({ children: [new PageBreak()] }); }

function makeRow(cells, isHeader = false) {
  const cw = Math.floor(W / cells.length);
  return new TableRow({
    children: cells.map(text => new TableCell({
      borders, width: { size: cw, type: WidthType.DXA }, margins: cellM,
      shading: isHeader ? { fill: "1B3A5C", type: ShadingType.CLEAR } : undefined,
      children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 20, font: "Arial",
        bold: isHeader, color: isHeader ? "FFFFFF" : "333333" })] })]
    }))
  });
}
function makeTable(headers, rows) {
  const cw = Math.floor(W / headers.length);
  return new Table({
    width: { size: W, type: WidthType.DXA },
    columnWidths: headers.map(() => cw),
    rows: [makeRow(headers, true), ...rows.map(r => makeRow(r))]
  });
}
function bullet(text) {
  return new Paragraph({ numbering: { reference: "bullets", level: 0 }, spacing: { after: 60 },
    children: [new TextRun({ text, size: 22, font: "Arial" })] });
}

const doc = new Document({
  numbering: { config: [
    { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    { reference: "numbers", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
      alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
  ]},
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1B3A5C" },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2E75B6" },
        paragraph: { spacing: { before: 300, after: 150 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "1B3A5C" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
    },
    headers: { default: new Header({ children: [
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [
        new TextRun({ text: "NPLatform 1,005\uC810 \uC885\uD569\uAE30\uD68D\uC11C", size: 16, font: "Arial", color: "999999", italics: true })
      ]})
    ]})},
    footers: { default: new Footer({ children: [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: "NPLatform \u2014 \uBD80\uC2E4\uCC44\uAD8C \uAC70\uB798\uC758 \uBAA8\uB4E0 \uAC83 | ", size: 16, font: "Arial", color: "999999" }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, font: "Arial", color: "999999" })
      ]})
    ]})},
    children: [
      // === COVER PAGE ===
      new Paragraph({ spacing: { before: 3000 } }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: "NPLatform", size: 72, bold: true, font: "Arial", color: "1B3A5C" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: "1,005\uC810 \uC885\uD569\uAE30\uD68D\uC11C", size: 40, font: "Arial", color: "2E75B6" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 },
        children: [new TextRun({ text: "\uBD80\uC2E4\uCC44\uAD8C \uAC70\uB798\uC758 \uBAA8\uB4E0 \uAC83", size: 28, font: "Arial", color: "666666", italics: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
        children: [new TextRun({ text: "(\uC8FC)\uD2B8\uB79C\uC2A4\uD30C\uBA38 | TransFarmer Inc.", size: 22, font: "Arial", color: "999999" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 2000 },
        children: [new TextRun({ text: "2026\uB144 3\uC6D4", size: 22, font: "Arial", color: "999999" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1B3A5C", space: 1 } },
        children: [] }),
      pb(),

      // === TOC ===
      h1("\uBAA9\uCC28"),
      new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
      pb(),

      // === PART 1: EXECUTIVE SUMMARY ===
      h1("Part 1. Executive Summary"),
      h2("1.1 \uBE44\uC804"),
      p("\uAE08\uC735\uAE30\uAD00\uB300\uBD80\uC5C5\uCCB4\uB294 NPL\uC744 \uC27D\uAC8C \uC62C\uB9AC\uACE0 \uB9C8\uCF00\uD305\uD558\uC5EC \uB9E4\uAC01\uD55C\uB2E4."),
      p("\uD22C\uC790\uC790\uC790\uC0B0\uC6B4\uC6A9\uC0AC\uB300\uBD80\uC5C5\uCCB4\uB294 \uC6D0\uD558\uB294 NPL\uC744 \uCC3E\uACE0, \uBD84\uC11D\uD558\uACE0, \uAC70\uB798\uD55C\uB2E4."),
      p("NPLatform\uC774 \uADF8 \uC0AC\uC774\uC758 \uBAA8\uB4E0 \uACFC\uC815\uC744 AI\uB85C \uC790\uB3D9\uD654\uD55C\uB2E4."),

      h2("1.2 \uC2DC\uC7A5 \uAE30\uD68C"),
      makeTable(
        ["\uC9C0\uD45C", "\uC218\uCE58", "\uCD9C\uCC98"],
        [
          ["\uAD6D\uB0B4 \uBD80\uC2E4\uCC44\uAD8C \uC794\uC561", "\uC57D 30\uC870\uC6D0", "\uAE08\uC735\uAC10\uB3C5\uC6D0 2025"],
          ["\uC5F0\uAC04 NPL \uB9E4\uAC01 \uAC70\uB798\uC561", "\uC57D 8~12\uC870\uC6D0", "\uC5C5\uACC4 \uCD94\uC815"],
          ["\uC628\uB77C\uC778\uD654 \uBE44\uC728", "5% \uBBF8\uB9CC", "\uB300\uBD80\uBD84 \uC624\uD504\uB77C\uC778"],
          ["NPL \uC804\uBB38 \uD22C\uC790\uC790", "\uC57D 5,000~10,000\uBA85", "\uCD94\uC815"],
          ["NPL \uB9E4\uAC01 \uAE08\uC735\uAE30\uAD00", "\uC57D 200+\uAC1C", "\uC740\uD589+\uC800\uCD95\uC740\uD589+\uB300\uBD80\uC5C5"],
        ]
      ),

      h2("1.3 \uBE44\uC988\uB2C8\uC2A4 \uBAA8\uB378"),
      makeTable(
        ["\uC218\uC775\uC6D0", "\uB0B4\uC6A9", "\uC608\uC0C1 \uB9E4\uCD9C"],
        [
          ["\uAC70\uB798 \uC218\uC218\uB8CC", "\uB9E4\uAC01 \uC644\uB8CC \uC2DC \uB9E4\uB3C4/\uB9E4\uC218 \uAC01 0.5%", "\uC5F0 10\uC5B5"],
          ["SaaS \uAD6C\uB3C5", "Pro: \uC6D4 50\uB9CC / Enterprise: \uC6D4 200\uB9CC", "\uC5F0 12\uC5B5"],
          ["\uD504\uB9AC\uBBF8\uC5C4 \uB178\uCD9C", "\uCD94\uCC9C\uB9E4\uBB3C \uBC30\uCE58 \uAC74\uB2F9 10~50\uB9CC", "\uC5F0 4.8\uC5B5"],
          ["\uB370\uC774\uD130 API", "\uC2DC\uC7A5 \uB370\uC774\uD130 API \uC6D4 100~500\uB9CC", "\uC5F0 12\uC5B5"],
        ]
      ),
      p("3\uB144\uCC28 \uBAA9\uD45C ARR: \uC57D 40\uC5B5\uC6D0", { bold: true }),
      pb(),

      // === PART 2: CURRENT STATUS ===
      h1("Part 2. \uD604\uC7AC \uAC1C\uBC1C \uD604\uD669 (372/1,005\uC810)"),
      h2("2.1 \uBE4C\uB4DC \uC0C1\uD0DC"),
      makeTable(
        ["\uD56D\uBAA9", "\uC218\uCE58"],
        [
          ["\uBE4C\uB4DC", "\u2705 Compiled successfully (35\uCD08)"],
          ["\uC804\uCCB4 \uD398\uC774\uC9C0", "68 page.tsx"],
          ["API \uB77C\uC6B0\uD2B8", "95 route.ts"],
          ["DB \uD14C\uC774\uBE14", "12 (RLS \uC801\uC6A9)"],
          ["\uC2DC\uB4DC \uB370\uC774\uD130", "59\uAC74 (22 \uC9C0\uC5ED, 9 \uAE08\uC735\uAE30\uAD00)"],
          ["\uD575\uC2EC \uCF54\uB4DC", "28,793\uC904 (\uC8FC\uC694 32\uAC1C \uD30C\uC77C)"],
        ]
      ),

      h2("2.2 \uC644\uC131\uB41C \uD575\uC2EC \uAE30\uB2A5"),
      makeTable(
        ["\uAE30\uB2A5", "\uC810\uC218", "\uC8FC\uC694 \uB0B4\uC6A9"],
        [
          ["NPL \uAC80\uC0C9", "39/40", "10\uD0ED, 3\uB2E8\uACC4 \uC9C0\uC5ED, \uACE0\uAE09\uD544\uD130, \uC5D1\uC140"],
          ["NPL \uC9C0\uB3C4", "26/30", "\uCE74\uCE74\uC624\uB9F5 \uC900\uBE44, 25\uAC74 \uB9C8\uCEE4, \uD544\uD130"],
          ["NPL \uC785\uCC30", "34/35", "20\uAC74, \uC785\uCC30\uBAA8\uB2EC, \uAE30\uAD00\uAD00\uB9AC, \uC54C\uB9BC"],
          ["NPL \uBD84\uC11D", "34/35", "6\uD0ED \uC0C1\uC138, PDF \uB9AC\uD3EC\uD2B8, \uC2DC\uBBAC \uC5F0\uB3D9"],
          ["\uACBD\uB9E4 \uC2DC\uBBAC\uB808\uC774\uD130", "24/25", "\uC6D0\uBCF8 10\uAE30\uB2A5, 4\uD0ED\uBD84\uC11D, \uB0B4\uBCF4\uB0B4\uAE30"],
          ["\uD1B5\uACC4", "22/25", "6 KPI, 4\uC885 \uCC28\uD2B8, API \uC5F0\uB3D9"],
          ["AI Agent \uCC57\uBD07", "24/25", "\uC2E4API, \uCEE8\uD14D\uC2A4\uD2B8, \uC2A4\uD2B8\uB9AC\uBC0D"],
          ["\uD30C\uD2B8\uB108 \uD5C8\uBE0C", "19/20", "4\uD398\uC774\uC9C0, API 3\uAC1C, \uC815\uC0B0PDF"],
          ["\uAD00\uB9AC\uC790", "18/20", "KPI, KYC, \uAC10\uC0AC\uB85C\uADF8"],
          ["\uB9E4\uBB3C \uC0C1\uC138", "18/20", "NDA, 7\uD0ED, QnA, \uBE44\uAD50"],
          ["\uB51C\uB8F8/\uACC4\uC57D", "16/20", "\uD0C0\uC784\uB77C\uC778, \uC11C\uBA85, \uD30C\uC77C"],
        ]
      ),
      pb(),

      // === PART 3: 600점 SUPER ===
      h1("Part 3. Super Layer (+200\uC810)"),
      h2("3.1 S1. \uB9E4\uB3C4\uC790 \uD3EC\uD138 (50\uC810)"),
      p("\uAE08\uC735\uAE30\uAD00, \uB300\uBD80\uC5C5\uCCB4, \uC790\uC0B0\uAD00\uB9AC\uD68C\uC0AC\uAC00 NPL\uC744 \uC790\uC720\uB86D\uAC8C \uB4F1\uB85D\uD558\uACE0 \uB9C8\uCF00\uD305\uD558\uACE0 \uB9E4\uAC01\uD560 \uC218 \uC788\uB294 \uC804\uC6A9 \uD3EC\uD138", { italics: true }),
      h3("\uB9E4\uB3C4\uC790 \uC628\uBCF4\uB529 (10\uC810)"),
      bullet("\uAE30\uAD00 \uC720\uD615 \uC120\uD0DD: \uC740\uD589, \uC800\uCD95\uC740\uD589, \uB300\uBD80\uC5C5\uCCB4, AMC, \uBCF4\uD5D8\uC0AC, \uC99D\uAD8C\uC0AC, \uCE90\uD53C\uD138"),
      bullet("\uC0AC\uC5C5\uC790 \uC778\uC99D: \uC0AC\uC5C5\uC790\uB4F1\uB85D\uBC88\uD638 \uC2E4\uC2DC\uAC04 \uAC80\uC99D"),
      bullet("KYC \uC6CC\uD06C\uD50C\uB85C\uC6B0: \uC11C\uB958 \uC5C5\uB85C\uB4DC \u2192 \uAD00\uB9AC\uC790 \uC2EC\uC0AC \u2192 \uC2B9\uC778/\uBC18\uB824"),
      bullet("\uAE30\uAD00 \uD504\uB85C\uD544 \uD398\uC774\uC9C0: \uB85C\uACE0, \uC18C\uAC1C, \uC804\uBB38\uBD84\uC57C, \uAC70\uB798\uC2E4\uC801, \uD3C9\uC810"),
      bullet("\uAD8C\uD55C \uB4F1\uAE09: \uC77C\uBC18/\uD504\uB9AC\uBBF8\uC5C4/\uC5D4\uD130\uD504\uB77C\uC774\uC988"),
      h3("\uB9E4\uBB3C \uB4F1\uB85D \uACE0\uB3C4\uD654 (15\uC810)"),
      bullet("6\uB2E8\uACC4 \uB4F1\uB85D \uC704\uC790\uB4DC: \uAE30\uBCF8\uC815\uBCF4 \u2192 \uCC44\uAD8C \u2192 \uB2F4\uBCF4 \u2192 \uACBD\uB9E4 \u2192 \uB9E4\uAC01\uC870\uAC74 \u2192 \uB9C8\uCF00\uD305"),
      bullet("\uB300\uB7C9 \uB4F1\uB85D: \uC5D1\uC140 + CSV + API \uC5F0\uB3D9"),
      bullet("\uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uBC88\uB4E4 \uB4F1\uB85D: \uC5EC\uB7EC \uB9E4\uBB3C\uC744 \uD558\uB098\uB85C \uBB36\uC5B4 \uC77C\uAD04 \uB9E4\uAC01"),
      bullet("\uC784\uC2DC\uC800\uC7A5/\uC790\uB3D9\uC800\uC7A5, \uB9E4\uBB3C \uBCF5\uC81C"),
      h3("\uB9E4\uB3C4\uC790 \uB300\uC2DC\uBCF4\uB4DC (15\uC810)"),
      bullet("\uB0B4 \uB9E4\uBB3C \uAD00\uB9AC: \uC0C1\uD0DC\uBCC4 \uD544\uD130, \uC131\uACFC \uCC28\uD2B8"),
      bullet("\uC785\uCC30 \uAD00\uB9AC: \uBC1B\uC740 \uC785\uCC30, \uD611\uC0C1 \uB3C4\uAD6C"),
      bullet("\uC218\uC218\uB8CC \uC815\uC0B0: \uAC70\uB798\uC644\uB8CC \uC218\uC218\uB8CC, \uC138\uAE08\uACC4\uC0B0\uC11C"),
      bullet("\uB9C8\uCF00\uD305 \uB3C4\uAD6C: \uBC30\uB108, SNS \uACF5\uC720, \uC774\uBA54\uC77C"),

      h2("3.2 S2. \uB9E4\uC218\uC790 \uD3EC\uD138 (50\uC810)"),
      bullet("\uD22C\uC790\uC790 \uC628\uBCF4\uB529: \uC720\uD615 \uC120\uD0DD, \uD22C\uC790 \uD504\uB85C\uD544, \uD22C\uC790\uC131\uD5A5 \uC9C4\uB2E8"),
      bullet("AI \uB9DE\uCDA4 \uCD94\uCC9C: \uD504\uB85C\uD544 \uAE30\uBC18 \uC790\uB3D9 \uCD94\uCC9C, \uC624\uB298\uC758 \uCD94\uCC9C 3~5\uAC74"),
      bullet("\uD22C\uC790 \uBD84\uC11D \uB3C4\uAD6C: \uD3EC\uD2B8\uD3F4\uB9AC\uC624, 6\uAC74 \uBE44\uAD50, \uC2E4\uC0AC \uCCB4\uD06C\uB9AC\uC2A4\uD2B8"),
      bullet("\uAC70\uB798 \uB3C4\uAD6C: 1:1 \uBB38\uC758, \uAC00\uACA9 \uC81C\uC548, LOI, \uAC70\uB798 \uCD94\uC801"),

      h2("3.3 S3. \uAC70\uB798 \uB9E4\uCE6D \uC5D4\uC9C4 (40\uC810)"),
      bullet("\uC591\uBA74 \uB9E4\uCE6D: \uB9E4\uB3C4\u2192\uB9E4\uC218, \uB9E4\uC218\u2192\uB9E4\uB3C4 \uC790\uB3D9 \uB9E4\uCE6D"),
      bullet("\uC785\uCC30 \uB9C8\uCF00\uD2B8\uD50C\uB808\uC774\uC2A4: \uACF5\uAC1C/\uBE44\uACF5\uAC1C/\uC218\uC758\uACC4\uC57D"),
      bullet("7\uB2E8\uACC4 \uAC70\uB798 \uD750\uB984: \uAD00\uC2EC\u2192NDA\u2192\uC2E4\uC0AC\u2192\uD611\uC0C1\u2192LOI\u2192\uACC4\uC57D\u2192\uC794\uAE08"),

      h2("3.4 S4. \uC2DC\uC7A5 \uC778\uD154\uB9AC\uC804\uC2A4 (30\uC810)"),
      bullet("\uC9C0\uC5ED\uBCC4 \uD788\uD2B8\uB9F5, NPL \uAC00\uACA9 \uC9C0\uC218, \uD22C\uC790 \uC2DC\uADF8\uB110"),
      bullet("\uC8FC\uAC04/\uC6D4\uAC04 AI \uC2DC\uC7A5 \uB9AC\uD3EC\uD2B8"),

      h2("3.5 S5. \uD50C\uB7AB\uD3FC \uC6B4\uC601 (30\uC810)"),
      bullet("\uC694\uAE08\uC81C: Free/Pro/Enterprise"),
      bullet("\uC218\uC218\uB8CC \uC815\uC0B0, \uC774\uBA54\uC77C/\uCE74\uCE74\uC624 \uC54C\uB9BC, \uBCF4\uC548/\uAC10\uC0AC"),
      pb(),

      // === PART 4: INNOVATION ===
      h1("Part 4. Innovation Layer (+100\uC810)"),
      h2("4.1 AI \uBB38\uC11C \uC790\uB3D9\uD654 (25\uC810)"),
      bullet("OCR \uC790\uB3D9 \uC785\uB825: \uB4F1\uAE30\uBD80\uB4F1\uBCF8/\uAC10\uC815\uD3C9\uAC00\uC11C PDF \u2192 AI \uD30C\uC2F1 \u2192 \uB9E4\uBB3C \uC790\uB3D9 \uCC44\uC6C0"),
      bullet("AI \uACC4\uC57D\uC11C \uC790\uB3D9 \uC0DD\uC131: \uD15C\uD50C\uB9BF + \uBCC0\uC218 \uCE58\uD658 + \uBC84\uC804\uAD00\uB9AC"),
      bullet("AI \uC2E4\uC0AC \uB9AC\uD3EC\uD2B8: \uBC95\uB960/\uB2F4\uBCF4/\uC7AC\uBB34/\uC810\uC720 \uC790\uB3D9 \uD3C9\uAC00"),

      h2("4.2 \uC2E4\uC2DC\uAC04 \uB77C\uC774\uBE0C \uACBD\uB9E4 (25\uC810)"),
      bullet("\uC628\uB77C\uC778 \uACBD\uB9E4\uBC29: Supabase Realtime \uAE30\uBC18 \uC2E4\uC2DC\uAC04 \uC785\uCC30"),
      bullet("\uD638\uAC00\uCC3D + \uCE74\uC6B4\uD2B8\uB2E4\uC6B4 + \uC790\uB3D9\uC5F0\uC7A5"),
      bullet("\uACBD\uB9E4 \uCE98\uB9B0\uB354 + \uC54C\uB9BC"),

      h2("4.3 \uBAA8\uBC14\uC77C PWA (20\uC810)"),
      bullet("PWA: \uD648\uD654\uBA74 \uCD94\uAC00, \uC624\uD504\uB77C\uC778, \uD478\uC2DC \uC54C\uB9BC"),
      bullet("\uCE74\uBA54\uB77C \u2192 OCR \u2192 \uB9E4\uBB3C \uB4F1\uB85D"),

      h2("4.4 NPL \uC9C0\uC2DD\uD5C8\uBE0C (15\uC810)"),
      bullet("\uAD50\uC721 \uCF58\uD150\uCE20: \uCD08\uAE09/\uC911\uAE09/\uACE0\uAE09 NPL \uAC15\uC88C"),
      bullet("\uCEE4\uBBA4\uB2C8\uD2F0: \uAC8C\uC2DC\uD310, \uC804\uBB38\uAC00 \uCE7C\uB7FC"),

      h2("4.5 \uC678\uBD80 \uB370\uC774\uD130 \uC5F0\uB3D9 (15\uC810)"),
      bullet("\uACF5\uACF5\uB370\uC774\uD130: \uC2E4\uAC70\uB798\uAC00, \uAC74\uCD95\uBB3C\uB300\uC7A5, \uACF5\uC2DC\uAC00\uACA9"),
      bullet("\uB370\uC774\uD130 API: \uC678\uBD80 \uC2DC\uC2A4\uD15C \uC5F0\uB3D9\uC6A9 REST API"),
      pb(),

      // === PART 5: UI/UX ===
      h1("Part 5. UI/UX \uD601\uC2E0 (+135\uC810)"),
      h2("5.1 UI/UX \uAE30\uC220 (50\uC810)"),
      makeTable(
        ["\uD56D\uBAA9", "\uBC30\uC810", "\uB0B4\uC6A9"],
        [
          ["\uBAA8\uBC14\uC77C \uBC18\uC751\uD615", "15", "8\uAC1C \uD575\uC2EC \uD398\uC774\uC9C0 \uBAA8\uBC14\uC77C \uC644\uBCBD\uD654"],
          ["\uB2E4\uD06C\uBAA8\uB4DC", "10", "\uC804\uCCB4 \uC571 \uB77C\uC774\uD2B8/\uB2E4\uD06C \uC804\uD658"],
          ["\uB9C8\uC774\uD06C\uB85C \uC778\uD130\uB799\uC158", "8", "10\uC885 \uC560\uB2C8\uBA54\uC774\uC158"],
          ["\uB514\uC790\uC778 \uC2DC\uC2A4\uD15C", "7", "\uD1A0\uD070/\uCEF4\uD3EC\uB10C\uD2B8 \uD45C\uC900\uD654"],
          ["\uAE00\uB85C\uBC8C \uAC80\uC0C9 (Cmd+K)", "5", "\uCEE4\uB9E8\uB4DC \uD314\uB808\uD2B8"],
          ["\uC811\uADFC\uC131 (a11y)", "5", "WCAG 2.1 AA"],
        ]
      ),

      h2("5.2 UX \uC0AC\uC6A9\uC131 (85\uC810)"),
      h3("\u2605 3\uB300 \uC0AC\uC6A9\uC131 \uC6D0\uCE59"),
      p("1. 5\uCD08 \uADDC\uCE59: \uC5B4\uB5A4 \uD398\uC774\uC9C0\uB4E0 5\uCD08 \uC548\uC5D0 \uBB34\uC5C7\uC744 \uD574\uC57C \uD558\uB294\uC9C0 \uC54C \uC218 \uC788\uC5B4\uC57C \uD55C\uB2E4", { bold: true }),
      p("2. 3\uD074\uB9AD \uADDC\uCE59: \uC6D0\uD558\uB294 \uC815\uBCF4\uAE4C\uC9C0 \uCD5C\uB300 3\uBC88 \uD074\uB9AD\uC73C\uB85C \uB3C4\uB2EC", { bold: true }),
      p("3. \uC2E4\uC218 \uBC29\uC9C0: \uC798\uBABB \uB204\uB97C \uC218 \uC5C6\uACE0, \uC798\uBABB \uB20C\uB7EC\uB3C4 \uB418\uB3CC\uB9B4 \uC218 \uC788\uB2E4", { bold: true }),

      makeTable(
        ["\uD56D\uBAA9", "\uBC30\uC810"],
        [
          ["\uD0C0\uC774\uD3EC\uADF8\uB798\uD53C/\uAE08\uC561\uD45C\uC2DC \uD1B5\uC77C", "8"],
          ["\uC628\uBCF4\uB529 \uAC00\uC774\uB4DC (\uD22C\uC5B4+\uCCB4\uD06C\uB9AC\uC2A4\uD2B8)", "8"],
          ["\uC2A4\uB9C8\uD2B8 \uD3FC (\uC2E4\uC2DC\uAC04 \uBCC0\uD658, \uC790\uB3D9\uC644\uC131)", "7"],
          ["\uC790\uC5F0\uC5B4 \uAC80\uC0C9 (\uD30C\uC2F1+\uC790\uB3D9\uC644\uC131)", "7"],
          ["\uC0C9\uC0C1 \uC758\uBBF8 \uCCB4\uACC4", "5"],
          ["CTA \uAC00\uC2DC\uC131", "5"],
          ["\uCEE8\uD14D\uC2A4\uD2B8 \uB3C4\uC6C0\uB9D0 (\uC6A9\uC5B4 \uD234\uD301)", "5"],
          ["\uC0C1\uD0DC \uD45C\uC2DC (Empty/Loading/Error/Success)", "5"],
          ["\uD0A4\uBCF4\uB4DC \uB2E8\uCD95\uD0A4", "5"],
          ["\uAC80\uC0C9/\uC0C1\uC138/\uC2DC\uBBAC/\uC785\uCC30 UX \uD601\uC2E0", "20"],
          ["\uC9C4\uD589\uB960 \uC2DC\uAC01\uD654", "4"],
          ["\uB418\uB3CC\uB9AC\uAE30/\uC2E4\uD589\uCDE8\uC18C", "3"],
          ["\uC54C\uB9BC \uACC4\uCE35\uD654", "3"],
        ]
      ),
      pb(),

      // === PART 6: CO-INVEST & EXCHANGE ===
      h1("Part 6. \uACF5\uB3D9\uD22C\uC790 & \uAC70\uB798\uC18C (+170\uC810)"),
      h2("6.1 \uD575\uC2EC \uC6D0\uCE59"),
      p("\u274C \uC870\uAC01\uD22C\uC790 X \u2014 \uB204\uAD6C\uB098 \uC18C\uC561 \uCC38\uC5EC\uD558\uB294 \uC99D\uAD8C\uD615\uC774 \uC544\uB2D9\uB2C8\uB2E4", { bold: true, color: "EF4444" }),
      p("\u2705 \uC790\uACA9 \uC788\uB294 \uC804\uBB38 \uD22C\uC790\uC790\uB9CC \uCC38\uC5EC\uD558\uB294 \uD300 \uAE30\uBC18 \uACF5\uB3D9\uD22C\uC790", { bold: true, color: "10B981" }),

      h2("6.2 \uD22C\uC790\uC790 \uC790\uACA9 \uCCB4\uACC4"),
      makeTable(
        ["\uB4F1\uAE09", "\uC790\uACA9 \uC694\uAC74", "\uAD8C\uD55C"],
        [
          ["Tier 1 \uAE30\uAD00", "\uB300\uBD80\uC5C5\uCCB4/AMC/\uCE90\uD53C\uD138 + \uC790\uBCF8\uAE08 10\uC5B5+", "\uBAA8\uB4E0 \uAE30\uB2A5 + \uD300\uC7A5 + \uAC70\uB798\uC18C + \uB9E4\uBB3C\uB4F1\uB85D"],
          ["Tier 2 \uBC95\uC778", "NPL \uD22C\uC790\uBC95\uC778 + \uC790\uBCF8\uAE08 5\uC5B5+", "\uB2E8\uB3C5/\uACF5\uB3D9 + \uD300\uC7A5 + \uAC70\uB798\uC18C"],
          ["Tier 3 \uC804\uBB38", "\uC790\uACA9\uC99D \uB610\uB294 \uC2E4\uC801 5\uAC74+ \uB610\uB294 \uC21C\uC790\uC0B0 10\uC5B5+", "\uB2E8\uB3C5/\uACF5\uB3D9\uCC38\uC5EC + \uAC70\uB798\uC18C \uC5F4\uB78C"],
          ["\uC77C\uBC18 (\uBD88\uAC00)", "\uBBF8\uCDA9\uC871", "\uAC80\uC0C9/\uBD84\uC11D/\uC2DC\uBBAC\uB808\uC774\uC158\uB9CC"],
        ]
      ),

      h2("6.3 \uACF5\uB3D9\uD22C\uC790 \uD300 \uC2DC\uC2A4\uD15C"),
      bullet("\uD300\uC7A5 (Lead): Tier1/Tier2 \uD544\uC218, \uCD5C\uC18C \uC9C0\uBD84 30%+, \uACC4\uC57D \uCCB4\uACB0 \uAD8C\uD55C"),
      bullet("\uD300\uC6D0 (Co-Investors): Tier1~3 \uBAA8\uB450 \uAC00\uB2A5, 2~10\uBA85, \uAC01\uC790 \uD22C\uC790\uAE08/\uC9C0\uBD84\uC728"),
      bullet("\uC758\uACB0: \uC9C0\uBD84\uC728 \uACFC\uBC18\uC218 \uB610\uB294 \uB9CC\uC7A5\uC77C\uCE58 \uB610\uB294 \uD300\uC7A5 \uB2E8\uB3C5"),
      bullet("\uC218\uC775 \uBD84\uBC30: \uC9C0\uBD84\uC728 \uBE44\uB840 \uC790\uB3D9 \uBD84\uBC30"),

      h2("6.4 \uACF5\uAC1C \uACF5\uB3D9\uD22C\uC790 \uBAA8\uC9D1"),
      bullet("\uD300\uC7A5\uC774 \uD2B9\uC815 \uB9E4\uBB3C\uC5D0 \uB300\uD574 \uACF5\uB3D9\uD22C\uC790\uC790 \uACF5\uAC1C \uBAA8\uC9D1"),
      bullet("\uBAA8\uC9D1 \uD604\uD669 \uC9C4\uD589\uB960 \uBC14 \uD45C\uC2DC"),
      bullet("\uC790\uACA9 \uC778\uC99D\uB41C \uD22C\uC790\uC790\uB9CC \uCC38\uC5EC \uAC00\uB2A5"),

      h2("6.5 NPL \uAC70\uB798\uC18C"),
      p("\uC804\uBB38\uD22C\uC790\uC790\uAC04 NPL \uCC44\uAD8C \uB9E4\uB9E4 (2\uCC28 \uC2DC\uC7A5)", { bold: true }),
      bullet("\uBCF4\uC720 NPL\uC744 \uB2E4\uB978 \uC804\uBB38\uD22C\uC790\uC790\uC5D0\uAC8C \uB9E4\uB3C4"),
      bullet("\uB9E4\uB3C4 \uD638\uAC00 / \uB9E4\uC218 \uD638\uAC00 \uD45C\uC2DC"),
      bullet("\uD611\uC0C1 \u2192 \uCCB4\uACB0 \u2192 \uB51C\uB8F8 \uC790\uB3D9 \uC0DD\uC131"),
      bullet("Tier1/Tier2\uB9CC \uB9E4\uC218/\uB9E4\uB3C4 \uAC00\uB2A5 (Tier3\uC740 \uC5F4\uB78C\uB9CC)"),
      pb(),

      // === PART 7: ROADMAP ===
      h1("Part 7. \uAD6C\uD604 \uB85C\uB4DC\uB9F5"),
      makeTable(
        ["Phase", "\uB0B4\uC6A9", "+\uC810\uC218", "\uB204\uC801", "\uB2EC\uC131\uB960"],
        [
          ["P-A", "Core \uC794\uC5EC \uB9C8\uAC10", "+28", "400", "40%"],
          ["P-B1", "\uB9E4\uB3C4\uC790 \uD3EC\uD138", "+50", "450", "45%"],
          ["P-B2", "\uB9E4\uC218\uC790 \uD3EC\uD138", "+50", "500", "50%"],
          ["P-B3", "\uAC70\uB798 \uB9E4\uCE6D \uC5D4\uC9C4", "+40", "540", "54%"],
          ["P-B4", "\uC2DC\uC7A5 \uC778\uD154\uB9AC\uC804\uC2A4", "+30", "570", "57%"],
          ["P-B5", "\uD50C\uB7AB\uD3FC \uC6B4\uC601", "+30", "600", "60%"],
          ["P-I1", "AI \uBB38\uC11C \uC790\uB3D9\uD654", "+25", "625", "62%"],
          ["P-I2", "\uB77C\uC774\uBE0C \uACBD\uB9E4", "+25", "650", "65%"],
          ["P-I3", "\uBAA8\uBC14\uC77C PWA", "+20", "670", "67%"],
          ["P-I4", "\uC9C0\uC2DD\uD5C8\uBE0C", "+15", "685", "68%"],
          ["P-I5", "\uC678\uBD80 \uC5F0\uB3D9", "+15", "700", "70%"],
          ["P-UX1", "UI/UX \uAE30\uC220", "+50", "750", "75%"],
          ["P-UX2", "UX \uC0AC\uC6A9\uC131", "+85", "835", "83%"],
          ["P-D", "\uACF5\uB3D9\uD22C\uC790 & \uAC70\uB798\uC18C", "+170", "1,005", "100%"],
        ]
      ),
      pb(),

      // === PART 8: TECH ARCHITECTURE ===
      h1("Part 8. \uAE30\uC220 \uC544\uD0A4\uD14D\uCC98"),
      makeTable(
        ["\uACC4\uCE35", "\uAE30\uC220", "\uC6A9\uB3C4"],
        [
          ["Frontend", "Next.js 15.3 + React 19 + TypeScript 5", "SSR/SSG/ISR"],
          ["UI", "shadcn/ui + Tailwind CSS + Framer Motion", "\uCEF4\uD3EC\uB10C\uD2B8"],
          ["\uCC28\uD2B8", "Recharts", "Area/Bar/Pie/Line/Radar"],
          ["\uC9C0\uB3C4", "Kakao Maps SDK", "\uB9C8\uCEE4/\uD074\uB7EC\uC2A4\uD130"],
          ["DB", "Supabase PostgreSQL + RLS", "\uB370\uC774\uD130+\uBCF4\uC548"],
          ["\uC2E4\uC2DC\uAC04", "Supabase Realtime", "\uB51C\uB8F8/\uACBD\uB9E4/\uC54C\uB9BC"],
          ["AI", "Claude API (Anthropic)", "\uBD84\uC11D/\uB9E4\uCE6D/\uCC57\uBD07"],
          ["\uB0B4\uBCF4\uB0B4\uAE30", "xlsx + jsPDF + html2canvas", "Excel/PDF"],
          ["\uBC30\uD3EC", "Vercel", "CDN + Edge + SSR"],
        ]
      ),

      h2("\uCD5C\uC885 \uBAA9\uD45C \uADDC\uBAA8"),
      makeTable(
        ["\uD56D\uBAA9", "\uD604\uC7AC", "\uBAA9\uD45C"],
        [
          ["\uD398\uC774\uC9C0", "68", "150+"],
          ["API \uB77C\uC6B0\uD2B8", "95", "160+"],
          ["DB \uD14C\uC774\uBE14", "12", "30+"],
          ["\uC2DC\uB4DC \uB370\uC774\uD130", "59\uAC74", "200+\uAC74"],
          ["\uCF54\uB4DC \uB77C\uC778", "~150K", "~350K"],
        ]
      ),
      pb(),

      // === PART 9: COMPETITIVE ADVANTAGE ===
      h1("Part 9. \uACBD\uC7C1 \uC6B0\uC704 & \uD574\uC790"),
      makeTable(
        ["\uD56D\uBAA9", "\uAE30\uC874 NPL \uD50C\uB7AB\uD3FC", "NPLatform"],
        [
          ["\uAC80\uC0C9", "\uAE30\uBCF8 \uD544\uD130", "10\uD0ED + AI\uB4F1\uAE09 + 4,026\uC904 \uC9C0\uC5ED\uB370\uC774\uD130"],
          ["\uBD84\uC11D", "\uC218\uB3D9 \uC5D1\uC140 (3\uC77C)", "AI 6\uD0ED \uBD84\uC11D + PDF 7\uD398\uC774\uC9C0 (2\uBD84)"],
          ["\uC785\uCC30", "\uC624\uD504\uB77C\uC778/\uC774\uBA54\uC77C", "\uC628\uB77C\uC778 3\uBC29\uC2DD + \uB77C\uC774\uBE0C\uACBD\uB9E4"],
          ["\uAC70\uB798", "\uB300\uBA74/\uD329\uC2A4", "7\uB2E8\uACC4 \uB514\uC9C0\uD138 + \uC804\uC790\uC11C\uBA85"],
          ["\uD22C\uC790", "\uB2E8\uB3C5\uB9CC", "\uB2E8\uB3C5 + \uACF5\uB3D9\uD22C\uC790 \uD300"],
          ["\uC2DC\uC7A5\uB370\uC774\uD130", "\uC81C\uD55C\uC801", "\uD788\uD2B8\uB9F5 + \uAC00\uACA9\uC9C0\uC218 + \uC2DC\uADF8\uB110"],
          ["AI", "\uC5C6\uC74C", "\uCC57\uBD07 + \uB9E4\uCE6D + \uBD84\uC11D + OCR"],
          ["\uBAA8\uBC14\uC77C", "PC \uC804\uC6A9", "PWA + \uC624\uD504\uB77C\uC778 + \uD478\uC2DC"],
        ]
      ),

      h2("\uACBD\uC7C1 \uD574\uC790 (Moat)"),
      bullet("1. \uB124\uD2B8\uC6CC\uD06C \uD6A8\uACFC: \uB9E4\uB3C4\uC790\u2191 \u2192 \uB9E4\uBB3C\u2191 \u2192 \uB9E4\uC218\uC790\u2191 \u2192 \uAC70\uB798\u2191 (\uC591\uBA74 \uD50C\uB77C\uC774\uD720)"),
      bullet("2. \uB370\uC774\uD130 \uD574\uC790: \uAC70\uB798 \uCD95\uC801 \u2192 AI \uC815\uD655\uB3C4\u2191 \u2192 \uACBD\uC7C1\uC0AC \uCD94\uC6D4 \uBD88\uAC00"),
      bullet("3. \uC804\uD658 \uBE44\uC6A9: \uAE30\uAD00\uC774 \uB4F1\uB85D/\uC815\uC0B0/\uD788\uC2A4\uD1A0\uB9AC\uB97C \uC313\uC73C\uBA74 \uC774\uD0C8 \uC5B4\uB824\uC6C0"),
      bullet("4. \uBE0C\uB79C\uB4DC/\uC2E0\uB8B0: NPL \uAC70\uB798 = \uACE0\uC561 + \uC804\uBB38\uC131 \u2192 \uC2E0\uB8B0 \uAD6C\uCD95\uD55C \uD50C\uB7AB\uD3FC \uB3C5\uC810"),
      bullet("5. \uAE30\uC220 \uC6B0\uC704: AI OCR, \uB77C\uC774\uBE0C \uACBD\uB9E4, \uB9E4\uCE6D \uC5D4\uC9C4 \u2192 \uCE74\uD53C\uCEBF \uC5B4\uB824\uC6C0"),
      pb(),

      // === PART 10: ECOSYSTEM ===
      h1("Part 10. NPL \uC0DD\uD0DC\uACC4 (1,195\uC810)"),
      h2("10.1 18\uC885 \uCC38\uC5EC\uC790 \uC5ED\uD560"),
      makeTable(
        ["\uAD6C\uBD84", "\uC5ED\uD560", "\uD50C\uB7AB\uD3FC \uB0B4 \uD65C\uB3D9"],
        [
          ["\uACF5\uAE09\uCE21", "\uCC44\uAD8C \uB9E4\uAC01\uC758\uB8B0 \uAE08\uC735\uAE30\uAD00", "NPL \uB9E4\uBB3C \uB4F1\uB85D, \uC785\uCC30 \uAD00\uB9AC, \uB099\uCC30"],
          ["\uACF5\uAE09\uCE21", "\uB300\uCD9C \uAE08\uC735\uAE30\uAD00", "\uBD80\uC2E4\uCC44\uAD8C \uB9E4\uAC01 \uB4F1\uB85D"],
          ["\uACF5\uAE09\uCE21", "AMC (\uC790\uC0B0\uAD00\uB9AC\uD68C\uC0AC)", "\uC704\uD0C1 \uB9E4\uBB3C \uAD00\uB9AC, \uD3EC\uD2B8\uD3F4\uB9AC\uC624"],
          ["\uC218\uC694\uCE21", "\uB300\uBD80\uC5C5\uCCB4", "NPL \uB9E4\uC785/\uB9E4\uAC01 \uC591\uBA74, \uACF5\uB3D9\uD22C\uC790"],
          ["\uC218\uC694\uCE21", "\uC790\uC0B0\uC6B4\uC6A9\uC0AC", "\uD380\uB4DC \uD3EC\uD2B8\uD3F4\uB9AC\uC624, \uB300\uD615 \uB9E4\uC785"],
          ["\uC218\uC694\uCE21", "\uACBD\uB9E4/\uACF5\uB9E4 \uD22C\uC790\uC790", "\uACBD\uB9E4 \uAC80\uC0C9, \uC2DC\uBBAC\uB808\uC774\uD130, AI \uBD84\uC11D"],
          ["\uC218\uC694\uCE21", "\uC790\uC0B0\uAC00 (\uC804\uBB38\uD22C\uC790\uC790)", "\uB2E8\uB3C5/\uACF5\uB3D9 \uD22C\uC790, \uD3EC\uD2B8\uD3F4\uB9AC\uC624"],
          ["\uC804\uBB38\uC11C\uBE44\uC2A4", "\uBC95\uBB34\uBC95\uC778", "\uAD8C\uB9AC\uBD84\uC11D, \uACC4\uC57D\uAC80\uD1A0, \uBA85\uB3C4"],
          ["\uC804\uBB38\uC11C\uBE44\uC2A4", "\uC138\uBB34/\uD68C\uACC4\uBC95\uC778", "\uC138\uAE08\uACC4\uC0B0, \uC808\uC138, \uC218\uC775\uB960 \uAC80\uC99D"],
          ["\uC804\uBB38\uC11C\uBE44\uC2A4", "\uACF5\uC778\uC911\uAC1C\uC0AC", "\uD604\uC7A5\uC2E4\uC0AC, \uBA85\uB3C4, \uB9E4\uAC01 \uC911\uAC1C"],
          ["\uC804\uBB38\uC11C\uBE44\uC2A4", "\uCEE8\uC124\uD134\uD2B8", "\uD22C\uC790\uC804\uB7B5, \uB9AC\uC11C\uCE58, \uAD50\uC721"],
          ["\uD30C\uD2B8\uB108", "\uC601\uC5C5 \uD30C\uD2B8\uB108", "\uB9AC\uB4DC \uC18C\uAC1C, \uC218\uC218\uB8CC \uC815\uC0B0"],
          ["\uD30C\uD2B8\uB108", "\uB9C8\uCF00\uD305/\uC5B8\uB860\uC0AC", "\uCF58\uD150\uCE20, \uC2DC\uC7A5 \uB370\uC774\uD130 \uD65C\uC6A9"],
          ["\uBD80\uB3D9\uC0B0", "\uC2DC\uD589\uC0AC/\uC2DC\uACF5\uC0AC", "\uAC1C\uBC1C \uD504\uB85C\uC81D\uD2B8, \uACAC\uC801 \uC11C\uBE44\uC2A4"],
        ]
      ),

      h2("10.2 \uC804\uBB38 \uC11C\uBE44\uC2A4 \uB9C8\uCF00\uD2B8\uD50C\uB808\uC774\uC2A4"),
      bullet("\uBC95\uB960 \uC11C\uBE44\uC2A4: \uAD8C\uB9AC\uBD84\uC11D, \uACC4\uC57D\uAC80\uD1A0, \uBA85\uB3C4\uC18C\uC1A1, \uBC30\uB2F9\uAE08 \uCCAD\uAD6C"),
      bullet("\uC138\uBB34/\uD68C\uACC4: \uC591\uB3C4\uC18C\uB4DD\uC138, \uBC95\uC778\uC138 \uC808\uC138, \uC218\uC775\uB960 \uAC80\uC99D"),
      bullet("\uBD80\uB3D9\uC0B0 \uC911\uAC1C: \uD604\uC7A5\uC2E4\uC0AC, \uBA85\uB3C4\uD611\uC758, \uB9E4\uAC01 \uCC98\uBD84"),
      bullet("\uCEE8\uC124\uD305: 1:1 \uC0C1\uB2F4, \uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uC9C4\uB2E8, \uC2DC\uC7A5 \uB9AC\uC11C\uCE58"),
      bullet("\uC2DC\uD589/\uC2DC\uACF5: \uAC1C\uBC1C \uD504\uB85C\uC81D\uD2B8, \uB9AC\uBAA8\uB378\uB9C1"),

      h2("10.3 \uC2E0\uB8B0/\uD3C9\uD310 \uC2DC\uC2A4\uD15C"),
      bullet("\uBAA8\uB4E0 \uCC38\uC5EC\uC790\uC5D0\uAC8C \uD3C9\uD310 \uC810\uC218 \uBD80\uC5EC (\uAC70\uB798 \uC2E4\uC801, \uD3C9\uAC00, \uC751\uB2F5\uC18D\uB3C4)"),
      bullet("\uB4F1\uAE09: \uD50C\uB798\uD2F0\uB118(5%) > \uACE8\uB4DC(20%) > \uC2E4\uBC84(50%) > \uBE0C\uB860\uC988 > \uC2E0\uADDC"),
      bullet("\uD50C\uB798\uD2F0\uB118: \uC218\uC218\uB8CC 20% \uD560\uC778, \uCD94\uCC9C\uB9E4\uBB3C \uC6B0\uC120 \uB178\uCD9C"),

      h2("10.4 \uC0DD\uD0DC\uACC4 \uC810\uC218: +190\uC810"),
      makeTable(
        ["\uD56D\uBAA9", "\uBC30\uC810"],
        [
          ["18\uC885 \uC5ED\uD560\uBCC4 \uC804\uC6A9 \uAE30\uB2A5", "50"],
          ["\uC804\uBB38 \uC11C\uBE44\uC2A4 \uB9C8\uCF00\uD2B8\uD50C\uB808\uC774\uC2A4", "30"],
          ["\uACAC\uC801/\uC758\uB8B0 \uC2DC\uC2A4\uD15C", "20"],
          ["\uC218\uC775 \uBD84\uBC30 \uC0DD\uD0DC\uACC4", "15"],
          ["\uC2E0\uB8B0/\uD3C9\uD310 \uC2DC\uC2A4\uD15C", "20"],
          ["\uC5ED\uD560\uBCC4 \uB300\uC2DC\uBCF4\uB4DC", "30"],
          ["DB \uC2A4\uD0A4\uB9C8 + API", "25"],
        ]
      ),
      pb(),

      // === PART 11: CONCLUSION ===
      h1("Part 11. \uACB0\uB860"),
      p("NPLatform\uC740 30\uC870\uC6D0 \uADDC\uBAA8\uC758 \uD55C\uAD6D NPL \uC2DC\uC7A5\uC744 \uB514\uC9C0\uD138\uD654\uD558\uB294 \uC720\uC77C\uD55C \uD50C\uB7AB\uD3FC\uC785\uB2C8\uB2E4."),
      p("AI \uAE30\uBC18 \uBD84\uC11D, \uC591\uBA74 \uB9E4\uCE6D, \uC804\uBB38\uD22C\uC790\uC790 \uACF5\uB3D9\uD22C\uC790, \uC2E4\uC2DC\uAC04 \uAC70\uB798\uC18C\uB97C \uD1B5\uD574 NPL \uAC70\uB798\uC758 \uBAA8\uB4E0 \uACFC\uC815\uC744 \uD601\uC2E0\uD569\uB2C8\uB2E4."),
      new Paragraph({ spacing: { before: 400 } }),
      p("\uCD5C\uC885 \uC810\uC218: 1,195\uC810 (\uC804\uCCB4 \uC0DD\uD0DC\uACC4 \uC644\uC131 \uC2DC)", { bold: true, size: 28, color: "1B3A5C" }),
      p("\uC720\uB2C8\uCF58 \uAC00\uB2A5\uC131: \u2B50\u2B50\u2B50\u2B50 (5\uC810 \uB9CC\uC810 \uC911 4\uC810)", { bold: true, size: 24 }),
      p("3\uB144\uCC28 \uBAA9\uD45C ARR: 40\uC5B5\uC6D0", { bold: true }),
      p("TAM: 3,000\uC5B5\uC6D0/\uB144 (\uAD6D\uB0B4) + \uC77C\uBCF8/\uB3D9\uB0A8\uC544 \uD655\uC7A5 \uC2DC 10\uBC30", { bold: true }),
      p("18\uC885 \uC774\uD574\uAD00\uACC4\uC790\uAC00 \uD568\uAED8 \uC6C0\uC9C1\uC774\uB294 NPL \uC0DD\uD0DC\uACC4", { bold: true }),

      new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "NPLatform \u2014 \uBD80\uC2E4\uCC44\uAD8C \uAC70\uB798\uC758 \uBAA8\uB4E0 \uAC83", size: 28, bold: true, font: "Arial", color: "1B3A5C" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "(\uC8FC)\uD2B8\uB79C\uC2A4\uD30C\uBA38 | TransFarmer Inc. | 2026", size: 20, font: "Arial", color: "999999" })] }),
    ]
  }]
});

const outPath = "C:\\Users\\82106\\Desktop\\nplatform\\docs\\NPLatform_\uC885\uD569\uAE30\uD68D\uC11C_v5_Final.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log("Created: " + outPath);
  console.log("Size: " + (buffer.length / 1024).toFixed(0) + " KB");
});
