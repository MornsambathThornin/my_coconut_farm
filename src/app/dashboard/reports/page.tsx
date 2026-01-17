'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
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

  if (loading || authLoading) return <p>Loading reports...</p>
  if (error) return <p className="text-red-600">{error}</p>

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded shadow space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold">
              Reports Overview
            </h1>
            <p className="text-sm text-gray-600">
              Filter by date range to focus on a specific window.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>

        <DateRangeFilter
          value={dateRange}
          onChange={setDateRange}
          onReset={() => setDateRange(getCurrentYearRange())}
        />
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">
          Yield per Tree (All Zones)
        </h2>
        <p className="text-2xl font-bold text-green-700">
          {totalTrees
            ? `${overallYieldPerTree.toFixed(2)}`
            : '-'}
        </p>
        <p className="text-sm text-gray-500">
          Based on {totalTrees || 0} trees in selected range.
        </p>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h1 className="text-xl font-bold mb-4">
          Monthly Production
        </h1>
        {monthly.length === 0 ? (
          <p className="text-sm text-gray-500">
            No harvest data for this range.
          </p>
        ) : (
          <ProductionChart data={monthly} />
        )}
      </div>

      <div className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold mb-4">
          Production by Zone
        </h2>
        {zoneData.length === 0 ? (
          <p className="text-sm text-gray-500">
            No zone data for this range.
          </p>
        ) : (
          <ZoneComparisonChart data={zoneData} />
        )}
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
