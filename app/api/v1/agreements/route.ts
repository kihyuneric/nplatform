/**
 * /api/v1/agreements
 *
 * GET  — 사용자(매수자/매도자/admin) 별 NDA/LOI 이력
 * POST — 새 전자서명 NDA/LOI 체결 (PDF 생성 + Supabase Storage 업로드 + audit log)
 *
 * 정책:
 *   · 매수자만 POST. listing.seller_id ≠ user.id (자기 매물 NDA/LOI 금지)
 *   · 같은 (listing_id, buyer_id, type) 활성 row 중복 금지 (DB unique index)
 *   · audit_log 자동 추가 (created → signed)
 *   · PDF SHA256 저장 — 위변조 검증
 *   · 5년 보관 (DB row + Storage 동시)
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { generateNdaPdf, generateLoiPdf, sha256Hex } from '@/lib/agreements/pdf-generator'

interface AgreementBaseInput {
  listing_id: string
  signer_name: string
  signer_company?: string
  signer_email?: string
  signature_data: string  // base64 PNG data URL
}

interface NdaInput extends AgreementBaseInput {
  type: 'NDA'
  nda_clause_version: string
  nda_clauses_accepted?: string[]
}

interface LoiInput extends AgreementBaseInput {
  type: 'LOI'
  loi_amount: number
  loi_funding_plan: 'CASH' | 'LEVERAGED' | 'FUND'
  loi_duration_days: number
  loi_acquisition_entity: string
  loi_seller_message?: string
}

type AgreementInput = NdaInput | LoiInput

// ─── GET — 사용자별 이력 ────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // 로그인 X — sample 이력 (UI 가 데모 모드로 폴백)
      return NextResponse.json({ data: [], _source: 'unauthenticated' }, { status: 200 })
    }

    const { searchParams } = new URL(request.url)
    const listingId = searchParams.get('listing_id')
    const type = searchParams.get('type')

    let q = supabase
      .from('agreements')
      .select('*')
      .order('signed_at', { ascending: false })

    if (listingId) q = q.eq('listing_id', listingId)
    if (type === 'NDA' || type === 'LOI') q = q.eq('type', type)

    const { data, error } = await q
    if (error) {
      logger.error('[agreements] GET error', { error })
      return NextResponse.json({ data: [], error: { message: error.message } }, { status: 200 })
    }
    return NextResponse.json({ data, _source: 'supabase' })
  } catch (err) {
    logger.error('[agreements] GET exception', { error: err })
    return NextResponse.json({ data: [], _source: 'error' }, { status: 200 })
  }
}

// ─── POST — 새 NDA/LOI 체결 ────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = getSupabaseAdmin()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 },
      )
    }

    const input = (await request.json()) as AgreementInput
    if (!input?.type || !input.listing_id || !input.signature_data || !input.signer_name) {
      return NextResponse.json(
        { error: { code: 'INVALID_INPUT', message: 'type / listing_id / signature_data / signer_name 필수' } },
        { status: 400 },
      )
    }
    if (input.type !== 'NDA' && input.type !== 'LOI') {
      return NextResponse.json(
        { error: { code: 'INVALID_TYPE', message: 'type 은 NDA 또는 LOI 이어야 합니다.' } },
        { status: 400 },
      )
    }
    if (!input.signature_data.startsWith('data:image/')) {
      return NextResponse.json(
        { error: { code: 'INVALID_SIGNATURE', message: 'signature_data 는 data URL 이어야 합니다.' } },
        { status: 400 },
      )
    }

    // listing 조회 — seller_id 확보 (admin 으로 RLS 우회)
    const { data: listing, error: listingErr } = await admin
      .from('npl_listings')
      .select('id, title, address_masked, seller_id, creditor_institution')
      .eq('id', input.listing_id)
      .single()
    if (listingErr || !listing) {
      return NextResponse.json(
        { error: { code: 'LISTING_NOT_FOUND', message: '매물을 찾을 수 없습니다.' } },
        { status: 404 },
      )
    }
    const sellerId = (listing as { seller_id?: string }).seller_id
    if (!sellerId) {
      return NextResponse.json(
        { error: { code: 'SELLER_MISSING', message: '매물의 매도자 정보를 확인할 수 없습니다.' } },
        { status: 400 },
      )
    }
    if (String(sellerId) === String(user.id)) {
      return NextResponse.json(
        { error: { code: 'SELF_NDA_FORBIDDEN', message: '본인 매물에 NDA/LOI 를 체결할 수 없습니다.' } },
        { status: 403 },
      )
    }

    const signedAt = new Date()
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      undefined
    const ua = request.headers.get('user-agent') ?? undefined

    // 1) DB row INSERT (admin, RLS 우회)
    const insertRow: Record<string, unknown> = {
      type: input.type,
      status: 'SIGNED',
      listing_id: input.listing_id,
      buyer_id: user.id,
      seller_id: sellerId,
      signer_name: input.signer_name,
      signer_company: input.signer_company ?? null,
      signer_email: input.signer_email ?? user.email ?? null,
      signature_data: input.signature_data,
      signed_at: signedAt.toISOString(),
      signed_ip: ip ?? null,
      signed_user_agent: ua ?? null,
      audit_log: [
        {
          event: 'created',
          at: signedAt.toISOString(),
          by: user.id,
          ip: ip ?? null,
          ua: ua ?? null,
        },
        {
          event: 'signed',
          at: signedAt.toISOString(),
          by: user.id,
          ip: ip ?? null,
          ua: ua ?? null,
        },
      ],
    }
    if (input.type === 'NDA') {
      insertRow.nda_clause_version = input.nda_clause_version || 'v1'
      insertRow.nda_clauses_accepted = input.nda_clauses_accepted ?? []
    } else {
      insertRow.loi_amount = input.loi_amount
      insertRow.loi_funding_plan = input.loi_funding_plan
      insertRow.loi_duration_days = input.loi_duration_days
      insertRow.loi_acquisition_entity = input.loi_acquisition_entity
      insertRow.loi_seller_message = input.loi_seller_message ?? null
    }
    const { data: agreement, error: insertErr } = await admin
      .from('agreements')
      .insert(insertRow)
      .select('*')
      .single()
    if (insertErr || !agreement) {
      logger.error('[agreements] insert failed', { error: insertErr })
      return NextResponse.json(
        { error: { code: 'INSERT_FAILED', message: insertErr?.message ?? 'DB insert 실패' } },
        { status: 500 },
      )
    }

    // 2) PDF 생성
    const listingTitle = String((listing as { title?: string }).title ?? input.listing_id)
    const sellerInst = String((listing as { creditor_institution?: string }).creditor_institution ?? '매도자')
    let pdfBytes: Uint8Array
    try {
      if (input.type === 'NDA') {
        pdfBytes = await generateNdaPdf({
          agreementId: agreement.id,
          listingId: input.listing_id,
          listingTitle,
          sellerInstitution: sellerInst,
          buyerName: input.signer_name,
          buyerCompany: input.signer_company,
          signedAt,
          signerName: input.signer_name,
          signatureDataUrl: input.signature_data,
          clauseVersion: input.nda_clause_version || 'v1',
        })
      } else {
        pdfBytes = await generateLoiPdf({
          agreementId: agreement.id,
          listingId: input.listing_id,
          listingTitle,
          sellerInstitution: sellerInst,
          buyerName: input.signer_name,
          buyerCompany: input.signer_company,
          signedAt,
          signerName: input.signer_name,
          signatureDataUrl: input.signature_data,
          amount: input.loi_amount,
          fundingPlan: input.loi_funding_plan,
          durationDays: input.loi_duration_days,
          acquisitionEntity: input.loi_acquisition_entity,
          sellerMessage: input.loi_seller_message,
        })
      }
    } catch (pdfErr) {
      logger.error('[agreements] PDF gen failed', { error: pdfErr })
      // PDF 실패해도 row 는 유지 — UI 에서 재생성 트리거 가능
      return NextResponse.json(
        { data: agreement, warning: 'PDF 생성 실패 — 재생성 필요', _source: 'partial' },
        { status: 201 },
      )
    }

    // 3) Storage 업로드 (admin)
    const year = signedAt.getFullYear()
    const pdfPath = `${input.type}/${year}/${input.listing_id}/${agreement.id}.pdf`
    const sha = await sha256Hex(pdfBytes)
    const { error: upErr } = await admin.storage
      .from('agreements')
      .upload(pdfPath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      })
    if (upErr) {
      logger.error('[agreements] storage upload failed', { error: upErr })
      return NextResponse.json(
        { data: agreement, warning: `Storage 업로드 실패: ${upErr.message}`, _source: 'partial' },
        { status: 201 },
      )
    }

    // 4) row 업데이트 — pdf_path / pdf_size / pdf_sha256
    const { data: updated } = await admin
      .from('agreements')
      .update({
        pdf_path: pdfPath,
        pdf_size_bytes: pdfBytes.byteLength,
        pdf_sha256: sha,
      })
      .eq('id', agreement.id)
      .select('*')
      .single()

    return NextResponse.json({ data: updated ?? agreement, _source: 'supabase' }, { status: 201 })
  } catch (err) {
    logger.error('[agreements] POST exception', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: err instanceof Error ? err.message : '서버 오류' } },
      { status: 500 },
    )
  }
}
