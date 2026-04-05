"use client"

import { Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { XCircle, RefreshCw, Home, HeadphonesIcon, AlertTriangle } from 'lucide-react'

/* ─── 오류 코드 → 사용자 친화적 메시지 ──────────────────── */
const ERROR_MESSAGES: Record<string, string> = {
  PAY_PROCESS_CANCELED:        '결제가 취소되었습니다.',
  PAY_PROCESS_ABORTED:         '결제가 중단되었습니다.',
  INVALID_CARD_COMPANY:        '유효하지 않은 카드입니다.',
  EXCEED_MAX_DAILY_PAYMENT:    '일일 결제 한도를 초과했습니다.',
  EXCEED_MAX_AMOUNT:           '결제 한도 초과입니다.',
  INVALID_STOPPED_CARD:        '정지된 카드입니다.',
  EXCEED_MAX_PAYMENT_AMOUNT:   '카드 결제 한도 초과입니다.',
  CARD_PROCESSING_ERROR:       '카드사에서 오류가 발생했습니다. 다른 카드를 시도해 주세요.',
  PAYMENT_SYSTEM_ERROR:        '결제 시스템 오류입니다. 잠시 후 다시 시도해 주세요.',
  NOT_SUPPORTED_INSTALLMENT:   '해당 카드는 할부가 지원되지 않습니다.',
  INVALID_CONSUMER:            '구매자 정보가 유효하지 않습니다.',
  REJECT_CARD_COMPANY:         '카드사에서 결제를 거부했습니다.',
  LIMIT_EXCEEDED:              '한도 초과로 결제가 거부되었습니다.',
}

/* ─── 내부 컴포넌트 ──────────────────────────────────────── */
function FailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const code    = searchParams?.get('code')    ?? 'UNKNOWN'
  const message = searchParams?.get('message') ?? '알 수 없는 오류가 발생했습니다.'
  const orderId = searchParams?.get('orderId') ?? ''

  const userMessage = ERROR_MESSAGES[code] ?? message

  const isUserCancelled = ['PAY_PROCESS_CANCELED', 'PAY_PROCESS_ABORTED'].includes(code)

  return (
    <div className="w-full max-w-md">
      {/* 오류 카드 */}
      <div className="bg-[#0D1F38] border border-red-500/20 rounded-2xl p-8 text-center mb-4">
        <div className="flex items-center justify-center mb-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isUserCancelled ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
            {isUserCancelled
              ? <AlertTriangle className="h-9 w-9 text-yellow-400" />
              : <XCircle className="h-9 w-9 text-red-400" />
            }
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-1">
          {isUserCancelled ? '결제가 취소됐어요' : '결제에 실패했어요'}
        </h1>
        <p className="text-white/60 text-sm mb-6">{userMessage}</p>

        {/* 오류 상세 */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left text-sm mb-6 space-y-2">
          <div className="flex justify-between">
            <span className="text-white/50">오류 코드</span>
            <span className="text-white/70 font-mono text-xs">{code}</span>
          </div>
          {orderId && (
            <div className="flex justify-between">
              <span className="text-white/50">주문 번호</span>
              <span className="text-white/70 font-mono text-xs">{orderId}</span>
            </div>
          )}
        </div>

        {/* 해결 방법 */}
        {!isUserCancelled && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-left mb-6">
            <p className="text-blue-300 text-xs font-semibold mb-2">해결 방법을 시도해 보세요</p>
            <ul className="text-white/60 text-xs space-y-1 list-disc list-inside">
              <li>다른 카드나 결제 수단을 사용해 보세요</li>
              <li>카드사 앱에서 한도 및 정지 여부를 확인하세요</li>
              <li>잠시 후 다시 시도해 보세요</li>
              <li>문제가 지속되면 고객센터로 문의해 주세요</li>
            </ul>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            다시 시도
          </button>
          <div className="flex gap-3">
            <a
              href="/support"
              className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 text-white text-sm py-2.5 rounded-xl transition-colors"
            >
              <HeadphonesIcon className="h-4 w-4" />
              고객센터
            </a>
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
        결제 중 문제가 발생했다면{' '}
        <a href="/support" className="text-blue-400 underline">고객센터</a>로 문의해 주세요.
        <br />
        주문 번호를 미리 메모해두시면 빠른 처리에 도움이 됩니다.
      </p>
    </div>
  )
}

/* ─── 페이지 ─────────────────────────────────────────────── */
export default function PaymentFailPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md bg-[#0D1F38] border border-white/10 rounded-2xl p-10 text-center">
          <p className="text-white/50 text-sm">로딩 중…</p>
        </div>
      }
    >
      <FailContent />
    </Suspense>
  )
}
