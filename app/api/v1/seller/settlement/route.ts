import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// GET /api/v1/seller/settlement
// Returns settlement (수수료 정산) records and monthly summary

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const year = searchParams.get('year') ?? '2025'
    const status = searchParams.get('status') ?? 'ALL'  // ALL | PENDING | COMPLETED | CANCELLED
    const page = parseInt(searchParams.get('page') ?? '1', 10)
    const limit = parseInt(searchParams.get('limit') ?? '20', 10)

    const allSettlements = [
      {
        id: 'SET-2025-001',
        listingId: 'L005',
        listingTitle: '인천 연수구 공장 담보 채권',
        dealAmount: 3200000000,
        commissionRate: 1.5,
        commissionAmount: 48000000,
        vatAmount: 4800000,
        netAmount: 43200000,
        status: 'COMPLETED',
        dueDate: '2025-03-10',
        settledAt: '2025-03-08',
        invoiceNo: 'INV-2025-001',
        buyerName: '(주)대우자산운용',
        createdAt: '2025-03-01T09:00:00.000Z',
      },
      {
        id: 'SET-2025-002',
        listingId: 'L002',
        listingTitle: '부산 해운대 아파트 경매 NPL',
        dealAmount: 1300000000,
        commissionRate: 1.5,
        commissionAmount: 19500000,
        vatAmount: 1950000,
        netAmount: 17550000,
        status: 'PENDING',
        dueDate: '2025-03-31',
        settledAt: null,
        invoiceNo: 'INV-2025-002',
        buyerName: '미래에셋대우투자',
        createdAt: '2025-03-10T09:00:00.000Z',
      },
      {
        id: 'SET-2025-003',
        listingId: 'L003',
        listingTitle: '경기 성남 상가 NPL 포트폴리오',
        dealAmount: 4200000000,
        commissionRate: 1.2,
        commissionAmount: 50400000,
        vatAmount: 5040000,
        netAmount: 45360000,
        status: 'PENDING',
        dueDate: '2025-04-15',
        settledAt: null,
        invoiceNo: 'INV-2025-003',
        buyerName: '한국투자신탁운용',
        createdAt: '2025-03-15T09:00:00.000Z',
      },
      {
        id: 'SET-2024-012',
        listingId: 'L_OLD1',
        listingTitle: '서울 마포구 오피스 NPL',
        dealAmount: 2100000000,
        commissionRate: 1.5,
        commissionAmount: 31500000,
        vatAmount: 3150000,
        netAmount: 28350000,
        status: 'COMPLETED',
        dueDate: '2024-12-20',
        settledAt: '2024-12-18',
        invoiceNo: 'INV-2024-012',
        buyerName: '삼성자산운용',
        createdAt: '2024-12-01T09:00:00.000Z',
      },
      {
        id: 'SET-2024-008',
        listingId: 'L_OLD2',
        listingTitle: '대전 둔산 아파트 담보 채권',
        dealAmount: 890000000,
        commissionRate: 1.5,
        commissionAmount: 13350000,
        vatAmount: 1335000,
        netAmount: 12015000,
        status: 'CANCELLED',
        dueDate: '2024-10-15',
        settledAt: null,
        invoiceNo: 'INV-2024-008',
        buyerName: '-',
        createdAt: '2024-10-01T09:00:00.000Z',
      },
    ]

    // Filter by year and status
    const filtered = allSettlements.filter((s) => {
      const matchYear = s.id.includes(year)
      const matchStatus = status === 'ALL' || s.status === status
      return matchYear && matchStatus
    })

    // Pagination
    const start = (page - 1) * limit
    const paginated = filtered.slice(start, start + limit)

    // Monthly summary
    const monthlySummary = [
      { month: '2024-10', completed: 2, completedAmount: 28400000, pending: 0, pendingAmount: 0 },
      { month: '2024-11', completed: 3, completedAmount: 52100000, pending: 0, pendingAmount: 0 },
      { month: '2024-12', completed: 4, completedAmount: 78600000, pending: 0, pendingAmount: 0 },
      { month: '2025-01', completed: 3, completedAmount: 61200000, pending: 1, pendingAmount: 18500000 },
      { month: '2025-02', completed: 5, completedAmount: 94500000, pending: 2, pendingAmount: 41200000 },
      { month: '2025-03', completed: 1, completedAmount: 43200000, pending: 2, pendingAmount: 62910000 },
    ]

    // Aggregates
    const totalCompleted = filtered
      .filter((s) => s.status === 'COMPLETED')
      .reduce((sum, s) => sum + s.netAmount, 0)

    const totalPending = filtered
      .filter((s) => s.status === 'PENDING')
      .reduce((sum, s) => sum + s.netAmount, 0)

    return NextResponse.json({
      data: {
        settlements: paginated,
        total: filtered.length,
        page,
        limit,
        totalCompleted,
        totalPending,
        avgCommissionRate: 1.42,
        monthlySummary,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error('GET /api/v1/seller/settlement error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
