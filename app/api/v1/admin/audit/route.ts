import { NextRequest, NextResponse } from "next/server"
import { getAuthUserWithRole } from "@/lib/auth/get-user"
import { getSupabaseAdmin } from "@/lib/supabase/server"
import { detectAnomalies } from "@/lib/audit-log"

/**
 * GET /api/v1/admin/audit
 *   Query params:
 *     - range: "today" | "7d" | "30d" | "all"   (default: "7d")
 *     - severity: "ALERT" | "WATCH" | "NORMAL" | "ALL"
 *     - action: "VIEW" | "DOWNLOAD" | ...
 *     - format: "json" | "csv"   (default: json)
 *     - limit: integer (default 200, max 5000)
 *
 * Returns paginated audit log rows + anomaly alerts.
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUserWithRole()
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN", message: "관리자만 접근할 수 있습니다." } },
      { status: 403 },
    )
  }

  const sp = req.nextUrl.searchParams
  const range = sp.get("range") ?? "7d"
  const severity = sp.get("severity") ?? "ALL"
  const action = sp.get("action")
  const format = sp.get("format") ?? "json"
  const limit = Math.min(Number(sp.get("limit") ?? 200), 5000)

  // Compute window
  const now = Date.now()
  const windowMs: Record<string, number | null> = {
    today: 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
    all: null,
  }
  const cutoff = windowMs[range]
    ? new Date(now - (windowMs[range] as number)).toISOString()
    : null

  const supabase = getSupabaseAdmin()

  // Try pii_audit_logs first, fall back to audit_logs
  let rows: any[] = []
  try {
    let q = supabase
      .from("pii_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (cutoff) q = q.gte("created_at", cutoff)
    if (severity !== "ALL") q = q.eq("severity", severity)
    if (action) q = q.eq("action", action)
    const { data, error } = await q
    if (!error && data) rows = data
  } catch {
    /* ignore */
  }

  if (!rows.length) {
    let q = supabase
      .from("audit_logs")
      .select("id, user_id, action, entity_id, detail, ip_address, user_agent, created_at")
      .order("created_at", { ascending: false })
      .limit(limit)
    if (cutoff) q = q.gte("created_at", cutoff)
    if (action) q = q.eq("action", action)
    const { data } = await q
    rows = data ?? []
  }

  const anomalies = detectAnomalies(60)

  if (format === "csv") {
    const header = [
      "id", "created_at", "user_id", "action",
      "target_table", "target_id", "field_name",
      "access_tier", "severity", "ip_address", "user_agent",
    ]
    const escape = (v: unknown) => {
      if (v == null) return ""
      const s = String(v).replace(/"/g, '""')
      return `"${s}"`
    }
    const lines = [header.join(",")]
    for (const r of rows) {
      lines.push([
        r.id, r.created_at, r.user_id ?? r.user,
        r.action ?? r.access_type, r.target_table ?? "",
        r.target_id ?? r.entity_id ?? "", r.field_name ?? r.field ?? "",
        r.access_tier ?? r.field_tier ?? "",
        r.severity ?? "",
        r.ip_address ?? r.ip ?? "",
        r.user_agent ?? r.ua ?? "",
      ].map(escape).join(","))
    }
    const csv = lines.join("\n")
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-log-${range}-${Date.now()}.csv"`,
      },
    })
  }

  return NextResponse.json({
    ok: true,
    data: {
      rows,
      total: rows.length,
      anomalies,
      range,
    },
  })
}
