// ─── 수익성 분석 PDF 보고서 ─────────────────────────────────────────────────
// 기존 lib/npl/pdf-export.ts 패턴 재사용
// 6페이지 구성: 요약 → 채권/자금 → 배당표 → 시나리오 → MC → AI서술
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registerKoreanFont } from '../korean-font'
import type { ProfitabilityResult } from './types'

function fmt(v: number): string {
  if (!v) return '-'
  if (Math.abs(v) >= 100_000_000) return `${(v / 100_000_000).toFixed(2)}억`
  if (Math.abs(v) >= 10_000) return `${(v / 10_000).toFixed(0)}만`
  return v.toLocaleString()
}

function fmtP(v: number): string {
  return `${v.toFixed(1)}%`
}

function getLastY(doc: jsPDF, fallback: number): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback
}

export function generateProfitabilityPdf(
  result: ProfitabilityResult,
  fontBase64?: string
): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = doc.internal.pageSize.getWidth()
  const input = result.input
  const base = result.baseScenario
  const dealLabel = input.dealStructure === 'LOAN_SALE' ? '론세일' : '채무인수계약'

  const useKorean = !!fontBase64
  if (fontBase64) registerKoreanFont(doc, fontBase64)
  const tableFont = useKorean ? 'NanumGothic' : 'helvetica'

  let y = 20

  // ─── Page 1: Executive Summary ─────────────────────────────
  doc.setFontSize(18)
  doc.text('NPL 수익성 분석 보고서', pageWidth / 2, y, { align: 'center' })
  y += 8
  doc.setFontSize(10)
  doc.text(`분석일: ${result.createdAt.split('T')[0]} | 딜 구조: ${dealLabel}`, pageWidth / 2, y, { align: 'center' })
  y += 12

  // KPI Summary
  autoTable(doc, {
    startY: y,
    head: [['항목', '값']],
    body: [
      ['채권기관', input.bond.institutionName],
      ['채무자', input.bond.debtorName],
      ['담보물', `${input.collateral.address} (${input.collateral.propertyType})`],
      ['감정가', fmt(input.collateral.appraisalValue)],
      ['총채권액', fmt(result.bondCalculation.totalBondAmount)],
      ['순수익', fmt(base.metrics.netProfit)],
      ['ROI', fmtP(base.metrics.roi)],
      ['IRR', fmtP(base.metrics.irr)],
      ['리스크 등급', result.aiPredictions.riskGrade.grade],
      ['손실확률', fmtP(result.aiPredictions.monteCarlo.lossProb)],
    ],
    styles: { font: tableFont, fontSize: 9 },
    headStyles: { fillColor: [37, 88, 160] },
  })
  y = getLastY(doc, y + 60) + 8

  // Executive Summary text
  if (result.aiNarrative.executiveSummary) {
    doc.setFontSize(11)
    doc.text('종합 평가', 14, y)
    y += 6
    doc.setFontSize(8)
    const lines = doc.splitTextToSize(result.aiNarrative.executiveSummary, pageWidth - 28)
    doc.text(lines, 14, y)
  }

  // ─── Page 2: 채권/자금구조/비용 ────────────────────────────
  doc.addPage()
  y = 20

  doc.setFontSize(14)
  doc.text('채권액 산출 & 자금구조', 14, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['항목', '금액']],
    body: [
      ['잔여원금', fmt(result.bondCalculation.principal)],
      ['지연손해금', fmt(result.bondCalculation.penaltyInterest)],
      ['총채권액', fmt(result.bondCalculation.totalBondAmount)],
      ['---', '---'],
      [input.dealStructure === 'LOAN_SALE' ? '매입가' : '협의가', fmt(result.fundingStructure.purchasePrice)],
      ['자기자본', fmt(result.fundingStructure.ownCapital)],
      ['차입금', fmt(result.fundingStructure.borrowedCapital)],
      ['금융비용', fmt(result.fundingStructure.borrowingCost)],
    ],
    styles: { font: tableFont, fontSize: 9 },
    headStyles: { fillColor: [37, 88, 160] },
  })
  y = getLastY(doc, y + 60) + 8

  // 비용 명세
  autoTable(doc, {
    startY: y,
    head: [['비용 항목', '금액']],
    body: [
      ['취득세', fmt(result.costs.acquisitionTax)],
      ['등록세', fmt(result.costs.registrationTax)],
      ['법무비용', fmt(result.costs.legalFee)],
      ['중개수수료', fmt(result.costs.brokerageFee)],
      ['이전비용', fmt(result.costs.transferCost)],
      ['기타비용', fmt(result.costs.miscFee)],
      ['금융이자비용', fmt(result.costs.interestCost)],
      ['총비용', fmt(result.costs.totalCosts)],
    ],
    styles: { font: tableFont, fontSize: 9 },
    headStyles: { fillColor: [100, 116, 139] },
  })

  // ─── Page 3: 배당표 ───────────────────────────────────────
  doc.addPage()
  y = 20

  doc.setFontSize(14)
  doc.text('예상 배당표', 14, y)
  y += 8

  const distTable = base.recovery.distributionTable.map(r => [
    String(r.rank === 0 ? '-' : r.rank),
    r.holder,
    r.type,
    fmt(r.claimAmount),
    fmt(r.distributionAmount),
    fmtP(r.recoveryRate * 100),
    r.isTarget ? '당해' : '',
  ])

  autoTable(doc, {
    startY: y,
    head: [['순위', '채권자', '유형', '채권액', '배당액', '회수율', '']],
    body: distTable,
    styles: { font: tableFont, fontSize: 8 },
    headStyles: { fillColor: [37, 88, 160] },
  })

  // ─── Page 4: 시나리오 ──────────────────────────────────────
  doc.addPage()
  y = 20

  doc.setFontSize(14)
  doc.text('시나리오 분석 (BULL / BASE / BEAR)', 14, y)
  y += 8

  autoTable(doc, {
    startY: y,
    head: [['시나리오', '낙찰가율', '순수익', 'ROI', 'IRR']],
    body: result.scenarios.map(s => [
      s.label,
      fmtP(s.bidRatio),
      fmt(s.metrics.netProfit),
      fmtP(s.metrics.roi),
      fmtP(s.metrics.irr),
    ]),
    styles: { font: tableFont, fontSize: 9 },
    headStyles: { fillColor: [37, 88, 160] },
  })

  // ─── Page 5: Monte Carlo ───────────────────────────────────
  doc.addPage()
  y = 20

  doc.setFontSize(14)
  doc.text('Monte Carlo 시뮬레이션', 14, y)
  y += 8

  const mc = result.aiPredictions.monteCarlo
  autoTable(doc, {
    startY: y,
    head: [['지표', '값']],
    body: [
      ['시뮬레이션 횟수', mc.iterations.toLocaleString()],
      ['평균 수익률', fmtP(mc.mean)],
      ['표준편차', fmtP(mc.stdDev)],
      ['P10', fmtP(mc.p10)],
      ['P50 (중앙값)', fmtP(mc.p50)],
      ['P90', fmtP(mc.p90)],
      ['손실확률', fmtP(mc.lossProb)],
    ],
    styles: { font: tableFont, fontSize: 9 },
    headStyles: { fillColor: [37, 88, 160] },
  })

  // ─── Page 6: AI 투자의견 ───────────────────────────────────
  doc.addPage()
  y = 20

  doc.setFontSize(14)
  doc.text('AI 투자의견', 14, y)
  y += 8

  const opinion = result.aiNarrative.investmentOpinion
  doc.setFontSize(12)
  doc.text(`판정: ${opinion.verdict} (신뢰도 ${(opinion.confidence * 100).toFixed(0)}%)`, 14, y)
  y += 8

  doc.setFontSize(8)
  const reasonLines = doc.splitTextToSize(opinion.reasoning, pageWidth - 28)
  doc.text(reasonLines, 14, y)
  y += reasonLines.length * 4 + 8

  // 리스크 요약
  doc.setFontSize(11)
  doc.text('리스크 분석', 14, y)
  y += 6

  autoTable(doc, {
    startY: y,
    head: [['카테고리', '심각도', '설명', '대응방안']],
    body: result.aiNarrative.riskSummary.items.map(r => [
      r.category,
      r.severity,
      r.description,
      r.mitigation,
    ]),
    styles: { font: tableFont, fontSize: 7 },
    headStyles: { fillColor: [100, 116, 139] },
    columnStyles: { 2: { cellWidth: 50 }, 3: { cellWidth: 50 } },
  })

  return doc
}
