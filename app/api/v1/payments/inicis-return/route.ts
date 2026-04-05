/**
 * POST /api/v1/payments/inicis-return
 *
 * KG이니시스 결제창이 결제 완료 후 POST로 호출하는 returnUrl 핸들러.
 *
 * 흐름:
 *  1) 이니시스가 form-data로 resultCode, authToken, authUrl 등을 전송
 *  2) resultCode === "0000" 이면 승인 API 호출 (verifyInicisPayment)
 *  3) 승인 성공 시 DB에 크레딧/구독 지급
 *  4) /payment/success 또는 /payment/fail 로 리다이렉트
 *
 * 주의: 이니시스 결제창은 팝업이므로 리다이렉트는 팝업 내에서 발생한다.
 *       부모 창 갱신은 success 페이지의 window.opener 처리로 진행한다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  verifyInicisPayment,
  type InicisReturnData,
} from '@/lib/payment-inicis'
import { getCreditPackage, type CreditPackageId } from '@/lib/payment-portone'

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  // ── 1. Form-data 파싱 ────────────────────────────────────
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return redirectFail(baseUrl, '결제 데이터 파싱 실패')
  }

  const get = (k: string) => (formData.get(k) as string | null) ?? ''

  const returnData: InicisReturnData = {
    resultCode:  get('resultCode'),
    resultMsg:   get('resultMsg'),
    mid:         get('mid'),
    orderNumber: get('orderNumber') || get('MOID'),
    authCode:    get('authCode'),
    authDate:    get('authDate'),
    itemName:    get('itemName') || get('goodName'),
    price:       get('price') || get('PRICE'),
    buyerName:   get('buyerName'),
    buyerEmail:  get('buyerEmail'),
    buyerTel:    get('buyerTel'),
    authToken:   get('authToken'),
    authUrl:     get('authUrl'),
    netCancelUrl: get('netCancelUrl'),
    charset:     get('charset') || 'UTF-8',
    merchantData: get('merchantData'),
  }

  // ── 2. 결제 실패 처리 ────────────────────────────────────
  if (returnData.resultCode !== '0000') {
    const msg = returnData.resultMsg || '결제가 취소되었습니다.'
    console.warn('[Inicis Return] 결제 실패:', returnData.resultCode, msg)
    return redirectFail(baseUrl, msg)
  }

  // ── 3. 이니시스 승인 API 호출 ────────────────────────────
  let approval
  try {
    approval = await verifyInicisPayment(returnData)
  } catch (err) {
    console.error('[Inicis Return] verifyInicisPayment 예외:', err)
    return redirectFail(baseUrl, '결제 승인 중 오류가 발생했습니다.')
  }

  if (!approval.success) {
    console.error('[Inicis Return] 승인 실패:', approval.error)
    return redirectFail(baseUrl, approval.error ?? '결제 승인 실패')
  }

  const oid    = approval.oid ?? returnData.orderNumber
  const tid    = approval.tid ?? ''
  const price  = approval.price ?? parseInt(returnData.price ?? '0', 10)
  const method = approval.method ?? ''

  // ── 4. DB 조회 — 주문 메타데이터 확인 ────────────────────
  const supabase = await createClient()

  const { data: pendingRecord } = await supabase
    .from('payment_history')
    .select('user_id, product_type, metadata, amount')
    .eq('order_id', oid)
    .eq('status', 'PENDING')
    .maybeSingle()

  if (!pendingRecord) {
    // 주문 레코드 없으면 보안상 거부
    console.error('[Inicis Return] pending 주문 없음 oid:', oid)
    return redirectFail(baseUrl, '주문 정보를 찾을 수 없습니다.')
  }

  const userId      = pendingRecord.user_id as string
  const productType = pendingRecord.product_type as string
  const meta        = (pendingRecord.metadata ?? {}) as Record<string, string>
  const planId      = meta.planId
  const packageId   = meta.packageId

  // 금액 위변조 탐지
  if (Math.abs(price - (pendingRecord.amount as number)) > 0) {
    console.error('[Inicis Return] 금액 불일치! DB:', pendingRecord.amount, 'PG:', price)
    return redirectFail(baseUrl, `결제 금액 불일치 (예상: ${pendingRecord.amount}원, 실제: ${price}원)`)
  }

  // ── 5. 혜택 지급 ─────────────────────────────────────────
  const isSubscription  = oid.startsWith('SUB-')
  const isCreditPurchase = oid.startsWith('CRD-')
  let creditsGranted = 0
  let benefit = ''

  try {
    if (isCreditPurchase) {
      let credits = 0
      if (packageId) {
        const pkg = getCreditPackage(packageId as CreditPackageId)
        credits = pkg?.credits ?? Math.floor(price / 1000)
      } else {
        credits = Math.floor(price / 1000)
      }

      const { error: txErr } = await supabase
        .from('credit_transactions')
        .insert({
          user_id:          userId,
          amount:           credits,
          transaction_type: 'PURCHASE',
          description:      `크레딧 구매 (${credits}C) — 주문 ${oid}`,
          reference_id:     oid,
        })
      if (txErr) console.error('[Inicis Return] credit_transactions error:', txErr.message)

      await supabase.rpc('increment_credit_balance', {
        p_user_id: userId,
        p_amount:  credits,
        p_reason:  `크레딧 구매 ${credits}개 — 주문 ${oid}`,
      }).then(({ error }) => {
        if (error) console.error('[Inicis Return] increment_credit_balance error:', error.message)
      })

      creditsGranted = credits
      benefit = `${credits} 크레딧이 충전되었습니다.`

    } else if (isSubscription) {
      const { error: subErr } = await supabase
        .from('subscriptions')
        .upsert({
          user_id:    userId,
          plan:       planId?.toUpperCase() ?? 'PRO',
          status:     'ACTIVE',
          order_id:   oid,
          payment_id: tid,
          amount:     price,
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'user_id' })

      if (subErr) console.error('[Inicis Return] subscriptions upsert error:', subErr.message)
      benefit = `${planId ?? 'PRO'} 플랜이 활성화되었습니다.`
    }
  } catch (err) {
    console.error('[Inicis Return] 혜택 지급 오류:', err)
    // 승인은 성공했으므로 실패 처리하지 않고 계속 진행 (수동 처리)
  }

  // ── 6. 결제 이력 업데이트 ────────────────────────────────
  await supabase
    .from('payment_history')
    .update({
      payment_id:      tid,
      pg_provider:     `inicis_${method}`,
      status:          'PAID',
      credits_granted: creditsGranted,
      metadata: {
        ...meta,
        tid,
        method,
        approveDate: approval.approveDate,
        approveTime: approval.approveTime,
        benefit,
      },
    })
    .eq('order_id', oid)
    .then(({ error }) => {
      if (error) console.error('[Inicis Return] payment_history update error:', error.message)
    })

  // ── 7. 성공 리다이렉트 ───────────────────────────────────
  const params = new URLSearchParams({
    orderId:  oid,
    paymentId: tid,
    amount:   String(price),
    ...(productType === 'SUBSCRIPTION' && planId  ? { planId }    : {}),
    ...(productType === 'CREDIT_PURCHASE' && packageId ? { packageId } : {}),
  })

  return NextResponse.redirect(`${baseUrl}/payment/success?${params.toString()}`, {
    status: 302,
  })
}

// ─── 실패 리다이렉트 헬퍼 ────────────────────────────────

function redirectFail(baseUrl: string, message: string): NextResponse {
  const params = new URLSearchParams({ message })
  return NextResponse.redirect(`${baseUrl}/payment/fail?${params.toString()}`, {
    status: 302,
  })
}
