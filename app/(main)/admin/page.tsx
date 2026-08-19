'use client'

/**
 * /admin — 운영 대시보드 v3 (2026-08-17 · 사용자 지표 확정)
 *
 * 구성 (자문자답 결과):
 *   1행 · 사람  — 총 가입자 · 매각사 · 매입사 · 투자자 · 파트너  (서비스 회원 구성 한눈)
 *   2행 · 큐   — 승인대기 · 활성매물 · 매수조건 · 관심등록 · NDA 요청  (오늘 처리할 일, 클릭=처리 화면)
 *   3행 · 도구 — 분석·마케팅 · 메인 지표 입력
 *
 * 데이터: /api/v1/admin/overview (실 DB 집계 · 실패 지표는 '—')
 * 역할 연동: 회원(role) → 매각사/매입사/투자자/파트너 각자 /my 대시보드와 동일 축.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Users, FileText, ShoppingCart, FileSignature, Eye, Heart,
  LayoutDashboard, ArrowRight, Settings, UserCheck,
} from 'lucide-react'

const ELECTRIC = '#2251FF'

type Overview = {
  totalUsers: number | null
  sellers: number | null
  buyers: number | null
  investors: number | null
  partners: number | null
  pendingUsers: number | null
  activeListings: number | null
  demands: number | null
  interestTotal: number | null
  ndaTotal: number | null
  ndaPending: number | null
  openTickets: number | null
}

const fmt = (v: number | null | undefined) => (typeof v === 'number' ? v.toLocaleString() : '—')

export default function AdminDashboardPage() {
  const [ov, setOv] = useState<Overview | null>(null)

  useEffect(() => {
    fetch('/api/v1/admin/overview')
      .then(r => r.json())
      .then(d => { if (d?.data) setOv(d.data) })
      .catch(() => {})
  }, [])

  // ── 1행 · 회원 구성 — 회원 유형 3종 (매각 회원/매입 회원/파트너 회원 · 2026-08-18 확정) ──
  const buyerTotal = (typeof ov?.buyers === 'number' || typeof ov?.investors === 'number')
    ? (ov?.buyers ?? 0) + (ov?.investors ?? 0)   // 매입 회원 = 법인 · 개인 통합
    : null
  const PEOPLE = [
    { label: '총 가입자', value: fmt(ov?.totalUsers), href: '/admin/users' },
    { label: '매각 회원', value: fmt(ov?.sellers), href: '/admin/users?role=SELLER' },
    { label: '매입 회원', value: fmt(buyerTotal), href: '/admin/users?role=BUYER' },
    // 파트너 회원 — 우선 삭제 (2026-08-18)
  ]

  // ── 2행 · 처리 큐 — 사이드바 메뉴 명칭과 1:1 (회원 승인/매각의뢰 현황/매입조건 현황/NDA · 딜 진행) ──
  const QUEUE = [
    { label: '회원 승인 대기', value: fmt(ov?.pendingUsers), unit: '명', desc: '명함 · 사업자등록증 확인 후 승인', href: '/admin/users?tab=approvals', icon: UserCheck, urgent: (ov?.pendingUsers ?? 0) > 0 },
    { label: '매각의뢰 현황', value: fmt(ov?.activeListings), unit: '건', desc: '승인 매각의뢰 · 세부내역 · 마케팅', href: '/admin/listings', icon: FileText },
    { label: '매입조건 현황', value: fmt(ov?.demands), unit: '건', desc: '등록 조건 확인 → 자동매칭', href: '/admin/demands', icon: ShoppingCart },
    { label: '관심 등록', value: fmt(ov?.interestTotal), unit: '건', desc: '자동매칭 리스트 ♥ 반응 합계', href: '/admin/listings', icon: Heart },
    { label: 'NDA 검토 대기', value: fmt(ov?.ndaPending ?? ov?.ndaTotal), unit: '건', desc: '운영사 검토 → 승인 시 상세 공개', href: '/admin/agreements', icon: FileSignature, urgent: (ov?.ndaPending ?? 0) > 0 },
    { label: '접수함 미처리', value: fmt(ov?.openTickets), unit: '건', desc: '매각의뢰 문의 · 진행종료 요청 · 일반 문의', href: '/admin/inbox', icon: Eye, urgent: (ov?.openTickets ?? 0) > 0 },
  ]

  return (
    <div className="p-6 max-w-[1080px] space-y-7">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
          <LayoutDashboard size={13} /> Operations · 오늘의 운영
        </div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
          운영 대시보드
        </h1>
      </div>

      {/* ── 1행 · 사람 ── */}
      <section>
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          <Users size={12} /> 회원 구성
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-px" style={{ background: 'var(--color-border-subtle)' }}>
          {PEOPLE.map(t => (
            <Link key={t.label} href={t.href} style={{ display: 'block', background: 'var(--color-surface-elevated)', padding: '14px 14px', textDecoration: 'none', borderTop: `2px solid ${ELECTRIC}` }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {t.value}
              </div>
              <div style={{ marginTop: 5, fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)' }}>{t.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 2행 · 처리 큐 ── */}
      <section>
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">
          <ArrowRight size={12} /> 처리 큐 — 숫자를 누르면 바로 처리 화면
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px" style={{ background: "var(--color-border-subtle)" }}>
          {QUEUE.map(t => (
            <Link
              key={t.label}
              href={t.href}
              style={{
                display: 'block',
                background: 'var(--color-surface-elevated)',
                borderTop: `2px solid ${t.urgent ? '#E11D48' : ELECTRIC}`,
                padding: '16px 14px',
                textDecoration: 'none',
              }}
            >
              <div className="flex items-center justify-between mb-2.5">
                <t.icon size={15} style={{ color: ELECTRIC }} />
                {t.urgent && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#E11D48', letterSpacing: '0.05em' }}>처리 필요</span>}
              </div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 800, color: 'var(--color-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>
                {t.value}<span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)', marginLeft: 2 }}>{t.unit}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 800, color: 'var(--color-text-primary)' }}>{t.label}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: 2 }}>{t.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3행 도구 · 하단 안내문 — 사이드바 메뉴와 중복이라 삭제 (2026-08-18 사용자 지시) */}
    </div>
  )
}
