"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck, User, Building2, Briefcase, Users, GraduationCap,
  LogIn, AlertTriangle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { t } from "@/lib/i18n"

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
    color: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    redirect: "/admin",
  },
  {
    username: "seller",
    password: "test",
    role: "SELLER",
    roleName: "매도자",
    userId: "00000000-0000-0000-0000-000000000002",
    icon: <Building2 className="h-8 w-8" />,
    color: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    redirect: "/seller/dashboard",
  },
  {
    username: "buyer",
    password: "test",
    role: "BUYER",
    roleName: "매수자",
    userId: "00000000-0000-0000-0000-000000000003",
    icon: <User className="h-8 w-8" />,
    color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    redirect: "/exchange",
  },
  {
    username: "partner",
    password: "test",
    role: "PARTNER",
    roleName: "파트너",
    userId: "00000000-0000-0000-0000-000000000004",
    icon: <Users className="h-8 w-8" />,
    color: "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    redirect: "/partner/dashboard",
  },
  {
    username: "pro",
    password: "test",
    role: "PROFESSIONAL",
    roleName: "전문가",
    userId: "00000000-0000-0000-0000-000000000005",
    icon: <GraduationCap className="h-8 w-8" />,
    color: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
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
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800 px-3 py-1 text-sm">
          <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
          {t('auth.devModeLabel') || '환경: 개발 모드'}
        </Badge>
      </div>

      {/* Title */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[#1B3A5C] dark:text-white">
          {t('auth.devLoginTitle') || '개발 테스트 로그인'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground dark:text-gray-400">
          {t('auth.devLoginSubtitle') || '테스트 계정을 선택하여 빠르게 로그인합니다'}
        </p>
      </div>

      {/* Account Cards */}
      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TEST_ACCOUNTS.map((account) => (
          <Card
            key={account.username}
            className="group border-0 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg dark:bg-gray-900 cursor-pointer"
            onClick={() => !loggingIn && handleLogin(account)}
          >
            <CardContent className="flex flex-col items-center p-6">
              {/* Icon */}
              <div className={`mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${account.color}`}>
                {account.icon}
              </div>

              {/* Role Name */}
              <h3 className="text-lg font-bold dark:text-white">{account.roleName}</h3>

              {/* Credentials */}
              <div className="mt-3 w-full space-y-1.5 rounded-lg bg-gray-50 dark:bg-gray-800 p-3">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-gray-400">ID</span>
                  <span className="font-mono font-medium dark:text-gray-200">{account.username}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground dark:text-gray-400">PW</span>
                  <span className="font-mono font-medium dark:text-gray-200">{account.password}</span>
                </div>
              </div>

              {/* Login Button */}
              <Button
                className="mt-4 w-full bg-[#1B3A5C] hover:bg-[#152d49]"
                disabled={loggingIn === account.username}
                onClick={(e) => {
                  e.stopPropagation()
                  handleLogin(account)
                }}
              >
                {loggingIn === account.username ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('auth.loginLoading') || '로그인 중...'}
                  </span>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" /> {t('auth.loginButton') || '로그인'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-xs text-muted-foreground dark:text-gray-500 text-center max-w-md">
        {t('auth.devLoginFooter') || '이 페이지는 개발 환경에서만 접근 가능합니다. 프로덕션 환경에서는 자동으로 일반 로그인 페이지로 이동합니다.'}
      </p>
    </div>
  )
}
