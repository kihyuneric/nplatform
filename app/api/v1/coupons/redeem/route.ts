import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getAuthUser } from "@/lib/auth/get-user"
import { apiError } from "@/lib/api-error"

/**
 * POST /api/v1/coupons/redeem
 * body: { code: string }
 *
 * 1) 쿠폰 조회: active=true, 만료 전, 사용 횟수 미초과
 * 2) 중복 사용 여부 확인 (coupon_usages 테이블)
 * 3) 쿠폰 타입에 따라 적용:
 *    - PERCENT: 다음 결제 할인 (billing에서 적용)
 *    - FIXED: 다음 결제 할인
 *    - CREDIT: credit_balances에 직접 지급
 * 4) coupon_usages INSERT + coupons.used_count INCREMENT
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return apiError("UNAUTHORIZED", "로그인이 필요합니다.", 401)
    }

    const body = await req.json()
    const { code } = body as { code: string }

    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return apiError("MISSING_FIELDS", "쿠폰 코드를 입력해주세요.", 400)
    }

    const normalizedCode = code.trim().toUpperCase()
    const supabase = await createClient()

    // ── 1) 쿠폰 조회 ────────────────────────────────────────
    const { data: coupon, error: couponErr } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", normalizedCode)
      .eq("active", true)
      .single()

    if (couponErr || !coupon) {
      return apiError("NOT_FOUND", "유효하지 않은 쿠폰 코드입니다.", 404)
    }

    // 만료 확인
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return apiError("COUPON_EXPIRED", "만료된 쿠폰입니다.", 400)
    }

    // 사용 횟수 초과 확인
    if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
      return apiError("COUPON_EXHAUSTED", "사용 횟수가 초과된 쿠폰입니다.", 400)
    }

    // ── 2) 중복 사용 여부 ────────────────────────────────────
    const { data: existingUsage } = await supabase
      .from("coupon_usages")
      .select("id")
      .eq("coupon_id", coupon.id)
      .eq("user_id", user.id)
      .single()

    if (existingUsage) {
      return apiError("ALREADY_USED", "이미 사용한 쿠폰입니다.", 400)
    }

    // ── 3) 쿠폰 적용 ────────────────────────────────────────
    let benefit = ""
    let discountApplied = 0

    if (coupon.discount_type === "CREDIT") {
      // 크레딧 직접 지급
      const creditAmount = Number(coupon.discount_value)
      discountApplied = creditAmount

      const { error: creditErr } = await supabase.rpc("add_credits", {
        p_user_id: user.id,
        p_amount: creditAmount,
        p_description: `쿠폰 ${normalizedCode} 적용`,
        p_source: "COUPON",
      })

      if (creditErr) {
        // RPC 없으면 직접 upsert
        const { error: upsertErr } = await supabase
          .from("credit_balances")
          .upsert(
            {
              user_id: user.id,
              balance: creditAmount,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id",
              ignoreDuplicates: false,
            }
          )
        if (upsertErr) {
          console.error("Credit upsert failed:", upsertErr)
        }
      }

      benefit = `크레딧 ${creditAmount.toLocaleString()}개 지급`
    } else if (coupon.discount_type === "PERCENT") {
      discountApplied = Number(coupon.discount_value)
      benefit = `다음 결제 ${coupon.discount_value}% 할인`
    } else if (coupon.discount_type === "FIXED") {
      discountApplied = Number(coupon.discount_value)
      benefit = `다음 결제 ${Number(coupon.discount_value).toLocaleString("ko-KR")}원 할인`
    }

    // ── 4) 사용 기록 INSERT ──────────────────────────────────
    await supabase.from("coupon_usages").insert({
      coupon_id: coupon.id,
      user_id: user.id,
      discount_applied: discountApplied,
      applied_to: coupon.applicable_to || "ALL",
      used_at: new Date().toISOString(),
    })

    // 사용 횟수 증가
    await supabase
      .from("coupons")
      .update({ used_count: (coupon.used_count || 0) + 1 })
      .eq("id", coupon.id)

    return NextResponse.json({
      success: true,
      code: normalizedCode,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      benefit,
      message: `쿠폰이 적용되었습니다! ${benefit}`,
    })
  } catch (error) {
    console.error("Coupon redeem error:", error)
    return apiError("INTERNAL_ERROR", "쿠폰 적용 중 오류가 발생했습니다.", 500)
  }
}
