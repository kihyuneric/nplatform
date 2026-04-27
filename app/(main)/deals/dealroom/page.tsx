"use client"

/**
 * /deals/dealroom — 딜룸 통합 시안 (McKinsey editorial)
 *
 * 구조:
 *   ① Page Header
 *   ② DARK KPI Strip
 *   ③ Deal Flow Timeline (4-step funnel · anchor 링크)
 *   ④ 2-col Main · LEFT(4-section 풍부한 콘텐츠) + RIGHT(sticky 보안 채팅 + 상대방)
 *   ⑤ Footer CTA · Deep Navy
 *
 * LEFT:
 *   - SECTION 01 · Deal Screening (L0)  — 핵심 지표 / 마스킹 / AI 분석 / 회수율 / 리스크+MC / 권리·등기·임대차 / 매도자·매수자
 *   - SECTION 02 · Deal Validation (L2) — NDA / 감정평가 / 경매·공매 / 등기 원본 / 채권 / 현장 + sidebar(AI투자분석·매칭·수수료·제공자료)
 *   - SECTION 03 · Deal Engagement (L3) — LOI / 실사 신청 / 가격 오퍼 (채팅은 RIGHT sticky 담당)
 *   - SECTION 04 · Deal Execution — 3-step closing + 최종 CTA
 *
 * RIGHT (sticky):
 *   - 보안 채팅 (실시간 연결 · 7건 메시지 · 입력)
 *   - 상대방 정보 (○○은행 김 팀장)
 */

import Link from "next/link"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowRight, ArrowLeft, FileText, MessageSquare,
  Lock, CheckCircle2, Wifi, Send, Paperclip, Bell, Eye,
  Shield, Search, Building2, Clock, AlertCircle, Calendar,
  TrendingUp, MapPin, User, Award, Phone, ChevronRight,
  RefreshCw, Sparkles, Target, Wallet,
  Camera, Scale, FileSignature, ExternalLink, Download,
} from "lucide-react"
import { MckPageShell, MckPageHeader, MckKpiGrid, MckDemoBanner } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"
import {
  InvestorVerifyModal,
  NdaModal,
  LoiModal,
  type InvestorVerifyState,
  type NdaState,
  type LoiState,
} from "@/components/asset-detail/access-modals"
import { OwnerEditButton } from "@/components/edit/owner-edit-button"
import {
  type ChatMessage as SharedChatMessage,
  type BuyerThread as SharedBuyerThread,
  detectPII as sharedDetectPII,
  INITIAL_BUYER_THREADS as SHARED_BUYER_THREADS,
} from "./_chat-data"

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function DealRoomExamplerPage() {
  const [summaryOpen, setSummaryOpen] = useState(false)

  // PDF / Viewer 핸들러 — /analysis/report 와 동일 패턴 (window.print + body class)
  const handlePdfFull = () => {
    if (typeof window !== "undefined") {
      document.body.classList.remove("print-summary")
      document.title = "NPL_DealRoom_강남구_아파트_NPL_채권"
      window.print()
    }
  }
  const handlePdfSummary = () => {
    if (typeof window !== "undefined") {
      document.body.classList.add("print-summary")
      document.title = "NPL_DealRoom_Summary_강남구_아파트_NPL_채권"
      window.print()
      setTimeout(() => document.body.classList.remove("print-summary"), 500)
    }
  }

  return (
    <MckPageShell variant="tint">
      {/* ── ⓪ 체험 모드 데모 banner ──────────────────────────────── */}
      <MckDemoBanner />

      {/* ── ① Page Header — breadcrumb + eyebrow + PDF/Viewer + 거래소 / 딜룸 CTA ── */}
      <MckPageHeader
        breadcrumbs={[
          { label: "딜룸", href: "/deals" },
          { label: "진행중 딜" },
        ]}
        eyebrow="DEAL ROOMS · NEGOTIATION DESK"
        title="강남구 아파트 NPL 채권 · 딜룸"
        subtitle="○○은행 · 서울 강남구 · 임의매각 · NPL-2026-0412"
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {/* 편집하기 — 관리자 / 매도자(본인)만 노출
                · resourceId 는 이 데모 페이지에서 표시 중인 매물 ID (실제 데이터 연동 시 동적 listing.id)
                · ownerId 는 해당 매물의 seller_id (데모: dev SELLER 사용자 = 김매도) */}
            <OwnerEditButton
              resourceType="dealroom"
              resourceId="npl-2026-0412"
              ownerId="00000000-0000-0000-0000-000000000001"
            />
            {/* PDF 다운로드 (Full Ver.) — 메인 dark CTA */}
            <button
              type="button"
              onClick={handlePdfFull}
              className="no-print mck-cta-dark"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 16px",
                fontSize: 12, fontWeight: 800,
                background: MCK.ink, color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.electric}`,
                letterSpacing: "-0.01em", cursor: "pointer",
              }}
              title="PDF 다운로드 (Full Ver.)"
            >
              <Download size={14} style={{ color: MCK.paper }} />
              <span style={{ color: MCK.paper }}>PDF 다운로드 (Full Ver.)</span>
            </button>
            {/* PDF 다운로드 (1Page Summary) — paper outline */}
            <button
              type="button"
              onClick={handlePdfSummary}
              className="no-print"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 16px",
                fontSize: 12, fontWeight: 800,
                background: MCK.paper, color: MCK.ink,
                border: `1px solid ${MCK.ink}`,
                letterSpacing: "-0.01em", cursor: "pointer",
              }}
              title="PDF 다운로드 (1Page Summary)"
            >
              <FileText size={14} style={{ color: MCK.ink }} />
              PDF 다운로드 (1Page Summary)
            </button>
            {/* Viewer — soft outline */}
            <button
              type="button"
              onClick={() => setSummaryOpen(true)}
              className="no-print"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "9px 16px",
                fontSize: 12, fontWeight: 700,
                background: MCK.paper, color: MCK.ink,
                border: `1px solid ${MCK.borderStrong}`,
                letterSpacing: "-0.01em", cursor: "pointer",
              }}
              title="Viewer"
            >
              <Eye size={14} style={{ color: MCK.ink }} />
              Viewer
            </button>
            {/* 거래소 매물 탐색 — Deep Navy CTA (+ 새 딜 시작 동일 스타일) */}
            <Link
              href="/exchange"
              className="mck-cta-dark"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 22px",
                background: MCK.ink, color: MCK.paper,
                borderTop: `2px solid ${MCK.electric}`,
                fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em",
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(10,22,40,0.18)",
              }}
            >
              <Search size={14} style={{ color: MCK.paper }} />
              <span style={{ color: MCK.paper }}>거래소 매물 탐색</span>
            </Link>
            {/* 딜룸 - 대시보드 — Deep Navy CTA */}
            <Link
              href="/deals"
              className="mck-cta-dark"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 22px",
                background: MCK.ink, color: MCK.paper,
                borderTop: `2px solid ${MCK.electric}`,
                fontSize: 13, fontWeight: 800, letterSpacing: "-0.01em",
                textDecoration: "none",
                boxShadow: "0 4px 16px rgba(10,22,40,0.18)",
              }}
            >
              <ArrowLeft size={14} style={{ color: MCK.paper }} />
              <span style={{ color: MCK.paper }}>딜룸 - 대시보드</span>
            </Link>
          </div>
        }
      />

      {/* Viewer 모달 (1Page Summary 미리보기) */}
      {summaryOpen && <DealRoomSummaryViewer onClose={() => setSummaryOpen(false)} />}

      {/* ── ② DARK KPI Strip ──────────────────────────────────────── */}
      <section style={{ background: MCK.paper, paddingBottom: 24 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid
            variant="dark"
            items={[
              { label: "매각희망가", value: "19.9억", hint: "할인율 ↓8.9% · 채권잔액 22.7억" },
              { label: "AI 투자 등급", value: "A · 89.4점", hint: "BUY · 회수율 78.5%" },
              { label: "거래 단계", value: "NDA", hint: "검증 데이터 열람 가능" },
              { label: "남은 기간", value: "D-5", hint: "LOI 제출 마감" },
            ]}
          />
        </div>
      </section>

      {/* ── ③ Deal Flow Timeline (4-step funnel) ──────────────────── */}
      <DealFlowTimeline />

      {/* ── ④ 2-col Main · LEFT 4-section + RIGHT sticky 채팅 ─────── */}
      <section style={{ background: MCK.paperTint, paddingTop: 32, paddingBottom: 48 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px]" style={{ gap: 24, alignItems: "start" }}>

            {/* ── LEFT — 4-section stacked ─────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <SectionScreening />
              <SectionValidation />
              <SectionEngagement />
              <SectionExecution />
            </div>

            {/* ── RIGHT — sticky 보안 채팅 + 상대방 ─────────────────── */}
            <div style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <SecureChatPanel />
              <CounterpartySidePanel />
            </div>
          </div>
        </div>
      </section>

      {/* ── ⑤ Footer CTA · Deep Navy ──────────────────────────────── */}
      <section style={{ background: MCK.inkDeep, padding: "56px 24px" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.cyan, marginBottom: 12 }}>
            NPLATFORM · DEAL FUNNEL
          </div>
          <h3
            style={{
              fontFamily: MCK_FONTS.serif,
              fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
              fontWeight: 800,
              color: MCK.paper,
              letterSpacing: "-0.02em",
              lineHeight: 1.25,
              marginBottom: 14,
            }}
          >
            매물 발견부터 정산까지, 한 페이지에서.
          </h3>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/exchange"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "13px 26px", fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em",
                background: MCK.electric, color: MCK.paper, border: `1px solid ${MCK.electric}`,
                textDecoration: "none", boxShadow: "0 8px 24px rgba(34, 81, 255, 0.45)",
              }}
            >
              <span style={{ color: MCK.paper }}>매물 탐색하기</span>
              <ArrowRight size={16} style={{ color: MCK.paper }} />
            </Link>
            <Link
              href="/exchange/sell"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "13px 26px", fontSize: 14, fontWeight: 800, letterSpacing: "-0.01em",
                background: MCK.paper, color: MCK.ink, border: `1px solid ${MCK.paper}`,
                textDecoration: "none",
              }}
            >
              <Building2 size={15} style={{ color: MCK.electric }} />
              <span style={{ color: MCK.ink }}>매물 등록하기</span>
            </Link>
          </div>
        </div>
      </section>
    </MckPageShell>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ③ Deal Flow Timeline · 4-step funnel + anchor 링크
═══════════════════════════════════════════════════════════════════════════ */

function DealFlowTimeline() {
  const stages = [
    { n: "01", t: "Screening", k: "탐색 · 발견", state: "done", anchor: "section-1" },
    { n: "02", t: "Validation", k: "NDA · 실사", state: "current", anchor: "section-2" },
    { n: "03", t: "Engagement", k: "오퍼 · 계약", state: "next", anchor: "section-3" },
    { n: "04", t: "Execution", k: "에스크로 · 정산", state: "next", anchor: "section-4" },
  ]

  return (
    <section style={{ background: MCK.paper, paddingBottom: 32 }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderTop: `2px solid ${MCK.electric}`,
            padding: "20px 24px",
          }}
        >
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 14 }}>
            DEAL FLOW · 4-step funnel · 현재 STEP 02
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 0, position: "relative" }}>
            {/* connector line */}
            <div className="hidden md:block" style={{ position: "absolute", top: 24, left: "12.5%", right: "12.5%", height: 2, background: MCK.border, zIndex: 0 }} />
            <div className="hidden md:block" style={{ position: "absolute", top: 24, left: "12.5%", width: "25%", height: 2, background: MCK.electric, zIndex: 0 }} />
            {stages.map((s) => {
              const isCurrent = s.state === "current"
              const isDone = s.state === "done"
              return (
                <a
                  key={s.n}
                  href={`#${s.anchor}`}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
                    padding: "0 16px", textDecoration: "none",
                    position: "relative", zIndex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 48, height: 48,
                      background: isDone ? MCK.electric : isCurrent ? MCK.ink : MCK.paperTint,
                      border: isDone || isCurrent ? "none" : `1px solid ${MCK.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginBottom: 10,
                      boxShadow: isCurrent ? "0 4px 12px rgba(5, 28, 44, 0.15)" : "none",
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? (
                      <CheckCircle2 size={20} style={{ color: MCK.paper }} />
                    ) : (
                      <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: isCurrent ? MCK.paper : MCK.textMuted, letterSpacing: "-0.02em" }}>
                        {s.n}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 800, color: isCurrent ? MCK.electric : isDone ? MCK.electricDark : MCK.textMuted, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 4 }}>
                    {s.t}{isCurrent && <span style={{ color: MCK.electric }}> · 현재</span>}
                  </div>
                  <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em" }}>
                    {s.k}
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   Section Wrapper · 공통 헤더 (number + eyebrow + title + subtitle)
═══════════════════════════════════════════════════════════════════════════ */
function SectionShell({
  num, eyebrow, title, subtitle, anchor, children,
}: {
  num: string
  eyebrow: string
  title: string
  subtitle: string
  anchor: string
  children: React.ReactNode
}) {
  return (
    <article id={anchor}
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        borderTop: `2px solid ${MCK.electric}`,
        padding: "28px 32px",
      }}
    >
      {/* Section header */}
      <header style={{ marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${MCK.border}` }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 36, fontWeight: 800, color: MCK.electric, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {num}
          </span>
          <div>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>
              {eyebrow}
            </div>
            <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 22, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              {title}
            </h2>
          </div>
        </div>
        <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.55, fontWeight: 500, maxWidth: 640 }}>
          {subtitle}
        </p>
      </header>
      {children}
    </article>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 01 · Deal Screening (L0 · Free preview)
