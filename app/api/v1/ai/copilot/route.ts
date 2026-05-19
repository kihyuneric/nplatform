import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
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

const CopilotBodySchema = z.object({
  query: z.string().trim().min(1, "query 필수 (질문 텍스트)").max(4000, "질문은 4000자 이내"),
  context: z.record(z.string(), z.unknown()).optional(),
  stream: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => ({}))
    const parsed = CopilotBodySchema.safeParse(raw)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? '요청이 유효하지 않습니다.' } },
        { status: 400 },
      )
    }
    const { query, context, stream = false } = parsed.data
    const copilotReq: CopilotRequest = { query, context: context as CopilotRequest['context'] }

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Copilot 오류"
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    )
  }
}
