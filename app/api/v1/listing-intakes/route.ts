import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import { NO_STORE } from '@/lib/api-cache'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PARTNER']

/**
 * /api/v1/listing-intakes — 매각의뢰 접수 (2026-08-19) · 운영기획서 v4 §3-2, §3-3
 *
 * 등록 확정 전 단계를 담는다. 두 가지 경로가 같은 테이블에 들어온다.
 *   mode=direct — 매각 회원이 세부내역을 직접 채운 건
 *   mode=agency — 파일만 올리고 운영사에 등록을 맡긴 건
 *
 * GET    본인 접수 목록 (관리자는 ?mode= · ?status= · ?user= 로 전체 조회)
 * POST   접수 생성 — 첨부는 이미 Storage 에 올라간 뒤 경로만 넘어온다
 * PATCH  접수 수정 (본인: 보완 재제출 / 관리자: 검수·보완요청)
 */

export async function GET(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  const isAdmin = !!me.role && ADMIN_ROLES.includes(me.role)

  const { searchParams } = request.nextUrl
  const mode = searchParams.get('mode') || ''
  const status = searchParams.get('status') || ''
  const user = searchParams.get('user') || ''
  const id = searchParams.get('id') || ''

  try {
    const supabase = await createClient()
    let q = supabase
      .from('listing_intakes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)

    // 관리자가 아니면 본인 것으로 강제한다 (URL 조작으로 남의 접수를 볼 수 없다)
    q = isAdmin ? (user ? q.eq('seller_id', user) : q) : q.eq('seller_id', me.id)
    if (mode) q = q.eq('mode', mode)
    if (status) q = q.eq('status', status)
    if (id) q = q.eq('id', id)

    const { data, error } = await q
    if (error) throw error

    const rows = data ?? []
    // 접수 회원 표시명 (관리자 화면용)
    if (isAdmin && rows.length > 0) {
      const uids = Array.from(new Set(rows.map(r => r.seller_id))) as string[]
      const { data: members } = await supabase.from('users').select('id, name, company_name, phone, email').in('id', uids)
      const map: Record<string, { label: string; contact: string }> = {}
      for (const m of members ?? []) {
        map[m.id as string] = {
          label: [m.company_name, m.name].filter(Boolean).join(' · ') || String(m.id).slice(0, 8),
          contact: [m.phone, m.email].filter(Boolean).join(' · '),
        }
      }
      for (const r of rows as Array<Record<string, unknown>>) {
        r.seller_label = map[r.seller_id as string]?.label ?? ''
        r.seller_contact = map[r.seller_id as string]?.contact ?? ''
      }
    }

    return NextResponse.json({ data: rows, isAdmin }, { headers: NO_STORE })
  } catch (e) {
    console.error('listing-intakes GET error:', e)
    return apiError('INTERNAL_ERROR', '접수 목록 조회에 실패했습니다.', 500)
  }
}

export async function POST(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '매각의뢰는 로그인 후 접수할 수 있습니다.', 401)

  try {
    const body = await request.json()
    const mode = body.mode === 'agency' ? 'agency' : 'direct'

    // 직접 등록은 필수 6개를 확인한다 (운영기획서 v4 §3-2-0)
    // 대행은 파일만 받으므로 검증하지 않는다.
    const detail = (body.detail ?? {}) as Record<string, unknown>
    if (mode === 'direct') {
      const REQUIRED: [string, string][] = [
        ['collateral_address', '담보물주소'],
        ['collateral_type', '담보물종류'],
        ['appraisal_value', '감정가'],
        ['loan_balance', '대출잔액'],
        ['loan_principal', '대출원금'],
        ['asking_price', '제안 매각가'],
      ]
      const missing = REQUIRED.filter(([k]) => !String(detail[k] ?? '').trim()).map(([, label]) => label)
      if (missing.length > 0) {
        return apiError('BAD_REQUEST', `필수 항목이 비어 있습니다: ${missing.join(' · ')}`, 400)
      }
    }

    const attachments = Array.isArray(body.attachments) ? body.attachments : []
    if (mode === 'agency' && attachments.length === 0) {
      return apiError('BAD_REQUEST', '등록 대행은 파일을 1개 이상 올려주셔야 진행할 수 있습니다.', 400)
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('listing_intakes')
      .insert({
        // body.id 가 오면 그 값을 쓴다 — 첨부 업로드 경로를 미리 잡아두기 위함
        ...(body.id ? { id: String(body.id) } : {}),
        seller_id: me.id,
        mode,
        status: '접수',
        detail,
        attachments,
        contact_name: String(body.contact_name ?? '').slice(0, 60) || null,
        contact_phone: String(body.contact_phone ?? '').slice(0, 40) || null,
        contact_email: String(body.contact_email ?? me.email ?? '').slice(0, 120) || null,
        memo: String(body.memo ?? '').slice(0, 2000) || null,
      })
      .select('id')
      .single()
    if (error) throw error

    return NextResponse.json({ ok: true, id: data.id }, { headers: NO_STORE })
  } catch (e) {
    console.error('listing-intakes POST error:', e)
    return apiError('INTERNAL_ERROR', '접수에 실패했습니다. 잠시 후 다시 시도해주세요.', 500)
  }
}

export async function PATCH(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  const isAdmin = !!me.role && ['SUPER_ADMIN', 'ADMIN'].includes(me.role)

  try {
    const body = await request.json()
    const id = String(body.id ?? '')
    if (!id) return apiError('BAD_REQUEST', '접수 ID가 필요합니다.', 400)

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.detail && typeof body.detail === 'object') patch.detail = body.detail
    if (Array.isArray(body.attachments)) patch.attachments = body.attachments
    if (typeof body.memo === 'string') patch.memo = body.memo.slice(0, 2000)

    if (isAdmin) {
      // 운영자 — 상태 전이 · 보완요청 사유
      if (typeof body.status === 'string') patch.status = body.status
      if (typeof body.revision_note === 'string') patch.revision_note = body.revision_note.slice(0, 1000)
      if (Array.isArray(body.revision_fields)) patch.revision_fields = body.revision_fields
      // 보완요청은 횟수를 누적한다 (반복되면 직접 연락할 판단 근거)
      if (body.status === '보완 필요') {
        const { data: cur } = await (await createClient())
          .from('listing_intakes').select('revision_count').eq('id', id).maybeSingle()
        patch.revision_count = (Number(cur?.revision_count) || 0) + 1
      }
    } else {
      // 회원 — 보완 후 저장하면 자동으로 접수 상태로 돌아간다 (운영자 큐에 다시 뜬다)
      patch.status = '접수'
    }

    const supabase = await createClient()
    let q = supabase.from('listing_intakes').update(patch).eq('id', id)
    if (!isAdmin) q = q.eq('seller_id', me.id)
    const { error } = await q
    if (error) throw error

    return NextResponse.json({ ok: true }, { headers: NO_STORE })
  } catch (e) {
    console.error('listing-intakes PATCH error:', e)
    return apiError('INTERNAL_ERROR', '저장에 실패했습니다.', 500)
  }
}
