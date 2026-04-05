import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { getPaymentConfig, generateOrderId, getPaymentUrls } from '@/lib/payment'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, plan_id, product_id, amount } = body

    if (!type || !amount) {
      return Errors.badRequest('type and amount are required')
    }

    if (!['SUBSCRIPTION', 'CREDIT_PURCHASE'].includes(type)) {
      return Errors.badRequest('type must be SUBSCRIPTION or CREDIT_PURCHASE')
    }

    const config = getPaymentConfig()
    const orderId = generateOrderId(type === 'SUBSCRIPTION' ? 'SUB' : 'CRD')
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const { successUrl, failUrl } = getPaymentUrls(baseUrl)

    const orderName =
      type === 'SUBSCRIPTION'
        ? `NPLatform 구독 - ${plan_id || 'PRO'}`
        : `크레딧 충전 - ${product_id || 'CREDIT_100'}`

    // If PG is configured, create a real payment session
    if (config.provider !== 'none' && config.clientKey) {
      // Toss Payments example: return client-side checkout params
      if (config.provider === 'toss') {
        return NextResponse.json({
          provider: 'toss',
          clientKey: config.clientKey,
          orderId,
          orderName,
          amount,
          successUrl: `${successUrl}?orderId=${orderId}`,
          failUrl: `${failUrl}?orderId=${orderId}`,
          isTestMode: config.isTestMode,
        })
      }

      // Other providers: similar pattern
      return NextResponse.json({
        provider: config.provider,
        orderId,
        orderName,
        amount,
        checkoutUrl: `${successUrl}?orderId=${orderId}&mock=false`,
      })
    }

    // Mock checkout: no real PG configured
    const extraParams = new URLSearchParams({ orderId, amount: String(amount), mock: 'true' })
    if (plan_id)    extraParams.set('planId', plan_id)
    if (product_id) extraParams.set('packageId', product_id)

    return NextResponse.json({
      _mock: true,
      provider: 'none',
      orderId,
      orderName,
      amount,
      checkoutUrl: `${successUrl}?${extraParams.toString()}`,
      message: '결제 게이트웨이가 설정되지 않았습니다. 목 결제로 진행합니다.',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create checkout session', detail: String(error) },
      { status: 500 }
    )
  }
}
