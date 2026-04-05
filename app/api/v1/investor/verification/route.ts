import { NextRequest, NextResponse } from "next/server"

// GET /api/v1/investor/verification - Get current verification status
export async function GET(request: NextRequest) {
  try {
    // Mock verification status
    const status = {
      userId: "mock-user-id",
      currentTier: "TIER2",
      tiers: {
        TIER1: {
          status: "NOT_STARTED",
          progress: 0,
          submittedAt: null,
          approvedAt: null,
          rejectionReason: null,
        },
        TIER2: {
          status: "APPROVED",
          progress: 100,
          submittedAt: "2026-01-15T09:00:00Z",
          approvedAt: "2026-01-18T14:30:00Z",
          rejectionReason: null,
        },
        TIER3: {
          status: "APPROVED",
          progress: 100,
          submittedAt: "2025-11-01T10:00:00Z",
          approvedAt: "2025-11-04T11:00:00Z",
          rejectionReason: null,
        },
      },
    }

    return NextResponse.json(status)
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "인증 현황 조회 실패" } },
      { status: 500 }
    )
  }
}

// POST /api/v1/investor/verification - Submit verification documents
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tier, documents } = body

    if (!tier || !["TIER1", "TIER2", "TIER3"].includes(tier)) {
      return NextResponse.json(
        { error: { code: "INVALID_TIER", message: "유효하지 않은 등급입니다." } },
        { status: 400 }
      )
    }

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: { code: "MISSING_DOCUMENTS", message: "서류를 업로드해주세요." } },
        { status: 400 }
      )
    }

    // Mock: create verification submission
    const submission = {
      id: `ver-${Date.now()}`,
      tier,
      status: "SUBMITTED",
      documents: documents.map((d: { key: string }) => ({
        key: d.key,
        status: "PENDING_REVIEW",
        submittedAt: new Date().toISOString(),
      })),
      submittedAt: new Date().toISOString(),
      estimatedReviewDays: 3,
    }

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "인증 신청 실패" } },
      { status: 500 }
    )
  }
}

// PATCH /api/v1/investor/verification - Admin: approve/reject
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { submissionId, action, rejectionReason } = body

    if (!["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json(
        { error: { code: "INVALID_ACTION", message: "유효하지 않은 액션입니다." } },
        { status: 400 }
      )
    }

    return NextResponse.json({
      id: submissionId,
      status: action === "APPROVE" ? "APPROVED" : "REJECTED",
      reviewedAt: new Date().toISOString(),
      rejectionReason: action === "REJECT" ? rejectionReason : null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "처리 실패" } },
      { status: 500 }
    )
  }
}
