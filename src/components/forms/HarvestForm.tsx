'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'

type Zone = {
  id: string
  name: string
}

type Props = {
  zoneId?: string
  onSuccess?: () => void
}

export default function HarvestForm({ zoneId, onSuccess }: Props) {
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
  const [successMessage, setSuccessMessage] = useState('')

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
    if (successMessage) {
      setSuccessMessage('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setSuccessMessage('')

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      alert("User not authenticated. Please log in.")
      setLoading(false)
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
      setSuccessMessage('Harvest record saved.')
      onSuccess?.()
    } else {
      alert(error.message)
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
          className="w-full border p-2 rounded"
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
        className="w-full border p-2 rounded"
      />

      <input
        type="number"
        name="quantity"
        placeholder="Quantity"
        value={form.quantity}
        onChange={handleChange}
        required
        className="w-full border p-2 rounded"
      />

      <input
        type="text"
        name="unit"
        placeholder="Unit (nuts / kg)"
        value={form.unit}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        type="text"
        name="quality_grade"
        placeholder="Grade (A / B / Mixed)"
        value={form.quality_grade}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <textarea
        name="notes"
        placeholder="Notes"
        value={form.notes}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <button
        type="submit"
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        {loading ? 'Saving...' : 'Add Harvest'}
      </button>
      {successMessage ? (
        <p className="text-sm text-green-700">
          {successMessage}
        </p>
      ) : null}
    </form>
  )
}
