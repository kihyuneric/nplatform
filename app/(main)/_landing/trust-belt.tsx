"use client"

/**
 * TrustBelt — 랜딩 페이지 신뢰 벨트.
 * lib/brand.ts의 CLAIMS / BRAND.pillars를 단일 출처로 사용.
 *
 * 배치 위치 권장: STATS BAR 직후 (데이터 주장 → 3-pillar 메시지 → WHY)
 */

import { motion } from "framer-motion"
import Link from "next/link"
import { Database, BrainCircuit, ShieldCheck, ArrowUpRight, CheckCircle2 } from "lucide-react"
import { BRAND, CLAIMS } from "@/lib/brand"

const ICONS = {
  data: Database,
  ai: BrainCircuit,
  trust: ShieldCheck,
} as const

const CLAIM_BULLETS: Record<keyof typeof ICONS, Array<{ label: string; value: string }>> = {
  data: [
    { label: "실거래 커버리지", value: CLAIMS.dataCoverage.transactions },
    { label: "경매·공매", value: CLAIMS.dataCoverage.auctions },
    { label: "갱신 주기", value: CLAIMS.dataCoverage.update },
  ],
  ai: [
    { label: "추론 모델", value: CLAIMS.ai.model },
    { label: "임베딩", value: CLAIMS.ai.embedding },
    { label: "RAG 문서", value: CLAIMS.ai.ragDocs },
  ],
  trust: [
    { label: "암호화", value: CLAIMS.trust.encryption },
    { label: "인증", value: CLAIMS.trust.auth },
    { label: "준법", value: CLAIMS.trust.isms },
  ],
}

export function TrustBelt() {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #080F1E 0%, #0A1628 100%)",
        padding: "5rem 0",
      }}
    >
      {/* ambient glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 20% 30%, rgba(37,88,160,.14), transparent 55%), radial-gradient(circle at 85% 70%, rgba(16,185,129,.10), transparent 55%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-3.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Why {BRAND.name}
          </span>
          <h2 className="mt-5 text-[clamp(1.75rem,3.6vw,2.75rem)] font-bold leading-tight text-white">
            {BRAND.taglineLong}
          </h2>
          <p className="mt-3 text-[1rem] text-white/55 max-w-2xl mx-auto">
            {BRAND.taglineShort} · {BRAND.products.exchange} · {BRAND.products.analytics} · {BRAND.products.dealroom}
          </p>
        </motion.div>

        {/* 3-pillar grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {BRAND.pillars.map((pillar, idx) => {
            const Icon = ICONS[pillar.key as keyof typeof ICONS] ?? Database
            const bullets = CLAIM_BULLETS[pillar.key as keyof typeof ICONS] ?? []
            return (
              <motion.div
                key={pillar.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.55, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="group relative rounded-2xl p-6 transition-all duration-300"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {/* hover border glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background:
                      idx === 0
                        ? "radial-gradient(circle at 50% 0%, rgba(59,130,246,.18), transparent 70%)"
                        : idx === 1
                        ? "radial-gradient(circle at 50% 0%, rgba(168,85,247,.18), transparent 70%)"
                        : "radial-gradient(circle at 50% 0%, rgba(16,185,129,.18), transparent 70%)",
                  }}
                />

                <div
                  className="relative w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{
                    background:
                      idx === 0
                        ? "linear-gradient(135deg, #1B3A5C, #2558A0)"
                        : idx === 1
                        ? "linear-gradient(135deg, #4C1D95, #7C3AED)"
                        : "linear-gradient(135deg, #047857, #10B981)",
                  }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>

                <h3 className="relative text-[1.125rem] font-bold text-white mb-2">{pillar.title}</h3>
                <p className="relative text-[0.875rem] leading-relaxed text-white/60 mb-5">{pillar.copy}</p>

                <ul className="relative space-y-2 border-t border-white/[0.06] pt-4">
                  {bullets.map((b) => (
                    <li key={b.label} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400/80" />
                      <div className="flex-1 min-w-0 flex items-baseline justify-between gap-3">
                        <span className="text-[0.75rem] text-white/45">{b.label}</span>
                        <span className="text-[0.8125rem] font-medium text-white/80 tabular-nums text-right">{b.value}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* CTA strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/exchange"
            className="inline-flex items-center gap-2 rounded-full bg-white text-[#0D1F38] text-[0.875rem] font-semibold px-6 py-2.5 hover:bg-white/90 transition-colors shadow-lg shadow-blue-500/10"
          >
            거래소 둘러보기
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            href="/analysis"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 text-white text-[0.875rem] font-semibold px-6 py-2.5 hover:bg-white/5 transition-colors"
          >
            AI 분석 체험
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-full text-white/70 text-[0.875rem] font-medium px-5 py-2.5 hover:text-white transition-colors"
          >
            요금제 보기
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
