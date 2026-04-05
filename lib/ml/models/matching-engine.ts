// ─────────────────────────────────────────────────────────
//  NPL Matching Engine – Embedding 기반 사용자-매물 매칭
//  User embedding (16-dim) + Listing embedding (16-dim)
//  Cosine similarity scoring with behavior learning
// ─────────────────────────────────────────────────────────

import { SAMPLE_USERS } from '../../sample-data/users'
import { SAMPLE_LISTINGS, type SampleListing } from '../../sample-data/listings'
import { SAMPLE_DEALS } from '../../sample-data/deals'

export interface MatchResult {
  listing_id: string
  listing_title: string
  score: number        // 0~1, higher = better match
  reasons: string[]
}

// ── Embedding Dimensions ──────────────────────────────────

const DIM = 16

// Type encoding map → embedding slice (indices 0~3)
const TYPE_EMB: Record<string, number[]> = {
  '아파트': [0.9, 0.8, 0.2, 0.1], '오피스': [0.3, 0.7, 0.8, 0.2],
  '상가': [0.4, 0.5, 0.7, 0.6], '근린생활': [0.4, 0.4, 0.6, 0.6],
  '토지': [0.1, 0.2, 0.3, 0.9], '임야': [0.05, 0.1, 0.2, 0.95],
  '다세대': [0.7, 0.6, 0.3, 0.3], '다가구': [0.65, 0.55, 0.3, 0.35],
  '공장': [0.2, 0.3, 0.5, 0.7], '창고': [0.15, 0.25, 0.45, 0.65],
  '숙박시설': [0.3, 0.4, 0.6, 0.5], '주유소': [0.2, 0.3, 0.5, 0.6],
}

// Region encoding → embedding slice (indices 4~7)
const REGION_EMB: Record<string, number[]> = {
  '서울': [0.95, 0.9, 0.8, 0.7], '경기': [0.7, 0.75, 0.6, 0.5],
  '부산': [0.6, 0.5, 0.7, 0.4], '인천': [0.6, 0.6, 0.5, 0.45],
  '대전': [0.5, 0.45, 0.5, 0.4], '대구': [0.5, 0.45, 0.55, 0.4],
  '세종': [0.55, 0.5, 0.45, 0.5], '광주': [0.45, 0.4, 0.5, 0.35],
  '강원': [0.3, 0.35, 0.4, 0.6], '제주': [0.4, 0.45, 0.5, 0.55],
}

function extractRegion(addr: string): string {
  for (const key of Object.keys(REGION_EMB)) {
    if (addr.includes(key)) return key
  }
  return '경기'
}

// ── Embedding Generation ──────────────────────────────────

function createListingEmbedding(listing: SampleListing): number[] {
  const emb = new Array(DIM).fill(0)
  // Indices 0-3: type
  const typeE = TYPE_EMB[listing.collateral_type] ?? [0.5, 0.5, 0.5, 0.5]
  for (let i = 0; i < 4; i++) emb[i] = typeE[i]

  // Indices 4-7: region
  const region = extractRegion(listing.address)
  const regionE = REGION_EMB[region] ?? [0.5, 0.5, 0.5, 0.5]
  for (let i = 0; i < 4; i++) emb[4 + i] = regionE[i]

  // Indices 8-9: price scale (log-normalized)
  emb[8] = Math.min(Math.log10(listing.principal_amount / 1_0000_0000 + 1) / 2, 1)
  emb[9] = Math.min(Math.log10(listing.appraised_value / 1_0000_0000 + 1) / 2, 1)

  // Indices 10-11: risk indicators
  emb[10] = listing.ltv_ratio / 100
  emb[11] = Math.min(listing.delinquency_months / 60, 1)

  // Indices 12-13: asset characteristics
  emb[12] = Math.min(listing.area_sqm / 5000, 1)
  emb[13] = Math.min(listing.debtor_count / 5, 1)

  // Indices 14-15: grade encoding
  const gradeMap: Record<string, number> = { A: 0.1, B: 0.3, C: 0.5, D: 0.7, E: 0.9 }
  emb[14] = gradeMap[listing.risk_grade] ?? 0.5
  emb[15] = listing.status === 'ACTIVE' ? 1 : 0.3

  return emb
}

