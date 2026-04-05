import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/* ───────────────────── constants ───────────────────── */

const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 20
const CONTENT_W = PAGE_W - MARGIN * 2

const PRIMARY = '#1B3A5C'
const ACCENT = '#2E75B6'
const SUCCESS = '#10B981'
const DANGER = '#EF4444'
const WARN = '#F59E0B'
const GRAY = '#666666'
const LIGHT_GRAY = '#999999'
const BG_LIGHT = '#F8FAFC'

/* ───────────────────── types ───────────────────── */

interface BidRateTrend {
  month: string
  rate: number
}

interface BidRateStats {
  avg_1m: number
  avg_3m: number
  avg_6m: number
  trend_12m: BidRateTrend[]
}

interface SimilarCase {
  case_number: string
  address: string
  appraisal_value: number
  bid_price: number
  bid_rate: number
  fail_count: number
  bid_date: string
}

interface RiskFactor {
  category: string
  description: string
  severity: 'high' | 'medium' | 'low'
}

interface PositiveFactor {
  category: string
  description: string
}

interface RoiScenario {
  bid_rate_pct: number
  bid_price: number
  acquisition_cost: number
  expected_market_value: number
  expected_profit: number
  roi_pct: number
}

export interface AnalysisPdfData {
  id: string
  case_number: string
  address: string
  property_type: string
  area_land: number
  area_building: number
  institution: string
  status: string
  appraisal_value: number
  official_price: number
  market_price: number
  kb_price: number
  minimum_price: number
  auction_count: number
  next_auction_date: string
  court_name: string

  ai_grade: string
  risk_score: number
  safety_score: number
  recommendation_text: string

  bid_rate_stats: BidRateStats
  similar_cases: SimilarCase[]
  risk_factors: RiskFactor[]
  positive_factors: PositiveFactor[]
  roi_scenarios: RoiScenario[]
}

/* ───────────────────── helpers ───────────────────── */

function fmt(v: number | undefined | null): string {
  if (v == null || v === 0) return '-'
  if (Math.abs(v) >= 1_0000_0000) return `${(v / 1_0000_0000).toFixed(1)}억`
  if (Math.abs(v) >= 1_0000) return `${(v / 1_0000).toFixed(0)}만원`
  return v.toLocaleString() + '원'
}

function fmtWon(v: number | undefined | null): string {
  if (v == null) return '-'
  return v.toLocaleString() + '원'
}

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/** Load Korean font (Malgun Gothic) from public/fonts and register it */
async function loadAndRegisterKoreanFont(doc: jsPDF): Promise<boolean> {
  try {
    const res = await fetch('/fonts/malgun.ttf')
    if (!res.ok) return false
    const buf = await res.arrayBuffer()
    // Convert ArrayBuffer to base64
    const bytes = new Uint8Array(buf)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    doc.addFileToVFS('malgun.ttf', base64)
    doc.addFont('malgun.ttf', 'MalgunGothic', 'normal')
    doc.setFont('MalgunGothic')
    return true
  } catch {
    return false
  }
}

const FONT_NAME = 'MalgunGothic'

function setFont(doc: jsPDF, size: number, style: 'normal' | 'bold' = 'normal') {
  try {
    doc.setFont(FONT_NAME, style)
  } catch {
    // fallback if bold not registered
    doc.setFont(FONT_NAME, 'normal')
  }
  doc.setFontSize(size)
}

function totalPages(doc: jsPDF): number {
  return (doc as any).internal.getNumberOfPages()
}

/* ───────────────────── footer ───────────────────── */

function addFooters(doc: jsPDF) {
  const total = totalPages(doc)
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(200, 200, 200)
    doc.line(MARGIN, PAGE_H - 15, PAGE_W - MARGIN, PAGE_H - 15)
    setFont(doc, 7)
    doc.setTextColor(LIGHT_GRAY)
    doc.text(
      `NPLatform - AI 기반 NPL 투자 분석 플랫폼 | page ${i}/${total}`,
      PAGE_W / 2,
      PAGE_H - 10,
      { align: 'center' },
    )
  }
}

