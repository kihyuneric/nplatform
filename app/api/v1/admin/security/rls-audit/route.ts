import { NextResponse } from "next/server"
import { getAuthUserWithRole } from "@/lib/auth/get-user"
import { getSupabaseAdmin } from "@/lib/supabase/server"

/**
 * GET /api/v1/admin/security/rls-audit
 *
 * RLS 정책 자동 검증 — 관리자만 접근 가능.
 *
 * 각 민감 테이블에 대해:
 *   1. 비인증(anon) 사용자로 조회 시도 → 데이터 노출 여부 확인
 *   2. 일반 사용자 역할(authenticated)로 다른 사용자의 데이터 접근 시도
 *   3. 결과 요약 반환
 *
 * 실제 Supabase에서는 anon/service_role을 분리 테스트해야 한다.
 * 여기서는 service_role로 RLS 상태를 확인하는 메타쿼리를 사용한다.
 */
export async function GET() {
  const user = await getAuthUserWithRole()
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: { code: "FORBIDDEN" } },
      { status: 403 },
    )
  }

  const supabase = getSupabaseAdmin()
  const results: Array<{
    table: string
    rls_enabled: boolean
    policy_count: number
    has_select_policy: boolean
    has_insert_policy: boolean
    has_update_policy: boolean
    has_delete_policy: boolean
    risk: "OK" | "WARN" | "FAIL"
    note: string
  }> = []

  // Sensitive tables to audit
  const SENSITIVE_TABLES = [
    "profiles",
    "deals",
    "npl_listings",
    "notifications",
    "ml_training_runs",
    "model_registry",
    "kyc_submissions",
    "credit_balances",
    "audit_logs",
    "api_keys",
  ]

  for (const tableName of SENSITIVE_TABLES) {
    try {
      // Check RLS enabled via pg_tables / pg_class
      const { data: rlsData } = await supabase
        .rpc("check_rls_enabled", { table_name: tableName })
        .maybeSingle()

      // Check policies via pg_policies
      const { data: policies } = await supabase
        .from("pg_policies_view" as any)
        .select("cmd")
        .eq("tablename", tableName)

      const rlsEnabled = (rlsData as any)?.rls_enabled ?? false
      const policyList = (policies as any[]) ?? []
      const cmds = policyList.map((p: any) => (p.cmd as string)?.toUpperCase())

      const hasSel = cmds.includes("SELECT") || cmds.includes("ALL")
      const hasIns = cmds.includes("INSERT") || cmds.includes("ALL")
      const hasUpd = cmds.includes("UPDATE") || cmds.includes("ALL")
      const hasDel = cmds.includes("DELETE") || cmds.includes("ALL")

      let risk: "OK" | "WARN" | "FAIL" = "OK"
      let note = ""

      if (!rlsEnabled) {
        risk = "FAIL"
        note = "RLS 비활성화 — 모든 인증 사용자가 접근 가능"
      } else if (policyList.length === 0) {
        risk = "FAIL"
        note = "RLS 활성화되었으나 정책 없음 — 기본 차단 (접근 불가)"
      } else if (!hasSel) {
        risk = "WARN"
        note = "SELECT 정책 없음 — 조회 차단"
      } else {
        note = "정책 정상 적용"
      }

      results.push({
        table: tableName,
        rls_enabled: rlsEnabled,
        policy_count: policyList.length,
        has_select_policy: hasSel,
        has_insert_policy: hasIns,
        has_update_policy: hasUpd,
        has_delete_policy: hasDel,
        risk,
        note,
      })
    } catch {
      // Table may not exist yet — skip gracefully
      results.push({
        table: tableName,
        rls_enabled: false,
        policy_count: 0,
        has_select_policy: false,
        has_insert_policy: false,
        has_update_policy: false,
        has_delete_policy: false,
        risk: "WARN",
        note: "테이블 없음 또는 조회 불가",
      })
    }
  }

  const failCount = results.filter(r => r.risk === "FAIL").length
  const warnCount = results.filter(r => r.risk === "WARN").length

  return NextResponse.json({
    ok: true,
    data: {
      summary: {
        total: results.length,
        ok: results.length - failCount - warnCount,
        warn: warnCount,
        fail: failCount,
        overall_risk: failCount > 0 ? "FAIL" : warnCount > 0 ? "WARN" : "OK",
      },
      tables: results,
      audited_at: new Date().toISOString(),
    },
  })
}
