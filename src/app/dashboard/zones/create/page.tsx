'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/utils/supabase/client'
import { ensureProfileAndFarm } from '@/lib/helpers'
import { useAuthUser } from '@/lib/useAuthUser'
import ZoneDrawMap from '@/components/maps/ZoneDrawMap'
import Toast from '@/components/ui/Toast'

type Farm = {
  id: string
  name: string
  boundary?: [number, number][] | null
}

export default function ZoneCreatePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthUser()
  const [farm, setFarm] = useState<Farm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState({ open: false, message: '' })
  const [boundary, setBoundary] = useState<[number, number][]>([])
  const [occupiedBoundaries, setOccupiedBoundaries] = useState<
    [number, number][][]
  >([])
  const [form, setForm] = useState({
    name: '',
    area_ha: '',
    tree_count: '',
    avg_tree_age_years: '',
    variety: '',
  })

  useEffect(() => {
    const load = async () => {
      if (!user) return
      const resolvedFarm = await ensureProfileAndFarm(
        user.id,
        user.email
      )
      setFarm(resolvedFarm)
      if (resolvedFarm?.id) {
        const { data: zonesData } = await supabase
          .from('zones')
          .select('boundary')
          .eq('user_id', user.id)
          .eq('farm_id', resolvedFarm.id)
        const boundaries =
          zonesData
            ?.map((z) => z.boundary)
            .filter(
              (b): b is [number, number][] =>
                Array.isArray(b) && b.length > 2
            ) || []
        setOccupiedBoundaries(boundaries)
      }
      setLoading(false)
    }

    if (!authLoading) {
      load()
    }
  }, [authLoading, user])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleAreaChange = useCallback((areaHa: number) => {
    const next = Number.isFinite(areaHa) ? areaHa.toFixed(2) : ''
    setForm((prev) => ({ ...prev, area_ha: next }))
  }, [])

  const pointsCount = useMemo(() => {
    if (!boundary.length) return 0
    return Math.max(0, boundary.length - 1)
  }, [boundary])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !farm) return

    if (!boundary.length) {
      setError('Draw zone first to save boundary.')
      return
    }

    setSaving(true)
    setError(null)

    const { error: insertError } = await supabase
      .from('zones')
      .insert({
        user_id: user.id,
        farm_id: farm.id,
        name: form.name,
        area_ha: form.area_ha ? Number(form.area_ha) : null,
        tree_count: form.tree_count
          ? Number(form.tree_count)
          : null,
        avg_tree_age_years: form.avg_tree_age_years
          ? Number(form.avg_tree_age_years)
          : null,
        variety: form.variety || null,
        boundary,
      })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setToast({ open: true, message: 'Zone created.' })
    router.push('/dashboard/zones')
  }

  if (loading || authLoading) {
    return (
      <div className="p-10 text-center animate-pulse text-slate-500">
        Loading...
      </div>
    )
  }

  if (!farm) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-4xl mb-4">🚜</div>
        <h2 className="text-xl font-bold text-slate-900">No Farm Detected</h2>
        <p className="text-slate-500 mt-2 mb-6">
          You need to set up your farm profile before creating zones.
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
            Create Zone
          </h1>
          <p className="text-slate-500 mt-1">
            Draw the boundary on the map and add zone details.
          </p>
        </div>
        <Link
          href="/dashboard/zones"
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          Back to Zones
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Zone Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. North Slope Section A"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Area (ha)
              </label>
              <input
                name="area_ha"
                type="number"
                step="0.01"
                value={form.area_ha}
                onChange={handleChange}
                readOnly
                placeholder="0.00"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Tree Count
              </label>
              <input
                name="tree_count"
                type="number"
                value={form.tree_count}
                onChange={handleChange}
                placeholder="Total trees"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Avg Tree Age (years)
              </label>
              <input
                name="avg_tree_age_years"
                type="number"
                step="0.1"
                value={form.avg_tree_age_years}
                onChange={handleChange}
                placeholder="Years"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Variety
              </label>
              <input
                name="variety"
                value={form.variety}
                onChange={handleChange}
                placeholder="e.g. Nam Hom"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {pointsCount
                ? `${pointsCount} boundary points captured.`
                : 'Draw zone first to capture the boundary.'}
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Create Zone'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="h-[420px] w-full">
            <ZoneDrawMap
              boundary={boundary}
              onBoundaryChange={setBoundary}
              onAreaChange={handleAreaChange}
              limitBoundary={
                Array.isArray(farm?.boundary) ? farm.boundary : []
              }
              occupiedBoundaries={occupiedBoundaries}
              showLocate={false}
              zoom={16}
            />
          </div>
        </div>
      </div>

      <Toast
        open={toast.open}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
