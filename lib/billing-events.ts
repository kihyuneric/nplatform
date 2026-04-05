import { createClient } from "@/lib/supabase/client"
import { deductCredits, calculateFee } from "@/lib/billing"
import { onSubscriptionConverted, onDealCompleted, onConsultationCompleted } from "@/lib/referral-events"
import { logAudit } from "@/lib/security/audit-logger"

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
 * 딜 브릿지 거래 완료 시 수수료 처리
 */
export async function onDealSettlement(params: {
  dealId: string
  buyerId: string
  sellerId: string
  agreedPrice: number
  buyerTenantId?: string
  sellerTenantId?: string
}) {
  const { dealId, buyerId, sellerId, agreedPrice, buyerTenantId, sellerTenantId } = params
  const supabase = createClient()

  // 매수자 수수료
  const buyerFee = await calculateFee({
    feeType: "deal_buyer_commission",
    baseAmount: agreedPrice,
    tenantId: buyerTenantId,
  })

  // 매도자 수수료
  const sellerFee = await calculateFee({
    feeType: "deal_seller_commission",
    baseAmount: agreedPrice,
    tenantId: sellerTenantId,
  })

  // 청구서 생성
  if (buyerFee.fee > 0) {
    await supabase.from("invoices").insert({
      user_id: buyerId,
      tenant_id: buyerTenantId,
      invoice_type: "DEAL_COMMISSION",
      amount: buyerFee.fee,
      tax_amount: Math.round(buyerFee.fee * 0.1), // 부가세 10%
      total_amount: Math.round(buyerFee.fee * 1.1),
      description: `딜 브릿지 거래 수수료 (매수) - ${(agreedPrice / 100000000).toFixed(1)}억원 × ${buyerFee.rate}%`,
      metadata: { deal_id: dealId, agreed_price: agreedPrice, rate: buyerFee.rate },
    })
  }

  if (sellerFee.fee > 0) {
    await supabase.from("invoices").insert({
      user_id: sellerId,
      tenant_id: sellerTenantId,
      invoice_type: "DEAL_COMMISSION",
      amount: sellerFee.fee,
      tax_amount: Math.round(sellerFee.fee * 0.1),
      total_amount: Math.round(sellerFee.fee * 1.1),
      description: `딜 브릿지 거래 수수료 (매도) - ${(agreedPrice / 100000000).toFixed(1)}억원 × ${sellerFee.rate}%`,
      metadata: { deal_id: dealId, agreed_price: agreedPrice, rate: sellerFee.rate },
    })
  }

  // 추천 수익 연동 (매수자/매도자 각각)
  const totalPlatformFee = buyerFee.fee + sellerFee.fee
  await onDealCompleted(buyerId, totalPlatformFee)
  await onDealCompleted(sellerId, totalPlatformFee)

  // 감사 로그
  await logAudit({
    user_id: buyerId,
    action: "DEAL_COMPLETE",
    resource_type: "deal",
    resource_id: dealId,
    details: { agreed_price: agreedPrice, buyer_fee: buyerFee.fee, seller_fee: sellerFee.fee },
  })
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
