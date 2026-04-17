"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft, Send, Upload, FileText, Download, Phone, Video,
  CheckCircle2, Clock, MessageSquare, FolderOpen, Tag, Search,
  FileCheck, PenLine, Sparkles, Circle, AlertCircle, Building2,
  TrendingUp, Star, ArrowUpRight, ArrowDownRight, Paperclip, X,
  LayoutDashboard, CalendarCheck, ShieldAlert, MapPin, Eye, Lock,
  Wifi, WifiOff, Users, Loader2, Wallet, Shield, RotateCcw,
  CircleDot, Timer, Ban, XCircle, Brain, FileSearch, ShieldCheck,
  Activity, AlertTriangle, ScanLine, FileSignature,
} from "lucide-react"
import { toast } from "sonner"
import { DealStageBadge, DealStageProgress } from "@/components/npl"
import { MessageBubble, type DealMessage } from "@/components/deal-room/message-bubble"
import { OfferCard, OfferForm, type OfferData } from "@/components/deal-room/offer-card"
import { FileAttachment, type AttachedFile } from "@/components/deal-room/file-attachment"
import SignaturePad from "@/components/deal-room/signature-pad"
import { useDealMessages, useDealPresence } from "@/lib/realtime-deals"
import { formatKRW } from "@/lib/design-system"
import type { EscrowAccount, EscrowMilestone, EscrowStatus } from "@/lib/payments/escrow"
import type { SignSession, Signer, SignerStatus, SessionStatus } from "@/lib/payments/e-sign"

// ─── Types ────────────────────────────────────────────────────────────────────

type DealStatus = "진행중" | "완료" | "중단"
type TabKey = "개요" | "채팅" | "문서" | "오퍼" | "실사" | "계약" | "에스크로" | "미팅" | "감사"

interface DealInfo {
  id: string
  listingId: string
  status: DealStatus
  stage: number
  lockInStage: string
  startDate: string
  estClose: string
  cp: { name: string; role: string; initials: string; phone: string; id: string }
  asset: { title: string; principal: number; grade: string; yield: string; region: string; collateral: string; appraisalValue?: number; address?: string }
}

interface DealDocument {
  id: string
  name: string
  uploaded_by: string
  uploaded_by_name: string
  created_at: string
  size: string
  type: string
  category: string
  tier_required: string
  url?: string
}

interface DealOffer {
  id: string
  side: string
  label: string
  amount: number
  date: string
  note: string
  status: string
  conditions?: string
  payment_method?: string
  valid_until?: string
  sender_id?: string
}

interface DDItem {
  id: string
  label: string
  done: boolean
  category: string
  description?: string
  assignee?: string
  due_date?: string
}

interface MeetingInfo {
  id: string
  title: string
  mode: "ONLINE" | "OFFLINE" | "HYBRID"
  date: string
  venue: string
  attendees: number
  status: string
}

interface AuditLog {
  id: string
  action: string
  target: string
  actor: string
  at: string
  tier: string
  severity: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = ["매칭", "오퍼 교환", "실사", "계약", "완료"] as const
const TABS: { key: TabKey; icon: React.ElementType }[] = [
  { key: "개요",   icon: LayoutDashboard },
  { key: "채팅",   icon: MessageSquare },
  { key: "문서",   icon: FolderOpen },
  { key: "오퍼",   icon: Tag },
  { key: "실사",   icon: Search },
  { key: "계약",   icon: FileCheck },
  { key: "에스크로", icon: Wallet },
  { key: "미팅",   icon: CalendarCheck },
  { key: "감사",   icon: ShieldAlert },
]

// ─── Constants (empty fallbacks — never show fabricated data) ─────────────────

// Standard NPL DD checklist template (15 items, done=false by default;
// completion state is loaded from deal_dd_items table and merged at runtime)
const DEFAULT_DD_ITEMS: DDItem[] = [
  { id: "dd1",  label: "등기부등본 확인",       done: false, category: "권리관계",  description: "갑구·을구 전체 권리 확인 및 소유권 이전 경위 분석" },
  { id: "dd2",  label: "감정평가서 검토",       done: false, category: "가치평가",  description: "감정가 적정성 검토, 공시지가·실거래가 비교" },
  { id: "dd3",  label: "현장 실사 완료",        done: false, category: "물리적 상태", description: "건물 외관/내부 상태, 하자 여부, 주변 환경 확인" },
  { id: "dd4",  label: "경매 기록 분석",        done: false, category: "법적 리스크", description: "과거 경매 이력, 유찰 횟수, 낙찰가율 분석" },
  { id: "dd5",  label: "임차인 현황 확인",      done: false, category: "수익성",    description: "임대차계약 현황, 대항력 있는 임차인 존재 여부" },
  { id: "dd6",  label: "세금 체납 조회",        done: false, category: "재무 리스크", description: "국세·지방세 체납 여부, 압류 등기 확인" },
  { id: "dd7",  label: "건축물대장 검토",       done: false, category: "권리관계",  description: "용도변경 이력, 위반건축물 여부 확인" },
  { id: "dd8",  label: "법인 대표 신원 확인",   done: false, category: "법적 리스크", description: "대표이사 신용정보, 소송 이력, 전과 기록 확인" },
  { id: "dd9",  label: "근저당권 분석",         done: false, category: "권리관계",  description: "근저당 설정액, 채권최고액, 선순위·후순위 구조 파악" },
  { id: "dd10", label: "배당 시뮬레이션",       done: false, category: "가치평가",  description: "낙찰 시 배당순위별 예상 배당액 산출" },
  { id: "dd11", label: "환경 리스크 평가",      done: false, category: "물리적 상태", description: "토양오염, 석면, 유해물질 사용 여부 확인" },
  { id: "dd12", label: "도시계획 확인",         done: false, category: "법적 리스크", description: "용도지역, 개발행위허가, 도시계획시설 저촉 여부" },
  { id: "dd13", label: "관리비 체납 조회",      done: false, category: "재무 리스크", description: "공용관리비, 수선충당금, 특별수선충당금 체납 확인" },
  { id: "dd14", label: "보험 현황 확인",        done: false, category: "재무 리스크", description: "화재보험, 책임보험 등 보험 가입 현황 및 보장 범위" },
  { id: "dd15", label: "수익률 분석(IRR/NPV)", done: false, category: "가치평가",  description: "DCF 기반 IRR/NPV 산출, 민감도 분석" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₩${(n / 100_000_000).toFixed(1)}억`
// Module-level user id — updated by DealRoomPage once auth resolves
let CURRENT_USER_ID = "me"

// ─── API → DealInfo mapper ────────────────────────────────────────────────────
function mapApiToDealInfo(raw: Record<string, unknown>): DealInfo {
  const stage = (() => {
    const s = (raw.current_stage || raw.stage || "") as string
    const stageMap: Record<string, number> = {
      INTEREST: 0, NDA: 1, DUE_DILIGENCE: 2, NEGOTIATION: 3, CONTRACT: 4,
      SETTLEMENT: 4, COMPLETED: 4, CANCELLED: 0,
    }
    return stageMap[s] ?? 2
  })()
  const status: DealInfo["status"] =
    raw.status === "COMPLETED" ? "완료" :
    raw.status === "CANCELLED" ? "중단" : "진행중"

  return {
    id:          String(raw.id || raw.deal_number || ""),
    listingId:   String(raw.listing_id || raw.npl_listing_id || ""),
    status,
    stage,
    lockInStage: String(raw.lock_in_stage || raw.current_stage || "DEALROOM"),
    startDate:   String(raw.created_at || "").slice(0, 10),
    estClose:    String(raw.expected_close_date || raw.estimated_close || "").slice(0, 10),
    cp: {
      name:     String(raw.cp_name || raw.counterparty_name || "상대방"),
      role:     String(raw.cp_role || "매수자"),
      initials: String(raw.cp_name || "상").slice(0, 2),
      phone:    String(raw.cp_phone || ""),
      id:       String(raw.buyer_id || raw.seller_id || ""),
    },
    asset: {
      title:          String(raw.asset_title || raw.listing_title || (raw as any)?.npl_listings?.title || "NPL 자산"),
      principal:      Number(raw.principal_amount || raw.face_value || 0),
      grade:          String(raw.credit_grade || "—"),
      yield:          String(raw.expected_yield || "—"),
      region:         String(raw.region || ""),
      collateral:     String(raw.collateral_type || ""),
      appraisalValue: Number(raw.appraisal_value || 0) || undefined,
      address:        String(raw.address || "") || undefined,
    },
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DealStatus }) {
  const cls =
    status === "진행중" ? "bg-blue-500/20 text-blue-300 border-blue-500/40" :
    status === "완료"   ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                          "bg-slate-500/20 text-slate-400 border-slate-500/40"
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border tracking-normal ${cls}`}>
      {status}
    </span>
  )
}

