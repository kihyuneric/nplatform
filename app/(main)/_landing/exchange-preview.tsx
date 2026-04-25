"use client"

/**
 * 거래소 매물 "예시" 프리뷰 섹션.
 * 메인 랜딩에서 실제 거래소가 어떻게 생겼는지 샘플 4건으로 보여줌.
 * AIRecommendations 는 실제 API 결과, 이 컴포넌트는 의도된 샘플 스냅샷.
 */

import Link from "next/link"
import { motion } from "framer-motion"
import {
  Building2, MapPin, TrendingDown, Shield, Sparkles, ArrowRight, Gavel, Clock, Users,
} from "lucide-react"
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
  {
    id: "npl-2026-0412",
    institution: "우리은행",
    location: "서울 강남구",
    category: "아파트",
    title: "임의매각 · 강남 아파트 담보",
    code: "NPL-2026-0412",
    principal: "12.0억",
    asking: "8.5억",
    appraisal: "10.2억",
    discount: "29.2%",
    grade: "A",
    dday: 5,
    bidders: 12,
    completeness: "9/10",
    tags: ["감정평가", "등기", "권리", "임차"],
    featured: true,
  },
  {
    id: "npl-2026-0409",
    institution: "KB저축은행",
    location: "경기 성남 분당",
    category: "오피스텔",
    title: "법정관리 · 분당 오피스텔",
    code: "NPL-2026-0409",
    principal: "3.8억",
    asking: "2.4억",
    appraisal: "3.2억",
    discount: "36.8%",
    grade: "B",
    dday: 8,
    bidders: 7,
    completeness: "8/10",
    tags: ["감정평가", "등기", "권리"],
  },
  {
    id: "npl-2026-0407",
    institution: "하나캐피탈",
    location: "부산 해운대",
    category: "상가",
    title: "임의매각 · 해운대 상가",
    code: "NPL-2026-0407",
    principal: "6.5억",
    asking: "4.1억",
    appraisal: "5.3억",
    discount: "36.9%",
    grade: "A",
    dday: 11,
    bidders: 5,
    completeness: "10/10",
    tags: ["감정평가", "등기", "권리", "임차", "재무"],
  },
  {
    id: "npl-2026-0404",
    institution: "신한저축은행",
    location: "인천 송도",
    category: "아파트",
    title: "공매 · 송도 아파트 Pool",
    code: "NPL-2026-0404",
    principal: "24.0억",
    asking: "15.8억",
    appraisal: "19.6억",
    discount: "34.2%",
    grade: "B",
    dday: 14,
    bidders: 18,
    completeness: "9/10",
    tags: ["감정평가", "등기", "권리", "Pool"],
  },
]

const GRADE_STYLE: Record<Sample["grade"], { bg: string; fg: string; border: string }> = {
  A: { bg: "rgba(16,185,129,0.12)", fg: "#10B981", border: "rgba(16,185,129,0.3)" },
  B: { bg: "rgba(59,130,246,0.12)", fg: "#60A5FA", border: "rgba(59,130,246,0.3)" },
  C: { bg: "rgba(245,158,11,0.12)", fg: "#F59E0B", border: "rgba(245,158,11,0.3)" },
}

