"use client"

import { useTenant } from "@/lib/tenant"
import { Building2, ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export function TenantSwitcher() {
  const { currentTenant, tenants, switchTenant, isLoading } = useTenant()

  if (isLoading || tenants.length === 0) return null

  // 단일 테넌트면 전환 불필요 → 이름만 표시
  if (tenants.length === 1) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Building2 className="h-3.5 w-3.5" />
        <span className="truncate max-w-[120px]">{currentTenant?.name}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate max-w-[120px]">{currentTenant?.name || "기관 선택"}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-xs text-muted-foreground">소속 기관 전환</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => switchTenant(tenant.id)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt={tenant.name} className="h-4 w-4 rounded" />
              ) : (
                <div
                  className="h-4 w-4 rounded flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: tenant.primary_color }}
                >
                  {tenant.name[0]}
                </div>
              )}
              <span className="text-sm">{tenant.name}</span>
            </div>
            {currentTenant?.id === tenant.id && <Check className="h-3.5 w-3.5 text-emerald-500" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
