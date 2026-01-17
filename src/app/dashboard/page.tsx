'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useAuthUser } from '@/lib/useAuthUser'
import {
  calculateYieldPerTree,
  sumHarvestQuantity,
} from '@/lib/helpers'
import type { Harvest } from '@/lib/helpers'

type Farm = {
  id: string
  name: string
  location: string | null
  total_area_ha: number | null
  notes: string | null
}

type Profile = {
  id: string
  full_name: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [farm, setFarm] = useState<Farm | null>(null)
  const [zonesCount, setZonesCount] = useState(0)
  const [totalTrees, setTotalTrees] = useState(0)
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creatingFarm, setCreatingFarm] = useState(false)
  const [farmForm, setFarmForm] = useState({
    name: '',
    location: '',
    total_area_ha: '',
    notes: '',
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    const loadOverview = async () => {
      if (!user) return

      const { data: profileData, error: profileError } =
        await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', user.id)
          .maybeSingle()

      if (profileError) {
        setError(profileError.message)
        setLoading(false)
        return
      }

      let resolvedProfile = profileData
      if (!resolvedProfile) {
        const { data: newProfile, error: profileInsertError } =
          await supabase
            .from('profiles')
            .insert({
              id: user.id,
              full_name: user.email || '',
            })
            .select()
            .single()

        if (profileInsertError) {
          setError(profileInsertError.message)
          setLoading(false)
          return
        }

        resolvedProfile = newProfile
      }

      const { data: farmData, error: farmError } = await supabase
        .from('farms')
        .select('id, name, location, total_area_ha, notes')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (farmError) {
        setError(farmError.message)
        setLoading(false)
        return
      }

      setProfile(resolvedProfile)
      setFarm(farmData || null)

      if (farmData) {
        const [
          { data: zonesData, error: zonesError },
          { data: harvestData, error: harvestError },
        ] = await Promise.all([
          supabase
            .from('zones')
            .select('id, tree_count')
            .eq('user_id', user.id)
            .eq('farm_id', farmData.id),
          supabase
            .from('harvests')
            .select('quantity, harvest_date')
            .eq('user_id', user.id),
        ])

        if (zonesError || harvestError) {
          setError(
            zonesError?.message || harvestError?.message || null
          )
          setLoading(false)
          return
        }

        const zoneList = zonesData || []
        const treeTotal = zoneList.reduce(
          (sum, zone) => sum + Number(zone.tree_count || 0),
          0
        )

        setZonesCount(zoneList.length)
        setTotalTrees(treeTotal)
        setHarvests(harvestData || [])
      } else {
        setZonesCount(0)
        setTotalTrees(0)
        setHarvests([])
      }

      setLoading(false)
    }

    if (!authLoading) {
      loadOverview()
    }
  }, [authLoading, user])

  const totalHarvest = useMemo(
    () => sumHarvestQuantity(harvests),
    [harvests]
  )
  const yieldPerTree = useMemo(() => {
    if (!farm) return 0
    return calculateYieldPerTree(totalHarvest, totalTrees)
  }, [farm, totalHarvest, totalTrees])

  const handleFarmChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFarmForm({ ...farmForm, [e.target.name]: e.target.value })
  }

  const handleCreateFarm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setCreatingFarm(true)
    setError(null)

    const { data, error: farmError } = await supabase
      .from('farms')
      .insert({
        name: farmForm.name,
        location: farmForm.location || null,
        total_area_ha: farmForm.total_area_ha
          ? Number(farmForm.total_area_ha)
          : null,
        notes: farmForm.notes || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (farmError) {
      setError(farmError.message)
    } else {
      setFarm(data)
      setFarmForm({
        name: '',
        location: '',
        total_area_ha: '',
        notes: '',
      })
    }

    setCreatingFarm(false)
  }

  if (loading || authLoading) return <p>Loading...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-bold mb-2">Overview</h1>
        <p className="text-gray-600">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}.
        </p>
      </div>

      {!farm ? (
        <div className="bg-white p-6 rounded shadow space-y-4">
          <h2 className="text-lg font-semibold">Create your farm</h2>
          <p className="text-sm text-gray-600">
            You don’t have a farm yet. Add your farm details to start
            tracking zones and harvests.
          </p>
          <form
            onSubmit={handleCreateFarm}
            className="space-y-4"
          >
            <input
              name="name"
              value={farmForm.name}
              onChange={handleFarmChange}
              placeholder="Farm name"
              className="w-full border p-2 rounded"
              required
            />
            <input
              name="location"
              value={farmForm.location}
              onChange={handleFarmChange}
              placeholder="Location"
              className="w-full border p-2 rounded"
            />
            <input
              name="total_area_ha"
              type="number"
              value={farmForm.total_area_ha}
              onChange={handleFarmChange}
              placeholder="Total area (ha)"
              className="w-full border p-2 rounded"
            />
            <textarea
              name="notes"
              value={farmForm.notes}
              onChange={handleFarmChange}
              placeholder="Notes"
              className="w-full border p-2 rounded"
            />
            <button
              type="submit"
              disabled={creatingFarm}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {creatingFarm ? 'Creating...' : 'Create Farm'}
            </button>
          </form>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-sm text-gray-600">Owner</h2>
              <p className="text-lg font-semibold">
                {profile?.full_name || user?.email || 'Owner'}
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h2 className="text-sm text-gray-600">Farm</h2>
              <p className="text-lg font-semibold">{farm.name}</p>
              <p className="text-sm text-gray-500">
                {farm.location || 'Location not set'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm text-gray-600">Total Area</h3>
              <p className="text-xl font-semibold">
                {farm.total_area_ha ?? '-'} ha
              </p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm text-gray-600">Zones</h3>
              <p className="text-xl font-semibold">{zonesCount}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm text-gray-600">Total Harvest</h3>
              <p className="text-xl font-semibold">{totalHarvest}</p>
            </div>
            <div className="bg-white p-4 rounded shadow">
              <h3 className="text-sm text-gray-600">Total Trees</h3>
              <p className="text-xl font-semibold">{totalTrees}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h3 className="text-lg font-semibold mb-1">
              Analysis Snapshot
            </h3>
            <p className="text-sm text-gray-600">
              Yield per tree will appear once you track trees in zones.
            </p>
            <p className="text-2xl font-bold text-green-700 mt-2">
              {yieldPerTree ? yieldPerTree.toFixed(2) : '-'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
