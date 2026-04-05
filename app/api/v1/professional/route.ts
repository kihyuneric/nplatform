import { NextRequest, NextResponse } from "next/server"

// ─── Mock Professional Data ──────────────────────────────────

const LAW_MOCK = {
  activeCases: 18,
  completedThisMonth: 7,
  pendingReview: 5,
  monthlyRevenue: 28400000,
  cases: [
    { id: "C-2026-047", client: "이**", type: "명도소송", property: "서울 강남 상가", status: "진행중", nextAction: "변론기일", dueDate: "2026-03-25", priority: "high" },
    { id: "C-2026-043", client: "김**", type: "배당이의", property: "경기 성남 아파트", status: "검토중", nextAction: "준비서면", dueDate: "2026-03-28", priority: "high" },
  ],
  courtSchedule: [
    { date: "2026-03-25", time: "10:00", court: "서울중앙지방법원 민사5단독", type: "변론기일", caseId: "C-2026-047" },
  ],
}

const TAX_MOCK = {
  clientCount: 34,
  monthlySavings: 187000000,
  pendingItems: 12,
  monthlyRevenue: 14200000,
  clients: [
    { name: "이** 개인", holdings: 3, totalValue: "28억원", taxEstimate: "3,200만원", nextDeadline: "2026-04-30", status: "자문중" },
  ],
  deadlines: [
    { date: "2026-03-31", type: "법인세 신고", clients: "김** 법인, 정** AMC", priority: "urgent" },
  ],
}

const REALTOR_MOCK = {
  managedListings: 23,
  completedDeals: 4,
  pendingViewings: 8,
  monthlyCommission: 32400000,
  listings: [
    { id: "L-047", address: "서울 강남구 역삼동 상가", type: "상가", status: "매각 진행", price: "18억원", inquiries: 7 },
  ],
}

const CONSULTANT_MOCK = {
  activeProjects: 8,
  clientCount: 21,
  monthlyRevenue: 67200000,
  reportsIssued: 12,
  projects: [
    { id: "P-2026-08", client: "한국자산관리조합", type: "포트폴리오 전략", value: "1,200억원", progress: 45 },
  ],
}

// ─── GET handler ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get("role")
  const userId = searchParams.get("userId")
  const action = searchParams.get("action")

  if (!role) {
    return NextResponse.json(
      { error: { code: "MISSING_PARAM", message: "role 파라미터가 필요합니다." } },
      { status: 400 }
    )
  }

  const roleMap: Record<string, unknown> = {
    law: LAW_MOCK,
    tax: TAX_MOCK,
    realtor: REALTOR_MOCK,
    consultant: CONSULTANT_MOCK,
  }

  const data = roleMap[role]
  if (!data) {
    return NextResponse.json(
      { error: { code: "INVALID_ROLE", message: `지원하지 않는 역할입니다: ${role}` } },
      { status: 400 }
    )
  }

  if (action === "summary") {
    const summary = {
      law: { activeCases: LAW_MOCK.activeCases, monthlyRevenue: LAW_MOCK.monthlyRevenue },
      tax: { clientCount: TAX_MOCK.clientCount, monthlyRevenue: TAX_MOCK.monthlyRevenue },
      realtor: { managedListings: REALTOR_MOCK.managedListings, monthlyCommission: REALTOR_MOCK.monthlyCommission },
      consultant: { activeProjects: CONSULTANT_MOCK.activeProjects, monthlyRevenue: CONSULTANT_MOCK.monthlyRevenue },
    }
    return NextResponse.json({ data: summary[role as keyof typeof summary] })
  }

  return NextResponse.json({
    data,
    role,
    userId: userId ?? "demo",
    fetchedAt: new Date().toISOString(),
  })
}

// ─── POST handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const role = searchParams.get("role")
  const action = searchParams.get("action")
  const body = await req.json()

  if (!role || !action) {
    return NextResponse.json(
      { error: { code: "MISSING_PARAM", message: "role, action 파라미터가 필요합니다." } },
      { status: 400 }
    )
  }

  if (action === "create_case" && role === "law") {
    const { client, type, property, priority } = body
    if (!client || !type || !property) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "필수 항목을 입력하세요." } }, { status: 400 })
    }
    const newCase = {
      id: `C-2026-${String(Date.now()).slice(-3)}`,
      client, type, property, priority: priority ?? "medium",
      status: "대기",
      createdAt: new Date().toISOString(),
    }
    return NextResponse.json({ data: newCase }, { status: 201 })
  }

  if (action === "create_project" && role === "consultant") {
    const { client, type, value } = body
    if (!client || !type) {
      return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "필수 항목을 입력하세요." } }, { status: 400 })
    }
    const newProject = {
      id: `P-2026-${String(Date.now()).slice(-3)}`,
      client, type, value: value ?? "미정",
      progress: 0,
      status: "초기",
      createdAt: new Date().toISOString(),
    }
    return NextResponse.json({ data: newProject }, { status: 201 })
  }

  return NextResponse.json(
    { error: { code: "INVALID_ACTION", message: `지원하지 않는 action: ${action}` } },
    { status: 400 }
  )
}
