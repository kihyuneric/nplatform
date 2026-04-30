import type { Metadata } from "next"
import { SubNav } from '@/components/layout/sub-nav'
import { BannerSlot } from '@/components/banners/banner-slot'
import { getEffectiveRoles } from '@/lib/auth/get-effective-roles'
import { getMyNavItems } from '@/lib/my-nav'

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

/**
 * 마이페이지 SubNav — Phase G7+ 2026-04-29.
 *
 * SSoT: lib/my-nav.ts MY_NAV_CATALOG (10개 메뉴)
 *
 * 역할 기반 동적 노출:
 *   · 모든 회원: 대시보드 / 내 딜룸 / 계약 / 포트폴리오 / 결제 / 알림 / 설정 (7개 default)
 *   · 매수자/일반/대부업체/AMC/파트너: + 매수 수요 (8개)
 *   · 매도자 (institution/money_lender/AMC/general/partner): + 매도자 관리
 *   · PARTNER: + 파트너 관리
 *   · ADMIN/SUPER_ADMIN: 모든 메뉴
 *
 * 라우트는 server-side 에서 effective role flags 산출 후 필터링됨.
 */
export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const { roles, institutionType } = await getEffectiveRoles()
  const items = getMyNavItems({ roles, institutionType })

  return (
    <>
      <SubNav items={items.map(({ href, label }) => ({ href, label }))} />
      <BannerSlot position="my-top" className="mx-auto max-w-7xl px-4 pt-4" />
      {children}
    </>
  )
}
