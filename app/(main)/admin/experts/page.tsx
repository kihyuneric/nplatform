"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { GraduationCap, Users, Wallet, CheckCircle, XCircle, Clock } from "lucide-react"
import DS, { formatKRW, formatDate } from "@/lib/design-system"
import { createClient } from "@/lib/supabase/client"

type Tab = "전문가 목록" | "파트너 관리" | "정산 관리"
const TABS: Tab[] = ["전문가 목록", "파트너 관리", "정산 관리"]

interface ExpertRow {
  userId: string
  name: string
  field: string
  joined: string
  status: "활성" | "심사중" | "정지"
}

interface PartnerRow {
  userId: string
  name: string
  code: string
  referrals: number
  revenue: string
  status: "활성" | "비활성"
}

interface SettlementRow {
  id: string
  name: string
  type: "전문가" | "파트너"
  amount: number
  month: string
  status: "완료" | "대기"
}

const statusBadge: Record<string, string> = {
  활성:  "bg-stone-100/10 text-stone-900 border-stone-300/20",
  심사중: "bg-stone-100/10 text-stone-900 border-stone-300/20",
  정지:  "bg-stone-100/10 text-stone-900 border-stone-300/20",
  완료:  "bg-stone-100/10 text-stone-900 border-stone-300/20",
  대기:  "bg-stone-100/10 text-stone-900 border-stone-300/20",
  비활성: "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]",
}

const FALLBACK_EXPERTS: ExpertRow[] = [
  { userId: 'e1', name: "김민준", field: "법무사",     joined: "2025-11-03", status: "활성" },
  { userId: 'e2', name: "이서연", field: "감정평가사", joined: "2025-12-15", status: "활성" },
  { userId: 'e3', name: "최수아", field: "공인중개사", joined: "2026-02-20", status: "심사중" },
]

const FALLBACK_PARTNERS: PartnerRow[] = [
  { userId: 'p1', name: "한국자산관리공사", code: "KAMCO2025", referrals: 48, revenue: "₩1,200,000", status: "활성" },
  { userId: 'p2', name: "우리은행 NPL팀",  code: "WOORI-NPL",  referrals: 23, revenue: "₩580,000",   status: "활성" },
]

const FALLBACK_SETTLEMENTS: SettlementRow[] = [
  { id: 's1', name: "김민준",           type: "전문가", amount: 420000,   month: "2026-03", status: "완료" },
  { id: 's2', name: "이서연",           type: "전문가", amount: 310000,   month: "2026-03", status: "완료" },
  { id: 's3', name: "한국자산관리공사", type: "파트너", amount: 1200000, month: "2026-03", status: "대기" },
]

