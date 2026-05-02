"use client"

/**
 * /notices — 공지사항 (McKinsey 2026-04-29)
 *
 * 구조:
 *   1. 진행 중 (Pinned·Active) — 최우선 노출
 *   2. 카테고리 필터 (운영·기능·정책·보안)
 *   3. 검색 + 페이지네이션
 *   4. 공지 카드 — 제목 / 카테고리 / 일시 / 요약
 */

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  Megaphone, Pin, Search, Filter, Clock, ChevronRight,
  Sparkles, ShieldCheck, Wrench, FileText, AlertCircle,
} from "lucide-react"
import { MckPageShell, MckPageHeader, MckEmptyState } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"
import { createClient } from "@/lib/supabase/client"

interface NoticeRow {
  id: string
  title: string
  content: string
  category?: string
  pinned?: boolean
  created_at: string
}

const CATEGORIES = [
  { key: "all",      label: "전체",       icon: Megaphone, color: "#1B3A5C" },
  { key: "feature",  label: "신규 기능",  icon: Sparkles,  color: "#10B981" },
  { key: "policy",   label: "정책 변경",  icon: FileText,  color: "#F59E0B" },
  { key: "security", label: "보안",       icon: ShieldCheck, color: "#EF4444" },
  { key: "maintenance", label: "운영·점검", icon: Wrench,    color: "#64748B" },
] as const

// 샘플 공지 — DB 비어있을 때 fallback (운영 정합 메시지)
const SAMPLE_NOTICES: NoticeRow[] = [
  {
    id: "n-2026-001",
    title: "v3.3 매물등록 Excel 템플릿 — 수익권 비율 사용자 설정 추가",
    content: "수익권 금액의 110~140% 비율을 매각사가 직접 설정 가능합니다. 또한 수익권금액 자체도 직접 입력 가능합니다 (등기부 채권최고액 우선 시).",
    category: "feature",
    pinned: true,
    created_at: "2026-04-29T10:00:00Z",
  },
  {
    id: "n-2026-002",
    title: "마이페이지 · 관리자 운영센터 v2 — 5-Zone 체계 적용",
    content: "마이페이지 메뉴 12개 → 5개 (대시보드/거래/자산/알림센터/설정), 관리자 24개 → 6 Zone 으로 단순화. 펜딩 작업이 사이드바 배지로 자동 표시됩니다.",
    category: "feature",
    pinned: true,
    created_at: "2026-04-29T08:00:00Z",
  },
  {
    id: "n-2026-003",
    title: "PDF 다운로드 — 한·영·일 언어별 파일명 자동 표기",
    content: "NPL 분석 보고서 PDF 다운로드 시 현재 locale 에 맞는 파일명 적용 (예: NPL_분석보고서_종로_전체.pdf / NPL_Report_Jongno_Full.pdf).",
    category: "feature",
    pinned: false,
    created_at: "2026-04-29T06:00:00Z",
  },
  {
    id: "n-2026-004",
    title: "OCR 자유형식 Excel 인식 — 50+ 별칭 매핑",
    content: "NPLatform 표준 템플릿 외에도 매도사 자체 양식·채권 소개서·감정평가서 등 자유 형식 Excel 자동 인식. 채권자명/매도기관/약정원금/지연이자/근저당/채권최고액 등 50+ 별칭 추가.",
    category: "feature",
    pinned: false,
    created_at: "2026-04-29T04:00:00Z",
  },
  {
    id: "n-2026-005",
    title: "개인정보보호책임자 (DPO) 변경 안내",
    content: "개인정보보호책임자가 박성필 (sp.park@transfarmer.co.kr) 로 변경되었습니다. 개인정보 관련 문의는 신규 이메일로 부탁드립니다.",
    category: "policy",
    pinned: false,
    created_at: "2026-04-29T02:00:00Z",
  },
  {
    id: "n-2026-006",
    title: "딜룸 채팅 — 영어/일본어 자동 번역 지원",
    content: "딜룸 채팅 메시지가 사용자의 locale 에 맞춰 자동 번역됩니다. 한국어 메시지를 영어/일본어 사용자에게는 자동 번역으로 표시 (원문 토글 가능).",
    category: "feature",
    pinned: false,
    created_at: "2026-04-29T01:00:00Z",
  },
  {
    id: "n-2026-007",
    title: "기관 통합 계정 — 멤버 초대 + 권한 관리 정식 출시",
    content: "마스터 / 매니저 / 멤버 / 뷰어 4단계 권한. 같은 회사·팀의 개인 계정을 기관 계정에 연결하고, 멤버 초대·승인·역할 변경을 한 화면에서.",
    category: "feature",
    pinned: false,
    created_at: "2026-04-28T18:00:00Z",
  },
]

function relativeTime(s: string): string {
  const m = Math.floor((Date.now() - new Date(s).getTime()) / 60_000)
  if (m < 1) return "방금"
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return new Date(s).toLocaleDateString("ko-KR")
}

