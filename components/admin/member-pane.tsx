'use client'

/**
 * MemberPane — 회원 상세 우측 패널 (2026-08-19)
 *
 * 정책: 운영자는 **어떤 리스트에서든 한 번의 클릭으로 회원 정보에 도달**한다.
 *   매입조건 현황 → 등록 회원 / 매각의뢰 현황 → 매각 회원 /
 *   NDA·계약 → 요청 회원 / 회원 승인 → 본인
 * 표시: 연락처·회사·상태 + 첨부(명함·사업자등록증) + 활동 전체
 *      (등록 매물 · 매입조건 · NDA 요청 · 관심매물 · 문의)
 * 데이터: GET /api/v1/admin/users/[id] (user + demands + listings + nda + favorites + tickets)
 */

import { useEffect, useState } from 'react'
import { X, Mail, Phone, Building2, ExternalLink } from 'lucide-react'

const INK = '#0A1628'
const ELECTRIC = '#2251FF'

type Member = {
  id: string; name?: string; email?: string; phone?: string | null
  company_name?: string | null; role?: string; roles?: string[] | null
  buyer_kind?: string | null; kyc_status?: string; created_at?: string
  admin_note?: string | null; last_login_at?: string | null
  card_file_name?: string | null; card_file_url?: string | null
  business_file_name?: string | null; business_file_url?: string | null
}
type Row = Record<string, unknown>

const ROLE_KO = (r?: string, roles?: string[] | null, kind?: string | null) => {
  const list = (roles && roles.length > 0 ? roles : [r ?? '']).map(x => String(x).toUpperCase())
  const has = (t: string) => list.some(x => t === 'BUYER' ? (x.startsWith('BUYER') || x === 'INVESTOR') : x === t)
  const parts: string[] = []
  if (has('SELLER')) parts.push('매각 회원')
  if (has('BUYER')) parts.push(`매입 회원${kind === 'CORP' ? '(법인)' : kind === 'INDIVIDUAL' ? '(개인자산가)' : ''}`)
  return parts.join(' · ') || '일반'
}
const KYC_KO: Record<string, string> = { APPROVED: '활성', PENDING: '승인대기', SUBMITTED: '승인대기', REJECTED: '거절', WITHDRAWN: '탈퇴' }

