/**
 * POST /api/v1/payments/confirm
 *
 * 결제 완료 검증 + 혜택 지급
 *
 * PG 지원:
 *   - KG이니시스 (inicis): inicis-return 라우트에서 자동 처리되나,
 *     클라이언트 직접 호출 시에도 DB 상태 기반으로 처리
 *   - PortOne V2 (portone): SDK 팝업 결제 후 paymentId 검증
 *
 * 클라이언트 흐름 (이니시스):
 *  1) inicis-return → DB PAID 업데이트 → success 페이지 리다이렉트
 *  2) success 페이지가 이미 처리된 DB 레코드를 조회 (paymentId = tid)
 *
 * 클라이언트 흐름 (PortOne):
 *  1) 프론트엔드에서 PortOne SDK로 결제창 호출
 *  2) 결제 완료 시 redirectUrl에 paymentId 쿼리파라미터 포함
 *  3) 이 API 호출로 서버사이드 검증 + 크레딧/구독 지급
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Errors, fromZodError, fromUnknown } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'
import {
  verifyPortOnePayment,
  getCreditPackage,
  CREDIT_PACKAGES,
  type CreditPackageId,
} from '@/lib/payment-portone'

const ConfirmSchema = z.object({
  /** PortOne SDK에서 반환하는 결제 ID 또는 이니시스 tid */
  paymentId:   z.string().min(1),
  /** 플랫폼에서 발급한 주문 ID */
  orderId:     z.string().min(1),
  /** 예상 결제 금액 (원) — 위변조 탐지용 */
  amount:      z.number().int().positive(),
  /** 크레딧 패키지 ID (크레딧 구매일 때) */
  packageId:   z.string().optional(),
  /** 구독 플랜 ID (구독 결제일 때) */
  planId:      z.string().optional(),
  /** PG 제공사 (inicis | portone) — 기본: portone */
  pgProvider:  z.enum(['inicis', 'portone']).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = ConfirmSchema.safeParse(body)
    if (!parsed.success) return fromZodError(parsed.error)

    const { paymentId, orderId, amount, packageId, planId, pgProvider } = parsed.data

    // ── 1. 이니시스 결제는 inicis-return 에서 이미 처리 완료 ──
    //       payment_history 에서 PAID 상태 조회 후 바로 응답
    if (pgProvider === 'inicis') {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return Errors.unauthorized('결제 처리를 위해 로그인이 필요합니다.')

      const { data: record } = await supabase
        .from('payment_history')
        .select('*')
        .eq('order_id', orderId)
        .eq('status', 'PAID')
        .maybeSingle()

      if (!record) {
        return NextResponse.json(
          { ok: false, error: '결제 내역을 찾을 수 없습니다. 잠시 후 재시도해주세요.' },
          { status: 404 },
        )
      }

      const meta = (record.metadata ?? {}) as Record<string, unknown>
      return NextResponse.json({
        ok:             true,
        paymentId:      record.payment_id,
        orderId:        record.order_id,
        paidAmount:     record.amount,
        method:         record.pg_provider,
        benefit:        String(meta.benefit ?? '결제가 완료되었습니다.'),
        creditsGranted: record.credits_granted ?? 0,
        isSandbox:      false,
      })
    }

    // ── 1b. PortOne 서버사이드 결제 검증 ─────────────────────
    const result = await verifyPortOnePayment(paymentId, amount, orderId)

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error ?? '결제 검증 실패' },
        { status: 400 }
      )
    }

    // ── 2. 인증된 사용자 확인 ────────────────────────────────────
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Errors.unauthorized('결제 처리를 위해 로그인이 필요합니다.')
    }

    // ── 3. 주문 유형 판별 + 혜택 지급 ───────────────────────────
    const isSubscription  = orderId.startsWith('SUB-')
    const isCreditPurchase = orderId.startsWith('CRD-')
    let grantedBenefit = ''
    let creditsGranted = 0

    if (isCreditPurchase) {
      // 크레딧 패키지로 지급량 계산
      let credits = 0
      if (packageId) {
        const pkg = getCreditPackage(packageId as CreditPackageId)
        credits = pkg?.credits ?? Math.floor(amount / 1000)
      } else {
        credits = Math.floor(amount / 1000)
      }

      // 크레딧 트랜잭션 기록
      const { error: txErr } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: user.id,
          amount: credits,
          transaction_type: 'PURCHASE',
          description: `크레딧 구매 (${credits}C) — 주문 ${orderId}`,
          reference_id: orderId,
        })

      if (txErr) {
        console.error('[Payment] credit_transactions insert error:', txErr.message)
        // 결제는 성공했으나 DB 기록 실패 — 모니터링 알럿 필요
      }

      // 잔액 업데이트 (credit_balance 컬럼)
      await supabase.rpc('increment_credit_balance', {
        p_user_id: user.id,
        p_amount: credits,
        p_reason: `크레딧 구매 ${credits}개 — 주문 ${orderId}`,
      }).then(({ error }) => {
        if (error) console.error('[Payment] increment_credit_balance error:', error.message)
      })

      creditsGranted = credits
      grantedBenefit = `${credits} 크레딧이 충전되었습니다.`

    } else if (isSubscription) {
      const { error: subErr } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan: planId?.toUpperCase() ?? 'PRO',
          status: 'ACTIVE',
          order_id: orderId,
          payment_id: paymentId,
          amount: result.paidAmount,
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }, { onConflict: 'user_id' })

      if (subErr) console.error('[Payment] subscriptions upsert error:', subErr.message)
      grantedBenefit = `${planId ?? 'PRO'} 플랜이 활성화되었습니다.`
    }

    // ── 4. 결제 이력 저장 ────────────────────────────────────────
    await supabase
      .from('payment_history')
      .insert({
        user_id: user.id,
        payment_id: paymentId,
        order_id: orderId,
        amount: result.paidAmount,
        pg_provider: result.method ?? 'portone',
        receipt_url: result.receiptUrl ?? null,
        status: 'PAID',
        product_type: isCreditPurchase ? 'CREDIT_PURCHASE' : isSubscription ? 'SUBSCRIPTION' : 'SERVICE',
        credits_granted: creditsGranted,
        metadata: { packageId, planId },
      })
      .then(({ error }) => {
        if (error) console.error('[Payment] payment_history insert error:', error.message)
      })

    // ── 5. 응답 ──────────────────────────────────────────────────
    return NextResponse.json({
      ok: true,
      paymentId,
      orderId,
      paidAmount: result.paidAmount,
      method: result.method,
      receiptUrl: result.receiptUrl,
      benefit: grantedBenefit,
      creditsGranted,
      isSandbox: !process.env.PORTONE_API_SECRET && !process.env.INICIS_MID,
    })

  } catch (err) {
    return fromUnknown(err)
  }
}
