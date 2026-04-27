"use client"

/**
 * /deals/dealroom/chat — 채팅 전용 풀페이지
 *
 * 좌: 매수자 리스트 (스크롤)
 * 우: 활성 매수자 채팅 thread + 자유 입력 (보내고 받기 자유롭게)
 *
 * 룰셋:
 *   R1~R4: 워크플로우 이벤트 자동 기록 (system 메시지)
 *   P1: 전화번호 입력 시 차단 + 경고
 *
 * 동기화:
 *   - 매도사·매수자 대시보드에서 동일 thread_id 로 조회 가능
 *   - "역할 전환" 토글: 매도자 / 매수자 시점에서 메시지를 보낼 수 있음 (시연용)
 */

import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import {
  ArrowLeft, MessageSquare, Wifi, Bell, Lock, Send, Paperclip,
  Shield, AlertCircle, FileText, ExternalLink,
} from "lucide-react"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"
import {
  type ChatMessage,
  type BuyerThread,
  detectPII,
  INITIAL_BUYER_THREADS,
  nowHHMM,
} from "../_chat-data"

export default function ChatPage() {
  // ── 매수자 리스트 + 활성 thread ──
  const [threads, setThreads] = useState<BuyerThread[]>(INITIAL_BUYER_THREADS)
  const [activeId, setActiveId] = useState<string>(threads[0].id)
  // ── 입력 ──
  const [draft, setDraft] = useState<string>("")
  const [asRole, setAsRole] = useState<"seller" | "buyer">("seller")
  const piiCheck = detectPII(draft)
  const blocked = piiCheck.hasPhone

  const activeThread = threads.find(t => t.id === activeId) ?? threads[0]
  const messagesRef = useRef<HTMLDivElement>(null)

  // 스레드 변경 또는 새 메시지 추가 시 스크롤 하단으로
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [activeThread.messages.length, activeId])

  // 메시지 전송 — 역할(seller/buyer) 기반으로 활성 thread 에 push
  function sendMessage() {
    const text = draft.trim()
    if (!text || blocked) return
    const author = asRole === "seller" ? "○○은행 김 팀장" : activeThread.buyerName
    const role: "매도자" | "매수자" = asRole === "seller" ? "매도자" : "매수자"
    const newMsg: ChatMessage = {
      id: Date.now(),
      type: asRole,
      author,
      role,
      time: nowHHMM(),
      text,
    }
    setThreads(prev => prev.map(t =>
      t.id === activeId
        ? {
            ...t,
            messages: [...t.messages, newMsg],
            lastSnippet: text,
            lastTime: nowHHMM(),
            unread: 0,
          }
        : t
    ))
    setDraft("")
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{
      // 부모 (main)/deals layout 의 Navigation + SubNav + Footer + ChatWidget overlay 를
      // 가리고 viewport 전체를 점유 — 입력 영역이 항상 접근 가능하도록 보장
      position: "fixed",
      inset: 0,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      background: MCK.paperTint,
      overflow: "hidden",
    }}>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header style={{
        background: MCK.paper,
        borderBottom: `1px solid ${MCK.border}`,
        borderTop: `2px solid ${MCK.electric}`,
        padding: "10px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10,
      }}>
        <div className="flex items-center gap-3">
          <Link
            href="/deals/dealroom"
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "6px 11px", fontSize: 11, fontWeight: 700,
              color: MCK.ink, background: MCK.paper,
              border: `1px solid ${MCK.borderStrong}`,
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={12} style={{ color: MCK.ink }} />
            딜룸으로
          </Link>
          <div>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 2 }}>
              SECURE CHAT · DETACHED VIEW
            </div>
            <h1 style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em" }}>
              강남구 아파트 NPL 채권 · 보안 채팅
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* 역할 전환 토글 */}
          <div style={{
            display: "inline-flex",
            border: `1px solid ${MCK.borderStrong}`,
          }}>
            {(["seller", "buyer"] as const).map(r => {
              const active = asRole === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAsRole(r)}
                  className={active ? "mck-cta-dark" : ""}
                  style={{
                    padding: "7px 14px", fontSize: 11, fontWeight: 800,
                    background: active ? MCK.ink : MCK.paper,
                    color: active ? MCK.paper : MCK.ink,
                    border: "none",
                    cursor: "pointer", letterSpacing: "-0.005em",
                  }}
                >
                  <span style={{ color: active ? MCK.paper : MCK.ink }}>
                    {r === "seller" ? "매도자 시점" : "매수자 시점"}
                  </span>
                </button>
              )
            })}
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "5px 10px", fontSize: 10, fontWeight: 800,
            color: "#1A47CC", background: "rgba(34, 81, 255, 0.08)",
            border: "1px solid rgba(34, 81, 255, 0.30)",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            <Wifi size={10} style={{ color: "#1A47CC" }} />
            <span style={{ color: "#1A47CC" }}>실시간</span>
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "5px 10px", fontSize: 10, fontWeight: 800,
            color: "#A53F00", background: "rgba(255, 140, 0, 0.08)",
            border: "1px solid rgba(255, 140, 0, 0.35)",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            <Shield size={10} style={{ color: "#A53F00" }} />
            <span style={{ color: "#A53F00" }}>전화번호 차단</span>
          </span>
        </div>
      </header>

      {/* ── 본문 2-col grid ─────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        minHeight: 0,
      }}>
        {/* ─── LEFT · 매수자 리스트 ─────────────────────────────── */}
        <aside style={{
          background: MCK.paper,
          borderRight: `1px solid ${MCK.border}`,
          display: "flex", flexDirection: "column",
          minHeight: 0,
        }}>
          <div style={{
            padding: "14px 16px",
            borderBottom: `1px solid ${MCK.border}`,
            background: MCK.paperTint,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 2 }}>
                매수자 채팅
              </div>
              <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800, color: MCK.ink }}>
                {threads.length} 건 · thread 분리
              </div>
            </div>
            <Bell size={14} style={{ color: MCK.textMuted }} />
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {threads.map(t => {
              const isActive = t.id === activeId
              const statusColor =
                t.status === "loi-pending" ? "#1A47CC" :
                t.status === "active" ? "#0075B0" :
                MCK.textMuted
              const statusLabel =
                t.status === "loi-pending" ? "LOI 대기" :
                t.status === "active" ? "협의 중" :
                "응답 지연"
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  style={{
                    width: "100%", textAlign: "left",
                    padding: "14px 16px",
                    background: isActive ? "rgba(34, 81, 255, 0.06)" : "transparent",
                    borderLeft: isActive ? `3px solid ${MCK.electric}` : `3px solid transparent`,
                    borderBottom: `1px solid ${MCK.border}`,
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", gap: 5,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                    <div className="flex items-center gap-2" style={{ minWidth: 0, flex: 1 }}>
                      <span
                        className={isActive ? "mck-cta-dark" : ""}
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 28, height: 28,
                          background: isActive ? MCK.ink : MCK.paperTint,
                          color: isActive ? MCK.paper : MCK.ink,
                          fontSize: 10, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                          flexShrink: 0,
                        }}
                      >
                        <span style={{ color: isActive ? MCK.paper : MCK.ink }}>{t.buyerCode}</span>
                      </span>
                      <span style={{
                        fontFamily: MCK_FONTS.serif,
                        fontSize: 13, fontWeight: 800,
                        color: MCK.ink, letterSpacing: "-0.005em",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {t.buyerName}
                      </span>
                    </div>
                    {t.unread > 0 && (
                      <span
                        className="mck-cta-dark"
                        style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          minWidth: 18, height: 18, padding: "0 6px",
                          fontSize: 10, fontWeight: 800,
                          background: MCK.electric, color: MCK.paper,
                        }}
                      >
                        <span style={{ color: MCK.paper }}>{t.unread}</span>
                      </span>
                    )}
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", alignSelf: "flex-start",
                    padding: "1px 7px", fontSize: 9, fontWeight: 800,
                    color: statusColor,
                    background: `${statusColor}1A`,
                    border: `1px solid ${statusColor}40`,
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                    <span style={{ color: statusColor }}>{statusLabel}</span>
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
                    <span style={{
                      fontSize: 11, color: MCK.textSub, fontWeight: 500,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      flex: 1, minWidth: 0,
                    }}>
                      {t.lastSnippet}
                    </span>
                    <span style={{
                      fontSize: 9, color: MCK.textMuted, fontWeight: 600,
                      flexShrink: 0, fontVariantNumeric: "tabular-nums",
                    }}>
                      {t.lastTime}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 500 }}>
                    {t.institution}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 룰셋 안내 (좌측 footer) */}
          <div style={{
            padding: "10px 14px",
            borderTop: `1px solid ${MCK.border}`,
            background: MCK.paperTint,
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: "#1A47CC", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              ● 자동 기록 룰셋
            </div>
            <div style={{ fontSize: 10, color: MCK.textSub, lineHeight: 1.45 }}>
              인증 · NDA · LOI · ESCROW 단계가 채팅에 자동 기록됩니다.
            </div>
          </div>
        </aside>

        {/* ─── RIGHT · 채팅 ───────────────────────────────────── */}
        <main style={{
          background: MCK.paper,
          display: "flex", flexDirection: "column",
          minHeight: 0,
        }}>
          {/* 활성 thread sub-header */}
          <div style={{
            padding: "12px 22px",
            background: MCK.paper,
            borderBottom: `1px solid ${MCK.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 10, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>
                현재 스레드 · {activeThread.buyerCode}
              </div>
              <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em" }}>
                {activeThread.buyerName}
                <span style={{ fontSize: 11, fontWeight: 600, color: MCK.textSub, marginLeft: 8 }}>
                  · {activeThread.institution}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 600 }}>
                매도사 ↔ 매수자 대시보드 동기화
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                padding: "3px 8px", fontSize: 9, fontWeight: 800,
                color: asRole === "seller" ? "#1A47CC" : "#0075B0",
                background: asRole === "seller" ? "rgba(34, 81, 255, 0.10)" : "rgba(0, 169, 244, 0.12)",
                border: `1px solid ${asRole === "seller" ? "rgba(34, 81, 255, 0.35)" : "rgba(0, 169, 244, 0.40)"}`,
                letterSpacing: "0.06em", textTransform: "uppercase",
              }}>
                <span style={{ color: asRole === "seller" ? "#1A47CC" : "#0075B0" }}>
                  내 시점 · {asRole === "seller" ? "매도자" : "매수자"}
                </span>
              </span>
            </div>
          </div>

          {/* Messages — system 메시지 제외, 매도자/매수자 대화만 표시 */}
          <div ref={messagesRef} style={{
            flex: 1,
            padding: "20px 24px",
            display: "flex", flexDirection: "column", gap: 14,
            overflowY: "auto",
          }}>
            {activeThread.messages.filter(m => m.type !== "system").map(msg => (
              <ChatBubbleStandalone key={msg.id} msg={msg} />
            ))}
          </div>

          {/* PII 경고 */}
          {blocked && (
            <div style={{
              padding: "10px 22px",
              background: "rgba(255, 140, 0, 0.08)",
              borderTop: `1px solid rgba(255, 140, 0, 0.35)`,
              display: "flex", alignItems: "flex-start", gap: 8,
            }}>
              <AlertCircle size={14} style={{ color: "#A53F00", marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#A53F00", marginBottom: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  <span style={{ color: "#A53F00" }}>전화번호 입력 차단</span>
                </div>
                <div style={{ fontSize: 11, color: MCK.ink, lineHeight: 1.5, fontWeight: 500 }}>
                  감지된 패턴: <code style={{ background: "rgba(165, 63, 0, 0.10)", color: "#A53F00", padding: "1px 4px", fontSize: 11, fontWeight: 800 }}>{piiCheck.matched}</code> · 전화번호는 채팅에 노출할 수 없습니다.
                </div>
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: "12px 22px",
            borderTop: `1px solid ${MCK.border}`,
            background: MCK.paperTint,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <button type="button" style={{
              width: 38, height: 38, display: "inline-flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: `1px solid ${MCK.border}`, color: MCK.textMuted, cursor: "pointer",
            }} aria-label="파일 첨부">
              <Paperclip size={14} style={{ color: MCK.textMuted }} />
            </button>
            <input
              type="text"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`${activeThread.buyerName} 에게 ${asRole === "seller" ? "매도자" : "매수자"} 시점에서 메시지… (Enter 전송 · 전화번호 차단)`}
              autoFocus
              style={{
                flex: 1, padding: "11px 14px", fontSize: 13,
                background: blocked ? "rgba(255, 140, 0, 0.05)" : MCK.paper,
                color: MCK.ink,
                border: blocked ? `1px solid #A53F00` : `1px solid ${MCK.borderStrong}`,
                outline: "none",
              }}
            />
            <button
              type="button"
              disabled={blocked || draft.trim().length === 0}
              onClick={sendMessage}
              className={blocked || draft.trim().length === 0 ? "" : "mck-cta-dark"}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "11px 18px", fontSize: 12, fontWeight: 800,
                background: blocked ? "#D6D6D6" : draft.trim().length === 0 ? MCK.paperDeep : MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: blocked || draft.trim().length === 0 ? `2px solid #D6D6D6` : `2px solid ${MCK.electric}`,
                cursor: blocked || draft.trim().length === 0 ? "not-allowed" : "pointer",
                opacity: blocked || draft.trim().length === 0 ? 0.55 : 1,
                letterSpacing: "-0.005em",
              }}
              aria-label="전송"
            >
              <Send size={13} style={{ color: blocked ? "#888" : MCK.paper }} />
              <span style={{ color: blocked ? "#888" : MCK.paper }}>전송</span>
            </button>
          </div>

          {/* Footer */}
          <div style={{
            padding: "8px 22px",
            background: MCK.paper,
            borderTop: `1px solid ${MCK.border}`,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Lock size={11} style={{ color: MCK.electric }} />
            <span style={{ fontSize: 10, color: MCK.textSub, fontWeight: 600 }}>
              <strong style={{ color: MCK.ink, fontWeight: 800 }}>NDA 범위</strong> 내 열람 · 매도사·매수자 대시보드에서 조회 가능 · 워크플로우 자동 기록 · 전화번호 차단.
            </span>
          </div>
        </main>
      </div>
    </div>
  )
}

