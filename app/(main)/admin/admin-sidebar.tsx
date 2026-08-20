"use client"

/**
 * AdminSidebar — 프라이빗 NPL 딜 중개 피벗 (2026-08-14).
 *
 * 관리자 메뉴 슬림다운 — 핵심 운영만 노출 (페이지 자체는 유지, 메뉴만 숨김):
 *   1. 대시보드 — 진입
 *   2. 거래 운영 (Operations) — 회원/매물/매수 수요/매칭/NDA·계약/매도 기관
 *   3. 보안·마스킹 (Compliance) — 마스킹 검토/PII 감사/보안 정책
 *   4. 정산 (Revenue) — 결제·정산
 *   5. 시스템 (System) — 사이트 설정/콘텐츠
 *
 * 메뉴에서 제거 (페이지는 유지): 딜룸, 쿠폰, Deal Funnel, 분석,
 * 외부 연동, 시스템 모니터, AI·ML, 데이터 파이프라인.
 *
 * 각 Zone 은 collapsible group — 펼쳐서 sub-page 노출.
 */

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  LayoutDashboard, Users, Building2, FileText, Settings,
  CreditCard, Megaphone, Server,
  ChevronLeft, Menu, ShieldCheck, Eye, Landmark, FileSignature,
  Target, ShoppingCart, ChevronRight, ChevronDown, Inbox, UploadCloud,
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

/**
 * 초간단 관리자 메뉴 (2026-08-17) — 접이식 그룹 없이 평평한 필수 7개.
 * 운영 루프: 승인 → 매물 → 수요 → NDA → 마케팅 체크 → 메인 지표.
 * (매칭·기관·마스킹·보안·콘텐츠 등 페이지는 보존 — URL 직접 접근 가능)
 */
/**
 * 메뉴 구성 (2026-08-19) — 운영기획서 v4 §2-1
 *
 * 용어 규칙: **매각의뢰** = 관리번호 없음(등록 전) · **매물** = 관리번호 있음(등록 후).
 * 이 규칙 때문에 '매각의뢰 관리'와 '매물관리'가 서로 다른 메뉴다.
 *
 * 순서는 업무가 흘러가는 순서다 — 회원 → 매물 → 거래 → 지원 → 콘텐츠.
 */
const ADMIN_ZONES: AdminZone[] = [
  { key: "dashboard",  label: "대시보드",          icon: LayoutDashboard, href: "/admin",                  items: [] },
  // 회원
  { key: "users",      label: "회원관리",          icon: Users,           href: "/admin/users",            items: [] },
  // 매물 — 등록 전(접수) → 등록 후(매물)
  { key: "intakeDir",  label: "매각의뢰 관리",     icon: FileText,        href: "/admin/intakes/direct",   items: [] },
  { key: "intakeAgy",  label: "매물등록 대행관리", icon: UploadCloud,     href: "/admin/intakes/agency",   items: [] },
  { key: "listings",   label: "매물관리",          icon: Building2,       href: "/admin/listings",         items: [] },
  // 거래
  { key: "demands",    label: "매입조건 관리",     icon: ShoppingCart,    href: "/admin/demands",          items: [] },
  { key: "agreements", label: "NDA 관리",          icon: FileSignature,   href: "/admin/agreements",       items: [] },
  // 지원
  { key: "inbox",      label: "문의 접수함",       icon: Inbox,           href: "/admin/inbox",            items: [] },
  { key: "analysis",   label: "수익률 분석",       icon: Eye,             href: "/admin/npl-analysis",     items: [] },
  // 콘텐츠
  { key: "highlights", label: "메인 하이라이트",   icon: Megaphone,       href: "/admin/highlights",       items: [] },
  { key: "press",      label: "언론보도",          icon: FileText,        href: "/admin/press",            items: [] },
  { key: "mainstats",  label: "메인 지표",         icon: Settings,        href: "/admin/main-stats",       items: [] },
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