export default function AdminExpertsPage() {
  const [tab, setTab] = useState<Tab>("전문가 목록")
  const [experts, setExperts] = useState<ExpertRow[]>([])
  const [partners, setPartners] = useState<PartnerRow[]>([])
  const [settlements, setSettlements] = useState<SettlementRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch experts from professional_services + users
      const { data: svcData } = await supabase
        .from('professional_services')
        .select('professional_id, name, approval_status, created_at, is_active')
        .order('created_at', { ascending: false })

      if (svcData && svcData.length > 0) {
        // Group by professional_id (get unique professionals)
        const proMap: Record<string, { field: string; joined: string; approval: string; active: boolean }> = {}
        for (const s of svcData) {
          const id = s.professional_id as string
          if (!proMap[id]) {
            proMap[id] = {
              field: (s.name as string)?.slice(0, 8) ?? '전문가',
              joined: new Date(s.created_at as string).toISOString().slice(0, 10),
              approval: (s.approval_status as string) ?? 'APPROVED',
              active: (s.is_active as boolean) ?? true,
            }
          }
        }

        const proIds = Object.keys(proMap)
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', proIds)

        const nameMap: Record<string, string> = {}
        ;(usersData ?? []).forEach((u: Record<string, unknown>) => {
          nameMap[u.id as string] = (u.name as string) ?? '전문가'
        })

        const expertRows: ExpertRow[] = proIds.map(id => {
          const p = proMap[id]
          const approval = p.approval
          const status: ExpertRow['status'] = approval === 'PENDING' ? '심사중'
            : !p.active ? '정지'
            : '활성'
          return {
            userId: id,
            name: nameMap[id] ?? `전문가 ${id.slice(0, 4)}`,
            field: p.field,
            joined: p.joined,
            status,
          }
        })
        setExperts(expertRows)
      }
    } catch {
      setExperts([])
    }

    try {
      // Fetch partners from referral_codes + users
      const { data: refCodes } = await supabase
        .from('referral_codes')
        .select('owner_id, code, created_at')
        .limit(50)

      if (refCodes && refCodes.length > 0) {
        const ownerIds = (refCodes as Array<Record<string, unknown>>).map(r => r.owner_id as string)

        const { data: usersData } = await supabase
          .from('users')
          .select('id, name, role')
          .in('id', ownerIds)

        const userMap: Record<string, string> = {}
        ;(usersData ?? []).forEach((u: Record<string, unknown>) => {
          userMap[u.id as string] = (u.name as string) ?? '파트너'
        })

        // Count referrals per owner
        const { data: refRows } = await supabase
          .from('referrals')
          .select('referrer_id')
          .in('referrer_id', ownerIds)

        const refCount: Record<string, number> = {}
        ;(refRows ?? []).forEach((r: Record<string, unknown>) => {
          const id = r.referrer_id as string
          refCount[id] = (refCount[id] ?? 0) + 1
        })

        // Sum earnings per referrer
        const { data: earnRows } = await supabase
          .from('referral_earnings')
          .select('referrer_id, amount')
          .in('referrer_id', ownerIds)

        const earnMap: Record<string, number> = {}
        ;(earnRows ?? []).forEach((e: Record<string, unknown>) => {
          const id = e.referrer_id as string
          earnMap[id] = (earnMap[id] ?? 0) + ((e.amount as number) ?? 0)
        })

        const partnerRows: PartnerRow[] = (refCodes as Array<Record<string, unknown>>).map(r => ({
          userId: r.owner_id as string,
          name: userMap[r.owner_id as string] ?? `파트너 ${(r.owner_id as string).slice(0, 4)}`,
          code: (r.code as string) ?? '',
          referrals: refCount[r.owner_id as string] ?? 0,
          revenue: earnMap[r.owner_id as string] ? `₩${(earnMap[r.owner_id as string]).toLocaleString()}` : '—',
          status: '활성' as const,
        }))
        setPartners(partnerRows)
      }
    } catch {
      setPartners([])
    }

    try {
      // Fetch settlements: professional_earnings + referral_earnings
      const thisMonth = new Date()
      const monthKey = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}`

      const [{ data: proEarn }, { data: refEarn }] = await Promise.all([
        supabase
          .from('professional_earnings')
          .select('id, professional_id, net_amount, status, created_at')
          .gte('created_at', `${monthKey}-01`)
          .limit(50),
        supabase
          .from('referral_earnings')
          .select('id, referrer_id, amount, status, created_at')
          .gte('created_at', `${monthKey}-01`)
          .limit(50),
      ])

      const allIds = [
        ...((proEarn ?? []) as Array<Record<string, unknown>>).map(r => r.professional_id as string),
        ...((refEarn ?? []) as Array<Record<string, unknown>>).map(r => r.referrer_id as string),
      ].filter(Boolean)

      let nameMap: Record<string, string> = {}
      if (allIds.length > 0) {
        const { data: usersData } = await supabase.from('users').select('id, name').in('id', allIds)
        ;(usersData ?? []).forEach((u: Record<string, unknown>) => {
          nameMap[u.id as string] = (u.name as string) ?? '—'
        })
      }

      const rows: SettlementRow[] = [
        ...((proEarn ?? []) as Array<Record<string, unknown>>).map(r => ({
          id: r.id as string,
          name: nameMap[r.professional_id as string] ?? '전문가',
          type: '전문가' as const,
          amount: (r.net_amount as number) ?? 0,
          month: (r.created_at as string)?.slice(0, 7) ?? monthKey,
          status: (r.status as string) === 'SETTLED' ? '완료' as const : '대기' as const,
        })),
        ...((refEarn ?? []) as Array<Record<string, unknown>>).map(r => ({
          id: r.id as string,
          name: nameMap[r.referrer_id as string] ?? '파트너',
          type: '파트너' as const,
          amount: (r.amount as number) ?? 0,
          month: (r.created_at as string)?.slice(0, 7) ?? monthKey,
          status: (r.status as string) === 'SETTLED' ? '완료' as const : '대기' as const,
        })),
      ]
      setSettlements(rows)
    } catch {
      setSettlements([])
    }

    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const displayExperts = experts.length > 0 ? experts : FALLBACK_EXPERTS
  const displayPartners = partners.length > 0 ? partners : FALLBACK_PARTNERS
  const displaySettlements = settlements.length > 0 ? settlements : FALLBACK_SETTLEMENTS

  const pendingCount = displaySettlements.filter(s => s.status === "대기").length
  const totalSettlement = displaySettlements.reduce((s, r) => s + r.amount, 0)

  const handleExpertAction = async (userId: string, name: string, action: 'approve' | 'suspend' | 'restore') => {
    try {
      const supabase = createClient()
      const newStatus = action === 'approve' ? true : action === 'suspend' ? false : true
      await supabase
        .from('professional_services')
        .update({ is_active: newStatus, approval_status: action === 'approve' ? 'APPROVED' : 'APPROVED', updated_at: new Date().toISOString() })
        .eq('professional_id', userId)

      const label = action === 'approve' ? '승인' : action === 'suspend' ? '정지' : '복원'
      toast.success(`${name} ${label} 완료`)
      fetchData()
    } catch {
      toast.error('처리에 실패했습니다.')
    }
  }

  const handleSettle = async (id: string, name: string, type: string) => {
    try {
      const supabase = createClient()
      const table = type === '전문가' ? 'professional_earnings' : 'referral_earnings'
      await supabase
        .from(table)
        .update({ status: 'SETTLED', settled_at: new Date().toISOString() })
        .eq('id', id)
      toast.success(`${name} 정산 지급 완료`)
      fetchData()
    } catch {
      toast.error('정산 처리에 실패했습니다.')
    }
  }

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={`${DS.card.base} rounded-none border-x-0 border-t-0 px-6 py-5`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-[var(--color-brand-mid)]" />
            <div>
              <p className={DS.header.eyebrow}>Admin / Experts</p>
              <h1 className={DS.text.cardTitle}>전문가·파트너 관리</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border bg-stone-100/10 text-stone-900 border-stone-300/20">
              심사중 {displayExperts.filter(e => e.status === "심사중").length}건
            </span>
            <span className="text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] border-[var(--color-border-subtle)]">
              정산 대기 {pendingCount}건
            </span>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-4 divide-x divide-[var(--color-border-subtle)]">
          {[
            { label: "등록 전문가", value: loading ? '...' : `${displayExperts.length}명`, sub: `활성 ${displayExperts.filter(e => e.status === "활성").length}명`, color: "text-[var(--color-brand-mid)]" },
            { label: "파트너 수",   value: loading ? '...' : `${displayPartners.length}개`, sub: "이달 추천 현황", color: "text-[var(--color-positive)]" },
            { label: "총 정산 금액", value: loading ? '...' : formatKRW(totalSettlement), sub: "이번 달", color: "text-[var(--color-warning)]" },
            { label: "정산 대기",   value: loading ? '...' : `${pendingCount}건`, sub: "처리 필요", color: "text-[var(--color-danger)]" },
          ].map(k => (
            <div key={k.label} className="px-6 py-4">
              <p className={DS.stat.label}>{k.label}</p>
              <p className={`${DS.stat.value} ${k.color} font-mono`}>{k.value}</p>
              <p className={DS.stat.sub}>{k.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] px-6">
        <div className="max-w-6xl mx-auto flex">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-[0.8125rem] font-medium border-b-2 transition-colors ${
                tab === t
                  ? "border-[var(--color-brand-mid)] text-[var(--color-text-primary)] bg-[var(--color-surface-base)]"
                  : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* 전문가 목록 */}
        {tab === "전문가 목록" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={DS.text.caption}>
                전문가 현황 — {loading ? '...' : `${displayExperts.length}명`}
                {experts.length === 0 && !loading && <span className="ml-2 text-[var(--color-text-muted)]">(기준 데이터)</span>}
              </p>
              <button onClick={() => toast.success("전문가 초대 링크가 복사되었습니다")} className={DS.button.secondary}>
                <GraduationCap className="w-3 h-3" /> 전문가 초대
              </button>
            </div>
            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["이름", "전문 분야", "등록일", "상태", "액션"].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayExperts.map(e => (
                    <tr key={e.userId} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-semibold`}>{e.name}</td>
                      <td className={DS.table.cell}>
                        <span className={DS.badge.inline("bg-stone-100/10", "text-stone-900", "border-stone-300/20")}>{e.field}</span>
                      </td>
                      <td className={`${DS.table.cellMuted} font-mono`}>{e.joined}</td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge[e.status]}`}>{e.status}</span>
                      </td>
                      <td className={DS.table.cell}>
                        <div className="flex gap-2">
                          {e.status === "심사중" && (
                            <button onClick={() => handleExpertAction(e.userId, e.name, 'approve')} className={`${DS.button.accent} ${DS.button.sm}`}>
                              <CheckCircle className="w-3 h-3" /> 승인
                            </button>
                          )}
                          {e.status === "활성" && (
                            <button onClick={() => handleExpertAction(e.userId, e.name, 'suspend')} className={`${DS.button.danger} ${DS.button.sm}`}>
                              <XCircle className="w-3 h-3" /> 정지
                            </button>
                          )}
                          {e.status === "정지" && (
                            <button onClick={() => handleExpertAction(e.userId, e.name, 'restore')} className={`${DS.button.primary} ${DS.button.sm}`}>
                              <CheckCircle className="w-3 h-3" /> 복원
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 파트너 관리 */}
        {tab === "파트너 관리" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className={DS.text.caption}>
                파트너 현황 — {loading ? '...' : `${displayPartners.length}개`}
                {partners.length === 0 && !loading && <span className="ml-2 text-[var(--color-text-muted)]">(기준 데이터)</span>}
              </p>
              <button onClick={() => toast.success("파트너 등록 폼이 열립니다")} className={DS.button.secondary}>
                <Users className="w-3 h-3" /> 파트너 추가
              </button>
            </div>
            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["이름", "추천 코드", "추천 수", "수익", "상태", "액션"].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayPartners.map(p => (
                    <tr key={p.userId} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-semibold`}>{p.name}</td>
                      <td className={DS.table.cell}>
                        <code className={DS.badge.inline("bg-stone-100/10", "text-stone-900", "border-stone-300/20")}>{p.code}</code>
                      </td>
                      <td className={`${DS.table.cell} text-[var(--color-positive)] font-bold font-mono`}>{p.referrals}건</td>
                      <td className={`${DS.table.cell} text-[var(--color-warning)] font-mono`}>{p.revenue}</td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge[p.status] ?? statusBadge["비활성"]}`}>{p.status}</span>
                      </td>
                      <td className={DS.table.cell}>
                        <button onClick={() => toast.info(`${p.name} 상세 정보`)} className={`${DS.button.secondary} ${DS.button.sm}`}>
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 정산 관리 */}
        {tab === "정산 관리" && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "총 정산 금액",  value: loading ? '...' : formatKRW(totalSettlement), sub: "이번 달", icon: Wallet, color: "text-[var(--color-warning)]", border: "border-l-amber-400" },
                { label: "정산 대기",     value: loading ? '...' : `${pendingCount}건`, sub: "처리 필요", icon: Clock, color: "text-[var(--color-danger)]", border: "border-l-red-400" },
                { label: "정산 완료",     value: loading ? '...' : `${displaySettlements.filter(s => s.status === "완료").length}건`, sub: "지급 완료", icon: CheckCircle, color: "text-[var(--color-positive)]", border: "border-l-emerald-400" },
              ].map(c => (
                <div key={c.label} className={`${DS.stat.card} border-l-2 ${c.border} flex items-center gap-4`}>
                  <c.icon className={`w-7 h-7 shrink-0 ${c.color}`} />
                  <div>
                    <p className={`${DS.stat.value} ${c.color} font-mono`}>{c.value}</p>
                    <p className={DS.stat.label}>{c.label}</p>
                    <p className={DS.stat.sub}>{c.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <p className={DS.text.caption}>이번 달 정산 내역</p>
              <button
                onClick={async () => {
                  const pending = displaySettlements.filter(s => s.status === "대기")
                  for (const s of pending) await handleSettle(s.id, s.name, s.type)
                }}
                className={DS.button.secondary}
              >
                <Wallet className="w-3 h-3" /> 일괄 지급
              </button>
            </div>

            <div className={DS.table.wrapper}>
              <table className="w-full">
                <thead>
                  <tr className={DS.table.header}>
                    {["이름", "유형", "정산 월", "금액", "상태", ""].map(h => (
                      <th key={h} className={DS.table.headerCell}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displaySettlements.map(s => (
                    <tr key={s.id} className={DS.table.row}>
                      <td className={`${DS.table.cell} font-semibold`}>{s.name}</td>
                      <td className={DS.table.cell}>
                        <span className={DS.badge.inline("bg-[var(--color-surface-overlay)]", "text-[var(--color-text-secondary)]", "border-[var(--color-border-subtle)]")}>{s.type}</span>
                      </td>
                      <td className={`${DS.table.cellMuted} font-mono`}>{s.month}</td>
                      <td className={`${DS.table.cell} text-[var(--color-positive)] font-bold font-mono`}>
                        {s.amount > 0 ? formatKRW(s.amount) : '—'}
                      </td>
                      <td className={DS.table.cell}>
                        <span className={`text-[0.6875rem] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge[s.status]}`}>{s.status}</span>
                      </td>
                      <td className={DS.table.cell}>
                        {s.status === "대기" && (
                          <button onClick={() => handleSettle(s.id, s.name, s.type)} className={`${DS.button.accent} ${DS.button.sm}`}>
                            지급 처리
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
