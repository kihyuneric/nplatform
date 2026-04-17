import type { Metadata } from 'next'
import { QueryClient, dehydrate } from '@tanstack/react-query'
import { BannerSlot } from '@/components/banners/banner-slot'
import { DynamicSubNav } from '@/components/layout/dynamic-sub-nav'
import { query } from '@/lib/data-layer'
import { ExchangeHydration } from './exchange-hydration'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nplatform.co.kr'

export const metadata: Metadata = {
  title: '거래소 | NPLatform',
  description: 'NPL 채권 매각·매수 거래소. 매물 탐색, 입찰 신청, 딜룸 입장까지 한 곳에서.',
  alternates: {
    canonical: `${SITE_URL}/exchange`,
    languages: {
      'ko': `${SITE_URL}/exchange`,
      'en': `${SITE_URL}/en/exchange`,
      'ja': `${SITE_URL}/ja/exchange`,
    },
  },
}

export const revalidate = 60  // ISR: 60초마다 백그라운드에서 재생성

// Default filters must match the shape useExchangeListings uses as its queryKey
const DEFAULT_FILTERS = {
  query: '',
  institutions: [] as string[],
  principalMin: '',
  principalMax: '',
  collateralType: '전체',
  location: '전체',
  dealStage: '전체',
  riskGrade: '전체',
  sortBy: 'created_at',
}

export default async function ExchangeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  })

  // Server-side prefetch so the first paint has no loading skeleton
  try {
    await queryClient.prefetchInfiniteQuery({
      queryKey: ['exchange-listings', DEFAULT_FILTERS],
      queryFn: async ({ pageParam }) => {
        const page = typeof pageParam === 'number' ? pageParam : 1
        const result = await query('deal_listings', {
          filters: { status: 'ACTIVE' },
          orderBy: 'created_at',
          order: 'desc',
          limit: 20,
          offset: (page - 1) * 20,
        })
        const total = result.total ?? 0
        return {
          listings: result.data,
          total,
          totalPages: Math.ceil(total / 20) || 1,
          kpi: {},
        }
      },
      initialPageParam: 1,
      pages: 1,
      getNextPageParam: (lastPage, allPages) => {
        const page = lastPage as { totalPages: number }
        return allPages.length < page.totalPages ? allPages.length + 1 : undefined
      },
    })
  } catch {
    // If prefetch fails (e.g. no DB in dev) the client will fetch normally
  }

  return (
    <>
      <DynamicSubNav pageKey="exchange" />
      <BannerSlot position="exchange-top" className="mx-auto max-w-7xl px-4 pt-4" />
      <ExchangeHydration state={dehydrate(queryClient)}>
        {children}
      </ExchangeHydration>
    </>
  )
}
