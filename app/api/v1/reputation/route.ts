import { NextRequest, NextResponse } from "next/server"

// ─── Mock Reputation Data ────────────────────────────────────

interface ReputationScore { userId?: string; breakdown: Record<string, number>; totalReviews: number; updatedAt: string; overallRating?: number; [key: string]: unknown }
const MOCK_SCORES: Record<string, ReputationScore> = {
  user_001: {
    userId: "user_001",
    totalScore: 84,
    tier: "골드",
    breakdown: {
      거래실적: 88,
      응답속도: 92,
      사용자평가: 79,
      활동이력: 71,
    },
    completedDeals: 23,
    totalReviews: 47,
    avgResponseTime: "2.3시간",
    joinedAt: "2024-08-01",
    updatedAt: new Date().toISOString(),
  },
  user_002: {
    userId: "user_002",
    totalScore: 98,
    tier: "플래티넘",
    breakdown: {
      거래실적: 99,
      응답속도: 97,
      사용자평가: 98,
      활동이력: 96,
    },
    completedDeals: 412,
    totalReviews: 287,
    avgResponseTime: "0.8시간",
    joinedAt: "2023-01-15",
    updatedAt: new Date().toISOString(),
  },
}

interface ReviewEntry { revieweeId: string; overallRating: number; [key: string]: unknown }
const MOCK_REVIEWS: ReviewEntry[] = [
  {
    id: "rev_001",
    reviewerId: "user_002",
    revieweeId: "user_001",
    dealId: "deal_101",
    overallRating: 5,
    ratings: { professionalism: 5, responsiveness: 5, reliability: 5, value: 4 },
    comment: "정말 전문적으로 처리해주셔서 만족스러운 거래였습니다.",
    createdAt: "2026-03-10T09:00:00Z",
  },
  {
    id: "rev_002",
    reviewerId: "user_003",
    revieweeId: "user_001",
    dealId: "deal_098",
    overallRating: 4,
    ratings: { professionalism: 4, responsiveness: 5, reliability: 4, value: 4 },
    comment: "응답이 빠르고 신뢰할 수 있었습니다. 다음에도 함께하고 싶습니다.",
    createdAt: "2026-02-25T14:30:00Z",
  },
]

const MOCK_LEADERBOARD = [
  { rank: 1, userId: "user_002", name: "한국AMC그룹", type: "기관 매수자", score: 98, tier: "플래티넘", deals: 412, reviews: 287 },
  { rank: 2, userId: "user_003", name: "이진우 변호사", type: "법무 전문가", score: 97, tier: "플래티넘", deals: 384, reviews: 246 },
  { rank: 3, userId: "user_004", name: "서울밸류에셋", type: "기관 매수자", score: 96, tier: "플래티넘", deals: 356, reviews: 214 },
  { rank: 4, userId: "user_005", name: "박진성 세무사", type: "세무 전문가", score: 94, tier: "플래티넘", deals: 298, reviews: 189 },
  { rank: 5, userId: "user_006", name: "미래캐피탈AMC", type: "기관 매수자", score: 92, tier: "플래티넘", deals: 267, reviews: 172 },
  { rank: 6, userId: "user_007", name: "최영훈 감정평가사", type: "감정평가 전문가", score: 91, tier: "플래티넘", deals: 524, reviews: 312 },
  { rank: 7, userId: "user_008", name: "신한투자AMC", type: "기관 매도자", score: 89, tier: "골드", deals: 189, reviews: 134 },
  { rank: 8, userId: "user_001", name: "나 (김지훈)", type: "기관 매수자", score: 84, tier: "골드", deals: 23, reviews: 47 },
]

// ─── GET: score, reviews, leaderboard ───────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action")
  const userId = searchParams.get("userId")
  const page = parseInt(searchParams.get("page") ?? "1")
  const limit = parseInt(searchParams.get("limit") ?? "10")
  const category = searchParams.get("category")

  if (action === "score") {
    if (!userId) {
      return NextResponse.json({ error: { code: "MISSING_PARAM", message: "userId가 필요합니다." } }, { status: 400 })
    }
    const score = MOCK_SCORES[userId]
    if (!score) {
      return NextResponse.json({ error: { code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." } }, { status: 404 })
    }
    return NextResponse.json({ data: score })
  }

  if (action === "reviews") {
    const reviews = userId
      ? MOCK_REVIEWS.filter((r) => r.revieweeId === userId)
      : MOCK_REVIEWS
    const total = reviews.length
    const start = (page - 1) * limit
    return NextResponse.json({
      data: reviews.slice(start, start + limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  }

  if (action === "leaderboard") {
    let leaders = [...MOCK_LEADERBOARD]
    if (category) {
      leaders = leaders.filter((l) => l.type.includes(category))
    }
    const total = leaders.length
    const start = (page - 1) * limit
    return NextResponse.json({
      data: leaders.slice(start, start + limit),
      total,
      page,
      limit,
    })
  }

  // Default: return summary
  return NextResponse.json({
    data: {
      totalUsers: 1484,
      tierDistribution: {
        플래티넘: 18,
        골드: 124,
        실버: 289,
        브론즈: 421,
        신규: 632,
      },
      averageScore: 54.2,
      updatedAt: new Date().toISOString(),
    },
  })
}

// ─── POST: submit review ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { reviewerId, revieweeId, dealId, overallRating, ratings, comment } = body

  if (!reviewerId || !revieweeId || !dealId) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "필수 항목(reviewerId, revieweeId, dealId)을 입력해주세요." } },
      { status: 400 }
    )
  }
  if (!overallRating || overallRating < 1 || overallRating > 5) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "종합 평점은 1~5 사이여야 합니다." } },
      { status: 400 }
    )
  }
  if (!comment || comment.trim().length < 10) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "후기는 최소 10자 이상 작성해야 합니다." } },
      { status: 400 }
    )
  }

  const review = {
    id: `rev_${Date.now()}`,
    reviewerId,
    revieweeId,
    dealId,
    overallRating,
    ratings: ratings ?? {},
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
  }

  MOCK_REVIEWS.push(review)

  // Recalculate score (simplified)
  if (MOCK_SCORES[revieweeId]) {
    const allReviews = MOCK_REVIEWS.filter((r) => r.revieweeId === revieweeId)
    const avgOverall = allReviews.reduce((s, r) => s + r.overallRating, 0) / allReviews.length
    MOCK_SCORES[revieweeId].breakdown.사용자평가 = Math.min(100, Math.round(avgOverall * 20))
    MOCK_SCORES[revieweeId].totalReviews = allReviews.length
    MOCK_SCORES[revieweeId].updatedAt = new Date().toISOString()
  }

  return NextResponse.json({ data: review, message: "리뷰가 성공적으로 등록되었습니다." }, { status: 201 })
}
