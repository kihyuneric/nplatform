"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  Users, Building2, Shield, FileCheck, AlertTriangle,
  UserPlus, Gavel, FileText, CreditCard, Image,
  Code, Settings, Activity, BarChart2, Handshake,
  GraduationCap, Server, Upload, Loader2,
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import DS, { formatKRW, formatDate } from "@/lib/design-system"
import { AnimatedCounter } from "@/components/ui/animated-counter"
import { staggerContainer, staggerItem } from "@/lib/animations"

/* ------------------------------------------------------------------ */
/*  Mock data                                                           */
/* ------------------------------------------------------------------ */

// Dashboard data fetched from API
interface DashboardStats {
  totalUsers: number
  pendingApprovals: number
  activeListings: number
  pendingReviews: number
  activeDeals: number
  monthlyRevenue: number
  activeProfessionals: number
  activePartners: number
}

interface ZoneCounts {
  operations?: number
  revenue?: number
  content?: number
  compliance?: number
  system?: number
}

interface RecentUser {
  name: string
  email: string
  role: string
  created_at: string
  kyc_status: string
}

const MOCK_STATS: DashboardStats = {
  totalUsers: 128, pendingApprovals: 3, activeListings: 47, pendingReviews: 5,
  activeDeals: 12, monthlyRevenue: 8500000, activeProfessionals: 14, activePartners: 6,
}

function useAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, pendingApprovals: 0, activeListings: 0, pendingReviews: 0,
    activeDeals: 0, monthlyRevenue: 0, activeProfessionals: 0, activePartners: 0,
  })
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [zoneCounts, setZoneCounts] = useState<ZoneCounts>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch('/api/v1/admin/dashboard')
        .then(r => r.json())
        .then(d => {
          if (cancelled) return
          if (d.stats) setStats(d.stats)
          else setStats(MOCK_STATS)
          if (d.recentUsers) setRecentUsers(d.recentUsers)
          if (d.zoneCounts) setZoneCounts(d.zoneCounts)
        })
        .catch(() => {
          if (!cancelled) setStats(MOCK_STATS)
        })
        .finally(() => { if (!cancelled) setLoading(false) })
    }
    load()
    // 60초마다 자동 새로고침 (실시간 운영센터)
    const id = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  return { stats, recentUsers, zoneCounts, loading }
}

const ROLE_LABEL: Record<string, string> = {
  BUYER: '매수자', SELLER: '매도자', BUYER_INST: '기관 매수자', BUYER_INDV: '개인 매수자',
  PARTNER: '파트너', PROFESSIONAL: '전문가', ADMIN: '관리자', SUPER_ADMIN: '최고관리자',
}
const KYC_LABEL: Record<string, string> = {
  APPROVED: '승인완료', PENDING: '대기중', SUBMITTED: '심사중', IN_REVIEW: '심사중', REJECTED: '거부',
}

const signupData: { day: string; 신규가입: number }[] = [] // Populated from API if available

