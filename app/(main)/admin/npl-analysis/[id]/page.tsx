'use client'

/**
 * /admin/npl-analysis/[id] — NPL 상세 분석 (운영자 전용)
 * 매물 1건의 전체 필드 + 수익률 분석 브레이크다운.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Brain, Heart, FileSignature, Phone, CheckCircle2 } from 'lucide-react'
import { computeAnalysis, fmtEok } from '../_analysis'
import { MARKETING_CHECKLIST, emptyMarketing, type ListingMarketing } from '@/lib/marketing-checklist'

export default function AdminNplAnalysisDetailPage() {
  const params = useParams<{ id: string }>()
  const id = decodeURIComponent(params?.id ?? '')
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  // ── 마케팅 체크리스트 · 반응 집계 (운영사 ↔ 매각사 공유) ──
  const [mk, setMk] = useState<ListingMarketing>(emptyMarketing(''))
  const [consultDraft, setConsultDraft] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    fetch(`/api/v1/listing-marketing?ids=${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(d => {
        const row = d?.data?.[id] as ListingMarketing | undefined
        if (row) { setMk({ ...emptyMarketing(id), ...row }); setConsultDraft(String(row.consult_count ?? 0)) }
        else { setMk(emptyMarketing(id)); setConsultDraft('0') }
      })
      .catch(() => {})
  }, [id])

  const saveMk = async (patch: { checklist?: Record<string, boolean>; consult_count?: number }) => {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/listing-marketing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: id, ...patch }),
      })
      const d = await res.json().catch(() => ({}))
      if (d?.data) setMk(prev => ({ ...prev, ...d.data }))
    } finally {
      setSaving(false)
    }
  }

  const toggleCheck = (key: string) => {
    const next = { ...mk.checklist, [key]: !mk.checklist[key] }
    setMk(prev => ({ ...prev, checklist: next }))
    void saveMk({ checklist: next })
  }

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        // 단건 API 우선, 실패 시 목록에서 탐색
        let found: Record<string, unknown> | null = null
        try {
          const r = await fetch(`/api/v1/exchange/listings/${encodeURIComponent(id)}`, { credentials: 'include' })
          if (r.ok) {
            const d = await r.json()
            found = (d.data ?? d) as Record<string, unknown>
          }
        } catch { /* fall through */ }
        if (!found) {
          const r = await fetch('/api/v1/exchange/listings?limit=200', { credentials: 'include' })
          const d = await r.json()
          const list: Array<Record<string, unknown>> = Array.isArray(d.data) ? d.data : []
          found = list.find(x => String(x.id) === id) ?? null
        }
        if (!cancelled) setRaw(found)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  if (loading) return <div className="p-10 text-center text-sm text-[var(--color-text-muted)]">분석 데이터를 불러오는 중...</div>
  if (!raw) return (
    <div className="p-10 text-center space-y-3">
      <p className="text-sm text-[var(--color-text-muted)]">매물을 찾을 수 없습니다: {id}</p>
      <Link href="/admin/npl-analysis" className="text-sm font-bold text-[#2251FF] hover:underline">← 분석 리스트로</Link>
    </div>
  )

  const x = raw as Record<string, any>
  const appraisal = Number(x.appraised_value ?? x.appraisal_value ?? 0)
  const principal = Number(x.outstanding_principal ?? x.principal_amount ?? x.claim_amount ?? 0)
  const asking = Number(x.asking_price ?? 0) || Math.round(principal * 0.7)
  const a = computeAnalysis({ appraisal, principal, asking })
  const region = [x.sido, x.sigungu].filter(Boolean).join(' ') || String(x.address ?? '—')

  const FIELDS: [string, unknown][] = [
    ['관리번호', x.id],
    ['등록일', x.created_at ? String(x.created_at).slice(0, 10) : '—'],
    ['기관명 (실명)', x.institution ?? x.institution_name ?? '—'],
    ['담보물 주소 (전체)', x.address ?? region],
    ['담보유형', x.collateral_type ?? '—'],
    ['감정가', fmtEok(appraisal)],
    ['채권잔액', fmtEok(principal)],
    ['협의가 (제안 매각가)', fmtEok(asking)],
    ['대출원금', x.loan_principal ? fmtEok(Number(x.loan_principal)) : '—'],
    ['설정금액(채권최고액)', x.max_claim ? fmtEok(Number(x.max_claim)) : '—'],
    ['토지면적(㎡)', x.land_area_m2 ?? x.land_area ?? '—'],
    ['건물면적(㎡)', x.building_area_m2 ?? x.building_area ?? '—'],
    ['상태', x.status ?? '—'],
  ]

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <Link href="/admin/npl-analysis" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
        <ArrowLeft size={15} /> NPL 수익률 분석 리스트
      </Link>

      {/* 헤더 + 등급 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <Brain size={13} /> Internal Only · 상세 분석
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            {region} · {String(x.collateral_type ?? '담보')}
          </h1>
          <p className="mt-1 text-xs font-mono text-[var(--color-text-muted)]">{id}</p>
        </div>
        <div className="flex items-center gap-3 p-4 border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-1">AI 등급</div>
            <span className="inline-flex items-center justify-center w-11 h-11 text-xl font-black text-white" style={{ background: '#051C2C', borderTop: '3px solid #2251FF', fontFamily: 'Georgia, serif' }}>
              {a.grade}
            </span>
          </div>
          <div className="w-px h-10 bg-[var(--color-border-subtle)]" />
          <div>
            <div className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] mb-1">투자 의견</div>
            <div className={`text-lg font-black ${a.opinion === 'BUY' ? 'text-emerald-600' : a.opinion === 'HOLD' ? 'text-amber-600' : 'text-red-600'}`} style={{ fontFamily: 'Georgia, serif' }}>
              {a.opinion}
            </div>
          </div>
        </div>
      </div>

      {/* 핵심 지표 4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--color-border-subtle)]">
        {([
          ['예상 ROI', `${a.roi > 0 ? '+' : ''}${a.roi}%`],
          ['예상 회수율', `${a.recoveryRate}%`],
          ['LTV', `${a.ltv}%`],
          ['할인율', `${a.discount}%`],
        ] as [string, string][]).map(([k, v]) => (
          <div key={k} className="bg-[var(--color-surface-elevated)] p-5" style={{ borderTop: '2px solid #2251FF' }}>
            <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">{k}</div>
            <div className="text-2xl font-black tabular-nums text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>{v}</div>
          </div>
        ))}
      </div>

      {/* 마케팅 체크리스트 · 반응 집계 — 매각의뢰 현황(/admin/listings)의 [마케팅] 으로 이동 (2026-08-18) */}

      {/* 산출 근거 */}
      <div className="p-4 border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-xs text-[var(--color-text-secondary)] leading-relaxed">
        <b className="text-[var(--color-text-primary)]">산출 근거 (규칙 기반 v1)</b> — 예상 회수액 {fmtEok(a.expectedRecovery)} = 감정가 {fmtEok(appraisal)} × 85% (경매 평균 낙찰가율 가정) ·
        ROI = (회수액 − 협의가 {fmtEok(asking)}) ÷ 협의가 · 회수율 = 회수액 ÷ 채권잔액 {fmtEok(principal)} · LTV = 채권잔액 ÷ 감정가
      </div>

      {/* 전체 필드 — 관리자는 마스킹 없이 전부 열람 */}
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
          매물 전체 정보 (마스킹 미적용 · 운영자 열람)
        </div>
        <dl className="divide-y divide-[var(--color-border-subtle)]">
          {FIELDS.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[180px_1fr] gap-3 px-4 py-2.5 text-[13px]">
              <dt className="font-semibold text-[var(--color-text-muted)]">{k}</dt>
              <dd className="font-medium text-[var(--color-text-primary)] break-all">{String(v ?? '—')}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex gap-2">
        <Link href={`/admin/listings/${encodeURIComponent(id)}/edit`} className="px-4 py-2 text-xs font-bold text-white" style={{ background: '#0A1628', borderTop: '2px solid #2251FF' }}>
          매물 정보 수정
        </Link>
        <Link href="/admin/matching" className="px-4 py-2 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]">
          매칭 관리로
        </Link>
      </div>
    </div>
  )
}
