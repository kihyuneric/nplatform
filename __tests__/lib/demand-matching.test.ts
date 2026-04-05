/**
 * Unit tests for lib/demand-matching.ts
 */
import { describe, it, expect } from 'vitest'
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
}

const demandExactMatch: MatchableDemand = {
  id: 'demand-1',
  collateral_types: ['아파트'],
  regions: ['서울'],
  min_amount: 300_000_000,
  max_amount: 700_000_000,
  urgency: 'HIGH',
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

const demandOutOfPriceRange: MatchableDemand = {
  id: 'demand-4',
  collateral_types: ['아파트'],
  regions: ['서울'],
  min_amount: 1_000_000_000,
  max_amount: 2_000_000_000,
  urgency: 'LOW',
}

const demandNationwide: MatchableDemand = {
  id: 'demand-5',
  collateral_types: ['아파트'],
  regions: ['전국'],
  min_amount: 100_000_000,
  max_amount: 900_000_000,
  urgency: 'URGENT',
}

// ── Tests ─────────────────────────────────────────────────

describe('matchDemandsToListing', () => {
  it('scores a perfectly matching demand with collateral(40)+region(30)+price(20)+urgency', () => {
    const results = matchDemandsToListing(listing, [demandExactMatch])
    expect(results.length).toBe(1)
    const r = results[0]
    expect(r.breakdown.collateral).toBe(40)
    expect(r.breakdown.region).toBe(30)
    expect(r.breakdown.price).toBe(20)
    expect(r.breakdown.urgency).toBe(7) // HIGH = 7
    expect(r.score).toBe(97)
  })

  it('scores 0 for collateral when type does not match', () => {
    const results = matchDemandsToListing(listing, [demandNoCollateralMatch])
    // Still gets region+price but no collateral
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
    expect(results[0].breakdown.region).toBe(30)
  })

  it('assigns urgency bonus correctly for all levels', () => {
    const demands: MatchableDemand[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'].map((u, i) => ({
      ...demandExactMatch,
      id: `d-${i}`,
      urgency: u as any,
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
    const zeroScoreDemand: MatchableDemand = {
      id: 'zero',
      collateral_types: ['공장'],
      regions: ['제주'],
      min_amount: 1,
      max_amount: 2,
      urgency: 'LOW',
    }
    const results = matchDemandsToListing(listing, [zeroScoreDemand])
    expect(results.length).toBe(0)
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
    expect(results[0].id).toBe('listing-1') // better match
  })
})

describe('countMatchingListings', () => {
  it('counts listings above minScore threshold', () => {
    const listings: MatchableListing[] = [
      listing,
      { id: 'l2', collateral_type: '공장', address: '제주', principal_amount: 1 },
    ]
    const c = countMatchingListings(demandExactMatch, listings, 30)
    expect(c).toBe(1) // only the first listing should match
  })
})