// ── User Embedding Store ──────────────────────────────────

const userEmbeddings = new Map<string, number[]>()

function initUserEmbedding(userId: string): number[] {
  const user = SAMPLE_USERS.find(u => u.id === userId)
  if (!user) return new Array(DIM).fill(0.5)

  // Initialize from user's deal history
  const userDeals = SAMPLE_DEALS.filter(d => d.buyer_id === userId || d.seller_id === userId)
  if (userDeals.length === 0) {
    // Cold-start: use role-based priors
    const emb = new Array(DIM).fill(0.5)
    if (user.grade === 'VIP') { emb[8] = 0.8; emb[9] = 0.8 } // prefers expensive
    if (user.grade === 'BASIC') { emb[8] = 0.3; emb[9] = 0.3 } // prefers cheaper
    return emb
  }

  // Average embeddings of interacted listings
  const emb = new Array(DIM).fill(0)
  let count = 0
  for (const deal of userDeals) {
    const listing = SAMPLE_LISTINGS.find(l => l.id === deal.listing_id)
    if (listing) {
      const lEmb = createListingEmbedding(listing)
      for (let i = 0; i < DIM; i++) emb[i] += lEmb[i]
      count++
    }
  }
  if (count > 0) for (let i = 0; i < DIM; i++) emb[i] /= count
  return emb
}

function getUserEmbedding(userId: string): number[] {
  if (!userEmbeddings.has(userId)) {
    userEmbeddings.set(userId, initUserEmbedding(userId))
  }
  return userEmbeddings.get(userId)!
}

// ── Cosine Similarity ─────────────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom > 0 ? dot / denom : 0
}

// ── Public API ────────────────────────────────────────────

export function recommend(userId: string, limit: number = 10): MatchResult[] {
  const userEmb = getUserEmbedding(userId)

  // Only consider active listings
  const active = SAMPLE_LISTINGS.filter(l => l.status === 'ACTIVE')

  // Exclude listings user already has deals on
  const existingDeals = new Set(
    SAMPLE_DEALS.filter(d => d.buyer_id === userId).map(d => d.listing_id)
  )

  const scored = active
    .filter(l => !existingDeals.has(l.id))
    .map(listing => {
      const lEmb = createListingEmbedding(listing)
      const score = cosineSimilarity(userEmb, lEmb)

      // Generate match reasons
      const reasons: string[] = []
      // Check type match
      for (let i = 0; i < 4; i++) {
        if (Math.abs(userEmb[i] - lEmb[i]) < 0.2) {
          reasons.push('선호 담보유형 매칭')
          break
        }
      }
      // Check region match
      for (let i = 4; i < 8; i++) {
        if (Math.abs(userEmb[i] - lEmb[i]) < 0.2) {
          reasons.push('선호 지역 매칭')
          break
        }
      }
      // Check price range match
      if (Math.abs(userEmb[8] - lEmb[8]) < 0.25) reasons.push('적정 가격대')
      // Check risk tolerance match
      if (Math.abs(userEmb[14] - lEmb[14]) < 0.25) reasons.push('리스크 성향 부합')

      if (reasons.length === 0) reasons.push('종합 매칭')

      return {
        listing_id: listing.id,
        listing_title: listing.title,
        score: Math.round(score * 1000) / 1000,
        reasons,
      }
    })
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit)
}

/** Update user embedding based on user action (online learning) */
export function updateUserEmbedding(
  userId: string,
  action: 'view' | 'favorite' | 'inquiry' | 'deal',
  listingId: string
): void {
  const userEmb = getUserEmbedding(userId)
  const listing = SAMPLE_LISTINGS.find(l => l.id === listingId)
  if (!listing) return

  const lEmb = createListingEmbedding(listing)

  // Learning rate based on action strength
  const lrMap = { view: 0.02, favorite: 0.05, inquiry: 0.1, deal: 0.2 }
  const lr = lrMap[action]

  // Move user embedding toward listing embedding
  for (let i = 0; i < DIM; i++) {
    userEmb[i] += lr * (lEmb[i] - userEmb[i])
  }
  userEmbeddings.set(userId, userEmb)
}

export function resetUserEmbedding(userId: string): void {
  userEmbeddings.delete(userId)
}
