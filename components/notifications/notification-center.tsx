'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  X,
  Building2,
  Users,
  Shield,
  Settings,
  MessageCircle,
  ChevronRight,
  Loader2,
  Filter,
  ExternalLink,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Notification, NotificationType } from '@/lib/types'
import { useNotificationsRealtime } from '@/lib/supabase/realtime'

// ─── Types ────────────────────────────────────────────────────────────────

type NotificationTab = 'ALL' | 'CONTRACT' | 'MATCHING' | 'SYSTEM' | 'COMMUNITY'

interface NotificationGroup {
  date: string
  label: string
  notifications: Notification[]
}

interface NotificationCenterProps {
  /** Controlled open state */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Fetch notifications callback */
  onFetch?: () => Promise<Notification[]>
  /** Mark as read callback */
  onMarkRead?: (id: string) => Promise<void>
  /** Mark all read callback */
  onMarkAllRead?: () => Promise<void>
  /** Initial notifications (for SSR or static) */
  initialNotifications?: Notification[]
  className?: string
  /** Trigger button placement */
  placement?: 'dropdown' | 'panel'
  /** User ID for realtime subscription */
  userId?: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const TAB_CONFIG: Record<NotificationTab, { label: string; types?: NotificationType[] }> = {
  ALL: { label: '전체' },
  CONTRACT: { label: '거래', types: ['CONTRACT', 'DEAL_ROOM'] },
  MATCHING: { label: '매칭', types: ['MATCHING', 'ALERT', 'LISTING'] },
  SYSTEM: { label: '시스템', types: ['SYSTEM', 'KYC', 'COMPLAINT'] },
  COMMUNITY: { label: '커뮤니티', types: [] },
}

const TYPE_ICON: Record<NotificationType, React.ReactNode> = {
  MATCHING: <Users className="h-4 w-4 text-purple-500" />,
  CONTRACT: <Shield className="h-4 w-4 text-blue-500" />,
  DEAL_ROOM: <MessageCircle className="h-4 w-4 text-[var(--color-positive)]" />,
  KYC: <Check className="h-4 w-4 text-emerald-500" />,
  LISTING: <Building2 className="h-4 w-4 text-orange-500" />,
  ALERT: <Bell className="h-4 w-4 text-amber-500" />,
  SYSTEM: <Settings className="h-4 w-4 text-gray-500" />,
  COMPLAINT: <MessageCircle className="h-4 w-4 text-red-500" />,
}

const TYPE_BG: Record<NotificationType, string> = {
  MATCHING: 'bg-purple-500/10',
  CONTRACT: 'bg-blue-500/10',
  DEAL_ROOM: 'bg-emerald-500/10',
  KYC: 'bg-green-500/10',
  LISTING: 'bg-orange-500/10',
  ALERT: 'bg-amber-500/10',
  SYSTEM: 'bg-[var(--color-surface-overlay)]',
  COMPLAINT: 'bg-red-500/10',
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)

  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
}

function groupByDate(notifications: Notification[]): NotificationGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterday = today - 86_400_000
  const weekAgo = today - 7 * 86_400_000

  const groups: Record<string, { label: string; notifications: Notification[] }> = {
    today: { label: '오늘', notifications: [] },
    yesterday: { label: '어제', notifications: [] },
    week: { label: '이번 주', notifications: [] },
    older: { label: '이전', notifications: [] },
  }

  for (const n of notifications) {
    const t = new Date(n.created_at).getTime()
    if (t >= today) groups.today.notifications.push(n)
    else if (t >= yesterday) groups.yesterday.notifications.push(n)
    else if (t >= weekAgo) groups.week.notifications.push(n)
    else groups.older.notifications.push(n)
  }

  return Object.entries(groups)
    .filter(([, g]) => g.notifications.length > 0)
    .map(([key, g]) => ({ date: key, label: g.label, notifications: g.notifications }))
}

