"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Sparkles, Target, TrendingUp, ExternalLink, Award, CheckCircle2, AlertTriangle,
} from "lucide-react"
import DS from "@/lib/design-system"

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

const GRADE_CONFIG = {
  EXCELLENT: { color: "var(--color-positive)", badge: DS.badge.positive, label: "EXCELLENT" },
  GOOD:      { color: "var(--color-info)",     badge: DS.badge.info,     label: "GOOD" },
  FAIR:      { color: "var(--color-warning)",   badge: DS.badge.warning,  label: "FAIR" },
} as const

// API 응답이 없을 때 사용되는 샘플 (AI 매칭 상세 UX 확보)
function buildSampleMatch(id: string): MatchPair {
  return {
    id,
    sellerId: "seller-sample-01",
    buyerId: "buyer-sample-01",
    sellerName: "우리은행 강남지점",
    buyerName: "NPL 투자조합 #3",
    totalScore: 87,
    grade: "EXCELLENT",
    factors: [
      { name: "담보 유형 일치", score: 35, weight: 35, maxScore: 35 },
      { name: "지역 선호도",   score: 22, weight: 25, maxScore: 25 },
      { name: "금액 범위",     score: 17, weight: 20, maxScore: 20 },
      { name: "할인율 목표",   score: 13, weight: 15, maxScore: 15 },
    ],
    recommendedAction: "담보·지역·금액 모두 일치. 즉시 딜룸 생성을 권장합니다.",
  }
}

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
          // API returns array — find by id or take first
          const raw = json?.data ?? json?.result ?? null
          const found: MatchPair | null = Array.isArray(raw)
            ? (raw.find((m: MatchPair) => m.id === matchId) ?? raw[0] ?? null)
            : (raw as MatchPair | null)
          if (found && !cancelled) {
            // Normalize API factors: API uses weight (0-1) while UI expects maxScore
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

  if (loading) {
    return (
      <div className={DS.page.wrapper}>
        <div className={`${DS.page.container} py-10`}>
          <div className={`${DS.card.base} ${DS.card.padding} animate-pulse h-64`} />
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className={DS.page.wrapper}>
        <div className={`${DS.page.container} py-10 text-center`}>
          <p className={DS.text.body}>매칭 정보를 찾을 수 없습니다.</p>
          <Link href="/deals/matching" className={`${DS.button.secondary} mt-4`}>
            <ArrowLeft className="w-4 h-4" /> 매칭 목록으로
          </Link>
        </div>
      </div>
    )
  }

  const cfg = GRADE_CONFIG[match.grade] ?? GRADE_CONFIG["EXCELLENT"]

  return (
    <div className={DS.page.wrapper}>
      <div className={`${DS.page.container} py-6 sm:py-8`}>

        {/* Breadcrumb (간단한 back) */}
        <Link href="/deals/matching" className={`${DS.button.ghost} mb-4`}>
          <ArrowLeft className="w-4 h-4" /> 매칭 목록
        </Link>

        {usingSample && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-stone-300/20 bg-stone-100/10 px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-stone-900 shrink-0 mt-0.5" />
            <p className={`${DS.text.caption} text-stone-900`}>
              실시간 매칭 데이터를 불러오지 못해 샘플 데이터를 표시합니다. 실제 매칭 결과는 /deals/matching 에서 AI 매칭 실행 후 확인할 수 있습니다.
            </p>
          </div>
        )}

        {/* Header */}
        <div className={`${DS.card.base} ${DS.card.padding} mb-4`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${cfg.color}22` }}
              >
                <Sparkles className="w-6 h-6" style={{ color: cfg.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className={DS.text.sectionTitle}>AI 매칭 상세</h1>
                  <span className={cfg.badge}>{cfg.label}</span>
                </div>
                <p className={DS.text.caption}>매칭 ID: {match.id}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={DS.text.label}>종합 점수</p>
              <p className="text-[2.5rem] font-extrabold leading-none tabular-nums" style={{ color: cfg.color }}>
                {match.totalScore}
              </p>
              <p className={DS.text.caption}>/ 100</p>
            </div>
          </div>
        </div>

        {/* Seller / Buyer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className={`${DS.card.base} ${DS.card.padding}`}>
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-[var(--color-brand-mid)]" />
              <p className={DS.text.label}>매도자 (매물)</p>
            </div>
            <p className={`${DS.text.cardTitle} mb-3`}>{match.sellerName}</p>
            <Link href={`/exchange/${match.sellerId}`} className={`${DS.button.secondary} w-full justify-center`}>
              <ExternalLink className="w-4 h-4" /> 매물 보기
            </Link>
          </div>

          <div className={`${DS.card.base} ${DS.card.padding}`}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[var(--color-positive)]" />
              <p className={DS.text.label}>매수자 (수요)</p>
            </div>
            <p className={`${DS.text.cardTitle} mb-3`}>{match.buyerName}</p>
            <Link href={`/exchange/demands/${match.buyerId}`} className={`${DS.button.secondary} w-full justify-center`}>
              <ExternalLink className="w-4 h-4" /> 수요 보기
            </Link>
          </div>
        </div>

        {/* Factors */}
        <div className={`${DS.card.base} ${DS.card.padding} mb-4`}>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-[var(--color-brand-mid)]" />
            <h2 className={DS.text.cardSubtitle}>매칭 요인 분석</h2>
          </div>
          <div className="space-y-3">
            {match.factors.map((f) => {
              const pct = Math.round((f.score / f.maxScore) * 100)
              return (
                <div key={f.name}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={DS.text.bodyMedium}>{f.name}</p>
                    <p className={DS.text.bodyBold}>
                      {f.score} / {f.maxScore}
                      <span className={`ml-2 ${DS.text.caption}`}>({pct}%)</span>
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--color-surface-sunken)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recommended Action */}
        <div className={`${DS.card.base} ${DS.card.padding} mb-6`}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--color-positive)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className={`${DS.text.bodyBold} mb-1`}>AI 추천 액션</p>
              <p className={DS.text.body}>{match.recommendedAction}</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/deals?seller=${match.sellerId}&buyer=${match.buyerId}`} className={`${DS.button.primary} flex-1 justify-center`}>
            딜룸 생성 시작 <ExternalLink className="w-4 h-4" />
          </Link>
          <Link href="/deals/matching" className={`${DS.button.secondary} flex-1 justify-center`}>
            <ArrowLeft className="w-4 h-4" /> 매칭 목록으로
          </Link>
        </div>

      </div>
    </div>
  )
}
