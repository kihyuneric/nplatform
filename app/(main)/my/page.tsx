"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Briefcase, Heart, TrendingUp, Bell, Settings, CreditCard,
  BarChart3, Zap, FileText, ScanLine, CalendarClock,
  Loader2, Sparkles, ChevronRight, Search, LayoutGrid,
  HeadphonesIcon, ArrowUpRight, Clock, User,
} from "lucide-react"
import DS, { formatKRW } from "@/lib/design-system"

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"))
  return match ? decodeURIComponent(match[2]) : null
}

const QUICK_ACTIONS = [
  { label: "포트폴리오",  href: "/my/portfolio",  icon: LayoutGrid },
  { label: "거래 현황",   href: "/deals",          icon: Briefcase },
  { label: "분석 내역",   href: "/analysis",       icon: BarChart3 },
  { label: "결제·구독",   href: "/my/billing",    icon: CreditCard },
  { label: "알림",        href: "/my/settings",   icon: Bell },
  { label: "설정",        href: "/my/settings",   icon: Settings },
]

const RECENT_ACTIVITY = [
  { id: 1, icon: BarChart3, color: "text-violet-700", bg: "bg-violet-100", label: "강남구 아파트 NPL 분석 완료", time: "방금 전" },
  { id: 2, icon: Heart,     color: "text-rose-700",   bg: "bg-rose-100",   label: "역삼동 아파트 관심 목록 추가", time: "1시간 전" },
  { id: 3, icon: Briefcase, color: "text-blue-700",   bg: "bg-blue-100",   label: "서초구 상가 딜룸 NDA 서명", time: "3시간 전" },
  { id: 4, icon: TrendingUp,color: "text-emerald-700",bg: "bg-emerald-100",label: "포트폴리오 수익률 업데이트", time: "어제" },
  { id: 5, icon: Search,    color: "text-amber-700",  bg: "bg-amber-100",  label: "경기 용인 토지 매물 조회", time: "2일 전" },
]

const RECOMMENDED = [
  { id: "r1", type: "아파트", loc: "서울 강남구 역삼동", price: "12.5억", discount: 35, grade: "A+" },
  { id: "r2", type: "상가",   loc: "경기 수원시 영통구", price: "4.8억",  discount: 42, grade: "A" },
  { id: "r3", type: "토지",   loc: "대전 유성구",        price: "2.8억",  discount: 38, grade: "B+" },
]

const SELLER_STATS = [
  { label: "등록 매물", value: "4건" },
  { label: "관심 받은 수", value: "31건" },
  { label: "진행 중 협상", value: "2건" },
  { label: "완료 거래", value: "8건" },
]

interface DashboardData {
  activeDeals: number; favorites: number; creditBalance: number
  aiCreditsUsed: number; aiCreditsLimit: number
  ocrUsed: number; ocrLimit: number
  plan: string; subscriptionExpiresAt: string | null
}

async function fetchDashboardData(): Promise<DashboardData> {
  const defaults: DashboardData = {
    activeDeals: 3, favorites: 24, creditBalance: 0,
    aiCreditsUsed: 18, aiCreditsLimit: 30, ocrUsed: 3, ocrLimit: 5,
    plan: "FREE", subscriptionExpiresAt: null,
  }
  try {
    const [profileRes] = await Promise.allSettled([fetch("/api/v1/users/profile").then(r => r.json())])
    const profile = profileRes.status === "fulfilled" ? profileRes.value : null
    return { ...defaults, plan: profile?.plan ?? "FREE", creditBalance: profile?.credit_balance ?? 0, subscriptionExpiresAt: profile?.subscription_expires_at ?? null }
  } catch { return defaults }
}

