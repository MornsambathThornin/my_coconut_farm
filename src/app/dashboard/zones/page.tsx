'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import { ensureProfileAndFarm } from '@/lib/helpers'
import { useAuthUser } from '@/lib/useAuthUser'
import Link from 'next/link'
import ZoneCard from '@/components/zones/ZoneCard'
import ErrorModal from '@/components/ui/ErrorModal'
import type { Zone } from '@/types/db'

type Farm = {
  id: string
  name: string
}

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [farm, setFarm] = useState<Farm | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: '',
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
      setErrorModal({
        open: true,
        message: zonesError.message,
      })
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

  if (loading || authLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
    </div>
  )

  if (!farm) return (
    <div className="max-w-md mx-auto mt-20 text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="text-4xl mb-4">🚜</div>
      <h2 className="text-xl font-bold text-slate-900">No Farm Detected</h2>
      <p className="text-slate-500 mt-2 mb-6">You need to set up your farm profile before you can define cultivation zones.</p>
      <Link href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors">
        Go to Dashboard →
      </Link>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Farm Zones</h1>
          <p className="text-slate-500 mt-1">Manage and monitor specific areas of <span className="font-semibold text-slate-700">{farm.name}</span></p>
        </div>
        
        <Link
          href="/dashboard/zones/create"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-sm bg-green-600 text-white hover:bg-green-700"
        >
          + Add New Zone
        </Link>
      </div>

      {/* Zones Display */}
      {!zones.length ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-500 italic">No zones mapped yet. Click &quot;Add New Zone&quot; to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {zones.map((z) => (
            <div key={z.id} className="transition-transform hover:scale-[1.02] active:scale-[0.98]">
               <ZoneCard zone={z} />
            </div>
          ))}
        </div>
      )}
      <ErrorModal
        open={errorModal.open}
        title="Unable to save"
        message={errorModal.message}
        onClose={() =>
          setErrorModal((prev) => ({ ...prev, open: false }))
        }
      />
    </div>
  )
}
