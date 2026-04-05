"use client"

import { useState } from "react"
import { Sparkles, Brain, MapPin, Building2, Target, TrendingUp, ChevronRight, SlidersHorizontal, BarChart3, Zap, DoorOpen } from "lucide-react"
import Link from "next/link"
import DS, { formatKRW } from "@/lib/design-system"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchedListing {
  id: string
  name: string
  region: string
  collateralType: string
  principal: number
  discountRate: number
  expectedPeriod: string
  matchScore: number
  aiSummary: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_MATCHED: MatchedListing[] = [
  {
    id: "ml-001",
    name: "서울 강남구 역삼동 업무시설 NPL",
    region: "서울",
    collateralType: "오피스",
    principal: 2800000000,
    discountRate: 32,
    expectedPeriod: "6개월",
    matchScore: 96,
    aiSummary: "투자 기준과 96% 일치 — 선호 지역·담보 유형·할인율 조건 모두 충족",
  },
  {
    id: "ml-002",
    name: "경기 수원시 영통구 아파트 NPL",
    region: "경기",
    collateralType: "아파트",
    principal: 1850000000,
    discountRate: 28,
    expectedPeriod: "9개월",
    matchScore: 88,
    aiSummary: "지역·담보 유형 완전 일치, 할인율이 기준 범위 하단에 근접",
  },
  {
    id: "ml-003",
    name: "부산 해운대구 상업시설 NPL",
    region: "부산",
    collateralType: "상가",
    principal: 4200000000,
    discountRate: 41,
    expectedPeriod: "12개월",
    matchScore: 79,
    aiSummary: "담보 유형 부분 일치, 투자 규모 기준 상단 초과 — 조건 검토 권장",
  },
  {
    id: "ml-004",
    name: "서울 마포구 토지 NPL",
    region: "서울",
    collateralType: "토지",
    principal: 980000000,
    discountRate: 55,
    expectedPeriod: "18개월",
    matchScore: 73,
    aiSummary: "고할인율 매물, 회수 기간이 기준보다 길지만 수익성 우수",
  },
  {
    id: "ml-005",
    name: "경기 성남시 분당구 아파트 NPL",
    region: "경기",
    collateralType: "아파트",
    principal: 2200000000,
    discountRate: 24,
    expectedPeriod: "6개월",
    matchScore: 61,
    aiSummary: "지역 조건 일치, 할인율이 목표 기준보다 낮음 — 추가 협상 여지 있음",
  },
  {
    id: "ml-006",
    name: "인천 연수구 오피스텔 NPL",
    region: "인천",
    collateralType: "오피스",
    principal: 1350000000,
    discountRate: 38,
    expectedPeriod: "9개월",
    matchScore: 54,
    aiSummary: "지역 미포함, 담보 유형 일치 — 기준 지역 확대 시 우선 검토 대상",
  },
]

const REGIONS = ["서울", "경기", "부산", "인천", "대구", "광주", "대전", "울산", "세종"]
const COLLATERAL_TYPES = ["아파트", "상가", "토지", "오피스"]
const PERIODS = ["3개월", "6개월", "9개월", "12개월", "18개월", "24개월"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtAmount = (n: number) => {
  const eok = n / 100_000_000
  return `${eok.toFixed(0)}억`
}

function scoreColor(score: number) {
  if (score >= 90) return { ring: "var(--color-positive)", text: DS.text.positive, bg: "bg-emerald-50 text-emerald-700 border border-emerald-200", label: "PERFECT" }
  if (score >= 70) return { ring: "var(--color-brand-mid)", text: DS.text.brand, bg: "bg-blue-50 text-blue-700 border border-blue-200", label: "HIGH" }
  if (score >= 50) return { ring: "var(--color-warning)", text: DS.text.warning, bg: "bg-amber-50 text-amber-700 border border-amber-200", label: "FAIR" }
  return { ring: "var(--color-text-muted)", text: DS.text.muted, bg: "bg-slate-50 text-slate-600 border border-slate-200", label: "LOW" }
}

// ─── Match Score Ring ─────────────────────────────────────────────────────────

function MatchScoreRing({ score }: { score: number }) {
  const r = 24
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const { ring } = scoreColor(score)
  return (
    <div className="relative w-16 h-16 shrink-0">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} fill="none" stroke="var(--color-border-subtle)" strokeWidth="4" />
        <circle cx="30" cy="30" r={r} fill="none" stroke={ring} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-[0.9375rem] font-extrabold tabular-nums leading-none text-[var(--color-text-primary)]`}>{score}</span>
        <span className={`${DS.text.micro} leading-none mt-0.5`}>점</span>
      </div>
    </div>
  )
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`${DS.filter.chip} ${active ? DS.filter.chipActive : DS.filter.chipInactive}`}
    >
      {label}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIMatchingPage() {
  const [selectedRegions, setSelectedRegions] = useState<string[]>(["서울", "경기"])
  const [selectedCollateral, setSelectedCollateral] = useState<string[]>(["아파트", "오피스"])
  const [minAmount, setMinAmount] = useState("10")
  const [maxAmount, setMaxAmount] = useState("50")
  const [discountSlider, setDiscountSlider] = useState(35)
  const [selectedPeriod, setSelectedPeriod] = useState("12개월")
  const [isMatching, setIsMatching] = useState(false)
  const [hasResult, setHasResult] = useState(true)

  const toggleRegion = (r: string) =>
    setSelectedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])

  const toggleCollateral = (c: string) =>
    setSelectedCollateral(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])

  const handleMatch = () => {
    setIsMatching(true)
    setTimeout(() => { setIsMatching(false); setHasResult(true) }, 1800)
  }

  const avgScore = Math.round(MOCK_MATCHED.reduce((s, m) => s + m.matchScore, 0) / MOCK_MATCHED.length)
  const highCount = MOCK_MATCHED.filter(m => m.matchScore >= 70).length

  return (
    <div className={DS.page.wrapper}>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-elevated)]">
        <div className={`${DS.page.container} py-8`}>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div>
              <p className={DS.header.eyebrow}>AI Matching</p>
              <h1 className={DS.header.title}>AI 매칭</h1>
              <p className={DS.header.subtitle}>
                내 투자 기준에 맞는 매물을 AI가 자동 탐색합니다
              </p>
            </div>

            {/* Stats bar */}
            {hasResult && (
              <div className={`flex items-center gap-1 ${DS.card.base} px-4 py-3 shrink-0`}>
                <div className="flex items-center gap-4">
                  <div className="text-center px-3">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <BarChart3 className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
                      <span className={DS.text.micro}>분석 매물 수</span>
                    </div>
                    <p className={DS.text.metricLarge}>1,284</p>
                  </div>
                  <div className="w-px h-8 bg-[var(--color-border-subtle)]" />
                  <div className="text-center px-3">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <Target className="w-3.5 h-3.5 text-[var(--color-positive)]" />
                      <span className={DS.text.micro}>기준 부합률</span>
                    </div>
                    <p className={`${DS.text.metricLarge} text-[var(--color-positive)]`}>
                      {Math.round((highCount / MOCK_MATCHED.length) * 100)}%
                    </p>
                  </div>
                  <div className="w-px h-8 bg-[var(--color-border-subtle)]" />
                  <div className="text-center px-3">
                    <div className="flex items-center justify-center gap-1.5 mb-0.5">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                      <span className={DS.text.micro}>평균 매칭점수</span>
                    </div>
                    <p className={`${DS.text.metricLarge} text-purple-600`}>{avgScore}점</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`${DS.page.container} ${DS.page.paddingTop} ${DS.page.sectionGap}`}>

        {/* ── Criteria Panel ───────────────────────────────────────────────── */}
        <div className={`${DS.card.elevated} ${DS.card.paddingLarge} space-y-6`}>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <SlidersHorizontal className="w-4 h-4 text-[var(--color-brand-mid)]" />
            </div>
            <div>
              <h2 className={DS.text.cardTitle}>투자 기준 설정</h2>
              <p className={DS.text.caption}>AI 매칭에 사용할 조건을 설정하세요</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Region */}
            <div>
              <label className={`flex items-center gap-1.5 ${DS.text.label} mb-2.5`}>
                <MapPin className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
                희망 지역
              </label>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map(r => (
                  <Chip key={r} label={r} active={selectedRegions.includes(r)} onClick={() => toggleRegion(r)} />
                ))}
              </div>
            </div>

            {/* Collateral */}
            <div>
              <label className={`flex items-center gap-1.5 ${DS.text.label} mb-2.5`}>
                <Building2 className="w-3.5 h-3.5 text-[var(--color-brand-mid)]" />
                담보유형
              </label>
              <div className="flex flex-wrap gap-2">
                {COLLATERAL_TYPES.map(c => (
                  <Chip key={c} label={c} active={selectedCollateral.includes(c)} onClick={() => toggleCollateral(c)} />
                ))}
              </div>
            </div>

            {/* Amount Range */}
            <div>
              <label className={`${DS.text.label} mb-2.5 block`}>
                투자 규모 (억원)
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${DS.text.caption} pointer-events-none`}>최소</span>
                  <input
                    type="number"
                    value={minAmount}
                    onChange={e => setMinAmount(e.target.value)}
                    className={`${DS.input.base} pl-10`}
                    placeholder="10"
                    min="1"
                  />
                </div>
                <span className={`${DS.text.body} shrink-0`}>—</span>
                <div className="flex-1 relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${DS.text.caption} pointer-events-none`}>최대</span>
                  <input
                    type="number"
                    value={maxAmount}
                    onChange={e => setMaxAmount(e.target.value)}
                    className={`${DS.input.base} pl-10`}
                    placeholder="50"
                    min="1"
                  />
                </div>
              </div>
              <p className={`${DS.text.micro} mt-1.5`}>
                현재 범위: {minAmount || "0"}억 ~ {maxAmount || "∞"}억원
              </p>
            </div>

            {/* Period */}
            <div>
              <label className={`${DS.text.label} mb-2.5 block`}>
                회수 예상기간
              </label>
              <div className="flex flex-wrap gap-2">
                {PERIODS.map(p => (
                  <Chip key={p} label={p} active={selectedPeriod === p} onClick={() => setSelectedPeriod(p)} />
                ))}
              </div>
            </div>
          </div>

          {/* Discount Slider — full width */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className={DS.text.label}>목표 할인율</label>
              <span className={`${DS.text.metricSmall} text-[var(--color-brand-mid)]`}>{discountSlider}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              value={discountSlider}
              onChange={e => setDiscountSlider(Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--color-brand-mid) 0%, var(--color-brand-mid) ${((discountSlider - 10) / 50) * 100}%, var(--color-border-subtle) ${((discountSlider - 10) / 50) * 100}%, var(--color-border-subtle) 100%)`
              }}
            />
            <div className={`flex justify-between ${DS.text.micro} mt-1.5`}>
              <span>10%</span>
              <span>35%</span>
              <span>60%</span>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleMatch}
            disabled={isMatching}
            className={`w-full py-3.5 rounded-xl ${DS.button.primary} justify-center`}
          >
            {isMatching ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                AI 분석 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI 매칭 시작
              </>
            )}
          </button>
        </div>

        {/* ── Results Section ───────────────────────────────────────────────── */}
        {hasResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                  <Brain className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                  <h2 className={DS.text.cardTitle}>AI 매칭 결과</h2>
                  <p className={DS.text.caption}>
                    {MOCK_MATCHED.length}개 매물 발견 · {highCount}개 우선 추천
                  </p>
                </div>
              </div>
              <span className={DS.text.caption}>점수 높은 순</span>
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {MOCK_MATCHED.map(item => {
                const { ring, text, bg, label } = scoreColor(item.matchScore)
                return (
                  <div key={item.id} className={`${DS.card.interactive} overflow-hidden flex flex-col`}>
                    <div className="p-5 flex-1 flex flex-col gap-4">

                      {/* Top row: score + badge */}
                      <div className="flex items-start gap-3">
                        <MatchScoreRing score={item.matchScore} />
                        <div className="flex-1 min-w-0 pt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[0.6875rem] font-bold ${bg} mb-1.5`}>
                            {label}
                          </span>
                          <h3 className={`${DS.text.bodyBold} leading-snug line-clamp-2`}>
                            {item.name}
                          </h3>
                        </div>
                      </div>

                      {/* Meta chips */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`flex items-center gap-1 px-2 py-0.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] rounded ${DS.text.micro}`}>
                          <MapPin className="w-2.5 h-2.5" />{item.region}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] rounded ${DS.text.micro}`}>
                          <Building2 className="w-2.5 h-2.5" />{item.collateralType}
                        </span>
                        <span className={`px-2 py-0.5 bg-[var(--color-surface-sunken)] border border-[var(--color-border-subtle)] rounded ${DS.text.micro}`}>
                          {item.expectedPeriod}
                        </span>
                      </div>

                      {/* Key stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className={`${DS.card.flat} px-3 py-2`}>
                          <p className={DS.text.micro}>채권원금</p>
                          <p className={DS.text.metricSmall}>{fmtAmount(item.principal)}</p>
                        </div>
                        <div className={`${DS.card.flat} px-3 py-2`}>
                          <p className={DS.text.micro}>예상할인율</p>
                          <p className={`${DS.text.metricSmall}`} style={{ color: ring }}>{item.discountRate}%</p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={DS.text.micro}>매칭 점수</span>
                          <span className={`${DS.text.micro} font-bold ${text}`}>{item.matchScore}/100</span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-surface-sunken)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${item.matchScore}%`, backgroundColor: ring }}
                          />
                        </div>
                      </div>

                      {/* AI Summary */}
                      <div className={`${DS.card.flat} px-3 py-2.5`}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Zap className="w-3 h-3 text-[var(--color-brand-mid)]" />
                          <span className={`${DS.text.micro} text-[var(--color-brand-mid)]`}>AI 분석</span>
                        </div>
                        <p className={DS.text.captionLight}>{item.aiSummary}</p>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="px-5 pb-5">
                      <Link
                        href={`/deals/${item.id}`}
                        className={`${DS.button.secondary} w-full justify-center`}
                      >
                        <DoorOpen className="w-4 h-4 text-[var(--color-brand-mid)]" />
                        딜룸 열기
                        <ChevronRight className="w-3.5 h-3.5 text-[var(--color-text-muted)] ml-auto" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
