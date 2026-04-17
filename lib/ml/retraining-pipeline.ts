/**
 * lib/ml/retraining-pipeline.ts
 *
 * Weekly model retraining pipeline for NPL price/risk predictors.
 *
 * Flow:
 *  1. Collect completed deals from Supabase (last 90 days)
 *  2. For each deal, compare predicted vs actual (price, recovery, days_to_close)
 *  3. Compute MAPE / accuracy / F1 deltas
 *  4. Update `model_registry` table with new metrics
 *  5. If new metrics are better than active version → auto-promote "shadow" → "active"
 *  6. Write report to `ml_training_runs` table
 *
 * This is a LIGHTWEIGHT retraining coordinator — actual model fitting is done
 * in an external Python job (cron) that reads `ml_training_runs.status = 'requested'`.
 * This module just prepares data and tracks status.
 */

import { getSupabaseAdmin } from "@/lib/supabase/server"

const createServiceClient = () => getSupabaseAdmin()

export interface TrainingRun {
  id: string
  model_type: "price" | "risk" | "matching" | "recovery"
  status: "requested" | "running" | "completed" | "failed"
  sample_count: number
  metrics_before?: Record<string, number>
  metrics_after?: Record<string, number>
  started_at: string
  finished_at?: string
  error?: string
  promoted_version?: string
}

interface CompletedDealRow {
  id: string
  listing_id: string
  agreed_price: number
  recovery_amount: number | null
  days_to_close: number
  predicted_price?: number
  predicted_recovery?: number
  collateral_type: string
  risk_grade_predicted?: string
  risk_grade_actual?: string
  completed_at: string
}

/* ── Data collection ──────────────────────────────────────── */

export async function collectCompletedDeals(daysBack = 90): Promise<CompletedDealRow[]> {
  const supabase = createServiceClient()
  const since = new Date(Date.now() - daysBack * 86400 * 1000).toISOString()

  const { data, error } = await supabase
    .from("deals")
    .select(`
      id, listing_id, agreed_price, recovery_amount, days_to_close,
      predicted_price, predicted_recovery,
      risk_grade_predicted, risk_grade_actual,
      completed_at,
      npl_listings(collateral_type)
    `)
    .eq("stage", "COMPLETED")
    .gte("completed_at", since)
    .order("completed_at", { ascending: false })
    .limit(5000)

  if (error) throw error
  return (data ?? []).map((d: any) => ({
    id: d.id,
    listing_id: d.listing_id,
    agreed_price: d.agreed_price ?? 0,
    recovery_amount: d.recovery_amount,
    days_to_close: d.days_to_close ?? 0,
    predicted_price: d.predicted_price,
    predicted_recovery: d.predicted_recovery,
    collateral_type: d.npl_listings?.collateral_type ?? "",
    risk_grade_predicted: d.risk_grade_predicted,
    risk_grade_actual: d.risk_grade_actual,
    completed_at: d.completed_at,
  }))
}

/* ── Metric computations ─────────────────────────────────── */

/** Mean Absolute Percentage Error */
export function computeMAPE(pairs: Array<{ predicted: number; actual: number }>): number {
  const valid = pairs.filter((p) => p.actual > 0 && Number.isFinite(p.predicted))
  if (!valid.length) return 0
  const sum = valid.reduce(
    (acc, { predicted, actual }) => acc + Math.abs((predicted - actual) / actual),
    0,
  )
  return (sum / valid.length) * 100
}

/** Classification accuracy */
export function computeAccuracy(pairs: Array<{ predicted: string; actual: string }>): number {
  if (!pairs.length) return 0
  const hits = pairs.filter((p) => p.predicted === p.actual).length
  return hits / pairs.length
}

/** Confusion matrix → macro-F1 for multi-class */
export function computeF1(pairs: Array<{ predicted: string; actual: string }>): number {
  if (!pairs.length) return 0
  const classes = Array.from(new Set(pairs.flatMap((p) => [p.predicted, p.actual])))
  const f1s = classes.map((c) => {
    const tp = pairs.filter((p) => p.predicted === c && p.actual === c).length
    const fp = pairs.filter((p) => p.predicted === c && p.actual !== c).length
    const fn = pairs.filter((p) => p.predicted !== c && p.actual === c).length
    const precision = tp / (tp + fp || 1)
    const recall = tp / (tp + fn || 1)
    return (2 * precision * recall) / (precision + recall || 1)
  })
  return f1s.reduce((a, b) => a + b, 0) / f1s.length
}

