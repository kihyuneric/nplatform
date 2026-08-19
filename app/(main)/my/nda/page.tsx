'use client'

/**
 * /my/nda — 내 NDA (매입 회원 · 2026-08-19)
 *
 * 내가 체결한 NDA 를 관리번호 기준으로 모아 보여준다.
 *   - 체결 전문 열람 (체결 시점 그대로)
 *   - PDF 저장 / PDF 보관 / 보관본 열기
 * 운영관리자는 NDA · 계약 화면에서 같은 문서를 본다 (같은 뷰어 공유).
 */

import { useCallback, useEffect, useState } from 'react'
import { FileSignature, RefreshCw, FileText, CheckCircle2 } from 'lucide-react'
import DS from '@/lib/design-system'
import { MckPageShell, MckPageHeader } from '@/components/mck'
import { NdaDocumentPane, type NdaDocument } from '@/components/nda/nda-document-pane'

const PAGE_SIZE = 20

export default function MyNdaPage() {
  const [docs, setDocs] = useState<NdaDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [target, setTarget] = useState<NdaDocument | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetch('/api/v1/nda/documents', { credentials: 'include' })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) {
          throw new Error(
            r.status === 401 ? '로그인이 만료되었습니다. 다시 로그인해주세요.'
            : d?.error?.message ?? `NDA 문서를 불러오지 못했습니다 (${r.status})`
          )
        }
        setDocs(Array.isArray(d.data) ? d.data : [])
      })
      .catch(e => setError(e instanceof Error ? e.message : '알 수 없는 오류'))
      .finally(() => setLoading(false))
  }, [])
  useEffect(() => { load() }, [load])

  const q = search.trim().toLowerCase()
  const filtered = q
    ? docs.filter(d => [d.listing_no ?? '', d.signer ?? '', d.email ?? ''].join(' ').toLowerCase().includes(q))
    : docs
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[{ label: '마이페이지', href: '/my' }, { label: '내 NDA' }]}
        eyebrow="MY · NDA"
        title="내 NDA"
        subtitle="체결한 비밀유지계약서를 확인하고 PDF 로 보관합니다. 채권기관·담당자 정보는 NDA 체결 후에도 공개되지 않으며, 협의 단계에서 운영사를 통해 공유됩니다."
        actions={
          <button onClick={load}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
            style={{ background: 'transparent', cursor: 'pointer' }}>
            <RefreshCw size={12} /> 새로고침
          </button>
        }
      />

      <div className="max-w-[1100px] mx-auto px-6 pb-12 space-y-4">
        {error && (
          <div className="flex items-center gap-3 px-3 py-2.5 border"
            style={{ borderColor: 'rgba(225,29,72,0.4)', background: 'rgba(225,29,72,0.06)' }}>
            <span className="text-[12.5px] font-bold text-[#9F1239]">{error}</span>
            <button onClick={load} className="ml-auto px-2.5 py-1 text-[11px] font-bold border border-[var(--color-border-default)]"
              style={{ background: 'var(--color-surface-elevated)', cursor: 'pointer' }}>
              다시 시도
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="관리번호 · 서명자 검색..."
            className="w-full max-w-sm px-3 py-2 text-[12.5px] font-medium border border-[var(--color-border-default)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] outline-none focus:border-[#2251FF]"
          />
          <span className="text-[11px] text-[var(--color-text-muted)]">{filtered.length}건 / 전체 {docs.length}건</span>
        </div>

        <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)] overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] text-left text-[10.5px] uppercase tracking-wide text-[var(--color-text-muted)]">
                <th className="px-3 py-2 font-bold whitespace-nowrap">관리번호</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">체결일</th>
                <th className="px-3 py-2 font-bold">서명자</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">보관본</th>
                <th className="px-3 py-2 font-bold whitespace-nowrap">문서</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</td></tr>
              )}
              {!loading && filtered.length === 0 && !error && (
                <tr>
                  <td colSpan={5} className="px-3 py-12 text-center">
                    <p className="text-sm font-semibold text-[var(--color-text-secondary)]">체결한 NDA 가 없습니다</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                      자동매칭 리스트에서 관심 매물의 [NDA 체결]을 진행하면 이곳에 문서가 보관됩니다.
                    </p>
                  </td>
                </tr>
              )}
              {paged.map(d => (
                <tr key={d.id} className="border-b border-[var(--color-border-subtle)] hover:bg-[var(--color-surface-overlay)]">
                  <td className="px-3 py-2 whitespace-nowrap font-mono text-[11px] font-bold text-[#1A47CC]">
                    {d.listing_no || '—'}
                  </td>
                  <td className="px-3 py-2 tabular-nums whitespace-nowrap text-[var(--color-text-secondary)]">
                    {String(d.agreed_at).slice(0, 10)}
                  </td>
                  <td className="px-3 py-2">
                    <span className="block truncate max-w-[220px] text-[var(--color-text-primary)]">{d.signer || '—'}</span>
                    <span className="block text-[10.5px] text-[var(--color-text-muted)] truncate">{d.email}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {d.file_path ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                        <CheckCircle2 size={11} /> 보관됨
                      </span>
                    ) : (
                      <span className="text-[11px] text-[var(--color-text-muted)]">미보관</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => setTarget(d)}
                      className={`${DS.button.secondary} ${DS.button.sm} justify-center`}
                    >
                      <FileText size={11} /> 열람
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
            <span>{filtered.length}건 중 {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                className={`${DS.button.ghost} ${DS.button.sm} disabled:opacity-30`}>이전</button>
              <span className="px-2 font-bold">{safePage}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                className={`${DS.button.ghost} ${DS.button.sm} disabled:opacity-30`}>다음</button>
            </div>
          </div>
        )}

        <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-text-muted)]">
          <FileSignature size={12} /> 체결 문서는 서명 시점의 전문 그대로 보관되며, 약관이 개정되어도 변경되지 않습니다.
        </p>
      </div>

      {target && (
        <NdaDocumentPane
          doc={target}
          onClose={() => setTarget(null)}
          onChanged={() => { load(); setTarget(null) }}
        />
      )}
    </MckPageShell>
  )
}
