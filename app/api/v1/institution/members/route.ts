import { NextRequest, NextResponse } from "next/server"

type MemberRole = 'TENANT_ADMIN' | 'REVIEWER' | 'MEMBER'
type MemberStatus = 'active' | 'invited' | 'inactive'

interface InstitutionMember {
  id: string
  name: string
  email: string
  role: MemberRole
  status: MemberStatus
  joinedAt: string
  institutionId: string
  institutionName: string
}

// Mock data
const mockMembers: InstitutionMember[] = [
  {
    id: "mem_001",
    name: "김대표",
    email: "ceo@hanabank.com",
    role: "TENANT_ADMIN",
    status: "active",
    joinedAt: "2024-01-15",
    institutionId: "inst_001",
    institutionName: "하나은행 NPL팀",
  },
  {
    id: "mem_002",
    name: "이팀장",
    email: "lee@hanabank.com",
    role: "REVIEWER",
    status: "active",
    joinedAt: "2024-02-20",
    institutionId: "inst_001",
    institutionName: "하나은행 NPL팀",
  },
  {
    id: "mem_003",
    name: "박과장",
    email: "park@hanabank.com",
    role: "MEMBER",
    status: "active",
    joinedAt: "2024-03-10",
    institutionId: "inst_001",
    institutionName: "하나은행 NPL팀",
  },
  {
    id: "mem_004",
    name: "최대리",
    email: "choi@hanabank.com",
    role: "MEMBER",
    status: "active",
    joinedAt: "2024-05-05",
    institutionId: "inst_001",
    institutionName: "하나은행 NPL팀",
  },
  {
    id: "mem_005",
    name: "정신입",
    email: "jung@hanabank.com",
    role: "MEMBER",
    status: "invited",
    joinedAt: "2025-03-18",
    institutionId: "inst_001",
    institutionName: "하나은행 NPL팀",
  },
]

// GET: List members of current tenant
export async function GET() {
  return NextResponse.json({
    success: true,
    institution: {
      id: "inst_001",
      name: "하나은행 NPL팀",
    },
    members: mockMembers,
    total: mockMembers.length,
  })
}

// POST: Invite new member
export async function POST(req: NextRequest) {
  try {
    const { email, role } = await req.json()

    if (!email || !role) {
      return NextResponse.json(
        { success: false, message: "이메일과 역할을 입력해주세요." },
        { status: 400 }
      )
    }

    const newMember: InstitutionMember = {
      id: `mem_${Date.now().toString(36)}`,
      name: email.split("@")[0],
      email,
      role: role as MemberRole,
      status: "invited",
      joinedAt: new Date().toISOString().split("T")[0],
      institutionId: "inst_001",
      institutionName: "하나은행 NPL팀",
    }

    return NextResponse.json({
      success: true,
      message: `${email}로 초대가 발송되었습니다.`,
      member: newMember,
    })
  } catch {
    return NextResponse.json(
      { success: false, message: "요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// PATCH: Change member role
export async function PATCH(req: NextRequest) {
  try {
    const { memberId, role } = await req.json()

    if (!memberId || !role) {
      return NextResponse.json(
        { success: false, message: "멤버 ID와 역할을 입력해주세요." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "멤버 역할이 변경되었습니다.",
      memberId,
      newRole: role,
    })
  } catch {
    return NextResponse.json(
      { success: false, message: "요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}

// DELETE: Remove member
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const memberId = searchParams.get("memberId")

    if (!memberId) {
      return NextResponse.json(
        { success: false, message: "멤버 ID를 입력해주세요." },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "멤버가 제거되었습니다.",
      memberId,
    })
  } catch {
    return NextResponse.json(
      { success: false, message: "요청 처리 중 오류가 발생했습니다." },
      { status: 500 }
    )
  }
}
