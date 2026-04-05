import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/data-layer"
import { createClient } from "@/lib/supabase/server"
import { checkAndDeductCredits } from "@/lib/credit-guard"

const AI_ANALYSIS_COST = 10 // credits

const SAMPLE_RESULT = {
  risk_grade: "B",
  ai_estimate: { low: 1925000000, mid: 2250000000, high: 2625000000 },
  expected_return: { conservative: 12.5, moderate: 18.3, optimistic: 25.7 },
  key_factors: [
    "서울 강남권 오피스 — 입지 우수, 임대 수요 안정적",
    "LTV 70% — 담보 충분, 선순위 없음",
    "연체 12개월 — 회수 가능성 높음",
    "감정가 대비 30% 할인 — 투자 매력 있음",
  ],
  recommendation: "투자 적합 — 리스크 B등급으로 중간 수준이나, 입지와 담보 가치를 고려하면 양호한 투자 기회입니다.",
  _sample: true,
  _note: "실제 AI 분석을 위해 관리자 → API 연동 → Anthropic Claude에서 API 키를 입력하세요.",
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Get user ID for credit check
    let userId: string | null = null
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch {
      // No auth session - use default user in dev/sample mode
    }

    const effectiveUserId = userId || 'current-user'

    // Credit guard check
    const creditResult = await checkAndDeductCredits(
      effectiveUserId,
      'NPL AI 분석',
      AI_ANALYSIS_COST
    )

    if (!creditResult.allowed) {
      return NextResponse.json(
        {
          error: '크레딧이 부족합니다',
          required: creditResult.cost,
          current: creditResult.balance,
          message: `AI 분석에는 ${AI_ANALYSIS_COST} 크레딧이 필요합니다. 현재 잔액: ${creditResult.balance}`,
        },
        { status: 402 }
      )
    }

    // Check if real API key is available
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (apiKey && apiKey !== '' && apiKey !== 'your-key-here') {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            messages: [{
              role: 'user',
              content: `NPL 부실채권 분석을 수행해주세요.
채권원금: ${body.principal}원
담보유형: ${body.collateralType}
소재지: ${body.location}
감정가: ${body.appraisedValue}원
LTV: ${body.ltv}%

다음 형식으로 JSON 응답해주세요:
{
  "riskGrade": "A~E",
  "estimatedPrice": { "min": number, "max": number, "expected": number },
  "expectedReturn": { "optimistic": number, "base": number, "pessimistic": number },
  "keyFactors": ["요인1", "요인2", ...],
  "recommendation": "매수 추천 여부와 이유"
}`
            }],
          }),
        })
        const aiResult = await response.json()
        const text = aiResult.content?.[0]?.text || ''
        const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || '{}')
        return NextResponse.json({
          data: {
            risk_grade: parsed.riskGrade || SAMPLE_RESULT.risk_grade,
            ai_estimate: parsed.estimatedPrice
              ? { low: parsed.estimatedPrice.min, mid: parsed.estimatedPrice.expected, high: parsed.estimatedPrice.max }
              : SAMPLE_RESULT.ai_estimate,
            expected_return: parsed.expectedReturn
              ? { conservative: parsed.expectedReturn.pessimistic, moderate: parsed.expectedReturn.base, optimistic: parsed.expectedReturn.optimistic }
              : SAMPLE_RESULT.expected_return,
            key_factors: parsed.keyFactors || SAMPLE_RESULT.key_factors,
            recommendation: parsed.recommendation || SAMPLE_RESULT.recommendation,
            _sample: false,
            _source: 'ai',
          },
          credits_used: AI_ANALYSIS_COST,
          credits_remaining: creditResult.balance,
        })
      } catch {
        // AI call failed, fall through to sample
      }
    }

    return NextResponse.json({
      data: SAMPLE_RESULT,
      credits_used: AI_ANALYSIS_COST,
      credits_remaining: creditResult.balance,
    })
  } catch {
    return NextResponse.json({ data: SAMPLE_RESULT })
  }
}
