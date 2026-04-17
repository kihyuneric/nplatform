"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bot,
  X,
  Send,
  Search,
  TrendingUp,
  Calculator,
  BarChart3,
  BookOpen,
  ExternalLink,
  MapPin,
  Building2,
  ArrowRight,
  RotateCcw,
  Gavel,
  Heart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  cards?: React.ReactNode
  /** When true, the message text is being streamed character by character */
  isStreaming?: boolean
  /** If true, this response was derived from conversation context */
  usedContext?: boolean
}

interface SerializedChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  usedContext?: boolean
}

interface ConversationContext {
  lastSearchQuery: string | null
  lastPropertyType: string | null
  lastRegion: string | null
}

interface SearchResultItem {
  id: string
  address?: string
  title?: string
  collateral_type?: string
  claim_amount?: number
  ai_grade?: string
  status?: string
  appraised_value?: number
  discount_rate?: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHAT_HISTORY_KEY = "npl_chat_history"
const CHAT_CONTEXT_KEY = "npl_chat_context"
const MAX_HISTORY_MESSAGES = 50

const SEARCH_KEYWORDS = [
  "검색", "찾아", "매물", "아파트", "상가", "오피스텔",
  "빌라", "토지", "다세대", "주택", "건물", "부동산",
]

const PROPERTY_TYPES = [
  "아파트", "오피스텔", "상가", "빌라", "다세대", "토지", "주택", "건물",
]

const REGION_KEYWORDS = [
  "서울", "경기", "부산", "인천", "대구", "대전", "광주", "울산",
  "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
  "강남", "서초", "마포", "송파", "영등포", "용산", "성남", "수원", "고양",
]

// ---------------------------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------------------------

function saveMessages(messages: ChatMessage[]) {
  try {
    const serialized: SerializedChatMessage[] = messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : String(m.timestamp),
        usedContext: m.usedContext,
      }))
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(serialized))
  } catch {
    // Silently ignore storage errors
  }
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY)
    if (!raw) return []
    const parsed: SerializedChatMessage[] = JSON.parse(raw)
    return parsed.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }))
  } catch {
    return []
  }
}

function saveContext(ctx: ConversationContext) {
  try {
    localStorage.setItem(CHAT_CONTEXT_KEY, JSON.stringify(ctx))
  } catch {}
}

function loadContext(): ConversationContext {
  try {
    const raw = localStorage.getItem(CHAT_CONTEXT_KEY)
    if (!raw) return { lastSearchQuery: null, lastPropertyType: null, lastRegion: null }
    return JSON.parse(raw)
  } catch {
    return { lastSearchQuery: null, lastPropertyType: null, lastRegion: null }
  }
}

function clearChatStorage() {
  try {
    localStorage.removeItem(CHAT_HISTORY_KEY)
    localStorage.removeItem(CHAT_CONTEXT_KEY)
  } catch {}
}

// ---------------------------------------------------------------------------
// Context extraction helpers
// ---------------------------------------------------------------------------

function extractPropertyType(text: string): string | null {
  const lower = text.toLowerCase()
  return PROPERTY_TYPES.find((t) => lower.includes(t)) ?? null
}

function extractRegion(text: string): string | null {
  return REGION_KEYWORDS.find((r) => text.includes(r)) ?? null
}

function isSearchQuery(text: string): boolean {
  const lower = text.toLowerCase()
  return SEARCH_KEYWORDS.some((kw) => lower.includes(kw))
}

function buildSearchQuery(
  text: string,
  ctx: ConversationContext
): { query: string; region: string | null; type: string | null; usedContext: boolean } {
  const region = extractRegion(text) ?? ctx.lastRegion
  const propertyType = extractPropertyType(text) ?? ctx.lastPropertyType
  const usedContext =
    (region !== null && !extractRegion(text) && ctx.lastRegion !== null) ||
    (propertyType !== null && !extractPropertyType(text) && ctx.lastPropertyType !== null)

  // Build a combined query string
  const parts: string[] = []
  if (region) parts.push(region)
  if (propertyType) parts.push(propertyType)
  // If no parts extracted, use the raw text
  if (parts.length === 0) parts.push(text.replace(/검색|찾아|매물|해줘|줘|좀/g, "").trim() || "NPL")

  return { query: parts.join(" "), region, type: propertyType, usedContext }
}

