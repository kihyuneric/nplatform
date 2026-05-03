/**
 * POST /api/v1/admin/integrations/save
 *
 * 외부 연동 통합 대시보드 (/admin/integrations) 용 ENV 저장 endpoint.
 *
 * 기존 /api/v1/admin/api-config 는 provider_id + field_key 구조 사용.
 * 본 endpoint 는 ENV var 이름으로 직접 저장 가능 (대시보드 UI 친화적).
 *
 * 내부 동작:
 *   1. ENV_VAR_NAME → CONFIG_ENV_MAP 역검색 → provider_id.field_key
 *   2. AES-256-GCM 암호화 → api_configs upsert
 *   3. 감사 로그 (api_config_audit) 기록
 *   4. 인메모리 캐시 무효화
 *
 * Body: { envVar: 'ANTHROPIC_API_KEY', value: 'sk-ant-...' }
 * Response: { ok: true, providerId, fieldKey }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { encrypt } from '@/lib/security/encryption'
import { invalidateConfigCache } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// runtime-config.ts 의 CONFIG_ENV_MAP 과 동기화 (역방향).
//   provider_id.field_key → ENV_VAR_NAME 의 역.
//   본 endpoint 가 ENV_VAR_NAME 받아 provider_id.field_key 로 저장하기 위해 필요.
const ENV_TO_PROVIDER_FIELD: Record<string, { providerId: string; fieldKey: string }> = {
  // AI / LLM
  ANTHROPIC_API_KEY: { providerId: 'anthropic', fieldKey: 'api_key' },
  OPENAI_API_KEY: { providerId: 'openai', fieldKey: 'api_key' },
  GEMINI_API_KEY: { providerId: 'gemini', fieldKey: 'api_key' },
  VOYAGE_API_KEY: { providerId: 'voyage', fieldKey: 'api_key' },
  // Translation
  GOOGLE_TRANSLATE_API_KEY: { providerId: 'google-translate', fieldKey: 'api_key' },
  DEEPL_API_KEY: { providerId: 'deepl', fieldKey: 'api_key' },
  // Maps (Kakao 만 유지)
  KAKAO_MAP_JAVASCRIPT_KEY: { providerId: 'kakao-map', fieldKey: 'javascript_key' },
  KAKAO_MAP_REST_KEY: { providerId: 'kakao-map', fieldKey: 'rest_key' },
  // Auction Data
  MOLIT_API_KEY: { providerId: 'molit', fieldKey: 'api_key' },
  ONBID_API_KEY: { providerId: 'onbid', fieldKey: 'api_key' },
  COURT_AUCTION_API_KEY: { providerId: 'court-auction', fieldKey: 'api_key' },
  IROS_API_KEY: { providerId: 'iros', fieldKey: 'api_key' },
  // Payment
  PORTONE_STORE_ID: { providerId: 'portone', fieldKey: 'store_id' },
  PORTONE_CHANNEL_KEY: { providerId: 'portone', fieldKey: 'channel_key' },
  PORTONE_API_SECRET: { providerId: 'portone', fieldKey: 'api_secret' },
  PORTONE_WEBHOOK_SECRET: { providerId: 'portone', fieldKey: 'webhook_secret' },
  INICIS_MID: { providerId: 'inicis', fieldKey: 'mid' },
  INICIS_SIGN_KEY: { providerId: 'inicis', fieldKey: 'sign_key' },
  INICIS_IV: { providerId: 'inicis', fieldKey: 'iv' },
  // KB에스크로 (NPL 자금 보관)
  KB_ESCROW_PARTNER_ID: { providerId: 'kb-escrow', fieldKey: 'partner_id' },
  KB_ESCROW_API_KEY: { providerId: 'kb-escrow', fieldKey: 'api_key' },
  KB_ESCROW_WEBHOOK_SECRET: { providerId: 'kb-escrow', fieldKey: 'webhook_secret' },
  // Cache
  UPSTASH_REDIS_REST_URL: { providerId: 'upstash', fieldKey: 'rest_url' },
  UPSTASH_REDIS_REST_TOKEN: { providerId: 'upstash', fieldKey: 'rest_token' },
  // Cron
  CRON_SECRET: { providerId: 'vercel-cron', fieldKey: 'cron_secret' },
  // Communications (Slack 만)
  SLACK_WEBHOOK_URL: { providerId: 'slack', fieldKey: 'webhook_url' },
}

const SaveSchema = z.object({
  envVar: z.string().min(1),
  value: z.string().min(1).max(2000),
})

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function maskValue(v: string): string {
  if (!v || v.length <= 4) return '••••'
  return '•'.repeat(Math.max(v.length - 4, 4)) + v.slice(-4)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = SaveSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.message }, { status: 400 })
    }

    const { envVar, value } = parsed.data
    const map = ENV_TO_PROVIDER_FIELD[envVar]
    if (!map) {
      return NextResponse.json({
        ok: false,
        error: `매핑되지 않은 ENV var: ${envVar}. lib/runtime-config.ts CONFIG_ENV_MAP 에 추가 필요.`,
      }, { status: 400 })
    }

    if (!process.env.ENCRYPTION_KEY) {
      return NextResponse.json({
        ok: false,
        error: 'ENCRYPTION_KEY 환경변수 미설정 — 키 저장 불가. Vercel Project Settings 에 등록 필요.',
      }, { status: 500 })
    }

    const supabase = getAdminClient()
    if (!supabase) {
      return NextResponse.json({
        ok: false,
        error: 'Supabase service role 키 미설정',
      }, { status: 500 })
    }

    // 사용자 식별 (감사 로그용)
    const authHeader = req.headers.get('authorization') ?? ''
    let userId: string | null = null
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data } = await userClient.auth.getUser(token)
      userId = data.user?.id ?? null
    }

    // 암호화 + 저장
    const encryptedValue = encrypt(value.trim())
    const { error: upsertErr } = await supabase
      .from('api_configs')
      .upsert({
        provider_id: map.providerId,
        field_key: map.fieldKey,
        encrypted_value: encryptedValue,
        is_active: true,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider_id,field_key' })

    if (upsertErr) {
      return NextResponse.json({
        ok: false,
        error: `저장 실패: ${upsertErr.message}`,
      }, { status: 500 })
    }

    // 감사 로그
    await supabase.from('api_config_audit').insert({
      provider_id: map.providerId,
      field_key: map.fieldKey,
      action: 'SET',
      value_hint: maskValue(value),
      performed_by: userId,
      ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1',
      user_agent: req.headers.get('user-agent') ?? '',
    })

    // 캐시 무효화 → 다음 getConfig() 호출에서 새 값 사용
    invalidateConfigCache()

    return NextResponse.json({
      ok: true,
      envVar,
      providerId: map.providerId,
      fieldKey: map.fieldKey,
      maskedValue: maskValue(value),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    console.error('[/api/v1/admin/integrations/save]', err)
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}

// ─── DELETE: 키 제거 ──────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const envVar = url.searchParams.get('envVar')
    if (!envVar) {
      return NextResponse.json({ ok: false, error: 'envVar 쿼리 파라미터 필요' }, { status: 400 })
    }
    const map = ENV_TO_PROVIDER_FIELD[envVar]
    if (!map) {
      return NextResponse.json({ ok: false, error: `매핑되지 않은 ENV: ${envVar}` }, { status: 400 })
    }
    const supabase = getAdminClient()
    if (!supabase) return NextResponse.json({ ok: false, error: 'Supabase 미설정' }, { status: 500 })

    await supabase
      .from('api_configs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('provider_id', map.providerId)
      .eq('field_key', map.fieldKey)

    invalidateConfigCache()

    return NextResponse.json({ ok: true, envVar }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
