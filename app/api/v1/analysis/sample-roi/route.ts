/**
 * /api/v1/analysis/sample-roi
 *
 * GET — 분석 대시보드 RECENT PIPELINE 리스트의 사례 매물 ROI 동적 산출.
 *
 * 사용자 정책 (2026-05-03):
 *   - 분석 보고서와 동일한 ROI (프로젝트 ROI = 누적 수익률)
 *   - 연환산 (annualizedRoi) 사용 금지 — 보고서 표시값과 정합
 *   - 하드코딩 금지 — buildJongnoSampleReport / buildSampleReport 호출
 *
 * 결과:
 *   { jongno: number, jamsil: number, computed_at: string }
 *
 * 5분 캐싱 — 같은 결정론적 산출이라 자주 재계산 불필요.
 */
import { NextResponse } from 'next/server'
import { buildJongnoSampleReport } from '@/lib/npl/unified-report/sample-jongno'
import { buildSampleReport } from '@/lib/npl/unified-report/sample'

function pickProjectRoi(report: ReturnType<typeof buildJongnoSampleReport>): number {
  // investment.roi 가 프로젝트 ROI (연환산 X). 보고서 카드 표시값과 동일.
  const investmentRoi = report.profitability?.investment?.roi
  if (typeof investmentRoi === 'number' && Number.isFinite(investmentRoi)) {
    return investmentRoi
  }
  // fallback: strategies.recommended.roi (전략별 권고 ROI — 동일 값)
  const recommendedRoi = report.profitability?.strategies?.recommended?.roi
  if (typeof recommendedRoi === 'number' && Number.isFinite(recommendedRoi)) {
    return recommendedRoi
  }
  return 0
}

export async function GET() {
  try {
    const jongnoReport = buildJongnoSampleReport()
    const jamsilReport = buildSampleReport()

    return NextResponse.json({
      jongno: pickProjectRoi(jongnoReport),
      jamsil: pickProjectRoi(jamsilReport),
      computed_at: new Date().toISOString(),
      note: '프로젝트 ROI (연환산 X) — 보고서 카드 표시값과 정합',
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (err) {
    return NextResponse.json({
      jongno: null,
      jamsil: null,
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
