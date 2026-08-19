'use client'

/**
 * ReactionsPane — 매물 반응 상세 패널 (운영자 전용 · 2026-08-19)
 *
 * "이 매물에 누가 반응했는가"를 한 화면에서:
 *   · 매칭 매입회원 (조건 대조 결과 — 누구의 어떤 조건에 걸렸는지)
 *   · NDA 요청자 (상태·일자)
 *   · 관심 등록 회원
 * 각 회원명을 누르면 회원 상세 패널로 이어진다 (onOpenMember).
 */

import { useEffect, useState } from 'react'
import { X, Phone, Mail } from 'lucide-react'

const ELECTRIC = '#2251FF'

type Member = { id?: string; name?: string; company_name?: string | null; phone?: string | null; email?: string; buyer_kind?: string | null }
type Row = Record<string, any>

export function ReactionsPane({
  listingId, onClose, onOpenMember,
}: { listingId: string; onClose: () => void; onOpenMember?: (userId: string) => void }) {
  const [data, setData] = useState<{ seller?: Member | null; listing_title?: string; nda?: Row[]; favorites?: Row[]; interest_count?: number } | null>(null)
  const [matched, setMatched] = useState<Row[] | null>(null)
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
    setData(null); setMatched(null); setError('')
    fetch(`/api/v1/admin/listings/${encodeURIComponent(listingId)}/reactions`, { credentials: 'include' })
      .then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d?.error?.message ?? '조회 실패'); if (!cancelled) setData(d) })
      .catch(e => { if (!cancelled) setError(e.message) })
    fetch(`/api/v1/matching/by-demand?listing_id=${encodeURIComponent(listingId)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (!cancelled) setMatched(Array.isArray(d?.data) ? d.data : []) })
      .catch(() => { if (!cancelled) setMatched([]) })
    return () => { cancelled = true }
  }, [listingId])

  const MemberLine = ({ m, extra }: { m: Member | null | undefined; extra?: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-2 px-3 py-2 text-[11.5px] border-b border-[var(--color-border-subtle)] last:border-b-0">
      <div className="min-w-0">
        {m?.id && onOpenMember ? (
          <button onClick={() => onOpenMember(m.id as string)}
            className="font-bold text-[#1A47CC] hover:underline truncate max-w-[200px] text-left"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            {m.name ?? '회원'}{m.company_name ? ` · ${m.company_name}` : ''}
          </button>
        ) : (
          <span className="font-bold text-[var(--color-text-primary)]">{m?.name ?? '(회원 미연결)'}</span>
        )}
        <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-[var(--color-text-muted)]">
          {m?.phone && <span className="inline-flex items-center gap-1"><Phone size={9} />{m.phone}</span>}
          {m?.email && <span className="inline-flex items-center gap-1 truncate max-w-[150px]"><Mail size={9} />{m.email}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">{extra}</div>
    </div>
  )

  const Section = ({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) => (
    <div className="border border-[var(--color-border-subtle)]">
      <div className="px-3 py-1.5 text-[11px] font-bold bg-[var(--color-surface-overlay)] border-b border-[var(--color-border-subtle)] text-[var(--color-text-primary)]">
        {title}{typeof count === 'number' ? ` (${count}건)` : ''}
      </div>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[310] flex justify-end" style={{ background: 'rgba(5,28,44,0.45)' }} onClick={onClose}>
      <div className="h-full w-full md:w-[560px] md:max-w-[90vw] overflow-y-auto bg-[var(--color-surface-elevated)]"
        style={{ borderLeft: `3px solid ${ELECTRIC}` }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: ELECTRIC }}>매물 반응 상세</div>
            <div className="text-[14px] font-black text-[var(--color-text-primary)] truncate">{data?.listing_title || '불러오는 중…'}</div>
          </div>
          <button onClick={onClose} aria-label="닫기" className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
        </div>

        <div className="p-3 space-y-2.5">
          {error && <p className="px-3 py-3 text-[12px] font-bold text-amber-700">{error}</p>}

          <Section title="매각 회원 (소유자)">
            {data?.seller ? <MemberLine m={data.seller} /> : <p className="px-3 py-2 text-[11px] text-[var(--color-text-muted)]">연결된 매각 회원이 없습니다</p>}
          </Section>

          <Section title="매칭 매입회원 (조건 대조)" count={matched?.length}>
            {matched === null ? <p className="px-3 py-2 text-[11px] text-[var(--color-text-muted)]">대조 중…</p>
              : matched.length === 0 ? <p className="px-3 py-2 text-[11px] text-[var(--color-text-muted)]">이 매물에 맞는 매입조건이 없습니다</p>
              : matched.map((m, i) => (
                  <MemberLine key={i} m={m.member}
                    extra={<span className="text-[10.5px] text-[var(--color-text-muted)]">
                      {(m.regions ?? []).slice(0, 2).join('·') || '지역무관'} / {(m.collateral_types ?? []).slice(0, 2).join('·') || '유형무관'}
                    </span>} />
                ))}
          </Section>

          <Section title="NDA 요청자" count={data?.nda?.length}>
            {!data?.nda?.length ? <p className="px-3 py-2 text-[11px] text-[var(--color-text-muted)]">NDA 요청이 없습니다</p>
              : data.nda.map((q, i) => (
                  <MemberLine key={i} m={q.member}
                    extra={<span className={`text-[10.5px] font-bold ${q.status === '승인' ? 'text-emerald-700' : q.status === '거절' ? 'text-red-700' : 'text-amber-700'}`}>
                      {q.status} · {String(q.requested_at ?? '').slice(5, 10)}
                    </span>} />
                ))}
          </Section>

          <Section title="관심 등록 회원" count={data?.favorites?.length}>
            {!data?.favorites?.length ? <p className="px-3 py-2 text-[11px] text-[var(--color-text-muted)]">관심 등록이 없습니다</p>
              : data.favorites.map((f, i) => (
                  <MemberLine key={i} m={f.member}
                    extra={<span className="text-[10.5px] text-[var(--color-text-muted)]">{String(f.created_at ?? '').slice(5, 10)}</span>} />
                ))}
          </Section>
        </div>
      </div>
    </div>
  )
}
