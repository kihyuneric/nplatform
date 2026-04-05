import { matchScore, type UserProfile } from "@/lib/ml/matching-model"

export function getDefaultProfile(): UserProfile {
  return {
    preferredRegions: [],
    preferredTypes: [],
    priceRange: { min: 0, max: 10000000000 },
    riskTolerance: 'medium',
    pastInterests: [],
    pastDeals: [],
  }
}

export function updateProfileFromBehavior(profile: UserProfile, events: any[]): UserProfile {
  const updated = { ...profile }

  // Learn from listing views
  const viewedListings = events.filter((e: any) => e.type === 'listing_view')
  const regions = viewedListings.map((e: any) => e.data?.region).filter(Boolean)
  const types = viewedListings.map((e: any) => e.data?.type).filter(Boolean)

  // Most viewed regions/types
  const regionCounts: Record<string, number> = {}
  regions.forEach((r: string) => { regionCounts[r] = (regionCounts[r] || 0) + 1 })
  updated.preferredRegions = Object.entries(regionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([r]) => r)

  const typeCounts: Record<string, number> = {}
  types.forEach((t: string) => { typeCounts[t] = (typeCounts[t] || 0) + 1 })
  updated.preferredTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t)

  return updated
}

export function getPersonalizedRecommendations(profile: UserProfile, listings: any[], limit: number = 5): any[] {
  return listings
    .map(l => ({ ...l, relevance: matchScore(profile, { region: l.collateral_region || l.region, type: l.collateral_type || l.type, price: l.debt_principal || l.price || 0, riskGrade: l.risk_grade || 'C' }) }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
}
