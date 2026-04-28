'use client'

/**
 * /login — McKinsey White Paper · Electric Blue accent
 *
 * - 좌측 패널 (xl+): Ink deep navy + Electric Blue glow + serif hero copy
 * - 우측 패널 (모든 viewport): paper + sharp corners + 2px electric blue top accent
 * - 폼: sharp inputs + electric blue focus ring + dev creds 안내 카드
 * - 모든 기능 로직 (Supabase / dev bypass / role redirect) 보존
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, MessageCircle, ArrowRight, ShieldCheck } from 'lucide-react'

const INK = '#0A1628'
const PAPER = '#FFFFFF'
const PAPER_TINT = '#F8FAFC'
const ELECTRIC = '#2251FF'
const ELECTRIC_DARK = '#1A47CC'
const CYAN = '#00A9F4'
const SKY = '#A8CDE8'
const INK_MID = 'rgba(5, 28, 44, 0.65)'
const INK_MUTED = 'rgba(5, 28, 44, 0.45)'
const BORDER = 'rgba(5, 28, 44, 0.10)'
const BORDER_STRONG = 'rgba(5, 28, 44, 0.20)'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saveId, setSaveId] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSocialLogin = async (provider: 'kakao' | 'google') => {
    try {
      const supabase = createClient()
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
    } catch {
      setError('소셜 로그인은 현재 사용할 수 없습니다. 아이디/비밀번호로 로그인해주세요.')
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const roleDashboard: Record<string, string> = {
      SUPER_ADMIN: '/admin', ADMIN: '/admin',
      SELLER: '/my/seller', BUYER: '/exchange',
      BUYER_INST: '/exchange', BUYER_INDV: '/exchange',
      PROFESSIONAL: '/my/professional', PARTNER: '/my/partner', VIEWER: '/',
    }

    // Dev bypass
    const devCreds: Record<string, { role: string; name: string; tier: string }> = {
      'admin|admin': { role: 'SUPER_ADMIN', name: '관리자', tier: 'L3' },
      'demo|demo':   { role: 'BUYER_INDV', name: '데모 사용자', tier: 'L1' },
      'seller|seller': { role: 'SELLER', name: '매도자 데모', tier: 'L1' },
    }
    const devKey = `${email.trim().toLowerCase()}|${password}`
    const devMatch = devCreds[devKey]
    if (devMatch) {
      try {
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
        try { localStorage.setItem('dev_user', JSON.stringify(devUser)) } catch { /* private mode */ }
        document.cookie = `active_role=${devMatch.role};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`
        document.cookie = `dev_user_active=1;path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`
        try { window.dispatchEvent(new Event('dev-login')) } catch { /* ignore */ }
        const target = roleDashboard[devMatch.role] || '/'
        window.location.href = target
        return
      } catch (err) {
        console.error('[Login] dev bypass error:', err)
        setError('개발 로그인 중 오류가 발생했습니다. 브라우저 콘솔을 확인해주세요.')
        setLoading(false)
        return
      }
    }

    // Real Supabase auth
    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다. (개발: admin/admin · demo/demo · seller/seller)')
        setLoading(false)
        return
      }

      let userRole: string | undefined = authData.user?.user_metadata?.role
      if (!userRole) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', authData.user.id)
            .single()
          userRole = profile?.role
        } catch { /* lookup failed */ }
      }
      if (!userRole) { router.push('/select-role'); return }

      document.cookie = `active_role=${userRole};path=/;max-age=${60 * 60 * 24 * 30};SameSite=Lax`
      window.location.href = roleDashboard[userRole] || '/'
    } catch (err) {
      console.error('[Login] Supabase auth error:', err)
      setError('로그인 서버에 연결할 수 없습니다. 테스트 계정을 시도해주세요.')
      setLoading(false)
    }
  }

  // McKinsey 스타일 input — sharp corners + electric blue focus
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 48,
    padding: '12px 14px',
    background: PAPER,
    border: `1px solid ${BORDER_STRONG}`,
    borderRadius: 0,
    fontSize: 13,
    fontWeight: 500,
    color: INK,
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
    transition: 'border-color 0.12s, box-shadow 0.12s',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = ELECTRIC
    e.currentTarget.style.borderTopColor = ELECTRIC
    e.currentTarget.style.borderTopWidth = '2px'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34, 81, 255, 0.12)'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = BORDER_STRONG
    e.currentTarget.style.borderTopWidth = '1px'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div className="min-h-screen flex" style={{ background: PAPER }}>
      {/* ── LEFT PANEL — only xl+ ─────────────────────────────────── */}
      <div
        className="hidden xl:flex xl:w-[440px] 2xl:w-[500px] shrink-0 flex-col justify-between relative overflow-hidden mck-cta-dark"
        style={{ background: INK, padding: '40px' }}
      >
        {/* Top accent stripes — McKinsey signature */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: ELECTRIC }} />
        <div style={{ position: 'absolute', top: 4, left: 0, right: 0, height: 1, background: CYAN }} />

        {/* Subtle electric glow */}
        <div style={{ position: 'absolute', top: -120, right: -120, width: 360, height: 360, background: 'radial-gradient(circle, rgba(34,81,255,0.18) 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 280, height: 280, background: 'radial-gradient(circle, rgba(0,169,244,0.10) 0%, transparent 60%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <Link
          href="/"
          aria-label="NPLatform 홈으로"
          className="relative flex items-center gap-2.5 shrink-0"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              width: 36, height: 36,
              background: ELECTRIC,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(34, 81, 255, 0.45)',
            }}
          >
            <span style={{ color: PAPER, fontWeight: 900, fontSize: 16, letterSpacing: '-0.04em' }}>N</span>
          </div>
          <span style={{ color: PAPER, fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em' }}>NPL</span>
          <span style={{ color: SKY, fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', marginLeft: -7 }}>atform</span>
        </Link>

        {/* Hero */}
        <div className="relative" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: ELECTRIC, textTransform: 'uppercase', marginBottom: 10 }}>
              Welcome back
            </div>
            <h2 style={{ fontFamily: 'Georgia, serif', color: PAPER, fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              다시 만나서<br />
              <span style={{ color: SKY }}>반갑습니다.</span>
            </h2>
            <p style={{ marginTop: 14, fontSize: 14, color: 'rgba(168, 205, 232, 0.80)', lineHeight: 1.5, maxWidth: 320 }}>
              AI 기반 NPL 거래 플랫폼 — 매물 탐색부터 거래 완결까지 단일 화면.
            </p>
          </div>

          {/* Editorial KPI list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            {[
              { label: '가입자', value: '12,847명' },
              { label: '완료 거래', value: '₩128억' },
              { label: 'AI 분석', value: '28,400건' },
            ].map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                  {kpi.label}
                </span>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, fontWeight: 800, color: PAPER, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                  {kpi.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative shrink-0" style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
          계정이 없으신가요?{' '}
          <Link href="/signup" style={{ color: PAPER, fontWeight: 800, textDecoration: 'none', borderBottom: `2px solid ${ELECTRIC}` }}>
            무료 가입 →
          </Link>
        </div>
      </div>

      {/* ── RIGHT PANEL — login form ──────────────────────────────── */}
      <div className="flex-1 min-w-0 flex items-center justify-center" style={{ padding: '24px', background: PAPER_TINT }}>
        <div className="w-full" style={{ maxWidth: 420 }}>

          {/* Mobile/tablet logo */}
          <Link
            href="/"
            aria-label="NPLatform 홈으로"
            className="flex items-center gap-2 xl:hidden"
            style={{ marginBottom: 28, textDecoration: 'none' }}
          >
            <div style={{ width: 32, height: 32, background: ELECTRIC, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: PAPER, fontWeight: 900, fontSize: 14, letterSpacing: '-0.04em' }}>N</span>
            </div>
            <span style={{ color: INK, fontSize: 17, fontWeight: 900, letterSpacing: '-0.02em' }}>NPLatform</span>
          </Link>

          {/* Form panel — paper card with electric top stripe */}
          <div
            style={{
              background: PAPER,
              border: `1px solid ${BORDER}`,
              borderTop: `2px solid ${ELECTRIC}`,
              padding: '36px 32px',
              boxShadow: '0 12px 24px -8px rgba(5, 28, 44, 0.10), 0 4px 8px -2px rgba(5, 28, 44, 0.06)',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: ELECTRIC, textTransform: 'uppercase', marginBottom: 8 }}>
                Sign in
              </div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 900, color: INK, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                로그인
              </h1>
              <p style={{ marginTop: 8, fontSize: 13, color: INK_MID, fontWeight: 500 }}>
                NPLatform 에 오신 것을 환영합니다
              </p>
            </div>

            {/* Social — sharp tonal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              <button
                type="button"
                onClick={() => handleSocialLogin('kakao')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  height: 44,
                  background: '#FEE500', color: '#3A1D1D',
                  border: '1px solid rgba(0,0,0,0.05)',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <MessageCircle size={14} /> 카카오로 계속하기
              </button>
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  height: 44,
                  background: PAPER, color: INK,
                  border: `1px solid ${BORDER_STRONG}`,
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.148 17.64 11.84 17.64 9.2z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Google 로 계속하기
              </button>
              <button
                type="button"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  height: 44,
                  background: '#03C75A', color: PAPER,
                  border: '1px solid #03C75A',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                <span style={{ fontWeight: 900, fontSize: 14, color: PAPER }}>N</span> 네이버로 계속하기
              </button>
            </div>

            {/* Divider — McKinsey thin rule */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: INK_MUTED, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
                또는 이메일로 로그인
              </span>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: ELECTRIC, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>
                  이메일 또는 아이디
                </label>
                <input
                  type="text"
                  placeholder="example@nplatform.co.kr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  style={inputStyle}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 800, color: ELECTRIC, letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: 6 }}>
                  비밀번호
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={onFocus}
                    onBlur={onBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      color: INK_MUTED,
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Save id + forgot — McKinsey horizontal */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: INK_MID, cursor: 'pointer', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={saveId}
                    onChange={(e) => setSaveId(e.target.checked)}
                    style={{ width: 14, height: 14, accentColor: ELECTRIC, borderRadius: 0 }}
                  />
                  아이디 저장
                </label>
                <Link href="/forgot-password" style={{ fontSize: 12, color: ELECTRIC, fontWeight: 700, textDecoration: 'none' }}>
                  비밀번호 찾기
                </Link>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '12px 14px',
                  background: 'rgba(220, 38, 38, 0.06)',
                  border: '1px solid rgba(220, 38, 38, 0.30)',
                  borderLeft: '3px solid #DC2626',
                  fontSize: 12, color: '#991B1B',
                  marginTop: 4,
                }}>
                  <span style={{ fontWeight: 800, color: '#DC2626' }}>!</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit — McKinsey dark CTA */}
              <button
                type="submit"
                disabled={loading}
                className="mck-cta-dark"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  height: 50,
                  marginTop: 8,
                  background: INK, color: PAPER,
                  border: 'none',
                  borderTop: `2px solid ${ELECTRIC}`,
                  fontSize: 14, fontWeight: 800, letterSpacing: '-0.01em',
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 6px 16px rgba(10, 22, 40, 0.20)',
                }}
              >
                {loading ? (
                  <><Loader2 size={14} className="animate-spin" style={{ color: PAPER }} /> <span style={{ color: PAPER }}>로그인 중…</span></>
                ) : (
                  <><span style={{ color: PAPER }}>로그인</span> <ArrowRight size={14} style={{ color: PAPER }} /></>
                )}
              </button>

              {/* Dev creds — McKinsey sky-blue editorial card */}
              <div style={{
                marginTop: 14,
                padding: '14px 16px',
                background: 'rgba(168, 205, 232, 0.18)',
                border: `1px solid ${SKY}`,
                borderTop: `2px solid ${ELECTRIC}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <ShieldCheck size={12} style={{ color: ELECTRIC_DARK }} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: ELECTRIC_DARK, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                    Dev test accounts
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: INK }}>
                  {[
                    { id: 'admin',  pw: 'admin',  label: '관리자 (SUPER_ADMIN)' },
                    { id: 'demo',   pw: 'demo',   label: '투자자 (BUYER)' },
                    { id: 'seller', pw: 'seller', label: '매도자 (SELLER)' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setEmail(c.id); setPassword(c.pw) }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        padding: '4px 0',
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: INK, fontSize: 11, fontWeight: 600,
                        textAlign: 'left',
                      }}
                    >
                      <code style={{ fontFamily: 'monospace', fontWeight: 800, color: ELECTRIC_DARK }}>
                        {c.id} / {c.pw}
                      </code>
                      <span style={{ color: INK_MID }}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {/* Footer link */}
            <div style={{ marginTop: 24, textAlign: 'center', fontSize: 12, color: INK_MID }}>
              계정이 없으신가요?{' '}
              <Link href="/signup" style={{ color: ELECTRIC, fontWeight: 800, textDecoration: 'none' }}>
                회원가입 →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
