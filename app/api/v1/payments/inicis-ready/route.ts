/**
 * POST /api/v1/payments/inicis-ready
 *
 * KG이니시스 표준결제창 파라미터 생성
 *
 * 클라이언트 흐름:
 *  1) 이 API 호출 → 서버에서 oid, timestamp, signature, mKey 생성
 *  2) 클라이언트가 받은 formFields로 hidden form 생성
 *  3) INIStdPay.pay(formId) 호출 → 결제창 팝업
 *  4) 사용자 결제 완료 → POST to returnUrl (/api/v1/payments/inicis-return)
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Errors, fromZodError, fromUnknown } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'
import {
  buildInicisCheckoutParams,
  getInicisConfig,
} from '@/lib/payment-inicis'
import { generateOrderId } from '@/lib/payment'

const ReadySchema = z.object({
  /** 결제 유형 */
  type:        z.enum(['SUBSCRIPTION', 'CREDIT_PURCHASE']),
  /** 결제 금액 (원) */
  amount:      z.number().int().positive(),
  /** 구독 플랜 ID */
  planId:      z.string().optional(),
  /** 크레딧 패키지 ID */
  packageId:   z.string().optional(),
  /** 구매자 이름 */
  buyername:   z.string().min(1).max(100),
  /** 구매자 이메일 */
  buyeremail:  z.string().email(),
  /** 구매자 전화번호 (없으면 기본값) */
  buyertel:    z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ReadySchema.safeParse(body)
    if (!parsed.success) return fromZodError(parsed.error)

    const { type, amount, planId, packageId, buyername, buyeremail, buyertel } = parsed.data

    // ── 1. 로그인 확인 ───────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Errors.unauthorized('결제를 위해 로그인이 필요합니다.')

    // ── 2. 주문 ID 생성 ──────────────────────────────────────
    const prefix = type === 'SUBSCRIPTION' ? 'SUB' : 'CRD'
    const oid    = generateOrderId(prefix)

    // ── 3. 상품명 ────────────────────────────────────────────
    const goodname =
      type === 'SUBSCRIPTION'
        ? `NPLatform 구독 - ${planId ?? 'PRO'}`
        : `크레딧 충전 - ${packageId ?? 'CREDIT'}`

    // ── 4. returnUrl / closeUrl ──────────────────────────────
    const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const returnUrl = `${baseUrl}/api/v1/payments/inicis-return`
    const closeUrl  = `${baseUrl}/payment/fail`

    // ── 5. 결제 파라미터 생성 (서명 포함) ────────────────────
    const config       = getInicisConfig()
    const formFields   = buildInicisCheckoutParams({
      oid,
      goodname,
      price:      amount,
      buyername,
      buyeremail,
      buyertel:   buyertel ?? '',
      returnUrl,
      closeUrl,
    })

    // ── 6. 주문 임시 저장 (결제 완료 후 검증용) ───────────────
    await supabase
      .from('payment_history')
      .insert({
        user_id:      user.id,
        order_id:     oid,
        amount,
        pg_provider:  'inicis',
        status:       'PENDING',
        product_type: type === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'CREDIT_PURCHASE',
        metadata:     { planId, packageId, buyername, buyeremail },
      })
      .then(({ error }) => {
        if (error) console.error('[Inicis] pending payment_history insert error:', error.message)
      })

    return NextResponse.json({
      ok:         true,
      oid,
      isTest:     config.isTest,
      formFields,
    })

  } catch (err) {
    return fromUnknown(err)
  }
}
