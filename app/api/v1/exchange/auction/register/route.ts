import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/v1/exchange/auction/register
 *
 * 매물 등록 폼(auction/new)에서 제출 — npl_listings 에 저장.
 *
 * 컬럼 매핑:
 *   loan_principal      → loan_principal      (대출원금)
 *   unpaid_interest     → unpaid_interest      (미수이자)
 *   claim_balance       → claim_amount         (채권잔액 = 원금 + 미수이자)
 *   appraisal_value     → appraised_value
 *   asking_price        → proposed_sale_price
 *   collateral_amount   → setup_amount
 *   minimum_bid         → min_bid_price
 *   bidding_start       → bid_start_date
 *   bidding_end         → bid_end_date
 *   current_market_value → ai_estimated_price
 *   auction_start_date  → auction_date
 *   remarks             → description
 *   special_conditions  → special_conditions  (JSONB — 25항목)
 *   claim_breakdown     → claim_breakdown     (JSONB — 채권 상세)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    // 인증 확인
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } }, { status: 401 })
    }

    const body = await req.json() as Record<string, unknown>

    // 필수값 검증
    const loanPrincipal = Number(body.loan_principal) || 0
    if (loanPrincipal < 1_000_000) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "대출원금은 100만원 이상이어야 합니다." } },
        { status: 400 },
      )
    }

    const unpaidInterest = Number(body.unpaid_interest) || 0
    const claimBalance   = Number(body.claim_balance)   || (loanPrincipal + unpaidInterest)
    const appraisalValue = Number(body.appraisal_value) || 0

    // 제목 자동 생성 (미입력 시)
    const title: string =
      (body.name as string)?.trim() ||
      `${body.collateral_type ?? "NPL"} · ${(body.address as string)?.slice(0, 20) ?? "주소 미기재"}`

    // collateral_type ENUM 안전처리
    const VALID_TYPES = [
      "아파트", "오피스텔", "다세대(빌라)", "다세대", "연립", "단독주택", "다가구",
      "상가", "사무실", "공장", "창고", "토지", "대지", "전", "답", "임야", "잡종지", "기타",
    ]
    const collateralType = VALID_TYPES.includes(String(body.collateral_type))
      ? String(body.collateral_type)
      : "기타"

    // disclosure_level ENUM 안전처리
    const VALID_DISC = ["PUBLIC", "RESTRICTED", "CONFIDENTIAL", "TEASER", "NDA_REQUIRED", "FULL"]
    const disclosureLevel = VALID_DISC.includes(String(body.disclosure_level))
      ? String(body.disclosure_level)
      : "PUBLIC"

    const payload: Record<string, unknown> = {
      seller_id:            user.id,
      title,
      collateral_type:      collateralType,
      address:              (body.address as string)?.trim() || null,
      sido:                 (body.sido as string)?.trim() || null,
      sigungu:              (body.sigungu as string)?.trim() || null,
      exclusive_area:       body.area ? Number(body.area) : null,
      // ── 채권 핵심 3필드 (단일 진원지) ────────────────────────
      loan_principal:       loanPrincipal,
      unpaid_interest:      unpaidInterest,
      claim_amount:         claimBalance,          // 채권잔액 = 원금 + 미수이자
      // ──────────────────────────────────────────────────────────
      appraised_value:      appraisalValue || null,
      proposed_sale_price:  body.asking_price ? Number(body.asking_price) : null,
      setup_amount:         body.collateral_amount ? Number(body.collateral_amount) : null,
      ltv_ratio:            body.ltv ? Number(body.ltv) : null,
      discount_rate:        body.discount_rate ? Number(body.discount_rate) : null,
      bid_start_date:       body.bidding_start || null,
      bid_end_date:         body.bidding_end   || null,
      min_bid_price:        body.minimum_bid ? Number(body.minimum_bid) : null,
      disclosure_level:     disclosureLevel,
      bidding_method:       (body.bidding_method as string) || null,
      description:          (body.remarks as string)?.trim() || null,
      // ── NPL 상세 ──────────────────────────────────────────────
      appraisal_date:       body.appraisal_date   || null,
      ai_estimated_price:   body.current_market_value ? Number(body.current_market_value) : null,
      market_price_note:    (body.market_price_note as string)?.trim() || null,
      auction_date:         body.auction_start_date || null,
      debtor_owner_same:    body.debtor_owner_same ?? true,
      desired_sale_discount: body.desired_sale_discount ? Number(body.desired_sale_discount) : 0,
      // ── JSON 블록 ─────────────────────────────────────────────
      special_conditions:   body.special_conditions  ?? {},
      claim_breakdown:      body.claim_breakdown     ?? null,
      // ── 상태 ──────────────────────────────────────────────────
      listing_type:         "NPL",
      status:               "PENDING_REVIEW",
    }

    const { data, error } = await supabase
      .from("npl_listings")
      .insert(payload)
      .select("id, title, loan_principal, unpaid_interest, claim_amount")
      .single()

    if (error) {
      console.error("[register] supabase insert error:", error)
      return NextResponse.json(
        { error: { code: "DB_ERROR", message: error.message } },
        { status: 500 },
      )
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error("[register] unexpected error:", err)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "서버 오류가 발생했습니다." } },
      { status: 500 },
    )
  }
}
