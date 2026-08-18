'use client'

/**
 * /exchange/demands/new — 매입조건 등록 (2026-08 피벗)
 *
 * 정책:
 *   - 조건당 4개 필드만: 지역 · 유형 · 금액대 · 요청사항
 *   - 우선순위에 따라 조건 여러 개 등록 가능 (조건 1 = 우선순위 1)
 *   - 조건 추가 / 삭제 / 순서 변경(▲▼)
 *   - 제출 시 조건별로 1건씩 API 등록 (priority 포함)
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, CheckCircle2, Info, Building2, Gavel, Plus, Trash2, ChevronUp, ChevronDown, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CommaNumberInput } from '@/components/ui/comma-number-input'
import { MckPageHeader } from '@/components/mck/page-header'

// 담보유형·지역 — NPL 리스트와 동일한 중앙 택소노미 사용 (SSoT)
import { COLLATERAL_CATEGORIES, REGION_SHORT_LIST } from '@/lib/taxonomy'

const REGION_OPTIONS = REGION_SHORT_LIST

/** 1평 = 3.3058㎡ */
const PYEONG_TO_M2 = 3.3058
type AreaUnit = 'm2' | 'pyeong'
const round2 = (n: number) => Math.round(n * 100) / 100
/** 표시 단위 값 → ㎡ (저장 단위) */
const toM2 = (value: string, unit: AreaUnit): number | null => {
  if (value.trim() === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return unit === 'pyeong' ? round2(n * PYEONG_TO_M2) : round2(n)
}
/** 단위 토글 시 표시 값 변환 */
const convertDisplay = (value: string, from: AreaUnit, to: AreaUnit): string => {
  if (value.trim() === '' || from === to) return value
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return String(to === 'pyeong' ? round2(n / PYEONG_TO_M2) : round2(n * PYEONG_TO_M2))
}

type DemandCondition = {
  demandType: 'npl' | 'realestate'
  collateralTypes: string[]
  nationwide: boolean
  regions: string[]
  landMin: string      // 토지면적 (표시 단위 기준)
  landMax: string
  bldgMin: string      // 건물면적 (표시 단위 기준)
  bldgMax: string
  amountMin: string   // 억원
  amountMax: string   // 억원
  memo: string
}

const emptyCondition = (): DemandCondition => ({
  demandType: 'npl',
  collateralTypes: [],
  nationwide: false,
  regions: [],
  landMin: '',
  landMax: '',
  bldgMin: '',
  bldgMax: '',
  amountMin: '',
  amountMax: '',
  memo: '',
})

export default function NewDemandPage() {
  const router = useRouter()
  const [conditions, setConditions] = useState<DemandCondition[]>([emptyCondition()])

  // ── 로그인 상태 + 담당자 정보 (회원가입 정보 자동 기입 · 수정 가능) ──
  const [authState, setAuthState] = useState<'checking' | 'guest' | 'user'>('checking')
  const [contact, setContact] = useState({ company: '', manager: '', phone: '', email: '' })
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (user) {
          const meta = (user.user_metadata ?? {}) as Record<string, string>
          setContact({
            company: meta.company ?? meta.company_name ?? '',   // 가입 폼은 company_name 으로 저장
            manager: meta.name ?? '',
            phone: meta.phone ?? '',
            email: user.email ?? '',
          })
          setAuthState('user')
        } else {
          setAuthState('guest')
        }
      } catch {
        if (!cancelled) setAuthState('guest')
      }
    })()
    return () => { cancelled = true }
  }, [])
  // 면적 표시 단위 — 폼 전체 공통 (㎡ ↔ 평 전환 시 입력값 자동 환산)
  const [areaUnit, setAreaUnit] = useState<AreaUnit>('m2')
  const switchAreaUnit = (unit: AreaUnit) => {
    if (unit === areaUnit) return
    setConditions(prev => prev.map(c => ({
      ...c,
      landMin: convertDisplay(c.landMin, areaUnit, unit),
      landMax: convertDisplay(c.landMax, areaUnit, unit),
      bldgMin: convertDisplay(c.bldgMin, areaUnit, unit),
      bldgMax: convertDisplay(c.bldgMax, areaUnit, unit),
    })))
    setAreaUnit(unit)
  }
  const unitLabel = areaUnit === 'm2' ? '㎡' : '평'
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggle = <T extends string>(list: T[], val: T): T[] =>
    list.includes(val) ? list.filter(x => x !== val) : [...list, val]

  const clearError = (key: string) => setErrors(prev => { const n = { ...prev }; delete n[key]; return n })

  const updateCondition = (idx: number, patch: Partial<DemandCondition>) => {
    setConditions(prev => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)))
  }

  const addCondition = () => setConditions(prev => [...prev, emptyCondition()])

  const removeCondition = (idx: number) => {
    setConditions(prev => prev.filter((_, i) => i !== idx))
    setErrors({})
  }

  const moveCondition = (idx: number, dir: -1 | 1) => {
    setConditions(prev => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
    setErrors({})
  }

  const validate = () => {
    const e: Record<string, string> = {}
    conditions.forEach((c, i) => {
      if (c.collateralTypes.length === 0) e[`types_${i}`] = '유형을 선택해주세요'
      if (!c.nationwide && c.regions.length === 0) e[`regions_${i}`] = '지역을 선택하거나 전국을 체크해주세요'
      if (c.landMin && c.landMax && Number(c.landMin) > Number(c.landMax)) e[`land_${i}`] = '최대 면적은 최소 면적 이상이어야 합니다'
      if (c.bldgMin && c.bldgMax && Number(c.bldgMin) > Number(c.bldgMax)) e[`bldg_${i}`] = '최대 면적은 최소 면적 이상이어야 합니다'
      if (c.amountMin && c.amountMax && Number(c.amountMin) > Number(c.amountMax)) e[`amount_${i}`] = '최대 금액은 최소 금액 이상이어야 합니다'
    })
    if (!agreed) e.agreed = '개인정보 처리에 동의해주세요'
    return e
  }

  const handleSubmit = async () => {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    setSubmitting(true)
    try {
      let okCount = 0
      let errorMessage: string | null = null
      for (let i = 0; i < conditions.length; i++) {
        const c = conditions[i]
        const body: Record<string, unknown> = {
          demand_type: c.demandType,
          collateral_types: c.collateralTypes,
          regions: c.nationwide ? ['전국'] : c.regions,
          land_area_min_m2: toM2(c.landMin, areaUnit),
          land_area_max_m2: toM2(c.landMax, areaUnit),
          building_area_min_m2: toM2(c.bldgMin, areaUnit),
          building_area_max_m2: toM2(c.bldgMax, areaUnit),
          min_amount: c.amountMin ? Number(c.amountMin) : null,   // 억원
          max_amount: c.amountMax ? Number(c.amountMax) : null,   // 억원
          priority: i + 1,
          memo: (() => {
            const base = conditions.length > 1 ? `[우선순위 ${i + 1}] ${c.memo}`.trim() : c.memo
            // 담당자 정보 — 운영자 매수 수요 리스트에서 바로 확인
            const contactLine = [contact.company, contact.manager, contact.phone, contact.email].filter(Boolean).join(' · ')
            return contactLine ? `${base}${base ? '\n' : ''}[담당자] ${contactLine}` : base
          })(),
          company_name: contact.company || null,
          manager_name: contact.manager || null,
          contact_phone: contact.phone || null,
          contact_email: contact.email || null,
        }
        try {
          const res = await fetch('/api/v1/exchange/demands', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (res.ok) {
            const json = await res.json().catch(() => ({}))
            const ok = (json as { success?: boolean })?.success === true
              || ((json as { data?: unknown })?.data != null)
            if (ok) okCount++
          } else {
            const data = await res.json().catch(() => ({}))
            errorMessage = (data as { error?: { message?: string } })?.error?.message
              ?? `등록 실패 (HTTP ${res.status})`
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[Demand new] network error:', err)
          errorMessage = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
        }
      }
      if (okCount === conditions.length) {
        setSubmitted(true)
        setTimeout(() => router.push('/exchange/demands'), 2500)
      } else if (okCount > 0) {
        alert(`${conditions.length}건 중 ${okCount}건 등록 완료. 나머지는 다시 시도해주세요.${errorMessage ? `\n(${errorMessage})` : ''}`)
      } else {
        alert(errorMessage ?? '등록에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[var(--color-surface-overlay)]">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-positive)]/10">
            <CheckCircle2 className="h-8 w-8 text-[var(--color-positive)]" />
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">매입조건 {conditions.length}건 등록 완료!</h2>
          <p className="text-sm text-gray-500">조건에 맞는 물건이 나오면 우선순위에 따라 담당자가 연락드립니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-overlay)]">
      {/* ── 표준 페이지 헤더 (전 메뉴 공통 포맷) ── */}
      <MckPageHeader
        eyebrow="Private Deal · NDA 기반"
        title="매입조건 등록"
        subtitle="지역 · 유형 · 금액대만 알려주세요 — 우선순위별로 조건을 여러 개 등록할 수 있습니다."
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link
              href="/exchange"
              style={{
                padding: '9px 16px', fontSize: 12, fontWeight: 800, letterSpacing: '-0.01em',
                background: '#0A1628', color: '#FFFFFF', border: 'none', borderTop: '2px solid #2251FF',
                display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
              }}
            >
              NPL 자동매칭
            </Link>
            <Link
              href="/exchange/sell"
              style={{
                padding: '9px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
                background: '#FFFFFF', color: '#0A1628', border: '1px solid #0A1628',
                display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
              }}
            >
              NPL 매각의뢰
            </Link>
          </div>
        }
      />

      {/* Form */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        {/* ── 로그인 필요 배너 — 매입사 회원 전용 ── */}
        {authState === 'guest' && (
          <div
            className="flex items-start gap-3 p-4"
            style={{ background: '#0A1628', borderTop: '3px solid #2251FF' }}
          >
            <Lock className="h-4 w-4 shrink-0 mt-0.5" style={{ color: '#00A9F4' }} />
            <div className="flex-1">
              <p className="text-sm font-extrabold" style={{ color: '#FFFFFF' }}>
                매입조건 등록은 매입 회원 가입 후 로그인하셔야 가능합니다
              </p>
              <p className="mt-1 text-xs" style={{ color: 'rgba(255,255,255,0.70)' }}>
                로그인하시면 회사명 · 담당자명 · 연락처 · 이메일이 자동으로 기입됩니다. 가입은 무료 (관리자 승인제)
              </p>
              <div className="mt-3 flex gap-2">
                <Link href="/login?redirect=/exchange/demands/new"
                  className="px-4 py-2 text-xs font-extrabold"
                  style={{ background: '#FFFFFF', color: '#0A1628', textDecoration: 'none' }}>
                  로그인
                </Link>
                <Link href="/signup"
                  className="px-4 py-2 text-xs font-bold"
                  style={{ background: 'transparent', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.35)', textDecoration: 'none' }}>
                  매입 회원가입
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── 담당자 정보 — 회원가입 정보 자동 기입 (수정 가능) ── */}
        <div className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)]">
            <span className="text-sm font-bold text-[var(--color-text-primary)]">담당자 정보</span>
            {authState === 'user' && (
              <span className="ml-2 text-[11px] font-semibold text-[var(--color-brand-bright)]">회원가입 정보 자동 기입 — 수정 가능</span>
            )}
          </div>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              ['company', '회사명(기관명)', '예: OO자산운용'],
              ['manager', '담당자명', '예: 홍길동'],
              ['phone', '연락처', '예: 010-0000-0000'],
              ['email', '이메일', '예: name@company.co.kr'],
            ] as const).map(([key, label, ph]) => (
              <div key={key}>
                <div className="text-xs font-bold text-[var(--color-text-secondary)] mb-1.5">{label}</div>
                <input
                  value={contact[key]}
                  onChange={e => setContact(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder={ph}
                  className="w-full px-3 py-2.5 text-sm font-medium rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand-bright)]"
                />
              </div>
            ))}
          </div>
        </div>

        {conditions.map((c, idx) => (
          <div key={idx} className="card-interactive rounded-xl bg-[var(--color-surface-elevated)] overflow-hidden">
            {/* 조건 헤더 — 우선순위 + 순서/삭제 컨트롤 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--color-brand-bright)] text-white text-xs font-extrabold">
                  {idx + 1}
                </span>
                <span className="text-sm font-bold text-[var(--color-text-primary)]">
                  우선순위 {idx + 1}{idx === 0 ? ' (최우선)' : ''}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveCondition(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-30"
                  aria-label="우선순위 올리기"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveCondition(idx, 1)}
                  disabled={idx === conditions.length - 1}
                  className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] disabled:opacity-30"
                  aria-label="우선순위 내리기"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                {conditions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCondition(idx)}
                    className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-red-600 hover:bg-red-50"
                    aria-label="조건 삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* 1. 유형 */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal">유형</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => updateCondition(idx, { demandType: 'npl' })}
                    className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${
                      c.demandType === 'npl'
                        ? 'border-[var(--color-brand-bright)] bg-[var(--color-brand-bright)]/5'
                        : 'border-[var(--color-border-subtle)]'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.demandType === 'npl' ? 'bg-[var(--color-brand-bright)]' : 'bg-[var(--color-surface-overlay)]'}`}>
                      <Gavel className={`w-4 h-4 ${c.demandType === 'npl' ? 'text-white' : 'text-[var(--color-text-muted)]'}`} />
                    </div>
                    <div>
                      <p className={`text-sm font-semibold ${c.demandType === 'npl' ? 'text-[var(--color-brand-mid)]' : 'text-[var(--color-text-secondary)]'}`}>NPL 채권</p>
                      <p className="text-xs text-[var(--color-text-muted)]">부실채권 매입 조건</p>
                    </div>
                  </button>
                  {/* 부동산 급매 — 우선 비활성화 (진행 예정) */}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-[var(--color-border-subtle)] text-left opacity-55 cursor-not-allowed"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[var(--color-surface-overlay)]">
                      <Building2 className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--color-text-muted)] flex items-center gap-2">
                        부동산 급매
                        <span className="text-[0.625rem] font-bold px-1.5 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">진행 예정</span>
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">급매 부동산 매입 조건 — 오픈 준비 중</p>
                    </div>
                  </button>
                </div>
                {/* 담보유형 — NPL 리스트와 동일한 대분류(주거/상업·산업/토지/기타) → 상세 19종 */}
                <div className="space-y-2.5">
                  {COLLATERAL_CATEGORIES.map(cat => (
                    <div key={cat.value}>
                      <div className="text-[0.6875rem] font-bold text-[var(--color-text-muted)] uppercase tracking-wide mb-1">
                        {cat.label}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.items.map(item => (
                          <label key={item.value} className="cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={c.collateralTypes.includes(item.label)}
                              onChange={() => { updateCondition(idx, { collateralTypes: toggle(c.collateralTypes, item.label) }); clearError(`types_${idx}`) }}
                            />
                            <span className={`inline-block text-[0.8125rem] px-2 py-0.5 rounded-md border transition-colors ${c.collateralTypes.includes(item.label) ? 'border-[var(--color-brand-bright)] bg-[var(--color-brand-bright)]/10 text-[var(--color-brand-bright)] font-semibold' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'}`}>
                              {item.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {errors[`types_${idx}`] && <p className="text-xs text-red-600">{errors[`types_${idx}`]}</p>}
              </div>

              {/* 2. 지역 */}
              <div className="space-y-2 pt-3 border-t border-[var(--color-border-subtle)]">
                <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal">지역</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.nationwide}
                    onChange={e => { updateCondition(idx, { nationwide: e.target.checked, regions: e.target.checked ? [] : c.regions }); clearError(`regions_${idx}`) }}
                    className="rounded border-[var(--color-border-subtle)] text-[var(--color-brand-bright)] focus:ring-[var(--color-brand-bright)]"
                  />
                  <span className="text-sm font-medium text-[var(--color-text-secondary)]">전국</span>
                </label>
                {!c.nationwide && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {REGION_OPTIONS.map(r => (
                      <label key={r} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={c.regions.includes(r)}
                          onChange={() => { updateCondition(idx, { regions: toggle(c.regions, r) }); clearError(`regions_${idx}`) }}
                          className="rounded border-gray-300 text-[var(--color-brand-bright)] focus:ring-[var(--color-brand-bright)]"
                        />
                        <span className={`text-sm px-2 py-0.5 rounded-md border transition-colors ${c.regions.includes(r) ? 'border-[var(--color-brand-bright)] bg-[var(--color-brand-bright)]/10 text-[var(--color-brand-bright)]' : 'border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]'}`}>
                          {r}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {errors[`regions_${idx}`] && <p className="text-xs text-red-600">{errors[`regions_${idx}`]}</p>}
              </div>

              {/* 3. 면적 — 토지/건물 범위 (㎡ ↔ 평 전환) */}
              <div className="space-y-3 pt-3 border-t border-[var(--color-border-subtle)]">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal">면적</h2>
                  <div className="inline-flex rounded-lg border border-[var(--color-border-subtle)] overflow-hidden">
                    {(['m2', 'pyeong'] as const).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => switchAreaUnit(u)}
                        className={`px-3 py-1 text-xs font-bold transition-colors ${
                          areaUnit === u
                            ? 'bg-[var(--color-brand-bright)] text-white'
                            : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]'
                        }`}
                      >
                        {u === 'm2' ? '㎡' : '평'}
                      </button>
                    ))}
                  </div>
                </div>
                {([
                  ['토지면적', 'landMin', 'landMax', `land_${idx}`],
                  ['건물면적', 'bldgMin', 'bldgMax', `bldg_${idx}`],
                ] as const).map(([label, minKey, maxKey, errKey]) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{label} 범위 ({unitLabel})</label>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        min={0}
                        placeholder={`최소 (${unitLabel})`}
                        value={c[minKey]}
                        onChange={e => { updateCondition(idx, { [minKey]: e.target.value } as Partial<DemandCondition>); clearError(errKey) }}
                        className="input-enhanced w-full"
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder={`최대 (${unitLabel})`}
                        value={c[maxKey]}
                        onChange={e => { updateCondition(idx, { [maxKey]: e.target.value } as Partial<DemandCondition>); clearError(errKey) }}
                        className="input-enhanced w-full"
                      />
                    </div>
                    {errors[errKey] && <p className="text-xs text-red-600 mt-1">{errors[errKey]}</p>}
                  </div>
                ))}
                <p className="text-[0.6875rem] text-[var(--color-text-muted)]">1평 = 3.3058㎡ 기준 자동 환산 · 저장은 ㎡ 단위</p>
              </div>

              {/* 4. 금액대 */}
              <div className="space-y-2 pt-3 border-t border-[var(--color-border-subtle)]">
                <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal">금액대 (억원)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">최소 (억원)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none select-none">₩</span>
                      <CommaNumberInput
                        placeholder="예: 5"
                        value={c.amountMin}
                        onChange={v => { updateCondition(idx, { amountMin: v }); clearError(`amount_${idx}`) }}
                        className="input-enhanced w-full"
                        style={{ paddingLeft: '1.75rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-text-muted)] mb-1">최대 (억원)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm pointer-events-none select-none">₩</span>
                      <CommaNumberInput
                        placeholder="예: 20"
                        value={c.amountMax}
                        onChange={v => { updateCondition(idx, { amountMax: v }); clearError(`amount_${idx}`) }}
                        className="input-enhanced w-full"
                        style={{ paddingLeft: '1.75rem' }}
                      />
                    </div>
                  </div>
                </div>
                {errors[`amount_${idx}`] && <p className="text-xs text-red-600">{errors[`amount_${idx}`]}</p>}
              </div>

              {/* 4. 요청사항 */}
              <div className="pt-3 border-t border-[var(--color-border-subtle)]">
                <label className="block text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-normal mb-1.5">요청사항</label>
                <textarea
                  rows={3}
                  placeholder="원하는 조건을 자유롭게 기술해주세요. (예: 권리관계 단순한 물건 선호, 임차인 없는 물건 우대 등)"
                  value={c.memo}
                  onChange={e => updateCondition(idx, { memo: e.target.value })}
                  className="input-enhanced w-full resize-none"
                />
              </div>
            </div>
          </div>
        ))}

        {/* 조건 추가 */}
        <button
          type="button"
          onClick={addCondition}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-[var(--color-brand-bright)]/40 text-sm font-bold text-[var(--color-brand-bright)] hover:bg-[var(--color-brand-bright)]/5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          추가 조건 등록 (우선순위 {conditions.length + 1})
        </button>

        {/* 안내 배너 */}
        <div className="flex items-start gap-3 rounded-xl bg-stone-100/10 border border-stone-300/20 p-4">
          <Info className="h-5 w-5 text-[var(--color-brand-bright)] flex-shrink-0 mt-0.5" />
          <div className="text-sm text-[var(--color-text-secondary)]">
            <p className="font-medium tracking-normal">등록 안내</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5 text-xs text-[var(--color-text-muted)]">
              <li>조건 1(최우선)부터 순서대로 매칭하여 맞는 물건을 소개해드립니다.</li>
              <li>등록된 조건은 외부에 공개되지 않으며, 운영진만 열람합니다.</li>
              <li>등록 후 언제든 수정 또는 삭제가 가능합니다.</li>
            </ul>
          </div>
        </div>

        {/* 동의 + 제출 */}
        <div className="space-y-4">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => { setAgreed(e.target.checked); clearError('agreed') }}
              className="mt-0.5 rounded border-[var(--color-border-subtle)] text-[var(--color-brand-bright)] focus:ring-[var(--color-brand-bright)]"
            />
            <span className="text-sm text-[var(--color-text-secondary)] tracking-normal">
              수집된 개인정보는 매물 매칭 서비스 제공 목적으로만 활용되며,{' '}
              <span className="text-[var(--color-brand-bright)] underline cursor-pointer">개인정보 처리방침</span>에 동의합니다.
            </span>
          </label>
          {errors.agreed && <p className="text-xs text-red-600">{errors.agreed}</p>}

          <div className="flex items-center justify-end gap-3">
            <Link href="/exchange" className="px-5 py-2.5 rounded-lg border border-[var(--color-border-subtle)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors tracking-normal">
              취소
            </Link>
            <button
              onClick={handleSubmit}
              disabled={submitting || authState === 'guest'}
              title={authState === 'guest' ? '매입사 회원가입 후 로그인하시면 등록할 수 있습니다' : undefined}
              className="inline-flex items-center gap-2 disabled:opacity-60 text-white px-8 py-2.5 rounded-lg text-sm font-semibold transition-colors tracking-normal bg-[var(--color-brand-bright)] hover:bg-[var(--color-brand-dark)]"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  등록 중...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  매입조건 {conditions.length}건 등록하기
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
