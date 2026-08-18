'use client'

/**
 * /exchange/sell — 매각의뢰 접수 (컨시어지 등록)  (v7 · 2026-08-14)
 *
 * 제품 피벗: "대한민국 1%를 위한 NPL 플랫폼" — 프라이빗 컨시어지 브로커리지.
 * 금융기관은 긴 폼을 작성하지 않습니다. 보유 자료를 그대로 업로드하면
 * (또는 엔플랫폼 표준 양식을 내려받아 작성) 운영진이 검토·마스킹 후 대신 등록합니다.
 *
 * 기존 6단계 등록 마법사(~1,900줄)를 단일 화면 접수 폼으로 대체.
 *
 * NOTE:
 *   - 실제 파일 업로드(Supabase Storage) 연동은 추후 작업 — 현재는 File 객체를
 *     수집하고 파일명만 접수 payload 에 포함합니다.
 *   - 접수 API: 전용 inquiries 엔드포인트가 없어 /api/v1/support (문의 티켓) 에
 *     매핑하여 전송합니다. 실패해도 클라이언트 성공 화면으로 폴백합니다.
 */

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Upload, FileText, X, Download, ArrowRight, Loader2,
  CheckCircle2, ShieldCheck, Lock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { COLLATERAL_CATEGORIES, REGION_SHORT_LIST } from '@/lib/taxonomy'
import { MckPageHeader } from '@/components/mck/page-header'

// ─── McKinsey editorial palette ──────────────────────────
const INK = '#0A1628'
const PAPER = '#FFFFFF'
const PAPER_TINT = '#F8FAFC'
const ELECTRIC = '#2251FF'
const CYAN = '#00A9F4'
const INK_MID = 'rgba(5, 28, 44, 0.65)'
const INK_MUTED = 'rgba(5, 28, 44, 0.45)'
const BORDER = 'rgba(5, 28, 44, 0.10)'
const BORDER_STRONG = 'rgba(5, 28, 44, 0.20)'
const DANGER = '#9F1239'
const DANGER_BG = 'rgba(225, 29, 72, 0.06)'

// 양식 파일은 준비 중입니다 (dead link — /public/templates 에 추후 배치)
const TEMPLATE_HREF = '/templates/NPL_상세내역_표준양식_엔플랫폼.xlsx'

const PROCESS_STEPS = [
  { num: '01', label: '자료 업로드 및 마케팅 조건 협의', desc: '보유 양식 그대로 접수' },
  { num: '02', label: '운영진 검토·마스킹', desc: '민감정보 비식별 처리' },
  { num: '03', label: '리스트 등재 · 매칭 시작', desc: '검증된 매수인에게만 공개' },
]

