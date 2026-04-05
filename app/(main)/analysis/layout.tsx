import type { Metadata } from "next"
import { DynamicSubNav } from '@/components/layout/dynamic-sub-nav'
import { BannerSlot } from '@/components/banners/banner-slot'

export const metadata: Metadata = {
  title: "시장분석 | NPLatform",
}

export const revalidate = 300

export default function AnalysisLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DynamicSubNav pageKey="analysis" />
      <BannerSlot position="analysis-top" className="mx-auto max-w-7xl px-4 pt-4" />
      {children}
    </>
  )
}
