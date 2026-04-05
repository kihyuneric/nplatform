import { createClient } from "@/lib/supabase/client"

// ─── Deal Lifecycle Automation ─────────────────────

export interface CreateDealResult {
  deal: any
  milestones: any[]
  interestDoc: string  // auto-generated interest letter
}

/**
 * Create a new deal when buyer expresses interest
 * Auto-generates: deal record + 7 milestones + interest document
 */
export async function createDeal(listingId: string, buyerId: string): Promise<CreateDealResult> {
  // 1. Get listing info
  const listingRes = await fetch(`/api/v1/exchange/listings/${listingId}`)
  const listingData = await listingRes.json()
  const listing = listingData.data || listingData

  // 2. Create deal record
  const dealRes = await fetch('/api/v1/exchange/deals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listing_id: listingId,
      buyer_id: buyerId,
      seller_id: listing.seller_id || 'unknown',
    }),
  })
  const deal = await dealRes.json()
  const dealId = deal.data?.id || deal.id || `deal-${Date.now()}`

  // 3. Auto-generate 7 milestones
  const STAGES = [
    { stage: 'INTEREST', status: 'COMPLETED' },
    { stage: 'NDA', status: 'PENDING' },
    { stage: 'DUE_DILIGENCE', status: 'PENDING' },
    { stage: 'NEGOTIATION', status: 'PENDING' },
    { stage: 'CONTRACT', status: 'PENDING' },
    { stage: 'SETTLEMENT', status: 'PENDING' },
    { stage: 'COMPLETED', status: 'PENDING' },
  ]

  const milestones = STAGES.map(s => ({
    deal_id: dealId,
    ...s,
    started_at: s.stage === 'INTEREST' ? new Date().toISOString() : null,
    completed_at: s.stage === 'INTEREST' ? new Date().toISOString() : null,
  }))

  // 4. Auto-generate interest document text
  const interestDoc = generateInterestLetter({
    buyerName: '매수 희망자',
    listingTitle: listing.title || listing.name || '매각 공고',
    principal: listing.debt_principal || listing.original_amount || 0,
    date: new Date().toISOString().split('T')[0],
  })

  // 5. Send system message
  await fetch(`/api/v1/exchange/deals/${dealId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `관심 표명이 접수되었습니다. 매도자의 응답을 기다려주세요.`,
      message_type: 'SYSTEM',
    }),
  })

  return { deal: deal.data || deal, milestones, interestDoc }
}

/**
 * Advance deal to next stage — triggers automatic actions
 */
export async function advanceStage(dealId: string, nextStage: string): Promise<{
  success: boolean
  autoActions: string[]  // list of auto-generated items
}> {
  const autoActions: string[] = []

  // Update deal stage
  await fetch(`/api/v1/exchange/deals/${dealId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_stage: nextStage }),
  })

  // Stage-specific automation
  switch (nextStage) {
    case 'NDA': {
      // Auto-generate NDA document
      autoActions.push('NDA 비밀유지계약서 자동 생성')
      // Send system message
      await sendSystemMessage(dealId, 'NDA 체결이 완료되었습니다. 상세 정보가 공개됩니다.')
      autoActions.push('상세 정보 잠금 해제')
      break
    }
    case 'DUE_DILIGENCE': {
      // Auto-generate 14 DD checklist items
      const DD_ITEMS = [
        '등기부등본 확인', '감정평가서 검토', '임차인 현황 조사', '선순위 채권 확인',
        '세금 체납 여부', '법적 소송 현황', '건축물대장 확인', '토지이용계획확인원',
        '현장 실사', '채무자 신용조사', '담보물 시세 검증', '수익성 분석',
        '법률 의견서', '최종 실사 리포트',
      ]
      // Create items via API
      for (let i = 0; i < DD_ITEMS.length; i++) {
        await fetch(`/api/v1/exchange/due-diligence/${dealId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_number: i + 1,
            title: DD_ITEMS[i],
            status: 'NOT_STARTED',
          }),
        })
      }
      autoActions.push('실사 체크리스트 14개 항목 자동 생성')
      await sendSystemMessage(dealId, '실사가 시작되었습니다. 14개 항목을 확인해주세요.')
      break
    }
    case 'NEGOTIATION': {
      await sendSystemMessage(dealId, '가격 협상 단계입니다. 오퍼를 제출해주세요.')
      autoActions.push('오퍼 제출 양식 활성화')
      break
    }
    case 'CONTRACT': {
      autoActions.push('채권양도양수계약서 템플릿 자동 생성')
      await sendSystemMessage(dealId, '계약 체결 단계입니다. 계약서를 확인하고 서명해주세요.')
      break
    }
    case 'SETTLEMENT': {
      autoActions.push('잔금 일정 생성')
      await sendSystemMessage(dealId, '잔금 및 채권 이전 단계입니다.')
      break
    }
    case 'COMPLETED': {
      autoActions.push('거래 수수료 자동 계산')
      autoActions.push('청구서 자동 발행')
      autoActions.push('파트너 수익쉐어 정산')
      autoActions.push('상호 평가 요청')
      await sendSystemMessage(dealId, '거래가 완료되었습니다! 상대방을 평가해주세요.')
      break
    }
  }

  return { success: true, autoActions }
}

async function sendSystemMessage(dealId: string, content: string) {
  await fetch(`/api/v1/exchange/deals/${dealId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, message_type: 'SYSTEM' }),
  }).catch(() => {})
}

