import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { MATCHING_WEIGHTS } from "@/lib/constants"

// ─── Types ────────────────────────────────────────────────────

interface SellerProfile {
  id: string
  name: string
  collateral: string
  region: string
  amount: number
  discount: number
}

interface BuyerProfile {
  id: string
  name: string
  collateral: string
  region: string
  budget: number
  minDiscount: number
}

interface MatchFactor {
  name: string
  score: number
  weight: number
}

interface MatchPair {
  id: string
  sellerId: string
  buyerId: string
  sellerName: string
  buyerName: string
  totalScore: number
  grade: "EXCELLENT" | "GOOD" | "FAIR"
  factors: MatchFactor[]
  recommendedAction: string
}

// ─── Scoring Logic ────────────────────────────────────────────

function scoreCollateral(sellerType: string, buyerType: string): number {
  if (sellerType === buyerType) return 100
  // Partial compatibility map
  const compatMap: Record<string, string[]> = {
    APARTMENT: ["VILLA"],
    COMMERCIAL: ["OFFICE"],
    OFFICE: ["COMMERCIAL"],
    VILLA: ["APARTMENT"],
  }
  if (compatMap[sellerType]?.includes(buyerType)) return 65
  return 30
}

function scoreRegion(sellerRegion: string, buyerRegion: string): number {
  if (sellerRegion === buyerRegion) return 100
  // Same broad area bonus
  const seoulMetro = ["서울특별시", "경기도", "인천광역시"]
  const busan = ["부산광역시", "울산광역시", "경상남도"]
  const daegu = ["대구광역시", "경상북도"]
  const areas = [seoulMetro, busan, daegu]
  for (const area of areas) {
    if (area.includes(sellerRegion) && area.includes(buyerRegion)) return 70
  }
  return 40
}

function scoreAmount(sellerAmount: number, buyerBudget: number): number {
  const ratio = Math.min(sellerAmount, buyerBudget) / Math.max(sellerAmount, buyerBudget)
  return Math.round(ratio * 100)
}

function scoreDiscount(sellerDiscount: number, buyerMinDiscount: number): number {
  if (sellerDiscount >= buyerMinDiscount) return 100
  const gap = buyerMinDiscount - sellerDiscount
  return Math.max(0, 100 - gap * 6)
}

function computeTotalScore(factors: MatchFactor[]): number {
  return Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  )
}

function gradeScore(score: number): "EXCELLENT" | "GOOD" | "FAIR" {
  if (score >= 80) return "EXCELLENT"
  if (score >= 60) return "GOOD"
  return "FAIR"
}

function recommendAction(score: number, grade: string): string {
  if (grade === "EXCELLENT") return "딜룸 즉시 개설 권장"
  if (grade === "GOOD") return "조건 협의 후 딜룸 개설 검토"
  return "추가 조건 조정 필요"
}

// ─── Mock Data ────────────────────────────────────────────────

const DEFAULT_SELLERS: SellerProfile[] = [
  { id: "S1", name: "KB국민은행 NPL팀", collateral: "APARTMENT", region: "서울특별시", amount: 2800000000, discount: 32 },
  { id: "S2", name: "신한저축은행", collateral: "COMMERCIAL", region: "경기도", amount: 1500000000, discount: 28 },
  { id: "S3", name: "하나캐피탈 AMC", collateral: "OFFICE", region: "부산광역시", amount: 4200000000, discount: 41 },
  { id: "S4", name: "우리금융AMC", collateral: "LAND", region: "경기도", amount: 980000000, discount: 35 },
]

const DEFAULT_BUYERS: BuyerProfile[] = [
  { id: "B1", name: "한국투자증권 부동산팀", collateral: "APARTMENT", region: "서울특별시", budget: 3000000000, minDiscount: 25 },
  { id: "B2", name: "미래에셋 NPL펀드", collateral: "COMMERCIAL", region: "경기도", budget: 2000000000, minDiscount: 20 },
  { id: "B3", name: "NH농협 부동산투자", collateral: "APARTMENT", region: "서울특별시", budget: 5000000000, minDiscount: 30 },
  { id: "B4", name: "DS자산운용", collateral: "OFFICE", region: "부산광역시", budget: 4500000000, minDiscount: 35 },
]

// ─── Route Handler ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    const sellers: SellerProfile[] = body.sellers ?? DEFAULT_SELLERS
    const buyers: BuyerProfile[] = body.buyers ?? DEFAULT_BUYERS

    if (!Array.isArray(sellers) || !Array.isArray(buyers)) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "sellers와 buyers 배열이 필요합니다." } },
        { status: 400 }
      )
    }

    const pairs: MatchPair[] = []

    for (const seller of sellers) {
      for (const buyer of buyers) {
        const collateralScore = scoreCollateral(seller.collateral, buyer.collateral)
        const regionScore = scoreRegion(seller.region, buyer.region)
        const amountScore = scoreAmount(seller.amount, buyer.budget)
        const discountScore = scoreDiscount(seller.discount, buyer.minDiscount)
        const avoidanceScore = 75 // default

        const factors: MatchFactor[] = [
          { name: "담보유형", score: collateralScore, weight: MATCHING_WEIGHTS.collateral },
          { name: "지역",     score: regionScore,     weight: MATCHING_WEIGHTS.region },
          { name: "금액대",   score: amountScore,     weight: MATCHING_WEIGHTS.amount },
          { name: "할인율",   score: discountScore,   weight: MATCHING_WEIGHTS.discount },
          { name: "회피조건", score: avoidanceScore,  weight: MATCHING_WEIGHTS.avoidance },
        ]

        const total = computeTotalScore(factors)
        const grade = gradeScore(total)

        pairs.push({
          id: `${seller.id}-${buyer.id}`,
          sellerId: seller.id,
          buyerId: buyer.id,
          sellerName: seller.name,
          buyerName: buyer.name,
          totalScore: total,
          grade,
          factors,
          recommendedAction: recommendAction(total, grade),
        })
      }
    }

    // Sort by score descending
    pairs.sort((a, b) => b.totalScore - a.totalScore)

    const summary = {
      total: pairs.length,
      excellent: pairs.filter(p => p.grade === "EXCELLENT").length,
      good: pairs.filter(p => p.grade === "GOOD").length,
      fair: pairs.filter(p => p.grade === "FAIR").length,
      averageScore: pairs.length
        ? Math.round(pairs.reduce((s, p) => s + p.totalScore, 0) / pairs.length)
        : 0,
    }

    return NextResponse.json({
      success: true,
      summary,
      results: pairs,
      runAt: new Date().toISOString(),
    })
  } catch (err) {
    logger.error("[POST /api/v1/matching/run]", { error: err })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "매칭 실행 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
