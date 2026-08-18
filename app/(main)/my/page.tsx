'use client'

/**
 * /my — 마이페이지 디폴트 = 대시보드 (2026-08-18 전면 교체)
 *
 * 역할 타일 허브 삭제 — 각 역할의 실제 대시보드로 바로 연결/표시:
 *   - 매각사(SELLER):          /my/seller (내 매물 대시보드) 로 이동
 *   - 관리자(ADMIN):           /admin (운영 대시보드) 로 이동
 *   - 파트너(PARTNER):         /admin (열람 전용) 으로 이동
 *   - 매입사 · 일반회원:        실데이터 요약 대시보드 (매입 조건 · 관심매물 · NDA)
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/auth-provider'
import { ArrowRight, ClipboardList, Heart, FileSignature, Search, Loader2 } from 'lucide-react'
import type { NdaRequest } from '@/lib/marketing-checklist'
import { createClient } from '@/lib/supabase/client'
import { getMemberRoles } from '@/lib/member-roles'

const ELECTRIC = '#2251FF'

function roleGroup(role: string | undefined | null): 'SELLER' | 'BUYER' | 'PARTNER' | 'ADMIN' | 'GUEST' {
  const r = String(role ?? '').toUpperCase()
  if (r === 'SELLER' || r === 'INSTITUTION') return 'SELLER'
  if (r.startsWith('BUYER') || r === 'INVESTOR' || r === 'VIEWER') return 'BUYER'
  if (r === 'PARTNER') return 'PARTNER'
  if (r === 'ADMIN' || r === 'SUPER_ADMIN') return 'ADMIN'
  return 'GUEST'
}

export default function MyDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  // 역할 전환 쿠키 우선 (관리자가 역할 전환으로 체험하는 경우 포함)
  const cookieRole = typeof document !== 'undefined'
    ? document.cookie.match(/(?:^|; )active_role=([^;]*)/)?.[1]
    : undefined
  const group = roleGroup(cookieRole ?? user?.role)

  // D1 복수 역할 — 겸용(매각+매입) 여부: 겸용이면 리다이렉트 없이 통합 대시보드
  const [memberRoles, setMemberRoles] = useState<string[]>([])
  useEffect(() => {
    if (cookieRole) { setMemberRoles(getMemberRoles({ role: cookieRole })); return }
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setMemberRoles(getMemberRoles(authUser?.user_metadata as Record<string, unknown> | undefined))
      } catch { /* ignore */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const isDual = memberRoles.includes('SELLER') && memberRoles.includes('BUYER')

  // 매각 전용 → 내 매물 대시보드 · 관리자/파트너 → 운영 대시보드 (겸용은 이동 안 함)
  useEffect(() => {
    if (group === 'SELLER' && !isDual) router.replace('/my/seller')
    else if (group === 'ADMIN' || group === 'PARTNER') router.replace('/admin')
  }, [group, isDual, router])

  // ── 매입사 · 일반회원 대시보드 — 실데이터 요약 ──
  const [demandCount, setDemandCount] = useState<number | null>(null)
  const [favCount, setFavCount] = useState(0)
  const [myNda, setMyNda] = useState<NdaRequest[]>([])

  useEffect(() => {
    if (group !== 'BUYER' && group !== 'GUEST') return
    // 매입 조건 수
    fetch('/api/v1/exchange/demands?limit=100', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setDemandCount(Array.isArray(d?.data) ? d.data.length : 0))
      .catch(() => setDemandCount(0))
    // 관심매물 수 (자동매칭 리스트 ♥ 와 동일 저장소)
    try { setFavCount((JSON.parse(localStorage.getItem('npl_favorites') || '[]') as string[]).length) } catch { /* ignore */ }
    // 내 NDA 요청 현황
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const email = authUser?.email ?? ''
        if (!email) return
        const r = await fetch('/api/v1/listing-marketing')
        const d = await r.json()
        const mine: NdaRequest[] = []
        for (const row of Object.values(d?.data ?? {})) {
          for (const q of ((row as { nda_requests?: NdaRequest[] }).nda_requests ?? [])) {
            if (q.email && q.email === email) mine.push(q)
          }
        }
        setMyNda(mine)
      } catch { /* ignore */ }
    })()
  }, [group])

  if ((group === 'SELLER' && !isDual) || group === 'ADMIN' || group === 'PARTNER') {
    return (
      <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">
        <Loader2 size={16} className="animate-spin mx-auto mb-2" /> 대시보드로 이동 중...
      </div>
    )
  }

  const CARDS = [
    // 겸용(매각+매입) 회원 — 내 매물 카드 함께 노출 (D1 복수 역할)
    ...(isDual ? [{ label: '내 매물', value: '보기', desc: '매각의뢰 매물 현황 · 마케팅 · NDA', href: '/my/seller', icon: Search }] : []),
    { label: '매입 조건', value: demandCount === null ? '…' : `${demandCount}건`, desc: '우선순위별 조건 관리 · 수정', href: '/my/demands', icon: ClipboardList },
    { label: '관심매물', value: `${favCount}건`, desc: '자동매칭 리스트에서 ♥ 등록한 매물', href: '/my/portfolio', icon: Heart },
    { label: 'NDA 진행', value: `${myNda.length}건`, desc: myNda.length > 0 ? `승인 ${myNda.filter(q => q.status === '승인').length} · 검토중 ${myNda.filter(q => q.status === '운영사 검토').length}` : 'NDA 요청 내역 없음', href: '/my/agreements', icon: FileSignature },
  ]

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
          MY NPLATFORM
        </div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
          대시보드
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          매입 조건에 맞는 NPL 딜만 자동매칭됩니다. 조건 · 관심매물 · NDA 진행을 한눈에 확인하세요.
        </p>
      </div>

      {/* 요약 카드 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-px" style={{ background: 'rgba(5, 28, 44, 0.10)', border: '1px solid rgba(5, 28, 44, 0.10)' }}>
        {CARDS.map(c => {
          const Icon = c.icon
          return (
            <Link key={c.label} href={c.href}
              className="block p-5 bg-[var(--color-surface-elevated)] hover:bg-[var(--color-surface-overlay)] transition-colors"
              style={{ borderTop: `2px solid ${ELECTRIC}`, textDecoration: 'none' }}>
              <div className="flex items-center justify-between mb-3">
                <Icon size={16} className="text-[var(--color-text-primary)]" />
                <ArrowRight size={13} className="text-[var(--color-text-muted)]" />
              </div>
              <div className="text-2xl font-black tabular-nums text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>{c.value}</div>
              <div className="mt-1 text-[12.5px] font-extrabold text-[var(--color-text-primary)]">{c.label}</div>
              <div className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{c.desc}</div>
            </Link>
          )
        })}
      </div>

      {/* NPL 자동매칭 바로가기 */}
      <Link href="/exchange"
        className="flex items-center justify-between px-5 py-4"
        style={{ background: '#0A1628', borderTop: `3px solid ${ELECTRIC}`, textDecoration: 'none' }}>
        <div className="flex items-center gap-3">
          <Search size={16} style={{ color: '#00A9F4' }} />
          <div>
            <div className="text-sm font-extrabold" style={{ color: '#FFFFFF' }}>NPL 자동매칭</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>등록한 매입 조건에 맞는 딜 확인하기</div>
          </div>
        </div>
        <ArrowRight size={15} style={{ color: '#FFFFFF' }} />
      </Link>
    </div>
  )
}
