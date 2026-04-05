import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://nplatform.co.kr'

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/exchange',
          '/analysis',
          '/services',
          '/pricing',
          '/guide',
          '/support',
          '/notices',
          '/news',
          '/terms',
          '/login',
          '/signup',
        ],
        disallow: [
          '/admin',
          '/api',
          '/my',
          '/deals',
          '/analysis/new',
          '/analysis/ocr',
          '/pending-approval',
          '/_next',
        ],
      },
      // Block AI crawlers from scraping proprietary content
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'CCBot', 'anthropic-ai', 'Claude-Web'],
        disallow: ['/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
