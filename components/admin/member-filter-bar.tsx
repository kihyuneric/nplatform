'use client'

/**
 * 회원 기준 필터 바 (2026-08-19)
 *
 * 원칙: 회원(users.id)이 모든 업무 데이터의 Key.
 *   회원 승인 → 그 회원이 등록한 매각의뢰 · 매입조건 · NDA가 전부 회원 Key로 붙는다.
 *   관리자 화면은 `?user=<회원ID>` 로 "이 회원의 것만" 볼 수 있어야 한다.
 *
 * useSearchParams 대신 window.location 을 쓰는 이유: 클라이언트 페이지 prerender 시
 * Suspense 경계 요구를 피하고, 관리자 화면은 항상 동적 렌더이기 때문.
 */

import { useEffect, useState } from 'react'
import { UserCheck, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** URL 의 ?user= 값을 읽는다 (마운트 후 1회 · 뒤로가기 대응) */
export function useMemberFilter(): string {
  const [uid, setUid] = useState('')
  useEffect(() => {
    const read = () => setUid(new URLSearchParams(window.location.search).get('user') ?? '')
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])
  return uid
}

export function MemberFilterBar({
  userId,
  count,
  unit = '건',
  onOpenMember,
}: {
  userId: string
  count: number
  unit?: string
  onOpenMember?: (id: string) => void
}) {
  const [label, setLabel] = useState('')

  useEffect(() => {
    let alive = true
    createClient()
      .from('users')
      .select('id, name, company_name, email')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive || !data) return
        setLabel([data.company_name, data.name, data.email].filter(Boolean).join(' · '))
      })
    return () => { alive = false }
  }, [userId])

  const clear = () => {
    const url = new URL(window.location.href)
    url.searchParams.delete('user')
    window.location.href = url.toString()
  }

  return (
    <div
      className="flex items-center gap-2.5 flex-wrap px-3 py-2 border"
      style={{ borderColor: 'rgba(34,81,255,0.35)', background: 'rgba(34,81,255,0.06)' }}
    >
      <UserCheck size={14} style={{ color: '#2251FF' }} />
      <span className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1A47CC]">회원 기준</span>
      <button
        onClick={() => onOpenMember?.(userId)}
        className="text-[12.5px] font-bold text-[var(--color-text-primary)] hover:underline"
        style={{ background: 'transparent', border: 'none', cursor: onOpenMember ? 'pointer' : 'default', padding: 0 }}
        title="회원 상세 보기"
      >
        {label || userId.slice(0, 8)}
      </button>
      <span className="text-[11.5px] font-semibold text-[var(--color-text-secondary)] tabular-nums">
        {count.toLocaleString()}{unit}
      </span>
      <button
        onClick={clear}
        className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
        style={{ background: 'var(--color-surface-elevated)', cursor: 'pointer' }}
      >
        <X size={11} /> 필터 해제
      </button>
    </div>
  )
}
