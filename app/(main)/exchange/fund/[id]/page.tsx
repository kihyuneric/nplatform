import { redirect } from "next/navigation"

/**
 * 팀투자 상세는 /deals/teams/[id]로 이전되었습니다.
 */
export default async function FundDetailRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/deals/teams/${id}`)
}
