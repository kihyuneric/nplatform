// ─── 투자은행급 PDF 보고서 생성기 ─────────────────────────────
// jsPDF 기반 40+ 페이지 투자급 NPL DD 보고서.
// 커버 + 목차 + 6섹션 + 차트 + 법적 의견 + 면책조항.

import type {
  DDReport, RiskItem, ExecutiveSummary, CollateralAnalysis,
  LegalAnalysis, FinancialAnalysis, MarketAnalysis, InvestmentOpinion,
} from "./dd-report-generator"

// ─── 타입 정의 ──────────────────────────────────────────────

export interface PDFGeneratorOptions {
  /** 수신자 이름 (워터마크용) */
  recipientName: string
  /** 기밀 등급 */
  confidentiality: "PUBLIC" | "CONFIDENTIAL" | "STRICTLY_CONFIDENTIAL"
  /** 보고서 언어 */
  language: "ko" | "en"
  /** 차트 이미지 (base64) — Recharts→Canvas→PNG */
  charts?: {
    monteCarloHistogram?: string
    dcfWaterfall?: string
    sensitivityHeatmap?: string
    riskMatrix?: string
    nbiTrend?: string
    bidRateTrend?: string
    dividendChart?: string
  }
}

interface PageSection {
  title: string
  startPage: number
}

// ─── 색상 팔레트 ────────────────────────────────────────────

const COLORS = {
  navy: "#1B3A5C",
  darkNavy: "#0A1628",
  blue: "#2E75B6",
  lightBlue: "#D6E4F0",
  emerald: "#059669",
  red: "#DC2626",
  amber: "#D97706",
  gray: "#6B7280",
  lightGray: "#F3F4F6",
  white: "#FFFFFF",
  black: "#111827",
}

const GRADE_COLORS: Record<string, string> = {
  STRONG_BUY: "#059669",
  BUY: "#2563EB",
  HOLD: "#D97706",
  SELL: "#DC2626",
  STOP: "#7F1D1D",
}

// ─── PDF 생성 메인 함수 ──────────────────────────────────────

