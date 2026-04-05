import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'

// ─── Mock Data ────────────────────────────────────────────────
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
    return NextResponse.json({ data: MOCK_SELLER, _mock: true });
  } catch (err) {
    logger.error("[seller] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "매도인 정보 조회 실패" } },
      { status: 500 }
    );
  }
}

// ─── POST /api/v1/seller — Register ───────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, type } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "이름과 연락처는 필수입니다." } },
        { status: 400 }
      );
    }

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
    );
  } catch (err) {
    logger.error("[seller] POST Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "매도인 등록 실패" } },
      { status: 500 }
    );
  }
}
