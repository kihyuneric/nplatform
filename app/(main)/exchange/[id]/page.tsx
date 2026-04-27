/**
 * /exchange/[id] — 매물 상세는 딜룸으로 통합. listing.id 를 쿼리에 보존해 redirect.
 *
 * 진입 경로:
 *   1. 거래소 매물 탐색 → 딜룸 입장 클릭
 *   2. 새 탭에서 열기 (target="_blank")
 *   3. /deals/[id] 레거시 redirect
 *   4. 외부 링크/공유 URL (/exchange/<UUID>)
 *
 * 모든 경로가 /deals/dealroom?listingId=<UUID> 로 단일화되어 useListing(id) 가
 * SoT 데이터를 자동으로 가져옴.
 */

import { redirect } from "next/navigation"

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  redirect(`/deals/dealroom?listingId=${encodeURIComponent(id)}`)
}
