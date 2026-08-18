'use client'

/**
 * /admin/main-stats — 메인 수기 지표 입력 (운영자 전용 · 2026-08-17)
 *
 * 메인 히어로의 "열람 가능한 NPL · 이번 주 신규" 는 자동 집계가 아니라
 * 운영 관리자가 이 화면에서 수작업으로 입력·갱신한다.
 * 저장소: site-settings (api_configs) — mainViewableNpl / mainNewThisWeek / mainStatsPeriod
 */

import { useEffect, useState } from 'react'
import { LayoutDashboard, Save, CheckCircle2 } from 'lucide-react'

const INK = '#0A1628'
const ELECTRIC = '#2251FF'
const GOLD = '#BFA476'

/** 메인 KPI · 티커 자동연동 필드 (site-settings 키 ↔ 라벨) */
const STAT_FIELDS = [
  ['statNplCount',       'NPL 등록 수',        '예: 789개'],
  ['statAppraisalTotal', '감정평가 총액',      '예: 5조 7,111억'],
  ['statMortgageTotal',  '근저당권 설정금액',  '예: 1조 4,573억'],
  ['statPrincipalTotal', '대출원금 총액',      '예: 1조 2,144억'],
  ['statInstitutions',   '참여 기관',          '예: 75곳'],
  ['statSellers',        '매각사 (티커)',      '예: 60개사'],
  ['statBuyers',         '매입사 (티커)',      '예: 180개사'],
  ['statInvestors',      '투자자 (티커)',      '예: 340명'],
  ['statSuccess',        '성공사례 (티커)',    '예: 120건'],
] as const

export default function AdminMainStatsPage() {
  const [vals, setVals] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/v1/admin/site-settings')
      .then(r => r.json())
      .then(d => {
        const s = d?.data ?? {}
        const next: Record<string, string> = {}
        for (const [key] of STAT_FIELDS) next[key] = String(s[key] ?? '')
        setVals(next)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      const res = await fetch('/api/v1/admin/site-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(STAT_FIELDS.map(([key]) => [key, (vals[key] ?? '').trim()]))),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d?.error?.message ?? `저장 실패 (HTTP ${res.status})`)
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF] tabular-nums'

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
          <LayoutDashboard size={13} /> 메인 노출 관리
        </div>
        <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
          메인 지표 입력
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          메인 KPI · 라이브 티커 · NPL 자동매칭 KPI 에 표시되는 지표를 직접 입력합니다. 저장 즉시 자동 반영됩니다.
        </p>
      </div>

      {loading ? (
        <p className="py-8 text-sm text-[var(--color-text-muted)]">불러오는 중...</p>
      ) : (
        <div className="space-y-5 p-5 border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]" style={{ borderTop: `2px solid ${ELECTRIC}` }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {STAT_FIELDS.map(([key, label, ph]) => (
              <div key={key}>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
                  {label}
                </label>
                <input value={vals[key] ?? ''} onChange={e => setVals(prev => ({ ...prev, [key]: e.target.value }))} className={inputCls} placeholder={ph} />
              </div>
            ))}
          </div>

          {/* 미리보기 — 메인 KPI 4종 */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-2">메인 KPI 미리보기</div>
            <div className="flex flex-wrap gap-3 p-4" style={{ background: '#051C2C' }}>
              {STAT_FIELDS.slice(0, 5).map(([key, label]) => (
                <div key={key} style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, padding: '10px 16px', background: 'rgba(191, 164, 118, 0.08)', border: `1px solid rgba(191, 164, 118, 0.40)` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: GOLD, letterSpacing: '0.06em' }}>{label}</span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 20, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>{vals[key] || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              onClick={() => void save()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-extrabold text-white"
              style={{ background: INK, borderTop: `2px solid ${ELECTRIC}`, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
            >
              <Save size={14} /> {saving ? '저장 중…' : '저장 · 메인 반영'}
            </button>
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                <CheckCircle2 size={13} /> 저장됨 — 메인에 반영되었습니다
              </span>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]">
        ※ 관리자 권한(ADMIN/SUPER_ADMIN)으로 로그인된 상태에서만 저장됩니다.
      </p>
    </div>
  )
}
