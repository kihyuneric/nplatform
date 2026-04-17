'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Shield, Lock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'

export default function MFAVerifyPage() {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(108) // 01:48
  const [shake, setShake] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  useEffect(() => {
    if (timeLeft <= 0) return
    const t = setInterval(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [timeLeft])

  const timerDisplay = `${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')} 남음`

  const triggerShake = () => {
    setShake(true)
    setTimeout(() => setShake(false), 600)
  }

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return
    const newDigits = [...digits]
    newDigits[index] = value
    setDigits(newDigits)
    setError('')
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
    if (value && index === 5 && newDigits.every(Boolean)) handleVerify(newDigits.join(''))
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setDigits(pasted.split(''))
      inputRefs.current[5]?.focus()
      handleVerify(pasted)
    }
  }

  const handleVerify = async (code: string) => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const json = await res.json()
      if (json.success) {
        router.push('/')
        router.refresh()
      } else {
        setError(json.error?.message || '잘못된 인증 코드입니다.')
        setDigits(['', '', '', '', '', ''])
        triggerShake()
        inputRefs.current[0]?.focus()
      }
    } catch {
      setError('인증 중 오류가 발생했습니다.')
      triggerShake()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden md:flex md:w-2/5 flex-col bg-[var(--color-brand-deepest)] relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/3 -left-20 w-72 h-72 rounded-full bg-blue-500/5" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-blue-400/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full border border-blue-400/10" />
        </div>
        <div className="relative flex flex-col flex-1 px-10 py-12 justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-bright)] flex items-center justify-center">
              <span className="text-white font-black text-sm">N</span>
            </div>
            <span className="text-white font-bold text-lg">NPLatform</span>
          </div>
          {/* Center */}
          <div className="space-y-6">
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white mb-3">2단계 인증으로</h1>
              <p className="text-2xl font-bold text-[var(--color-brand-bright)] mb-4">계정을 보호합니다</p>
              <p className="text-sm text-blue-200/60 leading-relaxed">
                인증 앱(Google Authenticator, Authy 등)에서 6자리 코드를 확인하세요.
              </p>
            </div>
            <div className="space-y-3">
              {['AES-256 암호화 전송', 'IP 기반 이상 탐지', '세션 타임아웃 보호'].map((item) => (
                <div key={item} className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-xs text-blue-200/60">{item}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Footer */}
          <p className="text-[11px] text-blue-200/30 leading-relaxed border-t border-white/10 pt-6">
            © 2026 NPLatform. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-deepest)] flex items-center justify-center">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-[var(--color-brand-deep)]">NPLatform</span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-black text-[var(--color-brand-deep)] mb-2">인증 코드 입력</h2>
            <p className="text-sm text-gray-500">인증 앱에서 6자리 코드를 입력하세요</p>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs text-gray-400">TOTP 인증 코드</span>
            <span className={`text-xs font-mono font-semibold ${timeLeft <= 20 ? 'text-red-500' : 'text-[var(--color-brand-deep)]'}`}>
              {timeLeft > 0 ? timerDisplay : '만료됨'}
            </span>
          </div>

          {/* 6-digit inputs */}
          <div
            className="flex justify-center gap-2.5 mb-5"
            onPaste={handlePaste}
            style={shake ? { animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' } : {}}
          >
            <style jsx>{`
              @keyframes shake {
                10%, 90% { transform: translateX(-2px); }
                20%, 80% { transform: translateX(4px); }
                30%, 50%, 70% { transform: translateX(-6px); }
                40%, 60% { transform: translateX(6px); }
              }
            `}</style>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                disabled={loading}
                className={`h-14 w-11 rounded-xl border-2 text-center text-xl font-mono font-bold transition-all outline-none
                  ${error
                    ? 'border-red-400 bg-red-50 text-red-600'
                    : digit
                      ? 'border-[var(--color-brand-deep)] bg-[var(--color-brand-deep)]/5 text-[var(--color-brand-deep)]'
                      : 'border-gray-200 bg-gray-50 text-[var(--color-brand-deep)] focus:border-[var(--color-brand-deep)] focus:bg-white focus:shadow-sm'
                  }`}
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-red-500 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={() => handleVerify(digits.join(''))}
            disabled={loading || digits.some((d) => !d)}
            className="w-full h-12 rounded-xl bg-[var(--color-brand-deep)] text-white text-sm font-semibold
              hover:bg-[var(--color-brand-deep)]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 mb-4"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {loading ? '인증 중...' : '인증하기'}
          </button>

          <button
            type="button"
            onClick={() => { setTimeLeft(108); setDigits(['', '', '', '', '', '']); setError(''); inputRefs.current[0]?.focus() }}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-[var(--color-brand-deep)] transition-colors py-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            인증 코드 재발송
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-[11px] text-gray-300">또는</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <div className="text-center">
            <Link href="/login" className="text-sm text-gray-400 hover:text-[var(--color-brand-deep)] transition-colors">
              로그인 페이지로 돌아가기
            </Link>
          </div>

          <p className="mt-8 text-center text-[11px] text-gray-300 leading-relaxed">
            계정 접근에 문제가 있으신가요?{' '}
            <a href="mailto:support@nplatform.co.kr" className="text-[var(--color-brand-deep)]/50 hover:text-[var(--color-brand-deep)] transition-colors">
              고객센터 문의
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
