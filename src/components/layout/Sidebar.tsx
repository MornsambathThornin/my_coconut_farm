'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const menu = [
  { name: 'Overview', path: '/dashboard' },
  { name: 'Zones', path: '/dashboard/zones' },
  { name: 'Harvest', path: '/dashboard/harvest' },
  { name: 'Irrigation', path: '/dashboard/irrigation' },
  { name: 'Reports', path: '/dashboard/reports' },
  { name: 'Profile', path: '/dashboard/profile' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      router.replace('/login')
    }
  }

  return (
    <aside className="w-64 bg-white shadow-md flex flex-col">
      <div className="p-4 text-xl font-bold border-b">
        🌴 Coconut Farm
      </div>

      <nav className="p-4 space-y-2 flex-1">
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

      <div className="p-4 border-t">
        <button
          type="button"
          onClick={handleLogout}
          className="text-sm text-red-500 hover:underline"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
