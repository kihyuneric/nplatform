import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'

// ─── GET /api/v1/partner/register — Check registration status ─
export async function GET(_req: NextRequest) {
  try {
    return NextResponse.json({
      data: {
        registered: true,
        status: "APPROVED",
        partnerId: "P-ABC123",
        partnerType: "AMC",
        companyName: "한국자산관리",
        registeredAt: "2026-01-15T09:00:00Z",
      },
      _mock: true,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "등록 상태 조회 실패" } },
      { status: 500 }
    );
  }
}

// ─── POST /api/v1/partner/register ────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Required field validation
    const required: { key: string; label: string }[] = [
      { key: "partnerType", label: "파트너 유형" },
      { key: "companyName", label: "회사명" },
      { key: "ceoName", label: "대표자" },
      { key: "bizNumber", label: "사업자번호" },
      { key: "phone", label: "연락처" },
    ];

    for (const field of required) {
      if (!body[field.key]) {
        return Errors.badRequest('${field.label}은(는) 필수 입력 항목입니다.');
      }
    }

    if (!["AMC", "LENDER", "REALTOR"].includes(body.partnerType)) {
      return Errors.badRequest('유효하지 않은 파트너 유형입니다.');
    }

    if (
      !body.collateralTypes ||
      !Array.isArray(body.collateralTypes) ||
      body.collateralTypes.length === 0
    ) {
      return Errors.badRequest('담보 유형을 하나 이상 선택해주세요.');
    }

    if (
      !body.regions ||
      !Array.isArray(body.regions) ||
      body.regions.length === 0
    ) {
      return Errors.badRequest('활동 지역을 하나 이상 선택해주세요.');
    }

    if (!body.agreeTerms || !body.agreePrivacy) {
      return Errors.badRequest('필수 약관에 동의해주세요.');
    }

    // TODO: Replace with actual DB insert (e.g., Supabase / pg)
    // For now, mock a successful registration
    const partnerId = `P-${Date.now().toString(36).toUpperCase()}`;

    const created = {
      id: partnerId,
      partnerType: body.partnerType,
      companyName: body.companyName,
      ceoName: body.ceoName,
      bizNumber: body.bizNumber,
      phone: body.phone,
      email: body.email || null,
      address: body.address || null,
      collateralTypes: body.collateralTypes,
      regions: body.regions,
      expertise: body.expertise || null,
      status: "PENDING_REVIEW",
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    logger.error("[partner/register] Error:", { error: err });
    return Errors.internal('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }
}
