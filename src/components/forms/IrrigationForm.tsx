'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ErrorModal from '@/components/ui/ErrorModal'
import Toast from '@/components/ui/Toast'
import { useFarmContext } from '@/context/FarmContext'
import { useTranslations } from '@/lib/useTranslations'

type Zone = {
  id: string
  name: string
}

type Props = {
  zoneId?: string
  farmId?: string
  onSuccess?: () => void
}

export default function IrrigationForm({ zoneId, farmId, onSuccess }: Props) {
  const { t } = useTranslations()
  const today = new Date().toISOString().split('T')[0]
  const [zones, setZones] = useState<Zone[]>([])
  const [form, setForm] = useState({
    zone_id: zoneId || '',
    irrigation_date: '',
    method: '',
    duration_minutes: '',
    water_source: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState({ open: false, message: '' })
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: '',
  })

  const validation = useMemo(() => {
    const errors: Record<string, string> = {}
    if (!form.zone_id) errors.zone_id = t('irrigationForm.errorZoneRequired')
    if (!form.irrigation_date) errors.irrigation_date = t('irrigationForm.errorDateRequired')
    if (form.irrigation_date && form.irrigation_date > today) errors.irrigation_date = t('irrigationForm.errorDateFuture')
    if (form.duration_minutes) {
      const duration = Number(form.duration_minutes)
      if (Number.isNaN(duration) || duration < 0) errors.duration_minutes = t('irrigationForm.errorDuration')
    }
    return errors
  }, [form, today, t])

  const { activeFarm } = useFarmContext()
  const resolvedFarmId = farmId ?? activeFarm?.id

  useEffect(() => {
    if (zoneId || !resolvedFarmId) return

    const fetchZones = async () => {
      const { data } = await supabase
        .from('zones')
        .select('id, name')
        .eq('farm_id', resolvedFarmId)
        .order('name')

      setZones(data || [])
    }

    fetchZones()
  }, [zoneId, resolvedFarmId])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
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
        message: t('irrigationForm.errorNoFarm'),
      })
      return
    }
    const res = await fetch(
      `/api/irrigation-logs?farm_id=${encodeURIComponent(resolvedFarmId)}`,
      {
        method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zone_id: form.zone_id,
        irrigation_date: form.irrigation_date,
        method: form.method || null,
        duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
        water_source: form.water_source || null,
        notes: form.notes || null,
      }),
    })

    const payload = await res.json()
    setLoading(false)

    if (!res.ok) {
      setErrorModal({ open: true, message: payload?.error || t('irrigationForm.errorGeneric') })
      return
    }

    if (payload) {
      setForm({
        zone_id: zoneId || '',
        irrigation_date: '',
        method: '',
        duration_minutes: '',
        water_source: '',
        notes: '',
      })
      setToast({ open: true, message: t('irrigationForm.savedToast') })
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!zoneId && (
        <select
          name="zone_id"
          value={form.zone_id}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        >
          <option value="">{t('irrigationForm.selectZone')}</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      )}

      <input
        type="date"
        name="irrigation_date"
        value={form.irrigation_date}
        onChange={handleChange}
        required
        max={today}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <input
        type="text"
        name="method"
        placeholder={t('irrigationForm.methodPlaceholder')}
        value={form.method}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <input
        type="number"
        name="duration_minutes"
        placeholder={t('irrigationForm.durationPlaceholder')}
        value={form.duration_minutes}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <input
        type="text"
        name="water_source"
        placeholder={t('irrigationForm.sourcePlaceholder')}
        value={form.water_source}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <textarea
        name="notes"
        placeholder={t('irrigationForm.notesPlaceholder')}
        value={form.notes}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {loading ? t('irrigationForm.submitting') : t('irrigationForm.submit')}
      </button>
      <ConfirmModal
        open={confirmOpen}
        title={t('irrigationForm.confirmTitle')}
        message={t('irrigationForm.confirmMessage')}
        confirmLabel={t('common.save')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSubmit}
      />
      <ErrorModal
        open={errorModal.open}
        title={t('common.unableToSave')}
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
