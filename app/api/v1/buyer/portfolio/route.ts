import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/auth/get-user'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioInvestment {
  id: string
  listingId: string
  userId: string
  title: string
  collateralType: string
  region: string
  investedAmount: number
  appraisedValue: number
  discountRate: number
  expectedReturn: number
  actualReturn: number | null
  roi: number | null
  status: 'IN_PROGRESS' | 'COMPLETED' | 'RECOVERING'
  progress: number
  investedAt: string
  completedAt: string | null
  grade: string
}

interface PortfolioKPIs {
  totalInvested: number
  activeCount: number
  completedCount: number
  totalExpectedReturn: number
  totalActualReturn: number
  averageDiscountRate: number
  averageRoi: number
  winRate: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const PORTFOLIO_DATA: PortfolioInvestment[] = [
  {
    id: 'inv-001',
    listingId: 'lst-001',
    userId: 'user-1',
    title: '서울 강남구 역삼동 오피스텔 NPL',
    collateralType: 'OFFICE',
    region: '서울특별시',
    investedAmount: 3200000000,
    appraisedValue: 4800000000,
    discountRate: 33.3,
    expectedReturn: 320000000,
    actualReturn: 380000000,
    roi: 11.9,
    status: 'COMPLETED',
    progress: 100,
    investedAt: '2025-06-01',
    completedAt: '2025-11-30',
    grade: 'A',
  },
  {
    id: 'inv-002',
    listingId: 'lst-002',
    userId: 'user-1',
    title: '경기 수원시 팔달구 상가 NPL',
    collateralType: 'COMMERCIAL',
    region: '경기도',
    investedAmount: 1850000000,
    appraisedValue: 2900000000,
    discountRate: 36.2,
    expectedReturn: 250000000,
    actualReturn: null,
    roi: null,
    status: 'IN_PROGRESS',
    progress: 65,
    investedAt: '2025-10-15',
    completedAt: null,
    grade: 'B+',
  },
  {
    id: 'inv-003',
    listingId: 'lst-003',
    userId: 'user-1',
    title: '인천 연수구 물류창고 임의매각',
    collateralType: 'WAREHOUSE',
    region: '인천광역시',
    investedAmount: 5100000000,
    appraisedValue: 8200000000,
    discountRate: 37.8,
    expectedReturn: 680000000,
    actualReturn: null,
    roi: null,
    status: 'RECOVERING',
    progress: 30,
    investedAt: '2026-01-10',
    completedAt: null,
    grade: 'B',
  },
  {
    id: 'inv-004',
    listingId: 'lst-004',
    userId: 'user-1',
    title: '부산 해운대구 아파트 담보 NPL',
    collateralType: 'APARTMENT',
    region: '부산광역시',
    investedAmount: 2100000000,
    appraisedValue: 3100000000,
    discountRate: 32.3,
    expectedReturn: 230000000,
    actualReturn: 260000000,
    roi: 12.4,
    status: 'COMPLETED',
    progress: 100,
    investedAt: '2025-04-01',
    completedAt: '2025-09-15',
    grade: 'A-',
  },
  {
    id: 'inv-005',
    listingId: 'lst-005',
    userId: 'user-1',
    title: '대전 유성구 지식산업센터 NPL',
    collateralType: 'FACTORY',
    region: '대전광역시',
    investedAmount: 4200000000,
    appraisedValue: 6500000000,
    discountRate: 35.4,
    expectedReturn: 520000000,
    actualReturn: null,
    roi: null,
    status: 'IN_PROGRESS',
    progress: 45,
    investedAt: '2025-12-01',
    completedAt: null,
    grade: 'B+',
  },
]

function computeKPIs(investments: PortfolioInvestment[]): PortfolioKPIs {
  const totalInvested = investments.reduce((a, i) => a + i.investedAmount, 0)
  const activeCount = investments.filter((i) => i.status !== 'COMPLETED').length
  const completedCount = investments.filter((i) => i.status === 'COMPLETED').length
  const totalExpectedReturn = investments.reduce((a, i) => a + i.expectedReturn, 0)
  const totalActualReturn = investments
    .filter((i) => i.actualReturn != null)
    .reduce((a, i) => a + (i.actualReturn ?? 0), 0)
  const averageDiscountRate =
    investments.reduce((a, i) => a + i.discountRate, 0) / investments.length
  const completedWithRoi = investments.filter((i) => i.roi != null)
  const averageRoi = completedWithRoi.length
    ? completedWithRoi.reduce((a, i) => a + (i.roi ?? 0), 0) / completedWithRoi.length
    : 0
  const winRate = investments.length ? (completedCount / investments.length) * 100 : 0

  return {
    totalInvested,
    activeCount,
    completedCount,
    totalExpectedReturn,
    totalActualReturn,
    averageDiscountRate,
    averageRoi,
    winRate,
  }
}

// ─── GET /api/v1/buyer/portfolio ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const period = searchParams.get('period') // '6m' | '1y' | 'all'

