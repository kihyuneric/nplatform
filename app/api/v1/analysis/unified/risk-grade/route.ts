/**
 * POST /api/v1/analysis/unified/risk-grade
 * — 통합 리포트의 AI 리스크 등급 섹션 생성.
 * — 요청: RiskGradeRequest (assetTitle/region/LTV/특수조건/통계컨텍스트 등)
 * — 응답: AiRiskGrade (grade/score/level/narrative/factors/promptMeta)
 */

import { NextResponse, type NextRequest } from "next/server"
import { gradeRiskWithAI, type RiskGradeRequest } from "@/lib/ai/risk-grader"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RiskGradeRequest

    // 최소 필드 검증
    const missing: string[] = []
    if (!body.assetTitle) missing.push("assetTitle")
    if (!body.region) missing.push("region")
    if (!body.propertyCategory) missing.push("propertyCategory")
    if (!body.appraisalValue) missing.push("appraisalValue")
    if (!body.totalBondAmount) missing.push("totalBondAmount")
    if (!body.specialConditions) missing.push("specialConditions")
    if (!body.statistics) missing.push("statistics")

    if (missing.length > 0) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: `필수 필드 누락: ${missing.join(", ")}` } },
        { status: 400 },
      )
    }

    const result = await gradeRiskWithAI(body)
    return NextResponse.json({ data: result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: { code: "AI_RISK_GRADE_FAIL", message } },
      { status: 500 },
    )
  }
}
