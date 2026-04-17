'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  defaultLocale,
  mergeTranslations,
  type Locale,
} from '@/lib/i18n'
import { getI18nStrings } from '@/lib/api/supabaseClient'

type I18nRow = {
  key: string
  en: string | null
  km: string | null
}

export function useTranslations(locale: Locale = defaultLocale) {
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const cacheRef = useRef<Record<Locale, Record<string, string>>>({
    en: {},
    km: {},
  })

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        if (cacheRef.current[locale] && Object.keys(cacheRef.current[locale]).length > 0) {
          setOverrides(cacheRef.current[locale])
          return
        }

        const data = (await getI18nStrings()) as I18nRow[] | null

        if (!isMounted || !data) return

        const merged = data.reduce<Record<string, string>>(
          (acc, item) => {
            acc[item.key] = item[locale] || item.en || ''
            return acc
          },
          {},
        )

        cacheRef.current[locale] = merged
        setOverrides(merged)
      } catch {
        // keep fallback translations only
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [locale])

  const translations = useMemo(
    () => mergeTranslations(locale, overrides),
    [locale, overrides],
  )

  const t = useMemo(
    () => (key: string, fallback?: string) => {
      return translations[key] ?? fallback ?? key
    },
    [translations],
  )

  return { t, loading }
}
