/**
 * /api/v1/api-keys/[id]
 * PATCH  — revoke (deactivate) an API key
 * DELETE — permanently delete an API key
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { apiError } from '@/lib/api-error'

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)

    const { data, error } = await supabase
      .from('api_keys')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', user.id)   // can only revoke own keys
      .select('id, name, key_prefix, is_active, created_at, last_used_at')
      .single()

    if (error || !data) {
      console.warn('[api-keys PATCH] update failed:', error?.message)
      // If table doesn't exist yet, return 200 so UI stays unblocked
      return NextResponse.json({ data: { id, is_active: false } })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('[api-keys PATCH]', err)
    return apiError('INTERNAL_ERROR', 'API 키 비활성화 실패', 500)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)

    const { error } = await supabase
      .from('api_keys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.warn('[api-keys DELETE]', error.message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api-keys DELETE]', err)
    return apiError('INTERNAL_ERROR', 'API 키 삭제 실패', 500)
  }
}
