'use client'

import { useLocale } from '@/context/LocaleContext'
import type { Locale } from '@/lib/i18n'

const options: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'km', label: 'ខ្មែរ' },
]

export default function LocaleSwitcher() {
  const { locale, setLocale } = useLocale()

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex rounded-xl bg-slate-800/60 p-1 border border-slate-700/50"
    >
      {options.map((opt) => {
        const active = locale === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLocale(opt.value)}
            aria-pressed={active}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              active
                ? 'bg-green-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
