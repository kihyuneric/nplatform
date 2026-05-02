'use client'

/**
 * /signup — McKinsey White Paper · Electric Blue accent (v3 · 2026-04-29)
 *
 * 사용자 정합 정책:
 *   - /login 과 동일한 2-panel 디자인 (좌: ink hero + KPI / 우: paper form)
 *   - 회원 유형 3개 (매각사 · 매입사 · 파트너)
 *   - 가입 후 사업자등록증/명함 인증 → 6개월 무료 안내
 *   - 단일 폼 (1-step) 으로 단순화 — 인증 서류는 가입 후 마이페이지에서 업로드
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Eye, EyeOff, Loader2, Banknote, TrendingUp, User as UserIcon,
  CheckCircle2, ArrowRight, ShieldCheck,
} from 'lucide-react'

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
const DANGER = '#9F1239'
const DANGER_BG = 'rgba(225, 29, 72, 0.06)'

// ─── 회원 유형 (3개 — 매각사 · 매입사 · 파트너) ─────────────
const SIGNUP_ROLES = [
  {
    value: 'SELLER',
    label: '매각사',
    desc: '은행 · 저축은행 · AMC · 대부업체 · 캐피탈 · 보험사',
    icon: Banknote,
  },
  {
    value: 'BUYER',
    label: '매입사',
    desc: '자산가 · 법인 · 대부업체 · AMC · 투자운용사',
    icon: TrendingUp,
  },
  {
    value: 'PARTNER',
    label: '파트너',
    desc: '자문사 · 법무법인 · 회계법인',
    icon: UserIcon,
  },
] as const

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    company: '',
    phone: '',
    role: 'SELLER',
  })
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (form.password !== form.passwordConfirm) {
      setError('비밀번호 확인이 일치하지 않습니다.')
      return
    }
    if (!agreeTerms || !agreePrivacy) {
      setError('이용약관과 개인정보 수집에 동의해주세요.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            company: form.company,
            phone: form.phone,
            role: form.role,
            marketing_opt_in: agreeMarketing,
          },
        },
      })

      if (authError) {
        setError(authError.message ?? '가입 처리 중 오류가 발생했습니다.')
        setLoading(false)
        return
      }

      // Onboarding 으로 이동 — 사업자등록증/명함 업로드 안내
      if (data.user) {
        router.push('/onboarding?welcome=1')
      } else {
        // 이메일 확인이 필요한 경우
        router.push('/login?verify=1')
      }
    } catch (err) {
      console.error('[Signup] error:', err)
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
      setLoading(false)
    }
  }

  // McKinsey input style — login 과 동일
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    padding: '10px 14px',
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
      {/* ── LEFT PANEL — only xl+ ───────────────────────────────── */}
      <div
        className="hidden xl:flex xl:w-[440px] 2xl:w-[500px] shrink-0 flex-col justify-between relative overflow-hidden"
        style={{ background: INK, padding: '40px' }}
      >
        {/* Top accent stripes */}
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
              Join NPLatform
            </div>
            <h2 style={{ fontFamily: 'Georgia, serif', color: PAPER, fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              사업자/명함 인증 후<br />
              <span style={{ color: SKY }}>6개월 무료.</span>
            </h2>
            <p style={{ marginTop: 14, fontSize: 14, color: 'rgba(168, 205, 232, 0.80)', lineHeight: 1.5, maxWidth: 320 }}>
              가입 후 사업자등록증 또는 명함을 업로드하시면 1~2 영업일 내 검증되어 거래소·딜룸·분석·NDA·LOI 무제한 사용 가능합니다.
            </p>
          </div>

          {/* Process steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            {[
              { num: '01', label: '회원가입', desc: '이메일 + 비밀번호 + 회원 유형' },
              { num: '02', label: '사업자/명함 인증', desc: '운영팀 검증 1~2 영업일' },
              { num: '03', label: '6개월 무료 사용', desc: '거래 체결 시점에만 수수료' },
            ].map((s) => (
              <div
                key={s.num}
                style={{
                  display: 'grid', gridTemplateColumns: '36px 1fr', gap: 12,
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.10)',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 900, color: ELECTRIC, letterSpacing: '-0.02em' }}>
                  {s.num}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: PAPER, marginBottom: 2 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — login link */}
        <div className="relative shrink-0" style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
          이미 계정이 있으신가요?{' '}
          <Link
            href="/login"
            style={{ color: PAPER, fontWeight: 800, textDecoration: 'none', borderBottom: `2px solid ${ELECTRIC}` }}
          >
            로그인 →
          </Link>
        </div>
      </div>

      {/* ── RIGHT PANEL — signup form ──────────────────────────── */}
      <div className="flex-1 min-w-0 flex items-start justify-center" style={{ padding: '24px', background: PAPER_TINT, overflowY: 'auto' }}>
        <div className="w-full" style={{ maxWidth: 460, paddingTop: 12 }}>

          {/* Mobile/tablet logo */}
          <Link
            href="/"
            aria-label="NPLatform 홈으로"
            className="flex items-center gap-2 xl:hidden"
            style={{ marginBottom: 20, textDecoration: 'none' }}
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
              padding: '32px 28px',
              boxShadow: '0 12px 24px -8px rgba(5, 28, 44, 0.10), 0 4px 8px -2px rgba(5, 28, 44, 0.06)',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: ELECTRIC, textTransform: 'uppercase', marginBottom: 8 }}>
                Sign up
              </div>
              <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 900, color: INK, letterSpacing: '-0.025em', lineHeight: 1.1 }}>
                회원가입
              </h1>
              <p style={{ marginTop: 8, fontSize: 13, color: INK_MID, fontWeight: 500 }}>
                NPLatform 에 오신 것을 환영합니다
              </p>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  background: DANGER_BG,
                  border: `1px solid ${DANGER}`,
                  borderLeft: `3px solid ${DANGER}`,
                  marginBottom: 18,
                  fontSize: 12,
                  color: DANGER,
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Role selection */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                  회원 유형 <span style={{ color: ELECTRIC }}>*</span>
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {SIGNUP_ROLES.map(({ value, label, desc, icon: Icon }) => {
                    const selected = form.role === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => update('role', value)}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          background: selected ? '#EFF6FF' : PAPER,
                          border: `1px solid ${selected ? ELECTRIC : BORDER_STRONG}`,
                          borderTop: selected ? `2px solid ${ELECTRIC}` : `1px solid ${BORDER_STRONG}`,
                          borderRadius: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 12,
                        }}
                      >
                        <div
                          style={{
                            width: 32, height: 32,
                            background: selected ? ELECTRIC : '#F1F5F9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={14} style={{ color: selected ? PAPER : INK_MUTED }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: selected ? INK : INK }}>
                            {label}
                          </div>
                          <div style={{ fontSize: 11, color: INK_MID, marginTop: 1, lineHeight: 1.4 }}>
                            {desc}
                          </div>
                        </div>
                        {selected && <CheckCircle2 size={16} style={{ color: ELECTRIC, flexShrink: 0 }} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                  이메일 <span style={{ color: ELECTRIC }}>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="name@company.co.kr"
                  required
                  style={inputStyle}
                />
              </div>

              {/* Password */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="pw" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                    비밀번호 <span style={{ color: ELECTRIC }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="pw"
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => update('password', e.target.value)}
                      onFocus={onFocus}
                      onBlur={onBlur}
                      placeholder="8자 이상"
                      required
                      style={{ ...inputStyle, paddingRight: 36 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'transparent', border: 0, cursor: 'pointer',
                        color: INK_MUTED, padding: 4,
                      }}
                      aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="pw2" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                    비밀번호 확인 <span style={{ color: ELECTRIC }}>*</span>
                  </label>
                  <input
                    id="pw2"
                    type={showPassword ? 'text' : 'password'}
                    value={form.passwordConfirm}
                    onChange={(e) => update('passwordConfirm', e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder="동일 비밀번호 입력"
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Name + Company */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="name" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                    이름 <span style={{ color: ELECTRIC }}>*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder="홍길동"
                    required
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="company" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                    회사명
                  </label>
                  <input
                    id="company"
                    type="text"
                    value={form.company}
                    onChange={(e) => update('company', e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder="(주) 회사명 (선택)"
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                  연락처 <span style={{ color: ELECTRIC }}>*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="010-1234-5678"
                  required
                  style={inputStyle}
                />
              </div>

              {/* 인증 안내 */}
              <div
                style={{
                  background: '#EFF6FF',
                  border: `1px solid ${ELECTRIC}40`,
                  borderLeft: `3px solid ${ELECTRIC}`,
                  padding: '12px 14px',
                  fontSize: 11,
                  color: INK_MID,
                  lineHeight: 1.6,
                }}
              >
                <ShieldCheck size={13} style={{ color: ELECTRIC, marginRight: 6, verticalAlign: 'middle' }} />
                <strong style={{ color: INK }}>가입 후 인증 필수</strong> — 마이페이지에서 사업자등록증 또는 명함을 업로드하시면 운영팀 검증 (1~2 영업일) 후 6개월 무료로 모든 기능 사용 가능합니다.
              </div>

              {/* 약관 동의 */}
              <div
                style={{
                  borderTop: `1px solid ${BORDER}`,
                  paddingTop: 14,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: INK, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    style={{ marginTop: 2, accentColor: ELECTRIC }}
                  />
                  <span>
                    <strong>(필수)</strong>{' '}
                    <Link href="/terms" target="_blank" style={{ color: ELECTRIC, textDecoration: 'underline' }}>이용약관</Link>
                    에 동의합니다.
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: INK, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    style={{ marginTop: 2, accentColor: ELECTRIC }}
                  />
                  <span>
                    <strong>(필수)</strong>{' '}
                    <Link href="/terms/privacy" target="_blank" style={{ color: ELECTRIC, textDecoration: 'underline' }}>개인정보 수집·이용</Link>
                    에 동의합니다.
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: INK_MID, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={agreeMarketing}
                    onChange={(e) => setAgreeMarketing(e.target.checked)}
                    style={{ marginTop: 2, accentColor: ELECTRIC }}
                  />
                  <span>
                    <strong>(선택)</strong> 마케팅 · 신규 매물 알림 수신에 동의합니다.
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  height: 48,
                  background: loading ? INK_MUTED : INK,
                  color: PAPER,
                  border: 0,
                  borderTop: `2px solid ${ELECTRIC}`,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '-0.01em',
                  cursor: loading ? 'wait' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : '0 4px 12px rgba(10, 22, 40, 0.18)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    가입 처리 중…
                  </>
                ) : (
                  <>
                    가입하기
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Mobile login link */}
          <p
            className="xl:hidden"
            style={{ marginTop: 20, fontSize: 12, color: INK_MID, textAlign: 'center' }}
          >
            이미 계정이 있으신가요?{' '}
            <Link
              href="/login"
              style={{ color: ELECTRIC, fontWeight: 700, textDecoration: 'underline' }}
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
