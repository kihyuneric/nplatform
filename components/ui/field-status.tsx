'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type FieldState = 'idle' | 'validating' | 'valid' | 'invalid'

interface FieldStatusProps {
  state: FieldState
  className?: string
}

export function FieldStatus({ state, className }: FieldStatusProps) {
  return (
    <div className={cn('inline-flex items-center justify-center w-5 h-5', className)}>
      <AnimatePresence mode="wait">
        {state === 'validating' && (
          <motion.span
            key="validating"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.15 }}
          >
            <Loader2 className="h-4 w-4 text-[var(--color-text-muted)] animate-spin" />
          </motion.span>
        )}
        {state === 'valid' && (
          <motion.span
            key="valid"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 1,
              scale: [0.5, 1.15, 1],
            }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Check className="h-4 w-4 text-[var(--color-positive)]" />
          </motion.span>
        )}
        {state === 'invalid' && (
          <motion.span
            key="invalid"
            initial={{ opacity: 0, x: 0 }}
            animate={{
              opacity: 1,
              x: [0, -4, 4, -3, 3, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <X className="h-4 w-4 text-[var(--color-danger)]" />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}
