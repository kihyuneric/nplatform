'use client'

/**
 * useAnalysisReport — 매물(listingId) 의 최신 분석 보고서 raw data.
 *
 * SoT 흐름:
 *   매물(listingId) → 분석 위저드 / autoRun → /api/v1/npl/profitability 응답 →
 *   딜룸 헤더 / Section 01 AI 분석 KPI / Section 03 가격 오퍼 등에서 동기 표시.
 *
 * 정책 (Phase G7+ 2026-04-28 갱신):
 *   1) listingId 가 사례 사전 빌드된 매물(종로 등)이면 buildXxxSampleReport()
 *      의 strategies.recommended 결과 사용 → NPL 분석 보고서 와 100% 동기.
 *   2) 실 분석 row 가 있으면 그 값 사용 (사용자 위저드/autoRun 결과)
 *   3) 둘 다 없으면 listing 의 기초 수치로 derived fallback 계산
 */

import { useQuery } from '@tanstack/react-query'
import { fetchSafe } from '@/lib/fetch-safe'
import {
  type ListingDetail,
  getListingPrincipal,
  getListingAppraisal,
  getListingAskingPrice,
} from '@/lib/hooks/use-listing'
import { buildJongnoSampleReport } from '@/lib/npl/unified-report/sample-jongno'
import { JONGNO_HONGJI_LISTING_ID } from '@/lib/samples/jongno-hongji-land-npl'
import type { UnifiedAnalysisReport } from '@/lib/npl/unified-report/types'

// ─── Types ────────────────────────────────────────────────────────────────

export interface AnalysisKpiSet {
  /** 예측 회수율 (%) — recovery / claim 비율 */
  predictedRecoveryRate: number
  /** 예측 신뢰도 (%) — 모델 confidence */
  recoveryConfidence: number
  /** AI 리스크 등급 (A+/A/B+/B/C/D/E) */
  riskGrade: string
  /** 리스크 점수 (0-100) */
  riskScore: number
  /** 리스크 레벨 텍스트 (LOW/MEDIUM/HIGH/CRITICAL) */
  riskLevel: string
  /** 매입 ROI (%) */
  roi: number
  /** 예상 순익 (KRW) */
  netProfit: number
  /** 자기부담 자본 (에쿼티) */
  ownCapital: number
  /** 회수 기간 (개월) */
  recoveryMonths: number
  /** 예상 입찰률 (%) */
  expectedBidRatio: number
  /** 데이터 소스 — 'real' (실 분석 row) / 'derived' (listing 파생) */
  source: 'real' | 'derived'
}

export interface UseAnalysisReportResult {
  kpi: AnalysisKpiSet | null
  isLoading: boolean
  isError: boolean
  isDerived: boolean
}

// ─── Derive fallback KPI from listing only ────────────────────────────────
// 분석 보고서가 없을 때, listing 의 기초 수치로 간단 모델 추정.
// 정책상 이 값은 항상 "기초 추정" 으로 표기되며, 정밀 분석은 사용자 직접 실행.
export function deriveFallbackKpi(listing: ListingDetail): AnalysisKpiSet {
  const principal = getListingPrincipal(listing)
  const appraisal = getListingAppraisal(listing)
  const askingPrice = getListingAskingPrice(listing)

  // 보수적 추정 — 낙찰가율 70%, 매입가 = askingPrice
  const expectedBidRatio = 70
  const recovery = appraisal > 0 ? appraisal * (expectedBidRatio / 100) : principal * 0.5
  const predictedRecoveryRate = principal > 0 ? Math.round((recovery / principal) * 1000) / 10 : 0
  const netProfit = Math.max(0, recovery - askingPrice - askingPrice * 0.05) // 5% 비용 가정
  const roi = askingPrice > 0 ? Math.round((netProfit / askingPrice) * 1000) / 10 : 0
  const ownCapital = Math.round(askingPrice * 0.3) // 자기부담 30% 가정 (대출 70%)

  // listing 의 ai_grade / risk_grade 우선 사용
  const grade = String(listing.risk_grade ?? listing.ai_grade ?? 'B').toUpperCase()
  const gradeScoreMap: Record<string, number> = {
    'S': 92, 'A+': 87, 'A': 80, 'B+': 73, 'B': 66, 'C+': 58, 'C': 50, 'D': 38, 'E': 25,
  }
  const riskScore = gradeScoreMap[grade] ?? 60
  const riskLevel = riskScore >= 80 ? 'LOW' : riskScore >= 60 ? 'MEDIUM' : riskScore >= 40 ? 'HIGH' : 'CRITICAL'

  return {
    predictedRecoveryRate,
    recoveryConfidence: 65, // fallback 신뢰도 — 실 분석 대비 낮게 표기
    riskGrade: grade,
    riskScore,
    riskLevel,
    roi,
    netProfit,
    ownCapital,
    recoveryMonths: 11,
    expectedBidRatio,
    source: 'derived',
  }
}

