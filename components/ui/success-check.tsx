'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface SuccessCheckProps {
  size?: number
  className?: string
  color?: string
}

export function SuccessCheck({ size = 48, className, color = '#10B981' }: SuccessCheckProps) {
  const r = size / 2 - 2
  const circumference = 2 * Math.PI * r

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('inline-block', className)}
    >
      {/* Circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
      {/* Checkmark */}
      <motion.path
        d={`M${size * 0.28} ${size * 0.5} L${size * 0.44} ${size * 0.65} L${size * 0.72} ${size * 0.35}`}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
      />
    </svg>
  )
}