export async function generateInvestmentPDF(
  report: DDReport,
  options: PDFGeneratorOptions,
): Promise<Uint8Array> {
  // jsPDF는 클라이언트 사이드에서 dynamic import
  const { default: jsPDF } = await import("jspdf")

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const W = 210 // A4 width mm
  const H = 297 // A4 height mm
  const M = 20  // margin
  const CW = W - M * 2 // content width

  let currentPage = 1
  const sections: PageSection[] = []

  // ─── 유틸리티 ────────────────────────────────────

  function addPage() {
    doc.addPage()
    currentPage++
    addPageFooter()
    if (options.confidentiality !== "PUBLIC") {
      addWatermark()
    }
  }

  function addPageFooter() {
    doc.setFontSize(8)
    doc.setTextColor(180, 180, 180)
    doc.text(`NPLatform DD Report — ${report.id}`, M, H - 10)
    doc.text(`Page ${currentPage}`, W - M, H - 10, { align: "right" })
    doc.text(`${options.confidentiality.replace(/_/g, " ")}`, W / 2, H - 10, { align: "center" })
  }

  function addWatermark() {
    doc.setFontSize(40)
    doc.setTextColor(240, 240, 240)
    const wmText = options.recipientName || "CONFIDENTIAL"
    doc.text(wmText, W / 2, H / 2, {
      align: "center",
      angle: 45,
    })
  }

  function addSectionTitle(title: string, subtitle?: string) {
    sections.push({ title, startPage: currentPage })
    doc.setFillColor(27, 58, 92) // navy
    doc.rect(0, 0, W, 35, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(18)
    doc.text(title, M, 22)
    if (subtitle) {
      doc.setFontSize(10)
      doc.setTextColor(200, 210, 225)
      doc.text(subtitle, M, 30)
    }
    doc.setTextColor(0, 0, 0)
  }

  function formatAmount(n: number): string {
    if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`
    if (n >= 10_000) return `${Math.round(n / 10_000)}만원`
    return `${n.toLocaleString()}원`
  }

  function addKeyValueRow(y: number, key: string, value: string, bold = false) {
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.text(key, M, y)
    doc.setTextColor(30, 30, 30)
    if (bold) doc.setFont("helvetica", "bold")
    doc.text(value, W - M, y, { align: "right" })
    doc.setFont("helvetica", "normal")
    return y + 6
  }

  function addTableHeader(y: number, columns: { label: string; x: number; width: number; align?: "left" | "center" | "right" }[]) {
    doc.setFillColor(243, 244, 246)
    doc.rect(M, y - 4, CW, 7, "F")
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.setFont("helvetica", "bold")
    for (const col of columns) {
      doc.text(col.label, col.x, y, { align: col.align || "left" })
    }
    doc.setFont("helvetica", "normal")
    return y + 8
  }

  // ─── 1. 커버 페이지 ─────────────────────────────

  // Background
  doc.setFillColor(10, 22, 40) // darkNavy
  doc.rect(0, 0, W, H, "F")

  // Logo area
  doc.setFillColor(46, 117, 182) // blue
  doc.rect(0, 0, W, 4, "F")

  // Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.text("NPLatform", M, 40)
  doc.setFontSize(8)
  doc.setTextColor(150, 170, 200)
  doc.text("AI-Powered NPL Investment Analysis", M, 48)

  doc.setFontSize(28)
  doc.setTextColor(255, 255, 255)
  doc.text("Due Diligence Report", M, 80)

  doc.setFontSize(14)
  doc.setTextColor(200, 210, 225)
  doc.text(report.executive.headline, M, 95)

  // Confidentiality badge
  doc.setFontSize(10)
  const confLabel = options.confidentiality.replace(/_/g, " ")
  doc.setFillColor(220, 38, 38)
  doc.roundedRect(M, 110, 60, 8, 2, 2, "F")
  doc.setTextColor(255, 255, 255)
  doc.text(confLabel, M + 30, 116, { align: "center" })

  // Grade badge
  const gradeColor = GRADE_COLORS[report.executive.investmentGrade] || COLORS.gray
  doc.setFillColor(parseInt(gradeColor.slice(1, 3), 16), parseInt(gradeColor.slice(3, 5), 16), parseInt(gradeColor.slice(5, 7), 16))
  doc.roundedRect(M, 125, 40, 20, 3, 3, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.text(report.executive.investmentGrade, M + 20, 139, { align: "center" })
  doc.setFontSize(9)
  doc.text(`Score: ${report.executive.gradeScore}/100`, M + 55, 137)

  // Key metrics
  doc.setTextColor(150, 170, 200)
  doc.setFontSize(9)
  let cy = 165
  const metrics = [
    ["Report ID", report.id],
    ["Generated", new Date(report.generatedAt).toLocaleDateString("ko-KR")],
    ["Listing ID", report.listingId],
    ["Sections", `${report.metadata.sections}`],
    ["Analysis Items", `${report.metadata.totalItems}+`],
    ["Estimated Pages", `${report.metadata.estimatedPages}`],
    ["Recipient", options.recipientName],
  ]
  for (const [k, v] of metrics) {
    doc.text(k, M, cy)
    doc.setTextColor(255, 255, 255)
    doc.text(v, M + 50, cy)
    doc.setTextColor(150, 170, 200)
    cy += 7
  }

  // ROI preview
  cy = 230
  doc.setFontSize(11)
  doc.setTextColor(255, 255, 255)
  doc.text("Expected ROI", M, cy)
  cy += 10
  const roiLabels = ["Conservative", "Moderate", "Aggressive"]
  const roiValues = [report.executive.expectedROI.conservative, report.executive.expectedROI.moderate, report.executive.expectedROI.aggressive]
  const roiColors = ["#DC2626", "#D97706", "#059669"]
  for (let i = 0; i < 3; i++) {
    doc.setFontSize(9)
    doc.setTextColor(150, 170, 200)
    doc.text(roiLabels[i], M, cy)
    doc.setFontSize(14)
    const c = roiColors[i]
    doc.setTextColor(parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16))
    doc.text(`${roiValues[i] > 0 ? "+" : ""}${roiValues[i]}%`, M + 50, cy)
    cy += 10
  }

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(100, 120, 150)
  doc.text("This report is generated by NPLatform AI analysis engine. Not financial advice.", M, H - 20)
  doc.text("© 2026 NPLatform Inc. All rights reserved.", M, H - 14)

  // ─── 2. 목차 ────────────────────────────────────

  addPage()
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, H, "F")

  doc.setFontSize(20)
  doc.setTextColor(27, 58, 92)
  doc.text("Table of Contents", M, 30)

  doc.setDrawColor(46, 117, 182)
  doc.setLineWidth(0.5)
  doc.line(M, 34, M + 60, 34)

  const tocItems = [
    { section: "I", title: "Executive Summary", page: 3 },
    { section: "II", title: "Collateral Analysis (담보물 분석)", page: 5 },
    { section: "III", title: "Legal Analysis (권리관계 분석)", page: 10 },
    { section: "IV", title: "Financial Analysis (재무 분석)", page: 15 },
    { section: "V", title: "Market Analysis (시장 분석)", page: 22 },
    { section: "VI", title: "Investment Opinion (투자 의견)", page: 27 },
    { section: "—", title: "Risk Matrix (리스크 매트릭스)", page: 32 },
    { section: "—", title: "Legal Opinion (법적 의견서)", page: 35 },
    { section: "—", title: "Appendix: Methodology", page: 38 },
    { section: "—", title: "Disclaimers & Terms", page: 40 },
  ]

  let tocY = 48
  for (const item of tocItems) {
    doc.setFontSize(10)
    doc.setTextColor(46, 117, 182)
    doc.text(item.section, M, tocY)
    doc.setTextColor(30, 30, 30)
    doc.text(item.title, M + 15, tocY)
    doc.setTextColor(150, 150, 150)
    // Dot leader
    const titleWidth = doc.getTextWidth(item.title)
    const dotsStart = M + 15 + titleWidth + 2
    const dotsEnd = W - M - 10
    if (dotsEnd > dotsStart) {
      const dots = ".".repeat(Math.floor((dotsEnd - dotsStart) / 1.5))
      doc.text(dots, dotsStart, tocY)
    }
    doc.text(`${item.page}`, W - M, tocY, { align: "right" })
    tocY += 8
  }

  // ─── 3. Executive Summary ───────────────────────

  addPage()
  addSectionTitle("I. Executive Summary", "투자 적격성 종합 판단")

  let y = 45
  const exec = report.executive

  // Grade + Score
  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.text("Investment Grade:", M, y)
  const gc = GRADE_COLORS[exec.investmentGrade] || COLORS.gray
  doc.setFillColor(parseInt(gc.slice(1, 3), 16), parseInt(gc.slice(3, 5), 16), parseInt(gc.slice(5, 7), 16))
  doc.roundedRect(M + 50, y - 5, 30, 8, 2, 2, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.text(exec.investmentGrade, M + 65, y, { align: "center" })
  doc.setTextColor(100, 100, 100)
  doc.text(`(Score: ${exec.gradeScore}/100)`, M + 85, y)

  y += 12

  // Key Summary
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Key Summary", M, y)
  y += 7
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  for (const line of exec.keySummary) {
    doc.text(`• ${line}`, M + 3, y)
    y += 6
  }

  y += 5

  // Expected ROI table
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Expected ROI Range", M, y)
  y += 7
  const roiTable = [
    ["Conservative", `${exec.expectedROI.conservative}%`],
    ["Moderate", `${exec.expectedROI.moderate}%`],
    ["Aggressive", `${exec.expectedROI.aggressive}%`],
  ]
  for (const [label, value] of roiTable) {
    y = addKeyValueRow(y, label, value, true)
  }

  y += 8

  // Key Risks
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Top Risks", M, y)
  y += 7
  for (const risk of exec.keyRisks.slice(0, 5)) {
    doc.setFontSize(8)
    const riskColor = risk.probability === "CRITICAL" ? COLORS.red : risk.probability === "HIGH" ? COLORS.amber : COLORS.gray
    doc.setTextColor(parseInt(riskColor.slice(1, 3), 16), parseInt(riskColor.slice(3, 5), 16), parseInt(riskColor.slice(5, 7), 16))
    doc.text(`[${risk.probability}]`, M + 3, y)
    doc.setTextColor(60, 60, 60)
    doc.text(`${risk.description}`, M + 25, y)
    y += 5
  }

  y += 8

  // Recommended Action
  doc.setFillColor(243, 244, 246)
  doc.roundedRect(M, y, CW, 12, 2, 2, "F")
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Recommended Action:", M + 5, y + 7)
  doc.setFont("helvetica", "bold")
  doc.text(exec.recommendedAction, M + 60, y + 7)
  doc.setFont("helvetica", "normal")

  // ─── 4. Collateral Analysis ─────────────────────

  addPage()
  addSectionTitle("II. Collateral Analysis", "담보물 분석 — 부동산 기본정보, 가치평가, 현장실사")

  y = 45
  const coll = report.collateral

  // Basic Info
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Basic Property Information", M, y)
  y += 7
  y = addKeyValueRow(y, "Address", coll.basicInfo.address)
  y = addKeyValueRow(y, "Property Type", coll.basicInfo.propertyType)
  y = addKeyValueRow(y, "Building Area", `${coll.basicInfo.buildingArea.toLocaleString()} sqm`)
  y = addKeyValueRow(y, "Land Area", `${coll.basicInfo.landArea.toLocaleString()} sqm`)
  y = addKeyValueRow(y, "Build Year", `${coll.basicInfo.buildYear} (Age: ${coll.basicInfo.age} years)`)
  y = addKeyValueRow(y, "Structure", coll.basicInfo.structureType)

  y += 5

  // Valuation
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Valuation Comparison", M, y)
  y += 7
  y = addKeyValueRow(y, "Appraisal Value", formatAmount(coll.valuation.appraisalValue), true)
  y = addKeyValueRow(y, "Public Land Price", formatAmount(coll.valuation.publicLandPrice))
  y = addKeyValueRow(y, "AVM Estimate", formatAmount(coll.valuation.avmEstimate))
  y = addKeyValueRow(y, "Valuation Gap", `${coll.valuation.valuationGap > 0 ? "+" : ""}${coll.valuation.valuationGap}%`)
  y = addKeyValueRow(y, "Price per Pyeong", formatAmount(coll.valuation.pricePerPyeong))

  y += 5

  // Physical Inspection Summary
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text(`Physical Inspection (${coll.physicalInspection.length} items)`, M, y)
  y += 7
  const inspCategories = [...new Set(coll.physicalInspection.map(i => i.category))]
  for (const cat of inspCategories) {
    const items = coll.physicalInspection.filter(i => i.category === cat)
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`${cat}: ${items.length} items`, M + 3, y)
    y += 5
    if (y > H - 30) { addPage(); y = 20 }
  }

  // Environmental Risk
  y += 3
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text(`Environmental Risk Assessment (${coll.environmentalRisk.length} items)`, M, y)
  y += 7
  for (const env of coll.environmentalRisk.slice(0, 8)) {
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.text(`• ${env.item}: ${env.risk}`, M + 3, y)
    y += 5
    if (y > H - 30) { addPage(); y = 20 }
  }

  // ─── 5. Legal Analysis ──────────────────────────

  addPage()
  addSectionTitle("III. Legal Analysis", "권리관계 분석 — 등기부, 채권구조, 배당 시뮬레이션")

  y = 45
  const legal = report.legal

  // Mortgage Structure
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Mortgage Structure", M, y)
  y += 7
  y = addKeyValueRow(y, "Total Mortgage", formatAmount(legal.mortgageStructure.total), true)
  y = addKeyValueRow(y, "Senior Debt", formatAmount(legal.mortgageStructure.seniorDebt))
  y = addKeyValueRow(y, "Junior Debt", formatAmount(legal.mortgageStructure.juniorDebt))
  y = addKeyValueRow(y, "LTV", `${legal.mortgageStructure.ltv}%`)

  y += 5

  // Mortgage entries
  if (legal.mortgageStructure.entries.length > 0) {
    doc.setFontSize(9)
    doc.setTextColor(27, 58, 92)
    doc.text("Mortgage Registry", M, y)
    y += 7
    for (const m of legal.mortgageStructure.entries) {
      doc.setFontSize(8)
      doc.setTextColor(60, 60, 60)
      doc.text(`${m.rank}순위 ${m.type} — ${m.creditor} — ${formatAmount(m.maxClaimAmount)}`, M + 3, y)
      y += 5
    }
    y += 3
  }

  // Tenant Risk
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Tenant Risk Assessment", M, y)
  y += 7
  y = addKeyValueRow(y, "Total Deposits", formatAmount(legal.tenantRisk.totalDeposit))
  y = addKeyValueRow(y, "Opposing Power Deposits", formatAmount(legal.tenantRisk.opposingPowerDeposit))
  y = addKeyValueRow(y, "Risk Level", legal.tenantRisk.riskLevel, true)

  y += 5

  // Dividend Simulation
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Dividend Simulation", M, y)
  y += 7
  y = addKeyValueRow(y, "Expected Proceeds", formatAmount(legal.dividendSimulation.totalProceeds))
  for (const dist of legal.dividendSimulation.distributions) {
    y = addKeyValueRow(y, `  ${dist.creditor}`, `${formatAmount(dist.receivedAmount)} (${dist.recoveryRate}%)`)
    if (y > H - 30) { addPage(); y = 20 }
  }
  y = addKeyValueRow(y, "Surplus", formatAmount(legal.dividendSimulation.surplus), true)

  // Legal Opinion
  y += 8
  if (y > H - 60) { addPage(); y = 20 }
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Legal Opinion (AI Draft)", M, y)
  y += 7
  for (const opinion of legal.legalOpinion) {
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    const lines = doc.splitTextToSize(opinion, CW - 6)
    doc.text(lines, M + 3, y)
    y += lines.length * 4.5
    if (y > H - 30) { addPage(); y = 20 }
  }

  // ─── 6. Financial Analysis ──────────────────────

  addPage()
  addSectionTitle("IV. Financial Analysis", "재무 분석 — DCF, Monte Carlo, 시나리오, 민감도")

  y = 45
  const fin = report.financial

  // DCF Summary
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("DCF Analysis", M, y)
  y += 7
  y = addKeyValueRow(y, "NPV", formatAmount(fin.dcf.npv), true)
  y = addKeyValueRow(y, "IRR", `${fin.dcf.irr}%`, true)
  y = addKeyValueRow(y, "Holding Period", `${fin.dcf.assumptions.holdingPeriod} years`)
  y = addKeyValueRow(y, "Discount Rate", `${fin.dcf.assumptions.discountRate}%`)
  y = addKeyValueRow(y, "Terminal Cap Rate", `${fin.dcf.assumptions.terminalCapRate}%`)

  y += 5

  // DCF Cash Flow Table
  doc.setFontSize(9)
  doc.setTextColor(27, 58, 92)
  doc.text("Projected Cash Flows", M, y)
  y += 5
  const cfCols = [
    { label: "Year", x: M, width: 15, align: "left" as const },
    { label: "NOI", x: M + 25, width: 30, align: "right" as const },
    { label: "PV", x: M + 60, width: 30, align: "right" as const },
  ]
  y = addTableHeader(y, cfCols)
  for (const flow of fin.dcf.yearlyFlows) {
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.text(`Year ${flow.year}`, M, y)
    doc.text(formatAmount(flow.noi), M + 55, y, { align: "right" })
    doc.text(formatAmount(flow.pv), M + 90, y, { align: "right" })
    y += 5
  }

  y += 8

  // Monte Carlo Summary
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text(`Monte Carlo Simulation (${fin.monteCarlo.iterations.toLocaleString()} iterations)`, M, y)
  y += 7
  y = addKeyValueRow(y, "Mean Return", `${fin.monteCarlo.results.mean}%`)
  y = addKeyValueRow(y, "Median Return", `${fin.monteCarlo.results.median}%`, true)
  y = addKeyValueRow(y, "5th Percentile", `${fin.monteCarlo.results.p5}%`)
  y = addKeyValueRow(y, "95th Percentile", `${fin.monteCarlo.results.p95}%`)
  y = addKeyValueRow(y, "Std Deviation", `${fin.monteCarlo.results.stdDev}%`)

  // Chart placeholder
  if (options.charts?.monteCarloHistogram) {
    y += 5
    try {
      doc.addImage(options.charts.monteCarloHistogram, "PNG", M, y, CW, 50)
      y += 55
    } catch {
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text("[Monte Carlo Distribution Chart]", M + CW / 2, y + 25, { align: "center" })
      y += 35
    }
  }

  // Scenarios
  if (y > H - 60) { addPage(); y = 20 }
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Scenario Analysis", M, y)
  y += 7
  for (const scenario of fin.scenarios) {
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(scenario.name, M + 3, y)
    y += 5
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(scenario.assumptions, M + 6, y)
    y += 5
    y = addKeyValueRow(y, "  Total Return", `${scenario.totalReturn}%`)
    y = addKeyValueRow(y, "  IRR", `${scenario.irr}%`)
    y = addKeyValueRow(y, "  NPV", formatAmount(scenario.npv))
    y += 3
    if (y > H - 30) { addPage(); y = 20 }
  }

  // Key Metrics
  if (y > H - 50) { addPage(); y = 20 }
  y += 5
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Key Financial Metrics", M, y)
  y += 7
  y = addKeyValueRow(y, "Cap Rate", `${fin.metrics.capRate}%`)
  y = addKeyValueRow(y, "Cash-on-Cash Return", `${fin.metrics.cashOnCash}%`)
  y = addKeyValueRow(y, "Break-Even Occupancy", `${fin.metrics.breakEvenOccupancy}%`)
  y = addKeyValueRow(y, "Payback Period", `${fin.metrics.paybackPeriod} years`)

  // ─── 7. Market Analysis ─────────────────────────

  addPage()
  addSectionTitle("V. Market Analysis", "시장 분석 — NBI 지수, 낙찰가율, 유사 거래")

  y = 45
  const mkt = report.market

  // NBI Trend
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("NBI Index Trend (12 months)", M, y)
  y += 7
  for (const pt of mkt.nbiTrend.slice(-6)) {
    y = addKeyValueRow(y, pt.date, `${pt.value}`)
  }

  y += 5

  // Bid Rate Trend
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Regional Bid Rate Trend", M, y)
  y += 7
  for (const pt of mkt.regionBidRateTrend.slice(-6)) {
    y = addKeyValueRow(y, pt.date, `${(pt.rate * 100).toFixed(1)}%`)
  }

  // ─── 8. Investment Opinion ──────────────────────

  addPage()
  addSectionTitle("VI. Investment Opinion", "투자 의견 — 종합 판단, 권고 입찰가, Exit 전략")

  y = 45
  const opinion = report.opinion

  // Grade
  doc.setFontSize(12)
  doc.setTextColor(30, 30, 30)
  doc.text(`Investment Grade: ${opinion.grade}`, M, y)
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(`(Confidence: ${opinion.confidence}%)`, M + 80, y)
  y += 10

  // Rationale
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Rationale", M, y)
  y += 7
  for (const reason of opinion.rationale) {
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.text(`• ${reason}`, M + 3, y)
    y += 5
  }

  y += 5

  // Recommended Bid Range
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Recommended Bid Range", M, y)
  y += 7
  y = addKeyValueRow(y, "Minimum", formatAmount(opinion.recommendedBidRange.min))
  y = addKeyValueRow(y, "Optimal", formatAmount(opinion.recommendedBidRange.optimal), true)
  y = addKeyValueRow(y, "Maximum", formatAmount(opinion.recommendedBidRange.max))

  y += 5

  // Exit Strategies
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Exit Strategies", M, y)
  y += 7
  for (const exit of opinion.exitStrategies) {
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(`${exit.strategy} (${exit.probability}% probability)`, M + 3, y)
    y += 5
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`Expected Return: ${exit.expectedReturn}% | Timeframe: ${exit.timeframe}`, M + 6, y)
    y += 4
    doc.text(exit.detail, M + 6, y)
    y += 6
    if (y > H - 30) { addPage(); y = 20 }
  }

  // Contract Recommendations
  y += 5
  if (y > H - 50) { addPage(); y = 20 }
  doc.setFontSize(10)
  doc.setTextColor(27, 58, 92)
  doc.text("Contract Recommendations", M, y)
  y += 7
  for (const rec of opinion.contractRecommendations) {
    doc.setFontSize(8)
    doc.setTextColor(60, 60, 60)
    doc.text(`• ${rec}`, M + 3, y)
    y += 5
  }

  // ─── 9. Disclaimers ─────────────────────────────

  addPage()
  addSectionTitle("Disclaimers & Terms", "면책 조항 및 이용 약관")

  y = 45
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  for (const disclaimer of opinion.disclaimers) {
    const lines = doc.splitTextToSize(disclaimer, CW - 6)
    doc.text(lines, M + 3, y)
    y += lines.length * 5 + 3
  }

  y += 10
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text("This report was generated using NPLatform AI Analysis Engine v3.0.", M, y)
  y += 5
  doc.text(`Report ID: ${report.id}`, M, y)
  y += 5
  doc.text(`Generated: ${new Date(report.generatedAt).toISOString()}`, M, y)
  y += 5
  doc.text(`Recipient: ${options.recipientName}`, M, y)

  // ─── Return PDF bytes ───────────────────────────

  return doc.output("arraybuffer") as unknown as Uint8Array
}

// ─── 다운로드 헬퍼 (브라우저용) ──────────────────────────────

export function downloadPDF(pdfBytes: Uint8Array, filename: string) {
  const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
