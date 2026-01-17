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
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="text-sm">
          <span className="block text-gray-600 mb-1">Start date</span>
          <input
            type="date"
            value={value.start}
            onChange={(e) =>
              onChange({ ...value, start: e.target.value })
            }
            className="w-full border p-2 rounded"
          />
        </label>

        <label className="text-sm">
          <span className="block text-gray-600 mb-1">End date</span>
          <input
            type="date"
            value={value.end}
            onChange={(e) =>
              onChange({ ...value, end: e.target.value })
            }
            className="w-full border p-2 rounded"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="self-start rounded border px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 md:self-auto"
      >
        Reset to current year
      </button>
    </div>
  )
}
