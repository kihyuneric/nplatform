"use client"

import { useTenant } from "@/lib/tenant"
import { createClient } from "@/lib/supabase/client"

// ─── Feature Keys ──────────────────────────────────────

export const FEATURES = {
  DEAL_BRIDGE: "deal_bridge",
  OCR_BULK: "ocr_bulk",
  ANALYTICS: "analytics",
  MARKET_INTEL: "market_intel",
  COMMUNITY: "community",
  PROFESSIONAL: "professional",
  FUND: "fund",
  LENDER: "lender",
  AUCTION: "auction",
  DUE_DILIGENCE: "due_diligence",
  CONTRACT_GEN: "contract_gen",
  MATCHING: "matching",
} as const

export type FeatureKey = (typeof FEATURES)[keyof typeof FEATURES]

// 핵심 기능 (비활성 불가)
export const CORE_FEATURES: FeatureKey[] = [FEATURES.DEAL_BRIDGE]

// 연결 기능 (부모 기능에 의존)
export const FEATURE_DEPENDENCIES: Partial<Record<FeatureKey, FeatureKey>> = {
  [FEATURES.AUCTION]: FEATURES.DEAL_BRIDGE,
  [FEATURES.DUE_DILIGENCE]: FEATURES.DEAL_BRIDGE,
  [FEATURES.CONTRACT_GEN]: FEATURES.DEAL_BRIDGE,
  [FEATURES.MATCHING]: FEATURES.DEAL_BRIDGE,
}

// 기능 키 → URL 경로 매핑
export const FEATURE_ROUTES: Record<FeatureKey, string[]> = {
  [FEATURES.DEAL_BRIDGE]: ["/exchange"],
  [FEATURES.OCR_BULK]: ["/exchange/bulk-upload"],
  [FEATURES.ANALYTICS]: ["/npl-analysis", "/tools"],
  [FEATURES.MARKET_INTEL]: ["/market-intelligence", "/statistics"],
  [FEATURES.COMMUNITY]: ["/community"],
  [FEATURES.PROFESSIONAL]: ["/professional"],
  [FEATURES.FUND]: ["/fund"],
  [FEATURES.LENDER]: ["/lender"],
  [FEATURES.AUCTION]: ["/marketplace/live-auction"],
  [FEATURES.DUE_DILIGENCE]: ["/exchange/due-diligence"],
  [FEATURES.CONTRACT_GEN]: ["/exchange/contract"],
  [FEATURES.MATCHING]: ["/matching"],
}

// ─── Hooks ─────────────────────────────────────────────

export function useFeatureFlag(featureKey: FeatureKey): boolean {
  const { currentTenant } = useTenant()

  // 테넌트 없음 (개인 사용자) → 구독 플랜 기반 (기본 활성)
  if (!currentTenant) return true

  // 핵심 기능은 항상 활성
  if (CORE_FEATURES.includes(featureKey)) return true

  // 테넌트 설정에서 확인 (설정에 없으면 기본 활성)
  const features = (currentTenant.settings as any)?.features as Record<string, boolean> | undefined
  if (!features) return true

  // 의존 기능 확인
  const parent = FEATURE_DEPENDENCIES[featureKey]
  if (parent && features[parent] === false) return false

  return features[featureKey] !== false
}

export function useAnyFeatureFlag(featureKeys: FeatureKey[]): boolean {
  const { currentTenant } = useTenant()

  if (!currentTenant) return true

  const features = (currentTenant.settings as any)?.features as Record<string, boolean> | undefined
  if (!features) return true

  return featureKeys.some((key) => {
    if (CORE_FEATURES.includes(key)) return true
    const parent = FEATURE_DEPENDENCIES[key]
    if (parent && features[parent] === false) return false
    return features[key] !== false
  })
}

export function useEnabledFeatures(): FeatureKey[] {
  const { currentTenant } = useTenant()
  const allFeatures = Object.values(FEATURES)

  if (!currentTenant) return allFeatures

  return allFeatures.filter((key) => {
    if (CORE_FEATURES.includes(key)) return true
    const features = (currentTenant.settings as any)?.features as Record<string, boolean> | undefined
    if (!features) return true
    const parent = FEATURE_DEPENDENCIES[key]
    if (parent && features[parent] === false) return false
    return features[key] !== false
  })
}

// ─── Server-side ───────────────────────────────────────

export async function getEnabledFeatures(tenantId: string): Promise<FeatureKey[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("tenant_features")
    .select("feature_key, enabled")
    .eq("tenant_id", tenantId)

  if (!data) return Object.values(FEATURES)

  const disabledKeys = data.filter((f) => !f.enabled).map((f) => f.feature_key)
  return Object.values(FEATURES).filter((key) => !disabledKeys.includes(key))
}

export function isRouteAllowed(pathname: string, enabledFeatures: FeatureKey[]): boolean {
  for (const [feature, routes] of Object.entries(FEATURE_ROUTES)) {
    if (routes.some((route) => pathname.startsWith(route))) {
      if (!enabledFeatures.includes(feature as FeatureKey)) return false
    }
  }
  return true
}
