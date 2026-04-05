import { withSentryConfig } from '@sentry/nextjs'

const withBundleAnalyzer = process.env.ANALYZE === 'true'
  ? (await import('@next/bundle-analyzer')).default({ enabled: true })
  : (config) => config

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Type errors are caught in CI (tsc --noEmit). Build errors only for type issues
    // that slip through — keep false in production for strict safety.
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // optimizePackageImports handles lucide-react tree-shaking natively in Next.js 14+
    // Do NOT use modularizeImports for lucide-react — it breaks icons with 'Icon' suffix
    // (e.g. HandshakeIcon → handshake-icon, but the file is handshake.js)
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-icons'],
  },
  async headers() {
    return [
      // ── 정적 에셋: 브라우저 1년 캐시 (Next.js가 content-hash로 파일명 변경해 무효화)
      {
        source: '/_next/static/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // ── 이미지 최적화 결과: 30일 캐시
      {
        source: '/_next/image(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=86400' },
        ],
      },
      // ── 공개 파일 (favicon, manifest, icons): 24시간
      {
        source: '/(favicon.ico|manifest.json|sw.js|robots.txt|sitemap.xml)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      // ── API 라우트: 캐시 없음
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
      // ── 페이지 HTML: CDN에 60초 stale-while-revalidate
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      // Market → Exchange
      // /market/search serves the full NPL data grid search — no redirect
      { source: '/market/bidding', destination: '/exchange/auction', permanent: true },
      { source: '/market/map', destination: '/exchange/map', permanent: true },
      { source: '/listings', destination: '/exchange', permanent: true },
      { source: '/listings/:id', destination: '/exchange/:id', permanent: true },
      { source: '/marketplace/:path*', destination: '/exchange', permanent: true },

      // Deal rooms → Deals
      { source: '/deal-rooms', destination: '/deals', permanent: true },
      { source: '/deal-rooms/:id', destination: '/deals/:id', permanent: true },
      { source: '/exchange/deals', destination: '/deals', permanent: true },
      { source: '/exchange/deals/:id', destination: '/deals/:id', permanent: true },
      { source: '/exchange/archive', destination: '/deals/archive', permanent: true },
      { source: '/exchange/due-diligence/:id', destination: '/deals/:id', permanent: true },
      { source: '/exchange/contract/:id', destination: '/deals/:id', permanent: true },
      { source: '/matching', destination: '/deals/matching', permanent: true },
      { source: '/tools/contract-generator', destination: '/deals/contract', permanent: true },

      // Analysis
      { source: '/npl-analysis', destination: '/analysis', permanent: true },
      { source: '/npl-analysis/new', destination: '/analysis/new', permanent: true },
      { source: '/npl-analysis/:id', destination: '/analysis/:id', permanent: true },
      { source: '/statistics', destination: '/analysis', permanent: true },
      { source: '/market-intelligence', destination: '/analysis', permanent: true },
      { source: '/market-intelligence/:path*', destination: '/analysis', permanent: true },
      { source: '/tools/auction-simulator', destination: '/analysis/simulator', permanent: true },
      { source: '/tools/ocr', destination: '/analysis/ocr', permanent: true },
      { source: '/tools/due-diligence-report', destination: '/analysis/due-diligence', permanent: true },

      // Services
      { source: '/professional', destination: '/services/experts', permanent: true },
      { source: '/professional/:id', destination: '/services/experts/:id', permanent: true },
      { source: '/professional/register', destination: '/services/experts/register', permanent: true },
      { source: '/professional/law', destination: '/services/experts', permanent: true },
      { source: '/professional/tax', destination: '/services/experts', permanent: true },
      { source: '/professional/realtor', destination: '/services/experts', permanent: true },
      { source: '/community', destination: '/services/community', permanent: true },
      { source: '/community/:id', destination: '/services/community/:id', permanent: true },
      { source: '/community/new', destination: '/services/community/new', permanent: true },
      { source: '/knowledge', destination: '/services/learn', permanent: true },
      { source: '/knowledge/:path*', destination: '/services/learn', permanent: true },
      { source: '/fund', destination: '/exchange/fund', permanent: true },
      { source: '/lender', destination: '/exchange/lender', permanent: true },

      // My
      { source: '/mypage', destination: '/my', permanent: true },
      { source: '/buyer/dashboard', destination: '/my', permanent: true },
      { source: '/buyer/:path*', destination: '/my/portfolio', permanent: true },
      { source: '/seller/dashboard', destination: '/my/seller', permanent: true },
      { source: '/seller/:path*', destination: '/my/seller', permanent: true },
      { source: '/investor/:path*', destination: '/my/portfolio', permanent: true },
      { source: '/institution/:path*', destination: '/my/seller', permanent: true },
      { source: '/partner/dashboard', destination: '/my/partner', permanent: true },
      { source: '/partner/referral', destination: '/my/partner', permanent: true },
      { source: '/partner/earnings', destination: '/my/partner', permanent: true },
      { source: '/settings/payment', destination: '/my/billing', permanent: true },
      { source: '/settings/coupons', destination: '/my/billing', permanent: true },
      { source: '/settings/security', destination: '/my/settings', permanent: true },
      { source: '/settings/:path*', destination: '/my/settings', permanent: true },
      { source: '/notifications', destination: '/my/notifications', permanent: true },

      // Admin sub-page consolidation → parent tab pages
      { source: '/admin/analytics/cohort', destination: '/admin/analytics?tab=cohort', permanent: true },
      { source: '/admin/analytics/funnel', destination: '/admin/analytics?tab=funnel', permanent: true },
      { source: '/admin/billing/coupons',  destination: '/admin/billing?tab=coupons',  permanent: true },
      { source: '/admin/billing/pricing',  destination: '/admin/billing?tab=pricing',  permanent: true },
      { source: '/admin/content/banners',  destination: '/admin/content?tab=banners',  permanent: true },
      { source: '/admin/content/notices',  destination: '/admin/content?tab=notices',  permanent: true },
      { source: '/admin/content/news',     destination: '/admin/content?tab=news',     permanent: true },
      { source: '/admin/content/guide',    destination: '/admin/content?tab=guide',    permanent: true },
      { source: '/admin/settings/permissions', destination: '/admin/settings?tab=permissions', permanent: true },
      { source: '/admin/settings/admins',  destination: '/admin/settings?tab=admins',  permanent: true },
      { source: '/admin/system/database',  destination: '/admin/system?tab=database',  permanent: true },
      { source: '/admin/system/modules',   destination: '/admin/system?tab=modules',   permanent: true },
      { source: '/admin/system/errors',    destination: '/admin/system?tab=errors',    permanent: true },
      { source: '/admin/system/automation', destination: '/admin/system?tab=automation', permanent: true },
      { source: '/admin/experts/professionals', destination: '/admin/experts?tab=professionals', permanent: true },
      { source: '/admin/experts/partners', destination: '/admin/experts?tab=partners',  permanent: true },

      // Admin security consolidation
      { source: '/admin/security/masking', destination: '/admin/security?tab=masking', permanent: true },
      { source: '/admin/audit-logs', destination: '/admin/security?tab=audit', permanent: true },
      { source: '/admin/compliance', destination: '/admin/security?tab=compliance', permanent: true },
      { source: '/admin/tenants', destination: '/admin/security?tab=tenants', permanent: true },
      { source: '/admin/tenants/:id', destination: '/admin/security?tab=tenants', permanent: true },

      // Admin users consolidation
      { source: '/admin/kyc', destination: '/admin/users?tab=kyc', permanent: true },
      { source: '/admin/approvals', destination: '/admin/users?tab=approvals', permanent: true },
      { source: '/admin/admins', destination: '/admin/settings?tab=admins', permanent: true },

      // Admin settings consolidation
      { source: '/admin/api-keys', destination: '/admin/settings?tab=api-keys', permanent: true },
      { source: '/admin/api-integrations', destination: '/admin/settings?tab=integrations', permanent: true },
      { source: '/admin/integrations', destination: '/admin/settings?tab=integrations', permanent: true },
      { source: '/admin/integrations/hub', destination: '/admin/settings?tab=integrations', permanent: true },
      { source: '/admin/navigation', destination: '/admin/settings?tab=navigation', permanent: true },
      { source: '/admin/site-settings', destination: '/admin/settings?tab=general', permanent: true },
      { source: '/admin/permissions', destination: '/admin/settings?tab=permissions', permanent: true },

      // Admin experts/partners consolidation
      { source: '/admin/partners', destination: '/admin/experts?tab=partners', permanent: true },
      { source: '/admin/partners/settlements', destination: '/admin/billing?tab=settlements', permanent: true },
      { source: '/admin/professionals', destination: '/admin/experts?tab=professionals', permanent: true },

      // Admin content consolidation
      { source: '/admin/courses', destination: '/admin/content?tab=courses', permanent: true },
      { source: '/admin/glossary', destination: '/admin/content?tab=glossary', permanent: true },
      { source: '/admin/notices', destination: '/admin/content?tab=notices', permanent: true },
      { source: '/admin/news', destination: '/admin/content?tab=news', permanent: true },
      { source: '/admin/guide', destination: '/admin/content?tab=guide', permanent: true },
      { source: '/admin/banners', destination: '/admin/content?tab=banners', permanent: true },

      // Admin billing consolidation
      { source: '/admin/coupons', destination: '/admin/billing?tab=coupons', permanent: true },
      { source: '/admin/pricing', destination: '/admin/billing?tab=pricing', permanent: true },

      // Admin system consolidation
      { source: '/admin/market-data', destination: '/admin/ml?tab=market-data', permanent: true },
      { source: '/admin/modules', destination: '/admin/system?tab=modules', permanent: true },
      { source: '/admin/database', destination: '/admin/system?tab=database', permanent: true },
      { source: '/admin/errors', destination: '/admin/system?tab=errors', permanent: true },
      { source: '/admin/automation', destination: '/admin/system?tab=automation', permanent: true },
      { source: '/admin/infra', destination: '/admin/system?tab=infra', permanent: true },
      { source: '/admin/migrate', destination: '/admin/system?tab=database', permanent: true },
      { source: '/admin/deploy-checklist', destination: '/admin/system?tab=deploy', permanent: true },

      // Admin analytics consolidation
      { source: '/admin/monitoring', destination: '/admin/analytics?tab=monitoring', permanent: true },
      { source: '/admin/performance', destination: '/admin/analytics?tab=performance', permanent: true },

      // Admin deals consolidation
      { source: '/admin/cases', destination: '/admin/deals', permanent: true },
      { source: '/admin/complaints', destination: '/admin/deals', permanent: true },

      // Missing: demand → exchange/demands
      { source: '/demand', destination: '/exchange/demands', permanent: true },
      { source: '/demand/survey', destination: '/exchange/demands', permanent: true },
      { source: '/demand/survey/:id', destination: '/exchange/demands/:id', permanent: true },
      { source: '/demand/survey/new', destination: '/exchange/demands/new', permanent: true },
      { source: '/demand/surveys', destination: '/exchange/demands', permanent: true },
      { source: '/demand/surveys/:id', destination: '/exchange/demands/:id', permanent: true },
      { source: '/demand/surveys/:id/matches', destination: '/exchange/demands/:id', permanent: true },

      // Missing: lender, fund subpaths
      { source: '/lender/:id', destination: '/exchange', permanent: true },
      { source: '/fund/:id', destination: '/exchange', permanent: true },

      // Missing: teams → deals/teams
      { source: '/teams', destination: '/deals/teams', permanent: true },
      { source: '/teams/new', destination: '/deals/teams/new', permanent: true },
      { source: '/teams/explore', destination: '/deals/teams', permanent: true },
      { source: '/teams/:id', destination: '/deals/teams/:id', permanent: true },
      { source: '/teams/:id/chat', destination: '/deals/teams/:id', permanent: true },
      { source: '/teams/:id/invest', destination: '/deals/teams/:id', permanent: true },
      { source: '/teams/:id/invest/:listingId', destination: '/deals/teams/:id', permanent: true },
      { source: '/teams/:id/returns', destination: '/deals/teams/:id', permanent: true },

      // Missing: contract → deals
      { source: '/contract', destination: '/deals', permanent: true },
      { source: '/contract/new', destination: '/deals/contract', permanent: true },
      { source: '/contract/:id', destination: '/deals/:id', permanent: true },

      // Missing: npl-analysis subpaths
      { source: '/npl-analysis/compare', destination: '/analysis', permanent: true },
      { source: '/npl-analysis/copilot', destination: '/analysis/copilot', permanent: true },
      { source: '/statistics/trend', destination: '/analysis', permanent: true },
      { source: '/market/search', destination: '/exchange/search', permanent: true },

      // Missing: professional subpaths
      { source: '/professional/consultations', destination: '/my/professional', permanent: true },
      { source: '/professional/my', destination: '/my/professional', permanent: true },
      { source: '/professional/my/:path*', destination: '/my/professional', permanent: true },

      // developer 서브페이지만 my/developer로 리다이렉트 (메인 /developer는 공개 랜딩)
      { source: '/developer/keys', destination: '/my/developer', permanent: true },
      { source: '/developer/webhooks', destination: '/my/developer', permanent: true },

      // Missing: about, psychology → guide
      { source: '/about/team', destination: '/about', permanent: true },
      { source: '/psychology', destination: '/guide/psychology', permanent: true },

      // guide 스텁 페이지 → 실제 목적지로 redirect
      { source: '/guide/partner-referral', destination: '/guide/partner', permanent: true },
      { source: '/guide/professional-register', destination: '/services/experts/register', permanent: true },
      { source: '/guide/auction-simulator', destination: '/analysis/simulator', permanent: true },
      { source: '/guide/demand-register', destination: '/exchange/demands/new', permanent: true },
      { source: '/guide/due-diligence', destination: '/guide/npl-analysis', permanent: true },
      { source: '/guide/institution-profile', destination: '/exchange/institutions', permanent: true },
      { source: '/guide/listing-register', destination: '/exchange/sell', permanent: true },
      { source: '/guide/map-search', destination: '/exchange/search', permanent: true },
      { source: '/guide/ocr', destination: '/analysis/ocr', permanent: true },

      // knowledge/courses/:id → services/learn/courses/:id
      { source: '/knowledge/courses/:id', destination: '/services/learn/courses/:id', permanent: true },

      // Missing: marketplace subpaths not covered
      { source: '/marketplace/calendar', destination: '/deals', permanent: true },
      { source: '/marketplace/co-invest', destination: '/deals/teams', permanent: true },
      { source: '/marketplace/matching', destination: '/deals/matching', permanent: true },
      { source: '/marketplace/portfolio-bid', destination: '/exchange', permanent: true },

      // Payment: old settings path → new (payment) route group
      { source: '/settings/payment/success', destination: '/payment/success', permanent: true },
      { source: '/settings/payment/fail',    destination: '/payment/fail',    permanent: true },

      // Admin CMS → content/settings
      { source: '/admin/cms', destination: '/admin/content', permanent: true },
      { source: '/admin/cms/banners', destination: '/admin/content?tab=banners', permanent: true },
      { source: '/admin/cms/email-templates', destination: '/admin/content?tab=email-templates', permanent: true },
      { source: '/admin/cms/navigation', destination: '/admin/settings?tab=navigation', permanent: true },
      { source: '/admin/cms/pages', destination: '/admin/content?tab=pages', permanent: true },
      { source: '/admin/cms/popups', destination: '/admin/content?tab=popups', permanent: true },
      { source: '/admin/cms/pricing-plans', destination: '/admin/billing?tab=pricing', permanent: true },
      { source: '/admin/cms/site-settings', destination: '/admin/settings?tab=general', permanent: true },

      // Admin commissions → billing
      { source: '/admin/commissions', destination: '/admin/billing?tab=commissions', permanent: true },

      // Admin listings review → tab
      { source: '/admin/listings/review', destination: '/admin/listings?tab=review', permanent: true },

      // about 공개 소개 페이지 유지 (리다이렉트 제거)

      // developer 공개 랜딩 페이지 유지 (리다이렉트 제거)

      // partner 공개 랜딩 페이지 유지 (리다이렉트 제거)
    ]
  },
}

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

export default SENTRY_DSN
  ? withSentryConfig(withBundleAnalyzer(nextConfig), {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : withBundleAnalyzer(nextConfig)
