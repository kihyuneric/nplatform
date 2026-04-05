import type { Metadata } from "next"
import { DynamicSubNav } from '@/components/layout/dynamic-sub-nav'
import { BannerSlot } from '@/components/banners/banner-slot'

export const metadata: Metadata = {
  title: "딜룸 | NPLatform",
  description: "입찰 신청 → AI 매칭 → 딜룸 입장. 진행 중인 NPL 거래를 한 곳에서 관리하세요.",
}

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DynamicSubNav pageKey="deals" />
      <BannerSlot position="deals-top" className="mx-auto max-w-7xl px-4 pt-4" />
      {children}
    </>
  )
}
