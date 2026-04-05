"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, Building2, FileText, Settings, BarChart3,
  CreditCard, GraduationCap, Megaphone, Server, Cable,
  ChevronLeft, Menu, BrainCircuit,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const ADMIN_MENU = [
  { href: "/admin",            label: "대시보드",    icon: LayoutDashboard },
  { href: "/admin/users",      label: "회원관리",    icon: Users },
  { href: "/admin/listings",   label: "매물관리",    icon: FileText },
  { href: "/admin/deals",      label: "거래모니터링", icon: Building2 },
  { href: "/admin/billing",    label: "결제·정산",   icon: CreditCard },
  { href: "/admin/content",    label: "콘텐츠 관리", icon: Megaphone },
  { href: "/admin/experts",    label: "전문가·파트너", icon: GraduationCap },
  { href: "/admin/settings",   label: "사이트 설정", icon: Settings },
  { href: "/admin/system",     label: "시스템",      icon: Server },
  { href: "/admin/analytics",  label: "분석",        icon: BarChart3 },
  { href: "/admin/security",   label: "보안",        icon: Cable },
  { href: "/admin/ml",         label: "AI·ML",       icon: BrainCircuit },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className={cn(
        "border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 transition-all duration-200 shrink-0 overflow-y-auto",
        collapsed ? "w-16" : "w-56"
      )}>
        <div className="flex items-center justify-between p-3 border-b dark:border-gray-800">
          {!collapsed && <span className="text-sm font-bold text-[#1B3A5C] dark:text-white">관리자</span>}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? "사이드바 열기" : "사이드바 닫기"}>
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
        <nav className="p-2 space-y-1">
          {ADMIN_MENU.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== "/admin" && (pathname ?? "").startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              </Link>
            )
          })}
        </nav>
      </aside>
      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
