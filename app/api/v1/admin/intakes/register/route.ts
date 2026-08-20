import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { apiError } from '@/lib/api-error'
import { NO_STORE } from '@/lib/api-cache'
import { notifyUserId } from '@/lib/notify'
import { sendEmail } from '@/lib/email/email-service'
import { coverPhoto, type Attachment } from '@/lib/listing-attachments'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/admin/intakes/register — 접수 → 매물 등록 확정 (2026-08-19)
 * 운영기획서 v4 §3-2(직접 등록 승인) · §3-3-2(대행 등록 확정)
 *
 * 두 경로가 같은 동작으로 끝난다.
 *   direct  : 회원이 채운 세부내역을 운영자가 검증하고 [승인]
 *   agency  : 운영자가 검수·보정한 세부내역으로 [등록 확정]
 *
 * 이 순간에 **관리번호가 발번된다**(DB 트리거). 접수 단계에는 번호가 없다.
 * 등록 즉시 매각 회원에게 알림 + 이메일로 알린다 — 사전 승인 대신 사후 통지(§3-3-2).
 *
 * body: { intake_id, detail? }   detail 을 주면 그 값으로 덮어쓴 뒤 등록한다.
 */

/** 담보물종류(한글/영문 혼재) → DB enum */
const COLLATERAL_ENUM: Record<string, string> = {
  아파트: 'APARTMENT', 오피스텔: 'OFFICETEL', 다세대: 'VILLA', 빌라: 'VILLA', 단독주택: 'VILLA',
  상가: 'COMMERCIAL', 근린상가: 'COMMERCIAL', 통건물: 'COMMERCIAL', 오피스: 'OFFICE',
  토지: 'LAND', 대지: 'LAND', 공장: 'FACTORY', 지식산업센터: 'FACTORY',
  호텔: 'COMMERCIAL', 물류센터: 'FACTORY', 기타: 'OTHER',
}
const toEnum = (v: string) => {
  const s = String(v ?? '').trim()
  if (!s) return 'OTHER'
  if (/^[A-Z_]+$/.test(s)) return s
  for (const [ko, en] of Object.entries(COLLATERAL_ENUM)) if (s.includes(ko)) return en
  return 'OTHER'
}

const num = (v: unknown) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? Math.round(n) : 0
}

export async function POST(request: NextRequest) {
  const me = await getAuthUserWithRole()
  if (!me) return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
  if (!me.role || !['SUPER_ADMIN', 'ADMIN'].includes(me.role)) {
    return apiError('FORBIDDEN', '운영관리자만 등록할 수 있습니다.', 403)
  }

  try {
    const body = await request.json()
    const intakeId = String(body.intake_id ?? '')
    if (!intakeId) return apiError('BAD_REQUEST', '접수 ID가 필요합니다.', 400)

    const supabase = await createClient()
    const { data: intake, error: iErr } = await supabase
      .from('listing_intakes').select('*').eq('id', intakeId).maybeSingle()
    if (iErr) throw iErr
    if (!intake) return apiError('NOT_FOUND', '접수 건을 찾을 수 없습니다.', 404)
    if (intake.listing_id) {
      return apiError('BAD_REQUEST', '이미 등록이 확정된 접수입니다.', 400)
    }

    // 운영자가 검수 화면에서 고친 값이 있으면 그것을 쓴다
    const detail = { ...(intake.detail as Record<string, unknown>), ...(body.detail ?? {}) } as Record<string, string>
    const attachments = (Array.isArray(intake.attachments) ? intake.attachments : []) as Attachment[]

    // 주소에서 시도·시군구 분리 (앞 두 토큰)
    const address = String(detail.collateral_address ?? '').trim()
    const parts = address.split(/\s+/)
    const sido = parts[0] ?? ''
    const sigungu = parts[1] ?? ''
    const cover = coverPhoto(attachments)

    const claim = num(detail.loan_balance) || num(detail.loan_principal)
    const title = [sido, sigungu, String(detail.collateral_type ?? '')].filter(Boolean).join(' ') || '매각의뢰 매물'

    const { data: created, error: cErr } = await supabase
      .from('npl_listings')
      .insert({
        seller_id: intake.seller_id,                   // 소유자는 요청한 매각 회원 (운영사가 아니다)
        title: `${title} NPL`.slice(0, 120),
        collateral_type: toEnum(String(detail.collateral_type ?? '')),
        sido, sigungu,
        address,
        address_masked: [sido, sigungu].filter(Boolean).join(' '),
        claim_amount: claim,
        appraised_value: num(detail.appraisal_value),
        proposed_sale_price: num(detail.asking_price),
        setup_amount: num(detail.max_claim) || null,
        creditor_institution: String(detail.institution ?? '') || null,
        image_url: cover?.path ?? null,                 // 대표 사진 (Storage 경로)
        attachments,                                    // 사진·서류 전체
        status: 'ACTIVE',                               // 등록 확정 = 공개
      })
      .select('id, listing_no')
      .single()
    if (cErr) throw cErr

    // 세부내역 40필드는 listing_marketing.detail 에 보관 (기존 세부내역 화면과 같은 저장소)
    await supabase.from('listing_marketing').upsert({
      listing_id: created.id,
      detail,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'listing_id' })

    await supabase.from('listing_intakes').update({
      status: '등록완료',
      detail,
      listing_id: created.id,
      registered_at: new Date().toISOString(),
      registered_by: me.id,
      updated_at: new Date().toISOString(),
    }).eq('id', intakeId)

    // ── 사후 통지 (§3-3-2) — 사전 승인 대신 등록 즉시 알린다 ──
    const listingNo = String(created.listing_no ?? '')
    const summary = [
      `관리번호 ${listingNo}`,
      address || null,
      detail.appraisal_value ? `감정가 ${detail.appraisal_value}` : null,
    ].filter(Boolean).join(' · ')

    void notifyUserId(intake.seller_id as string, {
      type: 'NEW_LISTING',
      title: `매물이 등록되었습니다 — ${listingNo}`,
      message: `${summary}\n내용을 확인하시고 수정이 필요하면 알려주세요.`,
      link: '/my/seller',
    })

    try {
      const { data: seller } = await supabase
        .from('users').select('email, name').eq('id', intake.seller_id).maybeSingle()
      if (seller?.email) {
        void sendEmail({
          to: seller.email as string,
          subject: `[엔플랫폼] 매물이 등록되었습니다 — ${listingNo}`,
          html: `
            <p>${seller.name ?? '고객'}님, 요청하신 매각의뢰가 등록되었습니다.</p>
            <p><b>${summary}</b></p>
            <p>내용을 확인하시고 수정이 필요한 부분이 있으면 회신해 주세요.</p>
            <p><a href="https://nplatform-private.vercel.app/my/seller">내 매물에서 확인하기</a></p>
          `,
        }).catch(() => {})
      }
    } catch { /* 메일 실패가 등록을 되돌리지는 않는다 */ }

    return NextResponse.json(
      { ok: true, listing_id: created.id, listing_no: listingNo },
      { headers: NO_STORE },
    )
  } catch (e) {
    console.error('intake register error:', e)
    return apiError('INTERNAL_ERROR', '등록에 실패했습니다.', 500)
  }
}
