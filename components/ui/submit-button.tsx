'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import DS from '@/lib/design-system'

interface SubmitButtonProps {
  children: React.ReactNode
  isLoading?: boolean
  isSuccess?: boolean
  loadingText?: string
  successText?: string
  className?: string
  disabled?: boolean
  type?: 'submit' | 'button' | 'reset'
  onClick?: () => void
}

export function SubmitButton({
  children,
  isLoading,
  isSuccess,
  loadingText,
  successText,
  className,
  disabled,
  type = 'submit',
  onClick,
}: SubmitButtonProps) {
  const [showSuccess, setShowSuccess] = React.useState(false)

  React.useEffect(() => {
    if (isSuccess) {
      setShowSuccess(true)
      const timer = setTimeout(() => setShowSuccess(false), 1500)
      return () => clearTimeout(timer)
    }
  }, [isSuccess])

  const isDisabled = disabled || isLoading || showSuccess

  return (
    <motion.button
      className={cn(DS.button.primary, 'relative overflow-hidden', className)}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      whileTap={isDisabled ? undefined : { scale: 0.97 }}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.span
            key="loading"
            className="flex items-center gap-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{loadingText || '처리 중...'}</span>
          </motion.span>
        ) : showSuccess ? (
          <motion.span
            key="success"
            className="flex items-center gap-2 text-white"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            <motion.span
              animate={{
                scale: [1, 1.15, 1],
                boxShadow: [
                  '0 0 0 0 rgba(16,185,129,0)',
                  '0 0 0 6px rgba(16,185,129,0.3)',
                  '0 0 0 0 rgba(16,185,129,0)',
                ],
              }}
              transition={{ duration: 0.4 }}
              className="inline-flex rounded-full"
            >
              <Check className="h-4 w-4" />
            </motion.span>
            <span>{successText || '완료!'}</span>
          </motion.span>
        ) : (
          <motion.span
            key="default"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {children}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