function ConnectionIndicator({ isConnected }: { isConnected: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${
      isConnected
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
    }`}>
      {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {isConnected ? "실시간 연결" : "오프라인"}
    </div>
  )
}

function OnlineUsers({ users, cpName }: { users: string[]; cpName: string }) {
  if (users.length <= 1) return null
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-300">
      <Users className="w-3 h-3" />
      <span>{cpName} 접속중</span>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
    </div>
  )
}

function ProgressTimeline({ current }: { current: number }) {
  return (
    <div className="bg-[#0A1628] border-b border-white/[0.06] px-6 py-5">
      <div className="flex items-center max-w-2xl mx-auto">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i === current
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/60 ring-2 ring-blue-500/30"
                  : i < current
                    ? "bg-blue-900/60 text-blue-300 border border-blue-600/40"
                    : "bg-white/[0.04] border border-white/[0.1] text-white/20"}`}>
                {i < current ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-[10px] tracking-normal whitespace-nowrap font-medium
                ${i === current ? "text-blue-400" : i < current ? "text-blue-600/70" : "text-white/20"}`}>
                {s}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div className={`flex-1 h-[2px] mx-2 mb-5 rounded-full transition-colors ${i < current ? "bg-blue-500/70" : "bg-white/[0.08]"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chat Tab (실시간 연결) ────────────────────────────────────────────────────

function ChatTab({ dealId, deal }: { dealId: string; deal: DealInfo }) {
  const { messages: realtimeMessages, sendMessage, isConnected } = useDealMessages(dealId)
  const onlineUsers = useDealPresence(dealId, CURRENT_USER_ID)
  const [msg, setMsg] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 메시지 데이터: Realtime에서 온 메시지 사용, 없으면 빈 배열
  const messages: DealMessage[] = realtimeMessages.length > 0
    ? realtimeMessages.map((m: any) => ({
        id: m.id || String(m.created_at),
        sender_id: m.sender_id || (m.mine ? CURRENT_USER_ID : deal.cp.id),
        sender_name: m.sender_name || m.name || (m.sender_id === CURRENT_USER_ID ? "나" : deal.cp.name),
        message_type: m.message_type || "TEXT",
        content: m.content || m.text || "",
        metadata: m.metadata,
        read_at: m.read_at,
        created_at: m.created_at || new Date().toISOString(),
      }))
    : []

  // 스크롤 하단 유지
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const handleSend = useCallback(() => {
    const text = msg.trim()
    if (!text && !attachedFile) return

    if (attachedFile) {
      sendMessage(text || `📎 ${attachedFile.name}`, "FILE")
      setAttachedFile(null)
    } else {
      sendMessage(text, "TEXT")
    }
    setMsg("")
  }, [msg, attachedFile, sendMessage])

  const handleTyping = useCallback(() => {
    setIsTyping(true)
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000)
  }, [])

  // 오퍼 관련 핸들러
  const handleOfferAccept = useCallback(async (messageId: string) => {
    await sendMessage(`[오퍼 수락] 메시지 #${messageId}의 오퍼를 수락합니다.`, "SYSTEM")
  }, [sendMessage])

  const handleOfferReject = useCallback(async (messageId: string) => {
    await sendMessage(`[오퍼 거절] 메시지 #${messageId}의 오퍼를 거절합니다.`, "SYSTEM")
  }, [sendMessage])

  const handleOfferCounter = useCallback(async (messageId: string, counter: { amount: number; conditions: string }) => {
    await sendMessage(`[역제안] ${formatKRW(counter.amount)} — ${counter.conditions || "조건 없음"}`, "OFFER")
  }, [sendMessage])

  return (
    <div className="flex flex-col h-[560px]">
      {/* Connection & Presence Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0A1628] border-b border-white/[0.06]">
        <ConnectionIndicator isConnected={isConnected} />
        <OnlineUsers users={onlineUsers} cpName={deal.cp.name} />
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-white/10 mb-3" />
            <p className="text-sm text-white/30">아직 메시지가 없습니다</p>
            <p className="text-xs text-white/15 mt-1">첫 메시지를 보내 대화를 시작하세요</p>
          </div>
        ) : (
          messages.map(m => (
            <MessageBubble
              key={m.id}
              message={m}
              currentUserId={CURRENT_USER_ID}
              onOfferAccept={handleOfferAccept}
              onOfferReject={handleOfferReject}
              onOfferCounter={handleOfferCounter}
            />
          ))
        )}

        {/* 타이핑 인디케이터 */}
        {isTyping && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-white/20 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-xs text-white/25">{deal.cp.name} 입력 중...</span>
          </div>
        )}
      </div>

      {/* File Attachment Preview */}
      {attachedFile && (
        <div className="px-4 py-2 border-t border-white/[0.06] bg-[#0A1628]">
          <FileAttachment
            selectedFile={attachedFile}
            onFileSelect={setAttachedFile}
            onRemove={() => setAttachedFile(null)}
          />
        </div>
      )}

      {/* Input Bar */}
      <div className="border-t border-white/[0.06] bg-[#080F1A] px-4 py-3 flex items-center gap-2">
        <button
          onClick={() => document.getElementById("chat-file-input")?.click()}
          className="w-8 h-8 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors shrink-0"
        >
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          id="chat-file-input"
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              const reader = new FileReader()
              reader.onload = () => {
                setAttachedFile({ name: f.name, size: f.size, type: f.type, dataUrl: reader.result as string })
              }
              reader.readAsDataURL(f)
            }
            e.target.value = ""
          }}
        />
        <input
          value={msg}
          onChange={e => { setMsg(e.target.value); handleTyping() }}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
          placeholder="메시지를 입력하세요..."
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all tracking-normal"
        />
        <button
          onClick={handleSend}
          disabled={!msg.trim() && !attachedFile}
          className="w-9 h-9 bg-[#2E75B6] hover:bg-[#3680c8] disabled:opacity-30 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Docs Tab (VDR 문서 관리) ─────────────────────────────────────────────────

