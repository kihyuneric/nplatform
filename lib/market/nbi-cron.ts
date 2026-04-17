// ─── NBI (NPL Bid Index) Cron ───────────────────────────────
// 매일 00:30 KST 실행 — court_auction_listings의 SOLD 데이터를 집계해
// nbi_snapshots(month × region × property_type) 갱신.
//
// 알고리즘:
//   1. 최근 90일 SOLD 매물 쿼리
//   2. (snapshot_month, region, property_type) 그룹화
//   3. trimmed mean (1.5×IQR fence) 으로 outlier 제거
//   4. NBI = 평균낙찰가율 × 100 (기준 2024-01 = 100 정규화)
//   5. mom_change / yoy_change / trend 계산
//   6. UPSERT nbi_snapshots
//   7. pipeline_runs 로그
//
// 호출자: app/api/v1/cron/nbi/route.ts (Vercel Cron / GitHub Actions)

export type Trend = "rising" | "falling" | "stable"

export interface AuctionSold {
  id: string
  result_at: string         // ISO date
  sido: string
  property_type: string
  appraised_value: number
  winning_bid: number | null
  winning_bid_rate: number | null
}

export interface NbiSnapshot {
  snapshot_date:    string  // YYYY-MM-01
  region:           string
  property_type:    string
  nbi_value:        number
  avg_bid_ratio:    number
  median_bid_ratio: number
  sample_count:     number
  mom_change:       number | null
  yoy_change:       number | null
  trend:            Trend
}

// ─── 통계 헬퍼 ────────────────────────────────────────
function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo])
}

function trimmedMean(xs: number[]): number {
  if (xs.length === 0) return 0
  if (xs.length < 4) return xs.reduce((s, v) => s + v, 0) / xs.length
  const q1 = quantile(xs, 0.25)
  const q3 = quantile(xs, 0.75)
  const iqr = q3 - q1
  const lo = q1 - 1.5 * iqr
  const hi = q3 + 1.5 * iqr
  const trimmed = xs.filter(v => v >= lo && v <= hi)
  if (trimmed.length === 0) return xs.reduce((s, v) => s + v, 0) / xs.length
  return trimmed.reduce((s, v) => s + v, 0) / trimmed.length
}

// ─── 월키 ────────────────────────────────────────────
function monthKey(iso: string): string {
  // YYYY-MM-01
  return iso.slice(0, 7) + "-01"
}

function shiftMonths(monthIso: string, delta: number): string {
  const d = new Date(monthIso)
  d.setMonth(d.getMonth() + delta)
  return d.toISOString().slice(0, 7) + "-01"
}

function classifyTrend(curr: number, prev: number | null): Trend {
  if (prev == null) return "stable"
  const pct = ((curr - prev) / prev) * 100
  if (pct >= 1.5) return "rising"
  if (pct <= -1.5) return "falling"
  return "stable"
}

// ─── 핵심 집계 ─────────────────────────────────────────
// NBI 기준 100 = 낙찰가율 80% 가정 (KAMCO 시계열 정규화 관례)
const NBI_BASE_RATIO = 0.80

