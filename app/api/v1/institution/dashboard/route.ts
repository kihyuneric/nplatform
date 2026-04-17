import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// ─── Mock Data (fallback) ─────────────────────────────────────
const MOCK_DASHBOARD = {
  summary: {
    total_listings: 42,
    active_deals: 8,
    total_views: 15320,
    interested_count: 234,
  },
  recent_listings: [
    { id: "LST-001", title: "서울 강남구 아파트 담보채권 포트폴리오", volume: "320억", status: "판매중", views: 1250, interested: 28, createdAt: "2026-03-15T09:00:00Z" },
    { id: "LST-002", title: "부산 해운대 상가 NPL 패키지", volume: "85억", status: "판매중", views: 680, interested: 15, createdAt: "2026-03-12T10:00:00Z" },
    { id: "LST-003", title: "경기 판교 오피스 비경매채권", volume: "156억", status: "협상중", views: 920, interested: 22, createdAt: "2026-03-08T14:00:00Z" },
    { id: "LST-004", title: "인천 송도 물류센터 NPL", volume: "210억", status: "완료", views: 1100, interested: 31, createdAt: "2026-02-28T09:00:00Z" },
    { id: "LST-005", title: "대전 유성구 토지 담보채권", volume: "48억", status: "판매중", views: 430, interested: 9, createdAt: "2026-02-20T11:00:00Z" },
  ],
  monthly_stats: [
    { month: "2025.10", listings: 5, views: 2100, deals: 1 },
    { month: "2025.11", listings: 7, views: 2800, deals: 2 },
    { month: "2025.12", listings: 6, views: 2400, deals: 1 },
    { month: "2026.01", listings: 8, views: 3200, deals: 2 },
    { month: "2026.02", listings: 9, views: 3600, deals: 1 },
    { month: "2026.03", listings: 7, views: 4200, deals: 2 },
  ],
};

// ─── Status label helpers ─────────────────────────────────────
function listingStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: '판매중',
    CLOSED: '완료',
    PENDING_REVIEW: '검토중',
    CANCELLED: '취소',
    HIDDEN: '숨김',
  };
  return map[status] ?? status;
}

// ─── GET /api/v1/institution/dashboard ────────────────────────
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "로그인이 필요합니다." } },
        { status: 401 }
      );
    }

    // 2. Find the user's institution via institution_members
    const { data: memberData, error: memberError } = await supabase
      .from('institution_members')
      .select('institution_id, institutions(id, name, type, trust_grade)')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();

    if (memberError || !memberData) {
      logger.error("[institution/dashboard] institution_members error:", { error: memberError, userId: user.id });
      return NextResponse.json({ data: MOCK_DASHBOARD, _mock: true });
    }

    const institutionId = memberData.institution_id;

    // 3. Gather all member user_ids for this institution (to find their listings)
    const { data: allMembers, error: allMembersError } = await supabase
      .from('institution_members')
      .select('user_id')
      .eq('institution_id', institutionId)
      .eq('status', 'ACTIVE');

    if (allMembersError || !allMembers || allMembers.length === 0) {
      logger.error("[institution/dashboard] allMembers error:", { error: allMembersError });
      return NextResponse.json({ data: MOCK_DASHBOARD, _mock: true });
    }

    const memberUserIds = allMembers.map((m) => m.user_id);

    // 4. Fetch npl_listings for this institution's members
    const { data: listings, error: listingsError } = await supabase
      .from('npl_listings')
      .select('id, title, claim_amount, status, view_count, interest_count, created_at')
      .in('seller_id', memberUserIds)
      .order('created_at', { ascending: false });

    if (listingsError) {
      logger.error("[institution/dashboard] listings error:", { error: listingsError });
      return NextResponse.json({ data: MOCK_DASHBOARD, _mock: true });
    }

    const listingIds = (listings ?? []).map((l) => l.id);

    // 5. Fetch active deals linked to institution's listings
    let activeDealsCount = 0;
    if (listingIds.length > 0) {
      const { count, error: dealsError } = await supabase
        .from('deals')
        .select('id', { count: 'exact', head: true })
        .in('listing_id', listingIds)
        .not('current_stage', 'in', '("COMPLETED","CANCELLED")');

      if (!dealsError) {
        activeDealsCount = count ?? 0;
      }
    }

    // 6. Summary stats
    const totalListings = (listings ?? []).length;
    const totalViews = (listings ?? []).reduce((sum, l) => sum + (l.view_count ?? 0), 0);
    const interestedCount = (listings ?? []).reduce((sum, l) => sum + (l.interest_count ?? 0), 0);

    // 7. Recent listings (top 5)
    const recentListings = (listings ?? []).slice(0, 5).map((l) => ({
      id: l.id,
      title: l.title ?? '(제목 없음)',
      volume: l.claim_amount ? `${Math.round(l.claim_amount / 100000000)}억` : '-',
      status: listingStatusLabel(l.status),
      views: l.view_count ?? 0,
      interested: l.interest_count ?? 0,
      createdAt: l.created_at,
    }));

    // 8. Monthly stats — last 6 months
    const now = new Date();
    const monthlyStats: { month: string; listings: number; views: number; deals: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthListings = (listings ?? []).filter((l) => {
        const created = new Date(l.created_at);
        return created >= monthStart && created <= monthEnd;
      });

      // Deals for this month's listings
      let monthDeals = 0;
      if (listingIds.length > 0) {
        const monthListingIds = monthListings.map((l) => l.id);
        if (monthListingIds.length > 0) {
          const { count } = await supabase
            .from('deals')
            .select('id', { count: 'exact', head: true })
            .in('listing_id', monthListingIds);
          monthDeals = count ?? 0;
        }
      }

      monthlyStats.push({
        month: monthKey,
        listings: monthListings.length,
        views: monthListings.reduce((s, l) => s + (l.view_count ?? 0), 0),
        deals: monthDeals,
      });
    }

    const dashboard = {
      summary: {
        total_listings: totalListings,
        active_deals: activeDealsCount,
        total_views: totalViews,
        interested_count: interestedCount,
      },
      recent_listings: recentListings,
      monthly_stats: monthlyStats,
    };

    return NextResponse.json({ data: dashboard });
  } catch (err) {
    logger.error("[institution/dashboard] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "기관 대시보드 조회 실패" } },
      { status: 500 }
    );
  }
}
