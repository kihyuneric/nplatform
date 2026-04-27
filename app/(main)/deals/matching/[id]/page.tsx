"use client"

/**
 * /deals/matching/[id] — AI 매칭 상세 (McKinsey 화이트 페이퍼 + Deep Navy 임팩트 · 2026-04-27)
 *
 * - 거래소 매수수요 카드와 동일한 톤 정합 (paper + electric top + ink dominant)
 * - 4개 핵심 지표(담보·지역·금액·할인율)를 Deep Navy KPI strip 으로 시각화
 * - 매물 보기 → /exchange/{sellerId} (거래소 딜룸 화면)
 * - 수요 보기 → /exchange/demands/{buyerId} (수요 상세)
 * - 딜룸 시작 → /deals?seller=...&buyer=... (Primary CTA, ink + electric top)
 */

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Sparkles, Target, TrendingUp, ExternalLink, Award,
  CheckCircle2, AlertTriangle, Building2, Eye, Zap, Users, Loader2,
} from "lucide-react"
import { MckPageShell, MckPageHeader, MckKpiGrid } from "@/components/mck"
import { MCK, MCK_FONTS, MCK_TYPE } from "@/lib/mck-design"

// ─── Types ───────────────────────────────────────────────────────────────

interface MatchFactor {
  name: string
  score: number
  weight: number
  maxScore: number
}

interface MatchPair {
  id: string
  sellerId: string
  buyerId: string
  sellerName: string
  buyerName: string
  totalScore: number
  grade: "EXCELLENT" | "GOOD" | "FAIR"
  factors: MatchFactor[]
  recommendedAction: string
}

