import { NextRequest, NextResponse } from "next/server"
import { Errors } from '@/lib/api-error'
import {
  isSampleMode,
  getMemoryStoreRef,
  getLoadedTables,
  clearMemoryTable,
  reloadSampleTable,
} from "@/lib/data-layer"
import { runRetrainingCycle } from "@/lib/ml/retraining-pipeline"

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

// Job name → retraining model_type mapping
const JOB_TO_MODEL: Record<string, "price" | "risk" | "recovery"> = {
  "AI 모델 재학습":     "price",
  "가격 예측 재학습":   "price",
  "리스크 모델 재학습": "risk",
  "회수율 예측 재학습": "recovery",
}

/**
 * POST: Reload sample data / trigger ML retraining job
 * Body: { action: "reset" }                          — 샘플 데이터 재로드
 * Body: { action: "run_job", job: "<job name>" }     — ML 재학습 작업 실행
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // ── ML 재학습 작업 실행 ───────────────────────────────────────────────────
    if (body.action === "run_job") {
      const jobName = body.job as string | undefined
      const modelType = jobName ? JOB_TO_MODEL[jobName] : undefined

      if (modelType) {
        try {
          const run = await runRetrainingCycle(modelType)
          return NextResponse.json({
            success: true,
            run,
            message: `${jobName} 실행이 완료됐습니다.`,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          return NextResponse.json({ success: false, error: msg }, { status: 500 })
        }
      }

      // 재학습 외 일반 작업 — 성공으로 응답 (실제 크롤러 등은 별도 cron에서 처리)
      return NextResponse.json({
        success: true,
        message: `${jobName ?? '작업'} 실행 요청이 접수됐습니다.`,
      })
    }

    // ── 샘플 데이터 재로드 ───────────────────────────────────────────────────
    if (body.action !== "reset") {
      return NextResponse.json(
        { error: "Invalid action. Use 'reset' or 'run_job'." },
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
