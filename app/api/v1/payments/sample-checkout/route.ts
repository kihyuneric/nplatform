import { NextRequest, NextResponse } from "next/server"
import { generateOrderId } from "@/lib/payment"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, orderName, type } = body

    const orderId = generateOrderId(type === 'SUBSCRIPTION' ? 'SUB' : 'CRD')

    // Check if real PG is configured
    const pgKey = process.env.PAYMENT_CLIENT_KEY
    if (pgKey && pgKey !== '' && pgKey !== 'your-key-here') {
      // Real PG checkout URL (Toss Payments)
      return NextResponse.json({
        data: {
          orderId,
          checkoutUrl: `https://pay.toss.im/v2/payment?amount=${amount}&orderId=${orderId}&orderName=${encodeURIComponent(orderName)}`,
          _sample: false,
        }
      })
    }

    // Sample: mock checkout
    return NextResponse.json({
      data: {
        orderId,
        amount,
        orderName,
        status: 'SAMPLE_COMPLETED',
        message: '샘플 결제가 완료되었습니다. 실제 결제를 위해 관리자 → API 연동 → 토스페이먼츠에서 키를 입력하세요.',
        _sample: true,
      }
    })
  } catch {
    return NextResponse.json({ error: { code: 'ERROR', message: '결제 처리 오류' } }, { status: 500 })
  }
}
