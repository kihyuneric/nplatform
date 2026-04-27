'use client'

/**
 * Dealroom external link adapter — sample slot.
 *
 * 사용자가 별도 API 로 "딜룸의 외부 연결 링크"(법원경매 정보, 등기부등본 발급, 감정가
 * 조회 등 실 외부 시스템 링크) 를 제공할 예정. 그 API 가 준비되기 전까지는 매물에서
 * 파생 가능한 안전한 placeholder URL 만 노출.
 *
 * 적용 방식:
 *   - env.EXTERNAL_DEALROOM_LINKS_URL 가 설정되면 그 endpoint 호출
 *   - 미설정 시 fallback: 매물 데이터로부터 합성한 placeholder 링크 (예: 카카오맵 검색)
 *
 * 정책:
 *   - 절대 매물 ID/제목을 하드코딩하지 않음. 모든 링크는 listing 객체에서 파생.
 */

import { useQuery } from '@tanstack/react-query'
import type { ListingDetail } from '@/lib/hooks/use-listing'
import { getListingRegion, getListingTitle } from '@/lib/hooks/use-listing'

export type DealroomLinkKind =
  | 'court_auction'      // 법원경매정보
  | 'registry'           // 등기부 발급
  | 'kakao_map'          // 카카오맵 (위치)
  | 'naver_real_estate'  // 네이버부동산 시세
  | 'molit_pricing'      // 국토부 실거래가
  | 'kamco_listing'      // KAMCO 공매
  | 'custom'             // 사용자 API 가 자유롭게 추가

export interface DealroomLink {
  kind: DealroomLinkKind
  label: string
  href: string
  /** 외부 API 가 제공한 메타 (예: 만료일, 자동 인증 토큰 등) */
  meta?: Record<string, unknown>
}

// ─── Fallback 합성 (외부 API 미연동 시) ─────────────────────────
function deriveFallbackLinks(listing: ListingDetail): DealroomLink[] {
  const region = getListingRegion(listing)
  const title = getListingTitle(listing)
  const query = encodeURIComponent(`${region} ${title}`.trim() || (listing.address ?? ''))

  return [
    region
      ? {
          kind: 'kakao_map' as const,
          label: '카카오맵에서 위치 보기',
          href: `https://map.kakao.com/?q=${query}`,
        }
      : null,
    region
      ? {
          kind: 'naver_real_estate' as const,
          label: '네이버부동산 시세',
          href: `https://land.naver.com/search?query=${query}`,
        }
      : null,
    {
      kind: 'court_auction' as const,
      label: '대법원 법원경매정보',
      href: 'https://www.courtauction.go.kr/',
    },
    {
      kind: 'molit_pricing' as const,
      label: '국토부 실거래가 공개시스템',
      href: 'https://rt.molit.go.kr/',
    },
  ].filter(Boolean) as DealroomLink[]
}

// ─── Hook ─────────────────────────────────────────────────────
export function useDealroomLinks(listing: ListingDetail | null) {
  return useQuery<{ links: DealroomLink[]; source: 'external' | 'fallback' }, Error>({
    queryKey: ['dealroom-links', listing?.id],
    queryFn: async () => {
      if (!listing) return { links: [], source: 'fallback' as const }

      // 환경 변수가 client 에서 노출되려면 NEXT_PUBLIC_ prefix 필요.
      // 사용자가 채울 예정 — 미설정 시 fallback 으로 자동 전환.
      const externalUrl =
        (typeof process !== 'undefined' &&
          (process.env.NEXT_PUBLIC_EXTERNAL_DEALROOM_LINKS_URL as string | undefined)) ||
        undefined

      if (externalUrl) {
        try {
          const r = await fetch(`${externalUrl}/${listing.id}`, { credentials: 'omit' })
          if (r.ok) {
            const data = await r.json()
            const links: DealroomLink[] = Array.isArray(data?.links) ? data.links : []
            return { links, source: 'external' as const }
          }
        } catch {
          // 외부 API 실패 시 fallback
        }
      }
      return { links: deriveFallbackLinks(listing), source: 'fallback' as const }
    },
    enabled: !!listing,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })
}
