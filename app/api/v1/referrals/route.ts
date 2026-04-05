import { NextRequest, NextResponse } from "next/server";
import { logger } from '@/lib/logger'
import { createClient } from "@/lib/supabase/server";

// ─── Mock Data ────────────────────────────────────────────────
const MOCK_REFERRALS = [
  { id: "REF-001", name: "김철수", email: "kim@example.com", role: "BUYER", status: "활성", joinedAt: "2026-03-15T09:00:00Z", lastActive: "2026-03-18T14:00:00Z" },
  { id: "REF-002", name: "이영희", email: "lee@example.com", role: "SELLER", status: "활성", joinedAt: "2026-03-10T10:00:00Z", lastActive: "2026-03-17T11:30:00Z" },
  { id: "REF-003", name: "박민수", email: "park@example.com", role: "BUYER", status: "대기", joinedAt: "2026-03-08T14:00:00Z", lastActive: "2026-03-08T14:00:00Z" },
  { id: "REF-004", name: "정하나", email: "jung@example.com", role: "INVESTOR", status: "활성", joinedAt: "2026-02-28T09:00:00Z", lastActive: "2026-03-16T16:00:00Z" },
  { id: "REF-005", name: "최준호", email: "choi@example.com", role: "BUYER", status: "비활성", joinedAt: "2026-02-20T11:00:00Z", lastActive: "2026-02-25T10:00:00Z" },
  { id: "REF-006", name: "강서연", email: "kang@example.com", role: "PROFESSIONAL", status: "활성", joinedAt: "2026-02-15T08:00:00Z", lastActive: "2026-03-18T09:00:00Z" },
  { id: "REF-007", name: "윤태규", email: "yoon@example.com", role: "BUYER", status: "활성", joinedAt: "2026-02-10T10:00:00Z", lastActive: "2026-03-15T13:00:00Z" },
  { id: "REF-008", name: "한미경", email: "han@example.com", role: "SELLER", status: "대기", joinedAt: "2026-01-25T09:00:00Z", lastActive: "2026-01-25T09:00:00Z" },
  { id: "REF-009", name: "오성진", email: "oh@example.com", role: "INVESTOR", status: "활성", joinedAt: "2026-01-18T14:00:00Z", lastActive: "2026-03-12T17:00:00Z" },
  { id: "REF-010", name: "서지민", email: "seo@example.com", role: "BUYER", status: "활성", joinedAt: "2026-01-10T11:00:00Z", lastActive: "2026-03-18T10:00:00Z" },
];

// ─── GET /api/v1/referrals ────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const role = searchParams.get("role");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Try Supabase first
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Get user's referral code
      const { data: codeData } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (codeData) {
        let query = supabase
          .from('referrals')
          .select(`
            *,
            referred_user:users!referrals_referred_user_id_fkey(id, name, email, role)
          `)
          .eq('referral_code_id', codeData.id)
          .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);
        if (role) query = query.eq('referred_user.role', role);
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to);

        const { data, error } = await query;

        if (!error && data) {
          return NextResponse.json({
            data,
            total: data.length,
            _source: 'supabase',
          });
        }
      }
    }
  } catch (e) {
    logger.error("[referrals] GET error:", { error: e });
    // Fall through to mock
  }

  // Mock fallback
  try {
    let filtered = [...MOCK_REFERRALS];

    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }
    if (role) {
      filtered = filtered.filter((r) => r.role === role);
    }
    if (from) {
      filtered = filtered.filter((r) => r.joinedAt >= from);
    }
    if (to) {
      filtered = filtered.filter((r) => r.joinedAt <= to);
    }

    return NextResponse.json({
      data: filtered,
      total: filtered.length,
      _mock: true,
    });
  } catch (err) {
    logger.error("[referrals] GET Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "추천 목록 조회 실패" } },
      { status: 500 }
    );
  }
}
