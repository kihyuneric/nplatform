import { NextRequest, NextResponse } from "next/server"

// GET /api/v1/teams/returns - Get team returns overview
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get("teamId")

    if (!teamId) {
      return NextResponse.json(
        { error: { code: "MISSING_TEAM_ID", message: "팀 ID가 필요합니다." } },
        { status: 400 }
      )
    }

    const returns = {
      teamId,
      summary: {
        totalInvested: 8100000000,
        totalReturned: 681400000,
        avgReturnPct: 8.4,
        totalDistributed: 335900000,
      },
      investments: [
        {
          id: "inv-1",
          assetName: "역삼 오피스 NPL",
          collateralType: "오피스",
          investedAmount: 3500000000,
          returnAmount: 433000000,
          returnPct: 12.4,
          status: "ACTIVE",
          startDate: "2025-10-15",
        },
        {
          id: "inv-2",
          assetName: "마포 상가 NPL",
          collateralType: "상가",
          investedAmount: 1800000000,
          returnAmount: 248400000,
          returnPct: 13.8,
          status: "COMPLETED",
          startDate: "2025-06-01",
          endDate: "2026-01-20",
        },
      ],
      distributions: [
        {
          id: "d1",
          date: "2026-01-25",
          totalAmount: 248400000,
          type: "PROFIT",
          investmentName: "마포 상가 NPL",
          status: "COMPLETED",
        },
        {
          id: "d2",
          date: "2026-03-15",
          totalAmount: 87500000,
          type: "DIVIDEND",
          investmentName: "역삼 오피스 NPL",
          status: "COMPLETED",
        },
      ],
      memberShares: [
        { memberId: "m1", memberName: "김대표", sharePercent: 35.3, contribution: 3000000000, returnAmount: 240500000 },
        { memberId: "m2", memberName: "이이사", sharePercent: 29.4, contribution: 2500000000, returnAmount: 200400000 },
        { memberId: "m3", memberName: "박부장", sharePercent: 23.5, contribution: 2000000000, returnAmount: 160200000 },
        { memberId: "m4", memberName: "최차장", sharePercent: 11.8, contribution: 1000000000, returnAmount: 80300000 },
      ],
    }

    return NextResponse.json(returns)
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "수익 현황 조회 실패" } },
      { status: 500 }
    )
  }
}

// POST /api/v1/teams/returns - Create distribution record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teamId, investmentId, totalAmount, type, distributionDate } = body

    if (!teamId || !investmentId || !totalAmount || !type) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "필수 항목을 입력해주세요." } },
        { status: 400 }
      )
    }

    if (!["PROFIT", "PRINCIPAL", "DIVIDEND"].includes(type)) {
      return NextResponse.json(
        { error: { code: "INVALID_TYPE", message: "유효하지 않은 분배 유형입니다." } },
        { status: 400 }
      )
    }

    // Mock member share calculation (proportional)
    const MOCK_SHARES = [
      { memberId: "m1", memberName: "김대표", sharePercent: 35.3 },
      { memberId: "m2", memberName: "이이사", sharePercent: 29.4 },
      { memberId: "m3", memberName: "박부장", sharePercent: 23.5 },
      { memberId: "m4", memberName: "최차장", sharePercent: 11.8 },
    ]

    const distribution = {
      id: `dist-${Date.now()}`,
      teamId,
      investmentId,
      totalAmount,
      type,
      distributionDate: distributionDate || new Date().toISOString().slice(0, 10),
      status: "COMPLETED",
      memberShares: MOCK_SHARES.map((m) => ({
        ...m,
        amount: Math.floor(totalAmount * (m.sharePercent / 100)),
      })),
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json(distribution, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "분배 등록 실패" } },
      { status: 500 }
    )
  }
}
