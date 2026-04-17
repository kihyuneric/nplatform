import { NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/supabase/server"

/**
 * GET /api/health
 * Kubernetes / Vercel / Uptime Robot 헬스체크 엔드포인트.
 * Supabase DB 연결을 실제로 확인한다.
 */
export async function GET() {
  const start = Date.now()

  try {
    const supabase = getSupabaseAdmin()
    // 가장 가벼운 쿼리로 DB 연결 확인
    const { error } = await supabase.from("profiles").select("id").limit(1).single()

    // error.code === 'PGRST116' = "no rows" — 정상 (DB는 연결됨)
    const dbOk = !error || error.code === 'PGRST116'

    const latencyMs = Date.now() - start

    if (!dbOk) {
      return NextResponse.json(
        {
          status: "degraded",
          db: "error",
          error: error?.message,
          latency_ms: latencyMs,
          timestamp: new Date().toISOString(),
        },
        { status: 503 },
      )
    }

    return NextResponse.json(
      {
        status: "ok",
        db: "connected",
        latency_ms: latencyMs,
        version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0",
        env: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      },
    )
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
        latency_ms: Date.now() - start,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    )
  }
}
