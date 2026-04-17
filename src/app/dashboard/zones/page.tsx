'use client'

import { useEffect, useState } from 'react'
import { useAuthUser } from '@/lib/useAuthUser'
import Link from 'next/link'
import ZoneCard from '@/components/zones/ZoneCard'
import ErrorModal from '@/components/ui/ErrorModal'
import type { Zone } from '@/types/db'
import { useFarmContext } from '@/context/FarmContext'

export default function ZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const { activeFarm } = useFarmContext()
  const [loading, setLoading] = useState(true)
  const [errorModal, setErrorModal] = useState({
    open: false,
    message: '',
  })
  const { user, loading: authLoading } = useAuthUser()

  async function fetchZones(farmId: string) {
    const res = await fetch(`/api/zones?farm_id=${farmId}`)
    const payload = await res.json()
    if (!res.ok) {
      setErrorModal({
        open: true,
        message: payload?.error || 'Unable to load zones',
      })
    } else {
      setZones(payload || [])
    }
  }

  useEffect(() => {
    const load = async () => {
      if (!user || !activeFarm || !activeFarm.id) {
        setLoading(false)
        return
      }

      await fetchZones(activeFarm.id)
      setLoading(false)
    }

    if (!authLoading) {
      load()
    }
  }, [authLoading, user, activeFarm])

  if (loading || authLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
    </div>
  )

  if (!activeFarm) return (
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
          <p className="text-slate-500 mt-1">Manage and monitor specific areas of <span className="font-semibold text-slate-700">{activeFarm.name}</span></p>
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
