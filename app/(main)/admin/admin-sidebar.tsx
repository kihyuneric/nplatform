"use client"

/**
 * AdminSidebar — McKinsey 6-Zone 체계 (Phase G7+ 2026-04-29).
 *
 * 사용자 정책: "필요 없는 기능 삭제 + 관리자 관리를 체계화 — 너무 많아"
 *
 * 24개 평면 메뉴 → 6개 macro Zone 으로 묶음 (MECE):
 *   1. 대시보드 — 진입
 *   2. 거래 운영 (Operations) — 회원/매물/딜룸/매칭/수요/기관/전문가
 *   3. 수익·실적 (Revenue & Performance) — 결제/쿠폰/펀널/분석
 *   4. 콘텐츠 (Content) — 공지/배너/뉴스
 *   5. 보안·컴플라이언스 (Compliance) — 보안/PII/마스킹
 *   6. 시스템 (System) — 설정/연동/AI·ML/파이프라인/헬스/런타임
 *
 * 각 Zone 은 collapsible group — 펼쳐서 sub-page 노출.
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  LayoutDashboard, Users, Building2, FileText, Settings, BarChart3,
  CreditCard, GraduationCap, Megaphone, Server, Cable,
  ChevronLeft, Menu, BrainCircuit, ShieldCheck, Eye, Landmark, FileSignature, Tag,
  Workflow, TrendingUp, Target, ShoppingCart, ChevronRight, ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface AdminMenuItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

interface AdminZone {
  key: string
  label: string
  icon: typeof LayoutDashboard
  /** Zone 진입점 (대표 sub-page) — Zone 헤더 클릭 시 이동 */
  href?: string
  items: AdminMenuItem[]
}

const ADMIN_ZONES: AdminZone[] = [
  // 진입 (단일 항목 — Zone 라벨 자체가 링크)
  {
    key: "dashboard",
    label: "대시보드",
    icon: LayoutDashboard,
    href: "/admin",
    items: [],
  },
  // Zone 1 — 거래 운영
  {
    key: "operations",
    label: "거래 운영",
    icon: Building2,
    items: [
      { href: "/admin/users",        label: "회원",         icon: Users },
      { href: "/admin/listings",     label: "매물",         icon: FileText },
      { href: "/admin/deals",        label: "딜룸",         icon: Building2 },
      { href: "/admin/agreements",   label: "NDA·LOI",      icon: FileSignature },
      { href: "/admin/matching",     label: "AI 매칭",      icon: Target },
      { href: "/admin/demands",      label: "매수자 수요",  icon: ShoppingCart },
      { href: "/admin/institutions", label: "매도 기관",    icon: Landmark },
      { href: "/admin/experts",      label: "전문가·파트너", icon: GraduationCap },
    ],
  },
  // Zone 2 — 수익·실적
  {
    key: "revenue",
    label: "수익·실적",
    icon: TrendingUp,
    items: [
      { href: "/admin/billing",     label: "결제·정산",    icon: CreditCard },
      { href: "/admin/coupons",     label: "쿠폰",         icon: Tag },
      { href: "/admin/deal-funnel", label: "Deal Funnel",  icon: TrendingUp },
      { href: "/admin/analytics",   label: "분석",         icon: BarChart3 },
    ],
  },
  // Zone 3 — 콘텐츠
  {
    key: "content",
    label: "콘텐츠",
    icon: Megaphone,
    href: "/admin/content",
    items: [],
  },
  // Zone 4 — 보안·컴플라이언스
  {
    key: "compliance",
    label: "보안·컴플라이언스",
    icon: ShieldCheck,
    items: [
      { href: "/admin/security",       label: "보안 정책",    icon: ShieldCheck },
      { href: "/admin/pii-audit",      label: "PII 감사",     icon: Eye },
      { href: "/admin/masking-queue",  label: "마스킹 검토",  icon: ShieldCheck },
    ],
  },
  // Zone 5 — 시스템
  {
    key: "system",
    label: "시스템",
    icon: Server,
    items: [
      { href: "/admin/settings",     label: "사이트 설정",  icon: Settings },
      { href: "/admin/integrations", label: "외부 연동",    icon: Cable },
      { href: "/admin/system",       label: "시스템 모니터", icon: Server },
      { href: "/admin/ml",           label: "AI·ML",        icon: BrainCircuit },
      { href: "/admin/pipeline",     label: "데이터 파이프라인", icon: Workflow },
    ],
  },
]

function getActiveLabel(pathname: string | null): string {
  const p = pathname ?? ""
  // longest match
  const all = ADMIN_ZONES.flatMap((z) =>
    z.href ? [{ href: z.href, label: z.label }] : z.items.map((i) => ({ href: i.href, label: i.label })),
  )
  const sorted = [...all].sort((a, b) => b.href.length - a.href.length)
  const match = sorted.find((m) => p === m.href || (m.href !== "/admin" && p.startsWith(m.href)))
  return match?.label ?? "관리자"
}

