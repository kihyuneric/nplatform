/**
 * POST /api/v1/admin/api-config/test
 *
 * 저장된 API 키로 실제 연결 테스트
 * - 각 provider별 최소한의 실제 API 호출로 유효성 검증
 * - 결과를 api_integration_status 테이블에 저장
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Errors, fromZodError, fromUnknown } from '@/lib/api-error'
import { getConfig } from '@/lib/runtime-config'
import { createClient } from '@supabase/supabase-js'

const TestSchema = z.object({
  provider: z.string().min(1),
})

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

// ─── Provider별 테스트 함수 ──────────────────────────────────

type TestResult = { success: boolean; message: string; responseMs: number; detail?: Record<string, unknown> }

async function testMolit(): Promise<TestResult> {
  const t0 = Date.now()
  const apiKey = await getConfig('MOLIT_API_KEY')
  if (!apiKey) return { success: false, message: 'API 키가 설정되지 않았습니다.', responseMs: 0 }

  try {
    // 서울 강남구 (1168010100) 최근 1개월 아파트 거래 조회
    const url = new URL('https://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev')
    url.searchParams.set('serviceKey', apiKey)
    url.searchParams.set('LAWD_CD', '11680')
    url.searchParams.set('DEAL_YMD', new Date().toISOString().slice(0, 7).replace('-', ''))
    url.searchParams.set('numOfRows', '1')
    url.searchParams.set('pageNo', '1')

    const res = await fetch(url.toString(), {
      signal: AbortSignal.timeout(8000),
      headers: { Accept: 'application/json' },
    })

    const responseMs = Date.now() - t0

    if (!res.ok) {
      return { success: false, message: `HTTP ${res.status}`, responseMs }
    }

    const text = await res.text()
    if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
      return { success: false, message: '등록되지 않은 API 키입니다. 공공데이터포털에서 신청 후 승인 대기가 필요합니다.', responseMs }
    }
    if (text.includes('LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR')) {
      return { success: false, message: '일일 요청 한도 초과. 키는 유효합니다.', responseMs }
    }

    return {
      success: true,
      message: '국토교통부 실거래가 API 연결 성공',
      responseMs,
      detail: { endpoint: 'getRTMSDataSvcAptTradeDev', test_region: '서울 강남구' },
    }
  } catch (err) {
    return { success: false, message: `연결 실패: ${String(err)}`, responseMs: Date.now() - t0 }
  }
}

async function testOnbid(): Promise<TestResult> {
  const t0 = Date.now()
  const apiKey = await getConfig('ONBID_API_KEY')
  if (!apiKey) return { success: false, message: 'API 키가 설정되지 않았습니다.', responseMs: 0 }

  try {
    const url = new URL('https://openapi.onbid.co.kr/openapi/services/SvcPropertyInfoInquiry/getPropertyMaster')
    url.searchParams.set('serviceKey', apiKey)
    url.searchParams.set('numOfRows', '1')
    url.searchParams.set('pageNo', '1')

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) })
    const responseMs = Date.now() - t0
    const text = await res.text()

    if (text.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
      return { success: false, message: '등록되지 않은 API 키입니다.', responseMs }
    }
    if (res.ok || text.includes('<resultCode>00</resultCode>')) {
      return { success: true, message: '온비드 공공API 연결 성공', responseMs }
    }
    return { success: false, message: `응답 오류: ${res.status}`, responseMs }
  } catch (err) {
    return { success: false, message: `연결 실패: ${String(err)}`, responseMs: Date.now() - t0 }
  }
}

async function testUpstash(): Promise<TestResult> {
  const t0 = Date.now()
  const url = await getConfig('UPSTASH_REDIS_REST_URL')
  const token = await getConfig('UPSTASH_REDIS_REST_TOKEN')

  if (!url || !token) {
    return { success: false, message: 'REST URL 또는 Token이 설정되지 않았습니다.', responseMs: 0 }
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['PING']),
      signal: AbortSignal.timeout(5000),
    })
    const responseMs = Date.now() - t0
    const json = await res.json() as { result?: string; error?: string }

    if (json.result === 'PONG') {
      return { success: true, message: 'Upstash Redis 연결 성공 (PONG 수신)', responseMs }
    }
    return { success: false, message: json.error ?? '예상치 못한 응답', responseMs }
  } catch (err) {
    return { success: false, message: `연결 실패: ${String(err)}`, responseMs: Date.now() - t0 }
  }
}

async function testPortOne(): Promise<TestResult> {
  const t0 = Date.now()
  const apiSecret = await getConfig('PORTONE_API_SECRET')
  const storeId   = await getConfig('PORTONE_STORE_ID')

  if (!apiSecret) return { success: false, message: 'V2 API Secret이 설정되지 않았습니다.', responseMs: 0 }

  try {
    // PortOne V2 — 결제 목록 조회 (1건) 으로 유효성 검증
    const res = await fetch('https://api.portone.io/payments?pageSize=1', {
      headers: { Authorization: `PortOne ${apiSecret}` },
      signal: AbortSignal.timeout(8000),
    })
    const responseMs = Date.now() - t0
    const json = await res.json() as Record<string, unknown>

    if (res.ok || res.status === 200) {
      return {
        success: true,
        message: 'PortOne V2 API 연결 성공',
        responseMs,
        detail: { store_id: storeId ?? '(미설정)', mode: apiSecret.includes('test') ? 'sandbox' : 'production' },
      }
    }
    if (res.status === 401) {
      return { success: false, message: 'API Secret이 유효하지 않습니다.', responseMs }
    }
    return { success: false, message: (json.message as string) ?? `HTTP ${res.status}`, responseMs }
  } catch (err) {
    return { success: false, message: `연결 실패: ${String(err)}`, responseMs: Date.now() - t0 }
  }
}

async function testAnthropic(): Promise<TestResult> {
  const t0 = Date.now()
  const apiKey = await getConfig('ANTHROPIC_API_KEY')
  if (!apiKey) return { success: false, message: 'API 키가 설정되지 않았습니다.', responseMs: 0 }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      }),
      signal: AbortSignal.timeout(15000),
    })
    const responseMs = Date.now() - t0
    const json = await res.json() as Record<string, unknown>

    if (res.ok && json.type === 'message') {
      return { success: true, message: 'Anthropic Claude API 연결 성공', responseMs }
    }
    if (res.status === 401) return { success: false, message: 'API 키가 유효하지 않습니다.', responseMs }
    if (res.status === 429) return { success: true, message: 'API 키 유효 (Rate Limit 응답)', responseMs }
    return { success: false, message: (json.error as Record<string, string>)?.message ?? `HTTP ${res.status}`, responseMs }
  } catch (err) {
    return { success: false, message: `연결 실패: ${String(err)}`, responseMs: Date.now() - t0 }
  }
}

async function testCronSecret(): Promise<TestResult> {
  const secret = await getConfig('CRON_SECRET')
  if (!secret) return { success: false, message: 'Cron 시크릿이 설정되지 않았습니다.', responseMs: 0 }
  if (secret.length < 16) return { success: false, message: '시크릿이 너무 짧습니다. 최소 16자 이상을 권장합니다.', responseMs: 0 }
  return { success: true, message: `Cron 시크릿 확인됨 (길이: ${secret.length}자)`, responseMs: 0 }
}

// ─── Provider → 테스트 함수 맵 ───────────────────────────────

const TEST_HANDLERS: Record<string, () => Promise<TestResult>> = {
  molit:          testMolit,
  onbid:          testOnbid,
  'vercel-cron':  testCronSecret,
  upstash:        testUpstash,
  portone:        testPortOne,
  anthropic:      testAnthropic,
}

// ─── POST 핸들러 ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = TestSchema.safeParse(body)
    if (!parsed.success) return fromZodError(parsed.error)

    const { provider } = parsed.data
    const handler = TEST_HANDLERS[provider]

    if (!handler) {
      return NextResponse.json({
        ok: false,
        provider,
        success: false,
        message: `'${provider}' 연동은 자동 테스트를 지원하지 않습니다. 실제 사용 시 동작 여부를 확인하세요.`,
        responseMs: 0,
      })
    }

    const result = await handler()
    const supabase = getAdminClient()

    // 결과 DB 저장
    if (supabase) {
      await supabase
        .from('api_integration_status')
        .upsert({
          provider_id: provider,
          status: result.success ? 'connected' : 'error',
          last_tested_at: new Date().toISOString(),
          last_test_ms: result.responseMs,
          error_message: result.success ? null : result.message,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'provider_id' })

      // 감사 로그
      await supabase
        .from('api_config_audit')
        .insert({
          provider_id: provider,
          field_key: 'connection_test',
          action: 'TEST',
          result: result.success ? 'success' : 'failed',
          error_msg: result.success ? null : result.message,
          ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1',
          user_agent: req.headers.get('user-agent') ?? '',
        })
    }

    return NextResponse.json({
      ok: true,
      provider,
      ...result,
    })
  } catch (err) {
    return fromUnknown(err)
  }
}
