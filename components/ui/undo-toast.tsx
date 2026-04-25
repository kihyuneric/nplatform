'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Undo2, CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────

interface UndoToastOptions {
  message: string
  description?: string
  undoLabel?: string
  onUndo: () => void | Promise<void>
  /** Countdown seconds */
  duration?: number
  type?: 'default' | 'destructive' | 'info' | 'success'
  icon?: React.ReactNode
}

// ─── Countdown Bar ────────────────────────────────────────────────────────

function CountdownBar({
  duration,
  color,
}: {
  duration: number
  color: string
}) {
  return (
    <motion.div
      className="absolute bottom-0 left-0 h-0.5 rounded-full"
      style={{ background: color }}
      initial={{ width: '100%' }}
      animate={{ width: '0%' }}
      transition={{ duration: duration / 1000, ease: 'linear' }}
    />
  )
}

// ─── UndoToast Component (rendered inside sonner) ─────────────────────────

interface UndoToastContentProps {
  message: string
  description?: string
  undoLabel: string
  onUndo: () => void | Promise<void>
  duration: number
  type: UndoToastOptions['type']
  icon?: React.ReactNode
  toastId: string | number
}

function UndoToastContent({
  message,
  description,
  undoLabel,
  onUndo,
  duration,
  type,
  icon,
  toastId,
}: UndoToastContentProps) {
  const [loading, setLoading] = React.useState(false)
  const [done, setDone] = React.useState(false)

  const barColor = type === 'destructive'
    ? '#1B1B1F'
    : type === 'success'
    ? '#14161A'
    : type === 'info'
    ? '#14161A'
    : '#6B7280'

  const defaultIcon = type === 'destructive'
    ? <AlertCircle className="h-4 w-4 text-stone-900" />
    : type === 'success'
    ? <CheckCircle className="h-4 w-4 text-stone-900" />
    : type === 'info'
    ? <Info className="h-4 w-4 text-stone-900" />
    : null

  const handleUndo = async () => {
    if (loading || done) return
    setLoading(true)
    try {
      await onUndo()
      setDone(true)
      toast.dismiss(toastId)
      toast.success('실행이 취소되었습니다.')
    } catch (err) {
      toast.error('실행 취소에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex items-start gap-3 w-full pr-2 pb-1 overflow-hidden">
      {(icon ?? defaultIcon) && (
        <div className="mt-0.5 shrink-0">{icon ?? defaultIcon}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">{message}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
        <button
          onClick={handleUndo}
          disabled={loading || done}
          className={cn(
            'mt-1.5 text-xs font-semibold underline underline-offset-2',
            'flex items-center gap-1 transition-opacity',
            type === 'destructive' ? 'text-stone-900' : 'text-stone-900',
            (loading || done) && 'opacity-50 cursor-not-allowed',
          )}
        >
          <Undo2 className="h-3 w-3" />
          {loading ? '처리 중...' : undoLabel}
        </button>
      </div>
      <CountdownBar duration={duration} color={barColor} />
    </div>
  )
}

// ─── Main API ─────────────────────────────────────────────────────────────

export function showUndoToast({
  message,
  description,
  undoLabel = '실행 취소',
  onUndo,
  duration = 5000,
  type = 'default',
  icon,
}: UndoToastOptions) {
  const id = toast.custom(
    (t) => (
      <UndoToastContent
        message={message}
        description={description}
        undoLabel={undoLabel}
        onUndo={onUndo}
        duration={duration}
        type={type}
        icon={icon}
        toastId={t}
      />
    ),
    {
      duration,
      classNames: {
        toast: cn(
          'relative overflow-hidden',
          type === 'destructive' && 'border-stone-300',
          type === 'success' && 'border-stone-300',
        ),
      },
    }
  )
  return id
}

// ─── Preset Functions ─────────────────────────────────────────────────────

export function showDeleteUndoToast(
  itemName: string,
  onUndo: () => void | Promise<void>,
  options?: Partial<UndoToastOptions>
) {
  return showUndoToast({
    message: `"${itemName}"이(가) 삭제되었습니다.`,
    description: '5초 안에 실행을 취소할 수 있습니다.',
    type: 'destructive',
    onUndo,
    ...options,
  })
}

export function showStatusChangeUndoToast(
  fromStatus: string,
  toStatus: string,
  onUndo: () => void | Promise<void>,
  options?: Partial<UndoToastOptions>
) {
  return showUndoToast({
    message: `상태가 "${fromStatus}" → "${toStatus}"로 변경되었습니다.`,
    type: 'info',
    onUndo,
    ...options,
  })
}

export function showMoveUndoToast(
  itemName: string,
  destination: string,
  onUndo: () => void | Promise<void>,
  options?: Partial<UndoToastOptions>
) {
  return showUndoToast({
    message: `"${itemName}"이(가) "${destination}"으로 이동되었습니다.`,
    type: 'default',
    onUndo,
    ...options,
  })
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useUndoToast() {
  return {
    showUndo: showUndoToast,
    showDelete: showDeleteUndoToast,
    showStatusChange: showStatusChangeUndoToast,
    showMove: showMoveUndoToast,
  }
}
