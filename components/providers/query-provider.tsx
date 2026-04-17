'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useState } from 'react'

// Dynamically import devtools so they are NEVER included in the production bundle.
// next/dynamic with ssr:false + condition = zero bytes in prod.
const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then(m => m.ReactQueryDevtools),
  { ssr: false },
)

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,        // 1분: 재마운트시 네트워크 요청 생략
            gcTime: 5 * 60 * 1000,       // 5분: 캐시 보관
            retry: 1,                     // 실패시 1회 재시도
            refetchOnWindowFocus: false,  // 탭 전환시 자동 리패치 비활성
          },
          mutations: {
            retry: 0,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
}
