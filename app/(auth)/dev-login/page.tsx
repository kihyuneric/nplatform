"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck, User, Building2, Briefcase, Users, GraduationCap,
  LogIn, AlertTriangle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"

interface TestAccount {
  username: string
  password: string
  role: string
  roleName: string
  userId: string
  icon: React.ReactNode
  color: string
  redirect: string
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    username: "admin",
    password: "admin",
    role: "SUPER_ADMIN",
    roleName: "관리자",
    userId: "00000000-0000-0000-0000-000000000001",
    icon: <ShieldCheck className="h-8 w-8" />,
    color: "bg-red-500/10 text-red-400",
    redirect: "/admin",
  },
  {
    username: "seller",
    password: "test",
    role: "SELLER",
    roleName: "매도자",
    userId: "00000000-0000-0000-0000-000000000002",
    icon: <Building2 className="h-8 w-8" />,
    color: "bg-blue-500/10 text-blue-400",
    redirect: "/seller/dashboard",
  },
  {
    username: "buyer",
    password: "test",
    role: "BUYER",
    roleName: "매수자",
    userId: "00000000-0000-0000-0000-000000000003",
    icon: <User className="h-8 w-8" />,
    color: "bg-emerald-500/10 text-emerald-400",
    redirect: "/exchange",
  },
  {
    username: "partner",
    password: "test",
    role: "PARTNER",
    roleName: "파트너",
    userId: "00000000-0000-0000-0000-000000000004",
    icon: <Users className="h-8 w-8" />,
    color: "bg-purple-500/10 text-purple-400",
    redirect: "/partner/dashboard",
  },
  {
    username: "pro",
    password: "test",
    role: "PROFESSIONAL",
    roleName: "전문가",
    userId: "00000000-0000-0000-0000-000000000005",
    icon: <GraduationCap className="h-8 w-8" />,
    color: "bg-amber-500/10 text-amber-400",
    redirect: "/professional/my/dashboard",
  },
]

export default function DevLoginPage() {
  const router = useRouter()
  const [loggingIn, setLoggingIn] = useState<string | null>(null)
  const [isDev, setIsDev] = useState(true)

  useEffect(() => {
    // In production, redirect to normal login
    if (process.env.NODE_ENV === "production") {
      setIsDev(false)
      router.replace("/login")
    }
  }, [router])

  const handleLogin = async (account: TestAccount) => {
    setLoggingIn(account.username)
    try {
      const res = await fetch("/api/v1/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: account.username,
          password: account.password,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || "로그인 실패")
      }

      await res.json()

      // Set both cookies client-side
      const maxAge = 60 * 60 * 24
      document.cookie = `active_role=${account.role}; path=/; max-age=${maxAge}`
      document.cookie = `dev_user_id=${account.userId}; path=/; max-age=${maxAge}`
      document.cookie = `dev_user_active=true; path=/; max-age=${maxAge}`

      // Store dev_user in localStorage for AuthProvider
      const devUser = {
        id: account.userId,
        email: `${account.username}@nplatform.dev`,
        name: account.roleName,
        role: account.role,
        company_name: "NPLatform",
        phone: "010-0000-0000",
        is_verified: true,
        kyc_status: "APPROVED",
        mfa_enabled: false,
        phone_verified: true,
        preferred_language: "ko",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      localStorage.setItem("dev_user", JSON.stringify(devUser))
      window.dispatchEvent(new Event("dev-login"))

      toast.success(`${account.roleName}(으)로 로그인되었습니다.`)
      router.push(account.redirect)
    } catch (err: any) {
      toast.error(err.message || "로그인에 실패했습니다.")
    } finally {
      setLoggingIn(null)
    }
  }

  if (!isDev) return null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Environment Badge */}
      <div className="mb-6 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="h-3.5 w-3.5" />
          환경: 개발 모드
        </span>
      </div>

      {/* Title */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1B3A5C]">
          개발 테스트 로그인
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          테스트 계정을 선택하여 빠르게 로그인합니다
        </p>
      </div>

      {/* Account Cards */}
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEST_ACCOUNTS.map((account) => (
          <Card
            key={account.username}
            className="group border-0 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg bg-[var(--color-surface-elevated)] cursor-pointer"
            onClick={() => !loggingIn && handleLogin(account)}
          >
            <CardContent className="flex flex-col items-center p-6">
              {/* Icon */}
              <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${account.color}`}>
                {account.icon}
              </div>

              {/* Role Name */}
              <h3 className="text-lg font-bold text-[var(--color-text-primary)]">{account.roleName}</h3>

              {/* Credentials */}
              <div className="mt-3 w-full space-y-1.5 rounded-lg bg-[var(--color-surface-overlay)] p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono font-medium text-[var(--color-text-primary)]">{account.username}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">PW</span>
                  <span className="font-mono font-medium text-[var(--color-text-primary)]">{account.password}</span>
                </div>
              </div>

              {/* Login Button */}
              <button
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1B3A5C] hover:bg-[#152d49] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loggingIn === account.username}
                onClick={(e) => {
                  e.stopPropagation()
                  handleLogin(account)
                }}
              >
                {loggingIn === account.username ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    로그인 중...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" /> 로그인
                  </>
                )}
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-xs text-[var(--color-text-muted)] text-center max-w-md">
        이 페이지는 개발 환경에서만 접근 가능합니다. 프로덕션 환경에서는 자동으로 일반 로그인 페이지로 이동합니다.
      </p>
    </div>
  )
}
