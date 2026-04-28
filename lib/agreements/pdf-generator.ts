/**
 * Agreements PDF generator — server-side jsPDF.
 *
 * NDA / LOI 의 서면 본문을 PDF 로 출력해 Supabase Storage 에 저장한다.
 * 한국어 폰트는 lib/npl/korean-font.ts 의 base64 임베드된 NotoSansKR Regular 사용.
 *
 * 정책:
 *   · 본문은 PDF 의 표준 텍스트 (검색 가능 / 인쇄 호환)
 *   · 서명 이미지는 base64 PNG 를 그대로 임베드
 *   · 모든 PDF 는 단일 함수에서 생성 — UI/모달과 동일한 본문 보장
 */

import { jsPDF } from 'jspdf'
import { loadKoreanFont } from '@/lib/npl/korean-font'

export interface NdaPdfInput {
  agreementId: string
  listingId: string
  listingTitle: string
  sellerInstitution: string
  buyerName: string
  buyerCompany?: string
  signedAt: Date
  signerName: string
  /** base64 PNG (data URL) */
  signatureDataUrl: string
  clauseVersion: string
}

export interface LoiPdfInput {
  agreementId: string
  listingId: string
  listingTitle: string
  sellerInstitution: string
  buyerName: string
  buyerCompany?: string
  signedAt: Date
  signerName: string
  signatureDataUrl: string
  amount: number
  fundingPlan: string  // CASH / LEVERAGED / FUND
  durationDays: number
  acquisitionEntity: string
  sellerMessage?: string
}

const FUNDING_LABELS: Record<string, string> = {
  CASH: '현금 매입 (자기자본 100%)',
  LEVERAGED: '레버리지 매입 (대출 활용)',
  FUND: '펀드/SPC 활용',
}

// ─── NDA 본문 6 조항 ─────────────────────────────────────────────────
const NDA_CLAUSES = [
  {
    title: '제 1 조 (목적)',
    body: '본 계약은 NPLatform 거래소에 등재된 매물 검토를 위해 매도자가 매수자에게 제공하는 비공개 정보의 보호 의무를 정함을 목적으로 한다.',
  },
  {
    title: '제 2 조 (비공개 정보의 정의)',
    body: '본 계약에서 비공개 정보란 매도자가 제공하는 채권 정보, 담보 부동산 정보, 채무자 정보, 권리관계, 감정평가서, 등기부등본, 임대차 현황, 그 외 명시적으로 비공개로 표시된 일체의 자료를 의미한다.',
  },
  {
    title: '제 3 조 (이용 목적의 제한)',
    body: '매수자는 비공개 정보를 매물 검토 및 매수 의사 결정 목적으로만 이용하며, 그 외 어떠한 목적으로도 사용하지 아니한다. 매수자는 비공개 정보를 매도자의 사전 서면 동의 없이 제3자에게 공개·복사·재배포하지 아니한다.',
  },
  {
    title: '제 4 조 (보안 의무)',
    body: '매수자는 비공개 정보를 보관함에 있어 합리적인 보안 조치를 취하며, 임직원·자문사·실사 협력사 등 본 매물 검토에 필요한 자에 한해 동일한 비밀유지 의무를 부여한 후 공유할 수 있다.',
  },
  {
    title: '제 5 조 (위반 시 손해배상)',
    body: '매수자가 본 계약을 위반하여 매도자에게 손해를 입힌 경우, 매수자는 그로 인한 모든 직접·간접 손해를 배상하며, NPLatform 은 거래 정지 및 영구 회원 자격 박탈 조치를 취할 수 있다.',
  },
  {
    title: '제 6 조 (효력 및 보관 기간)',
    body: '본 계약의 효력은 서명일로부터 1년간 유효하며, 매수자가 매물 매입을 완료하지 아니한 경우에도 비공개 정보 보호 의무는 종료일로부터 추가 5년간 지속된다. NPLatform 은 본 계약서 원본을 5년간 보관한다 (전자서명법).',
  },
]

