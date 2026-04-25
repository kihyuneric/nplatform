import { NextRequest, NextResponse } from "next/server"

// ─── Mock Data ───────────────────────────────────────────────

const MOCK_SERVICES = [
  {
    id: "1",
    name: "김대호 변호사",
    company: "법무법인 한결",
    category: "law",
    categoryLabel: "법무",
    region: "서울 강남",
    rating: 4.9,
    reviewCount: 247,
    priceMin: 300000,
    priceMax: 1500000,
    priceUnit: "건",
    verified: true,
    completedProjects: 412,
    responseTime: "2시간 이내",
    badges: ["경매 전문", "NPL 10년+"],
    description: "NPL 경공매 전문 변호사, 10년 이상 경험",
    avatarInitials: "김대",
    avatarColor: "#1B3A5C",
  },
  {
    id: "2",
    name: "이미진 세무사",
    company: "미진세무회계",
    category: "tax",
    categoryLabel: "세무",
    region: "서울 서초",
    rating: 4.8,
    reviewCount: 189,
    priceMin: 200000,
    priceMax: 800000,
    priceUnit: "건",
    verified: true,
    completedProjects: 328,
    responseTime: "3시간 이내",
    badges: ["양도세 전문", "법인세"],
    description: "NPL 양도소득세·법인세 절세 전략",
    avatarInitials: "이미",
    avatarColor: "#14161A",
  },
  {
    id: "3",
    name: "박준서 공인회계사",
    company: "한국실사파트너스",
    category: "accounting",
    categoryLabel: "회계",
    region: "서울 여의도",
    rating: 4.7,
    reviewCount: 143,
    priceMin: 500000,
    priceMax: 3000000,
    priceUnit: "건",
    verified: true,
    completedProjects: 187,
    responseTime: "당일",
    badges: ["실사전문", "Big4 출신"],
    description: "NPL 포트폴리오 실사 및 가치평가",
    avatarInitials: "박준",
    avatarColor: "#2E75B6",
  },
]

const MOCK_QUOTES: Record<string, Record<string, unknown>[]> = {}

// ─── GET: list or detail ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const category = searchParams.get("category")
  const region = searchParams.get("region")
  const minRating = parseFloat(searchParams.get("minRating") ?? "0")
  const q = searchParams.get("q")
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "12")

  if (id) {
    const service = MOCK_SERVICES.find((s) => s.id === id)
    if (!service) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "서비스 제공자를 찾을 수 없습니다." } }, { status: 404 })
    }
    return NextResponse.json({ data: service })
  }

  let results = [...MOCK_SERVICES]
  if (category && category !== "all") results = results.filter((s) => s.category === category)
  if (region && region !== "all") results = results.filter((s) => s.region.includes(region))
  if (minRating > 0) results = results.filter((s) => s.rating >= minRating)
  if (q) results = results.filter((s) => s.name.includes(q) || s.company.includes(q) || s.description.includes(q))

  const total = results.length
  const start = (page - 1) * limit
  const paginated = results.slice(start, start + limit)

  return NextResponse.json({
    data: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}

// ─── POST: register provider or submit quote ─────────────────

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")
  const body = await req.json()

  if (action === "quote") {
    const { serviceId, projectTitle, description, budgetRange, deadline, contactPhone, contactEmail } = body
    if (!serviceId || !projectTitle || !description || !budgetRange || !deadline) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "필수 항목을 모두 입력해주세요." } },
        { status: 400 }
      )
    }
    const quote = {
      id: `quote_${Date.now()}`,
      serviceId,
      projectTitle,
      description,
      budgetRange,
      deadline,
      contactPhone,
      contactEmail,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    }
    if (!MOCK_QUOTES[serviceId]) MOCK_QUOTES[serviceId] = []
    MOCK_QUOTES[serviceId].push(quote)
    return NextResponse.json({ data: quote }, { status: 201 })
  }

  if (action === "register") {
    const { name, company, category, phone, email, serviceName, priceMin, priceMax } = body
    if (!name || !company || !category || !phone || !email) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "필수 정보를 입력해주세요." } },
        { status: 400 }
      )
    }
    const newProvider = {
      id: `prov_${Date.now()}`,
      name,
      company,
      category,
      phone,
      email,
      serviceName,
      priceMin,
      priceMax,
      status: "PENDING_APPROVAL",
      createdAt: new Date().toISOString(),
    }
    return NextResponse.json({ data: newProvider, message: "등록 신청이 완료되었습니다. 관리자 승인 후 서비스가 게시됩니다." }, { status: 201 })
  }

  return NextResponse.json({ error: { code: "INVALID_ACTION", message: "올바르지 않은 요청입니다." } }, { status: 400 })
}
