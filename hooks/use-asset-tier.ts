/**
 * useAssetTier — 자산 통합 티어 hook (DR-3-B · 2026-04-21)
 *
 * 계획서: docs/Asset_Unified_Experience_Plan_2026-04-21.md
 *
 * 단일 진실 공급원 — 기존 AccessTier (L0~L3) + DealStage 를 합쳐
 * 사용자-자산 관계의 전체 여정(L0~L5)을 도출합니다.
 *
 * ▸ L0  공개  — 무로그인 탐색
 * ▸ L1  본인인증 — phone/공동인증
 * ▸ L2  NDA — 전문투자자 인증 + NDA 체결 (채팅·데이터룸 열림)
 * ▸ L3  LOI — LOI 제출 + 매각자 승인 (실사·협상)
 * ▸ L4  계약 — 전자서명 진행/완료
 * ▸ L5  정산 — 에스크로 납입/종결
 *
 * 기존 시스템 호환:
 *   - AccessTier(L0~L3)  : lib/access-tier.ts — 사용자 기본 자격
 *   - DealStage          : lib/deal-constants.ts — 매물별 진행 상태
 *   - deals 테이블      : Supabase (listing_id 로 조회)
 */

"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { AccessTier } from "@/lib/access-tier"
import { getUserTier } from "@/lib/access-tier"
import type { DealStage } from "@/lib/deal-constants"

export type AssetTier = "L0" | "L1" | "L2" | "L3" | "L4" | "L5"

export interface AssetAction {
  type:
    | "LOGIN"
    | "VERIFY_IDENTITY"
    | "QUALIFY_INVESTOR"
    | "SIGN_NDA"
    | "SUBMIT_LOI"
    | "REQUEST_DD"
    | "SIGN_CONTRACT"
    | "PAY_ESCROW"
    | "VIEW_RECEIPT"
  label: string
  disabled?: boolean
  href?: string
}

export interface UseAssetTierResult {
  /** 최종 티어 (access + deal stage 조합) */
  tier: AssetTier
  /** 사용자 기본 자격 (L0~L3) */
  accessTier: AccessTier
  /** 현재 거래의 스테이지 (없으면 null) */
  dealStage: DealStage | null
  /** 연관 deal id (없으면 null) — 기존 /deals/[id] 호환용 */
  dealId: string | null
  /** 티어별 primary action */
  primaryAction: AssetAction
  /** 로딩 */
  loading: boolean
  /** 수동 리로드 */
  reload: () => Promise<void>
}

const DEFAULT_ACTION: AssetAction = {
  type: "LOGIN",
  label: "로그인하고 투자 시작",
  href: "/auth/login",
}

/**
 * 티어 + 거래 스테이지로부터 primary CTA 생성
 */
function deriveAction(tier: AssetTier, listingId: string, dealId: string | null): AssetAction {
  switch (tier) {
    case "L0":
      return { type: "LOGIN", label: "로그인하고 관심 표시", href: "/auth/login" }
    case "L1":
      return {
        type: "QUALIFY_INVESTOR",
        label: "전문투자자 인증 · NDA 서명",
        href: "/my/kyc",
      }
    case "L2":
      return {
        type: "SUBMIT_LOI",
        label: "LOI 제출하기",
        // DR-3-D 에서 인라인 드로어로 전환 예정 — 현재는 기존 플로우 유지
        href: dealId ? `/exchange/${listingId}?action=loi&deal=${dealId}` : `/exchange/${listingId}?action=loi`,
      }
    case "L3":
      return {
        type: "REQUEST_DD",
        label: "데이터룸 · 실사 진행",
        href: dealId ? `/exchange/${listingId}?tab=자료&deal=${dealId}` : `/exchange/${listingId}?tab=자료`,
      }
    case "L4":
      return {
        type: "SIGN_CONTRACT",
        label: "전자서명 · 에스크로 입금",
        href: dealId ? `/exchange/${listingId}?tab=거래&deal=${dealId}` : `/exchange/${listingId}?tab=거래`,
      }
    case "L5":
      return {
        type: "VIEW_RECEIPT",
        label: "영수증 · 정산 내역",
        href: dealId ? `/exchange/${listingId}?tab=이력&deal=${dealId}` : `/exchange/${listingId}?tab=이력`,
      }
    default:
      return DEFAULT_ACTION
  }
}

/**
 * DealStage 를 AssetTier 추가 등급으로 승격
 */
function liftStageToTier(baseTier: AccessTier, stage: DealStage | null): AssetTier {
  if (!stage) return baseTier as AssetTier
  switch (stage) {
    case "INTEREST":
      return baseTier as AssetTier
    case "NDA":
      return "L2"
    case "DUE_DILIGENCE":
      return "L3"
    case "NEGOTIATION":
      return "L3"
    case "CONTRACT":
      return "L4"
    case "SETTLEMENT":
      return "L5"
    case "COMPLETED":
      return "L5"
    default:
      return baseTier as AssetTier
  }
}

export function useAssetTier(listingId: string | null | undefined): UseAssetTierResult {
  const [accessTier, setAccessTier] = useState<AccessTier>("L0")
  const [dealStage, setDealStage] = useState<DealStage | null>(null)
  const [dealId, setDealId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!listingId) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()

      // 1) 현재 유저 조회
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setAccessTier("L0")
        setDealStage(null)
        setDealId(null)
        return
      }

      // 2) 유저 자격 조회 (qualified_investor / identity_verified)
      const { data: userRec } = await supabase
        .from("users")
        .select("identity_verified, qualified_investor")
        .eq("id", user.id)
        .maybeSingle()
      setAccessTier(getUserTier(userRec as never))

      // 3) 이 매물에 대한 내 deal 조회 (최신 1개)
      const { data: dealRec } = await supabase
        .from("deals")
        .select("id, stage")
        .eq("listing_id", listingId)
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      if (dealRec) {
        setDealId((dealRec as { id: string }).id)
        setDealStage((dealRec as { stage: DealStage }).stage ?? null)
      } else {
        setDealId(null)
        setDealStage(null)
      }
    } catch {
      // 네트워크/RLS 오류 시 L0 fallback
      setAccessTier("L0")
      setDealStage(null)
      setDealId(null)
    } finally {
      setLoading(false)
    }
  }, [listingId])

  useEffect(() => {
    load()
  }, [load])

  const tier = liftStageToTier(accessTier, dealStage)
  const primaryAction = deriveAction(tier, listingId ?? "", dealId)

  return {
    tier,
    accessTier,
    dealStage,
    dealId,
    primaryAction,
    loading,
    reload: load,
  }
}
