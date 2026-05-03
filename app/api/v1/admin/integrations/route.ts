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

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const integrations = INTEGRATIONS.map(i => {
    const resolvedStatus = resolveIntegrationStatus(i)
    const missingEnvVars = i.envVars.filter(v => !process.env[v])
    return {
      ...i,
      resolvedStatus,
      missingEnvVars,
      isReady: resolvedStatus === 'LIVE',
    }
  })

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
