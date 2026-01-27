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

export default function HarvestForm({ zoneId, onSuccess }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [zones, setZones] = useState<Zone[]>([])
  const [form, setForm] = useState({
    zone_id: zoneId || '',
    harvest_date: '',
    quantity: '',
    unit: 'nuts',
    quality_grade: '',
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

    if (form.harvest_date && form.harvest_date > today) {
      setLoading(false)
      setErrorModal({
        open: true,
        message: 'Harvest date cannot be in the future.',
      })
      return
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      setLoading(false)
      setErrorModal({
        open: true,
        message: 'Please log in to add a harvest record.',
      })
      return
    }

    const { error } = await supabase.from('harvests').insert([
      {
        user_id: user.id,
        zone_id: form.zone_id,
        harvest_date: form.harvest_date,
        quantity: Number(form.quantity),
        unit: form.unit,
        quality_grade: form.quality_grade,
        notes: form.notes,
      },
    ])

    // const { data: userData, error: userError } =
    //   await supabase.auth.getUser()

    // if (userError || !userData.user) {
    //   setLoading(false)
    //   alert('You must be signed in to add a harvest record.')
    //   return
    // }

    // const { error } = await supabase.from('harvests').insert([
    //   {
    //     user_id: userData.user.id,
    //     zone_id: form.zone_id,
    //     harvest_date: form.harvest_date,
    //     quantity: Number(form.quantity),
    //     unit: form.unit,
    //     quality_grade: form.quality_grade,
    //     notes: form.notes,
    //   },
    // ])

    setLoading(false)

    if (!error) {
      setForm({
        zone_id: zoneId || '',
        harvest_date: '',
        quantity: '',
        unit: 'nuts',
        quality_grade: '',
        notes: '',
      })
      setToast({ open: true, message: 'Harvest record saved.' })
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
        placeholder="Unit (nuts / kg)"
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
