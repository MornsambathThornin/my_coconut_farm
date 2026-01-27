'use client'

type Props = {
  open: boolean
  title: string
  message: string
  onClose: () => void
}

export default function ErrorModal({
  open,
  title,
  message,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">{title}</h3>
            <p className="mt-2 text-sm">{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-current/20 px-3 py-1 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
