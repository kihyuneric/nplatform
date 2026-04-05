import { NextResponse } from "next/server"
import { Errors, fromUnknown } from '@/lib/api-error'
import {
  isSampleMode,
  getMemoryStoreRef,
  getLoadedTables,
  clearMemoryTable,
  reloadSampleTable,
} from "@/lib/data-layer"

// All known table names in the system
const ALL_TABLES = [
  "deal_listings",
  "deals",
  "users",
  "professionals",
  "consultations",
  "notices",
  "community_posts",
  "posts",
  "notifications",
  "coupons",
  "referral_codes",
  "deal_messages",
  "credit_transactions",
  "banners",
  "support_tickets",
  "demands",
  "approvals",
  "contracts",
  "consultation_reviews",
  "invoices",
  "search_logs",
]

/**
 * GET: Return data statistics (table name, record count, isSample flag)
 */
export async function GET() {
  const isSample = await isSampleMode()
  const store = getMemoryStoreRef()
  const loadedTables = getLoadedTables()

  const tables = ALL_TABLES.map((table) => ({
    name: table,
    count: store[table]?.length ?? 0,
    loaded: loadedTables.includes(table),
    isSample: isSample,
  }))

  const totalRecords = tables.reduce((sum, t) => sum + t.count, 0)

  return NextResponse.json({
    isSample,
    totalTables: tables.filter((t) => t.count > 0).length,
    totalRecords,
    tables,
  })
}

/**
 * DELETE: Clear all sample data from memory store (for production transition)
 */
export async function DELETE() {
  const loadedTables = getLoadedTables()
  const cleared: string[] = []

  for (const table of loadedTables) {
    clearMemoryTable(table)
    cleared.push(table)
  }

  return NextResponse.json({
    success: true,
    cleared,
    message: `${cleared.length}개 테이블의 샘플 데이터가 삭제되었습니다.`,
  })
}

/**
 * POST: Reload sample data from files
 * Body: { action: "reset" } or { action: "reset", tables: ["deals", "users"] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.action !== "reset") {
      return NextResponse.json(
        { error: "Invalid action. Use 'reset'." },
        { status: 400 }
      )
    }

    const tablesToReset: string[] = body.tables && Array.isArray(body.tables)
      ? body.tables.filter((t: string) => ALL_TABLES.includes(t))
      : ALL_TABLES

    const reloaded: string[] = []
    for (const table of tablesToReset) {
      reloadSampleTable(table)
      reloaded.push(table)
    }

    return NextResponse.json({
      success: true,
      reloaded,
      message: `${reloaded.length}개 테이블의 샘플 데이터가 재로드되었습니다.`,
    })
  } catch {
    return Errors.badRequest('Invalid request body')
  }
}
