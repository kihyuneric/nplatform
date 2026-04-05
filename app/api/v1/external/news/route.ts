import { NextRequest, NextResponse } from 'next/server'
import { getExternalConfig, fetchExternal, isConfigured } from '@/lib/external-data'

// Mock NPL/부동산 news articles
const MOCK_NEWS = [
  {
    id: 'NEWS-001',
    title: '2026년 NPL 시장 전망: 금리 인하 기대에 투자 수요 증가',
    summary: '한국은행의 기준금리 인하 기대감에 따라 NPL(부실채권) 시장에 대한 투자자 관심이 높아지고 있다.',
    source: '매일경제',
    published_at: '2026-03-20T09:30:00Z',
    url: 'https://example.com/news/001',
    image_url: 'https://placehold.co/600x400?text=NPL+Market',
    category: 'NPL',
  },
  {
    id: 'NEWS-002',
    title: '강남 재건축 시장, 분양가 상한제 완화로 기대감 상승',
    summary: '정부의 분양가 상한제 완화 방침으로 서울 강남권 재건축 단지들의 거래가 활발해지고 있다.',
    source: '한국경제',
    published_at: '2026-03-19T14:15:00Z',
    url: 'https://example.com/news/002',
    image_url: 'https://placehold.co/600x400?text=Gangnam+Rebuild',
    category: '부동산',
  },
  {
    id: 'NEWS-003',
    title: '법원경매 물건 급감... 부실채권 매입 경쟁 심화',
    summary: '경매 물건 감소세가 이어지면서 NPL 투자사들 사이의 매입 경쟁이 치열해지고 있다.',
    source: '서울경제',
    published_at: '2026-03-18T11:00:00Z',
    url: 'https://example.com/news/003',
    image_url: 'https://placehold.co/600x400?text=Auction+Market',
    category: 'NPL',
  },
  {
    id: 'NEWS-004',
    title: '상업용 부동산 NPL 비율 사상 최저... 시장 회복 신호',
    summary: '상업용 부동산 부문의 부실채권 비율이 사상 최저 수준으로 하락하며 시장 회복 신호를 보이고 있다.',
    source: '조선비즈',
    published_at: '2026-03-17T08:45:00Z',
    url: 'https://example.com/news/004',
    image_url: 'https://placehold.co/600x400?text=Commercial+RE',
    category: 'NPL',
  },
  {
    id: 'NEWS-005',
    title: 'PF 부실 정리 본격화... 저축은행 NPL 매각 확대',
    summary: '프로젝트파이낸싱(PF) 부실 정리가 본격화되면서 저축은행들의 NPL 매각 물량이 늘어나고 있다.',
    source: '파이낸셜뉴스',
    published_at: '2026-03-16T16:20:00Z',
    url: 'https://example.com/news/005',
    image_url: 'https://placehold.co/600x400?text=PF+NPL',
    category: 'NPL',
  },
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const keyword = searchParams.get('keyword') || ''
  const category = searchParams.get('category') || ''
  const limit = parseInt(searchParams.get('limit') || '10', 10)

  const config = getExternalConfig()

  // If external API is configured, proxy the request
  if (isConfigured(config.newsApiUrl)) {
    try {
      const url = new URL(config.newsApiUrl)
      if (keyword) url.searchParams.set('keyword', keyword)
      if (category) url.searchParams.set('category', category)
      url.searchParams.set('limit', String(limit))
      const data = await fetchExternal(url.toString())
      return NextResponse.json(data)
    } catch (error) {
      return NextResponse.json(
        { error: 'External news API request failed', detail: String(error) },
        { status: 502 }
      )
    }
  }

  // Filter and return mock data
  let filtered = MOCK_NEWS
  if (keyword) {
    filtered = filtered.filter(
      (n) => n.title.includes(keyword) || n.summary.includes(keyword)
    )
  }
  if (category) {
    filtered = filtered.filter((n) => n.category === category)
  }

  return NextResponse.json({
    _mock: true,
    query: { keyword, category, limit },
    total: filtered.length,
    data: filtered.slice(0, limit),
  })
}