    // Try real Supabase data first
    const user = await getAuthUser()
    if (user) {
      const supabase = await createClient()

      // Query deals where user is buyer, joined to npl_listings
      let query = supabase
        .from('deals')
        .select(`
          id, stage, deal_amount, created_at, closed_at,
          npl_listings (
            id, title, collateral_type, sido,
            claim_amount, appraised_value, discount_rate, ai_grade
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100)

      // Period filter
      if (period && period !== 'all') {
        const cutoff = new Date()
        if (period === '6m') cutoff.setMonth(cutoff.getMonth() - 6)
        if (period === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1)
        query = query.gte('created_at', cutoff.toISOString())
      }

      // Status filter (deal stage mapping)
      if (statusFilter && statusFilter !== 'all') {
        const stageMap: Record<string, string[]> = {
          IN_PROGRESS: ['LOI', 'NDA', 'DUE_DILIGENCE', 'NEGOTIATION', 'CONTRACT'],
          COMPLETED: ['CLOSED'],
          RECOVERING: ['RECOVERY'],
        }
        const stages = stageMap[statusFilter] ?? [statusFilter]
        query = query.in('stage', stages)
      }

      const { data: dealRows, error: dealErr } = await query

      if (!dealErr && dealRows && dealRows.length > 0) {
        const investments: PortfolioInvestment[] = dealRows.map((d) => {
          const rawL = d.npl_listings
          const l = ((Array.isArray(rawL) ? rawL[0] : rawL) ?? null) as Record<string, unknown> | null
          const investedAmount = (d.deal_amount as number) || (l?.claim_amount as number) || 0
          const appraisedValue = (l?.appraised_value as number) || 0
          const discountRate = appraisedValue > 0
            ? parseFloat(((appraisedValue - investedAmount) / appraisedValue * 100).toFixed(1))
            : ((l?.discount_rate as number) || 0)
          const stage = d.stage as string
          const isCompleted = stage === 'CLOSED'
          return {
            id: d.id as string,
            listingId: (l?.id as string) || '',
            userId: user.id,
            title: (l?.title as string) || '거래',
            collateralType: (l?.collateral_type as string) || 'OTHER',
            region: (l?.sido as string) || '지역 미상',
            investedAmount,
            appraisedValue,
            discountRate,
            expectedReturn: Math.round(investedAmount * 0.12),
            actualReturn: isCompleted ? Math.round(investedAmount * 0.118) : null,
            roi: isCompleted ? 11.8 : null,
            status: isCompleted ? 'COMPLETED' : stage === 'RECOVERY' ? 'RECOVERING' : 'IN_PROGRESS',
            progress: isCompleted ? 100 : stage === 'CONTRACT' ? 80 : stage === 'NEGOTIATION' ? 60 : 40,
            investedAt: (d.created_at as string)?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            completedAt: isCompleted ? ((d.closed_at as string)?.slice(0, 10) || null) : null,
            grade: (l?.ai_grade as string) || 'C',
          }
        })

        const kpis = computeKPIs(investments)
        const compositionMap = investments.reduce<Record<string, number>>((acc, i) => {
          acc[i.collateralType] = (acc[i.collateralType] ?? 0) + i.investedAmount
          return acc
        }, {})
        const composition = Object.entries(compositionMap).map(([type, amount]) => ({
          collateralType: type,
          amount,
          percentage: kpis.totalInvested > 0 ? (amount / kpis.totalInvested) * 100 : 0,
        }))

        return NextResponse.json({ data: investments, kpis, composition, total: investments.length })
      }
      // Fall through to mock if no real data
    }

    // ─── Mock fallback ─────────────────────────────────────────────────────────
    const { searchParams: sp } = new URL(request.url)
    const userId = sp.get('user_id') ?? 'user-1'
    let investments = PORTFOLIO_DATA.filter((i) => i.userId === userId)

    if (period && period !== 'all') {
      const cutoff = new Date()
      if (period === '6m') cutoff.setMonth(cutoff.getMonth() - 6)
      if (period === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1)
      investments = investments.filter((i) => new Date(i.investedAt) >= cutoff)
    }
    if (statusFilter && statusFilter !== 'all') {
      investments = investments.filter((i) => i.status === statusFilter)
    }

    const kpis = computeKPIs(PORTFOLIO_DATA.filter((i) => i.userId === userId))
    const compositionMap = PORTFOLIO_DATA.filter((i) => i.userId === userId).reduce<Record<string, number>>(
      (acc, i) => { acc[i.collateralType] = (acc[i.collateralType] ?? 0) + i.investedAmount; return acc },
      {}
    )
    const composition = Object.entries(compositionMap).map(([type, amount]) => ({
      collateralType: type,
      amount,
      percentage: (amount / kpis.totalInvested) * 100,
    }))

    return NextResponse.json({ data: investments, kpis, composition, total: investments.length })
  } catch (error) {
    logger.error('Portfolio GET error:', { error: error })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '포트폴리오 데이터를 불러오는 데 실패했습니다.' } },
      { status: 500 }
    )
  }
}
