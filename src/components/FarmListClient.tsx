"use client"

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useFarmContext } from '@/context/FarmContext'
import FarmCreateForm from '@/components/FarmCreateForm'
import ConfirmModal from '@/components/ui/ConfirmModal'
import FormDialog from '@/components/ui/FormDialog'
import Toast from '@/components/ui/Toast'
import { useTranslations } from '@/lib/useTranslations'

type CreateFarmPayload = {
  name: string
  location?: string | null
  total_area_ha?: number | null
  notes?: string | null
  boundary?: [number, number][] | null
}

export default function FarmListClient() {
  const { farms, loading, error, removeFarm, createFarm } = useFarmContext()
  const { t } = useTranslations()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState({
    open: false,
    message: '',
    tone: 'success' as 'success' | 'error' | 'info',
    actionLabel: undefined as string | undefined,
    onAction: undefined as (() => void) | undefined,
  })

  const farmToDelete = useMemo(
    () => farms?.find((f) => f.id === confirmDeleteId) ?? null,
    [farms, confirmDeleteId]
  )

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('farms.title')}</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCreateDialogOpen(true)}
            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700"
          >
            {t('farms.create')}
          </button>
          <Link href="/dashboard" className="text-sm font-semibold text-green-600 hover:underline">{t('farms.backToDashboard')}</Link>
        </div>
      </div>

      <FormDialog
        open={createDialogOpen}
        title={t('farms.createDialogTitle')}
        onClose={() => setCreateDialogOpen(false)}
      >
        <FarmCreateForm onSuccess={() => setCreateDialogOpen(false)} />
      </FormDialog>

      {loading && !farms && <p>{t('farms.loading')}</p>}

      {error && <p className="text-red-600">{error.message}</p>}

      {farms && farms.length === 0 && (
        <div className="p-6 bg-white border border-slate-200 rounded-lg text-center">
          <p className="text-slate-600">{t('farms.emptyMessage')}</p>
        </div>
      )}

      {farms && farms.length > 0 && (
        <div className="grid gap-4">
          {farms.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg">
              <div>
                <h2 className="text-lg font-semibold">{f.name}</h2>
                <p className="text-sm text-slate-500">{f.location ?? '—'} • {f.total_area_ha ?? '—'} ha</p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/farm/${f.id}/edit`} className="text-sm px-3 py-1 border rounded text-slate-700 hover:bg-slate-50">{t('farms.edit')}</Link>
                <Link href={`/dashboard/zones?farm_id=${f.id}`} className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700">{t('farms.viewZones')}</Link>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(f.id as string)}
                  className="text-sm px-3 py-1 border rounded text-red-600 hover:bg-red-50"
                >
                  {t('farms.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDeleteId)}
        title={t('farms.deleteTitle')}
        message={farmToDelete ? t('farms.deleteMessage').replace('{name}', farmToDelete.name) : t('farms.deleteMessageFallback')}
        confirmLabel={t('farms.delete')}
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (!farmToDelete?.id) return
          const deletedSnapshot: CreateFarmPayload = {
            name: farmToDelete.name,
            location: farmToDelete.location ?? null,
            total_area_ha: farmToDelete.total_area_ha ?? null,
            notes: null,
            boundary: farmToDelete.boundary ?? null,
          }
          setConfirmDeleteId(null)
          try {
                await removeFarm(farmToDelete.id as string)
            setToast({
              open: true,
              message: t('farms.deletedToast').replace('{name}', farmToDelete.name),
              tone: 'info',
              actionLabel: t('farms.undo'),
              onAction: async () => {
                try {
                  await createFarm(deletedSnapshot)
                } catch {
                  setToast({
                    open: true,
                    message: t('farms.undoFailed'),
                    tone: 'error',
                    actionLabel: undefined,
                    onAction: undefined,
                  })
                }
              },
            })
          } catch (err: unknown) {
            setToast({
              open: true,
              message: err instanceof Error ? err.message : t('farms.deleteFailed'),
              tone: 'error',
              actionLabel: undefined,
              onAction: undefined,
            })
          }
        }}
      />

      <Toast
        open={toast.open}
        message={toast.message}
        tone={toast.tone}
        actionLabel={toast.actionLabel}
        onAction={toast.onAction}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  )
}
