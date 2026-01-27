'use client'

type DateRange = {
  start: string
  end: string
}

type Props = {
  value: DateRange
  onChange: (next: DateRange) => void
  onReset?: () => void
}

export default function DateRangeFilter({
  value,
  onChange,
  onReset,
}: Props) {
  const today = new Date().toISOString().split('T')[0]
  const currentYear = new Date().getFullYear()
  const defaultRange = {
    start: `${currentYear}-01-01`,
    end: `${currentYear}-12-31`,
  }

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="text-sm">
          <span className="block text-white/80 mb-1">Start date</span>
          <input
            type="date"
            value={value.start}
            onChange={(e) =>
              onChange({ ...value, start: e.target.value })
            }
            max={value.end || today}
            className="w-full rounded-xl border border-white/20 bg-white/90 p-2 text-slate-900 focus:border-white/60 focus:ring-2 focus:ring-white/50"
          />
        </label>

        <label className="text-sm">
          <span className="block text-white/80 mb-1">End date</span>
          <input
            type="date"
            value={value.end}
            onChange={(e) =>
              onChange({ ...value, end: e.target.value })
            }
            min={value.start || undefined}
            max={today}
            className="w-full rounded-xl border border-white/20 bg-white/90 p-2 text-slate-900 focus:border-white/60 focus:ring-2 focus:ring-white/50"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => (onReset ? onReset() : onChange(defaultRange))}
        className="self-start rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/10 md:self-auto"
      >
        Reset to current year
      </button>
    </div>
  )
}
