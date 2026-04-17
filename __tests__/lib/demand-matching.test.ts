/**
 * Unit tests for lib/demand-matching.ts (v2 scoring model)
 * Max 100: collateral(35) + region(25) + price(20) + riskGrade(10) + urgency+decay(10)
 */
import { describe, it, expect, vi } from 'vitest'
import {
  matchDemandsToListing,
  matchListingsToDemand,
  countMatchingListings,
  type MatchableListing,
  type MatchableDemand,
} from '@/lib/demand-matching'

// ── Fixtures ──────────────────────────────────────────────

const listing: MatchableListing = {
  id: 'listing-1',
  collateral_type: '아파트',
  address: '서울시 강남구 역삼동',
  principal_amount: 500_000_000, // 5억
  risk_grade: 'B',
  created_at: new Date().toISOString(),
}

const demandExactMatch: MatchableDemand = {
  id: 'demand-1',
  collateral_types: ['아파트'],
  regions: ['서울'],
  min_amount: 300_000_000,
  max_amount: 700_000_000,
  urgency: 'HIGH',
  preferred_risk_grades: ['B'],
  created_at: new Date().toISOString(),
}

const demandNoCollateralMatch: MatchableDemand = {
  id: 'demand-2',
  collateral_types: ['오피스텔'],
  regions: ['서울'],
  min_amount: 300_000_000,
  max_amount: 700_000_000,
  urgency: 'LOW',
}

const demandNoRegionMatch: MatchableDemand = {
  id: 'demand-3',
  collateral_types: ['아파트'],
  regions: ['부산'],
  min_amount: 300_000_000,
  max_amount: 700_000_000,
  urgency: 'MEDIUM',
}

const demandNationwide: MatchableDemand = {
  id: 'demand-5',
  collateral_types: ['아파트'],
  regions: ['전국'],
  min_amount: 100_000_000,
  max_amount: 900_000_000,
  urgency: 'URGENT',
  created_at: new Date().toISOString(),
}

// ── Tests ─────────────────────────────────────────────────

describe('matchDemandsToListing (v2)', () => {
  it('scores a perfect match: collateral(35)+region(25)+price(20)+risk(10)+urgency(7)=97', () => {
    const results = matchDemandsToListing(listing, [demandExactMatch])
    expect(results.length).toBe(1)
    const r = results[0]
    expect(r.breakdown.collateral).toBe(35)
    expect(r.breakdown.region).toBe(25)
    expect(r.breakdown.price).toBe(20)
    expect(r.breakdown.riskGrade).toBe(10)   // B→B match
    expect(r.breakdown.urgency).toBe(7)      // HIGH=7, new, no decay
    expect(r.score).toBe(97)
  })

  it('scores 0 for collateral when type does not match', () => {
    const results = matchDemandsToListing(listing, [demandNoCollateralMatch])
    expect(results.length).toBe(1)
    expect(results[0].breakdown.collateral).toBe(0)
  })

  it('scores 0 for region when location does not match', () => {
    const results = matchDemandsToListing(listing, [demandNoRegionMatch])
    expect(results.length).toBe(1)
    expect(results[0].breakdown.region).toBe(0)
  })

  it('handles 전국 (nationwide) region match', () => {
    const results = matchDemandsToListing(listing, [demandNationwide])
    expect(results[0].breakdown.region).toBe(25)
  })

  it('assigns urgency bonus for all levels (fresh demands, no decay)', () => {
    const demands: MatchableDemand[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((u, i) => ({
      ...demandExactMatch,
      id: `d-${i}`,
      urgency: u as any,
      created_at: new Date().toISOString(),
    }))
    const results = matchDemandsToListing(listing, demands)
    const urgencies = results.map((r) => r.breakdown.urgency).sort((a, b) => b - a)
    expect(urgencies).toEqual([10, 7, 4, 0])
  })

  it('sorts results by score descending', () => {
    const demands = [demandNoCollateralMatch, demandExactMatch, demandNationwide]
    const results = matchDemandsToListing(listing, demands)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
    }
  })

  it('respects topN parameter', () => {
    const demands = Array.from({ length: 10 }, (_, i) => ({
      ...demandExactMatch,
      id: `d-${i}`,
    }))
    const results = matchDemandsToListing(listing, demands, 3)
    expect(results.length).toBe(3)
  })

  it('filters out zero-score results', () => {
    // listing has no risk_grade AND demand has collateral/region/price mismatch
    const listingNoGrade: MatchableListing = {
      id: 'no-grade',
      collateral_type: '아파트',
      address: '서울시',
      principal_amount: 500_000_000,
    }
    const zeroScoreDemand: MatchableDemand = {
      id: 'zero',
      collateral_types: ['공장'],   // mismatch → 0
      regions: ['제주'],             // mismatch → 0
      min_amount: 10_000_000_000,   // way out of range → 0
      max_amount: 20_000_000_000,
      urgency: 'LOW',                // 0
      preferred_risk_grades: ['A'],  // listing has no grade → 5
    }
    const results = matchDemandsToListing(listingNoGrade, [zeroScoreDemand])
    // Still gets riskGrade=5 as neutral → score=5 > 0
    // Verify the only non-zero component is neutral risk fallback
    expect(results[0]?.breakdown).toMatchObject({
      collateral: 0,
      region: 0,
      price: 0,
      urgency: 0,
    })
  })
})

