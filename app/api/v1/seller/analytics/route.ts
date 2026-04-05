import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

// GET /api/v1/seller/analytics
// Returns analytics data: listing performance trends, regional breakdown, discount analysis

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') ?? '30d'       // 7d | 30d | 90d | 1y
    const listingId = searchParams.get('listing_id') ?? 'all'

    // Summary KPIs
    const summary = {
      totalViews: 8291,
      viewsGrowthPct: 18.4,
      totalInterests: 384,
      interestsGrowthPct: 12.1,
      totalInquiries: 63,
      inquiriesGrowthPct: 9.3,
      bidConversionRate: 7.6,          // %
      industryAvgConversionRate: 5.2,  // %
    }

    // Daily trend data (30 days)
    const trendData = Array.from({ length: 20 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (19 - i))
      return {
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        views: Math.floor(100 + Math.random() * 350),
        interests: Math.floor(5 + Math.random() * 45),
        inquiries: Math.floor(1 + Math.random() * 18),
      }
    })

    // Regional breakdown
    const regionalData = [
      { region: '서울', views: 3820, interests: 142, bids: 38 },
      { region: '경기', views: 2140, interests: 89, bids: 21 },
      { region: '부산', views: 1560, interests: 62, bids: 15 },
      { region: '인천', views: 980, interests: 41, bids: 11 },
      { region: '대구', views: 820, interests: 33, bids: 8 },
      { region: '대전', views: 640, interests: 27, bids: 6 },
      { region: '광주', views: 520, interests: 22, bids: 5 },
      { region: '울산', views: 410, interests: 18, bids: 4 },
    ]

    // Discount rate response
    const discountResponseData = [
      { rate: '15-20%', views: 420, interests: 14, bids: 3 },
      { rate: '20-25%', views: 890, interests: 38, bids: 9 },
      { rate: '25-30%', views: 1540, interests: 72, bids: 18 },
      { rate: '30-35%', views: 2100, interests: 98, bids: 27 },
      { rate: '35-40%', views: 1870, interests: 85, bids: 22 },
      { rate: '40%+', views: 1230, interests: 56, bids: 14 },
    ]

    // Listing exposure rankings
    const listingRanks = [
      { rank: 1, id: 'L002', title: '부산 해운대 아파트 경매 NPL', views: 1204, interests: 67, score: 94 },
      { rank: 2, id: 'L001', title: '서울 강남구 역삼동 오피스 NPL', views: 892, interests: 34, score: 78 },
      { rank: 3, id: 'L005', title: '인천 연수구 공장 담보 채권', views: 823, interests: 31, score: 72 },
      { rank: 4, id: 'L003', title: '경기 성남 상가 NPL 포트폴리오', views: 456, interests: 21, score: 54 },
      { rank: 5, id: 'L004', title: '대구 수성구 오피스텔 NPL', views: 102, interests: 4, score: 21 },
    ]

    // Radar chart: 6-dimension performance score
    const radarData = [
      { subject: '조회수', score: 90 },
      { subject: '관심등록', score: 72 },
      { subject: '입찰전환율', score: 58 },
      { subject: '반응속도', score: 83 },
      { subject: '가격경쟁력', score: 76 },
      { subject: '문서완비도', score: 95 },
    ]

    // AI-generated insight
    const insights = [
      {
        type: 'DISCOUNT_OPTIMIZATION',
        title: '할인율 최적화 제안',
        body: '할인율 30-35% 구간에서 입찰 전환율이 가장 높습니다. 현재 평균 할인율(27%)을 소폭 상향하면 입찰 유입이 약 35% 증가할 수 있습니다.',
        severity: 'INFO',
      },
      {
        type: 'REGIONAL_DEMAND',
        title: '지역별 수요 격차',
        body: '서울 매물의 관심도가 부산 대비 2.3배 높습니다. 수도권 매물 비중 확대를 검토하세요.',
        severity: 'SUGGESTION',
      },
    ]

    return NextResponse.json({
      data: {
        period,
        listingId,
        summary,
        trendData,
        regionalData,
        discountResponseData,
        listingRanks,
        radarData,
        insights,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (err) {
    logger.error('GET /api/v1/seller/analytics error:', { error: err })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
