'use client'

/**
 * AttachmentUploader — 사진 · 서류 첨부 (2026-08-19) — 운영기획서 v4 §3-2-1
 *
 * 기존 매각의뢰 폼은 파일을 고를 수만 있고 **저장하지 않았다**(파일명만 남고 파일은 버려짐).
 * 이 컴포넌트는 고르는 즉시 Storage 에 올리고, 결과 경로를 부모에게 돌려준다.
 *
 * 원칙
 *   - 업로드는 **제출 전에 끝난다.** 제출 순간 올리기 시작하면 실패 시 입력이 통째로 날아간다.
 *   - 실패는 그 자리에서 사유를 보여주고 재시도할 수 있어야 한다. 조용히 넘어가지 않는다.
 *   - 사진 첫 장이 대표 사진. 회원이 순서를 바꿀 수 있다.
 */

import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon, FileText, Star, Loader2, AlertCircle } from 'lucide-react'
import {
  ATTACHMENT_KINDS, DOC_ACCEPT, PHOTO_ACCEPT, PHOTO_MAX_COUNT, DOC_MAX_COUNT,
  buildPath, fmtSize, isPhoto, validateCount, validateFile,
  type Attachment, type AttachmentKind,
} from '@/lib/listing-attachments'

const ELECTRIC = '#2251FF'

