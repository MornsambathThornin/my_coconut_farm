import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireUser } from '@/lib/api/auth'
import { generateForecast } from '@/lib/forecast'

export async function GET(req: NextRequest) {
  const zoneId = req.nextUrl.searchParams.get('zone_id')
  if (!zoneId) {
    return NextResponse.json({ error: 'zone_id is required' }, { status: 400 })
  }

  const { sb, user, unauthorized } = await requireUser()
  if (unauthorized) return unauthorized

  const { data: zone } = await sb
    .from('zones')
    .select('id, area_ha, user_id')
    .eq('id', zoneId)
    .maybeSingle()

  if (!zone || zone.user_id !== user.id) {
    return NextResponse.json({ error: 'Zone not found' }, { status: 404 })
  }

  const { data: harvests, error } = await sb
    .from('harvests')
    .select('harvest_date, quantity')
    .eq('zone_id', zoneId)
    .eq('user_id', user.id)
    .order('harvest_date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const forecast = generateForecast(harvests ?? [], zone.area_ha)
  return NextResponse.json(forecast)
}
