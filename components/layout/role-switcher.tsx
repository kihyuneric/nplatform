"use client"

import { useRoles, ROLE_LABELS, ROLE_COLORS, type UserRole } from "@/lib/roles"
import { ChevronDown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

export function RoleSwitcher() {
  const { roles, activeRole, switchRole } = useRoles()

  // 역할 1개 이하면 전환 불필요
  if (roles.length <= 1) {
    if (activeRole) {
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: ROLE_COLORS[activeRole] }}
          />
          <span className="text-muted-foreground">{ROLE_LABELS[activeRole]}</span>
        </div>
      )
    }
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs border-[var(--color-border-subtle)]">
          {activeRole && (
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: ROLE_COLORS[activeRole] }}
            />
          )}
          <span>{activeRole ? `${ROLE_LABELS[activeRole]} 모드` : "역할 선택"}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">역할 전환</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => (
          <DropdownMenuItem
            key={role}
            onClick={() => switchRole(role)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: ROLE_COLORS[role] }}
              />
              <span className="text-sm">{ROLE_LABELS[role]} 모드</span>
            </div>
            {activeRole === role && <Check className="h-3.5 w-3.5 text-stone-900" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
