import { NextRequest, NextResponse } from "next/server"
import { Errors, fromUnknown } from '@/lib/api-error'
import { alertSettingSchema, validateBody } from "@/lib/validations"

// In-memory store (resets on server restart — replace with DB in production)
let mockAlerts: Record<string, unknown>[] = [
  {
    id: "alert-001",
    name: "서울 아파트 NPL 알림",
    is_active: true,
    frequency: "IMMEDIATE",
    conditions: {
      market_types: ["NON_AUCTION_NPL"],
      regions: ["서울특별시"],
      collateral_types: ["APARTMENT"],
      price_range: { min: 500000000, max: 3000000000 },
      min_discount: 20,
    },
    channels: { email: true, push: true, kakao: false, in_app: true },
    last_triggered_at: "2026-03-18T09:00:00Z",
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-18T09:00:00Z",
  },
  {
    id: "alert-002",
    name: "경기도 상업용 매물 알림",
    is_active: false,
    frequency: "DAILY",
    conditions: {
      market_types: ["AUCTION_NPL"],
      regions: ["경기도"],
      collateral_types: ["COMMERCIAL"],
      price_range: { min: 0, max: 5000000000 },
      min_discount: 30,
    },
    channels: { email: true, push: false, kakao: false, in_app: true },
    last_triggered_at: null,
    created_at: "2026-02-15T14:00:00Z",
    updated_at: "2026-02-15T14:00:00Z",
  },
]

// GET /api/v1/alerts — list all alert settings for the current user
export async function GET(_req: NextRequest) {
  return NextResponse.json({ data: mockAlerts, total: mockAlerts.length })
}

// POST /api/v1/alerts — create a new alert (or update if _action === "update")
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Handle inline update (toggle is_active, etc.)
    if (body._action === "update") {
      const { _action, ...updates } = body
      const idx = mockAlerts.findIndex((a) => a.id === updates.id)
      if (idx !== -1) {
        mockAlerts[idx] = {
          ...mockAlerts[idx],
          ...updates,
          updated_at: new Date().toISOString(),
        }
        return NextResponse.json({ data: mockAlerts[idx] })
      }
      return Errors.notFound('Alert not found')
    }

    // Validate new alert
    const validation = validateBody(alertSettingSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: validation.error } },
        { status: 400 }
      )
    }

    const v = validation.data

    // Create new alert
    const newAlert = {
      id: `alert-${Date.now()}`,
      name: v.name,
      is_active: v.is_active,
      frequency: v.frequency,
      conditions: v.conditions,
      channels: v.channels,
      last_triggered_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    mockAlerts = [newAlert, ...mockAlerts]
    return NextResponse.json({ data: newAlert }, { status: 201 })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}
