'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ErrorModal from '@/components/ui/ErrorModal'
import Toast from '@/components/ui/Toast'
import { useFarmContext } from '@/context/FarmContext'

type Zone = {
  id: string
  name: string
  crop_type?: { default_unit: string | null; name_en: string | null } | null
}

type Props = {
  zoneId?: string
  farmId?: string
  onSuccess?: () => void
}

type MetricRow = {
  metric_name: string
  metric_value: string
  unit: string
}

export default function HarvestForm({ zoneId, farmId, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [zones, setZones] = useState<Zone[]>([])
  const [form, setForm] = useState({
    zone_id: zoneId || '',
    harvest_date: '',
    quantity: '',
    unit: '',
    quality_grade: '',
    notes: '',
  })
  const [prefilledZone, setPrefilledZone] = useState<Zone | null>(null)
  const [metrics, setMetrics] = useState<MetricRow[]>([])
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState({ open: false, message: '' })
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: '',
  })

  const validation = useMemo(() => {
    const errors: Record<string, string> = {}
    if (!form.zone_id) errors.zone_id = 'Zone is required.'
    if (!form.harvest_date) errors.harvest_date = 'Harvest date is required.'
    if (form.harvest_date && form.harvest_date > today) errors.harvest_date = 'Harvest date cannot be in the future.'
    const qty = Number(form.quantity)
    if (!Number.isFinite(qty) || qty <= 0) errors.quantity = 'Quantity must be positive.'
    return errors
  }, [form, today])

  const { activeFarm } = useFarmContext()
  const resolvedFarmId = farmId ?? activeFarm?.id

  useEffect(() => {
    if (zoneId || !resolvedFarmId) return

    const fetchZones = async () => {
      const { data } = await supabase
        .from('zones')
        .select('id, name, crop_type:crop_types(default_unit, name_en)')
        .eq('farm_id', resolvedFarmId)
        .order('name')

      setZones((data as Zone[] | null) || [])
    }

    fetchZones()
  }, [zoneId, resolvedFarmId])

  useEffect(() => {
    if (!zoneId) return

    const fetchZone = async () => {
      const { data } = await supabase
        .from('zones')
        .select('id, name, crop_type:crop_types(default_unit, name_en)')
        .eq('id', zoneId)
        .maybeSingle()

      const zone = data as Zone | null
      setPrefilledZone(zone)
      const defaultUnit = zone?.crop_type?.default_unit
      if (defaultUnit) {
        setForm((prev) => (prev.unit ? prev : { ...prev, unit: defaultUnit }))
      }
    }

    fetchZone()
  }, [zoneId])

  const selectedZone = useMemo(
    () => prefilledZone ?? zones.find((z) => z.id === form.zone_id) ?? null,
    [prefilledZone, zones, form.zone_id],
  )
  const unitPlaceholder = selectedZone?.crop_type?.default_unit
    ? `Unit (e.g. ${selectedZone.crop_type.default_unit})`
    : 'Unit'

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    if (name === 'zone_id') {
      const nextZone = zones.find((z) => z.id === value)
      const nextDefaultUnit = nextZone?.crop_type?.default_unit || ''
      setForm((prev) => {
        const prevDefaultUnit =
          zones.find((z) => z.id === prev.zone_id)?.crop_type?.default_unit || ''
        const unitIsAuto = !prev.unit || prev.unit === prevDefaultUnit
        return {
          ...prev,
          zone_id: value,
          unit: unitIsAuto ? nextDefaultUnit : prev.unit,
        }
      })
      return
    }
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (Object.keys(validation).length > 0) {
      setErrorModal({ open: true, message: Object.values(validation)[0] })
      return
    }
    setConfirmOpen(true)
  }

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false)
    setLoading(true)
    if (!resolvedFarmId) {
      setLoading(false)
      setErrorModal({
        open: true,
        message: 'No farm selected for this harvest.',
      })
      return
    }
    const res = await fetch(
      `/api/harvests?farm_id=${encodeURIComponent(resolvedFarmId)}`,
      {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zone_id: form.zone_id,
        harvest_date: form.harvest_date,
        quantity: Number(form.quantity),
        unit: form.unit,
        quality_grade: form.quality_grade || null,
        notes: form.notes || null,
        metrics: metrics
          .filter((m) => m.metric_name && m.metric_value)
          .map((m) => ({
            metric_name: m.metric_name,
            metric_value: Number(m.metric_value),
            unit: m.unit || null,
          })),
      }),
    })

    const payload = await res.json()
    setLoading(false)

    if (!res.ok) {
      setErrorModal({ open: true, message: payload?.error || 'Unable to save harvest.' })
      return
    }

    if (payload) {
      setForm({
        zone_id: zoneId || '',
        harvest_date: '',
        quantity: '',
        unit: zoneId ? prefilledZone?.crop_type?.default_unit || '' : '',
        quality_grade: '',
        notes: '',
      })
      setMetrics([])
      setToast({ open: true, message: 'Harvest record saved.' })
      onSuccess?.()
    }
  }

  const addMetric = () => {
    setMetrics((prev) => [...prev, { metric_name: '', metric_value: '', unit: '' }])
  }

  const updateMetric = (index: number, field: keyof MetricRow, value: string) => {
    setMetrics((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  const removeMetric = (index: number) => {
    setMetrics((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!zoneId && (
        <select
          name="zone_id"
          value={form.zone_id}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
        >
          <option value="">Select Zone</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      )}

      <input
        type="date"
        name="harvest_date"
        value={form.harvest_date}
        onChange={handleChange}
        required
        max={today}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
      />

      <input
        type="number"
        name="quantity"
        placeholder="Quantity"
        value={form.quantity}
        onChange={handleChange}
        required
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
      />

      <input
        type="text"
        name="unit"
        placeholder={unitPlaceholder}
        value={form.unit}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
      />

      <input
        type="text"
        name="quality_grade"
        placeholder="Grade (A / B / Mixed)"
        value={form.quality_grade}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
      />

      <textarea
        name="notes"
        placeholder="Notes"
        value={form.notes}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
      />

      <div className="rounded-xl border border-slate-200 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Quality Metrics</p>
          <button
            type="button"
            onClick={addMetric}
            className="text-xs font-semibold text-green-700 hover:underline"
          >
            + Add Metric
          </button>
        </div>
        {metrics.length === 0 ? (
          <p className="text-xs text-slate-400">No quality metrics added.</p>
        ) : (
          <div className="space-y-2">
            {metrics.map((metric, index) => (
              <div key={index} className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Metric name"
                  value={metric.metric_name}
                  onChange={(e) => updateMetric(index, 'metric_name', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
                <input
                  type="number"
                  placeholder="Value"
                  value={metric.metric_value}
                  onChange={(e) => updateMetric(index, 'metric_value', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Unit"
                    value={metric.unit}
                    onChange={(e) => updateMetric(index, 'unit', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeMetric(index)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700"
      >
        {loading ? 'Saving...' : 'Add Harvest'}
      </button>
      <ConfirmModal
        open={confirmOpen}
        title="Add harvest record?"
        message="This will save the harvest entry to the selected zone."
        confirmLabel="Save"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
      />
      <ErrorModal
        open={errorModal.open}
        title="Unable to save"
        message={errorModal.message}
        onClose={() =>
          setErrorModal((prev) => ({ ...prev, open: false }))
        }
      />
      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </form>
  )
}
