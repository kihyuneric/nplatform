import { NextRequest, NextResponse } from "next/server"
import { setupMFA } from "@/lib/mfa"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: { code: 'BAD_REQUEST', message: '이메일이 필요합니다.' } }, { status: 400 })
    }
    const mfaData = setupMFA(email)
    return NextResponse.json({ data: mfaData })
  } catch {
    return NextResponse.json({ error: { code: 'ERROR', message: '서버 오류' } }, { status: 500 })
  }
}

export async function GET() {
  // Check MFA status for current user
  return NextResponse.json({
    data: { status: 'NOT_SET', required: false },
    _mock: true,
  })
}
