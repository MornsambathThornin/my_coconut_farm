import type { Metadata } from 'next'
import Link from 'next/link'
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

  if (!farm) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-4xl mb-4">🚜</div>
        <h2 className="text-xl font-bold text-slate-900">Farm Not Found</h2>
        <p className="text-slate-500 mt-2 mb-6">The requested farm could not be found or you do not have access.</p>
        <Link href="/dashboard/farms" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors">Back to Farms</Link>
      </div>
    )
  }

  const normalized = {
    ...farm,
    boundary: Array.isArray(farm.boundary) ? (farm.boundary as [number, number][]) : null,
  }

  return <FarmEditClient initialFarm={normalized} />
}
