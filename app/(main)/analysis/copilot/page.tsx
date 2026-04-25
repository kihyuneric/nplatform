"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  Bot, User, Send, Sparkles, RefreshCw,
  TrendingUp, AlertTriangle, BarChart3, Scale, Lightbulb,
  Building2, Plus, Clock, MessageSquare, Paperclip, Zap,
} from "lucide-react"
import { toast } from "sonner"
import DS from "@/lib/design-system"

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

export default function NPLCopilotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
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
      // Stream from Claude AI Copilot
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

      // Handle SSE streaming
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
          // SSE records are separated by a blank line (\n\n)
          const records = buffer.split("\n\n")
          buffer = records.pop() ?? ""
          for (const record of records) {
            const dataLine = record.split("\n").find((l) => l.startsWith("data: "))
            if (!dataLine) continue
            const jsonStr = dataLine.slice(6).trim()
            if (jsonStr === "[DONE]") { done = true; break }
            try {
              const parsed = JSON.parse(jsonStr)
              // Server emits { type, content } per streamCopilot contract
              if (parsed.type === "text" && typeof parsed.content === "string") {
                accumulated += parsed.content
                setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m))
              } else if (parsed.type === "tool_start" && parsed.content) {
                toolEvents.push(parsed.content)
                const toolLabel = `🔧 ${parsed.content} 실행 중…`
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
          // 최종 응답에 도구 마커 제거 (스트리밍 도중에만 표시)
          setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m))
        }
      } else {
        // Fallback: non-streaming JSON response
        const data = await res.json()
        if (data.conversation_id && !conversationId) setConversationId(data.conversation_id)
        setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: "assistant", content: data.message || data.response || "응답을 받았습니다.", timestamp: new Date() }])
      }
    } catch {
      toast.error("응답 오류가 발생했습니다.")
      setMessages((prev) => [...prev, { id: `e-${Date.now()}`, role: "assistant", content: "AI 응답 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", timestamp: new Date() }])
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
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface-sunken)]">

      {/* Sidebar */}
      <aside className="hidden lg:flex w-[280px] shrink-0 flex-col bg-[var(--color-surface-elevated)] border-r border-[var(--color-border-subtle)]">
        <div className="px-4 pt-5 pb-4 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-9 w-9 rounded-xl bg-[var(--color-brand-dark)] flex items-center justify-center shadow-[var(--shadow-sm)] shrink-0">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className={DS.text.cardSubtitle}>AI 컨설턴트</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-positive)] animate-pulse" />
                <span className={`${DS.text.micro} bg-[var(--color-brand-mid)]/10 text-[var(--color-brand-mid)] border border-[var(--color-brand-mid)]/20 px-1.5 py-0.5 rounded`}>Claude</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleReset}
            className={DS.button.secondary + " w-full"}
          >
            <Plus className="h-4 w-4" />
            새 대화 시작
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className={`${DS.text.label} px-2 mb-3`}>최근 대화</p>
          {RECENT_CONVOS.map((c) => (
            <button key={c.id} className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[var(--color-surface-sunken)] transition-colors text-left group">
              <MessageSquare className="h-3.5 w-3.5 text-[var(--color-text-muted)] shrink-0 mt-0.5 group-hover:text-[var(--color-text-secondary)] transition-colors" />
              <div className="min-w-0">
                <p className={`${DS.text.caption} truncate group-hover:text-[var(--color-text-primary)] transition-colors`}>{c.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5 text-[var(--color-text-muted)]" />
                  <p className={DS.text.micro}>{c.time}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Chat Header */}
        <div className="shrink-0 border-b border-[var(--color-border-subtle)] px-5 py-3 flex items-center justify-between bg-[var(--color-surface-elevated)]">
          <div className="flex items-center gap-3">
            <span className={DS.text.cardSubtitle}>AI 컨설턴트</span>
            <span className={`${DS.text.micro} bg-[var(--color-brand-mid)]/10 text-[var(--color-brand-mid)] border border-[var(--color-brand-mid)]/20 px-2 py-0.5 rounded hidden sm:inline`}>Claude</span>
          </div>
          <button
            onClick={handleReset}
            className={DS.button.ghost}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">초기화</span>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[var(--color-surface-sunken)]">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

            {/* Welcome / empty state */}
            {isEmpty && (
              <div className="flex flex-col items-center gap-4 pt-12 pb-4">
                <div className="h-16 w-16 rounded-2xl bg-[var(--color-brand-dark)] flex items-center justify-center shadow-[var(--shadow-lg)] border border-[var(--color-border-subtle)]">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="text-center">
                  <h2 className={DS.text.sectionTitle}>AI 컨설턴트</h2>
                  <p className={`${DS.text.body} mt-1`}>NPL 투자 분석, 리스크 검토, 전략 수립을 AI와 함께</p>
                </div>

                {/* 데모 안내 */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-stone-100/10 border border-stone-300/20 text-xs font-semibold text-stone-900 dark:text-stone-900">
                  <Zap className="h-3.5 w-3.5 shrink-0" />
                  아래 예시 질문을 클릭하면 바로 체험할 수 있습니다 — 로그인 불필요
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mt-2">
                  {STARTER_CARDS.map((q) => {
                    const Icon = q.icon
                    return (
                      <button
                        key={q.label}
                        onClick={() => sendMessage(q.text)}
                        className={`${DS.card.interactive} text-left p-4 group relative`}
                      >
                        {q.badge && (
                          <span className="absolute top-3 right-3 text-[0.625rem] font-bold px-1.5 py-0.5 rounded-full bg-stone-100/15 text-stone-900 dark:text-stone-900 border border-stone-300/25">
                            {q.badge}
                          </span>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <div className="h-6 w-6 rounded-md bg-[var(--color-brand-mid)]/10 flex items-center justify-center border border-[var(--color-brand-mid)]/20">
                            <Icon className="h-3.5 w-3.5 text-[var(--color-brand-mid)]" />
                          </div>
                          <span className={`${DS.text.caption} group-hover:text-[var(--color-text-primary)] transition-colors`}>{q.label}</span>
                        </div>
                        <p className={`${DS.text.captionLight} group-hover:text-[var(--color-text-secondary)] line-clamp-3 leading-relaxed transition-colors`}>{q.text}</p>
                        <p className="text-[0.625rem] text-[var(--color-text-muted)] mt-2 font-medium group-hover:text-[var(--color-text-tertiary)] transition-colors">
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
                <div key={msg.id} className={`flex gap-3 items-end ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`shrink-0 h-7 w-7 rounded-lg flex items-center justify-center ${isUser ? "bg-[var(--color-brand-dark)]" : "bg-[var(--color-brand-mid)]"}`}>
                    {isUser ? <User className="h-3.5 w-3.5 text-white" /> : <Sparkles className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div className={`max-w-[78%] space-y-1 ${isUser ? "items-end flex flex-col" : "items-start flex flex-col"}`}>
                    <div className={`px-4 py-3 text-[0.9375rem] leading-relaxed whitespace-pre-wrap rounded-2xl ${
                      isUser
                        ? "bg-[var(--color-brand-dark)] text-white rounded-tr-sm shadow-[var(--shadow-sm)]"
                        : "bg-[var(--color-surface-elevated)] border border-[var(--color-border-subtle)] text-[var(--color-text-primary)] rounded-tl-sm shadow-[var(--shadow-xs)]"
                    }`}>
                      {msg.content}
                    </div>
                    <p className={DS.text.micro}>
                      {msg.timestamp.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              )
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-3 items-end">
                <div className="h-7 w-7 rounded-lg bg-[var(--color-brand-mid)] flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className={`${DS.card.base} rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2`}>
                  <div className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span key={d} className="h-1.5 w-1.5 bg-[var(--color-brand-mid)] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <span className={DS.text.micro}>분석 중...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div className="shrink-0 bg-[var(--color-surface-elevated)] border-t border-[var(--color-border-subtle)] px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-0 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-base)] focus-within:border-[var(--color-brand-mid)] transition-all overflow-hidden">
              <button className="h-11 w-11 shrink-0 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
                <Paperclip className="h-4 w-4" />
              </button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                placeholder="NPL 분석에 대해 무엇이든 물어보세요..."
                rows={1}
                className="flex-1 resize-none bg-transparent text-[0.9375rem] py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none"
                disabled={loading}
                style={{ minHeight: "44px", maxHeight: "120px" }}
              />
              <div className="flex items-center pr-3 pb-2.5 self-end">
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="h-8 w-8 shrink-0 flex items-center justify-center rounded-xl bg-[var(--color-brand-dark)] hover:bg-[var(--color-brand-mid)] text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <p className={`${DS.text.micro} mt-1.5 px-0.5`}>
              Enter: 전송 · Shift+Enter: 줄바꿈 · AI 응답은 참고용입니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
