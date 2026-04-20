"use client"

/**
 * 딜룸 "예시" 프리뷰 섹션.
 * 메인 랜딩에서 실제 딜룸이 어떻게 보이는지 3-panel UI 샘플로 시연.
 * 샘플 채팅 + 문서 목록 + 전자계약 미리보기를 한 화면에.
 */

import Link from "next/link"
import { motion } from "framer-motion"
import {
  MessageSquare, FileText, Shield, Sparkles, ArrowRight, CheckCircle2, PenLine,
  Paperclip, Lock, Users, Clock, FileCheck2, AlertCircle, Activity,
} from "lucide-react"

type Msg = {
  from: "seller" | "buyer" | "system"
  who: string
  role: "매도자" | "매수자" | "시스템"
  time: string
  text: string
  attach?: string
}

const MSGS: Msg[] = [
  { from: "system", who: "NPLatform", role: "시스템", time: "09:02", text: "NDA 전자서명이 완료되었습니다. 매도자 권리증·등기부를 열람할 수 있습니다." },
  { from: "seller", who: "우리은행 김 팀장", role: "매도자", time: "09:14", text: "안녕하세요, 권리분석서 및 최근 시세 자료 첨부드립니다.", attach: "권리분석서_0412.pdf" },
  { from: "buyer", who: "투자자 박 대리", role: "매수자", time: "10:21", text: "매각희망가 8.5억 기준 LOI 제출 검토 중입니다. 에스크로 일정 조율 가능할까요?" },
  { from: "seller", who: "우리은행 김 팀장", role: "매도자", time: "10:35", text: "이번 주 금요일까지 LOI 접수 가능하십니다. 에스크로는 KB에스크로 기준 D+3 예정입니다." },
]

const DOCS = [
  { name: "권리분석서_0412.pdf", status: "ok",  size: "2.4MB", by: "매도자" },
  { name: "등기부등본_집합.pdf",  status: "ok",  size: "1.1MB", by: "매도자" },
  { name: "감정평가서_요약.pdf",  status: "ok",  size: "3.8MB", by: "매도자" },
  { name: "LOI_초안.docx",       status: "draft", size: "148KB", by: "매수자" },
  { name: "NDA_서명본.pdf",       status: "signed", size: "212KB", by: "양당사자" },
] as const

const DOC_STYLE: Record<typeof DOCS[number]["status"], { fg: string; bg: string; label: string; icon: typeof CheckCircle2 }> = {
  ok:     { fg: "#34D399", bg: "rgba(16,185,129,0.10)", label: "공유됨", icon: CheckCircle2 },
  draft:  { fg: "#F59E0B", bg: "rgba(245,158,11,0.10)", label: "초안",   icon: PenLine },
  signed: { fg: "#60A5FA", bg: "rgba(59,130,246,0.10)", label: "서명",   icon: Shield },
}

