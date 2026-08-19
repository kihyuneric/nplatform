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
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        // 세션 없음(개발 우회 등) — 쿠키 역할 폴백
        if (!authUser) {
          if (cookieRole) setMemberRoles(getMemberRoles({ role: cookieRole }))
          return
        }
        // DB(users.roles) 우선 — 관리자 역할 겸용 저장 즉시 반영 (metadata 폴백)
        let source: Record<string, unknown> | undefined = authUser.user_metadata as Record<string, unknown> | undefined
        try {
          const { data: profile } = await supabase.from('users').select('roles, role').eq('id', authUser.id).maybeSingle()
          if (Array.isArray(profile?.roles) && profile.roles.length > 0) source = profile as Record<string, unknown>
        } catch { /* metadata 폴백 */ }
        setMemberRoles(getMemberRoles(source))
      } catch { /* ignore */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const isDual = memberRoles.includes('SELLER') && memberRoles.includes('BUYER')

  // 관리자/파트너 → 운영 대시보드 (매각 회원도 대시보드는 여기 — 내 매물과 별개 메뉴, 운영설계서 §8)
  useEffect(() => {
    if (group === 'ADMIN' || group === 'PARTNER') router.replace('/admin')
  }, [group, router])

  // 매각 역할 보유 시 — 내 매물 수 (대시보드 카드)
  const isSellerish = group === 'SELLER' || isDual || memberRoles.includes('SELLER')
  const [sellerCount, setSellerCount] = useState<number | null>(null)
  useEffect(() => {
    if (!isSellerish) return
    fetch('/api/v1/exchange/listings?limit=100&seller_id=me')
      .then(r => r.json())
      .then(d => setSellerCount(Array.isArray(d?.data) ? d.data.length : 0))
      .catch(() => setSellerCount(0))
  }, [isSellerish])

  // ── 매입사 · 일반회원 대시보드 — 실데이터 요약 ──
  const [demandCount, setDemandCount] = useState<number | null>(null)
  const [favCount, setFavCount] = useState(0)
  const [myNda, setMyNda] = useState<NdaRequest[]>([])
  // D4 — 이번 주 브리핑: 최근 7일 신규 등록 매물 수
  const [newThisWeek, setNewThisWeek] = useState<number | null>(null)

  useEffect(() => {
    if (group !== 'BUYER' && group !== 'GUEST') return
    // 매입 조건 수
    fetch('/api/v1/exchange/demands?limit=100&mine=1', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setDemandCount(Array.isArray(d?.data) ? d.data.length : 0))
      .catch(() => setDemandCount(0))
    // 관심매물 수 — 회원 Key 서버 저장소 (R3), 실패 시 로컬 폴백
    fetch('/api/v1/favorites', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d?.data) && d.data.length > 0) { setFavCount(d.data.length); return }
        try { setFavCount((JSON.parse(localStorage.getItem('npl_favorites') || '[]') as string[]).length) } catch { setFavCount(0) }
      })
      .catch(() => { try { setFavCount((JSON.parse(localStorage.getItem('npl_favorites') || '[]') as string[]).length) } catch { setFavCount(0) } })
    // D4 — 최근 7일 신규 등록 매물
    fetch('/api/v1/exchange/listings?limit=200', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const list: Array<{ created_at?: string }> = Array.isArray(d?.data) ? d.data : []
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
        setNewThisWeek(list.filter(x => x.created_at && new Date(x.created_at).getTime() >= cutoff).length)
      })
      .catch(() => setNewThisWeek(0))
    // 내 NDA 요청 현황
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const email = authUser?.email ?? ''
        const uid = authUser?.id ?? ''
        if (!uid) return
        const r = await fetch('/api/v1/listing-marketing')
        const d = await r.json()
        const mine: NdaRequest[] = []
        for (const row of Object.values(d?.data ?? {})) {
          for (const q of ((row as { nda_requests?: NdaRequest[] }).nda_requests ?? [])) {
            // 회원 Key 우선 (구 데이터 이메일 폴백)
            if (q.user_id ? q.user_id === uid : (!!q.email && q.email === email)) mine.push(q)
          }
        }
        setMyNda(mine)
      } catch { /* ignore */ }
    })()
  }, [group])

  if (group === 'ADMIN' || group === 'PARTNER') {
    return (
      <div className="py-16 text-center text-sm text-[var(--color-text-muted)]">
        <Loader2 size={16} className="animate-spin mx-auto mb-2" /> 대시보드로 이동 중...
      </div>
    )
  }

  // 매각 단독 회원 — 매입 관련 카드 없이 내 매물 중심 (운영설계서 §8)
  const sellerOnly = group === 'SELLER' && !isDual

  const CARDS = [
    // 매각 역할 보유 — 내 매물 카드 (매각 단독 · 겸용 공통)
    ...((sellerOnly || isDual) ? [{ label: '내 매물', value: sellerCount === null ? '…' : `${sellerCount}건`, desc: '매각의뢰 매물 상태 · 매칭 · 마케팅 진행', href: '/my/seller', icon: Search }] : []),
    ...(!sellerOnly ? [
      { label: '매입 조건', value: demandCount === null ? '…' : `${demandCount}건`, desc: '우선순위별 조건 관리 · 수정', href: '/my/demands', icon: ClipboardList },
      { label: '관심매물', value: `${favCount}건`, desc: '자동매칭 리스트에서 ♥ 등록한 매물', href: '/my/portfolio', icon: Heart },
      { label: 'NDA 진행', value: `${myNda.length}건`, desc: myNda.length > 0 ? `승인 ${myNda.filter(q => q.status === '승인').length} · 검토중 ${myNda.filter(q => q.status === '운영사 검토').length}` : 'NDA 요청 내역 없음', href: '/my/agreements', icon: FileSignature },
    ] : [
      { label: '알림센터', value: '보기', desc: '매칭 · NDA · 상담 진행 알림 확인', href: '/my/inbox', icon: ClipboardList },
      { label: '설정', value: '수정', desc: '회원정보 수정 · 비밀번호 변경', href: '/my/settings', icon: Heart },
    ]),
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
          {sellerOnly
            ? '매각의뢰 매물의 진행 현황을 한눈에 확인하세요. 주간 활동 요약은 내 매물에서 제공됩니다.'
            : '매입 조건에 맞는 NPL 딜만 자동매칭됩니다. 조건 · 관심매물 · NDA 진행을 한눈에 확인하세요.'}
        </p>
      </div>

      {/* D4 — 이번 주 브리핑 (매입 기준 · 알림 = 이 요약의 발송본) */}
      {!sellerOnly && (
      <div className="flex items-center justify-between gap-4 flex-wrap px-5 py-4" style={{ background: '#0A1628', borderTop: '3px solid #2251FF' }}>
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-[0.14em]" style={{ color: '#00A9F4' }}>이번 주 브리핑</div>
          <div className="mt-1 text-sm font-extrabold" style={{ color: '#FFFFFF' }}>
            신규 등록 {newThisWeek === null ? '…' : `${newThisWeek}건`}
            <span className="mx-2 opacity-40">·</span>
            NDA 승인 {myNda.filter(q => q.status === '승인').length}건
            <span className="mx-2 opacity-40">·</span>
            검토중 {myNda.filter(q => q.status === '운영사 검토').length}건
          </div>
        </div>
        <Link href="/exchange" className="px-4 py-2 text-xs font-extrabold" style={{ background: '#FFFFFF', color: '#0A1628', textDecoration: 'none' }}>
          신규·변동 보기 <ArrowRight size={11} style={{ display: 'inline', verticalAlign: -1 }} />
        </Link>
      </div>
      )}

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

      {/* 하단 바로가기 — 매각 단독: 새 매물 등록 / 그 외: NPL 자동매칭 */}
      <Link href={sellerOnly ? '/exchange/sell' : '/exchange'}
        className="flex items-center justify-between px-5 py-4"
        style={{ background: '#0A1628', borderTop: `3px solid ${ELECTRIC}`, textDecoration: 'none' }}>
        <div className="flex items-center gap-3">
          <Search size={16} style={{ color: '#00A9F4' }} />
          <div>
            <div className="text-sm font-extrabold" style={{ color: '#FFFFFF' }}>{sellerOnly ? 'NPL 매각의뢰' : 'NPL 자동매칭'}</div>
            <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {sellerOnly ? '새 매물 등록으로 매각의뢰 시작하기' : '등록한 매입 조건에 맞는 딜 확인하기'}
            </div>
          </div>
        </div>
        <ArrowRight size={15} style={{ color: '#FFFFFF' }} />
      </Link>
    </div>
  )
}
