"use client"

/**
 * /support — 고객센터 (McKinsey 2026-04-29)
 *
 * 구조:
 *   1. Hero — 답을 찾는 가장 빠른 방법 (4 Quick Channels)
 *   2. FAQ Top 5 (자주 묻는 질문)
 *   3. 카테고리별 FAQ (계정·매물·결제·기술·기타)
 *   4. 1:1 문의 (mailto: biz@transfarmer.co.kr 연결)
 *   5. 운영 시간 / SLA
 */

import { useState, useMemo } from "react"
import Link from "next/link"
import {
  MessageCircle, Phone, BookOpen, ChevronDown,
  Search, Sparkles, Building2, CreditCard, Wrench, HelpCircle,
  ArrowRight, Clock, Send, Shield,
} from "lucide-react"
import { MckPageShell, MckPageHeader } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

// ─── FAQ 카탈로그 ────────────────────────────────────────────────
interface FaqItem {
  id: string
  question: string
  answer: string
  category: string
}

const FAQS: FaqItem[] = [
  // 계정
  { id: "f-1",  category: "account",  question: "회원가입 후 사업자·투자자 인증은 어떻게 진행하나요?",
    answer: "마이페이지 → 설정 → 사업자·투자자 인증에서 사업자등록증 또는 명함을 업로드하시면 1~2 영업일 내 운영팀 검토 후 승인됩니다. 본인인증은 별도 진행 없이 KYC 인증만 완료하시면 됩니다." },
  { id: "f-2",  category: "account",  question: "기관 계정과 개인 계정은 어떻게 다른가요?",
    answer: "기관 계정은 마스터/매니저/멤버 권한으로 여러 멤버를 함께 운영할 수 있고, 매물·딜룸이 기관 단위로 묶입니다. 개인 계정은 개인 단독으로 거래합니다. 마이페이지 → 설정 → 기관 계정에서 기관 신청 가능합니다." },
  { id: "f-3",  category: "account",  question: "탈퇴 시 거래 이력은 어떻게 되나요?",
    answer: "전자서명법에 따라 계약·딜룸 이력은 5년간 보관됩니다. 회원 정보는 마스킹 처리되며, 본인 식별 정보는 즉시 파기됩니다." },

  // 매물
  { id: "f-4",  category: "listing",  question: "매물 등록은 몇 가지 방법이 있나요?",
    answer: "3가지 — (1) Excel 템플릿 다운로드·기재·업로드 (2) 채권소개서·감정평가서 PDF 업로드 → OCR 자동 채움 (3) 폼 직접 입력. 평균 등록 시간은 OCR 사용 시 3분, Excel 8분, 직접 입력 12~20분입니다." },
  { id: "f-5",  category: "listing",  question: "매물 등록 후 즉시 거래소에 노출되나요?",
    answer: "아니요 — 항상 PENDING_REVIEW 상태로 시작합니다. 운영팀이 PII 마스킹 검수를 마친 후 ACTIVE 로 전환되며, 평균 검토 시간은 4시간입니다." },
  { id: "f-6",  category: "listing",  question: "매물 가격은 어떻게 정하나요?",
    answer: "매각 기준을 (1) 대출원금 또는 (2) 채권잔액 중 선택하고, 할인율을 입력하면 자동 계산됩니다. 채권잔액 100% 매각 시 할인율 0% 입력하시면 됩니다. 자세한 산정은 v3.3 Excel 템플릿 시트 4 가이드를 참고하세요." },
  { id: "f-7",  category: "listing",  question: "수수료는 얼마인가요?",
    answer: "기본 0.5%~0.9% 자유 설정. 전속 등록 시 0.3% 할인 + 조선일보 땅집고 보도 지원이 함께 제공됩니다." },

  // 결제
  { id: "f-8",  category: "payment",  question: "결제는 어떻게 진행되나요?",
    answer: "딜룸에서 본계약 체결 후 KB ESCROW 보증금을 입금합니다. 채권 양도 후 잔금 정산이 자동으로 진행되며, 세금계산서가 자동 발행됩니다." },
  { id: "f-9",  category: "payment",  question: "환불 정책은?",
    answer: "본계약 체결 전까지는 자유롭게 거래 취소 가능. 본계약 후에는 양 당사자 합의 시에만 ESCROW 환급. 자세한 사항은 본계약서 환불·해지 조항을 참고하세요." },
  { id: "f-10", category: "payment",  question: "크레딧 사용처는?",
    answer: "현재 NPL 분석 보고서 자동 생성, AI 코파일럿 채팅, OCR 자동 채움 (대량 등록) 시 크레딧이 차감됩니다. 크레딧 잔액·구매는 마이페이지 → 설정 → 결제·크레딧에서 확인 가능합니다." },

  // 기술
  { id: "f-11", category: "technical", question: "OCR 정확도는 어느 정도인가요?",
    answer: "NPLatform 표준 Excel 템플릿 사용 시 95%+, 매도사 자체 양식·채권 소개서·감정평가서 등 자유 형식은 평균 80% 인식. 인식 실패 항목은 폼에서 직접 편집·수정 가능합니다." },
  { id: "f-12", category: "technical", question: "PDF 다운로드가 어떻게 작동하나요?",
    answer: "분석 보고서 페이지에서 'PDF 다운로드' 클릭 시 브라우저 인쇄 → PDF 저장. 파일명은 사용자의 현재 언어에 따라 자동 표기 (한국어: NPL_분석보고서_제목_전체.pdf, 영어: NPL_Report_Title_Full.pdf, 일본어: NPL_分析レポート_タイトル_全体.pdf)." },
  { id: "f-13", category: "technical", question: "모바일에서도 사용 가능한가요?",
    answer: "네 — 반응형 + PWA 지원. 모바일에서는 사이드바가 햄버거 메뉴로 자동 전환됩니다. iOS/Android 홈 화면에 추가 가능." },

  // 기타
  { id: "f-14", category: "other",    question: "데이터는 어디에 보관되나요?",
    answer: "Supabase (PostgreSQL · ap-northeast-2 서울 리전) 에 보관됩니다. RLS (Row Level Security) 적용으로 본인 데이터만 조회 가능. 등기부 원본 등 민감 자료는 NDA 체결 후만 공유됩니다." },
  { id: "f-15", category: "other",    question: "API 연동은 가능한가요?",
    answer: "AMC·기관 회원에 한해 ERP API 연동 가능 (별도 협의). 자세한 사항은 1:1 문의로 연락주세요." },
]

