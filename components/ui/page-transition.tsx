'use client'

import * as React from 'react'
import { motion, AnimatePresence, Variants, MotionStyle } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// ─── Transition Presets ───────────────────────────────────────────────────

type TransitionVariant = 'fade' | 'slide-up' | 'slide-right' | 'scale' | 'blur-fade'

const variants: Record<TransitionVariant, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  'slide-up': {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  },
  'slide-right': {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.02 },
  },
  'blur-fade': {
    initial: { opacity: 0, filter: 'blur(8px)', y: 10 },
    animate: { opacity: 1, filter: 'blur(0px)', y: 0 },
    exit: { opacity: 0, filter: 'blur(4px)', y: -5 },
  },
}

const defaultTransition = {
  duration: 0.25,
  ease: 'easeInOut' as const,
}

// ─── Page Transition Wrapper ──────────────────────────────────────────────

interface PageTransitionProps {
  children: React.ReactNode
  variant?: TransitionVariant
  className?: string
  duration?: number
  /** If true, re-animates when pathname changes */
  animateOnNavigation?: boolean
}

export function PageTransition({
  children,
  variant = 'slide-up',
  className,
  duration = 0.25,
  animateOnNavigation = true,
}: PageTransitionProps) {
  const pathname = usePathname()
  const key = animateOnNavigation ? pathname : 'static'

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        variants={variants[variant]}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ ...defaultTransition, duration }}
        className={cn('w-full', className)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Section Reveal ───────────────────────────────────────────────────────

interface SectionRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  once?: boolean
}

export function SectionReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  once = true,
}: SectionRevealProps) {
  const directionMap = {
    up: { y: 24, x: 0 },
    down: { y: -24, x: 0 },
    left: { y: 0, x: 24 },
    right: { y: 0, x: -24 },
  }

  const { x, y } = directionMap[direction]

  return (
    <motion.div
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: '0px 0px -80px 0px' }}
      transition={{
        duration: 0.4,
        delay,
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Stagger Children ─────────────────────────────────────────────────────

interface StaggerContainerProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
  initialDelay?: number
}

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.08,
  initialDelay = 0,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            delayChildren: initialDelay,
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            hidden: { opacity: 0, y: 16 },
            visible: { opacity: 1, y: 0 },
          }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

// ─── Fade In ──────────────────────────────────────────────────────────────

export function FadeIn({
  children,
  className,
  delay = 0,
  duration = 0.3,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  duration?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
