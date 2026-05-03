/**
 * GET /api/v1/admin/integrations
 *
 * 외부 연동 등록 상태를 ENV 변수 기준으로 동적 판정.
 * 관리자 페이지 (/admin/integrations) 에서 polling.
 *
 * 응답: { integrations: [{ ...registry, resolvedStatus, missingEnvVars }] }
 */
import { NextResponse } from 'next/server'
import { INTEGRATIONS, resolveIntegrationStatus } from '@/lib/integrations/registry'
import { hasConfig } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  // process.env + DB (api_configs) 둘 다 확인 — 관리자 UI 에서 입력한 값 반영
  const integrations = await Promise.all(INTEGRATIONS.map(async (i) => {
    const dbSaved = await Promise.all(i.envVars.map(v => hasConfig(v).catch(() => false)))
    const allSaved = i.envVars.length > 0 && dbSaved.every(Boolean)
    const missingEnvVars = i.envVars.filter((_, idx) => !dbSaved[idx])

    // DB 에 저장됐으면 LIVE, 아니면 기존 status 유지
    const baseStatus = resolveIntegrationStatus(i)
    const resolvedStatus = allSaved ? 'LIVE' : baseStatus

    return {
      ...i,
      resolvedStatus,
      missingEnvVars,
      isReady: resolvedStatus === 'LIVE',
      // 어떤 키가 DB 에서 등록됐는지 표시 (UI 에서 dot 색깔 결정)
      savedEnvVars: i.envVars.filter((_, idx) => dbSaved[idx]),
    }
  }))

  // 카테고리별 통계
  const stats = {
    total: integrations.length,
    live: integrations.filter(i => i.resolvedStatus === 'LIVE').length,
    mock: integrations.filter(i => i.resolvedStatus === 'MOCK').length,
    missing: integrations.filter(i => i.resolvedStatus === 'MISSING').length,
  }

  return NextResponse.json({ integrations, stats }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
