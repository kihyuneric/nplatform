import { createClient } from "@/lib/supabase/client"
import type { UserRole } from "@/lib/roles"

// ─── Types ─────────────────────────────────────────────

export interface ReferralCode {
  id: string
  owner_id: string
  owner_type: "PARTNER" | "PROFESSIONAL" | "INSTITUTION" | "VIP"
  code: string
  tenant_id: string | null
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED"
  max_uses: number | null
  use_count: number
}

export interface Referral {
  id: string
  referrer_id: string
  referred_id: string
  status: "SIGNED_UP" | "CONVERTED" | "ACTIVE" | "CHURNED"
  signed_up_at: string
  converted_at: string | null
}

export interface ReferralEarning {
  id: string
  event_type: "SIGNUP_BONUS" | "SUBSCRIPTION_SHARE" | "DEAL_COMMISSION" | "CONSULTATION_SHARE"
  amount: number
  source_amount: number | null
  share_rate: number | null
  status: "PENDING" | "APPROVED" | "SETTLED" | "CANCELLED"
  created_at: string
}

// ─── 추천코드 생성 ────────────────────────────────────

function generateCode(ownerType: string, name: string): string {
  const prefix = ownerType === "PARTNER" ? "NP"
    : ownerType === "PROFESSIONAL" ? "EX"
    : ownerType === "INSTITUTION" ? "IN"
    : "VIP"

  const namePart = name.replace(/[^A-Za-z가-힣]/g, "").slice(0, 4).toUpperCase() || "USER"
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()

  return `${prefix}-${namePart}-${random}`
}

export async function createReferralCode(params: {
  ownerId: string
  ownerType: ReferralCode["owner_type"]
  ownerName: string
  tenantId?: string
}): Promise<ReferralCode | null> {
  const { ownerId, ownerType, ownerName, tenantId } = params
  const supabase = createClient()

  // 기존 코드 확인
  const { data: existing } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("status", "ACTIVE")
    .single()

  if (existing) return existing as ReferralCode

  // 신규 생성 (중복 방지 루프)
  let code = generateCode(ownerType, ownerName)
  let attempts = 0
  while (attempts < 5) {
    const { data, error } = await supabase
      .from("referral_codes")
      .insert({
        owner_id: ownerId,
        owner_type: ownerType,
        code,
        tenant_id: tenantId || null,
      })
      .select()
      .single()

    if (!error && data) return data as ReferralCode

    // 중복 시 재생성
    code = generateCode(ownerType, ownerName)
    attempts++
  }

  return null
}

// ─── 추천코드 검증 ────────────────────────────────────

export async function validateReferralCode(code: string): Promise<{
  valid: boolean
  referralCode?: ReferralCode
  error?: string
}> {
  if (!code || code.trim().length < 5) {
    return { valid: false, error: "유효하지 않은 추천코드입니다." }
  }

  const supabase = createClient()
  const { data } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .eq("status", "ACTIVE")
    .single()

  if (!data) return { valid: false, error: "존재하지 않거나 비활성화된 추천코드입니다." }

  const rc = data as ReferralCode
  if (rc.max_uses && rc.use_count >= rc.max_uses) {
    return { valid: false, error: "사용 횟수가 초과된 추천코드입니다." }
  }

  return { valid: true, referralCode: rc }
}

// ─── 추천 관계 기록 ───────────────────────────────────

export async function recordReferral(params: {
  referralCodeId: string
  referrerId: string
  referredId: string
}): Promise<boolean> {
  const supabase = createClient()

  const { error } = await supabase.from("referrals").insert({
    referral_code_id: params.referralCodeId,
    referrer_id: params.referrerId,
    referred_id: params.referredId,
  })

  if (error) return false

  // 추천코드 사용 횟수 증가
  await Promise.resolve(supabase.rpc("increment_referral_use_count", { code_id: params.referralCodeId }))
    .then(() => {}) // RPC 없으면 수동 업데이트
    .catch(async () => {
      const { data } = await supabase
        .from("referral_codes")
        .select("use_count")
        .eq("id", params.referralCodeId)
        .single()
      if (data) {
        await supabase
          .from("referral_codes")
          .update({ use_count: (data.use_count || 0) + 1 })
          .eq("id", params.referralCodeId)
      }
    })

  return true
}

// ─── 내 추천 현황 조회 ────────────────────────────────

export async function getMyReferrals(referrerId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("referrals")
    .select("*")
    .eq("referrer_id", referrerId)
    .order("signed_up_at", { ascending: false })

  return data || []
}

export async function getMyEarnings(referrerId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("referral_earnings")
    .select("*")
    .eq("referrer_id", referrerId)
    .order("created_at", { ascending: false })

  return data || []
}

export async function getMyReferralCode(ownerId: string): Promise<ReferralCode | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("status", "ACTIVE")
    .single()

  return data as ReferralCode | null
}
