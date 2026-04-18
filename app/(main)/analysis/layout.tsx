import type { Metadata } from "next"
import { DynamicSubNav } from '@/components/layout/dynamic-sub-nav'
import { BannerSlot } from '@/components/banners/banner-slot'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nplatform.co.kr'

export const metadata: Metadata = {
  title: "분석 | NPLatform",
  description: "NPL 시장 현황, AI 컨설턴트, 경매 분석을 한 곳에서 확인하세요.",
  alternates: {
    canonical: `${SITE_URL}/analysis`,
    languages: {
      'ko': `${SITE_URL}/analysis`,
      'en': `${SITE_URL}/en/analysis`,
      'ja': `${SITE_URL}/ja/analysis`,
    },
  },
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
