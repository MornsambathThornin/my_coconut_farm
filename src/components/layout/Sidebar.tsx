'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
// Optional: If you use Lucide icons (common in modern Next.js projects)
import { 
  LayoutDashboard, 
  Home,
  Map, 
  Grape, 
  Droplets, 
  BarChart3, 
  UserCircle, 
  LogOut 
} from 'lucide-react'

const menu = [
  { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Farms', path: '/dashboard/farms', icon: Home },
  { name: 'Zones', path: '/dashboard/zones', icon: Map },
  { name: 'Harvest', path: '/dashboard/harvest', icon: Grape },
  { name: 'Irrigation', path: '/dashboard/irrigation', icon: Droplets },
  { name: 'Reports', path: '/dashboard/reports', icon: BarChart3 },
  { name: 'Profile', path: '/dashboard/profile', icon: UserCircle },
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
    <aside className="w-72 bg-slate-900 h-screen flex flex-col sticky top-0">
      {/* Brand Header */}
      <div className="p-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-900/20">
            <span className="text-xl">🌴</span>
          </div>
          <span className="text-xl font-black text-white tracking-tight">
            Coco<span className="text-green-500">Track</span>
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {menu.map((item) => {
          const Icon = item.icon
          const active = pathname === item.path

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                active
                  ? 'bg-green-600 text-white shadow-md shadow-green-900/40'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-slate-500 group-hover:text-green-400'}`} />
              <span className="font-medium">{item.name}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer / Logout Section */}
      <div className="p-4 mt-auto">
        <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout Session
          </button>
        </div>
      </div>
    </aside>
  )
}