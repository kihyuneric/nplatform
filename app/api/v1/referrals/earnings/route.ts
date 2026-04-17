import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server";

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_EARNINGS = [
  { id: "E-001", type: "SIGNUP_BONUS", referral_name: "김철수", amount: 50000, date: "2026-03-15T09:00:00Z", status: "지급완료" },
  { id: "E-002", type: "SUBSCRIPTION_SHARE", referral_name: "이영희", amount: 150000, date: "2026-03-12T10:00:00Z", status: "지급완료" },
  { id: "E-003", type: "DEAL_COMMISSION", referral_name: "박민수", amount: 3200000, date: "2026-03-10T14:00:00Z", status: "정산대기" },
  { id: "E-004", type: "CONSULTATION_SHARE", referral_name: "정하나", amount: 200000, date: "2026-03-08T11:00:00Z", status: "지급완료" },
  { id: "E-005", type: "SIGNUP_BONUS", referral_name: "최준호", amount: 50000, date: "2026-02-20T09:00:00Z", status: "지급완료" },
  { id: "E-006", type: "DEAL_COMMISSION", referral_name: "강서연", amount: 1800000, date: "2026-02-15T16:00:00Z", status: "지급완료" },
  { id: "E-007", type: "SUBSCRIPTION_SHARE", referral_name: "윤태규", amount: 150000, date: "2026-02-10T10:00:00Z", status: "지급완료" },
  { id: "E-008", type: "SIGNUP_BONUS", referral_name: "한미경", amount: 50000, date: "2026-01-25T09:00:00Z", status: "지급완료" },
];

// ─── GET /api/v1/referrals/earnings ───────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const period = searchParams.get("period");

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      );
    }

    let query = supabase
      .from('referral_earnings')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (type) query = query.eq('event_type', type);

    if (period === "this_month") {
      const now = new Date();
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      query = query.gte('created_at', monthStart);
    } else if (period === "last_month") {
      const now = new Date();
      now.setMonth(now.getMonth() - 1);
      const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      query = query.gte('created_at', monthStart).lte('created_at', monthEnd);
    }

    const { data, error } = await query;

    if (!error && data) {
      const totalAmount = data.reduce((sum, e) => sum + ((e.amount as number) || 0), 0);
      const pendingAmount = data
        .filter((e) => e.status === 'PENDING')
        .reduce((sum, e) => sum + ((e.amount as number) || 0), 0);
      const settledAmount = data
        .filter((e) => e.status === 'SETTLED')
        .reduce((sum, e) => sum + ((e.amount as number) || 0), 0);

      return NextResponse.json({
        data,
        total: data.length,
        totalAmount,
        pendingAmount,
        settledAmount,
        _source: 'supabase',
      });
    }
  } catch (e) {
    logger.error("[referrals/earnings] GET supabase error:", { error: e });
    // Fall through to mock
  }

  // Mock fallback
  try {
    let filtered = [...MOCK_EARNINGS];

    if (type) {
      filtered = filtered.filter((e) => e.type === type);
    }

    if (period === "this_month") {
      filtered = filtered.filter((e) => e.date.startsWith("2026-03"));
    } else if (period === "last_month") {
      filtered = filtered.filter((e) => e.date.startsWith("2026-02"));
    }

    const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({
      data: filtered,
      total: filtered.length,
      totalAmount,
      _mock: true,
    });
  } catch (err) {
    logger.error("[referrals/earnings] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "수익 목록 조회 실패" } },
      { status: 500 }
    );
  }
}