/* ───────────────────── section header ───────────────────── */

function sectionHeader(doc: jsPDF, y: number, title: string): number {
  doc.setFillColor(PRIMARY)
  doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F')
  setFont(doc, 12)
  doc.setTextColor('#FFFFFF')
  doc.text(title, MARGIN + 5, y + 7)
  doc.setTextColor('#000000')
  return y + 16
}

/* ═══════════════════════════════════════════════════════════
   MAIN EXPORT FUNCTION
   ═══════════════════════════════════════════════════════════ */

export async function exportAnalysisPdf(data: AnalysisPdfData): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const fontLoaded = await loadAndRegisterKoreanFont(doc)
  const fontOpts = fontLoaded ? { font: FONT_NAME } : {}

  /* ════════════════════════════════════════════════════════
     PAGE 1 — Cover
     ════════════════════════════════════════════════════════ */
  // Background
  doc.setFillColor(PRIMARY)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  // Accent stripe
  doc.setFillColor(ACCENT)
  doc.rect(0, 100, PAGE_W, 4, 'F')

  // Logo text
  setFont(doc, 14)
  doc.setTextColor('#FFFFFF')
  doc.text('NPLatform', PAGE_W / 2, 50, { align: 'center' })

  // Subtitle
  setFont(doc, 9)
  doc.setTextColor(ACCENT)
  doc.text('AI 기반 NPL 투자 분석 플랫폼', PAGE_W / 2, 58, { align: 'center' })

  // Main title
  setFont(doc, 28)
  doc.setTextColor('#FFFFFF')
  doc.text('NPL 투자 분석 리포트', PAGE_W / 2, 130, { align: 'center' })

  // Divider line
  doc.setDrawColor(ACCENT)
  doc.setLineWidth(0.8)
  doc.line(60, 138, PAGE_W - 60, 138)

  // Property address
  setFont(doc, 12)
  doc.setTextColor('#CBD5E1')
  const addressLines = doc.splitTextToSize(data.address, CONTENT_W - 20)
  doc.text(addressLines, PAGE_W / 2, 152, { align: 'center' })

  // Case number
  setFont(doc, 10)
  doc.setTextColor(ACCENT)
  doc.text(`사건번호: ${data.case_number}`, PAGE_W / 2, 168, { align: 'center' })

  // Date
  setFont(doc, 10)
  doc.setTextColor('#94A3B8')
  doc.text(`발행일: ${today()}`, PAGE_W / 2, 180, { align: 'center' })

  // AI grade badge
  setFont(doc, 11)
  doc.setTextColor('#FFFFFF')
  const gradeText = `AI 투자등급: ${data.ai_grade}`
  const gradeW = doc.getTextWidth(gradeText) + 16
  const gradeX = (PAGE_W - gradeW) / 2
  doc.setFillColor(
    data.ai_grade === 'A' ? SUCCESS :
    data.ai_grade === 'B' ? ACCENT :
    data.ai_grade === 'C' ? WARN : DANGER,
  )
  doc.roundedRect(gradeX, 192, gradeW, 10, 3, 3, 'F')
  doc.text(gradeText, PAGE_W / 2, 199, { align: 'center' })

  // Footer text
  setFont(doc, 8)
  doc.setTextColor('#64748B')
  doc.text('본 리포트는 AI 분석 결과를 기반으로 작성되었으며, 투자 판단의 참고 자료로만 활용하시기 바랍니다.', PAGE_W / 2, 270, { align: 'center' })

  /* ════════════════════════════════════════════════════════
     PAGE 2 — 기본정보
     ════════════════════════════════════════════════════════ */
  doc.addPage()
  let y = MARGIN
  y = sectionHeader(doc, y, '1. 기본정보')

  const ltvPct = ((data.minimum_price / data.appraisal_value) * 100).toFixed(1)
  const discountPct = (100 - (data.minimum_price / data.market_price) * 100).toFixed(1)

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['항목', '내용']],
    body: [
      ['담보유형', data.property_type],
      ['소재지', data.address],
      ['사건번호', data.case_number],
      ['감정가', fmtWon(data.appraisal_value)],
      ['최저매각가', fmtWon(data.minimum_price)],
      ['실거래가(시세)', fmtWon(data.market_price)],
      ['LTV(최저가율)', `${ltvPct}%`],
      ['시세 대비 할인율', `${discountPct}%`],
      ['유찰횟수', `${data.auction_count}회`],
      ['다음매각기일', data.next_auction_date || '-'],
      ['채권기관', data.institution],
      ['진행상태', data.status],
    ],
    styles: { ...fontOpts, fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: PRIMARY, textColor: '#FFFFFF', fontStyle: 'bold', ...fontOpts },
    alternateRowStyles: { fillColor: BG_LIGHT },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', textColor: PRIMARY },
      1: { cellWidth: CONTENT_W - 45 },
    },
  })

  /* ════════════════════════════════════════════════════════
     PAGE 3 — AI 분석 요약
     ════════════════════════════════════════════════════════ */
  doc.addPage()
  y = MARGIN
  y = sectionHeader(doc, y, '2. AI 분석 요약')

  const gradeLabel =
    data.ai_grade === 'A' ? '매우 우수' :
    data.ai_grade === 'B' ? '우수' :
    data.ai_grade === 'C' ? '보통' : '주의'

  const riskLabel =
    data.risk_score <= 30 ? '낮은 리스크' :
    data.risk_score <= 60 ? '보통 리스크' : '높은 리스크'

  const safetyLabel =
    data.safety_score >= 70 ? '안전' :
    data.safety_score >= 40 ? '보통' : '위험'

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['항목', '결과', '설명']],
    body: [
      ['AI 등급', data.ai_grade, gradeLabel],
      ['리스크 점수', `${data.risk_score}/100`, riskLabel],
      ['투자 안전점수', `${data.safety_score}/100`, safetyLabel],
    ],
    styles: { ...fontOpts, fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: PRIMARY, textColor: '#FFFFFF', fontStyle: 'bold', ...fontOpts },
    alternateRowStyles: { fillColor: BG_LIGHT },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: 'bold', textColor: PRIMARY },
      1: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: CONTENT_W - 75 },
    },
  })

  // Recommendation text box
  const tableEndY = (doc as any).lastAutoTable?.finalY ?? y + 40
  y = tableEndY + 8

  setFont(doc, 10)
  doc.setTextColor(PRIMARY)
  doc.text('추천 의견', MARGIN, y)
  y += 5

  doc.setFillColor(BG_LIGHT)
  const recLines = doc.splitTextToSize(data.recommendation_text, CONTENT_W - 10)
  const recH = recLines.length * 5 + 8
  doc.roundedRect(MARGIN, y, CONTENT_W, recH, 2, 2, 'F')
  setFont(doc, 9)
  doc.setTextColor(GRAY)
  doc.text(recLines, MARGIN + 5, y + 6)

  /* ════════════════════════════════════════════════════════
     PAGE 4 — 낙찰가율 분석
     ════════════════════════════════════════════════════════ */
  doc.addPage()
  y = MARGIN
  y = sectionHeader(doc, y, '3. 낙찰가율 분석')

  // Trend direction
  const trend12m = data.bid_rate_stats.trend_12m
  let trendText = '보합'
  if (trend12m.length >= 6) {
    const recent = trend12m.slice(-3).reduce((s, v) => s + v.rate, 0) / 3
    const earlier = trend12m.slice(0, 3).reduce((s, v) => s + v.rate, 0) / 3
    const diff = recent - earlier
    trendText = diff > 1.5 ? '상승' : diff < -1.5 ? '하락' : '보합'
  }

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [['기간', '평균 낙찰가율']],
    body: [
      ['최근 1개월', `${data.bid_rate_stats.avg_1m}%`],
      ['최근 3개월', `${data.bid_rate_stats.avg_3m}%`],
      ['최근 6개월', `${data.bid_rate_stats.avg_6m}%`],
      ['12개월 추세', trendText],
    ],
    styles: { ...fontOpts, fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: PRIMARY, textColor: '#FFFFFF', fontStyle: 'bold', ...fontOpts },
    alternateRowStyles: { fillColor: BG_LIGHT },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold', textColor: PRIMARY },
      1: { halign: 'center' },
    },
  })

  // 12-month trend detail table
  if (trend12m.length > 0) {
    const trendTableY = (doc as any).lastAutoTable?.finalY ?? y + 40
    y = trendTableY + 8

    setFont(doc, 10)
    doc.setTextColor(PRIMARY)
    doc.text('12개월 월별 낙찰가율 추이', MARGIN, y)
    y += 4

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [trend12m.map(t => t.month.slice(5) + '월')],
      body: [trend12m.map(t => `${t.rate}%`)],
      styles: { ...fontOpts, fontSize: 8, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: ACCENT, textColor: '#FFFFFF', fontStyle: 'bold', ...fontOpts },
    })
  }

  /* ════════════════════════════════════════════════════════
     PAGE 5 — 유사사례
     ════════════════════════════════════════════════════════ */
  doc.addPage()
  y = MARGIN
  y = sectionHeader(doc, y, '4. 유사 낙찰 사례')

  if (data.similar_cases.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['사건번호', '소재지', '감정가', '낙찰가', '낙찰가율', '유찰횟수']],
      body: data.similar_cases.map(sc => [
        sc.case_number,
        sc.address.length > 20 ? sc.address.slice(0, 20) + '...' : sc.address,
        fmt(sc.appraisal_value),
        fmt(sc.bid_price),
        `${sc.bid_rate}%`,
        `${sc.fail_count}회`,
      ]),
      styles: { ...fontOpts, fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: PRIMARY, textColor: '#FFFFFF', fontStyle: 'bold', ...fontOpts },
      alternateRowStyles: { fillColor: BG_LIGHT },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 42 },
        2: { halign: 'right', cellWidth: 25 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 22 },
      },
    })

    // Summary stats
    const rates = data.similar_cases.map(s => s.bid_rate)
    const avg = (rates.reduce((a, b) => a + b, 0) / rates.length).toFixed(1)
    const max = Math.max(...rates)
    const min = Math.min(...rates)

    const simEndY = (doc as any).lastAutoTable?.finalY ?? y + 40
    y = simEndY + 8

    setFont(doc, 9)
    doc.setTextColor(GRAY)
    doc.text(`평균 낙찰가율: ${avg}%  |  최고: ${max}%  |  최저: ${min}%`, MARGIN, y)
  } else {
    setFont(doc, 10)
    doc.setTextColor(GRAY)
    doc.text('유사 사례 데이터가 없습니다.', MARGIN, y + 5)
  }

  /* ════════════════════════════════════════════════════════
     PAGE 6 — 수익성 분석
     ════════════════════════════════════════════════════════ */
  doc.addPage()
  y = MARGIN
  y = sectionHeader(doc, y, '5. 수익성 분석 (입찰가율별 시뮬레이션)')

  if (data.roi_scenarios.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['입찰가율', '입찰가', '취득비용(세금포함)', '예상시세', '예상수익', 'ROI']],
      body: data.roi_scenarios.map(sc => [
        `${sc.bid_rate_pct}%`,
        fmt(sc.bid_price),
        fmt(sc.acquisition_cost),
        fmt(sc.expected_market_value),
        `${sc.expected_profit >= 0 ? '+' : ''}${fmt(sc.expected_profit)}`,
        `${sc.roi_pct >= 0 ? '+' : ''}${sc.roi_pct.toFixed(1)}%`,
      ]),
      styles: { ...fontOpts, fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: PRIMARY, textColor: '#FFFFFF', fontStyle: 'bold', ...fontOpts },
      alternateRowStyles: { fillColor: BG_LIGHT },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 22 },
        1: { halign: 'right', cellWidth: 28 },
        2: { halign: 'right', cellWidth: 33 },
        3: { halign: 'right', cellWidth: 28 },
        4: { halign: 'right', cellWidth: 28 },
        5: { halign: 'center', cellWidth: 22 },
      },
      didParseCell(hookData) {
        // Color profit/ROI cells
        if (hookData.section === 'body') {
          const rowIdx = hookData.row.index
          const colIdx = hookData.column.index
          const scenario = data.roi_scenarios[rowIdx]
          if (scenario) {
            if (colIdx === 4) {
              hookData.cell.styles.textColor = scenario.expected_profit >= 0 ? SUCCESS : DANGER
            }
            if (colIdx === 5) {
              hookData.cell.styles.textColor = scenario.roi_pct >= 30 ? SUCCESS : scenario.roi_pct >= 10 ? WARN : DANGER
            }
          }
        }
      },
    })
  }

  /* ════════════════════════════════════════════════════════
     PAGE 7 — 리스크 요인 + 긍정 요인
     ════════════════════════════════════════════════════════ */
  doc.addPage()
  y = MARGIN
  y = sectionHeader(doc, y, '6. 투자 위험/긍정 요인 분석')

  // Risk factors
  setFont(doc, 11)
  doc.setTextColor(DANGER)
  doc.text('▣ 위험 요인', MARGIN, y)
  y += 6

  if (data.risk_factors.length > 0) {
    data.risk_factors.forEach((rf) => {
      const severityLabel =
        rf.severity === 'high' ? '[높음]' :
        rf.severity === 'medium' ? '[중간]' : '[낮음]'
      const severityColor =
        rf.severity === 'high' ? DANGER :
        rf.severity === 'medium' ? WARN : LIGHT_GRAY

      setFont(doc, 9)
      doc.setTextColor(severityColor)
      const bulletText = `  ● ${severityLabel} [${rf.category}] ${rf.description}`
      const wrapped = doc.splitTextToSize(bulletText, CONTENT_W - 5)

      if (y + wrapped.length * 5 > PAGE_H - 25) {
        doc.addPage()
        y = MARGIN
      }

      doc.text(wrapped, MARGIN, y)
      y += wrapped.length * 5 + 2
    })
  } else {
    setFont(doc, 9)
    doc.setTextColor(GRAY)
    doc.text('  위험 요인 데이터가 없습니다.', MARGIN, y)
    y += 7
  }

  y += 8

  // Positive factors
  if (y + 20 > PAGE_H - 25) {
    doc.addPage()
    y = MARGIN
  }

  setFont(doc, 11)
  doc.setTextColor(SUCCESS)
  doc.text('▣ 긍정 요인', MARGIN, y)
  y += 6

  if (data.positive_factors.length > 0) {
    data.positive_factors.forEach((pf) => {
      setFont(doc, 9)
      doc.setTextColor('#059669')
      const bulletText = `  ● [${pf.category}] ${pf.description}`
      const wrapped = doc.splitTextToSize(bulletText, CONTENT_W - 5)

      if (y + wrapped.length * 5 > PAGE_H - 25) {
        doc.addPage()
        y = MARGIN
      }

      doc.text(wrapped, MARGIN, y)
      y += wrapped.length * 5 + 2
    })
  } else {
    setFont(doc, 9)
    doc.setTextColor(GRAY)
    doc.text('  긍정 요인 데이터가 없습니다.', MARGIN, y)
    y += 7
  }

  // Disclaimer at bottom
  y += 12
  if (y + 15 > PAGE_H - 25) {
    doc.addPage()
    y = MARGIN
  }

  doc.setDrawColor(200, 200, 200)
  doc.line(MARGIN, y, PAGE_W - MARGIN, y)
  y += 5
  setFont(doc, 7)
  doc.setTextColor(LIGHT_GRAY)
  doc.text(
    '* 본 분석 리포트는 AI 알고리즘에 의해 자동 생성된 참고 자료이며, 투자 결정에 대한 법적 책임을 지지 않습니다.',
    MARGIN,
    y,
  )
  y += 4
  doc.text(
    '* 실제 투자 시 전문가 상담 및 별도의 권리분석을 반드시 진행하시기 바랍니다.',
    MARGIN,
    y,
  )

  /* ── Add footers to all pages ── */
  addFooters(doc)

  /* ── Save ── */
  const filename = `NPL분석_${data.case_number || data.id}_${today().replace(/\./g, '')}.pdf`
  doc.save(filename)
}
