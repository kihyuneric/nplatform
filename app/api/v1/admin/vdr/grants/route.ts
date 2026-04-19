/**
 * GET /api/v1/admin/vdr/grants
 *
 *  관리자용 VDR signed-URL 감사 대시보드 엔드포인트.
 *  "누가 어떤 문서에 몇 번 접근했는가 / 누수 시 워터마크 지문이 어디로 귀속되는가"
 *  를 단일 쿼리로 집계한다.
 *
 *  Query params
 *    - document_id  (UUID, optional)   특정 문서로 좁히기
 *    - user_id      (UUID, optional)   특정 사용자로 좁히기
 *    - range        today|7d|30d|all   기본 7d
 *    - status       all|consumed|unused|expired   기본 all
 *    - limit        기본 200, 최대 2000
 *
 *  Response
 *    { ok, data: { rows, summary: { total, consumed, expired, unused } } }
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'admin']

const Query = z.object({
  document_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  range: z.enum(['today', '7d', '30d', 'all']).default('7d'),
  status: z.enum(['all', 'consumed', 'unused', 'expired']).default('all'),
  limit: z.coerce.number().int().min(1).max(2000).default(200),
})

type GrantRow = {
  id: string
  document_id: string
  user_id: string
  deal_room_id: string | null
  issued_at: string
  expires_at: string
  consumed_at: string | null
  consumed_ip: string | null
  consumed_user_agent: string | null
  watermark_fingerprint: string | null
  reason: string | null
}

export async function GET(req: NextRequest) {
  const user = await getAuthUserWithRole()
  if (!user || !user.role || !ADMIN_ROLES.includes(user.role)) {
    return NextResponse.json(
      { ok: false, error: { code: 'FORBIDDEN', message: '관리자만 접근할 수 있습니다.' } },
      { status: 403 },
    )
  }

  const sp = req.nextUrl.searchParams
  let parsed
  try {
    parsed = Query.parse({
      document_id: sp.get('document_id') ?? undefined,
      user_id: sp.get('user_id') ?? undefined,
      range: sp.get('range') ?? undefined,
      status: sp.get('status') ?? undefined,
      limit: sp.get('limit') ?? undefined,
    })
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`) : [String(err)]
    return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', issues } }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  const windowMs: Record<string, number | null> = {
    today: 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    all: null,
  }
  const cutoffIso = windowMs[parsed.range]
    ? new Date(Date.now() - (windowMs[parsed.range] as number)).toISOString()
    : null

  let q = supabase
    .from('signed_url_grants')
    .select(
      'id, document_id, user_id, deal_room_id, issued_at, expires_at, consumed_at, consumed_ip, consumed_user_agent, watermark_fingerprint, reason',
    )
    .order('issued_at', { ascending: false })
    .limit(parsed.limit)

  if (parsed.document_id) q = q.eq('document_id', parsed.document_id)
  if (parsed.user_id) q = q.eq('user_id', parsed.user_id)
  if (cutoffIso) q = q.gte('issued_at', cutoffIso)

  const { data, error } = await q
  if (error) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }

  const rows = (data ?? []) as GrantRow[]
  const now = Date.now()

  const enriched = rows.map((r) => {
    const expired = Date.parse(r.expires_at) <= now
    const derivedStatus: 'consumed' | 'expired' | 'unused' = r.consumed_at
      ? 'consumed'
      : expired
        ? 'expired'
        : 'unused'
    return { ...r, derived_status: derivedStatus }
  })

  const filtered =
    parsed.status === 'all' ? enriched : enriched.filter((r) => r.derived_status === parsed.status)

  const summary = enriched.reduce(
    (acc, r) => {
      acc.total += 1
      acc[r.derived_status] += 1
      return acc
    },
    { total: 0, consumed: 0, expired: 0, unused: 0 },
  )

  return NextResponse.json({
    ok: true,
    data: {
      rows: filtered,
      summary,
      range: parsed.range,
      status: parsed.status,
    },
  })
}
