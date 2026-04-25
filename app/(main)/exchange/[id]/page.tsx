"use client"

/**
 * /exchange/[id] — 자산 상세 페이지 (DR-15 · 2026-04-21)
 *
 * Next.js page.tsx 는 whitelist 된 named export 만 허용하므로 본문은
 * components/asset-detail/asset-detail-view.tsx 로 분리되어 있습니다.
 * /deals 딜룸에서도 동일 컴포넌트를 iframe 없이 직접 재사용합니다.
 */

import { AssetDetailView } from "@/components/asset-detail/asset-detail-view"

export default function ListingDetailPage() {
  return <AssetDetailView />
}
