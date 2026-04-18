import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN']

async function requireAdmin() {
  const user = await getAuthUserWithRole()
  if (!user) return { error: apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401) }
  if (!user.role || !ADMIN_ROLES.includes(user.role)) {
    return { error: apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403) }
  }
  return { user }
}

const VALID_STATUSES = ['ACTIVE', 'HIDDEN', 'PENDING', 'REJECTED', 'REPORTED']

// PATCH /api/v1/admin/listings/[id]
// Body: { status: 'ACTIVE' | 'HIDDEN' | ... }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  if (!id) return apiError('BAD_REQUEST', 'id가 필요합니다.', 400)

  try {
    const body = await request.json() as { status?: string }
    if (!body.status || !VALID_STATUSES.includes(body.status)) {
      return apiError('BAD_REQUEST', `유효하지 않은 status: ${body.status}`, 400)
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('npl_listings')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: body.status === 'ACTIVE' ? '매물 승인 완료' :
                body.status === 'HIDDEN'  ? '매물 숨김 처리 완료' : '상태 변경 완료',
    })
  } catch (error) {
    console.error('[admin/listings/[id] PATCH]', error)
    return apiError('INTERNAL_ERROR', '처리 실패', 500)
  }
}

// DELETE /api/v1/admin/listings/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  if (!id) return apiError('BAD_REQUEST', 'id가 필요합니다.', 400)

  try {
    const supabase = await createClient()
    // Soft delete: set status to REJECTED instead of hard delete
    const { error } = await supabase
      .from('npl_listings')
      .update({ status: 'REJECTED', updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: '매물 삭제 완료' })
  } catch (error) {
    console.error('[admin/listings/[id] DELETE]', error)
    return apiError('INTERNAL_ERROR', '삭제 실패', 500)
  }
}

// GET /api/v1/admin/listings/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  const { id } = await params
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('npl_listings')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return apiError('NOT_FOUND', '매물을 찾을 수 없습니다.', 404)
    return NextResponse.json({ listing: data })
  } catch (error) {
    console.error('[admin/listings/[id] GET]', error)
    return apiError('INTERNAL_ERROR', '조회 실패', 500)
  }
}