═══════════════════════════════════════════════════════════════════════════ */
function SectionScreening() {
  return (
    <SectionShell
      anchor="section-1"
      num="01"
      eyebrow="Section 01 · Free preview"
      title="Deal Screening — 3분 안에 판단"
      subtitle="이 딜이 검토할 가치가 있는지 빠르게 판단할 수 있도록 핵심 지표만 압축했습니다."
    >
      {/* 핵심 3-col 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12, marginBottom: 18 }}>
        <ScreenMetricCard label="채권잔액" value="22.7억" sub="원금 21.8억 + 연체이자 8,720만" />
        <ScreenMetricCard label="매각 희망가" value="19.9억" sub="할인율 ↓8.9%" highlight />
        <ScreenMetricCard label="감정가" value="25.7억" sub="감정평가 기준" />
      </div>

      {/* 자동 마스킹 banner — McKinsey Sky Blue (첨부 5 "딜룸 입장 · 상세" 스타일) */}
      <div
        style={{
          padding: "14px 18px",
          backgroundColor: "#A8CDE8",
          border: "1px solid #7FA8C8",
          borderTop: `2px solid ${MCK.electric}`,
          marginBottom: 24,
          display: "flex", alignItems: "flex-start", gap: 12,
        }}
      >
        <Shield size={16} style={{ color: MCK.electric, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: MCK.ink, lineHeight: 1.55, fontWeight: 500 }}>
          본 매물은 <strong style={{ color: MCK.ink, fontWeight: 800 }}>자동 마스킹 파이프라인</strong>을 통과했습니다. 개인정보·채무자 식별정보·상세 지번은 금융감독원 지침에 따라 자동으로 가려지며, 티어별 공개 범위는 규제 요건에 맞춰 분리됩니다.
        </p>
      </div>

      {/* AI 분석 6-KPI (2 row × 3 col) — 원본 화면 그대로 복원 */}
      <SubsectionHeader title="AI 분석 리포트" sub="Nplatform NPL Engine · 실시간" />
      <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: 10, marginBottom: 12 }}>
        <AnalysisKpiCard label="예측 회수율" value="78.5%" sub="신뢰도 92%" icon={<TrendingUp size={12} />} />
        <AnalysisKpiCard label="리스크 등급" value="A+ · 64.4점" sub="MEDIUM" icon={<Shield size={12} />} />
        <AnalysisKpiCard label="금융기관 NPL 매각가" value="19.60억원" sub="ROI 28.45%" icon={<Target size={12} />} highlight />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: 10, marginBottom: 14 }}>
        <AnalysisKpiCard label="투자 에쿼티 총계" value="593,516,997원" sub="자기 부담 자본" />
        <AnalysisKpiCard label="예상 투자수익" value="168,859,880원" sub="순익 (세전)" />
        <AnalysisKpiCard label="투자 수익률 (ROI)" value="28.45%" sub="연환산 36.4%" />
      </div>

      {/* CTA 버튼 2 — Cobalt Blue (분석 라우트로 연결) */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 10, marginBottom: 18 }}>
        <Link href="/analysis/report" className="mck-cta-dark" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: "13px 18px", fontSize: 12, fontWeight: 800,
          background: "#1A47CC",
          color: "#FFFFFF",
          border: "1px solid #1A47CC",
          borderTop: `2px solid ${MCK.electric}`,
          cursor: "pointer", letterSpacing: "-0.005em",
          textDecoration: "none",
          boxShadow: "0 6px 14px -3px rgba(34, 81, 255, 0.40), 0 2px 4px -1px rgba(5, 28, 44, 0.10)",
        }}>
          <span className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: "#FFFFFF" }} />
            <span style={{ color: "#FFFFFF" }}>NPL 분석 보고서</span>
          </span>
          <ArrowRight size={13} style={{ color: "#FFFFFF" }} />
        </Link>
        <Link href="/analysis" className="mck-cta-dark" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
          padding: "13px 18px", fontSize: 12, fontWeight: 800,
          background: "#1A47CC",
          color: "#FFFFFF",
          border: "1px solid #1A47CC",
          borderTop: `2px solid ${MCK.electric}`,
          cursor: "pointer", letterSpacing: "-0.005em",
          textDecoration: "none",
          boxShadow: "0 6px 14px -3px rgba(34, 81, 255, 0.40), 0 2px 4px -1px rgba(5, 28, 44, 0.10)",
        }}>
          <span className="flex items-center gap-2">
            <MessageSquare size={14} style={{ color: "#FFFFFF" }} />
            <span style={{ color: "#FFFFFF" }}>AI 컨설턴트에게 이 매물 질문</span>
          </span>
          <ArrowRight size={13} style={{ color: "#FFFFFF" }} />
        </Link>
      </div>

      {/* 회수율 progress bar */}
      <div style={{ background: MCK.paperTint, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`, padding: 16, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ ...MCK_TYPE.eyebrow, color: MCK.electric }}>예측 회수율 · 신뢰구간</span>
          <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 20, fontWeight: 800, color: MCK.electricDark, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
            78.5%
          </span>
        </div>
        <div style={{ position: "relative", height: 8, background: MCK.paperDeep, marginBottom: 6 }}>
          <div style={{ position: "absolute", left: "67.6%", width: "21.8%", height: "100%", background: "rgba(34, 81, 255, 0.25)" }} />
          <div style={{ position: "absolute", left: "78.5%", width: 3, height: "100%", background: MCK.ink, transform: "translateX(-50%)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MCK.textMuted, fontWeight: 700, fontVariantNumeric: "tabular-nums", marginBottom: 10 }}>
          <span>0%</span><span>67.6%</span><span style={{ color: MCK.electricDark, fontWeight: 800 }}>예측 78.5%</span><span>89.4%</span><span>100%</span>
        </div>
        <p style={{ fontSize: 11, color: MCK.textSub, lineHeight: 1.55 }}>
          신뢰구간 67.6~89.4% (±σ) · 신뢰도 92%. 담보 커버리지 128% · 낙찰가율 83.5% 시나리오. 신뢰구간 ±10.9%p — 보수 시나리오(96.9%) 병행 권고.
        </p>
      </div>

      {/* Monte Carlo 시뮬레이션 (full-width — AI 리스크 등급 카드 삭제됨) */}
      <article style={{ background: MCK.paperTint, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`, padding: 16, marginBottom: 24 }}>
        <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>Monte Carlo 시뮬레이션</div>
        <div style={{ fontSize: 11, color: MCK.textMuted, fontWeight: 600, marginBottom: 10 }}>10,000회 시뮬 · 정규분포 · Poisson</div>
        <div className="grid grid-cols-3" style={{ gap: 8 }}>
          <McMetric label="평균 ROI" value="23.30%" sub="σ 5.30%p" />
          <McMetric label="손실 확률" value="0.20%" sub="VaR 12.7%" />
          <McMetric label="회수 기간" value="338일" sub="연환산 1.08x" />
        </div>
      </article>

      {/* ── AI 분석 리포트 밑 · 투자 분석 + 수수료 (매칭 수요 + 제공 자료 삭제) ─ */}
      <SubsectionHeader title="투자 분석" sub="Nplatform NPL Engine · 실시간" />
      <FullAiInvestmentAnalysisCard />

      <SubsectionHeader title="매수자 수수료 안내" sub="거래 성사 시에만 부과" />
      <FullBuyerFeeCard />

      {/* ── 다음 단계 cards (사용자 요청 — 기본 정보 요약 앞) ───────────── */}
      <NextStepGroup />

      {/* 기본 정보 요약 · 인증 게이트 banner — McKinsey Sky Blue */}
      <SubsectionHeader title="기본 정보 요약" sub="본인인증 후 열람" />
      <div
        style={{
          padding: "12px 16px",
          backgroundColor: "#A8CDE8",
          border: "1px solid #7FA8C8",
          borderTop: `2px solid ${MCK.electric}`,
          marginBottom: 14,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 10,
        }}
      >
        <div className="flex items-center gap-2">
          <Lock size={14} style={{ color: MCK.electric }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: MCK.ink, letterSpacing: "-0.005em" }}>
            본 영역은 <strong style={{ color: MCK.ink, fontWeight: 800 }}>본인인증</strong>이 완료되어야 열람할 수 있습니다.
          </span>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 9px", fontSize: 9, fontWeight: 800,
          background: "rgba(34, 81, 255, 0.10)", color: MCK.electricDark,
          border: "1px solid rgba(34, 81, 255, 0.40)",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          <CheckCircle2 size={10} style={{ color: MCK.electricDark }} />
          투자자 인증 완료
        </span>
      </div>

      {/* 권리/등기/임대차 요약 3-col */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12, marginBottom: 16 }}>
        <BriefCard title="권리관계 요약" rows={[["선순위", "14.2억"], ["후순위", "2.6억"], ["보증금", "1.1억"]]} note="누구나 열람 가능 · 권리자 상세는 검증 단계 이후 공개" />
        <BriefCard title="등기부등본 요약" rows={[["토지등기부", "2건"], ["건물등기부", "1건"], ["채권액 합계", "8.3억"]]} note="본인인증 후 요약 · 원본은 검증 단계" />
        <BriefCard title="임대차 현황" rows={[["보증금 합계", "6,000만"], ["월세", "—"], ["임차인 수", "1명"]]} note="NDA 체결 시 임차인 상세" />
      </div>

      {/* 등기부등본 요약 — L1 상세 테이블 (원본 화면 그대로 복원) */}
      <RegistrySummaryTable />
      {/* (사용자 요청 — 땅집고옥션 버튼 삭제 · Section 02 경매 정보 카드 하단으로 이동) */}
    </SectionShell>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 02 · Deal Validation (L2 · NDA required)
