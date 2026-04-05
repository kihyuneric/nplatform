import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server";

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_SETTLEMENTS = [
  {
    id: "S-001",
    amount: 4200000,
    status: "완료",
    bank_name: "국민은행",
    account_number: "***-1234",
    requestedAt: "2026-03-01T10:00:00Z",
    settledAt: "2026-03-05T14:00:00Z",
    leads: ["L-003", "L-007"],
  },
  {
    id: "S-002",
    amount: 2670000,
    status: "처리중",
    bank_name: "국민은행",
    account_number: "***-1234",
    requestedAt: "2026-03-10T09:00:00Z",
    settledAt: null,
    leads: ["L-009"],
  },
  {
    id: "S-003",
    amount: 1500000,
    status: "대기",
    bank_name: "국민은행",
    account_number: "***-1234",
    requestedAt: "2026-03-15T11:00:00Z",
    settledAt: null,
    leads: ["L-001"],
  },
  {
    id: "S-004",
    amount: 3600000,
    status: "완료",
    bank_name: "신한은행",
    account_number: "***-5678",
    requestedAt: "2026-02-01T10:00:00Z",
    settledAt: "2026-02-06T15:30:00Z",
    leads: ["L-010", "L-012"],
  },
  {
    id: "S-005",
    amount: 960000,
    status: "반려",
    bank_name: "국민은행",
    account_number: "***-1234",
    requestedAt: "2026-02-20T14:00:00Z",
    settledAt: null,
    reason: "최소 정산 금액 미달",
    leads: [],
  },
];

const MOCK_MONTHLY_SUMMARY = [
  { month: "2026-03", total: 8370000, settled: 4200000, pending: 4170000, count: 3 },
  { month: "2026-02", total: 4560000, settled: 3600000, pending: 0, rejected: 960000, count: 2 },
  { month: "2026-01", total: 5200000, settled: 5200000, pending: 0, count: 2 },
];

// ─── GET /api/v1/partner/settlements ──────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const status = searchParams.get("status");
  const period = searchParams.get("period");

  // Try Supabase first
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      if (action === "monthly") {
        // Monthly summary query
        const { data, error } = await supabase
          .from('partner_settlements')
          .select('amount, status, requested_at')
          .eq('partner_id', user.id)
          .order('requested_at', { ascending: false });

        if (!error && data && data.length > 0) {
          // Group by month
          const monthMap = new Map<string, { total: number; settled: number; pending: number; rejected: number; count: number }>();
          for (const s of data) {
            const month = (s.requested_at as string).slice(0, 7);
            if (!monthMap.has(month)) {
              monthMap.set(month, { total: 0, settled: 0, pending: 0, rejected: 0, count: 0 });
            }
            const m = monthMap.get(month)!;
            m.total += s.amount;
            m.count += 1;
            if (s.status === '완료') m.settled += s.amount;
            else if (s.status === '반려') m.rejected += s.amount;
            else m.pending += s.amount;
          }
          const summary = Array.from(monthMap.entries()).map(([month, v]) => ({ month, ...v }));
          return NextResponse.json({ data: summary, _source: 'supabase' });
        }
      } else {
        let query = supabase
          .from('partner_settlements')
          .select('*')
          .eq('partner_id', user.id)
          .order('requested_at', { ascending: false });

        if (status) query = query.eq('status', status);
        if (period === "this_month") {
          const now = new Date();
          const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
          query = query.gte('requested_at', monthStart);
        } else if (period === "last_month") {
          const now = new Date();
          now.setMonth(now.getMonth() - 1);
          const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
          query = query.gte('requested_at', monthStart).lte('requested_at', monthEnd);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          return NextResponse.json({
            data,
            total: data.length,
            _source: 'supabase',
          });
        }
      }
    }
  } catch (e) {
    logger.error("[partner/settlements] GET error:", { error: e });
    // Fall through to mock
  }

  // Mock fallback
  if (action === "monthly") {
    return NextResponse.json({ data: MOCK_MONTHLY_SUMMARY, _mock: true });
  }

  let filtered = [...MOCK_SETTLEMENTS];
  if (status) {
    filtered = filtered.filter((s) => s.status === status);
  }
  if (period === "this_month") {
    filtered = filtered.filter((s) => s.requestedAt.startsWith("2026-03"));
  } else if (period === "last_month") {
    filtered = filtered.filter((s) => s.requestedAt.startsWith("2026-02"));
  }

  return NextResponse.json({
    data: filtered,
    total: filtered.length,
    _mock: true,
  });
}

// ─── POST /api/v1/partner/settlements — Request settlement ────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, bank_name, account_number } = body;

    if (!amount || !bank_name || !account_number) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "금액, 은행명, 계좌번호는 필수입니다." } },
        { status: 400 }
      );
    }

    if (amount < 50000) {
      return NextResponse.json(
        { error: { code: "MIN_AMOUNT", message: "최소 정산 금액은 50,000원입니다." } },
        { status: 400 }
      );
    }

    // Try Supabase first
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from('partner_settlements')
          .insert({
            partner_id: user.id,
            amount,
            bank_name,
            account_number,
            status: '대기',
            requested_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && data) {
          return NextResponse.json(
            { data, success: true, _source: 'supabase' },
            { status: 201 }
          );
        }
      }
    } catch (e) {
      logger.error("[partner/settlements] POST supabase error:", { error: e });
      // Fall through to mock
    }

    // Mock fallback
    return NextResponse.json(
      {
        data: {
          id: `S-${Date.now().toString(36).toUpperCase()}`,
          amount,
          bank_name,
          account_number,
          status: "대기",
          requestedAt: new Date().toISOString(),
        },
        success: true,
        _mock: true,
      },
      { status: 201 }
    );
  } catch (err) {
    logger.error("[partner/settlements] POST Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "정산 요청 실패" } },
      { status: 500 }
    );
  }
}
