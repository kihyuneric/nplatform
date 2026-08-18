'use client'

/**
 * /admin/highlights — 메인 '이번 주 하이라이트 물건 8건' 관리 (2026-08-18)
 *
 * 운영자가 카드 8건을 등록·수정·삭제 → 메인 하이라이트 섹션에 즉시 반영.
 * 저장소: main_highlights (테이블 생성 전에는 저장 실패 안내).
 */

import { useEffect, useState } from 'react'
import { Sparkles, RefreshCw, Plus, Trash2, Save, CheckCircle2, AlertTriangle, Building2 } from 'lucide-react'

const ELECTRIC = '#2251FF'

type Row = {
  id?: string
  no: string
  location: string
  category: string
  appraisal: string
  principal: string
  max_claim: string
  asking: string
  photo_url: string
  sort: number
  _dirty?: boolean
}

const emptyRow = (sort: number): Row => ({
  no: `N-${String(sort + 1).padStart(2, '0')}`,
  location: '', category: '', appraisal: '', principal: '', max_claim: '', asking: '', photo_url: '',
  sort,
  _dirty: true,
})

/** 메인 히어로 PRIVATE DEAL 카드 (단일) */
type HeroRow = {
  no: string
  tag: string
  title: string
  address: string
  appraisal: string
  principal: string
  max_claim: string
  asking: string
}

const HERO_DEFAULT: HeroRow = {
  no: 'N-01',
  tag: 'PRIVATE · NPL',
  title: '서울 종로구 · 토지',
  address: '서울 종로구 홍지동 *** · 토지 5,193㎡',
  appraisal: '66.7',
  principal: '17.0',
  max_claim: '23.8',
  asking: '17.0',
}

