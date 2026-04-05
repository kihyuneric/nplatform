"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import Link from "next/link"
import { Bell, CheckCheck, Check, Trash2, Clock, FileText, Gavel, Shield, TrendingUp, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import DS, { formatKRW } from "@/lib/design-system"

type NotificationType = "contract" | "listing" | "analysis" | "system"

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  is_read: boolean
  created_at: string
  link?: string
}

const TYPE_META: Record<NotificationType, { icon: any; color: string; bg: string; label: string }> = {
  contract: { icon: Gavel,      color: "text-blue-600",    bg: "bg-blue-50",    label: "거래" },
  listing:  { icon: FileText,   color: "text-emerald-600", bg: "bg-emerald-50", label: "매물" },
  analysis: { icon: TrendingUp, color: "text-purple-600",  bg: "bg-purple-50",  label: "분석" },
  system:   { icon: Shield,     color: "text-[var(--color-text-tertiary)]",    bg: "bg-[var(--color-surface-sunken)]",    label: "시스템" },
}

const MOCK: Notification[] = [
  { id: "n1",  type: "listing",  title: "새 NPL 매물 등록",    message: "서울 강남구 아파트 NPL 매물이 신규 등록되었습니다. 감정가 대비 35% 할인된 가격입니다.",  is_read: false, created_at: new Date(Date.now() - 5*60000).toISOString(),   link: "/listings/1" },
  { id: "n2",  type: "contract", title: "계약 상태 변경",       message: "건물 NPL-2024-0512 계약이 '검토 중' 상태로 변경되었습니다.",                          is_read: false, created_at: new Date(Date.now() - 30*60000).toISOString(),  link: "/deal-rooms/2" },
  { id: "n3",  type: "analysis", title: "분석 리포트 완료",     message: "요청하신 부산 해운대구 오피스텔 NPL 분석 리포트가 완료되었습니다.",                     is_read: false, created_at: new Date(Date.now() - 2*3600000).toISOString(), link: "/npl-analysis/3" },
  { id: "n4",  type: "system",   title: "시스템 점검 안내",     message: "4월 15일 02:00~04:00 서버 점검이 예정되어 있습니다.",                                 is_read: true,  created_at: new Date(Date.now() - 5*3600000).toISOString() },
  { id: "n5",  type: "listing",  title: "관심 매물 가격 변동",  message: "관심 등록하신 NPL-2024-0498 매물의 매각 희망가가 10% 인하되었습니다.",                 is_read: true,  created_at: new Date(Date.now() - 8*3600000).toISOString(),  link: "/listings/5" },
  { id: "n6",  type: "contract", title: "입찰 결과 안내",       message: "NPL-2024-0487 입찰에 참여하신 건의 낙찰 결과가 발표되었습니다.",                       is_read: true,  created_at: new Date(Date.now() - 24*3600000).toISOString(), link: "/deal-rooms/6" },
  { id: "n7",  type: "analysis", title: "시장 동향 리포트",     message: "2026년 3월 수도권 NPL 시장 동향 월간 리포트가 발행되었습니다.",                        is_read: true,  created_at: new Date(Date.now() - 48*3600000).toISOString(), link: "/npl-analysis/7" },
  { id: "n8",  type: "system",   title: "본인 인증 완료",       message: "KYC 본인 인증이 정상적으로 처리되었습니다.",                                          is_read: true,  created_at: new Date(Date.now() - 72*3600000).toISOString() },
  { id: "n9",  type: "listing",  title: "매물 마감 임박",       message: "관심 매물 NPL-2024-0501의 입찰 마감이 24시간 남았습니다.",                            is_read: false, created_at: new Date(Date.now() - 10*60000).toISOString(),  link: "/listings/9" },
  { id: "n10", type: "contract", title: "서류 보완 요청",       message: "계약 NPL-2024-0520에 대해 추가 서류 제출이 필요합니다.",                              is_read: false, created_at: new Date(Date.now() - 45*60000).toISOString(),  link: "/deal-rooms/10" },
]

const FILTER_TABS = [
  { value: "all",      label: "전체" },
  { value: "contract", label: "거래" },
  { value: "listing",  label: "매물" },
  { value: "analysis", label: "분석" },
  { value: "system",   label: "시스템" },
] as const

function relativeTime(s: string) {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (m < 1) return "방금 전"
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  return d < 7 ? `${d}일 전` : new Date(s).toLocaleDateString("ko-KR")
}

