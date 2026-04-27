"use client"

/**
 * DealRoom Preview · 좌(딜룸 정보) + 우(보안 채팅) 2-col McKinsey editorial
 *
 * 레이아웃:
 *   ┌─────────────┬────────────────┐
 *   │ 딜룸 헤더    │  보안 채팅 헤더  │
 *   │ 매물 정보   │  시스템 알림     │
 *   │ 문서 목록   │  매도자 메시지   │
 *   │ 안전 거래   │  매수자 메시지   │
 *   │             │  메시지 입력     │
 *   └─────────────┴────────────────┘
 *
 * - 4-color: ink + electric + cyan + paper
 * - 채권자(우리은행) 마스킹 → ○○은행
 */

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight, Shield, FileText, MessageSquare,
  Lock, CheckCircle2, Wifi, Send, Paperclip, Bell, Eye,
} from "lucide-react"

export function DealRoomPreview() {
  return (
    <section
      style={{
        backgroundColor: "#F4F6F9",
        padding: "5rem 0 4rem",
        position: "relative",
      }}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Eyebrow + Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span style={{ display: "inline-block", width: 24, height: 1.5, background: "#2251FF" }} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: "#2251FF",
              }}
            >
              Deal Room · 보안 협상 채널
            </span>
            <span style={{ display: "inline-block", width: 24, height: 1.5, background: "#2251FF" }} />
          </div>
          <h2
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 800,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              color: "#0A1628",
              marginBottom: 12,
            }}
          >
            매도자와 매수자가 이렇게 만납니다
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(5, 28, 44, 0.65)",
              maxWidth: 640,
              margin: "0 auto",
            }}
          >
            NDA → 권리증 공유 → LOI → 전자계약까지. 하나의 보안 채널에서 모두 완결합니다.
          </p>
        </div>

        {/* ── 2-col layout · 딜룸 정보 + 보안 채팅 ─────────────────────── */}
        <div
          className="grid grid-cols-1 lg:grid-cols-[1fr_440px]"
          style={{
            gap: 0,
            background: "#FFFFFF",
            border: "1px solid rgba(5, 28, 44, 0.10)",
            borderTop: "2px solid #2251FF",
            boxShadow: "0 24px 48px -16px rgba(5, 28, 44, 0.18), 0 8px 16px -4px rgba(5, 28, 44, 0.10)",
          }}
        >
          {/* ── LEFT · 딜룸 정보 ───────────────────────────────────────── */}
          <DealRoomInfoPanel />

          {/* ── RIGHT · 보안 채팅 ──────────────────────────────────────── */}
          <SecureChatPanel />
        </div>

        {/* Bottom CTA bar */}
        <div className="mt-12 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/deals"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#0A1628",
              color: "#FFFFFF",
              padding: "13px 26px",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: "-0.01em",
              borderRadius: 0,
              border: "1px solid #0A1628",
              borderTop: "2px solid #2251FF",
              textDecoration: "none",
            }}
          >
            <span style={{ color: "#FFFFFF" }}>딜룸 시작하기</span>
            <ArrowRight size={14} style={{ color: "#FFFFFF" }} />
          </Link>
          <Link
            href="/exchange"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: "#FFFFFF",
              color: "#0A1628",
              padding: "13px 26px",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "-0.01em",
              borderRadius: 0,
              border: "1px solid #0A1628",
              textDecoration: "none",
            }}
          >
            <span style={{ color: "#0A1628" }}>매물 먼저 보기</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LEFT · 딜룸 정보 패널 — 매물 + 문서 목록 + 안전 거래