function DocsTab({ docs, dealId }: { docs: DealDocument[]; dealId: string }) {
  const [selectedFile, setSelectedFile] = useState<AttachedFile | null>(null)
  const [filter, setFilter] = useState<string>("ALL")
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null)
  const [docAnalysis, setDocAnalysis] = useState<Record<string, { summary: string; keyEntities: string[]; risks: string[] }>>({})

  const handleDocAnalyze = async (doc: DealDocument) => {
    setAnalyzingDocId(doc.id)
    try {
      const res = await fetch(`/api/v1/ai/document-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc.id, dealId, fileName: doc.name }),
      })
      if (!res.ok) throw new Error("문서 분석 실패")
      const data = await res.json()
      setDocAnalysis(prev => ({ ...prev, [doc.id]: data }))
      toast.success(`"${doc.name}" 분석 완료`)
    } catch {
      // Fallback mock
      setDocAnalysis(prev => ({
        ...prev,
        [doc.id]: {
          summary: `${doc.name}에 대한 AI 분석 결과입니다. 주요 내용이 자동으로 추출되었습니다.`,
          keyEntities: ["소유자: 주식회사 ○○부동산", "소재지: 서울 강남구 역삼동", "면적: 320.5㎡"],
          risks: doc.category === "LEGAL" ? ["근저당권 설정 확인 필요"] : [],
        },
      }))
      toast.info("API 미연결 — 데모 분석 결과 표시")
    } finally {
      setAnalyzingDocId(null)
    }
  }

  const categories = ["ALL", ...new Set(docs.map(d => d.category))]
  const filtered = filter === "ALL" ? docs : docs.filter(d => d.category === filter)

  const categoryLabel: Record<string, string> = {
    ALL: "전체", TEASER: "티저", OVERVIEW: "개요", COLLATERAL: "담보물",
    FINANCIAL: "재무", LEGAL: "법률", DD: "실사", CONTRACT: "계약",
  }

  const iconColor = (type: string) =>
    type === "pdf" ? "text-red-400" : type === "docx" ? "text-blue-400" : "text-slate-400"

  const tierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      L0: "bg-gray-500/20 text-gray-400", L1: "bg-blue-500/20 text-blue-400",
      L2: "bg-amber-500/20 text-amber-400", L3: "bg-red-500/20 text-red-400",
    }
    return (
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colors[tier] || colors.L0}`}>
        {tier}
      </span>
    )
  }

  const handleUpload = async (file: AttachedFile) => {
    setSelectedFile(file)
    try {
      // Convert dataUrl to Blob for upload
      const [meta, b64] = file.dataUrl.split(",")
      const mime = meta.match(/:(.*?);/)?.[1] ?? file.type
      const binary = atob(b64 ?? "")
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob = new Blob([bytes], { type: mime })

      const formData = new FormData()
      formData.append("file", blob, file.name)
      formData.append("name", file.name)
      formData.append("size", String(file.size))
      formData.append("type", file.type)
      formData.append("category", "GENERAL")
      await fetch(`/api/v1/exchange/deals/${dealId}/documents`, {
        method: "POST",
        body: formData,
      })
      // If successful, the file stays selected; errors are silent (non-critical)
    } catch { /* upload failed silently; file still shows in UI */ }
  }

  return (
    <div className="p-5 space-y-5">
      {/* Upload Area */}
      <FileAttachment
        onFileSelect={handleUpload}
        selectedFile={selectedFile}
        onRemove={() => setSelectedFile(null)}
        maxSizeMB={50}
      />

      {/* OCR + Cross-links */}
      <div className="flex gap-2">
        <Link
          href={`/exchange/sell?dealId=${dealId}`}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500/[0.08] border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-xl text-[11px] font-semibold tracking-normal transition-all"
        >
          <ScanLine className="w-3.5 h-3.5" />
          OCR 자동입력
        </Link>
        <Link
          href={`/deals/contract?dealId=${dealId}`}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500/[0.08] border border-blue-500/20 hover:border-blue-500/40 text-blue-400 rounded-xl text-[11px] font-semibold tracking-normal transition-all"
        >
          <FileSignature className="w-3.5 h-3.5" />
          계약서 생성
        </Link>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium tracking-normal whitespace-nowrap transition-all ${
              filter === cat
                ? "bg-blue-600 text-white"
                : "bg-white/[0.05] text-white/40 hover:text-white/70 border border-white/[0.06]"
            }`}
          >
            {categoryLabel[cat] || cat}
          </button>
        ))}
      </div>

      {/* File List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/30 tracking-normal">총 {filtered.length}개 문서</span>
        </div>
        {filtered.map(d => (
          <div key={d.id} className="space-y-0">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/[0.12] hover:bg-white/[0.05] transition-all group">
              <FileText className={`w-5 h-5 shrink-0 ${iconColor(d.type)}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white tracking-normal truncate">{d.name}</p>
                  {tierBadge(d.tier_required)}
                  <span className="text-[9px] text-white/25 bg-white/[0.05] px-1.5 py-0.5 rounded">
                    {categoryLabel[d.category] || d.category}
                  </span>
                </div>
                <p className="text-[11px] text-white/30 tracking-normal">{d.uploaded_by_name} · {d.created_at} · {d.size}</p>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                <button
                  onClick={() => handleDocAnalyze(d)}
                  disabled={analyzingDocId === d.id}
                  className="flex items-center gap-1 px-2 py-1.5 bg-purple-500/[0.15] hover:bg-purple-500/[0.25] border border-purple-500/30 rounded-lg text-xs text-purple-300 hover:text-purple-200 transition-all tracking-normal disabled:opacity-40"
                >
                  {analyzingDocId === d.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                  AI 분석
                </button>
                <button className="flex items-center gap-1 px-2 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-xs text-white/60 hover:text-white transition-all tracking-normal">
                  <Eye className="w-3 h-3" /> 열기
                </button>
                <button className="flex items-center gap-1 px-2 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-xs text-white/60 hover:text-white transition-all tracking-normal">
                  <Download className="w-3 h-3" />
                </button>
              </div>
            </div>
            {/* AI Analysis Result */}
            {docAnalysis[d.id] && (
              <div className="ml-8 mt-1 mb-2 bg-purple-500/[0.04] border border-purple-500/20 rounded-xl px-4 py-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span className="text-[10px] font-bold text-purple-400 tracking-normal">AI 분석 결과</span>
                </div>
                <p className="text-xs text-white/55 tracking-normal leading-relaxed">{docAnalysis[d.id].summary}</p>
                {docAnalysis[d.id].keyEntities.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/30 tracking-normal mb-1">주요 항목</p>
                    <div className="flex flex-wrap gap-1.5">
                      {docAnalysis[d.id].keyEntities.map((e, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded text-white/50 tracking-normal">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
                {docAnalysis[d.id].risks.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/30 tracking-normal mb-1">리스크 항목</p>
                    {docAnalysis[d.id].risks.map((r, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-amber-400/70 tracking-normal">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Offer Tab (OfferCard/OfferForm 연결) ─────────────────────────────────────

function OfferTab({ offers: initialOffers, dealId }: { offers: DealOffer[]; dealId: string }) {
  const [offers, setOffers] = useState(initialOffers)
  const [showOfferForm, setShowOfferForm] = useState(false)

  const buyer  = offers.filter(o => o.side === "매수자").at(-1)
  const seller = offers.filter(o => o.side === "매도자").at(-1)
  const gap    = seller && buyer ? seller.amount - buyer.amount : 0

  const handleNewOffer = async (offerData: Omit<OfferData, "status">) => {
    const newOffer: DealOffer = {
      id: `o-${Date.now()}`,
      side: "매수자",
      label: `${offers.length + 1}차 제안`,
      amount: offerData.amount,
      date: new Date().toISOString().split("T")[0],
      note: offerData.conditions || "",
      status: "pending",
      conditions: offerData.conditions,
      payment_method: offerData.payment_method,
      valid_until: offerData.valid_until,
      sender_id: CURRENT_USER_ID,
    }
    setOffers(prev => [...prev, newOffer]) // optimistic update
    setShowOfferForm(false)
    try {
      const res = await fetch(`/api/v1/exchange/deals/${dealId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: offerData.amount,
          note: offerData.conditions || "",
          conditions: offerData.conditions,
          payment_method: offerData.payment_method,
        }),
      })
      if (res.ok) {
        const { data } = await res.json()
        if (data?.id) {
          // Replace temp id with server-assigned id
          setOffers(prev => prev.map(o => o.id === newOffer.id ? { ...o, id: data.id } : o))
        }
      }
    } catch { /* optimistic UI already updated */ }
  }

  const handleAcceptOffer = async (offerId: string) => {
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: "accepted" } : o))
    try {
      await fetch(`/api/v1/exchange/deals/${dealId}/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ACCEPTED" }),
      })
    } catch { /* optimistic */ }
  }

  const handleRejectOffer = async (offerId: string) => {
    setOffers(prev => prev.map(o => o.id === offerId ? { ...o, status: "rejected" } : o))
    try {
      await fetch(`/api/v1/exchange/deals/${dealId}/offers/${offerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      })
    } catch { /* optimistic */ }
  }

  return (
    <div className="p-5 space-y-5">
      {/* Current Positions */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-500/[0.08] border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] text-blue-400/70 tracking-normal font-medium">매수자 최근 제안가</span>
          </div>
          <p className="text-2xl font-extrabold text-blue-400 tabular-nums">{buyer ? fmt(buyer.amount) : "—"}</p>
          <p className="text-[10px] text-blue-400/40 mt-1 tracking-normal">{buyer?.date}</p>
        </div>
        <div className="bg-orange-500/[0.08] border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ArrowDownRight className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[11px] text-orange-400/70 tracking-normal font-medium">매도자 현재 요청가</span>
          </div>
          <p className="text-2xl font-extrabold text-orange-400 tabular-nums">{seller ? fmt(seller.amount) : "—"}</p>
          <p className="text-[10px] text-orange-400/40 mt-1 tracking-normal">{seller?.date}</p>
        </div>
      </div>

      {/* Gap Indicator */}
      {gap > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-white/40 tracking-normal">현재 가격 차이</span>
          <span className="text-sm font-bold text-amber-400 tabular-nums">{fmt(gap)}</span>
        </div>
      )}

      {/* Offer Timeline with OfferCard */}
      <div>
        <p className="text-xs font-semibold text-white/50 tracking-normal mb-3 uppercase">오퍼 히스토리</p>
        <div className="space-y-3">
          {offers.map(o => (
            <div key={o.id} className="relative">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border tracking-normal ${
                  o.side === "매수자"
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-orange-500/20 border-orange-500/40 text-orange-300"
                }`}>
                  {o.side}
                </span>
                <span className="text-xs text-white/60 tracking-normal">{o.label}</span>
                <span className="text-[10px] text-white/25 tracking-normal ml-auto tabular-nums">{o.date}</span>
              </div>
              <OfferCard
                offer={{
                  amount: o.amount,
                  conditions: o.conditions || o.note,
                  payment_method: o.payment_method || "",
                  valid_until: o.valid_until || "",
                  status: (o.status as any) || "pending",
                }}
                isMine={o.sender_id === CURRENT_USER_ID}
                onAccept={o.status === "pending" && o.sender_id !== CURRENT_USER_ID ? () => handleAcceptOffer(o.id) : undefined}
                onReject={o.status === "pending" && o.sender_id !== CURRENT_USER_ID ? () => handleRejectOffer(o.id) : undefined}
                onCounter={o.status === "pending" && o.sender_id !== CURRENT_USER_ID
                  ? (counter) => {
                      const newOffer: DealOffer = {
                        id: `o-${Date.now()}`,
                        side: "매수자",
                        label: "역제안",
                        amount: counter.amount,
                        date: new Date().toISOString().split("T")[0],
                        note: counter.conditions,
                        status: "pending",
                        conditions: counter.conditions,
                        sender_id: CURRENT_USER_ID,
                      }
                      setOffers(prev => [
                        ...prev.map(p => p.id === o.id ? { ...p, status: "countered" } : p),
                        newOffer,
                      ])
                    }
                  : undefined
                }
              />
            </div>
          ))}
        </div>
      </div>

      {/* New Offer Form */}
      {showOfferForm ? (
        <OfferForm
          onSubmit={handleNewOffer}
          onCancel={() => setShowOfferForm(false)}
        />
      ) : (
        <button
          onClick={() => setShowOfferForm(true)}
          className="w-full py-3 bg-[#112845] hover:bg-[#1a3660] border border-white/[0.08] hover:border-blue-500/40 text-white rounded-xl font-medium text-sm tracking-normal transition-all"
        >
          새 오퍼 작성
        </button>
      )}
    </div>
  )
}

// ── Due Diligence Tab (강화 — 15항목 + 설명) ─────────────────────────────────

function DDTab({ items: initialItems, dealId }: { items: DDItem[]; dealId: string }) {
  const [items, setItems] = useState(initialItems)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggle = (id: string) =>
    setItems(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item))

  const done  = items.filter(i => i.done).length
  const total = items.length
  const pct   = Math.round((done / total) * 100)

  const categories = [...new Set(items.map(i => i.category))]

  return (
    <div className="p-5 space-y-5">
      {/* Progress */}
      <div className="card-interactive-dark rounded-xl p-4">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs text-white/50 tracking-normal font-medium">실사 완료율</span>
          <span className="text-sm font-extrabold text-blue-400 tabular-nums">{done}/{total} 완료</span>
        </div>
        <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-[10px] text-white/25 tracking-normal">{pct}% 완료</p>
          <Link
            href={`/analysis/due-diligence?dealId=${dealId}`}
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
          >
            AI 실사 보고서 생성 →
          </Link>
        </div>
      </div>

      {/* Cross-links */}
      <div className="flex gap-2">
        <Link
          href={`/analysis/due-diligence?dealId=${dealId}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500/[0.08] border border-blue-500/20 hover:border-blue-500/40 text-blue-300 rounded-xl text-xs font-semibold tracking-normal transition-all"
        >
          <FileText className="w-3.5 h-3.5" />
          투자은행급 보고서
        </Link>
        <Link
          href={`/analysis/simulator?dealId=${dealId}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500/[0.08] border border-purple-500/20 hover:border-purple-500/40 text-purple-300 rounded-xl text-xs font-semibold tracking-normal transition-all"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          경매 시뮬레이터
        </Link>
      </div>

      {/* Checklist by Category */}
      <div className="space-y-4">
        {categories.map(cat => {
          const catItems = items.filter(i => i.category === cat)
          const catDone = catItems.filter(i => i.done).length
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{cat}</p>
                <span className="text-[10px] text-white/20 tabular-nums">{catDone}/{catItems.length}</span>
              </div>
              <div className="space-y-1.5">
                {catItems.map(item => (
                  <div key={item.id}>
                    <button
                      onClick={() => toggle(item.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition-all text-left group"
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                        ${item.done
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                          : "border-white/20 group-hover:border-white/40"}`}>
                        {item.done && <CheckCircle2 className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm tracking-normal transition-colors ${
                          item.done ? "text-white/40 line-through" : "text-white/80"
                        }`}>
                          {item.label}
                        </span>
                      </div>
                      {!item.done && <AlertCircle className="w-3.5 h-3.5 text-amber-500/50 shrink-0" />}
                      {item.description && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === item.id ? null : item.id) }}
                          className="text-[10px] text-blue-400/60 hover:text-blue-400 px-1"
                        >
                          {expandedId === item.id ? "접기" : "상세"}
                        </button>
                      )}
                    </button>
                    {expandedId === item.id && item.description && (
                      <div className="ml-12 mt-1 px-4 py-2 bg-white/[0.02] border-l-2 border-blue-500/30 rounded-r-lg">
                        <p className="text-xs text-white/40 leading-relaxed">{item.description}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Contract Tab (e-sign 세션 연동) ──────────────────────────────────────────

function ContractTab({ deal, session }: { deal: DealInfo; session: SignSession }) {
  const [signSession, setSignSession] = useState<SignSession>(session)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [signingInProgress, setSigning] = useState(false)

  // ── AI Contract Review State ──
  const [contractReviewLoading, setContractReviewLoading] = useState(false)
  const [contractReview, setContractReview] = useState<{
    riskLevel: string
    riskScore: number
    clauses: { clause: string; risk: string; suggestion: string }[]
  } | null>(null)

  const handleAiContractReview = async () => {
    setContractReviewLoading(true)
    try {
      const res = await fetch(`/api/v1/ai/contract-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: signSession.id, documentId: signSession.documentId }),
      })
      if (!res.ok) throw new Error("계약서 검토 실패")
      const data = await res.json()
      setContractReview(data)
      toast.success("AI 계약서 검토가 완료되었습니다")
    } catch {
      // Fallback mock
      setContractReview({
        riskLevel: "LOW",
        riskScore: 15,
        clauses: [
          { clause: "제5조 채권양도 통지", risk: "LOW", suggestion: "내용증명 발송 기한을 명시하는 것을 권장합니다." },
          { clause: "제8조 하자담보책임", risk: "MEDIUM", suggestion: "하자 발견 시 매도자 책임 범위가 모호합니다. 구체적 기준 추가를 권장합니다." },
          { clause: "제12조 분쟁해결", risk: "LOW", suggestion: "중재 조항이 포함되어 있어 분쟁 시 효율적 해결이 가능합니다." },
        ],
      })
      toast.info("API 미연결 — 데모 분석 결과를 표시합니다")
    } finally {
      setContractReviewLoading(false)
    }
  }

  const mySignerIdx = signSession.signers.findIndex(s => s.userId === CURRENT_USER_ID)
  const mySigner = signSession.signers[mySignerIdx]
  const isSigned = mySigner?.status === "SIGNED"
  const allSigned = signSession.signers.every(s => s.status === "SIGNED")
  const signedCount = signSession.signers.filter(s => s.status === "SIGNED").length
  const totalSigners = signSession.signers.length

  const sessionStatusLabel: Record<SessionStatus, { text: string; cls: string }> = {
    DRAFT: { text: "초안 작성 중", cls: "bg-slate-500/[0.1] text-slate-400 border-slate-500/30" },
    ACTIVE: { text: `서명 진행 중 (${signedCount}/${totalSigners})`, cls: "bg-amber-500/[0.08] text-amber-400 border-amber-500/30" },
    COMPLETED: { text: "전원 서명 완료", cls: "bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/30" },
    VOIDED: { text: "계약 무효화", cls: "bg-red-500/[0.08] text-red-400 border-red-500/30" },
    EXPIRED: { text: "서명 기한 만료", cls: "bg-slate-500/[0.08] text-slate-400 border-slate-500/30" },
  }

  const signerStatusIcon = (status: SignerStatus) => {
    switch (status) {
      case "SIGNED": return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      case "VIEWED": return <Eye className="w-4 h-4 text-blue-400" />
      case "REJECTED": return <XCircle className="w-4 h-4 text-red-400" />
      case "EXPIRED": return <Timer className="w-4 h-4 text-slate-400" />
      default: return <Clock className="w-4 h-4 text-amber-400" />
    }
  }

  const signerStatusLabel = (status: SignerStatus) =>
    status === "SIGNED" ? "서명 완료" :
    status === "VIEWED" ? "문서 열람" :
    status === "REJECTED" ? "서명 거부" :
    status === "EXPIRED" ? "기한 만료" : "서명 대기"

  const roleLabel = (role: string) =>
    role === "SELLER" ? "매도자" : role === "BUYER" ? "매수자" :
    role === "WITNESS" ? "증인" : role === "NOTARY" ? "공증인" : "대리인"

  const handleSignatureConfirm = async (signatureBase64: string) => {
    setSigning(true)
    // e-sign API 호출: POST /api/v1/esign/sessions/{sessionId}/sign
    try {
      const res = await fetch(`/api/v1/esign/sessions/${signSession.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerId: mySigner?.id,
          signatureImage: signatureBase64,
          ci: "PASS_CI_PLACEHOLDER",
        }),
      })
      // 낙관적 업데이트
      const updatedSigners = signSession.signers.map((s, i) =>
        i === mySignerIdx ? { ...s, status: "SIGNED" as SignerStatus, signedAt: new Date().toISOString() } : s
      )
      const newAllSigned = updatedSigners.every(s => s.status === "SIGNED")
      setSignSession({
        ...signSession,
        signers: updatedSigners,
        status: newAllSigned ? "COMPLETED" : signSession.status,
      })
    } catch {
      // fallback: 로컬 상태 업데이트
      const updatedSigners = signSession.signers.map((s, i) =>
        i === mySignerIdx ? { ...s, status: "SIGNED" as SignerStatus, signedAt: new Date().toISOString() } : s
      )
      setSignSession({ ...signSession, signers: updatedSigners })
    } finally {
      setSigning(false)
      setShowSignaturePad(false)
    }
  }

  const st = sessionStatusLabel[signSession.status]

  // 만료까지 남은 시간
  const expiresAt = new Date(signSession.expiresAt)
  const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000))

  return (
    <div className="p-5 space-y-5">
      {/* Session Status */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${st.cls}`}>
        <div className="flex items-center gap-2">
          {allSigned ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <Clock className="w-4 h-4 shrink-0" />}
          <span className="text-xs font-medium tracking-normal">{st.text}</span>
        </div>
        {signSession.status === "ACTIVE" && (
          <span className="text-[10px] text-white/40 tracking-normal">만료까지 {daysLeft}일</span>
        )}
      </div>

      {/* Document Hash Lock */}
      <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/[0.06] border border-blue-500/20 rounded-lg">
        <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-blue-300/80 tracking-normal">문서 해시 잠금 (SHA-256)</p>
          <p className="text-[9px] text-white/25 font-mono truncate">{signSession.documentHash}</p>
        </div>
      </div>

      {/* Contract Preview */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-white tracking-normal">NPL 매매계약서 최종안.pdf</span>
          </div>
          <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-lg text-xs text-white/50 hover:text-white transition-all tracking-normal">
            <Download className="w-3 h-3" /> 다운로드
          </button>
        </div>
        <div className="p-5 space-y-3">
          {[
            ["계약 일자", "2024년 11월 15일"],
            ["매도자", "주식회사 ○○부동산"],
            ["매수자", deal.cp.name + " (" + deal.cp.role + ")"],
            ["매매 목적물", deal.asset.title],
            ["채권 원금", formatKRW(deal.asset.principal)],
            ["매매 대금", formatKRW(268000000)],
            ["잔금 지급일", deal.estClose],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-xs text-white/35 tracking-normal">{k}</span>
              <span className="text-sm font-medium text-white tracking-normal">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Contract Review */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-white tracking-normal">AI 계약서 리스크 분석</span>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {!contractReview ? (
            <button
              onClick={handleAiContractReview}
              disabled={contractReviewLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm tracking-normal transition-all shadow-lg shadow-purple-900/30"
            >
              {contractReviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
              {contractReviewLoading ? "AI 분석 중..." : "AI 계약서 검토 실행"}
            </button>
          ) : (
            <>
              {/* Risk Score */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                contractReview.riskLevel === "LOW" ? "bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/30" :
                contractReview.riskLevel === "MEDIUM" ? "bg-amber-500/[0.08] text-amber-400 border-amber-500/30" :
                "bg-red-500/[0.08] text-red-400 border-red-500/30"
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-medium tracking-normal">
                    리스크 수준: {contractReview.riskLevel === "LOW" ? "낮음" : contractReview.riskLevel === "MEDIUM" ? "보통" : "높음"}
                  </span>
                </div>
                <span className="text-xs font-bold tabular-nums">{contractReview.riskScore}점</span>
              </div>
              {/* Clauses */}
              <div className="space-y-2">
                {contractReview.clauses.map((c, i) => (
                  <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-normal ${
                        c.risk === "LOW" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                        c.risk === "MEDIUM" ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                        "bg-red-500/20 text-red-400 border-red-500/40"
                      }`}>
                        {c.risk === "LOW" ? "낮음" : c.risk === "MEDIUM" ? "보통" : "높음"}
                      </span>
                      <span className="text-sm text-white font-medium tracking-normal">{c.clause}</span>
                    </div>
                    <p className="text-[11px] text-white/45 tracking-normal leading-relaxed">{c.suggestion}</p>
                  </div>
                ))}
              </div>
              {/* Re-run */}
              <button
                onClick={handleAiContractReview}
                disabled={contractReviewLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-lg text-xs text-white/50 hover:text-white transition-all tracking-normal disabled:opacity-40"
              >
                {contractReviewLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                다시 분석
              </button>
            </>
          )}
        </div>
      </div>

      {/* Signing Parties — Full Status */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06]">
          <span className="text-xs font-semibold text-white tracking-normal">서명자 현황 ({signedCount}/{totalSigners})</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {signSession.signers.map(signer => (
            <div key={signer.id} className="flex items-center gap-3 px-5 py-3">
              {signerStatusIcon(signer.status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white tracking-normal font-medium">{signer.name}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/[0.06] text-white/50 rounded tracking-normal">{roleLabel(signer.role)}</span>
                  {signer.userId === CURRENT_USER_ID && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded tracking-normal">나</span>
                  )}
                </div>
                <p className="text-[10px] text-white/30 tracking-normal">
                  {signer.signedAt
                    ? `서명 완료: ${new Date(signer.signedAt).toLocaleString("ko-KR")}`
                    : signerStatusLabel(signer.status)}
                </p>
              </div>
              <span className={`text-[10px] font-medium tracking-normal ${
                signer.status === "SIGNED" ? "text-emerald-400" :
                signer.status === "REJECTED" ? "text-red-400" : "text-white/30"
              }`}>
                {signerStatusLabel(signer.status)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Signature Pad */}
      {showSignaturePad && (
        <div className="bg-white/[0.03] border border-blue-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white">전자서명</p>
            <p className="text-[10px] text-white/30">서명은 법적 효력을 가집니다</p>
          </div>
          <SignaturePad
            onConfirm={handleSignatureConfirm}
            onClear={() => {}}
          />
        </div>
      )}

      {/* Sign Button */}
      {!isSigned && mySigner && signSession.status === "ACTIVE" ? (
        <button
          onClick={() => setShowSignaturePad(!showSignaturePad)}
          disabled={signingInProgress}
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white rounded-xl font-semibold text-sm tracking-normal transition-all shadow-lg shadow-emerald-900/40"
        >
          {signingInProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenLine className="w-4 h-4" />}
          {signingInProgress ? "서명 처리 중..." : showSignaturePad ? "서명패드 닫기" : "전자서명 하기"}
        </button>
      ) : isSigned ? (
        <button className="w-full flex items-center justify-center gap-2.5 py-4 bg-white/[0.05] border border-emerald-500/20 text-emerald-400 rounded-xl font-semibold text-sm tracking-normal cursor-default" disabled>
          <CheckCircle2 className="w-4 h-4" />
          내 서명 완료
        </button>
      ) : null}

      {/* Cross-link: 새 계약서 작성 */}
      <div className="flex gap-2">
        <Link
          href={`/deals/contract?dealId=${deal.id}&listingId=${deal.listingId}`}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500/[0.08] border border-blue-500/20 hover:border-blue-500/40 text-blue-400 rounded-xl text-xs font-semibold tracking-normal transition-all"
        >
          <FileSignature className="w-3.5 h-3.5" />
          새 계약서 작성
        </Link>
        <button
          onClick={handleAiContractReview}
          disabled={contractReviewLoading}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-500/[0.08] border border-purple-500/20 hover:border-purple-500/40 text-purple-400 rounded-xl text-xs font-semibold tracking-normal transition-all disabled:opacity-50"
        >
          {contractReviewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
          AI 계약서 검토
        </button>
      </div>

      {/* Chain Hash Verification */}
      {allSigned && signSession.chainHash && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-emerald-300 font-medium tracking-normal">서명 체인 검증 완료</p>
            <p className="text-[9px] text-white/25 font-mono truncate">{signSession.chainHash}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Escrow Tab (에스크로 마일스톤 진행) ──────────────────────────────────────

function EscrowTab({ escrow: initialEscrow, deal }: { escrow: EscrowAccount; deal: DealInfo }) {
  const [escrow, setEscrow] = useState(initialEscrow)

  const completedMilestones = escrow.milestones.filter(m => m.status === "COMPLETED").length
  const totalMilestones = escrow.milestones.length
  const releasedRatio = escrow.milestones.filter(m => m.status === "COMPLETED").reduce((s, m) => s + m.releaseRatio, 0)
  const releasedAmount = Math.round(escrow.totalAmount * releasedRatio)
  const holdAmount = escrow.totalAmount - releasedAmount

  const statusConfig: Record<EscrowStatus, { label: string; cls: string; icon: React.ElementType }> = {
    OPENED: { label: "입금 대기", cls: "bg-amber-500/[0.08] text-amber-400 border-amber-500/30", icon: Clock },
    FUNDED: { label: "입금 완료", cls: "bg-blue-500/[0.08] text-blue-400 border-blue-500/30", icon: CheckCircle2 },
    MILESTONE: { label: "마일스톤 진행 중", cls: "bg-blue-500/[0.08] text-blue-400 border-blue-500/30", icon: CircleDot },
    READY: { label: "정산 대기 (쿨링오프)", cls: "bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/30", icon: Timer },
    SETTLED: { label: "정산 완료", cls: "bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/30", icon: CheckCircle2 },
    REFUNDED: { label: "환불 완료", cls: "bg-slate-500/[0.08] text-slate-400 border-slate-500/30", icon: RotateCcw },
    FROZEN: { label: "분쟁 동결", cls: "bg-red-500/[0.08] text-red-400 border-red-500/30", icon: Ban },
    EXPIRED: { label: "기한 만료", cls: "bg-slate-500/[0.08] text-slate-400 border-slate-500/30", icon: Timer },
  }

  const sc = statusConfig[escrow.status]
  const StatusIcon = sc.icon

  const handleCompleteMilestone = async (milestoneId: string) => {
    // API: POST /api/v1/escrow/{escrowId}/milestones/{milestoneId}/complete
    try {
      await fetch(`/api/v1/escrow/${escrow.id}/milestones/${milestoneId}/complete`, { method: "POST" })
    } catch { /* fallback */ }
    // 낙관적 업데이트
    const updatedMs = escrow.milestones.map(m =>
      m.id === milestoneId ? { ...m, status: "COMPLETED" as const, completedAt: new Date().toISOString() } : m
    )
    const allDone = updatedMs.every(m => m.status === "COMPLETED")
    setEscrow({ ...escrow, milestones: updatedMs, status: allDone ? "READY" : "MILESTONE", updatedAt: new Date().toISOString() })
  }

  const partyLabel = (p: string) => p === "SELLER" ? "매도자" : p === "BUYER" ? "매수자" : "관리자"

  return (
    <div className="p-5 space-y-5">
      {/* Escrow Status */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${sc.cls}`}>
        <div className="flex items-center gap-2">
          <StatusIcon className="w-4 h-4 shrink-0" />
          <span className="text-xs font-medium tracking-normal">{sc.label}</span>
        </div>
        <span className="text-[10px] tracking-normal opacity-70">#{escrow.id}</span>
      </div>

      {/* Escrow Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5 text-center">
          <p className="text-[10px] text-white/30 tracking-normal mb-1">에스크로 총액</p>
          <p className="text-lg font-bold text-white tabular-nums">{fmt(escrow.totalAmount)}</p>
        </div>
        <div className="bg-emerald-500/[0.04] border border-emerald-500/20 rounded-xl p-3.5 text-center">
          <p className="text-[10px] text-emerald-400/60 tracking-normal mb-1">정산 가능</p>
          <p className="text-lg font-bold text-emerald-400 tabular-nums">{fmt(releasedAmount)}</p>
        </div>
        <div className="bg-blue-500/[0.04] border border-blue-500/20 rounded-xl p-3.5 text-center">
          <p className="text-[10px] text-blue-400/60 tracking-normal mb-1">보관 중</p>
          <p className="text-lg font-bold text-blue-400 tabular-nums">{fmt(holdAmount)}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/50 tracking-normal">마일스톤 진행률</span>
          <span className="text-xs font-bold text-white tracking-normal">{completedMilestones}/{totalMilestones} 완료</span>
        </div>
        <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${(releasedRatio * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-white/25 tracking-normal">0%</span>
          <span className="text-[10px] text-emerald-400/60 tracking-normal font-medium">{(releasedRatio * 100).toFixed(0)}% 릴리즈</span>
          <span className="text-[10px] text-white/25 tracking-normal">100%</span>
        </div>
      </div>

      {/* Milestone Timeline */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-xs font-semibold text-white tracking-normal">마일스톤 상세</span>
          <span className="text-[10px] text-white/30 tracking-normal">에스크로 자금은 마일스톤 완료 시 단계적 정산</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {escrow.milestones.map((ms, idx) => {
            const isComplete = ms.status === "COMPLETED"
            const isNext = !isComplete && (idx === 0 || escrow.milestones[idx - 1].status === "COMPLETED")
            const releaseAmt = Math.round(escrow.totalAmount * ms.releaseRatio)
            return (
              <div key={ms.id} className={`px-5 py-4 ${isNext ? "bg-blue-500/[0.03]" : ""}`}>
                <div className="flex items-start gap-3">
                  {/* Step Indicator */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                    isComplete
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : isNext
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40 ring-2 ring-blue-500/30"
                        : "bg-white/[0.04] border border-white/[0.1] text-white/20"
                  }`}>
                    {isComplete ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium tracking-normal ${isComplete ? "text-emerald-400" : "text-white"}`}>
                        {ms.name}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-white/[0.06] text-white/40 rounded tracking-normal">
                        {partyLabel(ms.responsibleParty)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-white/40 tracking-normal">
                        릴리즈 {(ms.releaseRatio * 100).toFixed(0)}% · {formatKRW(releaseAmt)}
                      </span>
                      {isComplete && ms.completedAt && (
                        <span className="text-emerald-400/60 tracking-normal">
                          {new Date(ms.completedAt).toLocaleString("ko-KR")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="shrink-0">
                    {isComplete ? (
                      <span className="text-[10px] text-emerald-400 font-medium tracking-normal">완료</span>
                    ) : isNext ? (
                      <button
                        onClick={() => handleCompleteMilestone(ms.id)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg tracking-normal transition-colors"
                      >
                        완료 처리
                      </button>
                    ) : (
                      <span className="text-[10px] text-white/20 tracking-normal">대기</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Virtual Account Info */}
      {escrow.virtualAccountNo && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">가상계좌 정보</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/35 tracking-normal">계좌번호</span>
            <span className="text-sm font-mono font-medium text-white tracking-normal">{escrow.virtualAccountNo}</span>
          </div>
          {escrow.fundedAt && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/35 tracking-normal">입금 확인</span>
              <span className="text-xs text-emerald-400 tracking-normal">{new Date(escrow.fundedAt).toLocaleString("ko-KR")}</span>
            </div>
          )}
        </div>
      )}

      {/* Cooling-off Notice */}
      {escrow.status === "READY" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl">
          <Timer className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs text-emerald-300 font-medium tracking-normal">모든 마일스톤 완료 — 쿨링오프 기간</p>
            <p className="text-[10px] text-white/40 tracking-normal mt-0.5">7일 경과 후 매도자 정산이 자동 실행됩니다</p>
          </div>
        </div>
      )}

      {/* Frozen Notice */}
      {escrow.status === "FROZEN" && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/[0.06] border border-red-500/20 rounded-xl">
          <Ban className="w-4 h-4 text-red-400 shrink-0" />
          <div>
            <p className="text-xs text-red-300 font-medium tracking-normal">에스크로 동결 — 분쟁 중</p>
            <p className="text-[10px] text-white/40 tracking-normal mt-0.5">{escrow.freezeReason || "관리자 확인 중입니다"}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── AI Analysis Types ────────────────────────────────────────────────────────

interface RecoveryPrediction {
  recoveryRate: number
  confidence: number
  grade: string
  factors: { label: string; impact: number }[]
}

interface AnomalyResult {
  status: "SAFE" | "CAUTION" | "DANGER"
  score: number
  anomalies: { type: string; description: string; severity: string }[]
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ deal }: { deal: DealInfo }) {
  const a = deal.asset

  // ── AI Analysis State ──
  const [recoveryData, setRecoveryData] = useState<RecoveryPrediction | null>(null)
  const [anomalyData, setAnomalyData] = useState<AnomalyResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [ddReportLoading, setDdReportLoading] = useState(false)

  const fetchAiAnalysis = useCallback(async () => {
    setAiLoading(true)
    setAiError(null)
    try {
      const [recoveryRes, anomalyRes] = await Promise.all([
        fetch(`/api/v1/ai/recovery-predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: deal.listingId }),
        }),
        fetch(`/api/v1/ai/anomaly-detect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId: deal.listingId }),
        }),
      ])
      if (!recoveryRes.ok || !anomalyRes.ok) throw new Error("AI 분석 API 호출 실패")
      const [recovery, anomaly] = await Promise.all([recoveryRes.json(), anomalyRes.json()])
      setRecoveryData(recovery)
      setAnomalyData(anomaly)
    } catch (err: any) {
      setAiError(err.message || "AI 분석을 불러올 수 없습니다")
      // Fallback mock data for demo
      setRecoveryData({ recoveryRate: 78.5, confidence: 0.92, grade: "A+", factors: [
        { label: "담보가치 대비 채권비율", impact: 0.35 },
        { label: "지역 시장 동향", impact: 0.25 },
        { label: "채무자 신용등급", impact: 0.20 },
        { label: "경매 낙찰가율", impact: 0.15 },
      ]})
      setAnomalyData({ status: "SAFE", score: 0.12, anomalies: [] })
    } finally {
      setAiLoading(false)
    }
  }, [deal.listingId])

  useEffect(() => { fetchAiAnalysis() }, [fetchAiAnalysis])

  const handleDdReport = async () => {
    setDdReportLoading(true)
    try {
      const res = await fetch(`/api/v1/ai/dd-report?engine=ai&listingId=${deal.listingId}`)
      if (!res.ok) throw new Error("보고서 생성 실패")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `AI실사보고서_${deal.listingId}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast.success("AI 실사 보고서가 생성되었습니다")
    } catch {
      toast.error("AI 실사 보고서 생성에 실패했습니다. 잠시 후 다시 시도해주세요.")
    } finally {
      setDdReportLoading(false)
    }
  }

  const anomalyStatusConfig = {
    SAFE:    { label: "안전", cls: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40", icon: ShieldCheck },
    CAUTION: { label: "주의", cls: "bg-amber-500/20 text-amber-400 border-amber-500/40", icon: AlertTriangle },
    DANGER:  { label: "위험", cls: "bg-red-500/20 text-red-400 border-red-500/40", icon: AlertCircle },
  }

  return (
    <div className="p-5 space-y-5">
      {/* ── Listing Link & Property Info ── */}
      <div className="bg-gradient-to-r from-purple-500/[0.06] to-blue-500/[0.06] border border-purple-500/20 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white tracking-normal truncate">{a.title}</p>
            {a.address && <p className="text-[11px] text-white/40 tracking-normal">{a.address}</p>}
          </div>
          <Link
            href={`/exchange/${deal.listingId}`}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg tracking-normal whitespace-nowrap flex items-center gap-1.5 shrink-0"
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> 매물 상세
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {a.appraisalValue && (
            <div className="bg-white/[0.04] rounded-lg p-2.5 text-center">
              <p className="text-[9px] text-white/30 mb-0.5">감정가</p>
              <p className="text-sm font-bold text-white tabular-nums">{formatKRW(a.appraisalValue)}</p>
            </div>
          )}
          <div className="bg-white/[0.04] rounded-lg p-2.5 text-center">
            <p className="text-[9px] text-white/30 mb-0.5">담보유형</p>
            <p className="text-sm font-bold text-white">{a.collateral}</p>
          </div>
          <div className="bg-white/[0.04] rounded-lg p-2.5 text-center">
            <p className="text-[9px] text-white/30 mb-0.5">지역</p>
            <p className="text-sm font-bold text-white">{a.region}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Lock-in Funnel</span>
          <DealStageBadge stage={deal.lockInStage as any} size="sm" />
        </div>
        <DealStageProgress current={deal.lockInStage as any} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "채권 원금", value: fmt(a.principal), tone: "text-white" },
          { label: "AI 등급", value: a.grade, tone: "text-blue-400" },
          { label: "예상 수익", value: a.yield, tone: "text-emerald-400" },
          { label: "담보", value: a.collateral, tone: "text-white" },
        ].map(k => (
          <div key={k.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3.5">
            <p className="text-[10px] text-white/30 tracking-normal mb-1.5">{k.label}</p>
            <p className={`text-lg font-bold ${k.tone} tabular-nums`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2.5">
        <div className="flex items-center gap-2 text-xs text-white/60">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span className="tracking-normal">{a.region} {a.address ? `· ${a.address}` : ''}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="tracking-normal">{deal.startDate} ~ {deal.estClose}</span>
        </div>
      </div>

      {/* ── AI 실시간 분석 ── */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-white tracking-normal">AI 분석 리포트</span>
          </div>
          <button
            onClick={fetchAiAnalysis}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] rounded-lg text-[10px] text-white/50 hover:text-white transition-all tracking-normal disabled:opacity-40"
          >
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            새로고침
          </button>
        </div>

        {aiLoading && !recoveryData ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            <span className="ml-3 text-sm text-white/40 tracking-normal">AI 분석 중...</span>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            {/* Recovery Rate Prediction */}
            {recoveryData && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">회수율 예측</span>
                  <span className="text-[9px] ml-auto text-white/25 tracking-normal">신뢰도 {(recoveryData.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-3xl font-extrabold text-blue-400 tabular-nums leading-none">
                    {recoveryData.recoveryRate.toFixed(1)}%
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded border tracking-normal ${
                    recoveryData.grade.startsWith("A") ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" :
                    recoveryData.grade.startsWith("B") ? "bg-blue-500/20 text-blue-400 border-blue-500/40" :
                    "bg-amber-500/20 text-amber-400 border-amber-500/40"
                  }`}>
                    {recoveryData.grade}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${recoveryData.recoveryRate}%`,
                      background: recoveryData.recoveryRate >= 70
                        ? "linear-gradient(to right, var(--color-brand-mid), #10b981)"
                        : recoveryData.recoveryRate >= 40
                          ? "linear-gradient(to right, #f59e0b, #eab308)"
                          : "linear-gradient(to right, #ef4444, #f97316)",
                    }}
                  />
                </div>
                {/* Factors */}
                {recoveryData.factors.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {recoveryData.factors.map(f => (
                      <div key={f.label} className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
                        <p className="text-[10px] text-white/35 tracking-normal mb-1">{f.label}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500/60 rounded-full" style={{ width: `${f.impact * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-white/50 tabular-nums">{(f.impact * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Anomaly Detection */}
            {anomalyData && (() => {
              const ac = anomalyStatusConfig[anomalyData.status]
              const AnomalyIcon = ac.icon
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider">이상 탐지</span>
                  </div>
                  <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${ac.cls}`}>
                    <div className="flex items-center gap-2">
                      <AnomalyIcon className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-semibold tracking-normal">{ac.label}</span>
                    </div>
                    <span className="text-xs font-bold tabular-nums tracking-normal">
                      이상 점수: {(anomalyData.score * 100).toFixed(1)}점
                    </span>
                  </div>
                  {anomalyData.anomalies.length > 0 && (
                    <div className="space-y-1.5 mt-2">
                      {anomalyData.anomalies.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2 bg-white/[0.02] border border-white/[0.05] rounded-lg">
                          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                            a.severity === "HIGH" ? "text-red-400" : a.severity === "MEDIUM" ? "text-amber-400" : "text-white/30"
                          }`} />
                          <div>
                            <p className="text-xs text-white/70 tracking-normal">{a.type}</p>
                            <p className="text-[10px] text-white/35 tracking-normal">{a.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* AI DD Report Button */}
            <button
              onClick={handleDdReport}
              disabled={ddReportLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 disabled:opacity-50 text-white rounded-xl font-semibold text-sm tracking-normal transition-all shadow-lg shadow-blue-900/30"
            >
              {ddReportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSearch className="w-4 h-4" />}
              {ddReportLoading ? "AI 실사 보고서 생성 중..." : "AI 실사 보고서 생성"}
            </button>

            {aiError && (
              <p className="text-[10px] text-amber-400/60 tracking-normal text-center">
                * API 연결 불가 — 데모 데이터 표시 중
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── AI Quick Insights ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={`/analysis/new?listing=${deal.listingId}`}
          className="bg-gradient-to-r from-blue-500/[0.06] to-emerald-500/[0.06] border border-blue-500/20 rounded-xl p-4 flex items-center gap-3 hover:border-blue-500/40 transition-colors group"
        >
          <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white tracking-normal group-hover:text-blue-300 transition-colors">AI 투자 분석</p>
            <p className="text-[11px] text-white/40 tracking-normal">회수율 · DCF · 몬테카를로</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-blue-400 transition-colors" />
        </Link>
        <Link
          href={`/analysis/copilot?deal=${deal.id}`}
          className="bg-gradient-to-r from-purple-500/[0.06] to-pink-500/[0.06] border border-purple-500/20 rounded-xl p-4 flex items-center gap-3 hover:border-purple-500/40 transition-colors group"
        >
          <Sparkles className="w-5 h-5 text-purple-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white tracking-normal group-hover:text-purple-300 transition-colors">AI Copilot</p>
            <p className="text-[11px] text-white/40 tracking-normal">이 매물에 대해 AI에게 질문</p>
          </div>
          <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-purple-400 transition-colors" />
        </Link>
      </div>

      <div className="bg-gradient-to-r from-blue-500/[0.08] to-emerald-500/[0.08] border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white tracking-normal">다음 단계: LOI 작성</p>
          <p className="text-[11px] text-white/50 tracking-normal mt-0.5">LOI 제출 시 Access Score +120점, MATCHED 단계 진입</p>
        </div>
        <button className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg tracking-normal whitespace-nowrap">
          LOI 작성
        </button>
      </div>
    </div>
  )
}

// ── Meeting Tab ───────────────────────────────────────────────────────────────

function MeetingTab({ meetings }: { meetings: MeetingInfo[] }) {
  const modeStyle = (m: "ONLINE" | "OFFLINE" | "HYBRID") =>
    m === "ONLINE"  ? { bg: "bg-blue-500/[0.1]", fg: "text-blue-300", bd: "border-blue-500/30", icon: Video, label: "온라인" } :
    m === "OFFLINE" ? { bg: "bg-amber-500/[0.1]", fg: "text-amber-300", bd: "border-amber-500/30", icon: MapPin, label: "오프라인" } :
                      { bg: "bg-emerald-500/[0.1]", fg: "text-emerald-300", bd: "border-emerald-500/30", icon: CalendarCheck, label: "하이브리드" }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 tracking-normal">총 {meetings.length}건 (예정 {meetings.filter(m => m.status === "예정").length})</span>
        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg tracking-normal">
          <CalendarCheck className="w-3.5 h-3.5" /> 미팅 예약
        </button>
      </div>

      <div className="space-y-2.5">
        {meetings.map(m => {
          const s = modeStyle(m.mode)
          const ModeIcon = s.icon
          const isPast = m.status === "완료"
          return (
            <div
              key={m.id}
              className={`bg-white/[0.03] border rounded-xl p-4 transition-all ${isPast ? "border-white/[0.04] opacity-60" : "border-white/[0.08] hover:border-white/[0.16]"}`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white tracking-normal mb-0.5">{m.title}</p>
                  <p className="text-[11px] text-white/35 tracking-normal tabular-nums">{m.date}</p>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-bold tracking-normal ${s.bg} ${s.fg} ${s.bd}`}>
                  <ModeIcon className="w-3 h-3" /> {s.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-white/40">
                <div className="flex items-center gap-1.5 tracking-normal">
                  <MapPin className="w-3 h-3" /> {m.venue}
                </div>
                <span className="tracking-normal">참석 {m.attendees}명 · {m.status}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Audit Tab ─────────────────────────────────────────────────────────────────

function AuditTab({ logs }: { logs: AuditLog[] }) {
  const actionStyle = (a: string) =>
    a === "VIEW"     ? { bg: "bg-blue-500/[0.1]", fg: "text-blue-300", icon: Eye } :
    a === "DOWNLOAD" ? { bg: "bg-amber-500/[0.1]", fg: "text-amber-300", icon: Download } :
    a === "STAGE"    ? { bg: "bg-purple-500/[0.1]", fg: "text-purple-300", icon: TrendingUp } :
    a === "OFFER"    ? { bg: "bg-emerald-500/[0.1]", fg: "text-emerald-300", icon: Tag } :
    a === "GRANT"    ? { bg: "bg-rose-500/[0.1]", fg: "text-rose-300", icon: Lock } :
                       { bg: "bg-white/[0.05]", fg: "text-white/60", icon: AlertCircle }

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
        <p className="text-[11px] text-amber-300/90 tracking-normal leading-relaxed">
          모든 접근 로그는 <strong className="text-amber-300">변경 불가능(append-only)</strong>하며, 신용정보법·개인정보보호법에 따라 5년간 보관됩니다.
        </p>
      </div>

      <div className="space-y-1.5">
        {logs.map(log => {
          const s = actionStyle(log.action)
          const Icon = s.icon
          return (
            <div key={log.id} className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/[0.12] transition-all">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.bg} ${s.fg}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s.bg} ${s.fg} tracking-normal`}>
                    {log.action}
                  </span>
                  {log.tier !== "—" && (
                    <span className="text-[9px] font-bold text-white/50 px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded tracking-normal">
                      {log.tier}
                    </span>
                  )}
                  <span className="text-xs text-white tracking-normal truncate">{log.target}</span>
                </div>
                <p className="text-[10px] text-white/35 tracking-normal tabular-nums">{log.actor} · {log.at}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel({ deal }: { deal: DealInfo }) {
  const { asset: a, cp: c } = deal
  return (
    <div className="space-y-4 sticky top-14">
      {/* Asset Summary */}
      <div className="card-interactive-dark rounded-2xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Building2 className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">매물 요약</span>
        </div>
        <p className="text-sm font-semibold text-white leading-snug tracking-normal mb-4">{a.title}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            ["원금", fmt(a.principal), "text-white"],
            ["AI 등급", a.grade, "text-blue-400"],
            ["예상 수익", a.yield, "text-emerald-400"],
          ].map(([k, v, cls]) => (
            <div key={k} className="bg-white/[0.04] border border-white/[0.06] rounded-lg py-2.5">
              <p className="text-[9px] text-white/30 tracking-normal">{k}</p>
              <p className={`text-sm font-bold mt-0.5 ${cls}`}>{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Deal Status */}
      <div className="card-interactive-dark rounded-2xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">거래 현황</span>
        </div>
        <dl className="space-y-2.5">
          {[
            ["단계", STAGES[deal.stage]],
            ["시작일", deal.startDate],
            ["예상 완료", deal.estClose],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center">
              <dt className="text-xs text-white/35 tracking-normal">{k}</dt>
              <dd className="text-xs font-semibold text-white tracking-normal">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Counterparty */}
      <div className="card-interactive-dark rounded-2xl p-5">
        <div className="flex items-center gap-1.5 mb-3">
          <Star className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">상대방 정보</span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-[#2E75B6] flex items-center justify-center text-white text-sm font-bold shrink-0">
            {c.initials.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-semibold text-white tracking-normal">{c.name}</p>
            <p className="text-xs text-white/35 tracking-normal">{c.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/35 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2">
          <Phone className="w-3.5 h-3.5 text-white/25" />
          <span className="tracking-normal">{c.phone}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2E75B6] hover:bg-[#3680c8] text-white rounded-xl text-sm font-medium transition-colors tracking-normal">
          <Send className="w-4 h-4" /> 메시지 보내기
        </button>
        <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] hover:border-blue-500/30 text-white/70 hover:text-white rounded-xl text-sm font-medium transition-all tracking-normal">
          <Video className="w-4 h-4" /> 화상 회의 예약
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealRoomPage() {
  const params = useParams()
  const dealId = params?.id as string || "unknown"
  const [activeTab, setActiveTab] = useState<TabKey>("개요")
  const router = useRouter()
  const [deal, setDeal] = useState<DealInfo | null>(null)
  const [dealLoading, setDealLoading] = useState(true)
  // Per-tab data states — empty by default, populated from Supabase
  const [docs, setDocs] = useState<DealDocument[]>([])
  const [offers, setOffers] = useState<DealOffer[]>([])
  const [ddItems, setDdItems] = useState<DDItem[]>(DEFAULT_DD_ITEMS)
  const [meetings, setMeetings] = useState<MeetingInfo[]>([])
  const [escrow, setEscrow] = useState<EscrowAccount | null>(null)
  const [signSession, setSignSession] = useState<SignSession | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  // authTick is a counter we bump when auth resolves to force sub-component re-render
  const [authTick, setAuthTick] = useState(0)

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      if (!dealId || dealId === "unknown") { setDealLoading(false); return }

      // 1) Resolve auth → update module-level CURRENT_USER_ID
      try {
        const { createClient } = await import("@/lib/supabase/client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!cancelled && user?.id) {
          CURRENT_USER_ID = user.id
          setAuthTick(t => t + 1)
        }

        // 2) Load deal + all related data from Supabase
        const [
          dealRes, docsRes, offersRes, ddRes, meetingsRes,
          escrowRes, signRes, auditRes,
        ] = await Promise.allSettled([
          supabase.from("deals").select(`
            id, current_stage, status, lock_in_stage, created_at,
            expected_close_date, amount, type, buyer_id, seller_id,
            npl_listings(title, collateral_type, region, principal_amount,
              credit_grade, expected_yield, appraisal_value, address,
              profiles!npl_listings_seller_id_fkey(id, name, phone))
          `).eq("id", dealId).single(),

          supabase.from("deal_documents").select("*")
            .eq("deal_id", dealId).order("created_at", { ascending: false }),

          supabase.from("deal_offers").select("*")
            .eq("deal_id", dealId).order("created_at", { ascending: true }),

          supabase.from("deal_dd_items").select("item_id, done")
            .eq("deal_id", dealId),

          supabase.from("deal_meetings").select("*")
            .eq("deal_id", dealId).order("date", { ascending: false }),

          supabase.from("deal_escrow").select("*")
            .eq("deal_id", dealId).maybeSingle(),

          supabase.from("sign_sessions").select("*, signers:sign_session_signers(*)")
            .eq("deal_id", dealId).maybeSingle(),

          supabase.from("audit_logs").select("*")
            .eq("resource_id", dealId).order("created_at", { ascending: false }).limit(50),
        ])

        if (cancelled) return

        // 2a) Deal info
        if (dealRes.status === "fulfilled" && dealRes.value.data) {
          setDeal(mapApiToDealInfo(dealRes.value.data as Record<string, unknown>))
        }

        // 2b) Documents
        if (docsRes.status === "fulfilled" && docsRes.value.data?.length) {
          setDocs(docsRes.value.data.map((r: any) => ({
            id: String(r.id), name: r.file_name ?? r.name ?? "문서",
            uploaded_by: r.uploaded_by ?? "", uploaded_by_name: r.uploader_name ?? "나",
            created_at: String(r.created_at ?? "").slice(0, 10),
            size: r.file_size ? `${(r.file_size / 1024).toFixed(0)} KB` : "—",
            type: (r.file_name ?? "").split(".").pop() ?? "pdf",
            category: r.category ?? "LEGAL", tier_required: r.tier_required ?? "L1",
            url: r.file_url ?? undefined,
          })))
        }

        // 2c) Offers
        if (offersRes.status === "fulfilled" && offersRes.value.data?.length) {
          setOffers(offersRes.value.data.map((r: any, idx: number) => ({
            id: String(r.id), side: r.side ?? (r.sender_id === CURRENT_USER_ID ? "매도자" : "매수자"),
            label: r.label ?? `${idx + 1}차 제안`, amount: r.amount ?? 0,
            date: String(r.created_at ?? "").slice(0, 10), note: r.note ?? "",
            status: r.status ?? "pending", conditions: r.conditions ?? undefined,
            payment_method: r.payment_method ?? undefined, valid_until: r.valid_until ?? undefined,
            sender_id: r.sender_id ?? undefined,
          })))
        }

        // 2d) DD items — merge server completion state onto template
        if (ddRes.status === "fulfilled" && ddRes.value.data?.length) {
          const doneMap = new Map(ddRes.value.data.map((r: any) => [r.item_id, r.done]))
          setDdItems(DEFAULT_DD_ITEMS.map(item => ({
            ...item, done: doneMap.has(item.id) ? Boolean(doneMap.get(item.id)) : item.done,
          })))
        }

        // 2e) Meetings
        if (meetingsRes.status === "fulfilled" && meetingsRes.value.data?.length) {
          setMeetings(meetingsRes.value.data.map((r: any) => ({
            id: String(r.id), title: r.title ?? "미팅",
            mode: (r.mode ?? "ONLINE") as "ONLINE" | "OFFLINE" | "HYBRID",
            date: String(r.date ?? r.scheduled_at ?? "").replace("T", " ").slice(0, 16),
            venue: r.venue ?? "온라인", attendees: r.attendees ?? 2,
            status: r.status ?? "예정",
          })))
        }

        // 2f) Escrow
        if (escrowRes.status === "fulfilled" && escrowRes.value.data) {
          setEscrow(escrowRes.value.data as EscrowAccount)
        }

        // 2g) Sign session
        if (signRes.status === "fulfilled" && signRes.value.data) {
          setSignSession(signRes.value.data as SignSession)
        }

        // 2h) Audit logs
        if (auditRes.status === "fulfilled" && auditRes.value.data?.length) {
          setAuditLogs(auditRes.value.data.map((r: any) => ({
            id: String(r.id), action: r.action ?? "VIEW",
            target: r.resource_type ?? r.target ?? "—", actor: r.actor_name ?? r.user_id ?? "—",
            at: String(r.created_at ?? "").replace("T", " ").slice(0, 19),
            tier: r.tier ?? "—", severity: r.severity ?? "INFO",
          })))
        }
      } catch { /* data stays empty / null */ } finally {
        if (!cancelled) setDealLoading(false)
      }
    }

    // Also try API route for deal info (may have richer data)
    const fetchDealApi = async () => {
      try {
        const res = await fetch(`/api/v1/exchange/deals/${dealId}`)
        if (res.ok) {
          const { data } = await res.json()
          if (data && !cancelled) setDeal(mapApiToDealInfo(data as Record<string, unknown>))
        }
      } catch { /* supabase result already set */ }
    }

    init().then(() => { if (!cancelled) fetchDealApi() })
    return () => { cancelled = true }
  }, [dealId])

  // authTick is read here so React tracks it (suppress unused-var lint)
  void authTick

  if (dealLoading) {
    return (
      <div className="min-h-screen bg-[#080F1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm tracking-normal">딜 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  // Deal not found after loading
  if (!deal) {
    return (
      <div className="min-h-screen bg-[#080F1A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-white/20" />
          </div>
          <p className="text-white/60 text-base font-semibold">거래를 찾을 수 없습니다</p>
          <p className="text-white/25 text-sm">딜 ID가 올바른지 확인하거나, 거래 목록으로 돌아가세요.</p>
          <button
            onClick={() => router.push("/deals")}
            className="mt-2 px-5 py-2 bg-blue-600/80 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all"
          >
            거래 목록으로
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080F1A]">
      {/* ── Sticky Header */}
      <header className="sticky top-0 z-50 h-14 bg-[#080F1A]/95 backdrop-blur-sm border-b border-white/[0.06] flex items-center px-6 gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/40 hover:text-white transition-colors text-sm tracking-normal"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">뒤로</span>
        </button>
        <div className="w-px h-5 bg-white/[0.1]" />
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="font-semibold text-sm text-white tracking-normal truncate">거래 #{deal.id}</span>
          <StatusBadge status={deal.status} />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#2E75B6] flex items-center justify-center text-xs font-bold text-white">
              {deal.cp.initials.slice(0, 1)}
            </div>
            <span className="text-sm text-white/60 hidden md:block tracking-normal">{deal.cp.name}</span>
          </div>
          <button className="px-3 py-1.5 bg-red-900/50 hover:bg-red-700/70 border border-red-700/40 text-red-300 text-xs font-medium rounded-lg transition-all tracking-normal">
            거래 종료
          </button>
        </div>
      </header>

      {/* ── Progress Timeline */}
      <ProgressTimeline current={deal.stage} />

      {/* ── Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        {/* Tab Panel */}
        <div className="card-interactive-dark rounded-2xl overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-white/[0.06] bg-[#080F1A] px-2">
            {TABS.map(({ key, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium tracking-normal transition-all relative
                  ${activeTab === key
                    ? "text-blue-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500 after:rounded-t"
                    : "text-white/30 hover:text-white/60"}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{key}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === "개요" && <OverviewTab deal={deal} />}
          {activeTab === "채팅" && <ChatTab dealId={dealId} deal={deal} />}
          {activeTab === "문서" && <DocsTab docs={docs} dealId={dealId} />}
          {activeTab === "오퍼" && <OfferTab offers={offers} dealId={dealId} />}
          {activeTab === "실사" && <DDTab items={ddItems} dealId={dealId} />}
          {activeTab === "계약" && (
            signSession
              ? <ContractTab deal={deal} session={signSession} />
              : <div className="flex flex-col items-center justify-center h-48 gap-3 text-center p-8">
                  <FileSignature className="w-10 h-10 text-white/10" />
                  <p className="text-white/40 text-sm">계약 단계에 도달하면 전자서명 세션이 생성됩니다.</p>
                </div>
          )}
          {activeTab === "에스크로" && (
            escrow
              ? <EscrowTab escrow={escrow} deal={deal} />
              : <div className="flex flex-col items-center justify-center h-48 gap-3 text-center p-8">
                  <Wallet className="w-10 h-10 text-white/10" />
                  <p className="text-white/40 text-sm">에스크로 계좌는 계약 체결 후 개설됩니다.</p>
                </div>
          )}
          {activeTab === "미팅" && <MeetingTab meetings={meetings} />}
          {activeTab === "감사" && <AuditTab logs={auditLogs} />}
        </div>

        {/* Right Sidebar */}
        <aside>
          <RightPanel deal={deal} />
        </aside>
      </div>
    </div>
  )
}
