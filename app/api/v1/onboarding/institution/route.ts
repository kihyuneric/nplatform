import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { instName, bizRegNo, repName, phone, email, assetType } = body

    if (!instName || !bizRegNo || !repName || !phone || !email || !assetType?.length) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: '필수 항목을 모두 입력해주세요.' } },
        { status: 400 }
      )
    }

    // TODO: DB insert + send confirmation email + notify admin Slack
    const applicationId = `INST-${Date.now().toString(36).toUpperCase()}`

    return NextResponse.json({
      success: true,
      data: {
        applicationId,
        status: 'pending_review',
        message: '온보딩 신청이 접수되었습니다. 영업일 1~2일 이내 연락드립니다.',
        estimatedApprovalDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
    }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '신청 처리 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') ?? 'all'

  // Mock pending applications for admin
  const applications = [
    {
      id: 'INST-ABC123',
      instName: '한국자산관리공사',
      bizRegNo: '101-81-12345',
      repName: '김담당',
      email: 'npl@kamco.or.kr',
      assetType: ['NPL 채권', 'P-NPL'],
      estimatedVolume: '1000억+',
      status: 'pending_review',
      createdAt: '2026-04-15T09:00:00Z',
    },
    {
      id: 'INST-DEF456',
      instName: '우리자산신탁',
      bizRegNo: '201-81-67890',
      repName: '박팀장',
      email: 'npl@wooritrust.co.kr',
      assetType: ['담보 부동산', 'NPL 채권'],
      estimatedVolume: '200~500억',
      status: 'approved',
      createdAt: '2026-04-10T14:30:00Z',
      approvedAt: '2026-04-11T10:00:00Z',
    },
  ]

  const filtered = status === 'all' ? applications : applications.filter(a => a.status === status)
  return NextResponse.json({ success: true, data: filtered, total: filtered.length })
}
