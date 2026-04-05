'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from '@/components/layout/navigation'
import { Footer } from '@/components/layout/footer'
import { ChatWidget } from '@/components/ai-agent/chat-widget'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'
import { BreadcrumbNav } from '@/components/layout/breadcrumb-nav'
import { CommandPalette } from '@/components/command-palette'
import { PageTransition } from '@/components/page-transition'
import { OfflineBanner } from '@/components/layout/offline-banner'
import { NavConfigProvider } from '@/components/providers/nav-config-provider'

// Full-screen pages where footer/breadcrumb should be hidden
const FULLSCREEN_PATHS = ['/market/map']

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isFullscreen = FULLSCREEN_PATHS.some(p => pathname?.startsWith(p))

  return (
    <NavConfigProvider>
    <div className="flex min-h-screen flex-col">
      <OfflineBanner />
      <Navigation />
      <main className={`flex-1 ${isFullscreen ? '' : 'pb-20 md:pb-0'}`}>
        {!isFullscreen && <BreadcrumbNav />}
        <PageTransition key={pathname}>
          {children}
        </PageTransition>
      </main>
      {!isFullscreen && <Footer />}
      <ChatWidget />
      {!isFullscreen && <MobileTabBar />}
      <CommandPalette />
    </div>
    </NavConfigProvider>
  )
}
