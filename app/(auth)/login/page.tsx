'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, MessageCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saveId, setSaveId] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const roleDashboard: Record<string, string> = {
        SUPER_ADMIN: '/admin', ADMIN: '/admin',
        SELLER: '/seller/dashboard', BUYER: '/exchange',
        BUYER_INST: '/exchange', BUYER_INDV: '/exchange',
        PROFESSIONAL: '/professional/my/dashboard',
        PARTNER: '/partner/dashboard', VIEWER: '/',
      }

      // ─── Dev bypass: admin/admin (SUPER_ADMIN) and demo/demo (BUYER_INDV) ───
      const devCreds: Record<string, { role: string; name: string; tier: string }> = {
        'admin|admin': { role: 'SUPER_ADMIN', name: '관리자', tier: 'L3' },
        'demo|demo':   { role: 'BUYER_INDV', name: '데모 사용자', tier: 'L1' },
        'seller|seller': { role: 'SELLER', name: '매도자 데모', tier: 'L1' },
      }
      const devKey = `${email.trim().toLowerCase()}|${password}`
      const devMatch = devCreds[devKey]
      if (devMatch) {
        const devUser = {
          id: `dev-${devMatch.role.toLowerCase()}-uuid`,
          email: `${email}@nplatform.dev`,
          name: devMatch.name,
          role: devMatch.role,
          approval_status: 'APPROVED',
          identity_verified: true,
          kyc_status: 'APPROVED',
          investor_tier: devMatch.tier,
          created_at: new Date().toISOString(),
        }
        localStorage.setItem('dev_user', JSON.stringify(devUser))
        document.cookie = `active_role=${devMatch.role};path=/;max-age=${60 * 60 * 24 * 30}`
        document.cookie = `dev_user_active=1;path=/;max-age=${60 * 60 * 24 * 30}`
        window.dispatchEvent(new Event('dev-login'))
        router.push(roleDashboard[devMatch.role] || '/')
        router.refresh()
        return
      }

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) { setError('이메일 또는 비밀번호가 올바르지 않습니다. (개발: admin/admin, demo/demo, seller/seller 사용 가능)'); return }

      // user_metadata.role 우선 사용, 없으면 DB에서 조회
      let userRole: string | undefined = authData.user?.user_metadata?.role

      if (!userRole) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', authData.user.id)
          .single()
        userRole = profile?.role
      }

      if (!userRole) { router.push('/select-role'); return }

      document.cookie = `active_role=${userRole};path=/;max-age=${60 * 60 * 24 * 30}`
      router.push(roleDashboard[userRole] || '/')
      router.refresh()
    } catch {
      setError('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 입력 텍스트가 확실히 보이도록 bg-white + slate-900 명시 (다크모드에서도 유지)
  const inputCls = 'border border-[#E2E8F0] rounded-xl px-4 py-3 w-full focus:ring-2 focus:ring-[#2E75B6] focus:border-transparent outline-none bg-white !text-slate-900 placeholder:text-slate-400 text-sm transition-all'

  return (
    <div className="min-h-screen flex">
      {/* LEFT PANEL — only xl+ (≥1280px) */}
      <div className="hidden xl:flex xl:w-[420px] 2xl:w-[480px] shrink-0 bg-[var(--color-brand-deepest)] flex-col justify-between p-10 2xl:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-[#2E75B6]/15 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-[var(--color-brand-dark)]/40 blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-[#2E75B6] flex items-center justify-center shadow-lg shadow-[#2E75B6]/30 shrink-0">
            <span className="text-white font-black text-base">N</span>
          </div>
          <span className="text-2xl font-black text-white tracking-tight whitespace-nowrap">NPLatform</span>
        </div>

        {/* Hero */}
        <div className="relative space-y-6">
          <div className="absolute -top-16 -left-8 w-64 h-64 rounded-full bg-[#2E75B6]/10 blur-2xl pointer-events-none" />
          <div className="space-y-3">
            <h2 className="text-3xl 2xl:text-4xl font-black text-white leading-tight" style={{ wordBreak: 'keep-all' }}>
              다시 만나서<br />반갑습니다
            </h2>
            <p className="text-base text-[#94A3B8]" style={{ wordBreak: 'keep-all' }}>NPL 투자의 미래가 여기 있습니다</p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-[#64748B]">
            <div className="flex items-center gap-2">
              <span>가입자</span>
              <strong className="text-[#94A3B8]">12,847명</strong>
            </div>
            <div className="flex items-center gap-2">
              <span>완료 거래</span>
              <strong className="text-[#94A3B8]">₩128억</strong>
            </div>
            <div className="flex items-center gap-2">
              <span>AI 분석</span>
              <strong className="text-[#94A3B8]">28,400건</strong>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative text-sm text-[#64748B] shrink-0">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-white font-bold hover:text-[#2E75B6] transition-colors">무료 가입</Link>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 min-w-0 bg-white flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">

          {/* Mobile/tablet logo — hidden on xl+ */}
          <div className="flex items-center gap-2 mb-8 xl:hidden">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-brand-deep)] flex items-center justify-center">
              <span className="text-white font-black text-sm">N</span>
            </div>
            <span className="text-lg font-black text-[var(--color-brand-deep)]">NPLatform</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-[var(--color-brand-deep)] tracking-normal">로그인</h1>
            <p className="mt-2 text-sm text-[#64748B] tracking-normal">NPLatform에 오신 것을 환영합니다</p>
          </div>

          {/* Social logins */}
          <div className="space-y-3 mb-6">
            <button
              type="button"
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: `${window.location.origin}/auth/callback` } })}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-[#FEE500] text-[#3A1D1D] font-semibold text-sm hover:brightness-95 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              카카오로 계속하기
            </button>
            <button
              type="button"
              onClick={() => supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } })}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-white border border-[#E2E8F0] text-[#374151] font-semibold text-sm hover:bg-[#F8FAFC] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.148 17.64 11.84 17.64 9.2z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Google로 계속하기
            </button>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-[#03C75A] text-white font-semibold text-sm hover:bg-[#02B050] transition-all"
            >
              <span className="font-black text-base leading-none">N</span>
              네이버로 계속하기
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[#E2E8F0]" />
            <span className="text-xs text-[#94A3B8] font-medium tracking-normal">또는 이메일로 로그인</span>
            <div className="flex-1 h-px bg-[#E2E8F0]" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="text"
              placeholder="이메일 또는 아이디"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className={inputCls}
            />

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className={`${inputCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#64748B] cursor-pointer select-none">
                <input type="checkbox" checked={saveId} onChange={(e) => setSaveId(e.target.checked)} className="w-4 h-4 rounded border-[#E2E8F0] accent-[#2E75B6]" />
                아이디 저장
              </label>
              <Link href="/forgot-password" className="text-sm text-[#2E75B6] hover:text-[var(--color-brand-dark)] transition-colors font-medium">비밀번호 찾기</Link>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                <span className="text-xs font-bold text-red-500">!</span>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-brand-dark)] text-white py-4 rounded-xl text-lg font-bold hover:bg-[#2E75B6] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> 로그인 중...</> : '로그인'}
            </button>

            {/* Dev credentials hint */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 leading-relaxed">
              <p className="font-bold mb-1">🔓 개발용 테스트 계정</p>
              <button type="button" onClick={() => { setEmail('admin'); setPassword('admin') }} className="block hover:underline">
                <code className="font-mono">admin / admin</code> — 관리자 (SUPER_ADMIN)
              </button>
              <button type="button" onClick={() => { setEmail('demo'); setPassword('demo') }} className="block hover:underline">
                <code className="font-mono">demo / demo</code> — 개인 투자자 (BUYER)
              </button>
              <button type="button" onClick={() => { setEmail('seller'); setPassword('seller') }} className="block hover:underline">
                <code className="font-mono">seller / seller</code> — 매도자 (SELLER)
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-[#64748B]">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-[#2E75B6] font-bold hover:text-[var(--color-brand-dark)] transition-colors">회원가입</Link>
          </div>

        </div>
      </div>
    </div>
  )
}
