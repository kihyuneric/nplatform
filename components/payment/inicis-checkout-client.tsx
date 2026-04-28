'use client'

/**
 * InicisCheckoutClient — 클라이언트 측 이니시스 표준결제창 트리거 함수.
 *
 * 사용:
 *   import { startInicisCheckout } from '@/components/payment/inicis-checkout-client'
 *
 *   await startInicisCheckout({
 *     type: 'ESCROW_DEPOSIT',
 *     amount: 230000000,
 *     listingId: 'uuid-...',
 *     productName: '강남 아파트 NPL · 보증금 + 수수료',
 *     buyername: '김매수',
 *     buyeremail: 'buyer@example.com',
 *   })
 *
 * 흐름:
 *   1) /api/v1/payments/inicis-ready POST → formFields + isTest 받음
 *   2) <script src="https://stdpay.inicis.com/stdjs/INIStdPay.js" /> 또는
 *      sandbox 의 stgstdpay 동적 로드
 *   3) hidden form 생성 → INIStdPay.pay(formId)
 *   4) 결제 완료 시 returnUrl(/api/v1/payments/inicis-return) 가 304 redirect →
 *      /payment/success or /payment/fail
 */

declare global {
  interface Window {
    INIStdPay?: {
      pay: (formId: string) => void
    }
  }
}

interface CheckoutInput {
  type: 'SUBSCRIPTION' | 'CREDIT_PURCHASE' | 'ESCROW_DEPOSIT' | 'FEE'
  amount: number
  productName?: string
  planId?: string
  packageId?: string
  listingId?: string
  agreementId?: string
  buyername: string
  buyeremail: string
  buyertel?: string
}

const INICIS_SCRIPT_TEST = 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js'
const INICIS_SCRIPT_LIVE = 'https://stdpay.inicis.com/stdjs/INIStdPay.js'

let scriptLoadingPromise: Promise<void> | null = null

function loadInicisScript(isTest: boolean): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR 환경 — 결제 트리거 불가'))
  if (window.INIStdPay) return Promise.resolve()
  if (scriptLoadingPromise) return scriptLoadingPromise

  scriptLoadingPromise = new Promise((resolve, reject) => {
    const src = isTest ? INICIS_SCRIPT_TEST : INICIS_SCRIPT_LIVE
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      scriptLoadingPromise = null
      reject(new Error('이니시스 결제 스크립트 로드 실패'))
    }
    document.head.appendChild(script)
  })
  return scriptLoadingPromise
}

export interface InicisCheckoutResult {
  ok: boolean
  oid?: string
  error?: string
}

export async function startInicisCheckout(input: CheckoutInput): Promise<InicisCheckoutResult> {
  // 1) 서버에서 formFields + isTest 받기
  let ready: {
    ok: boolean
    oid: string
    isTest: boolean
    formFields: Record<string, string>
    error?: string
  }
  try {
    const r = await fetch('/api/v1/payments/inicis-ready', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    })
    if (!r.ok) {
      const err = await r.json().catch(() => null)
      const msg = err?.error?.message ?? `HTTP ${r.status}`
      return { ok: false, error: msg }
    }
    ready = await r.json()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '네트워크 오류' }
  }

  if (!ready?.ok || !ready.formFields) {
    return { ok: false, error: ready?.error ?? '결제 파라미터를 받지 못했습니다.' }
  }

  // 2) 이니시스 JS 스크립트 로드
  try {
    await loadInicisScript(ready.isTest)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '결제 스크립트 로드 실패' }
  }

  // 3) hidden form 생성 → INIStdPay.pay(formId)
  const formId = `inicis-form-${Date.now()}`
  const form = document.createElement('form')
  form.id = formId
  form.method = 'POST'
  form.acceptCharset = 'UTF-8'
  // INIStdPay.pay 가 이 form 의 action 으로 자동 submit (자체 popup 처리)

  for (const [key, value] of Object.entries(ready.formFields)) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = key
    input.value = value
    form.appendChild(input)
  }
  document.body.appendChild(form)

  if (!window.INIStdPay) {
    document.body.removeChild(form)
    return { ok: false, error: '이니시스 결제창 초기화 실패' }
  }

  try {
    window.INIStdPay.pay(formId)
    // 결제 결과는 returnUrl 로 POST 됨 → /payment/success 페이지가 처리
    return { ok: true, oid: ready.oid }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '결제창 호출 실패' }
  }
}
