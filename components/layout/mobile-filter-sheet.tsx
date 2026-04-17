'use client'

import * as React from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { MobileSheet } from '@/components/ui/mobile-sheet'
import { cn } from '@/lib/utils'

interface MobileFilterSheetProps {
  /** Number of active filters to show on the badge */
  activeFilterCount?: number
  /** Content of the filter sheet (filter controls) */
  children: React.ReactNode
  /** Called when the user taps "적용" */
  onApply: () => void
  /** Called when the user taps "초기화" */
  onReset: () => void
  /** Override the trigger button label */
  triggerLabel?: string
  /** Class applied to the trigger button */
  triggerClassName?: string
}

export function MobileFilterSheet({
  activeFilterCount = 0,
  children,
  onApply,
  onReset,
  triggerLabel = '필터',
  triggerClassName,
}: MobileFilterSheetProps) {
  const [open, setOpen] = React.useState(false)

  const handleApply = () => {
    onApply()
    setOpen(false)
  }

  const handleReset = () => {
    onReset()
  }

  return (
    <>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'relative inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-base)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] shadow-sm transition-colors hover:bg-[var(--color-surface-sunken)]',
          triggerClassName
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        {triggerLabel}
        {activeFilterCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#10B981] px-1 text-[10px] font-bold text-white">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Sheet */}
      <MobileSheet
        open={open}
        onClose={() => setOpen(false)}
        title="필터 설정"
        initialSnap={0.9}
        snapPoints={[0.5, 0.9]}
      >
        {/* Filter controls */}
        <div className="py-4">{children}</div>

        {/* Sticky action bar */}
        <div className="sticky bottom-0 flex gap-3 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] py-4">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 rounded-xl border border-[var(--color-border-subtle)] py-3 text-sm font-medium text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-surface-sunken)]"
          >
            초기화
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-[2] rounded-xl bg-[var(--color-brand-deep)] py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-brand-bright)]"
          >
            {activeFilterCount > 0 ? `적용 (${activeFilterCount})` : '적용'}
          </button>
        </div>
      </MobileSheet>
    </>
  )
}
