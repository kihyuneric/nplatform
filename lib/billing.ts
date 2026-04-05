"use client"

import { createClient } from "@/lib/supabase/client"

// ─── Types ─────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  monthly_price: number
  annual_price: number
  credits_per_month: number // -1 = 무제한
  features: string[]
  max_listings: number | null
  max_team_members: number | null
  description: string | null
  is_active: boolean
}

export interface CreditProduct {
  id: string
  name: string
  credits: number
  price: number
  bonus_credits: number
}

export interface CreditBalance {
  balance: number
  lifetime_earned: number
  lifetime_spent: number
}

export interface ServiceCreditCost {
  service_key: string
  service_name: string
  credits_required: number
}

// ─── 크레딧 잔액 조회 ─────────────────────────────────

export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  const supabase = createClient()
  const { data } = await supabase
    .from("credit_balances")
    .select("balance, lifetime_earned, lifetime_spent")
    .eq("user_id", userId)
    .single()

  return data || { balance: 0, lifetime_earned: 0, lifetime_spent: 0 }
}

// ─── 서비스별 크레딧 소모량 조회 (관리자 설정값) ──────

export async function getServiceCreditCost(serviceKey: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from("service_credit_costs")
    .select("credits_required")
    .eq("service_key", serviceKey)
    .eq("is_active", true)
    .single()

  return data?.credits_required ?? 0
}

export async function getAllServiceCosts(): Promise<ServiceCreditCost[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("service_credit_costs")
    .select("service_key, service_name, credits_required")
    .eq("is_active", true)

  return data || []
}

// ─── 크레딧 차감 ──────────────────────────────────────

export async function deductCredits(params: {
  userId: string
  serviceKey: string
  referenceId?: string
  description?: string
}): Promise<{ success: boolean; remaining: number; error?: string }> {
  const { userId, serviceKey, referenceId, description } = params

  const cost = await getServiceCreditCost(serviceKey)
  if (cost <= 0) return { success: true, remaining: 0 }

  const balance = await getCreditBalance(userId)
  if (balance.balance < cost) {
    return { success: false, remaining: balance.balance, error: `크레딧 부족 (필요: ${cost}, 잔액: ${balance.balance})` }
  }

  const supabase = createClient()

  // 트랜잭션: 잔액 차감 + 내역 기록
  const { error: updateError } = await supabase
    .from("credit_balances")
    .update({
      balance: balance.balance - cost,
      lifetime_spent: balance.lifetime_spent + cost,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)

  if (updateError) return { success: false, remaining: balance.balance, error: updateError.message }

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    type: "USAGE",
    amount: -cost,
    service_key: serviceKey,
    reference_id: referenceId,
    description: description || `${serviceKey} 크레딧 사용`,
  })

  return { success: true, remaining: balance.balance - cost }
}

// ─── 크레딧 충전 ──────────────────────────────────────

export async function addCredits(params: {
  userId: string
  amount: number
  type: "PURCHASE" | "SUBSCRIPTION_GRANT" | "BONUS" | "REFUND"
  referenceId?: string
  description?: string
}): Promise<{ success: boolean; balance: number }> {
  const { userId, amount, type, referenceId, description } = params
  const supabase = createClient()

  const current = await getCreditBalance(userId)

  // 잔액이 없으면 새로 생성
  if (current.balance === 0 && current.lifetime_earned === 0) {
    await supabase.from("credit_balances").upsert({
      user_id: userId,
      balance: amount,
      lifetime_earned: amount,
      lifetime_spent: 0,
      updated_at: new Date().toISOString(),
    })
  } else {
    await supabase
      .from("credit_balances")
      .update({
        balance: current.balance + amount,
        lifetime_earned: current.lifetime_earned + amount,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
  }

  await supabase.from("credit_transactions").insert({
    user_id: userId,
    type,
    amount,
    reference_id: referenceId,
    description,
  })

  return { success: true, balance: current.balance + amount }
}

// ─── 수수료 계산 ──────────────────────────────────────

export async function calculateFee(params: {
  feeType: string
  baseAmount?: number
  tenantId?: string
}): Promise<{ fee: number; rate: number }> {
  const { feeType, baseAmount = 0, tenantId } = params
  const supabase = createClient()

  const { data } = await supabase
    .from("fee_settings")
    .select("*")
    .eq("fee_type", feeType)
    .eq("is_active", true)
    .single()

  if (!data) return { fee: 0, rate: 0 }

  // 기관별 특별 요율 확인
  let rate = Number(data.value)
  if (tenantId && data.tenant_overrides) {
    const override = (data.tenant_overrides as Record<string, any>)[tenantId]
    if (override?.value !== undefined) rate = Number(override.value)
  }

  let fee: number
  switch (data.value_type) {
    case "PERCENTAGE":
      fee = Math.round(baseAmount * (rate / 100))
      if (data.min_amount && fee < data.min_amount) fee = data.min_amount
      break
    case "FIXED_MONTHLY":
    case "FIXED_ONCE":
      fee = rate
      break
    default:
      fee = 0
  }

  return { fee, rate }
}

// ─── 구독 플랜 조회 ──────────────────────────────────

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")

  return (data || []) as SubscriptionPlan[]
}

export async function getUserSubscription(userId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("subscriptions")
    .select("*, subscription_plans(*)")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .single()

  return data
}