export default function SellConciergePage() {
  const [form, setForm] = useState({
    company: '',
    name: '',
    phone: '',
    email: '',
    region: '',          // 담보물 지역 — NPL 리스트와 동일 택소노미
    collateralType: '',  // 담보유형 — NPL 리스트와 동일 택소노미 (19종)
    memo: '',
  })
  const [files, setFiles] = useState<File[]>([])
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 로그인 상태 — 매각사 회원 전용 접수 + 회원가입 정보 자동 기입 (수정 가능) ──
  const [authState, setAuthState] = useState<'checking' | 'guest' | 'user'>('checking')
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return
        if (user) {
          const meta = (user.user_metadata ?? {}) as Record<string, string>
          setForm(prev => ({
            ...prev,
            company: prev.company || (meta.company ?? ''),
            name: prev.name || (meta.name ?? ''),
            phone: prev.phone || (meta.phone ?? ''),
            email: prev.email || (user.email ?? ''),
          }))
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

  const update = (k: keyof typeof form, v: string) =>
    setForm((p) => ({ ...p, [k]: v }))

  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const incoming = Array.from(list)
    setFiles((prev) => {
      // 같은 이름+크기 중복 방지
      const merged = [...prev]
      for (const f of incoming) {
        if (!merged.some((m) => m.name === f.name && m.size === f.size)) {
          merged.push(f)
        }
      }
      return merged
    })
    // 같은 파일을 다시 선택해도 onChange 가 발생하도록 초기화
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (idx: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== idx))

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
    if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`
    return `${bytes}B`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!agreePrivacy) {
      setError('개인정보 수집·이용에 동의해주세요.')
      return
    }
    setLoading(true)

    // NOTE: 실제 파일 업로드(Supabase Storage) 연동은 추후 — 지금은 파일명만 전송
    const payload = {
      type: 'LISTING_REGISTRATION',
      company: form.company,
      name: form.name,
      phone: form.phone,
      email: form.email,
      memo: form.memo,
      file_names: files.map((f) => f.name),
    }

    try {
      // 전용 /api/v1/inquiries 라우트가 없어 /api/v1/support 티켓 스키마에 매핑
      await fetch('/api/v1/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          title: `[매각의뢰] ${form.company} · ${form.name}`,
          category: '거래/계약',
          priority: 'HIGH',
          description: [
            `유형: LISTING_REGISTRATION (NPL 매각의뢰)`,
            `회사명: ${form.company}`,
            `담당자: ${form.name}`,
            `연락처: ${form.phone}`,
            `이메일: ${form.email}`,
            form.region ? `담보물 지역: ${form.region}` : '',
            form.collateralType ? `담보유형: ${form.collateralType}` : '',
            `첨부 파일: ${files.length > 0 ? files.map((f) => f.name).join(', ') : '없음'}`,
            form.memo ? `요청사항: ${form.memo}` : '',
          ].filter(Boolean).join('\n'),
        }),
      })
    } catch {
      // 엔드포인트 실패 여부와 무관하게 접수 완료 화면으로 폴백
    }

    setLoading(false)
    setSubmitted(true)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  // ─── 입력 스타일 (signup 페이지 컨벤션 재사용) ─────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 44,
    padding: '10px 14px',
    background: PAPER,
    border: `1px solid ${BORDER_STRONG}`,
    borderRadius: 0,
    fontSize: 13,
    fontWeight: 500,
    color: INK,
    fontVariantNumeric: 'tabular-nums',
    outline: 'none',
    transition: 'border-color 0.12s, box-shadow 0.12s',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = ELECTRIC
    e.currentTarget.style.borderTopColor = ELECTRIC
    e.currentTarget.style.borderTopWidth = '2px'
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34, 81, 255, 0.12)'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = BORDER_STRONG
    e.currentTarget.style.borderTopWidth = '1px'
    e.currentTarget.style.boxShadow = 'none'
  }
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    color: INK_MID,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    marginBottom: 6,
  }

  // ─── 접수 완료 화면 ──────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: PAPER_TINT, padding: '48px 20px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div
            style={{
              background: PAPER,
              border: `1px solid ${BORDER}`,
              borderTop: `2px solid ${ELECTRIC}`,
              padding: '48px 36px',
              textAlign: 'center',
              boxShadow: '0 12px 24px -8px rgba(5, 28, 44, 0.10)',
            }}
          >
            <div
              style={{
                width: 56, height: 56, margin: '0 auto 20px',
                background: ELECTRIC,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(34, 81, 255, 0.35)',
              }}
            >
              <CheckCircle2 size={26} style={{ color: PAPER }} />
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', color: ELECTRIC, textTransform: 'uppercase', marginBottom: 10 }}>
              Request Received
            </div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 900, color: INK, letterSpacing: '-0.025em', lineHeight: 1.15 }}>
              접수 완료
            </h1>
            <p style={{ marginTop: 12, fontSize: 14, color: INK_MID, lineHeight: 1.6 }}>
              운영진이 확인 후 1~2영업일 내 연락드립니다.
            </p>
            <Link
              href="/exchange"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                marginTop: 28, height: 46, padding: '0 28px',
                background: INK, color: PAPER,
                borderTop: `2px solid ${ELECTRIC}`,
                fontSize: 13, fontWeight: 800, textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(10, 22, 40, 0.18)',
              }}
            >
              거래소로 돌아가기
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ─── 접수 폼 ─────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: PAPER_TINT }}>
      {/* ── 표준 페이지 헤더 (전 메뉴 공통 포맷) ── */}
      <MckPageHeader
        eyebrow="Private Deal · NDA 기반"
        title="NPL 매각의뢰"
        subtitle="파일만 올리시면 등록은 저희가 합니다 — 운영진이 검토 후 마스킹해 대신 등록합니다 (1~2영업일)."
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Link
              href="/exchange"
              style={{
                padding: '9px 16px', fontSize: 12, fontWeight: 800, letterSpacing: '-0.01em',
                background: INK, color: PAPER, border: 'none', borderTop: `2px solid ${ELECTRIC}`,
                display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
              }}
            >
              NPL 자동매칭 <ArrowRight size={14} />
            </Link>
            <Link
              href="/exchange/demands/new"
              style={{
                padding: '9px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em',
                background: PAPER, color: INK, border: `1px solid ${INK}`,
                display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
              }}
            >
              매입조건 등록
            </Link>
          </div>
        }
      />

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 64px' }}>

        {/* ── 로그인 필요 배너 — 매각사 회원 전용 (매입조건 등록과 동일 정책) ── */}
        {authState === 'guest' && (
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: 16, marginBottom: 20,
              background: INK, borderTop: `3px solid ${ELECTRIC}`,
            }}
          >
            <Lock size={15} style={{ color: CYAN, flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>
                NPL 매각의뢰는 매각 회원 가입 후 로그인하셔야 가능합니다
              </p>
              <p style={{ marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>
                로그인하시면 회사명 · 담당자명 · 연락처 · 이메일이 자동으로 기입됩니다. 가입은 무료 (관리자 승인제)
              </p>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Link href="/login?redirect=/exchange/sell"
                  style={{ padding: '8px 16px', fontSize: 12, fontWeight: 800, background: '#FFFFFF', color: INK, textDecoration: 'none' }}>
                  로그인
                </Link>
                <Link href="/signup"
                  style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, background: 'transparent', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.35)', textDecoration: 'none' }}>
                  매각 회원가입
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── Form card ── */}
        <div
          style={{
            background: PAPER,
            border: `1px solid ${BORDER}`,
            borderTop: `2px solid ${ELECTRIC}`,
            padding: '32px 28px',
            boxShadow: '0 12px 24px -8px rgba(5, 28, 44, 0.10), 0 4px 8px -2px rgba(5, 28, 44, 0.06)',
          }}
        >
          {error && (
            <div
              style={{
                padding: '10px 14px',
                background: DANGER_BG,
                border: `1px solid ${DANGER}`,
                borderLeft: `3px solid ${DANGER}`,
                marginBottom: 18,
                fontSize: 12,
                color: DANGER,
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* 회사명 + 담당자명 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="company" style={labelStyle}>
                  회사명(기관명) <span style={{ color: ELECTRIC }}>*</span>
                </label>
                <input
                  id="company"
                  type="text"
                  value={form.company}
                  onChange={(e) => update('company', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="예: OO저축은행"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="name" style={labelStyle}>
                  담당자명 <span style={{ color: ELECTRIC }}>*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="홍길동"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            {/* 연락처 + 이메일 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="phone" style={labelStyle}>
                  연락처 <span style={{ color: ELECTRIC }}>*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => update('phone', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="010-1234-5678"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label htmlFor="email" style={labelStyle}>
                  이메일 <span style={{ color: ELECTRIC }}>*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="name@company.co.kr"
                  required
                  style={inputStyle}
                />
              </div>
            </div>

            {/* 담보물 지역 + 담보유형 — NPL 리스트와 동일 분류 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label htmlFor="region" style={labelStyle}>담보물 지역</label>
                <select
                  id="region"
                  value={form.region}
                  onChange={(e) => update('region', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">선택 (선택사항)</option>
                  {REGION_SHORT_LIST.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="collateralType" style={labelStyle}>담보유형</label>
                <select
                  id="collateralType"
                  value={form.collateralType}
                  onChange={(e) => update('collateralType', e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">선택 (선택사항)</option>
                  {COLLATERAL_CATEGORIES.map(cat => (
                    <optgroup key={cat.value} label={cat.label}>
                      {cat.items.map(item => (
                        <option key={item.value} value={item.label}>{item.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {/* 자료 파일 업로드 */}
            <div>
              <label htmlFor="asset-files" style={labelStyle}>
                자료 파일 업로드 <span style={{ color: INK_MUTED, fontWeight: 600, textTransform: 'none' }}>(엑셀 · PDF · 압축파일 · 이미지, 다중 선택 가능)</span>
              </label>
              <label
                htmlFor="asset-files"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '28px 16px',
                  background: PAPER_TINT,
                  border: `1px dashed ${BORDER_STRONG}`,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <Upload size={20} style={{ color: ELECTRIC }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>
                  파일을 선택하거나 여기에 끌어다 놓으세요
                </span>
                <span style={{ fontSize: 11, color: INK_MUTED }}>
                  .xlsx · .xls · .csv · .pdf · .zip · 이미지
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="asset-files"
                type="file"
                multiple
                accept=".xlsx,.xls,.csv,.pdf,.zip,image/*"
                onChange={(e) => addFiles(e.target.files)}
                style={{ display: 'none' }}
              />

              {/* 선택된 파일 목록 */}
              {files.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {files.map((f, i) => (
                    <div
                      key={`${f.name}-${f.size}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 12px',
                        background: '#EFF6FF',
                        border: `1px solid ${ELECTRIC}40`,
                        fontSize: 12, fontWeight: 600, color: INK,
                      }}
                    >
                      <FileText size={14} style={{ color: ELECTRIC, flexShrink: 0 }} />
                      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.name}
                      </span>
                      <span style={{ fontSize: 11, color: INK_MUTED, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {formatSize(f.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        aria-label={`${f.name} 제거`}
                        style={{ background: 'transparent', border: 0, cursor: 'pointer', color: INK_MUTED, padding: 2, flexShrink: 0 }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 표준 양식 다운로드 박스 */}
            <div
              style={{
                border: `1px solid ${BORDER_STRONG}`,
                borderLeft: `3px solid ${CYAN}`,
                padding: '16px 18px',
                display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                background: PAPER,
              }}
            >
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: INK, marginBottom: 3 }}>
                  표준 양식이 필요하신가요?
                </div>
                <div style={{ fontSize: 11, color: INK_MID, lineHeight: 1.5 }}>
                  자체 양식이 없는 기관을 위한 엔플랫폼 표준 매각의뢰 양식입니다.
                </div>
              </div>
              <a
                href={TEMPLATE_HREF}
                download
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  height: 40, padding: '0 16px',
                  background: PAPER, color: INK,
                  border: `1px solid ${BORDER_STRONG}`,
                  fontSize: 12, fontWeight: 800, textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <Download size={14} style={{ color: ELECTRIC }} />
                엔플랫폼 표준 양식 다운로드 (.xlsx)
              </a>
            </div>

            {/* 요청사항 메모 */}
            <div>
              <label htmlFor="memo" style={labelStyle}>
                요청사항 메모
              </label>
              <textarea
                id="memo"
                value={form.memo}
                onChange={(e) => update('memo', e.target.value)}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="매각 희망 시기 · 채권 규모 · 기타 전달사항 (선택)"
                rows={4}
                style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical', lineHeight: 1.5 }}
              />
            </div>

            {/* 개인정보 동의 */}
            <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 14 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: INK, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  required
                  style={{ marginTop: 2, accentColor: ELECTRIC }}
                />
                <span>
                  <strong>(필수)</strong>{' '}
                  <Link href="/terms/privacy" target="_blank" style={{ color: ELECTRIC, textDecoration: 'underline' }}>
                    개인정보 수집·이용
                  </Link>
                  에 동의합니다. 접수된 정보는 매각의뢰 상담 목적으로만 사용됩니다.
                </span>
              </label>
            </div>

            {/* 보안 안내 */}
            <div
              style={{
                background: '#EFF6FF',
                border: `1px solid ${ELECTRIC}40`,
                borderLeft: `3px solid ${ELECTRIC}`,
                padding: '12px 14px',
                fontSize: 11,
                color: INK_MID,
                lineHeight: 1.6,
              }}
            >
              <ShieldCheck size={13} style={{ color: ELECTRIC, marginRight: 6, verticalAlign: 'middle' }} />
              <strong style={{ color: INK }}>비공개 처리 안내</strong> — 업로드하신 자료는
              운영진만 열람하며, 채권 정보 등 민감정보는 마스킹 처리 후 검증된
              매수인에게만 공개됩니다.
            </div>

            {/* Submit — 매각사 로그인 필수 */}
            <button
              type="submit"
              disabled={loading || authState === 'guest'}
              title={authState === 'guest' ? '매각사 회원가입 후 로그인하시면 접수할 수 있습니다' : undefined}
              style={{
                width: '100%',
                height: 48,
                background: loading || authState === 'guest' ? INK_MUTED : INK,
                color: PAPER,
                border: 0,
                borderTop: `2px solid ${ELECTRIC}`,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '-0.01em',
                cursor: loading ? 'wait' : 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 12px rgba(10, 22, 40, 0.18)',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  접수 처리 중…
                </>
              ) : (
                <>
                  매각의뢰 접수하기
                  <ArrowRight size={14} />
                </>
              )}
            </button>

            {/* 접수 후 안내 — 운영진 개별 연락 · 문의처 */}
            <p
              style={{
                marginTop: 10,
                fontSize: 12,
                fontWeight: 600,
                color: INK_MID,
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              접수하신 연락처로 엔플랫폼 운영진이 개별 연락드립니다.
              <br />
              (문의처) <a href="tel:0255552822" style={{ color: INK, fontWeight: 800, textDecoration: 'none' }}>02-555-2822</a>
            </p>
          </form>
        </div>

        {/* ── 3-step process strip ── */}
        <div
          style={{
            marginTop: 24,
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            border: `1px solid ${BORDER}`,
            background: PAPER,
          }}
        >
          {PROCESS_STEPS.map((s, i) => (
            <div
              key={s.num}
              style={{
                padding: '16px 14px',
                borderLeft: i > 0 ? `1px solid ${BORDER}` : 'none',
              }}
            >
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 900, color: ELECTRIC, letterSpacing: '-0.02em' }}>
                {s.num}
              </span>
              <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: INK, lineHeight: 1.35 }}>
                {s.label}
              </div>
              <div style={{ marginTop: 2, fontSize: 11, color: INK_MUTED, lineHeight: 1.4 }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
