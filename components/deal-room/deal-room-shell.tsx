/**
 * DealRoomShell — 딜룸 3-Zone 그리드 (DR-2b · 2026-04-21, DR-2d 리팩터 · 2026-04-21)
 *
 * 계획서 §4.1 참조: 좌(요약) · 중(행동) · 우(협상).
 *
 * ⚠️ DR-2d: 페이지 wrapper(min-h-screen, max-width, padding)는 부모 책임.
 * 이 컴포넌트는 "순수 3-Zone 그리드"만 담당 — 헤더는 부모가 상위에서 렌더.
 *
 * Desktop (≥1024px): 3-col (minmax(260px,320px) · 1fr · minmax(320px,400px))
 * Tablet  (≤1024px): 2-col (좌+중), 채팅은 전폭으로 하단에 스택
 * Mobile  (≤768px):  세로 스택
 */

"use client"

import { ReactNode } from "react"

export interface DealRoomShellProps {
  /** 좌측 — 딜 요약 */
  summary: ReactNode
  /** 중앙 — Primary CTA + 부가 액션 */
  action: ReactNode
  /** 우측 — 채팅 + 문서 */
  chat: ReactNode
  /** 선택 — 3-Zone 상단 사진 갤러리 (계획서 §4.4) */
  media?: ReactNode
  /** 선택 — 3-Zone 하단 Data Room PDF 뷰어 (계획서 §4.5) */
  dataRoom?: ReactNode
}

export function DealRoomShell({ summary, action, chat, media, dataRoom }: DealRoomShellProps) {
  return (
    <>
      {/* 매물 사진 갤러리 (선택) */}
      {media && <div className="mb-4">{media}</div>}

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
      {dataRoom && <div className="mt-4">{dataRoom}</div>}

      {/* 반응형 override */}
      <style jsx>{`
        @media (max-width: 1024px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: minmax(240px, 300px) 1fr !important;
          }
          :global(.dr-pane-right) {
            grid-column: 1 / -1;
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
    </>
  )
}
