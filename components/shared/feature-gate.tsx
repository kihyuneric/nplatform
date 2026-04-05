"use client"

import type { ReactNode } from "react"
import { useFeatureFlag, useAnyFeatureFlag, type FeatureKey } from "@/lib/feature-flags"

interface FeatureGateProps {
  feature: FeatureKey
  children: ReactNode
  fallback?: ReactNode
}

/**
 * 기능이 활성화된 경우에만 children 렌더링
 *
 * <FeatureGate feature="community">
 *   <CommunitySection />
 * </FeatureGate>
 */
export function FeatureGate({ feature, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeatureFlag(feature)
  return enabled ? <>{children}</> : <>{fallback}</>
}

/**
 * 복수 기능 중 하나라도 활성화면 렌더링
 */
export function FeatureGateAny({
  features,
  children,
  fallback = null,
}: {
  features: FeatureKey[]
  children: ReactNode
  fallback?: ReactNode
}) {
  const anyEnabled = useAnyFeatureFlag(features)
  return anyEnabled ? <>{children}</> : <>{fallback}</>
}
