import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireUser } from '@/lib/api/auth'

/**
 * GET /api/farms/[id]/stats
 *
 * Aggregated metrics for the dashboard home + profile activity snapshot:
 *   - zones_count, trees_count, total_area_ha
 *   - harvests_count, total_harvest_quantity, last_harvest_date
 *   - yield_per_hectare (total_harvest_quantity / total_area_ha)
 *
 * One round-trip instead of the three separate queries the client used to
 * make.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { sb, user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { id: farmId } = await params

  const { data: farm } = await sb
    .from('farms')
    .select('id, user_id')
    .eq('id', farmId)
    .maybeSingle()

  if (!farm || farm.user_id !== user.id) {
    return NextResponse.json({ error: 'Farm not found' }, { status: 404 })
  }

  const { data: zones, error: zonesError } = await sb
    .from('zones')
    .select('id, area_ha, tree_count')
    .eq('farm_id', farmId)
    .eq('user_id', user.id)

  if (zonesError) {
    return NextResponse.json({ error: zonesError.message }, { status: 500 })
  }

  const zoneIds = (zones ?? []).map((z) => z.id)
  const totalArea = (zones ?? []).reduce((sum, z) => sum + Number(z.area_ha ?? 0), 0)
  const totalTrees = (zones ?? []).reduce((sum, z) => sum + Number(z.tree_count ?? 0), 0)

  let harvestsCount = 0
  let totalHarvestQuantity = 0
  let lastHarvestDate: string | null = null

  if (zoneIds.length > 0) {
    const { data: harvests, error: hError } = await sb
      .from('harvests')
      .select('quantity, harvest_date')
      .eq('user_id', user.id)
      .in('zone_id', zoneIds)
      .order('harvest_date', { ascending: false })

    if (hError) {
      return NextResponse.json({ error: hError.message }, { status: 500 })
    }

    harvestsCount = harvests?.length ?? 0
    totalHarvestQuantity = (harvests ?? []).reduce((sum, h) => sum + Number(h.quantity ?? 0), 0)
    lastHarvestDate = harvests?.[0]?.harvest_date ?? null
  }

  const yieldPerHectare = totalArea > 0 ? totalHarvestQuantity / totalArea : 0

  return NextResponse.json({
    zones_count: zones?.length ?? 0,
    trees_count: totalTrees,
    total_area_ha: totalArea,
    harvests_count: harvestsCount,
    total_harvest_quantity: totalHarvestQuantity,
    last_harvest_date: lastHarvestDate,
    yield_per_hectare: Math.round(yieldPerHectare * 100) / 100,
  })
}
