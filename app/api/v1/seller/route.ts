import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// ─── Mock Fallback Data ───────────────────────────────────────
const MOCK_SELLER = {
  id: "SELLER-001",
  name: "박매도",
  email: "seller@example.com",
  phone: "010-9876-5432",
  type: "개인",
  status: "APPROVED",
  properties: [
    { id: "PROP-001", title: "서울 강남구 아파트", type: "아파트", status: "매도중" },
    { id: "PROP-002", title: "경기 성남 오피스텔", type: "오피스텔", status: "계약완료" },
  ],
  registeredAt: "2025-11-01T09:00:00Z",
  totalSales: 2,
  activeSales: 1,
};

// ─── GET /api/v1/seller ───────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    // Query user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      logger.error("[seller] GET profile error, falling back to mock:", { error: profileError })
      return NextResponse.json({ data: MOCK_SELLER, _mock: true })
    }

    // Query seller's listings
    const { data: listings, error: listingsError } = await supabase
      .from('npl_listings')
      .select('id, title, collateral_type, status, created_at')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })

    if (listingsError) {
      logger.error("[seller] GET listings error:", { error: listingsError })
    }

    const activeSales = (listings ?? []).filter((l) => l.status === 'ACTIVE').length

    return NextResponse.json({
      data: {
        id: profile.id,
        name: profile.name,
        email: user.email,
        phone: profile.phone,
        type: profile.type || '개인',
        status: profile.status || 'APPROVED',
        properties: (listings ?? []).map((l) => ({
          id: l.id,
          title: l.title,
          type: l.collateral_type,
          status: l.status,
        })),
        registeredAt: profile.created_at,
        totalSales: (listings ?? []).length,
        activeSales,
      },
    })
  } catch (err) {
    logger.error("[seller] GET Error:", { error: err });
    return NextResponse.json({ data: MOCK_SELLER, _mock: true })
  }
}

// ─── POST /api/v1/seller — Register ───────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { name, phone, type } = body

    if (!name || !phone) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "이름과 연락처는 필수입니다." } },
        { status: 400 }
      )
    }

    const { data, error: upsertError } = await supabase
      .from('users')
      .upsert(
        {
          id: user.id,
          name,
          phone,
          type: type || '개인',
          role: 'SELLER',
          status: 'PENDING_REVIEW',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single()

    if (upsertError) {
      logger.error("[seller] POST upsert error, returning mock success:", { error: upsertError })
      return NextResponse.json(
        {
          data: {
            id: `SELLER-${Date.now().toString(36).toUpperCase()}`,
            name,
            phone,
            type: type || "개인",
            status: "PENDING_REVIEW",
            registeredAt: new Date().toISOString(),
          },
          success: true,
          _mock: true,
        },
        { status: 201 }
      )
    }

    return NextResponse.json(
      {
        data: {
          id: data.id,
          name: data.name,
          phone: data.phone,
          type: data.type || type || '개인',
          status: data.status || 'PENDING_REVIEW',
          registeredAt: data.created_at || new Date().toISOString(),
        },
        success: true,
      },
      { status: 201 }
    )
  } catch (err) {
    logger.error("[seller] POST Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "매도인 등록 실패" } },
      { status: 500 }
    )
  }
}
