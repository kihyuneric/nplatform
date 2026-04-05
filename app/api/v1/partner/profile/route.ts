import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'

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
    return NextResponse.json({ data: MOCK_PROFILE, _mock: true });
  } catch (err) {
    logger.error("[partner/profile] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "프로필 조회 실패" } },
      { status: 500 }
    );
  }
}

// ─── PUT /api/v1/partner/profile ──────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const allowedFields = [
      "name",
      "company",
      "image_url",
      "bio",
      "notification_settings",
      "bank_info",
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

    return NextResponse.json({
      data: { ...MOCK_PROFILE, ...updates, updatedAt: new Date().toISOString() },
      success: true,
      _mock: true,
    });
  } catch (err) {
    logger.error("[partner/profile] PUT Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "프로필 업데이트 실패" } },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/v1/partner/profile — Account deactivation ────
export async function DELETE(_req: NextRequest) {
  try {
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
