/**
 * GET /api/v1/kyc/status
 * 현재 사용자 KYC 상태 조회
 * Returns: { status: 'NONE'|'PENDING'|'APPROVED'|'REJECTED', submitted_at?, reviewed_at?, rejection_reason? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    // 1. Try kyc_applications table first (most recent record)
    const { data: kycApp, error: kycError } = await supabase
      .from('kyc_applications')
      .select('id, status, type, submitted_at, reviewed_at, rejection_reason')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!kycError && kycApp) {
      return NextResponse.json({
        status: kycApp.status ?? 'NONE',
        kyc_id: kycApp.id,
        type: kycApp.type,
        submitted_at: kycApp.submitted_at,
        reviewed_at: kycApp.reviewed_at ?? null,
        rejection_reason: kycApp.rejection_reason ?? null,
      })
    }

    // 2. Fallback: read from users table columns
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('kyc_status, kyc_submitted_at, kyc_reviewed_at, kyc_rejection_reason, kyc_type')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      logger.error('[kyc/status] Failed to read user KYC status', { error: userError })
      // Return NONE as safe default
      return NextResponse.json({ status: 'NONE' })
    }

    return NextResponse.json({
      status: userData.kyc_status ?? 'NONE',
      type: userData.kyc_type ?? null,
      submitted_at: userData.kyc_submitted_at ?? null,
      reviewed_at: userData.kyc_reviewed_at ?? null,
      rejection_reason: userData.kyc_rejection_reason ?? null,
    })
  } catch (err) {
    logger.error('[kyc/status] Error', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'KYC 상태 조회 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
