import Sidebar from '@/components/layout/Sidebar'
import AuthGuard from '@/components/AuthGuard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}