const GRADE_LABEL: Record<MatchPair["grade"], string> = {
  EXCELLENT: "EXCELLENT",
  GOOD:      "GOOD",
  FAIR:      "FAIR",
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** 매각사 마스킹 — 거래소 PII 정책 (NDA 전 매각사 정보 보호) */
function maskSellerName(name: string): string {
  if (!name) return "○○○○○"
  const SUFFIXES = ["저축은행", "투자조합", "캐피탈", "은행", "지점", "공사", "조합", "F&I", "AMC"]
  for (const suf of SUFFIXES) {
    if (name.endsWith(suf)) {
      const prefixLen = Math.max(2, name.length - suf.length)
      return "○".repeat(prefixLen) + suf
    }
  }
  return "○".repeat(Math.min(Math.max(name.length, 4), 6))
}

/** 권고 액션 → 짧은 KPI 라벨 */
function shortAction(grade: MatchPair["grade"]): string {
  if (grade === "EXCELLENT") return "딜룸 즉시 개설"
  if (grade === "GOOD") return "조건 협의 후"
  return "추가 조정 필요"
}

// ─── Sample fallback ──────────────────────────────────────────────────────

function buildSampleMatch(id: string): MatchPair {
  // 가중치 합계 1.00 (담보 40 / 지역 25 / 금액 20 / 할인율 15)
  // score: 0~100 일치도 (자동 계산), weight: 0~1 가중치
  // totalScore = Σ (score × weight) = 100*0.40 + 88*0.25 + 80*0.20 + 73*0.15 = 40 + 22 + 16 + 10.95 ≈ 89
  return {
    id,
    sellerId: "seller-sample-01",
    buyerId: "buyer-sample-01",
    sellerName: "우리은행 강남지점",
    buyerName: "NPL 투자조합 #3",
    totalScore: 89,
    grade: "EXCELLENT",
    factors: [
      { name: "담보유형", score: 100, weight: 0.40, maxScore: 100 },
      { name: "지역",     score: 88,  weight: 0.25, maxScore: 100 },
      { name: "금액대",   score: 80,  weight: 0.20, maxScore: 100 },
      { name: "할인율",   score: 73,  weight: 0.15, maxScore: 100 },
    ],
    recommendedAction: "담보·지역 모두 일치하며 금액·할인율 조건도 양호합니다. 즉시 딜룸을 생성하여 NDA 단계로 진입할 것을 권장합니다.",
  }
}

// ─── Page Component ───────────────────────────────────────────────────────

export default function MatchingDetailPage() {
  const params = useParams()
  const matchId = String((params as { id?: string })?.id ?? "")
  const [match, setMatch] = useState<MatchPair | null>(null)
  const [loading, setLoading] = useState(true)
  const [usingSample, setUsingSample] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`/api/v1/matching/results?id=${encodeURIComponent(matchId)}`)
        if (res.ok) {
          const json = await res.json()
          const raw = json?.data ?? json?.result ?? null
          const found: MatchPair | null = Array.isArray(raw)
            ? (raw.find((m: MatchPair) => m.id === matchId) ?? raw[0] ?? null)
            : (raw as MatchPair | null)
          if (found && !cancelled) {
            const normalized: MatchPair = {
              ...found,
              factors: (found.factors ?? []).map(f => ({
                ...f,
                maxScore: f.maxScore ?? Math.round((f.weight ?? 0.25) * 100),
              })),
            }
            setMatch(normalized)
            return
          }
        }
        throw new Error("no match data")
      } catch {
        if (!cancelled) {
          setMatch(buildSampleMatch(matchId))
          setUsingSample(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (matchId) load()
    else setLoading(false)
    return () => { cancelled = true }
  }, [matchId])

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <MckPageShell variant="tint">
        <div className="max-w-[1280px] mx-auto" style={{ padding: "32px 24px" }}>
          <div
            style={{
              height: 160,
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ height: 120, background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}` }} />
            <div style={{ height: 120, background: MCK.paper, border: `1px solid ${MCK.border}`, borderTop: `2px solid ${MCK.electric}` }} />
          </div>
        </div>
      </MckPageShell>
    )
  }

  // ── Not Found ────────────────────────────────────────────────────────────
  if (!match) {
    return (
      <MckPageShell variant="tint">
        <div className="max-w-[1280px] mx-auto" style={{ padding: "64px 24px" }}>
          <div
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              padding: "48px 24px",
              textAlign: "center",
            }}
          >
            <AlertTriangle size={32} style={{ color: MCK.textMuted, margin: "0 auto 12px" }} />
            <h2
              style={{
                fontFamily: MCK_FONTS.serif,
                fontSize: 18,
                fontWeight: 800,
                color: MCK.ink,
                marginBottom: 8,
                letterSpacing: "-0.015em",
              }}
            >
              매칭 정보를 찾을 수 없습니다
            </h2>
            <p style={{ fontSize: 13, color: MCK.textSub, marginBottom: 20 }}>
              요청하신 매칭 ID가 존재하지 않거나 만료되었을 수 있습니다.
            </p>
            <Link
              href="/deals/matching"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 18px",
                background: MCK.ink,
                color: MCK.paper,
                borderTop: `2px solid ${MCK.electric}`,
                fontSize: 12,
                fontWeight: 800,
                textDecoration: "none",
                letterSpacing: "-0.01em",
              }}
            >
              <ArrowLeft size={14} /> 매칭 목록으로
            </Link>
          </div>
        </div>
      </MckPageShell>
    )
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const isExcellent = match.grade === "EXCELLENT"
  const maskedSeller = maskSellerName(match.sellerName)

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <MckPageShell variant="tint">
      {/* Sample-data warning */}
      {usingSample && (
        <div
          style={{
            background: MCK.paper,
            borderBottom: `1px solid ${MCK.border}`,
            padding: "12px 24px",
          }}
        >
          <div className="max-w-[1280px] mx-auto flex items-start" style={{ gap: 10 }}>
            <AlertTriangle size={14} style={{ color: MCK.electric, flexShrink: 0, marginTop: 2 }} />
            <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.5 }}>
              실시간 매칭 데이터를 불러오지 못해 샘플 데이터를 표시합니다. 실제 매칭 결과는{" "}
              <Link href="/deals/matching" style={{ color: MCK.electricDark, fontWeight: 700, textDecoration: "underline" }}>
                /deals/matching
              </Link>{" "}
              에서 AI 매칭 실행 후 확인할 수 있습니다.
            </p>
          </div>
        </div>
      )}

      <MckPageHeader
        breadcrumbs={[
          { label: "딜룸", href: "/deals" },
          { label: "AI 매칭", href: "/deals/matching" },
          { label: `매칭 #${match.id.slice(-6).toUpperCase()}` },
        ]}
        eyebrow={`MATCHING DETAIL · ${GRADE_LABEL[match.grade]}`}
        title="AI 매칭 상세 분석"
        subtitle={`${maskedSeller} → ${match.buyerName} · 4개 핵심 지표(담보·지역·금액·할인율) 가중 평균 ${match.totalScore}점. 매각사 정보는 NDA 체결 후 공개됩니다.`}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link
              href={`/deals?seller=${match.sellerId}&buyer=${match.buyerId}`}
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "-0.01em",
                background: MCK.ink,
                color: MCK.paper,
                border: "none",
                borderTop: `2px solid ${MCK.electric}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              딜룸 시작 <ExternalLink size={14} />
            </Link>
            <Link
              href="/deals/matching"
              style={{
                padding: "9px 16px",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "-0.01em",
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.ink}`,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={14} /> 목록
            </Link>
          </div>
        }
      />

      {/* ── KPI strip · DARK · 거래소와 동일 패턴 ────────────────────────── */}
      <section style={{ background: MCK.paper, paddingBottom: 32 }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 24px" }}>
          <MckKpiGrid
            variant="dark"
            items={[
              { label: "종합 점수", value: `${match.totalScore}`, hint: "/ 100점 · 가중 평균" },
              { label: "등급", value: GRADE_LABEL[match.grade], hint: isExcellent ? "즉시 진행 가능" : "검토 후 진행" },
              { label: "권고 액션", value: shortAction(match.grade), hint: "AI 분석 결과" },
            ]}
          />
        </div>
      </section>

      <div className="max-w-[1280px] mx-auto" style={{ padding: "8px 24px 64px" }}>

        {/* ── Seller / Buyer 2-col 카드 ─────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16, marginBottom: 24 }}>
          {/* 매도자 카드 */}
          <article
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px",
                  fontSize: 10, fontWeight: 800,
                  background: "rgba(34, 81, 255, 0.10)",
                  color: "#1A47CC",
                  border: "1px solid rgba(34, 81, 255, 0.35)",
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}
              >
                <Target size={10} /> 매도자
              </span>
              <span style={{ marginLeft: "auto", ...MCK_TYPE.label, color: MCK.textMuted }}>
                ID: ○○○○○○○○
              </span>
            </div>
            <div>
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>
                SELLER · 매물 보유 · 정보 보호
              </p>
              <h3
                style={{
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 18,
                  fontWeight: 800,
                  color: MCK.ink,
                  letterSpacing: "-0.015em",
                  marginBottom: 6,
                  lineHeight: 1.3,
                }}
                title="매각사 정보 보호 — NDA 체결 후 공개"
              >
                {maskedSeller}
              </h3>
              <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.55 }}>
                매각사 정보는 NDA 체결 후 공개됩니다. 딜룸 화면에서 매물 정보·채권 자료·진행 상태를 확인할 수 있습니다.
              </p>
            </div>
            <div style={{ flex: 1 }} />
            <Link
              href={`/exchange/${match.sellerId}`}
              style={{
                display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                padding: "10px 14px",
                fontSize: 12, fontWeight: 800,
                background: "#A8CDE8",
                color: MCK.ink,
                borderTop: `2px solid ${MCK.electric}`,
                border: "1px solid #7FA8C8",
                letterSpacing: "-0.01em",
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(34, 81, 255, 0.10)",
              }}
            >
              <Building2 size={13} style={{ color: MCK.ink }} /> 딜룸 열기 (매물 상세)
            </Link>
          </article>

          {/* 매수자 카드 */}
          <article
            style={{
              background: MCK.paper,
              border: `1px solid ${MCK.border}`,
              borderTop: `2px solid ${MCK.electric}`,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px",
                  fontSize: 10, fontWeight: 800,
                  background: MCK.ink,
                  color: MCK.paper,
                  border: `1px solid ${MCK.ink}`,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                }}
              >
                <TrendingUp size={10} /> 매수자
              </span>
              <span style={{ marginLeft: "auto", ...MCK_TYPE.label, color: MCK.textMuted }}>
                ID: {match.buyerId.slice(-8).toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 6 }}>
                BUYER · 매수 수요
              </p>
              <h3
                style={{
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 18,
                  fontWeight: 800,
                  color: MCK.ink,
                  letterSpacing: "-0.015em",
                  marginBottom: 6,
                  lineHeight: 1.3,
                }}
              >
                {match.buyerName}
              </h3>
              <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.55 }}>
                투자 조건 · 희망 지역 · 담보 유형 · 회수 기간 등 수요 명세를 확인합니다.
              </p>
            </div>
            <div style={{ flex: 1 }} />
            <Link
              href={`/exchange/demands/${match.buyerId}`}
              style={{
                display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
                padding: "10px 14px",
                fontSize: 12, fontWeight: 800,
                background: MCK.paper,
                color: MCK.ink,
                border: `1px solid ${MCK.ink}`,
                letterSpacing: "-0.01em",
                textDecoration: "none",
              }}
            >
              <Eye size={13} /> 수요 상세 보기
            </Link>
          </article>
        </div>

        {/* ── Factors Analysis (5개 핵심 지표 · 자동 계산 + 가중치 기여도) ─ */}
        <article
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderTop: `2px solid ${MCK.electric}`,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.electric, marginBottom: 4 }}>
                MATCHING FACTORS · 알고리즘 자동 계산
              </p>
              <h2
                style={{
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 18,
                  fontWeight: 800,
                  color: MCK.ink,
                  letterSpacing: "-0.015em",
                }}
              >
                매칭 요인 분석
              </h2>
              <p style={{ fontSize: 11, color: MCK.textMuted, marginTop: 4, lineHeight: 1.5 }}>
                일치도(0~100점) × 가중치 = 기여 점수. 합계가 종합 점수입니다.
              </p>
            </div>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "4px 10px",
                fontSize: 10, fontWeight: 800,
                color: MCK.ink,
                background: MCK.paperTint,
                border: `1px solid ${MCK.border}`,
                letterSpacing: "0.04em", textTransform: "uppercase",
              }}
            >
              <Award size={10} /> {match.factors.length}개 지표
            </span>
          </header>

          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 90px 100px",
              gap: 12,
              padding: "8px 12px",
              background: MCK.paperTint,
              border: `1px solid ${MCK.border}`,
              fontSize: 10,
              fontWeight: 800,
              color: MCK.textSub,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            <span>인자</span>
            <span>일치도 (0~100점)</span>
            <span style={{ textAlign: "right" }}>가중치</span>
            <span style={{ textAlign: "right" }}>기여 점수</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {match.factors.map((f, idx) => {
              // f.score: 0~100 일치도 (자동 계산), f.weight: 가중치 (0~1 또는 0~100)
              const scorePct = Math.min(100, Math.max(0, f.score))
              // weight 정규화: 0~1 범위면 *100, 이미 0~100이면 그대로
              const weightPct = f.weight <= 1
                ? Math.round(f.weight * 1000) / 10
                : Math.round(f.weight * 10) / 10
              const contribution = Math.round((scorePct * weightPct) / 10) / 10
              const isLast = idx === match.factors.length - 1
              return (
                <div
                  key={f.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1fr 90px 100px",
                    gap: 12,
                    alignItems: "center",
                    padding: "12px",
                    borderBottom: isLast ? `1px solid ${MCK.border}` : `1px solid ${MCK.border}`,
                    borderLeft: `1px solid ${MCK.border}`,
                    borderRight: `1px solid ${MCK.border}`,
                    background: MCK.paper,
                  }}
                >
                  {/* 인자명 */}
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: MCK.ink, letterSpacing: "-0.005em" }}>
                      {f.name}
                    </span>
                  </div>

                  {/* 일치도 — 0~100 progress bar */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 700 }}>
                        {scorePct >= 90 ? "매우 높음" : scorePct >= 70 ? "높음" : scorePct >= 50 ? "보통" : "낮음"}
                      </span>
                      <span
                        style={{
                          fontFamily: MCK_FONTS.serif,
                          fontSize: 13, fontWeight: 800,
                          color: MCK.electricDark,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {scorePct}<span style={{ fontSize: 9, color: MCK.textMuted, fontWeight: 600 }}>/100</span>
                      </span>
                    </div>
                    <div style={{ height: 4, background: MCK.paperDeep, overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${scorePct}%`,
                          background: MCK.electric,
                          transition: "width 0.7s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* 가중치 (% — 양수 정수 또는 소수 1자리) */}
                  <span
                    style={{
                      textAlign: "right",
                      fontFamily: MCK_FONTS.serif,
                      fontSize: 13, fontWeight: 700,
                      color: MCK.textSub,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {weightPct}<span style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 600, marginLeft: 1 }}>%</span>
                  </span>

                  {/* 기여 점수 (= score × weight) */}
                  <span
                    style={{
                      textAlign: "right",
                      fontFamily: MCK_FONTS.serif,
                      fontSize: 14, fontWeight: 800,
                      color: MCK.ink,
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {contribution}<span style={{ fontSize: 10, color: MCK.textMuted, fontWeight: 600, marginLeft: 1 }}>점</span>
                  </span>
                </div>
              )
            })}

            {/* 합계 row — Deep Navy 임팩트 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 90px 100px",
                gap: 12,
                alignItems: "center",
                padding: "14px 12px",
                background: MCK.inkDeep,
                borderTop: `2px solid ${MCK.electric}`,
                borderLeft: `1px solid ${MCK.ink}`,
                borderRight: `1px solid ${MCK.ink}`,
                borderBottom: `1px solid ${MCK.ink}`,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 800, color: MCK.paper, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                합계 (종합 점수)
              </span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>
                = Σ (일치도 × 가중치)
              </span>
              <span
                style={{
                  textAlign: "right",
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 13, fontWeight: 700,
                  color: "rgba(255,255,255,0.65)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                100%
              </span>
              <span
                style={{
                  textAlign: "right",
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 18, fontWeight: 800,
                  color: MCK.cyan,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.015em",
                }}
              >
                {match.totalScore}<span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 600, marginLeft: 1 }}>/100</span>
              </span>
            </div>
          </div>
        </article>

        {/* ── Recommended Action (Deep Navy 임팩트 패널) ───────────────── */}
        <article
          style={{
            background: MCK.inkDeep,
            borderTop: `3px solid ${MCK.electric}`,
            padding: "24px 28px",
            marginBottom: 32,
          }}
        >
          <div className="flex items-start" style={{ gap: 14 }}>
            <div
              style={{
                width: 42, height: 42,
                background: "rgba(34, 81, 255, 0.18)",
                border: "1px solid rgba(34, 81, 255, 0.35)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Sparkles size={20} style={{ color: MCK.cyan }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ ...MCK_TYPE.eyebrow, color: MCK.cyan, marginBottom: 6 }}>
                AI RECOMMENDATION · 권고 액션
              </p>
              <p
                style={{
                  fontFamily: MCK_FONTS.serif,
                  fontSize: 16, fontWeight: 700,
                  color: MCK.paper,
                  lineHeight: 1.55,
                  letterSpacing: "-0.01em",
                }}
              >
                {match.recommendedAction}
              </p>
            </div>
          </div>
        </article>

        {/* ── Methodology Note ─────────────────────────────────────────── */}
        <div
          style={{
            background: MCK.paper,
            border: `1px solid ${MCK.border}`,
            borderLeft: `3px solid ${MCK.electric}`,
            padding: "16px 20px",
            marginBottom: 24,
          }}
        >
          <p style={{ ...MCK_TYPE.label, color: MCK.electricDark, marginBottom: 6 }}>
            METHODOLOGY
          </p>
          <p style={{ fontSize: 12, color: MCK.textSub, lineHeight: 1.6 }}>
            4개 핵심 지표(담보 40% · 지역 25% · 금액 20% · 할인율 15% · 합계 100%)의 가중 평균으로 종합 점수를 산출하여
            EXCELLENT(≥80) · GOOD(60-79) · FAIR(&lt;60) 로 등급화합니다.
            각 지표의 일치도(0~100점)는 매칭 엔진이 자동 계산하며,
            실제 거래 조건은 당사자 간 협의에 따르고 본 분석 결과는 참고용 가이드입니다.
          </p>
        </div>

        {/* ── Footer CTA Bar ───────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 12,
          }}
        >
          <Link
            href={`/exchange/${match.sellerId}`}
            style={{
              display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
              padding: "12px 16px",
              fontSize: 12, fontWeight: 800,
              background: MCK.paper,
              color: MCK.ink,
              border: `1px solid ${MCK.ink}`,
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            <Building2 size={13} /> 매물 (딜룸)
          </Link>
          <Link
            href={`/exchange/demands/${match.buyerId}`}
            style={{
              display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
              padding: "12px 16px",
              fontSize: 12, fontWeight: 800,
              background: MCK.paper,
              color: MCK.ink,
              border: `1px solid ${MCK.ink}`,
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            <Eye size={13} /> 수요 보기
          </Link>
          <Link
            href={`/deals?seller=${match.sellerId}&buyer=${match.buyerId}`}
            style={{
              display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6,
              padding: "12px 16px",
              fontSize: 12, fontWeight: 800,
              background: MCK.ink,
              color: MCK.paper,
              borderTop: `2px solid ${MCK.electric}`,
              border: `1px solid ${MCK.ink}`,
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            <Zap size={13} style={{ color: MCK.paper }} /> 딜룸 시작
          </Link>
        </div>
      </div>
    </MckPageShell>
  )
}
