export interface UserProfile {
  preferredRegions: string[]
  preferredTypes: string[]
  priceRange: { min: number; max: number }
  riskTolerance: 'low' | 'medium' | 'high'
  pastInterests: string[] // listing IDs
  pastDeals: string[]     // completed deal listing IDs
}

export function matchScore(profile: UserProfile, listing: {
  region: string; type: string; price: number; riskGrade: string
}): number {
  let score = 0

  // Region match
  if (profile.preferredRegions.includes(listing.region)) score += 30
  else if (profile.preferredRegions.some(r => listing.region.includes(r))) score += 15

  // Type match
  if (profile.preferredTypes.includes(listing.type)) score += 25

  // Price range match
  if (listing.price >= profile.priceRange.min && listing.price <= profile.priceRange.max) score += 25
  else {
    const diff = Math.min(
      Math.abs(listing.price - profile.priceRange.min),
      Math.abs(listing.price - profile.priceRange.max)
    ) / profile.priceRange.max
    score += Math.max(0, 25 - diff * 50)
  }

  // Risk tolerance match
  const riskMap: Record<string, string[]> = {
    low: ['A', 'B'],
    medium: ['B', 'C'],
    high: ['C', 'D', 'E'],
  }
  if (riskMap[profile.riskTolerance]?.includes(listing.riskGrade)) score += 20

  return Math.min(100, Math.round(score))
}

export function rankListings(profile: UserProfile, listings: any[]): any[] {
  return listings
    .map(l => ({ ...l, matchScore: matchScore(profile, l) }))
    .sort((a, b) => b.matchScore - a.matchScore)
}
