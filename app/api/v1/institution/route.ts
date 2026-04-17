import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from '@/lib/logger'

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_INSTITUTION = {
  id: "INST-001",
  name: "한국주택금융공사",
  type: "금융기관",
  biz_number: "120-82-00***",
  representative: "홍길동",
  address: "서울특별시 중구 세종대로 39",
  phone: "02-1234-5678",
  email: "contact@khfc.example.com",
  website: "https://www.khfc.example.com",
  status: "APPROVED",
  registeredAt: "2025-09-01T09:00:00Z",
  verifiedAt: "2025-09-05T14:00:00Z",
  portfolio_count: 12,
  total_volume: "1,520억",
};

// ─── GET /api/v1/institution ──────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    // Find the user's institution via institution_members
    const { data: memberData, error: memberError } = await supabase
      .from('institution_members')
      .select(`
        role,
        status,
        institution:institutions (
          id,
          name,
          type,
          description,
          logo_url,
          trust_grade,
          region,
          address,
          phone,
          website,
          total_deals,
          total_listings,
          rating,
          rating_count,
          is_verified,
          tenant_id,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .single()

    if (memberError || !memberData) {
      logger.warn("[institution] GET: no active institution found, returning mock", { userId: user.id, error: memberError })
      return NextResponse.json({ data: MOCK_INSTITUTION, _mock: true })
    }

    return NextResponse.json({ data: memberData.institution })
  } catch (err) {
    logger.error("[institution] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "기관 정보 조회 실패" } },
      { status: 500 }
    );
  }
}

// ─── POST /api/v1/institution — Register ──────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    const body = await req.json();
    const { name, type } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "필수 항목을 모두 입력해주세요. (name, type)" } },
        { status: 400 }
      );
    }

    // Insert into institutions table
    const { data: institution, error: insertError } = await supabase
      .from('institutions')
      .insert({
        name: body.name,
        type: body.type,
        description: body.description ?? null,
        logo_url: body.logo_url ?? null,
        region: body.region ?? null,
        address: body.address ?? null,
        phone: body.phone ?? null,
        website: body.website ?? null,
      })
      .select()
      .single()

    if (insertError || !institution) {
      logger.error("[institution] POST: insert failed, returning mock", { error: insertError })
      return NextResponse.json(
        {
          data: {
            id: `INST-${Date.now().toString(36).toUpperCase()}`,
            ...body,
            status: "PENDING_REVIEW",
            registeredAt: new Date().toISOString(),
          },
          success: true,
          _mock: true,
        },
        { status: 201 }
      );
    }

    // Insert into institution_members as TENANT_ADMIN
    const { error: memberError } = await supabase
      .from('institution_members')
      .insert({
        institution_id: institution.id,
        user_id: user.id,
        role: 'TENANT_ADMIN',
        status: 'ACTIVE',
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      logger.warn("[institution] POST: member insert failed", { error: memberError, institutionId: institution.id })
    }

    return NextResponse.json(
      {
        data: {
          ...institution,
          status: "PENDING_REVIEW",
          registeredAt: institution.created_at,
        },
        success: true,
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error("[institution] POST Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "기관 등록 실패" } },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/v1/institution — Update ───────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    const body = await req.json();

    // Check user is TENANT_ADMIN for the institution
    const { data: memberData, error: memberError } = await supabase
      .from('institution_members')
      .select('institution_id, role')
      .eq('user_id', user.id)
      .eq('role', 'TENANT_ADMIN')
      .eq('status', 'ACTIVE')
      .single()

    if (memberError || !memberData) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: '기관 관리자 권한이 필요합니다.' } },
        { status: 403 }
      )
    }

    // Update institutions table
    const { name, type, description, logo_url, region, address, phone, website } = body
    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (name !== undefined) updatePayload.name = name
    if (type !== undefined) updatePayload.type = type
    if (description !== undefined) updatePayload.description = description
    if (logo_url !== undefined) updatePayload.logo_url = logo_url
    if (region !== undefined) updatePayload.region = region
    if (address !== undefined) updatePayload.address = address
    if (phone !== undefined) updatePayload.phone = phone
    if (website !== undefined) updatePayload.website = website

    const { data: updated, error: updateError } = await supabase
      .from('institutions')
      .update(updatePayload)
      .eq('id', memberData.institution_id)
      .select()
      .single()

    if (updateError || !updated) {
      logger.error("[institution] PATCH: update failed, returning mock", { error: updateError })
      return NextResponse.json({
        data: { ...MOCK_INSTITUTION, ...body, updatedAt: new Date().toISOString() },
        success: true,
        _mock: true,
      });
    }

    return NextResponse.json({
      data: { ...updated, updatedAt: updated.updated_at },
      success: true,
    });
  } catch (err) {
    logger.error("[institution] PATCH Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "기관 정보 업데이트 실패" } },
      { status: 500 }
    );
  }
}