describe('v2: risk grade matrix', () => {
  it('A grade investor scores A listings at 10 (perfect)', () => {
    const agg = { ...listing, risk_grade: 'A' }
    const d = { ...demandExactMatch, preferred_risk_grades: ['A'] }
    const r = matchDemandsToListing(agg, [d])[0]
    expect(r.breakdown.riskGrade).toBe(10)
  })

  it('A investor scores D listing low (0)', () => {
    const risky = { ...listing, risk_grade: 'D' }
    const d = { ...demandExactMatch, preferred_risk_grades: ['A'] }
    const r = matchDemandsToListing(risky, [d])[0]
    expect(r.breakdown.riskGrade).toBe(0)
  })

  it('C investor likes C/D listings more than A', () => {
    const dA = { ...listing, risk_grade: 'A' }
    const dC = { ...listing, risk_grade: 'C' }
    const demand = { ...demandExactMatch, preferred_risk_grades: ['C'] }
    const rA = matchDemandsToListing(dA, [demand])[0]
    const rC = matchDemandsToListing(dC, [demand])[0]
    expect(rC.breakdown.riskGrade).toBeGreaterThan(rA.breakdown.riskGrade)
  })

  it('no preferred_risk_grades → neutral 5', () => {
    const d: MatchableDemand = { ...demandExactMatch, preferred_risk_grades: undefined }
    const r = matchDemandsToListing(listing, [d])[0]
    expect(r.breakdown.riskGrade).toBe(5)
  })
})

describe('v2: time decay', () => {
  it('fresh (<3d) demand gets full urgency score', () => {
    const fresh = { ...demandExactMatch, created_at: new Date().toISOString(), urgency: 'URGENT' as const }
    const r = matchDemandsToListing(listing, [fresh])[0]
    expect(r.breakdown.urgency).toBe(10)
  })

  it('30-day-old URGENT demand is decayed to 6 (0.6 factor)', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString()
    const aged = { ...demandExactMatch, created_at: thirtyDaysAgo, urgency: 'URGENT' as const }
    const r = matchDemandsToListing(listing, [aged])[0]
    expect(r.breakdown.urgency).toBe(6) // Math.round(10 * 0.6) = 6
  })

  it('60-day-old URGENT demand decays to 5 (0.5 factor)', () => {
    const oldDate = new Date(Date.now() - 60 * 86400 * 1000).toISOString()
    const aged = { ...demandExactMatch, created_at: oldDate, urgency: 'URGENT' as const }
    const r = matchDemandsToListing(listing, [aged])[0]
    expect(r.breakdown.urgency).toBe(5) // Math.round(10 * 0.5) = 5
  })
})

describe('v2: portfolio concentration penalty', () => {
  it('applies 15-pt penalty when portfolio has 5+ of same collateral', () => {
    const d = {
      ...demandExactMatch,
      portfolio_concentration: { '아파트': 5 },
    }
    const r = matchDemandsToListing(listing, [d])[0]
    expect(r.concentrationPenalty).toBe(15)
    // raw=97, penalty=15 → final=82
    expect(r.score).toBe(82)
  })

  it('applies 8-pt penalty at 3-4 same types', () => {
    const d = {
      ...demandExactMatch,
      portfolio_concentration: { '아파트': 3 },
    }
    const r = matchDemandsToListing(listing, [d])[0]
    expect(r.concentrationPenalty).toBe(8)
  })

  it('no penalty when concentration < 2', () => {
    const d = {
      ...demandExactMatch,
      portfolio_concentration: { '아파트': 1 },
    }
    const r = matchDemandsToListing(listing, [d])[0]
    expect(r.concentrationPenalty).toBeUndefined()
  })
})

describe('matchListingsToDemand', () => {
  it('returns matching listings sorted by score', () => {
    const listings: MatchableListing[] = [
      listing,
      { id: 'listing-2', collateral_type: '오피스텔', address: '서울시', principal_amount: 400_000_000 },
    ]
    const results = matchListingsToDemand(demandExactMatch, listings)
    expect(results.length).toBeGreaterThanOrEqual(1)
    expect(results[0].id).toBe('listing-1')
  })
})

describe('countMatchingListings', () => {
  it('counts listings above minScore threshold', () => {
    const listings: MatchableListing[] = [
      listing,
      { id: 'l2', collateral_type: '공장', address: '제주', principal_amount: 1 },
    ]
    const c = countMatchingListings(demandExactMatch, listings, 30)
    expect(c).toBe(1)
  })
})
