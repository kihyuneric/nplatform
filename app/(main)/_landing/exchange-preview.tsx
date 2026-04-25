"use client"

/**
 * Exchange Preview · McKinsey Editorial v3.0 (전면 재설계)
 * "monochrome + typography hierarchy + 단 하나의 brass accent"
 *
 * 디자인 원칙
 *   1. 색상으로 데이터 차별화 X — font-weight + size + position 으로 위계
 *   2. 카드 = 흰 종이. 외곽선 1px hairline. 좌측 brass 2px (옵셔널)
 *   3. 숫자 = 검정 (정수) + serif numeric (회계장부 톤)
 *   4. 라벨 = 작은 회색 uppercase
 *   5. CTA = 단색 검정 또는 navy + 흰 글씨 + 우측 화살표
 *   6. AI 등급 = 1자 알파벳 (검정 박스 흰 글씨)
 *   7. emerald, blue, purple, amber, red 모두 사용 금지
 *
 * 비교 — 이전 multi-color SaaS 톤 (8.5억 emerald, 29.2% emerald, AI A 색상별)
 *   → 신규 editorial mono 톤 (모두 검정 + 단 하나의 brass divider)
 */

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { maskInstitutionName } from "@/lib/mask"

type Sample = {
  id: string
  institution: string
  location: string
  category: string
  title: string
  code: string
  principal: string
  asking: string
  appraisal: string
  discount: string
  grade: "A" | "B" | "C"
  dday: number
  bidders: number
  completeness: string
  tags: string[]
  featured?: boolean
}

const SAMPLES: Sample[] = [
  { id: "npl-2026-0412", institution: "우리은행", location: "서울 강남구", category: "아파트", title: "임의매각 · 강남 아파트 담보", code: "NPL-2026-0412", principal: "12.0억", asking: "8.5억", appraisal: "10.2억", discount: "29.2%", grade: "A", dday: 5, bidders: 12, completeness: "9/10", tags: ["감정평가", "등기", "권리", "임차"], featured: true },
  { id: "npl-2026-0409", institution: "KB저축은행", location: "경기 성남 분당", category: "오피스텔", title: "법정관리 · 분당 오피스텔", code: "NPL-2026-0409", principal: "3.8억", asking: "2.4억", appraisal: "3.2억", discount: "36.8%", grade: "B", dday: 8, bidders: 7, completeness: "8/10", tags: ["감정평가", "등기", "권리"] },
  { id: "npl-2026-0407", institution: "하나캐피탈", location: "부산 해운대", category: "상가", title: "임의매각 · 해운대 상가", code: "NPL-2026-0407", principal: "6.5억", asking: "4.1억", appraisal: "5.3억", discount: "36.9%", grade: "A", dday: 11, bidders: 5, completeness: "10/10", tags: ["감정평가", "등기", "권리", "임차", "재무"] },
  { id: "npl-2026-0404", institution: "신한저축은행", location: "인천 송도", category: "아파트", title: "공매 · 송도 아파트 Pool", code: "NPL-2026-0404", principal: "24.0억", asking: "15.8억", appraisal: "19.6억", discount: "34.2%", grade: "B", dday: 14, bidders: 18, completeness: "9/10", tags: ["감정평가", "등기", "권리", "Pool"] },
]

