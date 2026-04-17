// ─── NPLatform Animation Library ──────────────────────────────────────────
// Single source of truth for all Framer Motion variants.
// Built on top of design-tokens.ts duration/easing primitives.
//
// Usage:
//   import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations'
//   <motion.div variants={staggerContainer} initial="hidden" animate="visible">
//     {items.map(i => <motion.div key={i} variants={staggerItem} />)}
//   </motion.div>
// ──────────────────────────────────────────────────────────────────────────

import type { Variants, Transition } from 'framer-motion'
import { duration, easing } from '@/lib/design-tokens'

// ── Transitions ──────────────────────────────────────────────────────────

export const transitions = {
  fast: { duration: duration.fast, ease: easing.standard } as Transition,
  base: { duration: duration.base, ease: easing.standard } as Transition,
  slow: { duration: duration.slow, ease: easing.standard } as Transition,
  spring: { ...easing.spring } as Transition,
  springStiff: { type: 'spring', stiffness: 400, damping: 30 } as Transition,
  springBouncy: { type: 'spring', stiffness: 260, damping: 20 } as Transition,
} as const

// ── Fade ─────────────────────────────────────────────────────────────────

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.base },
}

export const fadeOut: Variants = {
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: transitions.fast },
}

// ── Slide ────────────────────────────────────────────────────────────────

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
}

export const slideDown: Variants = {
  hidden: { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: transitions.base },
}

export const slideLeft: Variants = {
  hidden: { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: transitions.base },
}

export const slideRight: Variants = {
  hidden: { opacity: 0, x: -16 },
  visible: { opacity: 1, x: 0, transition: transitions.base },
}

// ── Scale ────────────────────────────────────────────────────────────────

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: transitions.spring },
}

export const scaleOut: Variants = {
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95, transition: transitions.fast },
}

// ── Stagger ──────────────────────────────────────────────────────────────

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.08,
    },
  },
}

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.12,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.base, ease: easing.standard },
  },
}

// ── Interactive ──────────────────────────────────────────────────────────

export const cardHover = {
  y: -2,
  boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
  transition: transitions.fast,
}

export const buttonPress = {
  scale: 0.97,
  transition: { duration: duration.instant },
}

export const tooltipEnter: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: transitions.fast },
  exit: { opacity: 0, scale: 0.96, y: 4, transition: transitions.fast },
}

// ── Feedback ─────────────────────────────────────────────────────────────

export const successPulse = {
  scale: [1, 1.15, 1],
  boxShadow: [
    '0 0 0 0 rgba(16, 185, 129, 0)',
    '0 0 0 8px rgba(16, 185, 129, 0.25)',
    '0 0 0 0 rgba(16, 185, 129, 0)',
  ],
  transition: { duration: 0.4, ease: 'easeInOut' },
}

export const errorShake = {
  x: [0, -6, 6, -4, 4, 0],
  transition: { duration: 0.4, ease: 'easeInOut' },
}

// ── Number/Counter ───────────────────────────────────────────────────────

export const numberTick: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 30,
}

// ── Page-level ───────────────────────────────────────────────────────────

export const pageEnter: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.slow, ease: easing.standard } },
}

export const pageExit: Variants = {
  visible: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: duration.fast, ease: easing.standard } },
}

// ── Expand/Collapse ──────────────────────────────────────────────────────

export const expandHeight: Variants = {
  hidden: { opacity: 0, height: 0, overflow: 'hidden' },
  visible: {
    opacity: 1,
    height: 'auto',
    overflow: 'hidden',
    transition: { duration: duration.base, ease: easing.standard },
  },
  exit: {
    opacity: 0,
    height: 0,
    overflow: 'hidden',
    transition: { duration: duration.fast, ease: easing.standard },
  },
}

// ── Float (for empty states / decorative) ────────────────────────────────

export const floatY = {
  y: [0, -8, 0],
  transition: {
    duration: 3,
    ease: 'easeInOut' as const,
    repeat: Infinity,
  },
}

// ── Shimmer (CSS keyframe reference) ─────────────────────────────────────
// Use this class name with the @keyframes shimmer defined in globals.css
export const SHIMMER_CLASS = 'animate-shimmer'
export const SHIMMER_DURATION = '1.5s'
