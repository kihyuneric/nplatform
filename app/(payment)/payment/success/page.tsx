"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, ArrowRight, Home, Receipt } from 'lucide-react'

/* ─── 타입 ───────────────────────────────────────────────── */
interface ConfirmResult {
  ok: boolean
  paymentId?: string
  orderId?: string
  paidAmount?: number
  method?: string
  receiptUrl?: string
  benefit?: string
  creditsGranted?: number
  isSandbox?: boolean
  error?: string
}

/* ─── 포맷 헬퍼 ──────────────────────────────────────────── */
function formatKRW(n: number) {
  return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(n)
}

/* ─── 내부 컴포넌트 (useSearchParams 사용) ──────────────── */
function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 이니시스 returnUrl 경유 파라미터
  const paymentId = searchParams?.get('paymentId') ?? ''
  const orderId   = searchParams?.get('orderId')   ?? ''
  const amount    = parseInt(searchParams?.get('amount') ?? '0', 10)
  const packageId = searchParams?.get('packageId') ?? undefined
  const planId    = searchParams?.get('planId')    ?? undefined

  // 이니시스 결제는 inicis-return 에서 이미 DB 처리 완료
  // pgProvider 파라미터가 없으면 inicis로 간주 (inicis-return이 항상 이 페이지로 리다이렉트)
  const pgProvider = searchParams?.get('pgProvider') ?? 'inicis'

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [result, setResult] = useState<ConfirmResult | null>(null)

  useEffect(() => {
    if (!orderId || !amount) {
      setStatus('error')
      setResult({ ok: false, error: '결제 정보가 올바르지 않습니다.' })
      return
    }

    let cancelled = false

    async function confirm() {
      try {
        // 이니시스: inicis-return 에서 이미 처리 완료 → confirm API로 DB 조회만
        // PortOne: confirm API에서 PG 검증 + DB 지급
        const body: Record<string, unknown> = {
          paymentId: paymentId || orderId,
          orderId,
          amount,
          packageId,
          planId,
          pgProvider,
        }

        const res = await fetch('/api/v1/payments/confirm', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        })
        const data: ConfirmResult = await res.json()
        if (cancelled) return
        if (data.ok) {
          setResult(data)
          setStatus('success')
        } else {
          setResult(data)
          setStatus('error')
        }
      } catch {
        if (cancelled) return
        setResult({ ok: false, error: '서버 연결 오류가 발생했습니다.' })
        setStatus('error')
      }
    }

    void confirm()
    return () => { cancelled = true }
  }, [paymentId, orderId, amount, packageId, planId, pgProvider])

  /* ── 검증 중 ─────────────────────────────────────────── */
  if (status === 'verifying') {
    return (
      <div className="w-full max-w-md bg-[#0D1F38] border border-white/10 rounded-2xl p-10 text-center">
        <Loader2 className="h-12 w-12 text-stone-900 mx-auto animate-spin mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">결제 확인 중…</h1>
        <p className="text-sm text-white/50">잠시만 기다려 주세요.</p>
      </div>
    )
  }

  /* ── 오류 ─────────────────────────────────────────────── */
  if (status === 'error') {
    return (
      <div className="w-full max-w-md bg-[#0D1F38] border border-stone-300/20 rounded-2xl p-10 text-center">
        <XCircle className="h-14 w-14 text-stone-900 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">결제 확인 실패</h1>
        <p className="text-sm text-white/60 mb-6">{result?.error ?? '알 수 없는 오류'}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.back()}
            className="w-full bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium py-3 rounded-xl transition-colors"
          >
            돌아가기
          </button>
          <a
            href="/support"
            className="w-full text-center text-sm text-stone-900 hover:text-stone-900"
          >
            고객센터 문의
          </a>
        </div>
      </div>
    )
  }

  /* ── 성공 ─────────────────────────────────────────────── */
  const isSubscription   = result?.orderId?.startsWith('SUB-')
  const isCreditPurchase = result?.orderId?.startsWith('CRD-')

  return (
    <div className="w-full max-w-md">
      {/* 성공 카드 */}
      <div className="bg-[#0D1F38] border border-stone-300/20 rounded-2xl p-8 text-center mb-4">
        <div className="flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-stone-100/20 rounded-full flex items-center justify-center">
            <CheckCircle className="h-9 w-9 text-stone-900" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">결제 완료!</h1>
        <p className="text-white/60 text-sm mb-6">
          {result?.benefit ?? '결제가 성공적으로 처리되었습니다.'}
        </p>

        {/* 결제 상세 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left space-y-2 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-white/50">결제 금액</span>
            <span className="text-white font-semibold">{formatKRW(result?.paidAmount ?? amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">결제 수단</span>
            <span className="text-white">{result?.method ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">주문 번호</span>
            <span className="text-white/70 font-mono text-xs">{result?.orderId}</span>
          </div>
          {result?.creditsGranted && result.creditsGranted > 0 && (
            <div className="flex justify-between">
              <span className="text-white/50">충전 크레딧</span>
              <span className="text-stone-900 font-semibold">+{result.creditsGranted} C</span>
            </div>
          )}
          {result?.isSandbox && (
            <div className="flex justify-between">
              <span className="text-white/50">모드</span>
              <span className="text-stone-900 text-xs">샌드박스 (테스트)</span>
            </div>
          )}
        </div>

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-3">
          {isSubscription && (
            <a
              href="/my/billing"
              className="flex items-center justify-center gap-2 w-full bg-stone-100 hover:bg-stone-100 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              구독 확인하기
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
          {isCreditPurchase && (
            <a
              href="/my/billing"
              className="flex items-center justify-center gap-2 w-full bg-stone-100 hover:bg-stone-100 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              크레딧 확인하기
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
          {!isSubscription && !isCreditPurchase && (
            <a
              href="/my/billing"
              className="flex items-center justify-center gap-2 w-full bg-stone-100 hover:bg-stone-100 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              결제 내역 보기
              <ArrowRight className="h-4 w-4" />
            </a>
          )}
          <div className="flex gap-3">
            {result?.receiptUrl && (
              <a
                href={result.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm py-2.5 rounded-xl transition-colors"
              >
                <Receipt className="h-4 w-4" />
                영수증
              </a>
            )}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm py-2.5 rounded-xl transition-colors"
            >
              <Home className="h-4 w-4" />
              홈으로
            </a>
          </div>
        </div>
      </div>

      {/* 안내 */}
      <p className="text-center text-xs text-white/30">
        결제 영수증은 이메일로 발송됩니다. 문제가 있으시면{' '}
        <a href="/support" className="text-stone-900 underline">고객센터</a>로 문의해주세요.
      </p>
    </div>
  )
}

/* ─── 페이지 (Suspense 래핑) ────────────────────────────── */
export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md bg-[#0D1F38] border border-white/10 rounded-2xl p-10 text-center">
          <Loader2 className="h-12 w-12 text-stone-900 mx-auto animate-spin mb-4" />
          <p className="text-white/50 text-sm">로딩 중…</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
