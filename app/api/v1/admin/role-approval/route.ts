import { createClient } from '@/lib/supabase/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { getAuthUser } from '@/lib/auth/get-user'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - List pending role requests
export async function GET() {
  let userId = 'anonymous'
  try { const authUser = await getAuthUser(); if (authUser) userId = authUser.id } catch {}
  if (userId === 'anonymous') return NextResponse.json({ requests: [], _mock: true })

  const supabase = await createClient()

  // Check admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    return Errors.forbidden('관리자 권한이 필요합니다.')
  }

  const { data, error } = await supabase
    .from('role_requests')
    .select(`*, user:users!role_requests_user_id_fkey(id, name, email, avatar_url, role)`)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) return fromUnknown(error)
  return NextResponse.json({ requests: data || [] })
}

// POST - Approve or reject a role request
export async function POST(req: NextRequest) {
  let postUserId = 'anonymous'
  try { const authUser = await getAuthUser(); if (authUser) postUserId = authUser.id } catch {}
  if (postUserId === 'anonymous') return Errors.unauthorized('로그인이 필요합니다.')

  const supabase = await createClient()

  // Check admin role
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', postUserId)
    .single()

  if (!profile || !['ADMIN', 'SUPER_ADMIN'].includes(profile.role)) {
    return Errors.forbidden('관리자 권한이 필요합니다.')
  }

  const body = await req.json()
  const { request_id, action, rejection_reason } = body

  if (!request_id || !['APPROVED', 'REJECTED'].includes(action)) {
    return Errors.badRequest('유효하지 않은 요청입니다.')
  }

  // Get the role request
  const { data: roleRequest, error: fetchError } = await supabase
    .from('role_requests')
    .select('*')
    .eq('id', request_id)
    .eq('status', 'PENDING')
    .single()

  if (fetchError || !roleRequest) {
    return Errors.notFound('해당 요청을 찾을 수 없습니다.')
  }

  // Update role request status
  const { error: updateError } = await supabase
    .from('role_requests')
    .update({
      status: action,
      reviewed_by: postUserId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: action === 'REJECTED' ? rejection_reason : null,
    })
    .eq('id', request_id)

  if (updateError) return fromUnknown(updateError)

  // If approved, update the user's role
  if (action === 'APPROVED') {
    const { error: roleError } = await supabase
      .from('users')
      .update({ role: roleRequest.requested_role })
      .eq('id', roleRequest.user_id)

    if (roleError) return fromUnknown(roleError)
  }

  return NextResponse.json({
    message: action === 'APPROVED' ? '승인되었습니다.' : '거절되었습니다.',
    request_id,
    action,
  })
}