export function DealRoomPreview() {
  return (
    <section style={{ backgroundColor: "#080F1E", padding: "6rem 0", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", top: "20%", right: "10%", width: "500px", height: "500px", pointerEvents: "none",
          background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
            style={{ background: "rgba(139,92,246,0.10)", border: "1px solid rgba(139,92,246,0.25)" }}
          >
            <MessageSquare size={12} style={{ color: "#A78BFA" }} />
            <span className="text-[11px] font-bold tracking-wider" style={{ color: "#A78BFA" }}>
              딜룸 미리보기
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            매도자와 매수자가 이렇게 만납니다
          </h2>
          <p className="mt-3 text-sm md:text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
            NDA → 권리증 공유 → LOI → 전자계약까지. 하나의 보안 채널에서 모두 완결합니다.
          </p>
          <p className="mt-2 text-[10px] lg:hidden" style={{ color: "rgba(255,255,255,0.35)" }}>
            ← 옆으로 넘겨 채팅·문서 보기 →
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl overflow-hidden"
          style={{ background: "#0D1830", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 20px 60px rgba(0,0,0,0.45)" }}
        >
          <div
            className="flex items-center justify-between px-5 py-3.5 flex-wrap gap-2"
            style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.12)" }}>
                <Lock size={13} style={{ color: "#A78BFA" }} />
              </div>
              <div>
                <div className="text-[13px] font-bold text-white leading-tight">강남 아파트 담보 · NPL-2026-0412</div>
                <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>딜룸 · L2 NDA 활성 · 우리은행 ↔ 투자자 박</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.12)", color: "#34D399", border: "1px solid rgba(16,185,129,0.25)" }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#34D399" }} />
                진행 중
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Users size={10} /> 2
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Clock size={10} /> D-5
              </span>
            </div>
          </div>

          {/* 모바일: 채팅↔문서 가로 스와이프 · lg+: 3-col grid */}
          <div
            className="flex lg:grid overflow-x-auto lg:overflow-visible snap-x snap-mandatory lg:snap-none scroll-px-0 pr-4 lg:pr-0 divide-x lg:divide-y-0 lg:grid-cols-3 lg:divide-x min-w-0 [&::-webkit-scrollbar]:hidden"
            style={{ borderColor: "rgba(255,255,255,0.06)", scrollbarWidth: "none" }}
          >

            <div className="snap-start shrink-0 basis-[90%] lg:basis-auto lg:shrink lg:col-span-2 flex flex-col min-w-0">
              <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <MessageSquare size={13} style={{ color: "rgba(255,255,255,0.5)" }} />
                <span className="text-[11px] font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
                  보안 채팅
                </span>
              </div>

              <div className="flex-1 p-5 space-y-4 min-h-[380px]" style={{ background: "rgba(0,0,0,0.12)" }}>
                {MSGS.map((m, i) => {
                  const isBuyer = m.from === "buyer"
                  const isSystem = m.from === "system"
                  const accent = isBuyer ? "#60A5FA" : m.from === "seller" ? "#34D399" : "#A78BFA"
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                      className={isBuyer ? "flex justify-end" : "flex justify-start"}
                    >
                      <div
                        className="max-w-[82%] rounded-xl px-3.5 py-2.5"
                        style={{
                          background: isSystem
                            ? "rgba(139,92,246,0.08)"
                            : isBuyer
                              ? "rgba(59,130,246,0.10)"
                              : "rgba(16,185,129,0.08)",
                          border: `1px solid ${isSystem ? "rgba(139,92,246,0.20)" : isBuyer ? "rgba(59,130,246,0.22)" : "rgba(16,185,129,0.20)"}`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold" style={{ color: accent }}>{m.who}</span>
                          <span className="text-[9px] px-1 rounded" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}>{m.role}</span>
                          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>{m.time}</span>
                        </div>
                        <div className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
                          {m.text}
                        </div>
                        {m.attach && (
                          <div className="mt-2 inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            <Paperclip size={10} /> {m.attach}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}

                <div className="flex items-center gap-2 pt-2 text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <Activity size={10} /> 투자자 박 대리가 입력 중…
                </div>
              </div>

              <div className="px-5 py-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
                <div className="flex-1 px-3 py-2 rounded-lg text-[11px]" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  메시지를 입력하세요… (PII 자동 마스킹)
                </div>
                <button className="px-3 py-2 rounded-lg text-[11px] font-bold" style={{ background: "linear-gradient(135deg,#A78BFA,#7C3AED)", color: "white" }}>
                  전송
                </button>
              </div>
            </div>

            <div className="snap-start shrink-0 basis-[90%] lg:basis-auto lg:shrink flex flex-col min-w-0">
              <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <FileText size={13} style={{ color: "rgba(255,255,255,0.5)" }} />
                <span className="text-[11px] font-bold tracking-wider" style={{ color: "rgba(255,255,255,0.55)" }}>
                  딜룸 문서
                </span>
              </div>

              <div className="flex-1 p-4 space-y-2">
                {DOCS.map((d) => {
                  const s = DOC_STYLE[d.status]
                  const Icon = s.icon
                  return (
                    <div
                      key={d.name}
                      className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2"
                      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>{d.name}</div>
                        <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{d.size} · {d.by}</div>
                      </div>
                      <span
                        className="shrink-0 inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: s.bg, color: s.fg }}
                      >
                        <Icon size={9} /> {s.label}
                      </span>
                    </div>
                  )
                })}

                <div
                  className="mt-3 rounded-lg p-3"
                  style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(139,92,246,0.06))", border: "1px solid rgba(16,185,129,0.18)" }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileCheck2 size={12} style={{ color: "#34D399" }} />
                    <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>전자계약 준비 완료</span>
                  </div>
                  <div className="text-[10px] leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
                    LOI 수락 즉시 매매계약서가 자동 생성됩니다.
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <Sparkles size={9} style={{ color: "#34D399" }} /> 대금은 KB에스크로로 보호
                  </div>
                </div>

                <div
                  className="rounded-lg p-2.5 flex items-start gap-2"
                  style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}
                >
                  <AlertCircle size={12} style={{ color: "#F59E0B" }} className="mt-0.5 shrink-0" />
                  <div className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                    모든 대화·문서는 L2 NDA 범위 내에서만 열람되며 <strong style={{ color: "#F59E0B" }}>내보내기 로그</strong>가 기록됩니다.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/deals"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-all"
            style={{ background: "linear-gradient(135deg, #A78BFA, #7C3AED)", color: "white", boxShadow: "0 4px 14px rgba(139,92,246,0.25)" }}
          >
            딜룸 시작하기 <ArrowRight size={14} />
          </Link>
          <Link
            href="/exchange"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}
          >
            매물 먼저 보기
          </Link>
        </div>
      </div>
    </section>
  )
}