// ─── 사례 사전 빌드된 매물(종로 등) → KPI 매핑 ────────────────────────────
//   buildXxxSampleReport().profitability.strategies.recommended 의 결과를
//   AnalysisKpiSet 형식으로 변환 → 딜룸 헤더 / Section 01 KPI 와 보고서가 100% 동기.
function reportToKpi(report: UnifiedAnalysisReport): AnalysisKpiSet {
  const summary = report.summary
  const recommended = report.profitability?.strategies?.recommended
  const recovery = report.recovery
  return {
    predictedRecoveryRate: summary.predictedRecovery,
    recoveryConfidence: Math.round((recovery?.confidence ?? 0.85) * 100),
    riskGrade: summary.riskGrade,
    riskScore: summary.riskScore,
    riskLevel: summary.riskScore >= 70
      ? 'LOW'
      : summary.riskScore >= 55
        ? 'MEDIUM'
        : summary.riskScore >= 40
          ? 'HIGH'
          : 'CRITICAL',
    roi: recommended ? Number((recommended.roi * 100).toFixed(1)) : 0,
    netProfit: recommended?.expectedNetProfit ?? 0,
    ownCapital: recommended?.totalEquity ?? 0,
    recoveryMonths: 9,                                              // 보유 기간 가정
    expectedBidRatio: recommended?.assumedBidRatio
      ? Number((recommended.assumedBidRatio * 100).toFixed(1))
      : 70,
    source: 'real',                                                 // 보고서 = 정밀
  }
}

function getSampleReportKpi(listingId: string | null | undefined): AnalysisKpiSet | null {
  try {
    if (listingId === JONGNO_HONGJI_LISTING_ID) {
      return reportToKpi(buildJongnoSampleReport())
    }
  } catch (e) {
    console.warn('[useAnalysisReport] sample report fallback:', e)
  }
  return null
}

// ─── Hook ─────────────────────────────────────────────────────────────────

interface AnalysisApiResponse {
  data?: {
    kpi?: AnalysisKpiSet
    summary?: {
      predictedRecovery?: number
      riskGrade?: string
      riskScore?: number
    }
  }
  error?: { message?: string }
}

export function useAnalysisReport(
  listing: ListingDetail | null,
  opts?: { enabled?: boolean },
): UseAnalysisReportResult {
  const enabled = opts?.enabled !== false && !!listing
  const listingId = listing?.id

  const query = useQuery<{ kpi: AnalysisKpiSet | null }, Error>({
    queryKey: ['analysis-report', listingId],
    queryFn: async () => {
      if (!listing) return { kpi: null }
      // 0) 사례 사전 빌드된 매물(종로 등) — 보고서 엔진과 100% 동기
      const sampleKpi = getSampleReportKpi(listingId)
      if (sampleKpi) return { kpi: sampleKpi }
      // 1) 실 분석 row 시도 — 사용자가 위저드/자동 실행으로 생성한 결과
      const r = await fetchSafe<AnalysisApiResponse>(
        `/api/v1/analysis/listing/${listingId}`,
        { fallback: { data: undefined }, retries: 0 },
      )
      const real = r.data?.kpi
      if (real) return { kpi: { ...real, source: 'real' } }
      // 2) 실 데이터 없으면 listing 파생 fallback
      return { kpi: deriveFallbackKpi(listing) }
    },
    enabled,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 0,
  })

  // Hook 의 첫 렌더에 listing 만 있으면 즉시 KPI 노출 — query 데이터 도착 대기 X.
  //   · 사례 빌드된 매물이면 보고서 KPI (정밀)
  //   · 그 외 listing 의 derived fallback
  const sampleSync = listing ? getSampleReportKpi(listing.id) : null
  const fallback = sampleSync ?? (listing ? deriveFallbackKpi(listing) : null)
  const kpi = query.data?.kpi ?? fallback

  return {
    kpi,
    isLoading: query.isLoading,
    isError: query.isError,
    isDerived: kpi?.source === 'derived',
  }
}

// ─── Display formatters ─────────────────────────────────────────────────────

export function formatKrwShort(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  if (amount >= 100_000_000) {
    const eok = amount / 100_000_000
    return `${eok.toFixed(eok >= 100 ? 0 : 2)}억원`
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString('ko-KR')}만원`
  }
  return `${amount.toLocaleString('ko-KR')}원`
}

export function formatKrwFull(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  // 원 단위는 정수만 — 소숫점이 있어도 반올림하여 표시 (사용자 정책)
  return `${Math.round(amount).toLocaleString('ko-KR')}원`
}
