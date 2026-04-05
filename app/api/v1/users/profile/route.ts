import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// GET /api/v1/users/profile?id=<uuid>  또는 자신의 프로필 (id 없이)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const targetId = searchParams.get('id') || user.id

    const { data, error } = await supabase
      .from('users')
      .select(`
        id, email, name, role, company_name, phone,
        is_verified, kyc_status, subscription_tier,
        credit_balance, avatar_url, created_at
      `)
      .eq('id', targetId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다.' } }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    logger.error('[users/profile] GET Error:', { error: err })
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 })
  }
}

// PATCH /api/v1/users/profile  — 자신의 프로필 수정
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
    }

    const body = await req.json()

    const ALLOWED_FIELDS = ['name', 'phone', 'avatar_url', 'company_name'] as const
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    if (Object.keys(updates).length === 1) {
      return NextResponse.json({ error: { code: 'NO_UPDATES', message: '변경할 항목이 없습니다.' } }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data, success: true })
  } catch (err) {
    logger.error('[users/profile] PATCH Error:', { error: err })
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: '프로필 업데이트 실패' } }, { status: 500 })
  }
}

// PUT — PATCH와 동일 (하위 호환)
export { PATCH as PUT }
