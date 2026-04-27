/**
 * /exchange/[id] — 시안 단계 통일: 모든 딜룸 진입을 /deals/dealroom 로 라우트
 *
 * 진입 경로:
 *   1. 거래소 매물 탐색 → 딜룸 입장 클릭
 *   2. 새 탭에서 열기 (target="_blank")
 *   3. /deals/[id] 레거시 redirect
 *
 * 모든 경로가 동일한 풀 시안 딜룸(/deals/dealroom) UI 를 보여줍니다.
 * 실제 구현 단계에서 backend listing_id 별 분기로 전환 예정.
 */

import { redirect } from "next/navigation"

export default function ListingDetailPage() {
  redirect("/deals/dealroom")
}
