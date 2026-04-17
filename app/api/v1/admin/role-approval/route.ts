import { createClient } from '@/lib/supabase/server'
import { Errors, fromUnknown } from '@/lib/api-error'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - List pending role requests
export async function GET() {
  const authUser = await getAuthUserWithRole()
  if (!authUser) return Errors.unauthorized('로그인이 필요합니다.')
  if (!authUser.role || !['ADMIN', 'SUPER_ADMIN'].includes(authUser.role)) {
    return Errors.forbidden('관리자 권한이 필요합니다.')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('role_requests')
    .select(`*, user:users!role_requests_user_id_fkey(id, name, email, avatar_url, role)`)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })

  if (error) {
    // Fallback: query users with a pending role_request field
    const { data: usersWithRequest, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, avatar_url, role, role_request, role_request_at')
      .not('role_request', 'is', null)
      .order('role_request_at', { ascending: false })

    if (usersError) return fromUnknown(usersError)

    const requests = (usersWithRequest || []).map((u) => ({
      id: u.id,
      user_id: u.id,
      requested_role: u.role_request,
      status: 'PENDING',
      created_at: u.role_request_at,
      user: { id: u.id, name: u.name, email: u.email, avatar_url: u.avatar_url, role: u.role },
    }))

    return NextResponse.json({ requests })
  }

  return NextResponse.json({ requests: data || [] })
}

// POST - Approve or reject a role request
export async function POST(req: NextRequest) {
  const authUser = await getAuthUserWithRole()
  if (!authUser) return Errors.unauthorized('로그인이 필요합니다.')
  if (!authUser.role || !['ADMIN', 'SUPER_ADMIN'].includes(authUser.role)) {
    return Errors.forbidden('관리자 권한이 필요합니다.')
  }

  const supabase = await createClient()

  const body = await req.json()
  const { request_id, action, rejection_reason } = body

  if (!request_id || !['APPROVED', 'REJECTED'].includes(action)) {
    return Errors.badRequest('유효하지 않은 요청입니다.')
  }

  // Try role_requests table first
  const { data: roleRequest, error: fetchError } = await supabase
    .from('role_requests')
    .select('*')
    .eq('id', request_id)
    .eq('status', 'PENDING')
    .single()

  if (!fetchError && roleRequest) {
    // Update role request status
    const { error: updateError } = await supabase
      .from('role_requests')
      .update({
        status: action,
        reviewed_by: authUser.id,
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

  // Fallback: request_id is a user_id, update role_request field on users table
  const { data: targetUser, error: userFetchError } = await supabase
    .from('users')
    .select('id, role_request')
    .eq('id', request_id)
    .not('role_request', 'is', null)
    .single()

  if (userFetchError || !targetUser) {
    return Errors.notFound('해당 요청을 찾을 수 없습니다.')
  }

  const updatePayload: Record<string, unknown> = {
    role_request: null,
    role_request_at: null,
  }

  if (action === 'APPROVED' && targetUser.role_request) {
    updatePayload.role = targetUser.role_request
  }

  const { error: updateError } = await supabase
    .from('users')
    .update(updatePayload)
    .eq('id', request_id)

  if (updateError) return fromUnknown(updateError)

  return NextResponse.json({
    message: action === 'APPROVED' ? '승인되었습니다.' : '거절되었습니다.',
    request_id,
    action,
  })
}
