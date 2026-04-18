import { NextRequest, NextResponse } from 'next/server'

// POST /api/v1/kyc/verify — v2 다단계 KYC 인증
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { level, data } = body

    if (!level || !data) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'level and data are required' } },
        { status: 400 }
      )
    }

    if (![2, 3, 4].includes(level)) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'level must be 2, 3, or 4' } },
        { status: 400 }
      )
    }

    // Level-specific validation
    if (level === 2) {
      if (!data.idNumber || !data.passConsent) {
        return NextResponse.json(
          { error: { code: 'BAD_REQUEST', message: '신분증 번호와 PASS 동의가 필요합니다.' } },
          { status: 400 }
        )
      }
    }

    if (level === 3) {
      if (!data.experiences?.length || !data.incomeBracket) {
        return NextResponse.json(
          { error: { code: 'BAD_REQUEST', message: '투자 경험과 소득 구간이 필요합니다.' } },
          { status: 400 }
        )
      }
    }

    if (level === 4) {
      if (!data.assetType) {
        return NextResponse.json(
          { error: { code: 'BAD_REQUEST', message: '자산 유형이 필요합니다.' } },
          { status: 400 }
        )
      }
    }

    // Simulate verification (immediate for L2/L3, manual review for L4)
    const status = level === 4 ? 'pending_review' : 'approved'
    const limits: Record<number, string> = {
      2: '20억 원 미만',
      3: '100억 원 미만',
      4: '무제한',
    }

    return NextResponse.json({
      success: true,
      data: {
        level,
        status,
        newLimit: limits[level],
        message: status === 'approved'
          ? `레벨 ${level} 인증이 완료되었습니다. 거래 한도 ${limits[level]}이 즉시 적용됩니다.`
          : '레벨 4 전문 투자자 인증은 담당자 검토 후 1~2 영업일 내 처리됩니다.',
        verifiedAt: status === 'approved' ? new Date().toISOString() : null,
      },
    })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'KYC 인증 처리 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
