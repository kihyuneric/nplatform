import { NextRequest, NextResponse } from "next/server"
import {
  parseRegistryDocument,
  scanContractRisk,
  extractAppraisalData,
  analyzeDocumentWithAI,
} from "@/lib/ai/document-analyzer"

type AnalysisMode = "registry" | "contract" | "appraisal" | "auto"

/**
 * POST /api/v1/ai/document-analyze
 *
 * v2: Claude LLM 기반 문서 분석 (+ 정규식 fallback)
 *
 * body: { mode: "registry"|"contract"|"appraisal"|"auto", text: string }
 *
 * query param:
 *   ?engine=ai      → Claude LLM 분석 (권장, 기본값)
 *   ?engine=regex    → 기존 정규식 분석 (빠른 응답)
 */
export async function POST(req: NextRequest) {
  try {
    const { mode, text } = (await req.json()) as { mode: AnalysisMode; text: string }

    if (!text) {
      return NextResponse.json(
        { error: "text 필수 (분석할 문서 텍스트)" },
        { status: 400 },
      )
    }

    const engine = req.nextUrl.searchParams.get("engine") ?? "ai"

    // v2: Claude LLM 분석
    if (engine === "ai") {
      const result = await analyzeDocumentWithAI(text, mode || "auto")
      return NextResponse.json({ ok: true, engine: "ai", data: result })
    }

    // v1: 기존 정규식 분석
    const analysisMode = mode || "registry"
    let data: unknown

    switch (analysisMode) {
      case "registry":
        data = parseRegistryDocument(text)
        break
      case "contract":
        data = scanContractRisk(text)
        break
      case "appraisal":
        data = extractAppraisalData(text)
        break
      default:
        return NextResponse.json(
          { error: `지원하지 않는 분석 모드: ${analysisMode}` },
          { status: 400 },
        )
    }

    return NextResponse.json({ ok: true, engine: "regex", mode: analysisMode, data })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "문서 분석 실패" },
      { status: 500 },
    )
  }
}
