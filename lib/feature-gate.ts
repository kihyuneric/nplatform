/**
 * Feature gating utilities for plan-based access control.
 *
 * Limit values:
 *   -1  = unlimited
 *   >=0 = hard cap per billing cycle
 */

export type PlanName = 'FREE' | 'PRO' | 'ENTERPRISE'

export type FeatureKey =
  | 'ai_analysis'
  | 'ocr_scan'
  | 'contracts'
  | 'listings'
  | 'deal_rooms'
  | 'consultations'

const PLAN_LIMITS: Record<PlanName, Record<FeatureKey, number>> = {
  FREE: {
    ai_analysis: 3,
    ocr_scan: 5,
    contracts: 1,
    listings: 5,
    deal_rooms: 1,
    consultations: 1,
  },
  PRO: {
    ai_analysis: -1,
    ocr_scan: 50,
    contracts: -1,
    listings: 50,
    deal_rooms: 10,
    consultations: 5,
  },
  ENTERPRISE: {
    ai_analysis: -1,
    ocr_scan: -1,
    contracts: -1,
    listings: -1,
    deal_rooms: -1,
    consultations: -1,
  },
}

export interface FeatureLimitResult {
  allowed: boolean
  limit: number
  remaining: number
}

/**
 * Check whether the user can still use a given feature based on their plan
 * and current usage count for the billing period.
 *
 * @param plan       - The user's current plan (FREE, PRO, ENTERPRISE)
 * @param feature    - The feature key to check
 * @param currentUsage - How many times the user has already used this feature
 * @returns An object with `allowed`, `limit`, and `remaining`
 */
export function checkFeatureLimit(
  plan: string,
  feature: string,
  currentUsage: number,
): FeatureLimitResult {
  const normalizedPlan = (plan?.toUpperCase() ?? 'FREE') as PlanName
  const planLimits = PLAN_LIMITS[normalizedPlan] ?? PLAN_LIMITS.FREE
  const key = feature as FeatureKey
  const limit = planLimits[key] ?? 0

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1, remaining: -1 }
  }

  const remaining = Math.max(0, limit - currentUsage)
  return {
    allowed: remaining > 0,
    limit,
    remaining,
  }
}

/**
 * Get all feature limits for a plan.
 *
 * @param plan - The plan name (FREE, PRO, ENTERPRISE)
 * @returns A record of feature keys to their numeric limits (-1 = unlimited)
 */
export function getPlanLimits(plan: string): Record<string, number> {
  const normalizedPlan = (plan?.toUpperCase() ?? 'FREE') as PlanName
  return { ...(PLAN_LIMITS[normalizedPlan] ?? PLAN_LIMITS.FREE) }
}

/**
 * Human-readable label for a limit value.
 */
export function formatLimit(limit: number): string {
  return limit === -1 ? '무제한' : `${limit}회`
}

/**
 * Check if a plan is valid.
 */
export function isValidPlan(plan: string): plan is PlanName {
  return ['FREE', 'PRO', 'ENTERPRISE'].includes(plan?.toUpperCase())
}
