'use client'

/**
 * MarketingPanel — 매물별 마케팅 진행 체크리스트 + 반응 집계 + 상담 수 (2026-08-18)
 *
 * 매각의뢰 현황(/admin/listings)의 [마케팅] 버튼에서 모달로 사용.
 * 체크 즉시 저장 → 매각사 대시보드(/my/seller)에 실시간 공유.
 * 저장소: listing_marketing (checklist / consult_count / interest_count / nda_count)
 */

import { useEffect, useState } from 'react'
import { CheckCircle2, Heart, FileSignature, Phone, X } from 'lucide-react'
import { MARKETING_CHECKLIST, emptyMarketing, type ListingMarketing } from '@/lib/marketing-checklist'

export function MarketingPanel({ listingId, title, onClose }: { listingId: string; title?: string; onClose: () => void }) {
  const [mk, setMk] = useState<ListingMarketing>(emptyMarketing(listingId))
  const [consultDraft, setConsultDraft] = useState('0')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/v1/listing-marketing?ids=${encodeURIComponent(listingId)}`)
      .then(r => r.json())
      .then(d => {
        const row = d?.data?.[listingId]
        if (row) {
          setMk({ ...emptyMarketing(listingId), ...row })
          setConsultDraft(String(row.consult_count ?? 0))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [listingId])

  const saveMk = async (patch: { checklist?: Record<string, boolean>; consult_count?: number }) => {
    setSaving(true)
    try {
      await fetch('/api/v1/listing-marketing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, ...patch }),
      })
    } finally {
      setSaving(false)
    }
  }

  const toggleCheck = (key: string) => {
    const next = { ...mk.checklist, [key]: !mk.checklist[key] }
    setMk(prev => ({ ...prev, checklist: next }))
    void saveMk({ checklist: next })
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: 'rgba(5, 28, 44, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[640px] max-h-[85vh] overflow-y-auto bg-[var(--color-surface-elevated)]"
        style={{ borderTop: '3px solid #2251FF' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <div>
            <div className="text-[13px] font-black text-[var(--color-text-primary)]">마케팅 진행 관리</div>
            <div className="text-[11px] text-[var(--color-text-muted)]">{title ?? listingId} · 체크 즉시 매각사 대시보드에 공유</div>
          </div>
          <button onClick={onClose} aria-label="닫기"
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">불러오는 중...</p>
        ) : (
          <div className="p-4 space-y-4">
            {/* 체크리스트 */}
            <div className="border border-[var(--color-border-subtle)] overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
                  마케팅 진행 체크리스트
                </span>
                <span className="text-[11px] font-bold text-[#2251FF]">
                  {MARKETING_CHECKLIST.filter(c => mk.checklist[c.key]).length}/{MARKETING_CHECKLIST.length} 완료 {saving ? '· 저장 중…' : ''}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 divide-[var(--color-border-subtle)]">
                {(['땅집고옥션', '엔플랫폼'] as const).map(group => (
                  <div key={group} className="p-3 space-y-1.5">
                    <div className="text-[11px] font-extrabold text-[var(--color-text-primary)] mb-1">{group}</div>
                    {MARKETING_CHECKLIST.filter(c => c.group === group).map(c => (
                      <label key={c.key} className="flex items-center gap-2.5 cursor-pointer py-0.5">
                        <input
                          type="checkbox"
                          checked={!!mk.checklist[c.key]}
                          onChange={() => toggleCheck(c.key)}
                          className="w-4 h-4 accent-[#2251FF]"
                        />
                        <span className={`text-[13px] font-medium ${mk.checklist[c.key] ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                          {c.label}
                        </span>
                        {mk.checklist[c.key] && <CheckCircle2 size={13} className="text-emerald-600" />}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* 반응 집계 + 상담 수 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[var(--color-border-subtle)]">
              <div className="bg-[var(--color-surface-elevated)] p-3" style={{ borderTop: '2px solid #E11D48' }}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
                  <Heart size={11} /> 관심 등록 (자동)
                </div>
                <div className="text-xl font-black tabular-nums" style={{ fontFamily: 'Georgia, serif' }}>{mk.interest_count}건</div>
              </div>
              <div className="bg-[var(--color-surface-elevated)] p-3" style={{ borderTop: '2px solid #2251FF' }}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
                  <FileSignature size={11} /> NDA 요청 (자동)
                </div>
                <div className="text-xl font-black tabular-nums" style={{ fontFamily: 'Georgia, serif' }}>{mk.nda_count}건</div>
              </div>
              <div className="bg-[var(--color-surface-elevated)] p-3" style={{ borderTop: '2px solid #059669' }}>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-muted)] mb-1.5">
                  <Phone size={11} /> 상담 수 (운영자 입력)
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    value={consultDraft}
                    onChange={e => setConsultDraft(e.target.value)}
                    className="w-16 px-2 py-1 text-base font-black tabular-nums border border-[var(--color-border-default)] bg-transparent text-[var(--color-text-primary)]"
                  />
                  <button
                    onClick={() => { setMk(prev => ({ ...prev, consult_count: Number(consultDraft) || 0 })); void saveMk({ consult_count: Number(consultDraft) || 0 }) }}
                    className="px-2.5 py-1 text-[11px] font-bold text-white"
                    style={{ background: '#0A1628', borderTop: '2px solid #2251FF', border: 'none', cursor: 'pointer' }}
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
