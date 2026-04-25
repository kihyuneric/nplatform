/**
 * components/design-system/index.ts · Phase H 통합 진입점
 *
 * NPLatform Design System 모든 프리미티브의 단일 import 경로.
 *
 * 사용:
 *   import {
 *     // Typography (H2)
 *     Type,
 *     // Form (H3 · H4)
 *     FormField, NplInput, NplTextarea, NplSelect, NPL_INPUT_CLASS,
 *     // Overlay (H5)
 *     NplModal, NplModalFooter, useScrollToTop,
 *     // Feedback (H7)
 *     Skeleton, SkeletonText, SkeletonCard,
 *     // Motion (H7)
 *     fadeIn, slideUp, scaleIn, staggerChildren, hoverLift,
 *   } from "@/components/design-system"
 *
 * 글로벌 CSS 클래스 (className 직접 사용 가능):
 *   · npl-input · npl-input-textarea · npl-input-select   (H3)
 *   · npl-surface-card · npl-surface-card-raised
 *     · npl-surface-sunken · npl-surface-subtle           (H1)
 *   · npl-skeleton                                        (H7)
 *
 * 디자인 토큰 (CSS vars in globals.css):
 *   · --color-text-primary · -secondary · -tertiary · -muted
 *   · --color-surface-base · -elevated · -overlay
 *   · --color-border-subtle · -default · -strong
 *   · --color-brand-deepest · -deep · -dark · -mid · -bright · -light
 *   · --color-positive · -warning · -danger
 *   · --shadow-card · -card-hover · -modal · -popover
 *   · --motion-fast · -base · -slow · -spring
 *
 * 기획서: docs/NPLatform_Phase_H_Design_System_2026Q2.md
 */

// H2 · Typography
export { Type, type TypeProps, type TypeVariant, type TypeTone } from "../typography"

// H3 · H4 · Form System
export {
  FormField,
  NplInput,
  NplTextarea,
  NplSelect,
  NPL_INPUT_CLASS,
  type FormFieldProps,
} from "../form"

// H5 · Overlay
export {
  NplModal,
  NplModalFooter,
  useScrollToTop,
  type NplModalProps,
} from "../overlay"

// H7 · Feedback
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  type SkeletonProps,
} from "../feedback"

// H7 · Motion
export {
  fadeIn,
  slideUp,
  slideDown,
  scaleIn,
  slideInRight,
  staggerChildren,
  staggerSlow,
  pageEnter,
  hoverLift,
  transitions,
} from "../motion/presets"
