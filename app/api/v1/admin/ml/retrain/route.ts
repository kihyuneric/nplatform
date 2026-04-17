import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { runRetrainingCycle, getRecentTrainingRuns } from "@/lib/ml/retraining-pipeline"
import { getAuthUserWithRole } from "@/lib/auth/get-user"

const Body = z.object({
  model_type: z.enum(["price", "risk", "recovery"]).default("price"),
})

/** POST /api/v1/admin/ml/retrain — trigger retraining cycle */
export async function POST(req: NextRequest) {
  const user = await getAuthUserWithRole()
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    )
  }

  let parsed
  try {
    parsed = Body.parse(await req.json())
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", message: "model_type이 유효하지 않습니다." } },
      { status: 400 },
    )
  }

  try {
    const run = await runRetrainingCycle(parsed.model_type)
    return NextResponse.json({ ok: true, data: run })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ok: false, error: { code: "TRAINING_FAILED", message: msg } },
      { status: 500 },
    )
  }
}

/** GET /api/v1/admin/ml/retrain — list recent training runs */
export async function GET() {
  const user = await getAuthUserWithRole()
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    )
  }

  try {
    const runs = await getRecentTrainingRuns(20)
    return NextResponse.json({ ok: true, data: runs })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_FAILED", message: msg } },
      { status: 500 },
    )
  }
}