// 펜딩 카운트 hook — /api/v1/admin/dashboard 의 zoneCounts 사용 (60초 캐시)
function useZoneCounts(): Record<string, number> {
  const { data } = useQuery({
    queryKey: ["admin-zone-counts"],
    queryFn: async () => {
      const r = await fetch("/api/v1/admin/dashboard")
      if (!r.ok) return {}
      const j = await r.json()
      return (j.zoneCounts ?? {}) as Record<string, number>
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
  })
  return data ?? {}
}

function ZoneBadge({ count }: { count: number }) {
  if (!count || count <= 0) return null
  const display = count > 99 ? "99+" : String(count)
  return (
    <span
      className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{
        background: "#EF4444",
        color: "white",
        minWidth: 20,
        textAlign: "center",
        lineHeight: "14px",
      }}
    >
      {display}
    </span>
  )
}

function ZoneGroup({
  zone,
  collapsed,
  onNavigate,
  pendingCount,
}: {
  zone: AdminZone
  collapsed: boolean
  onNavigate?: () => void
  pendingCount: number
}) {
  const pathname = usePathname() ?? ""
  const ZoneIcon = zone.icon

  // Zone 안에 sub-item 이 active 이면 자동 펼침
  const hasActive = zone.items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
  const isZoneActive = zone.href ? pathname === zone.href : hasActive
  const [open, setOpen] = useState<boolean>(hasActive || pendingCount > 0)
  // 펜딩이 새로 생기면 자동 펼침
  useEffect(() => {
    if (pendingCount > 0 && !hasActive) setOpen(true)
  }, [pendingCount, hasActive])

  // 모든 Zone 라벨 통일 스타일 (Phase G7+ v2 — 사용자 정합 2026-04-29)
  //   단일/그룹 Zone 모두 동일한 폰트 사이즈·웨이트로 통일.
  //   text-[13px] · font-semibold · 일반 케이스 (uppercase 제거)
  const zoneLabelClass = "truncate flex-1 text-left text-[13px] font-semibold tracking-tight"

  // Zone 단일 진입 (sub-items 없음) — 단순 링크
  if (zone.items.length === 0 && zone.href) {
    return (
      <Link
        href={zone.href}
        onClick={onNavigate}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors",
          isZoneActive
            ? "bg-[#1B3A5C] text-white"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
        )}
        title={collapsed ? zone.label : undefined}
      >
        <ZoneIcon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className={zoneLabelClass}>{zone.label}</span>}
        {!collapsed && <ZoneBadge count={pendingCount} />}
      </Link>
    )
  }

  // Zone 그룹 — 헤더 + collapsible sub-items
  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors",
          hasActive
            ? "text-[#1B3A5C]"
            : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
        )}
        title={collapsed ? zone.label : undefined}
      >
        <ZoneIcon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className={zoneLabelClass}>
              {zone.label}
            </span>
            <ZoneBadge count={pendingCount} />
            {open ? <ChevronDown className="h-3 w-3 opacity-60" /> : <ChevronRight className="h-3 w-3 opacity-60" />}
          </>
        )}
      </button>
      {open && !collapsed && (
        <div className="ml-1 pl-3 border-l border-[var(--color-border-subtle)] space-y-0.5">
          {zone.items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  isActive
                    ? "bg-[#1B3A5C] text-white font-semibold"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate flex-1">{item.label}</span>
              </Link>
            )
          })}
        </div>
      )}
      {/* collapsed 모드 — sub-items 를 평면으로 표시 (아이콘만) */}
      {collapsed && zone.items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center justify-center rounded-md p-2 transition-colors",
              isActive
                ? "bg-[#1B3A5C] text-white"
                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)]"
            )}
            title={item.label}
          >
            <Icon className="h-4 w-4" />
          </Link>
        )
      })}
    </div>
  )
}

function MenuList({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const counts = useZoneCounts()
  return (
    <nav className="p-2 space-y-2">
      {ADMIN_ZONES.map((zone) => (
        <ZoneGroup
          key={zone.key}
          zone={zone}
          collapsed={collapsed}
          onNavigate={onNavigate}
          pendingCount={counts[zone.key] ?? 0}
        />
      ))}
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
              <span className="text-sm font-bold text-[#0A1628]">관리자</span>
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
          collapsed ? "w-16" : "w-60"
        )}
      >
        <div className="flex items-center justify-between p-3 border-b border-[var(--color-border-subtle)]">
          {!collapsed && <span className="text-sm font-bold text-[#0A1628]">관리자</span>}
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
