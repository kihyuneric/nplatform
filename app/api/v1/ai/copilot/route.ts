import { NextRequest, NextResponse } from "next/server"
import { askCopilot, streamCopilot, type CopilotRequest } from "@/lib/ai/copilot"

/**
 * POST /api/v1/ai/copilot
 *
 * NPL Copilot v2 — Claude tool-calling 기반 AI 분석 어시스턴트
 *
 * 요청 body:
 *   { query: string, context?: CopilotContext, stream?: boolean }
 *
 * stream=true 시 Server-Sent Events 형식으로 실시간 응답
 * stream=false 시 (기본) 일반 JSON 응답
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, context, stream = false } = body as CopilotRequest & { stream?: boolean }

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { error: "query 필수 (질문 텍스트)" },
        { status: 400 },
      )
    }

    const copilotReq: CopilotRequest = { query: query.trim(), context }

    // ─── Streaming 모드 ─────────────────────────────────
    if (stream) {
      const encoder = new TextEncoder()

      const readable = new ReadableStream({
        async start(controller) {
          try {
            const gen = streamCopilot(copilotReq)
            for await (const chunk of gen) {
              const data = JSON.stringify(chunk)
              controller.enqueue(encoder.encode(`data: ${data}\n\n`))
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"))
          } catch (err: any) {
            const errorData = JSON.stringify({ type: "error", content: err.message })
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`))
          } finally {
            controller.close()
          }
        },
      })

      return new NextResponse(readable, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "X-Copilot-Version": "v2-claude",
        },
      })
    }

    // ─── 일반 모드 ──────────────────────────────────────
    const answer = await askCopilot(copilotReq)

    return NextResponse.json({
      ok: true,
      data: answer,
    })
  } catch (err: any) {
    console.error("[Copilot API] Error:", err)
    return NextResponse.json(
      { error: err.message ?? "Copilot 오류" },
      { status: 500 },
    )
  }
}
