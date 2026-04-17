import { NextRequest, NextResponse } from "next/server"
import { detectAnomalies, detectAnomaliesWithAI, type AnomalyInput } from "@/lib/ai/anomaly-detector"

/**
 * POST /api/v1/ai/anomaly-detect
 *
 * v2: 규칙 기반 + Claude AI 패턴 인식 앙상블
 *
 * query param:
 *   ?engine=ai     → 규칙 + Claude 분석 (권장, 기본값)
 *   ?engine=rules  → 규칙 기반만 (빠른 응답)
 */
export async function POST(req: NextRequest) {
  try {
    const body: AnomalyInput = await req.json()

    if (!body.listingId || body.askingPrice == null) {
      return NextResponse.json(
        { error: "listingId, askingPrice 필수" },
        { status: 400 },
      )
    }

    const engine = req.nextUrl.searchParams.get("engine") ?? "ai"

    if (engine === "rules") {
      const result = detectAnomalies(body)
      return NextResponse.json({ ok: true, engine: "rules", data: result })
    }

    const result = await detectAnomaliesWithAI(body)
    return NextResponse.json({ ok: true, engine: "ai", data: result })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "이상 탐지 실패" },
      { status: 500 },
    )
  }
}
