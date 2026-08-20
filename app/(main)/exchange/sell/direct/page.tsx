'use client'

/**
 * /exchange/sell/direct — 매각 회원 직접 등록 (2026-08-19 신설) · 운영기획서 v4 §3-2-0
 *
 * NPL 세부내역 표준 양식(엑셀 기반)을 매각 회원이 직접 채우는 화면.
 * 채우는 방법은 세 가지이고 **도착점은 모두 같은 폼**이다.
 *   ① 엑셀 업로드 — 표준 템플릿을 올리면 폼이 자동으로 채워진다
 *   ② 직접 입력   — 항목을 하나씩 채운다
 *   ③ 파일 OCR    — 채권소개서·감정평가서를 올리면 AI가 채운다
 *
 * ①③ 은 자동으로 채운 뒤 **회원이 확인·수정**하고 제출한다. 자동 제출은 없다.
 * 필수는 6개뿐이다 — 나머지는 비워도 제출되고, 부족한 건 운영자가 보완요청으로 받는다.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FileSpreadsheet, ScanLine, PencilLine, Upload, Loader2, ArrowRight,
  CheckCircle2, AlertCircle, Download, Sparkles,
} from 'lucide-react'
import { MckPageHeader } from '@/components/mck/page-header'
import { AttachmentUploader } from '@/components/listing/attachment-uploader'
import type { Attachment } from '@/lib/listing-attachments'
import { NPL_DETAIL_SPEC, computeDerived, mapAutofill, missingRequired } from '@/lib/npl-detail-spec'

const INK = '#0A1628'
const ELECTRIC = '#2251FF'
const INK_MID = 'rgba(5, 28, 44, 0.65)'
const INK_MUTED = 'rgba(5, 28, 44, 0.45)'
const BORDER = 'rgba(5, 28, 44, 0.12)'

const TEMPLATE_HREF = '/templates/NPLatform_매물등록_템플릿.xlsx'

export default function DirectRegisterPage() {
  const router = useRouter()
  const [me, setMe] = useState<{ id: string; email?: string } | null>(null)
  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setMe(d?.user ?? null))
      .catch(() => setMe(null))
  }, [])

  const intakeId = useMemo(
    () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`),
    [],
  )

  const [detail, setDetail] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<Attachment[]>([])
  /** 자동채움으로 들어온 항목 — 회원이 확인하도록 표시 */
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set())
  const [parsing, setParsing] = useState(false)
  const [parseMsg, setParseMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const xlsxRef = useRef<HTMLInputElement>(null)
  const ocrRef = useRef<HTMLInputElement>(null)

  const set = (k: string, v: string) => {
    setDetail(prev => computeDerived({ ...prev, [k]: v }))
    setAutoFilled(prev => { const n = new Set(prev); n.delete(k); return n })   // 사람이 고치면 표시 해제
  }

  /** 파싱 결과를 폼에 반영 — 이미 사람이 채운 값은 덮어쓰지 않는다 */
  const applyParsed = (raw: Record<string, unknown>) => {
    const fields = mapAutofill(raw)   // 파서마다 다른 키를 폼 키로 흡수
    const filled = new Set(autoFilled)
    setDetail(prev => {
      const next = { ...prev }
      let n = 0
      for (const [k, v] of Object.entries(fields ?? {})) {
        const val = String(v ?? '').trim()
        if (!val) continue
        if (String(next[k] ?? '').trim() && !filled.has(k)) continue   // 사람이 쓴 값 보존
        next[k] = val
        filled.add(k)
        n++
      }
      setParseMsg(n > 0 ? `${n}개 항목을 채웠습니다. 내용을 확인하고 필요하면 고쳐주세요.` : '채울 수 있는 항목을 찾지 못했습니다.')
      return computeDerived(next)
    })
    setAutoFilled(filled)
  }

  const uploadXlsx = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setParsing(true); setParseMsg(''); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/v1/ocr/parse-template', { method: 'POST', credentials: 'include', body: fd })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error?.message ?? `엑셀을 읽지 못했습니다 (${r.status})`)
      applyParsed(d?.data?.fields ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : '엑셀 파싱에 실패했습니다.')
    } finally {
      setParsing(false)
      if (xlsxRef.current) xlsxRef.current.value = ''
    }
  }

  const uploadOcr = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setParsing(true); setParseMsg(''); setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/v1/ocr/autofill', { method: 'POST', credentials: 'include', body: fd })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error?.message ?? `파일을 읽지 못했습니다 (${r.status})`)
      applyParsed(d?.data?.fields ?? d?.fields ?? {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OCR 인식에 실패했습니다. 직접 입력하거나 등록 대행을 이용해주세요.')
    } finally {
      setParsing(false)
      if (ocrRef.current) ocrRef.current.value = ''
    }
  }

  const missing = missingRequired(detail)

  const submit = async () => {
    setError('')
    if (missing.length > 0) {
      setError(`필수 항목이 비어 있습니다: ${missing.join(' · ')}`)
      return
    }
    setSubmitting(true)
    try {
      const r = await fetch('/api/v1/listing-intakes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: intakeId, mode: 'direct', detail, attachments }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(d?.error?.message ?? `접수에 실패했습니다 (${r.status})`)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '접수에 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <MckPageHeader eyebrow="NPL 매각의뢰" title="접수되었습니다" subtitle="" />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
          <div style={{ background: '#FFF', border: `1px solid ${BORDER}`, borderTop: `3px solid ${ELECTRIC}`, padding: '32px 28px' }}>
            <CheckCircle2 size={28} style={{ color: ELECTRIC }} />
            <h2 style={{ marginTop: 14, fontSize: 20, fontWeight: 900, color: INK, fontFamily: 'Georgia, serif' }}>
              매각의뢰가 접수되었습니다
            </h2>
            <p style={{ marginTop: 10, fontSize: 13.5, color: INK_MID, lineHeight: 1.7 }}>
              운영사가 내용을 검토한 뒤 등록합니다. 등록이 확정되면 <b>관리번호와 함께 알림·이메일</b>로 알려드립니다.
              보완이 필요한 항목이 있으면 무엇이 부족한지 알려드리니, 그 부분만 채워 다시 제출하시면 됩니다.
            </p>
            <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/my/seller" style={btnPrimary}>내 매물로 이동 <ArrowRight size={13} /></Link>
              <Link href="/exchange/sell" style={btnGhost}>매각의뢰 하나 더 등록</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <MckPageHeader
        eyebrow="NPL 매각의뢰 · 직접 등록"
        title="NPL 세부내역"
        subtitle="필수는 6개뿐입니다. 나머지는 비워두셔도 접수되며, 부족한 항목은 운영사가 알려드립니다."
      />

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 100px' }}>
        <button type="button" onClick={() => router.push('/exchange/sell')} style={{ ...btnGhost, marginBottom: 16 }}>
          ← 등록 방식 다시 고르기
        </button>

        {/* ── 채우는 방법 ── */}
        <section style={{ ...panel, borderTop: `3px solid ${ELECTRIC}` }}>
          <h3 style={panelTitle}><Sparkles size={14} style={{ color: ELECTRIC }} /> 빠르게 채우기</h3>
          <p style={{ fontSize: 12.5, color: INK_MID, marginTop: 4 }}>
            가지고 계신 자료가 있으면 올려주세요. 폼이 자동으로 채워집니다. 채워진 내용은 확인하고 고치실 수 있습니다.
          </p>
          <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <button type="button" onClick={() => xlsxRef.current?.click()} disabled={parsing} style={fillBtn}>
              <FileSpreadsheet size={16} style={{ color: ELECTRIC }} />
              <span style={fillTitle}>엑셀 업로드</span>
              <span style={fillDesc}>표준 템플릿을 채워 올리기</span>
            </button>
            <button type="button" onClick={() => ocrRef.current?.click()} disabled={parsing} style={fillBtn}>
              <ScanLine size={16} style={{ color: ELECTRIC }} />
              <span style={fillTitle}>파일 OCR</span>
              <span style={fillDesc}>채권소개서 · 감정평가서 인식</span>
            </button>
            <div style={{ ...fillBtn, cursor: 'default' }}>
              <PencilLine size={16} style={{ color: INK_MUTED }} />
              <span style={fillTitle}>직접 입력</span>
              <span style={fillDesc}>아래 폼에 바로 입력하세요</span>
            </div>
          </div>
          <input ref={xlsxRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
            onChange={e => void uploadXlsx(e.target.files)} />
          <input ref={ocrRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
            onChange={e => void uploadOcr(e.target.files)} />

          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <a href={TEMPLATE_HREF} style={{ ...btnGhost, textDecoration: 'none' }}>
              <Download size={12} /> 표준 엑셀 템플릿 받기
            </a>
            {parsing && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: INK_MID }}>
                <Loader2 size={12} className="animate-spin" /> 읽는 중…
              </span>
            )}
            {parseMsg && !parsing && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>{parseMsg}</span>
            )}
          </div>
        </section>

        {/* ── 세부내역 폼 ── */}
        {NPL_DETAIL_SPEC.map(group => (
          <section key={group.group} style={panel}>
            <h3 style={panelTitle}>{group.group}</h3>
            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
              {group.fields.map(f => {
                const auto = autoFilled.has(f.key)
                const isMissing = f.required && !String(detail[f.key] ?? '').trim()
                return (
                  <label key={f.key} style={{ display: 'block' }}>
                    <span style={labelStyle}>
                      {f.label}
                      {f.required && <span style={{ color: '#9F1239', marginLeft: 3 }}>*</span>}
                      {f.computed && <span style={{ color: INK_MUTED, fontWeight: 500, marginLeft: 4 }}>(자동)</span>}
                      {auto && <span style={autoBadge}>자동입력 — 확인</span>}
                    </span>
                    {f.type === 'textarea' ? (
                      <textarea
                        value={detail[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
                        rows={3} placeholder={f.hint}
                        style={{ ...inputStyle, resize: 'vertical', ...(auto ? autoInput : {}) }}
                      />
                    ) : (
                      <input
                        value={detail[f.key] ?? ''} onChange={e => set(f.key, e.target.value)}
                        placeholder={f.hint} readOnly={f.computed}
                        style={{
                          ...inputStyle,
                          ...(auto ? autoInput : {}),
                          ...(isMissing ? { borderColor: 'rgba(225,29,72,0.5)' } : {}),
                          ...(f.computed ? { background: '#F5F7FA', color: INK_MID } : {}),
                        }}
                      />
                    )}
                  </label>
                )
              })}
            </div>
          </section>
        ))}

        {/* ── 첨부 ── */}
        <section style={panel}>
          <h3 style={panelTitle}>사진 · 서류 첨부</h3>
          <p style={{ fontSize: 12.5, color: INK_MID, margin: '4px 0 12px' }}>
            담보물 사진은 자동매칭 리스트에 노출됩니다. 서류는 NDA 승인을 받은 매입 회원만 볼 수 있습니다.
          </p>
          {me && (
            <AttachmentUploader
              ownerId={me.id} intakeId={intakeId}
              value={attachments} onChange={setAttachments} disabled={submitting}
            />
          )}
        </section>

        {/* ── 제출 ── */}
        <div style={{ ...panel, borderTop: `3px solid ${ELECTRIC}`, position: 'sticky', bottom: 0 }}>
          {missing.length > 0 && (
            <p style={{ fontSize: 12.5, fontWeight: 700, color: '#9F1239', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <AlertCircle size={13} /> 필수 항목 {missing.length}개가 비어 있습니다 — {missing.join(' · ')}
            </p>
          )}
          {error && (
            <p style={{ marginBottom: 10, padding: '10px 12px', border: '1px solid rgba(225,29,72,0.35)', background: 'rgba(225,29,72,0.06)', fontSize: 12.5, fontWeight: 700, color: '#9F1239' }}>
              {error}
            </p>
          )}
          <button type="button" onClick={() => void submit()} disabled={submitting || !me}
            style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}>
            {submitting ? <><Loader2 size={14} className="animate-spin" /> 접수 중…</> : <>매각의뢰 접수하기 <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 스타일 ───────────────────────────────────────────────
const panel: React.CSSProperties = {
  background: '#FFFFFF', border: `1px solid ${BORDER}`, padding: '18px 18px', marginBottom: 14,
}
const panelTitle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 800, color: INK,
}
const fillBtn: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3,
  padding: '14px 14px', background: '#FFFFFF', border: `1px solid ${BORDER}`,
  textAlign: 'left', cursor: 'pointer',
}
const fillTitle: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: INK }
const fillDesc: React.CSSProperties = { fontSize: 11.5, color: INK_MUTED }
const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5, fontSize: 12, fontWeight: 700, color: INK,
}
const autoBadge: React.CSSProperties = {
  padding: '1px 5px', fontSize: 9.5, fontWeight: 800, color: '#1A47CC', background: 'rgba(34,81,255,0.10)',
}
const autoInput: React.CSSProperties = { background: 'rgba(34,81,255,0.04)', borderColor: 'rgba(34,81,255,0.35)' }
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 11px', fontSize: 13, color: INK,
  border: `1px solid ${BORDER}`, background: '#FFFFFF', outline: 'none',
}
const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '12px 18px',
  background: INK, color: '#FFFFFF', fontSize: 13.5, fontWeight: 800,
  border: 'none', borderTop: `2px solid ${ELECTRIC}`, cursor: 'pointer', textDecoration: 'none',
}
const btnGhost: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 12px',
  background: 'transparent', color: INK, fontSize: 12, fontWeight: 700,
  border: `1px solid ${BORDER}`, cursor: 'pointer', textDecoration: 'none',
}
