import { redirect } from 'next/navigation'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import AdminSidebar from './admin-sidebar'

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN']
const isDev = process.env.NODE_ENV === 'development'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Dev mode: skip auth to allow local page previews (production always enforces)
  if (!isDev) {
    const user = await getAuthUserWithRole()

    if (!user) {
      redirect('/login?redirect=/admin&reason=admin_required')
    }

    if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
      redirect('/?reason=admin_forbidden')
    }
  }

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-64px)]">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden min-w-0">
        {isDev && (
          <div
            role="alert"
            className="px-3 py-2 text-[11px] font-semibold tracking-wider"
            style={{
              background: 'rgba(5, 28, 44,0.14)',
              borderBottom: '1px solid rgba(5, 28, 44,0.35)',
              color: '#051C2C',
            }}
          >
            ⚠ DEV MODE — 관리자 인증이 우회되어 있습니다. 프로덕션에서는 ADMIN/SUPER_ADMIN 만 접근 가능합니다.
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
