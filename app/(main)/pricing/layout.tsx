import type { Metadata } from 'next'

export const revalidate = 3600

export const metadata: Metadata = {
  title: '요금제 안내 | NPLatform',
  description: 'NPLatform의 무료 및 프리미엄 요금제를 비교하고 최적의 플랜을 선택하세요.',
  openGraph: {
    title: '요금제 안내 | NPLatform',
    description: 'NPLatform의 무료 및 프리미엄 요금제를 비교하고 최적의 플랜을 선택하세요.',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
