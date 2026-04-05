import { createClient } from '@/lib/supabase/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST - Request role upgrade
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  let userId = 'anonymous'
  try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}
  if (userId === 'anonymous') return Errors.unauthorized('로그인이 필요합니다.')

  // Get current user role
  const { data: profile } = await supabase.from('users').select('role').eq('id', userId).single()

  const body = await req.json()
  const { requested_role, company_name, business_number, representative_name, reason } = body

  if (!requested_role) {
    return Errors.badRequest('요청할 역할을 선택해주세요.')
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('role_requests')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'PENDING')
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: '이미 처리 대기 중인 요청이 있습니다.' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('role_requests')
    .insert({
      user_id: userId,
      requested_role,
      existing_role: profile?.role || 'VIEWER',
      company_name,
      business_number,
      representative_name,
      reason,
    })
    .select()
    .single()

  if (error) return fromUnknown(error)
  return NextResponse.json({ request: data }, { status: 201 })
}
