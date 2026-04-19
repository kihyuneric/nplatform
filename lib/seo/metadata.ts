/**
 * lib/seo/metadata.ts
 *
 * Next.js Metadata 헬퍼. 페이지별 generateMetadata() 에서 호출:
 *
 *   export async function generateMetadata(): Promise<Metadata> {
 *     return pageMetadata({ title: '경매 시뮬레이터', path: '/analysis/simulator' })
 *   }
 */

import type { Metadata } from 'next'
import { BRAND } from '@/lib/brand'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nplatform.co.kr'

export interface PageSeoInput {
  title: string
  description?: string
  path?: string
  image?: string
  keywords?: string[]
  noIndex?: boolean
  type?: 'article' | 'website'
  publishedAt?: string
  updatedAt?: string
}

export function pageMetadata(input: PageSeoInput): Metadata {
  const url = input.path ? `${SITE_URL}${input.path}` : SITE_URL
  const description = input.description ?? BRAND.taglineLong
  const image = input.image ?? `${SITE_URL}/opengraph-image`

  return {
    title: input.title,
    description,
    keywords: input.keywords,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: input.title,
      description,
      url,
      siteName: BRAND.name,
      locale: 'ko_KR',
      type: input.type ?? 'website',
      images: [{ url: image, width: 1200, height: 630, alt: input.title }],
      ...(input.type === 'article' && input.publishedAt
        ? {
            publishedTime: input.publishedAt,
            modifiedTime: input.updatedAt ?? input.publishedAt,
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description,
      images: [image],
    },
    robots: input.noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : undefined,
  }
}