export default function NoticesPage() {
  const [notices, setNotices] = useState<NoticeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCat, setActiveCat] = useState<string>("all")
  const [query, setQuery] = useState<string>("")
  const [isSample, setIsSample] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from("community_posts")
          .select("id, title, content, category, pinned, created_at")
          .eq("type", "NOTICE")
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(60)
        if (cancelled) return
        if (Array.isArray(data) && data.length > 0) {
          setNotices(data as NoticeRow[])
        } else {
          setNotices(SAMPLE_NOTICES)
          setIsSample(true)
        }
      } catch {
        if (!cancelled) {
          setNotices(SAMPLE_NOTICES)
          setIsSample(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    let list = notices
    if (activeCat !== "all") list = list.filter((n) => n.category === activeCat)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    }
    return list
  }, [notices, activeCat, query])

  const pinned = filtered.filter((n) => n.pinned)
  const regular = filtered.filter((n) => !n.pinned)

  return (
    <MckPageShell variant="tint">
      <MckPageHeader
        breadcrumbs={[{ label: "홈", href: "/" }, { label: "공지사항" }]}
        eyebrow="ANNOUNCEMENTS · 공지사항"
        title="플랫폼 공지"
        subtitle="신규 기능 · 정책 변경 · 보안 · 운영 점검 안내를 한곳에서 확인하세요"
      />

      <div className="max-w-[1280px] mx-auto" style={{ padding: "24px 24px 80px" }}>
        {/* 검색 + 카테고리 필터 */}
        <section style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 240 }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: MCK.textMuted }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="공지 검색…"
                style={{
                  width: "100%", padding: "10px 12px 10px 36px",
                  border: `1px solid ${MCK.border}`, borderRadius: 4,
                  fontSize: 13, color: MCK.ink, outline: "none",
                  background: MCK.paper,
                }}
              />
            </div>
            <span style={{ fontSize: 12, color: MCK.textSub }}>
              총 <strong style={{ color: MCK.ink }}>{filtered.length}</strong>건
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
        </section>

        {/* 진행 중 (Pinned) */}
        {pinned.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 10 }}>
              <Pin size={11} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
              상단 고정 공지
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pinned.map((n) => <NoticeCard key={n.id} notice={n} pinned />)}
            </div>
          </section>
        )}

        {/* 일반 공지 */}
        <section>
          {pinned.length > 0 && (
            <div style={{ ...MCK_TYPE.eyebrow, color: MCK.textMuted, marginBottom: 10 }}>
              일반 공지
            </div>
          )}
          {loading ? (
            <p style={{ padding: 40, textAlign: "center", color: MCK.textSub }}>로딩 중…</p>
          ) : regular.length === 0 && pinned.length === 0 ? (
            <MckEmptyState
              icon={Megaphone}
              title="해당 카테고리에 공지가 없습니다"
              description="다른 카테고리를 선택하거나 검색어를 변경해보세요"
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {regular.map((n) => <NoticeCard key={n.id} notice={n} />)}
            </div>
          )}
        </section>

        {isSample && (
          <p style={{ marginTop: 32, padding: 14, background: "#FEF9C3", border: "1px solid #FACC15", borderRadius: 4, fontSize: 12, color: "#854D0E" }}>
            <AlertCircle size={12} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            <strong>샘플 모드</strong> — 운영팀 공지 DB 미연결 상태로 데모 공지를 표시합니다.
          </p>
        )}
      </div>
    </MckPageShell>
  )
}

// ─── 공지 카드 ──────────────────────────────────────────────────
function NoticeCard({ notice, pinned }: { notice: NoticeRow; pinned?: boolean }) {
  const cat = CATEGORIES.find((c) => c.key === notice.category) ?? CATEGORIES[0]
  const Icon = cat.icon
  return (
    <article
      style={{
        background: MCK.paper,
        border: `1px solid ${MCK.border}`,
        borderLeft: pinned ? `4px solid ${MCK.brass}` : `1px solid ${MCK.border}`,
        padding: 18,
        borderRadius: 4,
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                fontSize: 10, fontWeight: 800, padding: "2px 8px",
                background: `${cat.color}15`, color: cat.color,
                borderRadius: 99, letterSpacing: "0.05em",
              }}
            >
              <Icon size={10} />
              {cat.label}
            </span>
            {pinned && (
              <span style={{ fontSize: 10, color: MCK.brass, fontWeight: 700 }}>
                <Pin size={10} style={{ display: "inline", marginRight: 2, verticalAlign: "middle" }} />
                상단 고정
              </span>
            )}
          </div>
          <h3 style={{ fontFamily: MCK_FONTS.serif, fontSize: 16, fontWeight: 700, color: MCK.ink, marginBottom: 6, lineHeight: 1.3 }}>
            {notice.title}
          </h3>
          <p style={{ fontSize: 13, color: MCK.textSub, lineHeight: 1.6, whiteSpace: "pre-line" }}>
            {notice.content}
          </p>
        </div>
        <span style={{ fontSize: 11, color: MCK.textMuted, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
          <Clock size={11} />
          {relativeTime(notice.created_at)}
        </span>
      </div>
    </article>
  )
}