export function ExchangePreview() {
  return (
    <section
      style={{
        background: "var(--color-editorial-beige, #F4EBE0)",
        padding: "6rem 0",
        position: "relative",
      }}
    >
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Eyebrow */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-5">
            <span className="block w-10 h-[1px]" style={{ background: "var(--color-editorial-gold)" }} />
            <span
              style={{
                fontFamily: "var(--font-editorial-body)",
                fontSize: "0.6875rem",
                fontWeight: 700,
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                color: "var(--color-editorial-gold)",
              }}
            >
              Exchange · 거래소 미리보기
            </span>
            <span className="block w-10 h-[1px]" style={{ background: "var(--color-editorial-gold)" }} />
          </div>
          <h2
            style={{
              fontFamily: "var(--font-editorial-display)",
              fontWeight: 700,
              letterSpacing: "-0.025em",
              fontSize: "clamp(1.875rem, 3.5vw, 2.5rem)",
              lineHeight: 1.15,
              color: "var(--color-editorial-ink, #14161A)",
            }}
            className="mb-4"
          >
            실제 NPL 매물은 이렇게 보입니다
          </h2>
          <p
            className="mt-3 max-w-2xl mx-auto"
            style={{
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              color: "var(--color-text-secondary)",
            }}
          >
            채권잔액 · 매각희망가 · 감정가 · 할인율 · 자료 완성도 — 투자 판단에 필요한 모든 지표를 한 화면에.
          </p>
        </div>

        {/* 카드 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px" style={{ background: "rgba(5, 28, 44, 0.08)" }}>
          {SAMPLES.map((s, idx) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
            >
              <Link
                href="/exchange"
                className="group relative block h-full transition-colors"
                style={{
                  background: "#FFFFFF",
                  padding: "1.5rem 1.25rem 1.25rem",
                  borderTop: s.featured ? "2px solid var(--color-editorial-gold)" : "2px solid transparent",
                }}
              >
                {/* 작은 메타 라인 — 기관 + D-day */}
                <div className="flex items-center justify-between mb-4">
                  <span
                    style={{
                      fontSize: "0.625rem",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "var(--color-text-tertiary)",
                      fontWeight: 700,
                    }}
                    title="NDA 체결 후 실명 공개"
                  >
                    {maskInstitutionName(s.institution)}
                  </span>
                  <span
                    style={{
                      fontSize: "0.625rem",
                      letterSpacing: "0.08em",
                      color: "var(--color-text-tertiary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    D−{s.dday}
                  </span>
                </div>

                {/* 제목 */}
                <h3
                  style={{
                    fontFamily: "var(--font-editorial-display)",
                    fontSize: "1.0625rem",
                    fontWeight: 700,
                    letterSpacing: "-0.012em",
                    lineHeight: 1.3,
                    color: "var(--color-editorial-ink, #14161A)",
                  }}
                  className="mb-1.5"
                >
                  {s.title}
                </h3>

                {/* 위치 + 분류 + ID */}
                <p
                  style={{
                    fontSize: "0.6875rem",
                    color: "var(--color-text-tertiary)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                  className="mb-5"
                >
                  {s.location} · {s.category} · {s.code}
                </p>

                {/* 금액 위계 — 매각희망가만 큰 검정, 나머지는 작게 */}
                <div className="space-y-3 pb-4 border-b" style={{ borderColor: "rgba(5, 28, 44, 0.10)" }}>
                  <div>
                    <div
                      style={{
                        fontSize: "0.625rem",
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                        color: "var(--color-text-tertiary)",
                        fontWeight: 700,
                      }}
                      className="mb-0.5"
                    >
                      매각희망가
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-editorial-numeric)",
                        fontSize: "1.875rem",
                        fontWeight: 700,
                        lineHeight: 1,
                        color: "var(--color-editorial-ink, #14161A)",
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {s.asking}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-1">
                    <Metric label="채권잔액" value={s.principal} />
                    <Metric label="감정가" value={s.appraisal} />
                    <Metric label="할인율" value={s.discount} brass />
                  </div>
                </div>

                {/* 하단 — AI 등급 (mono badge) + 자료 완성도 + 입찰자 */}
                <div className="flex items-center justify-between pt-4 mb-4">
                  <div className="flex items-center gap-2">
                    {/* AI 등급 = 검정 사각 박스 + 흰 알파벳 (color X) */}
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 6px",
                        background: "var(--color-editorial-ink, #14161A)",
                        color: "#FFFFFF",
                        fontSize: "0.625rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                      }}
                    >
                      AI · {s.grade}
                    </span>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        color: "var(--color-text-tertiary)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      자료 {s.completeness}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "0.625rem",
                      letterSpacing: "0.08em",
                      color: "var(--color-text-tertiary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    입찰 {s.bidders}
                  </span>
                </div>

                {/* CTA — 검정 단색 underline 톤 */}
                <div
                  className="flex items-center justify-between pt-3"
                  style={{
                    borderTop: "1px solid rgba(5, 28, 44, 0.10)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      color: "var(--color-editorial-ink, #14161A)",
                    }}
                  >
                    딜룸 입장 · 상세
                  </span>
                  <ArrowRight
                    size={14}
                    style={{ color: "var(--color-editorial-ink, #14161A)" }}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA bar — 단색 navy/검정 */}
        <div className="mt-12 flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/exchange"
            className="inline-flex items-center justify-center gap-2 transition-colors"
            style={{
              background: "var(--color-editorial-ink, #14161A)",
              color: "#FFFFFF",
              padding: "12px 28px",
              fontSize: "0.8125rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              borderRadius: 0,
              border: "1px solid var(--color-editorial-ink, #14161A)",
            }}
          >
            거래소로 이동 <ArrowRight size={14} />
          </Link>
          <Link
            href="/exchange/auction"
            className="inline-flex items-center justify-center gap-2 transition-colors"
            style={{
              background: "transparent",
              color: "var(--color-editorial-ink, #14161A)",
              padding: "12px 28px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              borderRadius: 0,
              border: "1px solid var(--color-editorial-ink, #14161A)",
            }}
          >
            경쟁 입찰 보기
          </Link>
        </div>
      </div>
    </section>
  )
}

/** 작은 라벨 + 숫자 — McKinsey style */
function Metric({ label, value, brass }: { label: string; value: string; brass?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontSize: "0.5625rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--color-text-tertiary)",
          fontWeight: 700,
        }}
        className="mb-0.5"
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-editorial-numeric)",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: brass ? "var(--color-editorial-gold)" : "var(--color-editorial-ink, #14161A)",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  )
}
