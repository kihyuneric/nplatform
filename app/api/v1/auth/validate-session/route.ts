import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ valid: false, reason: 'NO_SESSION' })
    }

    return NextResponse.json({
      valid: true,
      user_id: user.id,
      email: user.email,
    })
  } catch {
    return NextResponse.json({ valid: false, reason: 'ERROR' })
  }
}

// GET: 현재 세션 정보 반환
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ authenticated: false })
    }

    // users 테이블에서 추가 정보 조회
    const { data: profile } = await supabase
      .from('users')
      .select('role, kyc_status, subscription_tier, credit_balance, is_verified')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: profile?.role ?? null,
        kyc_status: profile?.kyc_status ?? null,
        subscription_tier: profile?.subscription_tier ?? null,
        credit_balance: profile?.credit_balance ?? 0,
        is_verified: profile?.is_verified ?? false,
      },
    })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
