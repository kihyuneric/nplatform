/**
 * DealChatPane — 우측 "실시간 협상" 영역 (DR-2b, 2026-04-21)
 *
 * 상시 열려 있는 채팅 + 문서 목록. 계획서 §4.1 참조:
 * - 상단: 상대방 presence (이름 · 온라인)
 * - 중앙: 메시지 리스트 (최근 3~5건, 스크롤)
 * - 하단: 문서 리스트 (NDA·권리분석 등)
 *
 * 실제 Supabase Realtime 연동은 기존 useDealMessages / useDealPresence 재사용.
 * 이 컴포넌트는 presentational — 부모가 데이터·핸들러 주입.
 */

"use client"

import { FormEvent, ReactNode } from "react"
import { Send, FileCheck, Clock, Paperclip, Circle } from "lucide-react"

export interface ChatMessage {
  id: string
  author: string
  body: string
  sentAt: string         // 사람이 읽는 시각 ("방금" "2분 전" 등)
  mine?: boolean
}

export interface ChatDocument {
  id: string
  name: string
  status: "signed" | "pending" | "uploaded"   // ✓ / ⏳ / 📎
  href?: string
}

export interface ChatPartner {
  name: string
  role: string           // 예: "매도자 담당자"
  online: boolean
  avatar?: string        // 이니셜 텍스트 또는 이미지 URL
}

export interface DealChatPaneProps {
  partner: ChatPartner
  messages: ChatMessage[]
  documents: ChatDocument[]
  onSend: (text: string) => void
  onDocumentClick?: (doc: ChatDocument) => void
  placeholder?: string
  /** 문서 섹션 상단 slot — 예: "자료 요청하기" 버튼 */
  documentsHeaderSlot?: ReactNode
}

export function DealChatPane({
  partner,
  messages,
  documents,
  onSend,
  onDocumentClick,
  placeholder = "메시지 입력…",
  documentsHeaderSlot,
}: DealChatPaneProps) {
  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem("msg") as HTMLInputElement
    if (input?.value.trim()) {
      onSend(input.value.trim())
      input.value = ""
    }
  }

  return (
    <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-2xl flex flex-col overflow-hidden max-h-[calc(100vh-220px)] min-h-[480px]">
      {/* 상단: 상대방 */}
      <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--color-brand-mid)] to-[var(--color-brand-dark)] text-white flex items-center justify-center text-[0.8125rem] font-bold tabular-nums">
          {partner.avatar ?? partner.name.slice(0, 1)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[0.8125rem] font-semibold text-[var(--color-text-primary)] tracking-normal truncate">
            {partner.name}
          </div>
          <div className="flex items-center gap-1.5 text-[0.6875rem] text-[var(--color-text-muted)] tracking-normal">
            <Circle
              className={`w-2 h-2 ${partner.online ? "fill-[var(--color-accent-default)] text-[var(--color-accent-default)]" : "fill-[var(--color-text-muted)] text-[var(--color-text-muted)]"}`}
            />
            {partner.role} · {partner.online ? "온라인" : "오프라인"}
          </div>
        </div>
      </div>

      {/* 중앙: 메시지 */}
      <ol className="flex-1 overflow-y-auto p-3 space-y-2.5" aria-label="채팅 메시지">
        {messages.length === 0 ? (
          <li className="text-center py-8 text-[0.75rem] text-[var(--color-text-muted)] tracking-normal">
            아직 메시지가 없습니다. 첫 메시지를 보내 협상을 시작하세요.
          </li>
        ) : (
          messages.map((m) => (
            <li key={m.id} className={m.mine ? "flex justify-end" : "flex justify-start"}>
              <div className="max-w-[78%]">
                {!m.mine && (
                  <div className="text-[0.6875rem] text-[var(--color-text-muted)] mb-0.5 tracking-normal">
                    {m.author}
                  </div>
                )}
                <div
                  className={[
                    "rounded-2xl px-3 py-2 text-[0.8125rem] leading-relaxed tracking-normal break-words",
                    m.mine
                      ? "bg-[var(--color-brand-dark)] text-white rounded-br-md"
                      : "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] rounded-bl-md",
                  ].join(" ")}
                >
                  {m.body}
                </div>
                <div className="text-[0.6875rem] text-[var(--color-text-muted)] mt-0.5 tracking-normal text-right">
                  {m.sentAt}
                </div>
              </div>
            </li>
          ))
        )}
      </ol>

      {/* 문서 목록 */}
      <div className="border-t border-[var(--color-border-subtle)] px-3 py-2.5 space-y-1.5 max-h-[200px] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[0.6875rem] font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            문서 ({documents.length})
          </h3>
          {documentsHeaderSlot}
        </div>
        {documents.length === 0 ? (
          <p className="text-[0.6875rem] text-[var(--color-text-muted)] text-center py-2 tracking-normal">
            공유된 문서가 없습니다
          </p>
        ) : (
          documents.map((d) => (
            <button
              key={d.id}
              onClick={() => onDocumentClick?.(d)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-surface-overlay)] transition-colors text-left"
              aria-label={`${d.name} 열기`}
            >
              <span className="flex-shrink-0" aria-hidden="true">
                {d.status === "signed" && <FileCheck className="w-3.5 h-3.5 text-[var(--color-accent-default)]" />}
                {d.status === "pending" && <Clock className="w-3.5 h-3.5 text-amber-500" />}
                {d.status === "uploaded" && <Paperclip className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />}
              </span>
              <span className="text-[0.75rem] text-[var(--color-text-secondary)] truncate flex-1 tracking-normal">
                {d.name}
              </span>
            </button>
          ))
        )}
      </div>

      {/* 입력 */}
      <form onSubmit={handleSubmit} className="border-t border-[var(--color-border-subtle)] p-2.5 flex items-center gap-2">
        <input
          type="text"
          name="msg"
          placeholder={placeholder}
          className="flex-1 px-3 py-2 rounded-xl bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] text-[0.8125rem] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-brand-mid)] tracking-normal"
          autoComplete="off"
        />
        <button
          type="submit"
          className="w-9 h-9 rounded-xl bg-[var(--color-brand-dark)] text-white flex items-center justify-center hover:bg-[var(--color-brand-mid)] transition-colors flex-shrink-0"
          aria-label="메시지 전송"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
