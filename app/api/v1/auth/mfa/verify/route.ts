import { NextRequest, NextResponse } from "next/server"
import { verifyTOTP } from "@/lib/mfa"

export async function POST(req: NextRequest) {
  try {
    const { code, secret } = await req.json()
    if (!code || code.length !== 6) {
      return NextResponse.json({ error: { code: 'INVALID_CODE', message: '6자리 인증 코드를 입력해주세요.' } }, { status: 400 })
    }
    const valid = verifyTOTP(secret || 'mock-secret', code)
    if (valid) {
      return NextResponse.json({ success: true, message: '인증 성공' })
    }
    return NextResponse.json({ error: { code: 'INVALID_CODE', message: '잘못된 인증 코드입니다.' } }, { status: 401 })
  } catch {
    return NextResponse.json({ error: { code: 'ERROR', message: '서버 오류' } }, { status: 500 })
  }
}
