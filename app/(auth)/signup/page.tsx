'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Loader2, CheckCircle2, Mail, RefreshCw, Upload, X, FileText,
  Building2, User, Briefcase, TrendingUp, Shield, Eye, EyeOff,
  ArrowRight, Banknote, Lock, Trophy, Zap,
} from 'lucide-react'

// ─── Types & constants (unchanged logic) ────────────────────────────────────

const SIGNUP_ROLES = [
  { value: 'BUYER',        label: '매수자',   icon: TrendingUp,  desc: '매물 탐색 및 입찰' },
  { value: 'SELLER',       label: '매도자',   icon: Banknote,    desc: '매물 등록 및 매각' },
  { value: 'PROFESSIONAL', label: '전문가',   icon: Briefcase,   desc: '법률·세무·감정 자문' },
  { value: 'PARTNER',      label: '파트너',   icon: User,        desc: '딜 소싱 및 연결' },
  { value: 'BUYER_INST',   label: '기관',     icon: Building2,   desc: '기관 투자자 매입' },
] as const

interface DocumentSlot {
  type: string
  required: boolean
}

interface UploadedDocument {
  type: string
  name: string
  data: string
}

const ROLE_DOCUMENTS: Record<string, DocumentSlot[]> = {
  BUYER: [
    { type: '사업자등록증', required: false },
    { type: '신분증 사본', required: true },
  ],
  SELLER: [
    { type: '사업자등록증', required: true },
    { type: '금융기관 인가증', required: true },
    { type: '담당자 명함', required: false },
  ],
  PROFESSIONAL: [
    { type: '자격증 사본', required: true },
    { type: '사업자등록증', required: false },
    { type: '명함', required: false },
  ],
  PARTNER: [
    { type: '신분증 사본', required: true },
    { type: '명함', required: false },
  ],
  BUYER_INST: [
    { type: '사업자등록증', required: true },
    { type: '금융기관 인가증', required: false },
    { type: '신분증 사본', required: true },
  ],
}

const MAX_FILE_SIZE = 5 * 1024 * 1024

const STEP_LABELS = ['계정 정보', '프로필 설정', '서류 제출']

