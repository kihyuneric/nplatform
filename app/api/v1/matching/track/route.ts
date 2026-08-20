import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import { NO_STORE } from '@/lib/api-cache'
import { trackMatchReaction } from '@/lib/match-tracking'

export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/matching/track — 매칭 발송 '열람' 기록 (2026-08-19)
 * 운영기획서 v4 §3-6 반응 추적
 *
 * body: { listing_id }
 *
 * 관심·NDA 는 각자의 API 안에서 기록되지만, '열람'은 서버 동작이 없는 행위라
 * 화면이 알려주어야 한다. 발송 이력이 없는 조합은 조용히 무시된다.
 * 실패해도 화면에는 영향이 없도록 항상 200 으로 응답한다.
 */
export async function POST(request: NextRequest) {
  try {
    const me = await getAuthUserWithRole()
    if (!me) return NextResponse.json({ ok: true }, { headers: NO_STORE })

    const body = await request.json().catch(() => ({}))
    const listingId = String(body.listing_id ?? '')
    if (!listingId) return NextResponse.json({ ok: true }, { headers: NO_STORE })

    const supabase = await createClient()
    await trackMatchReaction(supabase, listingId, me.id, 'opened_at')

    return NextResponse.json({ ok: true }, { headers: NO_STORE })
  } catch {
    return NextResponse.json({ ok: true }, { headers: NO_STORE })
  }
}
