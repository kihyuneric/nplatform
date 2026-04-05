"use client"

import { createContext, useContext } from "react"
import { createClient } from "@/lib/supabase/client"

// ─── Types ─────────────────────────────────────────────

export interface Tenant {
  id: string
  name: string
  slug: string
  type: "BANK" | "AMC" | "SAVINGS_BANK" | "CAPITAL" | "INDIVIDUAL_POOL"
  logo_url: string | null
  primary_color: string
  accent_color: string
  settings: Record<string, unknown>
  status: string
}

export interface TenantMember {
  tenant_id: string
  user_id: string
  role: "TENANT_ADMIN" | "REVIEWER" | "MEMBER"
  status: "PENDING_APPROVAL" | "APPROVED" | "SUSPENDED"
}

export interface TenantContextValue {
  currentTenant: Tenant | null
  tenants: Tenant[]
  membership: TenantMember | null
  switchTenant: (tenantId: string) => void
  isLoading: boolean
}

// ─── Context ───────────────────────────────────────────

export const TenantContext = createContext<TenantContextValue>({
  currentTenant: null,
  tenants: [],
  membership: null,
  switchTenant: () => {},
  isLoading: true,
})

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error("useTenant must be used within TenantProvider")
  return ctx
}

export function useIsTenantAdmin() {
  const { membership } = useTenant()
  return membership?.role === "TENANT_ADMIN"
}

export function useIsTenantMember() {
  const { membership } = useTenant()
  return membership?.status === "APPROVED"
}

// ─── API Helpers ───────────────────────────────────────

export async function fetchUserTenants(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, status, tenants(*)")
    .eq("user_id", userId)
    .eq("status", "APPROVED")

  if (error) return []
  return (data || []).map((m: any) => ({
    tenant: m.tenants as Tenant,
    role: m.role as TenantMember["role"],
    status: m.status as TenantMember["status"],
  }))
}

export async function fetchTenantById(tenantId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single()
  return data as Tenant | null
}

export async function fetchTenantBySlug(slug: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single()
  return data as Tenant | null
}