const ROLE_BENEFITS: Record<string, { title: string; items: string[] }> = {
  BUYER: {
    title: '매수자 혜택',
    items: ['전국 NPL 매물 실시간 열람', 'AI 기반 수익성 분석 리포트', '입찰 전략 자동 시뮬레이션'],
  },
  SELLER: {
    title: '매도자 혜택',
    items: ['매물 즉시 등록 및 노출', '검증된 매수자 네트워크 접근', '딜클로징 전문가 지원'],
  },
  PROFESSIONAL: {
    title: '전문가 혜택',
    items: ['법률·세무 자문 의뢰 수주', '전문가 프로필 노출', '수임 사례 포트폴리오 관리'],
  },
  PARTNER: {
    title: '파트너 혜택',
    items: ['딜 소싱 커미션 수취', '기관 투자자 네트워크 접근', '전용 파트너 대시보드'],
  },
  BUYER_INST: {
    title: '기관 투자자 혜택',
    items: ['대형 포트폴리오 일괄 열람', '전용 리서치 리포트 제공', '기관 전담 매니저 배정'],
  },
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center w-full mb-8">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  done
                    ? 'bg-[#2E75B6] text-white shadow-md shadow-[#2E75B6]/30'
                    : active
                    ? 'bg-[var(--color-brand-deep)] text-white shadow-lg shadow-[var(--color-brand-deep)]/25 ring-4 ring-[var(--color-brand-deep)]/10'
                    : 'bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)]'
                }`}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : step}
              </div>
              <span className={`text-[10px] font-medium hidden sm:block transition-colors ${
                active ? 'text-[var(--color-text-primary)]' : done ? 'text-[#2E75B6]' : 'text-[var(--color-text-muted)]'
              }`}>
                {STEP_LABELS[i]}
              </span>
            </div>
            {i < total - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-500 ${
                done ? 'bg-[#2E75B6]' : 'bg-[var(--color-surface-overlay)]'
              }`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Password strength indicator ─────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400']
  const labels = ['취약', '보통', '양호', '강력']

  if (!password) return null
  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score - 1] : 'bg-[var(--color-surface-overlay)]'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${
        score <= 1 ? 'text-red-400' : score === 2 ? 'text-orange-400' : score === 3 ? 'text-yellow-500' : 'text-emerald-500'
      }`}>
        비밀번호 강도: {labels[score - 1] || '취약'}
      </p>
    </div>
  )
}

// ─── Left panel content per step ─────────────────────────────────────────────

function LeftPanelContent({ step, role }: { step: number; role: string }) {
  if (step === 1) {
    return (
      <div className="space-y-8">
        <div>
          <p className="text-xs font-bold text-[#2E75B6] uppercase tracking-[0.2em] mb-3">NPL Investment Platform</p>
          <h2 className="text-4xl font-black leading-tight tracking-tight text-white">
            시작하세요
          </h2>
          <p className="text-white/50 mt-3 text-sm leading-relaxed">
            국내 최대 NPL 투자 플랫폼에서<br />새로운 투자 기회를 만나보세요
          </p>
        </div>
        <div className="space-y-4">
          {[
            { icon: Lock,   label: '금융보안원 인증',   sub: '금융기관 수준 보안 체계' },
            { icon: Trophy, label: 'NPL 전문 플랫폼',   sub: '국내 최다 NPL 데이터베이스' },
            { icon: Zap,    label: '24시간 실거래',     sub: '실시간 매물 업데이트' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/5 border border-white/8">
              <div className="w-9 h-9 rounded-xl bg-[#2E75B6]/20 border border-[#2E75B6]/30 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#2E75B6]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">{label}</p>
                <p className="text-xs text-white/40 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (step === 2) {
    const benefits = ROLE_BENEFITS[role] || ROLE_BENEFITS['BUYER']
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-bold text-[#2E75B6] uppercase tracking-[0.2em] mb-3">회원 유형 선택</p>
          <h2 className="text-3xl font-black leading-tight tracking-tight text-white">
            {benefits.title}
          </h2>
        </div>
        <div className="space-y-3">
          {benefits.items.map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/8">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-[#2E75B6]/20 border border-[#2E75B6]/30 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3 h-3 text-[#2E75B6]" />
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
        <div className="p-4 rounded-2xl bg-[#2E75B6]/10 border border-[#2E75B6]/20">
          <p className="text-xs text-[#2E75B6] font-semibold mb-1">가입 즉시 지급</p>
          <p className="text-2xl font-black text-white">50 크레딧</p>
          <p className="text-xs text-white/40 mt-0.5">AI 분석 50회 무료 이용</p>
        </div>
      </div>
    )
  }

  // Step 3
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold text-[#2E75B6] uppercase tracking-[0.2em] mb-3">서류 제출</p>
        <h2 className="text-3xl font-black leading-tight tracking-tight text-white">
          안전한<br />데이터 보호
        </h2>
      </div>
      <div className="space-y-3">
        {[
          { icon: Shield, title: '군사급 암호화', desc: 'AES-256 암호화로 모든 문서 보호' },
          { icon: Lock,   title: '접근 제어',     desc: '승인된 담당자만 열람 가능' },
          { icon: CheckCircle2, title: '즉시 삭제', desc: '심사 완료 후 원본 데이터 즉시 파기' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/8">
            <div className="w-9 h-9 rounded-xl bg-[#2E75B6]/20 border border-[#2E75B6]/30 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-[#2E75B6]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">{title}</p>
              <p className="text-xs text-white/40 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    role: 'BUYER',
    name: '',
    email: '',
    company_name: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    referralCode: '',
  })
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [generalError, setGeneralError] = useState('')
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [bonusCredited, setBonusCredited] = useState(false)
  const [documents, setDocuments] = useState<UploadedDocument[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)

  const currentDocSlots = ROLE_DOCUMENTS[form.role] || []

  const handleFileUpload = (docType: string, file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setErrors((prev) => ({ ...prev, [`doc_${docType}`]: '파일 크기는 5MB 이하여야 합니다.' }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setDocuments((prev) => {
        const filtered = prev.filter((d) => d.type !== docType)
        return [...filtered, { type: docType, name: file.name, data: dataUrl }]
      })
      setErrors((prev) => {
        const next = { ...prev }
        delete next[`doc_${docType}`]
        return next
      })
    }
    reader.readAsDataURL(file)
  }

  const removeDocument = (docType: string) => {
    setDocuments((prev) => prev.filter((d) => d.type !== docType))
  }

  const getDocumentForType = (docType: string) => documents.find((d) => d.type === docType)

  const isImageDataUrl = (data: string) => data.startsWith('data:image/')

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
    }
  }

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.email.trim()) {
      newErrors.email = '이메일을 입력해주세요.'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요.'
    }
    if (!form.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    } else if (form.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다.'
    }
    if (!form.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호 확인을 입력해주세요.'
    } else if (form.password !== form.passwordConfirm) {
      newErrors.passwordConfirm = '비밀번호가 일치하지 않습니다.'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = '이름을 입력해주세요.'
    if (!form.phone.trim()) newErrors.phone = '연락처를 입력해주세요.'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!agreedTerms) newErrors.terms = '이용약관에 동의해주세요.'
    const requiredDocs = currentDocSlots.filter((s) => s.required)
    for (const slot of requiredDocs) {
      if (!documents.find((d) => d.type === slot.type)) {
        newErrors[`doc_${slot.type}`] = `${slot.type}은(는) 필수 제출 서류입니다.`
      }
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1 && validateStep1()) setStep(2)
    if (step === 2 && validateStep2()) setStep(3)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError('')
    if (!validateStep3()) return
    setLoading(true)

    try {
      const { error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name: form.name,
            role: form.role,
            company_name: form.company_name || undefined,
            phone: form.phone,
            referral_code: form.referralCode || undefined,
            documents: documents.map((d) => ({ type: d.type, name: d.name })),
          },
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setGeneralError('이미 등록된 이메일입니다.')
        } else {
          setGeneralError('회원가입 중 오류가 발생했습니다.')
        }
        return
      }

      try {
        await fetch('/api/v1/users/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            terms_accepted_at: new Date().toISOString(),
            terms_version: 'v1.0',
            privacy_accepted_at: new Date().toISOString(),
            privacy_version: 'v1.0',
          }),
        })
      } catch {
        // Terms tracking is best-effort — don't block signup
      }

      try {
        await fetch('/api/v1/billing/credits/purchase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 50,
            package: 'signup_bonus',
            description: '가입 축하 무료 크레딧',
          }),
        })
        setBonusCredited(true)
      } catch {
        // Don't block signup on failure
      }

      for (const doc of documents) {
        try {
          await fetch('/api/v1/users/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: form.email,
              type: doc.type,
              name: doc.name,
              data: doc.data,
            }),
          })
        } catch {
          // Don't block signup on document upload failure
        }
      }

      setSignupSuccess(true)
    } catch {
      setGeneralError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const [resending, setResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return
    setResending(true)
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: form.email,
      })
      if (resendError) {
        // Fallback: silently succeed for UX
      }
    } catch {
      // Best-effort resend
    } finally {
      setResending(false)
      setResendCooldown(60)
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0 }
          return prev - 1
        })
      }, 1000)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (signupSuccess) {
    return (
      <div className="min-h-screen flex">
        {/* Left panel */}
        <div className="hidden xl:flex xl:w-[420px] 2xl:w-[480px] shrink-0 flex-col justify-between p-10 2xl:p-12 bg-[var(--color-brand-deepest)] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#2E75B6]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-[var(--color-brand-dark)]/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />
          <div className="relative flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#2E75B6] flex items-center justify-center shadow-lg shadow-[#2E75B6]/30">
              <span className="text-white font-black text-base tracking-tight">N</span>
            </div>
            <span className="text-xl font-bold tracking-tight">NPLatform</span>
          </div>
          <div className="relative space-y-4">
            <p className="text-xs font-bold text-[#2E75B6] uppercase tracking-[0.2em]">가입 완료</p>
            <h2 className="text-4xl font-black leading-tight text-white">환영합니다!</h2>
            <p className="text-white/50 text-sm leading-relaxed">이메일 인증 후 NPLatform의 모든 기능을 이용하실 수 있습니다.</p>
          </div>
          <p className="relative text-xs text-white/20">&copy; {new Date().getFullYear()} NPLatform. All rights reserved.</p>
        </div>

        {/* Right panel */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
          <div className="w-full max-w-[400px] text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-[var(--color-brand-deep)]/10 to-[#2E75B6]/10 flex items-center justify-center ring-8 ring-[var(--color-brand-deep)]/5">
              <Mail className="h-9 w-9 text-[var(--color-brand-deep)]" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">이메일을 확인해주세요</h2>
              <p className="text-sm text-gray-500">
                <span className="font-semibold text-gray-800">{form.email}</span><br />
                위 주소로 인증 메일을 발송했습니다.
              </p>
            </div>
            {bonusCredited && (
              <div className="flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm font-semibold text-emerald-700">50 크레딧이 지급되었습니다!</span>
              </div>
            )}
            <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-500 space-y-1.5 text-left">
              <p className="flex items-center gap-2"><span className="text-[#2E75B6]">&#9679;</span>이메일의 인증 링크를 클릭하여 가입을 완료해주세요.</p>
              <p className="flex items-center gap-2"><span className="text-[#2E75B6]">&#9679;</span>이메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.</p>
            </div>
            <div className="space-y-2.5">
              <button
                onClick={handleResendEmail}
                disabled={resending || resendCooldown > 0}
                className="w-full h-12 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {resending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />발송 중...</>
                ) : resendCooldown > 0 ? (
                  <><RefreshCw className="h-4 w-4" />재발송 ({resendCooldown}초)</>
                ) : (
                  <><RefreshCw className="h-4 w-4" />인증 메일 재발송</>
                )}
              </button>
              <Link href="/login">
                <button className="w-full h-12 rounded-xl bg-[var(--color-brand-deep)] hover:bg-[var(--color-brand-dark)] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-brand-deep)]/20">
                  로그인 페이지로 이동 <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Main signup layout ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div className="hidden xl:flex xl:w-[420px] 2xl:w-[480px] shrink-0 flex-col justify-between p-10 2xl:p-12 bg-[var(--color-brand-deepest)] text-white relative overflow-hidden">

        {/* Atmosphere orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#2E75B6]/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[var(--color-brand-dark)]/30 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-[#2E75B6]/8 rounded-full blur-2xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#2E75B6] flex items-center justify-center shadow-lg shadow-[#2E75B6]/30">
            <span className="text-white font-black text-base tracking-tight">N</span>
          </div>
          <span className="text-xl font-bold tracking-tight">NPLatform</span>
        </div>

        {/* Step-aware content */}
        <div className="relative">
          <LeftPanelContent step={step} role={form.role} />
        </div>

        {/* Bottom login link */}
        <div className="relative">
          <p className="text-sm text-white/50">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-white font-semibold hover:text-[#2E75B6] transition-colors underline underline-offset-2">
              로그인
            </Link>
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-16 xl:px-24 bg-white overflow-y-auto">

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="w-8 h-8 rounded-xl bg-[var(--color-brand-deep)] flex items-center justify-center">
            <span className="text-white font-black text-sm">N</span>
          </div>
          <span className="text-lg font-bold text-[var(--color-brand-deep)]">NPLatform</span>
        </div>

        <div className="w-full max-w-[400px] mx-auto">

          {/* Step indicator */}
          <StepIndicator current={step} total={3} />

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {step === 1 ? '계정 만들기' : step === 2 ? '기본 정보 입력' : '서류 제출 및 동의'}
            </h1>
            <p className="mt-1.5 text-sm text-gray-400">
              {step === 1
                ? '이메일과 비밀번호를 입력해주세요'
                : step === 2
                ? '회원 유형과 기본 정보를 입력해주세요'
                : '필수 서류를 업로드하고 약관에 동의해주세요'}
            </p>
          </div>

          {/* ── STEP 1 ───────────────────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-gray-500 uppercase tracking-normal">
                  이메일 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  disabled={loading}
                  className={`input-enhanced h-12 rounded-xl ${errors.email ? 'error' : ''}`}
                />
                {errors.email && <p className="text-xs text-red-500 flex items-center gap-1"><span>&#9679;</span>{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-gray-500 uppercase tracking-normal">
                  비밀번호 <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="8자 이상 입력하세요"
                    value={form.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    disabled={loading}
                    className={`input-enhanced h-12 rounded-xl pr-11 ${errors.password ? 'error' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <PasswordStrength password={form.password} />
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="passwordConfirm" className="text-xs font-semibold text-gray-500 uppercase tracking-normal">
                  비밀번호 확인 <span className="text-red-400">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="passwordConfirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    placeholder="비밀번호를 다시 입력하세요"
                    value={form.passwordConfirm}
                    onChange={(e) => updateField('passwordConfirm', e.target.value)}
                    disabled={loading}
                    className={`input-enhanced h-12 rounded-xl pr-11 ${errors.passwordConfirm ? 'error' : ''}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {form.passwordConfirm && form.password === form.passwordConfirm && (
                  <p className="text-xs text-emerald-500 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />비밀번호가 일치합니다</p>
                )}
                {errors.passwordConfirm && <p className="text-xs text-red-500">{errors.passwordConfirm}</p>}
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-xl bg-[var(--color-brand-deep)] hover:bg-[var(--color-brand-dark)] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-brand-deep)]/20 hover:shadow-xl active:scale-[0.99] mt-2"
              >
                다음 단계 <ArrowRight className="h-4 w-4" />
              </button>

              <p className="text-center text-sm text-gray-400">
                이미 계정이 있으신가요?{' '}
                <Link href="/login" className="font-semibold text-[#2E75B6] hover:text-[var(--color-brand-deep)] transition-colors">
                  로그인
                </Link>
              </p>
            </form>
          )}

          {/* ── STEP 2 ───────────────────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleNextStep} className="space-y-5">

              {/* Role selection */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-normal">
                  회원 유형 <span className="text-red-400">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {SIGNUP_ROLES.slice(0, 4).map(({ value, label, icon: Icon, desc }) => {
                    const selected = form.role === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => updateField('role', value)}
                        className={`group rounded-2xl p-3.5 text-left border transition-all duration-200 ${
                          selected
                            ? 'border-[var(--color-brand-dark)] bg-[#EFF6FF] ring-2 ring-[var(--color-brand-dark)]/20'
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 transition-colors ${
                          selected ? 'bg-[var(--color-brand-dark)] shadow-md shadow-[var(--color-brand-dark)]/30' : 'bg-gray-200 group-hover:bg-gray-300'
                        }`}>
                          <Icon className={`w-3.5 h-3.5 ${selected ? 'text-white' : 'text-gray-500'}`} />
                        </div>
                        <p className={`text-xs font-bold leading-tight ${selected ? 'text-[var(--color-brand-deep)]' : 'text-gray-700'}`}>
                          {label}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{desc}</p>
                      </button>
                    )
                  })}
                </div>
                {/* 5th role — full width */}
                {(() => {
                  const r = SIGNUP_ROLES[4]
                  const selected = form.role === r.value
                  return (
                    <button
                      type="button"
                      onClick={() => updateField('role', r.value)}
                      className={`w-full group rounded-2xl p-3.5 text-left border transition-all duration-200 flex items-center gap-3 ${
                        selected
                          ? 'border-[var(--color-brand-dark)] bg-[#EFF6FF] ring-2 ring-[var(--color-brand-dark)]/20'
                          : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        selected ? 'bg-[var(--color-brand-dark)] shadow-md shadow-[var(--color-brand-dark)]/30' : 'bg-gray-200 group-hover:bg-gray-300'
                      }`}>
                        <r.icon className={`w-3.5 h-3.5 ${selected ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${selected ? 'text-[var(--color-brand-deep)]' : 'text-gray-700'}`}>{r.label}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{r.desc}</p>
                      </div>
                    </button>
                  )
                })()}
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-gray-500 uppercase tracking-normal">
                  이름 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="홍길동"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  disabled={loading}
                  className={`input-enhanced h-12 rounded-xl ${errors.name ? 'error' : ''}`}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold text-gray-500 uppercase tracking-normal">
                  연락처 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  disabled={loading}
                  className={`input-enhanced h-12 rounded-xl ${errors.phone ? 'error' : ''}`}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>

              {/* Company */}
              <div className="space-y-1.5">
                <Label htmlFor="company_name" className="text-xs font-semibold text-gray-500 uppercase tracking-normal">
                  소속 회사 <span className="text-gray-300 font-normal normal-case">(선택)</span>
                </Label>
                <Input
                  id="company_name"
                  placeholder="회사명"
                  value={form.company_name}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  disabled={loading}
                  className="input-enhanced h-12 rounded-xl"
                />
              </div>

              {/* Referral */}
              <div className="space-y-1.5">
                <Label htmlFor="referralCode" className="text-xs font-semibold text-gray-500 uppercase tracking-normal">
                  추천 코드 <span className="text-gray-300 font-normal normal-case">(선택)</span>
                </Label>
                <Input
                  id="referralCode"
                  placeholder="추천 코드를 입력하세요"
                  value={form.referralCode}
                  onChange={(e) => updateField('referralCode', e.target.value)}
                  disabled={loading}
                  className="input-enhanced h-12 rounded-xl"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  이전
                </button>
                <button
                  type="submit"
                  className="flex-[2] h-12 rounded-xl bg-[var(--color-brand-deep)] hover:bg-[var(--color-brand-dark)] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-brand-deep)]/20 active:scale-[0.99]"
                >
                  다음 단계 <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3 ───────────────────────────────────────────────────── */}
          {step === 3 && (
            <form onSubmit={handleSignup} className="space-y-5">

              {/* Document upload */}
              {currentDocSlots.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-500 uppercase tracking-normal">제출 서류</Label>
                    <p className="text-xs text-gray-400 mt-1">이미지(JPG, PNG) 또는 PDF · 최대 5MB</p>
                  </div>
                  <div className="space-y-2">
                    {currentDocSlots.map((slot) => {
                      const uploaded = getDocumentForType(slot.type)
                      return (
                        <div key={slot.type} className="rounded-2xl border border-gray-100 bg-gray-50 p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-800">{slot.type}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                slot.required
                                  ? 'bg-red-50 text-red-500'
                                  : 'bg-gray-100 text-gray-400'
                              }`}>
                                {slot.required ? '필수' : '선택'}
                              </span>
                            </div>
                            {uploaded && (
                              <button type="button" onClick={() => removeDocument(slot.type)} className="w-6 h-6 rounded-full bg-gray-200 text-gray-400 hover:bg-red-100 hover:text-red-500 transition-colors flex items-center justify-center">
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>

                          {uploaded ? (
                            <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-gray-100">
                              {isImageDataUrl(uploaded.data) ? (
                                <img src={uploaded.data} alt={uploaded.name} className="h-10 w-10 object-cover rounded-lg border border-gray-100" />
                              ) : (
                                <div className="h-10 w-10 flex items-center justify-center bg-[var(--color-brand-deep)]/5 rounded-lg border border-[var(--color-brand-deep)]/10">
                                  <FileText className="h-5 w-5 text-[#2E75B6]" />
                                </div>
                              )}
                              <span className="text-xs text-gray-500 truncate flex-1">{uploaded.name}</span>
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center gap-1.5 py-5 border-2 border-dashed border-[var(--color-border-default)] rounded-xl cursor-pointer hover:border-[#2E75B6]/40 hover:bg-white transition-all group">
                              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-[#2E75B6]/10 transition-colors">
                                <Upload className="h-4 w-4 text-gray-400 group-hover:text-[#2E75B6] transition-colors" />
                              </div>
                              <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors">클릭하여 파일 선택</span>
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleFileUpload(slot.type, file)
                                  e.target.value = ''
                                }}
                                disabled={loading}
                              />
                            </label>
                          )}
                          {errors[`doc_${slot.type}`] && <p className="text-xs text-red-500">{errors[`doc_${slot.type}`]}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Terms */}
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 space-y-1.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox
                    checked={agreedTerms}
                    onCheckedChange={(checked) => setAgreedTerms(checked as boolean)}
                    className="mt-0.5"
                  />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    <Link href="/terms/service" className="font-semibold text-[#2E75B6] hover:underline">이용약관</Link>{' '}
                    및{' '}
                    <Link href="/terms/privacy" className="font-semibold text-[#2E75B6] hover:underline">개인정보처리방침</Link>에
                    동의합니다. <span className="text-red-400">*</span>
                  </span>
                </label>
                {errors.terms && <p className="text-xs text-red-500 pl-7">{errors.terms}</p>}
              </div>

              {generalError && (
                <div className="flex items-center gap-2.5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-[9px] font-bold text-red-500">!</span>
                  </div>
                  <p className="text-sm text-red-600">{generalError}</p>
                </div>
              )}

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 h-12 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  이전
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] h-12 rounded-xl bg-[var(--color-brand-deep)] hover:bg-[var(--color-brand-dark)] text-white font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-brand-deep)]/20 active:scale-[0.99]"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />가입 처리 중...</>
                  ) : (
                    <>가입하기 <CheckCircle2 className="h-4 w-4" /></>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
