'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Tag, Plus, Search, Copy, X, Check, Calendar,
  Percent, DollarSign, CreditCard, AlertTriangle,
  ChevronDown, RefreshCw, Ban, Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { CommaNumberInput } from '@/components/ui/comma-number-input'

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscountType = 'PERCENT' | 'FIXED' | 'CREDIT'
type CouponStatus = 'active' | 'expired' | 'inactive'

interface Coupon {
  id: string
  code: string
  discount_type: DiscountType
  discount_value: number
  max_uses: number | null
  used_count: number
  expires_at: string | null
  description: string
  active: boolean
  created_at: string
}

// ─── Fallback data (shown when DB is empty / unavailable) ──────────────────────

const FALLBACK_COUPONS: Coupon[] = []

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCouponStatus(coupon: Coupon): CouponStatus {
  if (!coupon.active) return 'inactive'
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return 'expired'
  return 'active'
}

function formatDiscountValue(coupon: Coupon): string {
  if (coupon.discount_type === 'PERCENT') return `${coupon.discount_value}%`
  if (coupon.discount_type === 'FIXED') return `₩${coupon.discount_value.toLocaleString('ko-KR')}`
  return `${coupon.discount_value.toLocaleString('ko-KR')} 크레딧`
}

function formatDate(iso: string | null): string {
  if (!iso) return '무기한'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 10; i++) {
    if (i === 5) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_PAGE   = '#030812'
const BG_CARD   = '#080F1E'
const BG_SUNKEN = '#050D1A'
const BORDER    = '#0F1F35'
const BORDER_MID = '#152333'
const GREEN     = '#14161A'
const GREEN_FG  = '#041915'
const RED       = '#1B1B1F'
const AMBER     = '#14161A'
const BLUE      = '#14161A'
const PURPLE    = '#14161A'
const WHITE     = '#FFFFFF'
const SLATE_300 = '#CBD5E1'
const SLATE_500 = '#64748B'
const SLATE_700 = '#334155'

const DISCOUNT_TYPE_META: Record<DiscountType, { label: string; color: string; Icon: typeof Percent }> = {
  PERCENT: { label: '퍼센트', color: BLUE,   Icon: Percent     },
  FIXED:   { label: '정액',   color: AMBER,  Icon: DollarSign  },
  CREDIT:  { label: '크레딧', color: PURPLE, Icon: CreditCard  },
}

const STATUS_META: Record<CouponStatus, { label: string; color: string; bg: string }> = {
  active:   { label: '활성',  color: GREEN, bg: 'rgba(20,22,26,0.12)' },
  expired:  { label: '만료',  color: AMBER, bg: 'rgba(20,22,26,0.12)' },
  inactive: { label: '비활성', color: SLATE_500, bg: 'rgba(100,116,139,0.12)' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div style={{ backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, color: SLATE_500 }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 8, backgroundColor: `${accent}1A`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon style={{ width: 16, height: 16, color: accent }} />
        </div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: WHITE, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: SLATE_500, marginTop: 6 }}>{sub}</div>}
    </div>
  )
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void
  onCreate: (coupon: Omit<Coupon, 'id' | 'used_count' | 'created_at'>) => void
}

