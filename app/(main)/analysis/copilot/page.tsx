"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Sparkles, RefreshCw, Send,
  BarChart3, Scale,
  Building2, Plus, Clock, MessageSquare, Paperclip, Zap,
  User as UserIcon,
} from "lucide-react"
import { toast } from "sonner"
import {
  MckPageShell,
  MckPageHeader,
  MckBadge,
  MckDemoBanner,
} from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const STARTER_CARDS = [
  {
    icon: Building2,
    label: "물건 분석",
    badge: "체험 추천",
    text: "서울 강남구 상가 경매 물건, 감정가 3억, LTV 75%, 연체 18개월 — 투자 가능한가요?",
  },
  {
    icon: BarChart3,
    label: "수익률 계산",
    badge: null,
    text: "감정가 5억 아파트 NPL, 최저가 3.5억에 낙찰받으면 수익률이 얼마나 되나요?",
  },
  {
    icon: Scale,
    label: "법률 리스크",
    badge: null,
    text: "선순위 근저당 2억에 임차인 보증금 5천만원이 있는 상가 — 배당 순서가 어떻게 되나요?",
  },
]

const RECENT_CONVOS = [
  { id: "c1", title: "강남구 상가 경매 분석", time: "2시간 전" },
  { id: "c2", title: "서울 아파트 NPL 수익률", time: "어제" },
  { id: "c3", title: "근저당 배당 순서 문의", time: "2일 전" },
  { id: "c4", title: "경매 유찰 입찰 전략", time: "3일 전" },
]

const DEMO_FALLBACK = `(데모 응답) 입력하신 조건을 검토했습니다.

[1] 시세 대비 매입가
- 감정가 3억, 시장가 추정 2.7~2.9억으로 적정 매입가는 2.0~2.2억 수준
- 연체 18개월은 신탁/배당 우선순위 검토가 필요한 구간

[2] 핵심 리스크
- 선순위 근저당 비율 (LTV 75%) → 배당 후 회수율 시뮬 필수
- 임차인 보증금 / 명도 난이도 별도 확인

[3] 권장 액션
- /analysis/profitability 에서 IRR·ROI 시뮬 실행
- /analysis/simulator 에서 낙찰가 슬라이더로 민감도 분석

* 본 응답은 네트워크 오류로 인한 데모 fallback 입니다. 실제 NPlatform AI 응답은 더 상세합니다.`

