"use client"

/**
 * Phase 2-F — AI 추천 매물 홈 위젯
 *
 * GET /api/v1/recommendations/listings?limit=5 로 개인화 Top-N 매물을 가져와
 * 랜딩 페이지 "거래 중심" 영역에 노출.
 *
 * 비로그인/프로필 미설정: source=recent (최근순) 으로 자동 fallback.
 * 실패: 섹션 전체 숨김 (랜딩 노이즈 최소화).
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Sparkles, ArrowUpRight, MapPin, TrendingUp, ShieldCheck } from "lucide-react"

type RecItem = {
  id: string
  title?: string | null
  location?: string | null
  collateral_type?: string | null
  principal_amount?: number | null
  asking_price_min?: number | null
  ltv?: number | null
  risk_grade?: string | null
  created_at?: string | null
  match_score?: number
  match_reasons?: string[]
}

type Payload = {
  data?: { items: RecItem[]; source: "personalized" | "recent"; total: number }
  error?: { code: string; message: string }
}

function formatKRW(v?: number | null): string {
  if (!v || v <= 0) return "—"
  if (v >= 1_0000_0000) return `${(v / 1_0000_0000).toFixed(1)}억`
  if (v >= 10_000) return `${(v / 10_000).toFixed(0)}만`
  return v.toLocaleString()
}

export function AIRecommendations() {
  const [items, setItems] = useState<RecItem[] | null>(null)
  const [source, setSource] = useState<"personalized" | "recent">("recent")
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch("/api/v1/recommendations/listings?limit=5", { cache: "no-store" })
      .then((r) => r.json() as Promise<Payload>)
      .then((j) => {
        if (cancelled) return
        if (j?.data?.items?.length) {
          setItems(j.data.items)
          setSource(j.data.source)
        } else {
          setFailed(true)
        }
      })
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [])

  if (failed) return null
  const loading = items === null

  return (
    <section
      style={{
        backgroundColor: "#0B1428",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        padding: "4.5rem 0",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3"
              style={{ background: "rgba(20,22,26,0.10)", border: "1px solid rgba(20,22,26,0.25)" }}
            >
              <Sparkles size={12} style={{ color: "#C084FC" }} />
              <span className="text-[11px] font-bold tracking-wider" style={{ color: "#C084FC" }}>
                {source === "personalized" ? "AI 개인화 추천" : "최근 등록 매물"}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {source === "personalized" ? "당신에게 맞는 매물" : "방금 올라온 매물"}
            </h2>
            <p className="mt-2 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
              {source === "personalized"
                ? "관심 지역·담보 유형·예산·LTV 선호 기반 스코어링"
                : "로그인하고 관심사를 설정하면 당신에게 맞는 매물을 먼저 보여드립니다"}
            </p>
          </div>
          <Link
            href="/exchange"
            className="group inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            전체 매물 보기
            <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(loading ? Array.from({ length: 5 }) : items!).map((raw, idx) => {
            const l = (raw ?? {}) as RecItem
            return (
              <motion.div
                key={loading ? `s-${idx}` : l.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.35 }}
              >
                {loading ? (
                  <div
                    className="rounded-xl p-4 h-48 animate-pulse"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                  />
                ) : (
                  <Link
                    href={`/exchange/${l.id}`}
                    className="group block rounded-xl p-4 h-full transition-all hover:-translate-y-0.5"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1 text-[11px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                        <MapPin size={11} />
                        <span className="truncate">{l.location ?? "—"}</span>
                      </div>
                      {typeof l.match_score === "number" && l.match_score > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(20,22,26,0.15)", color: "#14161A" }}
                        >
                          {l.match_score}
                        </span>
                      )}
                    </div>
                    <h3
                      className="text-sm font-semibold text-white leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-[#14161A] transition-colors"
                    >
                      {l.title ?? "제목 없음"}
                    </h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-lg font-bold text-white">{formatKRW(l.asking_price_min ?? l.principal_amount)}</span>
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>원</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-[10px]" style={{ color: "rgba(255,255,255,0.5)" }}>
                      {l.collateral_type && (
                        <span className="inline-flex items-center gap-0.5">
                          <ShieldCheck size={10} /> {l.collateral_type}
                        </span>
                      )}
                      {typeof l.ltv === "number" && l.ltv > 0 && (
                        <span className="inline-flex items-center gap-0.5">
                          <TrendingUp size={10} /> LTV {Math.round(l.ltv)}%
                        </span>
                      )}
                    </div>
                    {l.match_reasons && l.match_reasons.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {l.match_reasons.slice(0, 2).map((r) => (
                          <span
                            key={r}
                            className="text-[9px] px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(20,22,26,0.10)", color: "#C084FC" }}
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                )}
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