// ─── Notification Item ────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onMarkRead,
  onNavigate,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
  onNavigate: (notification: Notification) => void
}) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative flex items-start gap-3 px-4 py-3 cursor-pointer',
        'hover:bg-muted/50 transition-colors duration-150',
        !notification.is_read && 'bg-[var(--color-brand-dark)]/5',
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate(notification)}
    >
      {/* Unread indicator */}
      {!notification.is_read && (
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[var(--color-positive)]" />
      )}

      {/* Icon */}
      <div
        className={cn(
          'shrink-0 h-9 w-9 rounded-xl flex items-center justify-center mt-0.5',
          TYPE_BG[notification.type],
        )}
      >
        {TYPE_ICON[notification.type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm leading-snug line-clamp-1',
            !notification.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80',
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        )}
        <p className="text-[11px] text-muted-foreground/70 mt-1">
          {formatTimeAgo(notification.created_at)}
        </p>
      </div>

      {/* Actions */}
      <div className={cn('flex items-center gap-1 shrink-0 transition-opacity', hovered ? 'opacity-100' : 'opacity-0')}>
        {!notification.is_read && (
          <button
            onClick={(e) => { e.stopPropagation(); onMarkRead(notification.id) }}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none"
            aria-label="읽음 처리"
            title="읽음으로 표시"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        )}
        {notification.link && (
          <div className="p-1.5 text-muted-foreground">
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────

export function NotificationCenter({
  open: controlledOpen,
  onOpenChange,
  onFetch,
  onMarkRead,
  onMarkAllRead,
  initialNotifications = [],
  className,
  placement = 'dropdown',
  userId,
}: NotificationCenterProps) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<Notification[]>(initialNotifications)
  const [activeTab, setActiveTab] = React.useState<NotificationTab>('ALL')
  const [loading, setLoading] = React.useState(false)
  const [markingAll, setMarkingAll] = React.useState(false)

  // Supabase Realtime: push new notifications instantly
  useNotificationsRealtime(userId ?? null, (raw) => {
    const newNotif: Notification = {
      id: raw.id as string ?? String(Date.now()),
      user_id: raw.user_id as string ?? '',
      type: (raw.type as NotificationType) ?? 'SYSTEM',
      title: raw.title as string ?? '알림',
      body: raw.body as string ?? '',
      link: raw.link as string | undefined,
      is_read: false,
      created_at: (raw.created_at as string) ?? new Date().toISOString(),
    }
    setNotifications((prev) => [newNotif, ...prev])
    // Browser notification API (if permitted)
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(newNotif.title, { body: newNotif.body ?? '', icon: '/favicon.ico' })
    }
  })
  const panelRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  const isOpen = controlledOpen ?? internalOpen
  const setOpen = (v: boolean) => {
    setInternalOpen(v)
    onOpenChange?.(v)
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  // Click outside to close
  React.useEffect(() => {
    if (!isOpen || placement !== 'dropdown') return
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen, placement])

  // Fetch on open
  React.useEffect(() => {
    if (isOpen && onFetch) {
      setLoading(true)
      onFetch()
        .then(setNotifications)
        .finally(() => setLoading(false))
    }
  }, [isOpen, onFetch])

  // Filter by tab
  const tabConfig = TAB_CONFIG[activeTab]
  const filtered = notifications.filter((n) => {
    if (!tabConfig.types) return true // ALL
    return tabConfig.types.includes(n.type)
  })

  const grouped = groupByDate(filtered)
  const tabUnreadCounts: Record<NotificationTab, number> = React.useMemo(() => {
    const counts = {} as Record<NotificationTab, number>
    for (const tab of Object.keys(TAB_CONFIG) as NotificationTab[]) {
      const types = TAB_CONFIG[tab].types
      counts[tab] = notifications.filter(
        (n) => !n.is_read && (!types || types.includes(n.type))
      ).length
    }
    return counts
  }, [notifications])

  const handleMarkRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
    if (onMarkRead) {
      onMarkRead(id)
    } else {
      // Fallback: call the read endpoint directly
      fetch(`/api/v1/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {/* silent */})
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingAll(true)
    try {
      await onMarkAllRead?.()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } finally {
      setMarkingAll(false)
    }
  }

  const handleNavigate = (notification: Notification) => {
    handleMarkRead(notification.id)
    if (notification.link) {
      router.push(notification.link)
      setOpen(false)
    }
  }

  const panel = (
    <motion.div
      ref={panelRef}
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'w-[380px] max-h-[600px] flex flex-col',
        'bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl border border-border',
        'overflow-hidden',
        placement === 'dropdown' && 'absolute top-full right-0 mt-2 z-50',
        className
      )}
      role="dialog"
      aria-label="알림 센터"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--color-brand-dark)]" />
          <h2 className="text-base font-semibold">알림</h2>
          {unreadCount > 0 && (
            <Badge
              className="h-5 px-1.5 text-[10px] bg-[var(--color-positive)] text-white hover:bg-[var(--color-positive)]"
            >
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="flex items-center gap-1 text-xs text-[#2E75B6] hover:text-[var(--color-brand-dark)] font-medium disabled:opacity-50 px-2 py-1 rounded-md hover:bg-muted transition-colors"
              title="모두 읽음으로 표시"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              전체 읽음
            </button>
          )}
          {placement === 'dropdown' && (
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none"
              aria-label="닫기"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b px-1 overflow-x-auto no-scrollbar">
        {(Object.keys(TAB_CONFIG) as NotificationTab[]).map((tab) => {
          const count = tabUnreadCounts[tab]
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'relative flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                isActive
                  ? 'text-[var(--color-brand-dark)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {TAB_CONFIG[tab].label}
              {count > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[10px] font-bold',
                    isActive
                      ? 'bg-[var(--color-brand-dark)] text-white'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="notification-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-brand-dark)]"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Notification List */}
      <div className="flex-1 overflow-y-auto" role="tabpanel" aria-label={`${TAB_CONFIG[activeTab].label} 알림 목록`} aria-live="polite" aria-atomic="false">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <BellOff className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">알림이 없습니다</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {grouped.map((group) => (
              <div key={group.date}>
                <div className="sticky top-0 z-10 px-4 py-2 bg-muted/60 backdrop-blur-sm border-b">
                  <p className="text-xs font-semibold text-muted-foreground">{group.label}</p>
                </div>
                {group.notifications.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={handleMarkRead}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 flex items-center justify-between bg-muted/20">
        <span className="text-xs text-muted-foreground">
          {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '모두 읽었습니다'}
        </span>
        <button
          onClick={() => { router.push('/notifications'); setOpen(false) }}
          className="flex items-center gap-1 text-xs text-[#2E75B6] hover:text-[var(--color-brand-dark)] font-medium"
        >
          모든 알림 보기
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  )

  return (
    <div className={cn('relative inline-block', className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none',
          'text-muted-foreground hover:text-foreground hover:bg-muted',
          isOpen && 'bg-muted text-foreground',
        )}
        aria-label={`알림 ${unreadCount > 0 ? `(읽지 않은 ${unreadCount}개)` : ''}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <Bell className="h-5 w-5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={cn(
                'absolute -top-0.5 -right-0.5',
                'h-4 min-w-4 px-1',
                'flex items-center justify-center',
                'rounded-full bg-[var(--color-positive)] text-white',
                'text-[9px] font-bold leading-none',
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && panel}
      </AnimatePresence>
    </div>
  )
}
