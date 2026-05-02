import { createClient } from "@/lib/supabase/client"
import { deductCredits, calculateFee } from "@/lib/billing"
import { onSubscriptionConverted, onDealCompleted, onConsultationCompleted } from "@/lib/referral-events"
import { logAudit } from "@/lib/security/audit-logger"
import { generateAndStoreDealCommission } from "@/lib/commission/generate"

// ─── 과금 이벤트 트리거 ────────────────────────────────
// 서비스 사용 시 자동으로 크레딧 차감 + 청구서 생성 + 추천 수익 연동

/**
 * AI 서비스 사용 전 크레딧 확인 & 차감
 */
export async function onAIServiceUsed(params: {
  userId: string
  serviceKey: string
  referenceId?: string
}): Promise<{ allowed: boolean; error?: string }> {
  const { userId, serviceKey, referenceId } = params

  const result = await deductCredits({ userId, serviceKey, referenceId })

  if (result.success) {
    await logAudit({
      user_id: userId,
      action: "CREDIT_USE",
      resource_type: "service",
      details: { serviceKey, credits: result.remaining },
    })
  }

  return { allowed: result.success, error: result.error }
}

/**
 * 딜 브릿지 거래 완료 시 수수료 처리 (P0-2 · 2026-05-02)
 *
 * 단일 진실 원천 (SSoT): `lib/commission/generate.ts` 의 `generateAndStoreDealCommission()`
 * 호출 후 추천 수익·감사 로그 부수 효과만 추가.
 *
 * - 중복 청구 방지 (deal_commissions 에 이미 row 가 있으면 skip)
 * - winning_bid·buyer·seller 자동 추론 (court_auction_listings → deal_listings → members)
 * - 인보이스 양면 자동 발행 (commission_invoices)
 */
export async function onDealSettlement(params: {
  dealId: string
  buyerId?: string
  sellerId?: string
  agreedPrice?: number
  buyerTenantId?: string
  sellerTenantId?: string
}) {
  const { dealId, buyerId, sellerId, agreedPrice } = params
  const supabase = createClient()

  // 단일 SSoT 함수 호출 — admin/webhook 과 동일 로직
  const result = await generateAndStoreDealCommission(supabase, {
    dealId,
    winningBid: agreedPrice,
    buyerId: buyerId ?? null,
    sellerId: sellerId ?? null,
    chargedTo: 'SPLIT',
  })

  if (!result.ok) {
    if (result.skipped === 'already_exists') {
      // 이미 처리됨 — 정상 시나리오
      return { ok: true, skipped: 'already_exists' as const }
    }
    return { ok: false, error: result.error ?? result.reason ?? result.skipped }
  }

  // 추천 수익 연동 (매수자/매도자 각각)
  const totalPlatformFee = result.commission!.commission_amount
  if (buyerId) await onDealCompleted(buyerId, totalPlatformFee)
  if (sellerId) await onDealCompleted(sellerId, totalPlatformFee)

  // 감사 로그
  if (buyerId) {
    await logAudit({
      user_id: buyerId,
      action: "DEAL_COMPLETE",
      resource_type: "deal",
      resource_id: dealId,
      details: {
        agreed_price: agreedPrice,
        commission_amount: result.commission!.commission_amount,
        buyer_amount: result.commission!.buyer_amount,
        seller_amount: result.commission!.seller_amount,
        invoices_issued: result.invoices?.length ?? 0,
      },
    })
  }

  // calculateFee unused import warning 방지 — 외부 fee_settings 테이블 룩업이 필요한 곳에서 별도 사용
  void calculateFee

  return { ok: true, commission: result.commission, invoices: result.invoices }
}

/**
 * 전문가 상담 완료 시 정산
 */
export async function onConsultationSettlement(params: {
  consultationId: string
  professionalId: string
  clientId: string
  grossAmount: number
  serviceId?: string
}) {
  const { consultationId, professionalId, clientId, grossAmount, serviceId } = params
  const supabase = createClient()

  // 플랫폼 수수료 계산
  const feeResult = await calculateFee({
    feeType: "professional_platform_fee",
    baseAmount: grossAmount,
  })

  const platformFee = feeResult.fee
  const netAmount = grossAmount - platformFee

  // 전문가 수익 기록
  await supabase.from("professional_earnings").insert({
    professional_id: professionalId,
    consultation_id: consultationId,
    service_id: serviceId,
    gross_amount: grossAmount,
    platform_fee: platformFee,
    net_amount: netAmount,
  })

  // 클라이언트 청구서
  await supabase.from("invoices").insert({
    user_id: clientId,
    invoice_type: "CONSULTATION",
    amount: grossAmount,
    tax_amount: Math.round(grossAmount * 0.1),
    total_amount: Math.round(grossAmount * 1.1),
    description: `전문가 상담료`,
    metadata: { consultation_id: consultationId, professional_id: professionalId },
  })

  // 추천 수익 연동
  await onConsultationCompleted(clientId, platformFee)
}

/**
 * 구독 결제 시
 */
export async function onSubscriptionPayment(params: {
  userId: string
  planId: string
  amount: number
  isFirstPayment: boolean
}) {
  const { userId, planId, amount, isFirstPayment } = params
  const supabase = createClient()

  // 청구서 생성
  await supabase.from("invoices").insert({
    user_id: userId,
    invoice_type: "SUBSCRIPTION",
    amount,
    tax_amount: Math.round(amount * 0.1),
    total_amount: Math.round(amount * 1.1),
    status: "PAID",
    paid_at: new Date().toISOString(),
    description: `구독 결제`,
    metadata: { plan_id: planId, is_first: isFirstPayment },
  })

  // 첫 결제 시 추천 수익
  if (isFirstPayment) {
    await onSubscriptionConverted(userId, amount)
  }

  await logAudit({
    user_id: userId,
    action: "PAYMENT",
    details: { type: "SUBSCRIPTION", amount, plan_id: planId },
  })
}
