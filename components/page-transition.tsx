'use client'

import { motion } from 'framer-motion'
import { duration, easing } from '@/lib/design-tokens'

/**
 * IMPORTANT: Only animate `opacity` here.
 *
 * Animating `y` / `x` / any transform-related prop sets `transform: ...` on
 * this wrapper, which makes it a CSS containing block for any descendant
 * with `position: fixed`. That breaks `fixed inset-0` modals (they end up
 * positioned relative to this wrapper, not the viewport — so they appear
 * "way down the page" on scrollable pages).
 *
 * If you want a slide effect, render the modal via a React Portal to
 * document.body instead of adding transform here.
 */
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const pageTransition = {
  type: 'tween' as const,
  ease: [...easing.standard] as [number, number, number, number],
  duration: duration.base,
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      {children}
    </motion.div>
  )
}
