import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getAuthUserWithRole } from "@/lib/auth/get-user"
import { getSupabaseAdmin } from "@/lib/supabase/server"

/**
 * GET /api/v1/institutional/portfolio
 *
 * 기관 투자자 전용 포트폴리오 Bulk API.
 * 일반 /buyer/portfolio와 달리:
 *   - 최대 5,000건 조회 지원 (대량 데이터)
 *   - 집계 통계 포함 (지역별, 유형별, 리스크등급별)
 *   - CSV/JSON 내보내기 형식 지원
 *   - 기관 전용 필드 (채권금액, 회수예상액 등) 포함
 *
 * 인증: Bearer JWT 필수. profiles.investor_tier >= 2 (전문 투자자 이상)
 */

const QuerySchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  stage: z.string().optional(), // INITIAL|NDA|LOI|DD|CONTRACT|CLOSING|COMPLETED|CANCELED
  from: z.string().optional(), // ISO date
  to: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(5000).default(500),
  offset: z.coerce.number().int().min(0).default(0),
  include_stats: z.coerce.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const user = await getAuthUserWithRole()
  if (!user) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHORIZED" } }, { status: 401 })
  }

  // Require tier L2+ (professional / institutional investor)
  const userTier = (user as any).investor_tier ?? 0
  if (userTier < 2 && user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { code: "TIER_REQUIRED", message: "전문 투자자(L2) 이상만 이용 가능합니다." } },
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

  const { format, stage, from, to, limit, offset, include_stats } = parsed.data
  const supabase = getSupabaseAdmin()

  // ── Fetch deals ───────────────────────────────────────────────────────
  let query = supabase
    .from("deals")
    .select(`
      id, stage, agreed_price, created_at, updated_at,
      listing_id, seller_id,
      predicted_price, predicted_recovery, recovery_amount,
      days_to_close, risk_grade_predicted, risk_grade_actual,
      completed_at,
      npl_listings(
        title, collateral_type, address,
        location_city, location_district,
        principal_amount, appraised_value, discount_rate,
        risk_grade, institution
      )
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (stage) query = query.eq("stage", stage)
  if (from) query = query.gte("created_at", from)
  if (to) query = query.lte("created_at", to)

  const { data: deals, error, count } = await query
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "FETCH_FAILED", message: error.message } },
      { status: 500 },
    )
  }

  const rows = (deals ?? []) as any[]

  // ── Aggregate stats ───────────────────────────────────────────────────
  let stats: Record<string, unknown> | null = null
  if (include_stats) {
    const allDeals = rows
    const totalPrincipal = allDeals.reduce(
      (s, d) => s + (d.npl_listings?.principal_amount ?? 0), 0
    )
    const totalAgreedPrice = allDeals.reduce((s, d) => s + (d.agreed_price ?? 0), 0)
    const completed = allDeals.filter(d => d.stage === "COMPLETED")
    const avgDaysToClose = completed.length > 0
      ? Math.round(completed.reduce((s, d) => s + (d.days_to_close ?? 0), 0) / completed.length)
      : 0

    // By collateral type
    const byType: Record<string, { count: number; principal: number }> = {}
    for (const d of allDeals) {
      const ct = d.npl_listings?.collateral_type ?? "기타"
      if (!byType[ct]) byType[ct] = { count: 0, principal: 0 }
      byType[ct].count++
      byType[ct].principal += d.npl_listings?.principal_amount ?? 0
    }

    // By region
    const byRegion: Record<string, number> = {}
    for (const d of allDeals) {
      const city = d.npl_listings?.location_city ?? "기타"
      byRegion[city] = (byRegion[city] ?? 0) + 1
    }

    // By risk grade
    const byGrade: Record<string, number> = {}
    for (const d of allDeals) {
      const g = d.npl_listings?.risk_grade ?? d.risk_grade_actual ?? "N/A"
      byGrade[g] = (byGrade[g] ?? 0) + 1
    }

    stats = {
      total_deals: allDeals.length,
      total_principal_amount: totalPrincipal,
      total_agreed_price: totalAgreedPrice,
      avg_discount_pct: totalPrincipal > 0
        ? Math.round((1 - totalAgreedPrice / totalPrincipal) * 100)
        : 0,
      avg_days_to_close: avgDaysToClose,
      completed_count: completed.length,
      by_collateral_type: byType,
      by_region: byRegion,
      by_risk_grade: byGrade,
    }
  }

  // ── CSV format ────────────────────────────────────────────────────────
  if (format === "csv") {
    const escape = (v: unknown) => {
      if (v == null) return ""
      const s = String(v).replace(/"/g, '""')
      return `"${s}"`
    }
    const header = [
      "id", "stage", "agreed_price", "created_at", "completed_at",
      "title", "collateral_type", "address", "principal_amount",
      "appraised_value", "discount_rate", "risk_grade",
      "days_to_close", "recovery_amount", "institution",
    ]
    const lines = [header.join(",")]
    for (const d of rows) {
      const nl = d.npl_listings ?? {}
      lines.push([
        d.id, d.stage, d.agreed_price, d.created_at, d.completed_at,
        nl.title, nl.collateral_type, nl.address, nl.principal_amount,
        nl.appraised_value, nl.discount_rate, nl.risk_grade,
        d.days_to_close, d.recovery_amount, nl.institution,
      ].map(escape).join(","))
    }
    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="institutional-portfolio-${Date.now()}.csv"`,
      },
    })
  }

  return NextResponse.json({
    ok: true,
    data: {
      deals: rows,
      pagination: { total: count ?? rows.length, offset, limit },
      stats,
    },
  })
}