const PAGE_W = 210  // A4 mm
const PAGE_H = 297
const MARGIN = 20

function fmtDateTime(d: Date): string {
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
}

function fmtKrwShort(amount: number): string {
  if (amount >= 100_000_000) {
    const eok = amount / 100_000_000
    return `${eok.toFixed(eok >= 100 ? 0 : 2)}억원`
  }
  return `${amount.toLocaleString('ko-KR')}원`
}

// ─── 공통 — 본문 렌더 ────────────────────────────────────────────────
async function buildPdf(): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  // 한국어 폰트 등록
  try {
    const fontBase64 = await loadKoreanFont()
    if (fontBase64) {
      doc.addFileToVFS('NotoSansKR.otf', fontBase64)
      doc.addFont('NotoSansKR.otf', 'NotoSansKR', 'normal')
      doc.setFont('NotoSansKR')
    }
  } catch {
    // 폰트 로드 실패 시 default font 로 fallback (한글 깨질 수 있음)
  }
  return doc
}

function drawHeader(doc: jsPDF, title: string, agreementId: string) {
  doc.setFontSize(8)
  doc.setTextColor(34, 81, 255)
  doc.text('NPLATFORM · CONFIDENTIAL', MARGIN, 12)
  doc.setTextColor(80, 80, 80)
  doc.text(`Agreement ID: ${agreementId}`, PAGE_W - MARGIN, 12, { align: 'right' })
  // Top accent line — electric blue
  doc.setDrawColor(34, 81, 255)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, 14, PAGE_W - MARGIN, 14)

  // Title
  doc.setFontSize(20)
  doc.setTextColor(10, 22, 40)
  doc.text(title, PAGE_W / 2, 28, { align: 'center' })
}

function drawFooter(doc: jsPDF, pageNum: number, pageTotal: number, signedAt: Date) {
  const y = PAGE_H - 12
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4)
  doc.setFontSize(7)
  doc.setTextColor(120, 120, 120)
  doc.text(
    `생성: ${fmtDateTime(signedAt)} · NPLatform 자체 전자서명 · 5년 보관`,
    MARGIN,
    y,
  )
  doc.text(`Page ${pageNum} / ${pageTotal}`, PAGE_W - MARGIN, y, { align: 'right' })
}

function drawSignatureBlock(
  doc: jsPDF,
  yStart: number,
  signerName: string,
  signedAt: Date,
  signatureDataUrl: string,
) {
  // Block container
  doc.setDrawColor(34, 81, 255)
  doc.setLineWidth(0.4)
  doc.rect(MARGIN, yStart, PAGE_W - 2 * MARGIN, 50)
  doc.setFontSize(8)
  doc.setTextColor(34, 81, 255)
  doc.text('SIGNATURE', MARGIN + 4, yStart + 6)
  // 서명자 정보
  doc.setFontSize(10)
  doc.setTextColor(10, 22, 40)
  doc.text(`서명자: ${signerName}`, MARGIN + 4, yStart + 14)
  doc.text(`서명 일시: ${fmtDateTime(signedAt)}`, MARGIN + 4, yStart + 22)
  // 서명 이미지
  try {
    if (signatureDataUrl && signatureDataUrl.startsWith('data:image/')) {
      doc.addImage(
        signatureDataUrl,
        'PNG',
        PAGE_W - MARGIN - 70,  // x
        yStart + 6,             // y
        65,                     // width
        38,                     // height
        undefined,
        'FAST',
      )
    }
  } catch {
    // 이미지 임베드 실패 — 무시 (텍스트 서명만)
    doc.text('[서명 이미지 임베드 실패]', PAGE_W - MARGIN - 4, yStart + 25, { align: 'right' })
  }
}

