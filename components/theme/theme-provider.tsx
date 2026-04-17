'use client'

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  storageKey = 'nplatform-theme',
  attribute = 'class',
  enableSystem = false,
  disableTransitionOnChange = false,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute as any}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      storageKey={storageKey}
      disableTransitionOnChange={disableTransitionOnChange}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