export function MemberPane({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [data, setData] = useState<{
    user?: Member; demands?: Row[]; listings?: Row[]; nda?: Row[]; favorites?: Row[]; tickets?: Row[]
  } | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    setData(null); setError('')
    fetch(`/api/v1/admin/users/${encodeURIComponent(userId)}`, { credentials: 'include' })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d?.error?.message ?? `조회 실패 (${r.status})`)
        if (!cancelled) setData(d)
      })
      .catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true }
  }, [userId])

  const u = data?.user
  const Section = ({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) => (
    <div className="border border-[var(--color-border-subtle)]">
      <div className="px-3 py-1.5 text-[11px] font-bold bg-[var(--color-surface-overlay)] border-b border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">
        {title}{typeof count === 'number' ? ` (${count}건)` : ''}
      </div>
      {children}
    </div>
  )
  const Empty = ({ text }: { text: string }) => <p className="px-3 py-2 text-[11px] text-[var(--color-text-muted)]">{text}</p>

  return (
    <div className="fixed inset-0 z-[300] flex justify-end" style={{ background: 'rgba(5,28,44,0.45)' }} onClick={onClose}>
      <div
        className="h-full w-full md:w-[560px] md:max-w-[90vw] flex flex-col bg-[var(--color-surface-elevated)] overflow-y-auto"
        style={{ borderLeft: `3px solid ${ELECTRIC}`, boxShadow: '-24px 0 48px -12px rgba(5,28,44,0.35)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 — 회원 식별 */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: ELECTRIC }}>회원 정보</div>
            <div className="text-[15px] font-black text-[var(--color-text-primary)] truncate">
              {u?.name ?? (error ? '조회 실패' : '불러오는 중…')}
              {u && <span className="ml-2 text-[11px] font-bold text-[var(--color-text-muted)]">{ROLE_KO(u.role, u.roles, u.buyer_kind)}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a href={`/admin/users?search=${encodeURIComponent(u?.email ?? '')}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
              style={{ textDecoration: 'none' }}>
              <ExternalLink size={11} /> 회원 승인
            </a>
            <button onClick={onClose} aria-label="닫기" className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-3 space-y-2.5">
          {error && <p className="px-3 py-3 text-[12px] font-bold text-amber-700">{error}</p>}

          {/* 연락 정보 — 누가 원하는지·어떻게 연락하는지 */}
          {u && (
            <div className="border border-[var(--color-border-subtle)]" style={{ borderTop: `2px solid ${INK}` }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 px-3 py-2.5 text-[12px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 size={12} className="text-[var(--color-text-muted)] shrink-0" />
                  <span className="truncate text-[var(--color-text-primary)]">{u.company_name || '개인'}</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Phone size={12} className="text-[var(--color-text-muted)] shrink-0" />
                  <a href={`tel:${u.phone ?? ''}`} className="font-mono text-[var(--color-text-primary)]" style={{ textDecoration: 'none' }}>{u.phone || '—'}</a>
                </div>
                <div className="flex items-center gap-1.5 min-w-0 sm:col-span-2">
                  <Mail size={12} className="text-[var(--color-text-muted)] shrink-0" />
                  <a href={`mailto:${u.email ?? ''}`} className="truncate text-[var(--color-text-primary)]" style={{ textDecoration: 'none' }}>{u.email}</a>
                </div>
                <div className="text-[11px] text-[var(--color-text-muted)]">
                  가입 {u.created_at?.slice(0, 10) ?? '—'}
                </div>
                <div className="text-[11px]">
                  <span className={`px-1.5 py-0.5 font-bold rounded-full border ${
                    u.kyc_status === 'APPROVED' ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                    : u.kyc_status === 'REJECTED' ? 'text-red-700 border-red-300 bg-red-50'
                    : (u.admin_note ?? '').startsWith('[보류]') ? 'text-orange-800 border-orange-400 bg-orange-50'
                    : 'text-amber-700 border-amber-300 bg-amber-50'}`}>
                    {(u.admin_note ?? '').startsWith('[보류]') && u.kyc_status !== 'APPROVED' ? '보류' : (KYC_KO[u.kyc_status ?? ''] ?? '승인대기')}
                  </span>
                </div>
              </div>
              {u.admin_note && (
                <p className="px-3 py-1.5 text-[11px] font-bold text-amber-800 bg-amber-50 border-t border-[var(--color-border-subtle)]">{u.admin_note}</p>
              )}
            </div>
          )}

          {/* 첨부 — 명함 · 사업자등록증 */}
          {u && (u.card_file_url || u.business_file_url) && (
            <Section title="가입 첨부">
              <div className="grid grid-cols-2 gap-2 p-2">
                {([['명함', u.card_file_url, u.card_file_name], ['사업자등록증', u.business_file_url, u.business_file_name]] as const).map(([label, url, fname]) => (
                  <div key={label} className="border border-[var(--color-border-subtle)]">
                    <div className="px-2 py-1 text-[10px] font-bold bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)]">{label}</div>
                    <div className="h-[110px] flex items-center justify-center overflow-hidden bg-[var(--color-surface-overlay)]">
                      {url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={url} alt={label} className="w-full h-full object-contain" />
                        : <span className="text-[10px] text-[var(--color-text-muted)]">{fname || '첨부 없음'}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* 매입조건 — 무엇을 원하는지 */}
          <Section title="매입조건" count={data?.demands?.length}>
            {!data?.demands?.length ? <Empty text="등록된 매입조건이 없습니다" /> : (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {(data.demands as Row[]).slice(0, 8).map((d, i) => {
                  const j = (v: unknown) => Array.isArray(v) ? (v as string[]).join('·') : String(v ?? '')
                  const eok = (v: unknown) => typeof v === 'number' && v > 0 ? (v >= 100000000 ? `${Math.round(v / 100000000)}억` : `${Math.round(v / 10000)}만`) : ''
                  const amt = [eok(d.min_amount), eok(d.max_amount)].filter(Boolean).join('~')
                  return (
                    <div key={String(d.id ?? i)} className="px-3 py-1.5 text-[11.5px]">
                      <span className="font-bold text-[var(--color-text-primary)]">{j(d.regions) || '지역 무관'}</span>
                      {j(d.collateral_types) && <span className="ml-1.5 text-[var(--color-text-muted)]">{j(d.collateral_types)}</span>}
                      {amt && <span className="ml-1.5 tabular-nums text-[var(--color-text-muted)]">{amt}</span>}
                      <span className="float-right text-[var(--color-text-muted)]">{String(d.created_at ?? '').slice(0, 10)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Section>

          {/* NDA 요청 — 어떤 물건을 열람 요청했는지 */}
          <Section title="NDA 요청" count={data?.nda?.length}>
            {!data?.nda?.length ? <Empty text="NDA 요청 이력이 없습니다" /> : (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {(data.nda as Row[]).map((n, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11.5px]">
                    <span className="truncate text-[var(--color-text-primary)]">{String(n.listing_title || n.listing_id)}</span>
                    <span className="shrink-0 text-[var(--color-text-muted)]">{String(n.requested_at ?? '').slice(0, 10)}</span>
                    <span className={`shrink-0 font-bold ${n.status === '승인' ? 'text-emerald-700' : n.status === '거절' ? 'text-red-700' : 'text-amber-700'}`}>{String(n.status)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 관심매물 */}
          <Section title="관심매물" count={data?.favorites?.length}>
            {!data?.favorites?.length ? <Empty text="관심 등록한 매물이 없습니다" /> : (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {(data.favorites as Row[]).map((f, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11.5px]">
                    <span className="truncate text-[var(--color-text-primary)]">{String(f.listing_title || f.listing_id)}</span>
                    <span className="shrink-0 text-[var(--color-text-muted)]">{String(f.created_at ?? '').slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 등록 매물 (매각 회원) */}
          <Section title="등록 매물 (매각)" count={data?.listings?.length}>
            {!data?.listings?.length ? <Empty text="등록한 매물이 없습니다" /> : (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {(data.listings as Row[]).slice(0, 10).map((l, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11.5px]">
                    <span className="truncate text-[var(--color-text-primary)]">{String(l.title ?? l.id)}</span>
                    <span className="shrink-0 text-[var(--color-text-muted)]">{[l.sido, l.sigungu].filter(Boolean).join(' ')}</span>
                    <span className="shrink-0 font-bold text-[var(--color-text-muted)]">{String(l.status ?? '')}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 문의 */}
          <Section title="문의·접수" count={data?.tickets?.length}>
            {!data?.tickets?.length ? <Empty text="문의 이력이 없습니다" /> : (
              <div className="divide-y divide-[var(--color-border-subtle)]">
                {(data.tickets as Row[]).map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11.5px]">
                    <span className="truncate text-[var(--color-text-primary)]">{String(t.title ?? '')}</span>
                    <span className="shrink-0 text-[var(--color-text-muted)]">{String(t.created_at ?? '').slice(0, 10)}</span>
                    <span className="shrink-0 font-bold text-[var(--color-text-muted)]">{String(t.status ?? '')}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
