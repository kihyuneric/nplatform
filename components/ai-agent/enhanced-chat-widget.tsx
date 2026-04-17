"use client"
import { useState, useRef, useEffect } from "react"
import { Bot, X, Send, Sparkles, Minimize2, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
}

const QUICK_ACTIONS = [
  { label: "매물 찾기", prompt: "서울 강남 지역 NPL 매물을 찾아줘" },
  { label: "수익률 분석", prompt: "이 매물의 예상 수익률을 분석해줘" },
  { label: "전문가 추천", prompt: "NPL 법률 전문가를 추천해줘" },
  { label: "사용법 안내", prompt: "딜 브릿지 사용법을 알려줘" },
]

export function EnhancedChatWidget() {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", content: "안녕하세요! NPLatform AI 어시스턴트입니다. 무엇을 도와드릴까요?", timestamp: new Date() },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    // Mock AI response (in production: call Claude API)
    setTimeout(() => {
      const responses: Record<string, string> = {
        "매물": "현재 통합 마켓에 847건의 매각 공고가 등록되어 있습니다. /exchange에서 필터 검색을 이용해보세요.",
        "수익률": "NPL 투자 수익률은 담보물 유형, LTV, 지역에 따라 15~40% 범위입니다. /npl-analysis에서 AI 분석을 받아보세요.",
        "전문가": "법률, 세무, 감정평가 전문가를 /professional에서 찾을 수 있습니다. 상담 요청도 가능합니다.",
        "사용법": "역할별 시작 가이드를 /guide에서 확인할 수 있습니다. 매수자, 매도자, 전문가별 단계별 안내를 제공합니다.",
      }
      const key = Object.keys(responses).find(k => userMsg.content.includes(k))
      const reply = key ? responses[key] : "네, 말씀하신 내용을 확인했습니다. 더 자세한 도움이 필요하시면 구체적으로 질문해주세요. 매물 검색, 수익률 분석, 전문가 연결, 사용법 안내 등을 도와드릴 수 있습니다."

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      }])
      setLoading(false)
    }, 1000)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-[var(--color-brand-dark)] px-4 py-3 text-white shadow-lg hover:bg-[#2E75B6] transition-all md:bottom-6"
      >
        <Sparkles className="h-5 w-5" />
        <span className="text-sm font-medium hidden sm:inline">AI 어시스턴트</span>
      </button>
    )
  }

  return (
    <div className={`fixed z-50 bg-[var(--color-surface-base)] shadow-2xl border border-[var(--color-border-subtle)] flex flex-col transition-all duration-200 ${
      expanded
        ? "inset-4 rounded-2xl"
        : "bottom-20 right-4 w-[380px] h-[520px] rounded-2xl md:bottom-6"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-brand-dark)] text-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <span className="font-semibold text-sm">AI 어시스턴트</span>
          <Badge className="bg-[var(--color-positive)] text-white text-[10px]">Beta</Badge>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-white/20 rounded">
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              msg.role === "user"
                ? "bg-[var(--color-brand-dark)] text-white rounded-br-sm"
                : "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] rounded-bl-sm"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-surface-overlay)] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{animationDelay: '0ms'}} />
                <div className="w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{animationDelay: '150ms'}} />
                <div className="w-2 h-2 bg-[var(--color-text-muted)] rounded-full animate-bounce" style={{animationDelay: '300ms'}} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions (shown when no messages from user) */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => { setInput(action.prompt); }}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-brand-dark)]/30 text-[var(--color-brand-dark)] hover:bg-[var(--color-brand-dark)]/10 transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-[var(--color-border-subtle)]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="메시지를 입력하세요..."
            className="flex-1 text-sm"
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-[var(--color-brand-dark)] hover:bg-[#2E75B6] shrink-0"
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
