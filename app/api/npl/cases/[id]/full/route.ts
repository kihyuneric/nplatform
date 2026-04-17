import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/get-user';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let userId = 'anonymous';
  try { const user = await getAuthUser(); if (user) userId = user.id; } catch {}

  if (userId === 'anonymous') {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' } },
      { status: 401 }
    )
  }

  const supabase = await createClient();
  const [
    caseResult,
    propertiesResult,
    rightsResult,
    tenantsResult,
    assumptionsResult,
    auctionHistoryResult,
    distributionsResult,
    returnsResult,
    sensitivityResult,
  ] = await Promise.all([
    supabase.from('npl_cases').select('*').eq('id', id).eq('user_id', userId).single(),
    supabase.from('npl_case_properties').select('*').eq('case_id', id).order('property_no'),
    supabase.from('npl_case_rights').select('*').eq('case_id', id).order('priority_rank'),
    supabase.from('npl_case_tenants').select('*').eq('case_id', id),
    supabase.from('npl_case_assumptions').select('*').eq('case_id', id).single(),
    supabase.from('npl_auction_history').select('*').eq('case_id', id).order('round'),
    supabase.from('npl_distributions').select('*').eq('case_id', id),
    supabase.from('npl_returns').select('*').eq('case_id', id),
    supabase.from('npl_sensitivity').select('*').eq('case_id', id),
  ]);

  if (caseResult.error) {
    return NextResponse.json({ error: caseResult.error.message }, { status: 500 });
  }

  const caseInfo = caseResult.data;
  const tenants = tenantsResult.data || [];
  const returns = returnsResult.data || [];
  const nplReturns = returns.filter((r: Record<string, unknown>) => r.strategy_type === 'NPL');
  const baseNpl = nplReturns.find((r: Record<string, unknown>) => r.scenario_name === '기본') || nplReturns[0];

  // Server-side risk assessment
  const risks: Array<{ category: string; description: string; level: string; detail: string }> = [
    {
      category: '대항력 임차인',
      description: '임차인의 대항력 보유 여부',
      level: tenants.some((t: Record<string, unknown>) => t.has_opposition_right) ? '높음' : '양호',
      detail: tenants.length > 0 ? `임차인 ${tenants.length}명` : '임차인 없음',
    },
    {
      category: '채권 회수율',
      description: 'NPL 채권의 MOIC',
      level: baseNpl
        ? ((baseNpl as Record<string, unknown>).moic as number >= 1.2 ? '양호' : (baseNpl as Record<string, unknown>).moic as number >= 1 ? '주의' : '높음')
        : '양호',
      detail: baseNpl ? `MOIC ${((baseNpl as Record<string, unknown>).moic as number)?.toFixed(2)}x` : '-',
    },
    {
      category: '유찰횟수',
      description: '경매 유찰 횟수',
      level: caseInfo.auction_count <= 1 ? '양호' : caseInfo.auction_count <= 3 ? '주의' : '높음',
      detail: `${caseInfo.auction_count}회 유찰`,
    },
    {
      category: '최저가율',
      description: '감정가 대비 최저가 비율',
      level: (caseInfo.minimum_price / caseInfo.appraisal_value) > 0.5 ? '양호' : (caseInfo.minimum_price / caseInfo.appraisal_value) > 0.3 ? '주의' : '높음',
      detail: `감정가 대비 ${((caseInfo.minimum_price / caseInfo.appraisal_value) * 100).toFixed(1)}%`,
    },
  ];

  if (caseInfo.ai_estimated_value) {
    const gap = (caseInfo.ai_estimated_value - caseInfo.appraisal_value) / caseInfo.appraisal_value;
    risks.push({
      category: 'AI시세 괴리',
      description: 'AI 추정시세와 감정가 차이',
      level: Math.abs(gap) < 0.1 ? '양호' : Math.abs(gap) < 0.3 ? '주의' : '높음',
      detail: `AI시세 ${gap > 0 ? '+' : ''}${(gap * 100).toFixed(1)}%`,
    });
  }

  return NextResponse.json({
    case_info: caseInfo,
    properties: propertiesResult.data || [],
    rights: rightsResult.data || [],
    tenants,
    assumptions: assumptionsResult.data || null,
    auction_history: auctionHistoryResult.data || [],
    distributions: distributionsResult.data || [],
    returns,
    sensitivity: sensitivityResult.data || [],
    risks,
  });
}
