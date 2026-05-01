import { redirect } from 'next/navigation'
import { getEffectiveRoles } from '@/lib/auth/get-effective-roles'
import { getAssetsZoneTabs } from '@/lib/my-nav'

/**
 * /my/assets — 자산 Zone 의 진입점.
 *
 * 사용자가 SubNav "자산" 클릭 → 이 페이지로 진입.
 * 역할에 맞는 첫 번째 zone tab 으로 즉시 redirect.
 *
 * 매도자 권한자 → /my/seller
 * 비매도자 (BUYER 등) → /my/portfolio
 *
 * Phase G7+ 2026-04-29 (My_Page_Restructure_Plan v2).
 */
export default async function AssetsLandingPage() {
  const { roles, institutionType } = await getEffectiveRoles()
  const tabs = getAssetsZoneTabs({ roles, institutionType })
  const first = tabs[0]?.href ?? '/my/portfolio'
  redirect(first)
}
