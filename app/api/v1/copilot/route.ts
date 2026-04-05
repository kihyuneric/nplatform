/**
 * POST /api/v1/copilot
 *
 * NPL Copilot 대화형 AI API
 *
 * Body:
 *   message      — 사용자 메시지
 *   history      — 이전 대화 (최근 10턴)
 *   context      — 물건 컨텍스트 (listing_id, property 등)
 *   extract_from_message — true 시 메시지에서 물건 정보 자동 추출
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Errors, fromUnknown } from '@/lib/api-error'
import {
  chat,
  createContext,
  extractPropertyFromText,
  type CopilotContext,
} from '@/lib/copilot/npl-copilot'

export const maxDuration = 60  // AI 응답 최대 60초

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
})

const RequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(MessageSchema).max(20).optional().default([]),
  context: z.object({
    listing_id: z.string().optional(),
    property: z.record(z.unknown()).optional(),
    portfolio: z.array(z.record(z.unknown())).optional(),
    conversation_id: z.string().optional(),
    created_at: z.string().optional(),
  }).optional(),
  extract_from_message: z.boolean().optional().default(false),
})

export async function POST(req: NextRequest) {
  try {
    // AI 기능 가용성 확인
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({
        message: 'AI 서비스가 설정되지 않았습니다. ANTHROPIC_API_KEY를 설정해주세요.',
        suggested_questions: ['물건 데이터 직접 분석하기 →', 'NBI 지수 확인하기 →'],
        analysis: null,
        context_updated: false,
      })
    }

    const body = await req.json()
    const parsed = RequestSchema.safeParse(body)
    if (!parsed.success) {
      return Errors.validation(
        parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      )
    }

    const { message, history, context: rawContext, extract_from_message } = parsed.data

    // 컨텍스트 구성
    let context: CopilotContext = rawContext?.conversation_id
      ? rawContext as CopilotContext
      : createContext(rawContext?.property as Record<string, unknown> | undefined)

    // 내부 RAG 호출 base URL 설정 (서버 사이드 → localhost 직접 호출)
    const ragBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3000}`
    context = { ...context, rag_base_url: ragBaseUrl }

    // 메시지에서 물건 정보 자동 추출
    if (extract_from_message) {
      const extracted = extractPropertyFromText(message)
      if (Object.keys(extracted).length > 0) {
        context = {
          ...context,
          property: { ...(context.property ?? {}), ...extracted },
        }
      }
    }

    // AI 대화 (RAG 검색 + 분석 엔진 병렬 실행)
    const response = await chat({ message, history, context })

    return NextResponse.json({
      ...response,
      conversation_id: context.conversation_id,
    })
  } catch (err) {
    // Anthropic API 오류 친절하게 처리
    if (err instanceof Error && err.message.includes('rate_limit')) {
      return NextResponse.json(
        { message: 'AI 요청이 일시적으로 제한되었습니다. 잠시 후 다시 시도해주세요.', suggested_questions: [], analysis: null, context_updated: false },
        { status: 429 }
      )
    }
    return fromUnknown(err)
  }
}
