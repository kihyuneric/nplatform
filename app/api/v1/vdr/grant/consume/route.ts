/**
 * POST /api/v1/vdr/grant/consume
 *
 * body: { grant_id }
 *
 * 프런트엔드에서 signed URL 을 실제로 열람/다운로드한 시점을 후킹해
 * signed_url_grants.consumed_at 을 기록한다. (규제 감사 핵심 레코드)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isGrantExpired } from '@/lib/vdr/grants'

export const dynamic = 'force-dynamic'

const Body = z.object({ grant_id: z.string().uuid() })

function extractIp(req: NextRequest): string | null {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  let parsed
  try {
    parsed = Body.parse(await req.json())
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues.map((i) => `${i.path.join('.')}: ${i.message}`) : [String(err)]
    return NextResponse.json({ ok: false, error: { code: 'VALIDATION_ERROR', issues } }, { status: 400 })
  }

  const { data: grant, error: selErr } = await supabase
    .from('signed_url_grants')
    .select('id, user_id, expires_at, consumed_at')
    .eq('id', parsed.grant_id)
    .maybeSingle()

  if (selErr || !grant) {
    return NextResponse.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 })
  }

  if (grant.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: { code: 'FORBIDDEN' } }, { status: 403 })
  }

  if (isGrantExpired(grant.expires_at)) {
    return NextResponse.json({ ok: false, error: { code: 'GRANT_EXPIRED' } }, { status: 410 })
  }

  if (grant.consumed_at) {
    return NextResponse.json({ ok: true, already: true, consumed_at: grant.consumed_at })
  }

  const { error: updErr } = await supabase
    .from('signed_url_grants')
    .update({
      consumed_at: new Date().toISOString(),
      consumed_ip: extractIp(req),
      consumed_user_agent: req.headers.get('user-agent'),
    })
    .eq('id', parsed.grant_id)

  if (updErr) {
    return NextResponse.json({ ok: false, error: { code: 'DB_ERROR', message: updErr.message } }, { status: 500 })
  }

  return NextResponse.json({ ok: true, already: false, consumed_at: new Date().toISOString() })
}
