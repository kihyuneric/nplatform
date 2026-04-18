// ============================================================
// Demand-Listing Matching Engine v2
// Scoring model (max 100):
//   - Collateral type  +35
//   - Region           +25
//   - Price range      +20
//   - Risk grade       +10  (NEW: investor risk profile match)
//   - Urgency / decay  +10  (time decay applied to urgency)
// ============================================================

export interface MatchableListing {
  id: string
  collateral_type: string
  address?: string
  location?: string
  location_city?: string
  location_district?: string
  principal_amount: number
  risk_grade?: string   // A | B | C | D | F
  title?: string
  institution?: string
  deadline?: string
  created_at?: string   // ISO string — used for time decay
}

export interface MatchableDemand {
  id: string
  collateral_types: string[]
  regions: string[]
  min_amount: number
  max_amount: number
  urgency: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  target_discount_rate?: number
  buyer_name?: string
  buyer_tier?: string
  preferred_risk_grades?: string[]   // e.g. ["A", "B"] — NEW: risk profile
  created_at?: string                // ISO string — used for time decay
  /** Current portfolio concentration: map of collateral_type → count */
  portfolio_concentration?: Record<string, number>
}

export interface MatchResult {
  id: string
  score: number
  breakdown: {
    collateral: number
    region: number
    price: number
    riskGrade: number
    urgency: number
  }
  concentrationPenalty?: number
}

const URGENCY_BONUS: Record<string, number> = {
  URGENT: 10,
  HIGH:    7,
  MEDIUM:  4,
  LOW:     0,
}

/** Risk grade compatibility matrix: investor_grade → listing grades → score */
const RISK_GRADE_SCORE: Record<string, Record<string, number>> = {
  // Conservative investor: prefers A/B
  A: { A: 10, B: 8,  C: 3,  D: 0,  F: 0 },
  // Moderate investor: likes B/C
  B: { A: 8,  B: 10, C: 8,  D: 3,  F: 0 },
  // Aggressive investor: targets C/D for higher returns
  C: { A: 4,  B: 8,  C: 10, D: 8,  F: 2 },
  D: { A: 0,  B: 4,  C: 8,  D: 10, F: 6 },
}

/**
 * Time decay factor: demands age reduces effective urgency.
 * A 7-day-old URGENT demand = equivalent to HIGH.
 * A 30-day-old demand = decay factor 0.6.
 * A 60-day-old demand = decay factor 0.5.
 */
function timeDenominator(createdAt?: string): number {
  if (!createdAt) return 1.0
  const ageMs = Date.now() - new Date(createdAt).getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  if (ageDays <= 3) return 1.0
  if (ageDays <= 7) return 0.9
  if (ageDays <= 14) return 0.75
  if (ageDays < 60) return 0.6   // 14–60 days (includes ~30 days)
  return 0.5  // older than 60 days
}

/**
 * Portfolio concentration penalty.
 * If buyer already holds many of the same collateral type, reduce score.
 */
function concentrationPenalty(
  listing: MatchableListing,
  demand: MatchableDemand
): number {
  const conc = demand.portfolio_concentration
  if (!conc) return 0
  const count = conc[listing.collateral_type] ?? 0
  if (count >= 5) return 15  // heavy concentration → big penalty
  if (count >= 3) return 8
  if (count >= 2) return 3
  return 0
}

// ─── Score a single demand against a listing ──────────────
function scoreDemandToListing(
  listing: MatchableListing,
  demand: MatchableDemand
): MatchResult {
  let collateral = 0
  let region = 0
  let price = 0
  let riskGrade = 0
  let urgency = 0

  // Collateral type match (+35)
  if (
    demand.collateral_types.some(
      (ct) => ct === listing.collateral_type || listing.collateral_type?.includes(ct)
    )
  ) {
    collateral = 35
  }

  // Region match (+25)
  const listingLocation =
    listing.address ||
    listing.location ||
    [listing.location_city, listing.location_district].filter(Boolean).join(" ") ||
    ""
  if (demand.regions.some((r) => listingLocation.includes(r) || r === "전국")) {
    region = 25
  }

  // Price range match (+20)
  const principal = listing.principal_amount || 0
  if (principal >= demand.min_amount && principal <= demand.max_amount) {
    price = 20
  } else if (principal > 0) {
    const rangeMid = (demand.min_amount + demand.max_amount) / 2
    const diff = Math.abs(principal - rangeMid) / rangeMid
    if (diff < 0.2) price = 12
    else if (diff < 0.5) price = 5
  }

  // Risk grade match (+10) — investor's preferred grade vs listing grade
  if (listing.risk_grade) {
    const preferredGrades = demand.preferred_risk_grades
    if (preferredGrades?.length) {
      // Use matrix: score based on best-matching preferred grade
      const bestGradeScore = preferredGrades.reduce((best, pg) => {
        const row = RISK_GRADE_SCORE[pg]
        const s = row?.[listing.risk_grade!] ?? 0
        return Math.max(best, s)
      }, 0)
      riskGrade = bestGradeScore
    } else {
      // No preference → neutral mid score
      riskGrade = 5
    }
  } else {
    // Listing has no grade → neutral
    riskGrade = 5
  }

  // Urgency bonus (+10) with time decay
  const decay = timeDenominator(demand.created_at)
  urgency = Math.round((URGENCY_BONUS[demand.urgency] ?? 0) * decay)

  // Portfolio concentration penalty
  const penalty = concentrationPenalty(listing, demand)
  const raw = collateral + region + price + riskGrade + urgency
  const final = Math.max(0, raw - penalty)

  return {
    id: demand.id,
    score: final,
    breakdown: { collateral, region, price, riskGrade, urgency },
    concentrationPenalty: penalty > 0 ? penalty : undefined,
  }
}

