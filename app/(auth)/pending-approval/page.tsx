'use client'

import Link from 'next/link'
import { Clock, LogOut, Mail, CheckCircle2 } from 'lucide-react'

const STEPS = [
  { label: '가입신청 완료', sub: '서류 접수됨', done: true, active: false },
  { label: '서류 검토 중', sub: '평균 1-2 영업일', done: false, active: true },
  { label: '승인 완료', sub: '이메일 알림 발송', done: false, active: false },
]

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4 py-16">
      {/* Logo — 클릭 시 홈 이동 */}
      <Link
        href="/"
        aria-label="NPLatform 홈으로"
        className="flex items-center gap-2.5 mb-12 hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-brand-deep)] rounded-lg"
      >
        <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-deep)] flex items-center justify-center">
          <span className="text-white font-black text-base">N</span>
        </div>
        <span className="text-xl font-bold text-[var(--color-brand-deep)]">NPLatform</span>
      </Link>

      <div className="w-full max-w-md space-y-8">
        {/* Icon + heading */}
        <div className="flex flex-col items-center text-center gap-5">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full border-2 border-[var(--color-brand-bright)]/30 border-t-[var(--color-brand-bright)] animate-spin"
              style={{ width: 80, height: 80 }}
            />
            <div className="w-20 h-20 rounded-full bg-stone-100 flex items-center justify-center">
              <Clock className="w-9 h-9 text-[var(--color-brand-bright)]" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-[var(--color-brand-deep)] mb-3">승인 대기 중입니다</h1>
            <p className="text-sm text-gray-500 leading-relaxed">
              관리자가 계정을 검토 중입니다.<br />
              승인 후 이메일로 알려드립니다.
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative pl-1">
          <div className="absolute left-[19px] top-5 bottom-5 w-0.5 bg-gray-100" />
          <div className="space-y-0">
            {STEPS.map((s) => (
              <div key={s.label} className="relative flex items-start gap-4 pb-6 last:pb-0">
                <div
                  className="relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: s.done ? '#14161A' : s.active ? '#14161A' : 'transparent',
                    border: !s.done && !s.active ? '2px solid #E5E7EB' : 'none',
                  }}
                >
                  {s.done
                    ? <CheckCircle2 className="w-4 h-4 text-white" />
                    : s.active
                      ? <Clock className="w-4 h-4 text-white animate-pulse" />
                      : <div className="w-2 h-2 rounded-full bg-gray-300" />
                  }
                </div>
                <div className="pt-2">
                  <p className={`text-sm font-semibold ${s.done ? 'text-stone-900' : s.active ? 'text-stone-900' : 'text-gray-400'}`}>
                    {s.label}
                    {s.active && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-[var(--color-brand-bright)] bg-stone-100 px-2 py-0.5 rounded-full">
                        <span className="w-1 h-1 rounded-full bg-[var(--color-brand-bright)] animate-pulse" />
                        진행 중
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-xl bg-stone-100 border border-stone-300 p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">예상 소요 시간</span>
            <span className="font-semibold text-[var(--color-brand-deep)]">보통 1-2 영업일 소요</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-gray-500">처리 상태</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand-bright)] bg-white border border-stone-300 px-2.5 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              검토 중
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <a
            href="mailto:support@nplatform.co.kr"
            className="w-full h-12 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold
              hover:border-[var(--color-brand-deep)] hover:text-[var(--color-brand-deep)] transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            지원팀 문의 — support@nplatform.co.kr
          </a>
          <Link
            href="/auth/signout"
            className="w-full h-11 rounded-xl text-gray-400 text-sm hover:text-gray-600 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400">
          승인 완료 시 등록된 이메일로 알림이 발송됩니다
        </p>
      </div>
    </div>
  )
}
