import { NextRequest, NextResponse } from 'next/server'
import { calculateDealFees, type DealFeeInput } from '@/lib/settlement/fee-engine'
import { Errors } from '@/lib/api-error'

export async function POST(req: NextRequest) {
  try {
    const body: DealFeeInput = await req.json()
    const { assetType, transactionAmount } = body

    if (!assetType || !transactionAmount) {
      return Errors.badRequest('assetType and transactionAmount are required')
    }
    if (!['npl', 're'].includes(assetType)) {
      return Errors.badRequest('assetType must be npl or re')
    }
    if (transactionAmount <= 0) {
      return Errors.badRequest('transactionAmount must be positive')
    }

    const result = calculateDealFees(body)

    return NextResponse.json({ success: true, data: result })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '수수료 계산 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
