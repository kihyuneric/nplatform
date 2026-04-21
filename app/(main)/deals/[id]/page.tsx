/**
 * /deals/[id] → /exchange/[id] 서버 리다이렉트 (DR-3-A · 2026-04-21)
 *
 * 계획서: docs/Asset_Unified_Experience_Plan_2026-04-21.md
 *
 * 원칙: "1 자산 = 1 URL = 1 화면"
 * - 기존 딜룸(2433줄) 기능은 /exchange/[id] 에 흡수됨
 * - 이 파일은 레거시 URL (/deals/[id]) 진입 시 매물 상세 URL 로 투명 리다이렉트
 * - ?tab, ?action, ?detail 쿼리 파라미터 보존 → /exchange/[id] 가 인지
 *
 * 매핑 규칙:
 *   1. [id] 가 deals.id 이면 → deals.listing_id 로 리다이렉트
 *   2. DB 조회 실패 시 그대로 id 를 listing id 로 간주 (사용자 경험 중단 방지)
 */

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

type SearchParamValue = string | string[] | undefined

export const dynamic = "force-dynamic"

export default async function DealIdLegacyRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, SearchParamValue>>
}) {
  const { id } = await params
  const sp = await searchParams

  // 1) deals 테이블에서 listing_id 조회
  let listingId = id
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from("deals")
      .select("listing_id")
      .eq("id", id)
      .maybeSingle()
    if (data?.listing_id) {
      listingId = data.listing_id as string
    }
  } catch {
    // DB 장애 시 id 를 그대로 listing id 로 간주
  }

  // 2) 쿼리 파라미터 보존 + DR-3 핵심 파라미터 추가
  const qs = new URLSearchParams()

  const preserve = (key: string) => {
    const v = sp[key]
    if (!v) return
    qs.set(key, Array.isArray(v) ? (v[0] ?? "") : v)
  }
  preserve("tab")
  preserve("action")
  preserve("detail")
  preserve("filter")
  preserve("embed")  // iframe 임베드 모드 (딜룸 /deals 에서 사용) — chrome 숨김

  // DR-3 신호: 레거시 /deals URL 에서 온 사용자임을 exchange 페이지가 인지
  qs.set("via", "deal-room")

  const qsStr = qs.toString()
  const target = `/exchange/${listingId}${qsStr ? `?${qsStr}` : ""}`

  redirect(target)
}