/* ── Retraining coordinator ──────────────────────────────── */

export async function runRetrainingCycle(
  modelType: "price" | "risk" | "recovery" = "price",
): Promise<TrainingRun> {
  const supabase = createServiceClient()
  const runId = `run_${Date.now()}_${modelType}`
  const startedAt = new Date().toISOString()

  // Record start
  await supabase.from("ml_training_runs").insert({
    id: runId,
    model_type: modelType,
    status: "running",
    started_at: startedAt,
  })

  try {
    const deals = await collectCompletedDeals(90)
    if (deals.length < 30) {
      await supabase
        .from("ml_training_runs")
        .update({
          status: "failed",
          error: `Insufficient samples: ${deals.length} < 30`,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId)
      throw new Error(`Not enough completed deals: ${deals.length}`)
    }

    let metricsAfter: Record<string, number> = {}

    if (modelType === "price") {
      const pairs = deals
        .filter((d) => d.predicted_price && d.agreed_price)
        .map((d) => ({ predicted: d.predicted_price!, actual: d.agreed_price }))
      metricsAfter = {
        mape: computeMAPE(pairs),
        sample_count: pairs.length,
      }
    } else if (modelType === "risk") {
      const pairs = deals
        .filter((d) => d.risk_grade_predicted && d.risk_grade_actual)
        .map((d) => ({ predicted: d.risk_grade_predicted!, actual: d.risk_grade_actual! }))
      metricsAfter = {
        accuracy: computeAccuracy(pairs),
        f1_score: computeF1(pairs),
        sample_count: pairs.length,
      }
    } else if (modelType === "recovery") {
      const pairs = deals
        .filter((d) => d.predicted_recovery && d.recovery_amount)
        .map((d) => ({ predicted: d.predicted_recovery!, actual: d.recovery_amount! }))
      metricsAfter = {
        mape: computeMAPE(pairs),
        sample_count: pairs.length,
      }
    }

    // Fetch current active version
    const { data: activeVersion } = await supabase
      .from("model_registry")
      .select("*")
      .eq("model_type", modelType)
      .eq("status", "active")
      .maybeSingle()

    const metricsBefore = activeVersion?.metrics ?? {}

    // Decide promotion: lower MAPE or higher F1/accuracy is better
    let promotedVersion: string | undefined
    const isBetter =
      modelType === "price" || modelType === "recovery"
        ? (metricsAfter.mape ?? Infinity) < (metricsBefore.mape ?? Infinity)
        : (metricsAfter.f1_score ?? 0) > (metricsBefore.f1_score ?? 0)

    if (isBetter && activeVersion) {
      const newVersion = bumpVersion(activeVersion.version)
      promotedVersion = newVersion
      await supabase.from("model_registry").insert({
        model_type: modelType,
        version: newVersion,
        status: "shadow",
        algorithm: activeVersion.algorithm,
        metrics: metricsAfter,
        created_at: new Date().toISOString(),
        traffic_pct: 10, // start with 10% shadow traffic
      })
    }

    const finishedAt = new Date().toISOString()
    await supabase
      .from("ml_training_runs")
      .update({
        status: "completed",
        sample_count: deals.length,
        metrics_before: metricsBefore,
        metrics_after: metricsAfter,
        promoted_version: promotedVersion,
        finished_at: finishedAt,
      })
      .eq("id", runId)

    return {
      id: runId,
      model_type: modelType,
      status: "completed",
      sample_count: deals.length,
      metrics_before: metricsBefore,
      metrics_after: metricsAfter,
      started_at: startedAt,
      finished_at: finishedAt,
      promoted_version: promotedVersion,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await supabase
      .from("ml_training_runs")
      .update({ status: "failed", error: msg, finished_at: new Date().toISOString() })
      .eq("id", runId)
    throw err
  }
}

function bumpVersion(v: string): string {
  const parts = v.split(".").map(Number)
  parts[2] = (parts[2] ?? 0) + 1
  return parts.join(".")
}

/* ── Report aggregation ──────────────────────────────────── */

export async function getRecentTrainingRuns(limit = 20): Promise<TrainingRun[]> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("ml_training_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit)
  return (data ?? []) as TrainingRun[]
}