// ---------------------------------------------------------------------------
// API search
// ---------------------------------------------------------------------------

async function fetchSearchResults(
  query: string,
  limit: number = 3
): Promise<SearchResultItem[]> {
  try {
    const res = await fetch(
      `/api/v1/market/search?q=${encodeURIComponent(query)}&limit=${limit}`
    )
    if (!res.ok) throw new Error("API error")
    const json = await res.json()
    return json.data ?? []
  } catch {
    return []
  }
}

function formatAmount(amount?: number): string {
  if (!amount) return "정보없음"
  if (amount >= 100000000) {
    const eok = Math.floor(amount / 100000000)
    const man = Math.floor((amount % 100000000) / 10000)
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`
  }
  if (amount >= 10000) {
    return `${Math.floor(amount / 10000).toLocaleString()}만원`
  }
  return `${amount.toLocaleString()}원`
}

// ---------------------------------------------------------------------------
// Mock response helpers
// ---------------------------------------------------------------------------

function NplListingCards() {
  const listings = [
    {
      address: "서울 강남구 역삼동 아파트",
      type: "아파트",
      amount: "4억 2,000만원",
      grade: "A",
      color: "text-green-600",
    },
    {
      address: "서울 서초구 반포동 오피스텔",
      type: "오피스텔",
      amount: "2억 8,500만원",
      grade: "B+",
      color: "text-blue-600",
    },
    {
      address: "서울 마포구 상암동 다세대",
      type: "다세대",
      amount: "1억 5,200만원",
      grade: "A-",
      color: "text-green-500",
    },
  ]

  return (
    <div className="mt-2 space-y-2">
      {listings.map((l, i) => (
        <div
          key={i}
          className="rounded-lg border bg-[var(--color-surface-elevated)] p-3 text-sm shadow-sm"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">{l.address}</p>
                <p className="text-muted-foreground">
                  {l.type} &middot; {l.amount}
                </p>
              </div>
            </div>
            <Badge variant="outline" className={cn("shrink-0", l.color)}>
              AI {l.grade}
            </Badge>
          </div>
        </div>
      ))}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/exchange/search"
        className="mt-1 flex items-center gap-1 text-xs font-medium text-[#2E75B6] hover:underline"
      >
        전체 검색 결과 보기 <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

/** Real search results card component */
function ApiListingCards({
  results,
  query,
}: {
  results: SearchResultItem[]
  query: string
}) {
  const gradeColor = (g?: string) => {
    if (!g) return "text-gray-500"
    if (g.startsWith("A")) return "text-green-600"
    if (g.startsWith("B")) return "text-blue-600"
    return "text-orange-600"
  }

  return (
    <div className="mt-2 space-y-2">
      {results.map((item) => (
        <a
          key={item.id}
          href={`/listings/${item.id}`}
          className="block rounded-lg border bg-[var(--color-surface-elevated)] p-3 text-sm shadow-sm transition-colors hover:border-[#2E75B6]/40 hover:bg-blue-500/10"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">
                  {item.address || item.title || "주소 미상"}
                </p>
                <p className="text-muted-foreground">
                  {item.collateral_type || "기타"} &middot;{" "}
                  {formatAmount(item.claim_amount)}
                </p>
              </div>
            </div>
            {item.ai_grade && (
              <Badge
                variant="outline"
                className={cn("shrink-0", gradeColor(item.ai_grade))}
              >
                AI {item.ai_grade}
              </Badge>
            )}
          </div>
          {/* Quick action */}
          <div className="mt-2 flex gap-2">
            <QuickActionButton
              label="분석하기"
              href={`/npl-analysis/${item.id}`}
              icon={<BarChart3 className="h-3 w-3" />}
            />
          </div>
        </a>
      ))}
      <a
        href={`/exchange/search?q=${encodeURIComponent(query)}`}
        className="mt-1 flex items-center gap-1 text-xs font-medium text-[#2E75B6] hover:underline"
      >
        전체 검색 결과 보기 <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

/** Reusable quick action button for response cards */
function QuickActionButton({
  label,
  href,
  icon,
}: {
  label: string
  href: string
  icon: React.ReactNode
}) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 rounded-full border border-[#2E75B6]/30 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-[#2E75B6] transition-colors hover:bg-[#2E75B6] hover:text-white"
    >
      {icon}
      {label}
      <ArrowRight className="h-2.5 w-2.5" />
    </a>
  )
}

function AnalysisCard() {
  return (
    <div className="mt-2 rounded-lg border bg-[var(--color-surface-elevated)] p-3 text-sm shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-[#2E75B6]" />
        <span className="font-semibold text-foreground">AI 분석 요약</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-blue-500/10 p-2 text-center">
          <p className="text-muted-foreground">AI 등급</p>
          <p className="text-lg font-bold text-[#2E75B6]">A-</p>
        </div>
        <div className="rounded bg-orange-500/10 p-2 text-center">
          <p className="text-muted-foreground">리스크 점수</p>
          <p className="text-lg font-bold text-orange-400">32 / 100</p>
        </div>
        <div className="rounded bg-green-500/10 p-2 text-center">
          <p className="text-muted-foreground">예상 수익률</p>
          <p className="text-lg font-bold text-green-400">18.5%</p>
        </div>
        <div className="rounded bg-purple-500/10 p-2 text-center">
          <p className="text-muted-foreground">회수 가능성</p>
          <p className="text-lg font-bold text-purple-400">높음</p>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <QuickActionButton
          label="시뮬레이션"
          href="/tools/auction-simulator"
          icon={<Calculator className="h-3 w-3" />}
        />
      </div>
    </div>
  )
}

function RoiCard() {
  return (
    <div className="mt-2 rounded-lg border bg-[var(--color-surface-elevated)] p-3 text-sm shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <Calculator className="h-4 w-4 text-green-400" />
        <span className="font-semibold text-foreground">수익률 시뮬레이션</span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">매입가</span>
          <span className="font-medium">2억 5,000만원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">감정가 대비</span>
          <span className="font-medium">68.2%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">예상 회수액</span>
          <span className="font-medium text-green-600">3억 1,200만원</span>
        </div>
        <div className="flex justify-between border-t pt-1">
          <span className="font-semibold">예상 수익률</span>
          <span className="font-bold text-green-600">+24.8%</span>
        </div>
      </div>
      <a
        href="/tools/auction-simulator"
        className="mt-2 flex items-center gap-1 text-xs font-medium text-[#2E75B6] hover:underline"
      >
        시뮬레이터에서 직접 계산하기 <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  )
}

function MarketStatsCard() {
  return (
    <div className="mt-2 rounded-lg border bg-[var(--color-surface-elevated)] p-3 text-sm shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-[#2E75B6]" />
        <span className="font-semibold text-foreground">시장 동향</span>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">금월 NPL 거래량</span>
          <span className="font-medium">1,247건</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">전월 대비</span>
          <span className="font-medium text-green-600">+8.3%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">평균 낙찰가율</span>
          <span className="font-medium">72.4%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">주요 지역</span>
          <span className="font-medium">서울 &gt; 경기 &gt; 부산</span>
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <QuickActionButton
          label="상세보기"
          href="/statistics"
          icon={<TrendingUp className="h-3 w-3" />}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mock response generator
// ---------------------------------------------------------------------------

function generateMockResponse(message: string): {
  text: string
  cards?: React.ReactNode
} {
  const lower = message.toLowerCase()

  if (lower.includes("검색") || lower.includes("찾아")) {
    return {
      text: "서울 지역 NPL 매물을 검색했습니다. 현재 조건에 맞는 상위 3건의 매물입니다.",
      cards: <NplListingCards />,
    }
  }

  if (lower.includes("분석")) {
    return {
      text: "AI 기반 종합 분석 결과를 안내드립니다. 해당 물건은 투자 적합성이 높은 것으로 판단됩니다.",
      cards: <AnalysisCard />,
    }
  }

  if (lower.includes("수익") || lower.includes("시뮬")) {
    return {
      text: "수익률 시뮬레이션 결과입니다. 현재 시장 상황을 기반으로 산출했습니다.",
      cards: <RoiCard />,
    }
  }

  if (lower.includes("동향") || lower.includes("시장") || lower.includes("통계")) {
    return {
      text: "최근 NPL 시장 동향을 정리했습니다.",
      cards: <MarketStatsCard />,
    }
  }

  if (
    lower.includes("npl이란") ||
    lower.includes("뭐야") ||
    lower.includes("시작")
  ) {
    return {
      text: "NPL(Non-Performing Loan)은 금융기관에서 정상적으로 원리금 회수가 어려운 부실채권을 의미합니다. 투자자는 이 채권을 할인된 가격에 매입한 뒤, 담보물의 경매나 채무자 협의를 통해 원금 이상을 회수하여 수익을 얻습니다.\n\n주요 특징:\n- 담보 부동산 기반으로 안정적인 투자 가능\n- 감정가 대비 60~80% 수준에서 매입 기회\n- 경매, 임의매각, 채무 조정 등 다양한 회수 방법\n- 전문 분석이 중요 (권리분석, 물건분석, 시장분석)",
    }
  }

  if (lower.includes("입찰") || lower.includes("경매")) {
    return {
      text: "현재 진행 중인 입찰 현황입니다.\n\n- 오늘 마감 예정: 23건\n- 이번 주 신규 등록: 87건\n- 평균 입찰 경쟁률: 3.2:1\n- 최다 관심 지역: 서울 강남구 (41건)",
      cards: <MarketStatsCard />,
    }
  }

  if (lower.includes("관심") || lower.includes("찜")) {
    return {
      text: "관심매물 기능을 이용하려면 로그인이 필요합니다. 현재 인기 관심매물 TOP 3을 보여드릴게요.",
      cards: <NplListingCards />,
    }
  }

  return {
    text: '죄송합니다. 더 구체적으로 질문해 주세요. 예: "서울 강남 아파트 NPL 검색해줘"',
  }
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block h-2 w-2 rounded-full bg-[var(--color-text-muted)]"
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Quick prompts
// ---------------------------------------------------------------------------

const quickPrompts = [
  { label: "서울 NPL 검색", icon: Search },
  { label: "시장 동향 분석", icon: TrendingUp },
  { label: "수익률 계산", icon: Calculator },
  { label: "NPL이란?", icon: BookOpen },
  { label: "입찰 현황", icon: Gavel },
  { label: "내 관심매물", icon: Heart },
]

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatWidget() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [conversationContext, setConversationContext] = useState<ConversationContext>({
    lastSearchQuery: null,
    lastPropertyType: null,
    lastRegion: null,
  })
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load chat history and context from localStorage on mount
  useEffect(() => {
    const savedMessages = loadMessages()
    if (savedMessages.length > 0) {
      setMessages(savedMessages)
    }
    setConversationContext(loadContext())
    setHistoryLoaded(true)
  }, [])

  // Save messages to localStorage whenever they change (skip initial empty load)
  useEffect(() => {
    if (historyLoaded && messages.length > 0) {
      saveMessages(messages)
    }
  }, [messages, historyLoaded])

  // Save context whenever it changes
  useEffect(() => {
    if (historyLoaded) {
      saveContext(conversationContext)
    }
  }, [conversationContext, historyLoaded])

  // Cleanup stream interval on unmount
  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
    }
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      )
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight
      }
    }
  }, [messages, isTyping])

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // ------- Streaming text effect -------
  const streamText = useCallback(
    (
      msgId: string,
      fullText: string,
      cards: React.ReactNode | undefined,
      usedContext: boolean,
      onDone: () => void
    ) => {
      let charIndex = 0
      streamIntervalRef.current = setInterval(() => {
        charIndex += 1
        if (charIndex >= fullText.length) {
          if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
          streamIntervalRef.current = null
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? { ...m, content: fullText, isStreaming: false, cards }
                : m
            )
          )
          onDone()
          return
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: fullText.slice(0, charIndex) } : m
          )
        )
      }, 20)
    },
    []
  )

  // ------- Handle clear history -------
  const handleClearHistory = useCallback(() => {
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current)
    setMessages([])
    setConversationContext({
      lastSearchQuery: null,
      lastPropertyType: null,
      lastRegion: null,
    })
    clearChatStorage()
    setIsTyping(false)
  }, [])

  // ------- Send message -------
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return

      const trimmed = text.trim()

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setIsTyping(true)

      // Update conversation context
      const newRegion = extractRegion(trimmed)
      const newType = extractPropertyType(trimmed)
      setConversationContext((prev) => ({
        lastSearchQuery: trimmed,
        lastPropertyType: newType ?? prev.lastPropertyType,
        lastRegion: newRegion ?? prev.lastRegion,
      }))

      // Check if this is a search query → call real API
      if (isSearchQuery(trimmed)) {
        const { query, region, type, usedContext } = buildSearchQuery(
          trimmed,
          conversationContext
        )

        // Try real API
        const results = await fetchSearchResults(query, 3)

        const aiMsgId = crypto.randomUUID()
        const responseText =
          results.length > 0
            ? `${region ? region + " 지역 " : ""}NPL 매물을 검색했습니다. 조건에 맞는 ${results.length}건의 매물입니다.`
            : `${region ? region + " 지역 " : ""}NPL 매물을 검색했습니다. 현재 조건에 맞는 상위 3건의 매물입니다.`

        const cards =
          results.length > 0 ? (
            <ApiListingCards results={results} query={query} />
          ) : (
            <NplListingCards />
          )

        // Create placeholder message for streaming
        const aiMsg: ChatMessage = {
          id: aiMsgId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isStreaming: true,
          usedContext,
        }
        setMessages((prev) => [...prev, aiMsg])

        streamText(aiMsgId, responseText, cards, usedContext, () => {
          setIsTyping(false)
        })
        return
      }

      // Non-search: use mock response with streaming
      setTimeout(() => {
        const { text: responseText, cards } = generateMockResponse(trimmed)
        const aiMsgId = crypto.randomUUID()
        const aiMsg: ChatMessage = {
          id: aiMsgId,
          role: "assistant",
          content: "",
          timestamp: new Date(),
          isStreaming: true,
        }
        setMessages((prev) => [...prev, aiMsg])

        streamText(aiMsgId, responseText, cards, false, () => {
          setIsTyping(false)
        })
      }, 800 + Math.random() * 600)
    },
    [isTyping, conversationContext, streamText]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const formatTime = (d: Date) => {
    const date = d instanceof Date ? d : new Date(d)
    return date.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
  }

  const showWelcome = messages.length === 0

  // Build a personalized welcome message
  const welcomeMessage = (() => {
    if (!historyLoaded) return "안녕하세요! NPL 투자에 대해 무엇이든 물어보세요."
    const ctx = loadContext()
    if (ctx.lastSearchQuery) {
      return `다시 오셨네요! 이전에 "${ctx.lastSearchQuery}"를 검색하셨습니다. 무엇을 도와드릴까요?`
    }
    return "안녕하세요! NPL 투자에 대해 무엇이든 물어보세요."
  })()

  return (
    <>
      {/* ---- Floating button ---- */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none"
            style={{
              background: "linear-gradient(135deg, #1B3A5C, #2E75B6)",
            }}
            aria-label="AI 에이전트 열기"
          >
            <motion.div
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Bot className="h-7 w-7 text-white" />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ---- Chat panel ---- */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className={cn(
              "fixed z-50 flex flex-col overflow-hidden rounded-2xl border bg-[var(--color-surface-overlay)] shadow-2xl",
              // Desktop
              "bottom-6 right-6 h-[600px] w-[400px]",
              // Mobile: full-screen
              "max-sm:inset-0 max-sm:h-full max-sm:w-full max-sm:rounded-none"
            )}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                background: "linear-gradient(135deg, #1B3A5C, #2E75B6)",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold leading-none text-white">
                    NPL AI Agent
                  </h3>
                  <p className="mt-0.5 text-[11px] text-white/70">
                    투자 분석 도우미
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none"
                    aria-label="대화 초기화"
                    title="대화 초기화"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-full p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none"
                  aria-label="닫기"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea ref={scrollRef} className="flex-1 px-4 py-3">
              {showWelcome && (
                <div className="mb-4 space-y-3">
                  {/* Welcome bubble */}
                  <div className="flex items-start gap-2">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-[#2E75B6] text-[10px] text-white">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl rounded-tl-sm bg-[var(--color-surface-elevated)] px-3 py-2 text-sm shadow-sm">
                      {welcomeMessage}
                    </div>
                  </div>

                  {/* Quick prompts */}
                  <div className="flex flex-wrap gap-2 pl-9">
                    {quickPrompts.map((qp) => (
                      <button
                        key={qp.label}
                        onClick={() => sendMessage(qp.label)}
                        className="flex items-center gap-1.5 rounded-full border bg-[var(--color-surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--color-brand-dark)] shadow-sm transition-colors hover:bg-[#2E75B6] hover:text-white focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none"
                      >
                        <qp.icon className="h-3.5 w-3.5" />
                        {qp.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message list */}
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {msg.role === "assistant" && (
                      <Avatar className="mr-2 mt-0.5 h-7 w-7 shrink-0">
                        <AvatarFallback className="bg-[#2E75B6] text-[10px] text-white">
                          AI
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={cn(
                        "max-w-[85%]",
                        msg.role === "user" ? "text-right" : "text-left"
                      )}
                    >
                      {msg.usedContext && msg.role === "assistant" && (
                        <Badge
                          variant="outline"
                          className="mb-1 border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-400"
                        >
                          이전 검색 기반
                        </Badge>
                      )}
                      <div
                        className={cn(
                          "inline-block rounded-2xl px-3 py-2 text-sm leading-relaxed",
                          msg.role === "user"
                            ? "rounded-tr-sm bg-[#2E75B6] text-white"
                            : "rounded-tl-sm bg-[var(--color-surface-elevated)] text-foreground shadow-sm"
                        )}
                      >
                        {msg.content.split("\n").map((line, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <br />}
                            {line}
                          </React.Fragment>
                        ))}
                        {msg.isStreaming && (
                          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-[#2E75B6]" />
                        )}
                      </div>
                      {!msg.isStreaming && msg.cards}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Typing indicator (hide when streaming is active) */}
                {isTyping && !messages.some((m) => m.isStreaming) && (
                  <div className="flex items-start">
                    <Avatar className="mr-2 mt-0.5 h-7 w-7 shrink-0">
                      <AvatarFallback className="bg-[#2E75B6] text-[10px] text-white">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-2xl rounded-tl-sm bg-[var(--color-surface-elevated)] px-3 py-2 shadow-sm">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input bar */}
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t bg-[var(--color-surface-elevated)] px-3 py-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none rounded"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-[#2E75B6] focus-visible:ring-offset-2 focus-visible:outline-none",
                  input.trim() && !isTyping
                    ? "bg-[#2E75B6] text-white hover:bg-[var(--color-brand-dark)]"
                    : "bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)]"
                )}
                aria-label="전송"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