═══════════════════════════════════════════════════════════════════════════ */
function SectionValidation() {
  return (
    <SectionShell
      anchor="section-2"
      num="02"
      eyebrow="Section 02 · NDA required"
      title="Deal Validation — 검증 데이터"
      subtitle="의사결정의 핵심 근거. NDA 전자서명 후 감정평가서 · 채권 정보 · 등기부 원본을 모두 열람할 수 있습니다."
    >
      {/* ── 다음 단계 cards (Section 02 — NDA 활성) ─────────────────── */}
      <NextStepGroup activeKey="nda" />

      {/* NDA 완료 banner — McKinsey Sky Blue (첨부 5 스타일) */}
      <div
        style={{
          padding: "16px 20px",
          backgroundColor: "#A8CDE8",
          border: "1px solid #7FA8C8",
          borderTop: `2px solid ${MCK.electric}`,
          marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}
      >
        <div className="flex items-center gap-3">
          <FileSignature size={20} style={{ color: MCK.electric }} />
          <div>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electricDark, marginBottom: 2 }}>NDA 체결 완료</div>
            <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800, color: MCK.ink }}>
              검증 데이터 열람 가능
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* NDA 보기 — paper bg + ink 글씨 (강조) */}
          <button type="button" style={{
            padding: "8px 14px", fontSize: 11, fontWeight: 800,
            background: MCK.paper, color: MCK.ink,
            border: `1px solid ${MCK.ink}`,
            cursor: "pointer",
          }}>
            NDA 보기
          </button>
          {/* PDF 다운로드 — outline 스타일 */}
          <button type="button" style={{
            padding: "8px 14px", fontSize: 11, fontWeight: 700,
            background: "transparent", color: MCK.ink,
            border: `1px solid ${MCK.ink}`,
            cursor: "pointer",
          }}>
            PDF 다운로드
          </button>
        </div>
      </div>

      {/* (사용자 요청 — Section 02 거래 상대방 PartyCards 삭제) */}

      {/* 5-card 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12, marginBottom: 18 }}>
        <ValidationCard
          icon={<Scale size={15} />}
          title="감정평가서"
          rows={[["감정가", "25.7억"], ["면적", "3,333㎡"], ["감정가/㎡", "77만원/㎡"], ["기준 시점", "2026-05-23"]]}
          actions={["PDF 보기", "다운로드"]}
        />
        <ValidationCard
          icon={<Calendar size={15} />}
          title="경매 정보"
          rows={[["사건번호", "서울중앙 2025타경12345"], ["관할법원", "서울중앙지방법원"], ["접수일", "2025-08-15"], ["예상 시작일", "2026-05-20"]]}
          note="공매 진행 없음 · 임의매각 방식"
          actions={["땅집고옥션에서 경매 조회 →"]}
        />
        <ValidationCard
          icon={<TrendingUp size={15} />}
          title="실거래 경공매 통계"
          note="국토부 실거래가 현황 및 법원 경매와 온비드 공매 낙찰 통계 및 유사 사례를 확인합니다."
          actions={["땅집고옥선 통계 정보 조회 →"]}
        />
        <ValidationCard
          icon={<Wallet size={15} />}
          title="채권 정보"
          rows={[["채권잔액", "22.7억"], ["원금/미수이자", "21.8억 / 8,720만"], ["대출/연체 금리", "6.9% / 8.9%"], ["연체 시작", "2025-07-23 (278일)"]]}
          note="세부 내역은 LOI 후 대면 미팅"
        />
      </div>

      {/* 등기부등본 원본 — L2 상세 7-row 테이블 (원본 화면 그대로 복원) */}
      <RegistryFullTable />


      {/* 현장 사진 */}
      <ValidationCard
        icon={<Camera size={15} />}
        title="현장 사진 (3장)"
        actions={["전체 다운로드 (3장)"]}
      >
        <div className="grid grid-cols-3" style={{ gap: 8, marginTop: 8 }}>
          {[1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                aspectRatio: "4 / 3",
                background: `linear-gradient(135deg, ${MCK.paperTint} 0%, ${MCK.paperDeep} 100%)`,
                border: `1px solid ${MCK.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Camera size={18} style={{ color: MCK.textMuted, opacity: 0.5 }} />
            </div>
          ))}
        </div>
      </ValidationCard>
      {/* (사용자 요청 — 사이드 4-패널 중복 삭제 · Section 01 에 동일 내용 존재) */}
    </SectionShell>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 03 · Deal Engagement (L3 · LOI required) — 실사 + 가격 오퍼 (채팅은 RIGHT sticky)
═══════════════════════════════════════════════════════════════════════════ */
function SectionEngagement() {
  return (
    <SectionShell
      anchor="section-3"
      num="03"
      eyebrow="Section 03 · LOI required"
      title="Deal Engagement — 협상·실사"
      subtitle="LOI 제출 후 실사 일정 조율과 가격 오퍼를 진행합니다. 매도자와의 실시간 채팅은 우측에서 진행됩니다."
    >
      {/* ── 다음 단계 — Section 03 LOI 활성 ──────────────────────────── */}
      <NextStepGroup activeKey="loi" />

      {/* LOI 확인 banner — McKinsey Sky Blue (첨부 5 스타일) */}
      <div
        style={{
          padding: "14px 18px",
          backgroundColor: "#A8CDE8",
          border: "1px solid #7FA8C8",
          borderTop: `2px solid ${MCK.electric}`,
          marginBottom: 18,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}
      >
        <div className="flex items-start gap-3">
          <FileSignature size={18} style={{ color: MCK.electric, marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: MCK.electricDark, marginBottom: 3, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              LOI 확인
            </div>
            <p style={{ fontSize: 12, color: MCK.ink, lineHeight: 1.5 }}>
              제출된 인수의향서 확인 + 다운로드. 매도자 승인 후 에스크로 단계로 진행.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* LOI 보기 */}
          <button type="button" style={{
            padding: "8px 14px", fontSize: 11, fontWeight: 800,
            background: MCK.paper, color: MCK.ink,
            border: `1px solid ${MCK.ink}`, cursor: "pointer",
          }}>
            LOI 보기
          </button>
          {/* PDF 다운로드 */}
          <button type="button" style={{
            padding: "8px 14px", fontSize: 11, fontWeight: 700,
            background: "transparent", color: MCK.ink,
            border: `1px solid ${MCK.ink}`, cursor: "pointer",
          }}>
            PDF 다운로드
          </button>
        </div>
      </div>

      {/* 2-col: 실사 신청 + 가격 오퍼 */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12, marginBottom: 18 }}>
        <DueDiligenceForm />
        <PriceOfferForm />
      </div>

      {/* 오퍼 history table */}
      <SubsectionHeader title="오퍼 내역" sub="3차 협상 진행" />
      <div style={{ border: `1px solid ${MCK.border}`, background: MCK.paper }}>
        <div
          style={{
            display: "grid", gridTemplateColumns: "60px 1fr 90px 90px 80px",
            gap: 10, padding: "8px 12px",
            background: MCK.paperTint, borderBottom: `1px solid ${MCK.border}`,
            fontSize: 9, fontWeight: 800, color: MCK.textSub,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}
        >
          <span>차수</span>
          <span>제출자</span>
          <span style={{ textAlign: "right" }}>오퍼가</span>
          <span style={{ textAlign: "right" }}>할인율</span>
          <span style={{ textAlign: "center" }}>상태</span>
        </div>
        {[
          { round: "01", from: "매수자 · ○○대부업체", price: "7.8억", discount: "35.0%", status: "거절", statusBg: MCK.paperDeep, statusFg: MCK.textSub, isDark: false },
          { round: "02", from: "매도자 · ○○은행", price: "8.7억", discount: "27.5%", status: "응답대기", statusBg: "rgba(34, 81, 255, 0.10)", statusFg: "#1A47CC", isDark: false },
          { round: "03", from: "매수자 · ○○대부업체", price: "8.5억", discount: "29.2%", status: "검토중", statusBg: MCK.ink, statusFg: MCK.paper, isDark: true },
        ].map((row, idx) => (
          <div
            key={row.round}
            style={{
              display: "grid", gridTemplateColumns: "60px 1fr 90px 90px 80px",
              gap: 10, alignItems: "center", padding: "10px 12px",
              borderBottom: idx < 2 ? `1px solid ${MCK.border}` : "none",
            }}
          >
            <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink }}>{row.round}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: MCK.ink }}>{row.from}</span>
            <span style={{ textAlign: "right", fontFamily: MCK_FONTS.serif, fontSize: 12, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>{row.price}</span>
            <span style={{ textAlign: "right", fontFamily: MCK_FONTS.serif, fontSize: 11, fontWeight: 700, color: MCK.electricDark, fontVariantNumeric: "tabular-nums" }}>{row.discount}</span>
            <span style={{ textAlign: "center" }}>
              <span
                className={row.isDark ? "mck-cta-dark" : ""}
                style={{
                  display: "inline-flex", alignItems: "center",
                  padding: "2px 7px", fontSize: 8, fontWeight: 800,
                  background: row.statusBg, color: row.statusFg,
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}
              >
                <span style={{ color: row.statusFg }}>{row.status}</span>
              </span>
            </span>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTION 04 · Deal Execution (Closing)
═══════════════════════════════════════════════════════════════════════════ */
function SectionExecution() {
  const [escrowOpen, setEscrowOpen] = useState(false)
  return (
    <SectionShell
      anchor="section-4"
      num="04"
      eyebrow="Section 04 · Closing"
      title="Deal Execution — 1Day 클로징"
      subtitle="ESCROW 결제 후 24시간 내 클로징. 현장 계약 · 채권 양도 · 정산이 자동으로 이뤄집니다."
    >
      {/* 3-step closing — ① ESCROW 입금 / ② 매도자 승인+현장 계약 / ③ 채권양도+정산 */}
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12, marginBottom: 20 }}>
        {[
          { n: "①", icon: Wallet, t: "ESCROW 입금", d: "10% 보증금 + 매수자 수수료를 KB에스크로 계좌로. 자금은 채권양도 완료 시까지 안전 보호." },
          { n: "②", icon: FileSignature, t: "매도자 승인 및 현장 계약 진행", d: "LOI 가격 오퍼 승인 내용 기반 매매계약서 현장 작성." },
          { n: "③", icon: CheckCircle2, t: "채권양도 + 정산", d: "에스크로 자금 매도자 정산 → 거래 종결. 분쟁 시 NPLatform 중재." },
        ].map((s) => {
          const Icon = s.icon
          return (
            <article
              key={s.n}
              style={{
                background: MCK.paperTint,
                border: `1px solid ${MCK.border}`,
                borderTop: `2px solid ${MCK.electric}`,
                padding: 16,
                display: "flex", flexDirection: "column", gap: 10,
              }}
            >
              <div className="flex items-center gap-10" style={{ gap: 10 }}>
                <div className="mck-cta-dark"
                  style={{
                    width: 38, height: 38, background: MCK.ink,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <Icon size={18} style={{ color: MCK.paper }} />
                </div>
                <div>
                  <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 20, fontWeight: 800, color: MCK.electric, lineHeight: 1 }}>{s.n}</div>
                  <h4 style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em", marginTop: 2 }}>
                    {s.t}
                  </h4>
                </div>
              </div>
              <p style={{ fontSize: 11, color: MCK.textSub, lineHeight: 1.55 }}>
                {s.d}
              </p>
            </article>
          )
        })}
      </div>

      {/* 최종 CTA — ESCROW 입금 후 실행 → 모달로 결제 정보 표시 */}
      <div className="mck-cta-dark"
        style={{
          background: MCK.inkDeep, borderTop: `3px solid ${MCK.electric}`,
          padding: "24px 28px", textAlign: "center",
        }}
      >
        <div style={{ ...MCK_TYPE.eyebrow, color: MCK.cyan, marginBottom: 6 }}>
          ESCROW 결제 후 실행
        </div>
        <h4 style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, fontWeight: 800, color: MCK.paper, letterSpacing: "-0.015em", marginBottom: 14 }}>
          <span style={{ color: MCK.paper }}>안전결제 · 전자계약 · 잔금처리</span>
        </h4>
        <button
          type="button"
          onClick={() => setEscrowOpen(true)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 26px", fontSize: 13, fontWeight: 800,
            background: MCK.electric, color: MCK.paper, border: `1px solid ${MCK.electric}`,
            cursor: "pointer", letterSpacing: "-0.005em",
            boxShadow: "0 8px 24px rgba(34, 81, 255, 0.45)",
          }}
        >
          <Wallet size={14} style={{ color: MCK.paper }} />
          <span style={{ color: MCK.paper }}>ESCROW 입금 후 실행</span>
        </button>
      </div>

      {escrowOpen && <EscrowPaymentModal onClose={() => setEscrowOpen(false)} />}
    </SectionShell>
  )
}

/* ════ Viewer — 1Page Summary 미리보기 모달 ════════════════════════════════ */
function DealRoomSummaryViewer({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(5, 28, 44, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(2px)",
      }}
    >
      <article
        onClick={e => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          border: `1px solid ${MCK.border}`,
          borderTop: `4px solid ${MCK.electric}`,
          width: "100%", maxWidth: 880,
          padding: "28px 32px",
          maxHeight: "92vh", overflowY: "auto",
          boxShadow: "0 20px 50px -10px rgba(5, 28, 44, 0.40)",
        }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: `1px solid ${MCK.border}` }}>
          <div>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>
              1PAGE SUMMARY — VIEWER
            </div>
            <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 22, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.015em" }}>
              강남구 아파트 NPL 채권 · 딜룸 요약
            </h3>
            <div style={{ fontSize: 12, color: MCK.textSub, marginTop: 6, fontWeight: 500 }}>
              ○○은행 · 서울 강남구 · 임의매각 · NPL-2026-0412 · D-5
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" style={{
            padding: "4px 10px", fontSize: 18, fontWeight: 800,
            background: "transparent", color: MCK.textMuted, border: "none", cursor: "pointer", lineHeight: 1,
          }}>×</button>
        </header>

        {/* Hero KPI 4-col */}
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 10, marginBottom: 18 }}>
          {[
            { l: "매각희망가", v: "19.9억", s: "할인율 ↓8.9%" },
            { l: "AI 투자 등급", v: "A · 89.4점", s: "BUY · 회수율 78.5%" },
            { l: "거래 단계", v: "NDA", s: "검증 데이터 열람 가능" },
            { l: "남은 기간", v: "D-5", s: "LOI 제출 마감" },
          ].map(k => (
            <div key={k.l} style={{
              backgroundColor: "#051C2C",
              padding: "14px 16px",
              borderTop: `2px solid ${MCK.electric}`,
            }} className="mck-cta-dark">
              <div style={{ fontSize: 9, fontWeight: 800, color: "#2251FF", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 4 }}>
                <span style={{ color: "#2251FF" }}>{k.l}</span>
              </div>
              <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 20, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 4 }}>
                <span style={{ color: "#FFFFFF" }}>{k.v}</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
                <span style={{ color: "rgba(255,255,255,0.55)" }}>{k.s}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Key 데이터 요약 */}
        <div style={{
          background: MCK.paperTint,
          border: `1px solid ${MCK.border}`,
          borderTop: `2px solid ${MCK.electric}`,
          padding: "16px 18px",
          marginBottom: 14,
        }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 10 }}>
            KEY METRICS
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: 14 }}>
            {[
              ["채권잔액", "22.7억"],
              ["감정가", "25.7억"],
              ["담보 커버리지", "128%"],
              ["예측 회수율", "78.5%"],
              ["AI 권고 매입가", "18.62억"],
              ["예상 ROI", "48.6%"],
            ].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 9, fontWeight: 700, color: MCK.textMuted, textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>{k}</div>
                <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 17, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.015em", fontVariantNumeric: "tabular-nums" }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        <p style={{ fontSize: 11, color: MCK.textMuted, lineHeight: 1.55, marginBottom: 16 }}>
          ※ 본 요약은 1Page Summary 인쇄용 미리보기입니다. 정식 보고서는 <strong style={{ color: MCK.ink, fontWeight: 800 }}>PDF 다운로드 (Full Ver.)</strong> 를 이용하세요. 모든 데이터는 NDA 범위 내에서만 공유 가능합니다.
        </p>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{
            padding: "10px 18px", fontSize: 12, fontWeight: 700,
            background: MCK.paper, color: MCK.ink, border: `1px solid ${MCK.borderStrong}`, cursor: "pointer",
          }}>
            닫기
          </button>
        </div>
      </article>
    </div>
  )
}

/* ════ ESCROW 입금 결제 모달 — 매입가 19.9억 / 보증금 10% / 수수료 1.8% / KB에스크로 ═══ */
function EscrowPaymentModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(5, 28, 44, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(2px)",
      }}
    >
      <article
        onClick={e => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          border: `1px solid ${MCK.border}`,
          borderTop: `4px solid ${MCK.electric}`,
          width: "100%", maxWidth: 540,
          padding: "24px 28px",
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 20px 50px -10px rgba(5, 28, 44, 0.40)",
        }}
      >
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 16 }}>
          <div className="flex items-center gap-3">
            <span className="mck-cta-dark" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 38, height: 38,
              background: MCK.electric, color: "#FFFFFF",
            }}>
              <Wallet size={18} style={{ color: "#FFFFFF" }} />
            </span>
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 3 }}>
                ESCROW 입금
              </div>
              <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 20, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.015em" }}>
                에스크로 결제
              </h3>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" style={{
            padding: "4px 10px", fontSize: 16, fontWeight: 800,
            background: "transparent", color: MCK.textMuted, border: "none", cursor: "pointer", lineHeight: 1,
          }}>×</button>
        </header>

        <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.6, marginBottom: 18 }}>
          매입가 10% 보증금 + 매수 수수료를 에스크로 계좌로 납부합니다.
        </p>

        {/* 납부 총액 (HERO) */}
        <div style={{
          backgroundColor: "#051C2C",
          borderTop: `3px solid ${MCK.electric}`,
          padding: "20px 22px",
          marginBottom: 14,
        }}
          className="mck-cta-dark"
        >
          <div style={{ fontSize: 10, fontWeight: 800, color: "#2251FF", letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>
            <span style={{ color: "#2251FF" }}>납부 총액</span>
          </div>
          <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 32, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em", lineHeight: 1.05, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: "#FFFFFF" }}>2.3억</span>
          </div>
        </div>

        {/* breakdown */}
        <dl style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
          {[
            { k: "매입가", v: "19.9억", muted: true },
            { k: "보증금 (매입가 × 10%)", v: "2.0억" },
            { k: "매수 수수료 (1.8%)", v: "3,575만" },
          ].map(r => (
            <div key={r.k} style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              paddingBottom: 6, borderBottom: `1px dashed ${MCK.border}`,
            }}>
              <dt style={{ fontSize: 12, color: r.muted ? MCK.textMuted : MCK.textSub, fontWeight: 600 }}>{r.k}</dt>
              <dd style={{ fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800, color: r.muted ? MCK.textMuted : MCK.ink, fontVariantNumeric: "tabular-nums" }}>{r.v}</dd>
            </div>
          ))}
        </dl>

        {/* 계좌 정보 */}
        <div style={{
          padding: "14px 16px",
          background: "rgba(34, 81, 255, 0.05)",
          border: "1px solid rgba(34, 81, 255, 0.20)",
          borderLeft: `3px solid ${MCK.electric}`,
          marginBottom: 14,
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: MCK.electricDark, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
            에스크로 계좌 (KB국민은행)
          </div>
          <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 18, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums", marginBottom: 4 }}>
            301-9999-****-23
          </div>
          <div style={{ fontSize: 11, color: MCK.textSub, fontWeight: 500 }}>
            예금주: KB에스크로서비스(주) · 가상계좌 자동 발급
          </div>
        </div>

        <p style={{ fontSize: 11, color: MCK.textMuted, lineHeight: 1.55, marginBottom: 18 }}>
          ※ 보증금은 현장 계약 체결 후 잔금(90%) 납부 시 충당됩니다. 계약 불발 시 귀책 여부에 따라 몰취될 수 있습니다.
        </p>

        {/* CTA */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 14, borderTop: `1px solid ${MCK.border}` }}>
          <button type="button" onClick={onClose} style={{
            padding: "10px 18px", fontSize: 12, fontWeight: 700,
            background: MCK.paper, color: MCK.ink, border: `1px solid ${MCK.borderStrong}`, cursor: "pointer",
          }}>
            닫기
          </button>
          <button type="button" onClick={onClose} className="mck-cta-dark" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "10px 18px", fontSize: 12, fontWeight: 800,
            background: MCK.electric, color: "#FFFFFF", border: `1px solid ${MCK.electric}`, cursor: "pointer",
          }}>
            <Wallet size={13} style={{ color: "#FFFFFF" }} />
            <span style={{ color: "#FFFFFF" }}>가상계좌로 입금하기</span>
          </button>
        </div>
      </article>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   RIGHT · Secure Chat Panel (sticky · 매수자별 thread switching)
   ─────────────────────────────────────────────────────────────────────────
   매수자는 여러 명 가능 — 각 매수자별로 분리된 채팅 thread.
   리스트에서 매수자 클릭 → 해당 thread 표시.
   동일 정보가 매도사·매수자 대시보드에서도 조회 가능 (백엔드 thread_id 매핑).

   자동 기록 룰셋 (RULE_SET):
     R1. 투자자 인증 신청·승인 → system 메시지 자동 기록
     R2. NDA 전자서명 신청·체결 → system 메시지 자동 기록
     R3. LOI 제출·매도자 승인 → system 메시지 자동 기록
     R4. ESCROW 입금·전자계약·정산 → system 메시지 자동 기록
   PII 차단 룰셋 (PII_BLOCK):
     P1. 전화번호 (010·02·031·1588 등) → 입력 차단 + 경고
     P2. 주민번호·계좌번호 → 자동 마스킹 (서버 검증)
═══════════════════════════════════════════════════════════════════════════ */

/* PII 검증 + thread 데이터 — _chat-data.ts 에서 import */
const detectPII = sharedDetectPII
type BuyerThread = SharedBuyerThread

const BUYER_THREADS: BuyerThread[] = SHARED_BUYER_THREADS

/** 채팅 첨부 파일 — Blob URL 기반 (브라우저 메모리에서만 다운로드 가능) */
type ChatAttachment = {
  id: string
  name: string
  size: number
  url: string  // URL.createObjectURL(blob)
}

function SecureChatPanel() {
  const [activeBuyerId, setActiveBuyerId] = useState<string>(BUYER_THREADS[0].id)
  const [draft, setDraft] = useState<string>("")
  // NDA 게이트 — false 일 때 채팅 blur + overlay
  const [ndaApproved, setNdaApproved] = useState<boolean>(false)
  // 사용자 업로드 첨부 파일 (활성 thread 별로 누적)
  const [uploadedByThread, setUploadedByThread] = useState<Record<string, ChatAttachment[]>>({})
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activeThread = BUYER_THREADS.find(t => t.id === activeBuyerId) ?? BUYER_THREADS[0]
  const piiCheck = detectPII(draft)
  const blocked = piiCheck.hasPhone
  const uploads = uploadedByThread[activeBuyerId] ?? []

  function onFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newAttachments: ChatAttachment[] = Array.from(files).map(f => ({
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      size: f.size,
      url: URL.createObjectURL(f),
    }))
    setUploadedByThread(prev => ({
      ...prev,
      [activeBuyerId]: [...(prev[activeBuyerId] ?? []), ...newAttachments],
    }))
    // reset input for same-file re-pick
    e.target.value = ""
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.4 }}
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        borderTop: `2px solid ${MCK.electric}`,
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 120px)",
        maxHeight: 760,
        position: "relative",
      }}
    >
      {/* 숨김 file input — Paperclip 클릭 시 trigger */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={onFilePicked}
        style={{ display: "none" }}
        aria-label="채팅 파일 첨부"
      />

      {/* NDA 게이트 overlay — 승인 전 blur + 안내 */}
      {!ndaApproved && (
        <div
          style={{
            position: "absolute", inset: 0, zIndex: 10,
            background: "rgba(255, 255, 255, 0.65)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{
            background: "#FFFFFF",
            border: `1px solid ${MCK.borderStrong}`,
            borderTop: `3px solid ${MCK.electric}`,
            padding: "22px 24px",
            maxWidth: 360, textAlign: "center",
            boxShadow: "0 12px 32px -8px rgba(5, 28, 44, 0.30)",
          }}>
            <div className="mck-cta-dark" style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44,
              background: MCK.ink, color: MCK.paper,
              marginBottom: 12,
            }}>
              <Lock size={20} style={{ color: MCK.paper }} />
            </div>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>
              NDA 체결 필요
            </div>
            <h4 style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em", marginBottom: 8 }}>
              NDA 체결 후 채팅이 가능합니다
            </h4>
            <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.55, marginBottom: 16 }}>
              비밀유지계약 전자서명을 완료하시면 매도자와 보안 채팅이 활성화됩니다.
            </p>
            <button
              type="button"
              onClick={() => setNdaApproved(true)}
              className="mck-cta-dark"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "10px 20px", fontSize: 12, fontWeight: 800,
                background: MCK.electric, color: MCK.paper,
                border: `1px solid ${MCK.electric}`,
                cursor: "pointer", letterSpacing: "-0.005em",
              }}
            >
              <FileSignature size={13} style={{ color: MCK.paper }} />
              <span style={{ color: MCK.paper }}>NDA 체결하기 (시연)</span>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${MCK.border}`,
          background: MCK.paperTint,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 8,
        }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={14} style={{ color: MCK.electric }} />
          <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink }}>
            보안 채팅
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            marginLeft: 4, padding: "3px 8px",
            fontSize: 9, fontWeight: 800,
            color: "#1A47CC", background: "rgba(34, 81, 255, 0.10)",
            border: "1px solid rgba(34, 81, 255, 0.35)",
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            <Wifi size={9} style={{ color: "#1A47CC" }} />
            <span style={{ color: "#1A47CC" }}>실시간 연결</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: MCK.textMuted }}>
            <Bell size={10} style={{ color: MCK.textMuted }} />
            <span style={{ color: MCK.textMuted }}>알림 {BUYER_THREADS.reduce((sum, t) => sum + t.unread, 0)}</span>
          </span>
          <Link
            href="/deals/dealroom/chat"
            target="_blank"
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 9px", fontSize: 10, fontWeight: 800,
              color: "#1A47CC", background: "rgba(34, 81, 255, 0.08)",
              border: "1px solid rgba(34, 81, 255, 0.30)",
              letterSpacing: "0.04em",
              textDecoration: "none",
            }}
            aria-label="별도 창에서 채팅 열기"
          >
            <ExternalLink size={10} style={{ color: "#1A47CC" }} />
            <span style={{ color: "#1A47CC" }}>별도 창</span>
          </Link>
        </div>
      </div>

      {/* 자동 기록 룰셋 / PII 차단 안내 */}
      <div style={{
        padding: "8px 14px",
        background: "rgba(34, 81, 255, 0.04)",
        borderBottom: `1px solid ${MCK.border}`,
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 7px", fontSize: 8, fontWeight: 800,
          color: "#1A47CC", background: "rgba(34, 81, 255, 0.10)",
          border: "1px solid rgba(34, 81, 255, 0.35)",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          <span style={{ color: "#1A47CC" }}>● 자동 기록</span>
        </span>
        <span style={{ fontSize: 10, color: MCK.textSub, fontWeight: 500, lineHeight: 1.4 }}>
          인증 · NDA · LOI · ESCROW 단계가 채팅에 자동 기록됩니다.
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          marginLeft: "auto",
          padding: "2px 7px", fontSize: 8, fontWeight: 800,
          color: "#A53F00", background: "rgba(255, 140, 0, 0.08)",
          border: "1px solid rgba(255, 140, 0, 0.35)",
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          <Shield size={9} style={{ color: "#A53F00" }} />
          <span style={{ color: "#A53F00" }}>전화번호 차단</span>
        </span>
      </div>

      {/* Buyer list — 단출한 행 포맷 (이름 + unread 배지 만) */}
      <div style={{ borderBottom: `1px solid ${MCK.border}`, background: MCK.paper }}>
        <div style={{ maxHeight: 132, overflowY: "auto" }}>
          {BUYER_THREADS.map(t => {
            const isActive = t.id === activeBuyerId
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveBuyerId(t.id)}
                style={{
                  width: "100%", textAlign: "left",
                  padding: "9px 14px",
                  background: isActive ? "rgba(34, 81, 255, 0.06)" : "transparent",
                  borderLeft: isActive ? `3px solid ${MCK.electric}` : `3px solid transparent`,
                  borderBottom: `1px solid ${MCK.border}`,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
                }}
              >
                <span style={{
                  fontSize: 12, fontWeight: isActive ? 800 : 600,
                  color: MCK.ink,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {t.buyerName}
                </span>
                {t.unread > 0 && (
                  <span
                    className="mck-cta-dark"
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      minWidth: 16, height: 16, padding: "0 5px",
                      fontSize: 9, fontWeight: 800,
                      background: MCK.electric, color: MCK.paper,
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: MCK.paper }}>{t.unread}</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Active thread sub-header */}
      <div style={{
        padding: "8px 14px",
        background: MCK.paperTint,
        borderBottom: `1px solid ${MCK.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
      }}>
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 800, color: MCK.electric, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            현재 스레드
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: MCK.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activeThread.buyerCode} · {activeThread.buyerName}
          </span>
        </div>
        <span style={{ fontSize: 9, color: MCK.textMuted, fontWeight: 600 }}>
          매도사·매수자 대시보드 동기화
        </span>
      </div>

      {/* Messages — system 메시지 제외, 매도자/매수자 대화 + 업로드 첨부 */}
      <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
        {activeThread.messages.filter(m => m.type !== "system").map(msg => <ChatBubble key={msg.id} msg={msg} />)}

        {/* 사용자 업로드 첨부 — buyer-side 버블로 표시 */}
        {uploads.map(att => (
          <div key={att.id} style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", maxWidth: "88%", alignSelf: "flex-end", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: MCK.ink }}>나 (매수자)</span>
            </div>
            <a
              href={att.url}
              download={att.name}
              className="mck-cta-dark"
              style={{
                padding: "10px 14px",
                background: MCK.ink, color: MCK.paper,
                border: `1px solid ${MCK.ink}`,
                borderTop: `2px solid ${MCK.electric}`,
                fontSize: 11, fontWeight: 700,
                display: "inline-flex", alignItems: "center", gap: 8,
                textDecoration: "none",
                maxWidth: "100%",
              }}
            >
              <FileText size={13} style={{ color: "#A8CDE8", flexShrink: 0 }} />
              <span style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 2 }}>
                <span style={{ color: MCK.paper, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</span>
                <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 9, fontWeight: 600 }}>
                  {(att.size / 1024).toFixed(1)} KB · 클릭 시 다운로드
                </span>
              </span>
              <Download size={12} style={{ color: MCK.paper, flexShrink: 0, marginLeft: 4 }} />
            </a>
          </div>
        ))}

        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, color: MCK.textMuted, fontWeight: 600, fontStyle: "italic", marginTop: 4 }}>
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", backgroundColor: MCK.electric }}
          />
          {activeThread.buyerName}이 입력 중…
        </div>
      </div>

      {/* PII 경고 banner — 전화번호 감지 시 inline */}
      {blocked && (
        <div style={{
          padding: "8px 14px",
          background: "rgba(255, 140, 0, 0.08)",
          borderTop: `1px solid rgba(255, 140, 0, 0.35)`,
          display: "flex", alignItems: "flex-start", gap: 8,
        }}>
          <AlertCircle size={14} style={{ color: "#A53F00", marginTop: 1, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#A53F00", marginBottom: 2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              <span style={{ color: "#A53F00" }}>전화번호 입력 차단</span>
            </div>
            <div style={{ fontSize: 11, color: MCK.ink, lineHeight: 1.5, fontWeight: 500 }}>
              감지된 패턴: <code style={{ background: "rgba(165, 63, 0, 0.10)", color: "#A53F00", padding: "1px 4px", fontSize: 11, fontWeight: 800 }}>{piiCheck.matched}</code> · 전화번호는 채팅에 노출할 수 없습니다. 연락처 교환은 LOI 승인 후 NPLatform 계정 시스템에서 처리하세요.
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "10px 14px", borderTop: `1px solid ${MCK.border}`, background: MCK.paperTint, display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: "transparent",
            border: `1px solid ${MCK.borderStrong}`,
            color: MCK.electric, cursor: "pointer",
            transition: "background 0.15s ease",
          }}
          aria-label="파일 첨부"
          title="파일 첨부 (이미지·PDF·문서 모두 가능)"
        >
          <Paperclip size={13} style={{ color: MCK.electric }} />
        </button>
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={`${activeThread.buyerName} 에게 메시지… (전화번호 입력 시 자동 차단)`}
          style={{
            flex: 1, padding: "9px 12px", fontSize: 12,
            background: blocked ? "rgba(255, 140, 0, 0.05)" : MCK.paper,
            color: MCK.ink,
            border: blocked ? `1px solid #A53F00` : `1px solid ${MCK.borderStrong}`,
            outline: "none",
          }}
        />
        <button
          type="button"
          disabled={blocked || draft.trim().length === 0}
          className={blocked || draft.trim().length === 0 ? "" : "mck-cta-dark"}
          style={{
            width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center",
            background: blocked ? "#D6D6D6" : draft.trim().length === 0 ? MCK.paperDeep : MCK.ink,
            border: "none",
            borderTop: blocked ? `2px solid #D6D6D6` : `2px solid ${MCK.electric}`,
            color: MCK.paper,
            cursor: blocked || draft.trim().length === 0 ? "not-allowed" : "pointer",
            opacity: blocked || draft.trim().length === 0 ? 0.55 : 1,
          }}
          aria-label="전송"
        >
          <Send size={13} style={{ color: blocked ? "#888" : MCK.paper }} />
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: "8px 14px", background: MCK.paper, borderTop: `1px solid ${MCK.border}`, display: "flex", alignItems: "center", gap: 6 }}>
        <Lock size={11} style={{ color: MCK.electric }} />
        <span style={{ fontSize: 10, color: MCK.textSub, fontWeight: 600 }}>
          <strong style={{ color: MCK.ink, fontWeight: 800 }}>NDA 범위</strong> 내 열람 · 매도사·매수자 대시보드에서 조회 가능 · 워크플로우 자동 기록 · 전화번호 차단.
        </span>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   RIGHT · 상대방 정보 사이드 패널 (chat 아래)
═══════════════════════════════════════════════════════════════════════════ */
function CounterpartySidePanel() {
  return (
    <article
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        borderTop: `2px solid ${MCK.electric}`,
        padding: 16,
      }}
    >
      <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 12 }}>
        상대방 정보 · 매도자
      </div>
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <div className="mck-cta-dark"
          style={{
            width: 42, height: 42, background: MCK.inkDeep,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 800,
            flexShrink: 0,
          }}
        >
          <span style={{ color: MCK.paper }}>매</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.005em" }}>
            ○○은행 김 팀장
          </div>
          <div style={{ fontSize: 11, color: MCK.textMuted, fontWeight: 600 }}>
            매도자 · ○○은행
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 10, borderTop: `1px solid ${MCK.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Phone size={11} style={{ color: MCK.electric }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>02-****-0000</span>
        </div>
        <div style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 500, lineHeight: 1.5 }}>
          연락처는 LOI 승인 후 공개됩니다.
        </div>
      </div>
    </article>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   ATOMS · 재사용 컴포넌트
═══════════════════════════════════════════════════════════════════════════ */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  fontSize: 12,
  background: MCK.paperTint,
  color: MCK.ink,
  border: `1px solid ${MCK.borderStrong}`,
  outline: "none",
}

function FieldGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: MCK.textSub, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
        {label} {required && <span style={{ color: MCK.electric }}>*</span>}
      </div>
      {children}
    </div>
  )
}

function SubsectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${MCK.border}`, display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
      <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      <span style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 600 }}>{sub}</span>
    </div>
  )
}