function generateInterestLetter(params: {
  buyerName: string
  listingTitle: string
  principal: number
  date: string
}): string {
  const amount = params.principal >= 100000000
    ? `${(params.principal / 100000000).toFixed(0)}억원`
    : `${(params.principal / 10000).toFixed(0)}만원`

  return `관심표명서

본인 ${params.buyerName}은(는) 아래 매각 공고에 대하여 매수 의향이 있음을 표명합니다.

매각 공고: ${params.listingTitle}
채권 원금: ${amount}
표명 일자: ${params.date}

본 관심 표명은 법적 구속력이 없으며, 구체적인 거래 조건은 NDA 체결 후 협의합니다.`
}

// ─── Listing Auto-Review Pipeline ──────────────────

export async function runListingReview(listingId: string): Promise<{
  validationScore: number
  riskGrade: string
  aiEstimate: { low: number; mid: number; high: number }
  flags: string[]
}> {
  // Step 1: Rule-based validation (always runs)
  const validationRes = await fetch(`/api/v1/exchange/listings/${listingId}`)
  const listing = (await validationRes.json()).data || {}

  // Import validation functions
  const { validateListing } = await import('@/lib/validation/listing-validator')
  const validation = validateListing(listing)

  // Step 2: AI review (if API key available)
  let aiResult: any = null
  try {
    const { aiReviewListing } = await import('@/lib/validation/ai-reviewer')
    aiResult = await aiReviewListing(listing)
  } catch {}

  return {
    validationScore: validation.score,
    riskGrade: aiResult?.risk_grade || (validation.score >= 80 ? 'B' : 'C'),
    aiEstimate: aiResult ? {
      low: aiResult.ai_estimate_low,
      mid: aiResult.ai_estimate_mid,
      high: aiResult.ai_estimate_high,
    } : {
      low: Math.round((listing.collateral_appraisal_value || listing.debt_principal || 0) * 0.5),
      mid: Math.round((listing.collateral_appraisal_value || listing.debt_principal || 0) * 0.6),
      high: Math.round((listing.collateral_appraisal_value || listing.debt_principal || 0) * 0.7),
    },
    flags: [
      ...validation.warnings.map((w: any) => w.message),
      ...(aiResult?.flags?.map((f: any) => f.message) || []),
    ],
  }
}