// ─── NDA PDF ─────────────────────────────────────────────────────────
export async function generateNdaPdf(input: NdaPdfInput): Promise<Uint8Array> {
  const doc = await buildPdf()
  drawHeader(doc, '비밀유지계약서 (NDA)', input.agreementId)

  // Listing meta box
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  let y = 38
  doc.text(`매물명     : ${input.listingTitle}`, MARGIN, y); y += 6
  doc.text(`매물 ID    : ${input.listingId}`, MARGIN, y); y += 6
  doc.text(`매도자     : ${input.sellerInstitution}`, MARGIN, y); y += 6
  doc.text(`매수자     : ${input.buyerName}${input.buyerCompany ? ` (${input.buyerCompany})` : ''}`, MARGIN, y); y += 6
  doc.text(`체결 일시  : ${fmtDateTime(input.signedAt)}`, MARGIN, y); y += 8

  // 6 clauses
  doc.setFontSize(11)
  for (const c of NDA_CLAUSES) {
    if (y > PAGE_H - 80) {
      drawFooter(doc, doc.getNumberOfPages(), 0, input.signedAt) // total fixed later
      doc.addPage()
      drawHeader(doc, '비밀유지계약서 (NDA)', input.agreementId)
      y = 38
    }
    doc.setTextColor(34, 81, 255)
    doc.setFontSize(11)
    doc.text(c.title, MARGIN, y)
    y += 6
    doc.setTextColor(10, 22, 40)
    doc.setFontSize(10)
    const wrapped = doc.splitTextToSize(c.body, PAGE_W - 2 * MARGIN)
    doc.text(wrapped, MARGIN, y)
    y += wrapped.length * 5 + 4
  }

  // Signature
  if (y > PAGE_H - 70) {
    drawFooter(doc, doc.getNumberOfPages(), 0, input.signedAt)
    doc.addPage()
    drawHeader(doc, '비밀유지계약서 (NDA)', input.agreementId)
    y = 38
  }
  drawSignatureBlock(doc, y, input.signerName, input.signedAt, input.signatureDataUrl)

  // Footer pagination
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, i, totalPages, input.signedAt)
  }

  return new Uint8Array(doc.output('arraybuffer'))
}

