import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import { NO_STORE } from '@/lib/api-cache'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PARTNER']

/**
 * GET /api/v1/listing-intakes/file?path=... — 첨부 열람 링크 (2026-08-19)
 *
 * `listing-files` 버킷은 비공개다. 권한을 확인한 뒤 10분짜리 서명 URL 을 발급한다.
 *   - 올린 본인 (경로 첫 칸이 본인 ID)
 *   - 운영관리자 · 운영파트너
 *
 * 매입 회원의 서류 열람은 NDA 승인 이후 별도 경로로 다룬다(여기서는 허용하지 않는다).
 */
export async function GET(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)

  const path = request.nextUrl.searchParams.get('path') || ''
  if (!path) return apiError('BAD_REQUEST', '파일 경로가 필요합니다.', 400)

  const isAdmin = !!me.role && ADMIN_ROLES.includes(me.role)
  const owner = path.split('/')[0]
  if (!isAdmin && owner !== me.id) {
    return apiError('FORBIDDEN', '본인이 올린 파일만 열람할 수 있습니다.', 403)
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from('listing-files')
      .createSignedUrl(path, 600)
    if (error || !data?.signedUrl) throw error ?? new Error('서명 URL 발급 실패')
    return NextResponse.json({ url: data.signedUrl }, { headers: NO_STORE })
  } catch (e) {
    console.error('intake file GET error:', e)
    return apiError('INTERNAL_ERROR', '파일 열람 링크 발급에 실패했습니다.', 500)
  }
}