function CreateCouponModal({ onClose, onCreate }: CreateModalProps) {
  const [form, setForm] = useState({
    code: '',
    discount_type: 'PERCENT' as DiscountType,
    discount_value: '',
    max_uses: '',
    expires_at: '',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)

  // Esc 닫기 + body scroll lock + focus restore (a11y)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [onClose])

  function set(k: string, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  function handleGenerate() {
    const code = generateCode()
    setForm(f => ({ ...f, code }))
    setErrors(e => ({ ...e, code: '' }))
  }

  function handleCopyCode() {
    if (!form.code) return
    navigator.clipboard.writeText(form.code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form.code.trim()) errs.code = '쿠폰 코드를 입력하세요.'
    if (!form.discount_value || isNaN(Number(form.discount_value)) || Number(form.discount_value) <= 0)
      errs.discount_value = '올바른 할인 값을 입력하세요.'
    if (form.discount_type === 'PERCENT' && Number(form.discount_value) > 100)
      errs.discount_value = '퍼센트는 100을 초과할 수 없습니다.'
    if (form.max_uses && (isNaN(Number(form.max_uses)) || Number(form.max_uses) < 1))
      errs.max_uses = '최대 사용 횟수는 1 이상이어야 합니다.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    onCreate({
      code: form.code.trim().toUpperCase(),
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      description: form.description.trim(),
      active: true,
    })
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: BG_SUNKEN,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: '9px 12px',
    color: WHITE,
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: SLATE_500,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  const errStyle: React.CSSProperties = { fontSize: 12, color: RED, marginTop: 4 }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-coupon-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        backgroundColor: 'rgba(3,8,18,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          backgroundColor: BG_CARD, border: `1px solid ${BORDER}`,
          borderRadius: 16, width: '100%', maxWidth: 520,
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Tag style={{ width: 18, height: 18, color: GREEN }} />
            <h2 id="create-coupon-title" style={{ fontSize: 17, fontWeight: 700, color: WHITE, margin: 0 }}>새 쿠폰 만들기</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: SLATE_500, display: 'flex', alignItems: 'center', borderRadius: 6 }}
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Code field */}
          <div>
            <label style={labelStyle}>쿠폰 코드 *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                style={{ ...inputStyle, flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'monospace', fontSize: 15 }}
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
                placeholder="예: SPRING2026"
                maxLength={20}
              />
              <button
                onClick={handleGenerate}
                style={{ backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 12px', color: SLATE_300, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
                title="자동 생성"
              >
                <RefreshCw style={{ width: 13, height: 13 }} />
                자동 생성
              </button>
              <button
                onClick={handleCopyCode}
                style={{ backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '9px 12px', color: copied ? GREEN : SLATE_300, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                title="복사"
              >
                {copied ? <Check style={{ width: 13, height: 13 }} /> : <Copy style={{ width: 13, height: 13 }} />}
              </button>
            </div>
            {errors.code && <p style={errStyle}>{errors.code}</p>}
          </div>

          {/* Discount type */}
          <div>
            <label style={labelStyle}>할인 유형 *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['PERCENT', 'FIXED', 'CREDIT'] as DiscountType[]).map(t => {
                const meta = DISCOUNT_TYPE_META[t]
                const active = form.discount_type === t
                return (
                  <button
                    key={t}
                    onClick={() => set('discount_type', t)}
                    style={{
                      flex: 1, padding: '9px 6px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      backgroundColor: active ? `${meta.color}22` : BG_SUNKEN,
                      border: `1px solid ${active ? meta.color : BORDER}`,
                      color: active ? meta.color : SLATE_500,
                      transition: 'all 0.15s',
                    }}
                  >
                    <meta.Icon style={{ width: 13, height: 13 }} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Discount value */}
          <div>
            <label style={labelStyle}>
              할인 값 *{' '}
              <span style={{ color: SLATE_700, textTransform: 'none', letterSpacing: 0 }}>
                {form.discount_type === 'PERCENT' ? '(1–100%)' : form.discount_type === 'FIXED' ? '(원 단위)' : '(크레딧 수)'}
              </span>
            </label>
            <CommaNumberInput
              style={inputStyle}
              value={form.discount_value}
              onChange={v => set('discount_value', v)}
              placeholder={form.discount_type === 'PERCENT' ? '예: 20' : form.discount_type === 'FIXED' ? '예: 10,000' : '예: 500'}
            />
            {errors.discount_value && <p style={errStyle}>{errors.discount_value}</p>}
          </div>

          {/* Max uses + expires_at (2 cols) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label style={labelStyle}>최대 사용 횟수 <span style={{ color: SLATE_700, textTransform: 'none' }}>(비워두면 무제한)</span></label>
              <CommaNumberInput
                style={inputStyle}
                value={form.max_uses}
                onChange={v => set('max_uses', v)}
                placeholder="예: 500"
              />
              {errors.max_uses && <p style={errStyle}>{errors.max_uses}</p>}
            </div>
            <div>
              <label style={labelStyle}>만료일 <span style={{ color: SLATE_700, textTransform: 'none' }}>(비워두면 무기한)</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...inputStyle, paddingRight: 34 }}
                  type="date"
                  value={form.expires_at}
                  onChange={e => set('expires_at', e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
                <Calendar style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: SLATE_500, pointerEvents: 'none' }} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>설명</label>
            <input
              style={inputStyle}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="쿠폰 용도 / 메모 (선택)"
              maxLength={100}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${BORDER}`, backgroundColor: 'transparent', color: SLATE_300, fontSize: 14, cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            style={{ padding: '9px 24px', borderRadius: 8, border: 'none', backgroundColor: GREEN, color: GREEN_FG, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Check style={{ width: 14, height: 14 }} />
            쿠폰 생성
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>(FALLBACK_COUPONS)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DiscountType | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<CouponStatus | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // ─── Toast helper ────────────────────────────────────────────────────────
  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ─── Fetch from Supabase ─────────────────────────────────────────────────
  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data && data.length > 0) {
        setCoupons(data as Coupon[])
      }
    } catch {
      // keep existing state
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  // ─── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = coupons.filter(c => getCouponStatus(c) === 'active')
    const thisMonth = coupons.filter(c => {
      const d = new Date(c.created_at)
      const now = new Date()
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    const totalUsed = coupons.reduce((s, c) => s + c.used_count, 0)
    const totalDiscount = coupons.reduce((s, c) => {
      if (c.discount_type === 'FIXED') return s + c.discount_value * c.used_count
      return s
    }, 0)
    return {
      total: coupons.length,
      active: active.length,
      thisMonthUsed: thisMonth.reduce((s, c) => s + c.used_count, 0),
      totalDiscount,
      totalUsed,
    }
  }, [coupons])

  // ─── Filtered list ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return coupons.filter(c => {
      const q = search.toLowerCase()
      if (q && !c.code.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false
      if (typeFilter !== 'ALL' && c.discount_type !== typeFilter) return false
      if (statusFilter !== 'all' && getCouponStatus(c) !== statusFilter) return false
      return true
    })
  }, [coupons, search, typeFilter, statusFilter])

  // ─── Actions ─────────────────────────────────────────────────────────────
  async function handleCreate(data: Omit<Coupon, 'id' | 'used_count' | 'created_at'>) {
    const exists = coupons.find(c => c.code === data.code)
    if (exists) { showToast('이미 존재하는 쿠폰 코드입니다.', 'error'); return }
    // Optimistic insert
    const tempCoupon: Coupon = {
      ...data,
      id: `temp_${Date.now()}`,
      used_count: 0,
      created_at: new Date().toISOString(),
    }
    setCoupons(prev => [tempCoupon, ...prev])
    showToast(`쿠폰 "${data.code}"이 생성되었습니다.`)
    try {
      const supabase = createClient()
      const { data: inserted, error } = await supabase
        .from('coupons')
        .insert({
          code: data.code,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          max_uses: data.max_uses,
          expires_at: data.expires_at,
          description: data.description,
          active: true,
          used_count: 0,
        })
        .select()
        .single()
      if (!error && inserted) {
        // Replace temp entry with real DB row (has real id + created_at)
        setCoupons(prev => prev.map(c => c.id === tempCoupon.id ? inserted as Coupon : c))
      }
    } catch { /* optimistic state already set */ }
  }

  async function handleToggleActive(id: string) {
    const target = coupons.find(c => c.id === id)
    if (!target) return
    const next = !target.active
    // Optimistic update
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: next } : c))
    showToast(next ? '쿠폰 활성화 완료' : '쿠폰 비활성화 완료')
    try {
      const supabase = createClient()
      await supabase.from('coupons').update({ active: next }).eq('id', id)
    } catch {
      // Rollback on error
      setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !next } : c))
      showToast('상태 변경 중 오류가 발생했습니다.', 'error')
    }
  }

  function handleCopyCode(code: string, id: string) {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
    showToast(`"${code}" 복사됨`)
  }

  // ─── Styles ──────────────────────────────────────────────────────────────
  const thStyle: React.CSSProperties = {
    padding: '11px 16px',
    fontSize: 11,
    fontWeight: 600,
    color: SLATE_500,
    textAlign: 'left' as const,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding: '13px 16px',
    fontSize: 13,
    color: SLATE_300,
    borderTop: `1px solid ${BORDER}`,
    verticalAlign: 'middle',
  }

  const selectStyle: React.CSSProperties = {
    backgroundColor: BG_CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: '8px 32px 8px 12px',
    color: SLATE_300,
    fontSize: 13,
    cursor: 'pointer',
    outline: 'none',
    appearance: 'none' as const,
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_PAGE, padding: '28px 24px 60px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 10000,
          backgroundColor: toast.type === 'success' ? 'rgba(20,22,26,0.15)' : 'rgba(27,27,31,0.15)',
          border: `1px solid ${toast.type === 'success' ? GREEN : RED}`,
          borderRadius: 10, padding: '12px 18px',
          color: toast.type === 'success' ? GREEN : RED,
          fontSize: 14, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 8,
          backdropFilter: 'blur(8px)',
          maxWidth: 340,
        }}>
          {toast.type === 'success'
            ? <Check style={{ width: 15, height: 15, flexShrink: 0 }} />
            : <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />}
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: `${GREEN}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Tag style={{ width: 20, height: 20, color: GREEN }} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: WHITE, margin: 0, lineHeight: 1.2 }}>쿠폰 관리</h1>
              <p style={{ fontSize: 13, color: SLATE_500, margin: 0, marginTop: 2 }}>할인 쿠폰 생성 및 관리</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{
              backgroundColor: GREEN, color: GREEN_FG, border: 'none',
              borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            <Plus style={{ width: 16, height: 16 }} />
            새 쿠폰
          </button>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <StatCard label="전체 쿠폰 수"   value={stats.total.toString()}   sub={`총 ${stats.totalUsed}회 사용`}   icon={Tag}         accent={BLUE}   />
          <StatCard label="활성 쿠폰"      value={stats.active.toString()}  sub={`전체의 ${Math.round(stats.active / Math.max(stats.total, 1) * 100)}%`} icon={Check} accent={GREEN}  />
          <StatCard label="이번 달 사용"   value={`${stats.thisMonthUsed}회`} sub="신규 발급 쿠폰 기준"            icon={Calendar}    accent={PURPLE} />
          <StatCard label="총 할인 금액"   value={`₩${stats.totalDiscount.toLocaleString('ko-KR')}`} sub="정액 쿠폰 기준" icon={DollarSign} accent={AMBER}  />
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div style={{ backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 18px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
            <Search style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: SLATE_500 }} />
            <input
              style={{
                width: '100%', backgroundColor: BG_SUNKEN, border: `1px solid ${BORDER}`,
                borderRadius: 8, padding: '8px 12px 8px 34px', color: WHITE,
                fontSize: 13, outline: 'none', boxSizing: 'border-box',
              }}
              placeholder="코드 또는 설명 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Type filter */}
          <div style={{ position: 'relative' }}>
            <select
              style={selectStyle}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as DiscountType | 'ALL')}
            >
              <option value="ALL">전체 유형</option>
              <option value="PERCENT">퍼센트 (%)</option>
              <option value="FIXED">정액 (₩)</option>
              <option value="CREDIT">크레딧</option>
            </select>
            <ChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: SLATE_500, pointerEvents: 'none' }} />
          </div>

          {/* Status filter */}
          <div style={{ position: 'relative' }}>
            <select
              style={selectStyle}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as CouponStatus | 'all')}
            >
              <option value="all">전체 상태</option>
              <option value="active">활성</option>
              <option value="expired">만료</option>
              <option value="inactive">비활성</option>
            </select>
            <ChevronDown style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', width: 13, height: 13, color: SLATE_500, pointerEvents: 'none' }} />
          </div>

          <div style={{ marginLeft: 'auto', fontSize: 12, color: SLATE_500 }}>
            {filtered.length}건 표시
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        <div style={{ backgroundColor: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead>
                <tr style={{ backgroundColor: BG_SUNKEN }}>
                  <th style={thStyle}>쿠폰코드</th>
                  <th style={thStyle}>할인유형</th>
                  <th style={{ ...thStyle, textAlign: 'right' as const }}>할인액/율</th>
                  <th style={{ ...thStyle, textAlign: 'center' as const }}>최대사용</th>
                  <th style={{ ...thStyle, textAlign: 'center' as const }}>사용횟수</th>
                  <th style={thStyle}>만료일</th>
                  <th style={thStyle}>상태</th>
                  <th style={{ ...thStyle, textAlign: 'center' as const }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '48px 16px', color: SLATE_500 }}>
                      <Loader2 style={{ width: 28, height: 28, margin: '0 auto 10px', opacity: 0.5, animation: 'spin 1s linear infinite' }} />
                      <div>쿠폰 데이터 로딩 중...</div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', padding: '48px 16px', color: SLATE_500 }}>
                      <Tag style={{ width: 32, height: 32, margin: '0 auto 10px', opacity: 0.3 }} />
                      <div>검색 결과가 없습니다.</div>
                    </td>
                  </tr>
                ) : (
                  filtered.map(coupon => {
                    const status = getCouponStatus(coupon)
                    const statusMeta = STATUS_META[status]
                    const typeMeta = DISCOUNT_TYPE_META[coupon.discount_type]
                    const usagePct = coupon.max_uses ? Math.round((coupon.used_count / coupon.max_uses) * 100) : null
                    const isAlmostFull = usagePct !== null && usagePct >= 80

                    return (
                      <tr key={coupon.id} style={{ transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = BORDER_MID)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        {/* Code */}
                        <td style={tdStyle}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: WHITE, fontSize: 14, letterSpacing: '0.03em' }}>
                            {coupon.code}
                          </span>
                          {coupon.description && (
                            <div style={{ fontSize: 11, color: SLATE_500, marginTop: 2 }}>{coupon.description}</div>
                          )}
                        </td>

                        {/* Type */}
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                            backgroundColor: `${typeMeta.color}18`, color: typeMeta.color,
                          }}>
                            <typeMeta.Icon style={{ width: 11, height: 11 }} />
                            {typeMeta.label}
                          </span>
                        </td>

                        {/* Value */}
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: WHITE, fontFamily: 'monospace', fontSize: 15 }}>
                          {formatDiscountValue(coupon)}
                        </td>

                        {/* Max uses */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {coupon.max_uses === null
                            ? <span style={{ color: SLATE_500 }}>무제한</span>
                            : <span style={{ color: isAlmostFull ? AMBER : SLATE_300 }}>
                                {coupon.max_uses.toLocaleString()}
                                {isAlmostFull && <AlertTriangle style={{ width: 12, height: 12, display: 'inline', marginLeft: 4, verticalAlign: 'text-bottom' }} />}
                              </span>
                          }
                        </td>

                        {/* Used count */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <span style={{ color: WHITE, fontWeight: 600 }}>{coupon.used_count.toLocaleString()}</span>
                            {coupon.max_uses !== null && (
                              <div style={{ width: 60, height: 3, backgroundColor: BORDER, borderRadius: 999, overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  width: `${Math.min(usagePct ?? 0, 100)}%`,
                                  backgroundColor: usagePct && usagePct >= 100 ? RED : usagePct && usagePct >= 80 ? AMBER : GREEN,
                                  borderRadius: 999,
                                  transition: 'width 0.3s',
                                }} />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Expires */}
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Calendar style={{ width: 12, height: 12, color: SLATE_500, flexShrink: 0 }} />
                            <span style={{ color: coupon.expires_at && new Date(coupon.expires_at) < new Date() ? AMBER : SLATE_300 }}>
                              {formatDate(coupon.expires_at)}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={tdStyle}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                            backgroundColor: statusMeta.bg, color: statusMeta.color,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: statusMeta.color, display: 'inline-block' }} />
                            {statusMeta.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <button
                              title={coupon.active ? '비활성화' : '활성화'}
                              onClick={() => handleToggleActive(coupon.id)}
                              style={{
                                width: 30, height: 30, borderRadius: 7, border: 'none',
                                backgroundColor: coupon.active ? 'rgba(27,27,31,0.12)' : 'rgba(20,22,26,0.12)',
                                color: coupon.active ? RED : GREEN,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.15s',
                              }}
                            >
                              {coupon.active ? <Ban style={{ width: 14, height: 14 }} /> : <Check style={{ width: 14, height: 14 }} />}
                            </button>
                            <button
                              title="코드 복사"
                              onClick={() => handleCopyCode(coupon.code, coupon.id)}
                              style={{
                                width: 30, height: 30, borderRadius: 7, border: 'none',
                                backgroundColor: copiedId === coupon.id ? 'rgba(20,22,26,0.12)' : `${BORDER}80`,
                                color: copiedId === coupon.id ? GREEN : SLATE_500,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'background 0.15s',
                              }}
                            >
                              {copiedId === coupon.id ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table footer */}
          {filtered.length > 0 && (
            <div style={{ padding: '12px 18px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: SLATE_500 }}>
                총 <strong style={{ color: SLATE_300 }}>{filtered.length}</strong>개 쿠폰 표시 중
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['active', 'expired', 'inactive'] as CouponStatus[]).map(s => {
                  const meta = STATUS_META[s]
                  const count = filtered.filter(c => getCouponStatus(c) === s).length
                  return (
                    <span key={s} style={{ fontSize: 12, color: meta.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: meta.color, display: 'inline-block' }} />
                      {meta.label} {count}
                    </span>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <CreateCouponModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
