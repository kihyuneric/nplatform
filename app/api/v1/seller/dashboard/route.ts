import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// GET /api/v1/seller/dashboard
// Returns KPI cards and recent activity data for the seller dashboard

export async function GET(req: NextRequest) {
  try {
    // In production: extract seller_id from session/token
    // const sellerId = req.headers.get('x-seller-id')

    const kpis = {
      totalListings: 47,
      activeListings: 12,
      draftListings: 5,
      soldListings: 23,
      withdrawnListings: 7,
      totalViews: 8291,
      totalInterests: 384,
      totalBids: 63,
      completedDeals: 23,
      pendingDeals: 3,
      totalRevenue: 138500000,      // commission settled (KRW)
      pendingRevenue: 62910000,     // commission pending
    }

    const recentListings = [
      {
        id: 'L001',
        title: '서울 강남구 역삼동 오피스 NPL',
        type: 'NON_AUCTION_NPL',
        collateralType: '오피스',
        claimAmount: 3200000000,
        discountRate: 25,
        status: 'ACTIVE',
        viewCount: 892,
        interestCount: 34,
        bidCount: 8,
        createdAt: '2025-02-10T09:00:00.000Z',
      },
      {
        id: 'L002',
        title: '부산 해운대 아파트 경매 NPL',
        type: 'AUCTION_NPL',
        collateralType: '아파트',
        claimAmount: 1850000000,
        discountRate: 30,
        status: 'IN_DEAL',
        viewCount: 1204,
        interestCount: 67,
        bidCount: 14,
        createdAt: '2025-01-22T09:00:00.000Z',
      },
      {
        id: 'L003',
        title: '경기 성남 상가 NPL 포트폴리오',
        type: 'DISTRESSED_SALE',
        collateralType: '상가',
        claimAmount: 5600000000,
        discountRate: 25,
        status: 'ACTIVE',
        viewCount: 456,
        interestCount: 21,
        bidCount: 4,
        createdAt: '2025-03-01T09:00:00.000Z',
      },
    ]

    const monthlyPerformance = [
      { month: '2024-10', views: 1200, interests: 45, bids: 8, deals: 2 },
      { month: '2024-11', views: 1580, interests: 62, bids: 11, deals: 3 },
      { month: '2024-12', views: 2100, interests: 89, bids: 15, deals: 5 },
      { month: '2025-01', views: 1750, interests: 71, bids: 12, deals: 4 },
      { month: '2025-02', views: 2340, interests: 104, bids: 18, deals: 6 },
      { month: '2025-03', views: 2890, interests: 132, bids: 22, deals: 7 },
    ]

    const recentActivities = [
      {
        id: 'ACT001',
        type: 'BID',
        title: '새 입찰 등록',
        body: 'L001 역삼동 오피스에 새 입찰이 접수되었습니다.',
        listingId: 'L001',
        timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      },
      {
        id: 'ACT002',
        type: 'INTEREST',
        title: '관심 등록',
        body: 'L002 해운대 아파트에 관심 등록 +5건',
        listingId: 'L002',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
      {
        id: 'ACT003',
        type: 'DEAL_COMPLETED',
        title: '거래 완료',
        body: 'L005 인천 공장 채권 거래가 완료되었습니다.',
        listingId: 'L005',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      },
    ]

    return NextResponse.json({
      data: {
        kpis,
        recentListings,
        monthlyPerformance,
        recentActivities,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error('GET /api/v1/seller/dashboard error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
