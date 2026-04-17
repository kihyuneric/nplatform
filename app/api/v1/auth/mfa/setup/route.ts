import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    // Get MFA factors for the user
    const { data: factors, error } = await supabase.auth.mfa.listFactors()

    if (error) {
      return NextResponse.json({ status: 'NOT_SET', required: false, factors: [] })
    }

    const totpFactors = (factors?.all ?? []).filter(f => f.factor_type === 'totp')
    const verifiedFactors = (factors?.totp ?? [])
    const unverifiedFactors = totpFactors.filter(f => !verifiedFactors.some(v => v.id === f.id))

    return NextResponse.json({
      status: verifiedFactors.length > 0 ? 'ENABLED' : unverifiedFactors.length > 0 ? 'PENDING' : 'NOT_SET',
      required: false,
      factors: totpFactors.map(f => ({
        id: f.id,
        type: f.factor_type,
        status: f.status,
        friendly_name: f.friendly_name,
        created_at: f.created_at,
        updated_at: f.updated_at,
      })),
    })
  } catch (err) {
    logger.error('[mfa/setup] GET error:', { error: err })
    return NextResponse.json({ status: 'NOT_SET', required: false, factors: [] })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const friendlyName: string = body.friendlyName ?? body.friendly_name ?? 'Authenticator App'

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName,
    })

    if (error) {
      logger.error('[mfa/setup] enroll error:', { error })
      return NextResponse.json(
        { error: { code: 'MFA_ENROLL_FAILED', message: error.message } },
        { status: 400 }
      )
    }

    return NextResponse.json({ data })
  } catch (err) {
    logger.error('[mfa/setup] POST error:', { error: err })
    return NextResponse.json(
      { error: { code: 'ERROR', message: '서버 오류' } },
      { status: 500 }
    )
  }
}
