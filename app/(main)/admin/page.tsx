"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Users, Building2, Shield, FileCheck, AlertTriangle,
  UserPlus, Gavel, FileText, CreditCard, Image,
  Code, Settings, Activity, BarChart2, Handshake,
  GraduationCap, Server, Upload,
} from "lucide-react"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts"
import DS, { formatKRW, formatDate } from "@/lib/design-system"

/* ------------------------------------------------------------------ */
/*  Mock data                                                           */
/* ------------------------------------------------------------------ */

const signupData = [
  { day: "3/29", 신규가입: 18 },
  { day: "3/30", 신규가입: 25 },
  { day: "3/31", 신규가입: 14 },
  { day: "4/1",  신규가입: 32 },
  { day: "4/2",  신규가입: 41 },
  { day: "4/3",  신규가입: 38 },
  { day: "4/4",  신규가입: 52 },
]

const listingPieData = [
  { name: "등록중",  value: 142, color: "#3B82F6" },
  { name: "검토중",  value: 28,  color: "#F59E0B" },
  { name: "활성",    value: 198, color: "#10B981" },
  { name: "완료",    value: 87,  color: "#6B7280" },
]

const recentMembers = [
  { name: "김민수",  role: "기관 매수자", date: "2026-04-04", status: "승인완료" },
  { name: "이영희",  role: "개인 매수자", date: "2026-04-04", status: "대기중" },
  { name: "박성민",  role: "매도기관",    date: "2026-04-03", status: "승인완료" },
  { name: "정다은",  role: "파트너",      date: "2026-04-03", status: "심사중" },
  { name: "최영수",  role: "기관 매수자", date: "2026-04-02", status: "승인완료" },
]

const urgentItems = [
  { type: "KYC",  content: "한국자산관리 - 기관인증 서류 검토", priority: "긴급", time: "15분 전" },
  { type: "매물", content: "강남구 오피스텔 - 허위매물 신고",   priority: "높음", time: "32분 전" },
  { type: "결제", content: "투자개발(주) - 크레딧 환불 요청",   priority: "보통", time: "1시간 전" },
  { type: "신고", content: "부산 해운대 - 이중 등록 의심",       priority: "긴급", time: "2시간 전" },
  { type: "계정", content: "신한캐피탈 - 비밀번호 초기화 요청", priority: "낮음", time: "3시간 전" },
]

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

const priorityBadge: Record<string, string> = {
  긴급: "bg-red-50 text-red-700 border border-red-200",
  높음: "bg-orange-50 text-orange-700 border border-orange-200",
  보통: "bg-amber-50 text-amber-700 border border-amber-200",
  낮음: "bg-slate-50 text-slate-600 border border-slate-200",
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
  const [now, setNow] = useState("")

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
          <span className={`ml-2 ${DS.badge.inline("bg-blue-50", "text-blue-700", "border-blue-200")}`}>
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

        {/* ── KPI STRIP ── */}
        <div>
          <p className={`${DS.text.label} text-[var(--color-brand-mid)] mb-3`}>핵심 지표</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "총 회원", value: "12,847", sub: "↑ +234 오늘", subColor: "text-[var(--color-positive)]" },
              { label: "대기 승인", value: "28", unit: "명", valueColor: "text-[var(--color-danger)]", sub: "긴급 처리 필요", subColor: "text-[var(--color-danger)]" },
              { label: "신규 매물", value: "142", unit: "건", sub: "오늘 등록", subColor: DS.text.muted },
              { label: "진행 거래", value: "367", unit: "건", sub: "활성 딜룸", subColor: "text-[var(--color-brand-mid)]" },
              { label: "오늘 수익", value: "₩2.8억", valueColor: "text-[var(--color-positive)]", sub: "일 매출", subColor: DS.text.muted },
              { label: "시스템 상태", isStatus: true },
            ].map((kpi, i) => (
              <div key={i} className={DS.stat.card}>
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
                      {kpi.value}
                      {(kpi as any).unit && <span className={`${DS.text.caption} ml-0.5`}>{(kpi as any).unit}</span>}
                    </p>
                    <p className={`${DS.stat.sub} ${(kpi as any).subColor ?? ""}`}>{kpi.sub}</p>
                  </>
                )}
              </div>
            ))}
          </div>
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
                    <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis dataKey="day" tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="신규가입" stroke="#3B82F6" strokeWidth={2} fill="url(#signupGrad)" dot={{ fill: "#3B82F6", r: 3 }} />
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
                  data={listingPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {listingPieData.map((entry, i) => (
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
            <div className={`px-4 py-3 border-b border-[var(--color-border-subtle)]`}>
              <p className={`${DS.text.label} text-[var(--color-brand-mid)]`}>최근 가입 회원</p>
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

          {/* 긴급 처리 필요 */}
          <div className={DS.table.wrapper}>
            <div className={`px-4 py-3 border-b border-[var(--color-border-subtle)]`}>
              <p className={`${DS.text.label} text-[var(--color-brand-mid)]`}>긴급 처리 필요</p>
            </div>
            <table className="w-full">
              <thead>
                <tr className={DS.table.header}>
                  <th className={DS.table.headerCell}>타입</th>
                  <th className={DS.table.headerCell}>내용</th>
                  <th className={DS.table.headerCell}>우선도</th>
                  <th className={DS.table.headerCell}>시간</th>
                </tr>
              </thead>
              <tbody>
                {urgentItems.map((item, i) => (
                  <tr key={i} className={DS.table.row}>
                    <td className={DS.table.cell}>
                      <span className={DS.badge.inline("bg-blue-50", "text-blue-700", "border-blue-200")}>
                        {item.type}
                      </span>
                    </td>
                    <td className={`${DS.table.cell} max-w-[180px] truncate`}>{item.content}</td>
                    <td className={DS.table.cell}>
                      <span className={`text-[0.6875rem] font-bold px-2 py-0.5 rounded-full ${priorityBadge[item.priority]}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className={`${DS.table.cellMuted} font-mono whitespace-nowrap text-[0.75rem]`}>{item.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── QUICK LINKS GRID ── */}
        <div>
          <p className={`${DS.text.label} text-[var(--color-brand-mid)] mb-3`}>빠른 관리</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {quickLinks.map((link) => {
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`${DS.card.interactive} flex flex-col items-center justify-center gap-2 py-4 px-2 group`}
                >
                  <Icon size={20} className="text-[var(--color-brand-mid)] group-hover:text-[var(--color-brand-dark)] transition-colors" />
                  <span className={`${DS.text.micro} group-hover:text-[var(--color-text-primary)] transition-colors text-center leading-tight`}>
                    {link.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
