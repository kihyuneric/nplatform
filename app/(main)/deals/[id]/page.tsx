"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ChevronLeft, Send, Upload, FileText, Download, Phone, Video,
  CheckCircle2, Clock, MessageSquare, FolderOpen, Tag, Search,
  FileCheck, PenLine, Sparkles, Circle, AlertCircle, Building2,
  TrendingUp, Star, ArrowUpRight, ArrowDownRight, Paperclip, X,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type DealStatus = "진행중" | "완료" | "중단"
type TabKey = "채팅" | "문서" | "오퍼" | "실사" | "계약"

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = ["매칭", "오퍼 교환", "실사", "계약", "완료"] as const
const TABS: { key: TabKey; icon: React.ElementType }[] = [
  { key: "채팅",   icon: MessageSquare },
  { key: "문서",   icon: FolderOpen },
  { key: "오퍼",   icon: Tag },
  { key: "실사",   icon: Search },
  { key: "계약",   icon: FileCheck },
]

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DEAL = {
  id: "2024-0847", status: "진행중" as DealStatus, stage: 2,
  startDate: "2024-10-15", estClose: "2024-12-20",
  cp: { name: "김태영", role: "매수인", initials: "김태", phone: "010-****-5678" },
  asset: { title: "서울 강남구 역삼동 업무시설 NPL", principal: 280000000, grade: "A+", yield: "12.4%", region: "서울 강남구", collateral: "오피스" },
}

const MSGS = [
  { id: 1, name: "김태영", text: "안녕하세요. 감정평가서 확인했습니다.", time: "10:24", mine: false },
  { id: 2, name: "나", text: "네, 확인해 주셔서 감사합니다. 추가 실사 일정 잡을까요?", time: "10:31", mine: true },
  { id: 3, name: "김태영", text: "다음 주 수요일 오전 10시 가능할 것 같습니다.", time: "10:45", mine: false },
  { id: 4, name: "나", text: "좋습니다. 일정 확정하겠습니다.", time: "10:52", mine: true },
  { id: 5, name: "김태영", text: "계약서 초안 검토해 보셨나요? 몇 가지 수정 사항이 있습니다.", time: "14:03", mine: false },
  { id: 6, name: "나", text: "네, 3페이지 5조 내용 수정 요청드리겠습니다.", time: "14:18", mine: true },
]

const DOCS = [
  { name: "등기부등본.pdf", by: "나", date: "2024-10-18", size: "1.2 MB", type: "pdf" },
  { name: "감정평가서.pdf", by: "김태영", date: "2024-10-22", size: "4.7 MB", type: "pdf" },
  { name: "실사 보고서 초안.docx", by: "나", date: "2024-11-02", size: "892 KB", type: "docx" },
  { name: "법인 등기 사항 증명서.pdf", by: "김태영", date: "2024-11-05", size: "560 KB", type: "pdf" },
]

const OFFERS = [
  { side: "매도자", label: "최초 요청가", amount: 280000000, date: "2024-10-16", note: "최초 제시 금액" },
  { side: "매수자", label: "1차 제안가", amount: 240000000, date: "2024-10-19", note: "15% 할인 요청" },
  { side: "매도자", label: "반대 제안",  amount: 268000000, date: "2024-10-23", note: "4.3% 양보" },
]

