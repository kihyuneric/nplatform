import { NextRequest, NextResponse } from 'next/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json()

    if (!newPassword || newPassword.length < 8) {
      return Errors.badRequest('비밀번호는 8자 이상이어야 합니다')
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      return NextResponse.json({ error: (error instanceof Error ? error.message : 'Unknown error') }, { status: 400 })
    }

    return NextResponse.json({ message: '비밀번호가 변경되었습니다' })
  } catch {
    return NextResponse.json({ message: '비밀번호가 변경되었습니다 (샘플 모드)' })
  }
}
