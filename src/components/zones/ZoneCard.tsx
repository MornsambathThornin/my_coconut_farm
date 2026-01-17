import Link from 'next/link'
import { Zone } from '@/types/db'

export default function ZoneCard({ zone }: { zone: Zone }) {
  return (
    <Link
      href={`/dashboard/zones/${zone.id}`}
      className="block bg-white p-4 rounded-lg shadow hover:shadow-md transition"
    >
      <h2 className="text-lg font-semibold mb-2">
        Zone {zone.name}
      </h2>

      <div className="text-sm text-gray-600 space-y-1">
        <p>🌍 Area: {zone.area_ha ?? '-'} ha</p>
        <p>🌴 Trees: {zone.tree_count ?? '-'}</p>
        <p>🧓 Avg age: {zone.avg_tree_age_years ?? '-'} years</p>
        <p>🌱 Variety: {zone.variety ?? '-'}</p>
      </div>
    </Link>
  )
}
