/**
 * POST /api/v1/payments/inicis-cancel
 *
 * 이니시스 결제 취소 / 환불.
 *
 * 흐름:
 *   1) order_id (oid) 또는 payment_history.id 로 PG TID 조회
 *   2) Inicis API 'Refund' / 'Cancel' 호출
 *   3) payment_history 의 status → CANCELLED, cancel 정보 기록
 *
 * 정책:
 *   · 결제자 본인 또는 ADMIN 만 취소 가능
 *   · 부분 취소는 추후 — 현재는 전액 취소만
 *   · 본 endpoint 호출 시 audit log 자동 기록
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Errors, fromZodError, fromUnknown } from '@/lib/api-error'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'
import { getInicisConfig } from '@/lib/payment-inicis'
import crypto from 'crypto'

const CancelSchema = z.object({
  /** payment_history.id (UUID) */
  paymentId: z.string().uuid(),
  /** 취소 사유 (감사로그) */
  reason: z.string().min(2).max(500),
})

interface InicisCancelResponse {
  resultCode?: string
  resultMsg?: string
  cancelDate?: string
  cancelTime?: string
  P_STATUS?: string
  P_RMESG1?: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = CancelSchema.safeParse(body)
    if (!parsed.success) return fromZodError(parsed.error)
    const { paymentId, reason } = parsed.data

    const supabase = await createClient()
    const admin = getSupabaseAdmin()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Errors.unauthorized('로그인이 필요합니다.')

    // 결제 row 조회 — admin 으로 RLS 우회 (권한은 직접 검증)
    const { data: payment, error: pErr } = await admin
      .from('payment_history')
      .select('*')
      .eq('id', paymentId)
      .single()
    if (pErr || !payment) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '결제 내역을 찾을 수 없습니다.' } },
        { status: 404 },
      )
    }
    const userRole = String(user.user_metadata?.role ?? '')
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN'
    if (!isAdmin && String(payment.user_id) !== String(user.id)) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '취소 권한이 없습니다.' } },
        { status: 403 },
      )
    }
    if (payment.status !== 'PAID') {
      return NextResponse.json(
        { error: { code: 'INVALID_STATE', message: `현재 상태(${payment.status})에서는 취소할 수 없습니다.` } },
        { status: 400 },
      )
    }
    const tid = (payment.metadata as Record<string, unknown> | null)?.tid as string | undefined
    if (!tid) {
      return NextResponse.json(
        { error: { code: 'NO_TID', message: '결제 거래번호(TID)가 없어 PG 취소를 진행할 수 없습니다.' } },
        { status: 400 },
      )
    }

    // ── 이니시스 취소 API 호출 ───────────────────────────────
    const config = getInicisConfig()
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)
    // 서명 — SHA256(key=value&...&iv=apiIv) 패턴 (이니시스 NAB 가이드)
    const data = JSON.stringify({ tid, msg: reason })
    const hashSrc = `${config.apiKey}${config.mid}Refund${timestamp}${data}`
    const hashData = crypto.createHash('sha512').update(hashSrc, 'utf8').digest('hex')

    const cancelUrl = config.isTest
      ? 'https://stginiapi.inicis.com/api/v1/refund'
      : 'https://iniapi.inicis.com/api/v1/refund'

    const resp = await fetch(cancelUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'Refund',
        paymethod: 'Card',
        timestamp,
        clientIp: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0',
        mid: config.mid,
        data: { tid, msg: reason },
        hashData,
      }),
    })
    const respText = await resp.text()
    let cancelResult: InicisCancelResponse = {}
    try {
      cancelResult = JSON.parse(respText)
    } catch {
      cancelResult = { resultCode: 'PARSE_FAIL', resultMsg: respText.slice(0, 200) }
    }

    const code = cancelResult.resultCode ?? cancelResult.P_STATUS ?? ''
    const msg = cancelResult.resultMsg ?? cancelResult.P_RMESG1 ?? '알 수 없는 응답'
    if (code !== '00' && code !== '0000') {
      return NextResponse.json(
        {
          error: { code: 'INICIS_CANCEL_FAILED', message: `이니시스 취소 실패 (${code}): ${msg}` },
          raw: cancelResult,
        },
        { status: 502 },
      )
    }

    // ── DB row 업데이트 ──────────────────────────────────────
    const cancelMeta = {
      ...(payment.metadata as Record<string, unknown>),
      cancel: {
        reason,
        cancelled_by: user.id,
        cancelled_at: new Date().toISOString(),
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        ua: request.headers.get('user-agent') ?? null,
        inicis_response: cancelResult,
      },
    }
    await admin
      .from('payment_history')
      .update({
        status: 'CANCELLED',
        metadata: cancelMeta,
      })
      .eq('id', paymentId)

    return NextResponse.json({
      ok: true,
      paymentId,
      cancelDate: cancelResult.cancelDate ?? null,
      cancelTime: cancelResult.cancelTime ?? null,
      message: '결제가 정상 취소되었습니다.',
    })
  } catch (err) {
    return fromUnknown(err)
  }
}