const DD_ITEMS = [
  { id: "dd1", label: "등기부등본 확인", done: true,  category: "권리관계" },
  { id: "dd2", label: "감정평가서 검토",  done: true,  category: "가치평가" },
  { id: "dd3", label: "현장 실사 완료",   done: true,  category: "물리적 상태" },
  { id: "dd4", label: "경매 기록 분석",   done: false, category: "법적 리스크" },
  { id: "dd5", label: "임차인 현황 확인", done: false, category: "수익성" },
  { id: "dd6", label: "세금 체납 조회",   done: false, category: "재무 리스크" },
  { id: "dd7", label: "건축물대장 검토",  done: true,  category: "권리관계" },
  { id: "dd8", label: "법인 대표 신원 확인", done: false, category: "법적 리스크" },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `₩${(n / 100_000_000).toFixed(1)}억`

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
              <div className={`flex-1 h-px mx-2 mb-5 transition-colors ${i < current ? "bg-blue-600/60" : "bg-white/[0.06]"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────

function ChatTab() {
  const [msg, setMsg] = useState("")
  const [messages, setMessages] = useState(MSGS)

  const send = () => {
    if (!msg.trim()) return
    setMessages(prev => [...prev, { id: Date.now(), name: "나", text: msg.trim(), time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }), mine: true }])
    setMsg("")
  }

  return (
    <div className="flex flex-col h-[520px]">
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex gap-3 ${m.mine ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white
              ${m.mine ? "bg-[#2E75B6]" : "bg-[#1E3A5F]"}`}>
              {m.name.slice(0, 1)}
            </div>
            <div className={`max-w-[72%] flex flex-col ${m.mine ? "items-end" : "items-start"}`}>
              {!m.mine && (
                <span className="text-[11px] text-white/35 mb-1 tracking-normal">{m.name}</span>
              )}
              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed tracking-normal text-white
                ${m.mine
                  ? "bg-[#2E75B6] rounded-tr-sm"
                  : "bg-[#112845] rounded-tl-sm border border-white/[0.07]"}`}>
                {m.text}
              </div>
              <span className="text-[10px] text-white/25 mt-1 tracking-normal">{m.time}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.06] bg-[#080F1A] px-4 py-3 flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center text-white/25 hover:text-white/60 transition-colors shrink-0">
          <Paperclip className="w-4 h-4" />
        </button>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="메시지를 입력하세요..."
          className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all tracking-normal"
        />
        <button
          onClick={send}
          disabled={!msg.trim()}
          className="w-9 h-9 bg-[#2E75B6] hover:bg-[#3680c8] disabled:opacity-30 text-white rounded-xl flex items-center justify-center transition-colors shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Docs Tab ──────────────────────────────────────────────────────────────────

function DocsTab() {
  const [dragging, setDragging] = useState(false)

  const iconColor = (type: string) =>
    type === "pdf" ? "text-red-400" : type === "docx" ? "text-blue-400" : "text-slate-400"

  return (
    <div className="p-5 space-y-5">
      {/* Upload Area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false) }}
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer
          ${dragging
            ? "border-blue-500/60 bg-blue-500/[0.06]"
            : "border-white/[0.1] hover:border-white/[0.2] hover:bg-white/[0.02]"}`}
      >
        <Upload className="w-8 h-8 text-white/20" />
        <p className="text-sm text-white/40 tracking-normal">파일을 드래그하거나 클릭하여 업로드</p>
        <p className="text-[11px] text-white/20 tracking-normal">PDF, DOCX, XLSX 지원 · 최대 50MB</p>
      </div>

      {/* File List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/30 tracking-normal">총 {DOCS.length}개 문서</span>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] hover:border-blue-500/40 rounded-lg text-xs text-white/60 hover:text-white transition-all tracking-normal">
            <Upload className="w-3 h-3" /> 업로드
          </button>
        </div>
        {DOCS.map((d, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:border-white/[0.12] hover:bg-white/[0.05] transition-all group">
            <FileText className={`w-5 h-5 shrink-0 ${iconColor(d.type)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white tracking-normal truncate">{d.name}</p>
              <p className="text-[11px] text-white/30 tracking-normal">{d.by} · {d.date} · {d.size}</p>
            </div>
            <button className="flex items-center gap-1 px-2.5 py-1.5 opacity-0 group-hover:opacity-100 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-xs text-white/60 hover:text-white transition-all tracking-normal">
              <Download className="w-3 h-3" /> 다운로드
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Offer Tab ─────────────────────────────────────────────────────────────────

function OfferTab() {
  const buyer  = OFFERS.filter(o => o.side === "매수자").at(-1)
  const seller = OFFERS.filter(o => o.side === "매도자").at(-1)
  const gap    = seller && buyer ? seller.amount - buyer.amount : 0

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

      {/* Offer Timeline */}
      <div>
        <p className="text-xs font-semibold text-white/50 tracking-normal mb-3 uppercase">오퍼 히스토리</p>
        <div className="relative space-y-0">
          {OFFERS.map((o, i) => (
            <div key={i} className="flex gap-3 pb-4 last:pb-0">
              {/* Timeline line */}
              <div className="flex flex-col items-center shrink-0">
                <div className={`w-3 h-3 rounded-full border-2 mt-0.5 ${
                  o.side === "매수자" ? "border-blue-500 bg-blue-900" : "border-orange-500 bg-orange-900"
                }`} />
                {i < OFFERS.length - 1 && <div className="w-px flex-1 bg-white/[0.06] mt-1" />}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border tracking-normal
                        ${o.side === "매수자"
                          ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                          : "bg-orange-500/20 border-orange-500/40 text-orange-300"}`}>
                        {o.side}
                      </span>
                      <span className="text-xs text-white/60 tracking-normal">{o.label}</span>
                    </div>
                    <p className="text-[11px] text-white/30 tracking-normal">{o.note}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white tabular-nums">{fmt(o.amount)}</p>
                    <p className="text-[10px] text-white/25 tracking-normal">{o.date}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="w-full py-3 bg-[#112845] hover:bg-[#1a3660] border border-white/[0.08] hover:border-blue-500/40 text-white rounded-xl font-medium text-sm tracking-normal transition-all">
        반대 제안 작성
      </button>
    </div>
  )
}

// ── Due Diligence Tab ─────────────────────────────────────────────────────────

function DDTab() {
  const [items, setItems] = useState(DD_ITEMS)

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
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[10px] text-white/25 mt-1.5 tracking-normal">{pct}% 완료</p>
      </div>

      {/* Checklist by Category */}
      <div className="space-y-4">
        {categories.map(cat => (
          <div key={cat}>
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">{cat}</p>
            <div className="space-y-1.5">
              {items.filter(i => i.category === cat).map(item => (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] rounded-xl transition-all text-left group"
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                    ${item.done
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "border-white/20 group-hover:border-white/40"}`}>
                    {item.done && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                  <span className={`text-sm tracking-normal transition-colors ${
                    item.done ? "text-white/40 line-through" : "text-white/80"
                  }`}>
                    {item.label}
                  </span>
                  {!item.done && <AlertCircle className="w-3.5 h-3.5 text-amber-500/50 ml-auto shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Contract Tab ──────────────────────────────────────────────────────────────

function ContractTab() {
  const [signed, setSigned] = useState(false)

  return (
    <div className="p-5 space-y-5">
      {/* Status */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
        signed
          ? "bg-emerald-500/[0.08] border-emerald-500/30"
          : "bg-amber-500/[0.06] border-amber-500/20"
      }`}>
        {signed
          ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          : <Clock className="w-4 h-4 text-amber-400 shrink-0" />}
        <span className={`text-xs font-medium tracking-normal ${signed ? "text-emerald-400" : "text-amber-400"}`}>
          {signed ? "전자서명 완료 — 계약이 체결되었습니다" : "서명 대기 중 — 상대방의 서명이 필요합니다"}
        </span>
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
        {/* Mock preview area */}
        <div className="p-5 space-y-3">
          {[
            ["계약 일자", "2024년 11월 15일"],
            ["매도인",   "주식회사 ○○부동산"],
            ["매수인",   "김태영 (개인)"],
            ["매매 목적물", "서울 강남구 역삼동 xxx-xx 업무시설 NPL 채권"],
            ["채권 원금", "₩280,000,000"],
            ["매매 대금", "₩268,000,000"],
            ["잔금 지급일", "2024년 12월 20일"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
              <span className="text-xs text-white/35 tracking-normal">{k}</span>
              <span className="text-sm font-medium text-white tracking-normal">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Signing parties */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-[10px] text-white/30 tracking-normal mb-2">매도인 서명</p>
          <div className={`h-10 rounded-lg border flex items-center justify-center ${
            signed ? "border-emerald-500/40 bg-emerald-500/[0.08]" : "border-dashed border-white/[0.1]"
          }`}>
            {signed
              ? <span className="text-xs text-emerald-400 tracking-normal">✓ 서명 완료</span>
              : <span className="text-xs text-white/20 tracking-normal">미서명</span>}
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-[10px] text-white/30 tracking-normal mb-2">매수인 서명</p>
          <div className="h-10 rounded-lg border-dashed border border-white/[0.1] flex items-center justify-center">
            <span className="text-xs text-white/20 tracking-normal">서명 대기</span>
          </div>
        </div>
      </div>

      {/* Sign Button */}
      {!signed ? (
        <button
          onClick={() => setSigned(true)}
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl font-semibold text-sm tracking-normal transition-all shadow-lg shadow-emerald-900/40"
        >
          <PenLine className="w-4 h-4" />
          전자서명 요청
        </button>
      ) : (
        <button
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-white/[0.05] border border-emerald-500/20 text-emerald-400 rounded-xl font-semibold text-sm tracking-normal cursor-default"
          disabled
        >
          <CheckCircle2 className="w-4 h-4" />
          서명 완료
        </button>
      )}
    </div>
  )
}

// ── Right Panel ───────────────────────────────────────────────────────────────

function RightPanel() {
  const { asset: a, cp: c } = DEAL
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
            ["원금",    fmt(a.principal), "text-white"],
            ["AI 등급", a.grade,          "text-blue-400"],
            ["예상 수익", a.yield,         "text-emerald-400"],
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
            ["단계",    STAGES[DEAL.stage]],
            ["시작일",  DEAL.startDate],
            ["예상 완료", DEAL.estClose],
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
  const [activeTab, setActiveTab] = useState<TabKey>("채팅")
  const router = useRouter()
  const { id, status, stage, cp } = DEAL

  return (
    <div className="min-h-screen bg-[#080F1A]">

      {/* ── Sticky Header ────────────────────────────────────────────────────── */}
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
          <span className="font-semibold text-sm text-white tracking-normal truncate">거래 #{id}</span>
          <StatusBadge status={status} />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#2E75B6] flex items-center justify-center text-xs font-bold text-white">
              {cp.initials.slice(0, 1)}
            </div>
            <span className="text-sm text-white/60 hidden md:block tracking-normal">{cp.name}</span>
          </div>
          <button className="px-3 py-1.5 bg-red-900/50 hover:bg-red-700/70 border border-red-700/40 text-red-300 text-xs font-medium rounded-lg transition-all tracking-normal">
            거래 종료
          </button>
        </div>
      </header>

      {/* ── Progress Timeline ─────────────────────────────────────────────────── */}
      <ProgressTimeline current={stage} />

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
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
          {activeTab === "채팅" && <ChatTab />}
          {activeTab === "문서" && <DocsTab />}
          {activeTab === "오퍼" && <OfferTab />}
          {activeTab === "실사" && <DDTab />}
          {activeTab === "계약" && <ContractTab />}
        </div>

        {/* Right Sidebar */}
        <aside>
          <RightPanel />
        </aside>
      </div>
    </div>
  )
}
