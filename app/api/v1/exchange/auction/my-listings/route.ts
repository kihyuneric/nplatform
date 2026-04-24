import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/v1/exchange/auction/my-listings
 *
 * 로그인한 매도자가 본인이 등록한 NPL 채권 리스트를 조회.
 * NPL 분석 폼의 BondSelector 드롭다운에서 소비.
 *
 * UIF-2026Q2-v1 기획서 S2.
 */
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 },
      )
    }

    const { data, error } = await supabase
      .from("npl_listings")
      .select(
        "id, title, address, sido, sigungu, collateral_type, loan_principal, unpaid_interest, claim_amount, appraised_value, ai_estimated_price, status, special_conditions, claim_breakdown, rights_summary, lease_summary, debtor_owner_same, desired_sale_discount, appraisal_date, auction_date, market_price_note, created_at",
      )
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)

    if (error) {
      console.error("[my-listings] supabase error:", error)
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: data ?? [] }, { status: 200 })
  } catch (err) {
    console.error("[my-listings] unexpected error:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "서버 오류" } },
      { status: 500 },
    )
  }
}
