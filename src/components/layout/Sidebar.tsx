'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menu = [
  { name: 'Overview', path: '/dashboard' },
  { name: 'Zones', path: '/dashboard/zones' },
  { name: 'Harvest', path: '/dashboard/harvest' },
  { name: 'Irrigation', path: '/dashboard/irrigation' },
  { name: 'Reports', path: '/dashboard/reports' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-white shadow-md">
      <div className="p-4 text-xl font-bold border-b">
        🌴 Coconut Farm
      </div>

      <nav className="p-4 space-y-2">
        {menu.map((item) => {
          const active = pathname === item.path
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`block px-4 py-2 rounded ${
                active
                  ? 'bg-green-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {item.name}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
