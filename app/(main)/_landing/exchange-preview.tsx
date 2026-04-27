"use client"

/**
 * Exchange Preview · 실제 /exchange ListingCard 디자인 그대로 (랜딩 미리보기)
 *
 * 거래소 매물 탐색 페이지의 ListingCard 와 동일 구조:
 *   1. Header strip — 기관 마스킹 + 분류 + D-day + 조회수 + Tier
 *   2. Body — 위치/카테고리 라벨, Title, ID, AI 등급
 *   3. HERO 매각희망가 (28px ink + tabular-nums)
 *   4. Sub metrics 3-col (채권잔액 / 감정가 / 할인율) + electric top strip
 *   5. 예상 절감액 dashed divider
 *   6. 자료 완성도 + 입찰자 chip
 *   7. CTA — McKinsey soft sky blue (#A8CDE8) + ink text
 *
 * 디자인 시그니처
 *   · 흰 종이 (`mck-paper`) + 1px hairline
 *   · 2px Electric Blue top accent
 *   · 3px Electric strip on sub metrics
 *   · AI 등급 옅은 electric tint badge
 *   · 매각희망가 1점 강조 (typography hierarchy)
 */

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Building2, MapPin, Eye } from "lucide-react"
import { maskInstitutionName } from "@/lib/mask"

type Sample = {
  id: string
  institution: string
  location: string
  category: string
  title: string
  saleMethod: string
  principal: string
  asking: string
  appraisal: string
  discount: string
  savings: string
  grade: "A" | "B" | "C"
  dday: number
  bidders: number
  completeness: string
  views: number
  tier: "L0" | "L1" | "L2"
}

const SAMPLES: Sample[] = [
  {
    id: "NPL-2026-0412",
    institution: "우리은행",
    location: "서울 강남구",
    category: "아파트",
    title: "임의매각 · 강남 아파트 담보",
    saleMethod: "임의매각",
    principal: "12.0억",
    asking: "8.5억",
    appraisal: "10.2억",
    discount: "29.2%",
    savings: "3.5억",
    grade: "A",
    dday: 5,
    bidders: 12,
    completeness: "9/10",
    views: 412,
    tier: "L0",
  },
  {
    id: "NPL-2026-0409",
    institution: "KB저축은행",
    location: "경기 성남 분당",
    category: "오피스텔",
    title: "법정관리 · 분당 오피스텔",
    saleMethod: "법정관리",
    principal: "3.8억",
    asking: "2.4억",
    appraisal: "3.2억",
    discount: "36.8%",
    savings: "1.4억",
    grade: "B",
    dday: 8,
    bidders: 7,
    completeness: "8/10",
    views: 238,
    tier: "L0",
  },
  {
    id: "NPL-2026-0407",
    institution: "하나캐피탈",
    location: "부산 해운대",
    category: "상가",
    title: "임의매각 · 해운대 상가",
    saleMethod: "임의매각",
    principal: "6.5억",
    asking: "4.1억",
    appraisal: "5.3억",
    discount: "36.9%",
    savings: "2.4억",
    grade: "A",
    dday: 11,
    bidders: 5,
    completeness: "10/10",
    views: 521,
    tier: "L1",
  },
  {
    id: "NPL-2026-0404",
    institution: "신한저축은행",
    location: "인천 송도",
    category: "아파트",
    title: "공매 · 송도 아파트 Pool",
    saleMethod: "공매",
    principal: "24.0억",
    asking: "15.8억",
    appraisal: "19.6억",
    discount: "34.2%",
    savings: "8.2억",
    grade: "B",
    dday: 14,
    bidders: 18,
    completeness: "9/10",
    views: 893,
    tier: "L0",
  },
]

export function ExchangePreview() {
  return (
    <section
      style={{
        backgroundColor: "#FAFBFC",
        padding: "5rem 0 4rem",
        position: "relative",
      }}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Eyebrow + Title (McKinsey editorial) */}
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
              Exchange · 거래소 미리보기
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
            실제 NPL 매물은 이렇게 보입니다
          </h2>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "rgba(5, 28, 44, 0.65)",
              maxWidth: 560,
              margin: "0 auto",
            }}
          >
            채권잔액 · 매각희망가 · 감정가 · 할인율 · 자료 완성도 — 투자 판단에 필요한 모든 지표를 한 화면에.
          </p>
        </div>

        {/* 카드 grid — 4-col with hairline separators */}
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {SAMPLES.map((s, idx) => (
            <ListingCardPreview key={s.id} sample={s} index={idx} />
          ))}
        </div>

        {/* Bottom CTA bar */}
        <div className="mt-12 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/exchange"
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
            <span style={{ color: "#FFFFFF" }}>거래소로 이동</span>
            <ArrowRight size={14} style={{ color: "#FFFFFF" }} />
          </Link>
          <Link
            href="/exchange/auction"
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
            <span style={{ color: "#0A1628" }}>경쟁 입찰 보기</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─── 실제 /exchange ListingCard 와 동일 구조 ─────────────────────────── */
