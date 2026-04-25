/**
 * InlineDealRoom — 자산 상세 페이지 인라인 딜룸 (DR-5 · 2026-04-21)
 *
 * L1 개인인증 이후 표시. 좌측 채팅 + 우측 상대방 정보 카드 2-col 구성.
 *
 * - L0        : 렌더되지 않음 (페이지에서 조건 분기)
 * - L1        : 채팅 전송 허용, 상대방 기관 마스킹
 * - L2 (NDA)  : 매각자 기관명 공개
 * - L4 (서명) : 연락처 완전 공개
 *
 * 기존 Deal Room 메시지 디자인 톤(다크 · 실시간 배지 · WiFi 아이콘)을 인라인으로 채택.
 */

"use client"

import { useState, FormEvent } from "react"
import { MessageSquare, Paperclip, Phone, Send, Star, Wifi } from "lucide-react"
import type { AssetTier } from "@/hooks/use-asset-tier"

export interface InlineDealRoomCounterpart {
  name: string
  role: string
  /** 아바타 이니셜 한 글자 */
  initial: string
  /** 전화번호 — 내부적으로 tier에 따라 마스킹 */
  phone: string
  /** 조직/기관명 — L2부터 공개 */
  organization?: string
}

export interface InlineDealRoomMessage {
  id: string
  author: string
  body: string
  sentAt: string
  mine?: boolean
}

export interface InlineDealRoomProps {
  tier: AssetTier
  counterpart: InlineDealRoomCounterpart
  /** 초기 메시지 (데모용 · 서버 연동 시 overwrite) */
  initialMessages?: InlineDealRoomMessage[]
  /** 메시지 전송 핸들러 — 생략 시 로컬 state에만 반영 */
  onSend?: (text: string) => void | Promise<void>
}

function maskPhone(raw: string, tier: AssetTier): string {
  if (tier === "L4" || tier === "L5") return raw
  if (tier === "L2" || tier === "L3") {
    // 02-1234-5678 → 02-****-5678
    return raw.replace(/(\d{2,4})-(\d{3,4})-(\d{4})/, "$1-****-$3")
  }
  return "02-***-****"
}

