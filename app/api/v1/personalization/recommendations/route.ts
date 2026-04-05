import { NextRequest, NextResponse } from "next/server"
import { getDefaultProfile, getPersonalizedRecommendations } from "@/lib/personalization/engine"

export async function GET(req: NextRequest) {
  const profile = getDefaultProfile() // In production: load from DB based on user

  // Fetch listings
  try {
    const listingsRes = await fetch(`${req.nextUrl.origin}/api/v1/exchange/listings?limit=20`)
    const { data: listings } = await listingsRes.json()

    const recommendations = getPersonalizedRecommendations(profile, listings || [], 5)

    return NextResponse.json({ data: recommendations, profile: { ...profile, _note: '사용자 행동 데이터가 쌓이면 자동 개인화됩니다' } })
  } catch {
    return NextResponse.json({ data: [], profile, _note: '매물 데이터를 불러올 수 없습니다' })
  }
}