// ─── Score a single listing against a demand ──────────────
function scoreListingToDemand(
  demand: MatchableDemand,
  listing: MatchableListing
): MatchResult {
  const result = scoreDemandToListing(listing, demand)
  return { ...result, id: listing.id }
}

// ─── Match demands to a listing (seller view) ─────────────
export function matchDemandsToListing(
  listing: MatchableListing,
  demands: MatchableDemand[],
  topN = 5
): MatchResult[] {
  return demands
    .map((d) => scoreDemandToListing(listing, d))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

// ─── Match listings to a demand (buyer view) ──────────────
export function matchListingsToDemand(
  demand: MatchableDemand,
  listings: MatchableListing[],
  topN = 5
): MatchResult[] {
  return listings
    .map((l) => scoreListingToDemand(demand, l))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

// ─── Count matching listings for a demand ─────────────────
export function countMatchingListings(
  demand: MatchableDemand,
  listings: MatchableListing[],
  minScore = 30
): number {
  return listings.filter((l) => {
    const result = scoreListingToDemand(demand, l)
    return result.score >= minScore
  }).length
}

// ============================================================
// Matching Engine v3 Extensions
// ─ Collaborative Filtering boost
// ─ Target ROI / discount rate alignment
// ─ Diversity-aware portfolio recommendation
// ============================================================

export interface CollabSignal {
  /** listing_id → number of similar investors who watchlisted/bid */
  listing_id: string
  similar_investor_count: number
}

export interface V3MatchOptions {
  /** Collaborative filtering signals from similar investors */
  collabSignals?: CollabSignal[]
  /** Buyer's target ROI % (e.g. 20 = 20%) — discount rate proxy */
  targetRoiPct?: number
  /** Max results */
  topN?: number
  /** Min score threshold */
  minScore?: number
}

/**
 * v3 match: scoring + collab boost + ROI alignment + diversity
 *
 * Score composition (max ~120, normalized to 100):
 *   Base v2 score:            0-100
 *   Collaborative boost:      0-15  (social proof from similar investors)
 *   ROI alignment bonus:      0-10  (discount rate vs target ROI)
 *   Diversity incentive:      0-5   (bonus for underrepresented collateral type)
 */
export function matchListingsToDemandV3(
  demand: MatchableDemand,
  listings: MatchableListing[],
  options: V3MatchOptions = {},
): MatchResult[] {
  const { collabSignals = [], targetRoiPct, topN = 5, minScore = 0 } = options

  // Build collab signal index
  const collabIndex = new Map<string, number>()
  for (const sig of collabSignals) {
    collabIndex.set(sig.listing_id, sig.similar_investor_count)
  }

  // Max collab count for normalization
  const maxCollab = collabSignals.length > 0
    ? Math.max(...collabSignals.map(s => s.similar_investor_count), 1)
    : 1

  const results = listings.map((listing) => {
    // Base v2 score
    const base = scoreListingToDemand(demand, listing)

    // ── Collaborative Filtering boost (0-15) ──────────────────
    const collabCount = collabIndex.get(listing.id) ?? 0
    const collabBoost = Math.round((collabCount / maxCollab) * 15)

    // ── ROI / discount rate alignment (0-10) ──────────────────
    let roiBonus = 0
    if (targetRoiPct != null && listing.principal_amount > 0) {
      // Use discount_rate as ROI proxy if available
      const listing_any = listing as any
      const discountRate = listing_any.discount_rate as number | undefined
      if (discountRate != null) {
        const diff = Math.abs(discountRate - targetRoiPct)
        if (diff <= 3) roiBonus = 10
        else if (diff <= 8) roiBonus = 6
        else if (diff <= 15) roiBonus = 3
      }
    }

    // ── Diversity incentive (0-5) ─────────────────────────────
    // Encourage buying underrepresented collateral types in portfolio
    let diversityBonus = 0
    if (demand.portfolio_concentration) {
      const typeCount = demand.portfolio_concentration[listing.collateral_type] ?? 0
      if (typeCount === 0) diversityBonus = 5   // brand new type → max bonus
      else if (typeCount === 1) diversityBonus = 3
    }

    const rawTotal = base.score + collabBoost + roiBonus + diversityBonus
    // Normalize to 100 (max theoretical = 100 + 15 + 10 + 5 = 130)
    const finalScore = Math.min(100, Math.round((rawTotal / 130) * 100))

    return {
      id: listing.id,
      score: finalScore,
      breakdown: {
        ...base.breakdown,
        collab_boost: collabBoost,
        roi_bonus: roiBonus,
        diversity_bonus: diversityBonus,
      } as MatchResult["breakdown"] & Record<string, number>,
      concentrationPenalty: base.concentrationPenalty,
    }
  })

  return results
    .filter((r) => r.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
}

/**
 * Batch match: score multiple demands against multiple listings at once.
 * Returns a map of demand_id → top matches.
 * Used by admin matching dashboard & cron job.
 */
export function batchMatchV3(
  demands: MatchableDemand[],
  listings: MatchableListing[],
  options: Omit<V3MatchOptions, 'topN'> & { topN?: number } = {},
): Map<string, MatchResult[]> {
  const results = new Map<string, MatchResult[]>()
  for (const demand of demands) {
    results.set(demand.id, matchListingsToDemandV3(demand, listings, options))
  }
  return results
}