export function InlineDealRoom({
  tier,
  counterpart,
  initialMessages = [],
  onSend,
}: InlineDealRoomProps) {
  const [messages, setMessages] = useState<InlineDealRoomMessage[]>(initialMessages)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  const canSend = tier !== "L0" // L1부터 전송 가능
  const showOrg = tier === "L2" || tier === "L3" || tier === "L4" || tier === "L5"

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const text = draft.trim()
    if (!text || !canSend || sending) return
    setSending(true)
    try {
      const msg: InlineDealRoomMessage = {
        id: `local-${Date.now()}`,
        author: "나",
        body: text,
        sentAt: "방금",
        mine: true,
      }
      setMessages((prev) => [...prev, msg])
      setDraft("")
      await onSend?.(text)
    } finally {
      setSending(false)
    }
  }

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #0F1E35 0%, #122843 100%)",
        border: "1px solid rgba(46, 117, 182, 0.32)",
        boxShadow: "0 8px 32px rgba(27, 58, 92, 0.20)",
        color: "var(--fg-on-brand)",
      }}
      aria-label="인라인 딜룸"
    >
      <header
        className="flex items-center justify-between gap-3 flex-wrap"
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(46, 117, 182, 0.24)",
        }}
      >
        <h3 className="font-black inline-flex items-center gap-2" style={{ fontSize: 14 }}>
          <MessageSquare size={16} style={{ color: "var(--color-brand-bright)" }} />
          인라인 딜룸
        </h3>
        <div
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold"
          style={{
            fontSize: 10,
            backgroundColor: "rgba(20,22,26, 0.16)",
            color: "var(--color-positive)",
            border: "1px solid rgba(20,22,26, 0.36)",
          }}
        >
          <Wifi size={11} />
          실시간 연결
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* ── 좌측: 채팅 ── */}
        <div
          className="flex flex-col"
          style={{
            minHeight: 360,
            borderRight: "1px solid rgba(46, 117, 182, 0.24)",
          }}
        >
          {/* 메시지 리스트 */}
          <ol
            className="flex-1 p-4 space-y-2.5 overflow-y-auto"
            style={{ maxHeight: 360 }}
            aria-label="메시지 목록"
          >
            {messages.length === 0 ? (
              <li className="h-full min-h-[240px] flex flex-col items-center justify-center gap-2 text-center">
                <div
                  className="w-10 h-10 rounded-2xl inline-flex items-center justify-center"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <MessageSquare size={18} style={{ color: "rgba(255,255,255,0.4)" }} />
                </div>
                <div
                  className="font-semibold"
                  style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}
                >
                  아직 메시지가 없습니다
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                  첫 메시지를 보내 대화를 시작하세요
                </div>
              </li>
            ) : (
              messages.map((m) => (
                <li key={m.id} className={m.mine ? "flex justify-end" : "flex justify-start"}>
                  <div className="max-w-[78%]">
                    {!m.mine && (
                      <div
                        className="mb-0.5"
                        style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}
                      >
                        {m.author}
                      </div>
                    )}
                    <div
                      className="rounded-2xl px-3 py-2 leading-relaxed break-words"
                      style={{
                        fontSize: 13,
                        backgroundColor: m.mine
                          ? "var(--color-brand-bright)"
                          : "rgba(255,255,255,0.06)",
                        color: m.mine ? "var(--fg-on-brand)" : "var(--fg-on-brand)",
                        border: m.mine
                          ? "1px solid rgba(46, 117, 182, 0.6)"
                          : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {m.body}
                    </div>
                    <div
                      className="text-right mt-0.5"
                      style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}
                    >
                      {m.sentAt}
                    </div>
                  </div>
                </li>
              ))
            )}
          </ol>

          {/* 입력 */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2"
            style={{
              padding: "10px 12px",
              borderTop: "1px solid rgba(46, 117, 182, 0.24)",
              backgroundColor: "rgba(0,0,0,0.12)",
            }}
          >
            <button
              type="button"
              className="w-9 h-9 rounded-xl inline-flex items-center justify-center transition-colors"
              style={{
                backgroundColor: "transparent",
                color: "rgba(255,255,255,0.5)",
              }}
              aria-label="파일 첨부"
              disabled={!canSend}
            >
              <Paperclip size={16} />
            </button>
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={canSend ? "메시지를 입력하세요…" : "로그인 후 메시지 전송이 가능합니다"}
              disabled={!canSend || sending}
              className="flex-1 rounded-xl outline-none transition-colors"
              style={{
                padding: "9px 14px",
                fontSize: 13,
                backgroundColor: "rgba(255,255,255,0.04)",
                color: "var(--fg-on-brand)",
                border: "1px solid rgba(255,255,255,0.10)",
              }}
            />
            <button
              type="submit"
              disabled={!canSend || sending || !draft.trim()}
              className="w-9 h-9 rounded-xl inline-flex items-center justify-center transition-colors disabled:opacity-40"
              style={{
                backgroundColor: "var(--color-brand-bright)",
                color: "var(--fg-on-brand)",
              }}
              aria-label="메시지 전송"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        {/* ── 우측: 상대방 정보 ── */}
        <div className="p-4 space-y-3">
          <div
            className="inline-flex items-center gap-1.5 font-semibold"
            style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}
          >
            <Star size={12} style={{ color: "var(--color-brand-bright)" }} />
            상대방 정보
          </div>

          {/* 프로필 카드 */}
          <div
            className="rounded-xl p-3.5"
            style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full inline-flex items-center justify-center font-black"
                style={{
                  fontSize: 16,
                  background: "linear-gradient(135deg, #2E75B6, #1B3A5C)",
                  color: "var(--fg-on-brand)",
                }}
                aria-hidden
              >
                {counterpart.initial}
              </div>
              <div className="min-w-0">
                <div
                  className="font-black truncate"
                  style={{ fontSize: 13, color: "var(--fg-on-brand)" }}
                >
                  {counterpart.name}
                </div>
                <div
                  className="font-semibold"
                  style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}
                >
                  {counterpart.role}
                  {showOrg && counterpart.organization && (
                    <> · {counterpart.organization}</>
                  )}
                </div>
              </div>
            </div>

            {/* 연락처 */}
            <div
              className="mt-3 rounded-lg inline-flex items-center gap-2 w-full"
              style={{
                padding: "8px 10px",
                backgroundColor: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontSize: 12,
                color: "rgba(255,255,255,0.75)",
              }}
            >
              <Phone size={12} style={{ color: "rgba(255,255,255,0.55)" }} />
              <span className="font-mono tabular-nums">
                {maskPhone(counterpart.phone, tier)}
              </span>
            </div>
          </div>

          {/* 메시지 보내기 보조 CTA */}
          <button
            type="button"
            onClick={() => {
              const input = document.querySelector<HTMLInputElement>(
                'section[aria-label="인라인 딜룸"] input[type="text"]'
              )
              input?.focus()
            }}
            disabled={!canSend}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl font-black transition-opacity disabled:opacity-40"
            style={{
              padding: "11px 14px",
              fontSize: 13,
              backgroundColor: "var(--color-brand-bright)",
              color: "var(--fg-on-brand)",
            }}
          >
            <Send size={14} />
            메시지 보내기
          </button>

          {!canSend && (
            <p
              className="leading-relaxed"
              style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}
            >
              개인인증(L1) 완료 후 실시간 채팅으로 매도자와 직접 협상할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
