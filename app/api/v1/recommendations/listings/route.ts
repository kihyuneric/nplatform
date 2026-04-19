import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth/get-user'
import { createClient } from '@/lib/supabase/server'
import { success, error as apiError } from '@/lib/api-response'

/**
 * Phase 2-F — AI 추천 매물
 *
 * 사용자 프로필(역할·관심지역·예산·LTV·담보유형 선호) 기반으로
 * 매물 목록을 스코어링하여 Top N 반환.
 *
 * 점수 가중치:
 *   - 관심 지역 일치     +35
 *   - 담보 유형 일치     +25
 *   - 예산 범위 적합     +20
 *   - LTV 선호 일치      +10
 *   - 최근성 (7일 이내)  +10
 *
 * 로그인하지 않았거나 프로필이 없으면 "featured + 최근" fallback.
 */

interface ProfilePrefs {
  regions?: string[]
  collateralTypes?: string[]
  budgetMin?: number
  budgetMax?: number
  ltvPreferred?: 'LOW' | 'MID' | 'HIGH'
  role?: string
}

type RawListing = Record<string, unknown>

interface ScoredListing extends Record<string, unknown> {
  match_score: number
  match_reasons: string[]
}

const LIMIT = 5

function budgetWindow(b?: number): [number, number] {
  if (!b) return [0, Number.POSITIVE_INFINITY]
  return [b * 0.5, b * 1.5]
}

function scoreListing(l: RawListing, prefs: ProfilePrefs): ScoredListing {
  const reasons: string[] = []
  let score = 0

  const loc = String((l.location as string | undefined) ?? '')
  if (prefs.regions?.length && prefs.regions.some(r => loc.includes(r))) {
    score += 35
    reasons.push('관심 지역')
  }

  const ct = String((l.collateral_type as string | undefined) ?? '')
  if (prefs.collateralTypes?.length && prefs.collateralTypes.includes(ct)) {
    score += 25
    reasons.push('선호 담보 유형')
  }

  const principal = Number((l.principal_amount as number | undefined) ?? 0)
  const [bMin, bMax] = [prefs.budgetMin ?? 0, prefs.budgetMax ?? Number.POSITIVE_INFINITY]
  if (principal >= bMin && principal <= bMax && principal > 0) {
    score += 20
    reasons.push('예산 적합')
  }

  const ltv = Number((l.ltv as number | undefined) ?? 0)
  if (prefs.ltvPreferred === 'LOW' && ltv > 0 && ltv <= 60) { score += 10; reasons.push('저LTV') }
  if (prefs.ltvPreferred === 'MID' && ltv > 60 && ltv <= 80) { score += 10; reasons.push('중LTV') }
  if (prefs.ltvPreferred === 'HIGH' && ltv > 80) { score += 10; reasons.push('고LTV') }

  const created = l.created_at ? new Date(String(l.created_at)).getTime() : 0
  if (created && Date.now() - created < 7 * 24 * 3600_000) {
    score += 10
    reasons.push('최근 등록')
  }

  return { ...l, match_score: score, match_reasons: reasons }
}

async function loadUserPrefs(userId: string | null): Promise<ProfilePrefs> {
  if (!userId) return {}
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('user_preferences')
      .select('regions, collateral_types, budget_min, budget_max, ltv_preferred')
      .eq('user_id', userId)
      .maybeSingle()
    if (!data) return {}
    return {
      regions: (data.regions as string[] | null) ?? undefined,
      collateralTypes: (data.collateral_types as string[] | null) ?? undefined,
      budgetMin: (data.budget_min as number | null) ?? undefined,
      budgetMax: (data.budget_max as number | null) ?? undefined,
      ltvPreferred: (data.ltv_preferred as ProfilePrefs['ltvPreferred']) ?? undefined,
    }
  } catch {
    return {}
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? LIMIT), 20)

    const user = await getAuthUser().catch(() => null)
    const prefs = await loadUserPrefs(user?.id ?? null)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('listings')
      .select('id, title, location, collateral_type, principal_amount, appraisal_value, asking_price_min, ltv, risk_grade, created_at, images, status, visibility')
      .eq('status', 'ACTIVE')
      .eq('visibility', 'PUBLIC')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw new Error(error.message)

    const listings = (data ?? []) as RawListing[]

    // 프로필이 비어있으면 최근순 fallback
    const hasPrefs = prefs.regions?.length || prefs.collateralTypes?.length || prefs.budgetMin || prefs.budgetMax
    const scored = listings.map(l => scoreListing(l, prefs))
    const sorted = hasPrefs
      ? scored.filter(s => s.match_score > 0).sort((a, b) => b.match_score - a.match_score)
      : scored.sort((a, b) => {
          const at = new Date(String(a.created_at ?? 0)).getTime()
          const bt = new Date(String(b.created_at ?? 0)).getTime()
          return bt - at
        })

    return success({
      items: sorted.slice(0, limit),
      source: hasPrefs ? 'personalized' : 'recent',
      total: sorted.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return apiError('REC_FAILED', msg, 500)
  }
}
