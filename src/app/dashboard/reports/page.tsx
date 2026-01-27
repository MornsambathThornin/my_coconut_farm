'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase/client'
import ProductionChart from '@/components/charts/ProductionChart'
import ZoneComparisonChart from '@/components/charts/ZoneComparisonChart'
import DateRangeFilter from '@/components/forms/DateRangeFilter'
import { useAuthUser } from '@/lib/useAuthUser'
import {
  calculateYieldPerTree,
  filterHarvestsByDateRange,
  groupHarvestByMonth,
  groupHarvestByZone,
  sumHarvestQuantity,
} from '@/lib/helpers'
import type { Harvest } from '@/lib/helpers'

type Zone = {
  id: string
  name: string
  tree_count: number | null
}

export default function ReportsPage() {
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState(() =>
    getCurrentYearRange()
  )
  const { user, loading: authLoading } = useAuthUser()

  useEffect(() => {
    const load = async () => {
      if (!user) return

      const { data: harvestData, error: harvestError } =
        await supabase
        .from('harvests')
        .select(`
          id,
          zone_id,
          quantity,
          harvest_date,
          unit,
          quality_grade,
          notes,
          zones (
            name,
            tree_count
          )
        `)
        .eq('user_id', user.id)

      const { data: zoneData, error: zonesError } =
        await supabase
        .from('zones')
        .select('id, name, tree_count')
        .eq('user_id', user.id)
        .order('name')

      if (harvestError || zonesError) {
        setError(
          harvestError?.message || zonesError?.message || null
        )
      } else {
        setHarvests(harvestData || [])
        setZones(zoneData || [])
      }
      setLoading(false)
    }

    if (!authLoading) {
      load()
    }
  }, [authLoading, user])

  const filteredHarvests = useMemo(
    () =>
      filterHarvestsByDateRange(
        harvests,
        dateRange.start || undefined,
        dateRange.end || undefined
      ),
    [harvests, dateRange]
  )

  const monthly = useMemo(
    () => groupHarvestByMonth(filteredHarvests),
    [filteredHarvests]
  )

  const zoneData = useMemo(
    () => groupHarvestByZone(filteredHarvests),
    [filteredHarvests]
  )

  const zoneSummaries = useMemo(() => {
    return zones.map((zone) => {
      const zoneHarvests = filteredHarvests.filter(
        (h) => h.zone_id === zone.id
      )
      const total = sumHarvestQuantity(zoneHarvests)
      const yieldPerTree = calculateYieldPerTree(
        total,
        zone.tree_count
      )

      return {
        zone: zone.name,
        total,
        yieldPerTree,
        treeCount: zone.tree_count,
      }
    })
  }, [zones, filteredHarvests])

  const totalHarvest = useMemo(
    () => sumHarvestQuantity(filteredHarvests),
    [filteredHarvests]
  )

  const totalTrees = useMemo(
    () =>
      zones.reduce(
        (sum, z) => sum + Number(z.tree_count || 0),
        0
      ),
    [zones]
  )

  const overallYieldPerTree = useMemo(
    () => calculateYieldPerTree(totalHarvest, totalTrees),
    [totalHarvest, totalTrees]
  )

  const handleExportCsv = () => {
    const csvLines = [
      'Harvest Data',
      'Date,Zone,Quantity,Unit,Grade,Notes',
      ...filteredHarvests.map((h) => {
        const zoneName = h.zones?.[0]?.name || 'Unknown'
        return [
          formatCsvValue(h.harvest_date),
          formatCsvValue(zoneName),
          formatCsvValue(h.quantity),
          formatCsvValue(h.unit || ''),
          formatCsvValue(h.quality_grade || ''),
          formatCsvValue(h.notes || ''),
        ].join(',')
      }),
      '',
      'Zone Summary',
      'Zone,Total Quantity,Yield Per Tree',
      ...zoneSummaries.map((z) => {
        const yieldDisplay = z.treeCount
          ? z.yieldPerTree.toFixed(2)
          : ''
        return [
          formatCsvValue(z.zone),
          formatCsvValue(z.total),
          formatCsvValue(yieldDisplay),
        ].join(',')
      }),
    ]

    const blob = new Blob([csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getReportFileName()
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading || authLoading) {
    return (
      <div className="p-10 text-center animate-pulse text-slate-500">
        Loading reports...
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
    <div className="max-w-6xl mx-auto space-y-8 p-4">
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-3xl p-6 md:p-8 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Reports
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight mt-2">
              Overview
            </h1>
            <p className="text-sm text-white/85 mt-3 max-w-xl leading-relaxed">
              Filter a date range to see yield trends, compare zones, and export a clean summary.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/20 transition-colors"
          >
            Export CSV
          </button>
        </div>
        <div className="mt-6 bg-white/10 rounded-2xl p-4">
          <DateRangeFilter
            value={dateRange}
            onChange={setDateRange}
            onReset={() => setDateRange(getCurrentYearRange())}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Total Harvest
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {totalHarvest.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {filteredHarvests[0]?.unit || 'units'} in range
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Yield per Tree
          </p>
          <p className="text-2xl font-extrabold text-green-700 mt-2">
            {totalTrees ? overallYieldPerTree.toFixed(2) : '-'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Based on {totalTrees || 0} trees
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Zones Tracked
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {zones.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Active zones in your farm
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Records
          </p>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">
            {filteredHarvests.length}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Harvest entries in range
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Monthly Production
              </h2>
              <span className="text-xs font-semibold text-slate-500">
                {dateRange.start} → {dateRange.end}
              </span>
            </div>
            {monthly.length === 0 ? (
              <p className="text-sm text-slate-500">
                No harvest data for this range.
              </p>
            ) : (
              <ProductionChart data={monthly} />
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4">
              Production by Zone
            </h2>
            {zoneData.length === 0 ? (
              <p className="text-sm text-slate-500">
                No zone data for this range.
              </p>
            ) : (
              <ZoneComparisonChart data={zoneData} />
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500">
              Zone Performance
            </h3>
          </div>
          {zoneSummaries.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              No zone summaries available.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {zoneSummaries.map((zone) => (
                <div key={zone.zone} className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">
                      {zone.zone}
                    </p>
                    <p className="text-sm font-bold text-slate-900">
                      {zone.total.toLocaleString()}
                    </p>
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Yield per tree:{' '}
                    <span className="font-semibold text-slate-700">
                      {zone.treeCount
                        ? zone.yieldPerTree.toFixed(2)
                        : '-'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getCurrentYearRange() {
  const now = new Date()
  const year = now.getFullYear()
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  }
}

function getReportFileName() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `coconut-report-${year}-${month}-${day}.csv`
}

function formatCsvValue(value: string | number | Date) {
  const raw = String(value ?? '')
  return `"${raw.replace(/"/g, '""')}"`
}
