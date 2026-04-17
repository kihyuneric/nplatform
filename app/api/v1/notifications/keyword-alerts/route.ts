// ─── /api/v1/notifications/keyword-alerts ──────────────────
// 키워드 알림 구독 CRUD + 매물 매칭 트리거.

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  matchListingAgainstSubscriptions,
  type KeywordSubscription,
  type ListingDoc,
} from "@/lib/notifications/keyword-alerts"

// ─── GET: 내 구독 목록 ─────────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("keyword_subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data: data ?? [] })
}

// ─── POST: 구독 등록 ──────────────────────────────────
interface CreateBody {
  label: string
  keywords?: string[]
  exclude?: string[]
  region?: string[]
  property_types?: string[]
  min_price?: number
  max_price?: number
  min_area_m2?: number
  max_area_m2?: number
  risk_grades?: string[]
  source?: "COURT" | "DEAL" | "BOTH"
  channel?: "IN_APP" | "EMAIL" | "PUSH" | "ALL"
  frequency?: "INSTANT" | "HOURLY" | "DAILY"
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: CreateBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  if (!body.label || body.label.trim().length === 0) {
    return NextResponse.json({ error: "label_required" }, { status: 400 })
  }
  if ((!body.keywords || body.keywords.length === 0) && !body.region && !body.property_types) {
    return NextResponse.json(
      { error: "at_least_one_filter_required" },
      { status: 400 },
    )
  }

  const row = {
    user_id:        user.id,
    label:          body.label.trim(),
    keywords:       body.keywords ?? [],
    exclude:        body.exclude  ?? [],
    region:         body.region   ?? null,
    property_types: body.property_types ?? null,
    min_price:      body.min_price ?? null,
    max_price:      body.max_price ?? null,
    min_area_m2:    body.min_area_m2 ?? null,
    max_area_m2:    body.max_area_m2 ?? null,
    risk_grades:    body.risk_grades ?? null,
    source:         body.source    ?? "BOTH",
    channel:        body.channel   ?? "IN_APP",
    frequency:      body.frequency ?? "INSTANT",
    is_active:      true,
  }

  const { data, error } = await supabase
    .from("keyword_subscriptions")
    .insert(row)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data }, { status: 201 })
}

// ─── DELETE: 구독 해지 ─────────────────────────────────
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "id_required" }, { status: 400 })
  }

  const { error } = await supabase
    .from("keyword_subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

// ─── PUT: 매물 매칭 트리거 (내부/cron 호출) ──────────────
// listing 객체를 받아 모든 활성 구독과 매칭하고 알림 enqueue.
// 호출자: 매물 등록 API 또는 NBI cron.
export async function PUT(req: NextRequest) {
  const supabase = await createClient()

  // 서비스 호출 토큰 확인 (cron/internal)
  const auth = req.headers.get("authorization")
  const internalKey = process.env.INTERNAL_API_KEY
  if (!internalKey || auth !== `Bearer ${internalKey}`) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  let listing: ListingDoc
  try {
    const body = await req.json()
    listing = body.listing
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  if (!listing?.id || !listing?.source) {
    return NextResponse.json({ error: "invalid_listing" }, { status: 400 })
  }

  const { data: subs, error } = await supabase
    .from("keyword_subscriptions")
    .select("*")
    .eq("is_active", true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const summary = await matchListingAgainstSubscriptions(
    supabase as never,
    listing,
    (subs ?? []) as KeywordSubscription[],
  )

  return NextResponse.json({ summary })
}
