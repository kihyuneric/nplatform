import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'

// ─── Mock Stored Results ──────────────────────────────────────

const MOCK_RESULTS = [
  {
    id: "S1-B1",
    sellerId: "S1",
    buyerId: "B1",
    sellerName: "KB국민은행 NPL팀",
    buyerName: "한국투자증권 부동산팀",
    totalScore: 88,
    grade: "EXCELLENT",
    factors: [
      { name: "담보유형", score: 100, weight: 0.30 },
      { name: "지역",     score: 100, weight: 0.25 },
      { name: "금액대",   score: 93,  weight: 0.20 },
      { name: "할인율",   score: 100, weight: 0.15 },
      { name: "회피조건", score: 75,  weight: 0.10 },
    ],
    recommendedAction: "딜룸 즉시 개설 권장",
    status: "PENDING",
    createdAt: "2026-03-19T10:00:00.000Z",
  },
  {
    id: "S1-B3",
    sellerId: "S1",
    buyerId: "B3",
    sellerName: "KB국민은행 NPL팀",
    buyerName: "NH농협 부동산투자",
    totalScore: 83,
    grade: "EXCELLENT",
    factors: [
      { name: "담보유형", score: 100, weight: 0.30 },
      { name: "지역",     score: 100, weight: 0.25 },
      { name: "금액대",   score: 56,  weight: 0.20 },
      { name: "할인율",   score: 100, weight: 0.15 },
      { name: "회피조건", score: 75,  weight: 0.10 },
    ],
    recommendedAction: "딜룸 즉시 개설 권장",
    status: "VIEWED",
    createdAt: "2026-03-19T10:01:00.000Z",
  },
  {
    id: "S3-B4",
    sellerId: "S3",
    buyerId: "B4",
    sellerName: "하나캐피탈 AMC",
    buyerName: "DS자산운용",
    totalScore: 81,
    grade: "EXCELLENT",
    factors: [
      { name: "담보유형", score: 100, weight: 0.30 },
      { name: "지역",     score: 100, weight: 0.25 },
      { name: "금액대",   score: 93,  weight: 0.20 },
      { name: "할인율",   score: 100, weight: 0.15 },
      { name: "회피조건", score: 75,  weight: 0.10 },
    ],
    recommendedAction: "딜룸 즉시 개설 권장",
    status: "NOTIFIED",
    createdAt: "2026-03-19T10:02:00.000Z",
  },
  {
    id: "S2-B2",
    sellerId: "S2",
    buyerId: "B2",
    sellerName: "신한저축은행",
    buyerName: "미래에셋 NPL펀드",
    totalScore: 72,
    grade: "GOOD",
    factors: [
      { name: "담보유형", score: 100, weight: 0.30 },
      { name: "지역",     score: 100, weight: 0.25 },
      { name: "금액대",   score: 75,  weight: 0.20 },
      { name: "할인율",   score: 100, weight: 0.15 },
      { name: "회피조건", score: 75,  weight: 0.10 },
    ],
    recommendedAction: "조건 협의 후 딜룸 개설 검토",
    status: "PENDING",
    createdAt: "2026-03-19T10:03:00.000Z",
  },
  {
    id: "S4-B2",
    sellerId: "S4",
    buyerId: "B2",
    sellerName: "우리금융AMC",
    buyerName: "미래에셋 NPL펀드",
    totalScore: 54,
    grade: "FAIR",
    factors: [
      { name: "담보유형", score: 30,  weight: 0.30 },
      { name: "지역",     score: 100, weight: 0.25 },
      { name: "금액대",   score: 49,  weight: 0.20 },
      { name: "할인율",   score: 100, weight: 0.15 },
      { name: "회피조건", score: 75,  weight: 0.10 },
    ],
    recommendedAction: "추가 조건 조정 필요",
    status: "PENDING",
    createdAt: "2026-03-19T10:04:00.000Z",
  },
]

// ─── Route Handler ────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)

    const minScore = Number(searchParams.get("minScore") ?? 0)
    const grade = searchParams.get("grade") ?? ""
    const sellerId = searchParams.get("sellerId") ?? ""
    const buyerId = searchParams.get("buyerId") ?? ""
    const page = Math.max(1, Number(searchParams.get("page") ?? 1))
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)))

    let results = [...MOCK_RESULTS]

    if (minScore > 0) results = results.filter(r => r.totalScore >= minScore)
    if (grade) results = results.filter(r => r.grade === grade.toUpperCase())
    if (sellerId) results = results.filter(r => r.sellerId === sellerId)
    if (buyerId) results = results.filter(r => r.buyerId === buyerId)

    const total = results.length
    const start = (page - 1) * limit
    const paginated = results.slice(start, start + limit)

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: start + limit < total,
      },
      summary: {
        total: MOCK_RESULTS.length,
        excellent: MOCK_RESULTS.filter(r => r.grade === "EXCELLENT").length,
        good: MOCK_RESULTS.filter(r => r.grade === "GOOD").length,
        fair: MOCK_RESULTS.filter(r => r.grade === "FAIR").length,
      },
    })
  } catch (err) {
    logger.error("[GET /api/v1/matching/results]", { error: err })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "결과 조회 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
