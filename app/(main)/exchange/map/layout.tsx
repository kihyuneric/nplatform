import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NPL 지도',
  description: '지도 기반 NPL 매물 탐색. 전국 NPL 매물을 지도에서 직접 확인하고 상세 정보를 조회하세요.',
  openGraph: {
    title: 'NPL 지도 | NPLatform',
    description: '지도 기반 NPL 매물 탐색',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
