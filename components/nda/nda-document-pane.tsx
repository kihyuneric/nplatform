'use client'

/**
 * NdaDocumentPane — 체결된 NDA 문서 뷰어 (2026-08-19)
 *
 * 누가 쓰나: 운영관리자(NDA·계약 화면) · 매입 회원(마이페이지 > 내 NDA)
 * 무엇을 하나:
 *   1) 체결 시점 전문(content_text)을 계약서 형태로 보여준다
 *   2) [PDF 저장] — 화면 그대로 PDF 파일로 내려받는다
 *   3) [PDF 보관] — 같은 PDF 를 Storage 에 올려 두어 이후엔 파일로 바로 열람
 *   4) 보관본이 있으면 [보관본 열기] · 운영관리자는 [보관 삭제]
 *
 * PDF 생성을 브라우저에서 하는 이유: 서버 PDF 라이브러리에 한글 폰트 임베딩 모듈이 없어
 * 한글이 깨진다. 화면 렌더를 그대로 담으면 폰트 문제 없이 정확한 문서가 나온다.
 */

import { useEffect, useRef, useState } from 'react'
import { X, Download, Save, FileText, Trash2, ExternalLink } from 'lucide-react'

const ELECTRIC = '#2251FF'

export type NdaDocument = {
  id: string
  request_id: string
  listing_id: string
  listing_no?: string | null
  user_id: string
  signer?: string | null
  email?: string | null
  agreed_at: string
  terms_version: string
  content_text: string
  file_path?: string | null
  member_label?: string
}