function ScreenMetricCard({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  // McKinsey DARK KPI 패널 (첨부 2 — 진행중 딜 5건 / 총 거래금액 148.80억 / 완료 딜 1건):
  //   - bg: Deep Navy #051C2C · 1px ink border · sharp corner
  //   - label: cyan/electric blue cobalt
  //   - HERO 숫자: white Georgia serif
  //   - sub: muted gray (highlight 시 cyan 강조)
  return (
    <article
      className="mck-cta-dark"
      style={{
        backgroundColor: "#051C2C",
        border: "1px solid #051C2C",
        borderRadius: 0,
        overflow: "hidden",
        boxShadow: "0 12px 24px -8px rgba(5, 28, 44, 0.30), 0 4px 8px -2px rgba(5, 28, 44, 0.15)",
        padding: "20px 22px",
        display: "flex", flexDirection: "column", gap: 8,
      }}
    >
      <div style={{
        fontSize: 11, fontWeight: 800,
        color: "#2251FF",
        letterSpacing: "0.04em",
      }}>
        <span style={{ color: "#2251FF" }}>{label}</span>
      </div>
      <div style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 32, fontWeight: 800,
        color: "#FFFFFF",
        letterSpacing: "-0.02em",
        lineHeight: 1.05,
        fontVariantNumeric: "tabular-nums",
      }}>
        <span style={{ color: "#FFFFFF" }}>{value}</span>
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: highlight ? "#00A9F4" : "rgba(255, 255, 255, 0.55)",
        fontVariantNumeric: "tabular-nums",
      }}>
        <span style={{ color: highlight ? "#00A9F4" : "rgba(255, 255, 255, 0.55)" }}>{sub}</span>
      </div>
    </article>
  )
}

