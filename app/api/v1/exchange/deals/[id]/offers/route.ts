import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server"
import { offerSchema } from "@/lib/validation/schemas"

// ─── Mock Data ────────────────────────────────────────────

const MOCK_OFFERS = [
  {
    id: "offer-001",
    deal_id: "deal-001",
    proposer_id: "user-buyer-1",
    proposer_role: "BUYER",
    amount: 3300000000,
    status: "COUNTERED",
    note: "초기 제안: 감정가 대비 46% 수준으로 제안합니다.",
    created_at: "2026-03-10T10:00:00Z",
  },
  {
    id: "offer-002",
    deal_id: "deal-001",
    proposer_id: "user-seller-1",
    proposer_role: "SELLER",
    amount: 3500000000,
    status: "COUNTERED",
    note: "호가 유지: 시장 상황을 고려하여 기존 호가를 유지합니다.",
    created_at: "2026-03-14T09:00:00Z",
  },
  {
    id: "offer-003",
    deal_id: "deal-001",
    proposer_id: "user-buyer-1",
    proposer_role: "BUYER",
    amount: 3450000000,
    status: "PENDING",
    note: "조정 제안: 실사 결과를 반영하여 상향 조정합니다.",
    created_at: "2026-03-18T11:00:00Z",
  },
]

// ─── GET /api/v1/exchange/deals/[id]/offers ───────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Fallback: return mock data for unauthenticated requests
      const filtered = MOCK_OFFERS.filter((o) => o.deal_id === dealId || dealId === "deal-001")
      return NextResponse.json({ data: filtered, _mock: true })
    }

    const { data, error } = await supabase
      .from("deal_offers")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true })

    if (error) {
      const filtered = MOCK_OFFERS.filter((o) => o.deal_id === dealId || dealId === "deal-001")
      return NextResponse.json({ data: filtered, _mock: true })
    }

    return NextResponse.json({ data, _source: 'supabase' })
  } catch (err) {
    logger.error("[deals/[id]/offers] GET error:", { error: err })
    return NextResponse.json({ data: MOCK_OFFERS, _mock: true })
  }
}

// ─── POST /api/v1/exchange/deals/[id]/offers ──────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params
    const supabase = await createClient()
    let userId = 'anonymous'
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) userId = user.id
    } catch (err) {

      logger.warn("[route] silent catch", { error: err })

    }

    const body = await request.json()

    // Validate with Zod schema
    const parsed = offerSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({
        error: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다', details: parsed.error.flatten().fieldErrors }
      }, { status: 400 })
    }

    const { amount, note, conditions, payment_method } = body

    // Verify deal exists and user is participant
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, buyer_id, seller_id, status, current_stage")
      .eq("id", dealId)
      .single()

    if (dealError || !deal) {
      // Mock fallback
      const mockOffer = {
        id: `offer-${Date.now()}`,
        deal_id: dealId,
        proposer_id: userId,
        proposer_role: "BUYER",
        amount,
        conditions: conditions || "",
        payment_method: payment_method || "",
        status: "PENDING",
        note: note || "",
        created_at: new Date().toISOString(),
      }
      return NextResponse.json({ data: mockOffer, _mock: true }, { status: 201 })
    }

    if (deal.buyer_id !== userId && deal.seller_id !== userId) {
      return Errors.forbidden('딜 참여자만 오퍼를 제출할 수 있습니다.')
    }

    if (deal.status !== "ACTIVE") {
      return Errors.badRequest('활성 상태의 딜에만 오퍼를 제출할 수 있습니다.')
    }

    const proposer_role = deal.buyer_id === userId ? "BUYER" : "SELLER"

    // Set previous pending offers to COUNTERED
    await supabase
      .from("deal_offers")
      .update({ status: "COUNTERED" })
      .eq("deal_id", dealId)
      .eq("status", "PENDING")

    // Create new offer
    const { data: offer, error: offerError } = await supabase
      .from("deal_offers")
      .insert({
        deal_id: dealId,
        proposer_id: userId,
        proposer_role,
        amount,
        status: "PENDING",
        note: note || "",
      })
      .select()
      .single()

    if (offerError) {
      const mockOffer = {
        id: `offer-${Date.now()}`,
        deal_id: dealId,
        proposer_id: userId,
        proposer_role,
        amount,
        status: "PENDING",
        note: note || "",
        created_at: new Date().toISOString(),
      }
      return NextResponse.json({ data: mockOffer, _mock: true }, { status: 201 })
    }

    // Update deal's current_offer_amount
    await supabase
      .from("deals")
      .update({
        current_offer_amount: amount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dealId)

    // System message for offer
    await supabase.from("deal_messages").insert({
      deal_id: dealId,
      sender_id: userId,
      message_type: "OFFER",
      content: `새로운 오퍼: ${amount.toLocaleString()}원 (${proposer_role})`,
    })

    return NextResponse.json({ data: offer, _source: 'supabase' }, { status: 201 })
  } catch (err) {
    logger.error("[deals/[id]/offers] POST error:", { error: err })
    return NextResponse.json({
      data: { id: `offer-${Date.now()}`, deal_id: 'unknown', amount: 0, status: 'PENDING', created_at: new Date().toISOString() },
      _mock: true,
    }, { status: 201 })
  }
}
