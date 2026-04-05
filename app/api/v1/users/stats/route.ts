import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: { code: "MISSING_ID", message: "User ID is required" } }, { status: 400 })
  }

  const stats = {
    user_id: id,
    deal_count: Math.floor(Math.random() * 50) + 1,
    rating: (Math.random() * 1.5 + 3.5).toFixed(1),
    review_count: Math.floor(Math.random() * 40) + 5,
    post_count: Math.floor(Math.random() * 200) + 10,
    comment_count: Math.floor(Math.random() * 500) + 20,
    like_count: Math.floor(Math.random() * 1000) + 50,
    view_count: Math.floor(Math.random() * 20000) + 1000,
    bookmark_count: Math.floor(Math.random() * 100) + 5,
    monthly_active_days: Math.floor(Math.random() * 20) + 5,
    last_active_at: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    computed_at: new Date().toISOString(),
  }

  return NextResponse.json({ data: stats })
}
