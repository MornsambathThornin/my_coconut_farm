import Link from 'next/link'
import { Zone } from '@/types/db'
import { getCropIcon, type CropCategory } from '@/lib/cropIcon'

export default function ZoneCard({ zone }: { zone: Zone }) {
  const icon = getCropIcon(zone.crop_type?.category as CropCategory)
  return (
    <Link
      href={`/dashboard/zones/${zone.id}`}
      className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition"
    >
      <div className="flex items-start justify-between mb-2">
        <h2 className="text-lg font-semibold">Zone {zone.name}</h2>
        <span className="text-2xl" aria-label={zone.crop_type?.name_en ?? 'crop'}>
          {icon.emoji}
        </span>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>🌍 Area: {zone.area_ha ?? '-'} ha</p>
        <p>{icon.emoji} Plants: {zone.tree_count ?? '-'}</p>
        <p>🧓 Avg age: {zone.avg_tree_age_years ?? '-'} years</p>
        <p>🌱 Variety: {zone.variety ?? zone.crop_type?.name_en ?? '-'}</p>
      </div>
    </Link>
  )
}