/* ─── 채팅 버블 (자체 정의 — page.tsx 의 ChatBubble 과 시각적 동일) ─── */
function ChatBubbleStandalone({ msg }: { msg: ChatMessage }) {
  if (msg.type === "system") {
    return (
      <div style={{
        alignSelf: "stretch", textAlign: "center",
        padding: "10px 14px",
        background: "rgba(34, 81, 255, 0.06)",
        border: "1px solid rgba(34, 81, 255, 0.20)",
        borderLeft: `3px solid ${MCK.electric}`,
      }}>
        <div style={{ ...MCK_TYPE.eyebrow, color: "#1A47CC", marginBottom: 3 }}>
          {msg.author} · {msg.time}
        </div>
        <div style={{ fontSize: 12, color: MCK.ink, lineHeight: 1.5, fontWeight: 600 }}>
          {msg.text}
        </div>
      </div>
    )
  }

  const isBuyer = msg.type === "buyer"
  const align = isBuyer ? "flex-end" : "flex-start"
  const bubbleBg = isBuyer ? MCK.ink : MCK.paper
  const bubbleFg = isBuyer ? MCK.paper : MCK.ink
  const bubbleBorder = isBuyer ? MCK.ink : MCK.borderStrong

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: align, maxWidth: "70%", alignSelf: align, gap: 3,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 2,
        flexDirection: isBuyer ? "row-reverse" : "row",
      }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: MCK.ink }}>{msg.author}</span>
        <span style={{
          display: "inline-flex", alignItems: "center",
          padding: "1px 6px", fontSize: 9, fontWeight: 800,
          background: isBuyer ? "rgba(0, 169, 244, 0.12)" : "rgba(34, 81, 255, 0.10)",
          color: isBuyer ? "#0075B0" : "#1A47CC",
          border: `1px solid ${isBuyer ? "rgba(0, 169, 244, 0.35)" : "rgba(34, 81, 255, 0.30)"}`,
          letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          <span style={{ color: isBuyer ? "#0075B0" : "#1A47CC" }}>{msg.role}</span>
        </span>
      </div>
      <div
        className={isBuyer ? "mck-cta-dark" : ""}
        style={{
          padding: "10px 14px",
          background: bubbleBg, color: bubbleFg,
          border: `1px solid ${bubbleBorder}`,
          borderTop: isBuyer ? `2px solid ${MCK.electric}` : `1px solid ${bubbleBorder}`,
          fontSize: 13, lineHeight: 1.55, fontWeight: 500,
        }}
      >
        <span style={{ color: bubbleFg }}>{msg.text}</span>
        {msg.attachment && (
          <div style={{
            marginTop: 8, padding: "5px 10px",
            background: isBuyer ? "rgba(0, 169, 244, 0.18)" : MCK.paperDeep,
            border: isBuyer ? "1px solid rgba(0, 169, 244, 0.40)" : `1px solid ${MCK.border}`,
            display: "inline-flex", alignItems: "center", gap: 6,
            fontSize: 11, fontWeight: 700, color: isBuyer ? MCK.paper : MCK.ink,
          }}>
            <FileText size={11} style={{ color: isBuyer ? "#A8CDE8" : MCK.electric, flexShrink: 0 }} />
            <span style={{ color: isBuyer ? MCK.paper : MCK.ink }}>{msg.attachment}</span>
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginTop: 1 }}>
        {msg.time}
      </span>
    </div>
  )
}
