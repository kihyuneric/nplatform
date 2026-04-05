/**
 * Contract PDF Generation using jsPDF
 *
 * NOTE: For proper Korean font support, integrate NanumGothic or similar
 * Korean-compatible font as a custom font in jsPDF. Currently uses Helvetica
 * as a fallback which may not render Korean characters correctly in all viewers.
 * To add Korean fonts, convert NanumGothic.ttf to base64 and register via
 * doc.addFileToVFS() + doc.addFont().
 */

import { jsPDF } from "jspdf"

// Conditionally import autotable
let autoTable: any = null
try {
  autoTable = require("jspdf-autotable").default
} catch {
  // jspdf-autotable not available
}

interface ContractPDFData {
  contractType: string
  partyA: string
  partyB: string
  contractBody: string
  date: string
  organizationName?: string
}

/**
 * Generate a contract PDF in A4 format
 */
export function generateContractPDF(
  contractType: string,
  data: ContractPDFData
): Blob {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 25
  const contentWidth = pageWidth - margin * 2
  let y = margin

  // ─── Helper: add page footer ───
  const addFooter = (pageNum: number, totalPages: number) => {
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(
      `- ${pageNum} / ${totalPages} -`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    )
    doc.text(
      "NPLatform Contract Generator",
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    )
  }

  // ─── Helper: check page break ───
  const checkPageBreak = (requiredHeight: number) => {
    if (y + requiredHeight > pageHeight - 30) {
      doc.addPage()
      y = margin
    }
  }

  // ─── DRAFT Watermark ───
  doc.setFontSize(60)
  doc.setTextColor(230, 230, 230)
  doc.text("DRAFT", pageWidth / 2, pageHeight / 2, {
    align: "center",
    angle: 45,
  })

  // ─── Letterhead ───
  doc.setDrawColor(27, 58, 92) // #1B3A5C
  doc.setLineWidth(0.5)

  // Logo placeholder box
  const logoSize = 12
  doc.setFillColor(27, 58, 92)
  doc.roundedRect(pageWidth / 2 - logoSize / 2, y, logoSize, logoSize, 2, 2, "F")
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text("NP", pageWidth / 2, y + logoSize / 2 + 1, { align: "center" })
  y += logoSize + 4

  // Organization name
  doc.setFontSize(12)
  doc.setTextColor(27, 58, 92)
  doc.text(data.organizationName || "NPLatform", pageWidth / 2, y, {
    align: "center",
  })
  y += 5

  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text("NPL Trading Platform", pageWidth / 2, y, { align: "center" })
  y += 4

  // Divider line
  doc.setDrawColor(27, 58, 92)
  doc.setLineWidth(0.8)
  doc.line(margin, y, pageWidth - margin, y)
  y += 12

  // ─── Contract Title ───
  doc.setFontSize(18)
  doc.setTextColor(27, 58, 92)
  doc.text(contractType, pageWidth / 2, y, { align: "center" })
  y += 14

  // ─── Party Information Table ───
  if (autoTable) {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["", ""]],
      body: [
        ["(Gap) Party A", data.partyA],
        ["(Eul) Party B", data.partyB],
        ["Date", data.date],
      ],
      theme: "grid",
      headStyles: { fillColor: [27, 58, 92], fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: "bold" },
        1: { cellWidth: contentWidth - 40 },
      },
      showHead: false,
    })
    y = (doc as any).lastAutoTable.finalY + 10
  } else {
    // Fallback: plain text party info
    doc.setFontSize(10)
    doc.setTextColor(60)
    doc.text(`(Gap) : ${data.partyA}`, margin, y)
    y += 6
    doc.text(`(Eul) : ${data.partyB}`, margin, y)
    y += 6
    doc.text(`Date : ${data.date}`, margin, y)
    y += 12
  }

  // ─── Contract Body ───
  doc.setFontSize(10)
  doc.setTextColor(30)

  const bodyLines = doc.splitTextToSize(data.contractBody, contentWidth)

  for (const line of bodyLines) {
    checkPageBreak(6)
    doc.text(line, margin, y)
    y += 5.5
  }

  // ─── Signature Area ───
  checkPageBreak(60)
  y += 15

  doc.setDrawColor(100)
  doc.setLineWidth(0.3)

  // Date
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(data.date, pageWidth - margin, y, { align: "right" })
  y += 12

  // Signature blocks
  const sigBlockWidth = (contentWidth - 20) / 2
  const leftX = margin
  const rightX = margin + sigBlockWidth + 20

  // Labels
  doc.setFontSize(9)
  doc.setTextColor(100)
  doc.text("(Gap)", leftX + sigBlockWidth / 2, y, { align: "center" })
  doc.text("(Eul)", rightX + sigBlockWidth / 2, y, { align: "center" })
  y += 20

  // Signature lines
  doc.line(leftX, y, leftX + sigBlockWidth, y)
  doc.line(rightX, y, rightX + sigBlockWidth, y)
  y += 5

  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text("Signature / Seal", leftX + sigBlockWidth / 2, y, { align: "center" })
  doc.text("Signature / Seal", rightX + sigBlockWidth / 2, y, { align: "center" })

  // ─── Add page numbers to all pages ───
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(i, totalPages)
  }

  return doc.output("blob")
}

/**
 * Helper to parse contract text into structured data for PDF generation
 */
export function parseContractForPDF(
  contractType: string,
  contractText: string,
  options?: {
    organizationName?: string
  }
): ContractPDFData {
  const lines = contractText.split("\n").filter((l) => l.trim())

  // Try to extract party names from the text
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