═══════════════════════════════════════════════════════════════════════════ */
function DealRoomInfoPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      className="mck-paper"
      style={{
        backgroundColor: "#FFFFFF",
        padding: "24px 28px",
        borderRight: "1px solid rgba(5, 28, 44, 0.10)",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* ── 딜룸 헤더 — 자산 + 진행 상태 ─────────────────────────── */}
      <div>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <span style={{ display: "inline-block", width: 14, height: 1.5, background: "#2251FF" }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#2251FF",
            }}
          >
            DEAL ROOM · L2 NDA 활성
          </span>
        </div>
        <h3
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 20,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.015em",
            lineHeight: 1.3,
            marginBottom: 4,
          }}
        >
          강남 아파트 담보 · NPL-2026-0412
        </h3>
        <p
          style={{
            fontSize: 12,
            color: "rgba(5, 28, 44, 0.65)",
            fontWeight: 600,
          }}
        >
          ○○은행 ↔ ○○대부업체 · 진행 중 (D-5)
        </p>
      </div>

      {/* ── 매물 metrics 3-col · Deep Navy panel ─────────────────── */}
      <div
        className="mck-cta-dark"
        style={{
          backgroundColor: "#051C2C",
          borderTop: "3px solid #2251FF",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
        }}
      >
        <div style={{ padding: "12px 14px", borderRight: "1px solid rgba(255, 255, 255, 0.12)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255, 255, 255, 0.65)", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>
            매각희망가
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.015em", fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>
            <span style={{ color: "#FFFFFF" }}>8.5</span><span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.55)" }}>억</span>
          </div>
        </div>
        <div style={{ padding: "12px 14px", borderRight: "1px solid rgba(255, 255, 255, 0.12)" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255, 255, 255, 0.65)", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>
            할인율
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.015em", fontVariantNumeric: "tabular-nums", lineHeight: 1.05 }}>
            <span style={{ color: "#FFFFFF" }}>29.2</span><span style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.55)" }}>%</span>
          </div>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "#00A9F4", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>
            AI 등급
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 16, fontWeight: 800, color: "#00A9F4", letterSpacing: "-0.015em", lineHeight: 1.05 }}>
            <span style={{ color: "#00A9F4" }}>A</span>
          </div>
        </div>
      </div>

      {/* ── 딜룸 문서 목록 ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#2251FF", textTransform: "uppercase", letterSpacing: "0.10em" }}>
            DEAL DOCUMENTS · 5건
          </span>
          <span style={{ fontSize: 10, color: "rgba(5, 28, 44, 0.55)", fontWeight: 700 }}>
            <Eye size={10} style={{ display: "inline", verticalAlign: "middle", color: "rgba(5, 28, 44, 0.55)", marginRight: 3 }} />
            NDA 범위 내 열람
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { name: "권리분석서_0412.pdf", size: "2.4MB", side: "매도자", status: "공유됨", statusBg: "rgba(34, 81, 255, 0.10)", statusFg: "#1A47CC" },
            { name: "등기부등본_집합.pdf", size: "1.1MB", side: "매도자", status: "공유됨", statusBg: "rgba(34, 81, 255, 0.10)", statusFg: "#1A47CC" },
            { name: "감정평가서_요약.pdf", size: "3.8MB", side: "매도자", status: "공유됨", statusBg: "rgba(34, 81, 255, 0.10)", statusFg: "#1A47CC" },
            { name: "LOI_초안.docx", size: "148KB", side: "매수자", status: "초안", statusBg: "#F4F6F9", statusFg: "#4A5568" },
            { name: "NDA_서명본.pdf", size: "212KB", side: "양 당사자", status: "서명완료", statusBg: "#0A1628", statusFg: "#FFFFFF" },
          ].map(doc => (
            <div
              key={doc.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                backgroundColor: "#FAFBFC",
                border: "1px solid rgba(5, 28, 44, 0.06)",
                borderLeft: "2px solid rgba(34, 81, 255, 0.30)",
              }}
            >
              <FileText size={14} style={{ color: "#2251FF", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#0A1628",
                    letterSpacing: "-0.005em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {doc.name}
                </div>
                <div style={{ fontSize: 10, color: "rgba(5, 28, 44, 0.55)", fontWeight: 600, marginTop: 1 }}>
                  {doc.size} · {doc.side}
                </div>
              </div>
              <span
                className={doc.status === "서명완료" ? "mck-cta-dark" : ""}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 8px",
                  fontSize: 9,
                  fontWeight: 800,
                  backgroundColor: doc.statusBg,
                  color: doc.statusFg,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: doc.statusFg }}>{doc.status}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 전자계약 + 안전 거래 안내 ─────────────────────────── */}
      <div
        style={{
          padding: "14px 16px",
          backgroundColor: "rgba(34, 81, 255, 0.05)",
          border: "1px solid rgba(34, 81, 255, 0.20)",
          borderLeft: "3px solid #2251FF",
        }}
      >
        <div className="flex items-start gap-3">
          <CheckCircle2 size={16} style={{ color: "#2251FF", marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#0A1628", letterSpacing: "-0.005em", marginBottom: 4 }}>
              전자계약 준비 완료
            </div>
            <p style={{ fontSize: 11, color: "rgba(5, 28, 44, 0.65)", lineHeight: 1.55, fontWeight: 500 }}>
              LOI 수락 즉시 매매계약서가 자동 생성됩니다. 대금은 <strong style={{ color: "#0A1628", fontWeight: 800 }}>KB에스크로</strong>로 보호되며, 모든 대화·문서는 NDA 범위 내에서만 열람되고 내보내기 로그가 기록됩니다.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   RIGHT · 보안 채팅 패널
═══════════════════════════════════════════════════════════════════════════ */
function SecureChatPanel() {
  const messages: ChatMessage[] = [
    {
      id: 1,
      type: "system",
      author: "NPLatform · 시스템",
      time: "09:02",
      text: "NDA 전자서명이 완료되었습니다. 매도자 권리증·등기부를 열람할 수 있습니다.",
    },
    {
      id: 2,
      type: "seller",
      author: "○○은행 김 팀장",
      role: "매도자",
      time: "09:14",
      text: "안녕하세요, 권리분석서 및 최근 시세 자료 첨부드립니다.",
      attachment: "권리분석서_0412.pdf",
    },
    {
      id: 3,
      type: "buyer",
      author: "○○대부업체 박 팀장",
      role: "매수자",
      time: "10:21",
      text: "매각희망가 8.5억 기준 LOI 제출 검토 중입니다. 에스크로 일정 조율 가능할까요?",
    },
    {
      id: 4,
      type: "seller",
      author: "○○은행 김 팀장",
      role: "매도자",
      time: "10:35",
      text: "이번 주 금요일까지 LOI 접수 가능하십니다. 에스크로는 KB에스크로 기준 D+3 예정입니다.",
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        minHeight: 600,
      }}
    >
      {/* ── 채팅 헤더 ────────────────────────────────────────────── */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid rgba(5, 28, 44, 0.10)",
          backgroundColor: "#FAFBFC",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={14} style={{ color: "#2251FF" }} />
          <span
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 13,
              fontWeight: 800,
              color: "#0A1628",
              letterSpacing: "-0.005em",
            }}
          >
            보안 채팅
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              marginLeft: 6,
              padding: "3px 8px",
              fontSize: 9,
              fontWeight: 800,
              color: "#1A47CC",
              backgroundColor: "rgba(34, 81, 255, 0.10)",
              border: "1px solid rgba(34, 81, 255, 0.35)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            <Wifi size={9} style={{ color: "#1A47CC" }} />
            <span style={{ color: "#1A47CC" }}>실시간 연결</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              color: "rgba(5, 28, 44, 0.55)",
              letterSpacing: "0.04em",
            }}
          >
            <Bell size={10} style={{ color: "rgba(5, 28, 44, 0.55)" }} />
            <span style={{ color: "rgba(5, 28, 44, 0.55)" }}>알림 2</span>
          </span>
        </div>
      </div>

      {/* ── 메시지 리스트 ────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          padding: "16px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflowY: "auto",
        }}
      >
        {messages.map(msg => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}

        {/* "입력 중..." indicator */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            color: "rgba(5, 28, 44, 0.55)",
            fontWeight: 600,
            fontStyle: "italic",
            marginTop: 4,
          }}
        >
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", backgroundColor: "#2251FF" }}
          />
          ○○대부업체 박 팀장가 입력 중…
        </div>
      </div>

      {/* ── 메시지 입력 ─────────────────────────────────────────── */}
      <div
        style={{
          padding: "12px 14px",
          borderTop: "1px solid rgba(5, 28, 44, 0.10)",
          backgroundColor: "#FAFBFC",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          type="button"
          style={{
            width: 36,
            height: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "transparent",
            border: "1px solid rgba(5, 28, 44, 0.10)",
            color: "rgba(5, 28, 44, 0.55)",
            cursor: "pointer",
          }}
          aria-label="파일 첨부"
        >
          <Paperclip size={14} style={{ color: "rgba(5, 28, 44, 0.55)" }} />
        </button>
        <input
          type="text"
          placeholder="메시지를 입력하세요… (PII 자동 마스킹)"
          readOnly
          style={{
            flex: 1,
            padding: "9px 14px",
            fontSize: 12,
            backgroundColor: "#FFFFFF",
            color: "#0A1628",
            border: "1px solid rgba(5, 28, 44, 0.18)",
            outline: "none",
          }}
        />
        <button
          type="button"
          className="mck-cta-dark"
          style={{
            width: 36,
            height: 36,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0A1628",
            border: "none",
            borderTop: "2px solid #2251FF",
            color: "#FFFFFF",
            cursor: "pointer",
          }}
          aria-label="전송"
        >
          <Send size={14} style={{ color: "#FFFFFF" }} />
        </button>
      </div>

      {/* ── 안전 거래 footer ─────────────────────────────────────── */}
      <div
        style={{
          padding: "10px 14px",
          backgroundColor: "#FFFFFF",
          borderTop: "1px solid rgba(5, 28, 44, 0.10)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Lock size={11} style={{ color: "#2251FF" }} />
        <span style={{ fontSize: 10, color: "rgba(5, 28, 44, 0.65)", fontWeight: 600, lineHeight: 1.55 }}>
          모든 대화·문서는 <strong style={{ color: "#0A1628", fontWeight: 800 }}>NDA 범위</strong> 내에서만 열람되며 내보내기 로그가 기록됩니다.
        </span>
      </div>
    </motion.div>
  )
}

/* ─── ChatMessage type + bubble component ─────────────────────────────── */
type ChatMessage = {
  id: number
  type: "system" | "seller" | "buyer"
  author: string
  role?: "매도자" | "매수자"
  time: string
  text: string
  attachment?: string
}

function ChatBubble({ msg }: { msg: ChatMessage }) {
  // System notification — center, full-width slim
  if (msg.type === "system") {
    return (
      <div
        style={{
          alignSelf: "stretch",
          textAlign: "center",
          padding: "8px 12px",
          backgroundColor: "rgba(34, 81, 255, 0.06)",
          border: "1px solid rgba(34, 81, 255, 0.20)",
          borderLeft: "2px solid #2251FF",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 800, color: "#1A47CC", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 3 }}>
          {msg.author} · {msg.time}
        </div>
        <div style={{ fontSize: 12, color: "#0A1628", lineHeight: 1.5, fontWeight: 600, letterSpacing: "-0.005em" }}>
          {msg.text}
        </div>
      </div>
    )
  }

  // Buyer (right side) vs Seller (left side)
  const isBuyer = msg.type === "buyer"
  const align = isBuyer ? "flex-end" : "flex-start"
  const bubbleBg = isBuyer ? "#0A1628" : "#FFFFFF"
  const bubbleFg = isBuyer ? "#FFFFFF" : "#0A1628"
  const bubbleBorder = isBuyer ? "#0A1628" : "rgba(5, 28, 44, 0.12)"

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align,
        maxWidth: "85%",
        alignSelf: align,
        gap: 2,
      }}
    >
      {/* Author + role badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 2,
          flexDirection: isBuyer ? "row-reverse" : "row",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 800, color: "#0A1628", letterSpacing: "-0.005em" }}>
          {msg.author}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "1px 6px",
            fontSize: 9,
            fontWeight: 800,
            backgroundColor: isBuyer ? "rgba(0, 169, 244, 0.12)" : "rgba(34, 81, 255, 0.10)",
            color: isBuyer ? "#0075B0" : "#1A47CC",
            border: `1px solid ${isBuyer ? "rgba(0, 169, 244, 0.35)" : "rgba(34, 81, 255, 0.30)"}`,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: isBuyer ? "#0075B0" : "#1A47CC" }}>{msg.role}</span>
        </span>
      </div>

      {/* Bubble */}
      <div
        className={isBuyer ? "mck-cta-dark" : ""}
        style={{
          padding: "10px 14px",
          backgroundColor: bubbleBg,
          color: bubbleFg,
          border: `1px solid ${bubbleBorder}`,
          borderTop: isBuyer ? "2px solid #2251FF" : `1px solid ${bubbleBorder}`,
          fontSize: 12,
          lineHeight: 1.55,
          letterSpacing: "-0.005em",
          fontWeight: 500,
        }}
      >
        <span style={{ color: bubbleFg }}>{msg.text}</span>
        {msg.attachment && (
          <div
            style={{
              marginTop: 8,
              padding: "6px 10px",
              backgroundColor: isBuyer ? "rgba(0, 169, 244, 0.18)" : "#F4F6F9",
              border: isBuyer ? "1px solid rgba(0, 169, 244, 0.40)" : "1px solid rgba(5, 28, 44, 0.10)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: isBuyer ? "#FFFFFF" : "#0A1628",
            }}
          >
            <FileText size={11} style={{ color: isBuyer ? "#00A9F4" : "#2251FF", flexShrink: 0 }} />
            <span style={{ color: isBuyer ? "#FFFFFF" : "#0A1628" }}>{msg.attachment}</span>
          </div>
        )}
      </div>

      {/* Time */}
      <span style={{ fontSize: 9, color: "rgba(5, 28, 44, 0.45)", fontWeight: 600, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
        {msg.time}
      </span>
    </div>
  )
}
