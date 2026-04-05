/**
 * POST /api/v1/payments/webhook
 *
 * PortOne V2 Webhook 수신 엔드포인트
 * - 결제 완료/실패/취소 이벤트 처리
 * - HMAC-SHA256 서명 검증
 *
 * PortOne 콘솔에서 Webhook URL: https://your-domain.com/api/v1/payments/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPortOneWebhookSignature, verifyPortOnePayment, type PortOneWebhookPayload } from '@/lib/payment-portone'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 30

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  // ── 1. 서명 검증 ──────────────────────────────────────────
  const signature = req.headers.get('webhook-signature') ?? ''
  const rawBody = await req.text()

  const isValid = await verifyPortOneWebhookSignature(rawBody, signature)
  if (!isValid) {
    console.error('[Webhook] PortOne 서명 검증 실패')
    return NextResponse.json({ error: '유효하지 않은 서명' }, { status: 401 })
  }

  // ── 2. 페이로드 파싱 ──────────────────────────────────────
  let payload: PortOneWebhookPayload
  try {
    payload = JSON.parse(rawBody) as PortOneWebhookPayload
  } catch {
    return NextResponse.json({ error: '잘못된 JSON' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { type, data } = payload

  console.log(`[Webhook] PortOne 이벤트: ${type}, paymentId: ${data.paymentId}`)

  try {
    switch (type) {
      case 'Transaction.Paid': {
        // 결제 완료 — payment_history 상태 업데이트
        if (supabase) {
          const { error } = await supabase
            .from('payment_history')
            .update({
              status: 'PAID',
              pg_tx_id: data.transactionId,
              paid_at: payload.timestamp,
            })
            .eq('payment_id', data.paymentId)

          if (error) console.error('[Webhook] payment_history update error:', error.message)
        }
        break
      }

      case 'Transaction.Failed': {
        if (supabase) {
          await supabase
            .from('payment_history')
            .update({ status: 'FAILED' })
            .eq('payment_id', data.paymentId)
        }
        break
      }

      case 'Transaction.Cancelled':
      case 'Transaction.PartialCancelled': {
        if (supabase) {
          const isPartial = type === 'Transaction.PartialCancelled'
          await supabase
            .from('payment_history')
            .update({ status: isPartial ? 'PARTIAL_CANCELLED' : 'CANCELLED' })
            .eq('payment_id', data.paymentId)

          // 크레딧 구매 취소 시 잔액 차감
          const { data: ph } = await supabase
            .from('payment_history')
            .select('user_id, product_type, amount')
            .eq('payment_id', data.paymentId)
            .single()

          if (ph?.product_type === 'CREDIT' && ph.user_id) {
            const creditsToRevoke = Math.floor((ph.amount ?? 0) / 1000)
            await supabase.rpc('increment_credit_balance', {
              p_user_id: ph.user_id,
              p_amount: -creditsToRevoke,  // 차감
            })
          }
        }
        break
      }

      default:
        console.log(`[Webhook] 처리되지 않은 이벤트: ${type}`)
    }

    return NextResponse.json({ ok: true, received: type })

  } catch (err) {
    console.error('[Webhook] 처리 중 오류:', err)
    // PortOne은 200이 아닌 경우 재전송 — 의도적 오류만 500 반환
    return NextResponse.json({ error: '처리 실패' }, { status: 500 })
  }
}
