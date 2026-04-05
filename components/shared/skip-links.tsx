"use client"

/**
 * Skip navigation links for keyboard accessibility (WCAG AA).
 * Renders visually hidden links that become visible on focus.
 */
export function SkipLinks() {
  return (
    <div className="skip-links">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#1B3A5C] focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2"
      >
        본문으로 건너뛰기
      </a>
      <a
        href="#main-nav"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-48 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-[#1B3A5C] focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#10B981] focus:ring-offset-2"
      >
        네비게이션으로 건너뛰기
      </a>
    </div>
  )
}
