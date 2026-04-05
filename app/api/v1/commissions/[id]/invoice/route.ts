// ============================================================
// app/api/v1/commissions/[id]/invoice/route.ts
// 수수료 인보이스 조회 / 생성
//
// GET  /api/v1/commissions/[id]/invoice          → 인보이스 조회 (format=html|json)
// POST /api/v1/commissions/[id]/invoice          → 인보이스 생성
//   → deal_commissions → commission_invoices 레코드 생성
//   → invoice_number는 DB 트리거 자동 발번 (NPL-INV-YYYY-000001)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { generateInvoiceHtml } from '@/lib/commission/invoice-generator'
import type { CommissionBreakdown } from '@/lib/commission/calculator'

const COMPANY = {
  name:                'NPLatform 주식회사',
  ceo:                 '대표이사',
  registration_number: '000-00-00000',
  address:             '서울특별시 강남구 테헤란로 000',
  email:               'invoice@nplatform.io',
  phone:               '02-0000-0000',
}

interface InvoiceBody {
  recipient_type: 'BUYER' | 'SELLER'
  due_days?:      number       // 납부 기한 (기본 7일)
  notes?:         string
  // 수신자 정보 (없으면 DB 프로필에서 자동 조회)
  recipient_name?:  string
  recipient_email?: string
}

// ─── GET — 인보이스 조회 ──────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: commissionId } = await params
  const format = req.nextUrl.searchParams.get('format') ?? 'json'  // html | json

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()

  // 수수료 레코드 조회
  const { data: commission, error: commErr } = await admin
    .from('deal_commissions')
    .select(`
      id, deal_id, listing_id, winning_bid,
      commission_rate, commission_amount, vat_amount, total_amount,
      charged_to, buyer_amount, seller_amount,
      buyer_id, seller_id, invoice_id, status
    `)
    .eq('id', commissionId)
    .single()

  if (commErr || !commission) {
    return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
  }

  const comm = commission as {
    id: string
    deal_id: string
    listing_id: string | null
    winning_bid: number
    commission_rate: number
    commission_amount: number
    vat_amount: number
    total_amount: number
    charged_to: string
    buyer_amount: number
    seller_amount: number
    buyer_id: string | null
    seller_id: string | null
    invoice_id: string | null
    status: string
  }

  // 접근 권한 확인 (관리자 또는 당사자)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile as { role?: string } | null)?.role
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN'
  const isParty = comm.buyer_id === user.id || comm.seller_id === user.id

  if (!isAdmin && !isParty) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 인보이스 레코드 조회
  if (!comm.invoice_id) {
    return NextResponse.json({ error: 'No invoice for this commission' }, { status: 404 })
  }

  const { data: invoiceRow, error: invErr } = await admin
    .from('commission_invoices')
    .select('*')
    .eq('id', comm.invoice_id)
    .single()

  if (invErr || !invoiceRow) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const inv = invoiceRow as {
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
    created_at: string
    [key: string]: unknown
  }

  // JSON 포맷 반환
  if (format !== 'html') {
    return NextResponse.json({ invoice: inv, commission: comm })
  }

  // HTML 포맷: 인보이스 렌더링
  let recipientName  = '고객'
  let recipientEmail = ''
  const { data: recipientProfile } = await admin
    .from('profiles')
    .select('name, email')
    .eq('id', inv.recipient_id)
    .single()
  if (recipientProfile) {
    const rp = recipientProfile as { name?: string; email?: string }
    recipientName  = rp.name  ?? recipientName
    recipientEmail = rp.email ?? recipientEmail
  }

  let caseNumber = ''
  let propertyAddress = ''
  let auctionDate: string | undefined

  if (comm.listing_id) {
    const { data: listing } = await admin
      .from('court_auction_listings')
      .select('case_number, address, auction_date')
      .eq('id', comm.listing_id)
      .single()
    if (listing) {
      const l = listing as { case_number: string; address: string; auction_date?: string }
      caseNumber = l.case_number
      propertyAddress = l.address
      auctionDate = l.auction_date ?? undefined
    }
  }

  if (!caseNumber && comm.deal_id) {
    const { data: dealRoom } = await admin
      .from('deal_rooms')
      .select('title')
      .eq('id', comm.deal_id)
      .single()
    if (dealRoom) {
      propertyAddress = (dealRoom as { title?: string }).title ?? ''
    }
  }

  const breakdown: CommissionBreakdown = {
    rule_name:         '수수료',
    rate:              comm.commission_rate,
    commission_amount: comm.commission_amount,
    vat_amount:        comm.vat_amount,
    total_amount:      comm.total_amount,
    buyer_amount:      comm.buyer_amount,
    seller_amount:     comm.seller_amount,
    charged_to:        comm.charged_to as 'BUYER' | 'SELLER' | 'SPLIT',
  }

  const html = generateInvoiceHtml({
    invoice_number:  inv.invoice_number,
    issued_date:     inv.created_at.split('T')[0]!,
    due_date:        inv.due_date ?? '',
    recipient_name:  recipientName,
    recipient_email: recipientEmail,
    deal_info: {
      case_number:      caseNumber || comm.deal_id,
      property_address: propertyAddress || '매물 정보 없음',
      winning_bid:      comm.winning_bid,
      auction_date:     auctionDate,
    },
    breakdown,
    company: COMPANY,
  })

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

