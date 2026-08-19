'use client'

/**
 * ImageInput — 이미지 URL 입력 + 직접 파일 첨부 겸용 (2026-08-19)
 *
 * 정책: 관리자 콘텐츠(메인 하이라이트 · 언론보도 · 히어로 카드)의 이미지는
 *      **URL 붙여넣기와 파일 업로드 둘 다** 가능해야 한다.
 * 업로드: Supabase Storage `content-images` 버킷 → 공개 URL 을 값으로 돌려준다.
 */

import { useRef, useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function ImageInput({
  value,
  onChange,
  label = '이미지',
  placeholder = 'https://... 또는 파일 첨부',
  previewHeight = 92,
}: {
  value: string
  onChange: (url: string) => void
  label?: string
  placeholder?: string
  previewHeight?: number
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const upload = async (file: File) => {
    setError('')
    if (!file.type.startsWith('image/')) { setError('이미지 파일만 첨부할 수 있습니다.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('5MB 이하 이미지만 첨부할 수 있습니다.'); return }
    setUploading(true)
    try {
      const supabase = createClient()
      const safe = file.name.replace(/[^\w.가-힣-]/g, '_').slice(0, 60)
      const path = `content/${crypto.randomUUID()}-${safe}`
      const { error: upErr } = await supabase.storage.from('content-images').upload(path, file, { upsert: false })
      if (upErr) throw upErr
      const url = supabase.storage.from('content-images').getPublicUrl(path).data.publicUrl
      onChange(url)
    } catch (e) {
      setError((e as { message?: string })?.message ?? '업로드에 실패했습니다.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <label className="block text-[10.5px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1">{label}</label>
      <div className="flex items-start gap-2">
        {/* 미리보기 */}
        <div
          className="shrink-0 flex items-center justify-center overflow-hidden border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)]"
          style={{ width: previewHeight * 1.4, height: previewHeight }}
        >
          {value
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={value} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.opacity = '0.2' }} />
            : <ImageIcon size={18} className="text-[var(--color-text-muted)]" />}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <input
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-w-0 px-2 py-1.5 text-[12px] border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]"
            />
            {value && (
              <button type="button" onClick={() => onChange('')} title="지우기"
                className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
              style={{ background: 'transparent', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.6 : 1 }}
            >
              <Upload size={11} /> {uploading ? '업로드 중…' : '파일 첨부'}
            </button>
            <span className="text-[10.5px] text-[var(--color-text-muted)]">JPG · PNG · 5MB 이하</span>
          </div>
          {error && <p className="text-[11px] font-bold text-red-600">{error}</p>}
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f) }}
      />
    </div>
  )
}
