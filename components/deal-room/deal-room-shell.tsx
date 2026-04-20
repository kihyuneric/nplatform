/**
 * DealRoomShell — 딜룸 3-Zone 레이아웃 셸 (DR-2b, 2026-04-21)
 *
 * 계획서 §4.1 참조: 좌(요약) · 중(행동) · 우(협상).
 * Desktop: 3-column grid (minmax(260px, 320px) · 1fr · minmax(320px, 400px))
 * Tablet  (≤900px): 2-column (left+center, chat는 하단 탭 전환)
 * Mobile  (≤560px): 세로 스택 · Sticky Bottom CTA 는 DR-4 에서 추가
 */

"use client"

import { ReactNode } from "react"

export interface DealRoomShellProps {
  /** 상단 헤더 (스텝퍼·진행률·breadcrumb) */
  header: ReactNode
  /** 좌측 — 딜 요약 */
  summary: ReactNode
  /** 중앙 — Primary CTA + 부가 액션 */
  action: ReactNode
  /** 우측 — 채팅 + 문서 */
  chat: ReactNode
  /** 선택 — 상단 사진 갤러리 (계획서 §4.4) */
  media?: ReactNode
  /** 선택 — 하단 Data Room PDF 뷰어 카드 (계획서 §4.5) */
  dataRoom?: ReactNode
}

export function DealRoomShell({ header, summary, action, chat, media, dataRoom }: DealRoomShellProps) {
  return (
    <div className="min-h-screen bg-[var(--color-surface-sunken)]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-24 md:pb-8">
        {/* 상단 헤더 */}
        <div className="mb-4">{header}</div>

        {/* 매물 사진 갤러리 (선택) */}
        {media && <div className="mb-6">{media}</div>}

        {/* 3-Zone Grid */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "minmax(260px, 320px) 1fr minmax(320px, 400px)",
          }}
        >
          <aside aria-label="딜 요약" className="dr-pane dr-pane-left">
            {summary}
          </aside>
          <section aria-label="지금 할 일" className="dr-pane dr-pane-center">
            {action}
          </section>
          <aside aria-label="실시간 협상" className="dr-pane dr-pane-right">
            {chat}
          </aside>
        </div>

        {/* Data Room (선택) — 3-Zone 아래 전폭 */}
        {dataRoom && <div className="mt-6">{dataRoom}</div>}

        {/* 반응형 override */}
        <style jsx>{`
          @media (max-width: 1024px) {
            :global(.dr-pane-right) {
              grid-column: 1 / -1;
            }
            div[style*="grid-template-columns"] {
              grid-template-columns: minmax(260px, 320px) 1fr !important;
            }
          }
          @media (max-width: 768px) {
            div[style*="grid-template-columns"] {
              grid-template-columns: 1fr !important;
            }
            :global(.dr-pane-left),
            :global(.dr-pane-center),
            :global(.dr-pane-right) {
              grid-column: 1 / -1;
            }
          }
        `}</style>
      </div>
    </div>
  )
}
