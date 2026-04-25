'use client'

import * as React from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useScrollDirection } from '@/hooks/use-scroll-direction'

export interface FabAction {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  /** Tailwind background colour class. Defaults to accent green */
  colorClass?: string
}

interface FabProps {
  actions: FabAction[]
  /** Tailwind class for the main button background. Defaults to primary navy */
  mainColorClass?: string
  /** Extra bottom offset when a mobile tab bar is visible (in px). Defaults to 72 */
  bottomOffset?: number
  className?: string
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.85 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: i * 0.06, type: 'spring' as const, stiffness: 350, damping: 25 },
  }),
  exit: (i: number) => ({
    opacity: 0,
    y: 12,
    scale: 0.85,
    transition: { delay: i * 0.04 },
  }),
}

export function Fab({
  actions,
  mainColorClass = 'bg-[#1B3A5C]',
  bottomOffset = 72,
  className,
}: FabProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const scrollDirection = useScrollDirection()

  // Hide FAB when scrolling down, show when scrolling up (or stopped)
  const isVisible = scrollDirection !== 'down'

  // Close action menu when FAB hides
  React.useEffect(() => {
    if (!isVisible) setIsOpen(false)
  }, [isVisible])

  return (
    <>
      {/* Backdrop – closes the menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="fab-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div
        className={cn('fixed right-4 z-50 flex flex-col-reverse items-end gap-3', className)}
        style={{ bottom: bottomOffset }}
        animate={{ y: isVisible ? 0 : 100, opacity: isVisible ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Main FAB button */}
        <motion.button
          type="button"
          aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
          onClick={() => setIsOpen((v) => !v)}
          whileTap={{ scale: 0.92 }}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-full shadow-xl ring-2 ring-white/20 transition-colors',
            mainColorClass
          )}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            {isOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Plus className="h-6 w-6 text-white" />
            )}
          </motion.div>
        </motion.button>

        {/* Sub-action buttons */}
        <AnimatePresence>
          {isOpen && (
            <div className="flex flex-col-reverse items-end gap-3">
              {actions.map((action, i) => (
                <motion.div
                  key={action.id}
                  custom={i}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="flex items-center gap-2"
                >
                  {/* Label bubble */}
                  <span className="rounded-lg bg-[var(--color-surface-elevated)] px-3 py-1.5 text-sm font-medium text-[var(--color-text-primary)] shadow-md">
                    {action.label}
                  </span>

                  {/* Icon button */}
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      action.onClick()
                      setIsOpen(false)
                    }}
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-full shadow-lg',
                      action.colorClass ?? 'bg-[#14161A]'
                    )}
                  >
                    <span className="text-white">{action.icon}</span>
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
