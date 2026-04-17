"use client"

// ─── SafeModalPortal ────────────────────────────────────────────────────────
// Mounts modal/overlay content to `document.body` via React.createPortal so
// `position: fixed` descendants are NEVER affected by ancestor `transform`,
// `perspective`, `filter`, or `contain` (CSS containing-block trap).
//
// Background:
//   In Apr 2026 we hit a bug where the bid participation modal rendered far
//   below the viewport. Root cause: `#main-content` had a `transform` keyframe
//   which created a containing block, causing `position: fixed` modals nested
//   inside it to be positioned relative to <main> instead of the viewport.
//   See `app/globals.css` near `#main-content { animation: page-enter ... }`.
//
// Rule (CSS spec):
//   When an ancestor has any of {transform, perspective, filter, will-change,
//   contain: paint|layout|strict|content, backdrop-filter} set to a non-`none`
//   value, it becomes the containing block for `position: fixed` descendants
//   instead of the viewport. The only safe escape is to render outside that
//   ancestor — which is exactly what a Portal to <body> does.
//
// Usage:
//   import { SafeModalPortal } from "@/components/ui/safe-modal-portal"
//   {open && (
//     <SafeModalPortal>
//       <div className="fixed inset-0 z-50 ...">...</div>
//     </SafeModalPortal>
//   )}
//
// Defensive check:
//   In dev, walks up the parent tree of the mount point and warns if any
//   ancestor has a containing-block-creating style. (Disabled in production.)
// ─────────────────────────────────────────────────────────────────────────────

import * as React from "react"
import { createPortal } from "react-dom"

interface SafeModalPortalProps {
  /** Modal / overlay content. Should contain the `position: fixed` root. */
  children: React.ReactNode
  /**
   * Optional explicit container. Defaults to `document.body`.
   * Pass a different element only if you need scoped portaling (rare).
   */
  container?: Element | null
}

/**
 * Renders children into `document.body` (or a supplied container) so that any
 * `position: fixed` descendant escapes ancestor containing-block traps.
 *
 * - SSR-safe: returns `null` until mounted on the client.
 * - Reactive to container changes (re-portals if container prop changes).
 * - Dev-only: warns once if a transform/filter ancestor is detected near the
 *   intended mount point of the original parent (helps locate offending CSS).
 */
export function SafeModalPortal({ children, container }: SafeModalPortalProps) {
  const [mounted, setMounted] = React.useState(false)
  const sentinelRef = React.useRef<HTMLSpanElement | null>(null)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Dev-only ancestor scan: only runs once on mount, only in development.
  React.useEffect(() => {
    if (process.env.NODE_ENV === "production") return
    if (!sentinelRef.current) return
    const offender = findContainingBlockOffender(sentinelRef.current)
    if (offender) {
      // eslint-disable-next-line no-console
      console.warn(
        "[SafeModalPortal] Modal was originally rendered inside an element " +
          "that creates a CSS containing block for fixed-position descendants. " +
          "Without the portal, this would have broken `position: fixed`. " +
          "Offending ancestor:",
        offender.element,
        "Reason:",
        offender.reason
      )
    }
  }, [])

  // Render an invisible sentinel where the component was mounted (for the dev
  // ancestor walk) plus the actual portal to body.
  return (
    <>
      <span ref={sentinelRef} aria-hidden="true" style={{ display: "none" }} />
      {mounted
        ? createPortal(children, container ?? document.body)
        : null}
    </>
  )
}

// ── Dev-only helpers ────────────────────────────────────────────────────────

interface Offender {
  element: Element
  reason: string
}

/**
 * Walks up from `start` and returns the first ancestor whose computed style
 * creates a containing block for fixed-position descendants. Returns null if
 * no such ancestor exists.
 *
 * NOTE: This walks the *original* DOM position (the sentinel), not the
 * portaled subtree. That's intentional — we want to catch the trap that the
 * portal is preventing.
 */
function findContainingBlockOffender(start: Element): Offender | null {
  let node: Element | null = start.parentElement
  while (node && node !== document.documentElement) {
    const cs = window.getComputedStyle(node)
    if (cs.transform && cs.transform !== "none") {
      return { element: node, reason: `transform: ${cs.transform}` }
    }
    if (cs.perspective && cs.perspective !== "none") {
      return { element: node, reason: `perspective: ${cs.perspective}` }
    }
    if (cs.filter && cs.filter !== "none") {
      return { element: node, reason: `filter: ${cs.filter}` }
    }
    const wc = (cs as CSSStyleDeclaration & { willChange?: string }).willChange
    if (wc && /(transform|perspective|filter)/.test(wc)) {
      return { element: node, reason: `will-change: ${wc}` }
    }
    if (cs.contain && /(paint|layout|strict|content)/.test(cs.contain)) {
      return { element: node, reason: `contain: ${cs.contain}` }
    }
    const bf = (cs as CSSStyleDeclaration & { backdropFilter?: string })
      .backdropFilter
    if (bf && bf !== "none") {
      return { element: node, reason: `backdrop-filter: ${bf}` }
    }
    node = node.parentElement
  }
  return null
}

export default SafeModalPortal
