import type { Metadata } from "next"
import { SubNav } from '@/components/layout/sub-nav'
import { BannerSlot } from '@/components/banners/banner-slot'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nplatform.co.kr'

export const metadata: Metadata = {
  title: "마이 페이지 | NPLatform",
  description: "내 거래, 관심 매물, 포트폴리오, 결제 내역을 한 눈에 확인하세요.",
  alternates: {
    canonical: `${SITE_URL}/my`,
    languages: {
      'ko': `${SITE_URL}/my`,
      'en': `${SITE_URL}/en/my`,
      'ja': `${SITE_URL}/ja/my`,
    },
  },
}

const MY_NAV = [
  { href: '/my', label: '대시보드' },
  { href: '/my/deals', label: '내 딜룸' },
  { href: '/my/demands', label: '매수 수요' },
  { href: '/my/agreements', label: '계약 관리' },
  { href: '/my/portfolio', label: '관심매물·포트폴리오' },
  { href: '/my/seller', label: '매도자 관리' },
  { href: '/my/partner', label: '파트너 관리' },
  { href: '/my/billing', label: '결제·크레딧' },
  { href: '/my/notifications', label: '알림' },
  { href: '/my/notices', label: '공지사항' },
  { href: '/my/inquiries', label: '문의 내역' },
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
