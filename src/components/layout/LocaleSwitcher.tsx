'use client'

import { useLocale } from '@/context/LocaleContext'
import type { Locale } from '@/lib/i18n'

const options: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'km', label: 'ខ្មែរ' },
]

type Props = {
  variant?: 'dark' | 'light'
}

export default function LocaleSwitcher({ variant = 'dark' }: Props) {
  const { locale, setLocale } = useLocale()

  const containerClass =
    variant === 'light'
      ? 'inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200'
      : 'inline-flex rounded-xl bg-slate-800/60 p-1 border border-slate-700/50'

  const inactiveClass =
    variant === 'light'
      ? 'text-slate-500 hover:text-slate-900'
      : 'text-slate-400 hover:text-slate-100'

  return (
    <div role="group" aria-label="Language" className={containerClass}>
      {options.map((opt) => {
        const active = locale === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLocale(opt.value)}
            aria-pressed={active}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              active ? 'bg-green-600 text-white shadow' : inactiveClass
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
