import { redirect } from "next/navigation"

/**
 * 팀투자는 딜룸(/deals/teams)에서 관리됩니다.
 * 이전 URL 호환을 위해 리다이렉트 처리합니다.
 */
export default function FundRedirectPage() {
  redirect("/deals/teams")
}
