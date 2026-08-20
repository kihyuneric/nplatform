'use client'

/**
 * IntakeWorkbench — 매각의뢰 접수 처리대 (2026-08-19) · 운영기획서 v4 §3-2, §3-3
 *
 * 한 화면에서 4단계로 끝낸다.
 *   ① 파일 확인 — 회원이 올린 원본을 뷰어로 연다
 *   ② 자동 파싱 — [OCR 자동입력] 으로 세부내역 폼을 채운다
 *   ③ 검수·보정 — 파싱값을 배지로 구분해 보여주고 운영자가 고친다
 *   ④ 등록 확정 — 매물 생성 + 관리번호 자동 발번
 *
 * 대행(agency)과 직접 등록(direct) 이 같은 처리대를 쓴다.
 * 다른 점은 ②가 필요한지 여부뿐이다 — 직접 등록은 이미 회원이 채워 왔다.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  X, FileText, Image as ImageIcon, ExternalLink, Sparkles, Loader2,
  CheckCircle2, AlertCircle, Send, RotateCcw,
} from 'lucide-react'
import { ATTACHMENT_KINDS, fmtSize, isPhoto, type Attachment } from '@/lib/listing-attachments'
import { NPL_DETAIL_SPEC, computeDerived, mapAutofill, missingRequired } from '@/lib/npl-detail-spec'

const ELECTRIC = '#2251FF'

export type Intake = {
  id: string
  seller_id: string
  seller_label?: string
  seller_contact?: string
  mode: 'direct' | 'agency'
  status: string
  detail: Record<string, string>
  attachments: Attachment[]
  memo?: string | null
  contact_phone?: string | null
  revision_note?: string | null
  revision_count?: number
  listing_id?: string | null
  created_at: string
}

export function IntakeWorkbench({
  intake,
  onClose,
  onDone,
}: {
  intake: Intake
  onClose: () => void
  onDone: () => void
}) {
  const [detail, setDetail] = useState<Record<string, string>>(() => computeDerived(intake.detail ?? {}))
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<'' | 'parse' | 'register' | 'revision'>('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [revisionNote, setRevisionNote] = useState('')
  const [showRevision, setShowRevision] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const files = intake.attachments ?? []
  const photos = files.filter(isPhoto)
  const docs = files.filter(f => !isPhoto(f))
  const missing = missingRequired(detail)

  const set = (k: string, v: string) => {
    setDetail(prev => computeDerived({ ...prev, [k]: v }))
    setAutoFilled(prev => { const n = new Set(prev); n.delete(k); return n })
  }

  /** 첨부 열기 — 비공개 버킷이라 서명 URL 을 받아 새 탭으로 */
  const openFile = async (a: Attachment) => {
    try {
      const r = await fetch(`/api/v1/listing-intakes/file?path=${encodeURIComponent(a.path)}`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error?.message ?? '열람 링크 발급 실패')
      window.open(d.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setError(e instanceof Error ? e.message : '파일을 열 수 없습니다.')
    }
  }

  /** ② 자동 파싱 — 엑셀이면 템플릿 파서, 그 외는 OCR */
  const parseFile = async (a: Attachment) => {
    setBusy('parse'); setError(''); setMsg('')
    try {
      // 원본을 서명 URL 로 받아 서버 파서에 그대로 넘긴다
      const s = await fetch(`/api/v1/listing-intakes/file?path=${encodeURIComponent(a.path)}`, { credentials: 'include' })
      const sd = await s.json()
      if (!s.ok) throw new Error(sd?.error?.message ?? '파일을 읽을 수 없습니다')
      const blob = await (await fetch(sd.url)).blob()

      const isXlsx = /\.(xlsx|xls|csv)$/i.test(a.name)
      const fd = new FormData()
      fd.append('file', new File([blob], a.name, { type: blob.type }))
      const endpoint = isXlsx ? '/api/v1/ocr/parse-template' : '/api/v1/ocr/autofill'

      const r = await fetch(endpoint, { method: 'POST', credentials: 'include', body: fd })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error?.message ?? `파싱 실패 (${r.status})`)

      const fields = mapAutofill(d?.data?.fields ?? d?.fields ?? {})
      const filled = new Set(autoFilled)
      let n = 0
      setDetail(prev => {
        const next = { ...prev }
        for (const [k, v] of Object.entries(fields)) {
          if (!v) continue
          if (String(next[k] ?? '').trim() && !filled.has(k)) continue   // 사람이 쓴 값 보존
          next[k] = v; filled.add(k); n++
        }
        return computeDerived(next)
      })
      setAutoFilled(filled)
      setMsg(n > 0 ? `${a.name} 에서 ${n}개 항목을 채웠습니다. 값을 확인해주세요.` : '채울 수 있는 항목을 찾지 못했습니다.')
    } catch (e) {
      setError(e instanceof Error ? e.message : '자동 입력에 실패했습니다.')
    } finally {
      setBusy('')
    }
  }

  /** ④ 등록 확정 */
  const register = async () => {
    setError('')
    if (missing.length > 0) {
      if (!confirm(`필수 항목 ${missing.length}개가 비어 있습니다.\n${missing.join(' · ')}\n\n그래도 등록할까요? (매물관리에 '보완 필요'로 표시됩니다)`)) return
    }
    setBusy('register')
    try {
      const r = await fetch('/api/v1/admin/intakes/register', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intake_id: intake.id, detail }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error?.message ?? `등록 실패 (${r.status})`)
      alert(`등록되었습니다 — 관리번호 ${d.listing_no}\n매각 회원에게 알림·이메일이 발송됩니다.`)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : '등록에 실패했습니다.')
    } finally {
      setBusy('')
    }
  }

  /** 보완요청 — 거절이 아니라 이어가는 것 (§3-2 보완요청) */
  const requestRevision = async () => {
    if (!revisionNote.trim()) { setError('무엇이 부족한지 적어주세요. 회원에게 그대로 전달됩니다.'); return }
    setBusy('revision'); setError('')
    try {
      const r = await fetch('/api/v1/listing-intakes', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: intake.id,
          status: '보완 필요',
          revision_note: revisionNote,
          revision_fields: missing,
        }),
      })
      if (!r.ok) throw new Error('보완요청 저장에 실패했습니다')
      alert('보완요청을 보냈습니다. 회원이 수정해 다시 제출하면 접수 목록에 다시 나타납니다.')
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : '보완요청에 실패했습니다.')
    } finally {
      setBusy('')
    }
  }

  const btn = 'inline-flex items-center justify-center gap-1.5 h-[30px] px-3 text-[11.5px] font-bold border whitespace-nowrap'
  const btnBase = { background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)', cursor: 'pointer' } as const

  return (
    <div className="fixed inset-0 z-[320] flex justify-end" style={{ background: 'rgba(5,28,44,0.45)' }} onClick={onClose}>
      <div
        className="h-full w-full md:w-[860px] md:max-w-[95vw] flex flex-col bg-[var(--color-surface-elevated)]"
        style={{ borderLeft: `3px solid ${ELECTRIC}`, boxShadow: '-24px 0 48px -12px rgba(5,28,44,0.35)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: ELECTRIC }}>
              {intake.mode === 'agency' ? '등록 대행 처리' : '매각의뢰 검토'}
            </div>
            <div className="text-[14px] font-black text-[var(--color-text-primary)] truncate">
              {intake.seller_label || '매각 회원'}
              <span className="ml-2 text-[11px] font-bold text-[var(--color-text-muted)]">
                {intake.seller_contact}
              </span>
            </div>
            <div className="text-[10.5px] text-[var(--color-text-muted)]">
              접수 {String(intake.created_at).slice(0, 10)} · 파일 {files.length}건
              {(intake.revision_count ?? 0) > 0 && ` · 보완요청 ${intake.revision_count}회`}
            </div>
          </div>
          <button onClick={onClose} aria-label="닫기" className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ① 파일 확인 · ② 자동 파싱 */}
          <section className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--color-text-primary)] mb-2">
              <FileText size={13} style={{ color: ELECTRIC }} /> 회원이 올린 자료
            </h3>

            {files.length === 0 ? (
              <p className="text-[11.5px] text-[var(--color-text-muted)]">첨부된 파일이 없습니다.</p>
            ) : (
              <div className="space-y-1">
                {docs.map(d => (
                  <div key={d.path} className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--color-border-subtle)]">
                    <span className="inline-flex items-center justify-center w-[68px] shrink-0 h-[19px] text-[10px] font-extrabold"
                      style={{ background: 'rgba(34,81,255,0.10)', color: '#1A47CC' }}>
                      {ATTACHMENT_KINDS.find(k => k.key === d.kind)?.label ?? '기타'}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-[11.5px]" title={d.name}>{d.name}</span>
                    <span className="shrink-0 text-[10px] text-[var(--color-text-muted)] tabular-nums">{fmtSize(d.size)}</span>
                    <button onClick={() => void openFile(d)} className={`${btn} h-[24px] px-2`} style={btnBase}>
                      <ExternalLink size={10} /> 열기
                    </button>
                    <button onClick={() => void parseFile(d)} disabled={busy !== ''} className={`${btn} h-[24px] px-2`}
                      style={{ ...btnBase, background: '#0A1628', color: '#FFF', borderColor: '#0A1628' }}>
                      {busy === 'parse' ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} 자동입력
                    </button>
                  </div>
                ))}
                {photos.length > 0 && (
                  <div className="flex items-center gap-2 px-2.5 py-1.5 border border-[var(--color-border-subtle)]">
                    <ImageIcon size={13} className="text-[var(--color-text-muted)]" />
                    <span className="flex-1 text-[11.5px]">담보물 사진 {photos.length}장</span>
                    <button onClick={() => void openFile(photos[0])} className={`${btn} h-[24px] px-2`} style={btnBase}>
                      <ExternalLink size={10} /> 대표 사진 보기
                    </button>
                  </div>
                )}
              </div>
            )}

            {intake.memo && (
              <p className="mt-2 px-2.5 py-1.5 text-[11.5px] bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]">
                <b>전달사항</b> · {intake.memo}
              </p>
            )}
            {msg && <p className="mt-2 text-[11.5px] font-bold text-emerald-700">{msg}</p>}
          </section>

          {/* ③ 검수·보정 */}
          <section className="px-4 py-3">
            <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
              <h3 className="flex items-center gap-1.5 text-[12.5px] font-bold text-[var(--color-text-primary)]">
                <CheckCircle2 size={13} style={{ color: ELECTRIC }} /> 세부내역 검수
              </h3>
              {missing.length > 0 ? (
                <span className="text-[11px] font-bold text-[#9F1239]">필수 {missing.length}개 미입력 — {missing.join(' · ')}</span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-700">필수 항목 모두 입력됨</span>
              )}
            </div>

            {NPL_DETAIL_SPEC.map(group => (
              <div key={group.group} className="mb-3">
                <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{group.group}</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.fields.map(f => {
                    const auto = autoFilled.has(f.key)
                    const isMissing = f.required && !String(detail[f.key] ?? '').trim()
                    return (
                      <label key={f.key} className="block">
                        <span className="flex items-center gap-1 mb-0.5 text-[10.5px] font-bold text-[var(--color-text-secondary)]">
                          {f.label}
                          {f.required && <span className="text-[#9F1239]">*</span>}
                          {auto && (
                            <span className="px-1 text-[9px] font-extrabold" style={{ background: 'rgba(34,81,255,0.10)', color: '#1A47CC' }}>
                              자동입력
                            </span>
                          )}
                        </span>
                        <input
                          value={detail[f.key] ?? ''}
                          onChange={e => set(f.key, e.target.value)}
                          placeholder={f.hint}
                          readOnly={f.computed}
                          className="w-full px-2 py-1.5 text-[11.5px] border outline-none focus:border-[#2251FF]"
                          style={{
                            background: f.computed ? 'var(--color-surface-overlay)' : (auto ? 'rgba(34,81,255,0.04)' : 'var(--color-surface-elevated)'),
                            borderColor: isMissing ? 'rgba(225,29,72,0.5)' : (auto ? 'rgba(34,81,255,0.35)' : 'var(--color-border-default)'),
                            color: 'var(--color-text-primary)',
                          }}
                        />
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
          </section>
        </div>

        {/* ④ 등록 확정 · 보완요청 */}
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] px-4 py-3 bg-[var(--color-surface-overlay)] space-y-2">
          {error && (
            <p className="px-2.5 py-1.5 text-[11.5px] font-bold text-[#9F1239]" style={{ background: 'rgba(225,29,72,0.06)' }}>
              <AlertCircle size={11} className="inline mr-1" />{error}
            </p>
          )}

          {showRevision && (
            <div className="space-y-1.5">
              <textarea
                value={revisionNote} onChange={e => setRevisionNote(e.target.value)} rows={2}
                placeholder="무엇이 부족한지 적어주세요 — 회원에게 그대로 전달됩니다 (예: 감정평가서가 누락되었습니다)"
                className="w-full px-2.5 py-2 text-[11.5px] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none"
              />
              <div className="flex items-center gap-1.5">
                <button onClick={() => void requestRevision()} disabled={busy !== ''} className={btn}
                  style={{ ...btnBase, background: '#A53F00', color: '#FFF', borderColor: '#A53F00' }}>
                  {busy === 'revision' ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} 보완요청 보내기
                </button>
                <button onClick={() => setShowRevision(false)} className={btn} style={btnBase}>취소</button>
              </div>
            </div>
          )}

          {!showRevision && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => void register()} disabled={busy !== ''} className={`${btn} flex-1`}
                style={{ ...btnBase, background: '#0A1628', color: '#FFF', borderColor: '#0A1628', borderTop: `2px solid ${ELECTRIC}` }}>
                {busy === 'register' ? <><Loader2 size={12} className="animate-spin" /> 등록 중…</> : <><CheckCircle2 size={12} /> 등록 확정 (관리번호 발번)</>}
              </button>
              <button onClick={() => setShowRevision(true)} disabled={busy !== ''} className={btn} style={btnBase}>
                <RotateCcw size={11} /> 보완요청
              </button>
            </div>
          )}

          <p className="text-[10.5px] text-[var(--color-text-muted)]">
            등록 확정 시 관리번호가 자동 발번되고, 매각 회원에게 알림·이메일로 통지됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}
