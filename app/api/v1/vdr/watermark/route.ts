// ============================================================
// app/api/v1/vdr/watermark/route.ts
// VDR 문서 워터마킹 API
// POST /api/v1/vdr/watermark
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { addWatermarkToPdf } from '@/lib/vdr/watermark'

// ─── 요청 IP 추출 ────────────────────────────────────────

function extractIp(request: NextRequest): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined
  )
}

// ─── POST /api/v1/vdr/watermark ──────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ── 1. 인증 확인 ─────────────────────────────────────
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } },
        { status: 401 }
      )
    }

    // ── 2. 요청 바디 파싱 ─────────────────────────────────
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: { code: 'INVALID_BODY', message: '요청 형식이 올바르지 않습니다' } },
        { status: 400 }
      )
    }

    const { document_url, pdf_base64, document_id } = body as {
      document_url?: string
      pdf_base64?: string
      document_id?: string
    }

    if (!document_id) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELD', message: 'document_id가 필요합니다' } },
        { status: 400 }
      )
    }

    if (!document_url && !pdf_base64) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_FIELD',
            message: 'document_url 또는 pdf_base64 중 하나가 필요합니다',
          },
        },
        { status: 400 }
      )
    }

    // ── 3. PDF 바이트 획득 ───────────────────────────────
    let pdfBytes: Uint8Array

    if (document_url) {
      // URL에서 PDF 가져오기
      let fetchResp: Response
      try {
        fetchResp = await fetch(document_url as string, {
          headers: { Accept: 'application/pdf' },
        })
      } catch (fetchErr) {
        logger.error('[vdr/watermark] PDF fetch error', { error: fetchErr, document_url })
        return NextResponse.json(
          { error: { code: 'FETCH_ERROR', message: 'PDF를 가져오는 데 실패했습니다' } },
          { status: 502 }
        )
      }

      if (!fetchResp.ok) {
        return NextResponse.json(
          {
            error: {
              code: 'FETCH_ERROR',
              message: `PDF URL 응답 오류: ${fetchResp.status} ${fetchResp.statusText}`,
            },
          },
          { status: 502 }
        )
      }

      const arrayBuf = await fetchResp.arrayBuffer()
      pdfBytes = new Uint8Array(arrayBuf)
    } else {
      // base64 디코딩
      try {
        const binaryStr = atob(pdf_base64 as string)
        pdfBytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          pdfBytes[i] = binaryStr.charCodeAt(i)
        }
      } catch {
        return NextResponse.json(
          { error: { code: 'INVALID_PDF', message: 'base64 PDF 디코딩에 실패했습니다' } },
          { status: 400 }
        )
      }
    }

    // ── 4. 사용자 정보 조회 ───────────────────────────────
    const { data: profile } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    const userName: string = profile?.full_name ?? user.email?.split('@')[0] ?? '사용자'
    const userEmail: string = profile?.email ?? user.email ?? ''
    const ipAddress = extractIp(request)

    // ── 5. 크레딧 차감 (2 크레딧) ──────────────────────────
    try {
      await supabase.rpc('increment_credit_balance', {
        p_user_id: user.id,
        p_amount: -2,
        p_reason: `VDR 워터마크: ${document_id.slice(0, 8)}`,
      })
    } catch (creditErr) {
      // 크레딧 차감 실패 시 경고만 (서비스 중단 없이 진행)
      logger.warn('[vdr/watermark] 크레딧 차감 실패 (best-effort)', { error: creditErr })
    }

    // ── 6. 워터마크 적용 ─────────────────────────────────
    const result = await addWatermarkToPdf(pdfBytes, {
      userId: user.id,
      userName,
      userEmail,
      ipAddress,
      documentId: document_id as string,
      timestamp: new Date(),
    })

    if (!result.success) {
      logger.error('[vdr/watermark] 워터마크 실패', { error: result.error, document_id })
      return NextResponse.json(
        { error: { code: 'WATERMARK_FAILED', message: result.error ?? '워터마크 처리에 실패했습니다' } },
        { status: 500 }
      )
    }

    // ── 7. 접근 로그 기록 (best-effort) ──────────────────
    try {
      await supabase.from('deal_activity_log').insert({
        user_id: user.id,
        action: 'VDR_WATERMARK',
        resource_id: document_id,
        resource_type: 'document',
        ip_address: ipAddress ?? null,
        user_agent: request.headers.get('user-agent') ?? null,
        created_at: new Date().toISOString(),
      })
    } catch {
      // 로그 기록 실패는 무시
    }

    // ── 8. 응답 ───────────────────────────────────────────
    return NextResponse.json({
      watermarked_pdf_base64: result.watermarkedPdfBase64,
      document_id,
      credits_deducted: 2,
    })
  } catch (err) {
    logger.error('[vdr/watermark] POST 오류', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
