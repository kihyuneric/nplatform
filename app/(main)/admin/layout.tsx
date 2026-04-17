import { redirect } from 'next/navigation'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import AdminSidebar from './admin-sidebar'

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN']

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Dev mode: skip auth to allow local page previews
  if (process.env.NODE_ENV !== 'development') {
    const user = await getAuthUserWithRole()

    if (!user) {
      redirect('/login?redirect=/admin&reason=admin_required')
    }

    if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
      redirect('/?reason=admin_forbidden')
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
    </div>
  )
}
