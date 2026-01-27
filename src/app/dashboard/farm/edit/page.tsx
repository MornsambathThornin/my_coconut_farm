'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useAuthUser } from '@/lib/useAuthUser'
import ZoneDrawMap from '@/components/maps/ZoneDrawMap'
import ConfirmModal from '@/components/ui/ConfirmModal'
import ErrorModal from '@/components/ui/ErrorModal'
import Toast from '@/components/ui/Toast'

type Farm = {
  id: string
  name: string
  location: string | null
  total_area_ha: number | null
  boundary?: [number, number][] | null
}

export default function FarmEditPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthUser()
  const [farm, setFarm] = useState<Farm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState({ open: false, message: '' })
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: '',
  })
  const [boundary, setBoundary] = useState<[number, number][]>([])
  const [form, setForm] = useState({
    name: '',
    location: '',
    total_area_ha: '',
  })

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, location, total_area_ha, boundary')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (error) {
        setErrorModal({ open: true, message: error.message })
        setLoading(false)
        return
      }

      if (!data) {
        setFarm(null)
        setLoading(false)
        return
      }

      setFarm(data)
      setForm({
        name: data.name ?? '',
        location: data.location ?? '',
        total_area_ha:
          data.total_area_ha != null ? String(data.total_area_ha) : '',
      })
      setBoundary(
        Array.isArray(data.boundary) ? data.boundary : []
      )
      setLoading(false)
    }

    if (!authLoading && !user) {
      router.replace('/login')
      return
    }

    if (!authLoading) {
      load()
    }
  }, [authLoading, router, user])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAreaChange = useCallback((areaHa: number) => {
    const next = Number.isFinite(areaHa) ? areaHa.toFixed(2) : ''
    setForm((prev) => ({ ...prev, total_area_ha: next }))
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setConfirmOpen(true)
  }

  const handleConfirmSave = async () => {
    if (!user || !farm) return
    setConfirmOpen(false)
    setSaving(true)

    const { error } = await supabase
      .from('farms')
      .update({
        name: form.name,
        location: form.location || null,
        total_area_ha: form.total_area_ha
          ? Number(form.total_area_ha)
          : null,
        boundary,
      })
      .eq('id', farm.id)
      .eq('user_id', user.id)

    if (error) {
      setErrorModal({ open: true, message: error.message })
    } else {
      setToast({ open: true, message: 'Farm updated.' })
    }

    setSaving(false)
  }

  if (loading || authLoading) {
    return (
      <div className="p-10 text-center animate-pulse text-slate-500">
        Loading farm...
      </div>
    )
  }

  if (!farm) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-4xl mb-4">🚜</div>
        <h2 className="text-xl font-bold text-slate-900">
          No Farm Found
        </h2>
        <p className="text-slate-500 mt-2 mb-6">
          Create a farm profile first before editing.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
        >
          Go to Dashboard →
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Edit Farm
          </h1>
          <p className="text-slate-500 mt-1">
            Update your farm details and boundary.
          </p>
        </div>
        <Link
          href="/dashboard/profile"
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          Back to Profile
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Farm Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Location
              </label>
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="City / Province"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Total Area (ha)
              </label>
              <input
                name="total_area_ha"
                type="number"
                step="0.01"
                value={form.total_area_ha}
                onChange={handleChange}
                readOnly
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Farm'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="h-[420px] w-full">
            <ZoneDrawMap
              boundary={boundary}
              onBoundaryChange={setBoundary}
              onAreaChange={handleAreaChange}
              zoom={15}
            />
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Update farm?"
        message="This will save your farm details and boundary."
        confirmLabel="Save"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmSave}
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
    </div>
  )
}
