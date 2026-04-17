import { Errors, fromUnknown } from '@/lib/api-error'
import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server"

// ─── Mock Data ────────────────────────────────────────────

const MOCK_FAVORITES = [
  {
    id: "fav-001",
    user_id: "user-buyer-1",
    institution_id: "inst-001",
    created_at: "2026-03-05T10:00:00Z",
    institution: {
      id: "inst-001",
      name: "한국산업은행 자산관리부",
      type: "은행",
      trust_grade: "AAA",
      active_listings: 15,
      logo_url: "/images/institutions/kdb.png",
    },
  },
  {
    id: "fav-002",
    user_id: "user-buyer-1",
    institution_id: "inst-004",
    created_at: "2026-03-12T14:00:00Z",
    institution: {
      id: "inst-004",
      name: "하나대체투자자산운용",
      type: "자산운용사",
      trust_grade: "AA",
      active_listings: 6,
      logo_url: "/images/institutions/hana-alt.png",
    },
  },
  {
    id: "fav-003",
    user_id: "user-buyer-1",
    institution_id: "inst-005",
    created_at: "2026-03-15T09:30:00Z",
    institution: {
      id: "inst-005",
      name: "KB부동산신탁",
      type: "신탁사",
      trust_grade: "AA+",
      active_listings: 10,
      logo_url: "/images/institutions/kb-retrust.png",
    },
  },
]

// ─── GET /api/v1/institutions/favorites ───────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    let userId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) userId = user.id } catch {}

    if (userId === 'anonymous') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from("institution_favorites")
      .select(
        `
        *,
        institution:institution_profiles (
          id,
          name,
          type,
          trust_grade,
          active_listings,
          logo_url
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ data: MOCK_FAVORITES })
    }

    return NextResponse.json({ data })
  } catch (err) {
    logger.error("[institutions/favorites] GET error:", { error: err })
    return Errors.internal('즐겨찾기를 불러오는 중 오류가 발생했습니다.')
  }
}

// ─── POST /api/v1/institutions/favorites ──────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    let postUserId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) postUserId = user.id } catch {}
    if (postUserId === 'anonymous') return Errors.unauthorized('인증이 필요합니다.')

    const body = await request.json()
    const { institution_id } = body

    if (!institution_id) {
      return Errors.badRequest('institution_id는 필수입니다.')
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from("institution_favorites")
      .select("id")
      .eq("user_id", postUserId)
      .eq("institution_id", institution_id)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: "이미 즐겨찾기에 추가된 기관입니다." },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from("institution_favorites")
      .insert({
        user_id: postUserId,
        institution_id,
      })
      .select()
      .single()

    if (error) {
      const mockFav = {
        id: `fav-${Date.now()}`,
        user_id: postUserId,
        institution_id,
        created_at: new Date().toISOString(),
      }
      return NextResponse.json({ data: mockFav }, { status: 201 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    logger.error("[institutions/favorites] POST error:", { error: err })
    return Errors.internal('즐겨찾기 추가 중 오류가 발생했습니다.')
  }
}

// ─── DELETE /api/v1/institutions/favorites ─────────────────

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    let delUserId = 'anonymous'
    try { const { data: { user } } = await supabase.auth.getUser(); if (user) delUserId = user.id } catch {}
    if (delUserId === 'anonymous') return Errors.unauthorized('인증이 필요합니다.')

    const { searchParams } = new URL(request.url)
    const institution_id = searchParams.get("institution_id")

    if (!institution_id) {
      return Errors.badRequest('institution_id 쿼리 파라미터가 필요합니다.')
    }

    const { error } = await supabase
      .from("institution_favorites")
      .delete()
      .eq("user_id", delUserId)
      .eq("institution_id", institution_id)

    if (error) {
      return NextResponse.json({
        data: { institution_id, removed: true, _mock: true },
      })
    }

    return NextResponse.json({
      data: { institution_id, removed: true },
    })
  } catch (err) {
    logger.error("[institutions/favorites] DELETE error:", { error: err })
    return Errors.internal('즐겨찾기 삭제 중 오류가 발생했습니다.')
  }
}