export default function MyPage() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    const activeRole = getCookie("active_role")
    setRole(activeRole)
    setLoaded(true)
    if (activeRole === "SUPER_ADMIN" || activeRole === "ADMIN") { router.replace("/admin"); return }
    if (activeRole === "SELLER") { router.replace("/my/seller"); return }
    if (activeRole === "PARTNER") { router.replace("/my/partner"); return }
    if (activeRole === "PROFESSIONAL") { router.replace("/my/professional"); return }
    fetchDashboardData().then(setData).catch(() => setData(null)).finally(() => setDataLoading(false))
  }, [router])

  if (!loaded) return (
    <div className={DS.page.wrapper}>
      <div className="h-48 bg-[var(--color-surface-sunken)] animate-pulse" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 -mt-6 mb-8">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-[var(--color-surface-sunken)] rounded-2xl animate-pulse" />)}
        </div>
      </div>
    </div>
  )

  const roleLabel = role === "BUYER" || role === "BUYER_INDV" || role === "BUYER_INST" ? "바이어"
    : role === "SELLER" ? "셀러" : role === "PARTNER" ? "파트너" : role === "PROFESSIONAL" ? "전문가" : "투자자"
  const roleBadgeColor = roleLabel === "바이어" ? "bg-blue-50 text-blue-700 border-blue-200"
    : roleLabel === "셀러" ? "bg-amber-50 text-amber-700 border-amber-200"
    : roleLabel === "투자자" ? "bg-violet-50 text-violet-700 border-violet-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200"
  const isBuyer = !role || role === "BUYER" || role === "BUYER_INDV" || role === "BUYER_INST"
  const isSeller = role === "SELLER"

  const KPI_CARDS = [
    { label: "내 매물 관심",    value: dataLoading ? "—" : String(data?.favorites ?? 24),   unit: "건",  accent: "bg-rose-500" },
    { label: "진행중 거래",     value: dataLoading ? "—" : String(data?.activeDeals ?? 3),   unit: "건",  accent: "bg-blue-500" },
    { label: "AI 분석",         value: dataLoading ? "—" : String(data?.aiCreditsUsed ?? 18),unit: "건",  accent: "bg-violet-500" },
    { label: "포트폴리오 수익률",value: "+14.2",                                              unit: "%",   accent: "bg-emerald-500" },
  ]

  return (
    <div className={DS.page.wrapper}>

      {/* 1. Header */}
      <div className="bg-[var(--color-brand-dark)] text-white px-6 py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.5) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/15 border-2 border-white/30 flex items-center justify-center shrink-0">
              <User className="w-7 h-7 text-white/90" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={DS.text.inverse + " text-[1.25rem] font-bold"}>내 대시보드</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border ${DS.text.label} ${roleBadgeColor}`}>
                  {roleLabel}
                </span>
              </div>
              <div className={`flex items-center gap-3 ${DS.text.caption} text-blue-100/85`}>
                <span>가입일 2024.03.15</span>
                <span className="w-1 h-1 rounded-full bg-blue-200/50" />
                <span>마지막 접속 오늘</span>
              </div>
            </div>
          </div>
          {!dataLoading && data?.plan === "FREE" && (
            <Link href="/my/billing" className={DS.button.primary + " shrink-0"}>
              업그레이드 <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* 2. KPI Strip */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 -mt-6 relative z-10 mb-7">
          {KPI_CARDS.map(card => (
            <div key={card.label} className={`${DS.stat.card} overflow-hidden p-0`}>
              <div className={`h-1 w-full ${card.accent}`} />
              <div className="p-4 sm:p-5">
                <div className="flex items-end gap-1 mb-1">
                  <span className={DS.text.metricLarge}>{card.value}</span>
                  <span className={DS.text.caption + " mb-0.5"}>{card.unit}</span>
                </div>
                <p className={DS.stat.label}>{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 3. Quick Actions Grid 2x3 */}
        <div className="mb-7">
          <p className={DS.header.eyebrow + " mb-3"}>빠른 메뉴</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map(action => (
              <Link key={action.href + action.label} href={action.href}>
                <div className={`${DS.card.interactive} flex flex-col items-center gap-2 p-4 group`}>
                  <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-sunken)] group-hover:bg-[var(--color-brand-dark)]/8 flex items-center justify-center transition-colors">
                    <action.icon className="w-4 h-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-brand-mid)] transition-colors" />
                  </div>
                  <span className={DS.text.caption + " text-center leading-tight"}>{action.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 4 + 5. Two-column: Activity + Role section */}
        <div className="grid lg:grid-cols-2 gap-5 pb-12">

          {/* 4. Recent Activity Timeline */}
          <div className={`${DS.card.base} ${DS.card.padding}`}>
            <div className="flex items-center justify-between mb-4">
              <p className={DS.header.eyebrow}>최근 활동</p>
              <Clock className="w-4 h-4 text-[var(--color-text-muted)]" />
            </div>
            <ol className="relative border-l-2 border-[var(--color-border-subtle)] ml-3 space-y-0">
              {RECENT_ACTIVITY.map(item => (
                <li key={item.id} className="pl-5 pb-4 last:pb-0 relative">
                  <span className={`absolute -left-[1.15rem] top-0.5 w-6 h-6 rounded-full ${item.bg} flex items-center justify-center`}>
                    <item.icon className={`w-3 h-3 ${item.color}`} />
                  </span>
                  <p className={DS.text.bodyBold + " leading-snug"}>{item.label}</p>
                  <p className={DS.text.captionLight + " mt-0.5"}>{item.time}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* 5. Role-specific section */}
          <div className={`${DS.card.base} ${DS.card.padding}`}>
            {isBuyer && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className={DS.header.eyebrow}>AI 추천 매물</p>
                  <Link href="/exchange" className={`flex items-center gap-0.5 ${DS.text.caption} hover:text-[var(--color-brand-mid)] transition-colors`}>
                    전체 <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                  {RECOMMENDED.map(item => (
                    <div key={item.id} className={`${DS.card.interactive} shrink-0 w-44 overflow-hidden`}>
                      <div className="h-20 bg-gradient-to-br from-[var(--color-brand-dark)] to-[var(--color-brand-mid)] flex items-center justify-center relative">
                        <span className="text-white/40 text-[1.875rem] font-extrabold">{item.type[0]}</span>
                        <span className={`absolute top-2 right-2 ${DS.text.label} bg-[var(--color-positive)] text-white px-1.5 py-0.5 rounded`}>{item.grade}</span>
                      </div>
                      <div className="p-3">
                        <p className={DS.text.captionLight + " mb-0.5"}>{item.loc}</p>
                        <p className={DS.text.bodyBold}>{item.price}</p>
                        <span className={`inline-block mt-1 ${DS.text.label} text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded`}>-{item.discount}% 할인</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className={DS.text.caption + " flex-1 leading-relaxed"}>AI 맞춤 매물 추천을 받으려면 수요 설문을 등록하세요.</p>
                  <Link href="/deals/matching" className={`shrink-0 ${DS.text.link} text-emerald-700 hover:text-emerald-900`}>보기</Link>
                </div>
              </>
            )}
            {isSeller && (
              <>
                <p className={DS.header.eyebrow + " mb-4"}>내 매물 현황</p>
                <div className="grid grid-cols-2 gap-3">
                  {SELLER_STATS.map(s => (
                    <div key={s.label} className={DS.stat.card}>
                      <p className={DS.stat.value}>{s.value}</p>
                      <p className={DS.stat.label + " mt-0.5"}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {!isBuyer && !isSeller && (
              <div className={DS.empty.wrapper}>
                <BarChart3 className={DS.empty.icon} />
                <p className={DS.empty.description}>역할별 콘텐츠를 준비 중입니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
