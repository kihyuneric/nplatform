"use client"

/**
 * /exchange/[id] — 자산 상세 페이지 (DR-15 · 2026-04-21 · DR-22 · 2026-04-26)
 *
 * Next.js page.tsx 는 whitelist 된 named export 만 허용하므로 본문은
 * components/asset-detail/asset-detail-view.tsx 로 분리되어 있습니다.
 *
 * DR-22 (2026-04-26): 거래소 매물 탐색 → 딜룸 입장 / 새 탭에서 열기 / /deals/[id] 리다이렉트
 *   세 진입 경로 모두 동일한 Deal Flow Funnel UI 로 통일.
 *   `dealFlowMode={true}` 를 항상 활성화 — Section 01 Free Preview / 4-step funnel /
 *   확대된 헤더 카드 + 좌(내용)/우(다음 단계) 레이아웃 노출.
 */

import { AssetDetailView } from "@/components/asset-detail/asset-detail-view"

export default function ListingDetailPage() {
  return <AssetDetailView dealFlowMode />
}
