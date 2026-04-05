// ============================================================
// app/api/v1/cron/ai-screen/route.ts
// Vercel Cron — 법원경매 AI 스크리닝 정기 실행
// 매 2시간마다 미스크리닝 매물 50건 처리
// ============================================================

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60  // 최대 60초

export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }, { status: 500 })
  }

  // batch_size: 2시간마다 50건 → 하루 600건 처리
  const batch_size = Number(req.nextUrl.searchParams.get('batch_size') ?? '50')

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? `https://${req.headers.get('host') ?? 'localhost:3000'}`

    const res = await fetch(`${baseUrl}/api/v1/auction/screen`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        batch_size,
        force: false,
        dry_run: false,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json(
        { error: `Screen API returned ${res.status}: ${err}` },
        { status: 500 }
      )
    }

    const result = await res.json() as {
      processed: number
      succeeded: number
      failed: number
      duration_ms: number
    }

    console.log(
      `[cron/ai-screen] processed=${result.processed} ` +
      `succeeded=${result.succeeded} failed=${result.failed} ` +
      `duration=${result.duration_ms}ms`
    )

    return NextResponse.json({
      ok: true,
      ...result,
      triggered_at: new Date().toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/ai-screen]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
