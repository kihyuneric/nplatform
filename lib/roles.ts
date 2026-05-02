"use client"

import { createContext, useContext } from "react"
import { createClient } from "@/lib/supabase/client"

// ─── Types ─────────────────────────────────────────────

export type UserRole = "BUYER" | "SELLER" | "INSTITUTION" | "PROFESSIONAL" | "PARTNER" | "INVESTOR" | "ADMIN" | "SUPER_ADMIN"

// Phase G7+ 2026-04-29 — 사용자 정합 정책: 매도자→매각사, 매수자→매입사
//   회원가입 노출 역할은 SELLER · BUYER · PARTNER 3개로 단순화.
//   INSTITUTION / PROFESSIONAL / INVESTOR 는 legacy 호환만 유지 (UI 미노출).
export const ROLE_LABELS: Record<UserRole, string> = {
  SELLER: "매각사",
  BUYER: "매입사",
  PARTNER: "파트너",
  INSTITUTION: "매각사 (금융기관)",   // legacy → 매각사로 통합 표기
  PROFESSIONAL: "파트너 (전문가)",    // legacy → 파트너로 통합 표기
  INVESTOR: "매입사 (투자자)",         // legacy → 매입사로 통합 표기
  ADMIN: "관리자",
  SUPER_ADMIN: "슈퍼관리자",
}

export const ROLE_ICONS: Record<UserRole, string> = {
  BUYER: "ShoppingCart",
  SELLER: "Building2",
  INSTITUTION: "Landmark",
  PROFESSIONAL: "GraduationCap",
  PARTNER: "Handshake",
  INVESTOR: "TrendingUp",
  ADMIN: "Shield",
  SUPER_ADMIN: "Crown",
}

export const ROLE_COLORS: Record<UserRole, string> = {
  BUYER: "#10B981",
  SELLER: "#2E75B6",
  INSTITUTION: "#1B3A5C",
  PROFESSIONAL: "#8B5CF6",
  PARTNER: "#F59E0B",
  INVESTOR: "#06B6D4",
  ADMIN: "#EF4444",
  SUPER_ADMIN: "#DC2626",
}

// 역할별 접근 가능 경로 prefix
export const ROLE_ROUTES: Partial<Record<UserRole, string[]>> = {
  BUYER: ["/buyer", "/exchange", "/matching", "/investor"],
  SELLER: ["/seller", "/exchange", "/institution"],
  INSTITUTION: ["/institution", "/exchange"],
  PROFESSIONAL: ["/professional/my"],
  PARTNER: ["/partner"],
  INVESTOR: ["/investor"],
  ADMIN: ["/admin"],
  SUPER_ADMIN: ["/admin"],
}

// ─── Context ───────────────────────────────────────────

export interface RolesContextValue {
  roles: UserRole[]
  activeRole: UserRole | null
  primaryRole: UserRole | null
  switchRole: (role: UserRole) => void
  hasRole: (role: UserRole) => boolean
  isAdmin: boolean
}

export const RolesContext = createContext<RolesContextValue>({
  roles: [],
  activeRole: null,
  primaryRole: null,
  switchRole: () => {},
  hasRole: () => false,
  isAdmin: false,
})

export function useRoles() {
  return useContext(RolesContext)
}

export function useActiveRole() {
  const { activeRole } = useRoles()
  return activeRole
}

export function useHasRole(role: UserRole) {
  const { hasRole } = useRoles()
  return hasRole(role)
}

// ─── API Helpers ───────────────────────────────────────

export async function fetchUserRoles(userId: string): Promise<{ role: UserRole; is_primary: boolean }[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("user_roles")
    .select("role, is_primary")
    .eq("user_id", userId)

  if (error || !data) return []
  return data as { role: UserRole; is_primary: boolean }[]
}

export async function addUserRole(userId: string, role: UserRole) {
  const supabase = createClient()
  return supabase.from("user_roles").upsert({
    user_id: userId,
    role,
    granted_at: new Date().toISOString(),
  })
}

export async function removeUserRole(userId: string, role: UserRole) {
  const supabase = createClient()
  return supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role)
}

/**
 * 역할 전환 시 쿠키에 저장 (미들웨어에서 읽음)
 */
export function setActiveRoleCookie(role: UserRole) {
  document.cookie = `active_role=${role};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`
}

export function getActiveRoleFromCookie(): UserRole | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(/active_role=([^;]+)/)
  return match ? (match[1] as UserRole) : null
}
