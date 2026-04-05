import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server";

// ─── Mock Data (fallback) ─────────────────────────────────────
let MOCK_ROLES = ["BUYER", "PARTNER"];

// ─── GET /api/v1/roles ────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    // Try to get roles from Supabase user metadata
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userRole = user.user_metadata?.role;
        const roles = userRole ? [userRole] : MOCK_ROLES;
        return NextResponse.json({ data: roles, _source: 'supabase' });
      }
    } catch {
      // Fall through to mock
    }
    return NextResponse.json({ data: MOCK_ROLES, _mock: true });
  } catch (err) {
    logger.error("[roles] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "역할 조회 실패" } },
      { status: 500 }
    );
  }
}

// ─── POST /api/v1/roles — Add role ────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role } = body;

    const validRoles = [
      "BUYER",
      "SELLER",
      "PARTNER",
      "INVESTOR",
      "PROFESSIONAL",
      "INSTITUTION",
      "LENDER",
      "ADMIN",
    ];

    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: { code: "INVALID_ROLE", message: `유효하지 않은 역할입니다. 가능한 역할: ${validRoles.join(", ")}` } },
        { status: 400 }
      );
    }

    // Try to update Supabase user metadata
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: { role },
        });
        if (!error) {
          return NextResponse.json(
            {
              data: { roles: [role], addedRole: role },
              success: true,
              _source: 'supabase',
            },
            { status: 201 }
          );
        }
      }
    } catch {
      // Fall through to mock
    }

    if (MOCK_ROLES.includes(role)) {
      return NextResponse.json(
        { error: { code: "DUPLICATE_ROLE", message: "이미 보유한 역할입니다." } },
        { status: 409 }
      );
    }

    // Mock: add to list
    MOCK_ROLES = [...MOCK_ROLES, role];

    return NextResponse.json(
      {
        data: { roles: MOCK_ROLES, addedRole: role },
        success: true,
        _mock: true,
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error("[roles] POST Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "역할 추가 실패" } },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/v1/roles — Remove role ───────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: { code: "MISSING_ROLE", message: "삭제할 역할을 지정해주세요." } },
        { status: 400 }
      );
    }

    if (!MOCK_ROLES.includes(role)) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "보유하지 않은 역할입니다." } },
        { status: 404 }
      );
    }

    MOCK_ROLES = MOCK_ROLES.filter((r) => r !== role);

    return NextResponse.json({
      data: { roles: MOCK_ROLES, removedRole: role },
      success: true,
      _mock: true,
    });
  } catch (err) {
    logger.error("[roles] DELETE Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "역할 삭제 실패" } },
      { status: 500 }
    );
  }
}
