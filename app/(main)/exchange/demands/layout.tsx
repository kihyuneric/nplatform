import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '매수 수요 마켓 | NPLatform',
  description: 'NPL 매수 수요 등록 및 검색. 투자자의 매수 조건을 확인하고 매칭하세요.',
}

export default function DemandsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
