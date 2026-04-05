"use client"
import { type ReactNode } from "react"
import { Lock } from "lucide-react"
import { checkPermission, type MemberGrade } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface PermissionGateProps {
  feature: string
  grade?: MemberGrade
  role?: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGate({ feature, grade = 'BASIC', role, children, fallback }: PermissionGateProps) {
  // In dev mode, always allow
  if (typeof document !== 'undefined' && document.cookie.includes('dev_user_active=true')) {
    return <>{children}</>
  }

  const { allowed, reason } = checkPermission(feature, grade, role)

  if (allowed) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <Lock className="h-10 w-10 text-muted-foreground mb-3" />
      <p className="text-sm font-medium text-muted-foreground mb-1">이용 권한이 없습니다</p>
      <p className="text-xs text-muted-foreground mb-3">{reason}</p>
      <Button asChild size="sm" className="bg-[#1B3A5C]">
        <Link href="/admin/pricing">플랜 업그레이드</Link>
      </Button>
    </div>
  )
}
