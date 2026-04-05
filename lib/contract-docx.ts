/**
 * Contract DOCX Generation using the docx package
 *
 * Generates a proper .docx file with:
 * - Title styling (centered, bold, 16pt)
 * - Body paragraphs (12pt, justified)
 * - Table for party info
 * - Signature section
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  PageBreak,
  Packer,
  Footer,
  PageNumber,
  NumberFormat,
  Tab,
  TabStopPosition,
  TabStopType,
} from "docx"

interface ContractDOCXData {
  contractType: string
  partyA: string
  partyB: string
  contractBody: string
  date: string
  organizationName?: string
}

/**
 * Generate a contract DOCX
 */
export async function generateContractDOCX(
  contractType: string,
  data: ContractDOCXData
): Promise<Blob> {
  // Parse the body into sections/paragraphs
  const bodyParagraphs = parseBodyToParagraphs(data.contractBody)

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Malgun Gothic",
            size: 24, // 12pt
          },
          paragraph: {
            spacing: { after: 120, line: 360 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: {
              top: 1440,   // ~1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
            pageNumbers: {
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: "999999",
                    font: "Malgun Gothic",
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "NPLatform Contract Generator",
                    size: 14,
                    color: "AAAAAA",
                    font: "Malgun Gothic",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ─── Letterhead ───
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: data.organizationName || "NPLatform",
                bold: true,
                size: 28,
                color: "1B3A5C",
                font: "Malgun Gothic",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: "1B3A5C" },
            },
            children: [
              new TextRun({
                text: "NPL Trading Platform",
                size: 18,
                color: "888888",
                font: "Malgun Gothic",
              }),
            ],
          }),

          // ─── Contract Title ───
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
            children: [
              new TextRun({
                text: contractType,
                bold: true,
                size: 32, // 16pt
                color: "1B3A5C",
                font: "Malgun Gothic",
              }),
            ],
          }),

          // ─── Party Info Table ───
          createPartyInfoTable(data.partyA, data.partyB, data.date),

          // Spacer
          new Paragraph({ spacing: { before: 200, after: 200 }, children: [] }),

          // ─── Contract Body Paragraphs ───
          ...bodyParagraphs,

          // Spacer before signature
          new Paragraph({ spacing: { before: 600, after: 200 }, children: [] }),

          // ─── Date ───
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: data.date,
                size: 20,
                color: "666666",
                font: "Malgun Gothic",
              }),
            ],
          }),

          // ─── Signature Section ───
          createSignatureTable(),

          // ─── Footer note ───
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 600 },
            border: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" },
            },
            children: [
              new TextRun({
                text: "NPLatform Contract Generator",
                size: 16,
                color: "AAAAAA",
                font: "Malgun Gothic",
              }),
            ],
          }),
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}

function createPartyInfoTable(partyA: string, partyB: string, date: string): Table {
  const cellBorder = {
    top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
    right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
  }

  const makeRow = (label: string, value: string) =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 2400, type: WidthType.DXA },
          borders: cellBorder,
          shading: { fill: "F0F4F8" },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: label,
                  bold: true,
                  size: 20,
                  font: "Malgun Gothic",
                  color: "1B3A5C",
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 6600, type: WidthType.DXA },
          borders: cellBorder,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: value,
                  size: 20,
                  font: "Malgun Gothic",
                }),
              ],
            }),
          ],
        }),
      ],
    })

  return new Table({
    rows: [
      makeRow("(Gap) Party A", partyA),
      makeRow("(Eul) Party B", partyB),
      makeRow("Date", date),
    ],
    width: { size: 9000, type: WidthType.DXA },
  })
}

