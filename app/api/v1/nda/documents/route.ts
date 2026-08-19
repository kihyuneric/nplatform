import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PARTNER']

/**
 * GET /api/v1/nda/documents — 체결된 NDA 문서 목록 (2026-08-19)
 *
 * 열람 범위
 *   - 매입 회원: 본인이 체결한 문서만
 *   - 운영관리자: 전체 (?user= 회원 기준 · ?listing= 매물 기준 · ?request= 단건)
 *
 * 응답에는 체결 시점 전문(content_text)이 포함된다 — 뷰어가 그대로 렌더하고
 * 같은 문장으로 PDF 를 만든다.
 */
export async function GET(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  const isAdmin = !!me.role && ADMIN_ROLES.includes(me.role)

  const { searchParams } = request.nextUrl
  const user = searchParams.get('user') || ''
  const listing = searchParams.get('listing') || ''
  const requestId = searchParams.get('request') || ''

  try {
    const supabase = await createClient()
    let q = supabase
      .from('nda_documents')
      .select('id, request_id, listing_id, listing_no, user_id, signer, email, agreed_at, terms_version, content_text, file_path, created_at')
      .order('agreed_at', { ascending: false })
      .limit(200)

    // 관리자가 아니면 항상 본인 것으로 강제 (URL 조작으로 남의 문서를 볼 수 없다)
    q = isAdmin ? (user ? q.eq('user_id', user) : q) : q.eq('user_id', me.id)
    if (listing) q = q.eq('listing_id', listing)
    if (requestId) q = q.eq('request_id', requestId)

    const { data, error } = await q
    if (error) throw error

    // 체결 회원 표시명 (관리자 화면용)
    const rows = data ?? []
    if (isAdmin && rows.length > 0) {
      const uids = Array.from(new Set(rows.map(r => r.user_id))) as string[]
      const { data: members } = await supabase.from('users').select('id, name, company_name').in('id', uids)
      const map: Record<string, string> = {}
      for (const m of members ?? []) {
        map[m.id as string] = [m.company_name, m.name].filter(Boolean).join(' · ')
      }
      for (const r of rows as Array<Record<string, unknown>>) {
        r.member_label = map[r.user_id as string] ?? ''
      }
    }

    return NextResponse.json({ data: rows, isAdmin })
  } catch (e) {
    console.error('nda documents GET error:', e)
    return apiError('INTERNAL_ERROR', 'NDA 문서 조회에 실패했습니다.', 500)
  }
}

/**
 * PATCH /api/v1/nda/documents — PDF 보관본 경로 기록
 * body: { id, file_path }
 * 본인 문서 또는 관리자만 가능.
 */
export async function PATCH(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  const isAdmin = !!me.role && ADMIN_ROLES.includes(me.role)

  try {
    const body = await request.json()
    const id = String(body.id ?? '')
    const filePath = String(body.file_path ?? '')
    if (!id || !filePath) return apiError('BAD_REQUEST', 'id 와 file_path 가 필요합니다.', 400)

    const supabase = await createClient()
    let q = supabase.from('nda_documents').update({ file_path: filePath }).eq('id', id)
    if (!isAdmin) q = q.eq('user_id', me.id)
    const { error } = await q
    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('nda documents PATCH error:', e)
    return apiError('INTERNAL_ERROR', 'PDF 보관본 저장에 실패했습니다.', 500)
  }
}

/**
 * DELETE /api/v1/nda/documents?id=&file=1 — 보관 PDF 삭제 (운영관리자)
 *
 * 체결 기록 자체는 지우지 않는다(법적 근거). 보관 파일만 지운다.
 */
export async function DELETE(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  if (!me.role || !['SUPER_ADMIN', 'ADMIN'].includes(me.role)) {
    return apiError('FORBIDDEN', '운영관리자만 삭제할 수 있습니다.', 403)
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return apiError('BAD_REQUEST', '문서 ID가 필요합니다.', 400)

  try {
    const supabase = await createClient()
    const { data: doc } = await supabase.from('nda_documents').select('file_path').eq('id', id).maybeSingle()
    if (doc?.file_path) {
      await supabase.storage.from('nda-documents').remove([doc.file_path as string])
    }
    const { error } = await supabase.from('nda_documents').update({ file_path: null }).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('nda documents DELETE error:', e)
    return apiError('INTERNAL_ERROR', '보관 파일 삭제에 실패했습니다.', 500)
  }
}
