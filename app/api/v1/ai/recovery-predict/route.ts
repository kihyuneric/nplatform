import { NextRequest, NextResponse } from "next/server"
import { predictRecovery, predictRecoveryWithAI, type PredictionInput } from "@/lib/ai/recovery-predictor"

/**
 * POST /api/v1/ai/recovery-predict
 *
 * v2: 하이브리드 예측 (수학모델 + Claude AI 분석)
 *
 * query param:
 *   ?mode=fast  → 수학모델만 (즉시 응답)
 *   ?mode=ai    → 수학모델 + Claude 분석 (권장, 기본값)
 */
export async function POST(req: NextRequest) {
  try {
    const body: PredictionInput = await req.json()

    if (!body.region || body.appraisalValue == null) {
      return NextResponse.json(
        { error: "region, appraisalValue 필수" },
        { status: 400 },
      )
    }

    const mode = req.nextUrl.searchParams.get("mode") ?? "ai"

    if (mode === "fast") {
      // v1: 수학 모델만 (빠른 응답)
      const result = predictRecovery(body)
      return NextResponse.json({ ok: true, mode: "fast", data: result })
    }

    // v2: 하이브리드 (수학 + Claude)
    const result = await predictRecoveryWithAI(body)
    return NextResponse.json({ ok: true, mode: "ai", data: result })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "회수율 예측 실패" },
      { status: 500 },
    )
  }
}
