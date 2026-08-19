import { NextResponse } from 'next/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/auth/me — 현재 로그인 회원 (2026-08-19 신설)
 *
 * 화면이 "내가 누구이고 어떤 권한인지"를 물어보는 단일 창구.
 * 브라우저에서 Supabase 를 직접 호출해 판정하던 방식은
 * NEXT_PUBLIC_SUPABASE_* 가 번들에 없으면 응답이 오지 않아
 * 운영관리자인데도 읽기 전용으로 남는 문제가 있었다.
 */
export async function GET() {
  const me = await getAuthUserWithRole()
  if (!me) return NextResponse.json({ user: null }, { status: 401 })

  return NextResponse.json({
    user: {
      id: me.id,
      email: me.email ?? null,
      role: me.role ?? null,
    },
  })
}
