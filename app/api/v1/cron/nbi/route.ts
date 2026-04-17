// ─── /api/v1/cron/nbi ───────────────────────────────────────
// 일일 NBI 집계 cron 엔드포인트.
// Vercel Cron 또는 GitHub Actions에서 매일 00:30 KST 호출.
//
// 인증: Bearer ${CRON_SECRET}
// vercel.json:
//   { "crons": [{ "path": "/api/v1/cron/nbi", "schedule": "30 15 * * *" }] }
//   (UTC 15:30 = KST 00:30)

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { runNbiCron } from "@/lib/market/nbi-cron"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // 1. 인증
  const auth = req.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "cron_secret_not_set" }, { status: 500 })
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // 2. service_role client (RLS 우회)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: "supabase_env_missing" }, { status: 500 })
  }
  const sb = createClient(url, key, { auth: { persistSession: false } })

  // 3. 실행
  try {
    const result = await runNbiCron(sb as never)
    return NextResponse.json({
      ok: result.status !== "failed",
      ...result,
    }, { status: result.status === "failed" ? 500 : 200 })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 },
    )
  }
}

// 수동 트리거용 POST (admin)
export async function POST(req: NextRequest) {
  return GET(req)
}
