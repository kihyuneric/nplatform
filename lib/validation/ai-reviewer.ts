// ─── AI 검수 (검수 4단계 중 2단계: Claude API 기반) ────

import Anthropic from "@anthropic-ai/sdk"
import { logger } from '@/lib/logger'

interface AIReviewInput {
  debt_principal: number
  debt_delinquency_months?: number
  collateral_type: string
  collateral_region: string
  collateral_district?: string
  collateral_appraisal_value?: number
  collateral_ltv?: number
  ask_min?: number
  ask_max?: number
}

export interface AIReviewResult {
  approved: boolean
  risk_grade: "A" | "B" | "C" | "D" | "E"
  ai_estimate_low: number
  ai_estimate_mid: number
  ai_estimate_high: number
  flags: AIReviewFlag[]
  summary: string
}

export interface AIReviewFlag {
  type: "INFO" | "WARNING" | "CRITICAL"
  message: string
}

/**
 * Claude API를 사용한 NPL AI 검수
 */
export async function aiReviewListing(input: AIReviewInput): Promise<AIReviewResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    // API 키 없으면 기본 규칙 기반 검수
    return fallbackReview(input)
  }

  try {
    const client = new Anthropic({ apiKey })

    const prompt = `당신은 NPL(부실채권) 전문 분석가입니다. 다음 NPL 매각 공고를 검수해주세요.

채권 정보:
- 채권원금: ${(input.debt_principal / 100000000).toFixed(1)}억원
- 연체기간: ${input.debt_delinquency_months || "미입력"}개월
- 담보물 유형: ${input.collateral_type}
- 소재지: ${input.collateral_region} ${input.collateral_district || ""}
- 감정가: ${input.collateral_appraisal_value ? (input.collateral_appraisal_value / 100000000).toFixed(1) + "억원" : "미입력"}
- LTV: ${input.collateral_ltv || "미입력"}%
- 매도 희망가: ${input.ask_min ? (input.ask_min / 100000000).toFixed(1) : "미입력"}~${input.ask_max ? (input.ask_max / 100000000).toFixed(1) : "미입력"}억원

다음 JSON 형식으로 답변해주세요:
{
  "approved": true/false,
  "risk_grade": "A~E 중 하나",
  "ai_estimate_low": 적정가_하한(원),
  "ai_estimate_mid": 적정가_중간(원),
  "ai_estimate_high": 적정가_상한(원),
  "flags": [{"type": "INFO/WARNING/CRITICAL", "message": "검토 의견"}],
  "summary": "종합 의견 (2~3문장)"
}`

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        approved: parsed.approved ?? true,
        risk_grade: parsed.risk_grade || "C",
        ai_estimate_low: parsed.ai_estimate_low || 0,
        ai_estimate_mid: parsed.ai_estimate_mid || 0,
        ai_estimate_high: parsed.ai_estimate_high || 0,
        flags: parsed.flags || [],
        summary: parsed.summary || "AI 검수 완료",
      }
    }

    return fallbackReview(input)
  } catch (error) {
    logger.error("[AI Reviewer] Error:", { error: error })
    return fallbackReview(input)
  }
}

/**
 * API 키 없거나 오류 시 규칙 기반 검수
 */
function fallbackReview(input: AIReviewInput): AIReviewResult {
  const flags: AIReviewFlag[] = []
  let riskScore = 50 // 0(안전)~100(위험)

  // LTV 기반 리스크
  if (input.collateral_ltv) {
    if (input.collateral_ltv > 100) {
      flags.push({ type: "CRITICAL", message: "LTV가 100%를 초과합니다 (담보 부족)." })
      riskScore += 30
    } else if (input.collateral_ltv > 80) {
      flags.push({ type: "WARNING", message: "LTV가 80%를 초과합니다." })
      riskScore += 15
    } else if (input.collateral_ltv < 50) {
      riskScore -= 20
    }
  }

  // 연체기간 기반
  if (input.debt_delinquency_months) {
    if (input.debt_delinquency_months > 60) {
      flags.push({ type: "WARNING", message: "연체기간 5년 초과. 회수 난이도가 높을 수 있습니다." })
      riskScore += 10
    }
  }

  // 감정가 대비 희망가
  if (input.collateral_appraisal_value && input.ask_min) {
    const ratio = input.ask_min / input.collateral_appraisal_value
    if (ratio > 0.9) {
      flags.push({ type: "WARNING", message: "최소 희망가가 감정가의 90% 이상입니다." })
    }
  }

  // 리스크 등급 결정
  const grade: AIReviewResult["risk_grade"] =
    riskScore <= 20 ? "A" : riskScore <= 40 ? "B" : riskScore <= 60 ? "C" : riskScore <= 80 ? "D" : "E"

  // 간이 적정가 추정 (감정가 기반)
  const baseValue = input.collateral_appraisal_value || input.debt_principal
  const discount = grade === "A" ? 0.8 : grade === "B" ? 0.7 : grade === "C" ? 0.6 : grade === "D" ? 0.5 : 0.4

  return {
    approved: riskScore <= 80,
    risk_grade: grade,
    ai_estimate_low: Math.round(baseValue * (discount - 0.1)),
    ai_estimate_mid: Math.round(baseValue * discount),
    ai_estimate_high: Math.round(baseValue * (discount + 0.1)),
    flags,
    summary: `규칙 기반 검수 완료. 리스크 등급 ${grade}, 정보 완성도에 따라 추가 검토가 필요합니다.`,
  }
}
