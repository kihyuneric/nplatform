'use client'

/**
 * DetailPane — 매물 세부내역 우측 패널 / 모달 (D0·D6 · 2026-08-18)
 *
 * 정책: 상세는 별도 화면 이동 없이 리스트 위에서 확인.
 *   - 넓은 화면: 우측 슬라이드 패널 (리스트가 왼쪽에 남아 2단 프레임처럼 동작)
 *   - 좁은 화면: 전체 폭 모달
 * 내용은 기존 /listing-detail/[id] (표준탬플릿 40필드 · 수정/엑셀/인쇄)를 임베드 —
 * 로직 중복 없이 동일 기능 제공. 헤더에서 새 탭 전체 화면도 열 수 있음.
 */

import { useEffect, useState } from 'react'
import { X, ExternalLink } from 'lucide-react'

export function DetailPane({
  listingId,
  listingNo,
  viewerMode = false,
  onClose,
}: {
  listingId: string
  /** 관리번호 (N26-1). 넘기지 않으면 이 컴포넌트가 직접 조회한다. */
  listingNo?: string | null
  /** 매입 회원 열람 모드 (NDA 게이트 · 기관/담당자 제외) */
  viewerMode?: boolean
  onClose: () => void
}) {
  const src = `/listing-detail/${encodeURIComponent(listingId)}${viewerMode ? '?mode=view' : ''}`

  // 헤더에 UUID 가 그대로 노출되던 문제 수정 — 관리번호로 표시 (2026-08-19)
  const [no, setNo] = useState<string>(listingNo ?? '')
  useEffect(() => {
    if (listingNo) { setNo(listingNo); return }
    let alive = true
    import('@/lib/supabase/client')
      .then(({ createClient }) =>
        createClient().from('npl_listings').select('listing_no').eq('id', listingId).maybeSingle()
      )
      .then(({ data }) => { if (alive && data?.listing_no) setNo(String(data.listing_no)) })
      .catch(() => { /* 조회 실패 시 번호 없이 표시 */ })
    return () => { alive = false }
  }, [listingId, listingNo])

  // ESC 로 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[300] flex justify-end"
      style={{ background: 'rgba(5, 28, 44, 0.45)' }}
      onClick={onClose}
    >
      {/* 우측 패널 — 좁은 화면에서는 전체 폭 */}
      <div
        className="h-full w-full md:w-[760px] md:max-w-[85vw] flex flex-col bg-[var(--color-surface-elevated)]"
        style={{ borderLeft: '3px solid #2251FF', boxShadow: '-24px 0 48px -12px rgba(5, 28, 44, 0.35)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)] shrink-0">
          <div>
            <div className="text-[13px] font-black text-[var(--color-text-primary)]">NPL 세부내역</div>
            <div className="text-[11px] font-mono font-bold text-[#1A47CC]">{no || '관리번호 확인 중…'}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <a href={src} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold border border-[var(--color-border-default)] text-[var(--color-text-primary)]"
              style={{ textDecoration: 'none' }}>
              <ExternalLink size={11} /> 전체 화면
            </a>
            <button onClick={onClose} aria-label="닫기"
              className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        </div>
        {/* 세부내역 임베드 — 수정 · 저장 · 엑셀 · 인쇄 동일 동작 */}
        <iframe src={src} title="NPL 세부내역" className="flex-1 w-full" style={{ border: 'none' }} />
      </div>
    </div>
  )
}