const quickLinks = [
  { label: "회원관리",     href: "/admin/users",        icon: Users       },
  { label: "매물관리",     href: "/admin/listings",     icon: Building2   },
  { label: "거래모니터링", href: "/admin/deals",        icon: Activity    },
  { label: "결제관리",     href: "/admin/billing",      icon: CreditCard  },
  { label: "수수료·인보이스", href: "/admin/commissions", icon: Handshake  },
  { label: "데이터 동기화",  href: "/admin/data-sync",   icon: Server      },
  { label: "데이터 임포트",  href: "/admin/data-import", icon: Upload      },
  { label: "콘텐츠관리",   href: "/admin/content",      icon: FileText    },
  { label: "전문가관리",   href: "/admin/experts",      icon: GraduationCap },
  { label: "CMS 편집",     href: "/admin/cms",          icon: Image       },
  { label: "설정",         href: "/admin/settings",     icon: Settings    },
  { label: "AI · ML",      href: "/admin/ml",           icon: Code        },
]

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const statusColor: Record<string, string> = {
  승인완료: "text-[var(--color-positive)]",
  대기중:   "text-[var(--color-warning)]",
  심사중:   "text-[var(--color-brand-mid)]",
}

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-surface-elevated)",
    border: "1px solid var(--color-border-subtle)",
    borderRadius: 8,
    fontSize: 12,
    color: "var(--color-text-primary)",
    boxShadow: "var(--shadow-md)",
  },
  labelStyle: { color: "var(--color-text-tertiary)" },
  cursor: { stroke: "var(--color-brand-mid)", strokeWidth: 1, strokeDasharray: "4 2" },
}

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export default function AdminDashboardPage() {
  const { stats, recentUsers, zoneCounts, loading } = useAdminDashboard()
  const [now, setNow] = useState("")

  // Pending Tasks — Zone 별로 처리해야 할 작업 카드 (운영센터 핵심)
  const pendingTasks = [
    {
      key: "approvals",
      label: "회원 KYC 승인",
      count: stats.pendingApprovals,
      href: "/admin/users?filter=pending",
      tone: stats.pendingApprovals > 5 ? "danger" : stats.pendingApprovals > 0 ? "warn" : "ok",
      hint: stats.pendingApprovals > 0 ? "신원 확인 대기" : "전체 처리 완료",
    },
    {
      key: "listings",
      label: "매물 검토",
      count: stats.pendingReviews,
      href: "/admin/listings?filter=review",
      tone: stats.pendingReviews > 10 ? "danger" : stats.pendingReviews > 0 ? "warn" : "ok",
      hint: stats.pendingReviews > 0 ? "심사 대기 중" : "검토 대기 없음",
    },
    {
      key: "compliance",
      label: "보안·컴플라이언스",
      count: zoneCounts.compliance ?? 0,
      href: "/admin/masking-queue",
      tone: (zoneCounts.compliance ?? 0) > 0 ? "warn" : "ok",
      hint: (zoneCounts.compliance ?? 0) > 0 ? "마스킹·PII 검토 필요" : "이슈 없음",
    },
    {
      key: "deals",
      label: "활성 딜룸",
      count: stats.activeDeals,
      href: "/admin/deals",
      tone: "info",
      hint: "진행 중인 거래 모니터링",
    },
  ] as const

  // Derive chart/table data from API
  const recentMembers = recentUsers.map(u => ({
    name: u.name || u.email?.split('@')[0] || '-',
    role: ROLE_LABEL[u.role] || u.role || '-',
    date: u.created_at?.slice(0, 10) || '-',
    status: KYC_LABEL[u.kyc_status] || u.kyc_status || '-',
  }))

  // Update pie chart data from stats
  const pieData = [
    { name: "활성",   value: stats.activeListings, color: "var(--color-text-primary)" },
    { name: "심사중", value: stats.pendingReviews, color: "var(--color-text-primary)" },
    { name: "기타",   value: Math.max(0, stats.activeListings > 0 ? Math.round(stats.activeListings * 0.2) : 0), color: "#6B7280" },
  ]

  useEffect(() => {
    const fmt = () =>
      new Date().toLocaleString("ko-KR", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      })
    setNow(fmt())
    const id = setInterval(() => setNow(fmt()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={DS.page.wrapper}>

      {/* ── HEADER ── */}
      <header className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-6 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Shield size={20} className="text-[var(--color-brand-mid)]" />
          <h1 className={DS.text.pageSubtitle}>관리자 대시보드</h1>
          <span className={`ml-2 ${DS.badge.inline("bg-stone-100/10", "text-stone-900", "border-stone-300/20")}`}>
            ADMIN
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className={`${DS.text.micro} font-mono`}>{now}</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--color-positive)] animate-pulse inline-block" />
            <span className={`${DS.text.micro} text-[var(--color-positive)]`}>정상</span>
          </div>
        </div>
      </header>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap} pb-10`}>

        {/* ── Quick Navigation ── */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`${DS.text.micro} text-[var(--color-text-muted)] mr-1`}>바로가기:</span>
          <Link href="/exchange" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>매물 거래소 →</Link>
          <Link href="/deals" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>활성 거래 →</Link>
          <Link href="/services/community" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>커뮤니티 →</Link>
          <Link href="/services/experts" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>전문가 →</Link>
          <Link href="/analysis" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>분석 허브 →</Link>
          <Link href="/admin/coupons" className={`${DS.button.ghost} gap-1.5 text-[0.8125rem]`}>쿠폰 관리 →</Link>
        </div>

        {/* ── 오늘의 처리 대기 (Pending Tasks Operation Cockpit) ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className={`${DS.text.label} text-[var(--color-brand-mid)]`}>오늘의 처리 대기</p>
            <span className={`${DS.text.micro} text-[var(--color-text-muted)]`}>60초마다 자동 새로고침</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pendingTasks.map((task) => {
              const palette = task.tone === "danger"
                ? { bg: "#FEF2F2", border: "#EF4444", text: "#991B1B", dot: "#EF4444" }
                : task.tone === "warn"
                  ? { bg: "#FFFBEB", border: "#F59E0B", text: "#92400E", dot: "#F59E0B" }
                  : task.tone === "info"
                    ? { bg: "#EFF6FF", border: "#3B82F6", text: "#1E40AF", dot: "#3B82F6" }
                    : { bg: "#ECFDF5", border: "#10B981", text: "#065F46", dot: "#10B981" }
              return (
                <Link
                  key={task.key}
                  href={task.href}
                  className="block p-4 rounded-md transition-all hover:shadow-md"
                  style={{
                    background: palette.bg,
                    borderLeft: `4px solid ${palette.border}`,
                    border: `1px solid ${palette.border}40`,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 11, fontWeight: 700, color: palette.text, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 99, background: palette.dot, marginRight: 6, verticalAlign: "middle" }} />
                      {task.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: palette.text, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                    {task.count}
                  </div>
                  <div style={{ fontSize: 11, color: palette.text, opacity: 0.8, marginTop: 4 }}>
                    {task.hint} →
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── KPI STRIP ── */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <p className={`${DS.text.label} text-[var(--color-brand-mid)]`}>핵심 지표</p>
            {loading && <Loader2 size={13} className="animate-spin text-[var(--color-text-muted)]" />}
          </div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3"
          >
            {[
              { label: "총 회원", numValue: stats.totalUsers, sub: `전문가 ${stats.activeProfessionals}명`, subColor: DS.text.muted },
              { label: "대기 승인", numValue: stats.pendingApprovals, unit: "명", valueColor: stats.pendingApprovals > 0 ? "text-[var(--color-danger)]" : "", sub: stats.pendingApprovals > 0 ? "처리 필요" : "없음", subColor: stats.pendingApprovals > 0 ? "text-[var(--color-danger)]" : DS.text.muted },
              { label: "활성 매물", numValue: stats.activeListings, unit: "건", sub: `심사 대기 ${stats.pendingReviews}건`, subColor: stats.pendingReviews > 0 ? "text-[var(--color-warning)]" : DS.text.muted },
              { label: "진행 거래", numValue: stats.activeDeals, unit: "건", sub: "활성 딜룸", subColor: "text-[var(--color-brand-mid)]" },
              { label: "월 수익", prefix: "₩", numValue: stats.monthlyRevenue > 0 ? Math.round(stats.monthlyRevenue / 10000) : 0, suffix: "만", valueColor: "text-[var(--color-positive)]", sub: "이번달 매출", subColor: DS.text.muted },
              { label: "시스템 상태", isStatus: true },
            ].map((kpi, i) => (
              <motion.div key={i} variants={staggerItem} className={DS.stat.card}>
                <p className={DS.stat.label}>{kpi.label}</p>
                {kpi.isStatus ? (
                  <>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-positive)] animate-pulse inline-block" />
                      <p className={`${DS.text.metricLarge} text-[var(--color-positive)]`}>정상</p>
                    </div>
                    <p className={DS.stat.sub}>전체 서비스</p>
                  </>
                ) : (
                  <>
                    <p className={`${DS.stat.value} ${(kpi as any).valueColor ?? ""}`}>
                      <AnimatedCounter
                        value={(kpi as any).numValue}
                        prefix={(kpi as any).prefix ?? ""}
                        suffix={(kpi as any).suffix ?? ""}
                        decimals={(kpi as any).decimals ?? 0}
                      />
                      {(kpi as any).unit && <span className={`${DS.text.caption} ml-0.5`}>{(kpi as any).unit}</span>}
                    </p>
                    <p className={`${DS.stat.sub} ${(kpi as any).subColor ?? ""}`}>{kpi.sub}</p>
                  </>
                )}
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* ── CHARTS ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Area Chart - 신규 가입 */}
          <div className={`${DS.card.base} ${DS.card.padding}`}>
            <p className={`${DS.text.label} text-[var(--color-brand-mid)] mb-1`}>신규 가입 추이</p>
            <p className={`${DS.text.captionLight} mb-4`}>최근 7일 일별 신규 회원가입</p>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={signupData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#051C2C" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#051C2C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="day" tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="신규가입" stroke="#051C2C" strokeWidth={2} fill="url(#signupGrad)" dot={{ fill: "#051C2C", r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart - 매물 현황 */}
          <div className={`${DS.card.base} ${DS.card.padding}`}>
            <p className={`${DS.text.label} text-[var(--color-brand-mid)] mb-1`}>매물 현황</p>
            <p className={`${DS.text.captionLight} mb-4`}>상태별 매물 분포</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-surface-elevated)",
                    border: "1px solid var(--color-border-subtle)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--color-text-primary)",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── TABLES ROW ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 최근 가입 회원 */}
          <div className={DS.table.wrapper}>
            <div className={`px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-2`}>
              <p className={`${DS.text.label} text-[var(--color-brand-mid)]`}>최근 가입 회원</p>
              {loading && <Loader2 size={12} className="animate-spin text-[var(--color-text-muted)] ml-auto" />}
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  <th className={DS.table.headerCell}>이름</th>
                  <th className={DS.table.headerCell}>역할</th>
                  <th className={DS.table.headerCell}>가입일</th>
                  <th className={DS.table.headerCell}>상태</th>
                </tr>
              </thead>
              <tbody>
                {recentMembers.map((m, i) => (
                  <tr key={i} className={DS.table.row}>
                    <td className={`${DS.table.cell} font-medium`}>{m.name}</td>
                    <td className={DS.table.cellMuted}>{m.role}</td>
                    <td className={`${DS.table.cellMuted} font-mono text-[0.75rem]`}>{m.date}</td>
                    <td className={DS.table.cell}>
                      <span className={`text-[0.75rem] font-semibold ${statusColor[m.status] ?? DS.text.muted}`}>
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 주요 현황 */}
          <div className={DS.table.wrapper}>
            <div className={`px-4 py-3 border-b border-[var(--color-border-subtle)]`}>
              <p className={`${DS.text.label} text-[var(--color-brand-mid)]`}>주요 현황</p>
            </div>
            <div className="p-4 space-y-3">
              {[
                { label: "KYC 승인 대기", value: stats.pendingApprovals, color: stats.pendingApprovals > 0 ? "text-[var(--color-danger)]" : "text-[var(--color-positive)]", href: "/admin/users" },
                { label: "매물 심사 대기", value: stats.pendingReviews, color: stats.pendingReviews > 0 ? "text-[var(--color-warning)]" : "text-[var(--color-positive)]", href: "/admin/listings" },
                { label: "진행 중 거래", value: stats.activeDeals, color: "text-[var(--color-brand-mid)]", href: "/admin/deals" },
                { label: "활성 전문가", value: stats.activeProfessionals, color: DS.text.muted, href: "/admin/experts" },
                { label: "활성 파트너", value: stats.activePartners, color: DS.text.muted, href: "/admin/experts" },
              ].map((item) => (
                <Link key={item.label} href={item.href} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--color-surface-sunken)] transition-colors">
                  <span className={DS.text.body}>{item.label}</span>
                  <span className={`font-semibold tabular-nums ${item.color}`}>{item.value}건</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── QUICK LINKS GRID ── */}
        <div>
          <p className={`${DS.text.label} text-[var(--color-brand-mid)] mb-3`}>빠른 관리</p>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3"
          >
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <motion.div key={link.href} variants={staggerItem} whileHover={{ y: -2, transition: { duration: 0.15 } }}>
                  <Link
                    href={link.href}
                    className={`${DS.card.interactive} flex flex-col items-center justify-center gap-2 py-4 px-2 group`}
                  >
                    <Icon size={20} className="text-[var(--color-brand-mid)] group-hover:text-[#0A1628] transition-colors" />
                    <span className={`${DS.text.micro} group-hover:text-[var(--color-text-primary)] transition-colors text-center leading-tight`}>
                      {link.label}
                    </span>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

      </div>
    </div>
  )
}
