'use client'

import * as React from 'react'

// ─── Focusable Element Selectors ─────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.closest('[hidden]') && !el.closest('[inert]')
  )
}

// ─── Focus Trap ───────────────────────────────────────────────────────────

interface FocusTrapProps {
  children: React.ReactNode
  /** Whether the focus trap is active */
  active: boolean
  /** Element to focus on activation (defaults to first focusable) */
  initialFocusRef?: React.RefObject<HTMLElement>
  /** Element to return focus to on deactivation */
  returnFocusRef?: React.RefObject<HTMLElement>
  /** Whether to return focus when trap deactivates */
  returnFocus?: boolean
  /** Container element props */
  containerProps?: React.HTMLAttributes<HTMLDivElement>
}

export function FocusTrap({
  children,
  active,
  initialFocusRef,
  returnFocusRef,
  returnFocus = true,
  containerProps,
}: FocusTrapProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const savedFocusRef = React.useRef<Element | null>(null)

  // Save current focus when activating
  React.useEffect(() => {
    if (active) {
      savedFocusRef.current = document.activeElement

      // Focus initial element or first focusable
      const setInitialFocus = () => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus()
        } else if (containerRef.current) {
          const focusable = getFocusableElements(containerRef.current)
          focusable[0]?.focus()
        }
      }

      // Small delay to ensure DOM is ready
      requestAnimationFrame(setInitialFocus)
    } else if (!active && returnFocus) {
      // Restore focus
      const target = returnFocusRef?.current ?? (savedFocusRef.current as HTMLElement | null)
      target?.focus()
    }
  }, [active, returnFocus, initialFocusRef, returnFocusRef])

  // Handle Tab key
  React.useEffect(() => {
    if (!active) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !containerRef.current) return

      const focusable = getFocusableElements(containerRef.current)
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }

      const firstEl = focusable[0]
      const lastEl = focusable[focusable.length - 1]
      const activeEl = document.activeElement

      if (e.shiftKey) {
        // Shift+Tab: wrap to last
        if (activeEl === firstEl || !containerRef.current.contains(activeEl)) {
          e.preventDefault()
          lastEl.focus()
        }
      } else {
        // Tab: wrap to first
        if (activeEl === lastEl || !containerRef.current.contains(activeEl)) {
          e.preventDefault()
          firstEl.focus()
        }
      }
    }

    // Handle Escape
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const target = returnFocusRef?.current ?? (savedFocusRef.current as HTMLElement | null)
        target?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [active, returnFocusRef])

  return (
    <div ref={containerRef} {...containerProps}>
      {children}
    </div>
  )
}

// ─── useFocusTrap Hook ────────────────────────────────────────────────────

export function useFocusTrap<T extends HTMLElement = HTMLDivElement>(active: boolean) {
  const containerRef = React.useRef<T>(null)
  const savedFocusRef = React.useRef<Element | null>(null)

  React.useEffect(() => {
    if (active) {
      savedFocusRef.current = document.activeElement

      requestAnimationFrame(() => {
        if (containerRef.current) {
          const focusable = getFocusableElements(containerRef.current)
          focusable[0]?.focus()
        }
      })

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Tab' || !containerRef.current) return

        const focusable = getFocusableElements(containerRef.current)
        if (focusable.length === 0) {
          e.preventDefault()
          return
        }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const current = document.activeElement

        if (e.shiftKey && current === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && current === last) {
          e.preventDefault()
          first.focus()
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        ;(savedFocusRef.current as HTMLElement | null)?.focus()
      }
    }
  }, [active])

  return containerRef
}
