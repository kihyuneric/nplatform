/**
 * GET /api/v1/analysis/listing/[id]
 *
 * useAnalysisReport hook 의 호출처. listing(매물 id) 의 최신 분석 KPI 반환.
 *
 * 우선순위:
 *   1. npl_ai_analyses 테이블의 가장 최신 row (사용자가 위저드/autoRun 으로 생성)
 *   2. 없으면 RAG + Claude 호출로 즉석 추정 (캐시 후 다음 호출 가속)
 *   3. RAG 도 실패하면 listing 의 기초 수치만으로 derive (use-analysis-report.ts 참조)
 *
 * 응답 형식:
 *   { data: { kpi: AnalysisKpiSet }, _source: 'real' | 'rag' | 'derived' }
 *
 *   AnalysisKpiSet 은 lib/hooks/use-analysis-report.ts 와 동일한 shape.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient, getSupabaseAdmin } from '@/lib/supabase/server'

interface AnalysisKpiSet {
  predictedRecoveryRate: number
  recoveryConfidence: number
  riskGrade: string
  riskScore: number
  riskLevel: string
  roi: number
  netProfit: number
  ownCapital: number
  recoveryMonths: number
  expectedBidRatio: number
  source: 'real' | 'derived' | 'rag'
}

// ─── DB row → KPI 매핑 ────────────────────────────────────────────
function mapAnalysisRowToKpi(row: Record<string, unknown>): AnalysisKpiSet | null {
  if (!row) return null
  const grade = String(row.ai_grade ?? row.risk_grade ?? 'B')
  const score = typeof row.risk_score === 'number'
    ? (row.risk_score as number)
    : { S: 92, 'A+': 87, A: 80, 'B+': 73, B: 66, 'C+': 58, C: 50, D: 38, E: 25 }[grade.toUpperCase()] ?? 60
  const recovery = typeof row.expected_recovery_rate === 'number' ? (row.expected_recovery_rate as number) : 0
  const recoveryMonths = typeof row.recovery_months === 'number' ? (row.recovery_months as number) : 11
  const roi = typeof row.roi === 'number' ? (row.roi as number)
            : typeof row.expected_roi === 'number' ? (row.expected_roi as number) : 0
  const netProfit = typeof row.net_profit === 'number' ? (row.net_profit as number) : 0
  const ownCapital = typeof row.own_capital === 'number' ? (row.own_capital as number) : 0
  const expectedBidRatio = typeof row.expected_bid_ratio === 'number' ? (row.expected_bid_ratio as number) : 70
  const riskLevel = score >= 80 ? 'LOW' : score >= 60 ? 'MEDIUM' : score >= 40 ? 'HIGH' : 'CRITICAL'

  return {
    predictedRecoveryRate: recovery,
    recoveryConfidence: typeof row.recovery_confidence === 'number' ? (row.recovery_confidence as number) : 85,
    riskGrade: grade,
    riskScore: score,
    riskLevel,
    roi,
    netProfit,
    ownCapital,
    recoveryMonths,
    expectedBidRatio,
    source: 'real',
  }
}

// ─── listing → 추정 KPI (RAG / Claude 없을 때 fallback) ────────────
function deriveKpiFromListing(listing: Record<string, unknown>): AnalysisKpiSet {
  const principal = (listing.principal_amount as number) ?? (listing.claim_amount as number) ?? 0
  const appraisal = (listing.appraised_value as number) ?? (listing.appraisal_value as number) ?? 0
  const askingPrice = (listing.asking_price as number) ?? Math.round(principal * 0.7)

  const expectedBidRatio = 70
  const recovery = appraisal > 0 ? appraisal * (expectedBidRatio / 100) : principal * 0.5
  const recoveryRate = principal > 0 ? Math.round((recovery / principal) * 1000) / 10 : 0
  const netProfit = Math.max(0, recovery - askingPrice - askingPrice * 0.05)
  const roi = askingPrice > 0 ? Math.round((netProfit / askingPrice) * 1000) / 10 : 0
  const ownCapital = Math.round(askingPrice * 0.3)
  const grade = String(listing.risk_grade ?? listing.ai_grade ?? 'B').toUpperCase()
  const score = { S: 92, 'A+': 87, A: 80, 'B+': 73, B: 66, 'C+': 58, C: 50, D: 38, E: 25 }[grade] ?? 60
  const riskLevel = score >= 80 ? 'LOW' : score >= 60 ? 'MEDIUM' : score >= 40 ? 'HIGH' : 'CRITICAL'

  return {
    predictedRecoveryRate: recoveryRate,
    recoveryConfidence: 65,
    riskGrade: grade,
    riskScore: score,
    riskLevel,
    roi,
    netProfit,
    ownCapital,
    recoveryMonths: 11,
    expectedBidRatio,
    source: 'derived',
  }
}

// ─── Claude + RAG 즉석 추정 (선택적, env 가 있을 때만 활성화) ────────
async function deriveKpiFromRag(
  listing: Record<string, unknown>,
): Promise<AnalysisKpiSet | null> {
  const ANTHROPIC = process.env.ANTHROPIC_API_KEY
  const VOYAGE = process.env.VOYAGE_API_KEY
  if (!ANTHROPIC || !VOYAGE) return null

  // 사용자가 위저드 흐름을 안 거쳐서 row 가 없을 때만 호출. 너무 많이 호출되지 않도록
  // — 실 운영에서는 cache 또는 backend job 으로 사전 계산 권장.
  // 현재 구현: RAG context + Claude 한번 호출해서 KPI 추정.
  const region = [listing.sido, listing.sigungu].filter(Boolean).join(' ')
  const collateralType = String(listing.collateral_type ?? '')
  const principal = (listing.principal_amount as number) ?? (listing.claim_amount as number) ?? 0
  const appraisal = (listing.appraised_value as number) ?? (listing.appraisal_value as number) ?? 0

  // RAG context 가져오기 — 비차단 best-effort
  let ragContext = ''
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const ragRes = await fetch(`${baseUrl}/api/v1/rag/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `${region} ${collateralType} NPL 낙찰가율 회수율 유사 사례`,
        match_count: 4,
        threshold: 0.55,
      }),
    })
    if (ragRes.ok) {
      const j = await ragRes.json()
      ragContext = String(j?.context_text ?? '').slice(0, 4000)
    }
  } catch {
    // ignore
  }

  const prompt = `당신은 NPL(부실채권) 투자 분석 전문가입니다. 다음 매물 정보와 (있다면) 유사 사례 컨텍스트를 바탕으로 KPI 를 JSON 으로 추정하세요.

매물:
  · 지역: ${region}
  · 담보 유형: ${collateralType}
  · 채권잔액: ${principal.toLocaleString('ko-KR')} 원
  · 감정가: ${appraisal.toLocaleString('ko-KR')} 원
  · 매각희망가: ${(listing.asking_price as number ?? 0).toLocaleString('ko-KR')} 원

유사 사례 컨텍스트:
${ragContext || '(RAG 컨텍스트 없음)'}

다음 JSON 만 반환 (코드블록 없이):
{
  "predictedRecoveryRate": <0~100 number>,
  "recoveryConfidence": <0~100 number>,
  "riskGrade": "S|A+|A|B+|B|C+|C|D|E",
  "riskScore": <0~100 number>,
  "roi": <number>,
  "expectedBidRatio": <0~100 number>,
  "recoveryMonths": <int>,
  "summary": "<150자 이내 한 줄 요약>"
}`

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': ANTHROPIC,
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!resp.ok) return null
    const data = await resp.json() as { content?: Array<{ type: string; text?: string }> }
    const text = data.content?.find((c) => c.type === 'text')?.text ?? ''
    // JSON 추출 — 첫 { 부터 마지막 } 까지
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    const json = JSON.parse(match[0]) as {
      predictedRecoveryRate: number
      recoveryConfidence: number
      riskGrade: string
      riskScore: number
      roi: number
      expectedBidRatio: number
      recoveryMonths: number
    }
    const score = json.riskScore
    const riskLevel = score >= 80 ? 'LOW' : score >= 60 ? 'MEDIUM' : score >= 40 ? 'HIGH' : 'CRITICAL'

    // ROI / netProfit 등은 listing 수치로 다시 계산 (Claude 가 잘못된 단위로 답할 수 있음)
    const askingPrice = (listing.asking_price as number) ?? Math.round(principal * 0.7)
    const recovery = appraisal > 0 ? appraisal * (json.expectedBidRatio / 100) : principal * (json.predictedRecoveryRate / 100)
    const netProfit = Math.max(0, recovery - askingPrice - askingPrice * 0.05)
    const roi = askingPrice > 0 ? Math.round((netProfit / askingPrice) * 1000) / 10 : 0

    return {
      predictedRecoveryRate: json.predictedRecoveryRate,
      recoveryConfidence: json.recoveryConfidence,
      riskGrade: json.riskGrade,
      riskScore: score,
      riskLevel,
      roi,
      netProfit,
      ownCapital: Math.round(askingPrice * 0.3),
      recoveryMonths: json.recoveryMonths,
      expectedBidRatio: json.expectedBidRatio,
      source: 'rag',
    }
  } catch (err) {
    logger.warn('[analysis/listing] Claude RAG estimation failed', { error: err })
    return null
  }
}

// ─── GET ────────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const admin = getSupabaseAdmin()
    const supabase = await createClient()

    // 1. 최신 npl_ai_analyses row 조회
    const { data: existing, error: aErr } = await supabase
      .from('npl_ai_analyses')
      .select('*')
      .eq('listing_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!aErr && existing) {
      const kpi = mapAnalysisRowToKpi(existing as Record<string, unknown>)
      if (kpi) return NextResponse.json({ data: { kpi }, _source: 'real' })
    }

    // 2. listing 정보 조회 (admin 으로 RLS 우회 — KPI 추정용)
    const { data: listing, error: lErr } = await admin
      .from('npl_listings')
      .select('*')
      .eq('id', id)
      .single()
    if (lErr || !listing) {
      return NextResponse.json(
        { data: { kpi: null }, _source: 'not_found' },
        { status: 200 },
      )
    }

    // 3. RAG + Claude 즉석 추정 (env 있을 때만)
    const ragKpi = await deriveKpiFromRag(listing as Record<string, unknown>)
    if (ragKpi) return NextResponse.json({ data: { kpi: ragKpi }, _source: 'rag' })

    // 4. 마지막 fallback — listing 기초 수치 derive
    const derivedKpi = deriveKpiFromListing(listing as Record<string, unknown>)
    return NextResponse.json({ data: { kpi: derivedKpi }, _source: 'derived' })
  } catch (err) {
    logger.error('[analysis/listing] GET error', { error: err })
    return NextResponse.json({ data: { kpi: null }, _source: 'error' }, { status: 200 })
  }
}
