import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  bondInfoSchema,
  collateralInfoSchema,
  rightsAnalysisSchema,
  loanSaleTermsSchema,
  debtAssumptionTermsSchema,
  auctionScenarioSchema,
} from '@/lib/npl/profitability/schema'
import { compareStructures } from '@/lib/npl/profitability/engine'

const compareInputSchema = z.object({
  bond: bondInfoSchema,
  collateral: collateralInfoSchema,
  rights: rightsAnalysisSchema,
  loanSaleTerms: loanSaleTermsSchema,
  debtAssumptionTerms: debtAssumptionTermsSchema,
  auctionScenario: auctionScenarioSchema,
  analysisDate: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const parsed = compareInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: '입력 데이터가 올바르지 않습니다.', details: parsed.error.flatten() } },
        { status: 400 }
      )
    }

    const { bond, collateral, rights, loanSaleTerms, debtAssumptionTerms, auctionScenario, analysisDate } = parsed.data

    const result = await compareStructures(
      bond,
      collateral,
      rights,
      loanSaleTerms,
      debtAssumptionTerms,
      auctionScenario,
      analysisDate
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[NPL Profitability Compare] Error:', error)
    return NextResponse.json(
      { error: { code: 'COMPARISON_ERROR', message: error.message || '비교 분석 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
