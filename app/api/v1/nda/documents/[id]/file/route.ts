import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PARTNER']

/**
 * GET /api/v1/nda/documents/[id]/file — 보관 PDF 열람 URL (2026-08-19)
 *
 * nda-documents 버킷은 비공개다. 권한을 확인한 뒤 10분짜리 서명 URL 을 발급한다.
 *   - 체결 당사자 본인
 *   - 운영관리자 · 운영파트너
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)

  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: doc } = await supabase
      .from('nda_documents')
      .select('user_id, file_path, listing_no')
      .eq('id', id)
      .maybeSingle()

    if (!doc) return apiError('NOT_FOUND', 'NDA 문서를 찾을 수 없습니다.', 404)

    const isAdmin = !!me.role && ADMIN_ROLES.includes(me.role)
    if (!isAdmin && doc.user_id !== me.id) {
      return apiError('FORBIDDEN', '본인이 체결한 NDA 만 열람할 수 있습니다.', 403)
    }
    if (!doc.file_path) {
      return apiError('NOT_FOUND', '보관된 PDF 가 없습니다. 뷰어에서 [PDF 보관]을 먼저 실행하세요.', 404)
    }

    const { data: signed, error } = await supabase.storage
      .from('nda-documents')
      .createSignedUrl(doc.file_path as string, 600)
    if (error || !signed?.signedUrl) throw error ?? new Error('signed url 발급 실패')

    return NextResponse.json({ url: signed.signedUrl, listing_no: doc.listing_no })
  } catch (e) {
    console.error('nda file GET error:', e)
    return apiError('INTERNAL_ERROR', 'PDF 열람 링크 발급에 실패했습니다.', 500)
  }
}