export function computeSnapshots(
  rows: AuctionSold[],
  prevSnapshots: NbiSnapshot[] = [],
): NbiSnapshot[] {
  // group by (month, region, type)
  const groups = new Map<string, AuctionSold[]>()
  for (const r of rows) {
    if (!r.winning_bid_rate || r.winning_bid_rate <= 0) continue
    const key = `${monthKey(r.result_at)}__${r.sido}__${r.property_type}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(r)
  }

  // prev snapshot lookup (for mom/yoy)
  const prevMap = new Map<string, NbiSnapshot>()
  for (const s of prevSnapshots) {
    prevMap.set(`${s.snapshot_date}__${s.region}__${s.property_type}`, s)
  }

  const out: NbiSnapshot[] = []
  for (const [key, members] of groups.entries()) {
    const [snapshot_date, region, property_type] = key.split("__")
    const ratios = members.map(m => m.winning_bid_rate!)
    const avg = +trimmedMean(ratios).toFixed(4)
    const med = +median(ratios).toFixed(4)
    const nbi = +((avg / NBI_BASE_RATIO) * 100).toFixed(2)

    const momKey = `${shiftMonths(snapshot_date, -1)}__${region}__${property_type}`
    const yoyKey = `${shiftMonths(snapshot_date, -12)}__${region}__${property_type}`
    const momPrev = prevMap.get(momKey)?.nbi_value ?? null
    const yoyPrev = prevMap.get(yoyKey)?.nbi_value ?? null

    const mom_change = momPrev != null ? +(((nbi - momPrev) / momPrev) * 100).toFixed(3) : null
    const yoy_change = yoyPrev != null ? +(((nbi - yoyPrev) / yoyPrev) * 100).toFixed(3) : null
    const trend = classifyTrend(nbi, momPrev)

    out.push({
      snapshot_date,
      region,
      property_type,
      nbi_value:        nbi,
      avg_bid_ratio:    +(avg * 100).toFixed(3),
      median_bid_ratio: +(med * 100).toFixed(3),
      sample_count:     members.length,
      mom_change,
      yoy_change,
      trend,
    })
  }
  return out
}

// ─── Supabase 어댑터 ───────────────────────────────────
// 동적 builder 체이닝(.gte().not()) 호환을 위해 from()은 any 리턴.
// 호출자에서 실제 SupabaseClient를 넘기면 됨.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = { from: (table: string) => any }

export interface NbiCronResult {
  status: "success" | "partial" | "failed"
  scanned_rows: number
  groups_computed: number
  upserted: number
  duration_ms: number
  errors: string[]
}

const LOOKBACK_DAYS = 90

export async function runNbiCron(sb: SupabaseLike): Promise<NbiCronResult> {
  const t0 = Date.now()
  const errors: string[] = []
  let runId: string | null = null

  // 1) pipeline_runs start
  try {
    const { data: runRow } = await sb.from("pipeline_runs").insert({
      mode: "daily",
      status: "running",
      triggered_by: "cron",
      started_at: new Date().toISOString(),
    }) as unknown as { data: Array<{ id: string }> | null }
    if (runRow && runRow.length > 0) runId = runRow[0].id
  } catch (e) {
    errors.push(`pipeline_runs start: ${(e as Error).message}`)
  }

  // 2) 최근 LOOKBACK_DAYS SOLD 매물
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString().slice(0, 10)
  const fetchRes = await sb
    .from("court_auction_listings")
    .select("id,result_at,sido,property_type,appraised_value,winning_bid,winning_bid_rate")
    .gte("result_at", since)
    .not("winning_bid_rate", "is", null) as { data: AuctionSold[] | null; error: { message: string } | null }

  if (fetchRes.error) {
    errors.push(`fetch: ${fetchRes.error.message}`)
    return {
      status: "failed",
      scanned_rows: 0,
      groups_computed: 0,
      upserted: 0,
      duration_ms: Date.now() - t0,
      errors,
    }
  }
  const rows = fetchRes.data ?? []

  // 3) 직전 스냅샷 (mom/yoy 비교)
  const prevRes = await sb.from("nbi_snapshots").select("*") as unknown as {
    data: NbiSnapshot[] | null
    error: { message: string } | null
  }
  if (prevRes.error) errors.push(`prev: ${prevRes.error.message}`)
  const prev = prevRes.data ?? []

  // 4) 집계
  const snapshots = computeSnapshots(rows, prev)

  // 5) UPSERT
  let upserted = 0
  if (snapshots.length > 0) {
    const upRes = await sb
      .from("nbi_snapshots")
      .upsert(snapshots, { onConflict: "snapshot_date,region,property_type" })
    if ((upRes as { error: { message: string } | null }).error) {
      errors.push(`upsert: ${(upRes as { error: { message: string } }).error.message}`)
    } else {
      upserted = snapshots.length
    }
  }

  // 6) pipeline_runs finish
  const duration = Date.now() - t0
  const status: NbiCronResult["status"] = errors.length === 0 ? "success" : upserted > 0 ? "partial" : "failed"
  if (runId) {
    try {
      await sb.from("pipeline_runs").update({
        status,
        steps_total: 4,
        steps_success: 4 - errors.length,
        steps_failed: errors.length,
        nbi_periods_computed: snapshots.length,
        auctions_fetched: rows.length,
        finished_at: new Date().toISOString(),
        duration_ms: duration,
        error_messages: errors.length > 0 ? errors : null,
      }).eq("id", runId)
    } catch (e) {
      errors.push(`pipeline_runs finish: ${(e as Error).message}`)
    }
  }

  return {
    status,
    scanned_rows: rows.length,
    groups_computed: snapshots.length,
    upserted,
    duration_ms: duration,
    errors,
  }
}

export const __test__ = {
  median,
  quantile,
  trimmedMean,
  monthKey,
  shiftMonths,
  classifyTrend,
  NBI_BASE_RATIO,
}
