import { createClient } from "@/lib/supabase/client"

// ─── 추천 수익 이벤트 트리거 ───────────────────────────
// 결제/거래/상담 완료 시 자동으로 추천인 수익 생성

interface ShareRates {
  subscription_first: number  // 첫 유료전환 (%)
  subscription_monthly: number // 월 구독 (%)
  deal_commission: number     // 거래 수수료 (%)
  consultation: number        // 상담료 (%)
}

const BASE_RATES: ShareRates = {
  subscription_first: 20,
  subscription_monthly: 10,
  deal_commission: 5,
  consultation: 10,
}

const TIER_BONUS: Record<string, number> = {
  BRONZE: 0,
  SILVER: 2,
  GOLD: 5,
  PLATINUM: 8,
}

/**
 * 추천인의 수익 쉐어 비율 조회 (등급 보너스 포함)
 */
async function getShareRate(referrerId: string, rateType: keyof ShareRates): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from("partner_tiers")
    .select("tier, bonus_rate")
    .eq("user_id", referrerId)
    .single()

  const baseRate = BASE_RATES[rateType]
  const bonus = data ? (TIER_BONUS[data.tier] || 0) : 0

  return baseRate + bonus
}

/**
 * 추천인 찾기 (해당 사용자를 추천한 사람)
 */
async function findReferrer(userId: string): Promise<{ referrer_id: string; referral_id: string } | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("referrals")
    .select("id, referrer_id")
    .eq("referred_id", userId)
    .single()

  if (!data) return null
  return { referrer_id: data.referrer_id, referral_id: data.id }
}

/**
 * 유료 전환 시 (첫 구독 결제)
 */
export async function onSubscriptionConverted(userId: string, paymentAmount: number) {
  const ref = await findReferrer(userId)
  if (!ref) return

  const rate = await getShareRate(ref.referrer_id, "subscription_first")
  const earnings = Math.round(paymentAmount * (rate / 100))

  const supabase = createClient()
  await supabase.from("referral_earnings").insert({
    referrer_id: ref.referrer_id,
    referral_id: ref.referral_id,
    event_type: "SUBSCRIPTION_SHARE",
    amount: earnings,
    source_amount: paymentAmount,
    share_rate: rate,
  })

  // 추천 상태를 CONVERTED로 변경
  await supabase
    .from("referrals")
    .update({ status: "CONVERTED", converted_at: new Date().toISOString() })
    .eq("id", ref.referral_id)

  // 파트너 통계 업데이트
  await updatePartnerStats(ref.referrer_id)
}

/**
 * 월간 구독 갱신 시
 */
export async function onSubscriptionRenewed(userId: string, monthlyAmount: number) {
  const ref = await findReferrer(userId)
  if (!ref) return

  const rate = await getShareRate(ref.referrer_id, "subscription_monthly")
  const earnings = Math.round(monthlyAmount * (rate / 100))

  const supabase = createClient()
  await supabase.from("referral_earnings").insert({
    referrer_id: ref.referrer_id,
    referral_id: ref.referral_id,
    event_type: "SUBSCRIPTION_SHARE",
    amount: earnings,
    source_amount: monthlyAmount,
    share_rate: rate,
  })
}

/**
 * 딜 브릿지 거래 완료 시
 */
export async function onDealCompleted(userId: string, platformFee: number) {
  const ref = await findReferrer(userId)
  if (!ref) return

  const rate = await getShareRate(ref.referrer_id, "deal_commission")
  const earnings = Math.round(platformFee * (rate / 100))

  const supabase = createClient()
  await supabase.from("referral_earnings").insert({
    referrer_id: ref.referrer_id,
    referral_id: ref.referral_id,
    event_type: "DEAL_COMMISSION",
    amount: earnings,
    source_amount: platformFee,
    share_rate: rate,
  })

  await updatePartnerStats(ref.referrer_id)
}

/**
 * 전문가 상담 완료 시
 */
export async function onConsultationCompleted(clientId: string, consultationFee: number) {
  const ref = await findReferrer(clientId)
  if (!ref) return

  const rate = await getShareRate(ref.referrer_id, "consultation")
  const earnings = Math.round(consultationFee * (rate / 100))

  const supabase = createClient()
  await supabase.from("referral_earnings").insert({
    referrer_id: ref.referrer_id,
    referral_id: ref.referral_id,
    event_type: "CONSULTATION_SHARE",
    amount: earnings,
    source_amount: consultationFee,
    share_rate: rate,
  })
}

/**
 * 파트너 등급/통계 업데이트
 */
async function updatePartnerStats(partnerId: string) {
  const supabase = createClient()

  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, status")
    .eq("referrer_id", partnerId)

  const { data: earnings } = await supabase
    .from("referral_earnings")
    .select("amount")
    .eq("referrer_id", partnerId)
    .eq("status", "PENDING")

  const totalReferrals = referrals?.length || 0
  const totalConversions = referrals?.filter((r) => r.status === "CONVERTED" || r.status === "ACTIVE").length || 0
  const totalEarnings = earnings?.reduce((sum, e) => sum + e.amount, 0) || 0

  // 등급 결정
  let tier = "BRONZE"
  if (totalReferrals >= 100 && totalConversions >= 20) tier = "PLATINUM"
  else if (totalReferrals >= 50 && totalConversions >= 5) tier = "GOLD"
  else if (totalReferrals >= 10) tier = "SILVER"

  await supabase.from("partner_tiers").upsert({
    user_id: partnerId,
    tier,
    total_referrals: totalReferrals,
    total_conversions: totalConversions,
    total_earnings: totalEarnings,
    bonus_rate: TIER_BONUS[tier] || 0,
    updated_at: new Date().toISOString(),
  })
}
