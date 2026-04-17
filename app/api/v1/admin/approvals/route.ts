import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { query, update } from "@/lib/data-layer"
import { requireAdmin } from "@/lib/auth-guard"
import { createClient } from "@/lib/supabase/server"
import { sendEmail, getUserEmail } from "@/lib/email/email-service"
import { kycStatusEmail } from "@/lib/email/templates"

// ─── GET /api/v1/admin/approvals ──────────────────────────────
export async function GET(req: NextRequest) {
  // DB 기반 관리자 권한 확인
  const auth = await requireAdmin()
  if (!auth.ok) return auth.error

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const role = searchParams.get("role")

    const filters: Record<string, string> = {}
    if (status) filters.status = status
    if (role) filters.role = role

    const { data, total, _source } = await query("approvals", {
      filters,
      orderBy: "created_at",
      order: "desc",
    })

    return NextResponse.json({ data, total, _source })
  } catch (err) {
    logger.error("[admin/approvals] GET Error:", { error: err })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "승인 목록 조회 실패" } },
      { status: 500 }
    )
  }
}

// ─── POST /api/v1/admin/approvals — Approve/Reject ────────────
export async function POST(req: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.error

  try {
    const body = await req.json()
    const { user_id, action, reason } = body

    if (!user_id) {
      return NextResponse.json(
        { error: { code: "MISSING_USER_ID", message: "사용자 ID가 필요합니다." } },
        { status: 400 }
      )
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: { code: "INVALID_ACTION", message: "유효한 액션(approve/reject)을 지정해주세요." } },
        { status: 400 }
      )
    }

    if (action === "reject" && !reason) {
      return NextResponse.json(
        { error: { code: "MISSING_REASON", message: "반려 사유를 입력해주세요." } },
        { status: 400 }
      )
    }

    // Find the approval by user_id
    const { data: approvals } = await query("approvals", {
      filters: { user_id },
      limit: 1,
    })

    const approval = approvals[0]
    const newStatus = action === "approve" ? "APPROVED" : "REJECTED"

    if (approval) {
      await update("approvals", approval.id as string, {
        status: newStatus,
        reason: action === "reject" ? reason : undefined,
        updated_at: new Date().toISOString(),
      })
    }

    // Send KYC result email (best-effort)
    try {
      const supabase = await createClient()
      const { email, name } = await getUserEmail(supabase, user_id)
      if (email) {
        await sendEmail({
          to: email,
          ...kycStatusEmail({
            name,
            status: action === 'approve' ? 'APPROVED' : 'REJECTED',
            reason: action === 'reject' ? reason : undefined,
            tier: action === 'approve' ? 'L1' : undefined,
          }),
          tags: [{ name: 'type', value: 'kyc_result' }],
        })
      }
    } catch (emailErr) {
      logger.warn('[admin/approvals] KYC email failed:', { error: emailErr })
    }

    return NextResponse.json({
      data: {
        user_id,
        status: newStatus,
        reason: action === "reject" ? reason : undefined,
        reviewedAt: new Date().toISOString(),
        previousStatus: approval?.status || "PENDING",
      },
      success: true,
      message: action === "approve" ? "승인 처리되었습니다." : "반려 처리되었습니다.",
    })
  } catch (err) {
    logger.error("[admin/approvals] POST Error:", { error: err })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "승인 처리 실패" } },
      { status: 500 }
    )
  }
}