function AnalysisKpiCard({ label, value, sub, highlight, icon }: { label: string; value: string; sub: string; highlight?: boolean; icon?: React.ReactNode }) {
  // 거래소(/exchange) ListingCard 디자인 — 흰 페이퍼 카드:
  //   - bg: #FFFFFF
  //   - border: subtle ink hairline + 2px electric top accent
  //   - HERO 숫자: ink black Georgia serif
  //   - label: muted gray
  //   - sub: muted gray (highlight 시 electric blue brass accent)
  return (
    <div
      className="mck-paper"
      style={{
        backgroundColor: "#FFFFFF",
        border: "1px solid rgba(5, 28, 44, 0.10)",
        borderTop: "2px solid #2251FF",
        borderRadius: 0,
        padding: "18px 20px",
        boxShadow: "0 12px 24px -8px rgba(5, 28, 44, 0.15), 0 4px 8px -2px rgba(5, 28, 44, 0.08)",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{
          fontSize: 9, fontWeight: 700,
          color: "rgba(5, 28, 44, 0.55)",
          letterSpacing: "0.10em", textTransform: "uppercase",
        }}>
          {label}
        </div>
        {icon && (
          <span style={{ color: "#2251FF", opacity: 0.7 }}>{icon}</span>
        )}
      </div>
      <div style={{
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize: 22, fontWeight: 800,
        color: "#0A1628",
        letterSpacing: "-0.02em",
        lineHeight: 1.05,
        marginBottom: 6,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 10, fontWeight: highlight ? 800 : 600,
        color: highlight ? "#2251FF" : "rgba(5, 28, 44, 0.55)",
        fontVariantNumeric: "tabular-nums",
      }}>
        {sub}
      </div>
    </div>
  )
}

function McMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ padding: 8, background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}` }}>
      <div style={{ fontSize: 9, color: MCK.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>
        {value}
      </div>
      <div style={{ fontSize: 9, color: MCK.textMuted, fontWeight: 600, marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function BriefCard({ title, rows, note }: { title: string; rows: [string, string][]; note: string }) {
  return (
    <article style={{ background: MCK.paperTint, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`, padding: 14 }}>
      <h4 style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em", marginBottom: 8 }}>
        {title}
      </h4>
      <dl style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 4, borderBottom: `1px dashed ${MCK.border}` }}>
            <dt style={{ fontSize: 10, color: MCK.textSub, fontWeight: 600 }}>{k}</dt>
            <dd style={{ fontFamily: MCK_FONTS.serif, fontSize: 12, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>{v}</dd>
          </div>
        ))}
      </dl>
      <p style={{ fontSize: 9, color: MCK.textMuted, lineHeight: 1.5, fontWeight: 500 }}>{note}</p>
    </article>
  )
}

