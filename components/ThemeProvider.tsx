'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from 'next-themes'

export type Theme = 'light' | 'dark' | 'system'
export type FontSize = 'small' | 'standard' | 'large'

interface DisplayPreferencesValue {
  fontSize: FontSize
  setFontSize: (fontSize: FontSize) => void
}

const DisplayPreferencesContext = createContext<DisplayPreferencesValue | null>(null)

function DisplayPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('standard')

  useEffect(() => {
    const savedFontSize = localStorage.getItem('goalcircle.font-size')
    const nextFontSize: FontSize = savedFontSize === 'small' || savedFontSize === 'large'
      ? savedFontSize
      : 'standard'
    document.documentElement.dataset.fontSize = nextFontSize
    const timer = window.setTimeout(() => setFontSizeState(nextFontSize), 0)
    return () => window.clearTimeout(timer)
  }, [])

  const setFontSize = (nextFontSize: FontSize) => {
    setFontSizeState(nextFontSize)
    localStorage.setItem('goalcircle.font-size', nextFontSize)
    document.documentElement.dataset.fontSize = nextFontSize
  }

  return (
    <DisplayPreferencesContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </DisplayPreferencesContext.Provider>
  )
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <DisplayPreferencesProvider>{children}</DisplayPreferencesProvider>
    </NextThemesProvider>
  )
}

export function useDisplayPreferences() {
  const context = useContext(DisplayPreferencesContext)
  if (!context) throw new Error('useDisplayPreferences must be used within ThemeProvider')
  return context
}

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useNextTheme()

  return {
    theme: (theme as Theme | undefined) ?? 'dark',
    resolvedTheme: (resolvedTheme as 'light' | 'dark' | undefined) ?? 'light',
    setTheme: (nextTheme: Theme) => setTheme(nextTheme),
  }
}
