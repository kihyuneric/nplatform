/**
 * POST /api/v1/kyc/verify-business
 * 사업자등록번호 유효성 검증
 * 국세청 Open API 사용 (미설정 시 자체 형식 검증으로 fallback)
 *
 * Body: { business_number: string (XXX-XX-XXXXX format) }
 * Returns: { valid: boolean, business_name?: string, status?: string, error?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

const BUSINESS_NUMBER_REGEX = /^\d{3}-\d{2}-\d{5}$/

interface NtsBusinessStatusItem {
  b_no: string
  b_stt: string       // 계속사업자, 휴업자, 폐업자
  b_stt_cd: string    // "01" = 계속, "02" = 휴업, "03" = 폐업
  tax_type: string
  tax_type_cd: string
  end_dt: string
  utcc_yn: string
  tax_type_change_dt: string
  invoice_apply_dt: string
  rbf_tax_type: string
  rbf_tax_type_cd: string
}

interface NtsApiResponse {
  status_code: string
  data: NtsBusinessStatusItem[]
  match_cnt: number
  request_cnt: number
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { business_number } = body as { business_number?: string }

    if (!business_number) {
      return NextResponse.json(
        { error: { code: 'MISSING_FIELD', message: 'business_number 필드가 필요합니다.' } },
        { status: 400 }
      )
    }

    // 1. Format validation
    if (!BUSINESS_NUMBER_REGEX.test(business_number)) {
      return NextResponse.json({
        valid: false,
        error: '사업자등록번호 형식이 올바르지 않습니다. (예: 123-45-67890)',
      })
    }

    const rawNumber = business_number.replace(/-/g, '') // remove hyphens for API

    const ntsApiKey = process.env.NTS_API_KEY

    // 2. Try National Tax Service API
    if (ntsApiKey) {
      try {
        const ntsRes = await fetch(
          `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${ntsApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ b_no: [rawNumber] }),
            signal: AbortSignal.timeout(5000),
          }
        )

        if (ntsRes.ok) {
          const ntsData: NtsApiResponse = await ntsRes.json()

          if (ntsData.data && ntsData.data.length > 0) {
            const item = ntsData.data[0]
            const isActive = item.b_stt_cd === '01'

            const statusLabel =
              item.b_stt_cd === '01' ? '계속사업자'
              : item.b_stt_cd === '02' ? '휴업자'
              : item.b_stt_cd === '03' ? '폐업자'
              : item.b_stt

            if (isActive) {
              // Update user profile in Supabase
              await supabase
                .from('users')
                .update({
                  business_number,
                  kyc_business_verified_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', user.id)
            }

            return NextResponse.json({
              valid: isActive,
              status: statusLabel,
              tax_type: item.tax_type || undefined,
              ...(isActive
                ? { business_name: undefined } // NTS v1 status API does not return business name
                : { error: `사업자 상태: ${statusLabel}` }),
            })
          }
        }
      } catch (ntsErr) {
        logger.error('[kyc/verify-business] NTS API error, falling back to format-only', {
          error: ntsErr,
        })
        // Fall through to mock/format-only response
      }
    }

    // 3. Fallback: API key not configured or request failed — format-only validation passes
    logger.info('[kyc/verify-business] NTS API not configured, returning mock valid response')
    return NextResponse.json({
      valid: true,
      _mock: true,
      status: '형식 검증 완료 (실API 미연동)',
    })
  } catch (err) {
    logger.error('[kyc/verify-business] Error', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '사업자 검증 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
