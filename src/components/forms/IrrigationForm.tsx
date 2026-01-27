'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ErrorModal from '@/components/ui/ErrorModal'
import Toast from '@/components/ui/Toast'

type Zone = {
  id: string
  name: string
}

type Props = {
  zoneId?: string
  onSuccess?: () => void
}

export default function IrrigationForm({ zoneId, onSuccess }: Props) {
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

  useEffect(() => {
    if (zoneId) return

    const fetchZones = async () => {
      const { data } = await supabase
        .from('zones')
        .select('id, name')
        .order('name')

      setZones(data || [])
    }

    fetchZones()
  }, [zoneId])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setConfirmOpen(true)
  }

  const handleConfirmSubmit = async () => {
    setConfirmOpen(false)
    setLoading(true)

    if (form.irrigation_date && form.irrigation_date > today) {
      setLoading(false)
      setErrorModal({
        open: true,
        message: 'Irrigation date cannot be in the future.',
      })
      return
    }

    // const { data: userData, error: userError } =
    //   await supabase.auth.getUser()

    // if (userError || !userData.user) {
    //   setLoading(false)
    //   alert('You must be signed in to add an irrigation log.')
    //   return
    // }

    // const { error } = await supabase.from('irrigation_logs').insert([
    //   {
    //     user_id: userData.user.id,
    //     zone_id: form.zone_id,
    //     irrigation_date: form.irrigation_date,
    //     method: form.method,
    //     duration_minutes: form.duration_minutes
    //       ? Number(form.duration_minutes)
    //       : null,
    //     water_source: form.water_source,
    //     notes: form.notes,
    //   },
    // ])

    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
     setLoading(false)
     setErrorModal({
       open: true,
       message: 'Please log in to add an irrigation log.',
     })
     return
   }

    const { error } = await supabase.from('irrigation_logs').insert([
      {
        user_id: user?.id,
        zone_id: form.zone_id,
        irrigation_date: form.irrigation_date,
        method: form.method,
        duration_minutes: form.duration_minutes
          ? Number(form.duration_minutes)
          : null,
        water_source: form.water_source,
        notes: form.notes,
      },
    ])


    setLoading(false)

    if (!error) {
      setForm({
        zone_id: zoneId || '',
        irrigation_date: '',
        method: '',
        duration_minutes: '',
        water_source: '',
        notes: '',
      })
      setToast({ open: true, message: 'Irrigation log saved.' })
      onSuccess?.()
    } else {
      setErrorModal({
        open: true,
        message: error.message,
      })
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
        placeholder="Method (Drip / Hose / Sprinkler)"
        value={form.method}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <input
        type="number"
        name="duration_minutes"
        placeholder="Duration (minutes)"
        value={form.duration_minutes}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <input
        type="text"
        name="water_source"
        placeholder="Water source (Well / Pond / Rain)"
        value={form.water_source}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <textarea
        name="notes"
        placeholder="Notes"
        value={form.notes}
        onChange={handleChange}
        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {loading ? 'Saving...' : 'Add Irrigation'}
      </button>
      <ConfirmModal
        open={confirmOpen}
        title="Add irrigation log?"
        message="This will save the irrigation entry to the selected zone."
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
