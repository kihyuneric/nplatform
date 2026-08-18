'use client'

/**
 * /signup — McKinsey White Paper · Electric Blue accent (v3 · 2026-04-29)
 *
 * 사용자 정합 정책:
 *   - /login 과 동일한 2-panel 디자인 (좌: ink hero + KPI / 우: paper form)
 *   - 회원 유형 4개 (매각사 · 매입사 · 투자자 · 관리자/파트너)
 *   - 카카오/네이버 소셜 간편가입 + 이메일 가입
 *   - 직책 · 명함/사업자등록증 첨부 · 요청사항 필드
 *   - 첨부 서류는 운영팀 검증 → 6개월 무료 안내
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SELLER_INSTITUTION_OPTIONS } from '@/lib/taxonomy'
import {
  Eye, EyeOff, Loader2, Banknote, User as UserIcon,
  CheckCircle2, ArrowRight, ShieldCheck, Building2, Wallet,
  Upload, X, FileText,
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

// ─── 회원 유형 3종 (2026-08-18 확정) — 매각 회원 · 매입 회원 · 파트너 회원 ──
// 매입 회원은 법인·개인 통합 (기존 BUYER_INST/BUYER_INDV 가입자는 호환 유지)
const SIGNUP_ROLES = [
  {
    value: 'SELLER',
    label: '매각 회원',
    desc: '은행 · 저축은행 · AMC · 대부업체 · 캐피탈 · 보험사',
    icon: Banknote,
  },
  {
    value: 'BUYER',
    label: '매입 회원',
    desc: '법인 · 대부업체 · AMC · 투자운용사 · 개인 자산가 · 개인 투자자',
    icon: Building2,
  },
  // 파트너 회원 — 우선 삭제 (2026-08-18 사용자 지시)
] as const

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    company: '',
    title: '',
    phone: '',
    message: '',
    role: 'SELLER',
    institutionType: '',  // 매각사 기관 유형 — NPL 리스트와 동일 택소노미
    // D2 가입 분기 (2026-08-18)
    businessNo: '',       // 사업자등록번호 — 매각 · 매입(법인)
    buyerKind: '',        // 매입 세부유형: CORP(법인) / INDIVIDUAL(개인자산가)
    investScale: '',      // 개인자산가 — (선택) 투자 가능 규모
  })
  const [businessFile, setBusinessFile] = useState<File | null>(null)
  const [cardFile, setCardFile] = useState<File | null>(null)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ─── 소셜 로그인 (카카오 / 네이버) — provider 는 Supabase 대시보드에서 활성화 필요 ──
  const handleSocial = async (provider: 'kakao' | 'naver') => {
    setError('')
    try {
      const supabase = createClient()
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider as 'kakao',
        options: { redirectTo: `${window.location.origin}/onboarding?welcome=1` },
      })
      if (oauthError) {
        setError(`${provider === 'kakao' ? '카카오' : '네이버'} 로그인이 아직 설정되지 않았습니다.`)
      }
    } catch {
      setError('소셜 로그인에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
    }
  }

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
    if (form.role === 'BUYER' && !form.buyerKind) {
      setError('매입 세부유형(법인 / 개인자산가)을 선택해주세요.')
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
            title: form.title,
            phone: form.phone,
            role: form.role,
            roles: [form.role],           // D1 복수 역할 — 가입 시 1개, 이후 역할 추가 신청 가능
            buyer_kind: form.role === 'BUYER' ? form.buyerKind : null,   // CORP / INDIVIDUAL
            business_no: form.businessNo || null,
            invest_scale: form.role === 'BUYER' && form.buyerKind === 'INDIVIDUAL' ? form.investScale : null,
            institution_type: form.role === 'SELLER' ? form.institutionType : null,
            approval_status: 'PENDING',   // 관리자 승인 후에만 활성화 (승인제)
            message: form.message,
            business_file_name: businessFile?.name ?? null,
            card_file_name: cardFile?.name ?? null,
            marketing_opt_in: agreeMarketing,
          },
        },
      })

      if (authError) {
        setError(authError.message ?? '가입 처리 중 오류가 발생했습니다.')
        setLoading(false)
        return
      }

      // 가입 마지막 스텝 — 매입 회원은 기존 서비스와 동일한 매입조건 등록 화면으로 (폼 통일 · 2026-08-18)
      if (data.user) {
        if (form.role === 'BUYER' && data.session) {
          router.push('/exchange/demands/new?from=signup')
        } else {
          router.push('/pending-approval')
        }
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
              승인제 멤버십.<br />
              <span style={{ color: SKY }}>가입은 무료.</span>
            </h2>
            <p style={{ marginTop: 14, fontSize: 14, color: 'rgba(168, 205, 232, 0.80)', lineHeight: 1.5, maxWidth: 320 }}>
              아무나 들어올 수 없습니다. 명함·사업자등록증 기반으로 관리자가 승인한 회원만 활성화됩니다. 가입과 이용은 무료입니다.
            </p>
          </div>

          {/* Process steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, borderTop: '1px solid rgba(255,255,255,0.10)' }}>
            {[
              { num: '01', label: '가입 신청', desc: '유형 선택 + 정보 입력 + 명함/사업자등록증 첨부' },
              { num: '02', label: '관리자 승인', desc: '심사 1~2 영업일 · 승인 시 계정 활성화' },
              { num: '03', label: '무료 이용', desc: 'NPL 자동매칭 · NDA · 매입조건 등록' },
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

            {/* ─── 소셜 간편가입 (카카오 / 네이버) ─────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
              <button
                type="button"
                onClick={() => handleSocial('kakao')}
                style={{
                  width: '100%', height: 44,
                  background: '#FEE500', color: '#191600',
                  border: 0, borderRadius: 0,
                  fontSize: 13, fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 15 }}>💬</span> 카카오로 3초 시작
              </button>
              <button
                type="button"
                onClick={() => handleSocial('naver')}
                style={{
                  width: '100%', height: 44,
                  background: '#03C75A', color: '#FFFFFF',
                  border: 0, borderRadius: 0,
                  fontSize: 13, fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontWeight: 900 }}>N</span> 네이버로 시작
              </button>
            </div>

            {/* divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <span style={{ flex: 1, height: 1, background: BORDER }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: INK_MUTED, letterSpacing: '0.04em' }}>또는 이메일로 가입</span>
              <span style={{ flex: 1, height: 1, background: BORDER }} />
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

                {/* 매각사 전용 — 기관 유형 (NPL 리스트와 동일 분류) */}
                {form.role === 'SELLER' && (
                  <div style={{ marginTop: 10 }}>
                    <label htmlFor="institutionType" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                      기관 유형 <span style={{ color: ELECTRIC }}>*</span>
                    </label>
                    <select
                      id="institutionType"
                      value={form.institutionType}
                      onChange={(e) => update('institutionType', e.target.value)}
                      required
                      style={{ ...inputStyle, cursor: 'pointer' }}
                    >
                      <option value="">기관 유형을 선택하세요</option>
                      {SELLER_INSTITUTION_OPTIONS.filter(o => o.value !== 'ALL').map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ── D2 가입 분기 — 매입 회원 세부유형 (법인 / 개인자산가) ── */}
                {form.role === 'BUYER' && (
                  <div style={{ marginTop: 10 }}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                      매입 세부유형 <span style={{ color: ELECTRIC }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {([['CORP', '법인', '법인 · 대부업체 · AMC · 투자운용사'], ['INDIVIDUAL', '개인자산가', '개인 자산가 · 개인 투자자']] as const).map(([v, label, desc]) => (
                        <button key={v} type="button" onClick={() => update('buyerKind', v)}
                          style={{
                            padding: '10px 12px', textAlign: 'left', cursor: 'pointer',
                            background: form.buyerKind === v ? 'rgba(34,81,255,0.06)' : PAPER,
                            border: `1px solid ${form.buyerKind === v ? ELECTRIC : BORDER_STRONG}`,
                          }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: form.buyerKind === v ? ELECTRIC_DARK : INK }}>{label}</div>
                          <div style={{ fontSize: 10.5, color: INK_MUTED, marginTop: 2 }}>{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 사업자등록번호 — 매각 · 매입(법인) 필수 / 개인자산가는 투자 규모(선택) */}
              {(form.role === 'SELLER' || (form.role === 'BUYER' && form.buyerKind === 'CORP')) && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                    사업자등록번호 <span style={{ color: ELECTRIC }}>*</span>
                  </label>
                  <input value={form.businessNo} onChange={(e) => update('businessNo', e.target.value)}
                    placeholder="000-00-00000" required style={inputStyle} />
                </div>
              )}
              {form.role === 'BUYER' && form.buyerKind === 'INDIVIDUAL' && (
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                    투자 가능 규모 <span style={{ color: INK_MUTED, textTransform: 'none' }}>(선택)</span>
                  </label>
                  <input value={form.investScale} onChange={(e) => update('investScale', e.target.value)}
                    placeholder="예: 30억 내외" style={inputStyle} />
                </div>
              )}

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

              {/* 직책 + 연락처 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label htmlFor="title" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                    직책
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={form.title}
                    onChange={(e) => update('title', e.target.value)}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    placeholder="예: 팀장 (선택)"
                    style={inputStyle}
                  />
                </div>
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
              </div>

              {/* 서류 첨부 — 명함 · 사업자등록증 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>
                  서류 첨부 <span style={{ color: INK_MUTED, fontWeight: 600 }}>(명함 · 사업자등록증)</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {([
                    { key: 'card' as const, label: '명함', file: cardFile, set: setCardFile },
                    { key: 'business' as const, label: '사업자등록증', file: businessFile, set: setBusinessFile },
                  ]).map(({ key, label, file, set }) => (
                    <div key={key}>
                      <label
                        htmlFor={`file-${key}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          height: 44, padding: '0 12px',
                          background: file ? '#EFF6FF' : PAPER,
                          border: `1px solid ${file ? ELECTRIC : BORDER_STRONG}`,
                          borderTop: file ? `2px solid ${ELECTRIC}` : `1px solid ${BORDER_STRONG}`,
                          cursor: 'pointer',
                          fontSize: 12, fontWeight: 600, color: file ? INK : INK_MID,
                          overflow: 'hidden',
                        }}
                      >
                        {file ? <FileText size={14} style={{ color: ELECTRIC, flexShrink: 0 }} /> : <Upload size={14} style={{ color: INK_MUTED, flexShrink: 0 }} />}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {file ? file.name : label}
                        </span>
                        {file && (
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); set(null) }}
                            style={{ marginLeft: 'auto', background: 'transparent', border: 0, cursor: 'pointer', color: INK_MUTED, padding: 2, flexShrink: 0 }}
                            aria-label={`${label} 제거`}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </label>
                      <input
                        id={`file-${key}`}
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => set(e.target.files?.[0] ?? null)}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 요청사항 */}
              <div>
                <label htmlFor="message" style={{ display: 'block', fontSize: 11, fontWeight: 700, color: INK_MID, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 6 }}>
                  요청사항
                </label>
                <textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => update('message', e.target.value)}
                  onFocus={onFocus as any}
                  onBlur={onBlur as any}
                  placeholder="관심 분야 · 매각/매입 니즈 · 문의사항 (선택)"
                  rows={3}
                  style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical', lineHeight: 1.5 }}
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
                <strong style={{ color: INK }}>승인제 무료 가입</strong> — 가입 신청 후 관리자 승인(1~2 영업일)이 완료되어야 계정이 활성화됩니다. 첨부하신 명함·사업자등록증은 승인 심사에 사용되며, 가입과 이용은 무료입니다.
              </div>

              {/* ── D2 · 매입 회원 마지막 스텝 — 가입 완료 후 기존 매입조건 등록 화면으로 이동 (폼 통일) ── */}
              {form.role === 'BUYER' && (
                <div style={{ borderTop: `2px solid ${ELECTRIC}`, border: `1px solid ${BORDER}`, padding: '14px 16px', background: PAPER }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: INK, marginBottom: 4 }}>다음 단계 — 매입조건 등록</div>
                  <div style={{ fontSize: 11, color: INK_MUTED, lineHeight: 1.6 }}>
                    가입 완료 후 <b style={{ color: INK }}>매입조건 등록</b> 화면으로 이동합니다. 등록하신 조건에 매칭되는 NPL 딜만 선별 공개되며,
                    조건은 마이페이지 &gt; 매입 조건에서 언제든 수정할 수 있습니다.
                  </div>
                </div>
              )}

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
