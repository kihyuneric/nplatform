// ============================================================
// app/api/v1/webhooks/deal-completed/route.ts
// 딜 완료 이벤트 → 수수료 + 인보이스 자동 생성 웹훅
//
// POST /api/v1/webhooks/deal-completed
//   헤더: x-webhook-secret: <WEBHOOK_SECRET>
//
// 호출 시점:
//  1. Supabase DB Webhook (deal_rooms.status → CLOSED/COMPLETED)
//  2. 수동 관리자 액션 (딜 완료 처리)
//  3. 경매 낙찰 확인 후 자동 트리거
//
// 2026-05-02 P0-2 리팩토링: 비즈니스 로직을 lib/commission/generate.ts 로 추출.
// admin PATCH 와 webhook 양쪽이 동일 함수 공유.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { generateAndStoreDealCommission } from '@/lib/commission/generate'

interface DealCompletedPayload {
  // Supabase DB Webhook 형식
  type?:   'INSERT' | 'UPDATE' | 'DELETE'
  table?:  string
  record?: {
    id:          string
    status:      string
    listing_id?: string
    created_by?: string
    [key: string]: unknown
  }
  old_record?: {
    status?: string
    [key: string]: unknown
  }

  // 직접 호출 형식
  deal_id?:     string
  winning_bid?: number
  buyer_id?:    string
  seller_id?:   string
  listing_id?:  string
  charged_to?:  'BUYER' | 'SELLER' | 'SPLIT'
}

// CLOSED 또는 COMPLETED 인 stage (대문자/소문자 모두 허용)
const COMPLETED_STATUSES = new Set(['CLOSED', 'COMPLETED', 'closed', 'completed'])

export async function POST(req: NextRequest) {
  // ── 웹훅 시크릿 검증 ──────────────────────────────────
  const webhookSecret = process.env.WEBHOOK_SECRET
  const incomingSecret = req.headers.get('x-webhook-secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '')

  if (webhookSecret && incomingSecret !== webhookSecret) {
    return NextResponse.json({ error: { code: 'INVALID_SECRET', message: 'Invalid webhook secret' } }, { status: 401 })
  }

  let payload: DealCompletedPayload
  try {
    payload = (await req.json()) as DealCompletedPayload
  } catch {
    return NextResponse.json({ error: { code: 'INVALID_JSON', message: 'Invalid JSON' } }, { status: 400 })
  }

  // ── 딜 ID 결정 ────────────────────────────────────────
  const dealId = payload.deal_id ?? payload.record?.id
  if (!dealId) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'deal_id required' } }, { status: 400 })
  }

  // DB Webhook 이면 status 변경이 CLOSED/COMPLETED 인지 확인
  if (payload.type === 'UPDATE' && payload.record) {
    const newStatus = payload.record.status
    const oldStatus = payload.old_record?.status
    if (!COMPLETED_STATUSES.has(newStatus)) {
      return NextResponse.json({ skipped: true, reason: `status is ${newStatus}` })
    }
    if (oldStatus && COMPLETED_STATUSES.has(oldStatus)) {
      return NextResponse.json({ skipped: true, reason: 'already completed' })
    }
  }

  // ── 공유 함수 호출 ────────────────────────────────────
  const admin = getSupabaseAdmin()
  const result = await generateAndStoreDealCommission(admin, {
    dealId,
    winningBid: payload.winning_bid,
    buyerId: payload.buyer_id ?? null,
    sellerId: payload.seller_id ?? null,
    chargedTo: payload.charged_to,
  })

  if (!result.ok) {
    if (result.skipped) {
      return NextResponse.json({ skipped: true, reason: result.reason ?? result.skipped })
    }
    return NextResponse.json({ error: result.error ?? 'commission generation failed' }, { status: 500 })
  }

  console.log(
    `[deal-completed] Commission created: deal=${dealId} ` +
    `total=${result.commission!.total_amount} ` +
    `rate=${(result.commission!.rate * 100).toFixed(2)}% ` +
    `invoices=${result.invoices?.length ?? 0}`
  )

  return NextResponse.json({
    ok: true,
    commission: result.commission,
    invoices: result.invoices,
    breakdown: {
      rate:              `${(result.commission!.rate * 100).toFixed(2)}%`,
      commission_amount: result.commission!.commission_amount,
      vat_amount:        result.commission!.vat_amount,
      total_amount:      result.commission!.total_amount,
    },
  }, { status: 201 })
}