function dateGroup(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (d === 0) return "오늘"
  if (d === 1) return "어제"
  if (d < 7) return "이번 주"
  return "이전"
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<Notification[]>(MOCK)
  const [activeTab, setActiveTab] = useState<"all" | NotificationType>("all")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const unreadCount = items.filter(n => !n.is_read).length
  const filtered = activeTab === "all" ? items : items.filter(n => n.type === activeTab)

  const grouped = useMemo(() => {
    const order = ["오늘", "어제", "이번 주", "이전"]
    const map: Record<string, Notification[]> = {}
    for (const n of filtered) {
      const g = dateGroup(n.created_at)
      if (!map[g]) map[g] = []
      map[g].push(n)
    }
    return order.filter(g => map[g]).map(g => ({ group: g, list: map[g] }))
  }, [filtered])

  const markAllRead = useCallback(() => {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    setSelectedIds(new Set())
    fetch("/api/v1/notifications/read-all", { method: "PATCH" }).catch(() => toast.error("읽음 처리에 실패했습니다."))
  }, [])

  const deleteSelected = useCallback(() => {
    setItems(prev => prev.filter(n => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
  }, [selectedIds])

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const markRead = (id: string) =>
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))

  if (!user) {
    return (
      <div className={DS.page.wrapper + " flex flex-col items-center justify-center py-20"}>
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] mb-5">
          <Bell className="h-9 w-9 text-[var(--color-text-muted)]" />
        </div>
        <h2 className={DS.text.cardTitle + " mb-1"}>로그인이 필요합니다</h2>
        <p className={DS.text.caption + " mb-5"}>알림을 확인하려면 로그인해주세요</p>
        <Link href="/login" className={DS.button.primary}>
          로그인
        </Link>
      </div>
    )
  }

  return (
    <div className={DS.page.wrapper}>
      {/* Header */}
      <div className={DS.page.container + " " + DS.page.paddingTop}>
        <div className={DS.header.wrapper}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className={DS.header.title}>알림</h1>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1.5 text-[0.6875rem] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className={DS.button.ghost + " disabled:opacity-30 disabled:cursor-not-allowed"}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              모두 읽음 처리
            </button>
          </div>
        </div>
      </div>

      <div className={DS.page.container + " py-5 space-y-4"}>
        {/* Filter tabs */}
        <div className={DS.tabs.list}>
          {FILTER_TABS.map(tab => {
            const unread = tab.value === "all" ? 0 : items.filter(n => n.type === tab.value && !n.is_read).length
            return (
              <button
                key={tab.value}
                onClick={() => { setActiveTab(tab.value as any); setSelectedIds(new Set()) }}
                className={`flex-1 flex items-center justify-center gap-1.5 ${
                  activeTab === tab.value ? DS.tabs.active : DS.tabs.trigger
                }`}
              >
                {tab.label}
                {unread > 0 && (
                  <span className="h-4 min-w-4 flex items-center justify-center rounded-full bg-red-50 text-[var(--color-danger)] text-[0.6875rem] font-bold px-1">
                    {unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Batch bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <span className={DS.text.bodyMedium + " !text-[var(--color-brand-mid)]"}>{selectedIds.size}개 선택됨</span>
            <div className="h-4 w-px bg-[var(--color-border-subtle)]" />
            <button onClick={deleteSelected} className="flex items-center gap-1 text-[0.8125rem] text-[var(--color-danger)] hover:text-red-700 transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> 삭제
            </button>
          </div>
        )}

        {/* Notification list */}
        {filtered.length === 0 ? (
          <div className={DS.empty.wrapper}>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] mb-4">
              <Bell className="h-7 w-7 text-[var(--color-text-muted)]" />
            </div>
            <p className={DS.empty.title}>알림이 없습니다</p>
            <p className={DS.empty.description}>새로운 알림이 도착하면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ group, list }) => (
              <div key={group}>
                <p className={DS.text.label + " px-1 mb-2"}>{group}</p>
                <div className="space-y-1">
                  {list.map(n => {
                    const meta = TYPE_META[n.type]
                    const Icon = meta.icon
                    const isSelected = selectedIds.has(n.id)
                    const card = (
                      <div
                        onClick={() => markRead(n.id)}
                        className={`group relative flex items-start gap-3 rounded-xl px-4 py-3.5 cursor-pointer transition-all ${
                          !n.is_read
                            ? DS.card.base + " border-l-2 !border-l-[var(--color-brand-mid)] pl-[14px]"
                            : "bg-[var(--color-surface-base)] hover:bg-[var(--color-surface-elevated)]"
                        } ${isSelected ? "ring-1 ring-[var(--color-brand-bright)]" : ""}`}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          className="mt-0.5 shrink-0"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); toggleSelect(n.id) }}
                        >
                          <div className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                            isSelected ? "bg-[var(--color-brand-mid)] border-[var(--color-brand-mid)]" : "border-[var(--color-border-default)] group-hover:border-[var(--color-border-strong)]"
                          }`}>
                            {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                          </div>
                        </button>

                        {/* Icon */}
                        <div className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-full ${meta.bg} border border-[var(--color-border-subtle)]`}>
                          <Icon className={`h-4 w-4 ${meta.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className={`text-[0.8125rem] font-semibold leading-tight ${!n.is_read ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>
                              {n.title}
                            </h3>
                            {!n.is_read && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-mid)] shrink-0" />}
                          </div>
                          <p className={DS.text.captionLight + " mt-0.5 line-clamp-2 leading-relaxed"}>{n.message}</p>
                          <span className={DS.text.micro + " mt-1.5 flex items-center gap-1"}>
                            <Clock className="h-3 w-3" />{relativeTime(n.created_at)}
                          </span>
                        </div>

                        {n.link && <ChevronRight className="shrink-0 h-4 w-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors mt-1" />}
                      </div>
                    )
                    return n.link ? (
                      <Link key={n.id} href={n.link} className="block">{card}</Link>
                    ) : (
                      <div key={n.id}>{card}</div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
