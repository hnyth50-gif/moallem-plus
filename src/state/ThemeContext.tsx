import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { THEME_KEY } from '../lib/storage'
import type { ThemeMode } from '../lib/types'

// ============ سياق المظهر ============
// ثلاثة أوضاع: فاتح، داكن، أو اتباع تفضيل النظام. يُطبَّق قبل التحميل من index.html.

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (t: ThemeMode) => void
  isDark: boolean
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'dark') return true
  if (mode === 'system') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch {
      return false
    }
  }
  return false
}

function readInitialTheme(): ThemeMode {
  try {
    const v = window.localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* تجاهل */
  }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(readInitialTheme)
  const [isDark, setIsDark] = useState<boolean>(() => resolveDark(readInitialTheme()))

  useEffect(() => {
    const dark = resolveDark(theme)
    document.documentElement.classList.toggle('dark', dark)
    setIsDark(dark)
    // استماع لتغير تفضيل النظام في وضع system
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
      setIsDark(e.matches)
    }
    mq.addEventListener?.('change', listener)
    return () => mq.removeEventListener?.('change', listener)
  }, [theme])

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t)
    try {
      window.localStorage.setItem(THEME_KEY, t)
    } catch {
      /* تجاهل */
    }
  }, [])

  const value = useMemo(() => ({ theme, setTheme, isDark }), [theme, setTheme, isDark])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme خارج ThemeProvider')
  return ctx
}
