'use client'

/**
 * /listing-detail/[id] — NPL 세부내역 (운영자 · 매각사 공용 · 2026-08-18)
 *
 * 표준 양식(대분류/소분류/내용) 그대로 표시 + 전체 필드 인라인 수정.
 * 저장: listing_marketing.detail (jsonb) — 운영자·매각사 동일 저장소.
 * 엑셀 다운로드 · 인쇄(PDF 저장) 지원.
 *
 * ?mode=view — 매입사 열람 모드 (NPL 리스트 행 클릭 진입):
 *   - NDA 요청이 '승인' 상태인 계정만 열람 가능. 승인 전에는 잠금 안내.
 *   - 채권기관 · 담당자명 · 직책 · 연락처는 열람 모드에서 제외 (매각사 보호).
 *   - 읽기 전용 (수정 · 저장 불가), 엑셀 · 인쇄는 가능.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import { ArrowLeft, Save, Download, Printer, CheckCircle2, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { NdaRequest } from '@/lib/marketing-checklist'

/** 매입사 열람 모드에서 제외되는 필드 — 채권기관 · 담당자 식별 정보 */
const VIEWER_HIDDEN_KEYS = new Set(['institution', 'manager_name', 'manager_title', 'manager_phone'])

const INK = '#0A1628'
const ELECTRIC = '#2251FF'

/** 표준 양식 스펙 — 대분류 / 소분류 (key = 저장 키) */
const SPEC: { group: string; fields: { key: string; label: string; hint?: string }[] }[] = [
  { group: '채권기본정보', fields: [
    { key: 'institution', label: '채권기관', hint: '기관명을 기입해주세요 (예: xx조합)' },
    { key: 'base_date', label: '기준일', hint: 'YYYY-MM-DD' },
    { key: 'manager_name', label: '담당자명' },
    { key: 'manager_title', label: '직책' },
    { key: 'manager_phone', label: '연락처' },
  ]},
  { group: '채무자정보', fields: [
    { key: 'debtor_type', label: '법인/개인여부' },
    { key: 'debtor_name', label: '채무자명', hint: '앞글자만 (예: ㈜가나다)' },
    { key: 'debtor_prev', label: '변경전채무자', hint: '비해당시 해당없음' },
  ]},
  { group: '매각방식', fields: [
    { key: 'sale_method', label: '매각방식', hint: '경매 / 공매 / 기타(내용 기입)' },
    { key: 'auction_case_no', label: '경매 사건번호' },
    { key: 'public_sale_no', label: '공매 관리번호' },
  ]},
  { group: '채권상세내역', fields: [
    { key: 'loan_balance', label: '대출잔액' },
    { key: 'loan_principal', label: '대출원금' },
  ]},
  { group: '이자', fields: [
    { key: 'interest_normal', label: '정상이자', hint: '일부만 적으셔도 됩니다' },
    { key: 'interest_overdue', label: '연체이자', hint: '일부만 적으셔도 됩니다' },
    { key: 'interest_unpaid', label: '미수이자', hint: '정상이자 중 미수이자' },
  ]},
  { group: '비용', fields: [
    { key: 'provisional_cost', label: '가지급비용' },
    { key: 'total_claim', label: '총 채권액', hint: '(자동계산) 대출잔액+이자합계+비용' },
  ]},
  { group: '대출조건', fields: [
    { key: 'loan_period', label: '대출기간', hint: 'ex. 2015-05-15 ~ 2018-11-15 (3년 6개월)' },
    { key: 'loan_rate', label: '대출금리', hint: '예: 4.00%' },
    { key: 'overdue_rate', label: '연체금리', hint: '예: 7.00%' },
    { key: 'overdue_start', label: '원금 연체시작일', hint: "YYYY-MM-DD · 비해당시 '해당없음' 기재" },
    { key: 'beneficial_amount', label: '수익권금액(채권최고액)', hint: '공부상 채권최고액 (110% · 120% · 130% 등)' },
  ]},
  { group: '담보물정보', fields: [
    { key: 'collateral_address', label: '담보물주소', hint: '상세 주소 기입 — 리스트에는 주소 일부만 공개' },
    { key: 'collateral_type', label: '담보물종류', hint: 'ex. 대지 · 아파트 · 다세대 · 오피스텔 · 공장' },
    { key: 'exclusive_area', label: '전용면적', hint: '단위: ㎡ (건물은 총 연면적)' },
  ]},
  { group: '가치평가', fields: [
    { key: 'appraisal_value', label: '감정가(법사가)' },
    { key: 'ltv', label: '담보인정비율(LTV)', hint: '(자동계산) 대출잔액 ÷ 감정가' },
  ]},
  { group: '권리관계', fields: [
    { key: 'security_method', label: '채권보전방식', hint: 'ex. 담보신탁우선수익권 · 대주단 공동근저당권' },
    { key: 'rank_1', label: '1순위', hint: 'ex. 종부세 5건(798백만원), 재산세 3건(103백만원)' },
    { key: 'rank_2', label: '2순위', hint: 'ex. 담보신탁우선수익권(130%), 대주단 공동근저당권(340백만원)' },
    { key: 'max_claim', label: '설정금액(채권최고액)' },
  ]},
  { group: '현황', fields: [
    { key: 'senior_tenant', label: '선순위임차인 내역', hint: "비해당시 '0'으로 기재" },
    { key: 'deposit', label: '보증금', hint: "비해당시 '0'으로 기재" },
    { key: 'monthly_rent', label: '월세', hint: "비해당시 '0'으로 기재" },
    { key: 'vacancy', label: '공실여부', hint: "공실 / 비해당시 '0' / 기타(운영 형태 기입)" },
  ]},
  { group: '매각조건', fields: [
    { key: 'asking_price', label: '매각 협의가' },
    { key: 'sale_deadline', label: '매각 종료일', hint: 'YYYY-MM-DD' },
    { key: 'down_payment', label: '계약금', hint: '입찰보증금의 10%' },
    { key: 'balance_date', label: '잔금일', hint: '계약일로부터 30일 이내' },
  ]},
  { group: '기타', fields: [
    { key: 'etc', label: '', hint: '자유롭게 기입해주세요' },
  ]},
]

