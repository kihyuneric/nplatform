'use client'

/**
 * /admin/press — 언론보도 관리 (2026-08-18)
 *
 * NPLATFORM 소개 페이지의 언론보도 리스트를 등록·수정·삭제.
 * 제목 + URL 만 입력 — 소개 페이지에서 제목 클릭 시 새창으로 열림.
 * 저장소: press_articles (테이블 생성 전에는 저장 실패 안내).
 */

import { useEffect, useState } from 'react'
import { Newspaper, RefreshCw, Plus, Trash2, Save, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'
import { ImageInput } from '@/components/admin/image-input'

const ELECTRIC = '#2251FF'

type Row = {
  id?: string
  title: string
  url: string
  photo_url?: string
  sort: number
  _dirty?: boolean
}

export default function AdminPressPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingIdx, setSavingIdx] = useState<number | null>(null)
  const [savedIdx, setSavedIdx] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/v1/press')
      .then(r => r.json())
      .then(d => {
        const list: Row[] = Array.isArray(d?.data) ? d.data : []
        setRows(list.map((r, i) => ({ ...r, sort: typeof r.sort === 'number' ? r.sort : i })))
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const update = (idx: number, patch: Partial<Row>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch, _dirty: true } : r)))
  }

  const save = async (idx: number) => {
    const r = rows[idx]
    if (!r.url.trim()) { setErrorMsg('URL 을 입력해주세요.'); return }
    setSavingIdx(idx)
    setSavedIdx(null)
    setErrorMsg('')
    try {
      const res = await fetch('/api/v1/press', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', row: { ...r, sort: idx } }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d?.success) {
        setErrorMsg(d?.error?.message ?? '저장 실패 — press_articles 테이블 생성 여부를 확인하세요.')
        return
      }
      setRows(prev => prev.map((x, i) => (i === idx ? { ...x, id: d.data?.id ?? x.id, _dirty: false } : x)))
      setSavedIdx(idx)
      setTimeout(() => setSavedIdx(s => (s === idx ? null : s)), 1800)
    } finally {
      setSavingIdx(null)
    }
  }

  const remove = async (idx: number) => {
    const r = rows[idx]
    if (!confirm(`"${r.title || r.url || '이 항목'}" 을 삭제할까요?`)) return
    if (r.id) {
      await fetch('/api/v1/press', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: r.id }),
      }).catch(() => {})
    }
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const add = () => setRows(prev => [...prev, { title: '', url: '', photo_url: '', sort: prev.length, _dirty: true }])

  const inputCls = 'w-full px-2.5 py-2 text-[12.5px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]'

  return (
    <div className="p-6 max-w-[900px] space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <Newspaper size={13} /> 언론보도
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            언론보도 관리
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            제목과 URL 만 등록하면 NPLATFORM 소개 페이지에 표시되고, 클릭 시 새창으로 열립니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={add}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-white"
            style={{ background: '#0A1628', borderTop: `2px solid ${ELECTRIC}`, border: 'none', cursor: 'pointer' }}>
            <Plus size={13} /> 기사 추가
          </button>
          <button onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
            style={{ background: 'transparent', cursor: 'pointer' }}>
            <RefreshCw size={12} /> 새로고침
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 px-3 py-2.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-300">
          <AlertTriangle size={14} /> {errorMsg}
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-[var(--color-border-default)]">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">등록된 언론보도가 없습니다</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">[기사 추가]로 제목과 URL 을 등록하세요.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, idx) => (
            <div key={r.id ?? `new-${idx}`}
              className="border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] p-3"
              style={{ borderLeft: `3px solid ${ELECTRIC}` }}>
              <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1.2fr_auto] gap-2 items-start">
                <div className="space-y-1.5">
                  <div>
                    <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">제목</div>
                    <input value={r.title} onChange={e => update(idx, { title: e.target.value })}
                      placeholder="기사 제목" className={inputCls} />
                  </div>
                  {/* 썸네일 — URL 또는 파일 직접 첨부 (2026-08-19) */}
                  <ImageInput
                    label="썸네일 (URL 또는 파일 첨부)"
                    value={r.photo_url ?? ''}
                    onChange={url => update(idx, { photo_url: url })}
                    previewHeight={64}
                  />
                </div>
                <div>
                  <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">URL (새창으로 열림)</div>
                  <input value={r.url} onChange={e => update(idx, { url: e.target.value })}
                    placeholder="https://..." className={inputCls} />
                </div>
                <div className="flex items-center gap-1.5 pt-4">
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-[11px] font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
                      style={{ textDecoration: 'none' }}>
                      <ExternalLink size={11} /> 열기
                    </a>
                  )}
                  {savedIdx === idx && <CheckCircle2 size={14} className="text-emerald-600" />}
                  <button onClick={() => void save(idx)} disabled={savingIdx === idx}
                    className="inline-flex items-center gap-1 px-3 py-2 text-[11px] font-extrabold text-white"
                    style={{ background: r._dirty ? '#0A1628' : 'rgba(10,22,40,0.35)', borderTop: `2px solid ${ELECTRIC}`, border: 'none', cursor: 'pointer', opacity: savingIdx === idx ? 0.6 : 1 }}>
                    <Save size={11} /> {savingIdx === idx ? '저장 중…' : '저장'}
                  </button>
                  <button onClick={() => void remove(idx)}
                    className="inline-flex items-center gap-1 px-2.5 py-2 text-[11px] font-bold border border-rose-300 text-rose-600"
                    style={{ background: 'transparent', cursor: 'pointer' }}>
                    <Trash2 size={11} /> 삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]">
        ※ 저장은 press_articles 테이블 생성 후 유지됩니다 (supabase/migrations/20260817_listing_marketing.sql).
      </p>
    </div>
  )
}
