import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/get-user'
import { getUserTier } from '@/lib/access-tier'
import type { UserRecord } from '@/lib/db-types'
import { apiError } from '@/lib/api-error'

export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user) {
      return apiError('UNAUTHORIZED', '로그인이 필요합니다.', 401)
    }

    const supabase = await createClient()

    // Parallel queries for dashboard data
    const [
      profileResult,
      favoritesResult,
      dealsResult,
      analysesResult,
      notificationsResult,
    ] = await Promise.all([
      // User profile
      supabase
        .from('users')
        .select('name, email, role, is_verified, kyc_status, subscription_tier, created_at, credit_balance, identity_verified, qualified_investor')
        .eq('id', user.id)
        .single(),

      // Favorites count
      supabase
        .from('favorites')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id),

      // Active deals (via deal_room_participants)
      supabase
        .from('deal_room_participants')
        .select(`
          deal_room_id,
          deal_rooms!inner(id, title, status, created_at, listing_id,
            npl_listings(title, claim_amount, collateral_type))
        `)
        .eq('user_id', user.id)
        .limit(5),

      // Recent AI analyses
      supabase
        .from('npl_ai_analyses')
        .select('id, listing_id, analysis_type, result, created_at')
        .order('created_at', { ascending: false })
        .limit(5),

      // Recent notifications
      supabase
        .from('notifications')
        .select('id, title, message, type, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10),
    ])

    const profile = profileResult.data
    const userTier = getUserTier(profile as UserRecord | null)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    const roleSubtype = (authUser?.user_metadata as { role_subtype?: string | null } | null)?.role_subtype ?? null

    return NextResponse.json({
      profile: {
        ...profile,
        id: user.id,
        current_tier: userTier,
        role_subtype: roleSubtype,
      },
      stats: {
        favoritesCount: favoritesResult.count ?? 0,
        activeDealsCount: (dealsResult.data || []).length,
        analysesCount: (analysesResult.data || []).length,
        unreadNotifications: (notificationsResult.data || []).filter((n: { is_read?: boolean }) => !n.is_read).length,
      },
      activeDeals: dealsResult.data || [],
      recentAnalyses: analysesResult.data || [],
      recentNotifications: (notificationsResult.data || []).slice(0, 5),
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return apiError('INTERNAL_ERROR', '대시보드 데이터 조회 실패', 500)
  }
}