const fmtEok = (n: unknown) => (typeof n === 'number' && n > 0 ? n.toLocaleString() : '')

// 숫자 파싱 (콤마·공백 허용) — 자동계산용
const num = (s?: string) => {
  const n = parseFloat(String(s ?? '').replace(/[^0-9.]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>()
  const search = useSearchParams()
  const id = decodeURIComponent(params?.id ?? '')
  // 매입사 열람 모드 — NPL 리스트에서 행 클릭 진입 (읽기 전용 · NDA 승인 필요)
  const viewerMode = search?.get('mode') === 'view'

  const [detail, setDetail] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  // 열람 모드 접근 상태: checking → approved | locked
  const [viewerAccess, setViewerAccess] = useState<'checking' | 'approved' | 'locked'>('checking')
  const [viewerNdaStatus, setViewerNdaStatus] = useState<string>('')  // 내 NDA 요청 상태 (운영사 검토/거절/없음)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      // 저장된 세부내역
      let stored: Record<string, string> = {}
      let ndaRequests: NdaRequest[] = []
      try {
        const r = await fetch(`/api/v1/listing-marketing?ids=${encodeURIComponent(id)}`)
        const d = await r.json()
        const row = d?.data?.[id]
        if (row?.detail && typeof row.detail === 'object') stored = row.detail
        if (Array.isArray(row?.nda_requests)) ndaRequests = row.nda_requests
      } catch { /* ignore */ }

      // 열람 모드 — 내 계정의 NDA 요청이 '승인' 상태인지 확인
      if (viewerMode) {
        let email = ''
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          email = user?.email ?? ''
        } catch { /* ignore */ }
        const mine = email ? ndaRequests.filter(q => q.email && q.email === email) : []
        const approved = mine.some(q => q.status === '승인')
        if (!cancelled) {
          setViewerAccess(approved ? 'approved' : 'locked')
          setViewerNdaStatus(mine.length > 0 ? (mine.find(q => q.status !== '거절')?.status ?? mine[mine.length - 1].status) : '')
        }
      }

      // 매물 기본값으로 빈 칸 프리필 (저장값 우선)
      try {
        const r = await fetch('/api/v1/exchange/listings?limit=200', { credentials: 'include' })
        const d = await r.json()
        const list: Array<Record<string, any>> = Array.isArray(d.data) ? d.data : []
        const x = list.find(l => String(l.id) === id)
        if (x) {
          const prefill: Record<string, string> = {
            institution: String(x.institution ?? x.institution_name ?? ''),
            // 운영자·매각사(본인) 화면은 마스킹 없이 전체 주소 — 마스킹은 공개 리스트/NDA 전 노출에만 적용
            collateral_address: viewerMode
              ? ([x.sido, x.sigungu, x.dong].filter(Boolean).join(' ')
                  || String(x.address ?? '').split(/\s+/).slice(0, 3).join(' '))
              : (String(x.address ?? '')
                  || [x.sido, x.sigungu, x.dong].filter(Boolean).join(' ')),
            collateral_type: String(x.collateral_type ?? ''),
            appraisal_value: fmtEok(x.appraised_value ?? x.appraisal_value),
            total_claim: fmtEok(x.outstanding_principal ?? x.principal_amount ?? x.claim_amount),
            asking_price: fmtEok(x.asking_price),
            max_claim: fmtEok(x.max_claim ?? x.max_claim_amount),
            exclusive_area: typeof x.building_area_m2 === 'number' ? String(x.building_area_m2)
              : typeof x.land_area_m2 === 'number' ? String(x.land_area_m2) : '',
          }
          stored = { ...Object.fromEntries(Object.entries(prefill).filter(([, v]) => v)), ...stored }
        }
      } catch { /* ignore */ }

      if (!cancelled) { setDetail(stored); setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [id, viewerMode])

  // 열람 모드에서 표시할 스펙 — 채권기관 · 담당자 정보 그룹 제외
  const visibleSpec = viewerMode
    ? SPEC.map(g => ({ ...g, fields: g.fields.filter(f => !VIEWER_HIDDEN_KEYS.has(f.key)) })).filter(g => g.fields.length > 0)
    : SPEC

  const save = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/v1/listing-marketing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: id, detail }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } finally {
      setSaving(false)
    }
  }

  // ── 자동계산 (표준탬플릿 v2) ──
  // 총 채권액 = 대출잔액 + 정상이자 + 연체이자 + 가지급비용
  const autoTotalClaim = (() => {
    const base = num(detail.loan_balance)
    if (base <= 0) return ''
    return (base + num(detail.interest_normal) + num(detail.interest_overdue) + num(detail.provisional_cost)).toLocaleString()
  })()
  // LTV = 대출잔액 ÷ 감정가(법사가)
  const autoLtv = (() => {
    const bal = num(detail.loan_balance)
    const apr = num(detail.appraisal_value)
    if (bal <= 0 || apr <= 0) return ''
    return `${((bal / apr) * 100).toFixed(2)}%`
  })()
  const AUTO: Record<string, string> = { total_claim: autoTotalClaim, ltv: autoLtv }
  const cellValue = (key: string) => detail[key] || AUTO[key] || ''

  const downloadExcel = () => {
    const rows: (string | undefined)[][] = [
      ['부실채권(NPL) 상세내역 탬플릿', '', '', ''],
      ['대분류', '소분류(노랑색만 리스트 제공)', '내용(세부 내용은 NDA시 제공)', '비고'],
    ]
    for (const g of visibleSpec) {
      g.fields.forEach((f, i) => {
        rows.push([i === 0 ? g.group : '', f.label, cellValue(f.key), f.hint ?? ''])
      })
    }
    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [{ wch: 14 }, { wch: 26 }, { wch: 36 }, { wch: 40 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '탬플릿')
    XLSX.writeFile(wb, `NPL_상세내역_${id}.xlsx`)
  }

  return (
    <div className="max-w-[860px] mx-auto px-6 py-8 print-detail">
      {/* 인쇄 최적화 */}
      <style>{`
        @media print {
          header, footer, nav, .no-print, [class*="mobile-tab"], [class*="chat"] { display: none !important; }
          body { background: #FFFFFF !important; }
          .print-detail { padding: 0 !important; max-width: none !important; }
          .print-detail input { border: none !important; }
          @page { margin: 12mm; }
        }
      `}</style>

      {/* 헤더 */}
      <div className="no-print flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <Link href={viewerMode ? '/exchange' : '/admin/listings'} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={15} /> {viewerMode ? 'NPL 자동매칭' : '매물 리스트'}
          </Link>
          <h1 className="mt-2 text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            NPL 세부내역
          </h1>
          <p className="mt-1 text-xs font-mono text-[var(--color-text-muted)]">{id}</p>
        </div>
        {(!viewerMode || viewerAccess === 'approved') && (
        <div className="flex items-center gap-2 flex-wrap">
          {!viewerMode && (
          <button onClick={() => void save()} disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold text-white"
            style={{ background: INK, borderTop: `2px solid ${ELECTRIC}`, border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            <Save size={13} /> {saving ? '저장 중…' : '저장'}
          </button>
          )}
          <button onClick={downloadExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
            style={{ background: 'transparent', cursor: 'pointer' }}>
            <Download size={13} /> 엑셀
          </button>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
            style={{ background: 'transparent', cursor: 'pointer' }}>
            <Printer size={13} /> 인쇄
          </button>
          {saved && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 size={13} /> 저장됨</span>}
        </div>
        )}
      </div>

      {/* 인쇄용 타이틀 */}
      <div className="hidden print:block mb-4">
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 800, color: INK }}>부실채권(NPL) 상세내역</h1>
        <p style={{ fontSize: 11, color: '#5A6472' }}>{id} · nplatform</p>
      </div>

      {loading || (viewerMode && viewerAccess === 'checking') ? (
        <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</p>
      ) : viewerMode && viewerAccess === 'locked' ? (
        /* ── 열람 잠금 — NDA 승인 전 (매입사) ── */
        <div className="border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] px-6 py-14 text-center" style={{ borderTop: `3px solid ${ELECTRIC}` }}>
          <Lock size={28} className="mx-auto mb-4 text-[var(--color-text-muted)]" />
          <h2 className="text-lg font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            NDA 체결 후 열람할 수 있습니다
          </h2>
          <p className="mt-2 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            {viewerNdaStatus === '운영사 검토'
              ? 'NDA 요청이 접수되어 운영사 검토 중입니다. 승인되면 세부내역이 열립니다. (영업일 1일 이내)'
              : viewerNdaStatus === '거절'
                ? 'NDA 요청이 승인되지 않았습니다. 자세한 내용은 1:1 문의로 연락해주세요.'
                : '이 채권의 세부내역은 NDA 전자서명 후 운영사 승인을 거쳐 공개됩니다.'}
          </p>
          <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
            승인 후에도 채권기관 · 담당자 정보는 공개되지 않습니다.
          </p>
          <Link href="/exchange" className="inline-flex items-center gap-1.5 mt-6 px-5 py-2.5 text-xs font-extrabold text-white" style={{ background: INK, borderTop: `2px solid ${ELECTRIC}`, textDecoration: 'none' }}>
            NPL 자동매칭에서 NDA 요청하기
          </Link>
        </div>
      ) : (
        <div className="border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)]" style={{ borderTop: `3px solid ${ELECTRIC}` }}>
          {/* 헤더 행 */}
          <div className="grid grid-cols-[110px_170px_1fr] text-[10.5px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] border-b border-[var(--color-border-default)] bg-[var(--color-surface-overlay)]">
            <div className="px-3 py-2">대분류</div>
            <div className="px-3 py-2">소분류</div>
            <div className="px-3 py-2">{viewerMode ? '내용 — NDA 승인 열람본' : '내용 — 세부 내용은 NDA 시 제공 (클릭하여 수정)'}</div>
          </div>
          {visibleSpec.map(g => (
            g.fields.map((f, i) => (
              <div key={`${g.group}-${f.key}`} className="grid grid-cols-[110px_170px_1fr] border-b border-[var(--color-border-subtle)] items-stretch">
                <div className="px-3 py-2 text-[12px] font-extrabold text-[var(--color-text-primary)]" style={{ borderRight: '1px solid var(--color-border-subtle)' }}>
                  {i === 0 ? g.group : ''}
                </div>
                <div className="px-3 py-2 text-[12px] font-semibold text-[var(--color-text-secondary)]" style={{ borderRight: '1px solid var(--color-border-subtle)' }}>
                  {f.label}
                </div>
                <div className="px-2 py-1">
                  {viewerMode ? (
                    <div className="px-1.5 py-1 text-[12.5px] font-medium text-[var(--color-text-primary)] tabular-nums min-h-[24px]">
                      {cellValue(f.key) || '—'}
                    </div>
                  ) : (
                  <input
                    value={detail[f.key] ?? ''}
                    onChange={e => setDetail(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={AUTO[f.key] ? `자동계산: ${AUTO[f.key]}` : (f.hint ?? '')}
                    className="w-full px-1.5 py-1 text-[12.5px] font-medium bg-transparent text-[var(--color-text-primary)] outline-none border border-transparent focus:border-[#2251FF] tabular-nums"
                  />
                  )}
                </div>
              </div>
            ))
          ))}
        </div>
      )}

      {viewerMode ? (
        viewerAccess === 'approved' && (
          <p className="no-print mt-4 text-[11px] text-[var(--color-text-muted)]">
            ※ 본 세부내역은 NDA 승인 계정 전용 열람본입니다. 채권기관 · 담당자 정보는 제외되며, 무단 복제 · 배포는 NDA 위반입니다.
          </p>
        )
      ) : (
      <p className="no-print mt-4 text-[11px] text-[var(--color-text-muted)]">
        ※ 수정 후 반드시 <b>저장</b>을 누르세요. 저장된 내용은 운영자·매각사 양쪽에서 동일하게 보입니다.
        영구 저장은 listing_marketing 테이블 생성 후 적용됩니다.
      </p>
      )}
    </div>
  )
}
