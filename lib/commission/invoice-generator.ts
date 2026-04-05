// ============================================================
// lib/commission/invoice-generator.ts
// 수수료 인보이스 생성 / PDF 렌더링 유틸
// ============================================================

import { createClient } from '@/lib/supabase/client'
import type { CommissionBreakdown } from './calculator'

// ─── 인보이스 생성 ────────────────────────────────────────

export interface CreateInvoiceParams {
  commission_id: string
  recipient_id: string
  recipient_type: 'BUYER' | 'SELLER'
  breakdown: CommissionBreakdown
  due_days?: number          // 청구 후 납부 기한 (기본 7일)
  notes?: string
  issued_by?: string         // 발행자 user_id
}

export interface InvoiceRecord {
  id: string
  invoice_number: string
  commission_id: string
  recipient_id: string
  recipient_type: string
  subtotal: number
  vat: number
  total: number
  status: string
  due_date: string | null
  pdf_url: string | null
  created_at: string
}

export async function createCommissionInvoice(
  params: CreateInvoiceParams
): Promise<{ data: InvoiceRecord | null; error: Error | null }> {
  const supabase = createClient()
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + (params.due_days ?? 7))

  const payload = {
    commission_id:  params.commission_id,
    recipient_id:   params.recipient_id,
    recipient_type: params.recipient_type,
    subtotal:       params.recipient_type === 'BUYER'
                      ? params.breakdown.buyer_amount - Math.round(params.breakdown.buyer_amount / 11)
                      : params.breakdown.seller_amount - Math.round(params.breakdown.seller_amount / 11),
    vat:            params.recipient_type === 'BUYER'
                      ? Math.round(params.breakdown.buyer_amount / 11)
                      : Math.round(params.breakdown.seller_amount / 11),
    total:          params.recipient_type === 'BUYER'
                      ? params.breakdown.buyer_amount
                      : params.breakdown.seller_amount,
    due_date:       dueDate.toISOString().split('T')[0],
    notes:          params.notes ?? null,
    issued_by:      params.issued_by ?? null,
    // invoice_number은 DB 트리거가 자동 생성
  }

  const { data, error } = await supabase
    .from('commission_invoices')
    .insert(payload)
    .select()
    .single()

  if (error) return { data: null, error: new Error(error.message) }
  return { data: data as InvoiceRecord, error: null }
}

// ─── 인보이스 상태 업데이트 ──────────────────────────────

export async function markInvoicePaid(
  invoiceId: string,
  paidAmount: number,
  paymentMethod: string
): Promise<{ error: Error | null }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('commission_invoices')
    .update({
      status:          'PAID',
      paid_amount:     paidAmount,
      paid_at:         new Date().toISOString(),
      payment_method:  paymentMethod,
    })
    .eq('id', invoiceId)

  return { error: error ? new Error(error.message) : null }
}

// ─── 인보이스 HTML 생성 (PDF용) ──────────────────────────

export interface InvoiceHtmlParams {
  invoice_number: string
  issued_date: string
  due_date: string
  recipient_name: string
  recipient_email?: string
  deal_info: {
    case_number: string
    property_address: string
    winning_bid: number
    auction_date?: string
  }
  breakdown: CommissionBreakdown
  company: {
    name: string
    ceo: string
    registration_number: string
    address: string
    email: string
    phone: string
  }
}

