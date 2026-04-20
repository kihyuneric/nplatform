"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, Building2, FileText, Settings, BarChart3,
  CreditCard, GraduationCap, Megaphone, Server, Cable,
  ChevronLeft, Menu, BrainCircuit, ShieldCheck, Eye, Landmark, FileSignature, Tag, Activity, Sliders,
  Workflow, TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

const ADMIN_MENU = [
  { href: "/admin",            label: "대시보드",    icon: LayoutDashboard },
  { href: "/admin/deal-funnel",label: "Deal Funnel", icon: TrendingUp },
  { href: "/admin/users",      label: "회원관리",    icon: Users },
  { href: "/admin/listings",   label: "매물관리",    icon: FileText },
  { href: "/admin/masking-queue", label: "마스킹 검토", icon: ShieldCheck },
  { href: "/admin/pii-audit",  label: "PII 감사",    icon: Eye },
  { href: "/admin/institutions", label: "매도 기관",   icon: Landmark },
  { href: "/admin/agreements", label: "NDA·LOI",    icon: FileSignature },
  { href: "/admin/deals",      label: "딜룸 모니터링", icon: Building2 },
  { href: "/admin/billing",    label: "결제·정산",   icon: CreditCard },
  { href: "/admin/coupons",    label: "쿠폰 관리",   icon: Tag },
  { href: "/admin/content",    label: "콘텐츠 관리", icon: Megaphone },
  { href: "/admin/experts",    label: "전문가·파트너", icon: GraduationCap },
  { href: "/admin/integrations", label: "외부 연동",   icon: Cable },
  { href: "/admin/settings",   label: "사이트 설정", icon: Settings },
  { href: "/admin/system",     label: "시스템",      icon: Server },
  { href: "/admin/analytics",  label: "분석",        icon: BarChart3 },
  { href: "/admin/security",   label: "보안",        icon: Cable },
  { href: "/admin/ml",         label: "AI·ML",       icon: BrainCircuit },
  { href: "/admin/health",          label: "헬스 체크",    icon: Activity },
  { href: "/admin/pipeline",       label: "데이터 파이프라인", icon: Workflow },
  { href: "/admin/runtime-config", label: "런타임 설정",  icon: Sliders },
]

function getActiveLabel(pathname: string | null): string {
  const p = pathname ?? ""
  // longest-match first
  const sorted = [...ADMIN_MENU].sort((a, b) => b.href.length - a.href.length)
  const match = sorted.find((m) => p === m.href || (m.href !== "/admin" && p.startsWith(m.href)))
  return match?.label ?? "관리자"
}

function MenuList({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <nav className="p-2 space-y-1">
      {ADMIN_MENU.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (item.href !== "/admin" && (pathname ?? "").startsWith(item.href))
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive
                ? "bg-blue-600 text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="truncate flex-1">{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const activeLabel = getActiveLabel(pathname)

  return (
    <>
      {/* 모바일 상단 바 */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-3 py-2">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              className="h-9 w-9 flex items-center justify-center rounded-md hover:bg-[var(--color-surface-overlay)] transition-colors"
              aria-label="관리자 메뉴 열기"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[88vw] max-w-72 p-0 overflow-y-auto">
            <div className="p-3 border-b border-[var(--color-border-subtle)]">
              <span className="text-sm font-bold text-[var(--color-brand-dark)]">관리자</span>
            </div>
            <MenuList onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
        <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
          {activeLabel}
        </span>
        <span className="w-9" />
      </div>

      {/* 데스크톱 사이드바 */}
      <aside
        className={cn(
          "hidden md:block border-r border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] transition-all duration-200 shrink-0 overflow-y-auto",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-[var(--color-border-subtle)]">
          {!collapsed && <span className="text-sm font-bold text-[var(--color-brand-dark)]">관리자</span>}
          <button
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-[var(--color-surface-overlay)] transition-colors"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "사이드바 열기" : "사이드바 닫기"}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <MenuList collapsed={collapsed} />
      </aside>
    </>
  )
}
