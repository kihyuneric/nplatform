'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface SwipeTab {
  id: string
  label: string
  /** Optional badge count shown on the tab */
  badge?: number
  content: React.ReactNode
}

interface SwipeTabsProps {
  tabs: SwipeTab[]
  defaultTab?: string
  /** Controlled active tab */
  activeTab?: string
  onTabChange?: (id: string) => void
  className?: string
  /** Class applied to the tab bar */
  tabBarClassName?: string
  /** Class applied to the content area */
  contentClassName?: string
}

export function SwipeTabs({
  tabs,
  defaultTab,
  activeTab: controlledTab,
  onTabChange,
  className,
  tabBarClassName,
  contentClassName,
}: SwipeTabsProps) {
  const [internalTab, setInternalTab] = React.useState(
    defaultTab ?? tabs[0]?.id ?? ''
  )
  const activeId = controlledTab ?? internalTab
  const activeIndex = tabs.findIndex((t) => t.id === activeId)

  const tabBarRef = React.useRef<HTMLDivElement>(null)
  const activeTabRef = React.useRef<HTMLButtonElement>(null)
  const [indicatorStyle, setIndicatorStyle] = React.useState({ left: 0, width: 0 })

  // Drag-to-swipe state
  const dragStartX = React.useRef<number | null>(null)
  const [dragDelta, setDragDelta] = React.useState(0)

  const changeTab = React.useCallback(
    (id: string) => {
      if (!controlledTab) setInternalTab(id)
      onTabChange?.(id)
    },
    [controlledTab, onTabChange]
  )

  // Update animated underline position
  React.useEffect(() => {
    const bar = tabBarRef.current
    if (!bar) return

    const activeBtn = bar.querySelector<HTMLButtonElement>(
      `[data-tab-id="${activeId}"]`
    )
    if (!activeBtn) return

    const barRect = bar.getBoundingClientRect()
    const btnRect = activeBtn.getBoundingClientRect()
    setIndicatorStyle({
      left: btnRect.left - barRect.left,
      width: btnRect.width,
    })

    // Scroll the active tab into view
    activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' })
  }, [activeId])

  // Touch/mouse swipe handlers for content area
  const handlePointerDown = (e: React.PointerEvent) => {
    dragStartX.current = e.clientX
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return
    setDragDelta(e.clientX - dragStartX.current)
  }

  const handlePointerUp = () => {
    if (dragStartX.current === null) return
    const threshold = 60

    if (dragDelta < -threshold && activeIndex < tabs.length - 1) {
      changeTab(tabs[activeIndex + 1].id)
    } else if (dragDelta > threshold && activeIndex > 0) {
      changeTab(tabs[activeIndex - 1].id)
    }

    dragStartX.current = null
    setDragDelta(0)
  }

  const prevIndexRef = React.useRef(activeIndex)
  const direction = activeIndex > prevIndexRef.current ? 1 : -1
  React.useEffect(() => {
    prevIndexRef.current = activeIndex
  }, [activeIndex])

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Tab bar */}
      <div className="relative border-b border-[var(--color-border-subtle)]">
        <div
          ref={tabBarRef}
          className={cn(
            'no-scrollbar flex overflow-x-auto',
            tabBarClassName
          )}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeId
            return (
              <button
                key={tab.id}
                data-tab-id={tab.id}
                ref={isActive ? activeTabRef : undefined}
                onClick={() => changeTab(tab.id)}
                className={cn(
                  'relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                )}
              >
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#10B981] px-1 text-[10px] font-bold text-white">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Animated indicator */}
        <motion.div
          className="absolute bottom-0 h-0.5 rounded-full bg-[#10B981]"
          animate={indicatorStyle}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        />
      </div>

      {/* Content */}
      <div
        className={cn('relative overflow-hidden', contentClassName)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={activeId}
            initial={{ x: direction * 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -40, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
          >
            {tabs.find((t) => t.id === activeId)?.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
