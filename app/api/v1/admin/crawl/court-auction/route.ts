import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAuthUserWithRole } from "@/lib/auth/get-user"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { crawlCourtAuctions, toNplListingInsert } from "@/lib/crawlers/court-auction"

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  region: z.string().optional(),
  property_type: z.string().optional(),
  auto_import: z.coerce.boolean().default(false),
})

/**
 * GET /api/v1/admin/crawl/court-auction
 *   법원 경매 공시 목록 조회.
 *   auto_import=true 시 DRAFT 상태로 npl_listings에 자동 삽입.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUserWithRole()
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN" } },
      { status: 403 },
    )
  }

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries())
  const parsed = QuerySchema.safeParse(sp)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } },
      { status: 400 },
    )
  }

  const { page, per_page, region, property_type, auto_import } = parsed.data

  try {
    const result = await crawlCourtAuctions({
      page,
      perPage: per_page,
      region,
      propertyType: property_type,
    })

    let imported = 0
    let skipped = 0

    if (auto_import && result.items.length > 0) {
      const supabase = getSupabaseAdmin()
      const rows = result.items
        .filter(item => item.status === "진행")
        .map(item => toNplListingInsert(item, user.id))

      // Upsert by case_number to avoid duplicates
      const { data: inserted, error } = await supabase
        .from("npl_listings")
        .upsert(rows, {
          onConflict: "case_number",
          ignoreDuplicates: true,
        })
        .select("id")

      if (error) {
        console.error("[court-auction crawl] upsert error:", error)
      } else {
        imported = inserted?.length ?? rows.length
        skipped = rows.length - imported
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        auto_import: auto_import
          ? { imported, skipped, total_crawled: result.items.length }
          : undefined,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { ok: false, error: { code: "CRAWL_FAILED", message: msg } },
      { status: 500 },
    )
  }
}
