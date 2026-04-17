'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { defaultLocale, type Locale } from '@/lib/i18n'

const STORAGE_KEY = 'farm-dashboard.locale'

type LocaleContextValue = {
  locale: Locale
  setLocale: (next: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'km') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading persisted locale requires a post-mount setState to avoid SSR hydration mismatch
      setLocaleState(saved)
    }
  }, [])

  const setLocale = (next: Locale) => {
    setLocaleState(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }

  const value = useMemo(() => ({ locale, setLocale }), [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) {
    return { locale: defaultLocale, setLocale: () => {} }
  }
  return ctx
}
