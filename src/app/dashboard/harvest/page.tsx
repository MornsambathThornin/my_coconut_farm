'use client'

import { useEffect, useState } from 'react'
import HarvestForm from '@/components/forms/HarvestForm'
import FormDialog from '@/components/ui/FormDialog'
import { supabase } from '@/utils/supabase/client'
import { useAuthUser } from '@/lib/useAuthUser'

type HarvestLog = {
  id: string
  harvest_date: string
  quantity: number
  unit: string | null
  quality_grade: string | null
  notes: string | null
  zone_id: string
  zones?: { name: string } | null
}

export default function HarvestPage() {
  const { user, loading: authLoading } = useAuthUser()
  const [logs, setLogs] = useState<HarvestLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const fetchLogs = async (userId: string) => {
    const { data, error: fetchError } = await supabase
      .from('harvests')
      .select(
        'id, harvest_date, quantity, unit, quality_grade, notes, zone_id, zones(name)'
      )
      .eq('user_id', userId)
      .order('harvest_date', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setLogs(data || [])
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchLogs(user.id).finally(() => setLoading(false))
  }, [authLoading, user])

  if (loading || authLoading) {
    return (
      <div className="p-10 text-center animate-pulse text-slate-500">
        Loading harvest logs...
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-10 text-red-500 text-center bg-red-50 rounded-xl m-4">
        Error: {error}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Harvest Records
          </h1>
          <p className="text-slate-500 mt-1">
            View harvest activity across all zones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Add Harvest
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-500">
          All Zones
        </div>
        {logs.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No harvest records yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Zone</th>
                  <th className="p-4 font-bold">Quantity</th>
                  <th className="p-4 font-bold">Unit</th>
                  <th className="p-4 font-bold">Grade</th>
                  <th className="p-4 font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-medium">
                      {log.harvest_date}
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {log.zones?.name || 'Unknown'}
                    </td>
                    <td className="p-4">{log.quantity}</td>
                    <td className="p-4">{log.unit || '-'}</td>
                    <td className="p-4">
                      <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter">
                        {log.quality_grade || 'N/A'}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400 text-xs max-w-[180px] truncate">
                      {log.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <FormDialog
        open={formOpen}
        title="Add Harvest Record"
        onClose={() => setFormOpen(false)}
      >
        <HarvestForm
          onSuccess={() => {
            if (user) fetchLogs(user.id)
            setFormOpen(false)
          }}
        />
      </FormDialog>
    </div>
  )
}