export function AttachmentUploader({
  ownerId,
  intakeId,
  value,
  onChange,
  disabled = false,
}: {
  /** 소유자(매각 회원) ID — 저장 경로 최상위. Storage 정책의 기준 */
  ownerId: string
  /** 접수 ID — 건별 폴더 */
  intakeId: string
  value: Attachment[]
  onChange: (next: Attachment[]) => void
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [progress, setProgress] = useState('')
  const photoRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const [docKind, setDocKind] = useState<AttachmentKind>('appraisal')

  const photos = value.filter(isPhoto).sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
  const docs = value.filter(a => !isPhoto(a))

  const upload = async (files: FileList | null, kind: AttachmentKind) => {
    if (!files || files.length === 0) return
    const list = Array.from(files)
    setErrors([])

    const countErr = validateCount(value, kind, list.length)
    if (countErr) { setErrors([countErr]); return }

    setBusy(true)
    const added: Attachment[] = []
    const failed: string[] = []
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      for (let i = 0; i < list.length; i++) {
        const file = list[i]
        setProgress(`${i + 1}/${list.length} · ${file.name}`)

        const fileErr = validateFile(file, kind)
        if (fileErr) { failed.push(`${file.name} — ${fileErr}`); continue }

        const path = buildPath(ownerId, intakeId, kind, file.name, Date.now() + i)
        const { error } = await supabase.storage
          .from('listing-files')
          .upload(path, file, { upsert: false, contentType: file.type || undefined })

        if (error) {
          failed.push(`${file.name} — 업로드 실패 (${error.message})`)
          continue
        }
        added.push({
          kind,
          path,
          name: file.name,
          size: file.size,
          ...(kind === 'photo' ? { order: photos.length + added.length + 1 } : {}),
          uploaded_at: new Date().toISOString(),
        })
      }
    } catch (e) {
      failed.push(e instanceof Error ? e.message : '알 수 없는 오류로 업로드하지 못했습니다')
    } finally {
      setBusy(false)
      setProgress('')
      if (photoRef.current) photoRef.current.value = ''
      if (docRef.current) docRef.current.value = ''
    }

    if (added.length > 0) onChange([...value, ...added])
    if (failed.length > 0) setErrors(failed)
  }

  const remove = async (target: Attachment) => {
    onChange(value.filter(a => a.path !== target.path))
    try {
      const { createClient } = await import('@/lib/supabase/client')
      await createClient().storage.from('listing-files').remove([target.path])
    } catch { /* 목록에서 빠졌으면 사용자 목적은 달성 — 고아 파일은 배치로 정리 */ }
  }

  /** 대표 사진 지정 — 해당 사진을 1번으로 올리고 나머지를 밀어낸다 */
  const setCover = (target: Attachment) => {
    let n = 1
    const next = value.map(a => {
      if (!isPhoto(a)) return a
      if (a.path === target.path) return { ...a, order: 0 }
      return a
    })
    const reordered = next
      .sort((a, b) => (isPhoto(a) && isPhoto(b) ? (a.order ?? 99) - (b.order ?? 99) : 0))
      .map(a => (isPhoto(a) ? { ...a, order: n++ } : a))
    onChange(reordered)
  }

  const box = 'border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]'

  return (
    <div className="space-y-4">
      {/* ── 담보물 사진 ── */}
      <div className={box}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)]">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-text-primary)]">
            <ImageIcon size={13} style={{ color: ELECTRIC }} /> 담보물 사진
          </span>
          <span className="text-[10.5px] text-[var(--color-text-muted)]">
            {photos.length} / {PHOTO_MAX_COUNT}장 · 첫 장이 대표 사진
          </span>
        </div>

        <div className="p-3 space-y-2">
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={p.path} className="relative border border-[var(--color-border-subtle)]">
                  <div className="h-[84px] flex items-center justify-center bg-[var(--color-surface-overlay)] overflow-hidden">
                    <ImageIcon size={20} className="text-[var(--color-text-muted)]" />
                  </div>
                  <div className="px-1.5 py-1">
                    <span className="block text-[10px] truncate text-[var(--color-text-primary)]" title={p.name}>{p.name}</span>
                    <span className="block text-[9.5px] text-[var(--color-text-muted)]">{fmtSize(p.size)}</span>
                  </div>
                  {i === 0 ? (
                    <span className="absolute top-1 left-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-extrabold text-white"
                      style={{ background: ELECTRIC }}>
                      <Star size={8} /> 대표
                    </span>
                  ) : (
                    <button type="button" onClick={() => setCover(p)} disabled={disabled}
                      className="absolute top-1 left-1 px-1.5 py-0.5 text-[9px] font-bold border"
                      style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'var(--color-border-default)', cursor: 'pointer' }}>
                      대표로
                    </button>
                  )}
                  <button type="button" onClick={() => void remove(p)} disabled={disabled}
                    aria-label="사진 삭제"
                    className="absolute top-1 right-1 p-0.5"
                    style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid var(--color-border-default)', cursor: 'pointer' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button type="button" onClick={() => photoRef.current?.click()} disabled={disabled || busy}
            className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold border border-dashed"
            style={{ borderColor: 'var(--color-border-default)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
            <Upload size={13} /> 사진 추가 (JPG · PNG · WEBP · 장당 10MB)
          </button>
          <input ref={photoRef} type="file" multiple accept={PHOTO_ACCEPT} style={{ display: 'none' }}
            onChange={e => void upload(e.target.files, 'photo')} />
        </div>
      </div>

      {/* ── 관련 서류 ── */}
      <div className={box}>
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)]">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--color-text-primary)]">
            <FileText size={13} style={{ color: ELECTRIC }} /> 관련 서류
          </span>
          <span className="text-[10.5px] text-[var(--color-text-muted)]">{docs.length} / {DOC_MAX_COUNT}개</span>
        </div>

        <div className="p-3 space-y-2">
          <p className="text-[11px] text-[var(--color-text-muted)]">
            서류는 <b>NDA 승인을 받은 매입 회원에게만</b> 공개됩니다. 목록에 존재 여부도 노출되지 않습니다.
          </p>

          {docs.length > 0 && (
            <div className="divide-y divide-[var(--color-border-subtle)] border border-[var(--color-border-subtle)]">
              {docs.map(d => (
                <div key={d.path} className="flex items-center gap-2 px-2.5 py-1.5">
                  <span className="inline-flex items-center justify-center w-[68px] shrink-0 h-[19px] text-[10px] font-extrabold"
                    style={{ background: 'rgba(34,81,255,0.10)', color: '#1A47CC' }}>
                    {ATTACHMENT_KINDS.find(k => k.key === d.kind)?.label ?? '기타'}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-[11.5px] text-[var(--color-text-primary)]" title={d.name}>{d.name}</span>
                  <span className="shrink-0 text-[10px] text-[var(--color-text-muted)] tabular-nums">{fmtSize(d.size)}</span>
                  <button type="button" onClick={() => void remove(d)} disabled={disabled} aria-label="서류 삭제"
                    className="shrink-0 p-0.5 text-[var(--color-text-muted)] hover:text-[#B3261E]"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            <select value={docKind} onChange={e => setDocKind(e.target.value as AttachmentKind)} disabled={disabled}
              className="px-2 py-2 text-[11.5px] font-bold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
              style={{ cursor: 'pointer' }}>
              {ATTACHMENT_KINDS.filter(k => k.key !== 'photo').map(k => (
                <option key={k.key} value={k.key}>{k.label}</option>
              ))}
            </select>
            <button type="button" onClick={() => docRef.current?.click()} disabled={disabled || busy}
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-[12px] font-bold border border-dashed"
              style={{ borderColor: 'var(--color-border-default)', background: 'transparent', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
              <Upload size={13} /> 서류 추가 (PDF · 엑셀 · 한글 · ZIP · 개당 30MB)
            </button>
          </div>
          <input ref={docRef} type="file" multiple accept={DOC_ACCEPT} style={{ display: 'none' }}
            onChange={e => void upload(e.target.files, docKind)} />
        </div>
      </div>

      {/* 진행 · 오류 */}
      {busy && (
        <p className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--color-text-secondary)]">
          <Loader2 size={12} className="animate-spin" /> 업로드 중… {progress}
        </p>
      )}
      {errors.length > 0 && (
        <div className="px-3 py-2 border" style={{ borderColor: 'rgba(225,29,72,0.4)', background: 'rgba(225,29,72,0.06)' }}>
          <p className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-[#9F1239] mb-1">
            <AlertCircle size={12} /> 올리지 못한 파일이 있습니다
          </p>
          <ul className="list-disc pl-4 space-y-0.5">
            {errors.map((e, i) => <li key={i} className="text-[11px] text-[#9F1239]">{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}
