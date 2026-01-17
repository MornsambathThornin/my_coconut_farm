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

export default function IrrigationForm({ zoneId, onSuccess }: Props) {
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
     alert("User not authenticated. Please log in.")
     setLoading(false)
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
      setSuccessMessage('Irrigation log saved.')
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
        name="irrigation_date"
        value={form.irrigation_date}
        onChange={handleChange}
        required
        className="w-full border p-2 rounded"
      />

      <input
        type="text"
        name="method"
        placeholder="Method (Drip / Hose / Sprinkler)"
        value={form.method}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        type="number"
        name="duration_minutes"
        placeholder="Duration (minutes)"
        value={form.duration_minutes}
        onChange={handleChange}
        className="w-full border p-2 rounded"
      />

      <input
        type="text"
        name="water_source"
        placeholder="Water source (Well / Pond / Rain)"
        value={form.water_source}
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
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Saving...' : 'Add Irrigation'}
      </button>
      {successMessage ? (
        <p className="text-sm text-blue-700">
          {successMessage}
        </p>
      ) : null}
    </form>
  )
}