/* 등기부등본 요약 — L1 상세 테이블 (collapsible · 디폴트 접힘) */
function RegistrySummaryTable() {
  const [expanded, setExpanded] = useState(true)
  return (
    <article style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`, padding: 16, marginBottom: 12 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: expanded ? 12 : 0, flexWrap: "wrap", gap: 8 }}>
        <div className="flex items-center gap-2">
          <FileText size={14} style={{ color: MCK.electric }} />
          <h4 style={{ fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em" }}>
            등기부등본 요약
          </h4>
        </div>
        <button type="button" onClick={() => setExpanded(v => !v)} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "5px 11px", fontSize: 10, fontWeight: 700,
          background: MCK.paperTint, color: MCK.textSub,
          border: `1px solid ${MCK.border}`, cursor: "pointer",
        }}>
          {expanded ? "▲ 등기부 현황 접기" : "▼ 등기부 현황 펼치기"}
        </button>
      </header>

      {expanded && (
        <>
          {/* 탭 */}
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${MCK.border}`, marginBottom: 10 }}>
            <button type="button" style={{
              padding: "6px 14px", fontSize: 11, fontWeight: 800,
              background: "transparent", color: MCK.ink, cursor: "pointer",
              border: "none", borderBottom: `2px solid ${MCK.electric}`,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              토지등기부 <span style={{ fontSize: 9, color: MCK.electricDark, fontWeight: 700 }}>2</span>
            </button>
            <button type="button" style={{
              padding: "6px 14px", fontSize: 11, fontWeight: 600,
              background: "transparent", color: MCK.textMuted, cursor: "pointer",
              border: "none", borderBottom: `2px solid transparent`,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              건물등기부 <span style={{ fontSize: 9, color: MCK.textMuted, fontWeight: 700 }}>1</span>
            </button>
          </div>

          {/* 테이블 헤더 */}
          <div style={{
            display: "grid", gridTemplateColumns: "70px 90px 110px 1fr 120px",
            gap: 10, padding: "6px 4px", borderBottom: `1px solid ${MCK.border}`,
            fontSize: 9, fontWeight: 800, color: MCK.textSub,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            <span>구분</span>
            <span>접수일</span>
            <span>권리종류</span>
            <span>권리자</span>
            <span style={{ textAlign: "right" }}>채권금액</span>
          </div>

          {[
            { gubun: "1(을21)", date: "2021.06.18", kind: "근저당권", who: "●●●●●행", amt: "36.0억" },
            { gubun: "2(을23)", date: "2024.10.25", kind: "근저당권", who: "●●●●", amt: "9.6억" },
          ].map((r, i, arr) => (
            <div key={r.gubun} style={{
              display: "grid", gridTemplateColumns: "70px 90px 110px 1fr 120px",
              gap: 10, alignItems: "center", padding: "10px 4px",
              borderBottom: i < arr.length - 1 ? `1px solid ${MCK.border}` : "none",
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>{r.gubun}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: MCK.textSub, fontVariantNumeric: "tabular-nums" }}>{r.date}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: MCK.ink }}>{r.kind}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: MCK.textSub, fontVariantNumeric: "tabular-nums" }}>{r.who}</span>
              <span style={{ textAlign: "right", fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.electricDark, fontVariantNumeric: "tabular-nums" }}>{r.amt}</span>
            </div>
          ))}
        </>
      )}
    </article>
  )
}

/* 등기부등본 원본 — L2 상세 7-row 테이블 (collapsible · 디폴트 접힘) */
function RegistryFullTable() {
  const [expanded, setExpanded] = useState(true)
  return (
    <article style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`, padding: 16, marginBottom: 18 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: expanded ? 12 : 0, flexWrap: "wrap", gap: 8 }}>
        <div className="flex items-center gap-2">
          <FileText size={14} style={{ color: MCK.electric }} />
          <h4 style={{ fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em" }}>
            등기부등본 원본
          </h4>
        </div>
        <button type="button" onClick={() => setExpanded(v => !v)} style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "5px 11px", fontSize: 10, fontWeight: 700,
          background: MCK.paperTint, color: MCK.textSub,
          border: `1px solid ${MCK.border}`, cursor: "pointer",
        }}>
          {expanded ? "▲ 등기부 현황 접기" : "▼ 등기부 현황 펼치기"}
        </button>
      </header>

      {expanded && (
        <>
          {/* 다운로드 버튼 2개 */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            {["토지 등기부등본", "건물 등기부등본"].map(t => (
              <button key={t} type="button" style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "7px 12px", fontSize: 11, fontWeight: 800,
                background: "rgba(34, 81, 255, 0.05)", color: "#1A47CC",
                border: "1px solid rgba(34, 81, 255, 0.30)",
                cursor: "pointer", letterSpacing: "-0.005em",
              }}>
                <FileText size={11} style={{ color: "#1A47CC" }} />
                {t}
              </button>
            ))}
          </div>

          {/* 탭 */}
          <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${MCK.border}`, marginBottom: 8 }}>
            <button type="button" style={{
              padding: "6px 14px", fontSize: 11, fontWeight: 800,
              background: "transparent", color: MCK.ink, cursor: "pointer",
              border: "none", borderBottom: `2px solid ${MCK.electric}`,
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              토지 등기부등본 <span style={{ fontSize: 9, color: MCK.electricDark, fontWeight: 700 }}>7</span>
            </button>
            <button type="button" style={{
              padding: "6px 14px", fontSize: 11, fontWeight: 600,
              background: "transparent", color: MCK.textMuted, cursor: "pointer",
              border: "none",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>
              건물 등기부등본 <span style={{ fontSize: 9, color: MCK.textMuted, fontWeight: 700 }}>4</span>
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 4px 6px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: MCK.ink }}>
              채권액합계 <span style={{ fontFamily: MCK_FONTS.serif, fontWeight: 800, color: MCK.electricDark, fontVariantNumeric: "tabular-nums", marginLeft: 4 }}>8,300,117,337원</span>
            </div>
            <div style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 600 }}>열람 2026.04.05</div>
          </div>

          {/* 테이블 헤더 */}
          <div style={{
            display: "grid", gridTemplateColumns: "70px 90px 130px 1fr 150px",
            gap: 10, padding: "6px 4px", borderBottom: `1px solid ${MCK.border}`,
            fontSize: 9, fontWeight: 800, color: MCK.textSub,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            <span>구분</span>
            <span>접수일</span>
            <span>권리종류</span>
            <span>권리자</span>
            <span style={{ textAlign: "right" }}>채권금액</span>
          </div>

          {[
            { gubun: "1(갑30)", date: "2021.06.18", kind: "소유권이전(매매)", who: "●●●●●이원퍼스트", amt: "—", muted: true },
            { gubun: "2(을21)", date: "2021.06.18", kind: "근저당권설정", who: "●●●●●행", amt: "3,600,000,000원" },
            { gubun: "3(갑31)", date: "2024.10.15", kind: "가압류", who: "●●", amt: "654,000,000원" },
            { gubun: "4(갑32)", date: "2024.10.23", kind: "압류", who: "●●●●", amt: "—", muted: true },
            { gubun: "5(을23)", date: "2024.10.25", kind: "근저당권설정", who: "●●●●", amt: "960,000,000원" },
            { gubun: "6(갑33)", date: "2025.01.08", kind: "압류", who: "●●●●●무서장", amt: "—", muted: true },
            { gubun: "7(갑34)", date: "2025.05.09", kind: "임의경매개시결정", who: "●●●●●행", amt: "청구금액 3,086,117,337원", small: true },
          ].map((r, i, arr) => (
            <div key={r.gubun} style={{
              display: "grid", gridTemplateColumns: "70px 90px 130px 1fr 150px",
              gap: 10, alignItems: "center", padding: "9px 4px",
              borderBottom: i < arr.length - 1 ? `1px solid ${MCK.border}` : "none",
            }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>{r.gubun}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: MCK.textSub, fontVariantNumeric: "tabular-nums" }}>{r.date}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: MCK.ink }}>{r.kind}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: MCK.textSub, fontVariantNumeric: "tabular-nums" }}>{r.who}</span>
              <span style={{
                textAlign: "right",
                fontFamily: MCK_FONTS.serif,
                fontSize: r.small ? 10 : 12,
                fontWeight: 800,
                color: r.muted ? MCK.textMuted : MCK.electricDark,
                fontVariantNumeric: "tabular-nums",
              }}>{r.amt}</span>
            </div>
          ))}
        </>
      )}
    </article>
  )
}

