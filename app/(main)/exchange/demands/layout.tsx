import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '매입조건 등록 | NPLATFORM',
  description: '지역 · 유형 · 금액대 매입조건을 등록하면 조건에 매칭되는 NPL 딜만 선별 공개됩니다.',
}

export default function DemandsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
