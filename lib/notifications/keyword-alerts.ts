// ─── Keyword Alert Matcher ──────────────────────────────────
// 사용자 구독 키워드/필터와 신규 매물을 매칭해 notifications 큐에 enqueue.
//
// 사용 흐름:
//   1. /api/v1/notifications/keyword-alerts (POST) — 구독 등록/수정
//   2. matchListingAgainstSubscriptions(listing) — 새 매물 등록 시 호출
//   3. dispatchPendingAlerts() — INSTANT 채널 즉시 발송 / cron이 HOURLY/DAILY 처리
//
// 매칭 로직:
//   - score = keyword(0.50) + region(0.20) + type(0.15) + price(0.10) + grade(0.05)
//   - exclude 키워드 1개라도 매칭 시 즉시 score=0
//   - 임계값 0.30 이상만 알림

export type ListingSource = "COURT" | "DEAL"
export type AlertChannel = "IN_APP" | "EMAIL" | "PUSH" | "ALL"
export type AlertFrequency = "INSTANT" | "HOURLY" | "DAILY"

export interface KeywordSubscription {
  id: string
  user_id: string
  label: string
  keywords: string[]
  exclude: string[]
  region: string[] | null
  property_types: string[] | null
  min_price: number | null
  max_price: number | null
  min_area_m2: number | null
  max_area_m2: number | null
  risk_grades: string[] | null
  source: ListingSource | "BOTH"
  channel: AlertChannel
  frequency: AlertFrequency
  is_active: boolean
}

export interface ListingDoc {
  id: string
  source: ListingSource
  title: string             // case_number 또는 label
  property_type: string
  region: string            // sido
  district?: string | null  // sigungu
  address: string
  price: number             // court=min_bid_price / deal=ask_min
  area_m2: number | null
  risk_grade?: string | null
  created_at: string
}

export interface MatchResult {
  matched: boolean
  score: number
  matchedTerms: string[]
  reasons: string[]
}

// ─── 텍스트 정규화 ────────────────────────────────────
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "").trim()
}

// 한 키워드가 listing 어딘가에 들어있나
function containsTerm(haystack: string, needle: string): boolean {
  return normalize(haystack).includes(normalize(needle))
}

// ─── 점수 계산 ─────────────────────────────────────────
const W = {
  KEYWORD: 0.50,
  REGION:  0.20,
  TYPE:    0.15,
  PRICE:   0.10,
  GRADE:   0.05,
} as const

const MATCH_THRESHOLD = 0.30

export function matchListing(
  sub: KeywordSubscription,
  listing: ListingDoc,
): MatchResult {
  const reasons: string[] = []
  const matchedTerms: string[] = []
  let score = 0

  // 0. source 게이트
  if (sub.source !== "BOTH" && sub.source !== listing.source) {
    return { matched: false, score: 0, matchedTerms, reasons: ["source-mismatch"] }
  }

  // 1. exclude → 즉시 탈락
  const haystack = [
    listing.title, listing.address, listing.property_type, listing.region, listing.district ?? "",
  ].join(" ")
  for (const ex of sub.exclude) {
    if (containsTerm(haystack, ex)) {
      return { matched: false, score: 0, matchedTerms, reasons: [`excluded:${ex}`] }
    }
  }

  // 2. 키워드 매칭 (최소 1개 필수)
  if (sub.keywords.length > 0) {
    let hits = 0
    for (const kw of sub.keywords) {
      if (containsTerm(haystack, kw)) {
        hits++
        matchedTerms.push(kw)
      }
    }
    if (hits === 0) {
      return { matched: false, score: 0, matchedTerms, reasons: ["no-keyword-match"] }
    }
    // 키워드 적중 비율
    const ratio = hits / sub.keywords.length
    score += W.KEYWORD * ratio
    reasons.push(`keyword:${hits}/${sub.keywords.length}`)
  } else {
    // 키워드 없으면 필터만으로 매칭
    score += W.KEYWORD * 0.4
  }

  // 3. region
  if (sub.region && sub.region.length > 0) {
    if (sub.region.includes(listing.region)) {
      score += W.REGION
      reasons.push(`region:${listing.region}`)
    } else {
      return { matched: false, score: 0, matchedTerms, reasons: ["region-out"] }
    }
  } else {
    score += W.REGION * 0.5
  }

  // 4. property type
  if (sub.property_types && sub.property_types.length > 0) {
    if (sub.property_types.includes(listing.property_type)) {
      score += W.TYPE
      reasons.push(`type:${listing.property_type}`)
    } else {
      return { matched: false, score: 0, matchedTerms, reasons: ["type-out"] }
    }
  } else {
    score += W.TYPE * 0.5
  }

  // 5. price
  const priceOk =
    (sub.min_price == null || listing.price >= sub.min_price) &&
    (sub.max_price == null || listing.price <= sub.max_price)
  if (!priceOk) {
    return { matched: false, score: 0, matchedTerms, reasons: ["price-out"] }
  }
  if (sub.min_price != null || sub.max_price != null) {
    score += W.PRICE
    reasons.push("price-ok")
  } else {
    score += W.PRICE * 0.5
  }

  // 6. area
  if (listing.area_m2 != null) {
    const areaOk =
      (sub.min_area_m2 == null || listing.area_m2 >= sub.min_area_m2) &&
      (sub.max_area_m2 == null || listing.area_m2 <= sub.max_area_m2)
    if (!areaOk) {
      return { matched: false, score: 0, matchedTerms, reasons: ["area-out"] }
    }
  }

  // 7. risk grade
  if (sub.risk_grades && sub.risk_grades.length > 0 && listing.risk_grade) {
    if (sub.risk_grades.includes(listing.risk_grade)) {
      score += W.GRADE
      reasons.push(`grade:${listing.risk_grade}`)
    } else {
      return { matched: false, score: 0, matchedTerms, reasons: ["grade-out"] }
    }
  } else {
    score += W.GRADE * 0.5
  }

  const finalScore = Math.min(1, +score.toFixed(3))
  return {
    matched: finalScore >= MATCH_THRESHOLD,
    score: finalScore,
    matchedTerms,
    reasons,
  }
}