/* ════ FULL · AI 투자 분석 — Sky Blue (첨부 5 스타일 통일) ══════════════════ */
function FullAiInvestmentAnalysisCard() {
  return (
    <article style={{
      backgroundColor: "#A8CDE8",
      border: "1px solid #7FA8C8",
      borderTop: `2px solid ${MCK.electric}`,
      padding: "22px 24px",
      marginBottom: 16,
    }}>
      {/* 헤더 */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electricDark, marginBottom: 4 }}>AI 투자 분석</div>
          <div style={{ fontSize: 11, color: MCK.ink, fontWeight: 600 }}>
            Nplatform NPL Engine · 실시간
          </div>
        </div>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "3px 9px", fontSize: 10, fontWeight: 800,
          background: "rgba(34, 81, 255, 0.10)", color: MCK.electricDark,
          border: `1px solid rgba(34, 81, 255, 0.40)`,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          ● 실시간
        </span>
      </header>

      {/* AI 의견 + 등급 (white inset cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 12, marginBottom: 16 }}>
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(5, 28, 44, 0.10)", borderTop: `2px solid ${MCK.electric}`, padding: 14 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electricDark, marginBottom: 6 }}>AI 투자 의견</div>
          <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 32, fontWeight: 800, color: MCK.electric, lineHeight: 1, letterSpacing: "-0.025em", marginBottom: 4 }}>
            BUY
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(5, 28, 44, 0.65)" }}>
            권고
          </div>
        </div>
        <div style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(5, 28, 44, 0.10)", borderTop: `2px solid ${MCK.electric}`, padding: 14 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electricDark, marginBottom: 6 }}>AI 투자 등급</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
            <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 32, fontWeight: 800, color: MCK.ink, lineHeight: 1, letterSpacing: "-0.025em" }}>
              A
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(5, 28, 44, 0.65)" }}>
              89.4점 · BUY
            </span>
          </div>
          <div style={{ position: "relative", height: 6, background: "rgba(5, 28, 44, 0.08)", marginBottom: 4 }}>
            <div style={{ position: "absolute", left: 0, width: "89.4%", height: "100%", background: MCK.electric }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(5, 28, 44, 0.50)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* AI 권고 매입 (원금 95%) — white inset card */}
      <div style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(5, 28, 44, 0.10)", borderLeft: `3px solid ${MCK.electric}`, padding: 14, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: MCK.electricDark, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            AI 권고 매입 (원금 95%)
          </span>
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "2px 8px", fontSize: 9, fontWeight: 800,
            background: MCK.electric, color: MCK.paper,
            letterSpacing: "0.06em", textTransform: "uppercase",
          }}>
            <span style={{ color: MCK.paper }}>AI 권고</span>
          </span>
        </div>
        <p style={{ fontSize: 11, color: "rgba(5, 28, 44, 0.65)", lineHeight: 1.55, marginBottom: 10 }}>
          대출원금 95% 매입 (-5.0%) · 기준 낙찰가율 83.5%
        </p>
        <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 24, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.025em", lineHeight: 1, marginBottom: 4 }}>
          1,862,000,000원
        </div>
        <div style={{ fontSize: 10, color: "rgba(5, 28, 44, 0.55)", fontWeight: 600 }}>
          매입률 95% · 낙찰가율 83.5%
        </div>
      </div>

      {/* 6 metrics — white inset cards */}
      <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: 8, marginBottom: 14 }}>
        {[
          { l: "예상 낙찰가", v: "2,338,000,000원", s: "" },
          { l: "2질권자 배당", v: "849,258,576원", s: "" },
          { l: "투자 에쿼티", v: "571,368,997원", s: "" },
          { l: "예상 손익", v: "+277,889,579원", s: "", positive: true },
          { l: "ROI / 연환산", v: "48.6% / 66.2%", s: "" },
          { l: "매입·낙찰 성공 확률", v: "50.0%", s: "" },
        ].map(m => (
          <div key={m.l} style={{ padding: 10, backgroundColor: "#FFFFFF", border: "1px solid rgba(5, 28, 44, 0.10)", borderTop: `2px solid ${MCK.electric}` }}>
            <div style={{ fontSize: 9, color: "rgba(5, 28, 44, 0.55)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              {m.l}
            </div>
            <div style={{
              fontFamily: MCK_FONTS.serif,
              fontSize: 14, fontWeight: 800,
              color: m.positive ? MCK.electric : MCK.ink,
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
            }}>
              {m.v}
            </div>
          </div>
        ))}
      </div>

      {/* 성공 확률 progress — on sky blue bg */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: MCK.electricDark, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            매입·낙찰 성공 확률
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(5, 28, 44, 0.65)" }}>
            확률 계산식 ›
          </span>
        </div>
        <div style={{ position: "relative", height: 6, background: "rgba(5, 28, 44, 0.10)", marginBottom: 4 }}>
          <div style={{ position: "absolute", left: 0, width: "50%", height: "100%", background: MCK.electric }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(5, 28, 44, 0.55)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* CTA — AI 컨설턴트(분석) / NPL 분석 보고서 */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid rgba(5, 28, 44, 0.12)" }}>
        <Link href="/analysis" className="mck-cta-dark" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "9px 16px", fontSize: 11, fontWeight: 800,
          background: MCK.electric, color: MCK.paper, border: `1px solid ${MCK.electric}`,
          cursor: "pointer", letterSpacing: "-0.005em",
          textDecoration: "none",
        }}>
          <MessageSquare size={12} style={{ color: MCK.paper }} />
          <span style={{ color: MCK.paper }}>AI 컨설턴트에게 질문</span>
        </Link>
        <Link href="/analysis/report" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "9px 16px", fontSize: 11, fontWeight: 700,
          background: MCK.paper, color: MCK.ink, border: `1px solid ${MCK.ink}`,
          cursor: "pointer", letterSpacing: "-0.005em",
          textDecoration: "none",
        }}>
          <RefreshCw size={12} style={{ color: MCK.ink }} />
          NPL 분석 보고서
        </Link>
      </div>
    </article>
  )
}

/* ════ FULL · 매칭 수요 ═════════════════════════════════════════════════════ */
function FullMatchingDemandCard() {
  return (
    <article style={{
      background: MCK.paper,
      border: `1px solid ${MCK.border}`,
      borderTop: `2px solid ${MCK.electric}`,
      padding: 18,
      marginBottom: 16,
    }}>
      <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.6, marginBottom: 14 }}>
        이 매물과 조건이 일치하는 매수자 수요를 확인하세요. <strong style={{ color: MCK.ink, fontWeight: 800 }}>AI 매칭 엔진</strong>이 담보 유형·지역·가격대를 기반으로 최적 매수자를 추천합니다.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "10px 18px", fontSize: 12, fontWeight: 800,
          background: "#A8CDE8", color: MCK.ink,
          border: "1px solid #7FA8C8", borderTop: `2px solid ${MCK.electric}`,
          cursor: "pointer", letterSpacing: "-0.005em",
        }}>
          <Sparkles size={13} style={{ color: MCK.electric }} />
          <span style={{ color: MCK.ink }}>수요 확인</span>
        </button>
        <button type="button" className="mck-cta-dark" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "10px 18px", fontSize: 12, fontWeight: 800,
          background: MCK.ink, color: MCK.paper,
          border: "none", borderTop: `2px solid ${MCK.electric}`,
          cursor: "pointer", letterSpacing: "-0.005em",
        }}>
          <Target size={13} style={{ color: MCK.paper }} />
          <span style={{ color: MCK.paper }}>AI 매칭</span>
        </button>
      </div>
    </article>
  )
}

/* ════ FULL · 매수자 수수료 안내 (breakdown) ═══════════════════════════════ */
function FullBuyerFeeCard() {
  return (
    <article style={{
      background: MCK.paper,
      border: `1px solid ${MCK.border}`,
      borderTop: `2px solid ${MCK.electric}`,
      padding: 18,
      marginBottom: 16,
    }}>
      {/* 기준 거래가 / 실효 요율 / 예상 수수료 */}
      <div className="grid grid-cols-3" style={{ gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${MCK.border}` }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: MCK.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>기준 거래가</div>
          <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>19.9억</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: MCK.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>실효 요율</div>
          <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, fontWeight: 800, color: MCK.electricDark, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>1.8%</div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: MCK.textMuted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>예상 수수료</div>
          <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 18, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>3,575만</div>
        </div>
      </div>

      {/* 분해 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 6, borderBottom: `1px dashed ${MCK.border}` }}>
          <span style={{ fontSize: 11, color: MCK.textSub, fontWeight: 600 }}>기본 수수료 (1.5%)</span>
          <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>2,979만</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 11, color: MCK.textSub, fontWeight: 600 }}>+ 우선협상권 (PNR, 0.3%)</span>
          <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.electricDark, fontVariantNumeric: "tabular-nums" }}>596만</span>
        </div>
      </div>

      {/* 안내 */}
      {/* 매수자 수수료 안내 footer — McKinsey Sky Blue (첨부 5 스타일) */}
      <div style={{
        padding: "12px 16px",
        backgroundColor: "#A8CDE8",
        border: "1px solid #7FA8C8",
        borderTop: `2px solid ${MCK.electric}`,
        fontSize: 11, color: MCK.ink, lineHeight: 1.55,
      }}>
        💡 수수료는 <strong style={{ color: MCK.ink, fontWeight: 800 }}>거래 성사 시에만 부과</strong>됩니다. 에스크로 계좌로 자동 정산되며, 매도자 수수료는 별도로 처리됩니다.
      </div>
    </article>
  )
}

/* ════ FULL · 제공 자료 5/6 + PII footer ═══════════════════════════════════ */
function FullProvidedDocsCard() {
  const docs = [
    { name: "감정평가서", ok: true },
    { name: "등기부등본", ok: true },
    { name: "권리관계", ok: true },
    { name: "임차현황", ok: true },
    { name: "현장사진", ok: true },
    { name: "재무자료", ok: false, note: "이후공개" },
  ]
  return (
    <article style={{
      background: MCK.paper,
      border: `1px solid ${MCK.border}`,
      borderTop: `2px solid ${MCK.electric}`,
      padding: 18,
      marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: MCK.textMuted, letterSpacing: "0.06em", textTransform: "uppercase" }}>제공 현황</span>
        <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 22, fontWeight: 800, color: MCK.electricDark, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          5<span style={{ color: MCK.textMuted, fontSize: 14 }}>/6</span>
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3" style={{ gap: 8, marginBottom: 12 }}>
        {docs.map(d => (
          <div
            key={d.name}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 10px",
              background: d.ok ? "rgba(34, 81, 255, 0.05)" : MCK.paperTint,
              border: d.ok ? "1px solid rgba(34, 81, 255, 0.25)" : `1px dashed ${MCK.border}`,
              borderLeft: d.ok ? `3px solid ${MCK.electric}` : `3px solid ${MCK.border}`,
            }}
          >
            {d.ok ? (
              <CheckCircle2 size={12} style={{ color: MCK.electric, flexShrink: 0 }} />
            ) : (
              <Lock size={11} style={{ color: MCK.textMuted, flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: d.ok ? MCK.ink : MCK.textMuted, letterSpacing: "-0.005em" }}>{d.name}</div>
              {d.note && <div style={{ fontSize: 9, color: MCK.textMuted, fontWeight: 600 }}>{d.note}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* PII 컴플라이언스 footer */}
      <div style={{
        padding: "10px 12px",
        background: MCK.paperTint,
        borderLeft: `3px solid ${MCK.electric}`,
        fontSize: 10, color: MCK.textSub, lineHeight: 1.55,
        display: "flex", alignItems: "flex-start", gap: 8,
      }}>
        <Shield size={12} style={{ color: MCK.electric, marginTop: 2, flexShrink: 0 }} />
        <span>
          본 매물은 <strong style={{ color: MCK.ink, fontWeight: 800 }}>개인정보보호법 · 신용정보법 · 전자금융거래법</strong>을 준수하며, 모든 열람은 <strong style={{ color: MCK.ink, fontWeight: 800 }}>PII Access Log</strong>에 기록됩니다.
        </span>
      </div>
    </article>
  )
}

/* ════ 다음 단계 그룹 — Active 단계 (현재) → 네이비 / 그 외 → 흰색 ═══════════
   카드 클릭 → 기존 InvestorVerifyModal/NdaModal/LoiModal (신청 흐름 풀 모달) 트리거
═══════════════════════════════════════════════════════════════════════════ */
type NextStepKey = "auth" | "nda" | "loi"

type NextStepConfig = {
  key: NextStepKey
  step: string
  icon: React.ReactNode
  title: string
  desc: string
}

const NEXT_STEPS: NextStepConfig[] = [
  { key: "auth", step: "①", icon: <User size={15} />,           title: "투자자 인증",   desc: "개인/법인 투자자 자격 검증. 인증 후 검증 단계 데이터 열람 가능." },
  { key: "nda",  step: "②", icon: <FileSignature size={15} />, title: "NDA 전자서명",  desc: "비밀유지계약 전자 체결. 감정평가서 · 등기부 원본 등 검증 데이터 열람." },
  { key: "loi",  step: "③", icon: <Award size={15} />,         title: "LOI 제출",      desc: "인수의향서 작성·제출. 매도자 승인 후 가격 오퍼 및 실사 진행." },
]

/** 현재 진행 중인 활성 단계 (시연용 — 실제 UI 에선 백엔드 state 연동)
 *  Section 01 다음 단계 카드 = "auth" 활성 (투자자 인증 → NDA → LOI 흐름의 첫 단계)
 *  Section 02 NDA required 다음 단계 카드 = "nda" 활성 (별도 group 으로 처리)
 */
const ACTIVE_STEP: NextStepKey = "auth"

function NextStepGroup({ activeKey = ACTIVE_STEP }: { activeKey?: NextStepKey } = {}) {
  const [openKey, setOpenKey] = useState<NextStepKey | null>(null)
  const router = useRouter()

  // 기존 access-modals 의 state 시뮬레이션 (시연용 · 신청 가능 = "none")
  const investorState: InvestorVerifyState = {
    status: "none",
    businessLicense: { label: "사업자등록증", submitted: false },
    businessCard: { label: "명함", submitted: false },
  }
  const ndaState: NdaState = { status: "none", sellerName: "○○은행" }
  const loiState: LoiState = { status: "none", sellerName: "○○은행" }

  return (
    <>
      <SubsectionHeader title="다음 단계" sub="투자자 인증 → NDA → LOI" />
      <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 12, marginBottom: 18 }}>
        {NEXT_STEPS.map(cfg => (
          <NextStepCard
            key={cfg.key}
            cfg={cfg}
            active={cfg.key === activeKey}
            onOpen={() => setOpenKey(cfg.key)}
          />
        ))}
      </div>

      {/* 기존 access-modals 3종 wire-up — 풀 신청 흐름 그대로 복원 */}
      <InvestorVerifyModal
        open={openKey === "auth"}
        onClose={() => setOpenKey(null)}
        state={investorState}
        onSubmit={() => {
          setOpenKey(null)
          // 마이페이지 KYC 업로드 화면으로 이동 (사업자등록증 / 명함 업로드)
          router.push("/my/kyc")
        }}
      />
      <NdaModal
        open={openKey === "nda"}
        onClose={() => setOpenKey(null)}
        listingTitle="강남구 아파트 NPL 채권"
        listingId="NPL-2026-0412"
        state={ndaState}
        onSubmit={() => setOpenKey(null)}
      />
      <LoiModal
        open={openKey === "loi"}
        onClose={() => setOpenKey(null)}
        listingTitle="강남구 아파트 NPL 채권"
        listingId="NPL-2026-0412"
        askingPrice={850_000_000}
        state={loiState}
        onSubmit={() => setOpenKey(null)}
      />
    </>
  )
}

/* 카드: active = McKinsey 네이비 / 그 외 = 흰색 */
function NextStepCard({
  cfg, active, onOpen,
}: {
  cfg: NextStepConfig
  active: boolean
  onOpen: () => void
}) {
  const { step, icon, title, desc } = cfg
  // active = 네이비 채워진 카드 / inactive = 흰색 페이퍼 카드
  return (
    <button
      type="button"
      onClick={onOpen}
      className={active ? "mck-cta-dark" : ""}
      style={{
        textAlign: "left",
        background: active ? "#0A1628" : "#FFFFFF",
        border: active ? "1px solid #0A1628" : `1px solid ${MCK.border}`,
        borderTop: `2px solid ${MCK.electric}`,
        padding: 16,
        display: "flex", flexDirection: "column", gap: 10,
        cursor: "pointer",
        boxShadow: active
          ? "0 12px 24px -8px rgba(5, 28, 44, 0.30), 0 4px 8px -2px rgba(5, 28, 44, 0.15)"
          : "0 6px 12px -3px rgba(5, 28, 44, 0.08), 0 2px 4px -1px rgba(5, 28, 44, 0.04)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 30, height: 30,
          background: active ? MCK.electric : MCK.ink,
          color: "#FFFFFF",
          fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800,
        }}>
          <span style={{ color: "#FFFFFF" }}>{step}</span>
        </span>
        <ChevronRight size={16} style={{ color: active ? "#FFFFFF" : MCK.electric }} />
      </header>
      <div className="flex items-center gap-2">
        <span style={{ color: active ? "#FFFFFF" : MCK.electric }}>{icon}</span>
        <h4 style={{ fontFamily: MCK_FONTS.serif, fontSize: 14, fontWeight: 800, color: active ? "#FFFFFF" : MCK.ink, letterSpacing: "-0.01em" }}>
          <span style={{ color: active ? "#FFFFFF" : MCK.ink }}>{title}</span>
        </h4>
      </div>
      <p style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.75)" : MCK.textSub, lineHeight: 1.55 }}>
        <span style={{ color: active ? "rgba(255,255,255,0.75)" : MCK.textSub }}>{desc}</span>
      </p>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "5px 9px", fontSize: 10, fontWeight: 800,
        background: active ? "rgba(34, 81, 255, 0.25)" : "rgba(34, 81, 255, 0.10)",
        color: active ? "#FFFFFF" : "#1A47CC",
        border: active ? "1px solid rgba(34, 81, 255, 0.50)" : "1px solid rgba(34, 81, 255, 0.30)",
        letterSpacing: "0.04em", textTransform: "uppercase",
        alignSelf: "flex-start",
      }}>
        <span style={{ color: active ? "#FFFFFF" : "#1A47CC" }}>
          {active ? "진행 중 · 신청" : "신청"}
        </span>
      </div>
    </button>
  )
}

function PartyCard({ role, name, institution, metric, isBuyer }: { role: string; name: string; institution: string; metric: { label: string; value: string }; isBuyer?: boolean }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: isBuyer ? "rgba(0, 169, 244, 0.06)" : "rgba(34, 81, 255, 0.05)",
        border: `1px solid ${isBuyer ? "rgba(0, 169, 244, 0.20)" : "rgba(34, 81, 255, 0.20)"}`,
        borderLeft: `3px solid ${isBuyer ? MCK.cyan : MCK.electric}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px",
          fontSize: 9, fontWeight: 800,
          color: isBuyer ? "#0075B0" : "#1A47CC",
          background: isBuyer ? "rgba(0, 169, 244, 0.12)" : "rgba(34, 81, 255, 0.10)",
          border: `1px solid ${isBuyer ? "rgba(0, 169, 244, 0.35)" : "rgba(34, 81, 255, 0.30)"}`,
          letterSpacing: "0.06em", textTransform: "uppercase",
        }}>
          <User size={9} style={{ color: isBuyer ? "#0075B0" : "#1A47CC" }} />
          <span style={{ color: isBuyer ? "#0075B0" : "#1A47CC" }}>{role}</span>
        </span>
      </div>
      <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink, marginBottom: 2 }}>{name}</div>
      <div style={{ fontSize: 10, color: MCK.textSub, fontWeight: 600, marginBottom: 8 }}>{institution}</div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingTop: 6, borderTop: `1px dashed ${MCK.border}` }}>
        <span style={{ fontSize: 9, color: MCK.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>{metric.label}</span>
        <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>
          {metric.value}
        </span>
      </div>
    </div>
  )
}

