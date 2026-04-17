'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth/auth-provider'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Wraps protected content. Shows a login prompt if the user is not authenticated.
 * In dev mode, checks for active_role cookie or dev_user in localStorage.
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth()

  // Check dev mode authentication via cookie
  const hasDevAuth = typeof document !== 'undefined'
    ? document.cookie.includes('active_role=')
    : false

  const isAuthenticated = !!user || hasDevAuth

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border-subtle)] border-t-[#1B3A5C]" />
      </div>
    )
  }

  if (!isAuthenticated) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-overlay)] mb-4">
          <Lock className="h-8 w-8 text-[var(--color-text-muted)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          로그인이 필요합니다
        </h2>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
          이 콘텐츠를 이용하려면 로그인이 필요합니다.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button style={{ backgroundColor: '#1B3A5C' }}>
              로그인
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="outline">
              회원가입
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