// ─── 매칭 + dispatch ────────────────────────────────────
// SupabaseLike: 구체 클라이언트 의존 회피
type SupabaseLike = {
  from: (table: string) => {
    select: (cols?: string) => {
      eq: (col: string, val: unknown) => Promise<{ data: unknown; error: unknown }>
    }
    insert: (row: unknown) => Promise<{ data: unknown; error: unknown }>
    upsert: (row: unknown, opts?: unknown) => Promise<{ data: unknown; error: unknown }>
  }
}

export interface DispatchSummary {
  scanned: number
  matched: number
  notified: number
  duplicates: number
}

/**
 * 단일 매물에 대해 모든 활성 구독을 매칭하고 알림 enqueue.
 * INSTANT 채널만 즉시 notifications 테이블에 insert,
 * HOURLY/DAILY 는 dispatches 테이블에만 기록 → cron이 처리.
 */
export async function matchListingAgainstSubscriptions(
  sb: SupabaseLike,
  listing: ListingDoc,
  subs: KeywordSubscription[],
): Promise<DispatchSummary> {
  const summary: DispatchSummary = { scanned: subs.length, matched: 0, notified: 0, duplicates: 0 }

  for (const sub of subs) {
    if (!sub.is_active) continue
    const result = matchListing(sub, listing)
    if (!result.matched) continue
    summary.matched++

    // dedupe via unique constraint (subscription_id, listing_id, listing_source)
    const dispatchRow = {
      subscription_id: sub.id,
      listing_id:      listing.id,
      listing_source:  listing.source,
      match_score:     result.score,
      matched_terms:   result.matchedTerms,
    }

    const { error: dupErr } = await sb
      .from("keyword_alert_dispatches")
      .upsert(dispatchRow, { onConflict: "subscription_id,listing_id,listing_source", ignoreDuplicates: true } as unknown)
    if (dupErr) {
      summary.duplicates++
      continue
    }

    // INSTANT만 즉시 notifications enqueue
    if (sub.frequency === "INSTANT") {
      const linkBase = listing.source === "COURT" ? "/auction" : "/exchange"
      const notif = {
        user_id: sub.user_id,
        type:    "ALERT" as const,
        title:   `[${sub.label}] 새 매물 매칭`,
        message: `${listing.region} ${listing.district ?? ""} ${listing.property_type} — ${formatPrice(listing.price)}`,
        link:    `${linkBase}/${listing.id}`,
        metadata: {
          subscription_id: sub.id,
          listing_id:      listing.id,
          source:          listing.source,
          score:           result.score,
          matched_terms:   result.matchedTerms,
          reasons:         result.reasons,
        },
      }
      const { error: notifErr } = await sb.from("notifications").insert(notif)
      if (!notifErr) summary.notified++
    }
  }

  return summary
}

function formatPrice(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`
  if (n >= 10_000_000) return `${Math.round(n / 10_000_000)}천만`
  return `${n.toLocaleString()}원`
}

// ─── 테스트용 export ────────────────────────────────────
export const __test__ = {
  normalize,
  containsTerm,
  W,
  MATCH_THRESHOLD,
  formatPrice,
}
