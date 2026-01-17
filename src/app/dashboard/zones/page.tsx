'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { ensureProfileAndFarm } from '@/lib/helpers'
import { useAuthUser } from '@/lib/useAuthUser'
import Link from 'next/link'
import ZoneCard from '@/components/zones/ZoneCard'
import type { Zone } from '@/types/db'

type Farm = {
  id: string
  name: string
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [farm, setFarm] = useState<Farm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    name: '',
    area_ha: '',
    tree_count: '',
    avg_tree_age_years: '',
    variety: '',
  })
  const { user, loading: authLoading } = useAuthUser()

  async function fetchZones(farmId: string, userId: string) {
    const { data, error: zonesError } = await supabase
      .from('zones')
      .select('*')
      .eq('farm_id', farmId)
      .eq('user_id', userId)
      .order('name')

    if (zonesError) {
      setError(zonesError.message)
    } else {
      setZones(data || [])
    }
  }

  useEffect(() => {
    async function load() {
      if (!user) return

      const farm = await ensureProfileAndFarm(
        user.id,
        user.email
      )
      setFarm(farm)
      if (!farm) {
        setLoading(false)
        return
      }

      await fetchZones(farm.id, user.id)

      setLoading(false)
    }

    if (!authLoading) {
      load()
    }
  }, [authLoading, user])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (success) {
      setSuccess('')
    }
  }

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !farm) return

    setCreating(true)
    setError(null)

    const { error: zoneError } = await supabase
      .from('zones')
      .insert({
        user_id: user.id,
        farm_id: farm.id,
        name: form.name,
        area_ha: form.area_ha ? Number(form.area_ha) : null,
        tree_count: form.tree_count ? Number(form.tree_count) : null,
        avg_tree_age_years: form.avg_tree_age_years
          ? Number(form.avg_tree_age_years)
          : null,
        variety: form.variety || null,
      })

    if (zoneError) {
      setError(zoneError.message)
    } else {
      setForm({
        name: '',
        area_ha: '',
        tree_count: '',
        avg_tree_age_years: '',
        variety: '',
      })
      setSuccess('Zone created.')
      await fetchZones(farm.id, user.id)
    }

    setCreating(false)
  }

  if (loading || authLoading) return <p>Loading zones...</p>

  if (error) return <p className="text-red-600">{error}</p>

  if (!farm) {
    return (
      <div className="space-y-2">
        <p className="text-gray-600">
          You don’t have a farm yet. Create one to start adding zones.
        </p>
        <Link
          href="/dashboard"
          className="text-sm text-green-700 hover:underline"
        >
          Go to dashboard to create a farm →
        </Link>
      </div>
    )
  }

  if (!zones.length) {
    return (
      <div className="space-y-6">
        <p className="text-gray-600">
          No zones yet. Add your first zone for {farm.name}.
        </p>
        <form
          onSubmit={handleCreateZone}
          className="bg-white p-4 rounded shadow space-y-3 max-w-xl"
        >
          <h2 className="text-lg font-semibold">Create Zone</h2>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Zone name"
            className="w-full border p-2 rounded"
            required
          />
          <input
            name="area_ha"
            value={form.area_ha}
            onChange={handleChange}
            placeholder="Area (ha)"
            type="number"
            className="w-full border p-2 rounded"
          />
          <input
            name="tree_count"
            value={form.tree_count}
            onChange={handleChange}
            placeholder="Tree count"
            type="number"
            className="w-full border p-2 rounded"
          />
          <input
            name="avg_tree_age_years"
            value={form.avg_tree_age_years}
            onChange={handleChange}
            placeholder="Avg tree age (years)"
            type="number"
            className="w-full border p-2 rounded"
          />
          <input
            name="variety"
            value={form.variety}
            onChange={handleChange}
            placeholder="Variety"
            className="w-full border p-2 rounded"
          />
          {success ? (
            <p className="text-sm text-green-700">{success}</p>
          ) : null}
          <button
            type="submit"
            disabled={creating}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {creating ? 'Creating...' : 'Create Zone'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreateZone}
        className="bg-white p-4 rounded shadow space-y-3 max-w-xl"
      >
        <h2 className="text-lg font-semibold">Create Zone</h2>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Zone name"
          className="w-full border p-2 rounded"
          required
        />
        <div className="grid gap-3 md:grid-cols-2">
          <input
            name="area_ha"
            value={form.area_ha}
            onChange={handleChange}
            placeholder="Area (ha)"
            type="number"
            className="w-full border p-2 rounded"
          />
          <input
            name="tree_count"
            value={form.tree_count}
            onChange={handleChange}
            placeholder="Tree count"
            type="number"
            className="w-full border p-2 rounded"
          />
          <input
            name="avg_tree_age_years"
            value={form.avg_tree_age_years}
            onChange={handleChange}
            placeholder="Avg tree age (years)"
            type="number"
            className="w-full border p-2 rounded"
          />
          <input
            name="variety"
            value={form.variety}
            onChange={handleChange}
            placeholder="Variety"
            className="w-full border p-2 rounded"
          />
        </div>
        {success ? (
          <p className="text-sm text-green-700">{success}</p>
        ) : null}
        <button
          type="submit"
          disabled={creating}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {creating ? 'Creating...' : 'Create Zone'}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zones.map((z) => (
          <ZoneCard key={z.id} zone={z} />
        ))}
      </div>
    </div>
  )
}
