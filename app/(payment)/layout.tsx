import type { Metadata } from 'next'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: '결제 — NPLatform',
  robots: { index: false },
}

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#040C18] flex flex-col">
      {/* 최소 헤더 */}
      <header className="border-b border-white/10 bg-[#070F1C]">
        <div className="mx-auto max-w-lg px-4 py-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="bg-blue-500 text-white text-xs font-black px-2 py-0.5 rounded">NPL</span>
            <span>NPLatform</span>
          </a>
          <span className="text-white/30 text-sm">결제</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </main>

      <footer className="border-t border-white/10 py-4 text-center text-xs text-white/30">
        <p>NPLatform · 사업자등록번호 000-00-00000 · 결제 문의: support@nplatform.co.kr</p>
        <p className="mt-1">본 결제는 PortOne(포트원)을 통해 안전하게 처리됩니다.</p>
      </footer>

      <Toaster position="top-center" theme="dark" richColors />
    </div>
  )
}
