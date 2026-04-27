/**
 * /deals — 딜룸 통합 (시안 단계)
 *
 * 사용자 요청: "딜룸-딜룸도 거래소-매물탐색-딜룸입장 화면과 같이 해줘"
 * → 모든 진입점이 풀 시안 딜룸(/deals/dealroom) 으로 통일.
 *
 * 진입 경로:
 *   - 글로벌 네비게이션 → 딜룸
 *   - 거래소 매물 탐색 → 딜룸 입장 (/exchange/[id] 도 redirect)
 *   - 레거시 /deals/[id]
 * 모두 동일한 풀 딜룸 화면을 보게 됩니다.
 *
 * 실제 구현 단계에서 backend listing_id 별 분기로 전환 예정.
 */

import { redirect } from "next/navigation"

export default function DealsRoomLandingPage() {
  redirect("/deals/dealroom")
}
