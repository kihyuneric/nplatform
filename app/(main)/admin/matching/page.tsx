'use client'

/**
 * /admin/matching — NPL 매칭 관리 (2026-08-19 신설) · 운영기획서 v4 §3-6
 *
 * 원칙: **매칭은 자동, 발송은 수동.**
 *   "공개하지 않는 것이 기능"인 플랫폼이므로 매칭됐다고 자동 통지하지 않는다.
 *   운영자가 후보를 확인하고 **골라서** 보낸다. 이 화면은 그 판단을 돕는다.
 *
 * 탭 두 개
 *   ① 매물 기준 — 이 매물을 원할 만한 매입 회원 (점수순) → 선별 발송
 *   ② 발송 이력 — 언제 · 누구에게 보냈고 열람/관심/NDA 로 이어졌는가
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Target, RefreshCw, Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { MemberPane } from '@/components/admin/member-pane'
import { SEGMENT } from '@/lib/design-system'

const ELECTRIC = '#2251FF'

type Candidate = {
  demand_id: string
  user_id: string
  member_label: string
  email: string
  score: number
  reason: string
  condition: string
  sent_at: string | null
  opened_at: string | null
  favorited_at: string | null
  nda_requested_at: string | null
}

type Dispatch = {
  id: string
  listing_id: string
  user_id: string
  listing_no: string
  member_label: string
  score: number
  reason: string | null
  email_status: string | null
  sent_at: string
  opened_at: string | null
  favorited_at: string | null
  nda_requested_at: string | null
}

type ListingOpt = { id: string; listing_no: string; label: string }

export default function AdminMatchingPage() {
  const [tab, setTab] = useState<'listing' | 'history'>('listing')

  // 매물 선택
  const [listings, setListings] = useState<ListingOpt[]>([])
  const [listingId, setListingId] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState('')

  const [history, setHistory] = useState<Dispatch[]>([])
  const [memberTarget, setMemberTarget] = useState<string | null>(null)

  // 매물 목록 (선택용)
  useEffect(() => {
    fetch('/api/v1/admin/listings?limit=200&tab=APPROVED', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : { data: [] }))
      .then(d => {
        const list = (d.data ?? []).filter((x: Record<string, unknown>) => x.listing_no)
        setListings(list.map((x: Record<string, unknown>) => ({
          id: String(x.id),
          listing_no: String(x.listing_no),
          label: `${x.listing_no} · ${[x.sido, x.sigungu].filter(Boolean).join(' ')} · ${x.title ?? ''}`,
        })))
        if (!listingId && list[0]) setListingId(String(list[0].id))
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCandidates = useCallback(() => {
    if (!listingId) return
    setLoading(true); setError(''); setResult(''); setSelected(new Set())
    fetch(`/api/v1/admin/matching?listing=${encodeURIComponent(listingId)}`, { credentials: 'include' })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d?.error?.message ?? `후보를 불러오지 못했습니다 (${r.status})`)
        setCandidates(Array.isArray(d.candidates) ? d.candidates : [])
      })
      .catch(e => setError(e instanceof Error ? e.message : '알 수 없는 오류'))
      .finally(() => setLoading(false))
  }, [listingId])
  useEffect(() => { loadCandidates() }, [loadCandidates])

  const loadHistory = useCallback(() => {
    setLoading(true); setError('')
    fetch('/api/v1/admin/matching/dispatch', { credentials: 'include' })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(d?.error?.message ?? `이력을 불러오지 못했습니다 (${r.status})`)
        setHistory(Array.isArray(d.data) ? d.data : [])
      })
      .catch(e => setError(e instanceof Error ? e.message : '알 수 없는 오류'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { if (tab === 'history') loadHistory() }, [tab, loadHistory])

  const sendable = useMemo(() => candidates.filter(c => !c.sent_at), [candidates])

  const toggle = (uid: string) =>
    setSelected(prev => { const n = new Set(prev); n.has(uid) ? n.delete(uid) : n.add(uid); return n })

  const dispatch = async () => {
    if (selected.size === 0) { setError('보낼 회원을 선택해주세요.'); return }
    if (!confirm(`${selected.size}명에게 이 매물을 보냅니다.\n알림함과 이메일로 함께 발송됩니다. 진행할까요?`)) return
    setSending(true); setError(''); setResult('')
    try {
      const targets = candidates.filter(c => selected.has(c.user_id)).map(c => ({
        user_id: c.user_id, demand_id: c.demand_id, score: c.score, reason: c.reason,
      }))
      const r = await fetch('/api/v1/admin/matching/dispatch', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, targets }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error?.message ?? `발송 실패 (${r.status})`)
      setResult(
        `${d.sent}명에게 발송했습니다.` +
        (d.skipped > 0 ? ` (이미 보낸 ${d.skipped}명 제외)` : '') +
        (d.failures?.length ? ` · 실패 ${d.failures.length}건` : ''),
      )
      loadCandidates()
    } catch (e) {
      setError(e instanceof Error ? e.message : '발송에 실패했습니다.')
    } finally {
      setSending(false)
    }
  }

  const mark = (v: string | null) => (v ? <CheckCircle2 size={12} className="text-emerald-700" /> : <span className="text-[var(--color-text-muted)]">—</span>)

  return (
    <div className="p-6 max-w-[1240px] space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <Target size={13} /> NPL 매칭 관리
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            NPL 매칭 관리
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            매칭은 자동으로 계산되지만 <b>발송은 운영자가 고릅니다.</b> 후보를 확인하고 선별해 보내세요.
          </p>
        </div>
        <button onClick={() => (tab === 'listing' ? loadCandidates() : loadHistory())}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
          style={{ background: 'transparent', cursor: 'pointer' }}>
          <RefreshCw size={12} /> 새로고침
        </button>
      </div>

      {/* 탭 */}
      <div className={SEGMENT.group}>
        {([['listing', '매물 기준'], ['history', '발송 이력']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`${SEGMENT.item} w-[78px]`} style={SEGMENT.style(tab === k)}>
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-3 px-3 py-2.5 border" style={{ borderColor: 'rgba(225,29,72,0.4)', background: 'rgba(225,29,72,0.06)' }}>
          <AlertCircle size={13} className="text-[#9F1239]" />
          <span className="text-[12.5px] font-bold text-[#9F1239]">{error}</span>
        </div>
      )}
      {result && (
        <div className="px-3 py-2.5 border" style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.07)' }}>
          <span className="text-[12.5px] font-bold text-emerald-700">{result}</span>
        </div>
      )}

      {tab === 'listing' ? (
        <>
          {/* 매물 선택 */}
          <div className="flex items-center gap-3 flex-wrap">
            <select value={listingId} onChange={e => setListingId(e.target.value)}
              className="w-full max-w-xl px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]"
              style={{ cursor: 'pointer' }}>
              {listings.length === 0 && <option value="">등록된 매물이 없습니다</option>}
              {listings.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              후보 {candidates.length}명 · 미발송 {sendable.length}명
            </span>
          </div>

          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
                  <th className="px-3 py-2 font-bold w-[36px]"></th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">점수</th>
                  <th className="px-3 py-2 font-bold">매입 회원</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">매칭 근거</th>
                  <th className="px-3 py-2 font-bold">등록 조건</th>
                  <th className="px-3 py-2 font-bold whitespace-nowrap">발송</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</td></tr>}
                {!loading && candidates.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-12 text-center">
                    <p className="text-sm font-semibold text-[var(--color-text-secondary)]">이 매물에 맞는 매입조건이 없습니다</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">매입 회원이 조건을 등록하면 후보로 나타납니다.</p>
                  </td></tr>
                )}
                {candidates.map(c => {
                  const already = !!c.sent_at
                  return (
                    <tr key={c.user_id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">
                      <td className="px-3 py-2">
                        <input type="checkbox" checked={selected.has(c.user_id)} disabled={already}
                          onChange={() => toggle(c.user_id)} style={{ cursor: already ? 'not-allowed' : 'pointer' }} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="tabular-nums font-extrabold"
                          style={{ color: c.score >= 80 ? '#047857' : c.score >= 50 ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                          {c.score}점
                        </span>
                      </td>
                      <td className="px-3 py-2 max-w-[200px]">
                        <button onClick={() => setMemberTarget(c.user_id)}
                          className="block w-full text-left text-[12px] font-bold text-[#1A47CC] truncate hover:underline"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {c.member_label}
                        </button>
                        <span className="block text-[10px] text-[var(--color-text-muted)] truncate">{c.email}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] text-[var(--color-text-secondary)]">{c.reason}</td>
                      <td className="px-3 py-2 max-w-[220px]">
                        <span className="block truncate text-[11.5px] text-[var(--color-text-secondary)]">{c.condition}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {already ? (
                          <span className="text-[11px] font-bold text-[var(--color-text-muted)]">
                            발송됨 ({String(c.sent_at).slice(5, 10)})
                          </span>
                        ) : (
                          <span className="text-[11px] text-[var(--color-text-muted)]">미발송</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => void dispatch()} disabled={sending || selected.size === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[12.5px] font-extrabold text-white"
              style={{ background: '#0A1628', borderTop: `2px solid ${ELECTRIC}`, border: 'none', cursor: selected.size ? 'pointer' : 'not-allowed', opacity: selected.size ? 1 : 0.5 }}>
              {sending ? <><Loader2 size={13} className="animate-spin" /> 발송 중…</> : <><Send size={13} /> 선택 {selected.size}명에게 발송</>}
            </button>
            <button onClick={() => setSelected(new Set(sendable.map(c => c.user_id)))}
              className="px-3 py-2 text-[11.5px] font-bold border border-[var(--color-border-default)]"
              style={{ background: 'var(--color-surface-elevated)', cursor: 'pointer' }}>
              미발송 전체 선택
            </button>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              이메일에는 지역 · 유형 · 금액대까지만 담기며, 채권기관·담당자 정보는 포함되지 않습니다.
            </span>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="px-3 py-2 font-bold whitespace-nowrap">발송일</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">관리번호</th>
                <th className="px-3 py-2 font-bold">받은 회원</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">점수 · 근거</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">메일</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap text-center">열람</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap text-center">관심</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap text-center">NDA</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</td></tr>}
              {!loading && history.length === 0 && (
                <tr><td colSpan={8} className="px-3 py-12 text-center">
                  <p className="text-sm font-semibold text-[var(--color-text-secondary)]">발송 이력이 없습니다</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">매물 기준 탭에서 후보를 골라 발송하면 이곳에 쌓입니다.</p>
                </td></tr>
              )}
              {history.map(h => (
                <tr key={h.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap text-[var(--color-text-secondary)]">{String(h.sent_at).slice(0, 10)}</td>
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] font-bold text-[#1A47CC]">{h.listing_no}</td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <button onClick={() => setMemberTarget(h.user_id)}
                      className="block w-full text-left text-[12px] font-bold text-[#1A47CC] truncate hover:underline"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                      {h.member_label}
                    </button>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-[11px] text-[var(--color-text-secondary)]">
                    <span className="font-extrabold text-[var(--color-text-primary)]">{h.score}점</span>
                    {h.reason && <span className="ml-1.5 font-mono">{h.reason}</span>}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-[11px]"
                    style={{ color: h.email_status === '발송' ? '#047857' : h.email_status === '반송' ? '#9F1239' : 'var(--color-text-muted)' }}>
                    {h.email_status ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-center">{mark(h.opened_at)}</td>
                  <td className="px-3 py-2 text-center">{mark(h.favorited_at)}</td>
                  <td className="px-3 py-2 text-center">{mark(h.nda_requested_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {memberTarget && <MemberPane userId={memberTarget} onClose={() => setMemberTarget(null)} />}
    </div>
  )
}