export default function NPLCopilotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages])

  const sendMessage = useCallback(async (text?: string) => {
    const userText = (text ?? input).trim()
    if (!userText || loading) return
    setInput("")
    setLoading(true)
    const userMsg: Message = { id: `u-${Date.now()}`, role: "user", content: userText, timestamp: new Date() }
    setMessages((prev) => [...prev, userMsg])
    try {
      const res = await fetch("/api/v1/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userText,
          context: {
            conversation_id: conversationId,
            history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
          },
          stream: true,
        }),
      })
      if (!res.ok) throw new Error(`${res.status}`)

      const contentType = res.headers.get("content-type") || ""
      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ""
        let buffer = ""
        let streamError: string | null = null
        const toolEvents: string[] = []
        const assistantId = `a-${Date.now()}`
        setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", timestamp: new Date() }])
        let done = false
        while (!done) {
          const { value, done: streamDone } = await reader.read()
          done = streamDone
          if (!value) continue
          buffer += decoder.decode(value, { stream: true })
          const records = buffer.split("\n\n")
          buffer = records.pop() ?? ""
          for (const record of records) {
            const dataLine = record.split("\n").find((l) => l.startsWith("data: "))
            if (!dataLine) continue
            const jsonStr = dataLine.slice(6).trim()
            if (jsonStr === "[DONE]") { done = true; break }
            try {
              const parsed = JSON.parse(jsonStr)
              if (parsed.type === "text" && typeof parsed.content === "string") {
                accumulated += parsed.content
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m))
              } else if (parsed.type === "tool_start" && parsed.content) {
                toolEvents.push(parsed.content)
                const toolLabel = `[ ${parsed.content} 실행 중… ]`
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated ? `${accumulated}\n\n${toolLabel}` : toolLabel } : m))
              } else if (parsed.type === "error" && parsed.content) {
                streamError = parsed.content
              } else if (parsed.conversation_id && !conversationId) {
                setConversationId(parsed.conversation_id)
              }
            } catch { /* skip malformed SSE */ }
          }
        }
        if (streamError && !accumulated) {
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `AI 스트리밍 오류: ${streamError}` } : m))
        } else if (!accumulated) {
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "응답을 생성할 수 없었습니다." } : m))
        } else if (toolEvents.length > 0) {
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m))
        }
      } else {
        const data = await res.json()
        if (data.conversation_id && !conversationId) setConversationId(data.conversation_id)
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: data.message || data.response || "응답을 받았습니다.", timestamp: new Date() }])
      }
    } catch {
      toast.error("AI 응답 오류 — 데모 응답으로 대체합니다.")
      setIsDemo(true)
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: DEMO_FALLBACK, timestamp: new Date() }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [input, loading, messages, conversationId])

  const handleReset = () => {
    setMessages([])
    setConversationId(null)
  }

  const isEmpty = messages.length === 0

  return (
    <MckPageShell variant="tint">
      {isDemo && (
        <MckDemoBanner
          message="데모 응답 모드 — NPlatform AI 연결 실패로 사전 작성된 샘플 응답을 사용합니다."
          ctaLabel="다시 시도"
          ctaHref="/analysis/copilot"
        />
      )}

      <MckPageHeader
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "분석", href: "/analysis" },
          { label: "AI 컨설턴트" },
        ]}
        eyebrow="AI Consultant · NPlatform AI"
        title="AI 컨설턴트"
        subtitle="자연어로 매물·법률·수익률을 질문하면 NPlatform AI 가 RAG 판례 인용과 함께 답변합니다."
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <MckBadge tone="positive" outlined icon={<span style={{ width: 6, height: 6, background: MCK.positive, display: "inline-block", borderRadius: "50%" }} />}>
              Online · NPlatform AI
            </MckBadge>
            <button
              onClick={handleReset}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                background: MCK.paper,
                border: `1px solid ${MCK.borderStrong}`,
                color: MCK.ink,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={12} />
              초기화
            </button>
          </div>
        }
      />

      {/* Workspace: sidebar + chat */}
      <div className="max-w-[1280px] mx-auto" style={{ padding: "24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 280px) minmax(0, 1fr)",
            gap: 16,
            alignItems: "stretch",
          }}
          className="lg:grid-cols-[280px_1fr] grid-cols-1"
        >
          {/* Sidebar */}
          <aside
            className="hidden lg:flex"
            style={{
              flexDirection: "column",
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.brass}`,
              minHeight: 600,
            }}
          >
            <div style={{ padding: "20px 18px", borderBottom: `1px solid ${MCK.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div
                  style={{
                    width: 36, height: 36,
                    background: MCK.ink,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Sparkles size={16} style={{ color: MCK.brassLight }} />
                </div>
                <div>
                  <p style={{ ...MCK_TYPE.eyebrow, color: MCK.brassDark, marginBottom: 2 }}>
                    AI Consultant
                  </p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: MCK.ink, fontFamily: MCK_FONTS.serif }}>
                    NPlatform AI
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  width: "100%",
                  padding: "10px 14px",
                  background: MCK.ink,
                  color: MCK.paper,
                  borderTop: `2px solid ${MCK.brass}`,
                  border: "none",
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                  cursor: "pointer",
                }}
              >
                <Plus size={14} />
                새 대화 시작
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
              <p
                style={{
                  ...MCK_TYPE.label,
                  color: MCK.textMuted,
                  padding: "0 8px",
                  marginBottom: 10,
                }}
              >
                Recent · 최근 대화
              </p>
              {RECENT_CONVOS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="hover:bg-[#FAFBFC]"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    width: "100%",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    borderLeft: `2px solid transparent`,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <MessageSquare size={14} style={{ color: MCK.textMuted, marginTop: 2, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: MCK.ink,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.title}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <Clock size={10} style={{ color: MCK.textMuted }} />
                      <p style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 500 }}>{c.time}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Chat panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.brass}`,
              minHeight: 600,
              maxHeight: "calc(100vh - 200px)",
            }}
          >
            {/* Messages area */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                background: MCK.paperTint,
                padding: "24px 20px",
              }}
            >
              <div className="max-w-3xl mx-auto" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Welcome / empty state */}
                {isEmpty && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, paddingTop: 24, paddingBottom: 8 }}>
                    <div
                      style={{
                        width: 64, height: 64,
                        background: MCK.ink,
                        borderTop: `2px solid ${MCK.brass}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Sparkles size={28} style={{ color: MCK.brassLight }} />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <p style={{ ...MCK_TYPE.eyebrow, color: MCK.brassDark, marginBottom: 8 }}>
                        Start your consult
                      </p>
                      <h2
                        style={{
                          fontFamily: MCK_FONTS.serif,
                          color: MCK.ink,
                          fontSize: 22,
                          fontWeight: 800,
                          letterSpacing: "-0.02em",
                          marginBottom: 6,
                        }}
                      >
                        AI 컨설턴트
                      </h2>
                      <p style={{ fontSize: 13, color: MCK.textSub }}>
                        NPL 투자 분석, 리스크 검토, 전략 수립을 AI 와 함께
                      </p>
                    </div>

                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 14px",
                        background: MCK.paper,
                        border: `1px solid ${MCK.brass}55`,
                        color: MCK.brassDark,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      <Zap size={11} />
                      아래 예시 질문을 클릭하면 바로 체험 — 로그인 불필요
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full" style={{ marginTop: 8 }}>
                      {STARTER_CARDS.map((q) => {
                        const Icon = q.icon
                        return (
                          <button
                            key={q.label}
                            type="button"
                            onClick={() => sendMessage(q.text)}
                            className="hover:shadow-md transition-shadow"
                            style={{
                              background: MCK.paper,
                              border: `1px solid ${MCK.border}`,
                              borderTop: `2px solid ${MCK.brass}`,
                              padding: 16,
                              textAlign: "left",
                              cursor: "pointer",
                              position: "relative",
                            }}
                          >
                            {q.badge && (
                              <span style={{ position: "absolute", top: 10, right: 10 }}>
                                <MckBadge tone="brass" size="sm">{q.badge}</MckBadge>
                              </span>
                            )}
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                              <div
                                style={{
                                  width: 24, height: 24,
                                  background: MCK.ink,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                }}
                              >
                                <Icon size={12} style={{ color: MCK.paper }} />
                              </div>
                              <span
                                style={{
                                  ...MCK_TYPE.eyebrow,
                                  color: MCK.brassDark,
                                }}
                              >
                                {q.label}
                              </span>
                            </div>
                            <p
                              style={{
                                fontSize: 12,
                                color: MCK.textSub,
                                lineHeight: 1.55,
                                display: "-webkit-box",
                                WebkitBoxOrient: "vertical",
                                WebkitLineClamp: 3,
                                overflow: "hidden",
                              }}
                            >
                              {q.text}
                            </p>
                            <p
                              style={{
                                fontSize: 10,
                                color: MCK.brassDark,
                                fontWeight: 800,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                marginTop: 10,
                              }}
                            >
                              클릭하여 전송 →
                            </p>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Message bubbles */}
                {messages.map((msg) => {
                  const isUser = msg.role === "user"
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        flexDirection: isUser ? "row-reverse" : "row",
                      }}
                    >
                      <div
                        style={{
                          width: 28, height: 28,
                          flexShrink: 0,
                          background: isUser ? MCK.paper : MCK.ink,
                          border: isUser ? `1px solid ${MCK.borderStrong}` : "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isUser
                          ? <UserIcon size={14} style={{ color: MCK.ink }} />
                          : <Sparkles size={14} style={{ color: MCK.brassLight }} />
                        }
                      </div>
                      <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", gap: 4, alignItems: isUser ? "flex-end" : "flex-start" }}>
                        <div
                          style={{
                            padding: "12px 16px",
                            fontSize: 14,
                            lineHeight: 1.6,
                            whiteSpace: "pre-wrap",
                            color: MCK.ink,
                            background: isUser ? MCK.paper : MCK.paperTint,
                            border: isUser
                              ? `1px solid ${MCK.ink}`
                              : `1px solid ${MCK.border}`,
                            borderLeft: isUser ? `1px solid ${MCK.ink}` : `3px solid ${MCK.brass}`,
                            fontFamily: MCK_FONTS.sans,
                          }}
                        >
                          {msg.content}
                        </div>
                        <p style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 500, padding: "0 4px" }}>
                          {msg.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )
                })}

                {/* Typing indicator */}
                {loading && (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: 28, height: 28,
                        background: MCK.ink,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Sparkles size={14} style={{ color: MCK.brassLight }} />
                    </div>
                    <div
                      style={{
                        background: MCK.paperTint,
                        border: `1px solid ${MCK.border}`,
                        borderLeft: `3px solid ${MCK.brass}`,
                        padding: "12px 16px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", gap: 4 }}>
                        {[0, 150, 300].map((d) => (
                          <span
                            key={d}
                            className="animate-bounce"
                            style={{
                              width: 6, height: 6,
                              background: MCK.brassDark,
                              display: "inline-block",
                              animationDelay: `${d}ms`,
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: 11, color: MCK.textMuted, fontWeight: 600 }}>분석 중...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Input bar */}
            <div
              style={{
                background: MCK.paper,
                borderTop: `1px solid ${MCK.border}`,
                padding: "14px 20px",
              }}
            >
              <div className="max-w-3xl mx-auto">
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-end",
                    background: MCK.paperTint,
                    border: `1px solid ${MCK.borderStrong}`,
                    overflow: "hidden",
                  }}
                >
                  <button
                    type="button"
                    style={{
                      width: 40, height: 44,
                      flexShrink: 0,
                      background: "transparent",
                      border: "none",
                      color: MCK.textMuted,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Paperclip size={16} />
                  </button>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="NPL 분석에 대해 무엇이든 물어보세요..."
                    rows={1}
                    disabled={loading}
                    style={{
                      flex: 1,
                      resize: "none",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 14,
                      lineHeight: 1.5,
                      color: MCK.ink,
                      padding: "12px 8px",
                      minHeight: 44,
                      maxHeight: 120,
                      fontFamily: MCK_FONTS.sans,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    style={{
                      width: 36, height: 36,
                      flexShrink: 0,
                      margin: "4px 6px",
                      background: MCK.ink,
                      borderTop: `2px solid ${MCK.brass}`,
                      border: "none",
                      color: MCK.paper,
                      cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                      opacity: loading || !input.trim() ? 0.4 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 500, marginTop: 6, padding: "0 4px" }}>
                  Enter: 전송 · Shift+Enter: 줄바꿈 · AI 응답은 참고용입니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MckPageShell>
  )
}
