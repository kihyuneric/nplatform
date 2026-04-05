"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"
import { TenantContext, type Tenant, type TenantMember, fetchUserTenants } from "@/lib/tenant"

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [membership, setMembership] = useState<TenantMember | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsLoading(false)
          return
        }

        const memberships = await fetchUserTenants(user.id)
        const tenantList = memberships.map((m) => m.tenant)
        setTenants(tenantList)

        // 쿠키에서 현재 테넌트 복원
        const savedTenantId = getCookie("current_tenant_id")
        const found = memberships.find((m) => m.tenant.id === savedTenantId)

        if (found) {
          setCurrentTenant(found.tenant)
          setMembership({
            tenant_id: found.tenant.id,
            user_id: user.id,
            role: found.role,
            status: found.status,
          })
        } else if (memberships.length > 0) {
          const first = memberships[0]
          setCurrentTenant(first.tenant)
          setMembership({
            tenant_id: first.tenant.id,
            user_id: user.id,
            role: first.role,
            status: first.status,
          })
          setCookie("current_tenant_id", first.tenant.id)
        }
      } catch {
        // 비로그인 사용자
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const switchTenant = useCallback((tenantId: string) => {
    const found = tenants.find((t) => t.id === tenantId)
    if (found) {
      setCurrentTenant(found)
      setCookie("current_tenant_id", tenantId)
    }
  }, [tenants])

  return (
    <TenantContext.Provider value={{ currentTenant, tenants, membership, switchTenant, isLoading }}>
      {children}
    </TenantContext.Provider>
  )
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`${name}=([^;]+)`))
  return match ? match[1] : null
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return
  document.cookie = `${name}=${value};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`
}
