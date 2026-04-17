import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// ─── Mock Data (fallback) ─────────────────────────────────────
const MOCK_LEADERBOARD = [
  { rank: 1, name: "김대한", company: "한국자산관리", referrals: 48, earnings: 15800000, grade: "DIAMOND" },
  { rank: 2, name: "이서준", company: "서울NPL파트너스", referrals: 42, earnings: 13500000, grade: "DIAMOND" },
  { rank: 3, name: "박지훈", company: "부동산솔루션", referrals: 35, earnings: 11200000, grade: "PLATINUM" },
  { rank: 4, name: "최유진", company: "한강자산", referrals: 31, earnings: 9800000, grade: "PLATINUM" },
  { rank: 5, name: "정민호", company: "강남투자관리", referrals: 28, earnings: 8500000, grade: "GOLD" },
  { rank: 6, name: "강은지", company: "동부자산운용", referrals: 24, earnings: 7200000, grade: "GOLD" },
  { rank: 7, name: "윤성민", company: "태평양파트너스", referrals: 20, earnings: 6100000, grade: "GOLD" },
  { rank: 8, name: "한수빈", company: "수도권NPL", referrals: 18, earnings: 5400000, grade: "SILVER" },
  { rank: 9, name: "오재현", company: "삼성부동산", referrals: 15, earnings: 4500000, grade: "SILVER" },
  { rank: 10, name: "서하늘", company: "대한자산컨설팅", referrals: 12, earnings: 3600000, grade: "SILVER" },
];

const MOCK_MONTHLY_LEADERBOARD = [
  { rank: 1, name: "김대한", company: "한국자산관리", referrals: 8, earnings: 2400000, grade: "DIAMOND" },
  { rank: 2, name: "박지훈", company: "부동산솔루션", referrals: 7, earnings: 2100000, grade: "PLATINUM" },
  { rank: 3, name: "이서준", company: "서울NPL파트너스", referrals: 6, earnings: 1800000, grade: "DIAMOND" },
  { rank: 4, name: "정민호", company: "강남투자관리", referrals: 5, earnings: 1500000, grade: "GOLD" },
  { rank: 5, name: "최유진", company: "한강자산", referrals: 5, earnings: 1400000, grade: "PLATINUM" },
  { rank: 6, name: "강은지", company: "동부자산운용", referrals: 4, earnings: 1200000, grade: "GOLD" },
  { rank: 7, name: "윤성민", company: "태평양파트너스", referrals: 3, earnings: 900000, grade: "GOLD" },
  { rank: 8, name: "한수빈", company: "수도권NPL", referrals: 3, earnings: 800000, grade: "SILVER" },
  { rank: 9, name: "오재현", company: "삼성부동산", referrals: 2, earnings: 600000, grade: "SILVER" },
  { rank: 10, name: "서하늘", company: "대한자산컨설팅", referrals: 2, earnings: 500000, grade: "SILVER" },
];

// ─── Grade logic ──────────────────────────────────────────────
function calcGrade(referralCount: number): string {
  if (referralCount >= 40) return "DIAMOND";
  if (referralCount >= 30) return "PLATINUM";
  if (referralCount >= 20) return "GOLD";
  if (referralCount >= 10) return "SILVER";
  return "BRONZE";
}

// ─── GET /api/v1/referrals/leaderboard ────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period");

    const supabase = await createClient();

    // Build referrals query with period filter
    let referralsQuery = supabase
      .from('referrals')
      .select('referrer_id, created_at');

    if (period === 'this_month') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      referralsQuery = referralsQuery.gte('created_at', startOfMonth);
    }

    const { data: referralsData, error: referralsError } = await referralsQuery;

    if (referralsError || !referralsData || referralsData.length === 0) {
      if (referralsError) {
        logger.error("[referrals/leaderboard] DB error:", { error: referralsError });
      }
      const fallback = period === 'this_month' ? MOCK_MONTHLY_LEADERBOARD : MOCK_LEADERBOARD;
      return NextResponse.json({ data: fallback, _mock: true });
    }

    // Aggregate by referrer_id
    const aggregated = new Map<string, { referrals: number }>();
    for (const row of referralsData) {
      const existing = aggregated.get(row.referrer_id) ?? { referrals: 0 };
      existing.referrals += 1;
      aggregated.set(row.referrer_id, existing);
    }

    const referrerIds = Array.from(aggregated.keys());

    // Fetch earnings from referral_earnings
    const { data: earningsData, error: earningsError } = await supabase
      .from('referral_earnings')
      .select('referrer_id, amount')
      .in('referrer_id', referrerIds);

    const earningsByReferrer = new Map<string, number>();
    if (!earningsError && earningsData) {
      for (const row of earningsData) {
        earningsByReferrer.set(
          row.referrer_id,
          (earningsByReferrer.get(row.referrer_id) ?? 0) + (row.amount ?? 0)
        );
      }
    }

    // Fetch partner profiles for names and companies
    const { data: partnersData, error: partnersError } = await supabase
      .from('partners')
      .select('user_id, contact_name, company_name')
      .in('user_id', referrerIds);

    if (partnersError) {
      logger.error("[referrals/leaderboard] Partners fetch error:", { error: partnersError });
    }

    const partnerByUserId = new Map<string, { contact_name: string; company_name: string }>();
    if (partnersData) {
      for (const p of partnersData) {
        partnerByUserId.set(p.user_id, { contact_name: p.contact_name, company_name: p.company_name });
      }
    }

    // Build ranked leaderboard
    const ranked = Array.from(aggregated.entries())
      .map(([userId, stats]) => {
        const partner = partnerByUserId.get(userId);
        const referralCount = stats.referrals;
        return {
          referrer_id: userId,
          name: partner?.contact_name ?? '알 수 없음',
          company: partner?.company_name ?? '-',
          referrals: referralCount,
          earnings: earningsByReferrer.get(userId) ?? 0,
          grade: calcGrade(referralCount),
        };
      })
      .sort((a, b) => b.referrals - a.referrals)
      .slice(0, 50)
      .map((entry, idx) => ({
        rank: idx + 1,
        name: entry.name,
        company: entry.company,
        referrals: entry.referrals,
        earnings: entry.earnings,
        grade: entry.grade,
      }));

    if (ranked.length === 0) {
      const fallback = period === 'this_month' ? MOCK_MONTHLY_LEADERBOARD : MOCK_LEADERBOARD;
      return NextResponse.json({ data: fallback, _mock: true });
    }

    return NextResponse.json({ data: ranked });
  } catch (err) {
    logger.error("[referrals/leaderboard] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "리더보드 조회 실패" } },
      { status: 500 }
    );
  }
}
