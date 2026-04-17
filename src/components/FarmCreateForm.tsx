"use client"

import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useFarmContext, type FarmRecord } from '@/context/FarmContext'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ZoneDrawMap from '@/components/maps/ZoneDrawMap'

type Props = {
  onSuccess?: (farm: FarmRecord) => void
}

export default function FarmCreateForm({ onSuccess }: Props) {
  const { createFarm, loading, setActiveFarmId } = useFarmContext()
  const [form, setForm] = useState({ name: '', location: '', total_area_ha: '' })
  const [boundary, setBoundary] = useState<[number, number][]>([])
  const [error, setError] = useState<string | null>(null)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const validation = useMemo(() => {
    const errors: Record<string, string> = {}
    const name = form.name.trim()
    if (!name) errors.name = 'Farm name is required'
    else if (name.length > 100) errors.name = 'Farm name is too long'

    const location = form.location.trim()
    if (location.length > 120) errors.location = 'Location must be 120 characters or less'

    if (form.total_area_ha) {
      const value = Number(form.total_area_ha)
      if (Number.isNaN(value)) errors.total_area_ha = 'Total area must be a number'
      else if (value < 0) errors.total_area_ha = 'Total area must be zero or greater'
    }

    return errors
  }, [form])

  const showFieldErrors = submitAttempted
  const isValid = Object.keys(validation).length === 0

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError(null)
  }

  const handleAreaChange = useCallback((areaHa: number) => {
    if (!Number.isFinite(areaHa) || areaHa <= 0) {
      setForm((prev) => ({ ...prev, total_area_ha: '' }))
      return
    }
    setForm((prev) => ({
      ...prev,
      total_area_ha: areaHa.toFixed(2),
    }))
  }, [])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!isValid) return
    setError(null)
    setConfirmOpen(true)
  }

  const handleConfirmCreate = async () => {
    setError(null)
    try {
      const created = await createFarm({
        name: form.name.trim(),
        location: form.location.trim() || null,
        total_area_ha: form.total_area_ha ? Number(form.total_area_ha) : null,
        notes: null,
        boundary: boundary.length ? boundary : null,
      })
      setConfirmOpen(false)
      setForm({ name: '', location: '', total_area_ha: '' })
      setBoundary([])
      setSubmitAttempted(false)
      if (created.id) setActiveFarmId(created.id)
      onSuccess?.(created)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to create farm'
      setError(message)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="grid gap-4">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="farm-name" className="mb-1 block text-sm font-medium text-slate-700">
            Farm name
          </label>
          <input
            id="farm-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="e.g. North Coconut Grove"
            className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            aria-invalid={showFieldErrors && !!validation.name}
            aria-describedby={showFieldErrors && validation.name ? 'farm-name-error' : undefined}
          />
          {showFieldErrors && validation.name && (
            <p id="farm-name-error" className="mt-1 text-sm text-red-600" role="alert">
              {validation.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="farm-location" className="mb-1 block text-sm font-medium text-slate-700">
            Location
          </label>
          <input
            id="farm-location"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="e.g. Province, region"
            className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            aria-invalid={showFieldErrors && !!validation.location}
            aria-describedby={showFieldErrors && validation.location ? 'farm-location-error' : undefined}
          />
          {showFieldErrors && validation.location && (
            <p id="farm-location-error" className="mt-1 text-sm text-red-600" role="alert">
              {validation.location}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="farm-area" className="mb-1 block text-sm font-medium text-slate-700">
            Total area (ha)
          </label>
          <input
            id="farm-area"
            name="total_area_ha"
            value={form.total_area_ha}
            onChange={handleChange}
            placeholder="Optional — or draw boundary below"
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
            aria-invalid={showFieldErrors && !!validation.total_area_ha}
            aria-describedby={showFieldErrors && validation.total_area_ha ? 'farm-area-error' : undefined}
          />
          {showFieldErrors && validation.total_area_ha && (
            <p id="farm-area-error" className="mt-1 text-sm text-red-600" role="alert">
              {validation.total_area_ha}
            </p>
          )}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Creating…' : 'Create farm'}
          </button>
        </div>
      </form>
      <div className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-64 w-full">
          <ZoneDrawMap
            boundary={boundary}
            onBoundaryChange={setBoundary}
            onAreaChange={handleAreaChange}
            zoom={14}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Use the drawing tools to outline your farm boundary; the area input will update automatically.
      </p>
      <ConfirmModal
        open={confirmOpen}
        title="Create farm?"
        message="This will create a new farm profile with the provided details."
        confirmLabel={loading ? 'Creating…' : 'Create'}
        loading={loading}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmCreate}
      />
    </div>
  )
}
