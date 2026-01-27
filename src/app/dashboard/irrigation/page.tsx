'use client'

import { useEffect, useState } from 'react'
import IrrigationForm from '@/components/forms/IrrigationForm'
import FormDialog from '@/components/ui/FormDialog'
import { supabase } from '@/utils/supabase/client'
import { useAuthUser } from '@/lib/useAuthUser'

type IrrigationLog = {
  id: string
  irrigation_date: string
  method: string | null
  duration_minutes: number | null
  water_source: string | null
  notes: string | null
  zone_id: string
  zones?: { name: string } | null
}

export default function IrrigationPage() {
  const { user, loading: authLoading } = useAuthUser()
  const [logs, setLogs] = useState<IrrigationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const fetchLogs = async (userId: string) => {
    const { data, error: fetchError } = await supabase
      .from('irrigation_logs')
      .select(
        'id, irrigation_date, method, duration_minutes, water_source, notes, zone_id, zones(name)'
      )
      .eq('user_id', userId)
      .order('irrigation_date', { ascending: false })

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
        Loading irrigation logs...
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
            Irrigation Logs
          </h1>
          <p className="text-slate-500 mt-1">
            View irrigation activity across all zones.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Add Irrigation
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-500">
          All Zones
        </div>
        {logs.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            No irrigation logs yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="p-4 font-bold">Date</th>
                  <th className="p-4 font-bold">Zone</th>
                  <th className="p-4 font-bold">Method</th>
                  <th className="p-4 font-bold">Duration</th>
                  <th className="p-4 font-bold">Water Source</th>
                  <th className="p-4 font-bold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-medium">
                      {log.irrigation_date}
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {log.zones?.name || 'Unknown'}
                    </td>
                    <td className="p-4">{log.method || '-'}</td>
                    <td className="p-4">
                      {log.duration_minutes ?? '-'}
                    </td>
                    <td className="p-4">
                      {log.water_source || '-'}
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
        title="Add Irrigation Log"
        onClose={() => setFormOpen(false)}
      >
        <IrrigationForm
          onSuccess={() => {
            if (user) fetchLogs(user.id)
            setFormOpen(false)
          }}
        />
      </FormDialog>
    </div>
  )
}
