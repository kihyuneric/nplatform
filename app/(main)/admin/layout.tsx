import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getAuthUserWithRole } from '@/lib/auth/get-user'
import AdminSidebar from './admin-sidebar'

// 운영 관리자(ADMIN/SUPER_ADMIN) = 등록·수정·삭제 · 운영 파트너(PARTNER) = 열람 전용 (2026-08-18)
const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'PARTNER']
const isDev = process.env.NODE_ENV === 'development'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // 열람 전용 판정 — 역할 전환 쿠키 우선, 없으면 실제 계정 역할
  let isPartnerView = false
  try {
    const jar = await cookies()
    const activeRole = jar.get('active_role')?.value
    if (activeRole) isPartnerView = activeRole === 'PARTNER'
  } catch { /* ignore */ }

  // Dev mode: skip auth to allow local page previews (production always enforces)
  if (!isDev) {
    const user = await getAuthUserWithRole()

    if (!user) {
      redirect('/login?redirect=/admin&reason=admin_required')
    }

    if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
      redirect('/?reason=admin_forbidden')
    }
    if (user.role === 'PARTNER') isPartnerView = true
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
              color: 'var(--color-text-primary)',
            }}
          >
            ⚠ DEV MODE — 관리자 인증이 우회되어 있습니다. 프로덕션에서는 운영 관리자/운영 파트너만 접근 가능합니다.
          </div>
        )}
        {isPartnerView && (
          <>
            <div
              role="alert"
              className="px-3 py-2 text-[11px] font-bold tracking-wide"
              style={{
                background: 'rgba(217, 119, 6, 0.12)',
                borderBottom: '1px solid rgba(217, 119, 6, 0.40)',
                color: '#92400E',
              }}
            >
              👁 운영 파트너 — 열람 전용입니다. 등록 · 수정 · 삭제는 운영 관리자만 가능합니다.
            </div>
            {/* 열람 전용 — 버튼 · 입력 · 선택 비활성화 (링크 이동은 허용) */}
            <style>{`
              .partner-readonly button,
              .partner-readonly input,
              .partner-readonly select,
              .partner-readonly textarea {
                pointer-events: none !important;
                opacity: 0.5;
              }
            `}</style>
          </>
        )}
        <div className={isPartnerView ? 'partner-readonly' : undefined}>
          {children}
        </div>
      </main>
    </div>
  )
}
