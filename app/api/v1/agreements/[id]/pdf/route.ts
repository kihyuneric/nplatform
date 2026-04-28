/**
 * GET /api/v1/agreements/[id]/pdf
 *
 * Agreement 의 서명 PDF 다운로드 — 매수자/매도자 본인만 접근.
 * 다운로드 시 audit_log 에 'viewed' 이벤트 추가 (5년 감사용).
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const admin = getSupabaseAdmin()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 },
      )
    }

    // RLS 가 본인 row 만 노출 — admin 으로 우회 후 권한 직접 검증
    const { data: agreement, error } = await admin
      .from('agreements')
      .select('id, buyer_id, seller_id, pdf_path, signer_name, type, signed_at')
      .eq('id', id)
      .single()
    if (error || !agreement) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '서명 문서를 찾을 수 없습니다.' } },
        { status: 404 },
      )
    }
    const isBuyer = String(agreement.buyer_id) === String(user.id)
    const isSeller = String(agreement.seller_id) === String(user.id)
    // admin role 도 가능
    const userRole =
      (user.user_metadata?.role as string | undefined) ?? null
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
    if (!isBuyer && !isSeller && !isAdmin) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '문서 접근 권한이 없습니다.' } },
        { status: 403 },
      )
    }

    if (!agreement.pdf_path) {
      return NextResponse.json(
        { error: { code: 'PDF_NOT_READY', message: 'PDF 가 아직 생성되지 않았습니다.' } },
        { status: 404 },
      )
    }

    // Storage 에서 PDF 다운로드
    const { data: blob, error: dlErr } = await admin.storage
      .from('agreements')
      .download(agreement.pdf_path)
    if (dlErr || !blob) {
      return NextResponse.json(
        { error: { code: 'STORAGE_ERROR', message: dlErr?.message ?? 'Storage 다운로드 실패' } },
        { status: 500 },
      )
    }

    // audit log: viewed
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null
    const ua = request.headers.get('user-agent') ?? null
    try {
      await admin.rpc('append_agreement_audit', {
        agreement_id: id,
        event: 'viewed',
        by_user: user.id,
        ip,
        ua,
        note: isAdmin ? 'admin' : isBuyer ? 'buyer' : 'seller',
      })
    } catch (auditErr) {
      // best-effort
      logger.warn('[agreements/pdf] audit log failed', { error: auditErr })
    }

    const arr = await blob.arrayBuffer()
    const filename = `${agreement.type}_${(agreement.signer_name as string).replace(/\s+/g, '_')}_${id.slice(0, 8)}.pdf`
    return new NextResponse(arr, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=0, no-store',
      },
    })
  } catch (err) {
    logger.error('[agreements/pdf] GET exception', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: err instanceof Error ? err.message : '서버 오류' } },
      { status: 500 },
    )
  }
}
