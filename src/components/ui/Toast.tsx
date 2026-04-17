'use client'

import { useEffect } from 'react'

type ToastTone = 'success' | 'error' | 'info'

type Props = {
  open: boolean
  message: string
  tone?: ToastTone
  durationMs?: number
  actionLabel?: string
  onAction?: () => void
  onClose: () => void
}

export default function Toast({
  open,
  message,
  tone = 'success',
  durationMs = 2400,
  actionLabel,
  onAction,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    const timer = setTimeout(onClose, durationMs)
    return () => clearTimeout(timer)
  }, [open, durationMs, onClose])

  if (!open) return null

  const toneStyles =
    tone === 'success'
      ? 'bg-green-600 text-white'
      : tone === 'error'
      ? 'bg-red-600 text-white'
      : 'bg-slate-900 text-white'

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-xs">
      <div className={`rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${toneStyles}`}>
        <div className="flex items-center gap-3">
          <span className="flex-1">{message}</span>
          {actionLabel && onAction && (
            <button
              type="button"
              onClick={() => {
                onAction()
                onClose()
              }}
              className="text-xs font-bold uppercase tracking-wide underline"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