const CATEGORIES = [
  { key: "all",       label: "전체",      icon: HelpCircle,   color: "#1B3A5C" },
  { key: "account",   label: "계정·인증", icon: Shield,        color: "#10B981" },
  { key: "listing",   label: "매물 등록", icon: Building2,     color: "#2E75B6" },
  { key: "payment",   label: "결제",      icon: CreditCard,    color: "#F59E0B" },
  { key: "technical", label: "기술",      icon: Wrench,        color: "#8B5CF6" },
  { key: "other",     label: "기타",      icon: Sparkles,      color: "#64748B" },
] as const

// ─── 빠른 연결 채널 ────────────────────────────────────────────────
const QUICK_CHANNELS = [
  {
    icon: BookOpen,
    label: "이용 가이드",
    desc: "역할별 5단계 워크플로우",
    href: "/guide",
    cta: "가이드 보기",
    color: "#10B981",
  },
  {
    icon: MessageCircle,
    label: "1:1 문의",
    desc: "biz@transfarmer.co.kr",
    href: "mailto:biz@transfarmer.co.kr",
    cta: "이메일 보내기",
    color: "#2E75B6",
  },
  {
    icon: Phone,
    label: "전화 문의",
    desc: "02-555-2822 · 평일 09:00-18:00",
    href: "tel:02-555-2822",
    cta: "전화 걸기",
    color: "#F59E0B",
  },
  {
    icon: Sparkles,
    label: "공지사항",
    desc: "신규 기능·정책 변경 안내",
    href: "/notices",
    cta: "공지 보기",
    color: "#1B3A5C",
  },
]

