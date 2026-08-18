"use client"

/**
 * Exchange Preview · 이번 주 하이라이트 물건 8건 — 이미지 중심 카드형 (2026-08-18)
 *
 * 정책:
 *   - 카드 8개, 이미지가 주가 되는 배열 (4×2 그리드, 모바일 2열)
 *   - 운영자 관리자(/admin/highlights)에서 등록·수정·삭제 → /api/v1/highlights 공유
 *   - 데이터 없으면 기본 8건 표시 (degrade)
 *   - 기본 정보만 공개 — 주소 · 서류 · 상세 자료는 NDA 체결 후에 열람 가능
 *   - McKinsey editorial: 흰 종이 + 2px electric top + sharp corners
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Building2, MapPin } from "lucide-react"

type Highlight = {
  id?: string
  no: string          // 관리번호 표기 (N-01 …)
  location: string
  category: string
  principal: string   // 총 채권액
  max_claim: string   // 수익권금액(채권최고액)
  asking: string      // 협의가
  appraisal: string   // 감정가
  photo_url?: string
}

const DEFAULTS: Highlight[] = [
  { no: "N-01", location: "서울 종로구", category: "토지",     principal: "16.5억", max_claim: "23.8억", asking: "17.0억", appraisal: "66.7억" },
  { no: "N-02", location: "경기 성남 분당", category: "오피스텔", principal: "3.8억",  max_claim: "4.9억",  asking: "2.4억",  appraisal: "3.2억" },
  { no: "N-03", location: "부산 해운대",   category: "근린상가", principal: "6.5억",  max_claim: "8.5억",  asking: "4.1억",  appraisal: "5.3억" },
  { no: "N-04", location: "인천 송도",     category: "아파트",   principal: "24.0억", max_claim: "31.2억", asking: "15.8억", appraisal: "19.6억" },
  { no: "N-05", location: "대구 수성구",   category: "근린상가", principal: "9.2억",  max_claim: "12.0억", asking: "5.6억",  appraisal: "7.4억" },
  { no: "N-06", location: "서울 마포구",   category: "오피스텔", principal: "4.5억",  max_claim: "5.9억",  asking: "3.1억",  appraisal: "3.9억" },
  { no: "N-07", location: "경기 화성",     category: "지식산업센터", principal: "31.0억", max_claim: "40.3억", asking: "19.4억", appraisal: "25.2억" },
  { no: "N-08", location: "부산 남구",     category: "아파트",   principal: "5.8억",  max_claim: "7.5억",  asking: "3.7억",  appraisal: "4.9억" },
]

export function ExchangePreview() {
  const [items, setItems] = useState<Highlight[]>(DEFAULTS)

  useEffect(() => {
    fetch("/api/v1/highlights")
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d?.data) && d.data.length > 0) setItems(d.data.slice(0, 8))
      })
      .catch(() => {})
  }, [])

  return (
    <section style={{ backgroundColor: "#FAFBFC", padding: "5rem 0 4rem", position: "relative" }}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Eyebrow + Title */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span style={{ display: "inline-block", width: 24, height: 1.5, background: "#2251FF" }} />
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: "#2251FF" }}>
              Highlights · 하이라이트 물건
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
            이번주 하이라이트 NPL 8건
          </h2>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(5, 28, 44, 0.65)", maxWidth: 560, margin: "0 auto" }}>
            기본 정보만 공개 — 주소 · 서류 · 상세 자료는 NDA 체결 후에 열람가능합니다.
          </p>
        </div>

        {/* ── 이미지 중심 카드 그리드 (데스크톱 4열 × 2행 · 모바일 2열) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {items.map((s, i) => (
            <Link
              key={s.id ?? s.no ?? i}
              href="/exchange"
              className="mck-paper group"
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#FFFFFF",
                border: "1px solid rgba(5, 28, 44, 0.10)",
                borderTop: "2px solid #2251FF",
                textDecoration: "none",
                overflow: "hidden",
                transition: "box-shadow 0.15s, transform 0.15s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 32px -10px rgba(5, 28, 44, 0.18)"
                ;(e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "none"
                ;(e.currentTarget as HTMLElement).style.transform = "none"
              }}
            >
              {/* 이미지 — 카드의 주인공 */}
              <div style={{ position: "relative", aspectRatio: "4 / 3", background: "linear-gradient(135deg, #EEF1F6 0%, #E2E8F0 100%)", overflow: "hidden" }}>
                {s.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photo_url} alt={`${s.location} ${s.category}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(5, 28, 44, 0.35)" }}>
                    <Building2 size={30} />
                    <span style={{ marginTop: 6, fontSize: 10, fontWeight: 700 }}>사진 준비중</span>
                  </div>
                )}
                {/* 관리번호 배지 */}
                <span
                  className="mck-cta-dark"
                  style={{
                    position: "absolute", top: 10, left: 10,
                    padding: "3px 8px",
                    backgroundColor: "#0A1628",
                    fontFamily: "monospace", fontSize: 10.5, fontWeight: 800, letterSpacing: "0.04em",
                  }}
                >
                  <span style={{ color: "#FFFFFF" }}>{s.no}</span>
                </span>
                {/* 유형 배지 */}
                <span
                  style={{
                    position: "absolute", top: 10, right: 10,
                    padding: "3px 8px",
                    backgroundColor: "rgba(255, 255, 255, 0.92)",
                    color: "#0A1628",
                    fontSize: 10, fontWeight: 800,
                    border: "1px solid rgba(5, 28, 44, 0.12)",
                  }}
                >
                  {s.category}
                </span>
              </div>

              {/* 본문 — 지역 + 핵심 지표 */}
              <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 800, color: "#0A1628", marginBottom: 10 }}>
                  <MapPin size={12} color="rgba(5, 28, 44, 0.45)" style={{ flexShrink: 0 }} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.location}</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "7px 10px", fontSize: 11 }}>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(5, 28, 44, 0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>감정가</div>
                    <div style={{ fontWeight: 700, color: "#0A1628", fontVariantNumeric: "tabular-nums" }}>{s.appraisal || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(5, 28, 44, 0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>총 채권액</div>
                    <div style={{ fontWeight: 700, color: "#0A1628", fontVariantNumeric: "tabular-nums" }}>{s.principal || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(5, 28, 44, 0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>수익권금액</div>
                    <div style={{ fontWeight: 700, color: "#0A1628", fontVariantNumeric: "tabular-nums" }}>{s.max_claim || "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: "rgba(5, 28, 44, 0.5)", textTransform: "uppercase", letterSpacing: "0.05em" }}>협의가</div>
                    <div style={{ fontWeight: 800, color: "#1A47CC", fontVariantNumeric: "tabular-nums" }}>{s.asking || "—"}</div>
                  </div>
                </div>

                {/* NDA CTA */}
                <div style={{ marginTop: 12 }}>
                  <span
                    className="mck-cta-dark"
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
                      width: "100%",
                      padding: "8px 10px",
                      backgroundColor: "#0A1628",
                      borderTop: "2px solid #2251FF",
                      fontSize: 11, fontWeight: 800,
                    }}
                  >
                    <span style={{ color: "#FFFFFF" }}>NDA 요청</span> <ArrowRight size={11} style={{ color: "#FFFFFF" }} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 flex items-center justify-center">
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
            <span style={{ color: "#FFFFFF" }}>NPL 자동매칭 전체 보기</span>
            <ArrowRight size={14} style={{ color: "#FFFFFF" }} />
          </Link>
        </div>
      </div>
    </section>
  )
}
