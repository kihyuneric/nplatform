'use client'

import * as React from 'react'

// 다크모드 제거 — 라이트 단일 테마 (McKinsey White Paper)
// next-themes 의존성을 제거하고, ThemeProvider 는 children 을 그대로 패스스루.

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <>{children}</>
}
