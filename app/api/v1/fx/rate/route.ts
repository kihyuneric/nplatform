/**
 * /api/v1/fx/rate
 *
 * GET — 현재 환율 + 캐시 상태 조회
 * POST — 환율 캐시 강제 갱신 (관리자/cron)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getKrwPerUsd, getFxCacheStatus, invalidateFxCache } from '@/lib/fx/rate'
import { timingSafeEqual } from 'node:crypto'

function safeEq(a: string, b: string): boolean {
  if (!a || !b) return false
  const A = Buffer.from(a)
  const B = Buffer.from(b)
  if (A.length !== B.length) return false
  return timingSafeEqual(A, B)
}

export async function GET() {
  const rate = await getKrwPerUsd()
  const status = getFxCacheStatus()
  return NextResponse.json({
    data: {
      krwPerUsd: rate,
      source: status?.source ?? 'UNKNOWN',
      fetchedAt: status ? new Date(status.fetchedAt).toISOString() : null,
      ageMs: status ? Date.now() - status.fetchedAt : null,
    },
  })
}

export async function POST(req: NextRequest) {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  const isAuthorized =
    safeEq(token, process.env.SUPABASE_SERVICE_ROLE_KEY ?? '') ||
    safeEq(token, process.env.CRON_SECRET ?? '')

  if (!isAuthorized) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '인증 토큰이 유효하지 않습니다.' } },
      { status: 401 }
    )
  }

  invalidateFxCache()
  const rate = await getKrwPerUsd()
  const status = getFxCacheStatus()
  return NextResponse.json({
    data: {
      krwPerUsd: rate,
      source: status?.source ?? 'UNKNOWN',
      refreshedAt: status ? new Date(status.fetchedAt).toISOString() : null,
    },
  })
}