function ValidationCard({ icon, title, rows, note, actions, children }: {
  icon: React.ReactNode; title: string;
  rows?: [string, string][]; note?: string; actions?: string[]; children?: React.ReactNode
}) {
  return (
    <article style={{ background: MCK.paperTint, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`, padding: 16 }}>
      <header style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: MCK.electric }}>{icon}</span>
        <h4 style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink, letterSpacing: "-0.01em", flex: 1 }}>
          {title}
        </h4>
      </header>
      {rows && (
        <dl style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: note || actions ? 10 : 0 }}>
          {rows.map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: 4, borderBottom: `1px dashed ${MCK.border}` }}>
              <dt style={{ fontSize: 10, color: MCK.textSub, fontWeight: 600 }}>{k}</dt>
              <dd style={{ fontFamily: MCK_FONTS.serif, fontSize: 12, fontWeight: 800, color: MCK.ink, fontVariantNumeric: "tabular-nums" }}>{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {children}
      {note && (
        <p style={{ fontSize: 10, color: MCK.textSub, lineHeight: 1.55, marginTop: 8, fontWeight: 500 }}>{note}</p>
      )}
      {actions && actions.length > 0 && (
        <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {actions.map((a, i) => (
            <button
              key={a} type="button"
              className={i === 0 ? "mck-cta-dark" : ""}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "6px 12px", fontSize: 10, fontWeight: 800,
                background: i === 0 ? MCK.ink : MCK.paper,
                color: i === 0 ? MCK.paper : MCK.ink,
                border: i === 0 ? "none" : `1px solid ${MCK.ink}`,
                borderTop: i === 0 ? `2px solid ${MCK.electric}` : `1px solid ${MCK.ink}`,
                cursor: "pointer", letterSpacing: "-0.005em",
              }}
            >
              <span style={{ color: i === 0 ? MCK.paper : MCK.ink }}>{a}</span>
            </button>
          ))}
        </div>
      )}
    </article>
  )
}

function DueDiligenceForm() {
  return (
    <article style={{ background: MCK.paperTint, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`, padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>실사 신청</div>
        <h4 style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink }}>
          현장 실사 일정 신청
        </h4>
      </header>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <FieldGroup label="실사 요청일" required>
          <input type="date" readOnly style={inputStyle} />
        </FieldGroup>
        <FieldGroup label="방문 시간" required>
          <input type="time" readOnly style={inputStyle} />
        </FieldGroup>
        <FieldGroup label="확인 및 의견">
          <textarea placeholder="실사 목적, 동행 인원, 확인 사항…" readOnly rows={2} style={{ ...inputStyle, resize: "none" }} />
        </FieldGroup>
        <button type="button" className="mck-cta-dark" style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "9px 14px", fontSize: 11, fontWeight: 800,
          background: MCK.ink, color: MCK.paper, border: `1px solid ${MCK.ink}`, borderTop: `2px solid ${MCK.electric}`, cursor: "pointer",
        }}>
          <Calendar size={12} style={{ color: MCK.paper }} />
          <span style={{ color: MCK.paper }}>실사 신청하기</span>
        </button>
      </div>
    </article>
  )
}

function PriceOfferForm() {
  return (
    <article style={{ background: MCK.paperTint, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}`, padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>가격 오퍼</div>
        <h4 style={{ fontFamily: MCK_FONTS.serif, fontSize: 13, fontWeight: 800, color: MCK.ink }}>
          매입 희망가 제안
        </h4>
      </header>
      {/* AI 권고 — McKinsey 블루 네이비 (첨부 3 스타일) */}
      <div className="mck-cta-dark" style={{
        padding: "12px 14px",
        backgroundColor: "#0A1628",
        borderTop: `2px solid ${MCK.electric}`,
        marginBottom: 10,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.65)", fontWeight: 700 }}>
            <span style={{ color: "rgba(255,255,255,0.65)" }}>매도 희망가</span>
          </span>
          <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 12, fontWeight: 800, color: MCK.paper, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: MCK.paper }}>19.9억</span>
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 9, color: MCK.cyan, fontWeight: 800 }}>
            <span style={{ color: MCK.cyan }}>AI 권고</span>
          </span>
          <span style={{ fontFamily: MCK_FONTS.serif, fontSize: 12, fontWeight: 800, color: MCK.cyan, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ color: MCK.cyan }}>19.1억</span>
          </span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <FieldGroup label="제안 금액 (원)" required>
          <input type="text" readOnly placeholder="예: 1,910,000,000" style={inputStyle} />
        </FieldGroup>
        <FieldGroup label="유효 기간">
          <input type="date" readOnly style={inputStyle} />
        </FieldGroup>
        <button type="button" className="mck-cta-dark" style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "9px 14px", fontSize: 11, fontWeight: 800,
          background: MCK.ink, color: MCK.paper, border: `1px solid ${MCK.ink}`, borderTop: `2px solid ${MCK.electric}`, cursor: "pointer",
        }}>
          <Send size={12} style={{ color: MCK.paper }} />
          <span style={{ color: MCK.paper }}>오퍼 제출</span>
        </button>
      </div>
    </article>
  )
}

/* ─── Chat 메시지 타입은 _chat-data.ts 에서 공유 ──────────────────────── */
type ChatMessage = SharedChatMessage

function ChatBubble({ msg }: { msg: ChatMessage }) {
  if (msg.type === "system") {
    return (
      <div style={{
        alignSelf: "stretch", textAlign: "center", padding: "8px 12px",
        background: "rgba(34, 81, 255, 0.06)", border: "1px solid rgba(34, 81, 255, 0.20)",
        borderLeft: `2px solid ${MCK.electric}`,
      }}>
        <div style={{ ...MCK_TYPE.eyebrow, color: "#1A47CC", marginBottom: 3 }}>
          {msg.author} · {msg.time}
        </div>
        <div style={{ fontSize: 11, color: MCK.ink, lineHeight: 1.5, fontWeight: 600 }}>
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
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, maxWidth: "88%", alignSelf: align, gap: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2, flexDirection: isBuyer ? "row-reverse" : "row" }}>
        <span style={{ fontSize: 10, fontWeight: 800, color: MCK.ink }}>
          {msg.author}
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", padding: "1px 5px",
          fontSize: 8, fontWeight: 800,
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
          padding: "8px 12px", background: bubbleBg, color: bubbleFg,
          border: `1px solid ${bubbleBorder}`,
          borderTop: isBuyer ? `2px solid ${MCK.electric}` : `1px solid ${bubbleBorder}`,
          fontSize: 11, lineHeight: 1.55, fontWeight: 500,
        }}
      >
        <span style={{ color: bubbleFg }}>{msg.text}</span>
        {msg.attachment && (
          <div style={{
            marginTop: 6, padding: "4px 8px",
            background: isBuyer ? "rgba(0, 169, 244, 0.18)" : MCK.paperDeep,
            border: isBuyer ? "1px solid rgba(0, 169, 244, 0.40)" : `1px solid ${MCK.border}`,
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 10, fontWeight: 700, color: isBuyer ? MCK.paper : MCK.ink,
          }}>
            <FileText size={10} style={{ color: isBuyer ? MCK.cyan : MCK.electric, flexShrink: 0 }} />
            <span style={{ color: isBuyer ? MCK.paper : MCK.ink }}>{msg.attachment}</span>
          </div>
        )}
      </div>
      <span style={{ fontSize: 9, color: MCK.textMuted, fontWeight: 600, fontVariantNumeric: "tabular-nums", marginTop: 1 }}>
        {msg.time}
      </span>
    </div>
  )
}
