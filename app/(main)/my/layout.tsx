import type { Metadata } from "next"
import { SubNav } from '@/components/layout/sub-nav'
import { BannerSlot } from '@/components/banners/banner-slot'

export const metadata: Metadata = {
  title: "내 정보 | NPLatform",
}

const MY_NAV = [
  { href: '/my', label: '대시보드' },
  { href: '/my/portfolio', label: '관심매물·포트폴리오' },
  { href: '/my/seller', label: '매도자 관리' },
  { href: '/my/partner', label: '파트너' },
  { href: '/my/billing', label: '결제·크레딧' },
  { href: '/my/developer', label: '개발자' },
  { href: '/my/notifications', label: '알림' },
  { href: '/my/settings', label: '설정' },
]

export default function MyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SubNav items={MY_NAV} />
      <BannerSlot position="my-top" className="mx-auto max-w-7xl px-4 pt-4" />
      {children}
    </>
  )
}
