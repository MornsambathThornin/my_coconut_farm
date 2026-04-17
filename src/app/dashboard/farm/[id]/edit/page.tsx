import type { Metadata } from 'next'
import FarmEditClient from '@/components/FarmEditClient'
import { getFarmByIdServer } from '@/lib/api/supabaseServer'

type Farm = {
  id: string
  name: string
  location?: string | null
  total_area_ha?: number | null
  boundary?: [number, number][] | null
  notes?: string | null
}

export const metadata: Metadata = {
  title: 'Edit Farm',
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let farm: Farm | null = null
  try {
    farm = (await getFarmByIdServer(id)) as Farm | null
  } catch {
    farm = null
  }

  const normalized = farm
    ? {
        ...farm,
        boundary: Array.isArray(farm.boundary) ? (farm.boundary as [number, number][]) : null,
      }
    : null

  return <FarmEditClient initialFarm={normalized} />
}
