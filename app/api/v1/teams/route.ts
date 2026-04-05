import { NextRequest, NextResponse } from "next/server"

// ─── Mock Data ────────────────────────────────────────────

const MOCK_TEAMS = [
  {
    id: "team-1",
    name: "강남 NPL 투자조합",
    description: "강남권 상업용 부동산 NPL 전문 투자팀",
    memberCount: 4,
    maxMembers: 10,
    totalCommitted: 8500000000,
    avgReturn: 12.4,
    investmentFocus: ["상가", "오피스"],
    minContribution: 500000000,
    activeInvestments: 3,
    isPublic: true,
    status: "ACTIVE",
    createdAt: "2025-08-01T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
]

// GET /api/v1/teams - List teams
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // "my" | "public"
    const search = searchParams.get("search") || ""
    const focus = searchParams.get("focus") || "ALL"

    let teams = MOCK_TEAMS

    if (search) {
      teams = teams.filter(
        (t) =>
          t.name.toLowerCase().includes(search.toLowerCase()) ||
          t.description.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (focus !== "ALL") {
      teams = teams.filter((t) => t.investmentFocus.includes(focus))
    }

    return NextResponse.json({ data: teams, total: teams.length })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "팀 목록 조회 실패" } },
      { status: 500 }
    )
  }
}

// POST /api/v1/teams - Create team
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { basicInfo, invites, rules } = body

    if (!basicInfo?.name) {
      return NextResponse.json(
        { error: { code: "MISSING_NAME", message: "팀 이름을 입력해주세요." } },
        { status: 400 }
      )
    }

    const newTeam = {
      id: `team-${Date.now()}`,
      name: basicInfo.name,
      description: basicInfo.description,
      maxMembers: basicInfo.maxMembers,
      minContribution: basicInfo.minContribution,
      isPublic: basicInfo.isPublic,
      investmentFocus: basicInfo.investmentFocus,
      memberCount: 1,
      totalCommitted: 0,
      avgReturn: 0,
      activeInvestments: 0,
      status: "ACTIVE",
      rules: {
        voteMethod: rules?.voteMethod || "MAJORITY",
        profitDistribution: rules?.profitDistribution || "PROPORTIONAL",
        minVoteParticipation: rules?.minVoteParticipation || 70,
        exitNoticeDays: rules?.exitNoticeDays || 30,
        reinvestRatio: rules?.reinvestRatio || 0,
        allowTransfer: rules?.allowTransfer || false,
      },
      invitedMembers: invites || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    return NextResponse.json(newTeam, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "팀 생성 실패" } },
      { status: 500 }
    )
  }
}

// PATCH /api/v1/teams - Update team (add/remove member, update rules)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, action, payload } = body

    if (!teamId) {
      return NextResponse.json(
        { error: { code: "MISSING_TEAM_ID", message: "팀 ID가 필요합니다." } },
        { status: 400 }
      )
    }

    switch (action) {
      case "ADD_MEMBER":
        return NextResponse.json({
          teamId,
          action: "ADD_MEMBER",
          member: {
            id: `m-${Date.now()}`,
            email: payload.email,
            role: payload.role || "MEMBER",
            joinedAt: new Date().toISOString(),
          },
        })

      case "REMOVE_MEMBER":
        return NextResponse.json({
          teamId,
          action: "REMOVE_MEMBER",
          removedMemberId: payload.memberId,
        })

      case "UPDATE_RULES":
        return NextResponse.json({
          teamId,
          action: "UPDATE_RULES",
          rules: payload.rules,
          updatedAt: new Date().toISOString(),
        })

      default:
        return NextResponse.json(
          { error: { code: "INVALID_ACTION", message: "유효하지 않은 액션입니다." } },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "팀 수정 실패" } },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/teams - Delete team
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")

    if (!teamId) {
      return NextResponse.json(
        { error: { code: "MISSING_ID", message: "팀 ID가 필요합니다." } },
        { status: 400 }
      )
    }

    return NextResponse.json({ deleted: true, teamId })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "팀 삭제 실패" } },
      { status: 500 }
    )
  }
}
