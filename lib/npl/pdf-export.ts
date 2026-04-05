import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { registerKoreanFont } from './korean-font';
import type {
  NplCase, CaseRight, CaseAssumptions,
  DistributionResult, ReturnAnalysis, RiskCheckItem,
} from './types';

function fmt(v: number): string {
  if (!v) return '-';
  if (Math.abs(v) >= 100000000) return `${(v / 100000000).toFixed(2)}억`;
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(0)}만`;
  return v.toLocaleString();
}

function fmtP(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

interface ExportData {
  case_info: NplCase;
  rights: CaseRight[];
  assumptions: CaseAssumptions;
  distributions: DistributionResult[];
  returns: ReturnAnalysis[];
  risks: RiskCheckItem[];
}

function getLastY(doc: jsPDF, fallback: number): number {
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? fallback;
}

export function generatePdfReport(data: ExportData, fontBase64?: string): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const c = data.case_info;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Register Korean font if provided
  const useKorean = !!fontBase64;
  if (fontBase64) {
    registerKoreanFont(doc, fontBase64);
  }

  const tableFont = useKorean ? 'NanumGothic' : 'helvetica';

  // Title
  doc.setFontSize(18);
  doc.text('NPL 투자분석 리포트', pageWidth / 2, y, { align: 'center' });
  y += 10;
  doc.setFontSize(11);
  doc.text(`${c.case_number} | ${c.address || ''}`, pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(9);
  doc.text(`분석일: ${new Date().toISOString().split('T')[0]}`, pageWidth / 2, y, { align: 'center' });
  y += 12;

  // KPI Summary
  doc.setFontSize(13);
  doc.text('핵심 지표', 14, y);
  y += 3;

  const nplReturns = data.returns.filter(r => r.strategy_type === 'NPL');
  const directReturns = data.returns.filter(r => r.strategy_type === '직접낙찰');
  const baseNpl = nplReturns.find(r => r.scenario_name === '기본') || nplReturns[0];
  const baseDir = directReturns.length > 1 ? directReturns[1] : directReturns[0];

  autoTable(doc, {
    startY: y,
    head: [['항목', '값']],
    body: [
      ['감정가', fmt(c.appraisal_value)],
      ['최저매각가', fmt(c.minimum_price)],
      ['최저가율', c.appraisal_value > 0 ? fmtP(c.minimum_price / c.appraisal_value) : '-'],
      ['AI 추정시세', c.ai_estimated_value ? fmt(c.ai_estimated_value) : '-'],
      ['NPL IRR (기본)', baseNpl ? fmtP(baseNpl.annualized_irr) : '-'],
      ['직접낙찰 IRR (기본)', baseDir ? fmtP(baseDir.annualized_irr) : '-'],
      ['NPL MOIC', baseNpl ? baseNpl.moic?.toFixed(2) + 'x' : '-'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [27, 58, 92], font: tableFont },
    styles: { fontSize: 9, font: tableFont },
  });

  y = getLastY(doc, y + 40) + 10;

  // Rights Table
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFontSize(13);
  doc.text('권리분석', 14, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [['순위', '권리종류', '권리자', '분류', '채권최고액', '채권원금']],
    body: data.rights.map(r => [
      r.priority_rank, r.right_type || '', r.right_holder || '',
      r.classification || '', fmt(r.max_claim_amount || r.claim_amount), fmt(r.principal),
    ]),
    theme: 'striped',
    headStyles: { fillColor: [27, 58, 92], font: tableFont },
    styles: { fontSize: 8, font: tableFont },
  });

  y = getLastY(doc, y + 30) + 10;

  // Distribution (base scenario)
  const baseDist = data.distributions.find(d => d.scenario_name?.includes('60%')) || data.distributions[0];
  if (baseDist) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text(`배당 시뮬레이션 - ${baseDist.scenario_name || ''}`, 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['채권자', '분류', '채권액', '배당액', '회수율', '부족액']],
      body: (baseDist.distribution_detail || []).map(d => [
        d.right_holder || '', d.classification || '',
        fmt(d.claim_amount), fmt(d.distribution_amount),
        fmtP(d.recovery_rate), d.shortfall > 0 ? fmt(d.shortfall) : '-',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [27, 58, 92], font: tableFont },
      styles: { fontSize: 8, font: tableFont },
    });

    y = getLastY(doc, y + 30) + 10;
  }

  // NPL Returns
  if (nplReturns.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text('NPL 채권매입 수익분석', 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['항목', ...nplReturns.map(r => r.scenario_name || '')]],
      body: [
        ['매입가', ...nplReturns.map(r => fmt(r.bond_purchase_price || 0))],
        ['에쿼티', ...nplReturns.map(r => fmt(r.equity_amount))],
        ['예상배당', ...nplReturns.map(r => fmt(r.expected_return))],
        ['순이익', ...nplReturns.map(r => fmt(r.net_profit))],
        ['연환산 IRR', ...nplReturns.map(r => fmtP(r.annualized_irr))],
        ['MOIC', ...nplReturns.map(r => r.moic?.toFixed(2) + 'x')],
        ['손실방어가', ...nplReturns.map(r => fmt(r.break_even_price))],
      ],
      theme: 'striped',
      headStyles: { fillColor: [27, 58, 92], font: tableFont },
      styles: { fontSize: 8, font: tableFont },
    });

    y = getLastY(doc, y + 30) + 10;
  }

  // Direct Auction Returns
  if (directReturns.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text('직접낙찰 수익분석', 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['항목', ...directReturns.map(r => r.scenario_name || '')]],
      body: [
        ['총취득원가', ...directReturns.map(r => fmt(r.total_acquisition_cost || r.investment_amount))],
        ['연간 NOI', ...directReturns.map(r => fmt(r.annual_noi || 0))],
        ['현금수익률', ...directReturns.map(r => r.cash_yield ? fmtP(r.cash_yield) : '-')],
        ['연환산 IRR', ...directReturns.map(r => fmtP(r.annualized_irr))],
        ['MOIC', ...directReturns.map(r => r.moic?.toFixed(2) + 'x')],
        ['NPV (10%)', ...directReturns.map(r => fmt(r.npv || 0))],
      ],
      theme: 'striped',
      headStyles: { fillColor: [27, 58, 92], font: tableFont },
      styles: { fontSize: 8, font: tableFont },
    });

    y = getLastY(doc, y + 30) + 10;
  }

  // Risk Checklist
  if (data.risks.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(13);
    doc.text('리스크 평가', 14, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [['항목', '수준', '상세']],
      body: data.risks.map(r => [r.category || '', r.level || '', r.detail || '']),
      theme: 'striped',
      headStyles: { fillColor: [27, 58, 92], font: tableFont },
      styles: { fontSize: 8, font: tableFont },
      columnStyles: {
        1: { cellWidth: 20, halign: 'center' },
      },
    });
  }

  return doc;
}