export function NdaDocumentPane({
  doc,
  isAdmin = false,
  onClose,
  onChanged,
}: {
  doc: NdaDocument
  isAdmin?: boolean
  onClose: () => void
  onChanged?: () => void
}) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<'' | 'pdf' | 'save' | 'open' | 'delete'>('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const fileName = `NDA_${doc.listing_no || doc.listing_id.slice(0, 8)}_${(doc.signer || '서명자').replace(/\s+/g, '')}.pdf`

  /** 화면(계약서 시트) → PDF Blob */
  const makePdf = async (): Promise<Blob> => {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ])
    const el = sheetRef.current
    if (!el) throw new Error('문서 영역을 찾을 수 없습니다')

    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#FFFFFF', useCORS: true })
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const margin = 12
    const imgW = pageW - margin * 2
    const imgH = (canvas.height * imgW) / canvas.width
    const img = canvas.toDataURL('image/jpeg', 0.92)

    // 세로로 긴 계약서는 A4 여러 장으로 잘라 넣는다
    let remaining = imgH
    let offset = 0
    while (remaining > 0) {
      pdf.addImage(img, 'JPEG', margin, margin - offset, imgW, imgH)
      remaining -= pageH - margin * 2
      offset += pageH - margin * 2
      if (remaining > 0) pdf.addPage()
    }
    return pdf.output('blob')
  }

  const downloadPdf = async () => {
    setBusy('pdf'); setMsg('')
    try {
      const blob = await makePdf()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = fileName
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'PDF 생성에 실패했습니다')
    } finally { setBusy('') }
  }

  /** PDF 를 Storage 에 보관 — 이후에는 파일 자체로 열람·배포 가능 */
  const savePdf = async () => {
    setBusy('save'); setMsg('')
    try {
      const blob = await makePdf()
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const path = `${doc.user_id}/${doc.id}.pdf`
      const { error: upErr } = await supabase.storage
        .from('nda-documents')
        .upload(path, blob, { upsert: true, contentType: 'application/pdf' })
      if (upErr) throw upErr

      const r = await fetch('/api/v1/nda/documents', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, file_path: path }),
      })
      if (!r.ok) throw new Error('보관 경로 저장에 실패했습니다')
      setMsg('PDF 보관본을 저장했습니다')
      onChanged?.()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'PDF 보관에 실패했습니다')
    } finally { setBusy('') }
  }

  const openStored = async () => {
    setBusy('open'); setMsg('')
    try {
      const r = await fetch(`/api/v1/nda/documents/${doc.id}/file`, { credentials: 'include' })
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error?.message ?? '열람 링크 발급 실패')
      window.open(d.url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '보관본을 열 수 없습니다')
    } finally { setBusy('') }
  }

  const deleteStored = async () => {
    if (!confirm('보관된 PDF 를 삭제할까요?\n체결 기록 자체는 남습니다.')) return
    setBusy('delete'); setMsg('')
    try {
      const r = await fetch(`/api/v1/nda/documents?id=${encodeURIComponent(doc.id)}`, {
        method: 'DELETE', credentials: 'include',
      })
      if (!r.ok) throw new Error('삭제 실패')
      setMsg('보관 PDF 를 삭제했습니다')
      onChanged?.()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : '삭제에 실패했습니다')
    } finally { setBusy('') }
  }

  const btn = 'inline-flex items-center justify-center gap-1 h-[28px] px-2.5 text-[11px] font-bold border whitespace-nowrap'
  const btnBase = { background: 'var(--color-surface-elevated)', borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)', cursor: 'pointer' } as const

  return (
    <div className="fixed inset-0 z-[320] flex justify-end" style={{ background: 'rgba(5,28,44,0.45)' }} onClick={onClose}>
      <div
        className="h-full w-full md:w-[720px] md:max-w-[92vw] flex flex-col bg-[var(--color-surface-elevated)]"
        style={{ borderLeft: `3px solid ${ELECTRIC}`, boxShadow: '-24px 0 48px -12px rgba(5,28,44,0.35)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: ELECTRIC }}>NDA 체결 문서</div>
            <div className="text-[14px] font-black text-[var(--color-text-primary)] truncate">
              {doc.listing_no || '관리번호 미정'}
              <span className="ml-2 text-[11px] font-bold text-[var(--color-text-muted)]">
                {doc.member_label || doc.signer || doc.email}
              </span>
            </div>
          </div>
          <button onClick={onClose} aria-label="닫기" className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {/* 파일 관리 도구 */}
        <div className="flex items-center gap-1.5 flex-wrap px-4 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] shrink-0">
          <button onClick={() => void downloadPdf()} disabled={busy !== ''} className={btn} style={btnBase}>
            <Download size={11} /> {busy === 'pdf' ? '생성 중…' : 'PDF 저장'}
          </button>
          <button onClick={() => void savePdf()} disabled={busy !== ''} className={btn}
            style={{ ...btnBase, background: '#0A1628', color: '#FFFFFF', borderColor: '#0A1628' }}>
            <Save size={11} /> {busy === 'save' ? '보관 중…' : 'PDF 보관'}
          </button>
          {doc.file_path && (
            <button onClick={() => void openStored()} disabled={busy !== ''} className={btn} style={btnBase}>
              <ExternalLink size={11} /> 보관본 열기
            </button>
          )}
          {isAdmin && doc.file_path && (
            <button onClick={() => void deleteStored()} disabled={busy !== ''} className={btn}
              style={{ ...btnBase, color: '#B3261E' }}>
              <Trash2 size={11} /> 보관 삭제
            </button>
          )}
          <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-bold"
            style={{ color: doc.file_path ? '#047857' : 'var(--color-text-muted)' }}>
            <FileText size={11} /> {doc.file_path ? '보관본 있음' : '보관본 없음'}
          </span>
        </div>

        {msg && (
          <div className="px-4 py-2 text-[11.5px] font-bold border-b border-[var(--color-border-subtle)]"
            style={{ color: msg.includes('실패') || msg.includes('없') ? '#9F1239' : '#047857' }}>
            {msg}
          </div>
        )}

        {/* 계약서 시트 — 이 영역이 그대로 PDF 가 된다 */}
        <div className="flex-1 overflow-y-auto p-4" style={{ background: '#EEF1F5' }}>
          <div
            ref={sheetRef}
            style={{
              background: '#FFFFFF',
              color: '#0A1628',
              padding: '32px 34px',
              border: '1px solid rgba(5,28,44,0.12)',
              fontSize: 12.5,
              lineHeight: 1.75,
              whiteSpace: 'pre-wrap',
              fontFamily: '"Malgun Gothic", "맑은 고딕", system-ui, sans-serif',
            }}
          >
            {doc.content_text}
          </div>
          <p className="mt-2 text-[10.5px] text-[var(--color-text-muted)]">
            약관버전 {doc.terms_version} · 체결 {new Date(doc.agreed_at).toLocaleString('ko-KR')} · 문서 ID {doc.id.slice(0, 8)}
          </p>
        </div>
      </div>
    </div>
  )
}
