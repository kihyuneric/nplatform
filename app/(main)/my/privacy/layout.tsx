import { redirect } from 'next/navigation'
import { getAuthUserWithRole } from '@/lib/auth/get-user'

/**
 * /my/privacy 는 관리자 전용 — 일반 회원은 본인 PII 열람 로그를 보지 못한다.
 *
 * 운영 정책:
 *   - PII Access Log 는 컴플라이언스 감사 목적의 백오피스 자료
 *   - 일반 사용자는 마이페이지에서 진입점도 볼 수 없도록 가시성/접근성 모두 제거
 *   - 진입 시 ADMIN/SUPER_ADMIN 만 통과, 그 외 / 로 redirect
 *
 * dev 모드(getAuthUser 의 dev_user_active 쿠키) 에서는 SUPER_ADMIN 으로 통과.
 */

const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN']
const isDev = process.env.NODE_ENV === 'development'

export default async function PrivacyLayout({ children }: { children: React.ReactNode }) {
  if (!isDev) {
    const user = await getAuthUserWithRole()
    if (!user) {
      redirect('/login?redirect=/my/privacy&reason=admin_required')
    }
    if (!user.role || !ALLOWED_ROLES.includes(user.role)) {
      redirect('/?reason=admin_forbidden')
    }
  }

  return <>{children}</>
}
