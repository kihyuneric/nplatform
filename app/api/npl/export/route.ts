import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/get-user';
import { NextRequest, NextResponse } from 'next/server';
import { generateExcelReport } from '@/lib/npl/excel-export';
import { generatePdfReport } from '@/lib/npl/pdf-export';
import { loadKoreanFont } from '@/lib/npl/korean-font';
import * as XLSX from 'xlsx';

export async function GET(request: NextRequest) {
  let userId = 'anonymous';
  try { const user = await getAuthUser(); if (user) userId = user.id; } catch {}
  if (userId === 'anonymous') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('case_id');
  const format = searchParams.get('format') || 'xlsx';

  if (!caseId) {
    return NextResponse.json({ error: 'case_id required' }, { status: 400 });
  }

  // Fetch all case data
  const [caseRes, rightsRes, tenantsRes, assumptionsRes, distRes, returnsRes, sensRes] = await Promise.all([
    supabase.from('npl_cases').select('*').eq('id', caseId).eq('user_id', userId).single(),
    supabase.from('npl_case_rights').select('*').eq('case_id', caseId).order('priority_rank'),
    supabase.from('npl_case_tenants').select('*').eq('case_id', caseId),
    supabase.from('npl_case_assumptions').select('*').eq('case_id', caseId).single(),
    supabase.from('npl_distributions').select('*').eq('case_id', caseId),
    supabase.from('npl_returns').select('*').eq('case_id', caseId),
    supabase.from('npl_sensitivity').select('*').eq('case_id', caseId),
  ]);

  if (caseRes.error || !caseRes.data) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  // Compute risks on server (simple version)
  const caseInfo = caseRes.data;
  const tenants = tenantsRes.data || [];
  const nplReturns = (returnsRes.data || []).filter((r: Record<string, unknown>) => r.strategy_type === 'NPL');
  const baseNpl = nplReturns.find((r: Record<string, unknown>) => r.scenario_name === '기본') || nplReturns[0];

  const risks = [
    {
      category: '대항력 임차인',
      description: '임차인의 대항력 보유 여부',
      level: (tenants.some((t: Record<string, unknown>) => t.has_opposition_right) ? '높음' : '양호') as '높음' | '주의' | '양호',
      detail: tenants.length > 0 ? `임차인 ${tenants.length}명` : '임차인 없음',
    },
    {
      category: '유찰횟수',
      description: '경매 유찰 횟수',
      level: (caseInfo.auction_count <= 1 ? '양호' : caseInfo.auction_count <= 3 ? '주의' : '높음') as '높음' | '주의' | '양호',
      detail: `${caseInfo.auction_count}회 유찰`,
    },
    {
      category: '최저가율',
      description: '감정가 대비 최저가 비율',
      level: ((caseInfo.minimum_price / caseInfo.appraisal_value) > 0.5 ? '양호' : (caseInfo.minimum_price / caseInfo.appraisal_value) > 0.3 ? '주의' : '높음') as '높음' | '주의' | '양호',
      detail: `감정가 대비 ${((caseInfo.minimum_price / caseInfo.appraisal_value) * 100).toFixed(1)}%`,
    },
  ];

  if (baseNpl) {
    risks.push({
      category: '채권 회수율',
      description: 'NPL 채권의 MOIC',
      level: ((baseNpl as Record<string, unknown>).moic as number >= 1.2 ? '양호' : (baseNpl as Record<string, unknown>).moic as number >= 1 ? '주의' : '높음') as '높음' | '주의' | '양호',
      detail: `MOIC ${((baseNpl as Record<string, unknown>).moic as number)?.toFixed(2)}x`,
    });
  }

  const exportData = {
    case_info: caseInfo,
    rights: rightsRes.data || [],
    tenants,
    assumptions: assumptionsRes.data || {},
    distributions: distRes.data || [],
    returns: returnsRes.data || [],
    sensitivity: sensRes.data || [],
    risks,
  };

  // Encode filename for Content-Disposition (RFC 5987 for non-ASCII)
  const rawName = `NPL_${caseInfo.case_number || caseId}`;
  const encodedName = encodeURIComponent(rawName);
  const safeAsciiName = rawName.replace(/[^\x20-\x7E]/g, '_');

  if (format === 'pdf') {
    let fontBase64: string | undefined;
    try {
      fontBase64 = await loadKoreanFont();
    } catch {
      // Falls back to default font if Korean font fails to load
    }
    const doc = generatePdfReport(exportData as Parameters<typeof generatePdfReport>[0], fontBase64);
    const pdfBytes = new Uint8Array(doc.output('arraybuffer'));
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeAsciiName}.pdf"; filename*=UTF-8''${encodedName}.pdf`,
      },
    });
  }

  // Default: xlsx
  const wb = generateExcelReport(exportData as Parameters<typeof generateExcelReport>[0]);
  const xlsxBytes = new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
  return new NextResponse(xlsxBytes, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeAsciiName}.xlsx"; filename*=UTF-8''${encodedName}.xlsx`,
    },
  });
}
