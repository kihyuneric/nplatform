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
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "20", 10);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      );
    }

    // Fetch referral code owned by this user
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();

    if (codeData) {
      let query = supabase
        .from('referrals')
        .select('id, referred_id, status, signed_up_at, converted_at', { count: 'exact' })
        .eq('referral_code_id', codeData.id)
        .order('signed_up_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (status) query = query.eq('status', status);
      if (from) query = query.gte('signed_up_at', from);
      if (to) query = query.lte('signed_up_at', to);

      const { data, error, count } = await query;

      if (!error && data) {
        return NextResponse.json({
          data,
          total: count ?? data.length,
          page,
          limit,
          _source: 'supabase',
        });
      }
    }

    // No referral code yet — return empty
    return NextResponse.json({
      data: [],
      total: 0,
      page,
      limit,
      _source: 'supabase',
    });
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

// ─── POST /api/v1/referrals — Create a referral record ───────
// Called when a referred user signs up via a referral code.
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "인증이 필요합니다." } },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { referral_code, referred_user_id } = body;

    if (!referral_code) {
      return NextResponse.json(
        { error: { code: "MISSING_FIELDS", message: "추천 코드가 필요합니다." } },
        { status: 400 }
      );
    }

    // Resolve referral code record
    const { data: codeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('id, owner_id, status, max_uses, use_count')
      .eq('code', referral_code)
      .maybeSingle();

    if (codeError || !codeData) {
      return NextResponse.json(
        { error: { code: "INVALID_CODE", message: "유효하지 않은 추천 코드입니다." } },
        { status: 404 }
      );
    }

    if (codeData.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: { code: "CODE_INACTIVE", message: "비활성화된 추천 코드입니다." } },
        { status: 400 }
      );
    }

    if (codeData.max_uses != null && codeData.use_count >= codeData.max_uses) {
      return NextResponse.json(
        { error: { code: "CODE_EXHAUSTED", message: "추천 코드 사용 횟수가 초과되었습니다." } },
        { status: 400 }
      );
    }

    const referredId = referred_user_id ?? user.id;

    // Insert referral
    const { data: referral, error: insertError } = await supabase
      .from('referrals')
      .insert({
        referral_code_id: codeData.id,
        referrer_id: codeData.owner_id,
        referred_id: referredId,
        status: 'SIGNED_UP',
        signed_up_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      logger.error("[referrals] POST insert error:", { error: insertError });
      return NextResponse.json(
        { error: { code: "INSERT_ERROR", message: "추천 등록에 실패했습니다." } },
        { status: 500 }
      );
    }

    // Increment use_count
    await supabase
      .from('referral_codes')
      .update({ use_count: codeData.use_count + 1 })
      .eq('id', codeData.id);

    return NextResponse.json(
      { data: referral, success: true, _source: 'supabase' },
      { status: 201 }
    );
  } catch (err) {
    logger.error("[referrals] POST Error:", { error: err });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "추천 등록 실패" } },
      { status: 500 }
    );
  }
}