// ─── LOI PDF ─────────────────────────────────────────────────────────
export async function generateLoiPdf(input: LoiPdfInput): Promise<Uint8Array> {
  const doc = await buildPdf()
  drawHeader(doc, '매수의향서 (LOI)', input.agreementId)

  // Listing meta + LOI 조건
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  let y = 38
  doc.text(`매물명         : ${input.listingTitle}`, MARGIN, y); y += 6
  doc.text(`매물 ID        : ${input.listingId}`, MARGIN, y); y += 6
  doc.text(`매도자         : ${input.sellerInstitution}`, MARGIN, y); y += 6
  doc.text(`매수자         : ${input.buyerName}${input.buyerCompany ? ` (${input.buyerCompany})` : ''}`, MARGIN, y); y += 6
  doc.text(`인수 주체      : ${input.acquisitionEntity}`, MARGIN, y); y += 6
  doc.text(`작성 일시      : ${fmtDateTime(input.signedAt)}`, MARGIN, y); y += 10

  // Block: 매수 조건
  doc.setDrawColor(34, 81, 255)
  doc.setLineWidth(0.5)
  doc.rect(MARGIN, y, PAGE_W - 2 * MARGIN, 36)
  doc.setFontSize(9)
  doc.setTextColor(34, 81, 255)
  doc.text('매수 조건', MARGIN + 4, y + 6)
  doc.setFontSize(11)
  doc.setTextColor(10, 22, 40)
  doc.text(`매수 희망가     : ${fmtKrwShort(input.amount)}`, MARGIN + 4, y + 14)
  doc.text(`자금 조달 계획  : ${FUNDING_LABELS[input.fundingPlan] ?? input.fundingPlan}`, MARGIN + 4, y + 22)
  doc.text(`실사 기간       : ${input.durationDays}일`, MARGIN + 4, y + 30)
  y += 44

  // 본문
  doc.setFontSize(10)
  doc.setTextColor(10, 22, 40)
  const intro = `본 매수의향서는 ${input.buyerName}(이하 "매수자") 가 ${input.sellerInstitution}(이하 "매도자") 가 NPLatform 거래소에 등재한 매물 [${input.listingTitle}] 에 대하여 매수 의향이 있음을 표시하기 위한 문서입니다.`
  const introWrapped = doc.splitTextToSize(intro, PAGE_W - 2 * MARGIN)
  doc.text(introWrapped, MARGIN, y)
  y += introWrapped.length * 5 + 4

  const clauses = [
    {
      title: '제 1 조 (구속력)',
      body: '본 의향서는 매도자에게 정식 매도 의무를 지우지 아니하며, 매수자에게도 정식 매수 의무를 지우지 아니하는 비구속적 의향 표시이다. 다만 본 의향서에 기재된 매수 희망가·자금 조달 계획·실사 기간은 양 당사자가 이후 협상의 기초로 삼는다.',
    },
    {
      title: '제 2 조 (실사)',
      body: `매수자는 본 의향서 서명일로부터 ${input.durationDays}일 이내에 매물에 대한 법률·재무·물건 실사를 완료한다. 실사 기간 중 매도자는 매물의 본질적 조건을 변경하지 아니한다.`,
    },
    {
      title: '제 3 조 (배타적 협상)',
      body: '매도자는 본 의향서 검토 기간 중 별도 합의가 없는 한, 매수자 외 제3자와 동일 매물에 관한 매매 협상을 진행하지 아니한다.',
    },
    {
      title: '제 4 조 (비밀유지)',
      body: '본 의향서의 존재 및 그 내용은 양 당사자의 사전 서면 동의 없이 제3자에게 공개되지 아니한다. 단, 양 당사자의 자문사·실사 협력사·금융기관 등 거래에 필요한 자에 한해 비밀유지 의무 부과 후 공유할 수 있다.',
    },
  ]

  doc.setFontSize(11)
  for (const c of clauses) {
    if (y > PAGE_H - 80) {
      drawFooter(doc, doc.getNumberOfPages(), 0, input.signedAt)
      doc.addPage()
      drawHeader(doc, '매수의향서 (LOI)', input.agreementId)
      y = 38
    }
    doc.setTextColor(34, 81, 255)
    doc.setFontSize(11)
    doc.text(c.title, MARGIN, y)
    y += 6
    doc.setTextColor(10, 22, 40)
    doc.setFontSize(10)
    const wrapped = doc.splitTextToSize(c.body, PAGE_W - 2 * MARGIN)
    doc.text(wrapped, MARGIN, y)
    y += wrapped.length * 5 + 4
  }

  // 매도자에게 메시지 (선택)
  if (input.sellerMessage && input.sellerMessage.trim()) {
    if (y > PAGE_H - 70) {
      drawFooter(doc, doc.getNumberOfPages(), 0, input.signedAt)
      doc.addPage()
      drawHeader(doc, '매수의향서 (LOI)', input.agreementId)
      y = 38
    }
    doc.setFontSize(10)
    doc.setTextColor(34, 81, 255)
    doc.text('매도자에게 메시지', MARGIN, y); y += 6
    doc.setTextColor(10, 22, 40)
    const wrapped = doc.splitTextToSize(input.sellerMessage, PAGE_W - 2 * MARGIN)
    doc.text(wrapped, MARGIN, y)
    y += wrapped.length * 5 + 6
  }

  // Signature
  if (y > PAGE_H - 70) {
    drawFooter(doc, doc.getNumberOfPages(), 0, input.signedAt)
    doc.addPage()
    drawHeader(doc, '매수의향서 (LOI)', input.agreementId)
    y = 38
  }
  drawSignatureBlock(doc, y, input.signerName, input.signedAt, input.signatureDataUrl)

  // Footer pagination
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    drawFooter(doc, i, totalPages, input.signedAt)
  }

  return new Uint8Array(doc.output('arraybuffer'))
}

// ─── SHA256 helper (위변조 방지) ───────────────────────────────────────
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
