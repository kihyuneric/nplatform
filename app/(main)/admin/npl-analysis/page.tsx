'use client'

/**
 * /admin/npl-analysis — NPL 수익률 분석 (운영자 전용 · 2026-08-17)
 *
 * 정책:
 *   - 공개 화면에서는 분석·AI등급 미노출. 분석은 운영자 관리자페이지에서만.
 *   - 등록된 NPL 리스트 전건에 대해 AI 등급 · 예상 ROI · 회수율 · LTV 자동 산출.
 *   - 행 클릭 → /admin/npl-analysis/[id] 상세 분석 페이지.
 *   - 산식은 규칙 기반(플랫폼 표준). 실제 ML 모델 연동 시 API 값으로 대체.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Brain, RefreshCw, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { computeAnalysis, fmtEok } from './_analysis'

type Row = {
  id: string
  region: string
  collateral: string
  appraisal: number     // 감정가
  principal: number     // 채권잔액
  asking: number        // 협의가
  created: string
}

export default function AdminNplAnalysisPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch('/api/v1/exchange/listings?limit=200&status=ACTIVE', { credentials: 'include' })
        const d = await r.json()
        if (cancelled) return
        const data: Array<Record<string, any>> = Array.isArray(d.data) ? d.data : []
        setRows(data.map(x => {
          const principal = Number(x.outstanding_principal ?? x.principal_amount ?? x.claim_amount ?? 0)
          return {
            id: String(x.id),
            region: [x.sido, x.sigungu].filter(Boolean).join(' ') || String(x.address ?? '').split(/\s+/).slice(0, 2).join(' ') || '—',
            collateral: String(x.collateral_type ?? '기타'),
            appraisal: Number(x.appraised_value ?? x.appraisal_value ?? 0),
            principal,
            // 협의가 미지정 시 채권잔액의 70% 를 기본 제안가로 가정
            asking: Number(x.asking_price ?? 0) || Math.round(principal * 0.7),
            created: x.created_at ? String(x.created_at).slice(0, 10) : '—',
          }
        }))
      } catch { /* 빈 목록 유지 */ } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const analyzed = useMemo(
    () => rows.map(r => ({ ...r, a: computeAnalysis(r) })).sort((x, y) => y.a.roi - x.a.roi),
    [rows],
  )

  // D0 공통 UI — 검색 + 페이지네이션 (20건/페이지)
  const PAGE_SIZE = 20
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = search.trim().toLowerCase()
  const filtered = q
    ? analyzed.filter(r => [r.id, r.region, r.collateral, r.a.grade, r.a.opinion].join(' ').toLowerCase().includes(q))
    : analyzed
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((Math.min(page, totalPages) - 1) * PAGE_SIZE, Math.min(page, totalPages) * PAGE_SIZE)

  return (
    <div className="p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2251FF] mb-1.5">
            <Brain size={13} /> Internal Only · 운영자 전용
          </div>
          <h1 className="text-2xl font-black text-[var(--color-text-primary)]" style={{ fontFamily: 'Georgia, serif' }}>
            NPL 수익률 분석
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            매각의뢰된 전건 자동 수익률 분석 — AI 등급 · 예상 ROI · 회수율 · LTV. 외부에는 노출되지 않습니다.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
            <RefreshCw size={12} /> 분석 대상 {analyzed.length}건 · 규칙 기반 v1 (감정가 85% 회수 가정)
          </div>
          {/* 전건 분석 결과 엑셀 다운로드 */}
          <button
            onClick={() => {
              const rows2 = analyzed.map(r => ({
                '관리번호': r.id,
                '지역': r.region,
                '유형': r.collateral,
                '등록일': r.created,
                '감정가(원)': r.appraisal,
                '총 채권액(원)': r.principal,
                '협의가(원)': r.asking,
                'AI 등급': r.a.grade,
                '예상 ROI(%)': r.a.roi,
                '회수율(%)': r.a.recoveryRate,
                'LTV(%)': r.a.ltv,
                '의견': r.a.opinion,
              }))
              const ws = XLSX.utils.json_to_sheet(rows2)
              ws['!cols'] = [{ wch: 30 }, { wch: 16 }, { wch: 10 }, { wch: 11 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 }]
              const wb = XLSX.utils.book_new()
              XLSX.utils.book_append_sheet(wb, ws, 'NPL 수익률 분석')
              XLSX.writeFile(wb, `NPL_수익률분석_${new Date().toISOString().slice(0, 10)}.xlsx`)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold text-white"
            style={{ background: '#0A1628', borderTop: '2px solid #2251FF', border: 'none', cursor: 'pointer' }}
          >
            <Download size={12} /> 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* D0 공통 UI — 검색 */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="관리번호 · 지역 · 유형 · 등급 · 의견 검색..."
          className="w-full max-w-sm px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]"
        />
        <span className="text-[11px] text-[var(--color-text-muted)]">{filtered.length}건 / 전체 {analyzed.length}건</span>
      </div>

      {/* 분석 테이블 */}
      <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[11px] uppercase tracking-wide text-[var(--color-text-muted)]">
              <th className="px-4 py-2.5 font-bold">관리번호</th>
              <th className="px-4 py-2.5 font-bold">지역 · 유형</th>
              <th className="px-4 py-2.5 font-bold">감정가</th>
              <th className="px-4 py-2.5 font-bold">총 채권액</th>
              <th className="px-4 py-2.5 font-bold">협의가</th>
              <th className="px-4 py-2.5 font-bold">AI 등급</th>
              <th className="px-4 py-2.5 font-bold">예상 ROI</th>
              <th className="px-4 py-2.5 font-bold">회수율</th>
              <th className="px-4 py-2.5 font-bold">LTV</th>
              <th className="px-4 py-2.5 font-bold">의견</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">분석 데이터를 불러오는 중...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">등록된 매물이 없습니다</td></tr>
            )}
            {paged.map(r => (
              <tr key={r.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)] transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-[var(--color-text-primary)]">{r.id}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-[var(--color-text-primary)]">{r.region}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{r.collateral} · 등록 {r.created}</div>
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold">{fmtEok(r.appraisal)}</td>
                <td className="px-4 py-3 tabular-nums font-semibold">{fmtEok(r.principal)}</td>
                <td className="px-4 py-3 tabular-nums font-bold text-[var(--color-text-primary)]">{fmtEok(r.asking)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-black text-white" style={{ background: '#051C2C', borderTop: '2px solid #2251FF' }}>
                    {r.a.grade}
                  </span>
                </td>
                <td className={`px-4 py-3 tabular-nums font-extrabold ${r.a.roi >= 25 ? 'text-emerald-600' : r.a.roi >= 0 ? 'text-[var(--color-text-primary)]' : 'text-red-600'}`}>
                  {r.a.roi > 0 ? '+' : ''}{r.a.roi}%
                </td>
                <td className="px-4 py-3 tabular-nums font-semibold">{r.a.recoveryRate}%</td>
                <td className="px-4 py-3 tabular-nums font-semibold">{r.a.ltv}%</td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-extrabold px-2 py-0.5 border ${r.a.opinion === 'BUY' ? 'text-emerald-700 border-emerald-300 bg-emerald-50' : r.a.opinion === 'HOLD' ? 'text-amber-700 border-amber-300 bg-amber-50' : 'text-red-700 border-red-300 bg-red-50'}`}>
                    {r.a.opinion}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/npl-analysis/${encodeURIComponent(r.id)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#2251FF] hover:underline"
                  >
                    상세 분석 <ArrowUpRight size={12} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* D0 공통 UI — 페이지네이션 (20건/페이지) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px]">
          <span className="text-[var(--color-text-muted)]">{page} / {totalPages} 페이지</span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)] disabled:opacity-30"
              style={{ background: 'transparent', cursor: 'pointer' }}>이전</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1.5 font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)] disabled:opacity-30"
              style={{ background: 'transparent', cursor: 'pointer' }}>다음</button>
          </div>
        </div>
      )}

      <p className="text-[11px] text-[var(--color-text-muted)]">
        ※ 산식: 예상 회수액 = 감정가 × 85% · ROI = (회수액 − 협의가) ÷ 협의가 · 회수율 = 회수액 ÷ 총 채권액 · LTV = 총 채권액 ÷ 감정가. ML 모델 연동 시 자동 대체됩니다.
      </p>
    </div>
  )
}
