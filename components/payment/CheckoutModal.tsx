'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  X, CreditCard, Shield, Loader2, ChevronRight,
  CheckCircle2, AlertCircle, Smartphone, Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import { SafeModalPortal } from '@/components/ui/safe-modal-portal'

// ─── 타입 ─────────────────────────────────────────────────

export interface CheckoutPlan {
  id: string
  plan_key: string
  name: string
  price_monthly: number
  price_yearly: number
  description?: string
}

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  plan: CheckoutPlan | null
  billingCycle: 'monthly' | 'yearly'
  customerName: string
  customerEmail: string
}

type PaymentMethod = 'Card' | 'DirectBank' | 'HPP' | 'Vbank'

interface MethodOption {
  id: PaymentMethod
  label: string
  icon: React.ReactNode
  desc: string
}

// ─── KG이니시스 전역 타입 ─────────────────────────────────

declare global {
  interface Window {
    INIStdPay?: {
      pay: (formId: string) => void
    }
  }
}

// ─── 결제 수단 목록 (이니시스 gopaymethod 값) ─────────────

const PAYMENT_METHODS: MethodOption[] = [
  {
    id:    'Card',
    label: '신용/체크카드',
    icon:  <CreditCard className="h-4 w-4" />,
    desc:  '국내외 모든 카드',
  },
  {
    id:    'HPP',
    label: '휴대폰 결제',
    icon:  <Smartphone className="h-4 w-4" />,
    desc:  '휴대폰 소액 결제',
  },
  {
    id:    'DirectBank',
    label: '실시간 계좌이체',
    icon:  <Building2 className="h-4 w-4" />,
    desc:  '인터넷뱅킹 즉시 이체',
  },
  {
    id:    'Vbank',
    label: '가상계좌',
    icon:  <Building2 className="h-4 w-4" />,
    desc:  '무통장 입금 (즉시 발급)',
  },
]

// ─── SDK 동적 로드 ────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const s = document.createElement('script')
    s.src   = src
    s.async = true
    s.onload  = () => resolve()
    s.onerror = () => reject(new Error(`Script load failed: ${src}`))
    document.head.appendChild(s)
  })
}

// ─── 컴포넌트 ─────────────────────────────────────────────