function createSignatureTable(): Table {
  const noBorder = {
    top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  }
  const bottomBorder = {
    ...noBorder,
    bottom: { style: BorderStyle.SINGLE, size: 1, color: "333333" },
  }

  return new Table({
    rows: [
      // Labels
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4000, type: WidthType.DXA },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "(Gap)", size: 18, color: "666666", font: "Malgun Gothic" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            borders: noBorder,
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            width: { size: 4000, type: WidthType.DXA },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "(Eul)", size: 18, color: "666666", font: "Malgun Gothic" }),
                ],
              }),
            ],
          }),
        ],
      }),
      // Signature lines (blank space)
      new TableRow({
        height: { value: 800, rule: "exact" as any },
        children: [
          new TableCell({
            width: { size: 4000, type: WidthType.DXA },
            borders: bottomBorder,
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            borders: noBorder,
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            width: { size: 4000, type: WidthType.DXA },
            borders: bottomBorder,
            children: [new Paragraph({ children: [] })],
          }),
        ],
      }),
      // Seal labels
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4000, type: WidthType.DXA },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Signature / Seal", size: 16, color: "999999", font: "Malgun Gothic" }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            borders: noBorder,
            children: [new Paragraph({ children: [] })],
          }),
          new TableCell({
            width: { size: 4000, type: WidthType.DXA },
            borders: noBorder,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: "Signature / Seal", size: 16, color: "999999", font: "Malgun Gothic" }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
    width: { size: 9000, type: WidthType.DXA },
  })
}

function parseBodyToParagraphs(body: string): Paragraph[] {
  const lines = body.split("\n")
  const paragraphs: Paragraph[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      // Empty line spacer
      paragraphs.push(
        new Paragraph({ spacing: { before: 100, after: 100 }, children: [] })
      )
      continue
    }

    // Detect article headers (e.g., "제1조", "제2조")
    const isArticle = /^제\d+조/.test(trimmed)
    // Detect section titles (first line, all-caps-like)
    const isSectionTitle = /^[━━]+/.test(trimmed) || /^(채권양도|비밀유지|실사|자문|업무협약|서비스이용)/.test(trimmed)

    if (isArticle) {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 200, after: 100 },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 24,
              font: "Malgun Gothic",
              color: "1B3A5C",
            }),
          ],
        })
      )
    } else if (isSectionTitle) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 300, after: 200 },
          children: [
            new TextRun({
              text: trimmed,
              bold: true,
              size: 28,
              font: "Malgun Gothic",
              color: "1B3A5C",
            }),
          ],
        })
      )
    } else {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 80, line: 360 },
          children: [
            new TextRun({
              text: trimmed,
              size: 24,
              font: "Malgun Gothic",
            }),
          ],
        })
      )
    }
  }

  return paragraphs
}

/**
 * Helper to parse contract text into structured data for DOCX generation
 */
export function parseContractForDOCX(
  contractType: string,
  contractText: string,
  options?: {
    organizationName?: string
  }
): ContractDOCXData {
  const lines = contractText.split("\n").filter((l) => l.trim())

  let partyA = ""
  let partyB = ""
  let date = new Date().toISOString().split("T")[0]

  for (const line of lines) {
    if (line.includes("양도인") || line.includes("공개자") || line.includes("위임인") || line.includes("의뢰인") || line.includes("갑:") || line.includes("서비스 제공자")) {
      const parts = line.split(":")
      if (parts.length > 1) partyA = parts.slice(1).join(":").trim().replace(/\(서명\)/, "").trim()
    }
    if (line.includes("양수인") || line.includes("수신자") || line.includes("수임인") || line.includes("자문인") || line.includes("을:") || line.includes("이용자")) {
      const parts = line.split(":")
      if (parts.length > 1) partyB = parts.slice(1).join(":").trim().replace(/\(서명\)/, "").trim()
    }
    if (line.includes("계약일:")) {
      const parts = line.split(":")
      if (parts.length > 1) date = parts.slice(1).join(":").trim()
    }
  }

  return {
    contractType,
    partyA: partyA || "TBD",
    partyB: partyB || "TBD",
    contractBody: contractText,
    date,
    organizationName: options?.organizationName,
  }
}
