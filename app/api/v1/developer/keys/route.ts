import { NextRequest, NextResponse } from "next/server"
import { logger } from '@/lib/logger'

export const runtime = "edge"

// In-memory mock store (resets on each cold start)
const MOCK_KEYS: Array<{
  id: string
  name: string
  key: string
  keyPrefix: string
  created: string
  lastUsed: string | null
  requestCount: number
  status: "active" | "revoked"
  tier: string
  rateLimit: number
}> = [
  {
    id: "k1",
    name: "프로덕션 서버",
    key: "npl_live_sk_••••••••••••••••••••3f9a",
    keyPrefix: "npl_live_",
    created: "2026-01-15",
    lastUsed: "2026-03-20",
    requestCount: 48392,
    status: "active",
    tier: "pro",
    rateLimit: 500,
  },
  {
    id: "k2",
    name: "개발 환경",
    key: "npl_test_sk_••••••••••••••••••••7b2c",
    keyPrefix: "npl_test_",
    created: "2026-02-01",
    lastUsed: "2026-03-19",
    requestCount: 12038,
    status: "active",
    tier: "starter",
    rateLimit: 100,
  },
]

const TIER_CONFIG: Record<string, { rateLimit: number; monthlyLimit: number }> = {
  free: { rateLimit: 20, monthlyLimit: 1000 },
  starter: { rateLimit: 100, monthlyLimit: 50000 },
  pro: { rateLimit: 500, monthlyLimit: 500000 },
  enterprise: { rateLimit: -1, monthlyLimit: -1 },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  // In real app, validate JWT and get userId from token
  const keys = MOCK_KEYS.map((k) => ({
    id: k.id,
    name: k.name,
    keyMasked: k.key,
    created: k.created,
    lastUsed: k.lastUsed,
    requestCount: k.requestCount,
    status: k.status,
    tier: k.tier,
    rateLimit: k.rateLimit,
  }))

  return NextResponse.json({
    success: true,
    data: keys,
    meta: {
      total: keys.length,
      active: keys.filter((k) => k.status === "active").length,
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, tier = "free" } = body

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: { code: "INVALID_NAME", message: "API 키 이름은 2자 이상이어야 합니다." } },
        { status: 400 }
      )
    }

    const validTiers = ["free", "starter", "pro", "enterprise"]
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: { code: "INVALID_TIER", message: "유효하지 않은 플랜입니다." } },
        { status: 400 }
      )
    }

    // Check limit: max 5 active keys
    const activeCount = MOCK_KEYS.filter((k) => k.status === "active").length
    if (activeCount >= 5) {
      return NextResponse.json(
        { error: { code: "KEY_LIMIT_EXCEEDED", message: "활성 API 키는 최대 5개까지 생성 가능합니다." } },
        { status: 400 }
      )
    }

    // Generate key
    const isLive = tier === "pro" || tier === "enterprise"
    const prefix = isLive ? "npl_live_sk_" : "npl_test_sk_"
    const rawKey = prefix + Array.from({ length: 24 }, () => "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)]).join("")

    const newKey = {
      id: `k${Date.now()}`,
      name: name.trim(),
      key: rawKey, // Return full key ONCE
      keyPrefix: prefix,
      created: new Date().toISOString().split("T")[0],
      lastUsed: null,
      requestCount: 0,
      status: "active" as const,
      tier,
      rateLimit: TIER_CONFIG[tier]?.rateLimit ?? 20,
    }

    MOCK_KEYS.unshift(newKey)

    return NextResponse.json(
      {
        success: true,
        data: {
          id: newKey.id,
          name: newKey.name,
          key: newKey.key, // Full key shown once
          created: newKey.created,
          status: newKey.status,
          tier: newKey.tier,
          rateLimit: newKey.rateLimit,
          monthlyLimit: TIER_CONFIG[tier]?.monthlyLimit ?? 1000,
        },
        warning: "API 키는 지금만 표시됩니다. 안전한 곳에 보관하세요.",
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error("[Developer Keys POST Error]", { error: error })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "API 키 생성 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const keyId = searchParams.get("id")

    if (!keyId) {
      return NextResponse.json(
        { error: { code: "MISSING_KEY_ID", message: "keyId가 필요합니다." } },
        { status: 400 }
      )
    }

    const keyIndex = MOCK_KEYS.findIndex((k) => k.id === keyId)
    if (keyIndex === -1) {
      return NextResponse.json(
        { error: { code: "KEY_NOT_FOUND", message: "API 키를 찾을 수 없습니다." } },
        { status: 404 }
      )
    }

    if (MOCK_KEYS[keyIndex].status === "revoked") {
      return NextResponse.json(
        { error: { code: "ALREADY_REVOKED", message: "이미 폐기된 API 키입니다." } },
        { status: 400 }
      )
    }

    MOCK_KEYS[keyIndex].status = "revoked"

    return NextResponse.json({
      success: true,
      message: `API 키 "${MOCK_KEYS[keyIndex].name}"이(가) 폐기되었습니다.`,
      revokedAt: new Date().toISOString(),
    })
  } catch (error) {
    logger.error("[Developer Keys DELETE Error]", { error: error })
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "API 키 폐기 중 오류가 발생했습니다." } },
      { status: 500 }
    )
  }
}