function ListingCardPreview({ sample, index }: { sample: Sample; index: number }) {
  return (
    <Link
      href="/exchange"
      style={{ textDecoration: "none", display: "block" }}
    >
      <motion.article
        className="mck-paper group"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ delay: Math.min(index * 0.05, 0.2), duration: 0.4 }}
        style={{
          backgroundColor: "#FFFFFF",
          border: "1px solid rgba(5, 28, 44, 0.10)",
          borderTop: "2px solid #2251FF",
          borderRadius: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          boxShadow: "0 12px 24px -8px rgba(5, 28, 44, 0.10), 0 4px 8px -2px rgba(5, 28, 44, 0.06)",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        whileHover={{ y: -3, boxShadow: "0 20px 32px -8px rgba(5, 28, 44, 0.18), 0 6px 12px -2px rgba(5, 28, 44, 0.10)" }}
      >
        {/* ── Header strip — institution + D-day + 조회수 ── */}
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#FFFFFF",
            borderBottom: "1px solid rgba(5, 28, 44, 0.10)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 0,
                backgroundColor: "#F5F5F5",
                border: "1px solid rgba(5, 28, 44, 0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Building2 size={13} color="rgba(5, 28, 44, 0.55)" />
            </div>
            <div>
              <div
                style={{ fontSize: 11, fontWeight: 700, color: "#0A1628", lineHeight: 1.2, letterSpacing: "-0.005em" }}
                title="NDA 체결 후 실명 공개"
              >
                {maskInstitutionName(sample.institution)}
              </div>
              <div style={{ fontSize: 9, color: "rgba(5, 28, 44, 0.50)", marginTop: 2, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.10em" }}>
                금융기관 · D-{sample.dday}
              </div>
            </div>
          </div>
          <span
            style={{
              display: "inline-flex", alignItems: "center", gap: 3,
              fontSize: 10, color: "rgba(5, 28, 44, 0.55)", fontVariantNumeric: "tabular-nums", fontWeight: 600,
            }}
            title="누적 조회수"
          >
            <Eye size={11} /> {sample.views.toLocaleString()}
          </span>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "18px 16px 14px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          {/* Title row + AI grade */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 10, color: "rgba(5, 28, 44, 0.55)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.10em" }}>
                <MapPin size={10} /> {sample.location} · {sample.category}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0A1628", letterSpacing: "-0.012em", lineHeight: 1.25 }}>
                {sample.title}
              </div>
              <div style={{ fontSize: 9, color: "rgba(5, 28, 44, 0.40)", marginTop: 4, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {sample.id}
              </div>
            </div>
            {/* AI 등급 = 옅은 electric tint + electricDark text */}
            <div
              style={{
                padding: "4px 9px", borderRadius: 0,
                backgroundColor: "rgba(34, 81, 255, 0.10)",
                color: "#1A47CC",
                fontSize: 10, fontWeight: 800,
                border: "1px solid rgba(34, 81, 255, 0.35)",
                whiteSpace: "nowrap",
                letterSpacing: "0.06em",
              }}
            >
              <span style={{ color: "#1A47CC" }}>AI · {sample.grade}</span>
            </div>
          </div>

          {/* HERO 매각희망가 */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(5, 28, 44, 0.55)", textTransform: "uppercase", letterSpacing: "0.16em", marginBottom: 4 }}>
              매각희망가
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0A1628", letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums", fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {sample.asking}
            </div>
          </div>

          {/* Sub metrics 3-col with electric top strip */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              borderTop: "3px solid #2251FF",
              padding: "14px 0 12px",
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <SubMetric label="채권잔액" value={sample.principal} />
              <SubMetric label="감정가" value={sample.appraisal} />
              <SubMetric label="할인율" value={sample.discount} brass />
            </div>
            {/* 예상 절감액 dashed divider */}
            <div
              style={{
                marginTop: 10, paddingTop: 10,
                borderTop: "1px dashed rgba(5, 28, 44, 0.14)",
                display: "flex", justifyContent: "space-between",
                fontSize: 10,
              }}
            >
              <span style={{ color: "rgba(5, 28, 44, 0.65)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.10em" }}>예상 절감액</span>
              <span style={{ color: "#0A1628", fontWeight: 800, fontVariantNumeric: "tabular-nums", fontFamily: 'Georgia, "Times New Roman", serif' }}>{sample.savings}</span>
            </div>
          </div>

          {/* Completeness + bidder count */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingTop: 4 }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "3px 8px",
                fontSize: 10, fontWeight: 800,
                color: "#0A1628",
                background: "#F5F5F5",
                border: "1px solid rgba(5, 28, 44, 0.20)",
                letterSpacing: "0.04em",
              }}
            >
              자료 {sample.completeness}
            </span>
            <span
              style={{
                fontSize: 10, color: "rgba(5, 28, 44, 0.55)",
                fontVariantNumeric: "tabular-nums",
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              입찰 {sample.bidders}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* CTA — McKinsey soft sky blue + ink text (실제 거래소 카드와 동일) */}
          <div
            style={{
              marginTop: 4,
              padding: "11px 14px",
              borderRadius: 4,
              fontSize: 12, fontWeight: 800,
              textAlign: "center",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6,
              letterSpacing: "0.04em",
              backgroundColor: "#A8CDE8",
              color: "#0A1628",
              border: "1px solid #7FA8C8",
              borderTop: "2px solid #2251FF",
              boxShadow: "0 4px 12px rgba(34, 81, 255, 0.10)",
            }}
          >
            <span style={{ color: "#0A1628" }}>딜룸 입장 · 상세</span>
            <ArrowRight size={14} style={{ color: "#0A1628" }} />
          </div>
        </div>
      </motion.article>
    </Link>
  )
}

/* ─── Sub Metric atom (실제 거래소 카드 SubMetric 동일 톤) ─────────────── */
function SubMetric({ label, value, brass }: { label: string; value: string; brass?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(5, 28, 44, 0.55)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 14, fontWeight: 800,
          color: brass ? "#2251FF" : "#0A1628",
          letterSpacing: "-0.01em",
          fontVariantNumeric: "tabular-nums",
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        {value}
      </div>
    </div>
  )
}