// ─── POST — 인보이스 생성 ─────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: commissionId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 관리자 확인
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const role = (profile as { role?: string } | null)?.role
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden — Admin only' }, { status: 403 })
  }

  let body: InvoiceBody
  try {
    body = (await req.json()) as InvoiceBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.recipient_type !== 'BUYER' && body.recipient_type !== 'SELLER') {
    return NextResponse.json({ error: 'recipient_type must be BUYER or SELLER' }, { status: 400 })
  }

  const admin = getSupabaseAdmin()

  // ── 수수료 레코드 조회 ────────────────────────────────
  const { data: commission, error: commErr } = await admin
    .from('deal_commissions')
    .select(`
      id, deal_id, listing_id, winning_bid,
      commission_rate, commission_amount, vat_amount, total_amount,
      charged_to, buyer_amount, seller_amount,
      buyer_id, seller_id, invoice_id, status
    `)
    .eq('id', commissionId)
    .single()

  if (commErr || !commission) {
    return NextResponse.json({ error: 'Commission not found' }, { status: 404 })
  }

  const comm = commission as {
    id: string
    deal_id: string
    listing_id: string | null
    winning_bid: number
    commission_rate: number
    commission_amount: number
    vat_amount: number
    total_amount: number
    charged_to: string
    buyer_amount: number
    seller_amount: number
    buyer_id: string | null
    seller_id: string | null
    invoice_id: string | null
    status: string
  }

  // 이미 인보이스 존재 확인
  if (comm.invoice_id) {
    return NextResponse.json({ error: 'Invoice already generated', invoice_id: comm.invoice_id }, { status: 409 })
  }

  // WAIVED/REFUNDED 상태면 인보이스 불가
  if (['WAIVED', 'REFUNDED'].includes(comm.status)) {
    return NextResponse.json({ error: `Cannot invoice a ${comm.status} commission` }, { status: 422 })
  }

  // ── 수신자 결정 ───────────────────────────────────────
  const recipientUserId =
    body.recipient_type === 'BUYER' ? comm.buyer_id : comm.seller_id

  if (!recipientUserId) {
    return NextResponse.json(
      { error: `No ${body.recipient_type.toLowerCase()}_id on this commission` },
      { status: 422 }
    )
  }

  // 수신자 프로필 조회
  let recipientName  = body.recipient_name ?? '고객'
  let recipientEmail = body.recipient_email ?? ''
  const { data: recipientProfile } = await admin
    .from('profiles')
    .select('name, email')
    .eq('id', recipientUserId)
    .single()
  if (recipientProfile) {
    const rp = recipientProfile as { name?: string; email?: string }
    recipientName  = body.recipient_name  ?? rp.name  ?? recipientName
    recipientEmail = body.recipient_email ?? rp.email ?? recipientEmail
  }

  // ── 관련 경매 매물 정보 ───────────────────────────────
  let caseNumber = ''
  let propertyAddress = ''
  let auctionDate: string | undefined

  if (comm.listing_id) {
    const { data: listing } = await admin
      .from('court_auction_listings')
      .select('case_number, address, auction_date')
      .eq('id', comm.listing_id)
      .single()
    if (listing) {
      const l = listing as { case_number: string; address: string; auction_date?: string }
      caseNumber = l.case_number
      propertyAddress = l.address
      auctionDate = l.auction_date ?? undefined
    }
  }

  // deal_rooms에서 deal_listings 조회 (fallback)
  if (!caseNumber && comm.deal_id) {
    const { data: dealRoom } = await admin
      .from('deal_rooms')
      .select('title, listing_id')
      .eq('id', comm.deal_id)
      .single()
    if (dealRoom) {
      const dr = dealRoom as { title?: string; listing_id?: string }
      propertyAddress = propertyAddress || dr.title || ''
    }
  }

  // ── 인보이스 금액 계산 ────────────────────────────────
  const invoiceTotal =
    body.recipient_type === 'BUYER' ? comm.buyer_amount : comm.seller_amount
  const invoiceVat   = Math.round(invoiceTotal / 11)  // 역산 VAT
  const invoiceSubtotal = invoiceTotal - invoiceVat

  if (invoiceTotal <= 0) {
    return NextResponse.json(
      { error: `${body.recipient_type} amount is 0, cannot invoice` },
      { status: 422 }
    )
  }

  // ── 납부 기한 계산 ────────────────────────────────────
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + (body.due_days ?? 7))
  const dueDateStr = dueDate.toISOString().split('T')[0]!
  const issuedDateStr = new Date().toISOString().split('T')[0]!

  // ── DB에 인보이스 생성 ────────────────────────────────
  const { data: invoiceRow, error: invoiceErr } = await admin
    .from('commission_invoices')
    .insert({
      commission_id:  commissionId,
      recipient_id:   recipientUserId,
      recipient_type: body.recipient_type,
      subtotal:       invoiceSubtotal,
      vat:            invoiceVat,
      total:          invoiceTotal,
      due_date:       dueDateStr,
      notes:          body.notes ?? null,
      issued_by:      user.id,
      status:         'PENDING',
      // invoice_number → DB 트리거 자동 생성
    })
    .select()
    .single()

  if (invoiceErr || !invoiceRow) {
    return NextResponse.json({ error: invoiceErr?.message ?? 'Insert failed' }, { status: 500 })
  }

  const inv = invoiceRow as { id: string; invoice_number: string; [key: string]: unknown }

  // ── 수수료 레코드에 invoice_id 연결 ───────────────────
  await admin
    .from('deal_commissions')
    .update({
      invoice_id: inv.id,
      status:     'INVOICED',
      updated_at: new Date().toISOString(),
    })
    .eq('id', commissionId)

  // ── HTML 인보이스 생성 (미리보기용) ──────────────────
  const breakdown: CommissionBreakdown = {
    rule_name:         '수수료',
    rate:              comm.commission_rate,
    commission_amount: comm.commission_amount,
    vat_amount:        comm.vat_amount,
    total_amount:      comm.total_amount,
    buyer_amount:      comm.buyer_amount,
    seller_amount:     comm.seller_amount,
    charged_to:        comm.charged_to as 'BUYER' | 'SELLER' | 'SPLIT',
  }

  const html = generateInvoiceHtml({
    invoice_number:  inv.invoice_number,
    issued_date:     issuedDateStr,
    due_date:        dueDateStr,
    recipient_name:  recipientName,
    recipient_email: recipientEmail,
    deal_info: {
      case_number:      caseNumber || comm.deal_id,
      property_address: propertyAddress || '매물 정보 없음',
      winning_bid:      comm.winning_bid,
      auction_date:     auctionDate,
    },
    breakdown,
    company: COMPANY,
  })

  return NextResponse.json({
    invoice: inv,
    html_preview: html,
  }, { status: 201 })
}
