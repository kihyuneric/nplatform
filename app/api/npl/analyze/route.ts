import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth/get-user';
import { NextRequest, NextResponse } from 'next/server';
import { nplAnalyzeSchema, validateBody } from '@/lib/validations';
import {
  generateDistributionScenarios,
  calculateNplReturn,
  calculateDirectAuctionIRR,
  generateNplSensitivityMatrix,
  generateDirectSensitivityMatrix,
  generateRentSensitivityMatrix,
  assessRisks,
} from '@/lib/npl/calculator';
import { CaseAssumptions, DEFAULT_ASSUMPTIONS } from '@/lib/npl/types';

export async function POST(request: NextRequest) {
  let userId = 'anonymous';
  try { const user = await getAuthUser(); if (user) userId = user.id; } catch {}
  if (userId === 'anonymous') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();

  let case_id: string;
  try {
    const body = await request.json();
    const validation = validateBody(nplAnalyzeSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: validation.error } },
        { status: 400 }
      );
    }
    case_id = validation.data.case_id;
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  // Fetch all case data
  const [caseRes, rightsRes, tenantsRes, assumptionsRes, propertiesRes] = await Promise.all([
    supabase.from('npl_cases').select('*').eq('id', case_id).eq('user_id', userId).single(),
    supabase.from('npl_case_rights').select('*').eq('case_id', case_id).order('priority_rank'),
    supabase.from('npl_case_tenants').select('*').eq('case_id', case_id),
    supabase.from('npl_case_assumptions').select('*').eq('case_id', case_id).single(),
    supabase.from('npl_case_properties').select('*').eq('case_id', case_id),
  ]);

  if (caseRes.error || !caseRes.data) {
    return NextResponse.json({ error: '케이스를 찾을 수 없습니다.' }, { status: 404 });
  }

  const caseInfo = caseRes.data;
  const rights = rightsRes.data || [];
  const tenants = tenantsRes.data || [];
  const properties = propertiesRes.data || [];

  // Merge assumptions with defaults to prevent missing fields
  const assumptions: CaseAssumptions = {
    ...DEFAULT_ASSUMPTIONS,
    case_id,
    ...(assumptionsRes.data || {}),
  } as CaseAssumptions;

  try {
    // 1. Generate distribution scenarios
    const distributions = generateDistributionScenarios(
      caseInfo.appraisal_value,
      caseInfo.minimum_price,
      rights,
      assumptions
    );

    if (distributions.length === 0) {
      return NextResponse.json({ error: '배당 시나리오 생성에 실패했습니다.' }, { status: 500 });
    }

    // 2. NPL return analysis (3 scenarios)
    const nplBondRight = rights.find(r => r.classification === '매입채권(NPL)');
    const nplReturns = [];

    if (nplBondRight) {
      const discountRates = [
        assumptions.bond_discount_rate_conservative,
        assumptions.bond_discount_rate_base,
        assumptions.bond_discount_rate_aggressive,
      ];
      const scenarioNames = ['보수적', '기본', '공격적'];

      // Use base distribution scenario for expected distribution
      const baseDistribution = distributions.find(d => d.scenario_name.includes('60%')) || distributions[0];
      const expectedDist = baseDistribution?.distribution_detail?.find(
        d => d.classification === '매입채권(NPL)'
      )?.distribution_amount || 0;

      for (let i = 0; i < discountRates.length; i++) {
        const result = calculateNplReturn(
          nplBondRight.principal,
          discountRates[i],
          expectedDist,
          assumptions.investment_period_months,
          assumptions,
          rights,
          caseInfo.appraisal_value
        );
        result.case_id = case_id;
        result.scenario_name = scenarioNames[i];
        nplReturns.push(result);
      }
    }

    // 3. Direct auction IRR (3 scenarios)
    const rentableArea = caseInfo.building_area || 0;
    const bidPrices = [
      Math.round(caseInfo.appraisal_value * 0.50),
      Math.round(caseInfo.appraisal_value * 0.55),
      Math.round(caseInfo.appraisal_value * 0.60),
    ];
    const directReturns = bidPrices.map(bp =>
      calculateDirectAuctionIRR(bp, assumptions, caseInfo.appraisal_value, caseInfo.ai_estimated_value, rentableArea)
    );
    directReturns.forEach(r => { r.case_id = case_id; });

    // 4. Sensitivity matrices
    const saleScenarios = [];
    for (let rate = 0.45; rate <= 0.80; rate += 0.05) {
      saleScenarios.push(Math.round(caseInfo.appraisal_value * rate));
    }
    const discountRatesForMatrix = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30];

    const nplSensitivity = nplBondRight
      ? generateNplSensitivityMatrix(nplBondRight.principal, saleScenarios, discountRatesForMatrix, rights, assumptions, caseInfo.appraisal_value)
      : null;

    const holdingPeriods = [3, 4, 5, 6, 7, 8, 9, 10];
    const directSensitivity = generateDirectSensitivityMatrix(
      saleScenarios, holdingPeriods, assumptions, caseInfo.appraisal_value, caseInfo.ai_estimated_value, rentableArea
    );

    const rentPrices = [4000, 5000, 6000, 7000, 8000, 9000, 10000];
    const rentSensitivity = generateRentSensitivityMatrix(saleScenarios, rentPrices, assumptions, rentableArea);

    // 5. Risk assessment
    const risks = assessRisks(caseInfo, rights, tenants, distributions);

    // Save results to database
    // Clear old results
    await Promise.all([
      supabase.from('npl_distributions').delete().eq('case_id', case_id),
      supabase.from('npl_returns').delete().eq('case_id', case_id),
      supabase.from('npl_sensitivity').delete().eq('case_id', case_id),
    ]);

    // Insert new results
    const distInserts = distributions.map(d => ({ ...d, case_id }));
    const returnInserts = [...nplReturns, ...directReturns].map(r => ({ ...r, case_id }));
    const sensitivityInserts = [nplSensitivity, directSensitivity, rentSensitivity]
      .filter(Boolean)
      .map(s => ({ ...s!, case_id }));

    const [distResult, retResult, sensResult, caseUpdateResult] = await Promise.all([
      supabase.from('npl_distributions').insert(distInserts),
      supabase.from('npl_returns').insert(returnInserts),
      supabase.from('npl_sensitivity').insert(sensitivityInserts),
      supabase.from('npl_cases').update({ status: 'analyzed', updated_at: new Date().toISOString() }).eq('id', case_id),
    ]);

    // Check for DB insert errors
    const dbErrors = [
      distResult.error && `배당결과: ${distResult.error.message}`,
      retResult.error && `수익분석: ${retResult.error.message}`,
      sensResult.error && `민감도: ${sensResult.error.message}`,
      caseUpdateResult.error && `상태업데이트: ${caseUpdateResult.error.message}`,
    ].filter(Boolean);

    if (dbErrors.length > 0) {
      console.error('DB insert errors:', dbErrors);
      return NextResponse.json({ error: `분석 결과 저장 실패: ${dbErrors.join(', ')}` }, { status: 500 });
    }

    return NextResponse.json({
      distributions,
      npl_returns: nplReturns,
      direct_returns: directReturns,
      sensitivity: { npl: nplSensitivity, direct: directSensitivity, rent: rentSensitivity },
      risks,
    });
  } catch (err) {
    console.error('Analysis calculation error:', err);
    return NextResponse.json(
      { error: `분석 계산 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}` },
      { status: 500 }
    );
  }
}
