'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

// ─── Base Skeleton ────────────────────────────────────────────────────────

interface SkeletonPulseProps {
  className?: string
  variant?: 'default' | 'shimmer' | 'wave' | 'glow'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  width?: string | number
  height?: string | number
  style?: React.CSSProperties
}

export function SkeletonPulse({
  className,
  variant = 'shimmer',
  rounded = 'md',
  width,
  height,
  style,
}: SkeletonPulseProps) {
  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded]

  const baseClass = cn(
    'relative overflow-hidden bg-muted',
    roundedClass,
    className
  )

  const inlineStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...style,
  }

  if (variant === 'shimmer') {
    return (
      <div className={baseClass} style={inlineStyle}>
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
          }}
          animate={{ x: ['-100%', '200%'] }}
          transition={{
            repeat: Infinity,
            duration: 1.5,
            ease: 'linear',
          }}
        />
      </div>
    )
  }

  if (variant === 'wave') {
    return (
      <motion.div
        className={baseClass}
        style={inlineStyle}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{
          repeat: Infinity,
          duration: 1.8,
          ease: 'easeInOut',
        }}
      />
    )
  }

  if (variant === 'glow') {
    return (
      <motion.div
        className={cn(baseClass, 'shadow-none')}
        style={inlineStyle}
        animate={{
          boxShadow: [
            '0 0 0px rgba(27, 58, 92, 0)',
            '0 0 12px rgba(27, 58, 92, 0.3)',
            '0 0 0px rgba(27, 58, 92, 0)',
          ],
        }}
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: 'easeInOut',
        }}
      />
    )
  }

  // Default: pulse
  return (
    <motion.div
      className={baseClass}
      style={inlineStyle}
      animate={{ opacity: [1, 0.4, 1] }}
      transition={{
        repeat: Infinity,
        duration: 1.5,
        ease: 'easeInOut',
      }}
    />
  )
}

// ─── Preset Layouts ───────────────────────────────────────────────────────

/** Card skeleton for listing cards */
export function ListingCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-4 space-y-3', className)}>
      <div className="flex items-start gap-3">
        <SkeletonPulse width={48} height={48} rounded="lg" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse height={16} className="w-3/4" />
          <SkeletonPulse height={12} className="w-1/2" />
        </div>
        <SkeletonPulse width={60} height={20} rounded="full" />
      </div>
      <div className="space-y-2">
        <SkeletonPulse height={12} className="w-full" />
        <SkeletonPulse height={12} className="w-5/6" />
      </div>
      <div className="flex gap-2 pt-1">
        <SkeletonPulse width={80} height={28} rounded="md" />
        <SkeletonPulse width={80} height={28} rounded="md" />
        <SkeletonPulse className="ml-auto" width={100} height={28} rounded="md" />
      </div>
    </div>
  )
}

/** Table row skeleton */
export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonPulse
          key={i}
          height={14}
          className="flex-1"
          style={{ maxWidth: i === 0 ? '120px' : undefined }}
        />
      ))}
    </div>
  )
}

/** Dashboard KPI skeleton */
export function KpiCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-card p-5 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <SkeletonPulse height={14} width={80} />
        <SkeletonPulse height={32} width={32} rounded="lg" />
      </div>
      <SkeletonPulse height={32} width={120} />
      <SkeletonPulse height={12} width={100} />
    </div>
  )
}

/** Page-level skeleton */
export function PageSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-6 p-6', className)}>
      {/* Header */}
      <div className="space-y-2">
        <SkeletonPulse height={32} width={250} />
        <SkeletonPulse height={16} width={400} />
      </div>
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      {/* Content */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
