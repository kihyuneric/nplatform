import { NextRequest, NextResponse } from "next/server"
import { Errors } from '@/lib/api-error'
import { aiAnalyze } from "@/lib/ai-service"
import { checkAndDeductCredits } from "@/lib/credit-guard"
import { requireAuth } from "@/lib/auth-guard"

const CONTRACT_REVIEW_COST = 8 // credits

export async function POST(req: NextRequest) {
  try {
    const { contractText } = await req.json()
    if (!contractText) return Errors.badRequest('contractText required')

    // 인증 확인 (DB 기반) — 미로그인 시 401
    const authResult = await requireAuth()
    const userId = authResult.ok ? authResult.user.id : 'current-user'

    const creditResult = await checkAndDeductCredits(userId, 'AI 계약서 검토', CONTRACT_REVIEW_COST)

    if (!creditResult.allowed) {
      return Errors.noCredits(
        `AI 계약서 검토에는 ${CONTRACT_REVIEW_COST} 크레딧이 필요합니다. 현재 잔액: ${creditResult.balance}`
      )
    }

    const { text, provider } = await aiAnalyze(
      `다음 계약서를 검토하고 위험 조항, 누락 사항, 개선 제안을 JSON으로 반환해주세요:
      { "riskClauses": [...], "missingItems": [...], "suggestions": [...], "overallGrade": "A~D" }

      계약서:
      ${contractText.substring(0, 3000)}`
    )

    if (provider === 'fallback') {
      return NextResponse.json({
        data: {
          riskClauses: ['AI 미연동 상태 — 관리자에서 API 키를 입력하세요'],
          missingItems: [],
          suggestions: ['AI 계약서 검토를 위해 Anthropic 또는 OpenAI API 키가 필요합니다'],
          overallGrade: 'N/A',
          _sample: true,
        },
        credits_used: CONTRACT_REVIEW_COST,
        credits_remaining: creditResult.balance,
      })
    }

    try {
      const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
      return NextResponse.json({
        data: parsed,
        credits_used: CONTRACT_REVIEW_COST,
        credits_remaining: creditResult.balance,
      })
    } catch {
      return NextResponse.json({
        data: { riskClauses: [], suggestions: [text], overallGrade: 'B' },
        credits_used: CONTRACT_REVIEW_COST,
        credits_remaining: creditResult.balance,
      })
    }
  } catch (e) {
    return Errors.internal(e instanceof Error ? e.message : undefined)
  }
}
