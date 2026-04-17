import { redirect } from "next/navigation"

/**
 * 팀투자 생성은 /deals/teams/new로 이전되었습니다.
 */
export default function FundNewRedirectPage() {
  redirect("/deals/teams/new")
}
