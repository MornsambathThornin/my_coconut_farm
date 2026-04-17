'use client'

import { useEffect, useState } from 'react'
import IrrigationForm from '@/components/forms/IrrigationForm'
import FormDialog from '@/components/ui/FormDialog'
import { useAuthUser } from '@/lib/useAuthUser'
import { useFarmContext } from '@/context/FarmContext'
import { useTranslations } from '@/lib/useTranslations'

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
  const { activeFarm } = useFarmContext()
  const { t } = useTranslations()
  const [logs, setLogs] = useState<IrrigationLog[]>([])
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const loading = authLoading || fetching

  const fetchLogs = async () => {
    if (!activeFarm?.id) {
      setLogs([])
      setFetching(false)
      return
    }
    setFetching(true)
    setError(null)
    const res = await fetch(`/api/irrigation-logs?farm_id=${encodeURIComponent(activeFarm.id)}`)
    const payload = await res.json()
    if (!res.ok) {
      setError(payload?.error || 'Unable to load irrigation logs')
    } else {
      setLogs(payload || [])
    }
    setFetching(false)
  }

  useEffect(() => {
    if (authLoading) return
    if (!user) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs()
  }, [authLoading, user, activeFarm?.id])

  if (loading || authLoading) {
    return (
      <div className="p-10 text-center animate-pulse text-slate-500">
        {t('common.loading')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-10 text-red-500 text-center bg-red-50 rounded-xl m-4">
        {t('common.error')}: {error}
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('irrigation.title')}
          </h1>
          <p className="text-slate-500 mt-1">
            {activeFarm
              ? t('irrigation.subtitleWithFarm').replace('{farm}', activeFarm.name)
              : t('irrigation.subtitleNoFarm')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          disabled={!activeFarm}
          className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
            activeFarm
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-slate-300 cursor-not-allowed"
          }`}
        >
          {t('irrigation.add')}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-widest text-slate-500">
          {t('irrigation.allZones')}
        </div>
        {logs.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">
            {t('irrigation.empty')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="p-4 font-bold">{t('irrigation.col.date')}</th>
                  <th className="p-4 font-bold">{t('irrigation.col.zone')}</th>
                  <th className="p-4 font-bold">{t('irrigation.col.method')}</th>
                  <th className="p-4 font-bold">{t('irrigation.col.duration')}</th>
                  <th className="p-4 font-bold">{t('irrigation.col.source')}</th>
                  <th className="p-4 font-bold">{t('irrigation.col.notes')}</th>
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
        title={t('irrigation.dialog.title')}
        onClose={() => setFormOpen(false)}
      >
        <IrrigationForm
          onSuccess={() => {
            if (user) fetchLogs()
            setFormOpen(false)
          }}
          farmId={activeFarm?.id}
        />
      </FormDialog>
    </div>
  )
}
