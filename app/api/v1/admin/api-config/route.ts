/**
 * GET  /api/v1/admin/api-config        — 연동 목록 + 저장 여부 조회
 * POST /api/v1/admin/api-config        — API 키/시크릿 저장 (AES-256 암호화)
 * DELETE /api/v1/admin/api-config      — 특정 연동 키 삭제
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Errors, fromZodError, fromUnknown } from '@/lib/api-error'
import { API_INTEGRATIONS, API_CONFIG_FIELDS } from '@/lib/api-config'
import { encrypt, decrypt } from '@/lib/security/encryption'
import { invalidateConfigCache } from '@/lib/runtime-config'
import { createClient } from '@supabase/supabase-js'

// ─── Admin Supabase 클라이언트 ──────────────────────────────
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function maskValue(value: string): string {
  if (!value || value.length <= 4) return '••••'
  return '•'.repeat(Math.max(value.length - 4, 4)) + value.slice(-4)
}

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
}

// ─── GET: 연동 목록 + 설정 완료 여부 ─────────────────────────
export async function GET() {
  try {
    const supabase = getAdminClient()
    const savedProviders = new Set<string>()
    const statusMap: Record<string, { status: string; lastTestedAt: string | null; lastTestMs: number | null; errorMessage: string | null; monthlyUsage: number }> = {}

    if (supabase) {
      // 저장된 키 목록 (값은 제외 — 보안)
      const { data: configs } = await supabase
        .from('api_configs')
        .select('provider_id, field_key, updated_at')
        .eq('is_active', true)

      for (const row of configs ?? []) {
        savedProviders.add(row.provider_id as string)
      }

      // 연동 상태
      const { data: statuses } = await supabase
        .from('api_integration_status')
        .select('*')

      for (const s of statuses ?? []) {
        statusMap[s.provider_id as string] = {
          status: s.status as string,
          lastTestedAt: s.last_tested_at as string | null,
          lastTestMs: s.last_test_ms as number | null,
          errorMessage: s.error_message as string | null,
          monthlyUsage: s.monthly_usage as number ?? 0,
        }
      }
    }

    // 연동 목록에 저장 상태 병합
    const integrations = API_INTEGRATIONS.map((api) => {
      const st = statusMap[api.provider] ?? null
      const isSaved = savedProviders.has(api.provider)

      return {
        ...api,
        config: {},   // 키 값은 절대 반환하지 않음
        status: isSaved
          ? (st?.status ?? 'connected') as 'connected' | 'disconnected' | 'testing' | 'error'
          : 'disconnected' as const,
        isSaved,
        lastTestedAt: st?.lastTestedAt ?? null,
        lastTestMs: st?.lastTestMs ?? null,
        errorMessage: st?.errorMessage ?? null,
        monthlyUsage: st?.monthlyUsage ?? api.monthlyUsage,
      }
    })

    return NextResponse.json({ ok: true, integrations })
  } catch (err) {
    return fromUnknown(err)
  }
}

// ─── POST: API 키 저장 ────────────────────────────────────
const SaveSchema = z.object({
  provider: z.string().min(1),
  config:   z.record(z.string()),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = SaveSchema.safeParse(body)
    if (!parsed.success) return fromZodError(parsed.error)

    const { provider, config } = parsed.data

    // 연동 존재 확인
    const integration = API_INTEGRATIONS.find((a) => a.id === provider || a.provider === provider)
    if (!integration) return Errors.notFound(`알 수 없는 연동: ${provider}`)
    if (integration.isBuiltin) return Errors.badRequest('내장 기능은 설정할 수 없습니다.')

    // ENCRYPTION_KEY 확인
    if (!process.env.ENCRYPTION_KEY) {
      return Errors.internal('ENCRYPTION_KEY 환경변수가 설정되지 않았습니다. 키 저장이 불가능합니다.')
    }

    const supabase = getAdminClient()
    if (!supabase) {
      return Errors.internal('Supabase 서비스 롤 키가 설정되지 않았습니다.')
    }

    // 현재 사용자 확인 (감사 로그용)
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

    const savedKeys: string[] = []
    const errors: string[] = []

    for (const [fieldKey, rawValue] of Object.entries(config)) {
      if (!rawValue || rawValue.trim() === '') continue

      // 빈 값 또는 마스킹된 값 스킵 (변경 없음)
      if (rawValue.includes('•')) continue

      try {
        const encryptedValue = encrypt(rawValue.trim())

        await supabase
          .from('api_configs')
          .upsert({
            provider_id: integration.provider,
            field_key: fieldKey,
            encrypted_value: encryptedValue,
            is_active: true,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'provider_id,field_key' })

        // 감사 로그
        await supabase
          .from('api_config_audit')
          .insert({
            provider_id: integration.provider,
            field_key: fieldKey,
            action: 'SET',
            value_hint: maskValue(rawValue),
            performed_by: userId,
            ip_address: getClientIp(req),
            user_agent: req.headers.get('user-agent') ?? '',
          })

        savedKeys.push(fieldKey)
      } catch (encErr) {
        errors.push(`${fieldKey}: ${String(encErr)}`)
      }
    }

    if (errors.length > 0 && savedKeys.length === 0) {
      return NextResponse.json({ ok: false, error: '저장 실패', details: errors }, { status: 500 })
    }

    // 연동 상태 업데이트 (설정 저장됨 → disconnected에서 변경 대기)
    if (savedKeys.length > 0) {
      await supabase
        .from('api_integration_status')
        .upsert({
          provider_id: integration.provider,
          status: 'disconnected',  // 저장 후 테스트 필요
          updated_at: new Date().toISOString(),
        }, { onConflict: 'provider_id' })
    }

    // 런타임 설정 캐시 무효화
    invalidateConfigCache()

    return NextResponse.json({
      ok: true,
      provider,
      savedFields: savedKeys,
      warnings: errors.length > 0 ? errors : undefined,
      message: `${savedKeys.length}개 필드가 암호화 저장되었습니다. 연결 테스트를 실행하세요.`,
    })
  } catch (err) {
    return fromUnknown(err)
  }
}

// ─── DELETE: 특정 연동 키 삭제 ───────────────────────────
const DeleteSchema = z.object({
  provider: z.string().min(1),
  field_key: z.string().optional(),  // 없으면 전체 삭제
})

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = DeleteSchema.safeParse(body)
    if (!parsed.success) return fromZodError(parsed.error)

    const { provider, field_key } = parsed.data

    const integration = API_INTEGRATIONS.find((a) => a.id === provider || a.provider === provider)
    if (!integration) return Errors.notFound(`알 수 없는 연동: ${provider}`)

    const supabase = getAdminClient()
    if (!supabase) return Errors.internal('Supabase 서비스 롤 키가 설정되지 않았습니다.')

    let query = supabase
      .from('api_configs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('provider_id', integration.provider)

    if (field_key) {
      query = query.eq('field_key', field_key)
    }

    const { error } = await query
    if (error) throw error

    // 감사 로그
    await supabase
      .from('api_config_audit')
      .insert({
        provider_id: integration.provider,
        field_key: field_key ?? '*',
        action: 'DELETE',
        ip_address: getClientIp(req),
        user_agent: req.headers.get('user-agent') ?? '',
      })

    // 상태 초기화
    await supabase
      .from('api_integration_status')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('provider_id', integration.provider)

    invalidateConfigCache()

    return NextResponse.json({ ok: true, message: '삭제되었습니다.' })
  } catch (err) {
    return fromUnknown(err)
  }
}
