// ============================================================
// Demand-Listing Matching Engine
// ============================================================

export interface MatchableListing {
  id: string
  collateral_type: string
  address?: string
  location?: string
  location_city?: string
  location_district?: string
  principal_amount: number
  risk_grade?: string
  title?: string
  institution?: string
  deadline?: string
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
}

export interface MatchResult {
  id: string
  score: number
  breakdown: {
    collateral: number
    region: number
    price: number
    urgency: number
  }
}

const URGENCY_BONUS: Record<string, number> = {
  URGENT: 10,
  HIGH: 7,
  MEDIUM: 4,
  LOW: 0,
}

// ─── Score a single demand against a listing ──────────────
function scoreDemandToListing(
  listing: MatchableListing,
  demand: MatchableDemand
): MatchResult {
  let collateral = 0
  let region = 0
  let price = 0
  let urgency = 0

  // Collateral type match (+40)
  if (
    demand.collateral_types.some(
      (ct) => ct === listing.collateral_type || listing.collateral_type?.includes(ct)
    )
  ) {
    collateral = 40
  }

  // Region match (+30)
  const listingLocation =
    listing.address ||
    listing.location ||
    [listing.location_city, listing.location_district].filter(Boolean).join(" ") ||
    ""
  if (
    demand.regions.some(
      (r) => listingLocation.includes(r) || r === "전국"
    )
  ) {
    region = 30
  }

  // Price range match (+20)
  const principal = listing.principal_amount || 0
  if (principal >= demand.min_amount && principal <= demand.max_amount) {
    price = 20
  } else if (principal > 0) {
    // Partial score if within 20% of range
    const rangeMid = (demand.min_amount + demand.max_amount) / 2
    const diff = Math.abs(principal - rangeMid) / rangeMid
    if (diff < 0.2) price = 12
    else if (diff < 0.5) price = 5
  }

  // Urgency bonus (+10)
  urgency = URGENCY_BONUS[demand.urgency] ?? 0

  return {
    id: demand.id,
    score: collateral + region + price + urgency,
    breakdown: { collateral, region, price, urgency },
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