export function generateInvoiceHtml(params: InvoiceHtmlParams): string {
  const fmt = (n: number) => n.toLocaleString('ko-KR') + '원'
  const rateStr = (params.breakdown.rate * 100).toFixed(2) + '%'

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Noto Sans KR', sans-serif; font-size: 12px; color: #1a1a1a; padding: 40px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
    .logo { font-size: 22px; font-weight: 800; color: #2563eb; }
    .invoice-title { font-size: 28px; font-weight: 700; color: #111; text-align: right; }
    .invoice-number { color: #6b7280; font-size: 13px; text-align: right; margin-top: 4px; }
    .divider { border-top: 2px solid #1e40af; margin: 16px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
    .info-box h3 { font-size: 11px; text-transform: uppercase; color: #6b7280; margin-bottom: 8px; letter-spacing: 0.05em; }
    .info-box p { line-height: 1.8; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead { background: #1e40af; color: white; }
    thead th { padding: 10px 12px; text-align: left; font-weight: 600; font-size: 11px; }
    tbody td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .total-section { margin-left: auto; width: 300px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e5e7eb; }
    .total-final { display: flex; justify-content: space-between; padding: 10px 0; font-weight: 700; font-size: 16px; color: #1e40af; border-top: 2px solid #1e40af; margin-top: 4px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #9ca3af; font-size: 10px; text-align: center; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .badge-pending { background: #fef3c7; color: #92400e; }
    .badge-paid    { background: #d1fae5; color: #065f46; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">NPLatform</div>
      <p style="color:#6b7280;margin-top:4px">아시아 최초 AI 기반 NPL 인텔리전스 플랫폼</p>
    </div>
    <div>
      <div class="invoice-title">세금계산서</div>
      <div class="invoice-number">No. ${params.invoice_number}</div>
    </div>
  </div>

  <div class="divider"></div>

  <div class="info-grid">
    <div class="info-box">
      <h3>청구처</h3>
      <p>
        <strong>${params.recipient_name}</strong><br>
        ${params.recipient_email ?? ''}<br>
        청구일: ${params.issued_date}<br>
        납부기한: <strong>${params.due_date}</strong>
      </p>
    </div>
    <div class="info-box">
      <h3>발행처</h3>
      <p>
        <strong>${params.company.name}</strong><br>
        대표: ${params.company.ceo}<br>
        사업자등록번호: ${params.company.registration_number}<br>
        ${params.company.address}<br>
        ${params.company.email} | ${params.company.phone}
      </p>
    </div>
  </div>

  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:20px;">
    <h3 style="font-size:11px;color:#1e40af;margin-bottom:8px">거래 정보</h3>
    <p><strong>사건번호:</strong> ${params.deal_info.case_number}</p>
    <p><strong>물건소재지:</strong> ${params.deal_info.property_address}</p>
    <p><strong>낙찰금액:</strong> ${fmt(params.deal_info.winning_bid)}</p>
    ${params.deal_info.auction_date ? `<p><strong>경매기일:</strong> ${params.deal_info.auction_date}</p>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>항목</th>
        <th>기준금액</th>
        <th>적용요율</th>
        <th>금액</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>NPL 거래 중개 수수료</td>
        <td>${fmt(params.deal_info.winning_bid)}</td>
        <td>${rateStr}</td>
        <td>${fmt(params.breakdown.commission_amount)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row"><span>공급가액</span><span>${fmt(params.breakdown.commission_amount)}</span></div>
    <div class="total-row"><span>부가세 (10%)</span><span>${fmt(params.breakdown.vat_amount)}</span></div>
    <div class="total-final"><span>청구 합계</span><span>${fmt(params.breakdown.total_amount)}</span></div>
  </div>

  <div class="footer">
    <p>본 세금계산서는 ${params.company.name}이 발행하였습니다.</p>
    <p>문의: ${params.company.email} | ${params.company.phone}</p>
  </div>
</body>
</html>`
}

// ─── 인보이스 목록 조회 ──────────────────────────────────

export async function getInvoicesByRecipient(
  recipientId: string,
  status?: string
): Promise<{ data: InvoiceRecord[]; error: Error | null }> {
  const supabase = createClient()
  let query = supabase
    .from('commission_invoices')
    .select('*')
    .eq('recipient_id', recipientId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return { data: [], error: new Error(error.message) }
  return { data: (data ?? []) as InvoiceRecord[], error: null }
}