export default function SupportPage() {
  const [activeCat, setActiveCat] = useState<string>("all")
  const [query, setQuery] = useState<string>("")

  const filtered = useMemo(() => {
    let list = FAQS
    if (activeCat !== "all") list = list.filter((f) => f.category === activeCat)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
    }
    return list
  }, [activeCat, query])

  // Top 5 — 가장 자주 묻는 질문 (계정·매물·결제 핵심)
  const top5 = FAQS.slice(0, 5)

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "고객센터" }]}
        eyebrow="SUPPORT · 고객센터"
        title="무엇을 도와드릴까요?"
        subtitle="자주 묻는 질문 · 1:1 문의 · 이용 가이드까지 — 답을 찾는 가장 빠른 길"
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "24px 24px 80px" }}>
        {/* Quick Channels */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 12 }}>
            QUICK ACCESS · 빠른 연결
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {QUICK_CHANNELS.map((ch) => {
              const Icon = ch.icon
              return (
                <Link
                  key={ch.href}
                  href={ch.href}
                  style={{
                    display: "block", background: MCK.paper, border: `1px solid ${MCK.border}`,
                    borderTop: `3px solid ${ch.color}`, padding: 20, borderRadius: 4,
                    textDecoration: "none", transition: "all 0.15s",
                  }}
                  className="hover:shadow-md"
                >
                  <Icon size={22} style={{ color: ch.color, marginBottom: 10 }} />
                  <div style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 700, color: MCK.ink, marginBottom: 4 }}>
                    {ch.label}
                  </div>
                  <div style={{ fontSize: 12, color: MCK.textSub, marginBottom: 10 }}>{ch.desc}</div>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: ch.color }}>
                    {ch.cta} <ArrowRight size={11} />
                  </span>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Top 5 FAQ */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>
            TOP 5 · 가장 많이 묻는 질문
          </div>
          <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 22, fontWeight: 700, color: MCK.ink, marginBottom: 16 }}>
            먼저 확인해보세요
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {top5.map((faq) => (
              <FaqAccordion key={faq.id} faq={faq} defaultOpen={false} />
            ))}
          </div>
        </section>

        {/* 카테고리별 FAQ */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>
            CATEGORY · 카테고리별 도움말
          </div>
          <h2 style={{ fontFamily: MCK_FONTS.serif, fontSize: 22, fontWeight: 700, color: MCK.ink, marginBottom: 16 }}>
            궁금한 영역을 선택하세요
          </h2>

          {/* 검색 + 카테고리 */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MCK.textMuted }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="FAQ 검색…"
                style={{
                  width: "100%", padding: "10px 12px 10px 36px",
                  border: `1px solid ${MCK.border}`, borderRadius: 4,
                  fontSize: 13, color: MCK.ink, outline: "none", background: MCK.paper,
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: MCK.textSub }}>
              총 <strong style={{ color: MCK.ink }}>{filtered.length}</strong>건
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isActive = cat.key === activeCat
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCat(cat.key)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "8px 14px", fontSize: 12, fontWeight: 700,
                    background: isActive ? cat.color : MCK.paper,
                    color: isActive ? "white" : MCK.textSub,
                    border: `1px solid ${isActive ? cat.color : MCK.border}`,
                    borderRadius: 99, cursor: "pointer",
                  }}
                >
                  <Icon size={12} />
                  {cat.label}
                </button>
              )
            })}
          </div>

          {filtered.length === 0 ? (
            <p style={{ padding: 32, textAlign: "center", color: MCK.textSub, fontSize: 13 }}>
              검색 결과가 없습니다. 1:1 문의로 직접 질문해주세요.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((faq) => (
                <FaqAccordion key={faq.id} faq={faq} />
              ))}
            </div>
          )}
        </section>

        {/* 1:1 문의 + 운영시간 */}
        <section
          style={{
            background: MCK.ink, color: MCK.paper, padding: 32, borderRadius: 4,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>
                STILL NEED HELP? · 추가 문의
              </div>
              <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
                답을 못 찾으셨나요?
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85, marginBottom: 16 }}>
                FAQ 에서 해결되지 않으면 1:1 문의로 직접 연락주세요.
                평균 답변 시간 4시간 (영업일 기준).
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a
                  href="mailto:biz@transfarmer.co.kr?subject=NPLatform 문의&body=문의 유형:%0A%0A문의 내용:%0A%0A"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 18px", background: MCK.electric, color: "white",
                    textDecoration: "none", borderRadius: 4, fontSize: 14, fontWeight: 700,
                  }}
                >
                  <Send size={14} /> biz@transfarmer.co.kr
                </a>
                <a
                  href="tel:02-555-2822"
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "12px 18px", background: "transparent", color: MCK.paper,
                    border: `1px solid ${MCK.paper}40`,
                    textDecoration: "none", borderRadius: 4, fontSize: 14, fontWeight: 700,
                  }}
                >
                  <Phone size={14} /> 02-555-2822
                </a>
              </div>
            </div>
            <div>
              <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 8 }}>
                OPERATING HOURS · 운영 시간
              </div>
              <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 20, fontWeight: 700, marginBottom: 14 }}>
                <Clock size={18} style={{ display: "inline", marginRight: 6, verticalAlign: "middle", color: MCK.electric }} />
                평일 09:00 - 18:00
              </h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8, fontSize: 13, lineHeight: 1.6 }}>
                <li style={{ display: "flex", justifyContent: "space-between", paddingBottom: 6, borderBottom: `1px solid ${MCK.paper}20` }}>
                  <span style={{ opacity: 0.8 }}>월~금</span>
                  <span style={{ fontWeight: 700 }}>09:00 - 18:00</span>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between", paddingBottom: 6, borderBottom: `1px solid ${MCK.paper}20` }}>
                  <span style={{ opacity: 0.8 }}>주말·공휴일</span>
                  <span style={{ fontWeight: 700, color: "#94A3B8" }}>휴무</span>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between", paddingBottom: 6, borderBottom: `1px solid ${MCK.paper}20` }}>
                  <span style={{ opacity: 0.8 }}>긴급 보안 이슈</span>
                  <span style={{ fontWeight: 700, color: MCK.electric }}>24/7 응답</span>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.8 }}>평균 답변 시간</span>
                  <span style={{ fontWeight: 700 }}>4시간 이내 (영업일)</span>
                </li>
              </ul>
              <p style={{ fontSize: 11, opacity: 0.6, marginTop: 16, lineHeight: 1.5 }}>
                개인정보 관련 문의: <strong style={{ color: MCK.electric }}>박성필 (sp.park@transfarmer.co.kr)</strong>
              </p>
            </div>
          </div>
        </section>
      </div>
    </MckPageShell>
  )
}

// ─── FAQ 아코디언 ─────────────────────────────────────────────
function FaqAccordion({ faq, defaultOpen }: { faq: FaqItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)
  const cat = CATEGORIES.find((c) => c.key === faq.category) ?? CATEGORIES[0]
  return (
    <div style={{ background: MCK.paper, border: `1px solid ${MCK.border}`, borderRadius: 4, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", padding: "16px 18px", border: 0, background: "transparent",
          textAlign: "left", cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "space-between", gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              fontSize: 10, fontWeight: 800, padding: "2px 7px",
              background: `${cat.color}15`, color: cat.color,
              borderRadius: 99, letterSpacing: "0.05em",
            }}
          >
            {cat.label}
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: MCK.ink }}>
            Q. {faq.question}
          </span>
        </div>
        <ChevronDown
          size={14}
          style={{ color: MCK.textMuted, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }}
        />
      </button>
      {open && (
        <div style={{ padding: "0 18px 16px", borderTop: `1px solid ${MCK.border}`, paddingTop: 14 }}>
          <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.7 }}>
            <strong style={{ color: MCK.ink }}>A. </strong>
            {faq.answer}
          </p>
        </div>
      )}
    </div>
  )
}
