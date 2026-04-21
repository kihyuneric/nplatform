'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Navigation } from '@/components/layout/navigation'
import { Footer } from '@/components/layout/footer'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav'
import { PageTransition } from '@/components/page-transition'
import { OfflineBanner } from '@/components/layout/offline-banner'
import { NavConfigProvider } from '@/components/providers/nav-config-provider'
import { TourGuide, type TourStep } from '@/components/onboarding/tour-guide'
import { DynamicChatWidget, DynamicCommandPalette } from '@/components/dynamic'

const ONBOARDING_STEPS: TourStep[] = [
  {
    id: 'nav',
    target: '[data-tour="nav"]',
    title: 'NPLatform 탐색',
    content: '거래소, 딜룸, 분석을 자유롭게 탐색하세요.',
    position: 'bottom',
  },
  {
    id: 'search',
    target: '[data-tour="search"]',
    title: '빠른 검색',
    content: 'Cmd+K (Mac) / Ctrl+K (Windows)로 원하는 페이지를 빠르게 찾으세요.',
    position: 'bottom',
  },
  {
    id: 'notifications',
    target: '[data-tour="notifications"]',
    title: '알림 확인',
    content: '매칭, 거래 진행, 시스템 알림을 실시간으로 받아보세요.',
    position: 'bottom',
  },
]

// Full-screen pages where footer/breadcrumb should be hidden
const FULLSCREEN_PATHS = ['/market/map']

/**
 * `?embed=1` → iframe 임베드 전용 클린 뷰
 * - 딜룸(/deals)에서 선택된 딜의 자산 상세를 iframe 으로 합성할 때 사용
 * - Navigation / Footer / Breadcrumb / MobileTabBar / ChatWidget / Tour 전부 숨김
 * - 내부 콘텐츠만 노출되어 부모 페이지의 카드/리스트 아래에 깔끔히 들어감
 */
function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isEmbed = searchParams?.get('embed') === '1'
  const isFullscreen = FULLSCREEN_PATHS.some(p => pathname?.startsWith(p))

  // ── Embed 모드: 크롬 전부 제거하고 콘텐츠만 ──
  if (isEmbed) {
    return (
      <div className="flex min-h-screen flex-col bg-[var(--color-surface-base)]">
        <main role="main" className="flex-1">
          <PageTransition key={pathname}>{children}</PageTransition>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <Navigation />
      <main role="main" className={`flex-1 ${isFullscreen ? '' : 'pb-20 md:pb-0'}`}>
        {!isFullscreen && <BreadcrumbNav />}
        <PageTransition key={pathname}>{children}</PageTransition>
      </main>
      {!isFullscreen && <Footer />}
      <DynamicChatWidget />
      {!isFullscreen && <MobileTabBar />}
      <DynamicCommandPalette />
      <TourGuide steps={ONBOARDING_STEPS} tourKey="main-v1" />
    </div>
  )
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NavConfigProvider>
      <Suspense fallback={null}>
        <LayoutContent>{children}</LayoutContent>
      </Suspense>
    </NavConfigProvider>
  )
}