export default function AdminHighlightsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [savingIdx, setSavingIdx] = useState<number | null>(null)
  const [savedIdx, setSavedIdx] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  // 메인 히어로 카드 — 단일 등록/수정/삭제
  const [hero, setHero] = useState<HeroRow>(HERO_DEFAULT)
  const [heroStored, setHeroStored] = useState(false)   // DB 에 저장된 커스텀 값 존재 여부
  const [heroSaving, setHeroSaving] = useState(false)
  const [heroSaved, setHeroSaved] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/v1/highlights')
      .then(r => r.json())
      .then(d => {
        const list: Row[] = Array.isArray(d?.data) ? d.data : []
        setRows(list.map((r, i) => ({ ...r, sort: typeof r.sort === 'number' ? r.sort : i })))
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
    fetch('/api/v1/hero-card')
      .then(r => r.json())
      .then(d => {
        if (d?.data) { setHero({ ...HERO_DEFAULT, ...d.data }); setHeroStored(true) }
        else { setHero(HERO_DEFAULT); setHeroStored(false) }
      })
      .catch(() => {})
  }
  useEffect(load, [])

  const saveHero = async () => {
    setHeroSaving(true)
    setHeroSaved(false)
    setErrorMsg('')
    try {
      const res = await fetch('/api/v1/hero-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', row: hero }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d?.success) {
        setErrorMsg(d?.error?.message ?? '히어로 저장 실패 — main_hero 테이블 생성 여부를 확인하세요.')
        return
      }
      setHeroStored(true)
      setHeroSaved(true)
      setTimeout(() => setHeroSaved(false), 1800)
    } finally {
      setHeroSaving(false)
    }
  }

  const resetHero = async () => {
    if (!confirm('히어로 카드를 삭제하고 기본 카드로 되돌릴까요?')) return
    await fetch('/api/v1/hero-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reset' }),
    }).catch(() => {})
    setHero(HERO_DEFAULT)
    setHeroStored(false)
  }

  const update = (idx: number, patch: Partial<Row>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch, _dirty: true } : r)))
  }

  const save = async (idx: number) => {
    const r = rows[idx]
    setSavingIdx(idx)
    setSavedIdx(null)
    setErrorMsg('')
    try {
      const res = await fetch('/api/v1/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', row: { ...r, sort: idx } }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d?.success) {
        setErrorMsg(d?.error?.message ?? '저장 실패 — main_highlights 테이블 생성 여부를 확인하세요.')
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
    if (!confirm(`${r.no || '이 카드'} 를 삭제할까요?`)) return
    if (r.id) {
      await fetch('/api/v1/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: r.id }),
      }).catch(() => {})
    }
    setRows(prev => prev.filter((_, i) => i !== idx))
  }

  const add = () => {
    if (rows.length >= 8) { alert('하이라이트는 최대 8건까지 노출됩니다.'); return }
    setRows(prev => [...prev, emptyRow(prev.length)])
  }

  const inputCls = 'w-full px-2 py-1.5 text-[12px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]'

  return (
    <div className="p-6 max-w-[1150px] space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <Sparkles size={13} /> 메인 하이라이트
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            이번주 하이라이트 NPL 8건
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            여기서 등록·수정·삭제하면 메인 카드에 바로 반영됩니다. 카드가 없으면 메인은 기본 8건을 표시합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={add}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-white"
            style={{ background: '#0A1628', borderTop: `2px solid ${ELECTRIC}`, border: 'none', cursor: 'pointer' }}>
            <Plus size={13} /> 카드 추가
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

      {/* ── 메인 히어로 PRIVATE DEAL 카드 — 단일 등록/수정/삭제 ── */}
      <div className="border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]" style={{ borderTop: '3px solid #0A1628' }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <div>
            <div className="text-[13px] font-black text-[var(--color-text-primary)]">메인 히어로 카드 (PRIVATE DEAL)</div>
            <div className="text-[11px] text-[var(--color-text-muted)]">
              메인 상단의 대표 딜 카드 — {heroStored ? '커스텀 저장값 사용 중' : '기본 카드 표시 중 (저장하면 교체)'}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {heroSaved && <CheckCircle2 size={14} className="text-emerald-600" />}
            <button onClick={() => void saveHero()} disabled={heroSaving}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-extrabold text-white"
              style={{ background: '#0A1628', borderTop: `2px solid ${ELECTRIC}`, border: 'none', cursor: 'pointer', opacity: heroSaving ? 0.6 : 1 }}>
              <Save size={11} /> {heroSaving ? '저장 중…' : '저장'}
            </button>
            {heroStored && (
              <button onClick={() => void resetHero()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold border border-rose-300 text-rose-600"
                style={{ background: 'transparent', cursor: 'pointer' }}>
                <Trash2 size={11} /> 삭제(기본으로)
              </button>
            )}
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">관리번호</div>
              <input value={hero.no} onChange={e => setHero(h => ({ ...h, no: e.target.value }))} placeholder="N-01"
                className="w-full px-2 py-1.5 text-[12px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]" />
            </div>
            <div>
              <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">상단 라벨</div>
              <input value={hero.tag} onChange={e => setHero(h => ({ ...h, tag: e.target.value }))} placeholder="PRIVATE · NPL"
                className="w-full px-2 py-1.5 text-[12px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]" />
            </div>
            <div className="col-span-2">
              <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">제목</div>
              <input value={hero.title} onChange={e => setHero(h => ({ ...h, title: e.target.value }))} placeholder="서울 종로구 · 토지"
                className="w-full px-2 py-1.5 text-[12px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]" />
            </div>
            <div className="col-span-2">
              <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">마스킹 주소 (한 줄)</div>
              <input value={hero.address} onChange={e => setHero(h => ({ ...h, address: e.target.value }))} placeholder="서울 종로구 홍지동 *** · 토지 5,193㎡"
                className="w-full px-2 py-1.5 text-[12px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {([
              ['appraisal', '감정가(억)'],
              ['principal', '총 채권액(억)'],
              ['max_claim', '수익권금액(억)'],
              ['asking', '협의가(억)'],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">{label}</div>
                <input value={hero[key]} onChange={e => setHero(h => ({ ...h, [key]: e.target.value }))} placeholder="66.7"
                  className="w-full px-2 py-1.5 text-[12px] font-semibold border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF] tabular-nums" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <div className="py-12 text-center border border-dashed border-[var(--color-border-default)]">
          <p className="text-sm font-bold text-[var(--color-text-primary)]">등록된 하이라이트가 없습니다</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">메인에는 기본 8건이 표시됩니다. [카드 추가]로 직접 등록하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r, idx) => (
            <div key={r.id ?? `new-${idx}`}
              className="border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]"
              style={{ borderTop: `3px solid ${ELECTRIC}` }}>
              {/* 이미지 미리보기 */}
              <div className="flex gap-3 p-3 border-b border-[var(--color-border-subtle)]">
                <div className="w-[120px] h-[90px] shrink-0 flex items-center justify-center overflow-hidden bg-[var(--color-surface-overlay)] border border-[var(--color-border-subtle)]">
                  {r.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center text-[var(--color-text-muted)]">
                      <Building2 size={20} className="mx-auto" />
                      <div className="text-[9px] font-bold mt-1">사진 없음</div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="text-[10px] font-bold text-[var(--color-text-muted)]">이미지 URL (카드의 주 이미지)</div>
                  <input value={r.photo_url} onChange={e => update(idx, { photo_url: e.target.value })}
                    placeholder="https:// 이미지 주소" className={inputCls} />
                  <div className="grid grid-cols-2 gap-1.5">
                    <input value={r.no} onChange={e => update(idx, { no: e.target.value })} placeholder="관리번호 (N-01)" className={inputCls} />
                    <input value={r.category} onChange={e => update(idx, { category: e.target.value })} placeholder="유형 (토지)" className={inputCls} />
                  </div>
                </div>
              </div>

              {/* 필드 */}
              <div className="p-3 space-y-1.5">
                <input value={r.location} onChange={e => update(idx, { location: e.target.value })} placeholder="지역 (서울 종로구)" className={inputCls} />
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">감정가</div>
                    <input value={r.appraisal} onChange={e => update(idx, { appraisal: e.target.value })} placeholder="66.7억" className={inputCls} />
                  </div>
                  <div>
                    <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">총 채권액</div>
                    <input value={r.principal} onChange={e => update(idx, { principal: e.target.value })} placeholder="17.0억" className={inputCls} />
                  </div>
                  <div>
                    <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">수익권금액</div>
                    <input value={r.max_claim} onChange={e => update(idx, { max_claim: e.target.value })} placeholder="23.8억" className={inputCls} />
                  </div>
                  <div>
                    <div className="text-[9.5px] font-bold text-[var(--color-text-muted)] mb-0.5">협의가</div>
                    <input value={r.asking} onChange={e => update(idx, { asking: e.target.value })} placeholder="17.0억" className={inputCls} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1.5">
                  <div className="text-[10px] font-bold text-[var(--color-text-muted)]">#{idx + 1} 번째 카드</div>
                  <div className="flex items-center gap-1.5">
                    {savedIdx === idx && <CheckCircle2 size={14} className="text-emerald-600" />}
                    <button onClick={() => void save(idx)} disabled={savingIdx === idx}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-extrabold text-white"
                      style={{ background: r._dirty ? '#0A1628' : 'rgba(10,22,40,0.35)', borderTop: `2px solid ${ELECTRIC}`, border: 'none', cursor: 'pointer', opacity: savingIdx === idx ? 0.6 : 1 }}>
                      <Save size={11} /> {savingIdx === idx ? '저장 중…' : '저장'}
                    </button>
                    <button onClick={() => void remove(idx)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold border border-rose-300 text-rose-600"
                      style={{ background: 'transparent', cursor: 'pointer' }}>
                      <Trash2 size={11} /> 삭제
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]">
        ※ 저장은 main_highlights 테이블 생성 후 유지됩니다 (supabase/migrations/20260817_listing_marketing.sql).
      </p>
    </div>
  )
}
