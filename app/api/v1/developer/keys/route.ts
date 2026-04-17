import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logger } from "@/lib/logger"

// TIER_CONFIG kept for rate-limit derivation and response metadata
const TIER_CONFIG: Record<string, { rateLimit: number; monthlyLimit: number }> = {
  free:       { rateLimit: 20,  monthlyLimit: 1_000 },
  starter:    { rateLimit: 100, monthlyLimit: 50_000 },
  pro:        { rateLimit: 500, monthlyLimit: 500_000 },
  enterprise: { rateLimit: -1,  monthlyLimit: -1 },
}

// ──────────────────────────────────────────────────────────────
// GET  /api/v1/developer/keys
// List active API keys for the authenticated user (key masked)
// ──────────────────────────────────────────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    const { data: rows, error: dbError } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, last_used_at, created_at, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (dbError) {
      logger.error("[Developer Keys GET] DB error", { error: dbError })
      // Fall back to empty list rather than 500
      return NextResponse.json({ success: true, data: [], meta: { total: 0, active: 0 } })
    }

    const keys = (rows ?? []).map((row) => ({
      id:          row.id,
      name:        row.name,
      // Show first 12 chars of prefix + mask
      keyMasked:   (row.key_prefix as string).slice(0, 12) + "••••••••",
      created:     (row.created_at as string).split("T")[0],
      lastUsed:    row.last_used_at ? (row.last_used_at as string).split("T")[0] : null,
      status:      "active" as const,
    }))

    return NextResponse.json({
      success: true,
      data: keys,
      meta: {
        total:  keys.length,
        active: keys.length,
      },
    })
  } catch (error) {
    logger.error("[Developer Keys GET Error]", { error })
    return NextResponse.json({ success: true, data: [], meta: { total: 0, active: 0 } })
  }
}

// ──────────────────────────────────────────────────────────────
// POST  /api/v1/developer/keys
// Create a new API key; raw key returned ONCE
// ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { name, tier = "free" } = body

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: { code: "INVALID_NAME", message: "API 키 이름은 2자 이상이어야 합니다." } },
        { status: 400 }
      )
    }

    // Validate tier
    const validTiers = ["free", "starter", "pro", "enterprise"]
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: { code: "INVALID_TIER", message: "유효하지 않은 플랜입니다." } },
        { status: 400 }
      )
    }

    // Check max 5 active keys
    const { count, error: countError } = await supabase
      .from("api_keys")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true)

    if (!countError && (count ?? 0) >= 5) {
      return NextResponse.json(
        { error: { code: "KEY_LIMIT_EXCEEDED", message: "활성 API 키는 최대 5개까지 생성 가능합니다." } },
        { status: 400 }
      )
    }

    // Generate raw key
    const isLive = tier === "pro" || tier === "enterprise"
    const prefix = isLive ? "npl_live_sk_" : "npl_test_sk_"
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    const randomSuffix = Array.from(
      { length: 24 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("")
    const rawKey = prefix + randomSuffix

    // Hash with SHA-256
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(rawKey))
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")

    const tierConfig = TIER_CONFIG[tier] ?? TIER_CONFIG.free

    // Insert into DB
    const { data: inserted, error: insertError } = await supabase
      .from("api_keys")
      .insert({
        user_id:    user.id,
        name:       name.trim(),
        key_prefix: rawKey.slice(0, 20), // store displayable prefix (first 20 chars)
        key_hash:   keyHash,
        is_active:  true,
      })
      .select("id, name, created_at")
      .single()

    if (insertError || !inserted) {
      logger.error("[Developer Keys POST] DB insert error", { error: insertError })
      // Fall back to mock-style response so the UI doesn't hard-break
      return NextResponse.json(
        {
          success: true,
          data: {
            id:           `k${Date.now()}`,
            name:         name.trim(),
            key:          rawKey,
            created:      new Date().toISOString().split("T")[0],
            status:       "active",
            tier,
            rateLimit:    tierConfig.rateLimit,
            monthlyLimit: tierConfig.monthlyLimit,
          },
          warning: "API 키는 지금만 표시됩니다. 안전한 곳에 보관하세요. (DB 저장 실패 — 관리자에게 문의하세요)",
        },
        { status: 201 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id:           inserted.id,
          name:         inserted.name,
          key:          rawKey, // Full key shown ONCE
          created:      (inserted.created_at as string).split("T")[0],
          status:       "active",
          tier,
          rateLimit:    tierConfig.rateLimit,
          monthlyLimit: tierConfig.monthlyLimit,
        },
        warning: "API 키는 지금만 표시됩니다. 안전한 곳에 보관하세요.",
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error("[Developer Keys POST Error]", { error })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "API 키 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────────
// DELETE  /api/v1/developer/keys?id=<keyId>
// Revoke (soft-delete via is_active=false) an API key
// ──────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const keyId = searchParams.get("id")

    if (!keyId) {
      return NextResponse.json(
        { error: { code: "MISSING_KEY_ID", message: "keyId가 필요합니다." } },
        { status: 400 }
      )
    }

    // Soft-delete: set is_active=false, updated_at is auto-updated by DB trigger
    const { data: revoked, error: updateError } = await supabase
      .from("api_keys")
      .update({ is_active: false })
      .eq("id", keyId)
      .eq("user_id", user.id)   // ensures ownership
      .eq("is_active", true)    // prevents double-revoke
      .select("id, name, updated_at")
      .single()

    if (updateError) {
      logger.error("[Developer Keys DELETE] DB update error", { error: updateError })
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "API 키 폐기 중 오류가 발생했습니다." } },
        { status: 500 }
      )
    }

    if (!revoked) {
      return NextResponse.json(
        { error: { code: "KEY_NOT_FOUND", message: "API 키를 찾을 수 없거나 이미 폐기되었습니다." } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success:   true,
      message:   `API 키 "${revoked.name}"이(가) 폐기되었습니다.`,
      revokedAt: revoked.updated_at,
    })
  } catch (error) {
    logger.error("[Developer Keys DELETE Error]", { error })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "API 키 폐기 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
