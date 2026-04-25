/**
 * components/motion/presets.ts · Phase H7
 *
 * NPLatform 표준 Framer Motion variants — 페이지·카드·모달 모션 일관화.
 *
 * 사용:
 *   import { fadeIn, slideUp, staggerChildren } from "@/components/motion/presets"
 *
 *   <motion.div variants={fadeIn} initial="hidden" animate="visible">...</motion.div>
 *
 *   <motion.div variants={staggerChildren}>
 *     <motion.div variants={slideUp}>아이템 1</motion.div>
 *     <motion.div variants={slideUp}>아이템 2</motion.div>
 *   </motion.div>
 */

import type { Variants } from "framer-motion"

// ─── 단일 element preset ──────────────────────────────────────

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
}

export const slideUp: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
}

export const slideDown: Variants = {
  hidden:  { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
}

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } },
}

export const slideInRight: Variants = {
  hidden:  { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
}

// ─── 컨테이너 (자식들 stagger) ────────────────────────────────

export const staggerChildren: Variants = {
  hidden:  { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
}

export const staggerSlow: Variants = {
  hidden:  { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.10,
      delayChildren: 0.08,
    },
  },
}

// ─── 페이지 전환 ──────────────────────────────────────────────

export const pageEnter: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } },
}

// ─── 표준 hover/press 인터랙션 ───────────────────────────────

export const hoverLift = {
  whileHover: { y: -2, transition: { duration: 0.15, ease: [0, 0, 0.2, 1] } },
  whileTap:   { y: 0, transition: { duration: 0.1 } },
}

// ─── 표준 transition 객체 (단독 사용) ────────────────────────

export const transitions = {
  fast:   { duration: 0.15, ease: [0, 0, 0.2, 1] },
  base:   { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
  slow:   { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
  spring: { type: "spring" as const, stiffness: 320, damping: 28 },
} as const
