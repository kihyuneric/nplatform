"use client"

/**
 * /exchange/[id] — 자산 상세 페이지 (DR-16 · 2026-04-25)
 *
 * Deal Flow View — 거래소형 5-section funnel 구조로 전환
 * (Header → Screening → [NDA] → Validation → [LOI] → Engagement → [ESCROW] → Execution)
 *
 * Next.js page.tsx 는 whitelist 된 named export 만 허용하므로 본문은
 * components/asset-detail/deal-flow-view.tsx 로 분리되어 있습니다.
 * /deals 딜룸에서도 동일 컴포넌트를 iframe 없이 직접 재사용합니다.
 */

import { DealFlowView } from "@/components/asset-detail/deal-flow-view"

export default function ListingDetailPage() {
  return <DealFlowView />
}