export function ExchangePreview() {
  return (
    <section style={{ backgroundColor: "#0A1324", padding: "6rem 0", position: "relative", overflow: "hidden" }}>
      {/* ambient glow */}
      <div
        style={{
          position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
          width: "600px", height: "600px", pointerEvents: "none",
          background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
          filter: "blur(80px)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-4"
            style={{ background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.25)" }}
          >
            <Sparkles size={12} style={{ color: "#34D399" }} />
            <span className="text-[11px] font-bold tracking-wider" style={{ color: "#34D399" }}>
              거래소 미리보기
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            실제 NPL 매물은 이렇게 보입니다
          </h2>
          <p className="mt-3 text-sm md:text-base" style={{ color: "rgba(255,255,255,0.5)" }}>
            채권잔액 · 매각희망가 · 감정가 · 할인율 · 자료 완성도 — 투자 판단에 필요한 모든 지표를 한 화면에.
          </p>
          <p className="mt-2 text-[10px] md:hidden" style={{ color: "rgba(255,255,255,0.35)" }}>
            ← 옆으로 넘겨 다른 매물 보기 →
          </p>
        </div>

        {/* 모바일: 가로 스와이프 carousel · md+: 4-col grid */}
        <div
          className="-mx-4 sm:-mx-6 lg:mx-0 pl-4 sm:pl-6 lg:pl-0 pr-8 sm:pr-10 lg:pr-0 scroll-pl-4 sm:scroll-pl-6 lg:scroll-pl-0 flex md:grid overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none gap-4 md:grid-cols-2 lg:grid-cols-4 min-w-0 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {SAMPLES.map((s, idx) => {
            const g = GRADE_STYLE[s.grade]
            return (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: idx * 0.06, duration: 0.4 }}
                className="snap-start shrink-0 basis-[82%] sm:basis-[58%] md:basis-auto md:shrink min-w-0"
              >
                <Link
                  href="/exchange"
                  className={`npl-preview-dark-card group relative block rounded-2xl overflow-hidden transition-all hover:-translate-y-1 ${s.featured ? 'featured' : ''}`}
                >
                  {s.featured && (
                    <div
                      className="absolute top-0 right-0 px-2 py-0.5 text-[9px] font-bold rounded-bl-md"
                      style={{ background: "rgba(16,185,129,0.18)", color: "#34D399" }}
                    >
                      FEATURED
                    </div>
                  )}

                  <div
                    className="flex items-center justify-between px-3.5 py-2.5"
                    style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                        <Building2 size={11} style={{ color: "rgba(255,255,255,0.5)" }} />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.85)" }} title="NDA 체결 후 실명 공개">{maskInstitutionName(s.institution)}</div>
                        <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                          금융기관 · D-{s.dday}
                        </div>
                      </div>
                    </div>
                    <span
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded"
                      style={{ background: g.bg, color: g.fg, border: `1px solid ${g.border}` }}
                    >
                      AI {s.grade}
                    </span>
                  </div>

                  <div className="p-3.5 flex flex-col gap-3">
                    <div>
                      <div className="flex items-center gap-1 text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                        <MapPin size={10} /> {s.location} · {s.category}
                      </div>
                      <div className="text-[13px] font-extrabold leading-tight" style={{ color: "rgba(255,255,255,0.92)" }}>
                        {s.title}
                      </div>
                      <div className="text-[9px] mt-1 font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {s.code}
                      </div>
                    </div>

                    <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "채권잔액", v: s.principal, c: "rgba(255,255,255,0.75)" },
                          { label: "매각희망가", v: s.asking, c: "#34D399" },
                          { label: "감정가", v: s.appraisal, c: "rgba(255,255,255,0.75)" },
                          { label: "할인율", v: s.discount, c: "#34D399", icon: true },
                        ].map((f) => (
                          <div key={f.label}>
                            <div className="text-[9px] font-semibold mb-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{f.label}</div>
                            <div className="text-[13px] font-black tabular-nums flex items-center gap-1" style={{ color: f.c }}>
                              {f.icon && <TrendingDown size={11} style={{ color: "#34D399" }} />}
                              {f.v}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)" }}>
                        <Shield size={10} style={{ color: "#34D399" }} />
                        <span className="text-[10px] font-bold" style={{ color: "#34D399" }}>{s.completeness}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                        <span className="inline-flex items-center gap-1"><Users size={10} />{s.bidders}</span>
                        <span className="inline-flex items-center gap-1"><Clock size={10} />D-{s.dday}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {s.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(16,185,129,0.07)", color: "#34D399", border: "1px solid rgba(16,185,129,0.18)" }}
                        >
                          ✓ {t}
                        </span>
                      ))}
                    </div>

                    <div
                      className="py-2 rounded-lg text-center font-bold text-[11px] transition-all flex items-center justify-center gap-1 group-hover:brightness-110"
                      style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "white", boxShadow: "0 3px 10px rgba(16,185,129,0.25)" }}
                    >
                      딜룸 입장 · 상세 <ArrowRight size={11} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-10 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/exchange"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-all"
            style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "white", boxShadow: "0 4px 14px rgba(16,185,129,0.25)" }}
          >
            거래소로 이동 <ArrowRight size={14} />
          </Link>
          <Link
            href="/exchange/auction"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-colors"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)" }}
          >
            <Gavel size={14} /> 경쟁 입찰 보기
          </Link>
        </div>
      </div>
    </section>
  )
}
