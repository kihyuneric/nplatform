/**
 * lib/seo/jsonld.ts
 *
 * Schema.org JSON-LD 헬퍼. 서버 컴포넌트에서 임포트해
 *  <script type="application/ld+json" dangerouslySetInnerHTML={...} /> 으로 주입.
 *
 *  - BreadcrumbList  : 탐색 경로
 *  - FAQPage         : 가이드/지식 페이지의 Q&A
 *  - Article         : 블로그/뉴스
 *  - Product         : 매물/자산 카드
 *  - FinancialProduct: NPL 투자 상품
 *  - Organization    : 루트(이미 layout.tsx에서 주입) — 참조용 타입만 제공
 */

import { BRAND } from '@/lib/brand'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nplatform.co.kr'

export interface Breadcrumb {
  name: string
  url: string
}

export function breadcrumbJsonLd(items: Breadcrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  }
}

export interface FaqEntry {
  question: string
  answer: string
}

export function faqJsonLd(entries: FaqEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: e.answer,
      },
    })),
  }
}

export interface ArticleMeta {
  headline: string
  description: string
  author?: string
  datePublished: string
  dateModified?: string
  url: string
  image?: string
}

export function articleJsonLd(meta: ArticleMeta) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: meta.headline,
    description: meta.description,
    author: { '@type': 'Organization', name: meta.author ?? BRAND.name },
    publisher: {
      '@type': 'Organization',
      name: BRAND.name,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` },
    },
    datePublished: meta.datePublished,
    dateModified: meta.dateModified ?? meta.datePublished,
    mainEntityOfPage: meta.url.startsWith('http') ? meta.url : `${SITE_URL}${meta.url}`,
    image: meta.image ?? `${SITE_URL}/opengraph-image`,
  }
}

export interface ListingMeta {
  name: string
  description: string
  url: string
  price?: number
  currency?: string
  region?: string
  propertyType?: string
  image?: string
}

export function listingJsonLd(meta: ListingMeta) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: meta.name,
    description: meta.description,
    url: meta.url.startsWith('http') ? meta.url : `${SITE_URL}${meta.url}`,
    image: meta.image ?? `${SITE_URL}/opengraph-image`,
    brand: { '@type': 'Brand', name: BRAND.name },
    category: meta.propertyType,
    offers: meta.price != null ? {
      '@type': 'Offer',
      price: meta.price,
      priceCurrency: meta.currency ?? 'KRW',
      availability: 'https://schema.org/InStock',
      areaServed: meta.region,
    } : undefined,
  }
}

/** 페이지에 JSON-LD 를 안전하게 주입하는 <script> 속성 생성 */
export function jsonLdProps(obj: unknown): { type: 'application/ld+json'; dangerouslySetInnerHTML: { __html: string } } {
  return {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(obj) },
  }
}
