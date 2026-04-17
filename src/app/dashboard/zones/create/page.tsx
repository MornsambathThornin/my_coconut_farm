'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/utils/supabase/client'
import { useAuthUser } from '@/lib/useAuthUser'
import ZoneDrawMap from '@/components/maps/ZoneDrawMap'
import Toast from '@/components/ui/Toast'
import ConfirmModal from '@/components/ui/ConfirmModal'
import type { CropType } from '@/types/db'
import { useFarmContext } from '@/context/FarmContext'
import { useTranslations } from '@/lib/useTranslations'

export default function ZoneCreatePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthUser()
  const { activeFarm } = useFarmContext()
  const { t } = useTranslations()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState({ open: false, message: '' })
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [boundary, setBoundary] = useState<[number, number][]>([])
  const [occupiedBoundaries, setOccupiedBoundaries] = useState<
    [number, number][][]
  >([])
  const [cropTypes, setCropTypes] = useState<CropType[]>([])
  const [form, setForm] = useState({
    name: '',
    area_ha: '',
    tree_count: '',
    avg_tree_age_years: '',
    variety: '',
    crop_type_id: '',
  })

  useEffect(() => {
    const load = async () => {
      if (!user || !activeFarm) {
        setLoading(false)
        return
      }
      const { data: zonesData } = await supabase
        .from('zones')
        .select('boundary')
        .eq('user_id', user.id)
        .eq('farm_id', activeFarm.id)
      const boundaries =
        zonesData
          ?.map((z) => z.boundary)
          .filter(
            (b): b is [number, number][] =>
              Array.isArray(b) && b.length > 2
          ) || []
      setOccupiedBoundaries(boundaries)
      const cropRes = await fetch('/api/crop-types')
      const cropPayload = await cropRes.json()
      setCropTypes(cropRes.ok ? (cropPayload || []) : [])
      setLoading(false)
    }

    if (!authLoading) {
      load()
    }
  }, [authLoading, user, activeFarm])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
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
  const selectedCropType = cropTypes.find(
    (type) => type.id === form.crop_type_id
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !activeFarm) {
      setError(t('zoneCreate.errorPickFarm'))
      return
    }

    if (!boundary.length) {
      setError(t('zoneCreate.errorDrawFirst'))
      return
    }

    setConfirmOpen(true)
  }

  const handleConfirmCreate = async () => {
    if (!user || !activeFarm) return
    setConfirmOpen(false)
    setSaving(true)
    setError(null)

    const res = await fetch('/api/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farm_id: activeFarm.id,
        name: form.name,
        area_ha: form.area_ha ? Number(form.area_ha) : null,
        tree_count: form.tree_count ? Number(form.tree_count) : null,
        avg_tree_age_years: form.avg_tree_age_years ? Number(form.avg_tree_age_years) : null,
        variety: form.variety || null,
        crop_type_id: form.crop_type_id || null,
        boundary,
      }),
    })

    const payload = await res.json()
    if (!res.ok) {
      setError(payload?.error || t('zoneCreate.errorGeneric'))
      setSaving(false)
      return
    }

    setToast({ open: true, message: t('zoneCreate.createdToast') })
    router.push('/dashboard/zones')
  }

  if (loading || authLoading) {
    return (
      <div className="p-10 text-center animate-pulse text-slate-500">
        {t('common.loading')}
      </div>
    )
  }

  if (!activeFarm) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-4xl mb-4">🚜</div>
        <h2 className="text-xl font-bold text-slate-900">{t('zones.noFarm.title')}</h2>
        <p className="text-slate-500 mt-2 mb-6">
          {t('zoneCreate.noFarmDesc')}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors"
        >
          {t('zones.noFarm.cta')}
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('zoneCreate.title')}
          </h1>
          <p className="text-slate-500 mt-1">
            {t('zoneCreate.subtitle')}
          </p>
        </div>
        <Link
          href="/dashboard/zones"
          className="text-sm font-semibold text-slate-500 hover:text-slate-700"
        >
          {t('zoneCreate.back')}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {t('zoneCreate.name')}
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t('zoneCreate.namePlaceholder')}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {t('zoneCreate.area')}
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
                {t('zoneCreate.treeCount')}
              </label>
              <input
                name="tree_count"
                type="number"
                value={form.tree_count}
                onChange={handleChange}
                placeholder={t('zoneCreate.treeCountPlaceholder')}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {t('zoneCreate.avgTreeAge')}
              </label>
              <input
                name="avg_tree_age_years"
                type="number"
                step="0.1"
                value={form.avg_tree_age_years}
                onChange={handleChange}
                placeholder={t('zoneCreate.avgTreeAgePlaceholder')}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {t('zoneCreate.variety')}
              </label>
              <input
                name="variety"
                value={form.variety}
                onChange={handleChange}
                placeholder={t('zoneCreate.varietyPlaceholder')}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {t('zoneCreate.cropType')}
              </label>
              <select
                name="crop_type_id"
                value={form.crop_type_id}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
              >
                <option value="">{t('zoneCreate.cropTypeSelect')}</option>
                {cropTypes.map((crop) => (
                  <option key={crop.id} value={crop.id}>
                    {crop.name_en ?? t('zoneCreate.cropTypeUnnamed')}
                  </option>
                ))}
              </select>
              {selectedCropType?.default_unit ? (
                <p className="text-xs text-slate-400 mt-1">
                  {t('zoneCreate.defaultUnit').replace('{unit}', selectedCropType.default_unit)}
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              {pointsCount
                ? t('zoneCreate.pointsCaptured').replace('{count}', String(pointsCount))
                : t('zoneCreate.drawFirst')}
            </div>

            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {saving ? t('zoneCreate.submitting') : t('zoneCreate.submit')}
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
                Array.isArray(activeFarm?.boundary) ? activeFarm.boundary : []
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
      <ConfirmModal
        open={confirmOpen}
        title={t('zoneCreate.confirmTitle')}
        message={t('zoneCreate.confirmMessage')}
        confirmLabel={t('zoneCreate.confirmLabel')}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleConfirmCreate}
      />
    </div>
  )
}