export default function CheckoutModal({
  open,
  onClose,
  plan,
  billingCycle,
  customerName,
  customerEmail,
}: CheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('Card')
  const [loading, setLoading] = useState(false)

  const price = plan
    ? billingCycle === 'monthly'
      ? plan.price_monthly
      : plan.price_yearly
    : 0
  const yearlyDiscount = plan
    ? Math.round(((plan.price_monthly * 12 - plan.price_yearly * 12) / (plan.price_monthly * 12)) * 100)
    : 0

  // 모달이 닫힐 때 혹시 남은 폼 요소 정리
  useEffect(() => {
    if (!open) {
      const old = document.getElementById('inicisPayForm')
      if (old) old.remove()
    }
  }, [open])

  const handlePayment = useCallback(async () => {
    if (!plan) return
    setLoading(true)

    try {
      // ── 1. 서버에서 이니시스 결제 파라미터 발급 ─────────────
      const res = await fetch('/api/v1/payments/inicis-ready', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:        'SUBSCRIPTION',
          amount:      price,
          planId:      plan.id,
          buyername:   customerName  || '고객',
          buyeremail:  customerEmail || 'noreply@example.com',
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string }; message?: string }
        throw new Error(err?.error?.message ?? err?.message ?? '결제 초기화 실패')
      }

      const { formFields, oid } = await res.json() as {
        ok: boolean
        oid: string
        isTest: boolean
        formFields: Record<string, string | number>
      }

      // ── 2. 이니시스 gopaymethod 덮어쓰기 (선택한 수단) ──────
      formFields['gopaymethod'] = selectedMethod

      // ── 3. Hidden form 생성 ──────────────────────────────────
      const old = document.getElementById('inicisPayForm')
      if (old) old.remove()

      const form = document.createElement('form')
      form.id     = 'inicisPayForm'
      form.method = 'post'
      form.style.display = 'none'

      Object.entries(formFields).forEach(([k, v]) => {
        const input   = document.createElement('input')
        input.type    = 'hidden'
        input.name    = k
        input.value   = String(v)
        form.appendChild(input)
      })
      document.body.appendChild(form)

      // ── 4. 이니시스 SDK 로드 & 결제창 호출 ───────────────────
      await loadScript('https://stdpay.inicis.com/stdjs/INIStdPay.js')

      if (!window.INIStdPay) {
        throw new Error('KG이니시스 SDK를 로드할 수 없습니다. 팝업 차단을 해제해 주세요.')
      }

      window.INIStdPay.pay('inicisPayForm')

      // 결제창은 팝업으로 열리므로 여기서 loading 해제
      // 결제 결과는 returnUrl(inicis-return) → /payment/success 로 처리됨
      setLoading(false)

    } catch (err) {
      console.error('[Inicis Checkout] error:', err)
      toast.error(err instanceof Error ? err.message : '결제 중 오류가 발생했습니다.')
      setLoading(false)
    }
  }, [plan, price, selectedMethod, customerName, customerEmail])

  if (!open || !plan) return null

  return (
    <SafeModalPortal>
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">구독 결제</p>
            <h2 className="text-lg font-bold text-white">{plan.name} 플랜</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* 금액 요약 */}
          <div className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-300 text-sm">
                {billingCycle === 'monthly' ? '월간 구독' : '연간 구독'}
              </span>
              {billingCycle === 'yearly' && yearlyDiscount > 0 && (
                <span className="text-xs bg-stone-100/20 text-stone-900 px-2 py-0.5 rounded-full">
                  {yearlyDiscount}% 절약
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {price.toLocaleString('ko-KR')}원
              </span>
              <span className="text-gray-400 text-sm">/{billingCycle === 'monthly' ? '월' : '년'}</span>
            </div>
            {billingCycle === 'yearly' && (
              <p className="text-xs text-gray-500 mt-1">
                월 환산 {Math.round(price / 12).toLocaleString('ko-KR')}원
              </p>
            )}
          </div>

          {/* 결제 수단 선택 */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">결제 수단</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(method => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    selectedMethod === method.id
                      ? 'border-stone-300 bg-stone-100/10 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span className={selectedMethod === method.id ? 'text-stone-900' : 'text-gray-500'}>
                    {method.icon}
                  </span>
                  <div>
                    <p className="text-xs font-semibold">{method.label}</p>
                    <p className="text-[10px] text-gray-500">{method.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 보안 배지 */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Shield className="h-3.5 w-3.5 text-stone-900 flex-shrink-0" />
            <span>KG이니시스 PCI DSS 인증 보안 결제 · 256bit TLS 암호화</span>
          </div>

          {/* 결제 버튼 */}
          <button
            onClick={() => void handlePayment()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-100 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                결제창 열기 중...
              </>
            ) : (
              <>
                <CreditCard className="h-5 w-5" />
                {price.toLocaleString('ko-KR')}원 결제하기
                <ChevronRight className="h-4 w-4 ml-auto" />
              </>
            )}
          </button>

          <p className="text-[10px] text-gray-600 text-center">
            결제 시 <span className="underline cursor-pointer">이용약관</span> 및{' '}
            <span className="underline cursor-pointer">환불정책</span>에 동의하게 됩니다.
            구독은 다음 결제일 전 언제든지 해지 가능합니다.
          </p>
        </div>
      </div>
    </div>
    </SafeModalPortal>
  )
}

// ─── 결제 완료 뱃지 (인라인 표시용) ─────────────────────

export function PaymentSuccessBadge({ planName }: { planName: string }) {
  return (
    <div className="flex items-center gap-2 bg-stone-100/15 border border-stone-300/30 text-stone-900 text-sm px-4 py-2 rounded-xl">
      <CheckCircle2 className="h-4 w-4" />
      <span>{planName} 플랜 활성화됨</span>
    </div>
  )
}

export function PaymentErrorBadge({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 bg-stone-100/15 border border-stone-300/30 text-stone-900 text-sm px-4 py-2 rounded-xl">
      <AlertCircle className="h-4 w-4" />
      <span>{message}</span>
    </div>
  )
}
