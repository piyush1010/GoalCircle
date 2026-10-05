'use client'

import React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from 'next-themes'

export type Theme = 'light' | 'dark' | 'system'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}

export function useTheme() {
  const { theme, setTheme } = useNextTheme()

  return {
    theme: (theme as Theme | undefined) ?? 'dark',
    setTheme: (nextTheme: Theme) => setTheme(nextTheme),
  }
}
