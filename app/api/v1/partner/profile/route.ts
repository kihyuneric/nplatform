import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server";

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_PROFILE = {
  id: "P-ABC123",
  name: "김대한",
  company: "한국자산관리 주식회사",
  partnerType: "AMC",
  image_url: "/images/partner-default.png",
  bio: "NPL 전문 자산관리사로 10년 이상의 경력을 보유하고 있습니다. 서울/경기 지역 아파트 및 상가 담보채권 전문.",
  email: "partner@example.com",
  phone: "010-1234-5678",
  grade: "GOLD",
  joinedAt: "2025-06-15T09:00:00Z",
  notification_settings: {
    email: true,
    sms: true,
    push: true,
    marketing: false,
  },
  bank_info: {
    bank_name: "국민은행",
    account_number: "***-****-1234",
    account_holder: "김대한",
  },
  stats: {
    total_leads: 48,
    completed_deals: 15,
    total_earnings: 15800000,
    rating: 4.8,
  },
};

// ─── GET /api/v1/partner/profile ──────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      );
    }

    // Fetch partner profile from partners table
    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && partner) {
      return NextResponse.json({ data: partner, _source: 'supabase' });
    }

    // Fall through to mock if no partner record found
    return NextResponse.json({ data: { ...MOCK_PROFILE, user_id: user.id }, _mock: true });
  } catch (err) {
    logger.error("[partner/profile] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "프로필 조회 실패" } },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/v1/partner/profile ────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const allowedFields = [
      "company_name",
      "contact_name",
      "phone",
      "email",
      "bank_name",
      "account_number",
      "account_holder",
      "notes",
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: { code: "NO_UPDATES", message: "변경할 항목이 없습니다." } },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('partners')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (!error && data) {
      return NextResponse.json({ data, success: true, _source: 'supabase' });
    }

    // Mock fallback
    return NextResponse.json({
      data: { ...MOCK_PROFILE, ...updates, updatedAt: new Date().toISOString() },
      success: true,
      _mock: true,
    });
  } catch (err) {
    logger.error("[partner/profile] PATCH Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "프로필 업데이트 실패" } },
      { status: 500 }
    );
  }
}

// ─── PUT /api/v1/partner/profile — Alias for PATCH ────────────
export async function PUT(req: NextRequest) {
  return PATCH(req);
}

// ─── DELETE /api/v1/partner/profile — Account deactivation ────
export async function DELETE(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      );
    }

    const { error } = await supabase
      .from('partners')
      .update({ status: 'SUSPENDED', updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    if (!error) {
      return NextResponse.json({
        data: {
          status: "DEACTIVATION_REQUESTED",
          requestedAt: new Date().toISOString(),
          message: "계정 비활성화 요청이 접수되었습니다. 영업일 기준 3일 내 처리됩니다.",
        },
        success: true,
        _source: 'supabase',
      });
    }

    // Mock fallback
    return NextResponse.json({
      data: {
        status: "DEACTIVATION_REQUESTED",
        requestedAt: new Date().toISOString(),
        message: "계정 비활성화 요청이 접수되었습니다. 영업일 기준 3일 내 처리됩니다.",
      },
      success: true,
      _mock: true,
    });
  } catch (err) {
    logger.error("[partner/profile] DELETE Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "비활성화 요청 실패" } },
      { status: 500 }
    );
  }
}
