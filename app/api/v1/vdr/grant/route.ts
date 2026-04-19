/**
 * /api/v1/vdr/grant — VDR 문서 서명 URL 발급 + 감사 로그 기록
 *
 *  POST body: { document_id, deal_room_id?, reason? }
 *    1) 사용자 참여 권한 확인 (listing_documents.listing_id 기준)
 *    2) Supabase Storage 에 TTL 5분 signed URL 생성
 *    3) signed_url_grants 테이블에 토큰 해시·만료·워터마크 지문 기록
 *    4) signed URL 과 grant_id 반환
 *
 *  GET ?document_id=... → 이 문서에 대한 현 유저의 최근 grant 목록 (감사용)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import {
  VDR_GRANT_TTL_SECONDS,
  computeWatermarkFingerprint,
  grantExpiresAt,
  issueToken,
} from '@/lib/vdr/grants'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const TTL_SECONDS = VDR_GRANT_TTL_SECONDS

const GrantBody = z.object({
  document_id: z.string().uuid(),
  deal_room_id: z.string().uuid().optional(),
  reason: z.string().max(200).optional(),
})

function extractIp(req: NextRequest): string | null {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  )
}

// ─── POST : issue signed URL + record grant ────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } }, { status: 401 })
  }

  let parsed
  try {
    parsed = GrantBody.parse(await req.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`) : [String(err)]
    return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', issues } }, { status: 400 })
  }

  // 1) 문서 메타 확인
  const { data: doc, error: docErr } = await supabase
    .from('listing_documents')
    .select('id, listing_id, storage_path, file_name, mime_type, download_blocked, status, tier')
    .eq('id', parsed.document_id)
    .maybeSingle()

  if (docErr || !doc) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND', message: '문서를 찾을 수 없습니다.' } }, { status: 404 })
  }

  if (doc.status !== 'ACTIVE') {
    return NextResponse.json({ ok: false, error: { code: 'DOCUMENT_INACTIVE', message: '접근할 수 없는 문서 상태입니다.' } }, { status: 403 })
  }

  // 2) 참여 권한 확인 — listing_id 기반 deal_room 참여자 또는 업로더 본인
  if (parsed.deal_room_id) {
    const { data: part } = await supabase
      .from('deal_room_participants')
      .select('id')
      .eq('deal_room_id', parsed.deal_room_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!part) {
      return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN', message: '딜룸 참여자가 아닙니다.' } }, { status: 403 })
    }
  }

  // 3) Storage signed URL 생성
  const { data: signed, error: signErr } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, TTL_SECONDS, { download: !doc.download_blocked })

  if (signErr || !signed?.signedUrl) {
    logger.error('[vdr/grant] signed url failed', { err: signErr?.message, document_id: doc.id })
    return NextResponse.json({ ok: false, error: { code: 'SIGN_FAILED', message: '서명 URL 발급에 실패했습니다.' } }, { status: 502 })
  }

  // 4) 감사 레코드
  const issuedAt = new Date()
  const expiresAt = grantExpiresAt(issuedAt, TTL_SECONDS)
  const { tokenHash } = issueToken()
  const fingerprint = computeWatermarkFingerprint(user.id, doc.id, issuedAt.toISOString())

  const { data: grant, error: insErr } = await supabase
    .from('signed_url_grants')
    .insert({
      document_id: doc.id,
      user_id: user.id,
      deal_room_id: parsed.deal_room_id ?? null,
      token_hash: tokenHash,
      issued_at: issuedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      consumed_ip: extractIp(req),
      consumed_user_agent: req.headers.get('user-agent'),
      watermark_fingerprint: fingerprint,
      reason: parsed.reason ?? null,
    })
    .select('id')
    .single()

  if (insErr) {
    logger.warn('[vdr/grant] audit insert failed (best-effort)', { err: insErr.message })
  }

  return NextResponse.json({
    ok: true,
    data: {
      grant_id: grant?.id ?? null,
      signed_url: signed.signedUrl,
      expires_at: expiresAt.toISOString(),
      ttl_seconds: TTL_SECONDS,
      watermark_fingerprint: fingerprint,
      file_name: doc.file_name,
      mime_type: doc.mime_type,
      download_blocked: doc.download_blocked,
      tier: doc.tier,
    },
  })
}

// ─── GET : recent grants for a document ────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const documentId = new URL(req.url).searchParams.get('document_id')
  if (!documentId) {
    return NextResponse.json({ ok: false, error: { code: 'BAD_REQUEST', message: 'document_id 쿼리 필요' } }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('signed_url_grants')
    .select('id, issued_at, expires_at, consumed_at, consumed_ip, reason, watermark_fingerprint')
    .eq('document_id', documentId)
    .eq('user_id', user.id)
    .order('issued_at', { ascending: false })
    .limit(20)

  if (error) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  return NextResponse.json({ ok: true, data: data ?? [] })
}
